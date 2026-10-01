const addGoalButton = document.querySelector('#addGoal');

if (addGoalButton) {
  const goalDialog = document.createElement('dialog');
  goalDialog.className = 'goal-picker-dialog';
  goalDialog.setAttribute('aria-labelledby', 'goalPickerTitle');
  goalDialog.innerHTML = '<div class="goal-picker-header"><div><span class="mini-kicker">YOUR PREP DESK</span><h2 id="goalPickerTitle">Choose your exam goals</h2></div><button class="goal-picker-close" type="button" aria-label="Close exam selection">×</button></div><p class="goal-picker-copy">Select up to five exams. Your list is saved to your profile.</p><p class="goal-picker-count" aria-live="polite">0 of 5 selected</p><div class="goal-picker-options"></div><p class="goal-picker-status" role="status" aria-live="polite"></p><div class="goal-picker-actions"><button class="outline-btn goal-picker-cancel" type="button">Cancel</button><button class="primary-btn goal-picker-save" type="button">Save goals <span>✓</span></button></div>';
  document.body.appendChild(goalDialog);

  const optionList = goalDialog.querySelector('.goal-picker-options');
  const countLabel = goalDialog.querySelector('.goal-picker-count');
  const statusLabel = goalDialog.querySelector('.goal-picker-status');
  const saveButton = goalDialog.querySelector('.goal-picker-save');

  async function goalRequest(path, options = {}) {
    const token = localStorage.getItem('preply-session-token');
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token || ''}` };
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Exam goals could not be updated.');
    return payload;
  }

  function updateSelectionCount() {
    const checkboxes = [...goalDialog.querySelectorAll('input[type="checkbox"]')];
    const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    countLabel.textContent = `${selectedCount} of 5 selected`;
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = !checkbox.checked && selectedCount >= 5;
    });
    saveButton.disabled = selectedCount > 5;
  }

  function renderGoalOptions(groups, selectedGoals) {
    optionList.replaceChildren();
    groups.forEach((group, groupIndex) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'goal-picker-group';
      const legend = document.createElement('legend');
      legend.textContent = group.category;
      const choices = document.createElement('div');
      choices.className = 'goal-picker-choice-grid';
      group.exams.forEach((exam, examIndex) => {
        const label = document.createElement('label');
        label.className = 'goal-picker-choice';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = exam;
        checkbox.checked = selectedGoals.has(exam);
        checkbox.id = `goal-choice-${groupIndex}-${examIndex}`;
        checkbox.addEventListener('change', updateSelectionCount);
        const title = document.createElement('span');
        title.textContent = exam;
        label.append(checkbox, title);
        choices.appendChild(label);
      });
      fieldset.append(legend, choices);
      optionList.appendChild(fieldset);
    });
    updateSelectionCount();
  }

  async function openGoalPicker() {
    if (!localStorage.getItem('preply-session-token')) {
      window.location.href = '/';
      return;
    }
    statusLabel.textContent = 'Loading exam choices...';
    statusLabel.classList.remove('error');
    optionList.replaceChildren();
    saveButton.disabled = true;
    goalDialog.showModal();
    try {
      const [options, profile] = await Promise.all([
        goalRequest('/api/profile/me/goals/options'),
        goalRequest('/api/profile/me')
      ]);
      const selectedGoals = new Set((profile.user.goals || []).map((goal) => goal.name));
      renderGoalOptions(options.groups, selectedGoals);
      statusLabel.textContent = '';
    } catch (error) {
      statusLabel.textContent = error.message;
      statusLabel.classList.add('error');
    }
  }

  addGoalButton.addEventListener('click', openGoalPicker);
  goalDialog.querySelector('.goal-picker-close').addEventListener('click', () => goalDialog.close());
  goalDialog.querySelector('.goal-picker-cancel').addEventListener('click', () => goalDialog.close());
  goalDialog.addEventListener('click', (event) => {
    if (event.target === goalDialog) goalDialog.close();
  });
  saveButton.addEventListener('click', async () => {
    const goals = [...goalDialog.querySelectorAll('input[type="checkbox"]:checked')].map((checkbox) => checkbox.value);
    saveButton.disabled = true;
    statusLabel.textContent = 'Saving your goals...';
    statusLabel.classList.remove('error');
    try {
      await goalRequest('/api/profile/me/goals', { method: 'PUT', body: JSON.stringify({ goals }) });
      goalDialog.close();
      window.dispatchEvent(new Event('profile-goals-updated'));
    } catch (error) {
      statusLabel.textContent = error.message;
      statusLabel.classList.add('error');
      saveButton.disabled = false;
    }
  });
}
