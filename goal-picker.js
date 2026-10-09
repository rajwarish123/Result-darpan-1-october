/**
 * Result Darpan - Exam Goal Picker Modal Controller
 * Allows students to choose up to 5 target exams and persists them.
 */

(function () {
  'use strict';

  const FALLBACK_GOAL_GROUPS = [
    { category: 'Civil services', exams: ['UPSC Civil Services (CSE)', 'UPSC NDA', 'UPSC CDS'] },
    { category: 'SSC', exams: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD Constable'] },
    { category: 'Railways', exams: ['RRB NTPC', 'RRB Group D', 'RRB ALP'] },
    { category: 'Banking', exams: ['SBI PO', 'SBI Clerk', 'IBPS PO', 'IBPS Clerk', 'RBI Grade B'] },
    { category: 'Engineering', exams: ['JEE Main', 'JEE Advanced'] },
    { category: 'Medical & University', exams: ['NEET UG', 'CUET UG'] },
    { category: 'Teaching & Eligibility', exams: ['CTET', 'UGC NET'] },
    { category: 'State & Public Services', exams: ['BPSC', 'UPPSC', 'RPSC', 'MPPSC', 'State Police SI / Constable'] }
  ];

  let goalDialog = null;
  let optionList = null;
  let countLabel = null;
  let statusLabel = null;
  let saveButton = null;

  function ensureGoalDialog() {
    if (goalDialog && document.body.contains(goalDialog)) return goalDialog;

    const existing = document.querySelector('.goal-picker-dialog');
    if (existing) {
      goalDialog = existing;
    } else {
      goalDialog = document.createElement('dialog');
      goalDialog.className = 'goal-picker-dialog';
      goalDialog.setAttribute('aria-labelledby', 'goalPickerTitle');
      goalDialog.innerHTML = `
        <div class="goal-picker-header">
          <div>
            <span class="mini-kicker">YOUR PREP DESK</span>
            <h2 id="goalPickerTitle">Choose your exam goals</h2>
          </div>
          <button class="goal-picker-close" type="button" aria-label="Close exam selection">✕</button>
        </div>
        <p class="goal-picker-copy">Select up to five target exams. Your custom goals are saved to your prep desk.</p>
        <p class="goal-picker-count" aria-live="polite">0 of 5 selected</p>
        <div class="goal-picker-options"></div>
        <p class="goal-picker-status" role="status" aria-live="polite"></p>
        <div class="goal-picker-actions">
          <button class="outline-btn goal-picker-cancel" type="button">Cancel</button>
          <button class="primary-btn goal-picker-save" type="button">Save goals <span>✓</span></button>
        </div>
      `;
      document.body.appendChild(goalDialog);
    }

    optionList = goalDialog.querySelector('.goal-picker-options');
    countLabel = goalDialog.querySelector('.goal-picker-count');
    statusLabel = goalDialog.querySelector('.goal-picker-status');
    saveButton = goalDialog.querySelector('.goal-picker-save');

    goalDialog.querySelector('.goal-picker-close')?.addEventListener('click', closeGoalPicker);
    goalDialog.querySelector('.goal-picker-cancel')?.addEventListener('click', closeGoalPicker);
    goalDialog.addEventListener('click', (event) => {
      if (event.target === goalDialog) closeGoalPicker();
    });

    saveButton?.removeEventListener('click', handleSaveGoals);
    saveButton?.addEventListener('click', handleSaveGoals);

    return goalDialog;
  }

  function closeGoalPicker() {
    if (!goalDialog) return;
    if (typeof goalDialog.close === 'function') {
      try { goalDialog.close(); } catch (_) { goalDialog.removeAttribute('open'); }
    } else {
      goalDialog.removeAttribute('open');
      goalDialog.style.display = 'none';
    }
  }

  function updateSelectionCount() {
    if (!goalDialog) return;
    const checkboxes = [...goalDialog.querySelectorAll('input[type="checkbox"]')];
    const selectedCount = checkboxes.filter((cb) => cb.checked).length;
    if (countLabel) countLabel.textContent = `${selectedCount} of 5 selected`;
    checkboxes.forEach((cb) => {
      cb.disabled = !cb.checked && selectedCount >= 5;
    });
    if (saveButton) saveButton.disabled = selectedCount > 5;
  }

  function renderGoalOptions(groups, selectedGoals) {
    if (!optionList) return;
    optionList.replaceChildren();

    const groupList = Array.isArray(groups) && groups.length > 0 ? groups : FALLBACK_GOAL_GROUPS;

    groupList.forEach((group, groupIndex) => {
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

  function getCurrentlySelectedGoals() {
    const selected = new Set();
    const stored = window.localStorage.getItem('preply-user-goals');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((g) => {
            const name = typeof g === 'string' ? g : g?.name;
            if (name) selected.add(name);
          });
        }
      } catch (_) {}
    }

    if (selected.size === 0) {
      selected.add('SSC CGL');
      selected.add('RRB NTPC');
    }

    return selected;
  }

  async function openGoalPicker() {
    const dialog = ensureGoalDialog();

    if (statusLabel) {
      statusLabel.textContent = 'Loading exam choices...';
      statusLabel.classList.remove('error');
    }
    if (optionList) optionList.replaceChildren();
    if (saveButton) saveButton.disabled = false;

    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); } catch (_) { dialog.setAttribute('open', ''); }
    } else {
      dialog.setAttribute('open', '');
      dialog.style.display = 'block';
    }

    let groups = FALLBACK_GOAL_GROUPS;
    let selectedGoals = getCurrentlySelectedGoals();

    try {
      const token = localStorage.getItem('preply-session-token');
      const fetchPromises = [
        fetch('/api/profile/me/goals/options').then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ];

      if (token) {
        fetchPromises.push(
          fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );
      }

      const [optionsRes, profileRes] = await Promise.all(fetchPromises);

      if (optionsRes && Array.isArray(optionsRes.groups)) {
        groups = optionsRes.groups;
      }

      if (profileRes && profileRes.user && Array.isArray(profileRes.user.goals) && profileRes.user.goals.length > 0) {
        selectedGoals = new Set(profileRes.user.goals.map((g) => g.name));
      }
    } catch (_) {}

    renderGoalOptions(groups, selectedGoals);
    if (statusLabel) statusLabel.textContent = '';
  }

  async function handleSaveGoals() {
    if (!goalDialog) return;
    const goals = [...goalDialog.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);

    if (saveButton) saveButton.disabled = true;
    if (statusLabel) {
      statusLabel.textContent = 'Saving your goals...';
      statusLabel.classList.remove('error');
    }

    // 1. Always store locally so guest/offline users have instant persistence
    window.localStorage.setItem('preply-user-goals', JSON.stringify(goals));

    // 2. Sync to server if authenticated or create guest session
    try {
      let token = localStorage.getItem('preply-session-token');
      if (!token) {
        const guestRes = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: localStorage.getItem('preply-profile-name') || 'Learner' })
        }).catch(() => null);

        if (guestRes && guestRes.ok) {
          const guestData = await guestRes.json().catch(() => null);
          if (guestData && guestData.token) {
            token = guestData.token;
            localStorage.setItem('preply-session-token', guestData.token);
            if (guestData.user) {
              localStorage.setItem('preply-account-email', guestData.user.email);
            }
          }
        }
      }

      if (token) {
        await fetch('/api/profile/me/goals', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ goals })
        });
      }
    } catch (_) {}

    closeGoalPicker();

    // 3. Notify page components to refresh displayed goals
    window.dispatchEvent(new Event('profile-goals-updated'));

    if (window.RDGameEngine?.SoundFX) {
      window.RDGameEngine.SoundFX.pop();
    }
  }

  // Delegated click listener for all #addGoal buttons across pages
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#addGoal, .add-goal-btn, [data-action="add-goal"]');
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      openGoalPicker();
    }
  });

  window.openGoalPicker = openGoalPicker;

})();
