const classNumber = window.location.pathname.match(/^\/classes\/(9|10|11|12)\/?$/)?.[1];
const classSeriesList = document.querySelector('#classSeriesList');
const classSeriesStatus = document.querySelector('#classSeriesStatus');
const classTest = document.querySelector('#classTest');
const classTestForm = document.querySelector('#classTestForm');
const classQuestionList = document.querySelector('#classQuestionList');
const classTestResult = document.querySelector('#classTestResult');
let activeSeries;
let startedAt;
let profile;

function classApi(path, options = {}) {
  const token = localStorage.getItem('preply-session-token');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body) headers['Content-Type'] = 'application/json';
  return fetch(path, { ...options, headers });
}

function renderSeries(series) {
  classSeriesList.replaceChildren();
  series.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'class-series-card';
    const title = document.createElement('h2');
    title.textContent = item.subject;
    const description = document.createElement('p');
    description.textContent = `${item.questionsPerSet} questions per set · ${item.totalSets} practice sets`;
    const latest = profile?.stats?.testAttempts?.find((attempt) => attempt.classNumber === classNumber && attempt.subject === item.subject);
    if (latest) {
      const progress = document.createElement('p');
      progress.className = 'class-series-progress';
      progress.textContent = `Latest score: ${latest.score}/${latest.total} · ${latest.accuracy}%`;
      card.append(title, description, progress);
    } else {
      card.append(title, description);
    }
    const sets = document.createElement('div');
    sets.className = 'class-series-sets';
    sets.setAttribute('aria-label', `${item.subject} test sets`);
    for (let set = 1; set <= item.totalSets; set += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Set ${set}`;
      button.addEventListener('click', () => loadTest(item.subject, set));
      sets.appendChild(button);
    }
    card.appendChild(sets);
    classSeriesList.appendChild(card);
  });
}

async function loadSeries() {
  if (!classNumber) {
    classSeriesStatus.textContent = 'This class page could not be found.';
    return;
  }
  document.querySelector('#classHeading').textContent = `Class ${classNumber} test series`;
  document.querySelector('#classIntro').textContent = `Practice ${classNumber === '11' || classNumber === '12' ? 'senior secondary' : 'school-level'} subjects with focused, class-wise sets.`;
  try {
    const profileRequest = localStorage.getItem('preply-session-token')
      ? classApi('/api/profile/me').catch(() => null)
      : Promise.resolve(null);
    const [seriesResponse, profileResponse] = await Promise.all([
      fetch(`/api/classes/${classNumber}/series`),
      profileRequest
    ]);
    const seriesPayload = await seriesResponse.json();
    if (!seriesResponse.ok) throw new Error(seriesPayload.error || 'Test series could not be loaded.');
    if (profileResponse?.ok) profile = await profileResponse.json();
    classSeriesStatus.hidden = true;
    renderSeries(seriesPayload.subjects);
    if (profile?.user) {
      classApi('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ schoolClass: classNumber }) }).catch(() => {});
    }
  } catch (error) {
    classSeriesStatus.textContent = error.message;
  }
}

async function loadTest(subject, set) {
  classTestResult.textContent = '';
  classQuestionList.replaceChildren();
  classTest.hidden = false;
  document.querySelector('#classTestTitle').textContent = `${subject} · Set ${set}`;
  classTest.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const response = await fetch(`/api/classes/${classNumber}/series/${encodeURIComponent(subject)}/${set}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'This test set could not be loaded.');
    activeSeries = payload;
    startedAt = Date.now();
    payload.questions.forEach((question, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'class-question';
      const legend = document.createElement('legend');
      legend.textContent = `${index + 1}. ${question.text}`;
      fieldset.appendChild(legend);
      question.options.forEach((option, optionIndex) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `question-${index}`;
        input.value = String(optionIndex);
        label.append(input, document.createTextNode(` ${option}`));
        fieldset.appendChild(label);
      });
      classQuestionList.appendChild(fieldset);
    });
  } catch (error) {
    classTestResult.textContent = error.message;
  }
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
  try {
    const response = await classApi(`/api/classes/${classNumber}/series/${encodeURIComponent(activeSeries.subject)}/${activeSeries.set}/results`, {
      method: 'POST',
      body: JSON.stringify({
        answers: selectedAnswers,
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your score could not be calculated.');
    let feedback = '';
    if (result.attempt.accuracy === 100) feedback = 'Outstanding Performance! 🎯';
    else if (result.attempt.accuracy >= 80) feedback = 'Excellent Accuracy! 🌟';
    else if (result.attempt.accuracy >= 60) feedback = 'Good Progress! 📈';
    else if (result.attempt.accuracy >= 40) feedback = 'Fair Attempt — Keep Practicing! 💡';
    else feedback = 'Consistent Effort Wins — Review & Retry 📚';

    classTestResult.textContent = `${feedback} Score: ${result.attempt.score}/${result.attempt.total} (${result.attempt.accuracy}% accuracy).`;
    if (localStorage.getItem('preply-session-token')) {
      profile = await (await classApi('/api/profile/me')).json();
      renderSeries((await (await fetch(`/api/classes/${classNumber}/series`)).json()).subjects);
      const update = { email: profile.user.email, stats: profile.stats, updatedAt: Date.now() };
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('result-darpan-profile');
        channel.postMessage(update);
        channel.close();
      }
      localStorage.setItem('preply-profile-stats-update', JSON.stringify(update));
    } else {
      classTestResult.textContent += ' Continue as a guest on the home page to preserve your test history.';
    }
  } catch (error) {
    classTestResult.textContent = error.message;
  }
});

document.querySelector('#classTestBack').addEventListener('click', () => {
  classTest.hidden = true;
  activeSeries = null;
  classSeriesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

loadSeries();