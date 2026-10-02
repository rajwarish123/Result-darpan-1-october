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

  let activeSeries = null;
  let startedAt = 0;
  let profile = null;

  const apiOrigin = (() => {
    if (typeof window === 'undefined') return '';
    const port = window.location.port;
    const host = window.location.hostname;
    if (window.location.protocol === 'file:' || (host === '127.0.0.1' && port !== '3000') || (host === 'localhost' && port !== '3000')) {
      return 'http://localhost:3000';
    }
    return '';
  })();

  const fallbackCurricula = {
    9: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Science', questionsPerSet: 10, totalSets: 10 },
      { subject: 'English', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Social Science', questionsPerSet: 10, totalSets: 10 }
    ],
    10: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Science', questionsPerSet: 10, totalSets: 10 },
      { subject: 'English', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Social Science', questionsPerSet: 10, totalSets: 10 }
    ],
    11: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Physics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Chemistry', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Biology', questionsPerSet: 10, totalSets: 10 },
      { subject: 'English', questionsPerSet: 10, totalSets: 10 }
    ],
    12: [
      { subject: 'Mathematics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Physics', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Chemistry', questionsPerSet: 10, totalSets: 10 },
      { subject: 'Biology', questionsPerSet: 10, totalSets: 10 },
      { subject: 'English', questionsPerSet: 10, totalSets: 10 }
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
      { text: 'What type of colloid is milk?', options: ['Emulsion', 'Sol', 'Gel', 'Foam'], answer: 0, topic: 'Surface Chemistry' },
      { text: 'The IUPAC name of acetic acid is:', options: ['Ethanoic acid', 'Methanoic acid', 'Propanoic acid', 'Ethanol'], answer: 0, topic: 'Nomenclature' },
      { text: 'In Haber’s process for manufacture of ammonia, the catalyst used is:', options: ['Finely divided Iron', 'Nickel', 'Platinum', 'Copper'], answer: 0, topic: 'Inorganic Chemistry' }
    ],
    Biology: [
      { text: 'Which molecule carries genetic information from DNA to ribosomes?', options: ['mRNA', 'tRNA', 'rRNA', 'ATP'], answer: 0, topic: 'Genetics' },
      { text: 'During which phase of meiosis does crossing over take place?', options: ['Pachytene', 'Leptotene', 'Zygotene', 'Diplotene'], answer: 0, topic: 'Cell Division' },
      { text: 'Which hormone is known as the primary emergency or fight-or-flight hormone?', options: ['Adrenaline', 'Insulin', 'Thyroxine', 'Glucagon'], answer: 0, topic: 'Endocrine System' },
      { text: 'The site of light reaction in chloroplasts during photosynthesis is:', options: ['Thylakoid membranes (Grana)', 'Stroma', 'Inner membrane', 'Matrix'], answer: 0, topic: 'Plant Physiology' },
      { text: 'What is the phenotypic ratio in a standard Mendelian monohybrid F₂ cross?', options: ['3:1', '1:2:1', '9:3:3:1', '2:1'], answer: 0, topic: 'Principles of Inheritance' },
      { text: 'Which valve prevents backflow of blood from left ventricle to left atrium?', options: ['Bicuspid (Mitral) valve', 'Tricuspid valve', 'Semilunar valve', 'Aortic valve'], answer: 0, topic: 'Circulatory System' },
      { text: 'Which nitrogenous base is present in RNA but absent in DNA?', options: ['Uracil', 'Thymine', 'Cytosine', 'Guanine'], answer: 0, topic: 'Biomolecules' },
      { text: 'The structural and functional unit of the nervous system is:', options: ['Neuron', 'Nephron', 'Axon', 'Synapse'], answer: 0, topic: 'Neural Control' },
      { text: 'Which organelle is responsible for lipid synthesis in eukaryotic cells?', options: ['Smooth Endoplasmic Reticulum', 'Rough Endoplasmic Reticulum', 'Golgi apparatus', 'Lysosome'], answer: 0, topic: 'Cell Biology' },
      { text: 'Which organism is commonly used as a bio-fertilizer for nitrogen fixation?', options: ['Rhizobium', 'Yeast', 'Penicillium', 'E. coli'], answer: 0, topic: 'Microbes & Ecology' }
    ],
    'Social Science': [
      { text: 'In which year did the French Revolution begin?', options: ['1789', '1776', '1804', '1815'], answer: 0, topic: 'World History' },
      { text: 'Who is considered the Father of the Indian Constitution?', options: ['Dr. B.R. Ambedkar', 'Mahatma Gandhi', 'Jawaharlal Nehru', 'Dr. Rajendra Prasad'], answer: 0, topic: 'Democratic Politics' },
      { text: 'Which river forms the largest river island, Majuli, in the world?', options: ['Brahmaputra', 'Ganga', 'Indus', 'Godavari'], answer: 0, topic: 'Indian Geography' },
      { text: 'The primary sector of the Indian economy includes:', options: ['Agriculture and forestry', 'Manufacturing', 'Banking and trade', 'Information technology'], answer: 0, topic: 'Economics' },
      { text: 'Which latitude divides India into almost two equal halves?', options: ['Tropic of Cancer (23°30′ N)', 'Equator (0°)', 'Tropic of Capricorn (23°30′ S)', 'Arctic Circle'], answer: 0, topic: 'Geography' },
      { text: 'The Simon Commission visited India in which year?', options: ['1928', '1919', '1930', '1942'], answer: 0, topic: 'Modern History' },
      { text: 'Which body is the supreme law-making authority in India?', options: ['Parliament', 'Supreme Court', 'Election Commission', 'Cabinet'], answer: 0, topic: 'Civics' },
      { text: 'Human Development Index (HDI) is published annually by:', options: ['UNDP', 'World Bank', 'IMF', 'UNESCO'], answer: 0, topic: 'Economics' },
      { text: 'What was the immediate cause of the 1857 Indian Mutiny / Revolt?', options: ['Greased cartridges issue', 'Doctrine of Lapse', 'Subsidiary Alliance', 'Drain of wealth'], answer: 0, topic: 'History' },
      { text: 'Which state in India has the highest literacy rate according to Census 2011?', options: ['Kerala', 'Mizoram', 'Goa', 'Tamil Nadu'], answer: 0, topic: 'Demographics' }
    ],
    English: [
      { text: 'Choose the word nearest in meaning (synonym) to "ABUNDANT":', options: ['Plentiful', 'Scarce', 'Rare', 'Limited'], answer: 0, topic: 'Vocabulary' },
      { text: 'Select the correct antonym of "PRUDENT":', options: ['Reckless', 'Cautious', 'Wise', 'Careful'], answer: 0, topic: 'Vocabulary' },
      { text: 'Choose the correctly punctuated sentence:', options: ['"Where are you going?" asked mother.', '"Where are you going," asked mother?', '"Where are you going," asked mother.', 'Where are you going? Asked mother.'], answer: 0, topic: 'Punctuation' },
      { text: 'Identify the active voice: "The novel was written by Arundhati Roy."', options: ['Arundhati Roy wrote the novel.', 'Arundhati Roy had written the novel.', 'Arundhati Roy was writing the novel.', 'The novel wrote Arundhati Roy.'], answer: 0, topic: 'Active & Passive Voice' },
      { text: 'Choose the correct preposition: She has been studying ___ morning.', options: ['since', 'for', 'from', 'in'], answer: 0, topic: 'Grammar' },
      { text: 'Identify the figure of speech: "The wind whispered through the dark trees."', options: ['Personification', 'Metaphor', 'Simile', 'Hyperbole'], answer: 0, topic: 'Literary Devices' },
      { text: 'Choose the correct reported speech: He said, "I am reading a book."', options: ['He said that he was reading a book.', 'He said that I am reading a book.', 'He says that he is reading a book.', 'He said he will read a book.'], answer: 0, topic: 'Direct & Indirect Speech' },
      { text: 'What is the plural form of the noun "Crisis"?', options: ['Crises', 'Crisises', 'Crisis', 'Crisi'], answer: 0, topic: 'Nouns' },
      { text: 'Choose the correctly spelt word:', options: ['Bureaucracy', 'Burocracy', 'Bureaucrasy', 'Beurocracy'], answer: 0, topic: 'Spelling' },
      { text: 'Identify the conjunction in: "She ran fast, yet she missed the train."', options: ['yet', 'ran', 'fast', 'missed'], answer: 0, topic: 'Parts of Speech' }
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
  }

  function renderSeries(series) {
    classSeriesList.replaceChildren();
    series.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'class-series-card';
      const title = document.createElement('h2');
      title.textContent = item.subject;
      const description = document.createElement('p');
      description.textContent = (item.questionsPerSet || 10) + ' questions per set · ' + (item.totalSets || 10) + ' practice sets';

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
        card.append(title, description, progress);
      } else {
        card.append(title, description);
      }

      const sets = document.createElement('div');
      sets.className = 'class-series-sets';
      sets.setAttribute('aria-label', item.subject + ' test sets');
      const totalSets = Math.min(10, item.totalSets || 10);
      for (let set = 1; set <= totalSets; set += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Set ' + set;
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
    document.querySelector('#classIntro').textContent = 'Practice ' + (classNumber === '11' || classNumber === '12' ? 'senior secondary' : 'school board') + ' subjects with focused, class-wise sets.';
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
      const fallback = fallbackCurricula[classNumber] || fallbackCurricula['10'];
      classSeriesStatus.hidden = true;
      renderSeries(fallback);
    }
  }

  async function loadTest(subject, set) {
    classTestResult.textContent = '';
    classQuestionList.replaceChildren();
    classTest.hidden = false;
    document.querySelector('#classTestTitle').textContent = 'Class ' + classNumber + ' · ' + subject + ' · Set ' + set;
    classTest.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let testData = null;
    try {
      const response = await classApi('/api/classes/' + classNumber + '/series/' + encodeURIComponent(subject) + '/' + set);
      if (response.ok) {
        const payload = await response.json();
        if (payload && Array.isArray(payload.questions)) {
          testData = payload;
        }
      }
    } catch (error) {
      console.warn('Backend test set fetch failed, using fallback questions:', error.message);
    }

    if (!testData) {
      testData = {
        classNumber: String(classNumber),
        subject: subject,
        set: set,
        questions: getFallbackQuestions(classNumber, subject, set)
      };
    }

    activeSeries = testData;
    startedAt = Date.now();

    testData.questions.forEach((question, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'class-question';
      const legend = document.createElement('legend');
      legend.innerHTML = '<strong>' + (index + 1) + '.</strong> ' + escapeHtml(question.text);
      fieldset.appendChild(legend);

      question.options.forEach((option, optionIndex) => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.margin = '4px 0';
        label.style.cursor = 'pointer';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'question-' + index;
        input.value = String(optionIndex);
        label.append(input, document.createTextNode(option));
        fieldset.appendChild(label);
      });
      classQuestionList.appendChild(fieldset);
    });
  }

  classTestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeSeries) return;

    const questionFields = [...classQuestionList.querySelectorAll('.class-question')];
    const selectedAnswers = questionFields.map((fieldset) => {
      const selected = fieldset.querySelector('input:checked');
      return selected ? Number(selected.value) : null;
    });

    classTestResult.textContent = 'Checking your answers...';

    let graded = null;
    try {
      const response = await classApi('/api/classes/' + classNumber + '/series/' + encodeURIComponent(activeSeries.subject) + '/' + activeSeries.set + '/results', {
        method: 'POST',
        body: JSON.stringify({
          answers: selectedAnswers,
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        })
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.attempt) graded = payload.attempt;
      }
    } catch (e) {
      console.warn('API grading offline, calculating locally:', e.message);
    }

    // Local grading fallback
    if (!graded) {
      const total = activeSeries.questions.length;
      let score = 0;
      selectedAnswers.forEach((ans, idx) => {
        const expected = activeSeries.questions[idx]?.answer;
        if (ans !== null && ans === expected) score += 1;
      });
      const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
      graded = { score: score, total: total, accuracy: accuracy };
    }

    let feedback = '';
    if (graded.accuracy === 100) feedback = 'Outstanding Performance! 🎯';
    else if (graded.accuracy >= 80) feedback = 'Excellent Accuracy! 🌟';
    else if (graded.accuracy >= 60) feedback = 'Good Progress! 📈';
    else if (graded.accuracy >= 40) feedback = 'Fair Attempt — Keep Practicing! 💡';
    else feedback = 'Consistent Effort Wins — Review & Retry 📚';

    classTestResult.textContent = feedback + ' Score: ' + graded.score + '/' + graded.total + ' (' + graded.accuracy + '% accuracy).';

    // Persist attempt locally so series card displays progress
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
        window.localStorage.setItem('preply-school-class', classNumber);
        try {
          const url = new URL(window.location);
          url.searchParams.set('class', classNumber);
          window.history.pushState({}, '', url);
        } catch (_) {}
        classTest.hidden = true;
        activeSeries = null;
        loadSeries();
      }
    }
  });

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  loadSeries();
})();