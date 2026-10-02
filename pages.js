const pageThemeToggles = document.querySelectorAll('.theme-toggle');

// Unified API Origin resolution for Live Server (5500) and production
const pagesApiOrigin = (window.location.protocol === 'file:' || window.location.port === '5500')
  ? 'http://localhost:3000'
  : '';

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
      const response = await fetch(`${pagesApiOrigin}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to deliver message. Please try again.');
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
        contactFormError.textContent = err.message;
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

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
mainNav?.querySelectorAll(':scope > a').forEach((link) => {
  if (link.textContent.trim().toLowerCase() === 'admin dashboard') link.remove();
});
mainNav?.querySelectorAll(':scope > a').forEach((link) => {
  if (link.textContent.trim().toLowerCase() === 'contact us') link.remove();
});
const keepNavLabels = new Set(['my profile', 'about us', 'test series', 'previous year questions', 'chat with mentor']);
if (mainNav && !mainNav.querySelector('.more-menu')) {
  const existingNavLabels = new Set([...mainNav.querySelectorAll(':scope > a')].map((link) => link.textContent.replace('↗', '').trim().toLowerCase()));
  [['About us', 'contact.html']].forEach(([label, href]) => {
    if (!existingNavLabels.has(label.toLowerCase())) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      mainNav.appendChild(link);
    }
  });
  if (!mainNav.querySelector('a[href="previous-year-questions.html"]')) {
    const link = document.createElement('a');
    link.href = 'previous-year-questions.html';
    link.textContent = 'Previous year questions';
    mainNav.appendChild(link);
  }
  const movedNavLinks = [...mainNav.querySelectorAll(':scope > a')].filter((link) => !keepNavLabels.has(link.textContent.replace('↗', '').trim().toLowerCase()));
  if (movedNavLinks.length) {
    const moreMenu = document.createElement('div');
    moreMenu.className = 'more-menu';
    moreMenu.innerHTML = '<button class="more-toggle" type="button" aria-expanded="false">More <span>⌄</span></button><div class="more-dropdown"></div>';
    const dropdown = moreMenu.querySelector('.more-dropdown');
    movedNavLinks.forEach((link) => dropdown.appendChild(link));
    mainNav.appendChild(moreMenu);
    const toggle = moreMenu.querySelector('.more-toggle');
    const closeMore = () => { moreMenu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', (event) => { event.stopPropagation(); const open = moreMenu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    dropdown.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMore));
    document.addEventListener('click', (event) => { if (!moreMenu.contains(event.target)) closeMore(); });
  }
}
menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '×' : '☰';
});

document.addEventListener('click', (e) => {
  if (mainNav && mainNav.classList.contains('open') && !mainNav.contains(e.target) && !menuToggle?.contains(e.target)) {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.textContent = '☰';
  }
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuToggle) menuToggle.textContent = '☰';
  });
});

const previousYearQuestions = document.querySelector('#previousYearQuestions');
const previousYearFilter = document.querySelector('#previousYearFilter');
let previousYearSubjectFilter;
let previousYearSetFilter;
let previousYearBank = [];

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
}

function updatePreviousYearSubjects() {
  const exam = previousYearFilter?.value === 'all' ? 'SSC CGL' : (previousYearFilter?.value || 'SSC CGL');
  const subjects = exam === 'SSC CGL' ? ['English', 'Hindi', 'Mathematics', 'Reasoning', 'General Awareness', 'Indian Polity'] : ['Mathematics', 'Hindi', 'Reasoning', 'General Awareness', 'General Science', 'Indian Polity'];
  previousYearSubjectFilter.innerHTML = subjects.map((subject) => `<option value="${subject}">${subject}</option>`).join('');
  previousYearSetFilter.innerHTML = `<option value="curated" selected>Official Curated PYQs</option>` + Array.from({ length: 50 }, (_, index) => `<option value="${index + 1}">Practice Set ${index + 1}</option>`).join('');
}

function loadPreviousYearSet() {
  const exam = previousYearFilter?.value || 'SSC CGL';
  const subject = previousYearSubjectFilter?.value || 'English';
  const set = previousYearSetFilter?.value || 'curated';
  previousYearQuestions.innerHTML = '<p class="question-bank-status">Loading questions...</p>';
  const apiOrigin = '';

  if (set === 'curated') {
    const examParam = exam === 'all' ? '?includeAnswers=true' : `?exam=${encodeURIComponent(exam)}&includeAnswers=true`;
    fetch(`${apiOrigin}/api/previous-year-questions${examParam}`)
      .then((response) => response.json())
      .then((payload) => { previousYearBank = payload.questions || []; renderPreviousYearQuestions(); })
      .catch(() => { previousYearQuestions.innerHTML = '<p class="question-bank-status">Questions could not be loaded.</p>'; });
    return;
  }

  fetch(`${apiOrigin}/api/question-sets?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&set=${set}&includeAnswers=true`)
    .then((response) => response.json())
    .then((payload) => { previousYearBank = payload.questions || []; renderPreviousYearQuestions(); })
    .catch(() => { previousYearQuestions.innerHTML = '<p class="question-bank-status">Questions could not be loaded.</p>'; });
}

function renderPreviousYearQuestions() {
  if (!previousYearQuestions) return;
  const selectedExam = previousYearFilter?.value || 'all';
  const visibleQuestions = previousYearBank.filter((question) => selectedExam === 'all' || question.exam === selectedExam);
  previousYearQuestions.innerHTML = '';

  if (!visibleQuestions.length) {
    previousYearQuestions.innerHTML = '<p class="question-bank-status">No questions found for this exam.</p>';
    return;
  }

  visibleQuestions.forEach((question, index) => {
    const card = document.createElement('article');
    card.className = 'question-bank-card';
    const meta = document.createElement('span');
    meta.className = 'question-bank-meta';
    meta.textContent = `${question.exam} · ${question.year}`;
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
      answer.textContent = `Answer: ${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}`;
      answer.disabled = true;
    });
    const source = document.createElement('a');
    source.className = 'question-source-link';
    source.href = question.sourceUrl;
    source.target = '_blank';
    source.rel = 'noreferrer';
    source.textContent = 'View paper source';
    card.append(meta, heading, prompt, options, answer, source);
    previousYearQuestions.appendChild(card);
  });
}

if (previousYearQuestions) {
  setupPreviousYearFilters();
  updatePreviousYearSubjects();
  previousYearFilter?.addEventListener('change', () => { updatePreviousYearSubjects(); loadPreviousYearSet(); });
  previousYearSubjectFilter?.addEventListener('change', loadPreviousYearSet);
  previousYearSetFilter?.addEventListener('change', loadPreviousYearSet);
  loadPreviousYearSet();
}

const profileName = document.querySelector('#profileName');
const profileLabel = document.querySelector('#profileExamLabel');
let savedExam = localStorage.getItem('preply-profile-exam') || 'SSC CGL';
let savedLocation = localStorage.getItem('preply-profile-location') || 'India';
const isAuthenticated = Boolean(localStorage.getItem('preply-session-token'));
const genderLabel = document.querySelector('#settingsLearnerType')?.parentElement;
if (genderLabel?.firstChild) genderLabel.firstChild.nodeValue = 'What is your gender?';

function renderProfileGoals(goals = []) {
  const list = document.querySelector('#goalList');
  if (!list) return;
  list.replaceChildren();
  if (!goals.length) {
    const empty = document.createElement('p');
    empty.className = 'goal-empty';
    empty.textContent = 'No goals yet. Add one to personalise your prep desk.';
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
    const remove = document.createElement('button');
    remove.className = 'icon-button';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${goal.name}`);
    remove.addEventListener('click', async () => {
      await profileRequest(`/api/profile/me/goals/${encodeURIComponent(goal.id)}`, { method: 'DELETE' });
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
  profileName.textContent = localStorage.getItem('preply-session-token') ? 'Loading profile...' : 'Your profile';
  renderProfileGoals();
  const metrics = document.querySelectorAll('.profile-metrics strong');
  if (metrics[0]) metrics[0].textContent = '0';
  if (metrics[1]) metrics[1].textContent = '0%';
  if (metrics[2]) metrics[2].textContent = '0m';
  const avatar = document.querySelector('.profile-avatar');
  const activityLabel = document.querySelector('.profile-progress .progress-label span');
  const activityBar = document.querySelector('.profile-progress .progress-track span');
  const streak = document.querySelector('.streak-pill');
  if (avatar && !localStorage.getItem('preply-session-token')) avatar.textContent = '?';
  if (activityLabel) activityLabel.textContent = '0 of 7 days';
  if (activityBar) activityBar.style.width = '0%';
  if (streak) streak.textContent = '0 active days this week';
  if (!localStorage.getItem('preply-session-token')) {
    try {
      const guestRes = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: localStorage.getItem('preply-profile-name') || 'Aarav Sharma',
          exam: localStorage.getItem('preply-profile-exam') || 'SSC CGL',
          location: localStorage.getItem('preply-profile-location') || 'India',
          schoolClass: localStorage.getItem('preply-school-class') || ''
        })
      });
      if (guestRes.ok) {
        const guestData = await guestRes.json();
        localStorage.setItem('preply-session-token', guestData.token);
        localStorage.setItem('preply-guest-id', guestData.guestId);
        localStorage.setItem('preply-account-email', guestData.user.email);
        localStorage.setItem('preply-is-guest', 'true');
        localStorage.setItem('preply-authenticated', 'true');
      }
    } catch (err) {
      console.warn('Guest profile auto-init failed:', err);
    }
  }

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
    const avatar = document.querySelector('.profile-avatar');
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
    const metrics = document.querySelectorAll('.profile-metrics strong');
    if (metrics[0]) metrics[0].textContent = payload.stats?.testsTaken || 0;
    if (metrics[1]) metrics[1].textContent = `${payload.stats?.averageAccuracy || 0}%`;
    if (metrics[2]) metrics[2].textContent = formatStudyTime(payload.stats?.studyTimeMinutes || 0);
    const accuracyLabel = document.querySelectorAll('.profile-metrics span')[1];
    if (accuracyLabel) accuracyLabel.textContent = 'Average accuracy';
  } catch (error) {
    if (error.message.includes('session') || error.message.includes('sign in')) {
      localStorage.removeItem('preply-authenticated');
      localStorage.removeItem('preply-account-email');
      localStorage.removeItem('preply-session-token');
      localStorage.removeItem('preply-profile-name');
      localStorage.removeItem('preply-profile-exam');
      localStorage.removeItem('preply-profile-location');
      if (profileName) profileName.textContent = 'Guest Learner';
      if (profileLabel) profileLabel.textContent = 'SSC CGL aspirant · India';
    }
    console.warn('Unable to load account profile:', error.message);
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

document.querySelector('#profileSettings')?.addEventListener('click', () => {
  if (!localStorage.getItem('preply-session-token')) { window.location.href = '/'; return; }
  document.querySelector('#settingsName').value = profileName?.textContent || '';
  document.querySelector('#settingsExam').value = savedExam;
  document.querySelector('#settingsLocation').value = savedLocation;
  document.querySelector('#settingsModal').classList.add('visible');
});
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

// --- LOAD PUBLIC STUDY MATERIALS ---
async function loadPublicMaterials() {
  const grid = document.getElementById('publicMaterialsGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/study-materials');
    if (!res.ok) return;
    const data = await res.json();
    const materials = data.materials || [];
    if (!materials.length) {
      grid.innerHTML = '<p class="muted">Check back soon for freshly uploaded revision sheets and notes.</p>';
      return;
    }

    grid.innerHTML = '';
    materials.forEach((m) => {
      const card = document.createElement('article');
      card.className = 'cms-card';
      card.innerHTML = `
        <div>
          <div class="cms-card-top">
            <span class="badge filetype-badge">${m.fileType || 'PDF'}</span>
            <span class="muted cms-card-readtime">${m.fileSize || '2 MB'}</span>
          </div>
          <h3 class="cms-card-title">${m.title}</h3>
          <p class="cms-card-tag">${m.subject} · ${m.exam || 'All Exams'}</p>
          ${m.description ? `<p class="cms-card-description">${m.description}</p>` : ''}
        </div>
        <div class="cms-card-action">
          <a href="${m.downloadUrl || '#'}" target="_blank" rel="noopener" class="primary-btn download-material-btn">Download Resource <span>📥</span></a>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.warn('Could not load public study materials:', err.message);
  }
}
loadPublicMaterials();

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
  fetch('/api/chat/messages', { headers })
    .then((response) => response.json())
    .then((payload) => {
      chatMessages.replaceChildren();
      (payload.messages || []).forEach(appendChatMessage);
    })
    .catch((error) => console.warn('Chat history could not be loaded:', error.message));
  const chatStream = new EventSource('/api/chat/stream');
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
      const response = await fetch('/api/chat/messages', {
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