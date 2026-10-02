const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const examsSection = document.querySelector('#exams');
if (examsSection && !document.querySelector('#schoolClasses')) {
  const schoolClasses = document.createElement('section');
  schoolClasses.id = 'schoolClasses';
  schoolClasses.className = 'school-classes-section';
  schoolClasses.innerHTML = '<div class="shell"><div class="section-heading"><div><span class="kicker">SCHOOL PREP</span><h2>Build strong basics<br><em>from Class 9 to 12.</em></h2></div><span class="subject-note">Choose your class for focused school-level practice and revision.</span></div><div class="school-class-grid"><a class="school-class-card" href="class-series.html?class=9" data-school-class="9"><span>09</span><strong>Class 9</strong><small>Foundation practice</small></a><a class="school-class-card" href="class-series.html?class=10" data-school-class="10"><span>10</span><strong>Class 10</strong><small>Boards and basics</small></a><a class="school-class-card" href="class-series.html?class=11" data-school-class="11"><span>11</span><strong>Class 11</strong><small>Concept building</small></a><a class="school-class-card" href="class-series.html?class=12" data-school-class="12"><span>12</span><strong>Class 12</strong><small>Boards and entrance prep</small></a></div></div>';
  examsSection.before(schoolClasses);
  schoolClasses.querySelectorAll('.school-class-card').forEach((card) => {
    card.addEventListener('click', () => {
      window.localStorage.setItem('preply-school-class', card.dataset.schoolClass);
    });
  });
  const savedSchoolClass = window.localStorage.getItem('preply-school-class');
  schoolClasses.querySelector(`[data-school-class="${savedSchoolClass}"]`)?.classList.add('selected');
}
const subjectsSection = document.querySelector('#subjects');
const signupBand = document.querySelector('#resources');
const testimonialsSection = document.querySelector('#testimonials');
const chatSection = document.querySelector('#chat');
const profileSection = document.querySelector('#profile');
if (subjectsSection && signupBand) subjectsSection.after(signupBand);
if (signupBand && testimonialsSection) signupBand.after(testimonialsSection);
if (subjectsSection && chatSection) subjectsSection.after(chatSection);
if (chatSection && profileSection) chatSection.after(profileSection);
if (subjectsSection && !document.querySelector('#previousYearBand')) {
  const previousYearBand = document.createElement('section');
  previousYearBand.id = 'previousYearBand';
  previousYearBand.className = 'previous-year-band';
  previousYearBand.innerHTML = '<div class="shell previous-year-band-inner"><div><span class="kicker">EXAM PATTERN PRACTICE</span><h2>Previous year questions,<br><em>one focused set at a time.</em></h2><p>Practise SSC CGL, Railway NTPC, and Railway Group D question patterns in one dedicated library.</p></div><a class="primary-btn" href="previous-year-questions.html">Explore previous year questions <span>→</span></a></div>';
  subjectsSection.before(previousYearBand);
}
if (nav && !nav.querySelector('a[href="previous-year-questions.html"]')) {
  const previousYearLink = document.createElement('a');
  previousYearLink.href = 'previous-year-questions.html';
  previousYearLink.textContent = 'Previous year questions';
  nav.appendChild(previousYearLink);
}
document.querySelectorAll('a').forEach((link) => {
  if (link.textContent.trim().toLowerCase() === 'contact') link.href = 'contact.html';
  if (link.textContent.trim().toLowerCase() === 'privacy') link.href = 'privacy.html';
  if (link.textContent.trim().toLowerCase() === 'terms') link.href = 'terms.html';
});
menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '×' : '☰';
});

document.addEventListener('click', (e) => {
  if (nav && nav.classList.contains('open') && !nav.contains(e.target) && !menuToggle?.contains(e.target)) {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.textContent = '☰';
  }
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.textContent = '☰';
  });
});

// --- CATALOG CONTROLLER: SEARCH, CATEGORIES, AND VIEW ALL TOGGLE ---
let activeCatalogCategory = 'all';
let showAllExamsExpanded = false;

function applyCatalogFilters() {
  if (typeof window.__applyCatalogFilters === 'function') {
    window.__applyCatalogFilters();
    return;
  }

  const searchInput = document.getElementById('catalogSearchInput');
  const searchClear = document.getElementById('catalogSearchClear');
  const emptyState = document.getElementById('catalogEmptyState');
  const emptyQueryText = document.getElementById('emptyQueryText');
  const toggleBtn = document.getElementById('toggleAllExamsBtn');
  const toggleWrap = document.getElementById('viewAllExamsWrap');
  const allCards = document.querySelectorAll('.test-card');

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const isSearching = query.length > 0;

  if (searchClear) {
    if (isSearching) {
      searchClear.hidden = false;
      searchClear.removeAttribute('hidden');
      searchClear.style.setProperty('display', 'inline-flex', 'important');
    } else {
      searchClear.hidden = true;
      searchClear.setAttribute('hidden', '');
      searchClear.style.setProperty('display', 'none', 'important');
    }
  }

  let visibleCount = 0;

  allCards.forEach((card) => {
    const cardCat = (card.dataset.category || '').toLowerCase();
    const isPopular = card.dataset.popular === 'true';
    const text = (card.textContent || '').toLowerCase();

    const matchesCategory = activeCatalogCategory === 'all' || cardCat === activeCatalogCategory;
    const matchesQuery = !isSearching || text.includes(query);

    let shouldShow = false;
    if (isSearching) {
      shouldShow = matchesCategory && matchesQuery;
    } else if (activeCatalogCategory === 'all') {
      shouldShow = showAllExamsExpanded ? true : isPopular;
    } else {
      shouldShow = cardCat === activeCatalogCategory;
    }

    if (shouldShow) {
      card.hidden = false;
      card.removeAttribute('hidden');
      card.classList.remove('is-catalog-hidden');
      card.style.setProperty('display', 'flex', 'important');
      visibleCount++;
    } else {
      card.hidden = true;
      card.setAttribute('hidden', '');
      card.classList.add('is-catalog-hidden');
      card.style.setProperty('display', 'none', 'important');
    }
  });

  if (emptyState) {
    if (visibleCount === 0 && isSearching) {
      emptyState.hidden = false;
      emptyState.removeAttribute('hidden');
      emptyState.style.setProperty('display', 'block', 'important');
      if (emptyQueryText) emptyQueryText.textContent = query;
    } else {
      emptyState.hidden = true;
      emptyState.setAttribute('hidden', '');
      emptyState.style.setProperty('display', 'none', 'important');
    }
  }

  if (toggleWrap && toggleBtn) {
    if (activeCatalogCategory === 'all' && !isSearching) {
      toggleWrap.hidden = false;
      toggleWrap.removeAttribute('hidden');
      toggleWrap.style.setProperty('display', 'flex', 'important');
      if (showAllExamsExpanded) {
        toggleBtn.innerHTML = '<span>Show less</span> <span class="btn-icon">↑</span>';
      } else {
        toggleBtn.innerHTML = `<span>Show all ${allCards.length} exams</span> <span class="btn-icon">↓</span>`;
      }
    } else {
      toggleWrap.hidden = true;
      toggleWrap.setAttribute('hidden', '');
      toggleWrap.style.setProperty('display', 'none', 'important');
    }
  }
}

// Subject tabs filtering with guaranteed display styling
document.querySelectorAll('.subject-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelector('.subject-tab.active')?.classList.remove('active');
    tab.classList.add('active');
    const subject = tab.dataset.subject;
    document.querySelectorAll('.subject-card').forEach((card) => {
      const shouldShow = subject === 'all' || card.dataset.subject === subject;
      card.hidden = !shouldShow;
      card.style.setProperty('display', shouldShow ? 'flex' : 'none', 'important');
    });
  });
});

// Run catalog filter initially
window.addEventListener('DOMContentLoaded', applyCatalogFilters);
applyCatalogFilters();

document.querySelectorAll('.subject-test-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const requestedSubject = button.closest('.subject-card')?.dataset.subject;
    const cardTitle = button.closest('.subject-card')?.querySelector('h3')?.textContent || 'Subject';
    openSetSelectionModal('subject', requestedSubject, `${cardTitle} Practice`);
  });
});

document.querySelector('.email-box button')?.addEventListener('click', () => {
  const input = document.querySelector('.email-box input');
  if (input.value.trim()) {
    input.value = '';
    input.placeholder = 'You are on the list ✓';
  } else {
    input.focus();
  }
});

document.querySelectorAll('.nav-cta, #guestProfileBtn').forEach((button) => {
  button.addEventListener('click', () => {
    openAuth();
  });
});

let questions = [
  { topic: 'English Comprehension', text: 'Choose the correctly spelt word.', options: ['Accomodation', 'Accommodation', 'Acommodation', 'Accommadation'], answer: 1 },
  { topic: 'Quantitative Aptitude', text: 'What is 15% of 240?', options: ['24', '30', '36', '42'], answer: 2 },
  { topic: 'General Intelligence', text: 'Find the next number in the series: 3, 8, 15, 24, 35, ?', options: ['42', '46', '48', '50'], answer: 2 },
  { topic: 'General Awareness', text: 'Which fundamental right is known as the Right to Constitutional Remedies?', options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'], answer: 3 },
  { topic: 'Quantitative Aptitude', text: 'A train covers 360 km in 4 hours. What is its average speed?', options: ['80 km/h', '90 km/h', '100 km/h', '120 km/h'], answer: 1 },
  { topic: 'English Comprehension', text: 'Choose the antonym of “Transparent”.', options: ['Clear', 'Visible', 'Opaque', 'Bright'], answer: 2 },
  { topic: 'General Intelligence', text: 'If CAT is coded as DBU, how is DOG coded?', options: ['EPH', 'EOG', 'DPH', 'FPI'], answer: 0 },
  { topic: 'General Awareness', text: 'The headquarters of the United Nations is located in:', options: ['Geneva', 'New York', 'Paris', 'London'], answer: 1 },
  { topic: 'Quantitative Aptitude', text: 'What is the simple interest on ₹5,000 at 8% per annum for 2 years?', options: ['₹400', '₹600', '₹800', '₹1,000'], answer: 2 },
  { topic: 'General Awareness', text: 'Which gas is most abundant in Earth’s atmosphere?', options: ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Nitrogen'], answer: 3 }
];

const apiOrigin = (() => {
  if (typeof window === 'undefined') return '';
  const port = window.location.port;
  const host = window.location.hostname;
  if (window.location.protocol === 'file:' || (host === '127.0.0.1' && port !== '3000') || (host === 'localhost' && port !== '3000')) {
    return 'http://localhost:3000';
  }
  return '';
})();

function getFallbackMockTest(testId) {
  const configs = {
    'ssc-cgl': { title: 'SSC CGL Tier-I Mock 01', durationSeconds: 3600, total: 25 },
    'sbi-clerk': { title: 'SBI Clerk Prelims 2026', durationSeconds: 3600, total: 25 },
    'rrb-ntpc': { title: 'RRB NTPC CBT-I Mock 01', durationSeconds: 5400, total: 25 },
    'jee-main': { title: 'JEE Main 2026 · Full Mock Test', durationSeconds: 10800, total: 25 },
    'neet-ug': { title: 'NEET UG 2026 · Full Practice Paper', durationSeconds: 12000, total: 25 },
    'upsc-prelims': { title: 'UPSC Civil Services Prelims · GS Paper I', durationSeconds: 7200, total: 25 },
    'jee-advanced': { title: 'JEE Advanced 2026 · Paper 1 Mock', durationSeconds: 10800, total: 20 },
    'cuet-ug': { title: 'CUET UG 2026 · General Test Mock', durationSeconds: 3600, total: 20 },
    'gate-cs': { title: 'GATE 2026 · Computer Science & IT', durationSeconds: 10800, total: 20 },
    'cat-exam': { title: 'CAT 2026 · Speed & Accuracy Drill', durationSeconds: 7200, total: 20 },
    'clat-exam': { title: 'CLAT 2026 · Legal & Logical Reasoning', durationSeconds: 7200, total: 20 },
    'sbi-po': { title: 'SBI PO Prelims 2026 · Mock Test', durationSeconds: 3600, total: 25 },
    'ibps-po': { title: 'IBPS PO Prelims 2026 · Mock Test', durationSeconds: 3600, total: 25 },
    'ibps-clerk': { title: 'IBPS Clerk Prelims 2026 · Mock Test', durationSeconds: 3600, total: 25 },
    'rbi-grade-b': { title: 'RBI Grade B Phase-I · Mock 2026', durationSeconds: 7200, total: 25 },
    'ssc-chsl': { title: 'SSC CHSL (10+2) Tier-I Mock 2026', durationSeconds: 3600, total: 25 },
    'ssc-mts': { title: 'SSC MTS & Havaldar Mock 2026', durationSeconds: 5400, total: 25 },
    'ssc-gd': { title: 'SSC GD Constable Practice Set 2026', durationSeconds: 3600, total: 25 },
    'rrb-group-d': { title: 'RRB Group D CBT Mock 2026', durationSeconds: 5400, total: 25 },
    'rrb-alp': { title: 'RRB ALP CBT-I Practice Test', durationSeconds: 3600, total: 25 },
    'bpsc-prelims': { title: '70th BPSC Prelims · Full Mock Test', durationSeconds: 7200, total: 25 },
    'uppsc-prelims': { title: 'UPPSC PCS Prelims · GS Paper I', durationSeconds: 7200, total: 25 },
    'nda-mathematics': { title: 'NDA II 2026 · Mathematics', durationSeconds: 9000, total: 25 },
    'cds-exam': { title: 'UPSC CDS II 2026 · English & GK Mock', durationSeconds: 7200, total: 25 },
    'afcat-exam': { title: 'AFCAT 01/2026 · Full Practice Test', durationSeconds: 7200, total: 25 },
    'ctet-paper-1': { title: 'CTET Paper-I Mock 2026', durationSeconds: 9000, total: 25 },
    'ctet-paper-2': { title: 'CTET Paper-II (Class 6-8) Mock 2026', durationSeconds: 9000, total: 25 },
    'ugc-net': { title: 'UGC NET Paper 1 · Teaching & Research Mock', durationSeconds: 3600, total: 25 }
  };
  const conf = configs[testId] || { title: 'Result Darpan Mock Test', durationSeconds: 3600, total: 20 };
  const pool = [
    { topic: 'Quantitative Aptitude', text: 'If a train 150m long passes a pole in 9 seconds, what is its speed in km/h?', options: ['54 km/h', '60 km/h', '72 km/h', '80 km/h'], answer: 1 },
    { topic: 'Reasoning', text: 'Select the missing number in the series: 4, 9, 25, 49, 121, ?', options: ['144', '169', '196', '225'], answer: 1 },
    { topic: 'General Science', text: 'What is the powerhouse of the eukaryotic cell?', options: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Lysosome'], answer: 1 },
    { topic: 'General Awareness', text: 'Who is known as the Chief Architect of the Indian Constitution?', options: ['Mahatma Gandhi', 'Dr. B.R. Ambedkar', 'Jawaharlal Nehru', 'Sardar Vallabhbhai Patel'], answer: 1 },
    { topic: 'English Language', text: 'Choose the word nearest in meaning to "CANDID":', options: ['Deceptive', 'Frank', 'Arrogant', 'Shy'], answer: 1 },
    { topic: 'Mathematics', text: 'What is the value of sin²(30°) + cos²(30°)?', options: ['0.5', '1', '1.5', '2'], answer: 1 },
    { topic: 'Indian Polity', text: 'Under which Article of the Constitution of India are Fundamental Rights guaranteed?', options: ['Articles 5-11', 'Articles 12-35', 'Articles 36-51', 'Article 51A'], answer: 1 },
    { topic: 'Current Affairs', text: 'Which river is known as the "Dakshin Ganga" of India?', options: ['Krishna', 'Godavari', 'Cauvery', 'Mahanadi'], answer: 1 },
    { topic: 'General Intelligence', text: 'Find the odd one out: Circle, Square, Sphere, Triangle.', options: ['Circle', 'Square', 'Sphere', 'Triangle'], answer: 2 },
    { topic: 'Data Interpretation', text: 'If the price of petrol increases by 25%, by what percent must consumption be reduced to keep expenditure constant?', options: ['15%', '20%', '25%', '30%'], answer: 1 },
    { topic: 'Physics', text: 'What is the acceleration due to gravity on the surface of the Earth approximately?', options: ['8.9 m/s²', '9.8 m/s²', '10.8 m/s²', '12 m/s²'], answer: 1 },
    { topic: 'Chemistry', text: 'What is the chemical formula of common salt?', options: ['KCl', 'NaCl', 'CaCO3', 'NaHCO3'], answer: 1 }
  ];
  const qList = Array.from({ length: conf.total }, (_, i) => {
    const item = pool[i % pool.length];
    return {
      id: `${testId}-${i + 1}`,
      number: i + 1,
      topic: item.topic,
      text: item.text,
      options: [...item.options],
      answer: item.answer
    };
  });
  return {
    id: testId,
    title: conf.title,
    durationSeconds: conf.durationSeconds,
    totalQuestions: conf.total,
    questions: qList
  };
}

const questionBankPromise = Promise.resolve();

const testModal = document.querySelector('#testModal');
const questionText = document.querySelector('#questionText');
const questionTopic = document.querySelector('#questionTopic');
const answerOptions = document.querySelector('#answerOptions');
const questionMap = document.querySelector('#questionMap');
const questionCount = document.querySelector('#questionCount');
const progressBar = document.querySelector('#progressBar');
const testTimer = document.querySelector('#testTimer');
const testResult = document.querySelector('#testResult');
const leaderboardRows = document.querySelector('#leaderboardRows');
let currentQuestion = 0;
let answers = Array(questions.length).fill(null);
let timerId;
let secondsLeft = 900;
let testStartedAt = 0;
let activeQuestionSubject = null;
let activeQuestionSet = null;
let activeMockTestId = null;
let activeTestDurationSeconds = 900;
let activeTestTitle = 'Focused practice test';
let testSubmitting = false;

function publishProfileStats(stats) {
  const update = { email: window.localStorage.getItem('preply-account-email'), stats, updatedAt: Date.now() };
  try {
    const channel = new BroadcastChannel('result-darpan-profile');
    channel.postMessage(update);
    channel.close();
  } catch (error) {
    console.warn('Profile updates will refresh when the page is reopened:', error.message);
  }
  window.localStorage.setItem('preply-profile-stats-update', JSON.stringify(update));
}

function formatStudyTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function updateProfileMetrics(stats) {
  const testsMetric = document.querySelector('#profileTests');
  const bestMetric = document.querySelector('#profileBest');
  const studyMetric = document.querySelector('#profileStudyTime') || document.querySelector('.profile-metrics > div:nth-child(3) strong');
  if (studyMetric && !studyMetric.id) studyMetric.id = 'profileStudyTime';
  if (testsMetric) testsMetric.textContent = stats.testsTaken;
  if (bestMetric) bestMetric.textContent = `${stats.averageAccuracy}%`;
  if (studyMetric) studyMetric.textContent = formatStudyTime(stats.studyTimeMinutes);
  const accuracyLabel = document.querySelectorAll('.profile-metrics span')[1];
  if (accuracyLabel) accuracyLabel.textContent = 'Average accuracy';
}

function renderHomeGoals(goals = []) {
  const list = document.querySelector('#goalList');
  if (!list) return;
  list.replaceChildren();
  if (!goals.length) {
    const empty = document.createElement('p');
    empty.className = 'goal-empty';
    empty.textContent = 'Add an exam goal to personalise your prep desk.';
    list.appendChild(empty);
    return;
  }
  goals.forEach((goal) => {
    const item = document.createElement('div');
    item.className = 'goal-item';
    const icon = document.createElement('span');
    icon.className = 'goal-icon mint-icon';
    icon.textContent = goal.name.slice(0, 1).toUpperCase();
    const detail = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = goal.name;
    const note = document.createElement('span');
    note.textContent = 'Personal study goal';
    detail.append(name, note);
    const progress = document.createElement('b');
    progress.textContent = '0%';
    item.append(icon, detail, progress);
    list.appendChild(item);
  });
}

async function loadHomeProfile() {
  const name = document.querySelector('#profileName');
  const label = document.querySelector('.profile-top p');
  const avatar = document.querySelector('.profile-avatar');
  const token = window.localStorage.getItem('preply-session-token');
  if (name) name.textContent = token ? 'Loading profile...' : 'Your profile';
  if (label) label.textContent = token ? 'Loading your personal data' : 'Sign in to view your personal profile';
  if (avatar && !token) avatar.textContent = '?';
  updateProfileMetrics({ testsTaken: 0, averageAccuracy: 0, studyTimeMinutes: 0 });
  renderHomeGoals();
  const activityLabel = document.querySelector('.profile-progress .progress-label span');
  const activityBar = document.querySelector('.profile-progress .progress-track span');
  const streak = document.querySelector('.streak-pill');
  if (activityLabel) activityLabel.textContent = '0 of 7 days';
  if (activityBar) activityBar.style.width = '0%';
  if (streak) streak.textContent = '0 active days this week';
  if (!token) {
    return;
  }
  try {
    const response = await fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Your profile could not be loaded.');
    const payload = await response.json();
    const user = payload.user;
    if (name) name.textContent = user.name;
    const classSuffix = user.schoolClass && !new RegExp(`\\bclass\\s*${user.schoolClass}\\b`, 'i').test(user.exam) ? ` · School Class ${user.schoolClass}` : '';
    if (label) label.textContent = `${user.exam} · ${user.location}${classSuffix}`;
    if (avatar) avatar.textContent = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const activeDates = new Set((payload.stats.testAttempts || []).filter((attempt) => Date.now() - Date.parse(attempt.createdAt) < 7 * 86400000).map((attempt) => new Date(attempt.createdAt).toDateString()));
    if (activityLabel) activityLabel.textContent = `${activeDates.size} of 7 days`;
    if (activityBar) activityBar.style.width = `${Math.round((activeDates.size / 7) * 100)}%`;
    if (streak) streak.textContent = `${activeDates.size} active days this week`;
    window.localStorage.setItem('preply-profile-name', user.name);
    window.localStorage.setItem('preply-profile-exam', user.exam);
    window.localStorage.setItem('preply-profile-location', user.location);
    if (user.schoolClass) window.localStorage.setItem('preply-school-class', user.schoolClass);
    const researchTag = document.querySelector('#researchTag');
    const researchText = document.querySelector('#researchText');
    if (researchTag) researchTag.textContent = user.exam.toUpperCase();
    if (researchText) researchText.textContent = `Your ${user.exam} feed is ready. Review practice sets selected for your preparation.`;
    updateProfileMetrics(payload.stats);
    renderHomeGoals(user.goals);
  } catch (error) {
    console.warn('Unable to load account profile:', error.message);
  }
}
loadHomeProfile();
window.addEventListener('profile-goals-updated', loadHomeProfile);

function getCurrentExam() {
  const exam = window.localStorage.getItem('preply-profile-exam') || 'SSC CGL';
  if (/group\s*d/i.test(exam)) return 'Railway Group D';
  if (/ntpc|railway/i.test(exam)) return 'Railway NTPC';
  return 'SSC CGL';
}

function getQuestionSetSubject(subject, exam) {
  if (subject === 'hindi') return 'Hindi';
  if (subject === 'mathematics') return 'Mathematics';
  if (subject === 'reasoning') return 'Reasoning';
  if (subject === 'polity') return 'Indian Polity';
  if (subject === 'science' && exam !== 'SSC CGL') return 'General Science';
  if (subject === 'english' && exam === 'SSC CGL') return 'English';
  return 'General Awareness';
}

async function loadSubjectQuestionSet() {
  if (!activeQuestionSubject) return;
  const exam = getCurrentExam();
  const subject = getQuestionSetSubject(activeQuestionSubject, exam);
  const response = await fetch(`${apiOrigin}/api/question-sets?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&set=1`);
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload.questions)) throw new Error('Subject questions could not be loaded.');
  questions = payload.questions;
  activeQuestionSet = { exam, subject, set: payload.set };
}

function renderQuestion() {
  const question = questions[currentQuestion];
  questionTopic.textContent = [question.exam, question.year, question.topic].filter(Boolean).join(' · ');
  questionText.textContent = question.text;
  questionCount.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  answerOptions.innerHTML = question.options.map((option, index) => `<button class="answer-option${answers[currentQuestion] === index ? ' selected' : ''}" data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join('');
  questionMap.innerHTML = questions.map((_, index) => `<button class="map-item${index === currentQuestion ? ' current' : ''}${answers[index] !== null ? ' answered' : ''}" data-question="${index}">${index + 1}</button>`).join('');
  document.querySelector('#previousQuestion').disabled = currentQuestion === 0;
  document.querySelector('#nextQuestion').innerHTML = currentQuestion === questions.length - 1 ? 'Submit test <span>✓</span>' : 'Next question <span>→</span>';
}

function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');
  testTimer.textContent = `${minutes}:${seconds}`;
  if (secondsLeft <= 60) testTimer.classList.add('urgent');
  if (secondsLeft <= 0) finishTest();
  secondsLeft -= 1;
}

async function openTest() {
  await questionBankPromise;
  if (activeQuestionSubject) {
    try {
      await loadSubjectQuestionSet();
      activeTestTitle = `${activeQuestionSubject[0].toUpperCase()}${activeQuestionSubject.slice(1)} practice test`;
      activeTestDurationSeconds = 900;
    } catch (error) {
      console.warn('Subject test load error:', error.message);
      const fallback = getFallbackMockTest('subject-practice');
      questions = fallback.questions;
      activeQuestionSet = null;
      activeTestTitle = `${activeQuestionSubject[0].toUpperCase()}${activeQuestionSubject.slice(1)} practice test`;
      activeTestDurationSeconds = 900;
    }
  } else if (activeMockTestId) {
    let loadedFromServer = false;
    try {
      const response = await fetch(`${apiOrigin}/api/mock-tests/${encodeURIComponent(activeMockTestId)}`);
      if (response.ok) {
        const text = await response.text();
        const payload = JSON.parse(text);
        if (payload && Array.isArray(payload.questions) && payload.questions.length > 0) {
          questions = payload.questions;
          activeQuestionSet = null;
          activeTestTitle = payload.title || 'Result Darpan Mock Test';
          activeTestDurationSeconds = payload.durationSeconds || 3600;
          loadedFromServer = true;
        }
      }
    } catch (error) {
      console.warn('Backend mock test fetch failed, using instant fallback:', error.message);
    }
    if (!loadedFromServer) {
      const fallback = getFallbackMockTest(activeMockTestId);
      questions = fallback.questions;
      activeQuestionSet = null;
      activeTestTitle = fallback.title;
      activeTestDurationSeconds = fallback.durationSeconds;
    }
  }
  currentQuestion = 0;
  answers = Array(questions.length).fill(null);
  testSubmitting = false;
  secondsLeft = activeTestDurationSeconds;
  testStartedAt = Date.now();
  testTimer.classList.remove('urgent');
  document.querySelector('.test-header-center strong').textContent = activeTestTitle;
  testResult.hidden = true;
  document.querySelector('.test-body').hidden = false;
  document.querySelector('.test-progress').hidden = false;
  testModal.classList.add('visible');
  testModal.setAttribute('aria-hidden', 'false');
  renderQuestion();
  updateTimer();
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
}

function closeTest() {
  clearInterval(timerId);
  testModal.classList.remove('visible');
  testModal.setAttribute('aria-hidden', 'true');
}

async function saveTestResult() {
  const token = window.localStorage.getItem('preply-session-token');
  const endpoint = activeMockTestId
    ? `${apiOrigin}/api/mock-tests/${encodeURIComponent(activeMockTestId)}/results`
    : `${apiOrigin}/api/question-sets/results`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answers,
        durationSeconds: Math.max(1, Math.round((Date.now() - testStartedAt) / 1000)),
        ...(activeQuestionSet || {})
      })
    });
    if (response.ok) {
      const text = await response.text();
      const payload = JSON.parse(text);
      if (payload.stats) {
        updateProfileMetrics(payload.stats);
        publishProfileStats(payload.stats);
      }
      if (payload.attempt) return payload.attempt;
    }
  } catch (err) {
    console.warn('Backend result submission failed, grading locally:', err.message);
  }

  // Robust Client-side grading fallback
  const durationSeconds = Math.max(1, Math.round((Date.now() - testStartedAt) / 1000));
  const score = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0), 0);
  const attemptedCount = answers.filter((a) => a !== null).length;
  return {
    score,
    total: questions.length,
    attemptedCount,
    durationSeconds,
    testName: activeTestTitle || 'Practice Test'
  };
}

async function finishTest() {
  if (testSubmitting) return;
  testSubmitting = true;
  clearInterval(timerId);
  const attempted = answers.filter((answer) => answer !== null).length;
  let attempt;
  try {
    attempt = await saveTestResult();
  } catch (error) {
    document.querySelector('.test-body').hidden = true;
    document.querySelector('.test-progress').hidden = true;
    testResult.hidden = false;
    document.querySelector('#resultTitle').textContent = 'Test could not be graded.';
    document.querySelector('#resultScore').textContent = '—';
    document.querySelector('#resultPercent').textContent = '—';
    document.querySelector('#resultCorrect').textContent = '—';
    document.querySelector('#resultSummary').textContent = error.message;
    document.querySelector('#resultEncouragement').hidden = true;
    testSubmitting = false;
    return;
  }
  const correct = attempt.score;
  document.querySelector('.test-body').hidden = true;
  document.querySelector('.test-progress').hidden = true;
  testResult.hidden = false;
  document.querySelector('#resultScore').textContent = `${correct}/${questions.length}`;
  const accuracyPct = Math.round((correct / questions.length) * 100);
  document.querySelector('#resultPercent').textContent = `${accuracyPct}%`;
  document.querySelector('#resultCorrect').textContent = `${correct}`;
  document.querySelector('#resultSummary').textContent = `You scored ${correct} out of ${questions.length} (${accuracyPct}% accuracy) with ${attempted} questions attempted. Review the solutions below to solidify your concepts.`;
  if (accuracyPct === 100) {
    document.querySelector('#resultTitle').textContent = 'Outstanding Performance! 🎯';
  } else if (accuracyPct >= 80) {
    document.querySelector('#resultTitle').textContent = 'Excellent Accuracy! 🌟';
  } else if (accuracyPct >= 60) {
    document.querySelector('#resultTitle').textContent = 'Good Progress! 📈';
  } else if (accuracyPct >= 40) {
    document.querySelector('#resultTitle').textContent = 'Fair Attempt — Keep Practicing! 💡';
  } else {
    document.querySelector('#resultTitle').textContent = 'Consistent Effort Wins — Review & Retry 📚';
  }
  const encouragements = [
    'Review the questions you missed — analyzing errors is where 80% of score gains happen.',
    'Daily consistency beats cramming. One focused practice test every day compounds into top ranks.',
    'Focus on high-weightage topics and speed drills before your next attempt.',
    'Every error caught today is a mark secured in the real exam.',
    'Smart students treat test solutions as the best textbook. Revise explanations carefully.'
  ];
  const encouragement = document.querySelector('#resultEncouragement');
  if (correct < questions.length) {
    encouragement.hidden = false;
    document.querySelector('#resultEncouragementText').textContent = encouragements[Math.floor(Math.random() * encouragements.length)];
  } else {
    encouragement.hidden = false;
    document.querySelector('#resultEncouragementText').textContent = 'Perfect score! Keep this top-tier consistency for your final competitive exam.';
  }
  const totalParticipants = 6110;
  const percentile = Math.max(4, Math.min(98, Math.round(28 + ((correct / questions.length) * 70))));
  const peopleAbove = Math.max(0, Math.round(totalParticipants * (1 - percentile / 100)));
  document.querySelector('#resultAbove').textContent = `${percentile}%`;
  document.querySelector('#resultSubmitted').textContent = totalParticipants.toLocaleString('en-IN');
  document.querySelector('#resultRank').textContent = `#${(peopleAbove + 1).toLocaleString('en-IN')}`;
  const leaderboard = [
    ['Aarav Mehta', '10/10', '99%', 'AM'],
    ['Ishita Rao', '9/10', '94%', 'IR'],
    ['You', `${correct}/${questions.length}`, `${percentile}%`, 'YO'],
    ['Rohan Singh', '7/10', '78%', 'RS']
  ];
  leaderboardRows.innerHTML = leaderboard.map(([name, score, accuracy, initials]) => `<div class="leaderboard-row${name === 'You' ? ' you' : ''}"><span class="leader-avatar">${initials}</span><strong>${name}</strong><span>${score}</span><span>${accuracy}</span></div>`).join('');
  launchConfetti();
}

function launchConfetti() {
  const colors = ['#f27e63', '#f7cc55', '#175e4b', '#7dbb91', '#e7b07d'];
  const confetti = document.createElement('div');
  confetti.className = 'confetti';
  confetti.innerHTML = Array.from({ length: 46 }, (_, index) => `<i style="--x:${Math.random() * 100}vw;--delay:${Math.random() * .18}s;--duration:${1.4 + Math.random() * 1.2}s;--color:${colors[index % colors.length]};--rotate:${Math.random() * 360}deg"></i>`).join('');
  document.body.appendChild(confetti);
  window.setTimeout(() => confetti.remove(), 3000);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.start-test');
  if (!button) return;
  activeQuestionSubject = null;
  activeMockTestId = button.dataset.mockTest || null;
  openTest();
});

// --- INTERACTIVE TESTIMONIALS CAROUSEL ---
const testimonialsData = [
  {
    quote: "Result Darpan made my preparation feel organised for the first time. The detailed solutions helped me understand exactly where I was losing marks.",
    author: "Namrata Sharma",
    role: "Selected · SBI Clerk 2025",
    avatar: "NS"
  },
  {
    quote: "Practicing the full-length SSC CGL Tier-I mocks gave me exact exam hall pacing. My calculation speed and accuracy surged from 68% to 89%!",
    author: "Rohit Verma",
    role: "Selected · SSC CGL (Income Tax Inspector)",
    avatar: "RV"
  },
  {
    quote: "The RRB NTPC CBT mock tests were pinpoint accurate to the actual railway exam patterns. The sectional timing drills made all the difference.",
    author: "Pooja Deshmukh",
    role: "Selected · RRB NTPC Station Master",
    avatar: "PD"
  },
  {
    quote: "As a JEE Main aspirant, the chemistry and mathematics mocks helped me master high-weightage topics and speed problem solving.",
    author: "Aditya Kumar",
    role: "JEE Main 99.2 Percentile · NIT Trichy",
    avatar: "AK"
  },
  {
    quote: "The CTET Paper 1 and 2 practice tests cover the exact pedagogy questions. I cleared both papers in my very first attempt!",
    author: "Meenakshi Sundaram",
    role: "Qualified · CTET December & Primary Teacher",
    avatar: "MS"
  }
];

let currentTestimonialIndex = 0;
function showTestimonial(idx) {
  const quoteEl = document.getElementById('testimonialQuote');
  const avatarEl = document.getElementById('testimonialAvatar');
  const authorEl = document.getElementById('testimonialAuthor');
  const roleEl = document.getElementById('testimonialRole');
  if (!quoteEl || !authorEl) return;
  const item = testimonialsData[idx];
  quoteEl.textContent = item.quote;
  authorEl.textContent = item.author;
  if (roleEl) roleEl.textContent = item.role;
  if (avatarEl) avatarEl.textContent = item.avatar;
}

document.getElementById('prevTestimonial')?.addEventListener('click', () => {
  currentTestimonialIndex = (currentTestimonialIndex - 1 + testimonialsData.length) % testimonialsData.length;
  showTestimonial(currentTestimonialIndex);
});
document.getElementById('nextTestimonial')?.addEventListener('click', () => {
  currentTestimonialIndex = (currentTestimonialIndex + 1) % testimonialsData.length;
  showTestimonial(currentTestimonialIndex);
});

// Edit profile & goals listeners
document.getElementById('editProfile')?.addEventListener('click', () => {
  openAuth();
});
document.getElementById('addGoal')?.addEventListener('click', () => {
  openAuth();
});
document.querySelector('.close-test')?.addEventListener('click', closeTest);
testModal?.addEventListener('click', (event) => { if (event.target === testModal) closeTest(); });
document.querySelector('#answerOptions')?.addEventListener('click', (event) => {
  const option = event.target.closest('.answer-option');
  if (!option) return;
  answers[currentQuestion] = Number(option.dataset.answer);
  renderQuestion();
});
document.querySelector('#previousQuestion')?.addEventListener('click', () => { if (currentQuestion > 0) { currentQuestion -= 1; renderQuestion(); } });
document.querySelector('#nextQuestion')?.addEventListener('click', () => { if (currentQuestion === questions.length - 1) finishTest(); else { currentQuestion += 1; renderQuestion(); } });
document.querySelector('#questionMap')?.addEventListener('click', (event) => { const item = event.target.closest('.map-item'); if (item) { currentQuestion = Number(item.dataset.question); renderQuestion(); } });
document.querySelector('#retryTest')?.addEventListener('click', openTest);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && testModal?.classList.contains('visible')) closeTest(); });

const authModal = document.querySelector('#authModal');
const authForm = document.querySelector('#authForm');
const authTitle = document.querySelector('#authTitle');
const authSubmit = document.querySelector('.auth-submit');
const authClose = document.querySelector('#authClose');
const authError = document.createElement('p');
authError.className = 'auth-error';
authError.setAttribute('role', 'alert');
authError.hidden = true;
if (authForm && authSubmit) {
  authForm.insertBefore(authError, authSubmit);
}

function closeAuth() {
  if (authModal) {
    authModal.classList.remove('visible');
    authModal.setAttribute('aria-hidden', 'true');
  }
}

function openAuth() {
  const nameInput = document.querySelector('#signupName');
  const examInput = document.querySelector('#signupExam');
  const locInput = document.querySelector('#signupLocation');
  const contactInput = document.querySelector('#signupContact');
  const typeSelect = document.querySelector('#signupLearnerType');
  const restoreInput = document.querySelector('#restoreIdentifier');
  const restoreMsg = document.querySelector('#restoreMsg');

  if (nameInput) nameInput.value = window.localStorage.getItem('preply-profile-name') || 'Aarav Sharma';
  if (examInput) examInput.value = window.localStorage.getItem('preply-profile-exam') || 'SSC CGL';
  if (locInput) locInput.value = window.localStorage.getItem('preply-profile-location') || 'India';
  if (contactInput) contactInput.value = window.localStorage.getItem('preply-profile-contact') || '';
  if (typeSelect) typeSelect.value = window.localStorage.getItem('preply-learner-type') || 'boy';
  if (restoreInput) restoreInput.value = '';
  if (restoreMsg) { restoreMsg.style.display = 'none'; restoreMsg.textContent = ''; }

  if (authError) authError.hidden = true;
  if (authModal) {
    authModal.classList.add('visible');
    authModal.setAttribute('aria-hidden', 'false');
  }
}

authClose?.addEventListener('click', closeAuth);
authModal?.addEventListener('click', (event) => {
  if (event.target === authModal) closeAuth();
});

document.querySelector('#btnRestoreProgress')?.addEventListener('click', async () => {
  const input = document.querySelector('#restoreIdentifier');
  const msg = document.querySelector('#restoreMsg');
  const contact = input?.value.trim() || '';
  if (!contact) {
    if (msg) {
      msg.textContent = 'Please enter your phone number or email.';
      msg.style.color = '#c23838';
      msg.style.display = 'block';
    }
    input?.focus();
    return;
  }

  if (msg) {
    msg.textContent = 'Searching your progress...';
    msg.style.color = '#175e4b';
    msg.style.display = 'block';
  }

  try {
    const res = await fetch('/api/auth/restore-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Account not found.');

    window.localStorage.setItem('preply-session-token', data.token);
    window.localStorage.setItem('preply-guest-id', data.guestId);
    window.localStorage.setItem('preply-account-email', data.user.email);
    window.localStorage.setItem('preply-profile-contact', contact);
    window.localStorage.setItem('preply-is-guest', 'true');
    window.localStorage.setItem('preply-authenticated', 'true');

    saveProfileDetails(data.user.name, data.user.exam, data.user.location, window.localStorage.getItem('preply-learner-type') || 'boy');
    syncAuthButton();
    loadHomeProfile();

    if (msg) {
      msg.textContent = `✓ Welcome back, ${data.user.name}! Your progress has been restored.`;
      msg.style.color = '#15803d';
      msg.style.display = 'block';
    }

    setTimeout(() => {
      closeAuth();
    }, 1200);
  } catch (err) {
    if (msg) {
      msg.textContent = err.message;
      msg.style.color = '#c23838';
      msg.style.display = 'block';
    }
  }
});

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#signupName')?.value.trim() || 'Aarav Sharma';
  const exam = document.querySelector('#signupExam')?.value.trim() || 'SSC CGL';
  const location = document.querySelector('#signupLocation')?.value.trim() || 'India';
  const contact = document.querySelector('#signupContact')?.value.trim() || '';
  const type = document.querySelector('#signupLearnerType')?.value || 'boy';
  const schoolClass = window.localStorage.getItem('preply-school-class') || '';

  try {
    let token = window.localStorage.getItem('preply-session-token');
    let userRecord = null;
    if (token) {
      try {
        const patchRes = await fetch('/api/profile/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ name, exam, location, contact })
        });
        if (patchRes.ok) {
          const patchData = await patchRes.json();
          userRecord = patchData.user;
        } else {
          token = null;
        }
      } catch (e) {
        token = null;
      }
    }

    if (!token) {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exam, location, schoolClass, contact })
      });
      if (!response.ok) throw new Error('Could not save guest profile.');
      const data = await response.json();
      token = data.token;
      userRecord = data.user;
      window.localStorage.setItem('preply-session-token', data.token);
      window.localStorage.setItem('preply-account-email', data.user.email);
      window.localStorage.setItem('preply-guest-id', data.guestId);
      if (typeof showGuestId === 'function') showGuestId(data.guestId);
    }

    if (contact) window.localStorage.setItem('preply-profile-contact', contact);
    const finalName = userRecord?.name || name;
    const finalExam = userRecord?.exam || exam;
    const finalLocation = userRecord?.location || location;

    saveProfileDetails(finalName, finalExam, finalLocation, type);
    window.localStorage.setItem('preply-is-guest', 'true');
    window.localStorage.setItem('preply-authenticated', 'true');
    syncAuthButton();
    loadHomeProfile();
    closeAuth();
  } catch (error) {
    if (authError) {
      authError.textContent = error.message;
      authError.hidden = false;
    }
  }
});

async function apiRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = window.localStorage.getItem('preply-session-token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, { ...options, headers });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}

function syncAuthButton() {
  const accountButton = document.querySelector('.nav-cta');
  if (!accountButton) return;
  const guestName = window.localStorage.getItem('preply-profile-name') || 'Aarav Sharma';
  const shortName = guestName.split(' ')[0] || 'Guest';
  accountButton.classList.remove('logout-button');
  accountButton.innerHTML = '<span>👤</span> ' + shortName;
  accountButton.setAttribute('aria-label', 'Guest profile: ' + guestName);
  window.dispatchEvent(new Event('profile-session-changed'));
}

async function ensureGuestSession() {
  const existingToken = window.localStorage.getItem('preply-session-token');
  const existingGuestId = window.localStorage.getItem('preply-guest-id');
  if (existingToken && existingGuestId) {
    window.localStorage.setItem('preply-is-guest', 'true');
    window.localStorage.setItem('preply-authenticated', 'true');
    syncAuthButton();
    return existingToken;
  }

  const savedName = window.localStorage.getItem('preply-profile-name') || 'Aarav Sharma';
  const savedExam = window.localStorage.getItem('preply-profile-exam') || 'SSC CGL';
  const savedLocation = window.localStorage.getItem('preply-profile-location') || 'India';
  const schoolClass = window.localStorage.getItem('preply-school-class') || '';

  try {
    const response = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: savedName, exam: savedExam, location: savedLocation, schoolClass })
    });
    if (response.ok) {
      const data = await response.json();
      window.localStorage.setItem('preply-session-token', data.token);
      window.localStorage.setItem('preply-guest-id', data.guestId);
      window.localStorage.setItem('preply-account-email', data.user.email);
      window.localStorage.setItem('preply-is-guest', 'true');
      window.localStorage.setItem('preply-authenticated', 'true');
      if (typeof showGuestId === 'function') showGuestId(data.guestId);
      syncAuthButton();
      return data.token;
    }
  } catch (err) {
    console.warn('Auto guest session init:', err.message);
  }
}
ensureGuestSession();
syncAuthButton();
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && authModal?.classList.contains('visible')) closeAuth(); });

const motivationQuotes = [
  '“Consistency is a quiet superpower. Show up for one more question.”',
  '“You do not need a perfect day. You need one honest practice session.”',
  '“The score follows the habit. Protect your habit today.”',
  '“One solved question is one less question standing between you and your goal.”',
  '“Your future result is built in ordinary minutes like this one.”',
  '“Accuracy beats speed initially; speed is the natural byproduct of repeated accuracy.”',
  '“Every error analyzed in your mock test is a mark earned in the final examination.”',
  '“The syllabus feels overwhelming only until you conquer it concept by concept.”',
  '“Disciplined question selection and negative-mark avoidance separate qualifiers from toppers.”',
  '“Today’s focused revision turns tomorrow’s difficult question into an automatic reflex.”'
];
const researchUpdates = [
  ['SSC CGL', 'Tier-I analysis shows Arithmetic & DI contribute over 60% of Quant weightage. Focus on rapid percentage conversions and ratio shortcuts.'],
  ['REASONING', 'Timed syllogism and series puzzles yield the fastest score leap. Practice 20 questions in under 12 minutes to build speed.'],
  ['CURRENT AFFAIRS', 'Revision cycles are most effective in 24-hour, 3-day, and 7-day intervals. Short daily reviews outperform weekend cramming.'],
  ['QUANTITATIVE APTITUDE', 'Keep a dedicated formula error log. Re-attempt every question you missed yesterday before beginning a new chapter.'],
  ['GENERAL STUDIES', 'Static GK questions in Polity, Modern History, and Geography follow cyclical trends. Review previous 5-year question papers.'],
  ['EXAM STRATEGY', 'Target 90%+ accuracy on your strongest topics first before taking calculated risks on tricky questions.']
];

document.querySelector('#newQuote')?.addEventListener('click', () => {
  const quote = document.querySelector('#motivationQuote');
  const current = quote.textContent;
  let next = current;
  while (next === current) next = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
  quote.classList.remove('quote-pop');
  void quote.offsetWidth;
  quote.textContent = next;
  quote.classList.add('quote-pop');
});

document.querySelector('#researchRefresh')?.addEventListener('click', (event) => {
  const update = researchUpdates[Math.floor(Math.random() * researchUpdates.length)];
  document.querySelector('#researchTag').textContent = update[0];
  document.querySelector('#researchText').textContent = update[1];
  document.querySelector('#researchTime').textContent = 'Updated just now · Result Darpan research desk';
  event.currentTarget.classList.add('spin-once');
  window.setTimeout(() => event.currentTarget.classList.remove('spin-once'), 400);
});

function setLearnerType(type) {
  const learnerArt = document.querySelector('#learnerArt');
  const learnerType = document.querySelector('#learnerType');
  learnerArt?.classList.remove('boy-art', 'girl-art', 'other-art');
  learnerArt?.classList.add(`${type}-art`);
  if (learnerType) learnerType.value = type;
  window.localStorage.setItem('preply-learner-type', type);
}

function saveProfileDetails(name, exam, location, type = window.localStorage.getItem('preply-learner-type') || 'boy') {
  window.localStorage.setItem('preply-profile-name', name.trim());
  window.localStorage.setItem('preply-profile-exam', exam.trim());
  window.localStorage.setItem('preply-profile-location', location.trim());
  setLearnerType(type);
  document.querySelector('#profileName').textContent = name.trim();
  const profileLabel = document.querySelector('#profileExamLabel') || document.querySelector('#profileName')?.nextElementSibling;
  if (profileLabel) { profileLabel.id = 'profileExamLabel'; profileLabel.textContent = `${exam.trim()} aspirant · ${location.trim()}`; }
  document.querySelector('#researchTag').textContent = exam.trim().toUpperCase();
  document.querySelector('#researchText').textContent = `Your ${exam.trim()} feed is ready. Review the latest practice sets and updates curated for learners in ${location.trim()}.`;
}

function showGuestId(guestId) {
  if (!guestId) return;
  let guestLabel = document.querySelector('#guestUserId');
  if (!guestLabel) {
    guestLabel = document.createElement('p');
    guestLabel.id = 'guestUserId';
    guestLabel.className = 'muted';
    document.querySelector('#profileName')?.parentElement.appendChild(guestLabel);
  }
  guestLabel.textContent = `Guest ID: ${guestId}`;
}
document.querySelector('#editProfile')?.addEventListener('click', () => {
  document.querySelector('#settingsName').value = document.querySelector('#profileName').textContent;
  document.querySelector('#settingsExam').value = window.localStorage.getItem('preply-profile-exam') || 'SSC CGL';
  document.querySelector('#settingsLocation').value = window.localStorage.getItem('preply-profile-location') || 'India';
  document.querySelector('#settingsLearnerType').value = window.localStorage.getItem('preply-learner-type') || 'boy';
  document.querySelector('#settingsModal').classList.add('visible');
  document.querySelector('#settingsModal').setAttribute('aria-hidden', 'false');
});
const isAuthenticated = Boolean(window.localStorage.getItem('preply-session-token'));
if (!isAuthenticated && document.querySelector('#profileName')) document.querySelector('#profileName').textContent = 'Your profile';
document.querySelector('#settingsClose')?.addEventListener('click', () => { document.querySelector('#settingsModal').classList.remove('visible'); document.querySelector('#settingsModal').setAttribute('aria-hidden', 'true'); });
document.querySelector('#settingsForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#settingsName').value.trim();
  const exam = document.querySelector('#settingsExam').value.trim();
  const location = document.querySelector('#settingsLocation').value.trim();
  try {
    await apiRequest('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ name, exam, location }) });
    saveProfileDetails(name, exam, location, document.querySelector('#settingsLearnerType').value);
    loadHomeProfile();
    document.querySelector('#settingsModal').classList.remove('visible');
    document.querySelector('#settingsModal').setAttribute('aria-hidden', 'true');
  } catch (error) {
    window.alert(error.message);
  }
});

const themeToggles = document.querySelectorAll('.theme-toggle');
function setTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-theme', isDark);
  themeToggles.forEach((toggle) => {
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  });
  window.localStorage.setItem('preply-theme', theme);
}
setTheme(window.localStorage.getItem('preply-theme') || 'light');
themeToggles.forEach((toggle) => toggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark')));

setLearnerType(window.localStorage.getItem('preply-learner-type') || 'boy');
document.querySelector('#learnerType')?.addEventListener('change', (event) => setLearnerType(event.target.value));

document.title = 'Result Darpan | Practice smarter. Score higher.';
document.querySelectorAll('.brand').forEach((brand) => {
  brand.setAttribute('aria-label', 'Result Darpan home');
  brand.innerHTML = '<span class="brand-mark">R</span><span>Result <span>Darpan</span></span>';
});
const brandTextWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const brandTextNodes = [];
while (brandTextWalker.nextNode()) brandTextNodes.push(brandTextWalker.currentNode);
brandTextNodes.forEach((node) => {
  node.nodeValue = node.nodeValue.replace(/PrepLy|Preply|PREPLY/g, 'Result Darpan');
});

const chatForm = document.querySelector('#chatForm');
const chatInput = document.querySelector('#chatInput');
const chatMessages = document.querySelector('#chatMessages');
const chatLockNotice = document.querySelector('#chatLockNotice');
const chatLockKey = 'preply-chat-locked-until';
const abusiveWords = ['abuseword', 'idiot', 'stupid', 'shut up', ' hate ', 'kill yourself'];

function getChatLock() {
  const lockedUntil = Number(window.localStorage.getItem(chatLockKey) || 0);
  return lockedUntil > Date.now() ? lockedUntil : 0;
}

function applyChatLock(lockedUntil) {
  const locked = lockedUntil > Date.now();
  chatInput.disabled = locked;
  chatForm.querySelector('button').disabled = locked;
  chatInput.placeholder = locked ? 'Chat is paused for 7 days' : 'Ask a study question...';
  chatLockNotice.hidden = !locked;
  if (locked) {
    const days = Math.ceil((lockedUntil - Date.now()) / 86400000);
    chatLockNotice.textContent = `Chat access is paused for ${days} day${days === 1 ? '' : 's'} because our study space rules were broken. You can return when the pause ends.`;
  }
}

applyChatLock(getChatLock());

function showChatTyping() {
  removeChatTyping();
  if (!chatMessages) return;
  const indicator = document.createElement('div');
  indicator.id = 'chatTypingIndicator';
  indicator.className = 'chat-typing';
  indicator.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span> Result Darpan AI Mentor is typing...';
  chatMessages.appendChild(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeChatTyping() {
  document.querySelector('#chatTypingIndicator')?.remove();
}

function appendLiveChatMessage(message) {
  const existingMessage = message.id && chatMessages.querySelector(`[data-chat-message-id="${message.id}"]`);
  if (existingMessage) {
    if (message.isOwnMessage) existingMessage.querySelector('.chat-helpful')?.remove();
    return;
  }
  const messageElement = document.createElement('div');
  const isStudent = message.author === 'student';
  const isAi = message.topperName?.includes('AI') || message.author === 'ai' || (!isStudent && message.topperName === 'Result Darpan AI Mentor ✦');
  messageElement.className = `chat-message ${isStudent ? 'student' : 'topper'}`;
  if (message.id) messageElement.dataset.chatMessageId = message.id;
  const authorName = message.topperName || (isStudent ? 'You' : 'Result Darpan AI Mentor ✦');
  const initials = isAi ? '✦' : (isStudent ? 'AS' : (authorName.split(/[\s·]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'TR'));
  const avatarClass = isAi ? 'chat-avatar ai-avatar' : (isStudent ? 'chat-avatar you-avatar' : 'chat-avatar');
  const authorBadge = isAi ? '<span class="ai-badge">AI 24/7</span>' : '';

  messageElement.innerHTML = isStudent
    ? '<div><b>You</b><p></p></div><span class="chat-avatar you-avatar">AS</span>'
    : `<span class="${avatarClass}" style="${isAi ? '' : 'background:#135335; color:#fff;'}">${initials}</span><div><b style="color:#135335;">${authorName}${authorBadge}</b><p></p></div>`;
  messageElement.querySelector('p').textContent = message.text;
  if (isStudent && message.id && !message.isOwnMessage) {
    const helpfulButton = document.createElement('button');
    helpfulButton.type = 'button';
    helpfulButton.className = `chat-helpful${message.hasVoted ? ' voted' : ''}`;
    helpfulButton.dataset.messageId = message.id;
    helpfulButton.textContent = `Helpful · ${message.helpfulCount || 0}`;
    helpfulButton.disabled = Boolean(message.hasVoted);
    messageElement.querySelector('div').appendChild(helpfulButton);
  }
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatMessages) {
  const token = window.localStorage.getItem('preply-session-token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  fetch('/api/chat/messages', { headers })
    .then((response) => response.json())
    .then((payload) => {
      chatMessages.replaceChildren();
      (payload.messages || []).forEach(appendLiveChatMessage);
    })
    .catch((error) => console.warn('Chat history could not be loaded:', error.message));
  const chatStream = new EventSource('/api/chat/stream');
  chatStream.addEventListener('message', (event) => {
    removeChatTyping();
    appendLiveChatMessage(JSON.parse(event.data));
  });
  chatStream.addEventListener('helpful-updated', (event) => {
    const update = JSON.parse(event.data);
    const button = chatMessages.querySelector(`[data-message-id="${update.messageId}"]`);
    if (button) button.textContent = `Helpful · ${update.helpfulCount}`;
    window.dispatchEvent(new Event('gamification-refresh'));
  });
  chatStream.addEventListener('profile-updated', (event) => {
    const update = JSON.parse(event.data);
    if (update.email === window.localStorage.getItem('preply-account-email')) updateProfileMetrics(update.stats);
  });

  async function submitLiveChatMessage(customText) {
    const message = (typeof customText === 'string' ? customText : (chatInput ? chatInput.value : '')).trim();
    if (!message || getChatLock()) return;
    const normalized = ` ${message.toLowerCase()} `;

    if (abusiveWords.some((word) => normalized.includes(word))) {
      const lockedUntil = Date.now() + (7 * 86400000);
      window.localStorage.setItem(chatLockKey, String(lockedUntil));
      applyChatLock(lockedUntil);
      if (chatLockNotice) {
        chatLockNotice.hidden = false;
        chatLockNotice.textContent = 'Chat access is paused for 7 days because abusive language was detected. Please keep the study room respectful.';
      }
      return;
    }

    showChatTyping();
    try {
      const response = await apiRequest('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ text: message, author: 'student' })
      });

      appendLiveChatMessage(response.message);
      if (response.aiReply) {
        appendLiveChatMessage(response.aiReply);
      }
      if (chatInput) chatInput.value = '';
    } catch (error) {
      if (chatLockNotice) {
        chatLockNotice.hidden = false;
        chatLockNotice.textContent = error.message;
      }
    } finally {
      removeChatTyping();
    }
  }

  // Prompt chips autofill and submit
  document.querySelectorAll('.chat-chip').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const prompt = button.dataset.prompt;
      if (prompt) {
        if (chatInput) chatInput.value = prompt;
        submitLiveChatMessage(prompt);
      }
    });
  });

  chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitLiveChatMessage();
  });
}

// --- LIVE NOTIFICATIONS & BLOGS ON HOME PAGE ---
function getExamLogoSrc(badgeOrExam) {
  const text = (badgeOrExam || '').toLowerCase();
  if (text.includes('ssc')) return 'images/logos/ssc.png';
  if (text.includes('sbi') || text.includes('bank') || text.includes('ibps') || text.includes('rbi')) return 'images/logos/sbi.svg';
  if (text.includes('rail') || text.includes('rrb') || text.includes('ntpc') || text.includes('alp') || text.includes('group d')) return 'images/logos/railways.png';
  if (text.includes('nda') || text.includes('defence') || text.includes('cds') || text.includes('afcat')) return 'images/logos/nda.svg';
  if (text.includes('upsc') || text.includes('civil') || text.includes('bpsc') || text.includes('uppsc') || text.includes('pcs')) return 'images/logos/upsc.png';
  if (text.includes('ctet') || text.includes('cbse') || text.includes('teach') || text.includes('ugc') || text.includes('net')) return 'images/logos/ctet.png';
  if (text.includes('aiims') || text.includes('norcet') || text.includes('medic') || text.includes('neet')) return 'images/logos/aiims.png';
  if (text.includes('jee') || text.includes('college') || text.includes('iit') || text.includes('cuet') || text.includes('gate') || text.includes('cat') || text.includes('clat')) return 'images/logos/college.svg';
  return 'images/logos/college.svg';
}

async function loadLiveNotifications() {
  const grid = document.getElementById('upcomingExamGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${apiOrigin}/api/notifications`);
    if (!res.ok) return;
    const data = await res.json();
    const notifs = (data.notifications || []).filter((n) => n.isUpcoming !== false);
    if (!notifs.length) return;

    grid.innerHTML = '';
    notifs.forEach((n, idx) => {
      const card = document.createElement('article');
      card.className = `exam-card ${idx === 0 ? 'featured' : ''}`;
      const badgeColor = n.badgeColor || 'green';
      const logoSrc = getExamLogoSrc(n.badge || n.exam || n.title);
      const logoHtml = logoSrc
        ? `<img class="exam-badge-logo" src="${logoSrc}" alt="${escapeHtmlText(n.badge || 'Exam')} Logo" width="24" height="24" style="width:24px; height:24px; max-width:24px; max-height:24px; object-fit:contain; border-radius:4px; background:#ffffff; display:inline-block; flex-shrink:0;">`
        : '';
      card.innerHTML = `
        <div class="card-top">
          <div class="exam-card-badge-wrap">
            ${logoHtml}
            <span class="exam-badge ${badgeColor}">${escapeHtmlText(n.badge || 'EXAM')}</span>
          </div>
          <span class="days-pill">${escapeHtmlText(n.daysText || 'Upcoming')}</span>
        </div>
        <h3>${escapeHtmlText(n.title)}</h3>
        <p>${escapeHtmlText(n.exam)}${n.vacancies ? ' · ' + escapeHtmlText(n.vacancies) : ''}${n.eligibility ? ' · ' + escapeHtmlText(n.eligibility) : ''}</p>
        <div class="card-footer">
          <span>${n.applyDeadline ? 'Deadline: ' + escapeHtmlText(n.applyDeadline) : 'Official notice'}</span>
          <a href="${n.officialLink || '#popular'}" ${n.officialLink ? 'target="_blank" rel="noopener"' : ''}>${n.officialLink ? 'Official Link ↗' : 'Start prep →'}</a>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    console.warn('Could not load live notifications:', e.message);
  }
}

const fallbackHomeBlogs = [
  {
    id: "blog-1",
    slug: "ssc-cgl-60-day-roadmap",
    title: "SSC CGL 2026: 60-Day High-Yield Revision Roadmap & Subject Checklist",
    category: "Preparation Strategy",
    readTime: "7 min read",
    author: "Warish Raj",
    summary: "A battle-tested 8-week structured roadmap balancing Quant calculation drills, English comprehension rules, Reasoning puzzle mastery, and General Studies topic weightage.",
    tags: ["SSCCGL", "Roadmap", "Quant", "Reasoning"],
    createdAt: "2026-10-01T10:00:00.000Z"
  },
  {
    id: "blog-2",
    slug: "speed-math-shortcuts",
    title: "Speed Math & Calculation Shortcuts: Boost Score in Quantitative Aptitude",
    category: "Subject Guide",
    readTime: "5 min read",
    author: "Warish Raj",
    summary: "Essential mental math techniques, Vedic multiplication, percentage-fraction conversion tables, and digital sum methods to slash your solving time by 40%.",
    tags: ["SpeedMath", "Aptitude", "Shortcuts", "Banking"],
    createdAt: "2026-10-01T12:00:00.000Z"
  }
];

async function loadLiveBlogs() {
  const grid = document.getElementById('homeBlogsGrid');
  if (!grid) return;
  const moreBtn = document.getElementById('btnReadAllBlogs');

  function renderArticles(list) {
    const safeList = (Array.isArray(list) && list.length) ? list : fallbackHomeBlogs;
    const blogs = safeList.slice(0, 2);
    grid.innerHTML = '';
    blogs.forEach((b) => {
      const card = document.createElement('article');
      card.className = 'cms-card';
      const tagsHtml = Array.isArray(b.tags) && b.tags.length
        ? `<div class="article-tag-list" style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;">${b.tags.map(t => `<span class="cms-tag-pill" style="font-size:10.5px; font-weight:600; padding:2px 8px; border-radius:4px; background:#eef7f2; color:#175e4b;">#${escapeHtmlText(t)}</span>`).join('')}</div>`
        : '';

      const articleUrl = `blogs?article=${encodeURIComponent(b.slug || b.id)}`;

      card.innerHTML = `
        <div>
          <div class="cms-card-top" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge" style="background:#eef7f2; color:#175e4b; font-weight:700;">${escapeHtmlText(b.category || 'Article')}</span>
            <span class="muted cms-card-readtime" style="font-size:12px; font-weight:600;">⏱️ ${escapeHtmlText(b.readTime || '5 min read')}</span>
          </div>
          <h3 class="cms-card-title">${escapeHtmlText(b.title)}</h3>
          <p class="cms-card-meta">By <strong>${escapeHtmlText(b.author || 'Warish Raj')}</strong></p>
          <p class="cms-card-summary">${escapeHtmlText(b.summary || '')}</p>
          ${tagsHtml}
        </div>
        <div class="cms-card-footer" style="margin-top:14px; padding-top:10px; border-top:1px solid #edf2ef; display:flex; justify-content:space-between; align-items:center;">
          <span class="cms-card-date">${new Date(b.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <a class="outline-btn btn-read-article" href="${articleUrl}" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">Read Full Guide <span>↗</span></a>
        </div>
      `;
      grid.appendChild(card);
    });

    if (moreBtn) {
      moreBtn.style.display = 'inline-flex';
      moreBtn.href = 'blogs';
    }
  }

  // 1. Instant render from local cache
  let cached = null;
  try {
    const raw = localStorage.getItem('rd-cached-blogs');
    if (raw) cached = JSON.parse(raw);
  } catch (_) {}
  if (Array.isArray(cached) && cached.length) {
    renderArticles(cached);
  }

  // 2. Fetch fresh from API
  try {
    const res = await fetch(`${apiOrigin}/api/blogs`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.blogs) && data.blogs.length) {
        try {
          localStorage.setItem('rd-cached-blogs', JSON.stringify(data.blogs));
        } catch (_) {}
        renderArticles(data.blogs);
        return;
      }
    }
  } catch (e) {
    console.warn('Could not load live blogs from server, using fallback:', e.message);
  }

  // 3. Fallback if not rendered
  if (!grid.children.length || grid.querySelector('.muted')) {
    renderArticles(fallbackHomeBlogs);
  }
}

function escapeHtmlText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

document.getElementById('btnCloseArticleReader')?.addEventListener('click', () => {
  const reader = document.getElementById('articleReaderModal');
  if (reader) reader.style.display = 'none';
});

loadLiveNotifications();
loadLiveBlogs();
