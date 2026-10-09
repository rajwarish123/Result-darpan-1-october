const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const MESSAGES_PATH = path.join(DATA_DIR, 'messages.json');
const CONTACTS_PATH = path.join(DATA_DIR, 'contacts.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const QUESTION_SETS_PATH = path.join(DATA_DIR, 'question-sets.json');
const NOTIFICATIONS_PATH = path.join(DATA_DIR, 'notifications.json');
const BLOGS_PATH = path.join(DATA_DIR, 'blogs.json');
const STUDY_MATERIALS_PATH = path.join(DATA_DIR, 'study-materials.json');
const PREVIOUS_YEAR_QUESTIONS_PATH = path.join(DATA_DIR, 'previous-year-questions.json');
const AD_SETTINGS_PATH = path.join(DATA_DIR, 'ad-settings.json');
const ADS_TXT_PATH = path.join(__dirname, 'ads.txt');

app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// High-traffic security headers & CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://resultdarpan.com',
    'https://www.resultdarpan.com',
    'http://resultdarpan.com',
    'http://www.resultdarpan.com'
  ];
  const isLocalDev = origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
  if (origin && (allowedOrigins.includes(origin) || isLocalDev)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// In-Memory Sliding-Window Rate Limiter
const rateLimitStores = new Map();
function checkRateLimit(key, maxRequests, windowMs) {
  if (process.env.NODE_ENV === 'test' || process.execArgv.includes('--test') || process.env.NODE_TEST_CONTEXT) return true; // Do not throttle automated unit tests
  const now = Date.now();
  let timestamps = rateLimitStores.get(key) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    rateLimitStores.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitStores.set(key, timestamps);
  return true;
}

// Global API rate limit: 300 requests per minute per IP
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`global_api:${ip}`, 300, 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }
  next();
});

// HTML & String Sanitization Helper
function sanitizeInput(str, maxLength = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

const staticDir = __dirname;
// Block sensitive server and data files from static access
const blockedFileExtensions = [
  '.json', '.ps1', '.zip', '.bat', '.cmd', '.sh', '.env', '.log', '.lock',
  '.md', '.yml', '.yaml', '.bak', '.sql', '.tmp'
];
const blockedSpecificPaths = [
  '/data',
  '/server.js',
  '/server.test.js',
  '/package.json',
  '/package-lock.json',
  '/set-admin-password.js',
  '/build-deploy.js',
  '/auto-git-sync.js',
  '/realtime-cloud-sync.js',
  '/sync-from-live.js',
  '/script.ps1',
  '/start-auto-sync.bat',
  '/dockerfile',
  '/.dockerignore',
  '/.gitignore',
  '/.env',
  '/.env.example',
  '/admin',
  '/admin.html',
  '/wariya.html'
];
app.use((req, res, next) => {
  const norm = req.path.toLowerCase();
  if (
    blockedSpecificPaths.some((p) => norm === p || norm.startsWith(p + '/')) ||
    blockedFileExtensions.some((ext) => norm.endsWith(ext)) ||
    norm.includes('..') ||
    norm.startsWith('/.')
  ) {
    return res.status(404).end();
  }
  next();
});

// Clean URL redirect: redirect requests ending with .html (except /index.html) to extensionless clean URLs
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html') && req.path !== '/index.html') {
    const clean = req.path.slice(0, -5);
    if (clean === '/admin') {
      return res.status(404).sendFile(path.join(staticDir, 'index.html'));
    }
    const query = req.url.slice(req.path.length);
    return res.redirect(301, clean + query);
  }
  next();
});

app.use(express.static(staticDir, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(MESSAGES_PATH)) {
    fs.writeFileSync(MESSAGES_PATH, JSON.stringify([
      { id: 1, author: 'mentor', text: 'Welcome to the SSC CGL study room. Ask your first question!', createdAt: new Date().toISOString() },
      { id: 2, author: 'mentor', text: 'Tip: revise arithmetic shortcuts daily for faster accuracy.', createdAt: new Date().toISOString() }
    ], null, 2));
  }

  if (!fs.existsSync(CONTACTS_PATH)) {
    fs.writeFileSync(CONTACTS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(SESSIONS_PATH)) {
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(QUESTION_SETS_PATH)) {
    fs.writeFileSync(QUESTION_SETS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(NOTIFICATIONS_PATH)) {
    fs.writeFileSync(NOTIFICATIONS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(BLOGS_PATH)) {
    fs.writeFileSync(BLOGS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(STUDY_MATERIALS_PATH)) {
    fs.writeFileSync(STUDY_MATERIALS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(PREVIOUS_YEAR_QUESTIONS_PATH)) {
    fs.writeFileSync(PREVIOUS_YEAR_QUESTIONS_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(AD_SETTINGS_PATH)) {
    fs.writeFileSync(AD_SETTINGS_PATH, JSON.stringify({
      enabled: false,
      adClient: '',
      autoAds: false,
      showTopBanner: true,
      showInFeed: true,
      showArticleBanner: true,
      testMode: false,
      updatedAt: new Date().toISOString()
    }, null, 2));
  }
}

function readJsonObject(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(filePath, content);
  } catch (err) {
    try {
      // Windows lock retry: write to temp and rename or retry after brief yield
      const tempFile = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, content);
      fs.renameSync(tempFile, filePath);
    } catch (_) {
      try {
        fs.writeFileSync(filePath, content);
      } catch (_) {}
    }
  }
}

function numberOptions(answer, step = 1) {
  return [answer, answer + step, answer + (step * 2), Math.max(0, answer - step)];
}

function createGeneratedQuestion(exam, index) {
  const variant = index % 10;
  const number = index + 1;
  const sourceUrl = exam === 'SSC CGL'
    ? 'https://ssc.gov.in/for-candidates/previous-year-question-paper'
    : exam === 'Railway NTPC'
      ? 'https://www.adda247.com/jobs/rrb-ntpc-previous-year-question-paper/'
      : 'https://www.adda247.com/jobs/rrb-group-d-previous-year-papers/';

  if (variant === 0) {
    const base = 200 + ((number * 7) % 20) * 10;
    const rate = 5 + (number % 4) * 5;
    const answer = (base * rate) / 100;
    return { exam, year: 'Pattern practice', topic: 'Quantitative Aptitude', text: `What is ${rate}% of ${base}?`, options: numberOptions(answer, 10), answer: 0, sourceUrl };
  }
  if (variant === 1) {
    const first = 12 + (number % 8);
    const answer = first + 6;
    return { exam, year: 'Pattern practice', topic: 'Mathematics', text: `The average of ${first}, ${first + 6}, and ${first + 12} is:`, options: numberOptions(answer, 3), answer: 0, sourceUrl };
  }
  if (variant === 2) {
    const speed = 30 + (number % 5) * 10;
    const time = 2 + (number % 4);
    const answer = speed * time;
    return { exam, year: 'Pattern practice', topic: 'Time, Speed and Distance', text: `A vehicle travels at ${speed} km/h for ${time} hours. How far does it travel?`, options: numberOptions(answer, 10), answer: 0, sourceUrl };
  }
  if (variant === 3) {
    const principal = 1000 + (number % 10) * 500;
    const answer = principal * 8 * 2 / 100;
    return { exam, year: 'Pattern practice', topic: 'Simple Interest', text: `What is the simple interest on Rs ${principal} at 8% per annum for 2 years?`, options: numberOptions(answer, 100), answer: 0, sourceUrl };
  }
  if (variant === 4) {
    const answer = 3 + (number % 7);
    return { exam, year: 'Pattern practice', topic: 'Number Series', text: `Find the next number: ${answer - 1}, ${answer + 1}, ${answer + 3}, ${answer + 5}, ?`, options: [answer + 7, answer + 5, answer + 9, answer + 3], answer: 0, sourceUrl };
  }
  if (variant === 5) {
    const facts = [
      ['Which gas is essential for human respiration?', ['Nitrogen', 'Oxygen', 'Hydrogen', 'Helium'], 1],
      ['Which is the largest ocean on Earth?', ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], 2],
      ['Which organ pumps blood through the human body?', ['Lungs', 'Heart', 'Kidneys', 'Liver'], 1],
      ['Which is the first month of the calendar year?', ['March', 'January', 'June', 'April'], 1]
    ];
    const fact = facts[number % facts.length];
    return { exam, year: 'Pattern practice', topic: 'General Awareness', text: fact[0], options: fact[1], answer: fact[2], sourceUrl };
  }
  if (variant === 6) {
    const facts = [
      ['The Constitution of India came into effect on:', ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1950'], 1],
      ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1],
      ['How many sides does a hexagon have?', ['Five', 'Six', 'Seven', 'Eight'], 1],
      ['Which instrument measures temperature?', ['Barometer', 'Thermometer', 'Ammeter', 'Compass'], 1]
    ];
    const fact = facts[number % facts.length];
    return { exam, year: 'Pattern practice', topic: exam === 'SSC CGL' ? 'General Awareness' : 'General Science', text: fact[0], options: fact[1], answer: fact[2], sourceUrl };
  }
  if (variant === 7) {
    const code = String.fromCharCode(65 + (number % 20));
    const next = String.fromCharCode(code.charCodeAt(0) + 1);
    return { exam, year: 'Pattern practice', topic: 'Reasoning', text: `If ${code} is coded as ${next}, how is the next letter coded?`, options: [String.fromCharCode(next.charCodeAt(0) + 1), code, next, String.fromCharCode(next.charCodeAt(0) + 2)], answer: 0, sourceUrl };
  }
  if (variant === 8) {
    const length = 40 + (number % 6) * 10;
    const breadth = 5 + (number % 4) * 5;
    const answer = length * breadth;
    return { exam, year: 'Pattern practice', topic: 'Mensuration', text: `What is the area of a rectangle with length ${length} cm and breadth ${breadth} cm?`, options: numberOptions(answer, 50), answer: 0, sourceUrl };
  }
  const answer = 10 + (number % 9);
  return { exam, year: 'Pattern practice', topic: 'English and Vocabulary', text: 'Choose the word closest in meaning to "rapid".', options: ['Slow', 'Quick', 'Quiet', 'Late'], answer: 1, sourceUrl };
}

function getQuestionBank() {
  const exams = ['SSC CGL', 'Railway NTPC', 'Railway Group D'];
  const generatedQuestions = Array.from({ length: 500 }, (_, index) => createGeneratedQuestion(exams[index % exams.length], index));
  return previousYearQuestionsList.concat(generatedQuestions);
}

const questionSetSubjects = {
  'SSC CGL': ['English', 'Hindi', 'Mathematics', 'Reasoning', 'General Awareness', 'Indian Polity'],
  'SSC CHSL': ['English', 'Mathematics', 'Reasoning', 'General Awareness'],
  'SSC MTS': ['English', 'Mathematics', 'Reasoning', 'General Awareness'],
  'SSC GD': ['Hindi', 'English', 'Mathematics', 'Reasoning', 'General Awareness'],
  'Railway NTPC': ['Mathematics', 'Hindi', 'Reasoning', 'General Awareness', 'General Science', 'Indian Polity'],
  'Railway Group D': ['Mathematics', 'Hindi', 'Reasoning', 'General Awareness', 'General Science', 'Indian Polity'],
  'Railway ALP': ['Mathematics', 'Reasoning', 'General Science', 'General Awareness'],
  'SBI Clerk': ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'Banking Awareness'],
  'SBI PO': ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'Banking Awareness'],
  'IBPS PO': ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'Banking Awareness'],
  'IBPS Clerk': ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'Banking Awareness'],
  'RBI Grade B': ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'Banking Awareness'],
  'JEE Main': ['Mathematics', 'Physics', 'General Science'],
  'JEE Advanced': ['Mathematics', 'Physics', 'General Science'],
  'NEET UG': ['General Science', 'Physics', 'Biology'],
  'CUET UG': ['English', 'Hindi', 'General Awareness', 'Reasoning'],
  'GATE': ['Mathematics', 'General Science', 'Reasoning'],
  'CAT': ['Mathematics', 'English', 'Reasoning'],
  'CLAT': ['English', 'General Awareness', 'Reasoning', 'Indian Polity'],
  'UPSC CSE': ['General Awareness', 'Indian Polity', 'Social Science', 'English'],
  'BPSC': ['General Awareness', 'Indian Polity', 'General Science', 'Hindi'],
  'UPPSC': ['General Awareness', 'Indian Polity', 'General Science', 'Hindi'],
  NDA: ['English', 'Mathematics', 'Reasoning', 'General Awareness', 'General Science'],
  CDS: ['English', 'General Awareness', 'Mathematics', 'General Science'],
  AFCAT: ['English', 'General Awareness', 'Reasoning', 'Mathematics'],
  CTET: ['English', 'Hindi', 'Mathematics', 'Reasoning', 'General Awareness', 'General Science'],
  'CTET Paper 2': ['English', 'Hindi', 'Mathematics', 'General Science', 'Social Science'],
  'UGC NET': ['General Awareness', 'Reasoning', 'English']
};

const popularExamGoalGroups = [
  { category: 'Civil services', exams: ['UPSC Civil Services (CSE)', 'UPSC NDA', 'UPSC CDS'] },
  { category: 'SSC', exams: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD Constable'] },
  { category: 'Railways', exams: ['RRB NTPC', 'RRB Group D', 'RRB ALP'] },
  { category: 'Banking', exams: ['SBI PO', 'SBI Clerk', 'IBPS PO', 'IBPS Clerk', 'RBI Grade B'] },
  { category: 'Engineering', exams: ['JEE Main', 'JEE Advanced'] },
  { category: 'Medical & University', exams: ['NEET UG', 'CUET UG'] },
  { category: 'Teaching & Eligibility', exams: ['CTET', 'UGC NET'] },
  { category: 'State & Public Services', exams: ['BPSC', 'UPPSC', 'RPSC', 'MPPSC', 'State Police SI / Constable'] }
];
const popularExamGoalNames = new Set(popularExamGoalGroups.flatMap((group) => group.exams));

const hindiGrammarQuestions = [
  ['व्यक्ति, वस्तु, स्थान या भाव के नाम को क्या कहते हैं?', ['संज्ञा', 'सर्वनाम', 'क्रिया', 'विशेषण'], 0, 'संज्ञा'],
  ['‘मैं’ कौन-सा शब्द-भेद है?', ['संज्ञा', 'सर्वनाम', 'क्रिया', 'विशेषण'], 1, 'सर्वनाम'],
  ['‘सुंदर फूल’ में ‘सुंदर’ कौन-सा शब्द है?', ['विशेषण', 'संज्ञा', 'क्रिया', 'सर्वनाम'], 0, 'विशेषण'],
  ['‘बच्चे खेल रहे हैं।’ वाक्य में क्रिया कौन-सी है?', ['बच्चे', 'खेल रहे हैं', 'वाक्य', 'हैं'], 1, 'क्रिया'],
  ['‘जल’ का पर्यायवाची शब्द कौन-सा है?', ['पानी', 'अग्नि', 'वायु', 'आकाश'], 0, 'पर्यायवाची'],
  ['‘उन्नति’ का विलोम शब्द कौन-सा है?', ['प्रगति', 'अवनति', 'विकास', 'सफलता'], 1, 'विलोम'],
  ['‘लड़कियाँ’ शब्द का एकवचन क्या है?', ['लड़की', 'लड़का', 'लड़कियों', 'लड़कियाँ'], 0, 'वचन'],
  ['‘राजपुत्र’ में कौन-सा समास है?', ['कर्मधारय', 'द्वंद्व', 'तत्पुरुष', 'बहुव्रीहि'], 2, 'समास'],
  ['शुद्ध वर्तनी वाला शब्द चुनिए।', ['आर्शीवाद', 'आशीर्वाद', 'आशिर्वाद', 'आशीरवाद'], 1, 'शुद्ध वर्तनी'],
  ['प्रश्न पूछने वाले वाक्य के अंत में कौन-सा विराम-चिह्न लगता है?', ['पूर्ण विराम (।)', 'अल्प विराम (,)', 'प्रश्नवाचक चिह्न (?)', 'विस्मयादिबोधक चिह्न (!)'], 2, 'विराम-चिह्न']
];

const classCurricula = {
  9: ['Mathematics', 'Science', 'English', 'Social Science'],
  10: ['Mathematics', 'Science', 'English', 'Social Science'],
  11: [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'Computer Science', 'Accountancy', 'Business Studies', 'Economics',
    'History', 'Political Science', 'Geography', 'Sociology', 'Psychology', 'Hindi'
  ],
  12: [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'Computer Science', 'Accountancy', 'Business Studies', 'Economics',
    'History', 'Political Science', 'Geography', 'Sociology', 'Psychology', 'Hindi'
  ]
};

const builtInQuestionSetSubjects = Object.fromEntries(Object.entries(questionSetSubjects).map(([exam, subjects]) => [exam, [...subjects]]));
const builtInClassCurricula = Object.fromEntries(Object.entries(classCurricula).map(([classNumber, subjects]) => [classNumber, [...subjects]]));

const classQuestionPools = {
  Science: [
    ['Which cell structure controls most cell activities?', ['Nucleus', 'Cell wall', 'Vacuole', 'Ribosome'], 0, 'Cell Biology'],
    ['Which process changes a liquid into a gas at the surface?', ['Condensation', 'Evaporation', 'Freezing', 'Sublimation'], 1, 'Matter'],
    ['Which force opposes motion between two surfaces?', ['Gravity', 'Friction', 'Magnetism', 'Buoyancy'], 1, 'Force and Motion'],
    ['Which gas do green plants absorb during photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2, 'Life Processes'],
    ['Which part of a plant absorbs most water from soil?', ['Leaves', 'Root hairs', 'Flowers', 'Fruit'], 1, 'Plant Tissues'],
    ['How many chambers are there in a human heart?', ['Two', 'Three', 'Four', 'Five'], 2, 'Human Biology'],
    ['The change of a liquid into a solid is called:', ['Melting', 'Freezing', 'Boiling', 'Condensation'], 1, 'Matter'],
    ['Which scale is commonly used to describe earthquake magnitude?', ['Richter scale', 'Celsius scale', 'pH scale', 'Beaufort scale'], 0, 'Earth Science'],
    ['What is the basic structural unit of living organisms?', ['Atom', 'Cell', 'Tissue', 'Organ'], 1, 'Cell Biology'],
    ['Which nutrient is mainly used by the body for growth and repair?', ['Protein', 'Water', 'Fibre', 'Mineral salts'], 0, 'Nutrition']
  ],
  English: [
    ['Choose the correctly spelled word.', ['Environment', 'Enviroment', 'Envirnoment', 'Environmant'], 0, 'Spelling'],
    ['Choose the synonym of “brief”.', ['Lengthy', 'Concise', 'Unclear', 'Loud'], 1, 'Vocabulary'],
    ['Choose the grammatically correct sentence.', ['She have finished her work.', 'She has finished her work.', 'She having finished her work.', 'She finish her work.'], 1, 'Grammar'],
    ['Choose the antonym of “ancient”.', ['Historic', 'Modern', 'Old', 'Early'], 1, 'Vocabulary'],
    ['Choose the synonym of “diligent”.', ['Careless', 'Hard-working', 'Impatient', 'Uncertain'], 1, 'Vocabulary'],
    ['Choose the correctly spelled word.', ['Necessary', 'Neccessary', 'Necesary', 'Necessery'], 0, 'Spelling'],
    ['Complete the sentence: They ___ going to school.', ['is', 'am', 'are', 'was'], 2, 'Grammar'],
    ['Choose the antonym of “expand”.', ['Enlarge', 'Extend', 'Contract', 'Increase'], 2, 'Vocabulary'],
    ['Choose the correctly spelled word.', ['Separate', 'Seperate', 'Separete', 'Seperete'], 0, 'Spelling'],
    ['Choose the plural form of “child”.', ['Childs', 'Childes', 'Children', 'Childrens'], 2, 'Grammar']
  ],
  'Social Science': [
    ['Which imaginary line divides Earth into Northern and Southern Hemispheres?', ['Tropic of Cancer', 'Equator', 'Prime Meridian', 'Arctic Circle'], 1, 'Geography'],
    ['Which institution interprets the Constitution of India?', ['Supreme Court', 'Election Commission', 'NITI Aayog', 'Finance Commission'], 0, 'Civics'],
    ['What is the exchange of goods and services called?', ['Migration', 'Trade', 'Irrigation', 'Industry'], 1, 'Economics'],
    ['Who led the Dandi March in 1930?', ['Subhas Chandra Bose', 'Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel'], 1, 'History'],
    ['What is the capital of Rajasthan?', ['Jaipur', 'Jodhpur', 'Udaipur', 'Ajmer'], 0, 'Geography'],
    ['Which is the lower house of the Indian Parliament?', ['Rajya Sabha', 'Lok Sabha', 'Vidhan Parishad', 'Gram Sabha'], 1, 'Civics'],
    ['The standard unit of currency used in India is the:', ['Rupee', 'Taka', 'Yen', 'Dinar'], 0, 'Economics'],
    ['In which year did India become independent?', ['1935', '1942', '1947', '1950'], 2, 'History'],
    ['Which ocean lies to the south of India?', ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'], 1, 'Geography'],
    ['Who is elected to represent a constituency in the Lok Sabha?', ['A Member of Parliament', 'A Governor', 'A District Judge', 'A Mayor'], 0, 'Civics']
  ],
  Physics: [
    ['What is the SI unit of force?', ['Joule', 'Newton', 'Watt', 'Pascal'], 1, 'Mechanics'],
    ['Which quantity is the rate of change of velocity?', ['Momentum', 'Acceleration', 'Impulse', 'Displacement'], 1, 'Kinematics'],
    ['What is the SI unit of electric current?', ['Volt', 'Ohm', 'Ampere', 'Coulomb'], 2, 'Electricity'],
    ['Which law relates voltage, current, and resistance?', ['Ohm’s law', 'Faraday’s law', 'Hooke’s law', 'Kepler’s law'], 0, 'Electricity'],
    ['What is the SI unit of work?', ['Newton', 'Joule', 'Ampere', 'Tesla'], 1, 'Work and Energy'],
    ['Which type of wave can travel through a vacuum?', ['Sound wave', 'Water wave', 'Light wave', 'Seismic wave'], 2, 'Waves'],
    ['What is the magnitude of acceleration due to gravity near Earth?', ['9.8 m/s²', '3.0 m/s²', '1.6 m/s²', '12.5 m/s²'], 0, 'Gravitation'],
    ['Which lens converges parallel rays of light?', ['Concave lens', 'Convex lens', 'Plane mirror', 'Prism'], 1, 'Optics'],
    ['Electric power is measured in:', ['Watts', 'Volts', 'Ohms', 'Coulombs'], 0, 'Electricity'],
    ['Which physical quantity is conserved in an isolated system?', ['Energy', 'Temperature', 'Speed', 'Volume'], 0, 'Conservation Laws']
  ],
  Chemistry: [
    ['What is the chemical symbol for sodium?', ['S', 'So', 'Na', 'N'], 2, 'Elements'],
    ['A solution with pH below 7 is:', ['Acidic', 'Neutral', 'Alkaline', 'Saturated'], 0, 'Acids and Bases'],
    ['How many atoms are in one molecule of oxygen gas (O₂)?', ['One', 'Two', 'Three', 'Four'], 1, 'Molecules'],
    ['Which subatomic particle has a negative charge?', ['Proton', 'Neutron', 'Electron', 'Nucleus'], 2, 'Atomic Structure'],
    ['What is the chemical formula of water?', ['HO', 'H₂O', 'H₂O₂', 'OH₂O'], 1, 'Chemical Formulae'],
    ['Which gas is released when an acid reacts with a metal?', ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Nitrogen'], 2, 'Chemical Reactions'],
    ['A bond formed by sharing electron pairs is called:', ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Hydrogen bond'], 1, 'Chemical Bonding'],
    ['What is the atomic number of carbon?', ['4', '6', '8', '12'], 1, 'Periodic Table'],
    ['Which particle is found in the nucleus and has no charge?', ['Proton', 'Neutron', 'Electron', 'Ion'], 1, 'Atomic Structure'],
    ['The reaction of an acid with a base generally produces salt and:', ['Water', 'Oxygen', 'Hydrogen', 'Carbon'], 0, 'Acids and Bases']
  ],
  Biology: [
    ['Which molecule carries hereditary information in most organisms?', ['DNA', 'Glucose', 'Starch', 'Chlorophyll'], 0, 'Genetics'],
    ['Which organelle is the main site of photosynthesis?', ['Mitochondrion', 'Chloroplast', 'Nucleus', 'Lysosome'], 1, 'Cell Biology'],
    ['What is the functional unit of the kidney?', ['Neuron', 'Alveolus', 'Nephron', 'Villus'], 2, 'Human Physiology'],
    ['Which blood cells primarily transport oxygen?', ['Platelets', 'Red blood cells', 'White blood cells', 'Lymphocytes'], 1, 'Human Physiology'],
    ['Which organelle releases usable energy during cellular respiration?', ['Mitochondrion', 'Golgi body', 'Vacuole', 'Cell wall'], 0, 'Cell Biology'],
    ['Which plant tissue transports water from roots?', ['Phloem', 'Xylem', 'Epidermis', 'Cambium'], 1, 'Plant Biology'],
    ['What is the usual number of chromosomes in a human body cell?', ['23', '44', '46', '48'], 2, 'Genetics'],
    ['Which hormone helps regulate blood glucose?', ['Insulin', 'Adrenaline', 'Thyroxine', 'Melatonin'], 0, 'Human Physiology'],
    ['Which process produces two genetically identical daughter cells?', ['Meiosis', 'Mitosis', 'Fertilisation', 'Pollination'], 1, 'Cell Division'],
    ['Which blood group is commonly called the universal red-cell donor?', ['AB positive', 'A positive', 'O negative', 'B negative'], 2, 'Human Physiology']
  ],
  Accountancy: [
    ['Which accounting concept assumes a business will continue operating indefinitely?', ['Going Concern Concept', 'Money Measurement', 'Periodicity', 'Conservatism'], 0, 'Basic Concepts'],
    ['The fundamental accounting equation is:', ['Assets = Liabilities + Capital', 'Assets = Capital - Liabilities', 'Capital = Assets + Liabilities', 'Liabilities = Assets + Capital'], 0, 'Accounting Equation'],
    ['Goodwill of a business is classified as a/an:', ['Intangible Asset', 'Current Asset', 'Liquid Asset', 'Fictitious Asset'], 0, 'Assets'],
    ['In double-entry bookkeeping, an increase in an asset is recorded as:', ['Debit', 'Credit', 'Contra', 'Reversal'], 0, 'Rules of Debit & Credit'],
    ['Which financial statement shows financial position at a specific date?', ['Balance Sheet', 'Profit and Loss Account', 'Cash Flow Statement', 'Trial Balance'], 0, 'Financial Statements'],
    ['Depreciation is charged on:', ['Fixed Tangible Assets', 'Current Assets', 'Liquid Cash', 'Goodwill'], 0, 'Depreciation'],
    ['The excess of assets over liabilities in a non-profit organisation is called:', ['Capital Fund', 'Surplus', 'Net Profit', 'Deficit'], 0, 'NPO Accounting'],
    ['Rent received in advance is classified as a/an:', ['Current Liability', 'Current Asset', 'Direct Revenue', 'Capital'], 0, 'Adjustments'],
    ['Which account is credited when cash is withdrawn by proprietor for personal use?', ['Cash Account', 'Drawings Account', 'Capital Account', 'Purchases Account'], 0, 'Journal Entries'],
    ['A Trial Balance is prepared primarily to check:', ['Arithmetical accuracy of ledger', 'Financial profit', 'Cash position', 'Tax obligation'], 0, 'Trial Balance']
  ],
  'Business Studies': [
    ['Which management function is considered the primary function of management?', ['Planning', 'Organising', 'Controlling', 'Staffing'], 0, 'Management Functions'],
    ['Who is universally acknowledged as the father of General Management?', ['Henri Fayol', 'F.W. Taylor', 'Peter Drucker', 'Elton Mayo'], 0, 'Principles of Management'],
    ['Which Fayol principle states that an employee should receive orders from one superior only?', ['Unity of Command', 'Unity of Direction', 'Scalar Chain', 'Order'], 0, 'Fayol Principles'],
    ['What are the traditional 4 Ps of Marketing Mix?', ['Product, Price, Place, Promotion', 'Plan, People, Process, Position', 'Power, Profit, Price, Place', 'Policy, Program, Path, Performance'], 0, 'Marketing'],
    ['The process of initiating, guiding and inspiring subordinates to achieve goals is:', ['Directing', 'Planning', 'Controlling', 'Budgeting'], 0, 'Directing'],
    ['Which recruitment method brings external fresh talent and diverse perspectives into a firm?', ['External recruitment', 'Transfer', 'Internal promotion', 'Demotion'], 0, 'Staffing'],
    ['Under the Consumer Protection Act 2019, District Commission entertains complaints up to:', ['₹1 Crore', '₹20 Lakhs', '₹50 Lakhs', '₹10 Crores'], 0, 'Consumer Protection'],
    ['Which financial market deals in medium and long-term borrowing and equity instruments?', ['Capital Market', 'Money Market', 'Call Money Market', 'Treasury Market'], 0, 'Financial Markets'],
    ['Span of management refers to the:', ['Number of subordinates under one superior', 'Duration of leadership', 'Salary scale', 'Number of departments'], 0, 'Organising'],
    ['Treasury Bills in India are issued on behalf of the Central Government by:', ['Reserve Bank of India (RBI)', 'SEBI', 'State Bank of India', 'Ministry of Commerce'], 0, 'Financial Markets']
  ],
  Economics: [
    ['The Law of Demand states that other things being constant, quantity demanded increases when:', ['Price falls', 'Income falls', 'Price rises', 'Supply increases'], 0, 'Microeconomics'],
    ['The opportunity cost of a chosen economic activity is the:', ['Value of the next best alternative forgone', 'Total financial outlay', 'Fixed overhead cost', 'Sunk cost'], 0, 'Introductory Economics'],
    ['Which macroeconomic indicator measures total value of final goods & services produced in a country in a year?', ['Gross Domestic Product (GDP)', 'Net National Product', 'Gross National Income', 'Disposable Income'], 0, 'National Income'],
    ['When price elasticity of demand is greater than 1, demand is termed:', ['Elastic', 'Inelastic', 'Unitary', 'Zero'], 0, 'Elasticity'],
    ['Which apex authority formulates and executes Monetary Policy in India?', ['Reserve Bank of India (RBI)', 'NITI Aayog', 'Ministry of Finance', 'SEBI'], 0, 'Money & Banking'],
    ['Inflation driven by rising costs of raw materials and employee wages is known as:', ['Cost-push inflation', 'Demand-pull inflation', 'Creeping inflation', 'Hyperinflation'], 0, 'Macroeconomics'],
    ['A market structure characterized by a single seller with high barriers to entry is a:', ['Monopoly', 'Perfect Competition', 'Oligopoly', 'Monopolistic Competition'], 0, 'Market Forms'],
    ['The difference between Total Revenue and Total Cost is defined as:', ['Economic Profit', 'Marginal Revenue', 'Gross Turnover', 'Operating Surplus'], 0, 'Producer Behavior'],
    ['NITI Aayog replaced which historical planning institution in India in 2015?', ['Planning Commission', 'Finance Commission', 'National Development Council', 'Tariff Board'], 0, 'Indian Economy'],
    ['An economic system where both private enterprises and state governance coexist is a:', ['Mixed Economy', 'Command Economy', 'Capitalist Economy', 'Barter Economy'], 0, 'Economic Systems']
  ],
  History: [
    ['The Indus Valley / Harappan Civilization belonged chronologically to which archaeological age?', ['Bronze Age', 'Iron Age', 'Neolithic Age', 'Mesolithic Age'], 0, 'Ancient India'],
    ['The famous steatite seal depicting "Pashupati" was excavated at which major site?', ['Mohenjo-daro', 'Harappa', 'Kalibangan', 'Lothal'], 0, 'Harappan Culture'],
    ['Who was the illustrious founder of the Mauryan Empire in ancient India?', ['Chandragupta Maurya', 'Ashoka', 'Bindusara', 'Brihadratha'], 0, 'Mauryan Empire'],
    ['The devastating Kalinga War prompted Emperor Ashoka to embrace and propagate:', ['Buddhism & Dhamma', 'Jainism', 'Ajivika philosophy', 'Vedic rituals'], 0, 'Ashoka Epigraphs'],
    ['The world-renowned travel account "Rihla" was authored by medieval Moroccan traveler:', ['Ibn Battuta', 'Al-Biruni', 'Marco Polo', 'Abdur Razzaq'], 0, 'Medieval Travelers'],
    ['The Permanent Settlement of Bengal was enacted in 1793 under Governor-General:', ['Lord Cornwallis', 'Lord Warren Hastings', 'Lord Dalhousie', 'Lord Wellesley'], 0, 'Colonial Rule'],
    ['Mahatma Gandhi launched the Champaran Satyagraha in 1917 in Bihar to support:', ['Oppressed Indigo farmers', 'Cotton textile workers', 'Salt tax protesters', 'Peasants against land revenue'], 0, 'National Movement'],
    ['The historic Indian Rebellion of 1857 was ignited on May 10 from the military station of:', ['Meerut', 'Barrackpore', 'Delhi', 'Jhansi'], 0, 'Revolt of 1857'],
    ['Who presided over the iconic Lahore Session of 1929 where the "Purna Swaraj" resolution was passed?', ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Subhas Chandra Bose', 'Motilal Nehru'], 0, 'National Movement'],
    ['The Indian Independence Act was formally passed by the British Parliament in:', ['July 1947', 'August 1946', 'March 1947', 'January 1950'], 0, 'Independence of India']
  ],
  'Political Science': [
    ['The Constitution of India was officially adopted by the Constituent Assembly on:', ['26 November 1949', '15 August 1947', '26 January 1950', '2 October 1948'], 0, 'Indian Constitution'],
    ['Which Article was described as the "Heart and Soul" of the Indian Constitution by Dr. B.R. Ambedkar?', ['Article 32 (Right to Constitutional Remedies)', 'Article 21 (Right to Life)', 'Article 14 (Equality)', 'Article 19 (Freedoms)'], 0, 'Fundamental Rights'],
    ['Who serves as the ex-officio Chairman of the Rajya Sabha in the Indian Parliament?', ['Vice-President of India', 'Speaker of Lok Sabha', 'Prime Minister', 'Chief Justice of India'], 0, 'Legislature'],
    ['Fundamental Duties were incorporated into Part IV-A of the Constitution through which Amendment?', ['42nd Amendment Act, 1976', '44th Amendment Act, 1978', '86th Amendment Act, 2002', '73rd Amendment Act, 1992'], 0, 'Constitutional Amendments'],
    ['The influential doctrine of "Separation of Powers" was conceptualised by:', ['Montesquieu', 'John Locke', 'Rousseau', 'Thomas Hobbes'], 0, 'Political Theory'],
    ['Which Schedule of the Indian Constitution details the Union, State, and Concurrent Lists?', ['Seventh Schedule', 'Eighth Schedule', 'Eleventh Schedule', 'Third Schedule'], 0, 'Federalism'],
    ['The minimum constitutional age required to contest election for the Lok Sabha is:', ['25 years', '30 years', '35 years', '21 years'], 0, 'Elections'],
    ['The Election Commission of India functions as an autonomous authority under which Article?', ['Article 324', 'Article 280', 'Article 352', 'Article 312'], 0, 'Constitutional Bodies'],
    ['Which European nation is globally renowned as the premier exemplar of Direct Democracy?', ['Switzerland', 'United Kingdom', 'Germany', 'France'], 0, 'Democratic Systems'],
    ['The authority of courts to invalidate governmental acts that violate the Constitution is called:', ['Judicial Review', 'Judicial Activism', 'Rule of Law', 'Public Interest Litigation'], 0, 'Judiciary']
  ],
  Geography: [
    ['Which layer of the Earth possesses the highest density and is predominantly composed of nickel and iron?', ['Core (Nife)', 'Crust (Sial)', 'Mantle (Sima)', 'Lithosphere'], 0, 'Earth Interior'],
    ['The Continental Drift hypothesis was formulated and published in 1912 by:', ['Alfred Wegener', 'Harry Hess', 'Arthur Holmes', 'W.M. Davis'], 0, 'Geomorphology'],
    ['Which atmospheric zone contains the protective ozone layer shielding Earth from ultraviolet radiation?', ['Stratosphere', 'Troposphere', 'Mesosphere', 'Thermosphere'], 0, 'Climatology'],
    ['The Western Ghats and Eastern Ghats converge geographically at the:', ['Nilgiri Hills', 'Annamalai Hills', 'Cardamom Hills', 'Palani Hills'], 0, 'Physiography of India'],
    ['Which is the longest river system flowing through Peninsular India (Dakshin Ganga)?', ['Godavari', 'Krishna', 'Mahanadi', 'Kaveri'], 0, 'Drainage Systems'],
    ['The meteorological phenomenon bringing crucial winter precipitation to northwest India is called:', ['Western Disturbances', 'South-West Monsoon', 'North-East Monsoon', 'Loo'], 0, 'Indian Climate'],
    ['Black soil, widely distributed across the Deccan Plateau, is exceptionally suitable for growing:', ['Cotton', 'Tea', 'Jute', 'Rubber'], 0, 'Soils of India'],
    ['The demarcation line separating India and China in the eastern sector is designated as the:', ['McMahon Line', 'Radcliffe Line', 'Durand Line', 'Line of Control'], 0, 'Political Geography'],
    ['Which planetary body is considered Earth’s "twin" due to comparable size, mass, and bulk composition?', ['Venus', 'Mars', 'Mercury', 'Neptune'], 0, 'Solar System'],
    ['Majuli, the world’s largest inhabited riverine island, is situated on which great river?', ['Brahmaputra', 'Ganga', 'Indus', 'Narmada'], 0, 'Indian Drainage']
  ],
  Sociology: [
    ['Who is universally acclaimed as the founding father of Sociology?', ['Auguste Comte', 'Karl Marx', 'Max Weber', 'Herbert Spencer'], 0, 'Sociological Foundations'],
    ['The seminal treatise "The Division of Labour in Society" was authored by French sociologist:', ['Emile Durkheim', 'Pierre Bourdieu', 'Michel Foucault', 'Claude Levi-Strauss'], 0, 'Sociological Thinkers'],
    ['The sociological concept of "Social Stratification" denotes:', ['Hierarchical ranking of social strata', 'Biological classification', 'Psychological grouping', 'Spatial migration'], 0, 'Social Stratification'],
    ['Which fundamental social institution operates as the primary agent of human socialization?', ['Family', 'Mass Media', 'Workplace', 'Political Party'], 0, 'Social Institutions'],
    ['The conceptual framework of "Sanskritization" in Indian social anthropology was introduced by:', ['M.N. Srinivas', 'G.S. Ghurye', 'Andre Beteille', 'Irawati Karve'], 0, 'Social Change in India'],
    ['Which of the following serves as an archetypal illustration of an ascribed social status?', ['Caste acquired at birth', 'Doctorate degree', 'Elected parliamentary seat', 'Corporate promotion'], 0, 'Status and Role'],
    ['The progressive demographic migration from agrarian rural countryside into cities is termed:', ['Urbanization', 'Industrialization', 'Modernization', 'Westernization'], 0, 'Social Processes'],
    ['Max Weber formulated an enduring sociological paradigm dissecting rational legal authority and:', ['Bureaucracy', 'Historical Materialism', 'Mechanical Solidarity', 'Dramaturgy'], 0, 'Sociological Theory'],
    ['Endogamy is formally defined as the social practice of wedding:', ['Within one’s own social group/community', 'Outside one’s clan', 'Multiple partners', 'Across nationality boundaries'], 0, 'Kinship & Marriage'],
    ['The lifelong interactive process through which an individual internalises culture and norms is:', ['Socialization', 'Assimilation', 'Acculturation', 'Enculturation'], 0, 'Culture and Society']
  ],
  Psychology: [
    ['Who established the Psychoanalytic school of psychology exploring the unconscious mind?', ['Sigmund Freud', 'Carl Jung', 'B.F. Skinner', 'John Watson'], 0, 'Psychological Traditions'],
    ['Which memory store retains information for approximately 20 to 30 seconds without active rehearsal?', ['Short-Term Memory (STM)', 'Sensory Memory', 'Long-Term Memory', 'Episodic Memory'], 0, 'Human Memory'],
    ['Ivan Pavlov discovered classical conditioning principles while investigating digestive salivation in:', ['Dogs', 'Pigeons', 'Rats', 'Chimpanzees'], 0, 'Learning'],
    ['The classic standardized mathematical formula for Intelligence Quotient (IQ) is:', ['(Mental Age / Chronological Age) × 100', '(Chronological Age / Mental Age) × 100', '(Mental Age × Chronological Age) / 100', '(Mental Age + Chronological Age) × 10'], 0, 'Intelligence'],
    ['Which subcortical structure within the temporal lobe plays a critical role in processing fear emotions?', ['Amygdala', 'Hippocampus', 'Medulla', 'Corpus Callosum'], 0, 'Biological Psychology'],
    ['Jean Piaget formulated four landmark sequential stages delineating children’s:', ['Cognitive Development', 'Moral Evolution', 'Psychosexual Stages', 'Language Acquisition'], 0, 'Developmental Psychology'],
    ['The modern "Big Five" personality taxonomy comprises Openness, Conscientiousness, Extraversion, Agreeableness, and:', ['Neuroticism', 'Introversion', 'Optimism', 'Impulsivity'], 0, 'Personality'],
    ['In Abraham Maslow’s pyramid hierarchy of human needs, the culminating pinnacle need is:', ['Self-actualization', 'Self-esteem', 'Safety', 'Belongingness'], 0, 'Motivation & Emotion'],
    ['The iconic "Bobo Doll" experiments evidencing observational vicarious learning were conducted by:', ['Albert Bandura', 'Edward Thorndike', 'Erik Erikson', 'Carl Rogers'], 0, 'Social Learning Theory'],
    ['The initial neurobiological process whereby sensory receptors detect physical stimuli from the environment is:', ['Sensation', 'Perception', 'Attention', 'Cognition'], 0, 'Sensory Processes']
  ],
  'Computer Science': [
    ['Which core Python compound data structure is strictly immutable once initialized?', ['Tuple', 'List', 'Dictionary', 'Set'], 0, 'Python Fundamentals'],
    ['What is the algorithmic time complexity of searching an item in a balanced Binary Search Tree?', ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], 0, 'Data Structures'],
    ['Which SQL DDL command permanently removes a table along with its relational schema from a database?', ['DROP TABLE', 'DELETE TABLE', 'TRUNCATE TABLE', 'REMOVE TABLE'], 0, 'Database Systems'],
    ['In internet protocols, the acronym HTTP stands for:', ['Hypertext Transfer Protocol', 'High Technology Transfer Process', 'Hyperlink Transmission Path', 'Host Telecommunication Platform'], 0, 'Computer Networks'],
    ['Which Boolean logic gate is universally classified as a universal gate alongside NOR?', ['NAND gate', 'AND gate', 'OR gate', 'XOR gate'], 0, 'Boolean Logic'],
    ['In Python, which built-in function returns the total number of items stored in an iterable?', ['len()', 'count()', 'size()', 'length()'], 0, 'Python Built-ins'],
    ['Which layer within the seven-layer OSI reference model manages logical addressing and packet routing?', ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Session Layer'], 0, 'Networking'],
    ['The hexadecimal representation corresponding to the 4-bit binary value 1111 is:', ['F', 'E', 'A', '15'], 0, 'Number Systems'],
    ['Which protocol provides cryptographic secure channel communication for file transfer over SSH?', ['SFTP', 'FTP', 'Telnet', 'TFTP'], 0, 'Network Security'],
    ['In relational database design, an attribute or set of attributes uniquely identifying each tuple is the:', ['Primary Key', 'Foreign Key', 'Candidate Index', 'Alternate Key'], 0, 'Relational Databases']
  ],
  Hindi: [
    ['\'दशानन\' (दस हैं आनन जिसके अर्थात् रावण) में कौन-सा समास है?', ['बहुव्रीहि समास', 'द्विगु समास', 'कर्मधारय समास', 'तत्पुरुष समास'], 0, 'समास'],
    ['\'पवन\' का सही संधि-विच्छेद निम्नलिखित में से क्या है?', ['पो + अन', 'पौ + अन', 'प + वन', 'पव + न'], 0, 'संधि'],
    ['\'अनुराग\' शब्द का सही विलोम शब्द क्या होगा?', ['विराग', 'राग', 'द्वेष', 'घृणा'], 0, 'विलोम शब्द'],
    ['निम्नलिखित में से कौन-सा शब्द \'सूर्य\' का पर्यायवाची है?', ['दिनकर', 'शशि', 'जलद', 'निशाकर'], 0, 'पर्यायवाची'],
    ['\'आँखों का तारा होना\' मुहावरे का सही अर्थ क्या है?', ['अत्यधिक प्रिय होना', 'बहुत दूर होना', 'कम दिखाई देना', 'घमंडी होना'], 0, 'मुहावरे'],
    ['हिंदी वर्णमाला में मूल रूप से स्वरों की कुल संख्या कितनी मानी जाती है?', ['11', '13', '10', '12'], 0, 'वर्णमाला'],
    ['उत्पत्ति अथवा इतिहास के आधार पर हिंदी शब्द-भंडार के कितने प्रमुख भेद हैं?', ['4 (तत्सम, तद्भव, देशज, विदेशज)', '3', '5', '2'], 0, 'शब्द विचार'],
    ['\'जिसका कोई शत्रु कभी न जन्मा हो\' - वाक्यांश के लिए एक उपयुक्त शब्द है:', ['अजातशत्रु', 'शत्रुघ्न', 'अजेय', 'सर्वजयी'], 0, 'अनेक शब्दों के लिए एक शब्द'],
    ['\'हाथ कंगन को आरसी क्या\' लोकोक्ति का सटीक अभिप्राय क्या है?', ['प्रत्यक्ष को प्रमाण की आवश्यकता नहीं होती', 'सुंदर आभूषण पहनना', 'दर्पण देखना', 'कठिन कार्य करना'], 0, 'लोकोक्तियाँ'],
    ['श्रृंगार रस का स्थायी भाव निम्नलिखित में से क्या है?', ['रति', 'हास्य', 'उत्साह', 'शोक'], 0, 'काव्य शास्त्र & रस']
  ]
};

function getClassQuestionSet(classNumber, subject, setNumber) {
  const grade = Number(classNumber);
  const safeSet = Math.min(500, Math.max(1, Number(setNumber) || 1));
  const customSet = getCustomQuestionSet({ classNumber: String(grade), subject, setNumber: safeSet });
  if (customSet) {
    return customSet.questions.map((question, index) => ({
      id: `${customSet.id}-${index + 1}`,
      classNumber: String(grade),
      subject,
      set: safeSet,
      number: index + 1,
      topic: question.topic,
      text: question.text,
      options: [...question.options],
      answer: question.answer
    }));
  }
  const pool = classQuestionPools[subject] || classQuestionPools.Science;
  return Array.from({ length: 10 }, (_, index) => {
    const sequence = ((safeSet - 1) * 10) + index;
    const variation = index + ((safeSet - 1) * 3);
    const questionNumber = sequence + 1;
    let prompt;
    let options;
    let answer;
    let topic;

    if (subject === 'Mathematics' && grade === 9) {
      const value = grade + (variation % 9) + 2;
      const answerValue = 3 + (variation % 12);
      prompt = `Solve for x: x + ${value} = ${value + answerValue}.`;
      options = numberOptions(answerValue, 2);
      answer = 0;
      topic = 'Linear Equations';
    } else if (subject === 'Mathematics' && grade === 10) {
      const first = 2 + (variation % 10);
      const second = first + 2;
      prompt = `The roots of x² - ${first + second}x + ${first * second} = 0 are:`;
      options = [`${first} and ${second}`, `${first + 1} and ${second + 1}`, `${first} and ${second + 1}`, `-${first} and -${second}`];
      answer = 0;
      topic = 'Quadratic Equations';
    } else if (subject === 'Mathematics' && grade === 11) {
      const first = variation % 10;
      prompt = `The 5th term of the arithmetic sequence ${first + 2}, ${first + 5}, ${first + 8}, ... is:`;
      options = [first + 14, first + 11, first + 17, first + 12];
      answer = 0;
      topic = 'Sequences and Series';
    } else if (subject === 'Mathematics') {
      const power = 3 + (variation % 10);
      const answerValue = 2 * power;
      prompt = `If f(x) = x², what is f'(${power})?`;
      options = [answerValue, answerValue + 2, answerValue - 2, answerValue + 5];
      answer = 0;
      topic = 'Differentiation';
    } else {
      [prompt, options, answer, topic] = pool[(index + ((safeSet - 1) * 3) + grade) % pool.length];
      options = [...options];
    }

    return {
      id: `class-${grade}-${subject.toLowerCase().replace(/\s+/g, '-')}-${safeSet}-${questionNumber}`,
      classNumber: String(grade),
      subject,
      set: safeSet,
      number: index + 1,
      topic,
      text: prompt,
      options,
      answer
    };
  });
}

function getQuestionSet(exam, subject, setNumber) {
  const subjects = questionSetSubjects[exam] || [];
  const safeSubject = subjects.includes(subject) ? subject : subjects[0];
  const safeSet = Math.min(500, Math.max(1, Number(setNumber) || 1));
  const customSet = getCustomQuestionSet({ exam, subject: safeSubject, setNumber: safeSet });
  if (customSet) {
    return customSet.questions.map((question, index) => ({
      id: `${customSet.id}-${index + 1}`,
      exam,
      subject: safeSubject,
      set: safeSet,
      year: customSet.title,
      topic: question.topic,
      text: question.text,
      options: [...question.options],
      answer: question.answer,
      sourceUrl: customSet.sourceUrl || '',
      ncertUrl: 'https://ncert.nic.in/textbook.php'
    }));
  }
  const sourceUrl = exam === 'SSC CGL'
    ? 'https://ssc.gov.in/for-candidates/previous-year-question-paper'
    : exam === 'Railway NTPC'
      ? 'https://www.adda247.com/jobs/rrb-ntpc-previous-year-question-paper/'
      : 'https://www.adda247.com/jobs/rrb-group-d-previous-year-papers/';
  const ncertUrl = 'https://ncert.nic.in/textbook.php';

  return Array.from({ length: 50 }, (_, index) => {
    const number = ((safeSet - 1) * 50) + index + 1;
    const variation = number % 10;
    let question;

    if (safeSubject === 'Hindi') {
      const [text, options, answer, topic] = hindiGrammarQuestions[variation];
      question = { text, options, answer, topic };
    } else if (safeSubject === 'Mathematics') {
      const base = 120 + ((number * 13) % 30) * 10;
      const rate = 5 + (number % 6) * 5;
      const answer = (base * rate) / 100;
      question = { text: `What is ${rate}% of ${base}?`, options: numberOptions(answer, 10), answer: 0, topic: 'Percentages' };
    } else if (safeSubject === 'Reasoning') {
      const answer = 3 + (number % 12);
      question = { text: `Find the next number: ${answer - 1}, ${answer + 1}, ${answer + 3}, ${answer + 5}, ?`, options: [answer + 7, answer + 5, answer + 9, answer + 3], answer: 0, topic: 'Number Series' };
    } else if (safeSubject === 'English') {
      const words = [['rapid', ['Slow', 'Quick', 'Quiet', 'Late'], 1], ['ancient', ['Modern', 'Old', 'Large', 'Bright'], 0], ['brief', ['Short', 'Heavy', 'Clear', 'Wide'], 0], ['honest', ['Truthful', 'Angry', 'Careless', 'Silent'], 0]];
      const word = words[variation % words.length];
      question = { text: `Choose the word closest in meaning to '${word[0]}'.`, options: word[1], answer: word[2], topic: 'Vocabulary' };
    } else if (safeSubject === 'Banking Awareness') {
      const facts = [
        ['Which institution issues most currency notes in India?', ['Reserve Bank of India', 'State Bank of India', 'SEBI', 'NABARD'], 0, 'Indian Banking'],
        ['What does ATM stand for?', ['Automated Teller Machine', 'Automatic Transfer Mode', 'Anytime Transaction Method', 'Account Tracking Machine'], 0, 'Banking Terms'],
        ['Which body regulates the securities market in India?', ['RBI', 'SEBI', 'IRDAI', 'NABARD'], 1, 'Financial Institutions'],
        ['A cheque is primarily an instruction to a bank to:', ['Transfer or pay money', 'Issue a loan', 'Open a demat account', 'Print currency'], 0, 'Payment Systems']
      ];
      const fact = facts[variation % facts.length];
      question = { text: fact[0], options: fact[1], answer: fact[2], topic: fact[3] };
    } else if (safeSubject === 'General Science') {
      const facts = [
        ['Which gas is essential for human respiration?', ['Nitrogen', 'Oxygen', 'Hydrogen', 'Helium'], 1, 'Biology'],
        ['Which vitamin is produced in skin exposed to sunlight?', ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], 3, 'Nutrition'],
        ['What is the SI unit of force?', ['Joule', 'Watt', 'Newton', 'Pascal'], 2, 'Physics'],
        ['Which process helps green plants make food?', ['Respiration', 'Photosynthesis', 'Digestion', 'Filtration'], 1, 'Biology']
      ];
      const fact = facts[variation % facts.length];
      question = { text: fact[0], options: fact[1], answer: fact[2], topic: fact[3] };
    } else if (safeSubject === 'Indian Polity') {
      const facts = [
        ['Who is the constitutional head of the Union executive in India?', ['Prime Minister', 'President', 'Chief Justice', 'Speaker'], 1, 'Union Executive'],
        ['A Money Bill can be introduced only in the:', ['Rajya Sabha', 'Lok Sabha', 'State Legislative Council', 'Supreme Court'], 1, 'Parliament'],
        ['Which body conducts elections to Parliament and state legislatures?', ['Union Public Service Commission', 'Election Commission of India', 'Finance Commission', 'NITI Aayog'], 1, 'Elections'],
        ['The minimum age for membership of the Lok Sabha is:', ['18 years', '21 years', '25 years', '30 years'], 2, 'Parliament'],
        ['Who appoints the Comptroller and Auditor General of India?', ['Prime Minister', 'President', 'Chief Justice', 'Lok Sabha Speaker'], 1, 'Constitutional Offices'],
        ['Which part of the Constitution contains Fundamental Rights?', ['Part II', 'Part III', 'Part IV', 'Part V'], 1, 'Fundamental Rights'],
        ['The 73rd Constitutional Amendment is associated with:', ['Municipalities', 'Panchayati Raj', 'Emergency provisions', 'Fundamental Duties'], 1, 'Local Government'],
        ['The Council of Ministers is collectively responsible to the:', ['Rajya Sabha', 'Lok Sabha', 'President', 'Supreme Court'], 1, 'Union Executive'],
        ['Who presides over a joint sitting of both Houses of Parliament?', ['President', 'Vice-President', 'Lok Sabha Speaker', 'Prime Minister'], 2, 'Parliament'],
        ['The Directive Principles of State Policy are included in:', ['Part III', 'Part IV', 'Part V', 'Part VI'], 1, 'Constitution']
      ];
      const fact = facts[variation % facts.length];
      question = { text: fact[0], options: fact[1], answer: fact[2], topic: fact[3] };
    } else {
      const facts = [
        ['Which Article is associated with the Right to Constitutional Remedies?', ['Article 14', 'Article 19', 'Article 21', 'Article 32'], 3, 'Indian Polity'],
        ['Which is the largest ocean on Earth?', ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], 2, 'Geography'],
        ['The first passenger train in India ran between Bori Bunder and:', ['Thane', 'Pune', 'Surat', 'Nagpur'], 0, 'Railway History'],
        ['Who appoints the Governor of an Indian state?', ['Prime Minister', 'President', 'Chief Minister', 'Parliament'], 1, 'Indian Polity']
      ];
      const fact = facts[variation % facts.length];
      question = { text: fact[0], options: fact[1], answer: fact[2], topic: fact[3] };
    }

    return { id: `${exam}-${safeSubject}-${safeSet}-${index + 1}`, exam, subject: safeSubject, set: safeSet, year: 'Pattern practice', ...question, sourceUrl, ncertUrl };
  });
}

ensureStore();

const users = readJson(USERS_PATH, []);
const messages = readJson(MESSAGES_PATH, []);
const contacts = readJson(CONTACTS_PATH, []);
const sessions = readJson(SESSIONS_PATH, []);
const customQuestionSets = readJson(QUESTION_SETS_PATH, []);
const notifications = readJson(NOTIFICATIONS_PATH, []);
const blogs = readJson(BLOGS_PATH, []);
const studyMaterials = readJson(STUDY_MATERIALS_PATH, []);
const previousYearQuestionsList = readJson(PREVIOUS_YEAR_QUESTIONS_PATH, []);
let pyqNeedsSave = false;
previousYearQuestionsList.forEach((q, idx) => {
  if (!q.id) {
    q.id = `pyq-${idx + 1}`;
    pyqNeedsSave = true;
  }
});
if (pyqNeedsSave) {
  writeJson(PREVIOUS_YEAR_QUESTIONS_PATH, previousYearQuestionsList);
}
const chatClients = new Set();
const passwordResetRequests = new Map();
const passwordResetRateLimits = new Map();
rebuildQuestionCatalog();

function persistUsers() {
  writeJson(USERS_PATH, users);
}

function persistMessages() {
  writeJson(MESSAGES_PATH, messages);
}

function persistContacts() {
  writeJson(CONTACTS_PATH, contacts);
}

function persistSessions() {
  writeJson(SESSIONS_PATH, sessions);
}

// ==========================================
// REAL-TIME SYNCHRONIZATION ENGINE & BACKUP SHIELD
// ==========================================
const BACKUP_DIR = path.join(DATA_DIR, 'persistent_backup');
const syncSubscribers = new Set();
let dataVersion = {
  questionSets: 1,
  blogs: 1,
  notifications: 1,
  studyMaterials: 1,
  previousYearQuestions: 1,
  adSettings: 1,
  lastUpdated: Date.now()
};

function savePersistentBackup(entity) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    if (entity === 'questionSets') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'question-sets.json'), JSON.stringify(customQuestionSets, null, 2), 'utf8');
    } else if (entity === 'blogs') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'blogs.json'), JSON.stringify(blogs, null, 2), 'utf8');
    } else if (entity === 'notifications') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'notifications.json'), JSON.stringify(notifications, null, 2), 'utf8');
    } else if (entity === 'studyMaterials') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'study-materials.json'), JSON.stringify(studyMaterials, null, 2), 'utf8');
    } else if (entity === 'previousYearQuestions') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'previous-year-questions.json'), JSON.stringify(previousYearQuestionsList, null, 2), 'utf8');
    } else if (entity === 'adSettings') {
      fs.writeFileSync(path.join(BACKUP_DIR, 'ad-settings.json'), JSON.stringify(adSettings, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn(`[Sync Shield] Backup error for ${entity}:`, err.message);
  }
}

function broadcastSyncChange(entity) {
  if (dataVersion[entity] !== undefined) {
    dataVersion[entity] += 1;
  }
  dataVersion.lastUpdated = Date.now();
  savePersistentBackup(entity);

  const payload = JSON.stringify({
    entity,
    timestamp: dataVersion.lastUpdated,
    version: dataVersion[entity]
  });

  for (const client of syncSubscribers) {
    try {
      client.write(`event: change\ndata: ${payload}\n\n`);
    } catch (_) {
      syncSubscribers.delete(client);
    }
  }
}

function mergeStartupBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  try {
    const backupSetsPath = path.join(BACKUP_DIR, 'question-sets.json');
    if (fs.existsSync(backupSetsPath)) {
      const backupSets = readJson(backupSetsPath, []);
      let updated = false;
      backupSets.forEach((bSet) => {
        const curIdx = customQuestionSets.findIndex((s) => s.id === bSet.id);
        if (curIdx === -1) {
          customQuestionSets.push(bSet);
          updated = true;
        } else {
          const curTime = Date.parse(customQuestionSets[curIdx].updatedAt || 0) || 0;
          const bTime = Date.parse(bSet.updatedAt || 0) || 0;
          if (bTime > curTime) {
            customQuestionSets[curIdx] = bSet;
            updated = true;
          }
        }
      });
      if (updated) {
        writeJson(QUESTION_SETS_PATH, customQuestionSets);
      }
    }
  } catch (e) {
    console.warn('[Sync Shield] Startup backup merge error:', e.message);
  }
}
mergeStartupBackups();

function persistQuestionSets() {
  writeJson(QUESTION_SETS_PATH, customQuestionSets);
  broadcastSyncChange('questionSets');
}

function persistNotifications() {
  writeJson(NOTIFICATIONS_PATH, notifications);
  broadcastSyncChange('notifications');
}

function persistBlogs() {
  writeJson(BLOGS_PATH, blogs);
  broadcastSyncChange('blogs');
}

function persistStudyMaterials() {
  writeJson(STUDY_MATERIALS_PATH, studyMaterials);
  broadcastSyncChange('studyMaterials');
}

function persistPreviousYearQuestions() {
  writeJson(PREVIOUS_YEAR_QUESTIONS_PATH, previousYearQuestionsList);
  broadcastSyncChange('previousYearQuestions');
}

const defaultAdSettings = {
  enabled: false,
  adClient: '',
  autoAds: false,
  showTopBanner: true,
  showInFeed: true,
  showArticleBanner: true,
  testMode: false,
  updatedAt: new Date().toISOString()
};

let adSettings = readJsonObject(AD_SETTINGS_PATH, defaultAdSettings);

function persistAdSettings() {
  fs.writeFileSync(AD_SETTINGS_PATH, JSON.stringify(adSettings, null, 2), 'utf8');
  broadcastSyncChange('adSettings');
}

function rebuildQuestionCatalog() {
  Object.keys(questionSetSubjects).forEach((exam) => delete questionSetSubjects[exam]);
  Object.entries(builtInQuestionSetSubjects).forEach(([exam, subjects]) => { questionSetSubjects[exam] = [...subjects]; });
  Object.keys(classCurricula).forEach((classNumber) => delete classCurricula[classNumber]);
  Object.entries(builtInClassCurricula).forEach(([classNumber, subjects]) => { classCurricula[classNumber] = [...subjects]; });

  customQuestionSets.forEach((set) => {
    if (set.classNumber) {
      const cls = String(set.classNumber);
      if (!classCurricula[cls]) classCurricula[cls] = [];
      if (!classCurricula[cls].some((s) => s.toLowerCase() === String(set.subject || '').toLowerCase())) {
        classCurricula[cls].push(set.subject);
      }
    } else if (set.exam) {
      if (!questionSetSubjects[set.exam]) questionSetSubjects[set.exam] = [];
      if (!questionSetSubjects[set.exam].some((s) => s.toLowerCase() === String(set.subject || '').toLowerCase())) {
        questionSetSubjects[set.exam].push(set.subject);
      }
    }
  });
}

function getCustomQuestionSet({ exam, classNumber, subject, setNumber }) {
  const targetClass = classNumber ? String(classNumber).trim() : null;
  const targetExam = exam ? String(exam).trim() : null;
  const targetSubject = String(subject || '').trim().toLowerCase();
  const targetSet = Number(setNumber);

  return customQuestionSets.find((set) => {
    if (Number(set.setNumber) !== targetSet) return false;
    if (String(set.subject || '').trim().toLowerCase() !== targetSubject) return false;
    if (targetClass) {
      return String(set.classNumber || '') === targetClass;
    }
    if (targetExam) {
      return String(set.exam || '').trim().toLowerCase() === targetExam.toLowerCase();
    }
    return false;
  });
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !Number.isInteger(port) || !user || !pass) {
    if (user && pass && user.includes('@gmail.com')) {
      return {
        from: process.env.SMTP_FROM || user,
        transport: nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        })
      };
    }
    return null;
  }
  return {
    from: process.env.SMTP_FROM || user,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    })
  };
}

function hashResetSecret(email, secret) {
  return crypto.createHash('sha256').update(`${email}:${secret}`).digest('hex');
}

function isSameHash(actual, expected) {
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected || '', 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const legacyPasswordsMigrated = users.some((user) => typeof user.password === 'string' && !user.passwordHash);
if (legacyPasswordsMigrated) {
  users.forEach((user) => {
    if (typeof user.password === 'string' && !user.passwordHash) {
      user.passwordHash = hashPassword(user.password);
      delete user.password;
    }
  });
  persistUsers();
}

function verifyPassword(user, password) {
  if (typeof user.passwordHash === 'string') {
    const [, salt, expected] = user.passwordHash.split('$');
    const actual = Buffer.from(hashPassword(password, salt).split('$')[2], 'hex');
    const expectedBuffer = Buffer.from(expected || '', 'hex');
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  }
  return typeof user.password === 'string' && user.password === password;
}

const SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 3 months for students/guests (90 days)
const ADMIN_SESSION_DURATION_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years permanent for admin

function isUserAdmin(user) {
  if (!user || !user.email) return false;
  const configuredAdmin = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const allowedAdmins = new Set([
    'rajwarish38@gmail.com',
    ...(configuredAdmin ? [configuredAdmin] : []),
    ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()) : [])
  ].filter(Boolean));
  return allowedAdmins.has(String(user.email).trim().toLowerCase());
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const isAdmin = isUserAdmin(user);
  const duration = isAdmin ? ADMIN_SESSION_DURATION_MS : SESSION_DURATION_MS;
  sessions.push({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    userId: String(user.id),
    isAdmin: Boolean(isAdmin),
    expiresAt: Date.now() + duration
  });
  persistSessions();
  return token;
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please sign in to access this account.' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (sessions[index].expiresAt <= Date.now()) sessions.splice(index, 1);
  }
  persistSessions();
  const session = sessions.find((entry) => entry.tokenHash === tokenHash && entry.expiresAt > Date.now());
  const user = session && users.find((entry) => String(entry.id) === session.userId);
  if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });

  // Auto sliding extension: keeps active users active for 3 months, and admin active for 10 years indefinitely
  const isAdmin = isUserAdmin(user);
  const duration = isAdmin ? ADMIN_SESSION_DURATION_MS : SESSION_DURATION_MS;
  const threshold = isAdmin ? (9 * 365 * 24 * 60 * 60 * 1000) : (85 * 24 * 60 * 60 * 1000);
  if (session.expiresAt - Date.now() < threshold) {
    session.expiresAt = Date.now() + duration;
    persistSessions();
  }

  req.user = user;
  req.sessionTokenHash = tokenHash;
  next();
}

function optionalAuth(req, res, next) {
  if (!req.get('authorization')) return next();
  return requireAuth(req, res, next);
}

function requireAdmin(req, res, next) {
  const configuredAdmin = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const allowedAdmins = new Set([
    'rajwarish38@gmail.com',
    ...(configuredAdmin ? [configuredAdmin] : []),
    ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()) : [])
  ].filter(Boolean));

  const userEmail = String(req.user?.email || '').trim().toLowerCase();
  if (!allowedAdmins.has(userEmail)) {
    return res.status(403).json({ error: 'Admin access is required.' });
  }
  next();
}

function publicUser(user) {
  return {
    id: user.id,
    guestId: user.guestId || null,
    isGuest: Boolean(user.isGuest),
    name: user.name,
    email: user.email,
    contact: user.contact || null,
    exam: user.exam,
    location: user.location,
    schoolClass: user.schoolClass || null,
    goals: Array.isArray(user.goals) ? user.goals : []
  };
}

function getUserStats(user) {
  const testAttempts = Array.isArray(user.testAttempts) ? user.testAttempts : [];
  const totalAccuracy = testAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0);
  const studyTimeSeconds = testAttempts.reduce((sum, attempt) => sum + (attempt.durationSeconds || 0), 0);

  return {
    testsTaken: testAttempts.length,
    bestAccuracy: testAttempts.length ? Math.max(...testAttempts.map((attempt) => attempt.accuracy)) : 0,
    averageAccuracy: testAttempts.length ? Math.round(totalAccuracy / testAttempts.length) : 0,
    studyTimeSeconds,
    studyTimeMinutes: studyTimeSeconds ? Math.ceil(studyTimeSeconds / 60) : 0,
    testAttempts
  };
}

function getGamificationStats(user) {
  const attempts = Array.isArray(user.testAttempts) ? user.testAttempts : [];
  const completedAttempts = attempts.filter((attempt) => {
    const total = Number(attempt.total) || 0;
    const attemptedCount = Number.isInteger(attempt.attemptedCount) ? attempt.attemptedCount : total;
    return total > 0 && attemptedCount >= Math.ceil(total / 2);
  });
  const activityDays = [...new Set(completedAttempts.map((attempt) => {
    const timestamp = Date.parse(attempt.createdAt);
    return Number.isFinite(timestamp) ? Math.floor(timestamp / 86400000) : null;
  }).filter((day) => day !== null))].sort((left, right) => left - right);
  let currentRun = 0;
  let longestRun = 0;
  let previousDay = null;
  activityDays.forEach((day) => {
    currentRun = previousDay === day - 1 ? currentRun + 1 : 1;
    longestRun = Math.max(longestRun, currentRun);
    previousDay = day;
  });
  const today = Math.floor(Date.now() / 86400000);
  let currentStreak = activityDays.at(-1) >= today - 1 ? 1 : 0;
  for (let index = activityDays.length - 1; index > 0 && currentStreak; index -= 1) {
    if (activityDays[index - 1] !== activityDays[index] - 1) break;
    currentStreak += 1;
  }

  const helpfulVotes = messages
    .filter((message) => message.email === user.email)
    .reduce((total, message) => total + (Array.isArray(message.helpfulBy) ? message.helpfulBy.length : 0), 0);
  const streakMilestones = [
    { days: 3, id: 'streak-3', title: 'Three-Day Rhythm', points: 25 },
    { days: 7, id: 'streak-7', title: 'Week of Focus', points: 50 },
    { days: 14, id: 'streak-14', title: 'Two-Week Habit', points: 100 },
    { days: 30, id: 'streak-30', title: 'Monthly Momentum', points: 250 }
  ];
  const badges = [
    { id: 'first-test', title: 'First Finish', description: 'Complete your first test.', earned: completedAttempts.length >= 1 },
    ...streakMilestones.map((milestone) => ({ id: milestone.id, title: milestone.title, description: `${milestone.days}-day practice streak (+${milestone.points} pts).`, earned: longestRun >= milestone.days })),
    { id: 'helpful-1', title: 'Helpful Voice', description: 'Receive your first helpful vote.', earned: helpfulVotes >= 1 },
    { id: 'helpful-5', title: 'Community Guide', description: 'Receive 5 helpful votes.', earned: helpfulVotes >= 5 },
    { id: 'helpful-10', title: 'Trusted Mentor', description: 'Receive 10 helpful votes.', earned: helpfulVotes >= 10 }
  ];
  const milestonePoints = streakMilestones.filter((milestone) => longestRun >= milestone.days).reduce((total, milestone) => total + milestone.points, 0);
  const points = (completedAttempts.length * 5) + milestonePoints + (helpfulVotes * 10);
  const levelNames = ['Newbie', 'Learner', 'Achiever', 'Scholar', 'Mentor', 'Expert', 'Master', 'Champion', 'Legend', 'Icon'];
  const levelNumber = Math.floor(points / 100) + 1;
  const level = levelNames[levelNumber - 1] || `Level ${levelNumber}`;
  const nextLevel = levelNames[levelNumber] || `Level ${levelNumber + 1}`;
  const nextLevelPoints = levelNumber * 100;
  const levelProgress = points % 100;

  return { points, level, levelNumber, nextLevel, nextLevelPoints, pointsToNext: nextLevelPoints - points, levelProgress, testsCompleted: completedAttempts.length, currentStreak, longestStreak: longestRun, helpfulVotes, badges };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Result Darpan backend is running.' });
});

app.get('/api/questions', (req, res) => {
  const questions = getQuestionBank().map(({ answer, ...question }) => question);
  res.json({ questions });
});

app.get('/api/previous-year-questions', (req, res) => {
  const exam = typeof req.query.exam === 'string' ? req.query.exam.trim() : '';
  const list = exam && exam !== 'all'
    ? previousYearQuestionsList.filter((q) => String(q.exam || '').toLowerCase() === exam.toLowerCase())
    : previousYearQuestionsList;
  const questions = req.query.includeAnswers === 'true'
    ? list
    : list.map(({ answer, ...q }) => q);
  res.json({ questions, total: questions.length });
});

app.get('/api/question-sets', (req, res) => {
  const exam = questionSetSubjects[req.query.exam] ? req.query.exam : 'SSC CGL';
  const subjects = questionSetSubjects[exam];
  const subject = subjects.includes(req.query.subject) ? req.query.subject : subjects[0];
  const set = Math.min(500, Math.max(1, Number(req.query.set) || 1));
  const fullQuestions = getQuestionSet(exam, subject, set);
  const questions = req.query.includeAnswers === 'true' ? fullQuestions : fullQuestions.map(({ answer, ...question }) => question);
  const totalSets = Math.max(50, ...customQuestionSets.filter((entry) => String(entry.exam || '').toLowerCase() === String(exam).toLowerCase() && String(entry.subject || '').toLowerCase() === String(subject).toLowerCase()).map((entry) => Number(entry.setNumber) || 1));
  res.json({ exam, subject, set, totalSets, subjects, questions });
});

app.get('/api/question-set-catalog', (req, res) => {
  res.json({
    exams: Object.entries(questionSetSubjects).map(([exam, subjects]) => ({
      exam,
      subjects: subjects.map((subject) => ({
        subject,
        totalSets: Math.max(50, ...customQuestionSets.filter((entry) => String(entry.exam || '').toLowerCase() === String(exam).toLowerCase() && String(entry.subject || '').toLowerCase() === String(subject).toLowerCase()).map((entry) => Number(entry.setNumber) || 1))
      }))
    })),
    classes: Object.entries(classCurricula).map(([classNumber, subjects]) => ({
      classNumber,
      subjects: subjects.map((subject) => ({
        subject,
        totalSets: Math.max(30, ...customQuestionSets.filter((entry) => String(entry.classNumber || '') === String(classNumber) && String(entry.subject || '').toLowerCase() === String(subject).toLowerCase()).map((entry) => Number(entry.setNumber) || 1))
      }))
    }))
  });
});

const mockTests = {
  // Existing baseline
  'sbi-clerk': { exam: 'SBI Clerk', title: 'SBI Clerk Prelims 2026', totalQuestions: 100, durationSeconds: 3600 },
  'ssc-cgl': { exam: 'SSC CGL', title: 'SSC CGL Tier-I Mock 01', totalQuestions: 100, durationSeconds: 3600 },
  'nda-mathematics': { exam: 'NDA', title: 'NDA II 2026 · Mathematics', totalQuestions: 120, durationSeconds: 9000 },
  'rrb-ntpc': { exam: 'Railway NTPC', title: 'RRB NTPC CBT-I Mock 01', totalQuestions: 100, durationSeconds: 5400 },
  'ctet-paper-1': { exam: 'CTET', title: 'CTET Paper-I Mock 2026', totalQuestions: 150, durationSeconds: 9000 },

  // College & University Entrance
  'jee-main': { exam: 'JEE Main', title: 'JEE Main 2026 · Full Mock Test', totalQuestions: 90, durationSeconds: 10800 },
  'jee-advanced': { exam: 'JEE Advanced', title: 'JEE Advanced 2026 · Paper 1 Mock', totalQuestions: 54, durationSeconds: 10800 },
  'neet-ug': { exam: 'NEET UG', title: 'NEET UG 2026 · Full Practice Paper', totalQuestions: 180, durationSeconds: 12000 },
  'cuet-ug': { exam: 'CUET UG', title: 'CUET UG 2026 · General Test Mock', totalQuestions: 60, durationSeconds: 3600 },
  'gate-cs': { exam: 'GATE', title: 'GATE 2026 · Computer Science & IT', totalQuestions: 65, durationSeconds: 10800 },
  'cat-exam': { exam: 'CAT', title: 'CAT 2026 · Full Speed & Accuracy Mock', totalQuestions: 66, durationSeconds: 7200 },
  'clat-exam': { exam: 'CLAT', title: 'CLAT 2026 · Legal & Logical Reasoning', totalQuestions: 120, durationSeconds: 7200 },

  // Banking Exams
  'sbi-po': { exam: 'SBI PO', title: 'SBI PO Prelims 2026 · Mock Test', totalQuestions: 100, durationSeconds: 3600 },
  'ibps-po': { exam: 'IBPS PO', title: 'IBPS PO Prelims 2026 · Mock Test', totalQuestions: 100, durationSeconds: 3600 },
  'ibps-clerk': { exam: 'IBPS Clerk', title: 'IBPS Clerk Prelims 2026 · Mock Test', totalQuestions: 100, durationSeconds: 3600 },
  'rbi-grade-b': { exam: 'RBI Grade B', title: 'RBI Grade B Phase-I · Mock 2026', totalQuestions: 200, durationSeconds: 7200 },

  // SSC Exams
  'ssc-chsl': { exam: 'SSC CHSL', title: 'SSC CHSL (10+2) Tier-I Mock 2026', totalQuestions: 100, durationSeconds: 3600 },
  'ssc-mts': { exam: 'SSC MTS', title: 'SSC MTS & Havaldar Mock 2026', totalQuestions: 90, durationSeconds: 5400 },
  'ssc-gd': { exam: 'SSC GD', title: 'SSC GD Constable Practice Set 2026', totalQuestions: 80, durationSeconds: 3600 },

  // Railways Exams
  'rrb-group-d': { exam: 'Railway Group D', title: 'RRB Group D CBT Mock 2026', totalQuestions: 100, durationSeconds: 5400 },
  'rrb-alp': { exam: 'Railway ALP', title: 'RRB ALP CBT-I Practice Test', totalQuestions: 75, durationSeconds: 3600 },

  // Civil Services & State PCS
  'upsc-prelims': { exam: 'UPSC CSE', title: 'UPSC Civil Services Prelims · GS Paper I', totalQuestions: 100, durationSeconds: 7200 },
  'bpsc-prelims': { exam: 'BPSC', title: '70th BPSC Prelims · Full Mock Test', totalQuestions: 150, durationSeconds: 7200 },
  'uppsc-prelims': { exam: 'UPPSC', title: 'UPPSC PCS Prelims · GS Paper I', totalQuestions: 150, durationSeconds: 7200 },

  // Defence Exams
  'cds-exam': { exam: 'CDS', title: 'UPSC CDS II 2026 · English & GK Mock', totalQuestions: 120, durationSeconds: 7200 },
  'afcat-exam': { exam: 'AFCAT', title: 'AFCAT 01/2026 · Full Practice Test', totalQuestions: 100, durationSeconds: 7200 },

  // Teaching Exams
  'ctet-paper-2': { exam: 'CTET Paper 2', title: 'CTET Paper-II (Class 6-8) Mock 2026', totalQuestions: 150, durationSeconds: 9000 },
  'ugc-net': { exam: 'UGC NET', title: 'UGC NET Paper 1 · Teaching & Research Mock', totalQuestions: 50, durationSeconds: 3600 }
};

function buildMockTest(testId, setNumber = 1) {
  const test = mockTests[testId];
  if (!test) return null;
  const safeSet = Math.max(1, Number(setNumber) || 1);
  const subjects = questionSetSubjects[test.exam] || questionSetSubjects['SSC CGL'] || ['English', 'Mathematics', 'Reasoning', 'General Awareness'];
  const subjectSets = subjects.map((subject) => getQuestionSet(test.exam, subject, safeSet));
  const questions = Array.from({ length: test.totalQuestions }, (_, index) => {
    const subjectIndex = index % subjects.length;
    const subjectQuestionIndex = Math.floor(index / subjects.length);
    const question = subjectSets[subjectIndex][subjectQuestionIndex % subjectSets[subjectIndex].length];
    return { ...question, id: `${testId}-s${safeSet}-${index + 1}`, number: index + 1 };
  });
  const setTitle = test.title.includes('Mock')
    ? test.title.replace(/Mock\s*\d+/i, `Mock ${String(safeSet).padStart(2, '0')}`)
    : `${test.title} · Set ${String(safeSet).padStart(2, '0')}`;
  return { id: testId, ...test, title: setTitle, setNumber: safeSet, questions };
}

function validateTestAnswers(answers, questions) {
  return Array.isArray(answers) && answers.length === questions.length && answers.every((answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < 4));
}

function getSubmittedScore(answers, questions) {
  return answers.reduce((score, answer, index) => score + (answer === questions[index].answer ? 1 : 0), 0);
}

function guestTestAttempt(score, total, durationSeconds, details = {}) {
  return {
    score,
    total,
    accuracy: Math.round((score / total) * 100),
    durationSeconds,
    ...details,
    createdAt: new Date().toISOString()
  };
}

app.get('/api/mock-tests/:testId', (req, res) => {
  const setNumber = Math.max(1, Number(req.query.set) || 1);
  const test = buildMockTest(req.params.testId, setNumber);
  if (!test) return res.status(404).json({ error: 'Mock test not found.' });
  res.json({ ...test, questions: test.questions.map(({ answer, ...question }) => question) });
});

app.post('/api/mock-tests/:testId/results', optionalAuth, (req, res) => {
  const setNumber = Math.max(1, Number(req.body?.set) || 1);
  const test = buildMockTest(req.params.testId, setNumber);
  if (!test) return res.status(404).json({ error: 'Mock test not found.' });
  const answers = req.body?.answers;
  if (!validateTestAnswers(answers, test.questions)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
  const durationSeconds = Number(req.body?.durationSeconds || 0);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) return res.status(400).json({ error: 'A valid test duration is required.' });
  const attemptedCount = answers.filter((answer) => answer !== null).length;
  req.body = { score: getSubmittedScore(answers, test.questions), total: test.totalQuestions, attemptedCount, durationSeconds, exam: test.exam, testId: test.id, testName: test.title };
  if (req.user) return saveTestResult(req, res);
  return res.json({ attempt: guestTestAttempt(req.body.score, req.body.total, durationSeconds, { attemptedCount, exam: test.exam, testId: test.id, testName: test.title }) });
});

app.post('/api/question-sets/results', optionalAuth, (req, res) => {
  const exam = questionSetSubjects[req.body?.exam] ? req.body.exam : null;
  const subject = exam && questionSetSubjects[exam].includes(req.body?.subject) ? req.body.subject : null;
  const set = Number(req.body?.set);
  if (!subject || !Number.isInteger(set) || set < 1 || set > 500) return res.status(400).json({ error: 'Choose a valid exam, subject, and test set.' });
  const questions = getQuestionSet(exam, subject, set);
  const answers = req.body?.answers;
  if (!validateTestAnswers(answers, questions)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
  const durationSeconds = Number(req.body?.durationSeconds || 0);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) return res.status(400).json({ error: 'A valid test duration is required.' });
  const attemptedCount = answers.filter((answer) => answer !== null).length;
  req.body = { score: getSubmittedScore(answers, questions), total: questions.length, attemptedCount, durationSeconds, exam, testName: `${subject} practice test`, subject, set };
  if (req.user) return saveTestResult(req, res);
  return res.json({ attempt: guestTestAttempt(req.body.score, req.body.total, durationSeconds, { attemptedCount, exam, subject, set }) });
});

app.get('/api/classes/:classNumber/series', (req, res) => {
  const classNumber = Number(req.params.classNumber);
  const subjects = classCurricula[classNumber];
  if (!subjects) return res.status(404).json({ error: 'Choose a class from 9 to 12.' });
  res.json({
    classNumber: String(classNumber),
    title: `Class ${classNumber} test series`,
    subjects: subjects.map((subject) => ({
      subject,
      totalSets: Math.max(30, ...customQuestionSets.filter((entry) => String(entry.classNumber || '') === String(classNumber) && String(entry.subject || '').toLowerCase() === String(subject).toLowerCase()).map((entry) => Number(entry.setNumber) || 1)),
      questionsPerSet: getClassQuestionSet(classNumber, subject, 1).length,
      title: `${subject} practice series`
    }))
  });
});

app.get('/api/classes/:classNumber/series/:subject/:set', (req, res) => {
  const classNumber = Number(req.params.classNumber);
  const subjects = classCurricula[classNumber];
  const subject = subjects?.find((entry) => entry.toLowerCase() === req.params.subject.toLowerCase());
  const set = Number(req.params.set);
  if (!subjects || !subject) return res.status(404).json({ error: 'That subject is not offered for this class.' });
  if (!Number.isInteger(set) || set < 1 || set > 500) return res.status(400).json({ error: 'Choose a test set from 1 to 500.' });
  const questions = getClassQuestionSet(classNumber, subject, set).map(({ answer, ...question }) => question);
  res.json({ classNumber: String(classNumber), subject, set, questions });
});

app.post('/api/classes/:classNumber/series/:subject/:set/results', optionalAuth, (req, res) => {
  const classNumber = Number(req.params.classNumber);
  const subject = classCurricula[classNumber]?.find((entry) => entry.toLowerCase() === req.params.subject.toLowerCase());
  const set = Number(req.params.set);
  const answers = req.body?.answers;
  if (!subject || !Number.isInteger(set) || set < 1 || set > 500) return res.status(404).json({ error: 'Test series not found.' });
  const questions = getClassQuestionSet(classNumber, subject, set);
  if (!validateTestAnswers(answers, questions)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
  const score = answers.reduce((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0);
  const attemptedCount = answers.filter((answer) => answer !== null).length;
  req.body = {
    score,
    total: questions.length,
    attemptedCount,
    durationSeconds: Number(req.body.durationSeconds || 0),
    classNumber: String(classNumber),
    subject,
    set
  };
  if (req.user) return saveTestResult(req, res);
  const attempt = {
    score,
    total: questions.length,
    attemptedCount: answers.filter((answer) => answer !== null).length,
    accuracy: Math.round((score / questions.length) * 100),
    durationSeconds: req.body.durationSeconds,
    classNumber: String(classNumber),
    subject,
    set,
    createdAt: new Date().toISOString()
  };
  return res.json({ attempt });
});

const translationCache = new Map();

async function translateSingleText(text, target = 'hi', source = 'en') {
  if (!text || typeof text !== 'string') return text;
  const clean = text.trim();
  if (!clean) return clean;
  if (target === 'hi' && /[\u0900-\u097F]/.test(clean)) return clean;
  const key = `${source}:${target}:${clean}`;
  if (translationCache.has(key)) return translationCache.get(key);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        const result = data.responseData.translatedText;
        translationCache.set(key, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Translation proxy error:', err.message);
  }
  return clean;
}

app.get('/api/translate', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
  const target = typeof req.query.target === 'string' ? req.query.target.trim().toLowerCase() : 'hi';
  const source = typeof req.query.source === 'string' ? req.query.source.trim().toLowerCase() : 'en';
  if (!text) return res.status(400).json({ error: 'Text query parameter is required.' });
  const translatedText = await translateSingleText(text, target, source);
  res.json({ originalText: text, translatedText, target, source });
});

app.post('/api/translate/batch', async (req, res) => {
  const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
  const target = typeof req.body?.target === 'string' ? req.body.target.trim().toLowerCase() : 'hi';
  const source = typeof req.body?.source === 'string' ? req.body.source.trim().toLowerCase() : 'en';
  if (!texts.length) return res.status(400).json({ error: 'Texts array is required.' });
  const results = await Promise.all(texts.map((t) => translateSingleText(t, target, source)));
  res.json({ translatedTexts: results, target, source });
});

app.post('/api/contact', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`contact:${ip}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many contact submissions. Please wait a few minutes before trying again.' });
  }
  const { name, email, subject, message } = req.body || {};
  const contactName = sanitizeInput(name, 100);
  const contactEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 100) : '';
  const contactSubject = sanitizeInput(subject, 200);
  const contactMessage = sanitizeInput(message, 5000);

  if (!contactName || !contactEmail) {
    return res.status(400).json({ error: 'Please enter both your name and email address.' });
  }

  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const newContact = {
    id: Date.now(),
    name: contactName,
    email: contactEmail,
    subject: contactSubject || 'General enquiry',
    message: contactMessage || '(No message provided)',
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);
  persistContacts();

  // Send email to owner (rajwarish38@gmail.com)
  const targetEmail = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'rajwarish38@gmail.com';
  const recipientList = ['rajwarish38@gmail.com'];
  if (targetEmail && !recipientList.map(e => e.toLowerCase()).includes(targetEmail.toLowerCase())) {
    recipientList.push(targetEmail);
  }

  // 1. Dispatch directly via FormSubmit HTTP Relay to rajwarish38@gmail.com
  if (process.env.NODE_ENV !== 'test') {
    fetch('https://formsubmit.co/ajax/rajwarish38@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://resultdarpan.com',
        'Referer': 'https://resultdarpan.com/contact'
      },
      body: JSON.stringify({
        name: contactName,
        email: contactEmail,
        _replyto: contactEmail,
        _subject: `[Result Darpan Contact] ${contactSubject || 'New Student Feedback'} - from ${contactName}`,
        _captcha: 'false',
        _template: 'table',
        message: contactMessage || '(No message provided)'
      })
    })
      .then(async (fsRes) => {
        const fsData = await fsRes.json().catch(() => ({}));
        console.log('[Contact Relay] FormSubmit dispatched to rajwarish38@gmail.com:', fsRes.status, fsData);
      })
      .catch((err) => {
        console.warn('[Contact Relay] FormSubmit relay failed:', err.message);
      });
  }

  // 2. Also dispatch via SMTP if configured in environment
  const smtp = createSmtpTransport();
  if (smtp) {
    const safeName = contactName.replace(/[<>"']/g, '');
    const safeSubject = (contactSubject || 'New Student Feedback').replace(/[<>"']/g, '');
    smtp.transport.sendMail({
      from: `Result Darpan Contact <${smtp.from}>`,
      replyTo: `${safeName} <${contactEmail}>`,
      to: recipientList.join(', '),
      subject: `[Result Darpan Contact] ${safeSubject} - from ${safeName}`,
      text: `You have received a new contact message from Result Darpan:

Sender Name: ${contactName}
User Email: ${contactEmail}
Subject: ${contactSubject || 'General enquiry'}
Submitted At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Message:
${contactMessage || '(No message provided)'}

---
To reply directly to the student, hit Reply in your email client (Reply-To is set to ${contactEmail}).`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #0a22a3; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #0a22a3; margin: 0; font-size: 22px;">Result Darpan — New Contact Message</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Received from student form</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 130px;"><strong>Sender Name:</strong></td><td style="color: #0f172a; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>User Email:</strong></td><td style="color: #0f172a;"><a href="mailto:${contactEmail}" style="color: #0a22a3; text-decoration: underline;">${contactEmail}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Subject:</strong></td><td style="color: #0f172a;">${safeSubject}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Date & Time:</strong></td><td style="color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
          </table>
          <div style="background: #f8fafc; border-left: 4px solid #0a22a3; padding: 16px 20px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase;">Message</p>
            <p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${contactMessage || '(No message provided)'}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 0;">💡 <em>Hit Reply to respond directly to ${safeName} (${contactEmail}).</em></p>
        </div>
      `
    }).catch((err) => {
      console.warn('Contact email could not be delivered via SMTP:', err.message);
    });
  }

  res.status(201).json({
    message: 'Thanks for your feedback! We will get back to you soon.',
    contact: { id: newContact.id, name: contactName, email: contactEmail }
  });
});

// --- RESULT DARPAN AI STUDY MENTOR ENGINE ---
function generateRuleBasedAiResponse(cleanPrompt, targetExam = 'SSC CGL', user = null) {
  const p = cleanPrompt.toLowerCase().trim();

  // 1. Unimplemented Features Query Check
  // "if they ask something in our website which is not implimented yet ai should reply we are working on that, thanks for your feedback"
  const isUnimplementedFeature = (p.includes('app') && (p.includes('mobile') || p.includes('android') || p.includes('ios') || p.includes('play store') || p.includes('playstore') || p.includes('app store') || p.includes('appstore') || p.includes('apk') || p.includes('download app') || p.includes('phone app') || p.includes('install app'))) ||
    p.includes('play store') || p.includes('playstore') || p.includes('apk') || p.includes('app store') ||
    p.includes('offline mode') || p.includes('offline test') || p.includes('download full test') || p.includes('download all papers') || p.includes('download pdf of whole') || p.includes('printed book') || p.includes('hard copy') || p.includes('courier') ||
    p.includes('live class') || p.includes('live classes') || p.includes('video lecture') || p.includes('video course') || p.includes('zoom class') || p.includes('recorded class') || p.includes('video tutoring') ||
    p.includes('paid course') || p.includes('subscription plan') || p.includes('buy course') || p.includes('purchase course') || p.includes('vip membership') || p.includes('premium plan') || p.includes('pro plan') || p.includes('pricing plan') ||
    p.includes('audio lecture') || p.includes('audio notes') || p.includes('podcast') ||
    p.includes('call topper') || p.includes('mentor call') || p.includes('phone call with') ||
    p.includes('tamil') || p.includes('telugu') || p.includes('kannada') || p.includes('malayalam') || p.includes('marathi') || p.includes('bengali') || p.includes('gujarati') || p.includes('odia');

  if (isUnimplementedFeature) {
    return {
      reply: `🚀 **We are working on that! Thank you for your feedback.**

Our team is actively developing and expanding Result Darpan to bring you the best learning experience. Your suggestion has been noted and added to our roadmap, and we will make an official announcement once it is launched!

In the meantime, everything currently available on Result Darpan is **100% free with zero fees**:
• 📝 **Full-Length Mock Tests**: Free simulated tests for SSC CGL, RRB NTPC, Banking/SBI, CTET, Defence/NDA & Classes 9–12.
• 📚 **Subject Practice Drills**: Topic-wise practice for Quantitative Aptitude, Reasoning, English, General Studies & Hindi.
• 🎯 **Official PYQ Archive**: Verified previous year question papers with instant scorecards and step-by-step solutions.
• 📊 **My Prep Desk**: Track your 12-day consistency streaks, accuracy, and level up your badges.
• 🤖 **24/7 AI Study Mentor**: Roadmaps, routines, task checklists, and speed math tricks.

Thank you for helping us make Result Darpan even better!`,
      intent: 'feature-request'
    };
  }

  // 2. User Problem / Bug / Error / Website Feedback Reporting
  // "when user reports something about website, it will help user accordingly"
  const isBugOrReport = p.includes('bug') || p.includes('issue') || p.includes('error') || p.includes('glitch') ||
    p.includes('not working') || p.includes('not opening') || p.includes('failed') || p.includes('problem') ||
    p.includes('broken') || p.includes('stuck') || p.includes('freeze') || p.includes('crash') ||
    p.includes('cant login') || p.includes('cannot login') || p.includes('unable to login') || p.includes('login issue') ||
    p.includes('wrong answer') || p.includes('wrong question') || p.includes('typo') || p.includes('spelling mistake') ||
    p.includes('timer stopped') || p.includes('timer stuck') || p.includes('cant submit') || p.includes('cannot submit') ||
    p.includes('facing issue') || p.includes('facing problem') || p.includes('facing error') || p.includes('site down') ||
    p.includes('slow loading') || p.includes('complaint') || (p.includes('report') && !p.includes('card'));

  if (isBugOrReport) {
    try {
      contacts.push({
        id: Date.now(),
        name: (user && user.name) || 'Student Chat User',
        email: (user && user.email) || 'chat-report@resultdarpan.com',
        subject: 'User Report / Issue via AI Chat',
        message: cleanPrompt,
        createdAt: new Date().toISOString()
      });
      persistContacts();
    } catch {}

    return {
      reply: `🛠️ **Result Darpan Support Desk: We are here to help!**

Thank you for reporting this! We take user experience very seriously, and your report has been recorded directly for our technical desk and platform administrator.

Here are quick troubleshooting steps you can try right now:
1. 🔄 **Page or Test Refresh**: Perform a hard refresh (**Ctrl + F5** on Windows or **Cmd + Shift + R** on Mac) to ensure your browser is running the latest update.
2. 🔑 **Login / Session Issues**: Verify that your registered email or phone is typed correctly without spaces. If needed, click **"Forgot Password?"** on the login page to receive an instant verification code.
3. 📝 **Question or Score Discrepancy**: If you noticed a wrong answer key or typographical typo, our question bank moderators review and correct test sets daily.
4. 📬 **Direct Assistance**: You can email platform operator **Warish Raj** directly at **Rajwarish38@gmail.com**, or drop a ticket via our [About Us / Contact page](contact.html).

We are on it and appreciate your support in keeping Result Darpan reliable!`,
      intent: 'user-report'
    };
  }

  // 3. Platform Introduction & Website Ownership
  // "also it should help introduce our website"
  const isPlatformIntro = p.includes('what is result darpan') || p.includes('about result darpan') ||
    p.includes('who made') || p.includes('who created') || p.includes('who owns') || p.includes('who is owner') ||
    p.includes('founder') || p.includes('warish raj') || p.includes('tell me about result darpan') ||
    p.includes('tell me about this website') || p.includes('what does this website do') || p.includes('how does result darpan work') ||
    p.includes('features of result darpan') || p.includes('what can i do here') || p.includes('is this website free') ||
    p.includes('is it free') || p.includes('is result darpan free') || p.includes('pricing') || p.includes('fees') ||
    p.includes('charges') || p.includes('cost') || p.includes('why result darpan') || p.includes('introduce result darpan') ||
    p.includes('introduce website') || p.includes('introduce your website');

  if (isPlatformIntro) {
    return {
      reply: `✦ **Welcome to Result Darpan — India's Free Exam Preparation Mirror**

Result Darpan is an educational platform founded, owned, and operated by **Warish Raj** (Contact: **Rajwarish38@gmail.com**, Portal: **Resultdarpan.com**).

Our mission is to empower every student and competitive exam aspirant in India with top-tier preparation tools — **100% free forever, with zero subscription fees or paywalls**.

🌟 **Key Platform Features**:
1. 📝 **Full-Length Mock Tests**: Realistic exam interface with live countdown timers, negative marking, and instant detailed solutions for SSC CGL, Railways RRB NTPC/Group D, Banking (IBPS/SBI), CTET, and Defence (NDA).
2. 📚 **Subject Practice Drills**: Daily targeted sets for Quantitative Aptitude, Logical Reasoning, General English, General Awareness, and Hindi Grammar.
3. 🎯 **Official PYQ Archive**: Real previous year papers solved with clear step-by-step methodologies.
4. 🏫 **School Classes (9 to 12)**: Board exam practice and NCERT foundation series for Science, Mathematics, Social Science, and Hindi.
5. 📊 **My Prep Desk**: Track your 12-day consistency streaks, accuracy metrics, and unlock achievement levels.
6. 🤖 **24/7 AI Study Mentor**: Instant customized 60-day roadmaps, timetable optimizer, daily task checklists, topper calculation shortcuts, and live exam notices.
7. 🔒 **Transparent Privacy & Trust**: Governed by strict privacy and student data protection standards under Indian law.

What exam are you currently preparing for? Tell me your goal and I will plan your strategy!`,
      intent: 'platform-intro'
    };
  }

  // 4. Conversational Greetings & Gratitude
  const isGreeting = (p === 'hi' || p === 'hello' || p === 'hey' || p === 'namaste' || p.startsWith('hi ') || p.startsWith('hello ') || p.startsWith('hey ') || p.includes('good morning') || p.includes('good afternoon') || p.includes('good evening') || p.includes('how are you') || p.includes('who are you')) && !p.includes('plan') && !p.includes('routine') && !p.includes('test');

  if (isGreeting) {
    return {
      reply: `👋 **Hello! Welcome to Result Darpan AI Study Mentor.**

I am your 24/7 dedicated exam preparation assistant for **${targetExam}** and all national competitive exams on Result Darpan (owned & operated by Warish Raj).

Here are quick things we can do together right now:
• 📅 **Study Guide**: Ask me *"Plan a 60-day study roadmap for ${targetExam}"*
• ⏰ **Daily Routine**: Ask me *"Fix my daily routine and timetable"*
• 📝 **Today's Tasks**: Ask me *"Give me today's priority study checklist"*
• ⚡ **Shortcuts & Tricks**: Ask me *"Give me topper calculation shortcuts and speed math tricks"*
• 📢 **Exam Updates**: Ask me *"What are the upcoming exam dates and deadlines?"*
• 📖 **Academic Doubts**: Ask me any question in Maths, Science, Reasoning, English, or General Awareness!

What would you like to conquer today?`,
      intent: 'greeting'
    };
  }

  const isGratitude = p.includes('thank') || p.includes('thanks') || p.includes('helpful') || p.includes('awesome') || p.includes('great work') || p.includes('good job') || p.includes('dhanyawad') || p.includes('shukriya');

  if (isGratitude) {
    return {
      reply: `🌟 **You are very welcome!**

Remember: Consistent daily effort is the secret to cracking ${targetExam}.
Take a quick 10-minute quiz on Result Darpan today under **Subject Practice** to lock in what you learned, or check your streak on **My Prep Desk**!

Feel free to ask whenever you need a formula, roadmap, or shortcut. Keep up the great work! 🚀`,
      intent: 'gratitude'
    };
  }

  // 5. Study Guide / 60-Day Roadmap / Preparation Strategy
  const isStudyGuide = p.includes('study guide') || p.includes('roadmap') || p.includes('study plan') ||
    p.includes('prep plan') || p.includes('preparation plan') || p.includes('60-day') || p.includes('60 day') ||
    p.includes('30-day') || p.includes('30 day') || p.includes('how to prepare') || p.includes('syllabus guide') ||
    p.includes('how to crack') || p.includes('strategy') || (p.includes('plan') && !p.includes('lesson plan'));

  if (isStudyGuide) {
    return {
      reply: `🎯 **Result Darpan 60-Day Master Study Guide & Roadmap** (${targetExam})

**Phase 1: Foundation & High-Yield Concepts (Days 1–20)**
• **Quantitative / Maths**: Complete core chapters (Percentages, Ratio & Proportion, Averages, Profit & Loss). Build a formula cheat-sheet.
• **Reasoning**: Master high-weightage topics (Syllogisms, Coding-Decoding, Series, Blood Relations).
• **General Awareness / English**: Read daily 15-minute editorial capsules; practice 25 grammar and vocabulary flashcards.
• **Goal**: 100% conceptual clarity; avoid solving under timer pressure in this phase.

**Phase 2: Timed Sectional Drills & Speed Building (Days 21–45)**
• Shift to timed practice on Result Darpan: solve 40–50 mixed questions daily.
• Benchmark your pacing: aim for < 50 seconds per Reasoning question and < 65 seconds per Quant problem.
• Use Result Darpan's instant solution breakdown to find where you lose marks.

**Phase 3: Full-Length Mocks & Error Log Sprints (Days 46–60)**
• Attempt 2 to 3 full-length Result Darpan mock tests per week in the exact exam time slot.
• **The Golden 1.5x Rule**: For every 60-minute test, invest 90 minutes analyzing incorrect answers and unattempted questions.
• Maintain a dedicated Error Notebook so you never repeat the same conceptual mistake twice!

🏆 *Topper Tip: Consistency is a quiet superpower. 2 hours of focused daily practice beats an irregular 8-hour marathon.*`,
      intent: 'study-guide'
    };
  }

  // 2. Daily Routine & Timetable
  const isDailyRoutine = p.includes('routine') || p.includes('timetable') || p.includes('time table') ||
    p.includes('schedule') || p.includes('daily routine') || p.includes('time management') ||
    p.includes('manage time') || p.includes('study hours') || p.includes('hours') || p.includes('wake up');

  if (isDailyRoutine) {
    return {
      reply: `⏰ **High-Yield Daily Routine & Study Timetable** (Recommended for ${targetExam})

🌅 **Slot 1 (06:30 AM – 09:00 AM) · Peak Cognitive Window**
• **Focus**: Quantitative Aptitude / Mathematics or Complex Reasoning.
• **Rationale**: Peak brain energy and willpower. Zero mobile phone distractions.

☀️ **Slot 2 (10:30 AM – 01:00 PM) · Concept Deep-Dive & Theory**
• **Focus**: General Studies, Static GK, Current Affairs, or English Comprehension.
• **Method**: Active recall and 1-page summary notes rather than passive reading.

☕ **Slot 3 (03:30 PM – 05:30 PM) · Active Speed Drills**
• **Focus**: Subject-wise practice quizzes on Result Darpan.
• **Target**: Speed calculations, short-tricks, and elimination techniques under timer pressure.

🌙 **Slot 4 (07:30 PM – 09:30 PM) · Full Mock Test & Error Log**
• **Focus**: Attempt 1 mock test or 50 mixed PYQs.
• **Crucial Step**: Log all mistakes into your Error Notebook with the underlying rule.

💤 **Slot 5 (10:00 PM – 10:30 PM) · 15-Minute Review & Sleep**
• **Focus**: Quick formula cards glance, lock tomorrow's top 3 priorities, and get 7+ hours of restful sleep for memory consolidation.

💡 *Guideline: Follow 50-minute study blocks with 10-minute stretch/water breaks. Keep your daily streak unbroken!*`,
      intent: 'daily-routine'
    };
  }

  // 3. Study Tasks & Daily Checklist
  const isStudyTasks = p.includes('task') || p.includes('tasks') || p.includes('checklist') ||
    p.includes('today') || p.includes('to do') || p.includes('todo') || p.includes('what to study') ||
    p.includes('daily task') || p.includes('action items');

  if (isStudyTasks) {
    return {
      reply: `📝 **Today's Actionable Study Checklist** (Target: ${targetExam})

[ ] **Task 1 (Concept Focus)**: Deep-dive into 1 weak chapter for 45 minutes; write down key formulas or grammar rules.
[ ] **Task 2 (Timed Practice)**: Attempt at least 40 fresh MCQs on Result Darpan with the timer running.
[ ] **Task 3 (Error Log)**: Record every wrong answer or lucky guess into your Error Notebook; write *why* the right option works.
[ ] **Task 4 (Memory Sprint)**: Revise 20 formula cards, multiplication tables (up to 30), or high-frequency vocabulary roots.
[ ] **Task 5 (Current Affairs)**: Read today's 15-minute national and international news digest and solve a 10-question quiz.

✨ *Check off all 5 items before your night review to keep your preparation streak at 100%!*`,
      intent: 'study-tasks'
    };
  }

  // 4. Exam Updates & Deadlines (Live notifications lookup)
  const hasExamWord = (word) => new RegExp(`\\b${word}\\b`, 'i').test(p);
  const isExamQuery = p.includes('exam update') || p.includes('exam date') || p.includes('notification') ||
    p.includes('notif') || p.includes('admit card') || p.includes('deadline') || p.includes('vacancy') ||
    p.includes('vacancies') || p.includes('apply date') || p.includes('last date') || p.includes('when is') ||
    p.includes('upcoming exam') || p.includes('schedule') || p.includes('dates') ||
    hasExamWord('ctet') || hasExamWord('nda') || hasExamWord('norcet') || hasExamWord('cgl') || hasExamWord('rrb') || hasExamWord('ntpc');

  if (isExamQuery && Array.isArray(notifications) && notifications.length > 0) {
    let matched = [];
    if (hasExamWord('ctet')) matched = notifications.filter(n => (n.exam && n.exam.toLowerCase().includes('ctet')) || (n.title && n.title.toLowerCase().includes('ctet')));
    else if (hasExamWord('cgl') || hasExamWord('ssc')) matched = notifications.filter(n => (n.exam && n.exam.toLowerCase().includes('ssc')) || (n.title && n.title.toLowerCase().includes('ssc')));
    else if (hasExamWord('nda')) matched = notifications.filter(n => (n.exam && n.exam.toLowerCase().includes('nda')) || (n.title && n.title.toLowerCase().includes('nda')));
    else if (hasExamWord('norcet') || p.includes('aiims') || p.includes('nurs')) matched = notifications.filter(n => (n.exam && n.exam.toLowerCase().includes('aiims')) || (n.title && n.title.toLowerCase().includes('norcet')));
    else if (p.includes('railway') || hasExamWord('ntpc') || hasExamWord('rrb')) matched = notifications.filter(n => (n.exam && n.exam.toLowerCase().includes('railway')) || (n.exam && n.exam.toLowerCase().includes('ntpc')));

    if (matched.length > 0) {
      const items = matched.map(n => 
`📢 **${n.title}**
• **Target Exam**: ${n.exam} (${n.category || 'National Level'})
• **Exam Date**: ${n.examDate || 'Announced soon'} (${n.daysText || 'Upcoming'})
• **Total Vacancies**: ${n.vacancies || 'Check official portal'}
• **Eligibility**: ${n.eligibility || 'Check official brochure'}
• **Apply Deadline**: ${n.applyDeadline || 'Active / On-going'}
• **Official Portal**: ${n.officialLink || 'Official Govt Portal'}
• **Summary**: ${n.details || 'Check official portal for syllabus & shifts.'}`
      ).join('\n\n');

      return {
        reply: `${items}\n\n💡 *Result Darpan Tip: Free mock tests, syllabus-wise sets, and previous year papers for ${matched[0].exam} are live right now on Result Darpan!*`,
        intent: 'exam-updates'
      };
    }

    // General upcoming exams list from live notifications
    const upcomingList = notifications.slice(0, 4).map(n => 
`• **${n.exam}**: ${n.title}
  📅 Date: ${n.examDate} (${n.daysText}) | 👥 Vacancies: ${n.vacancies}
  🔗 Portal: ${n.officialLink}`
    ).join('\n\n');

    return {
      reply: `📢 **Result Darpan Live Exam Radar & Updates**\n\nHere are the latest active exam notices verified by our research desk:\n\n${upcomingList}\n\n💡 *All mock tests and PYQs on Result Darpan are 100% free with instant detailed solutions.*`,
      intent: 'exam-updates'
    };
  }

  // 5. Doubts & Subject Shortcuts
  const isShortcutQuery = p.includes('shortcut') || p.includes('shortcuts') || p.includes('trick') ||
    p.includes('tricks') || p.includes('speed math') || p.includes('mental math') ||
    p.includes('formula') || p.includes('formulas') || p.includes('calculation') ||
    p.includes('fast solve') || p.includes('hack') || p.includes('hacks') ||
    p.includes('math trick') || p.includes('math shortcut') || p.includes('reasoning trick') ||
    p.includes('doubts') || p.includes('doubt');

  const isSpecificReasoning = (p.includes('reasoning') || p.includes('syllogism') || p.includes('blood relation') || p.includes('direction')) &&
    !p.includes('calculation') && !p.includes('speed math');

  const isSpecificPercentage = p.includes('percent') && !p.includes('calculation') && !p.includes('speed math');

  if (isSpecificPercentage) {
    return {
      reply: `💡 **Topper Math Shortcut: Percentage Multipliers & Rapid Fractions**

• **Fraction Conversions to Memorize**:
  1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%, 1/5 = 20%, 1/6 = 16.66%, 1/7 = 14.28%, 1/8 = 12.5%, 1/9 = 11.11%, 1/11 = 9.09%, 1/12 = 8.33%, 1/16 = 6.25%.
• **Multiplier Method**:
  - Increase by 20% ➔ Multiply by 1.2
  - Decrease by 15% ➔ Multiply by 0.85
• **Successive Percentage Rule**:
  - Two successive changes of x% and y% ➔ Net change = [x + y + (xy / 100)]%
• **Price & Consumption Inversion**:
  - If the price of an article increases by 1/n, consumption must decrease by 1/(n + 1) to keep the total expense unchanged!
• Practice 30 timed percentage questions on Result Darpan under **Subject Practice** to lock in your speed!`,
      intent: 'shortcuts'
    };
  }

  if (isSpecificReasoning) {
    return {
      reply: `💡 **Topper Reasoning Shortcuts: Speed Rules & Hacks**

1. **EJOTY Alphabet Positions**:
   - E = 5, J = 10, O = 15, T = 20, Y = 25. Quickly count ±1 or ±2 from these anchors.
2. **Opposite Letter Pairs (Sum = 27)**:
   - A-Z, B-Y, C-X, D-W, E-V, F-U, G-T, H-S, I-R, J-Q, K-P, L-O, M-N.
3. **Syllogisms (Venn Diagrams)**:
   - Draw minimal overlapping circles for affirmative statements.
   - A definite conclusion is TRUE only if it holds across *all* valid diagrams.
   - Complementary 'Either-Or' condition: Both false individually + same subject/predicate + (Some + No) or (All + Some Not).
4. **Distance & Direction**:
   - Right Turn = 90° Clockwise | Left Turn = 90° Anti-Clockwise. Use Pythagoras theorem a² + b² = c² for straight-line displacement.
5. Practice a 25-question reasoning set on Result Darpan to sharpen your recognition!`,
      intent: 'shortcuts'
    };
  }

  if (p.includes('time and work') || p.includes('pipe') || p.includes('cistern') || (p.includes('work') && p.includes('day'))) {
    return {
      reply: `💡 **Topper Math Shortcut: Time & Work (LCM Unit Method)**

• **Stop using 1/A + 1/B fractions**:
  - Find the LCM of the given days to define the **Total Work Units**.
  - Example: A completes in 12 days, B in 15 days.
    LCM(12, 15) = 60 units of Total Work.
  - Daily efficiency of A = 60 / 12 = 5 units/day.
  - Daily efficiency of B = 60 / 15 = 4 units/day.
  - Together = 5 + 4 = 9 units/day.
  - Time together = 60 / 9 = 6.67 days (6 days 16 hours).
• Works seamlessly for negative efficiency (leakage/empty pipes) and efficiency ratios!
• Practice 20 Time & Work questions on Result Darpan to master this in under 30 seconds per question.`,
      intent: 'shortcuts'
    };
  }

  const isSpeedDistance = (p.includes('distance') || p.includes('train') || p.includes('boat') ||
    p.includes('stream') || p.includes('relative speed') ||
    (p.includes('speed') && (p.includes('km') || p.includes('average speed') || p.includes('travel')))) &&
    !p.includes('speed math');

  if (isSpeedDistance) {
    return {
      reply: `💡 **Topper Math Shortcut: Speed, Distance & Time Formulas**

• **Km/h to m/s conversion**: Multiply by 5/18 (and m/s to km/h multiply by 18/5).
• **Average Speed for Equal Distance**:
  - S_avg = (2 × S1 × S2) / (S1 + S2) [Harmonic mean, never arithmetic mean!].
• **Relative Speed**:
  - Opposite directions (heading toward each other): S_rel = S1 + S2.
  - Same direction (overtaking): S_rel = |S1 - S2|.
• **Inverse Ratio Rule**: When distance is constant, Speed Ratio (A:B) = Time Ratio (B:A).
• Train crossing a platform/bridge = Distance is (Train Length + Platform Length).
• Train crossing a pole/man = Distance is Train Length alone.`,
      intent: 'shortcuts'
    };
  }

  // 6. Academic Concepts & Subject Doubts (Math, Science, Polity, History, English, Economics)
  // Compound Interest / Simple Interest
  if (p.includes('compound interest') || p.includes('simple interest') || p.includes('ci and si') || p.includes('interest formula') || p.includes('difference between ci')) {
    return {
      reply: `💡 **Quantitative Aptitude: Simple & Compound Interest Formulas & Shortcuts**

1. **Simple Interest (SI)**:
   - Formula: SI = (P × R × T) / 100
   - Total Amount: A = P + SI = P [1 + (R × T / 100)]

2. **Compound Interest (CI)**:
   - Annual Compounding: A = P [1 + (R / 100)]^T
   - Half-Yearly: Rate becomes R/2, Time becomes 2T.
   - Quarterly: Rate becomes R/4, Time becomes 4T.

3. **Topper Difference Shortcuts (High Exam Weightage)**:
   - **For 2 Years**:
     Difference (CI - SI) = P × (R / 100)²
   - **For 3 Years**:
     Difference (CI - SI) = P × (R / 100)² × [3 + (R / 100)]
   - *Example*: If P = ₹5,000, R = 10%, for 2 years:
     Diff = 5000 × (0.1)² = 5000 × 0.01 = ₹50. Solved in 5 seconds without lengthy calculations!

Practice 15 Interest questions under **Subject Practice ➔ Quantitative Aptitude** on Result Darpan!`,
      intent: 'academic-math'
    };
  }

  // Profit and Loss
  if (p.includes('profit and loss') || p.includes('cost price') || p.includes('selling price') || p.includes('marked price') || (p.includes('discount') && !p.includes('code'))) {
    return {
      reply: `💡 **Quantitative Aptitude: Profit, Loss & Discount Formulas**

• **Profit %** = [(SP - CP) / CP] × 100
• **Loss %** = [(CP - SP) / CP] × 100
• **Marked Price & Discount**:
  - Discount = MP - SP
  - Discount % = (Discount / MP) × 100
  - Golden Relation: MP / CP = (100 + Profit%) / (100 - Discount%)
• **Dishonest Dealer Shortcut**:
  - If a shopkeeper uses a false weight of w grams instead of 1000g:
    Profit % = [(1000 - w) / w] × 100

Test these concepts under **Subject Practice** on Result Darpan!`,
      intent: 'academic-math'
    };
  }

  // Newton's Laws & Physics
  if (p.includes('newton') || p.includes('laws of motion') || p.includes('law of motion') || p.includes('gravity') || p.includes('gravitation')) {
    return {
      reply: `🔬 **General Science (Physics): Newton's Laws of Motion & Gravitation**

1. **Newton's 1st Law (Law of Inertia)**:
   - An object remains at rest or in uniform motion unless acted upon by an external net force.
   - *Exam Example*: When a bus stops suddenly, passengers lurch forward due to inertia of motion.

2. **Newton's 2nd Law (Force & Momentum)**:
   - Force is the rate of change of momentum: F = m × a (Mass × Acceleration).
   - Unit: Newton (N) or kg·m/s².
   - *Exam Example*: A cricket fielder pulls his hands backward while catching to increase impact time, reducing force.

3. **Newton's 3rd Law (Action-Reaction)**:
   - For every action, there is an equal and opposite reaction (F_AB = -F_BA).
   - *Exam Example*: Recoil of a gun, propulsion of a rocket.

4. **Universal Gravitation**:
   - F = G (m₁ m₂) / r², where G = 6.674 × 10⁻¹¹ N·m²/kg².
   - Acceleration due to gravity on Earth: g ≈ 9.8 m/s² (at Earth's center, g = 0).

Take a quick General Science quiz on Result Darpan to test these concepts!`,
      intent: 'academic-science'
    };
  }

  // Photosynthesis & Biology
  if (p.includes('photosynthesis') || p.includes('chlorophyll') || p.includes('cell organelle') || p.includes('mitochondria') || p.includes('dna') || p.includes('vitamin')) {
    return {
      reply: `🧬 **General Science (Biology): Key Exam Concepts**

1. **Photosynthesis**:
   - Process where green plants convert sunlight into chemical energy.
   - **Balanced Equation**:
     6CO₂ + 6H₂O ➔ C₆H₁₂O₆ (Glucose) + 6O₂ (under Sunlight & Chlorophyll)
   - Site: Chloroplasts (Chlorophyll pigment absorbs blue and red wavelengths, reflects green).

2. **Vital Cell Organelles**:
   - **Mitochondria**: *"Powerhouse of the cell"* — produces cellular energy in the form of ATP.
   - **Ribosomes**: Site of protein synthesis.
   - **Lysosomes**: *"Suicidal bags of the cell"* — contain hydrolytic digestive enzymes.
   - **Nucleus**: Contains genetic material (DNA/Chromosomes) and directs cell activities.

3. **High-Yield Vitamins & Deficiency Diseases**:
   - **Vitamin A (Retinol)**: Night Blindness, Xerophthalmia.
   - **Vitamin B1 (Thiamine)**: Beriberi.
   - **Vitamin C (Ascorbic Acid)**: Scurvy (bleeding gums).
   - **Vitamin D (Calciferol)**: Rickets in children, Osteomalacia in adults.
   - **Vitamin K (Phylloquinone)**: Failure of blood clotting (hemorrhage).

Attempt a 20-question Biology drill on Result Darpan to lock in these high-weightage questions!`,
      intent: 'academic-science'
    };
  }

  // Indian Constitution & Polity
  if (p.includes('constitution') || p.includes('fundamental right') || p.includes('fundamental duty') || p.includes('preamble') || p.includes('article') || p.includes('polity') || p.includes('parliament') || p.includes('president of india')) {
    return {
      reply: `🏛️ **General Awareness (Indian Polity): Essential Exam Facts**

1. **The Indian Constitution Overview**:
   - Adopted on: **26 November 1949** | Came into effect: **26 January 1950** (Republic Day).
   - Chairman of Drafting Committee: **Dr. B.R. Ambedkar** (Father of Indian Constitution).
   - Longest written constitution of any sovereign country in the world.

2. **Fundamental Rights (Part III, Articles 12–35)**:
   - Originally 7, now 6 (Right to Property removed by 44th Amendment 1978).
   - 1) Right to Equality (Art. 14–18)
   - 2) Right to Freedom (Art. 19–22)
   - 3) Right against Exploitation (Art. 23–24)
   - 4) Right to Freedom of Religion (Art. 25–28)
   - 5) Cultural & Educational Rights (Art. 29–30)
   - 6) Right to Constitutional Remedies (**Article 32** — Dr. Ambedkar called it the *"Heart and Soul"* of the Constitution).

3. **5 Writs under Article 32 (Supreme Court) & Article 226 (High Courts)**:
   - Habeas Corpus (Produce the body), Mandamus (We command), Prohibition, Certiorari (To be certified), Quo-Warranto (By what authority).

4. **Fundamental Duties (Part IV-A, Article 51A)**:
   - Added by 42nd Amendment 1976 on recommendation of the Swaran Singh Committee. 11 duties in total.

Solve Indian Polity sets under **Previous Year Papers** on Result Darpan!`,
      intent: 'academic-polity'
    };
  }

  // English Grammar: Active/Passive Voice, Narration, Rules
  if (p.includes('active voice') || p.includes('passive voice') || p.includes('direct speech') || p.includes('indirect speech') || p.includes('narration') || p.includes('subject verb agreement') || p.includes('grammar')) {
    return {
      reply: `📖 **General English: High-Yield Grammar Rules & Voice/Narration**

1. **Active to Passive Voice Transformation**:
   - **General Rule**: Object becomes Subject + Appropriate form of 'Be' + Past Participle (V₃) + 'by' + Agent.
   - Present Simple (V₁ / do / does) ➔ is / am / are + V₃
   - Present Continuous (is/am/are + V₄) ➔ is/am/are + **being** + V₃
   - Present Perfect (has/have + V₃) ➔ has/have + **been** + V₃
   - Past Simple (V₂) ➔ was / were + V₃
   - Modal (can/could/will/shall/must) ➔ Modal + **be** + V₃

2. **Direct to Indirect Speech (Narration Rules)**:
   - If reporting verb is in past (*said*), tense changes:
     - Present Simple ➔ Past Simple (*write* ➔ *wrote*)
     - Present Continuous ➔ Past Continuous (*is writing* ➔ *was writing*)
     - Present Perfect ➔ Past Perfect (*has written* ➔ *had written*)
     - Past Simple ➔ Past Perfect (*wrote* ➔ *had written*)
     - Will ➔ Would, Shall ➔ Should, May ➔ Might, Can ➔ Could
   - Time/Place shifts: *Now* ➔ *Then*, *Today* ➔ *That day*, *Here* ➔ *There*, *Tomorrow* ➔ *The next day*.

3. **Golden Subject-Verb Agreement Rule**:
   - Phrases like *together with, along with, as well as, in addition to* follow the **first subject**.
   - *Neither...nor* and *Either...or* follow the **nearest subject**.

Practice 25 English error spotting questions on Result Darpan to sharpen your exam accuracy!`,
      intent: 'academic-english'
    };
  }

  // General Economics (GDP, Inflation, RBI)
  if (p.includes('gdp') || p.includes('inflation') || p.includes('repo rate') || p.includes('rbi') || p.includes('monetary policy') || p.includes('fiscal')) {
    return {
      reply: `📊 **General Studies (Economics): High-Yield Exam Definitions**

1. **GDP (Gross Domestic Product)**:
   - The total monetary value of all finished goods and services produced within a country's domestic borders in a given time period (usually 1 year).
   - GDP = C + I + G + (X - M) (Consumption + Investment + Government Spending + Net Exports).

2. **Inflation**:
   - The sustained increase in the general price level of goods and services over time, reducing purchasing power.
   - Measured in India by **CPI (Consumer Price Index)** and **WPI (Wholesale Price Index)**.

3. **Key RBI Monetary Policy Rates**:
   - **Repo Rate**: The interest rate at which the Reserve Bank of India (RBI) lends short-term money to commercial banks. Increasing repo rate controls inflation.
   - **Reverse Repo Rate**: The rate at which RBI borrows money from commercial banks.
   - **CRR (Cash Reserve Ratio)**: Percentage of deposits banks must keep as cash reserves with the RBI.
   - **SLR (Statutory Liquidity Ratio)**: Percentage of deposits banks must maintain in liquid assets (gold, govt securities).

Test these concepts under **Subject Practice ➔ General Awareness** on Result Darpan!`,
      intent: 'academic-economics'
    };
  }

  // Exam Syllabus inquiries
  if (p.includes('syllabus') || p.includes('exam pattern') || p.includes('marking scheme')) {
    return {
      reply: `📋 **Official Exam Pattern & Syllabus Overview (${targetExam})**

• **General Pattern Breakdown**:
  1. **Quantitative Aptitude / Mathematics**: Arithmetic (Percentages, Ratio, SI/CI, Profit-Loss, Time & Work), Advanced Math (Algebra, Geometry, Mensuration, Trigonometry).
  2. **General Intelligence & Reasoning**: Analogies, Coding-Decoding, Syllogisms, Blood Relations, Series, Direction Sense, Non-Verbal Figures.
  3. **General English / Hindi**: Reading Comprehension, Cloze Test, Spotting Errors, Active/Passive Voice, Narration, Vocabulary & Idioms.
  4. **General Awareness**: History, Geography, Indian Polity, General Science (Phy/Chem/Bio), Current Affairs, and Static GK.

💡 *Result Darpan provides 100% free full-length mock tests mapped 1:1 to the official pattern with negative marking calculation. Choose your exam on the homepage to start!*`,
      intent: 'exam-syllabus'
    };
  }

  // 7. General Calculation Shortcuts & Tricks
  if (isShortcutQuery) {
    return {
      reply: `⚡ **Result Darpan Topper Speed Math & Calculation Shortcuts**

Here are the highest-yield calculation hacks used by AIR-1 rankers:

1. **Squaring Numbers Ending in 5 (N5² Rule)**:
   - Multiply the tens digit N by (N + 1), then append 25.
   - *Example*: 65² ➔ 6 × 7 = 42 ➔ **4225**.
   - *Example*: 95² ➔ 9 × 10 = 90 ➔ **9025**.

2. **Base-100 Multiplication Trick (Near 100)**:
   - For 104 × 107: Excesses are +4 and +7.
   - Left part: 104 + 7 = 111.
   - Right part: 4 × 7 = 28.
   - Answer: **11,128** (calculated in 2 seconds without pen!).

3. **Digital Root (Casting Out 9s)**:
   - Add digits of every number until single digits remain; treat 9 as 0.
   - The digital root of the question must match the digital root of the correct option.
   - Eliminates 2 to 3 multiple-choice options instantly in lengthy arithmetic or simplification!

4. **Percentage Ladder (Fraction-to-Percent)**:
   - 1/2 = 50%, 1/3 = 33.33%, 1/4 = 25%, 1/5 = 20%, 1/6 = 16.66%, 1/7 = 14.28%, 1/8 = 12.5%, 1/9 = 11.11%, 1/11 = 9.09%, 1/12 = 8.33%, 1/16 = 6.25%.
   - Successive percentage change: [A + B + (AB / 100)]%.

5. **Reasoning EJOTY & Opposites (Sum = 27)**:
   - E(5), J(10), O(15), T(20), Y(25).
   - Opposite pairs: A-Z, B-Y, C-X, D-W, E-V, F-U, G-T, H-S, I-R, J-Q, K-P, L-O, M-N.

6. **The 3-Pass Exam Hall Rule**:
   - **Pass 1 (0-20m)**: Solve sure-shot questions under 15 seconds (GK, Vocab, simple Reasoning).
   - **Pass 2 (20-50m)**: Work through moderate Math and DI sets with formulas.
   - **Pass 3 (Last 10m)**: Revisit flagged tricky problems; never guess negatively marked questions.

💡 *Tip: Test these speed methods in real-time under Result Darpan's Free Mock Tests!*`,
      intent: 'shortcuts'
    };
  }

  if (p.includes('stress') || p.includes('fear') || p.includes('demotivated') || p.includes('anxiety')) {
    return {
      reply: `🌿 **Mentor Pep-Talk: Overcoming Exam Anxiety**

Remember: Pre-exam stress is completely normal — it just means you care about your future.
1. **Focus on the next hour, not the whole syllabus**: Break your day into small 40-minute wins.
2. **Mock scores are diagnostics, not final judgment**: Every mistake in a mock is a mistake prevented on the real exam day.
3. **Take a 5-minute deep-breathing pause**: 4 seconds inhale, 4 seconds hold, 6 seconds exhale.
You have the potential to crack ${targetExam}. Show up for just one more question set on Result Darpan!`,
      intent: 'doubt-solving'
    };
  }

  // 7. Smart Educational Problem-Solving Assistant (Universal Fallback)
  // Ensures any other question asked by the user receives a helpful, structured educational response
  return {
    reply: `✦ **Result Darpan AI Study Assistant** (Target: ${targetExam})

Regarding: *"**${cleanPrompt}**"*

Here is how you can approach and master this topic for your competitive exam preparation:

1. **Core Concept Breakdown**:
   - Identify whether this topic is tested under Quantitative Aptitude, Logical Reasoning, General Science, or General Studies.
   - Focus first on fundamental definitions, core formulas, and standard exam conditions before attempting speed drills.

2. **Exam Pacing & Strategy**:
   - For **${targetExam}**, aim to recognize the standard pattern of this question within 15 to 20 seconds.
   - Use option elimination (e.g. digital root, units digit, or eliminating extreme choices) whenever available.

3. **Active Practice on Result Darpan**:
   • 🔍 **Subject Practice**: Solve targeted 15-question sets to solidify this concept.
   • 🎯 **PYQs**: Review previous year question papers on Result Darpan to see how examiners frame this question.
   • ⚡ **Topper Tricks**: Ask me *"Give me topper calculation shortcuts"* for speed math hacks!

💡 *Would you like me to build a 60-day study plan, daily routine, or provide shortcuts for this subject? Just ask!*`,
    intent: 'general-study'
  };
}

async function generateAiStudyResponse(prompt, exam = 'SSC CGL', user = null) {
  const cleanPrompt = String(prompt || '').trim();
  const targetExam = String(exam || (user && user.exam) || 'SSC CGL').trim();

  if (process.env.GEMINI_API_KEY) {
    try {
      const activeNotifsSummary = (Array.isArray(notifications) ? notifications.slice(0, 5) : []).map(n => `- ${n.title} (Exam: ${n.examDate || n.daysText}, Vacancies: ${n.vacancies || 'N/A'}, Link: ${n.officialLink || 'N/A'})`).join('\n');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are the Result Darpan AI Study Mentor ✦ on Result Darpan (owned & operated by Warish Raj, official portal: Resultdarpan.com).
Result Darpan is India's 100% free exam prep platform offering mock tests, PYQs, and study guides for SSC CGL, Railways RRB, Banking/SBI, CTET, Defence/NDA, and Classes 9-12. Target exam: ${targetExam}.
Rules:
1) If the user asks about a feature not implemented yet on the website (e.g., mobile app / Play Store app, full offline PDF whole-test downloads, live video classes, paid subscription plans, other regional languages), ALWAYS reply: "We are working on that! Thank you for your feedback. Our team is actively developing and expanding Result Darpan to bring you the best learning experience."
2) If the user reports a bug, error, problem, or website issue, acknowledge with care, provide troubleshooting (hard refresh Ctrl+F5, check credentials), and mention Warish Raj's email (Rajwarish38@gmail.com).
3) If the user asks about Result Darpan, introduce it as 100% free, owned and operated by Warish Raj (Rajwarish38@gmail.com, Resultdarpan.com).
4) For any other academic, subject, syllabus, formula, or study question, give a comprehensive, clear, accurate, and structured answer using bullet points, emojis, and step-by-step points.
Active exam notifications:
${activeNotifsSummary}
Tone: Highly organized, helpful, motivating, crisp.`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: cleanPrompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.5 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          return { reply: candidateText.trim(), intent: 'llm-gemini' };
        }
      }
    } catch {
      // Graceful fallback to offline engine
    }
  }

  return generateRuleBasedAiResponse(cleanPrompt, targetExam, user);
}

app.post('/api/ai/chat', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`aiChat:${ip}`, 30, 60 * 1000)) {
    return res.status(429).json({ error: 'AI Mentor rate limit reached. Please wait a moment.' });
  }
  const { prompt, exam, name } = req.body || {};
  const messagePrompt = sanitizeInput(prompt, 2000);
  if (!messagePrompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const cleanExam = sanitizeInput(exam, 100);
  const cleanName = sanitizeInput(name, 100);
  const aiResult = await generateAiStudyResponse(messagePrompt, cleanExam || 'SSC CGL', { name: cleanName });
  res.json({
    reply: aiResult.reply,
    intent: aiResult.intent,
    sender: 'Result Darpan AI Mentor ✦',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/chat/messages', optionalAuth, (req, res) => {
  res.json({ messages: messages.slice(-50).map(({ email, helpfulBy, ...message }) => ({
    ...message,
    helpfulCount: Array.isArray(helpfulBy) ? helpfulBy.length : 0,
    hasVoted: Boolean(req.user && helpfulBy?.includes(String(req.user.id))),
    isOwnMessage: Boolean(req.user && email === req.user.email)
  })) });
});

app.post('/api/chat/messages/:messageId/helpful', requireAuth, (req, res) => {
  const message = messages.find((entry) => String(entry.id) === req.params.messageId);
  if (!message || message.author !== 'student' || !message.email) return res.status(404).json({ error: 'Community message not found.' });
  if (message.email === req.user.email) return res.status(403).json({ error: 'You cannot vote your own message as helpful.' });
  if (!Array.isArray(message.helpfulBy)) message.helpfulBy = [];
  if (message.helpfulBy.includes(String(req.user.id))) return res.status(409).json({ error: 'You already marked this contribution helpful.' });

  message.helpfulBy.push(String(req.user.id));
  persistMessages();
  const update = { messageId: message.id, helpfulCount: message.helpfulBy.length };
  for (const client of chatClients) client.write(`event: helpful-updated\ndata: ${JSON.stringify(update)}\n\n`);
  res.status(201).json(update);
});

app.get('/api/chat/stream', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  chatClients.add(res);

  req.on('close', () => chatClients.delete(res));
});

app.post('/api/chat/messages', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`chatMsg:${ip}`, 30, 60 * 1000)) {
    return res.status(429).json({ error: 'Chat rate limit reached. Please wait a moment.' });
  }
  const { text, email = '' } = req.body || {};
  const messageText = sanitizeInput(text, 2000);

  if (!messageText) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const blockedWords = ['idiot', 'stupid', 'shut up', 'hate', 'kill yourself'];
  const normalized = ` ${messageText.toLowerCase()} `;
  const hasBlockedWord = blockedWords.some((word) => normalized.includes(word));

  if (hasBlockedWord) {
    return res.status(400).json({
      error: 'Your message violates the study room rules. Please keep the chat respectful.'
    });
  }

  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const tokenHash = token ? crypto.createHash('sha256').update(token).digest('hex') : '';
  const session = sessions.find((entry) => entry.tokenHash === tokenHash && entry.expiresAt > Date.now());
  const user = session && users.find((entry) => String(entry.id) === session.userId);
  const messageEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (messageEmail && (!user || user.email.toLowerCase() !== messageEmail)) {
    return res.status(403).json({ error: 'Sign in to send messages as your account.' });
  }

  const newMessage = {
    id: Date.now(),
    author: 'student',
    email: user?.email || '',
    helpfulBy: [],
    text: messageText,
    createdAt: new Date().toISOString()
  };

  messages.push(newMessage);
  persistMessages();
  const publicMessage = { id: newMessage.id, author: newMessage.author, text: newMessage.text, createdAt: newMessage.createdAt, helpfulCount: 0, hasVoted: false, isOwnMessage: false };
  for (const client of chatClients) {
    client.write(`event: message\ndata: ${JSON.stringify(publicMessage)}\n\n`);
  }

  // Trigger Result Darpan AI Study Mentor response automatically
  const aiResult = await generateAiStudyResponse(messageText, user?.exam || 'SSC CGL', user);
  const aiMessage = {
    id: Date.now() + 1,
    author: 'mentor',
    topperName: 'Result Darpan AI Mentor ✦',
    replyToId: newMessage.id,
    email: '',
    helpfulBy: [],
    text: aiResult.reply,
    createdAt: new Date(Date.now() + 50).toISOString()
  };
  messages.push(aiMessage);
  persistMessages();

  const publicAiMessage = {
    id: aiMessage.id,
    author: aiMessage.author,
    topperName: aiMessage.topperName,
    replyToId: aiMessage.replyToId,
    text: aiMessage.text,
    createdAt: aiMessage.createdAt,
    helpfulCount: 0,
    hasVoted: false,
    isOwnMessage: false
  };

  for (const client of chatClients) {
    client.write(`event: message\ndata: ${JSON.stringify(publicAiMessage)}\n\n`);
  }

  res.status(201).json({
    message: { ...publicMessage, isOwnMessage: Boolean(user) },
    aiReply: publicAiMessage
  });
});

const loginRateLimits = new Map();

app.post('/api/auth/signup', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`signup:${ip}`, 15, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' });
  }
  const { name, email, password, exam, location, schoolClass, guestId } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 100) : '';
  const normalizedName = sanitizeInput(name, 100);

  if (!normalizedName || !normalizedEmail || typeof password !== 'string') {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

  const existingUser = users.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Seamlessly carry over guest test history if upgrading
  const guestUser = guestId ? users.find((u) => u.guestId === guestId && u.isGuest) : null;
  const initialAttempts = guestUser && Array.isArray(guestUser.testAttempts) ? [...guestUser.testAttempts] : [];
  const initialGoals = guestUser && Array.isArray(guestUser.goals) ? [...guestUser.goals] : [];

  const user = {
    id: crypto.randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    exam: sanitizeInput(exam || (guestUser && guestUser.exam) || 'SSC CGL', 60),
    location: sanitizeInput(location || (guestUser && guestUser.location) || 'India', 60),
    schoolClass: ['9', '10', '11', '12'].includes(String(schoolClass)) ? String(schoolClass) : ((guestUser && guestUser.schoolClass) || null),
    goals: initialGoals,
    testAttempts: initialAttempts
  };

  users.push(user);
  persistUsers();
  const token = createSession(user);
  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: publicUser(user)
  });
});

app.post('/api/auth/guest', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(`guest:${ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many guest session attempts. Please try again later.' });
  }
  const { name, exam, location, schoolClass, contact } = req.body || {};
  const cleanContact = sanitizeInput(contact, 100).toLowerCase();

  // If phone or email contact was provided, check if returning user matches this contact
  if (cleanContact) {
    const cleanDigits = cleanContact.replace(/\D/g, '');
    const existing = users.find((u) => {
      if (u.contact && u.contact.toLowerCase() === cleanContact) return true;
      if (u.email && u.email.toLowerCase() === cleanContact) return true;
      if (u.phone && cleanDigits.length >= 7 && u.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))) return true;
      if (u.contact && cleanDigits.length >= 7 && u.contact.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))) return true;
      return false;
    });

    if (existing) {
      if (name && typeof name === 'string' && name.trim() && name.trim() !== 'Guest Learner') existing.name = sanitizeInput(name, 100);
      if (exam && typeof exam === 'string' && exam.trim()) existing.exam = sanitizeInput(exam, 60);
      if (location && typeof location === 'string' && location.trim()) existing.location = sanitizeInput(location, 60);
      if (!existing.contact) existing.contact = cleanContact;
      persistUsers();
      const token = createSession(existing);
      return res.status(200).json({
        message: 'Welcome back! Your previous progress has been restored.',
        guestId: existing.guestId || existing.id,
        token,
        restored: true,
        user: publicUser(existing)
      });
    }
  }

  const guestName = sanitizeInput(name, 100) || 'Guest Learner';
  const guestExam = sanitizeInput(exam, 60) || 'SSC CGL';
  const guestLocation = sanitizeInput(location, 60) || 'India';
  const guestId = `GUEST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const user = {
    id: guestId,
    guestId,
    isGuest: true,
    name: guestName,
    email: cleanContact && cleanContact.includes('@') ? cleanContact : `${guestId.toLowerCase()}@guest.resultdarpan.local`,
    contact: cleanContact || null,
    phone: cleanContact && !cleanContact.includes('@') ? cleanContact : null,
    exam: guestExam,
    location: guestLocation,
    schoolClass: ['9', '10', '11', '12'].includes(String(schoolClass)) ? String(schoolClass) : null,
    goals: [],
    testAttempts: []
  };

  users.push(user);
  persistUsers();
  const token = createSession(user);
  res.status(201).json({
    message: 'Guest profile created.',
    guestId,
    token,
    user: publicUser(user)
  });
});

app.post('/api/auth/restore-progress', (req, res) => {
  const raw = req.body?.contact || req.body?.identifier || req.body?.email || req.body?.phone || '';
  const clean = String(raw).trim().toLowerCase();
  if (!clean) {
    return res.status(400).json({ error: 'Please enter your phone number or email address.' });
  }

  const cleanDigits = clean.replace(/\D/g, '');
  const user = users.find((u) => {
    if (u.contact && u.contact.toLowerCase() === clean) return true;
    if (u.email && u.email.toLowerCase() === clean) return true;
    if (u.phone && cleanDigits.length >= 7 && u.phone.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))) return true;
    if (cleanDigits.length >= 7 && u.contact && u.contact.replace(/\D/g, '').endsWith(cleanDigits.slice(-10))) return true;
    return false;
  });

  if (!user) {
    return res.status(404).json({ error: 'No saved account found for that phone number or email. You can save your details below.' });
  }

  const token = createSession(user);
  return res.status(200).json({
    message: `Welcome back, ${user.name}! Your progress has been restored.`,
    token,
    guestId: user.guestId || user.id,
    user: publicUser(user)
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const rateLimitKey = `${req.ip}:${normalizedEmail}`;
  const now = Date.now();
  const failedAttempts = (loginRateLimits.get(rateLimitKey) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (failedAttempts.length >= 15) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again in 15 minutes.' });
  }

  let user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
  if (user && !verifyPassword(user, String(password))) {
    try {
      const diskUsers = readJson(USERS_PATH, []);
      const diskUser = diskUsers.find((entry) => entry.email.toLowerCase() === normalizedEmail);
      if (diskUser && diskUser.passwordHash) {
        user.passwordHash = diskUser.passwordHash;
      }
    } catch (err) {}
  }
  if (!user || !verifyPassword(user, String(password))) {
    failedAttempts.push(now);
    loginRateLimits.set(rateLimitKey, failedAttempts);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  loginRateLimits.delete(rateLimitKey);

  if (!user.passwordHash) {
    user.passwordHash = hashPassword(String(password));
    delete user.password;
    persistUsers();
  }
  const token = createSession(user);
  res.json({
    message: 'Login successful.',
    token,
    user: publicUser(user)
  });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const index = sessions.findIndex((entry) => entry.tokenHash === req.sessionTokenHash);
  if (index !== -1) sessions.splice(index, 1);
  persistSessions();
  res.json({ message: 'Signed out.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (!email || !resetToken || newPassword.length < 8) return res.status(400).json({ error: 'A verified reset token and a password of at least 8 characters are required.' });

  const resetRequest = passwordResetRequests.get(email);
  if (!resetRequest || resetRequest.expiresAt <= Date.now() || !resetRequest.resetTokenHash || !isSameHash(hashResetSecret(email, resetToken), resetRequest.resetTokenHash)) {
    return res.status(400).json({ error: 'The reset session is invalid or expired. Request a new code.' });
  }
  const user = users.find((entry) => entry.email.toLowerCase() === email && !entry.isGuest);
  if (!user) return res.status(400).json({ error: 'The reset session is invalid or expired. Request a new code.' });

  user.passwordHash = hashPassword(newPassword);
  delete user.password;
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (sessions[index].userId === String(user.id)) sessions.splice(index, 1);
  }
  passwordResetRequests.delete(email);
  persistSessions();
  persistUsers();
  res.json({ message: 'Password updated. Sign in with your new password.' });
});

app.post('/api/auth/firebase-sync', (req, res) => {
  const { email, newPassword, firebaseUid, name, location, exam } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail && !u.isGuest);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      guestId: null,
      isGuest: false,
      name: sanitizeInput(name, 100) || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      exam: sanitizeInput(exam, 60) || 'SSC CGL',
      location: sanitizeInput(location, 60) || 'India',
      schoolClass: null,
      goals: [],
      testAttempts: [],
      firebaseUid: firebaseUid || null,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else if (firebaseUid) {
    user.firebaseUid = firebaseUid;
  }

  if (newPassword && typeof newPassword === 'string') {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    user.passwordHash = hashPassword(newPassword);
    delete user.password;
    for (let index = sessions.length - 1; index >= 0; index -= 1) {
      if (sessions[index].userId === String(user.id)) sessions.splice(index, 1);
    }
    passwordResetRequests.delete(normalizedEmail);
    persistSessions();
  }

  persistUsers();
  const token = createSession(user);
  res.json({
    message: 'Authentication synchronized successfully.',
    token,
    user: publicUser(user)
  });
});

app.post('/api/auth/request-password-reset', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const smtp = createSmtpTransport();
  if (!smtp) return res.status(503).json({ error: 'Password reset is not available yet. Please contact the site administrator.' });

  const now = Date.now();
  const rateLimitKey = `${req.ip}:${email}`;
  const requestTimes = (passwordResetRateLimits.get(rateLimitKey) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (requestTimes.length >= 3) return res.status(429).json({ error: 'Too many reset requests. Try again in an hour.' });
  requestTimes.push(now);
  passwordResetRateLimits.set(rateLimitKey, requestTimes);

  const user = users.find((entry) => entry.email.toLowerCase() === email && !entry.isGuest);
  if (!user) {
    passwordResetRequests.delete(email);
    return res.json({ message: 'If an account exists for that address, a reset code has been sent.' });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  passwordResetRequests.set(email, {
    codeHash: hashResetSecret(email, code),
    attempts: 0,
    expiresAt: now + (10 * 60 * 1000)
  });
  smtp.transport.sendMail({
    from: smtp.from,
    to: email,
    subject: 'Your Result Darpan password reset code',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`
  }).then(() => {
    res.json({ message: 'If an account exists for that address, a reset code has been sent.' });
  }).catch(() => {
    passwordResetRequests.delete(email);
    res.status(503).json({ error: 'The reset email could not be sent. Check the server SMTP settings and try again.' });
  });
});

app.post('/api/auth/verify-password-reset', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const resetRequest = passwordResetRequests.get(email);
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code) || !resetRequest || resetRequest.expiresAt <= Date.now() || resetRequest.resetTokenHash) {
    return res.status(400).json({ error: 'The code is invalid or expired. Request a new code.' });
  }
  if (resetRequest.attempts >= 5) {
    passwordResetRequests.delete(email);
    return res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
  }
  resetRequest.attempts += 1;
  if (!isSameHash(hashResetSecret(email, code), resetRequest.codeHash)) {
    return res.status(400).json({ error: 'The code is incorrect.' });
  }
  resetRequest.codeHash = null;
  const resetToken = crypto.randomBytes(32).toString('base64url');
  resetRequest.resetTokenHash = hashResetSecret(email, resetToken);
  resetRequest.expiresAt = Date.now() + (10 * 60 * 1000);
  res.json({ resetToken });
});

function profilePayload(user) {
  const email = user.email.toLowerCase();
  const stats = getUserStats(user);
  return {
    user: publicUser(user),
    gamification: getGamificationStats(user),
    stats: {
      messagesSent: messages.filter((message) => message.email === email).length,
      ...stats
    }
  };
}

app.get('/api/profile/me', requireAuth, (req, res) => {
  res.json(profilePayload(req.user));
});

app.get('/api/profile/me/goals/options', requireAuth, (req, res) => {
  res.json({ groups: popularExamGoalGroups, maxSelections: 5 });
});

app.patch('/api/profile/me', requireAuth, (req, res) => {
  const { name, exam, location, schoolClass, contact } = req.body || {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return res.status(400).json({ error: 'A valid name is required.' });
  if (exam !== undefined && (typeof exam !== 'string' || !exam.trim())) return res.status(400).json({ error: 'A valid exam is required.' });
  if (location !== undefined && (typeof location !== 'string' || !location.trim())) return res.status(400).json({ error: 'A valid location is required.' });
  if (schoolClass !== undefined && schoolClass !== null && !['9', '10', '11', '12'].includes(String(schoolClass))) return res.status(400).json({ error: 'Choose a class from 9 to 12.' });

  if (name !== undefined) req.user.name = sanitizeInput(name, 100);
  if (exam !== undefined) req.user.exam = sanitizeInput(exam, 60);
  if (location !== undefined) req.user.location = sanitizeInput(location, 60);
  if (contact !== undefined) req.user.contact = sanitizeInput(contact, 100) || null;
  if (schoolClass !== undefined) req.user.schoolClass = schoolClass === null ? null : String(schoolClass);
  persistUsers();
  res.json({ user: publicUser(req.user) });
});

app.post('/api/profile/me/goals', requireAuth, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!popularExamGoalNames.has(name)) return res.status(400).json({ error: 'Choose an exam from the available goal list.' });
  if (!Array.isArray(req.user.goals)) req.user.goals = [];
  if (req.user.goals.length >= 5) return res.status(400).json({ error: 'You can select up to 5 exam goals.' });
  if (req.user.goals.some((goal) => goal.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'That exam is already one of your goals.' });
  const goal = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  req.user.goals.push(goal);
  persistUsers();
  res.status(201).json({ goal, goals: req.user.goals });
});

app.put('/api/profile/me/goals', requireAuth, (req, res) => {
  const selections = req.body?.goals;
  if (!Array.isArray(selections) || selections.length > 5 || selections.some((name) => typeof name !== 'string' || !popularExamGoalNames.has(name))) {
    return res.status(400).json({ error: 'Choose up to 5 exams from the available goal list.' });
  }
  const normalizedNames = selections.map((name) => name.toLowerCase());
  if (new Set(normalizedNames).size !== normalizedNames.length) return res.status(400).json({ error: 'Each exam goal can only be selected once.' });
  const previousGoals = Array.isArray(req.user.goals) ? req.user.goals : [];
  req.user.goals = selections.map((name) => {
    const existing = previousGoals.find((goal) => goal.name.toLowerCase() === name.toLowerCase());
    return existing || { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() };
  });
  persistUsers();
  res.json({ goals: req.user.goals });
});

app.delete('/api/profile/me/goals/:goalId', requireAuth, (req, res) => {
  if (!Array.isArray(req.user.goals)) req.user.goals = [];
  const goalCount = req.user.goals.length;
  req.user.goals = req.user.goals.filter((goal) => goal.id !== req.params.goalId);
  if (req.user.goals.length === goalCount) return res.status(404).json({ error: 'Goal not found.' });
  persistUsers();
  res.json({ goals: req.user.goals });
});

app.get('/api/profile/:email', requireAuth, (req, res) => {
  const email = String(req.params.email).trim().toLowerCase();
  if (email !== req.user.email.toLowerCase()) return res.status(403).json({ error: 'You can only access your own profile.' });
  res.json(profilePayload(req.user));
});

function saveTestResult(req, res) {
  const user = req.user;
  const score = Number(req.body?.score);
  const total = Number(req.body?.total);
  const durationSeconds = Number(req.body?.durationSeconds || 0);

  if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
    return res.status(400).json({ error: 'A valid test score is required.' });
  }
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) {
    return res.status(400).json({ error: 'A valid study duration is required.' });
  }

  if (!Array.isArray(user.testAttempts)) user.testAttempts = [];
  const attempt = {
    id: crypto.randomUUID(),
    score,
    total,
    attemptedCount: Number.isInteger(req.body?.attemptedCount) ? Math.min(total, Math.max(0, req.body.attemptedCount)) : total,
    accuracy: Math.round((score / total) * 100),
    durationSeconds,
    classNumber: ['9', '10', '11', '12'].includes(String(req.body?.classNumber)) ? String(req.body.classNumber) : null,
    exam: typeof req.body?.exam === 'string' ? req.body.exam.trim().slice(0, 60) : null,
    testId: typeof req.body?.testId === 'string' ? req.body.testId.trim().slice(0, 60) : null,
    testName: typeof req.body?.testName === 'string' ? req.body.testName.trim().slice(0, 100) : null,
    subject: typeof req.body?.subject === 'string' ? req.body.subject.trim().slice(0, 60) : null,
    set: Number.isInteger(Number(req.body?.set)) ? Number(req.body.set) : null,
    createdAt: new Date().toISOString()
  };
  user.testAttempts.push(attempt);
  persistUsers();

  const stats = getUserStats(user);

  res.status(201).json({
    attempt,
    stats
  });
}

app.post('/api/profile/me/test-results', requireAuth, (req, res) => {
  res.status(410).json({ error: 'Submit answers through the test itself so the score can be graded securely.' });
});

app.post('/api/profile/:email/test-results', requireAuth, (req, res) => {
  if (String(req.params.email).trim().toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'You can only save results to your own profile.' });
  }
  res.status(410).json({ error: 'Submit answers through the test itself so the score can be graded securely.' });
});

app.get('/api/admin/summary', requireAuth, requireAdmin, (req, res) => {
  const totalUsers = users.length;
  const totalMessages = messages.length;
  const mentorMessages = messages.filter((message) => message.author === 'mentor' || message.author === 'topper').length;
  const studentMessages = messages.filter((message) => message.author === 'student').length;
  const totalNotifications = notifications.length;
  const totalBlogs = blogs.length;
  const totalMaterials = studyMaterials.length;
  const totalPreviousYearQuestions = previousYearQuestionsList.length;
  const recentUsers = [...users].slice(-5).reverse().map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    exam: user.exam,
    location: user.location
  }));
  const recentMessages = [...messages].slice(-8).reverse().map((message) => ({
    id: message.id,
    author: message.author,
    topperName: message.topperName || null,
    text: message.text,
    createdAt: message.createdAt
  }));

  res.json({
    totalUsers,
    totalMessages,
    mentorMessages,
    studentMessages,
    totalStudentQuestions: studentMessages,
    totalNotifications,
    totalBlogs,
    totalMaterials,
    totalPreviousYearQuestions,
    recentUsers,
    recentMessages,
    generatedAt: new Date().toISOString()
  });
});

app.get('/api/admin/question-sets', requireAuth, requireAdmin, (req, res) => {
  res.json({
    questionSets: customQuestionSets.map((set) => ({
      id: set.id,
      classNumber: set.classNumber || null,
      exam: set.exam || null,
      subject: set.subject,
      setNumber: Number(set.setNumber),
      title: set.title || '',
      sourceUrl: set.sourceUrl || '',
      questionCount: Array.isArray(set.questions) ? set.questions.length : 0,
      updatedAt: set.updatedAt || null
    }))
  });
});

app.get('/api/admin/question-set', requireAuth, requireAdmin, (req, res) => {
  const classNumber = req.query.classNumber ? String(req.query.classNumber).trim() : null;
  const exam = req.query.exam ? String(req.query.exam).trim() : null;
  const subject = String(req.query.subject || '').trim();
  const setNumber = Math.min(500, Math.max(1, Number(req.query.setNumber || req.query.set) || 1));

  if (!classNumber && !exam) {
    return res.status(400).json({ error: 'Specify either classNumber (e.g. 9, 10, 11, 12) or exam name.' });
  }
  if (!subject) {
    return res.status(400).json({ error: 'Specify a subject name.' });
  }

  const customSet = getCustomQuestionSet({ classNumber, exam, subject, setNumber });
  if (customSet) {
    return res.json({
      isCustom: true,
      id: customSet.id,
      classNumber: customSet.classNumber || null,
      exam: customSet.exam || null,
      subject: customSet.subject,
      setNumber: Number(customSet.setNumber),
      title: customSet.title || '',
      sourceUrl: customSet.sourceUrl || '',
      questions: customSet.questions
    });
  }

  let questions = [];
  try {
    if (classNumber) {
      questions = getClassQuestionSet(classNumber, subject, setNumber);
    } else if (exam) {
      questions = getQuestionSet(exam, subject, setNumber);
    }
  } catch (err) {
    questions = [];
  }

  return res.json({
    isCustom: false,
    classNumber,
    exam,
    subject,
    setNumber,
    title: `${subject} · Set ${setNumber}`,
    sourceUrl: '',
    questions: questions.map((q) => ({
      text: q.text,
      options: [...(q.options || [])],
      answer: q.answer ?? 0,
      topic: q.topic || ''
    }))
  });
});

app.post('/api/admin/question-set', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  const classNumber = body.classNumber ? String(body.classNumber).trim() : null;
  const exam = body.exam ? String(body.exam).trim() : null;
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const setNumber = Number(body.setNumber || body.set);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  const incomingQuestions = body.questions;

  if (!classNumber && !exam) {
    return res.status(400).json({ error: 'Specify either classNumber (e.g. 9, 10, 11, 12) or exam.' });
  }
  if (!subject) {
    return res.status(400).json({ error: 'A subject name is required.' });
  }
  if (!Number.isInteger(setNumber) || setNumber < 1 || setNumber > 500) {
    return res.status(400).json({ error: 'Set number must be an integer between 1 and 500.' });
  }
  if (!Array.isArray(incomingQuestions) || incomingQuestions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required.' });
  }

  const validatedQuestions = [];
  for (let i = 0; i < incomingQuestions.length; i += 1) {
    const q = incomingQuestions[i];
    const text = typeof q?.text === 'string' ? q.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: `Question ${i + 1} is missing question text.` });
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return res.status(400).json({ error: `Question ${i + 1} must have at least 2 options.` });
    }
    const options = q.options.map((opt) => String(opt ?? '').trim());
    if (options.some((opt) => opt.length === 0)) {
      return res.status(400).json({ error: `Question ${i + 1} contains empty options.` });
    }
    const answer = Number(q.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      return res.status(400).json({ error: `Question ${i + 1} has an invalid correct answer index.` });
    }
    const topic = typeof q.topic === 'string' ? q.topic.trim() : '';
    validatedQuestions.push({ text, options, answer, topic });
  }

  const id = (classNumber
    ? `class-${classNumber}-${subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-set-${setNumber}`
    : `exam-${exam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-set-${setNumber}`);

  const existingIndex = customQuestionSets.findIndex((set) => {
    if (Number(set.setNumber) !== setNumber) return false;
    if (String(set.subject || '').trim().toLowerCase() !== subject.toLowerCase()) return false;
    if (classNumber) return String(set.classNumber || '') === classNumber;
    if (exam) return String(set.exam || '').trim().toLowerCase() === exam.toLowerCase();
    return false;
  });

  const newSetRecord = {
    id,
    classNumber: classNumber || undefined,
    exam: exam || undefined,
    subject,
    setNumber,
    title: title || `${subject} Set ${setNumber}`,
    sourceUrl: sourceUrl || undefined,
    questions: validatedQuestions,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    customQuestionSets[existingIndex] = newSetRecord;
  } else {
    customQuestionSets.push(newSetRecord);
  }

  persistQuestionSets();
  rebuildQuestionCatalog();

  res.status(200).json({
    ok: true,
    message: 'Question set saved successfully.',
    set: newSetRecord
  });
});

app.delete('/api/admin/question-set', requireAuth, requireAdmin, (req, res) => {
  const classNumber = req.query.classNumber ? String(req.query.classNumber).trim() : null;
  const exam = req.query.exam ? String(req.query.exam).trim() : null;
  const subject = String(req.query.subject || '').trim();
  const setNumber = Number(req.query.setNumber || req.query.set);

  const existingIndex = customQuestionSets.findIndex((set) => {
    if (Number(set.setNumber) !== setNumber) return false;
    if (String(set.subject || '').trim().toLowerCase() !== subject.toLowerCase()) return false;
    if (classNumber) return String(set.classNumber || '') === classNumber;
    if (exam) return String(set.exam || '').trim().toLowerCase() === exam.toLowerCase();
    return false;
  });

  if (existingIndex === -1) {
    return res.status(404).json({ error: 'Custom question set not found.' });
  }

  customQuestionSets.splice(existingIndex, 1);
  persistQuestionSets();
  rebuildQuestionCatalog();

  res.json({ ok: true, message: 'Custom question set deleted and reverted to default.' });
});

// --- NOTIFICATIONS & UPCOMING EXAMS ---
app.get('/api/notifications', (req, res) => {
  res.json({ notifications });
});

app.post('/api/admin/notifications', requireAuth, requireAdmin, (req, res) => {
  const {
    title, exam, category = 'General', badge = 'EXAM', badgeColor = 'green',
    examDate = '', daysText = '', vacancies = '', eligibility = '',
    applyDeadline = '', officialLink = '', details = '', isUpcoming = true
  } = req.body || {};

  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanExam = typeof exam === 'string' ? exam.trim() : '';
  if (!cleanTitle || !cleanExam) {
    return res.status(400).json({ error: 'Notification title and exam name are required.' });
  }

  const newNotif = {
    id: `notif-${Date.now()}`,
    title: cleanTitle,
    exam: cleanExam,
    category: typeof category === 'string' ? category.trim() : 'General',
    badge: typeof badge === 'string' && badge.trim() ? badge.trim().toUpperCase() : 'EXAM',
    badgeColor: typeof badgeColor === 'string' ? badgeColor.trim() : 'green',
    examDate: typeof examDate === 'string' ? examDate.trim() : '',
    daysText: typeof daysText === 'string' ? daysText.trim() : '',
    vacancies: typeof vacancies === 'string' ? vacancies.trim() : '',
    eligibility: typeof eligibility === 'string' ? eligibility.trim() : '',
    applyDeadline: typeof applyDeadline === 'string' ? applyDeadline.trim() : '',
    officialLink: typeof officialLink === 'string' ? officialLink.trim() : '',
    details: typeof details === 'string' ? details.trim() : '',
    isUpcoming: Boolean(isUpcoming),
    createdAt: new Date().toISOString()
  };

  notifications.unshift(newNotif);
  persistNotifications();
  res.status(201).json({ notification: newNotif });
});

app.put('/api/admin/notifications/:id', requireAuth, requireAdmin, (req, res) => {
  const notifId = String(req.params.id);
  const notif = notifications.find((n) => n.id === notifId);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });

  const body = req.body || {};
  if (typeof body.title === 'string' && body.title.trim()) notif.title = body.title.trim();
  if (typeof body.exam === 'string' && body.exam.trim()) notif.exam = body.exam.trim();
  if (typeof body.category === 'string') notif.category = body.category.trim();
  if (typeof body.badge === 'string') notif.badge = body.badge.trim().toUpperCase();
  if (typeof body.badgeColor === 'string') notif.badgeColor = body.badgeColor.trim();
  if (typeof body.examDate === 'string') notif.examDate = body.examDate.trim();
  if (typeof body.daysText === 'string') notif.daysText = body.daysText.trim();
  if (typeof body.vacancies === 'string') notif.vacancies = body.vacancies.trim();
  if (typeof body.eligibility === 'string') notif.eligibility = body.eligibility.trim();
  if (typeof body.applyDeadline === 'string') notif.applyDeadline = body.applyDeadline.trim();
  if (typeof body.officialLink === 'string') notif.officialLink = body.officialLink.trim();
  if (typeof body.details === 'string') notif.details = body.details.trim();
  if (typeof body.isUpcoming !== 'undefined') notif.isUpcoming = Boolean(body.isUpcoming);
  notif.updatedAt = new Date().toISOString();

  persistNotifications();
  res.json({ notification: notif });
});

app.delete('/api/admin/notifications/:id', requireAuth, requireAdmin, (req, res) => {
  const notifId = String(req.params.id);
  const index = notifications.findIndex((n) => n.id === notifId);
  if (index === -1) return res.status(404).json({ error: 'Notification not found.' });

  notifications.splice(index, 1);
  persistNotifications();
  res.json({ ok: true, message: 'Notification deleted.' });
});

// --- BLOGS & STRATEGY ARTICLES ---
app.get('/api/blogs', (req, res) => {
  res.json({ blogs });
});

app.get('/api/blogs/:id', (req, res) => {
  const blog = blogs.find((b) => b.id === req.params.id || b.slug === req.params.id);
  if (!blog) return res.status(404).json({ error: 'Article not found.' });
  res.json({ blog });
});

app.post('/api/admin/blogs', requireAuth, requireAdmin, (req, res) => {
  const { title, category = 'Preparation Strategy', author = 'Warish Raj · Mentor', readTime = '5 min read', tags = [], summary = '', content = '' } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanContent = typeof content === 'string' ? content.trim() : '';
  if (!cleanTitle || !cleanContent) {
    return res.status(400).json({ error: 'Article title and content are required.' });
  }

  const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newBlog = {
    id: `blog-${Date.now()}`,
    title: cleanTitle,
    slug,
    category: typeof category === 'string' ? category.trim() : 'Preparation Strategy',
    author: typeof author === 'string' ? author.trim() : 'Warish Raj · Mentor',
    readTime: typeof readTime === 'string' ? readTime.trim() : '5 min read',
    tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    summary: typeof summary === 'string' ? summary.trim() : cleanContent.slice(0, 160) + '...',
    content: cleanContent,
    createdAt: new Date().toISOString()
  };

  blogs.unshift(newBlog);
  persistBlogs();
  res.status(201).json({ blog: newBlog });
});

app.put('/api/admin/blogs/:id', requireAuth, requireAdmin, (req, res) => {
  const blogId = String(req.params.id);
  const blog = blogs.find((b) => b.id === blogId);
  if (!blog) return res.status(404).json({ error: 'Article not found.' });

  const body = req.body || {};
  if (typeof body.title === 'string' && body.title.trim()) {
    blog.title = body.title.trim();
    blog.slug = blog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (typeof body.category === 'string') blog.category = body.category.trim();
  if (typeof body.author === 'string') blog.author = body.author.trim();
  if (typeof body.readTime === 'string') blog.readTime = body.readTime.trim();
  if (Array.isArray(body.tags)) blog.tags = body.tags;
  else if (typeof body.tags === 'string') blog.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean);
  if (typeof body.summary === 'string') blog.summary = body.summary.trim();
  if (typeof body.content === 'string' && body.content.trim()) blog.content = body.content.trim();
  blog.updatedAt = new Date().toISOString();

  persistBlogs();
  res.json({ blog });
});

app.delete('/api/admin/blogs/:id', requireAuth, requireAdmin, (req, res) => {
  const blogId = String(req.params.id);
  const index = blogs.findIndex((b) => b.id === blogId);
  if (index === -1) return res.status(404).json({ error: 'Article not found.' });

  blogs.splice(index, 1);
  persistBlogs();
  res.json({ ok: true, message: 'Article deleted.' });
});

// --- STUDY MATERIALS & REVISION NOTES ---
app.get('/api/study-materials', (req, res) => {
  const examQuery = req.query.exam ? String(req.query.exam).toLowerCase() : null;
  const subjectQuery = req.query.subject ? String(req.query.subject).toLowerCase() : null;

  let filtered = studyMaterials;
  if (examQuery && examQuery !== 'all') {
    filtered = filtered.filter((m) => String(m.exam || '').toLowerCase().includes(examQuery));
  }
  if (subjectQuery && subjectQuery !== 'all') {
    filtered = filtered.filter((m) => String(m.subject || '').toLowerCase().includes(subjectQuery));
  }
  res.json({ materials: filtered });
});

app.post('/api/admin/study-materials', requireAuth, requireAdmin, (req, res) => {
  const { title, exam = 'All Exams', subject = 'General', fileType = 'PDF', fileSize = '2.0 MB', downloadUrl, description = '' } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanUrl = typeof downloadUrl === 'string' ? downloadUrl.trim() : '';
  if (!cleanTitle || !cleanUrl) {
    return res.status(400).json({ error: 'Material title and download URL are required.' });
  }

  const newMaterial = {
    id: `mat-${Date.now()}`,
    title: cleanTitle,
    exam: typeof exam === 'string' ? exam.trim() : 'All Exams',
    subject: typeof subject === 'string' ? subject.trim() : 'General',
    fileType: typeof fileType === 'string' ? fileType.trim().toUpperCase() : 'PDF',
    fileSize: typeof fileSize === 'string' ? fileSize.trim() : '2.0 MB',
    downloadUrl: cleanUrl,
    description: typeof description === 'string' ? description.trim() : '',
    createdAt: new Date().toISOString()
  };

  studyMaterials.unshift(newMaterial);
  persistStudyMaterials();
  res.status(201).json({ material: newMaterial });
});

app.put('/api/admin/study-materials/:id', requireAuth, requireAdmin, (req, res) => {
  const matId = String(req.params.id);
  const material = studyMaterials.find((m) => m.id === matId);
  if (!material) return res.status(404).json({ error: 'Material not found.' });

  const body = req.body || {};
  if (typeof body.title === 'string' && body.title.trim()) material.title = body.title.trim();
  if (typeof body.exam === 'string') material.exam = body.exam.trim();
  if (typeof body.subject === 'string') material.subject = body.subject.trim();
  if (typeof body.fileType === 'string') material.fileType = body.fileType.trim().toUpperCase();
  if (typeof body.fileSize === 'string') material.fileSize = body.fileSize.trim();
  if (typeof body.downloadUrl === 'string' && body.downloadUrl.trim()) material.downloadUrl = body.downloadUrl.trim();
  if (typeof body.description === 'string') material.description = body.description.trim();
  material.updatedAt = new Date().toISOString();

  persistStudyMaterials();
  res.json({ material });
});

app.delete('/api/admin/study-materials/:id', requireAuth, requireAdmin, (req, res) => {
  const matId = String(req.params.id);
  const index = studyMaterials.findIndex((m) => m.id === matId);
  if (index === -1) return res.status(404).json({ error: 'Material not found.' });

  studyMaterials.splice(index, 1);
  persistStudyMaterials();
  res.json({ ok: true, message: 'Material deleted.' });
});

// --- PREVIOUS YEAR QUESTIONS (PYQ) ADMIN MANAGER ---
app.get('/api/admin/previous-year-questions', requireAuth, requireAdmin, (req, res) => {
  res.json({ questions: previousYearQuestionsList });
});

app.post('/api/admin/previous-year-questions', requireAuth, requireAdmin, (req, res) => {
  const { exam, year, topic, text, options, answer, sourceUrl } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) {
    return res.status(400).json({ error: 'Question text is required.' });
  }

  const cleanOptions = Array.isArray(options) ? options.map((opt) => String(opt || '').trim()).filter(Boolean) : [];
  if (cleanOptions.length < 2) {
    return res.status(400).json({ error: 'At least 2 non-empty options are required.' });
  }

  const answerIndex = Number(answer);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= cleanOptions.length) {
    return res.status(400).json({ error: 'A valid correct answer option is required.' });
  }

  const newQuestion = {
    id: `pyq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    exam: typeof exam === 'string' && exam.trim() ? exam.trim() : 'SSC CGL',
    year: typeof year === 'string' && year.trim() ? year.trim() : 'Previous Year',
    topic: typeof topic === 'string' && topic.trim() ? topic.trim() : 'General Awareness',
    text: cleanText,
    options: cleanOptions,
    answer: answerIndex,
    sourceUrl: typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl.trim() : 'https://ssc.gov.in/for-candidates/previous-year-question-paper'
  };

  previousYearQuestionsList.unshift(newQuestion);
  persistPreviousYearQuestions();
  res.status(201).json({ question: newQuestion });
});

app.put('/api/admin/previous-year-questions/:id', requireAuth, requireAdmin, (req, res) => {
  const qId = String(req.params.id);
  const q = previousYearQuestionsList.find((item) => String(item.id) === qId);
  if (!q) return res.status(404).json({ error: 'Previous year question not found.' });

  const body = req.body || {};
  if (typeof body.text === 'string' && body.text.trim()) q.text = body.text.trim();
  if (typeof body.exam === 'string' && body.exam.trim()) q.exam = body.exam.trim();
  if (typeof body.year === 'string' && body.year.trim()) q.year = body.year.trim();
  if (typeof body.topic === 'string' && body.topic.trim()) q.topic = body.topic.trim();
  if (typeof body.sourceUrl === 'string') q.sourceUrl = body.sourceUrl.trim();

  if (Array.isArray(body.options)) {
    const cleanOpts = body.options.map((opt) => String(opt || '').trim()).filter(Boolean);
    if (cleanOpts.length >= 2) {
      q.options = cleanOpts;
    }
  }

  if (body.answer !== undefined) {
    const answerIndex = Number(body.answer);
    if (Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < q.options.length) {
      q.answer = answerIndex;
    }
  }

  persistPreviousYearQuestions();
  res.json({ question: q });
});

app.delete('/api/admin/previous-year-questions/:id', requireAuth, requireAdmin, (req, res) => {
  const qId = String(req.params.id);
  const index = previousYearQuestionsList.findIndex((item) => String(item.id) === qId);
  if (index === -1) return res.status(404).json({ error: 'Previous year question not found.' });

  previousYearQuestionsList.splice(index, 1);
  persistPreviousYearQuestions();
  res.json({ ok: true, message: 'Question deleted successfully.' });
});

// --- TOPPER & MENTOR DESK / REPLY CONSOLE ---
app.get('/api/admin/mentor-chat/threads', requireAuth, requireAdmin, (req, res) => {
  res.json({
    messages: [...messages].reverse().map((message) => {
      const senderUser = message.email ? users.find((u) => u.email.toLowerCase() === message.email.toLowerCase()) : null;
      return {
        ...message,
        senderName: message.topperName || senderUser?.name || (message.author === 'student' ? 'Student' : 'Mentor'),
        senderEmail: message.email || '',
        senderExam: senderUser?.exam || 'Aspirant',
        senderLocation: senderUser?.location || 'India',
        helpfulCount: Array.isArray(message.helpfulBy) ? message.helpfulBy.length : 0
      };
    })
  });
});

app.post('/api/admin/mentor-chat/reply', requireAuth, requireAdmin, (req, res) => {
  const { text, authorType = 'topper', name = 'Warish Raj · Official Mentor', replyToId = null } = req.body || {};
  const replyText = typeof text === 'string' ? text.trim() : '';
  if (!replyText) {
    return res.status(400).json({ error: 'Reply text is required.' });
  }

  const cleanName = typeof name === 'string' && name.trim() ? name.trim() : 'Warish Raj · Official Mentor';
  const cleanAuthor = authorType === 'mentor' ? 'mentor' : 'topper';

  const replyMessage = {
    id: Date.now(),
    author: cleanAuthor,
    topperName: cleanName,
    replyToId: replyToId ? Number(replyToId) || String(replyToId) : null,
    email: req.user.email,
    helpfulBy: [],
    text: replyText,
    createdAt: new Date().toISOString()
  };

  messages.push(replyMessage);
  persistMessages();

  const publicMessage = {
    id: replyMessage.id,
    author: replyMessage.author,
    topperName: replyMessage.topperName,
    replyToId: replyMessage.replyToId,
    text: replyMessage.text,
    createdAt: replyMessage.createdAt,
    helpfulCount: 0,
    hasVoted: false,
    isOwnMessage: false
  };

  for (const client of chatClients) {
    client.write(`event: message\ndata: ${JSON.stringify(publicMessage)}\n\n`);
  }

  res.status(201).json({ message: replyMessage });
});

app.delete('/api/admin/mentor-chat/messages/:id', requireAuth, requireAdmin, (req, res) => {
  const messageId = req.params.id;
  const index = messages.findIndex((m) => String(m.id) === String(messageId));
  if (index === -1) return res.status(404).json({ error: 'Message not found.' });

  messages.splice(index, 1);
  persistMessages();
  res.json({ ok: true, message: 'Message moderated and removed.' });
});

// --- MONETIZATION & ADS (GOOGLE ADSENSE & SPONSORS) ---
app.get('/ads.txt', (req, res) => {
  res.type('text/plain');
  if (fs.existsSync(ADS_TXT_PATH)) {
    res.sendFile(ADS_TXT_PATH);
  } else {
    res.send('# Result Darpan (resultdarpan.com) Authorized Digital Sellers (ads.txt)\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  }
});

app.get('/api/ad-settings', (req, res) => {
  res.json({ adSettings });
});

app.put('/api/admin/ad-settings', requireAuth, requireAdmin, (req, res) => {
  const body = req.body || {};
  adSettings = {
    ...adSettings,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : adSettings.enabled,
    adClient: typeof body.adClient === 'string' ? body.adClient.trim() : adSettings.adClient,
    autoAds: typeof body.autoAds === 'boolean' ? body.autoAds : adSettings.autoAds,
    showTopBanner: typeof body.showTopBanner === 'boolean' ? body.showTopBanner : adSettings.showTopBanner,
    showInFeed: typeof body.showInFeed === 'boolean' ? body.showInFeed : adSettings.showInFeed,
    showArticleBanner: typeof body.showArticleBanner === 'boolean' ? body.showArticleBanner : adSettings.showArticleBanner,
    testMode: typeof body.testMode === 'boolean' ? body.testMode : adSettings.testMode,
    updatedAt: new Date().toISOString()
  };

  persistAdSettings();

  // If a valid Google AdSense pub ID is supplied, sync it to ads.txt automatically
  const pubMatch = adSettings.adClient.match(/pub-\d+/);
  if (pubMatch && fs.existsSync(ADS_TXT_PATH)) {
    try {
      const pubId = pubMatch[0];
      const adsTxtContent = `# Result Darpan (resultdarpan.com) Authorized Digital Sellers (ads.txt)\ngoogle.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
      fs.writeFileSync(ADS_TXT_PATH, adsTxtContent, 'utf8');
    } catch (e) {
      console.warn('Could not auto-sync ads.txt:', e.message);
    }
  }

  res.json({ success: true, adSettings });
});

// Export complete site data bundle (Admin only)
app.get('/api/admin/export-all-data', requireAuth, requireAdmin, (req, res) => {
  try {
    ensureStore();
    const exportBundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      platform: 'Result Darpan',
      blogs,
      notifications,
      studyMaterials,
      questionSets: customQuestionSets,
      previousYearQuestions: previousYearQuestionsList,
      adSettings,
      contactsCount: contacts.length
    };

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="resultdarpan-live-data-backup.json"');
      res.setHeader('Content-Type', 'application/json');
    }
    res.json(exportBundle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export site data: ' + err.message });
  }
});

// Import site data bundle (Admin only)
app.post('/api/admin/import-all-data', requireAuth, requireAdmin, (req, res) => {
  try {
    ensureStore();
    const bundle = req.body;
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ error: 'Invalid backup bundle payload.' });
    }

    if (Array.isArray(bundle.blogs)) {
      blogs.splice(0, blogs.length, ...bundle.blogs);
      persistBlogs();
    }
    if (Array.isArray(bundle.notifications)) {
      notifications.splice(0, notifications.length, ...bundle.notifications);
      persistNotifications();
    }
    if (Array.isArray(bundle.studyMaterials)) {
      studyMaterials.splice(0, studyMaterials.length, ...bundle.studyMaterials);
      persistStudyMaterials();
    }
    if (Array.isArray(bundle.questionSets)) {
      customQuestionSets.splice(0, customQuestionSets.length, ...bundle.questionSets);
      persistQuestionSets();
    }
    if (Array.isArray(bundle.previousYearQuestions)) {
      previousYearQuestionsList.splice(0, previousYearQuestionsList.length, ...bundle.previousYearQuestions);
      persistPreviousYearQuestions();
    }
    if (bundle.adSettings && typeof bundle.adSettings === 'object') {
      Object.assign(adSettings, bundle.adSettings);
      persistAdSettings();
    }

    res.json({
      success: true,
      message: 'Site data successfully restored and persisted to disk.',
      restoredAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import site data: ' + err.message });
  }
});

// Admin Password Update Endpoint (Enables changing credentials directly from Admin Panel)
app.post('/api/admin/change-password', requireAuth, requireAdmin, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = req.user;
    if (!verifyPassword(user, String(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.passwordHash = hashPassword(newPassword);
    delete user.password;
    persistUsers();

    // Persistent backup so it never gets reverted by deployment zips
    try {
      const backupDir = path.join(DATA_DIR, 'persistent_backup');
      if (fs.existsSync(backupDir)) {
        fs.writeFileSync(path.join(backupDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
      }
    } catch (_) {}

    broadcastSyncChange('users');
    res.json({ success: true, message: 'Admin password successfully updated! Your new password is now active.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password: ' + err.message });
  }
});

// Admin System Status & Health Endpoint
app.get('/api/admin/system-status', requireAuth, requireAdmin, (req, res) => {
  res.json({
    status: 'online',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    adminEmail: req.user.email,
    sessionExpiresInDays: Math.round(ADMIN_SESSION_DURATION_MS / (24 * 60 * 60 * 1000)),
    totalUsers: users.length,
    totalQuestionSets: customQuestionSets.length,
    totalBlogs: blogs.length,
    totalNotifications: notifications.length,
    totalMaterials: studyMaterials.length,
    totalPYQs: previousYearQuestionsList.length
  });
});

// ==========================================
// REAL-TIME SYNC API ENDPOINTS
// ==========================================
// 1. Lightweight version check (0ms, unauthenticated for ultra-fast polling)
app.get('/api/sync/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.json({
    version: dataVersion,
    counts: {
      questionSets: customQuestionSets.length,
      blogs: blogs.length,
      notifications: notifications.length,
      studyMaterials: studyMaterials.length,
      previousYearQuestions: previousYearQuestionsList.length
    }
  });
});

// 2. Real-time Server-Sent Events (SSE) stream
app.get('/api/sync/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now(), version: dataVersion })}\n\n`);

  syncSubscribers.add(res);

  // Keep-alive heartbeat every 20 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch (_) {
      clearInterval(heartbeatTimer);
      syncSubscribers.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    syncSubscribers.delete(res);
  });
});

// 3. Intelligent two-way merge bundle endpoint
app.post('/api/sync/merge-bundle', requireAuth, requireAdmin, (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ error: 'Invalid sync payload' });
    }

    let stats = { questionSets: 0, blogs: 0, notifications: 0, materials: 0, pyq: 0 };

    // Merge Question Sets (Preserves newer question sets by timestamp)
    if (Array.isArray(incoming.questionSets)) {
      incoming.questionSets.forEach((inSet) => {
        const curIdx = customQuestionSets.findIndex((s) => s.id === inSet.id);
        if (curIdx === -1) {
          customQuestionSets.push(inSet);
          stats.questionSets++;
        } else {
          const curTime = Date.parse(customQuestionSets[curIdx].updatedAt || 0) || 0;
          const inTime = Date.parse(inSet.updatedAt || 0) || 0;
          if (inTime >= curTime) {
            customQuestionSets[curIdx] = inSet;
            stats.questionSets++;
          }
        }
      });
      if (stats.questionSets > 0) {
        writeJson(QUESTION_SETS_PATH, customQuestionSets);
        rebuildQuestionCatalog();
        broadcastSyncChange('questionSets');
      }
    }

    // Merge Blogs
    if (Array.isArray(incoming.blogs)) {
      incoming.blogs.forEach((inBlog) => {
        const curIdx = blogs.findIndex((b) => b.id === inBlog.id);
        if (curIdx === -1) {
          blogs.push(inBlog);
          stats.blogs++;
        } else {
          const curTime = Date.parse(blogs[curIdx].updatedAt || blogs[curIdx].publishedAt || 0) || 0;
          const inTime = Date.parse(inBlog.updatedAt || inBlog.publishedAt || 0) || 0;
          if (inTime >= curTime) {
            blogs[curIdx] = inBlog;
            stats.blogs++;
          }
        }
      });
      if (stats.blogs > 0) {
        writeJson(BLOGS_PATH, blogs);
        broadcastSyncChange('blogs');
      }
    }

    // Merge Notifications
    if (Array.isArray(incoming.notifications)) {
      incoming.notifications.forEach((inNotif) => {
        const curIdx = notifications.findIndex((n) => n.id === inNotif.id);
        if (curIdx === -1) {
          notifications.push(inNotif);
          stats.notifications++;
        } else {
          const curTime = Date.parse(notifications[curIdx].updatedAt || notifications[curIdx].createdAt || 0) || 0;
          const inTime = Date.parse(inNotif.updatedAt || inNotif.createdAt || 0) || 0;
          if (inTime >= curTime) {
            notifications[curIdx] = inNotif;
            stats.notifications++;
          }
        }
      });
      if (stats.notifications > 0) {
        writeJson(NOTIFICATIONS_PATH, notifications);
        broadcastSyncChange('notifications');
      }
    }

    // Merge Study Materials
    if (Array.isArray(incoming.studyMaterials)) {
      incoming.studyMaterials.forEach((inMat) => {
        const curIdx = studyMaterials.findIndex((m) => m.id === inMat.id);
        if (curIdx === -1) {
          studyMaterials.push(inMat);
          stats.materials++;
        } else {
          const curTime = Date.parse(studyMaterials[curIdx].updatedAt || studyMaterials[curIdx].createdAt || 0) || 0;
          const inTime = Date.parse(inMat.updatedAt || inMat.createdAt || 0) || 0;
          if (inTime >= curTime) {
            studyMaterials[curIdx] = inMat;
            stats.materials++;
          }
        }
      });
      if (stats.materials > 0) {
        writeJson(STUDY_MATERIALS_PATH, studyMaterials);
        broadcastSyncChange('studyMaterials');
      }
    }

    // Merge PYQs
    if (Array.isArray(incoming.previousYearQuestions)) {
      incoming.previousYearQuestions.forEach((inPyq) => {
        const curIdx = previousYearQuestionsList.findIndex((p) => p.id === inPyq.id);
        if (curIdx === -1) {
          previousYearQuestionsList.push(inPyq);
          stats.pyq++;
        } else {
          const curTime = Date.parse(previousYearQuestionsList[curIdx].updatedAt || previousYearQuestionsList[curIdx].createdAt || 0) || 0;
          const inTime = Date.parse(inPyq.updatedAt || inPyq.createdAt || 0) || 0;
          if (inTime >= curTime) {
            previousYearQuestionsList[curIdx] = inPyq;
            stats.pyq++;
          }
        }
      });
      if (stats.pyq > 0) {
        writeJson(PREVIOUS_YEAR_QUESTIONS_PATH, previousYearQuestionsList);
        broadcastSyncChange('previousYearQuestions');
      }
    }

    res.json({
      success: true,
      mergedAt: new Date().toISOString(),
      updatedItems: stats
    });
  } catch (err) {
    res.status(500).json({ error: 'Merge failed: ' + err.message });
  }
});

function sendFreshHtml(res, fileName) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(staticDir, fileName));
}

// Clean URLs page routes
app.get('/contact', (req, res) => {
  sendFreshHtml(res, 'contact.html');
});

app.get('/blogs', (req, res) => {
  sendFreshHtml(res, 'blogs.html');
});

app.get('/resources', (req, res) => {
  sendFreshHtml(res, 'resources.html');
});

app.get('/profile', (req, res) => {
  sendFreshHtml(res, 'profile.html');
});

app.get('/mentor-chat', (req, res) => {
  sendFreshHtml(res, 'mentor-chat.html');
});

app.get('/class-series', (req, res) => {
  sendFreshHtml(res, 'class-series.html');
});

app.get('/previous-year-questions', (req, res) => {
  sendFreshHtml(res, 'previous-year-questions.html');
});

app.get('/privacy', (req, res) => {
  sendFreshHtml(res, 'privacy.html');
});

app.get('/terms', (req, res) => {
  sendFreshHtml(res, 'terms.html');
});

app.get('/notifications', (req, res) => {
  sendFreshHtml(res, 'notifications.html');
});

// Admin management portal restricted to /wariya
app.get('/wariya', (req, res) => {
  sendFreshHtml(res, 'wariya.html');
});

// Explicitly block /admin and /admin.html so it is not accessible to anyone
app.all(['/admin', '/admin.html'], (req, res) => {
  res.status(404);
  sendFreshHtml(res, 'index.html');
});

app.get('/classes/:classNumber', (req, res, next) => {
  if (!classCurricula[Number(req.params.classNumber)]) return next();
  sendFreshHtml(res, 'class-series.html');
});

app.use((req, res) => {
  sendFreshHtml(res, 'index.html');
});

// Centralized production error handler: never leak stack traces or internal server error details
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error('[Internal Error]', req.method, req.url, err?.message || err);
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: 'An unexpected internal error occurred. Please try again later.'
    });
  }
  res.status(500);
  sendFreshHtml(res, 'index.html');
});

if (require.main === module) {
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    app.listen(PORT, () => {
      console.log(`Result Darpan backend listening on socket ${PORT}`);
    });
  } else {
    app.listen(PORT, HOST, () => {
      console.log(`Result Darpan backend listening on http://${HOST}:${PORT}`);
    });
  }
}

module.exports = app;
