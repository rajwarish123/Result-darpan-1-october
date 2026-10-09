const pageThemeToggles = document.querySelectorAll('.theme-toggle');

// Unified API Origin resolution for Live Server (5500) and production
const pagesApiOrigin = (() => {
  if (typeof window === 'undefined') return '';
  if (window.location.protocol === 'file:') return 'http://localhost:3000';
  if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000') {
    return 'http://localhost:3000';
  }
  return '';
})();

// --- CONTACT US FORM & FADE-OUT POPUP DESK ---
const contactForm = document.getElementById('contactForm');
const contactFeedbackModal = document.getElementById('contactFeedbackModal');
const contactSubmitBtn = document.getElementById('contactSubmitBtn');
const contactFormError = document.getElementById('contactFormError');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (contactFormError) {
      contactFormError.hidden = true;
      contactFormError.textContent = '';
    }

    const name = document.getElementById('contactName')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();
    const subject = document.getElementById('contactSubject')?.value.trim() || '';
    const message = document.getElementById('contactMessage')?.value.trim() || '';

    if (!name) {
      if (contactFormError) {
        contactFormError.hidden = false;
        contactFormError.textContent = 'Please enter your name.';
      }
      document.getElementById('contactName')?.focus();
      return;
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      if (contactFormError) {
        contactFormError.hidden = false;
        contactFormError.textContent = 'Please enter a valid email address.';
      }
      document.getElementById('contactEmail')?.focus();
      return;
    }

    if (contactSubmitBtn) {
      contactSubmitBtn.disabled = true;
      contactSubmitBtn.textContent = 'Submitting...';
    }

    try {
      let sent = false;
      let failureReason = '';

      // 1. Try sending to backend API (saves to contacts.json & triggers server relay)
      try {
        const response = await fetch(`${pagesApiOrigin}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        });

        if (response.ok) {
          sent = true;
        } else {
          const data = await response.json().catch(() => ({}));
          failureReason = data.error || 'Server error';
        }
      } catch (backendErr) {
        // Backend offline or unreachable (e.g. static hosting)
        failureReason = backendErr.message;
      }

      // 2. Direct fallback to FormSubmit if backend is unavailable
      if (!sent) {
        const fsResponse = await fetch('https://formsubmit.co/ajax/rajwarish38@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            _replyto: email,
            _subject: `[Result Darpan Contact] ${subject || 'New Student Feedback'} - from ${name}`,
            _captcha: 'false',
            _template: 'table',
            message: message || '(No message provided)'
          })
        });

        const fsData = await fsResponse.json().catch(() => ({}));
        if (fsResponse.ok && (fsData.success === 'true' || fsData.success === true)) {
          sent = true;
        } else {
          throw new Error(fsData.message || failureReason || 'Failed to deliver message. Please try again.');
        }
      }

      // Reset form so user can submit again
      contactForm.reset();

      // Show pop-up "Thanks for your feedback"
      if (contactFeedbackModal) {
        contactFeedbackModal.classList.remove('fade-out');
        contactFeedbackModal.classList.add('show-active');

        // Automatically fade out after 2.5 seconds
        setTimeout(() => {
          contactFeedbackModal.classList.add('fade-out');
          setTimeout(() => {
            contactFeedbackModal.classList.remove('show-active', 'fade-out');
          }, 450);
        }, 2500);
      }
    } catch (err) {
      if (contactFormError) {
        contactFormError.hidden = false;
        contactFormError.textContent = err.message || 'Failed to deliver message. Please email us directly at rajwarish38@gmail.com.';
      }
    } finally {
      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = false;
        contactSubmitBtn.textContent = 'Submit';
      }
    }
  });

  contactFeedbackModal?.addEventListener('click', (e) => {
    if (e.target === contactFeedbackModal) {
      contactFeedbackModal.classList.add('fade-out');
      setTimeout(() => {
        contactFeedbackModal.classList.remove('show-active', 'fade-out');
      }, 350);
    }
  });
}
if (document.querySelector('#chatMessages')) {
  const communityStyles = document.createElement('link');
  communityStyles.rel = 'stylesheet';
  communityStyles.href = '/levels.css';
  document.head.appendChild(communityStyles);
  const communityScript = document.createElement('script');
  communityScript.src = '/community.js';
  document.body.appendChild(communityScript);
}
function applyPageTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark-theme', dark);
  pageThemeToggles.forEach((button) => {
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  });
  localStorage.setItem('preply-theme', theme);
}
applyPageTheme(localStorage.getItem('preply-theme') || 'light');
pageThemeToggles.forEach((button) => button.addEventListener('click', () => applyPageTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark')));

// Header navigation and mobile drawer are handled exclusively and cleanly by nav.js


const previousYearQuestions = document.querySelector('#previousYearQuestions');
const previousYearFilter = document.querySelector('#previousYearFilter');
let previousYearSubjectFilter;
let previousYearSetFilter;
let pyqSetsContainer;
let previousYearBank = [];
let activePyqSet = 'all';

const pyqSetLabels = {
  'SSC CGL': {
    1: '2024 Tier-1 Shift 1',
    2: '2024 Tier-1 Shift 2',
    3: '2023 Tier-1 Shift 1',
    4: '2023 Tier-1 Shift 2',
    5: '2022 Tier-1 Official',
    6: '2021 Tier-1 Official'
  },
  'Railway NTPC': {
    1: '2022 CBT-2 Shift 1',
    2: '2022 CBT-1 Shift 1',
    3: '2021 CBT-1 Shift 1',
    4: '2021 CBT-1 Shift 2',
    5: '2020 CBT-1 Shift 1',
    6: '2019 Practice Shift 1'
  },
  'Railway Group D': {
    1: '2022 CBT Phase-1',
    2: '2022 CBT Phase-2',
    3: '2018 Official Shift 1',
    4: '2018 Official Shift 2',
    5: '2018 Official Shift 3',
    6: '2018 Re-Exam Paper'
  }
};

function setupPreviousYearFilters() {
  if (!previousYearFilter) return;
  previousYearSubjectFilter = document.createElement('select');
  previousYearSubjectFilter.id = 'previousYearSubject';
  previousYearSubjectFilter.setAttribute('aria-label', 'Choose subject');

  previousYearSetFilter = document.createElement('select');
  previousYearSetFilter.id = 'previousYearSet';
  previousYearSetFilter.setAttribute('aria-label', 'Choose test set');

  const subjectLabel = document.createElement('label');
  subjectLabel.className = 'question-filter';
  subjectLabel.append('Subject', previousYearSubjectFilter);

  const setLabel = document.createElement('label');
  setLabel.className = 'question-filter';
  setLabel.append('Test set', previousYearSetFilter);

  previousYearFilter.closest('label')?.after(subjectLabel, setLabel);

  // Create Quick Set Switcher Pills Bar
  if (!document.querySelector('.pyq-sets-container')) {
    pyqSetsContainer = document.createElement('div');
    pyqSetsContainer.className = 'pyq-sets-container';
    pyqSetsContainer.innerHTML = `
      <div class="pyq-sets-header">
        <span class="pyq-sets-title">⚡ Previous Year Question Sets:</span>
        <span class="pyq-sets-counter" id="pyqSetCount">6 Sets Available</span>
      </div>
      <div class="pyq-sets-pill-list" id="pyqSetsPillList"></div>
    `;
    previousYearQuestions.before(pyqSetsContainer);
  }
}

function updatePreviousYearSubjects() {
  const exam = previousYearFilter?.value === 'all' ? 'SSC CGL' : (previousYearFilter?.value || 'SSC CGL');
  const subjects = ['All subjects', 'Quantitative Aptitude', 'General Intelligence', 'General Awareness', 'General Science', 'Indian Polity', 'English Comprehension'];
  previousYearSubjectFilter.innerHTML = subjects.map((sub) => `<option value="${sub}">${sub}</option>`).join('');

  const labels = pyqSetLabels[exam] || pyqSetLabels['SSC CGL'];
  let setOptions = `<option value="all">All PYQ Sets</option>`;
  for (let s = 1; s <= 6; s++) {
    setOptions += `<option value="${s}">Set ${s} · ${labels[s] || 'Previous Year Paper'}</option>`;
  }
  previousYearSetFilter.innerHTML = setOptions;
  renderPyqSetPills();
}

function renderPyqSetPills() {
  const pillList = document.querySelector('#pyqSetsPillList');
  if (!pillList) return;
  const exam = previousYearFilter?.value === 'all' ? 'SSC CGL' : (previousYearFilter?.value || 'SSC CGL');
  const labels = pyqSetLabels[exam] || pyqSetLabels['SSC CGL'];

  pillList.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `pyq-set-pill${activePyqSet === 'all' ? ' active' : ''}`;
  allBtn.textContent = '🌟 All Sets';
  allBtn.addEventListener('click', () => {
    activePyqSet = 'all';
    if (previousYearSetFilter) previousYearSetFilter.value = 'all';
    renderPyqSetPills();
    renderPreviousYearQuestions();
  });
  pillList.appendChild(allBtn);

  for (let s = 1; s <= 6; s++) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `pyq-set-pill${String(activePyqSet) === String(s) ? ' active' : ''}`;
    pill.textContent = `Set ${s} (${labels[s] ? labels[s].split(' ')[0] : 'PYQ'})`;
    pill.title = `Set ${s} · ${labels[s] || ''}`;
    pill.addEventListener('click', () => {
      activePyqSet = String(s);
      if (previousYearSetFilter) previousYearSetFilter.value = String(s);
      renderPyqSetPills();
      renderPreviousYearQuestions();
    });
    pillList.appendChild(pill);
  }
}

function loadPreviousYearSet() {
  const exam = previousYearFilter?.value || 'all';
  previousYearQuestions.innerHTML = '<p class="question-bank-status">Loading questions...</p>';
  const apiOrigin = '';
  const examParam = exam === 'all' ? '?includeAnswers=true' : `?exam=${encodeURIComponent(exam)}&includeAnswers=true`;

  fetch(`${apiOrigin}/api/previous-year-questions${examParam}`)
    .then((response) => response.json())
    .then((payload) => {
      previousYearBank = payload.questions || [];
      renderPreviousYearQuestions();
    })
    .catch(() => {
      previousYearQuestions.innerHTML = '<p class="question-bank-status">Questions could not be loaded.</p>';
    });
}

function renderPreviousYearQuestions() {
  if (!previousYearQuestions) return;
  const selectedExam = previousYearFilter?.value || 'all';
  const selectedSubject = previousYearSubjectFilter?.value || 'All subjects';
  const selectedSet = activePyqSet;

  let visibleQuestions = previousYearBank.filter((q) => selectedExam === 'all' || q.exam === selectedExam);

  if (selectedSet !== 'all') {
    visibleQuestions = visibleQuestions.filter((q) => String(q.set || 1) === String(selectedSet));
  }

  if (selectedSubject !== 'All subjects') {
    const sLower = selectedSubject.toLowerCase();
    visibleQuestions = visibleQuestions.filter((q) => {
      const topLower = String(q.topic || '').toLowerCase();
      return topLower.includes(sLower) || sLower.includes(topLower);
    });
  }

  previousYearQuestions.innerHTML = '';

  // Current set summary banner
  const banner = document.createElement('div');
  banner.className = 'pyq-current-set-banner';
  banner.style.gridColumn = '1 / -1';
  const examText = selectedExam === 'all' ? 'All Competitive Exams' : selectedExam;
  const setText = selectedSet === 'all' ? 'All Previous Year Sets' : `Set ${selectedSet} Practice Paper`;
  banner.innerHTML = `
    <span>📋 <strong>${examText}</strong> · ${setText}</span>
    <span style="font-size:12px; font-weight:600; opacity:0.9;">${visibleQuestions.length} questions available</span>
  `;
  previousYearQuestions.appendChild(banner);

  if (!visibleQuestions.length) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'question-bank-status';
    emptyMsg.textContent = 'No questions found for the selected exam, set, or subject filter.';
    previousYearQuestions.appendChild(emptyMsg);
    return;
  }

  visibleQuestions.forEach((question, index) => {
    const card = document.createElement('article');
    card.className = 'question-bank-card';

    const cardTop = document.createElement('div');
    cardTop.className = 'pyq-card-top';

    const meta = document.createElement('span');
    meta.className = 'question-bank-meta';
    meta.textContent = `${question.exam} · ${question.year}`;

    const setBadge = document.createElement('span');
    setBadge.className = 'pyq-card-set-badge';
    setBadge.textContent = `Set ${question.set || 1}`;

    cardTop.append(meta, setBadge);

    const heading = document.createElement('h3');
    heading.textContent = `${index + 1}. ${question.topic}`;

    const prompt = document.createElement('p');
    prompt.textContent = question.text;

    const options = document.createElement('div');
    options.className = 'question-bank-options';
    question.options.forEach((option, optionIndex) => {
      const optionRow = document.createElement('span');
      optionRow.textContent = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
      options.appendChild(optionRow);
    });

    const answer = document.createElement('button');
    answer.className = 'question-answer-button';
    answer.type = 'button';
    answer.textContent = 'Show answer';
    answer.addEventListener('click', () => {
      answer.textContent = `✓ Answer: ${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}`;
      answer.style.background = '#27ae60';
      answer.disabled = true;
      if (window.RDGameEngine) {
        window.RDGameEngine.SoundFX.correct();
        window.RDGameEngine.addXP(10, 'pyq', answer);
      }
    });

    const source = document.createElement('a');
    source.className = 'question-source-link';
    source.href = question.sourceUrl || '#';
    source.target = '_blank';
    source.rel = 'noreferrer';
    source.textContent = 'View paper source ↗';

    card.append(cardTop, heading, prompt, options, answer, source);
    previousYearQuestions.appendChild(card);
  });
}

if (previousYearQuestions) {
  setupPreviousYearFilters();
  updatePreviousYearSubjects();
  previousYearFilter?.addEventListener('change', () => {
    updatePreviousYearSubjects();
    loadPreviousYearSet();
  });
  previousYearSubjectFilter?.addEventListener('change', renderPreviousYearQuestions);
  previousYearSetFilter?.addEventListener('change', (e) => {
    activePyqSet = e.target.value;
    renderPyqSetPills();
    renderPreviousYearQuestions();
  });
  loadPreviousYearSet();
}

const profileName = document.querySelector('#profileName');
const profileLabel = document.querySelector('#profileExamLabel');
let savedExam = localStorage.getItem('preply-profile-exam') || 'SSC CGL';
let savedLocation = localStorage.getItem('preply-profile-location') || 'India';
const isAuthenticated = Boolean(localStorage.getItem('preply-session-token'));
const genderLabel = document.querySelector('#settingsLearnerType')?.parentElement;
if (genderLabel?.firstChild) genderLabel.firstChild.nodeValue = 'What is your gender?';

function renderProfileGoals(goals) {
  const list = document.querySelector('#goalList');
  if (!list) return;

  let activeGoals = Array.isArray(goals) && goals.length > 0 ? goals : [];
  if (!activeGoals.length) {
    const stored = window.localStorage.getItem('preply-user-goals');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeGoals = parsed.map((g, idx) => (typeof g === 'string' ? { id: `goal-${idx}`, name: g } : g));
        }
      } catch (_) {}
    }
  }

  if (!activeGoals.length) {
    activeGoals = [
      { id: 'ssc-cgl', name: 'SSC CGL Tier-I' },
      { id: 'rrb-ntpc', name: 'RRB NTPC' }
    ];
  }

  list.replaceChildren();
  activeGoals.forEach((goal) => {
    const item = document.createElement('div');
    item.className = 'goal-item';
    const icon = document.createElement('span');
    icon.className = 'goal-icon mint-icon';
    icon.textContent = goal.name.slice(0, 1).toUpperCase();
    const detail = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = goal.name;
    const note = document.createElement('span');
    note.textContent = 'Mock Practice Available';
    detail.append(name, note);
    const remove = document.createElement('button');
    remove.className = 'icon-button';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${goal.name}`);
    remove.addEventListener('click', async () => {
      const stored = window.localStorage.getItem('preply-user-goals');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((g) => (typeof g === 'string' ? g : g.name) !== goal.name);
          window.localStorage.setItem('preply-user-goals', JSON.stringify(filtered));
        } catch (_) {}
      }
      if (goal.id && localStorage.getItem('preply-session-token')) {
        try {
          await profileRequest(`/api/profile/me/goals/${encodeURIComponent(goal.id)}`, { method: 'DELETE' });
        } catch (_) {}
      }
      loadAccountProfile();
    });
    item.append(icon, detail, remove);
    list.appendChild(item);
  });
}

async function profileRequest(endpoint, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${localStorage.getItem('preply-session-token') || ''}` };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Profile request failed.');
  return payload;
}

async function loadAccountProfile() {
  if (!profileName) return;
  const token = localStorage.getItem('preply-session-token');
  const savedName = localStorage.getItem('preply-profile-name');

  const avatar = document.querySelector('.profile-avatar');
  const activityLabel = document.querySelector('.profile-progress .progress-label span');
  const activityBar = document.querySelector('.profile-progress .progress-track span');
  const streak = document.querySelector('.streak-pill');
  const metrics = document.querySelectorAll('.profile-metrics strong');

  // If user is NOT logged in: show clean unauthenticated student profile state with NO dummy data
  if (!token) {
    profileName.textContent = 'Student Account';
    if (profileLabel) profileLabel.textContent = 'Sign in or take a test to personalize your desk';
    if (avatar) avatar.textContent = 'RD';
    if (activityLabel) activityLabel.textContent = '0 of 7 days';
    if (activityBar) activityBar.style.width = '0%';
    if (streak) streak.textContent = '0 day streak';
    if (metrics[0]) metrics[0].textContent = '0';
    if (metrics[1]) metrics[1].textContent = '—';
    if (metrics[2]) metrics[2].textContent = '0h';
    renderProfileGoals();
    return;
  }

  profileName.textContent = savedName || 'Student Account';
  renderProfileGoals();

  try {
    const payload = await profileRequest('/api/profile/me');

    const user = payload.user;
    profileName.textContent = user.name;
    const classSuffix = user.schoolClass && !new RegExp(`\\bclass\\s*${user.schoolClass}\\b`, 'i').test(user.exam) ? ` · School Class ${user.schoolClass}` : '';
    if (profileLabel) profileLabel.textContent = `${user.exam} · ${user.location}${classSuffix}`;
    if (user.guestId) {
      let guestLabel = document.querySelector('#guestUserId');
      if (!guestLabel) {
        guestLabel = document.createElement('small');
        guestLabel.id = 'guestUserId';
        profileLabel.insertAdjacentElement('afterend', guestLabel);
      }
      guestLabel.textContent = `Guest ID: ${user.guestId}`;
    }
    if (avatar) avatar.textContent = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    const activeDates = new Set((payload.stats.testAttempts || []).filter((attempt) => Date.now() - Date.parse(attempt.createdAt) < 7 * 86400000).map((attempt) => new Date(attempt.createdAt).toDateString()));
    if (activityLabel) activityLabel.textContent = `${activeDates.size} of 7 days`;
    if (activityBar) activityBar.style.width = `${Math.round((activeDates.size / 7) * 100)}%`;
    if (streak) streak.textContent = `${activeDates.size} active days this week`;
    localStorage.setItem('preply-profile-name', user.name);
    localStorage.setItem('preply-profile-exam', user.exam);
    localStorage.setItem('preply-profile-location', user.location);
    savedExam = user.exam;
    savedLocation = user.location;
    const researchTag = document.querySelector('#researchTag');
    const researchText = document.querySelector('#researchText');
    if (researchTag) researchTag.textContent = user.exam.toUpperCase();
    if (researchText) researchText.textContent = `Your ${user.exam} feed is ready. Review practice sets selected for your preparation.`;
    renderProfileGoals(user.goals);
    const messageMetric = document.querySelector('#profileMessagesSent');
    if (messageMetric) messageMetric.textContent = payload.stats?.messagesSent || 0;
    if (metrics[0]) metrics[0].textContent = payload.stats?.testsTaken || 0;
    if (metrics[1]) metrics[1].textContent = `${payload.stats?.averageAccuracy || 0}%`;
    if (metrics[2]) metrics[2].textContent = formatStudyTime(payload.stats?.studyTimeMinutes || 0);
    const accuracyLabel = document.querySelectorAll('.profile-metrics span')[1];
    if (accuracyLabel) accuracyLabel.textContent = 'Average accuracy';
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Invalid token') || error.message.includes('expired')) {
      localStorage.removeItem('preply-authenticated');
      localStorage.removeItem('preply-account-email');
      localStorage.removeItem('preply-session-token');
      localStorage.removeItem('preply-profile-name');
      localStorage.removeItem('preply-profile-exam');
      localStorage.removeItem('preply-profile-location');
      if (profileName) profileName.textContent = 'Student Account';
      if (profileLabel) profileLabel.textContent = 'Sign in or take a test to personalize your desk';
    } else {
      if (savedName) profileName.textContent = savedName;
    }
    console.warn('Profile load info:', error.message);
  }
}
loadAccountProfile();
window.addEventListener('profile-goals-updated', loadAccountProfile);

function formatStudyTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

document.querySelector('#profileSettings')?.addEventListener('click', () => {
  document.querySelector('#settingsName').value = profileName?.textContent !== 'Student Account' ? (profileName?.textContent || '') : '';
  document.querySelector('#settingsExam').value = savedExam;
  document.querySelector('#settingsLocation').value = savedLocation;
  document.querySelector('#settingsModal').classList.add('visible');
});

function updateLiveProfile(stats) {
  const metrics = document.querySelectorAll('.profile-metrics strong');
  if (metrics[0]) metrics[0].textContent = stats.testsTaken;
  if (metrics[1]) metrics[1].textContent = `${stats.averageAccuracy}%`;
  if (metrics[2]) metrics[2].textContent = formatStudyTime(stats.studyTimeMinutes);
  const accuracyLabel = document.querySelectorAll('.profile-metrics span')[1];
  if (accuracyLabel) accuracyLabel.textContent = 'Average accuracy';
}

function receiveProfileUpdate(update) {
  if (update?.email === localStorage.getItem('preply-account-email') && localStorage.getItem('preply-session-token')) {
    updateLiveProfile(update.stats);
  }
}

if (typeof BroadcastChannel !== 'undefined') {
  const profileChannel = new BroadcastChannel('result-darpan-profile');
  profileChannel.addEventListener('message', (event) => receiveProfileUpdate(event.data));
}
window.addEventListener('storage', (event) => {
  if (event.key !== 'preply-profile-stats-update' || !event.newValue) return;
  try { receiveProfileUpdate(JSON.parse(event.newValue)); } catch (error) { console.warn('Profile update could not be read:', error.message); }
});

function savePageProfile() {
  const name = document.querySelector('#settingsName').value.trim();
  const exam = document.querySelector('#settingsExam').value.trim();
  const location = document.querySelector('#settingsLocation').value.trim();
  profileRequest('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ name, exam, location }) })
    .then(() => {
      localStorage.setItem('preply-profile-name', name);
      localStorage.setItem('preply-profile-exam', exam);
      localStorage.setItem('preply-profile-location', location);
      if (profileName) profileName.textContent = name;
      if (profileLabel) profileLabel.textContent = `${exam} · ${location}`;
      document.querySelector('#settingsModal')?.classList.remove('visible');
    })
    .catch((error) => window.alert(error.message));
}


document.querySelector('#settingsClose')?.addEventListener('click', () => document.querySelector('#settingsModal').classList.remove('visible'));
document.querySelector('#settingsForm')?.addEventListener('submit', (event) => { event.preventDefault(); savePageProfile(); });
document.querySelector('#newQuote')?.addEventListener('click', () => {
  const quotes = [
    '“Consistency is a quiet superpower. Show up for one more question.”',
    '“You do not need a perfect day. You need one honest practice session.”',
    '“The score follows the habit. Protect your habit today.”',
    '“One solved question is one less question standing between you and your goal.”',
    '“Your future result is built in ordinary minutes like this one.”',
    '“Accuracy beats speed initially; speed is the natural byproduct of repeated accuracy.”',
    '“Every error analyzed in your mock test is a mark earned in the final examination.”',
    '“Disciplined question selection and negative-mark avoidance separate qualifiers from toppers.”'
  ];
  const quote = document.querySelector('#motivationQuote');
  quote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
});
document.querySelector('#researchRefresh')?.addEventListener('click', () => {
  const updates = [
    'Arithmetic & DI contribute over 60% of Quant weightage. Focus on rapid conversions and ratio shortcuts.',
    'Timed syllogism and series puzzles deliver the fastest score leap. Aim for 20 questions in under 12 minutes.',
    'Revision cycles work best in 24h, 3-day, and 7-day intervals. Short daily reviews outperform weekend cramming.',
    'Keep an error log. Re-attempt every question you missed yesterday before beginning a new chapter.',
    'Static GK questions follow cyclical trends. Review previous 5-year question papers for high-frequency patterns.'
  ];
  document.querySelector('#researchText').textContent = `${savedExam}: ${updates[Math.floor(Math.random() * updates.length)]}`;
});

document.querySelector('#resourceNotify')?.addEventListener('click', () => {
  localStorage.setItem('preply-resource-notifications', 'on');
  document.querySelector('#resourceNotice').hidden = false;
});

// --- RESILIENT STUDY MATERIALS & REVISION NOTES SYSTEM ---
const fallbackStudyMaterials = [
  {
    id: "mat-1",
    title: "Quantitative Aptitude Formula Sheet & Quick Shortcuts",
    exam: "SSC / Banking / Railways",
    subject: "Mathematics",
    fileType: "PDF",
    fileSize: "3.8 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#math-formulas",
    description: "Essential formulas for Percentages, Profit & Loss, Time & Work, Algebra identities, Mensuration 2D/3D, and Trigonometry tables.",
    createdAt: "2026-10-01T20:00:00.000Z"
  },
  {
    id: "mat-2",
    title: "Indian Constitution Key Articles & Landmark Judgements",
    exam: "UPSC / SSC / State PCS",
    subject: "Indian Polity",
    fileType: "PDF",
    fileSize: "2.5 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#polity-notes",
    description: "Quick revision notes on Fundamental Rights, DPSP, Parliament procedures, Constitutional Amendments, and the Basic Structure Doctrine.",
    createdAt: "2026-10-01T20:00:00.000Z"
  },
  {
    id: "mat-3",
    title: "High-Yield English Vocabulary & Grammar Rules Checklist",
    exam: "SSC CGL / CHSL / Banking",
    subject: "English",
    fileType: "PDF",
    fileSize: "1.9 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#english-rules",
    description: "100 Most Repeated Idioms & Phrases, One-Word Substitutions, Subject-Verb Agreement rules, and preposition exceptions.",
    createdAt: "2026-10-01T20:00:00.000Z"
  },
  {
    id: "mat-4",
    title: "General Science High-Yield Handout (Physics, Chemistry & Biology)",
    exam: "Railways RRB / SSC / State Exams",
    subject: "General Science",
    fileType: "PDF",
    fileSize: "4.2 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#general-science",
    description: "Complete breakdown of SI units, human anatomy, diseases & vitamins, chemical reactions, periodic table trends, and everyday scientific laws.",
    createdAt: "2026-10-02T10:00:00.000Z"
  },
  {
    id: "mat-5",
    title: "Logical & Analytical Reasoning Mastery Cheat Sheet",
    exam: "Banking IBPS / SBI / SSC / Railways",
    subject: "Reasoning",
    fileType: "PDF",
    fileSize: "2.8 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#reasoning-shortcuts",
    description: "Shortcuts and deduction matrices for Syllogisms, Blood Relations, Seating Arrangements, Coding-Decoding, and Direction Sense.",
    createdAt: "2026-10-02T11:00:00.000Z"
  },
  {
    id: "mat-6",
    title: "NCERT Class 9-12 Science & Mathematics Concept Compendium",
    exam: "School Boards / CBSE / ICSE",
    subject: "School Classes",
    fileType: "PDF",
    fileSize: "5.1 MB",
    downloadUrl: "https://resultdarpan.com/resources.html#ncert-concepts",
    description: "Chapter-wise quick revision summaries and formula reference sheets for Class 9, 10, 11, and 12 STEM curricula.",
    createdAt: "2026-10-02T12:00:00.000Z"
  }
];

let allMaterialsList = [];
let activeMaterialSubject = 'all';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showMatToast(msg) {
  const toast = document.getElementById('matToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function shareMaterial(id, title) {
  const cleanUrl = `${window.location.origin}${window.location.pathname}#mat-${id}`;
  if (navigator.share) {
    navigator.share({
      title: `${title} | Result Darpan`,
      text: `Download free study notes: ${title} on Result Darpan`,
      url: cleanUrl
    }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(cleanUrl).then(() => {
      showMatToast('Resource link copied to clipboard!');
    }).catch(() => {
      prompt('Copy study resource link:', cleanUrl);
    });
  } else {
    prompt('Copy study resource link:', cleanUrl);
  }
}

function renderMaterials() {
  const grid = document.getElementById('publicMaterialsGrid');
  const countLabel = document.getElementById('materialsCountLabel');
  if (!grid) return;

  const searchTerm = (document.getElementById('materialsSearchInput')?.value || '').toLowerCase().trim();

  const filtered = allMaterialsList.filter((m) => {
    if (activeMaterialSubject !== 'all') {
      const subj = String(m.subject || '').toLowerCase();
      const exam = String(m.exam || '').toLowerCase();
      const target = activeMaterialSubject.toLowerCase();
      if (!subj.includes(target) && !exam.includes(target)) {
        return false;
      }
    }
    if (searchTerm) {
      const matchTitle = String(m.title || '').toLowerCase().includes(searchTerm);
      const matchDesc = String(m.description || '').toLowerCase().includes(searchTerm);
      const matchSubj = String(m.subject || '').toLowerCase().includes(searchTerm);
      const matchExam = String(m.exam || '').toLowerCase().includes(searchTerm);
      if (!matchTitle && !matchDesc && !matchSubj && !matchExam) return false;
    }
    return true;
  });

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} of ${allMaterialsList.length} notes & sheets`;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="cms-card" style="grid-column:1/-1; text-align:center; padding:36px 20px;">
        <p class="muted" style="margin:0 0 14px; font-size:15px;">No study materials found matching your search. Try another subject keyword or clear your filter.</p>
        <button type="button" class="outline-btn" id="btnClearMatSearch">Clear search &amp; view all</button>
      </div>
    `;
    document.getElementById('btnClearMatSearch')?.addEventListener('click', () => {
      const inp = document.getElementById('materialsSearchInput');
      if (inp) inp.value = '';
      document.querySelectorAll('.mat-chip').forEach(c => c.classList.remove('active'));
      document.querySelector('.mat-chip[data-subject="all"]')?.classList.add('active');
      activeMaterialSubject = 'all';
      renderMaterials();
    });
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((m) => {
    const card = document.createElement('article');
    card.className = 'cms-card mat-card';
    card.id = `mat-${m.id}`;

    let downloadUrl = m.downloadUrl || '#';
    let isAnchorOrBlank = !downloadUrl || downloadUrl === '#' || downloadUrl.startsWith('#');
    let downloadAttr = (downloadUrl.startsWith('http') && !downloadUrl.endsWith('.pdf')) ? '' : `download="${escapeHtml(m.title)}.pdf"`;

    card.innerHTML = `
      <div>
        <div class="cms-card-top" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="badge filetype-badge">${escapeHtml(m.fileType || 'PDF')}</span>
            <span class="mat-badge-sub">${escapeHtml(m.subject || 'General')}</span>
          </div>
          <span class="muted cms-card-readtime" style="font-size:12px; font-weight:600;">📦 ${escapeHtml(m.fileSize || '2 MB')}</span>
        </div>
        <h3 class="cms-card-title">${escapeHtml(m.title)}</h3>
        <p class="cms-card-tag" style="margin-bottom:6px;">🎯 Target: ${escapeHtml(m.exam || 'All Exams')}</p>
        ${m.description ? `<p class="cms-card-description">${escapeHtml(m.description)}</p>` : ''}
      </div>
      <div class="mat-card-footer">
        <a href="${escapeHtml(downloadUrl)}" ${isAnchorOrBlank ? '' : 'target="_blank" rel="noopener"'} class="primary-btn download-material-btn" ${downloadAttr} style="flex:1; justify-content:center; text-align:center;">
          Download Resource <span>📥</span>
        </a>
        <button type="button" class="btn-share-mat" data-id="${escapeHtml(m.id)}" data-title="${escapeHtml(m.title)}" title="Share study note link">
          🔗
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach share event listeners
  grid.querySelectorAll('.btn-share-mat').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      shareMaterial(id, title);
    });
  });
}

function checkUrlForMaterial() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#mat-')) {
    const el = document.querySelector(hash);
    if (el) {
      el.classList.add('mat-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.classList.remove('mat-highlight'), 3000);
      return;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const subj = params.get('subject');
  if (subj) {
    const matchingChip = document.querySelector(`.mat-chip[data-subject="${subj.toLowerCase()}"]`);
    if (matchingChip) {
      document.querySelectorAll('.mat-chip').forEach(c => c.classList.remove('active'));
      matchingChip.classList.add('active');
      activeMaterialSubject = subj.toLowerCase();
      renderMaterials();
    }
  }
  const q = params.get('search') || params.get('q');
  if (q) {
    const inp = document.getElementById('materialsSearchInput');
    if (inp) {
      inp.value = q;
      renderMaterials();
    }
  }
  const id = params.get('id');
  if (id) {
    const el = document.getElementById(`mat-${id}`);
    if (el) {
      el.classList.add('mat-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.classList.remove('mat-highlight'), 3000);
    }
  }
}

async function loadPublicMaterials() {
  const grid = document.getElementById('publicMaterialsGrid');
  if (!grid) return;

  // 1. Instant render from local cache
  let cached = null;
  try {
    const raw = localStorage.getItem('rd-cached-study-materials');
    if (raw) cached = JSON.parse(raw);
  } catch (_) {}

  if (Array.isArray(cached) && cached.length) {
    allMaterialsList = cached;
    renderMaterials();
  }

  // 2. Fetch fresh from API
  try {
    const res = await fetch(`${pagesApiOrigin}/api/study-materials`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.materials) && data.materials.length) {
        allMaterialsList = data.materials;
        try {
          localStorage.setItem('rd-cached-study-materials', JSON.stringify(data.materials));
        } catch (_) {}
        renderMaterials();
        checkUrlForMaterial();
        return;
      }
    }
  } catch (err) {
    console.warn('Backend study-materials fetch error, using resilient fallback:', err.message);
  }

  // 3. Fallback to pre-seeded bank if empty or error
  if (!allMaterialsList.length) {
    allMaterialsList = fallbackStudyMaterials;
    renderMaterials();
  }
  checkUrlForMaterial();
}

// Bind search and filter chips on resources page
if (document.getElementById('publicMaterialsGrid')) {
  let searchDebounce = null;
  document.getElementById('materialsSearchInput')?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      renderMaterials();
    }, 150);
  });

  document.querySelectorAll('.mat-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.mat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeMaterialSubject = chip.dataset.subject || 'all';
      renderMaterials();
    });
  });

  loadPublicMaterials();
}

const chatForm = document.querySelector('#chatForm');
const chatInput = document.querySelector('#chatInput');
const chatMessages = document.querySelector('#chatMessages');
const chatLockNotice = document.querySelector('#chatLockNotice');
const lockKey = 'preply-chat-locked-until';
const abusiveWords = ['abuseword', 'idiot', 'stupid', 'shut up', ' hate ', 'kill yourself'];
function applyChatPageLock() {
  const until = Number(localStorage.getItem(lockKey) || 0);
  const locked = until > Date.now();
  if (chatInput) chatInput.disabled = locked;
  if (chatForm) chatForm.querySelector('button').disabled = locked;
  if (chatLockNotice) {
    chatLockNotice.hidden = !locked;
    if (locked) chatLockNotice.textContent = `Chat access is paused for ${Math.ceil((until - Date.now()) / 86400000)} days because abusive language was detected.`;
  }
}
applyChatPageLock();
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

function appendChatMessage(message) {
  const existingMessage = message.id && chatMessages.querySelector(`[data-chat-message-id="${message.id}"]`);
  if (existingMessage) {
    if (message.isOwnMessage) existingMessage.querySelector('.chat-helpful')?.remove();
    return;
  }
  const row = document.createElement('div');
  const isStudent = message.author === 'student';
  const isAi = message.topperName?.includes('AI') || message.author === 'ai' || (!isStudent && message.topperName === 'Result Darpan AI Mentor ✦');
  row.className = `chat-message ${isStudent ? 'student' : 'topper'}`;
  if (message.id) row.dataset.chatMessageId = message.id;
  const authorName = message.topperName || (isStudent ? 'You' : 'Result Darpan AI Mentor ✦');
  const initials = isAi ? '✦' : (isStudent ? 'AS' : (authorName.split(/[\s·]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'TR'));
  const avatarClass = isAi ? 'chat-avatar ai-avatar' : (isStudent ? 'chat-avatar you-avatar' : 'chat-avatar');
  const authorBadge = isAi ? '<span class="ai-badge">AI 24/7</span>' : '';

  row.innerHTML = isStudent
    ? '<div><b>You</b><p></p></div><span class="chat-avatar you-avatar">AS</span>'
    : `<span class="${avatarClass}" style="${isAi ? '' : 'background:#135335; color:#fff;'}">${initials}</span><div><b style="color:#135335;">${authorName}${authorBadge}</b><p></p></div>`;
  row.querySelector('p').textContent = message.text;
  if (isStudent && message.id && !message.isOwnMessage) {
    const helpfulButton = document.createElement('button');
    helpfulButton.type = 'button';
    helpfulButton.className = `chat-helpful${message.hasVoted ? ' voted' : ''}`;
    helpfulButton.dataset.messageId = message.id;
    helpfulButton.textContent = `Helpful · ${message.helpfulCount || 0}`;
    helpfulButton.disabled = Boolean(message.hasVoted);
    row.querySelector('div').appendChild(helpfulButton);
  }
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatMessages) {
  const token = localStorage.getItem('preply-session-token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  fetch(`${pagesApiOrigin}/api/chat/messages`, { headers })
    .then((response) => response.json())
    .then((payload) => {
      chatMessages.replaceChildren();
      (payload.messages || []).forEach(appendChatMessage);
    })
    .catch((error) => console.warn('Chat history could not be loaded:', error.message));
  const chatStream = new EventSource(`${pagesApiOrigin}/api/chat/stream`);
  chatStream.addEventListener('message', (event) => {
    removeChatTyping();
    appendChatMessage(JSON.parse(event.data));
  });
  chatStream.addEventListener('helpful-updated', (event) => {
    const update = JSON.parse(event.data);
    const button = chatMessages.querySelector(`[data-message-id="${update.messageId}"]`);
    if (button) button.textContent = `Helpful · ${update.helpfulCount}`;
    window.dispatchEvent(new Event('gamification-refresh'));
  });

  async function submitChatMessage(customText) {
    const message = (typeof customText === 'string' ? customText : (chatInput ? chatInput.value : '')).trim();
    if (!message || Number(localStorage.getItem(lockKey) || 0) > Date.now()) return;

    if (abusiveWords.some((word) => ` ${message.toLowerCase()} `.includes(word))) {
      localStorage.setItem(lockKey, String(Date.now() + 7 * 86400000));
      applyChatPageLock();
      return;
    }

    showChatTyping();
    try {
      const response = await fetch(`${pagesApiOrigin}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('preply-session-token') || ''}`
        },
        body: JSON.stringify({
          text: message,
          author: 'student'
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Message could not be sent.');

      appendChatMessage(payload.message);
      if (payload.aiReply) {
        appendChatMessage(payload.aiReply);
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
        submitChatMessage(prompt);
      }
    });
  });

  chatForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitChatMessage();
  });
}