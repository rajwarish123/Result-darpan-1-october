// Result Darpan - School Classes Test Series Controller (Classes 9 to 12)
// Built with automatic offline/static fallback so tests NEVER fail or show 403 Forbidden errors.

(function () {
  const urlParams = new URLSearchParams(window.location.search);
  let classNumber = urlParams.get('class') ||
    window.location.pathname.match(/(?:classes\/|^)(\d+)/)?.[1] ||
    window.localStorage.getItem('preply-school-class') ||
    '10';

  if (!['9', '10', '11', '12'].includes(String(classNumber))) {
    classNumber = '10';
  }

  const classSeriesList = document.querySelector('#classSeriesList');
  const classSeriesStatus = document.querySelector('#classSeriesStatus');
  const classTest = document.querySelector('#classTest');
  const classTestForm = document.querySelector('#classTestForm');
  const classQuestionList = document.querySelector('#classQuestionList');
  const classTestResult = document.querySelector('#classTestResult');
  const streamPickerTabs = document.querySelector('#streamPickerTabs');

  let activeSeries = null;
  let startedAt = 0;
  let profile = null;
  let currentSeriesData = [];
  let activeStream = 'all';

  const apiOrigin = (() => {
    if (typeof window === 'undefined') return '';
    const port = window.location.port;
    const host = window.location.hostname;
    if (window.location.protocol === 'file:' || (host === '127.0.0.1' && port !== '3000') || (host === 'localhost' && port !== '3000')) {
      return 'http://localhost:3000';
    }
    return '';
  })();

  const streamMap = {
    'Mathematics': ['science', 'commerce'],
    'Physics': ['science'],
    'Chemistry': ['science'],
    'Biology': ['science'],
    'Computer Science': ['science'],
    'Accountancy': ['commerce'],
    'Business Studies': ['commerce'],
    'Economics': ['commerce', 'humanities'],
    'History': ['humanities'],
    'Political Science': ['humanities'],
    'Geography': ['humanities'],
    'Sociology': ['humanities'],
    'Psychology': ['humanities'],
    'English': ['core', 'science', 'commerce', 'humanities'],
    'Hindi': ['core', 'humanities'],
    'Science': ['science'],
    'Social Science': ['humanities']
  };

  const streamBadgeLabels = {
    'science': '🔬 Science',
    'commerce': '📊 Commerce',
    'humanities': '🏛️ Arts & Humanities',
    'core': '📖 Core / Languages'
  };

  const fallbackCurricula = {
    9: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'English', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Social Science', questionsPerSet: 10, totalSets: 30 }
    ],
    10: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'English', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Social Science', questionsPerSet: 10, totalSets: 30 }
    ],
    11: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Physics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Chemistry', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Biology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Computer Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Accountancy', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Business Studies', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Economics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'History', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Political Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Geography', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Sociology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Psychology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'English', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Hindi', questionsPerSet: 10, totalSets: 30 }
    ],
    12: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Physics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Chemistry', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Biology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Computer Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Accountancy', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Business Studies', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Economics', questionsPerSet: 10, totalSets: 30 },
      { subject: 'History', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Political Science', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Geography', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Sociology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Psychology', questionsPerSet: 10, totalSets: 30 },
      { subject: 'English', questionsPerSet: 10, totalSets: 30 },
      { subject: 'Hindi', questionsPerSet: 10, totalSets: 30 }
    ]
  };

  const questionPools = {
    Mathematics: [
      { text: 'What is the degree of a non-zero constant polynomial?', options: ['0', '1', '2', 'Undefined'], answer: 0, topic: 'Polynomials' },
      { text: 'If (x - 2) is a factor of x² + kx + 4, what is the value of k?', options: ['-4', '-2', '2', '4'], answer: 0, topic: 'Algebra' },
      { text: 'The discriminant of the quadratic equation 2x² - 4x + 3 = 0 is:', options: ['-8', '8', '-16', '16'], answer: 0, topic: 'Quadratic Equations' },
      { text: 'What is the sum of the first n natural numbers?', options: ['n(n+1)/2', 'n(n-1)/2', 'n²/2', '(n+1)/2'], answer: 0, topic: 'Arithmetic Progression' },
      { text: 'The value of sin 30° + cos 60° is equal to:', options: ['1', '0.5', '√3', '2'], answer: 0, topic: 'Trigonometry' },
      { text: 'The distance of the point P(-6, 8) from the origin is:', options: ['10', '8', '6', '14'], answer: 0, topic: 'Coordinate Geometry' },
      { text: 'The ratio of the area of a circle to its radius squared is:', options: ['π', '2π', 'π/2', '4π'], answer: 0, topic: 'Mensuration' },
      { text: 'If the mean of 5 observations is 15, their sum is:', options: ['75', '50', '60', '90'], answer: 0, topic: 'Statistics' },
      { text: 'The probability of getting a prime number on rolling a fair die once is:', options: ['1/2', '1/3', '1/6', '2/3'], answer: 0, topic: 'Probability' },
      { text: 'What is the nature of the roots of 3x² - 2√6x + 2 = 0?', options: ['Real and equal', 'Real and distinct', 'No real roots', 'Rational and unequal'], answer: 0, topic: 'Quadratic Equations' }
    ],
    Science: [
      { text: 'Which cell organelle is called the powerhouse of the cell?', options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome'], answer: 0, topic: 'Cell Biology' },
      { text: 'What is the SI unit of electric potential difference (voltage)?', options: ['Volt', 'Ampere', 'Ohm', 'Joule'], answer: 0, topic: 'Electricity' },
      { text: 'Which of the following is a balanced chemical decomposition reaction?', options: ['2H₂O → 2H₂ + O₂', 'C + O₂ → CO₂', 'NaCl + AgNO₃ → AgCl + NaNO₃', 'Zn + H₂SO₄ → ZnSO₄ + H₂'], answer: 0, topic: 'Chemical Reactions' },
      { text: 'Which mirror is commonly used by dentists to view enlarged teeth?', options: ['Concave mirror', 'Convex mirror', 'Plane mirror', 'Cylindrical mirror'], answer: 0, topic: 'Light & Optics' },
      { text: 'Which gas is evolved when zinc granules react with dilute sulphuric acid?', options: ['Hydrogen', 'Oxygen', 'Carbon dioxide', 'Sulphur dioxide'], answer: 0, topic: 'Acids & Bases' },
      { text: 'What is the normal systolic blood pressure in a healthy human adult?', options: ['120 mm Hg', '80 mm Hg', '100 mm Hg', '140 mm Hg'], answer: 0, topic: 'Life Processes' },
      { text: 'Which non-metal is liquid at room temperature?', options: ['Bromine', 'Mercury', 'Chlorine', 'Phosphorus'], answer: 0, topic: 'Metals & Non-metals' },
      { text: 'Refractive index of a medium is the ratio of speed of light in vacuum to:', options: ['Speed of light in the medium', 'Frequency in medium', 'Wavelength in vacuum', 'Wavelength in medium'], answer: 0, topic: 'Optics' },
      { text: 'The functional unit of the human kidney is called:', options: ['Nephron', 'Neuron', 'Alveoli', 'Villi'], answer: 0, topic: 'Excretory System' },
      { text: 'Ohm’s law states that at constant temperature, current is directly proportional to:', options: ['Potential difference', 'Resistance', 'Power', 'Heat'], answer: 0, topic: 'Electricity' }
    ],
    Physics: [
      { text: 'What is the dimensional formula for gravitational constant G?', options: ['[M⁻¹ L³ T⁻²]', '[M L T⁻²]', '[M⁻¹ L² T⁻²]', '[M L² T⁻³]'], answer: 0, topic: 'Units & Dimensions' },
      { text: 'The area under an acceleration-time graph represents:', options: ['Change in velocity', 'Displacement', 'Speed', 'Distance'], answer: 0, topic: 'Kinematics' },
      { text: 'Which law of thermodynamics defines the concept of temperature?', options: ['Zeroth law', 'First law', 'Second law', 'Third law'], answer: 0, topic: 'Thermodynamics' },
      { text: 'The magnetic force on a charge moving parallel to a magnetic field is:', options: ['Zero', 'Maximum', 'Negative', 'Infinite'], answer: 0, topic: 'Magnetism' },
      { text: 'The phenomenon responsible for the twinkling of stars is:', options: ['Atmospheric refraction', 'Total internal reflection', 'Dispersion of light', 'Scattering of light'], answer: 0, topic: 'Ray Optics' },
      { text: 'What is the SI unit of magnetic flux?', options: ['Weber', 'Tesla', 'Henry', 'Gauss'], answer: 0, topic: 'Electromagnetism' },
      { text: 'In photoelectric effect, the kinetic energy of emitted photoelectrons depends on:', options: ['Frequency of incident light', 'Intensity of incident light', 'Velocity of incident light', 'Time of exposure'], answer: 0, topic: 'Modern Physics' },
      { text: 'The resistance of an ideal ammeter is:', options: ['Zero', 'Infinite', '1 Ohm', 'Very high'], answer: 0, topic: 'Current Electricity' },
      { text: 'Escape velocity from the surface of the Earth is approximately:', options: ['11.2 km/s', '9.8 km/s', '7.9 km/s', '15.4 km/s'], answer: 0, topic: 'Gravitation' },
      { text: 'The energy stored in a charged capacitor of capacitance C and voltage V is:', options: ['½ C V²', 'C V²', '½ C² V', 'C² V²'], answer: 0, topic: 'Electrostatics' }
    ],
    Chemistry: [
      { text: 'What is the hybridization of carbon in methane (CH₄)?', options: ['sp³', 'sp²', 'sp', 'dsp²'], answer: 0, topic: 'Chemical Bonding' },
      { text: 'Which quantum number determines the shape of an orbital?', options: ['Azimuthal quantum number (l)', 'Principal quantum number (n)', 'Magnetic quantum number (m)', 'Spin quantum number (s)'], answer: 0, topic: 'Atomic Structure' },
      { text: 'The oxidation number of Chromium in K₂Cr₂O₇ is:', options: ['+6', '+7', '+3', '+4'], answer: 0, topic: 'Redox Reactions' },
      { text: 'What is the pH of a 0.001 M HCl aqueous solution at 25°C?', options: ['3', '4', '1', '7'], answer: 0, topic: 'Ionic Equilibrium' },
      { text: 'Which gas is released during the electrolysis of brine at the cathode?', options: ['Hydrogen', 'Chlorine', 'Oxygen', 'Sodium vapor'], answer: 0, topic: 'Electrochemistry' },
      { text: 'The functional group present in an aldehyde is:', options: ['-CHO', '-COOH', '-OH', '-CO-'], answer: 0, topic: 'Organic Chemistry' },
      { text: 'Which law relates the solubility of a gas in a liquid to partial pressure?', options: ['Henry’s Law', 'Raoult’s Law', 'Dalton’s Law', 'Boyle’s Law'], answer: 0, topic: 'Solutions' },
      { text: 'What type of colloid is milk?', options: ['Emulsion', 'Sol', 'Gel', 'Foam'], answer: 0, topic: 'Surface Chemistry' }
    ],
    Biology: [
      { text: 'Which molecule carries hereditary information in most organisms?', options: ['DNA', 'Glucose', 'Starch', 'Chlorophyll'], answer: 0, topic: 'Genetics' },
      { text: 'Which organelle is the main site of photosynthesis?', options: ['Mitochondrion', 'Chloroplast', 'Nucleus', 'Lysosome'], answer: 0, topic: 'Cell Biology' },
      { text: 'What is the functional unit of the kidney?', options: ['Neuron', 'Alveolus', 'Nephron', 'Villus'], answer: 0, topic: 'Human Physiology' },
      { text: 'Which blood cells primarily transport oxygen in the human body?', options: ['Red blood cells', 'Platelets', 'White blood cells', 'Lymphocytes'], answer: 0, topic: 'Human Physiology' },
      { text: 'Which hormone helps regulate blood glucose levels in humans?', options: ['Insulin', 'Adrenaline', 'Thyroxine', 'Melatonin'], answer: 0, topic: 'Endocrine System' },
      { text: 'Which plant tissue transports water and dissolved minerals from roots?', options: ['Xylem', 'Phloem', 'Epidermis', 'Cambium'], answer: 0, topic: 'Plant Anatomy' }
    ],
    Accountancy: [
      { text: 'Which accounting concept assumes a business will continue operating indefinitely?', options: ['Going Concern Concept', 'Money Measurement', 'Periodicity', 'Conservatism'], answer: 0, topic: 'Basic Concepts' },
      { text: 'The fundamental accounting equation is:', options: ['Assets = Liabilities + Capital', 'Assets = Capital - Liabilities', 'Capital = Assets + Liabilities', 'Liabilities = Assets + Capital'], answer: 0, topic: 'Accounting Equation' },
      { text: 'Goodwill of a business is classified as a/an:', options: ['Intangible Asset', 'Current Asset', 'Liquid Asset', 'Fictitious Asset'], answer: 0, topic: 'Assets' },
      { text: 'In double-entry bookkeeping, an increase in an asset is recorded as:', options: ['Debit', 'Credit', 'Contra', 'Reversal'], answer: 0, topic: 'Rules of Debit & Credit' },
      { text: 'Which financial statement shows financial position at a specific date?', options: ['Balance Sheet', 'Profit and Loss Account', 'Cash Flow Statement', 'Trial Balance'], answer: 0, topic: 'Financial Statements' },
      { text: 'Depreciation is charged on which type of assets?', options: ['Fixed Tangible Assets', 'Current Assets', 'Liquid Cash', 'Goodwill'], answer: 0, topic: 'Depreciation' },
      { text: 'The excess of assets over liabilities in a non-profit organisation is called:', options: ['Capital Fund', 'Surplus', 'Net Profit', 'Deficit'], answer: 0, topic: 'NPO Accounting' },
      { text: 'A Trial Balance is prepared primarily to check:', options: ['Arithmetical accuracy of ledger', 'Financial profit', 'Cash position', 'Tax obligation'], answer: 0, topic: 'Trial Balance' }
    ],
    'Business Studies': [
      { text: 'Which management function is considered the primary function of management?', options: ['Planning', 'Organising', 'Controlling', 'Staffing'], answer: 0, topic: 'Management Functions' },
      { text: 'Who is universally acknowledged as the father of General Management?', options: ['Henri Fayol', 'F.W. Taylor', 'Peter Drucker', 'Elton Mayo'], answer: 0, topic: 'Principles of Management' },
      { text: 'Which Fayol principle states that an employee should receive orders from one superior only?', options: ['Unity of Command', 'Unity of Direction', 'Scalar Chain', 'Order'], answer: 0, topic: 'Fayol Principles' },
      { text: 'What are the traditional 4 Ps of Marketing Mix?', options: ['Product, Price, Place, Promotion', 'Plan, People, Process, Position', 'Power, Profit, Price, Place', 'Policy, Program, Path, Performance'], answer: 0, topic: 'Marketing' },
      { text: 'Under the Consumer Protection Act 2019, District Commission entertains complaints up to:', options: ['₹1 Crore', '₹20 Lakhs', '₹50 Lakhs', '₹10 Crores'], answer: 0, topic: 'Consumer Protection' },
      { text: 'Which financial market deals in medium and long-term funds?', options: ['Capital Market', 'Money Market', 'Call Money Market', 'Treasury Market'], answer: 0, topic: 'Financial Markets' }
    ],
    Economics: [
      { text: 'The Law of Demand states that other things being constant, quantity demanded increases when:', options: ['Price falls', 'Income falls', 'Price rises', 'Supply increases'], answer: 0, topic: 'Microeconomics' },
      { text: 'The opportunity cost of a chosen economic activity is the:', options: ['Value of the next best alternative forgone', 'Total financial outlay', 'Fixed overhead cost', 'Sunk cost'], answer: 0, topic: 'Introductory Economics' },
      { text: 'Which macroeconomic indicator measures total value of final goods & services produced in a country in a year?', options: ['Gross Domestic Product (GDP)', 'Net National Product', 'Gross National Income', 'Disposable Income'], answer: 0, topic: 'National Income' },
      { text: 'Which apex authority formulates and executes Monetary Policy in India?', options: ['Reserve Bank of India (RBI)', 'NITI Aayog', 'Ministry of Finance', 'SEBI'], answer: 0, topic: 'Money & Banking' },
      { text: 'Inflation driven by rising costs of raw materials and employee wages is known as:', options: ['Cost-push inflation', 'Demand-pull inflation', 'Creeping inflation', 'Hyperinflation'], answer: 0, topic: 'Macroeconomics' },
      { text: 'A market structure characterized by a single seller with high barriers to entry is a:', options: ['Monopoly', 'Perfect Competition', 'Oligopoly', 'Monopolistic Competition'], answer: 0, topic: 'Market Forms' }
    ],
    History: [
      { text: 'The Indus Valley / Harappan Civilization belonged chronologically to which archaeological age?', options: ['Bronze Age', 'Iron Age', 'Neolithic Age', 'Mesolithic Age'], answer: 0, topic: 'Ancient India' },
      { text: 'The famous steatite seal depicting "Pashupati" was excavated at which major site?', options: ['Mohenjo-daro', 'Harappa', 'Kalibangan', 'Lothal'], answer: 0, topic: 'Harappan Culture' },
      { text: 'Who was the illustrious founder of the Mauryan Empire in ancient India?', options: ['Chandragupta Maurya', 'Ashoka', 'Bindusara', 'Brihadratha'], answer: 0, topic: 'Mauryan Empire' },
      { text: 'The devastating Kalinga War prompted Emperor Ashoka to embrace and propagate:', options: ['Buddhism & Dhamma', 'Jainism', 'Ajivika philosophy', 'Vedic rituals'], answer: 0, topic: 'Ashoka Epigraphs' },
      { text: 'Mahatma Gandhi launched the Champaran Satyagraha in 1917 in Bihar to support:', options: ['Oppressed Indigo farmers', 'Cotton textile workers', 'Salt tax protesters', 'Peasants against land revenue'], answer: 0, topic: 'National Movement' },
      { text: 'Who presided over the iconic Lahore Session of 1929 where the "Purna Swaraj" resolution was passed?', options: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Subhas Chandra Bose', 'Motilal Nehru'], answer: 0, topic: 'National Movement' }
    ],
    'Political Science': [
      { text: 'The Constitution of India was officially adopted by the Constituent Assembly on:', options: ['26 November 1949', '15 August 1947', '26 January 1950', '2 October 1948'], answer: 0, topic: 'Indian Constitution' },
      { text: 'Which Article was described as the "Heart and Soul" of the Indian Constitution by Dr. B.R. Ambedkar?', options: ['Article 32 (Right to Constitutional Remedies)', 'Article 21 (Right to Life)', 'Article 14 (Equality)', 'Article 19 (Freedoms)'], answer: 0, topic: 'Fundamental Rights' },
      { text: 'Who serves as the ex-officio Chairman of the Rajya Sabha in the Indian Parliament?', options: ['Vice-President of India', 'Speaker of Lok Sabha', 'Prime Minister', 'Chief Justice of India'], answer: 0, topic: 'Legislature' },
      { text: 'The minimum constitutional age required to contest election for the Lok Sabha is:', options: ['25 years', '30 years', '35 years', '21 years'], answer: 0, topic: 'Elections' },
      { text: 'The Election Commission of India functions as an autonomous authority under which Article?', options: ['Article 324', 'Article 280', 'Article 352', 'Article 312'], answer: 0, topic: 'Constitutional Bodies' }
    ],
    Geography: [
      { text: 'Which layer of the Earth possesses the highest density and is predominantly composed of nickel and iron?', options: ['Core (Nife)', 'Crust (Sial)', 'Mantle (Sima)', 'Lithosphere'], answer: 0, topic: 'Earth Interior' },
      { text: 'The Continental Drift hypothesis was formulated and published in 1912 by:', options: ['Alfred Wegener', 'Harry Hess', 'Arthur Holmes', 'W.M. Davis'], answer: 0, topic: 'Geomorphology' },
      { text: 'Which atmospheric zone contains the protective ozone layer shielding Earth from ultraviolet radiation?', options: ['Stratosphere', 'Troposphere', 'Mesosphere', 'Thermosphere'], answer: 0, topic: 'Climatology' },
      { text: 'The Western Ghats and Eastern Ghats converge geographically at the:', options: ['Nilgiri Hills', 'Annamalai Hills', 'Cardamom Hills', 'Palani Hills'], answer: 0, topic: 'Physiography of India' },
      { text: 'Which is the longest river system flowing through Peninsular India (Dakshin Ganga)?', options: ['Godavari', 'Krishna', 'Mahanadi', 'Kaveri'], answer: 0, topic: 'Drainage Systems' }
    ],
    Sociology: [
      { text: 'Who is universally acclaimed as the founding father of Sociology?', options: ['Auguste Comte', 'Karl Marx', 'Max Weber', 'Herbert Spencer'], answer: 0, topic: 'Sociological Foundations' },
      { text: 'The sociological concept of "Social Stratification" denotes:', options: ['Hierarchical ranking of social strata', 'Biological classification', 'Psychological grouping', 'Spatial migration'], answer: 0, topic: 'Social Stratification' },
      { text: 'Which fundamental social institution operates as the primary agent of human socialization?', options: ['Family', 'Mass Media', 'Workplace', 'Political Party'], answer: 0, topic: 'Social Institutions' },
      { text: 'The conceptual framework of "Sanskritization" in Indian social anthropology was introduced by:', options: ['M.N. Srinivas', 'G.S. Ghurye', 'Andre Beteille', 'Irawati Karve'], answer: 0, topic: 'Social Change in India' }
    ],
    Psychology: [
      { text: 'Who established the Psychoanalytic school of psychology exploring the unconscious mind?', options: ['Sigmund Freud', 'Carl Jung', 'B.F. Skinner', 'John Watson'], answer: 0, topic: 'Psychological Traditions' },
      { text: 'Which memory store retains information for approximately 20 to 30 seconds without active rehearsal?', options: ['Short-Term Memory (STM)', 'Sensory Memory', 'Long-Term Memory', 'Episodic Memory'], answer: 0, topic: 'Human Memory' },
      { text: 'The classic standardized mathematical formula for Intelligence Quotient (IQ) is:', options: ['(Mental Age / Chronological Age) × 100', '(Chronological Age / Mental Age) × 100', '(Mental Age × Chronological Age) / 100', '(Mental Age + Chronological Age) × 10'], answer: 0, topic: 'Intelligence' },
      { text: 'In Abraham Maslow’s pyramid hierarchy of human needs, the culminating pinnacle need is:', options: ['Self-actualization', 'Self-esteem', 'Safety', 'Belongingness'], answer: 0, topic: 'Motivation & Emotion' }
    ],
    'Computer Science': [
      { text: 'Which core Python compound data structure is strictly immutable once initialized?', options: ['Tuple', 'List', 'Dictionary', 'Set'], answer: 0, topic: 'Python Fundamentals' },
      { text: 'What is the algorithmic time complexity of searching an item in a balanced Binary Search Tree?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'], answer: 0, topic: 'Data Structures' },
      { text: 'Which SQL DDL command permanently removes a table along with its relational schema from a database?', options: ['DROP TABLE', 'DELETE TABLE', 'TRUNCATE TABLE', 'REMOVE TABLE'], answer: 0, topic: 'Database Systems' },
      { text: 'In internet protocols, the acronym HTTP stands for:', options: ['Hypertext Transfer Protocol', 'High Technology Transfer Process', 'Hyperlink Transmission Path', 'Host Telecommunication Platform'], answer: 0, topic: 'Computer Networks' },
      { text: 'Which Boolean logic gate is universally classified as a universal gate alongside NOR?', options: ['NAND gate', 'AND gate', 'OR gate', 'XOR gate'], answer: 0, topic: 'Boolean Logic' }
    ],
    Hindi: [
      { text: '\'दशानन\' (दस हैं आनन जिसके अर्थात् रावण) में कौन-सा समास है?', options: ['बहुव्रीहि समास', 'द्विगु समास', 'कर्मधारय समास', 'तत्पुरुष समास'], answer: 0, topic: 'समास' },
      { text: '\'पवन\' का सही संधि-विच्छेद निम्नलिखित में से क्या है?', options: ['पो + अन', 'पौ + अन', 'प + वन', 'पव + न'], answer: 0, topic: 'संधि' },
      { text: '\'अनुराग\' शब्द का सही विलोम शब्द क्या होगा?', options: ['विराग', 'राग', 'द्वेष', 'घृणा'], answer: 0, topic: 'विलोम शब्द' },
      { text: 'निम्नलिखित में से कौन-सा शब्द \'सूर्य\' का पर्यायवाची है?', options: ['दिनकर', 'शशि', 'जलद', 'निशाकर'], answer: 0, topic: 'पर्यायवाची' },
      { text: '\'आँखों का तारा होना\' मुहावरे का सही अर्थ क्या है?', options: ['अत्यधिक प्रिय होना', 'बहुत दूर होना', 'कम दिखाई देना', 'घमंडी होना'], answer: 0, topic: 'मुहावरे' }
    ],
    English: [
      { text: 'Choose the correctly spelled word.', options: ['Environment', 'Enviroment', 'Envirnoment', 'Environmant'], answer: 0, topic: 'Spelling' },
      { text: 'Choose the synonym of “brief”.', options: ['Concise', 'Lengthy', 'Unclear', 'Loud'], answer: 0, topic: 'Vocabulary' },
      { text: 'Choose the grammatically correct sentence.', options: ['She has finished her work.', 'She have finished her work.', 'She having finished her work.', 'She finish her work.'], answer: 0, topic: 'Grammar' },
      { text: 'Choose the antonym of “ancient”.', options: ['Modern', 'Historic', 'Old', 'Early'], answer: 0, topic: 'Vocabulary' },
      { text: 'Choose the synonym of “diligent”.', options: ['Hard-working', 'Careless', 'Impatient', 'Uncertain'], answer: 0, topic: 'Vocabulary' },
      { text: 'Choose the correctly spelled word.', options: ['Necessary', 'Neccessary', 'Necesary', 'Necessery'], answer: 0, topic: 'Spelling' }
    ],
    'Social Science': [
      { text: 'Which imaginary line divides Earth into Northern and Southern Hemispheres?', options: ['Equator', 'Tropic of Cancer', 'Prime Meridian', 'Arctic Circle'], answer: 0, topic: 'Geography' },
      { text: 'Which institution interprets the Constitution of India?', options: ['Supreme Court', 'Election Commission', 'NITI Aayog', 'Finance Commission'], answer: 0, topic: 'Civics' },
      { text: 'Who led the Dandi March in 1930?', options: ['Mahatma Gandhi', 'Subhas Chandra Bose', 'Jawaharlal Nehru', 'Sardar Patel'], answer: 0, topic: 'History' },
      { text: 'Which is the lower house of the Indian Parliament?', options: ['Lok Sabha', 'Rajya Sabha', 'Vidhan Parishad', 'Gram Sabha'], answer: 0, topic: 'Civics' }
    ]
  };

  function getFallbackQuestions(grade, subject, set) {
    const pool = questionPools[subject] || questionPools.Science || questionPools.Mathematics;
    const safeSet = Math.max(1, Number(set) || 1);
    return Array.from({ length: 10 }, (_, index) => {
      const q = pool[(index + (safeSet - 1) * 3) % pool.length];
      return {
        id: 'class-' + grade + '-' + subject + '-' + safeSet + '-' + (index + 1),
        classNumber: String(grade),
        subject: subject,
        set: safeSet,
        number: index + 1,
        topic: q.topic,
        text: q.text,
        options: [...q.options],
        answer: q.answer
      };
    });
  }

  function classApi(path, options = {}) {
    const token = localStorage.getItem('preply-session-token');
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body) headers['Content-Type'] = 'application/json';
    return fetch(apiOrigin + path, { ...options, headers });
  }

  function updateClassTabs() {
    document.querySelectorAll('.class-picker-tabs button[data-class]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.class === String(classNumber));
    });

    if (streamPickerTabs) {
      if (classNumber === '11' || classNumber === '12') {
        streamPickerTabs.style.display = 'flex';
      } else {
        streamPickerTabs.style.display = 'none';
        activeStream = 'all';
      }
    }
  }

  function renderSeries(series) {
    currentSeriesData = series || [];
    classSeriesList.replaceChildren();

    // Filter by activeStream if set on classes 11/12
    let visibleSeries = currentSeriesData;
    if ((classNumber === '11' || classNumber === '12') && activeStream !== 'all') {
      visibleSeries = currentSeriesData.filter((item) => {
        const streams = streamMap[item.subject] || [];
        return streams.includes(activeStream);
      });
    }

    if (!visibleSeries.length) {
      const empty = document.createElement('p');
      empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 0;';
      empty.textContent = 'No subjects found for this stream filter.';
      classSeriesList.appendChild(empty);
      return;
    }

    visibleSeries.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'class-series-card';

      // Header with subject and stream tag
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;';

      const title = document.createElement('h2');
      title.textContent = item.subject;
      title.style.margin = '0';
      headerRow.appendChild(title);

      if (classNumber === '11' || classNumber === '12') {
        const primaryStream = (streamMap[item.subject] || [])[0] || 'core';
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.cssText = 'background:#eef7f2; color:#175e4b; font-weight:700; font-size:11px; padding:3px 8px; border-radius:6px; white-space:nowrap;';
        badge.textContent = streamBadgeLabels[primaryStream] || primaryStream.toUpperCase();
        headerRow.appendChild(badge);
      }

      card.appendChild(headerRow);

      const totalSets = Math.min(30, Math.max(30, item.totalSets || 30));
      const description = document.createElement('p');
      description.textContent = (item.questionsPerSet || 10) + ' questions per set · ' + totalSets + ' practice sets';

      const attemptsKey = 'rd-school-attempts-' + classNumber + '-' + item.subject;
      let savedScore = null;
      try {
        const raw = localStorage.getItem(attemptsKey);
        if (raw) savedScore = JSON.parse(raw);
      } catch (_) {}

      const latest = profile?.stats?.testAttempts?.find((attempt) => attempt.classNumber === String(classNumber) && attempt.subject === item.subject) || savedScore;

      if (latest) {
        const progress = document.createElement('p');
        progress.className = 'class-series-progress';
        progress.textContent = 'Latest score: ' + latest.score + '/' + latest.total + ' · ' + latest.accuracy + '%';
        card.append(description, progress);
      } else {
        card.append(description);
      }

      const sets = document.createElement('div');
      sets.className = 'class-series-sets';
      sets.setAttribute('aria-label', item.subject + ' test sets');

      for (let set = 1; set <= totalSets; set += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Set ' + (set < 10 ? '0' + set : set);
        button.title = 'Start Set ' + set + ' for ' + item.subject;
        button.addEventListener('click', () => loadTest(item.subject, set));
        sets.appendChild(button);
      }
      card.appendChild(sets);
      classSeriesList.appendChild(card);
    });
  }

  async function loadSeries() {
    updateClassTabs();
    document.querySelector('#classHeading').textContent = 'Class ' + classNumber + ' test series';
    document.querySelector('#classIntro').textContent = 'Practice ' + (classNumber === '11' || classNumber === '12' ? 'senior secondary (Science, Commerce, Arts & Humanities)' : 'school board') + ' subjects with 30 focused practice sets.';
    classSeriesStatus.textContent = 'Loading test series...';
    classSeriesStatus.hidden = false;

    let loaded = false;
    try {
      const profileRequest = localStorage.getItem('preply-session-token')
        ? classApi('/api/profile/me').catch(() => null)
        : Promise.resolve(null);

      const [seriesResponse, profileResponse] = await Promise.all([
        classApi('/api/classes/' + classNumber + '/series'),
        profileRequest
      ]);

      if (seriesResponse.ok) {
        const seriesPayload = await seriesResponse.json();
        if (seriesPayload && Array.isArray(seriesPayload.subjects)) {
          if (profileResponse?.ok) profile = await profileResponse.json();
          classSeriesStatus.hidden = true;
          renderSeries(seriesPayload.subjects);
          loaded = true;
          if (profile?.user) {
            classApi('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ schoolClass: classNumber }) }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Backend series fetch error, using instant fallback:', e.message);
    }

    if (!loaded) {
      classSeriesStatus.hidden = true;
      renderSeries(fallbackCurricula[classNumber] || fallbackCurricula['10']);
    }
  }

  const clientTranslationCache = new Map();

  async function translateSchoolText(text, targetLang = 'hi') {
    if (!text || typeof text !== 'string') return text;
    const clean = text.trim();
    if (!clean) return clean;
    if (targetLang === 'hi' && /[\u0900-\u097F]/.test(clean)) return clean;
    const cacheKey = `${targetLang}:${clean}`;
    if (clientTranslationCache.has(cacheKey)) return clientTranslationCache.get(cacheKey);

    // 1. Try local backend translation proxy endpoint
    try {
      const res = await classApi('/api/translate?text=' + encodeURIComponent(clean) + '&target=' + targetLang);
      if (res.ok) {
        const data = await res.json();
        if (data?.translatedText) {
          clientTranslationCache.set(cacheKey, data.translatedText);
          return data.translatedText;
        }
      }
    } catch (_) {}

    // 2. Direct online translation fallback
    try {
      const directRes = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(clean) + '&langpair=en|' + targetLang);
      if (directRes.ok) {
        const data = await directRes.json();
        if (data?.responseData?.translatedText) {
          const result = data.responseData.translatedText;
          clientTranslationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_) {}

    return clean;
  }

  let allSchoolQuestionsHindi = false;

  async function toggleQuestionHindi(q, index, fieldset, btn) {
    q._isHindi = !q._isHindi;
    const textSpan = fieldset.querySelector('.class-q-text');
    const optSpans = fieldset.querySelectorAll('.class-opt-text');
    const labelSpan = btn.querySelector('.trans-btn-text');

    if (q._isHindi) {
      if (labelSpan) labelSpan.textContent = 'Translating...';
      btn.disabled = true;

      if (!q._hindiText) {
        try {
          const [tText, ...tOpts] = await Promise.all([
            translateSchoolText(q.text, 'hi'),
            ...q.options.map((opt) => translateSchoolText(opt, 'hi'))
          ]);
          q._hindiText = tText;
          q._hindiOptions = tOpts;
        } catch (_) {
          q._hindiText = q.text;
          q._hindiOptions = [...q.options];
        }
      }

      if (textSpan && q._hindiText) textSpan.textContent = q._hindiText;
      if (optSpans && q._hindiOptions) {
        optSpans.forEach((span, i) => {
          if (q._hindiOptions[i]) span.textContent = q._hindiOptions[i];
        });
      }

      btn.disabled = false;
      btn.classList.add('active');
      btn.style.background = '#175e4b';
      btn.style.color = '#ffffff';
      btn.style.borderColor = '#175e4b';
      if (labelSpan) labelSpan.textContent = 'Show English (मूल अंग्रेजी)';
    } else {
      if (textSpan) textSpan.textContent = q.text;
      if (optSpans) {
        optSpans.forEach((span, i) => {
          span.textContent = q.options[i];
        });
      }
      btn.classList.remove('active');
      btn.style.background = '#eef7f2';
      btn.style.color = '#175e4b';
      btn.style.borderColor = '#bdd3c4';
      if (labelSpan) labelSpan.textContent = 'Translate to Hindi (हिंदी)';
    }
  }

  const btnTranslateAll = document.querySelector('#btnTranslateAllSchoolQuestions');
  const translateAllLabel = document.querySelector('#translateAllSchoolLabel');
  btnTranslateAll?.addEventListener('click', async () => {
    if (!activeSeries?.questions?.length) return;
    allSchoolQuestionsHindi = !allSchoolQuestionsHindi;

    if (translateAllLabel) {
      translateAllLabel.textContent = allSchoolQuestionsHindi ? 'Translating all questions...' : 'Translate Test to Hindi (हिंदी में देखें)';
    }
    btnTranslateAll.disabled = true;

    const questionElements = classQuestionList.querySelectorAll('.class-question');
    const promises = [];
    activeSeries.questions.forEach((q, idx) => {
      const fieldset = questionElements[idx];
      const btn = fieldset?.querySelector('.btn-translate-q');
      if (fieldset && btn) {
        if ((allSchoolQuestionsHindi && !q._isHindi) || (!allSchoolQuestionsHindi && q._isHindi)) {
          promises.push(toggleQuestionHindi(q, idx, fieldset, btn));
        }
      }
    });

    await Promise.all(promises);
    btnTranslateAll.disabled = false;
    if (translateAllLabel) {
      translateAllLabel.textContent = allSchoolQuestionsHindi ? 'Show All in English (अंग्रेजी में देखें)' : 'Translate Test to Hindi (हिंदी में देखें)';
    }
    if (allSchoolQuestionsHindi) {
      btnTranslateAll.style.background = '#175e4b';
      btnTranslateAll.style.color = '#ffffff';
    } else {
      btnTranslateAll.style.background = '#eef7f2';
      btnTranslateAll.style.color = '#175e4b';
    }
  });

  async function loadTest(subject, set) {
    activeSeries = { subject, set };
    startedAt = Date.now();
    document.querySelector('#classTestTitle').textContent = subject + ' · Set ' + (set < 10 ? '0' + set : set) + ' (Class ' + classNumber + ')';
    classQuestionList.replaceChildren();
    classTestResult.textContent = '';
    classTest.hidden = false;
    classTest.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let questions = [];
    try {
      const res = await classApi('/api/classes/' + classNumber + '/series/' + encodeURIComponent(subject) + '/' + set);
      if (res.ok) {
        const payload = await res.json();
        if (payload?.questions?.length) questions = payload.questions;
      }
    } catch (_) {}

    if (!questions.length) {
      questions = getFallbackQuestions(classNumber, subject, set);
    }

    activeSeries.questions = questions;
    allSchoolQuestionsHindi = false;
    if (translateAllLabel) translateAllLabel.textContent = 'Translate Test to Hindi (हिंदी में देखें)';
    if (btnTranslateAll) {
      btnTranslateAll.style.background = '#eef7f2';
      btnTranslateAll.style.color = '#175e4b';
    }

    questions.forEach((q, index) => {
      q._isHindi = false;
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'class-question';

      const topRow = document.createElement('div');
      topRow.className = 'class-question-top';

      const legend = document.createElement('legend');
      legend.className = 'class-question-legend';
      const numSpan = document.createElement('span');
      numSpan.className = 'class-q-num';
      numSpan.textContent = 'Q' + (index + 1) + '.';
      const textSpan = document.createElement('span');
      textSpan.className = 'class-q-text';
      textSpan.textContent = q.text;
      legend.append(numSpan, textSpan);
      topRow.appendChild(legend);

      const transBtn = document.createElement('button');
      transBtn.type = 'button';
      transBtn.className = 'btn-translate-q';
      transBtn.title = 'Translate question to Hindi';
      transBtn.innerHTML = `<span>🌐</span> <span class="trans-btn-text">Translate to Hindi (हिंदी)</span>`;
      transBtn.addEventListener('click', () => toggleQuestionHindi(q, index, fieldset, transBtn));
      topRow.appendChild(transBtn);

      fieldset.appendChild(topRow);

      q.options.forEach((opt, optIndex) => {
        const label = document.createElement('label');
        label.className = 'class-opt-label';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'question-' + index;
        input.value = optIndex;
        input.required = (optIndex === 0);

        const optPrefix = document.createElement('strong');
        optPrefix.className = 'class-opt-prefix';
        optPrefix.textContent = String.fromCharCode(65 + optIndex) + '.';

        const optSpan = document.createElement('span');
        optSpan.className = 'class-opt-text';
        optSpan.textContent = opt;

        input.addEventListener('change', () => {
          fieldset.querySelectorAll('.class-opt-label').forEach((lbl) => lbl.classList.remove('selected'));
          if (input.checked) {
            label.classList.add('selected');
          }
        });

        label.append(input, optPrefix, optSpan);
        fieldset.appendChild(label);
      });

      classQuestionList.appendChild(fieldset);
    });
  }

  classTestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeSeries || !activeSeries.questions) return;

    const answers = activeSeries.questions.map((_, index) => {
      const checked = classTestForm.querySelector('input[name="question-' + index + '"]:checked');
      return checked ? Number(checked.value) : null;
    });

    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    let graded = null;

    try {
      const res = await classApi('/api/classes/' + classNumber + '/series/' + encodeURIComponent(activeSeries.subject) + '/' + activeSeries.set + '/results', {
        method: 'POST',
        body: JSON.stringify({ answers, durationSeconds })
      });
      if (res.ok) {
        const data = await res.json();
        graded = data.attempt;
        if (data.gamification && typeof window.checkForLevelUp === 'function') {
          window.checkForLevelUp(data.gamification);
        }
      }
    } catch (_) {}

    if (!graded) {
      let score = 0;
      activeSeries.questions.forEach((q, idx) => {
        if (q.answer !== undefined && answers[idx] === q.answer) score += 1;
      });
      graded = {
        score,
        total: activeSeries.questions.length,
        accuracy: Math.round((score / activeSeries.questions.length) * 100),
        classNumber: String(classNumber),
        subject: activeSeries.subject,
        set: activeSeries.set
      };
    }

    classTestResult.textContent = 'Score: ' + graded.score + '/' + graded.total + ' (' + graded.accuracy + '% accuracy). Great practice!';
    classTestResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.dispatchEvent(new CustomEvent('rd-test-completed', { detail: graded }));

    try {
      const attemptsKey = 'rd-school-attempts-' + classNumber + '-' + activeSeries.subject;
      localStorage.setItem(attemptsKey, JSON.stringify(graded));
    } catch (_) {}

    loadSeries();
  });

  document.querySelector('#classTestBack')?.addEventListener('click', () => {
    classTest.hidden = true;
    activeSeries = null;
    classSeriesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Switch class listeners
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.class-picker-tabs button[data-class]');
    if (tabBtn) {
      e.preventDefault();
      const targetClass = tabBtn.dataset.class;
      if (targetClass && targetClass !== classNumber) {
        classNumber = targetClass;
        activeStream = 'all';
        window.localStorage.setItem('preply-school-class', classNumber);
        try {
          const url = new URL(window.location);
          url.searchParams.set('class', classNumber);
          window.history.pushState({}, '', url);
        } catch (_) {}
        classTest.hidden = true;
        activeSeries = null;

        // Reset stream filter active buttons
        if (streamPickerTabs) {
          streamPickerTabs.querySelectorAll('.stream-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.stream === 'all');
          });
        }

        loadSeries();
      }
      return;
    }

    // Stream filter button listener
    const streamBtn = e.target.closest('.stream-picker-tabs button[data-stream]');
    if (streamBtn) {
      e.preventDefault();
      const targetStream = streamBtn.dataset.stream;
      if (targetStream) {
        activeStream = targetStream;
        streamPickerTabs.querySelectorAll('.stream-btn').forEach((b) => {
          b.classList.toggle('active', b === streamBtn);
        });
        renderSeries(currentSeriesData);
      }
    }
  });

  loadSeries();
})();