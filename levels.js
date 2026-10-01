const profileGrid = document.querySelector('.profile-grid');
if (profileGrid) {
  const levelsPanel = document.createElement('article');
  levelsPanel.className = 'profile-card levels-card';
  levelsPanel.innerHTML = '<div class="levels-heading"><div><span class="mini-kicker">YOUR PROGRESS</span><h3>Levels &amp; Badges</h3></div><strong class="levels-points">0 pts</strong></div><p class="levels-rules">5 points per completed test · 100 points per level · streak and helpful-vote bonuses</p><p class="levels-status" role="status">Sign in or continue as guest to earn study points and unlock achievements.</p><div class="levels-details" hidden><div class="level-summary"><strong class="level-name"></strong><span class="level-number"></span></div><div class="level-progress" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100"><span></span></div><p class="level-next"></p><div class="levels-stats"></div><div class="badge-list" aria-label="Badges"></div></div>';
  profileGrid.querySelector('.profile-summary')?.after(levelsPanel);

  function renderLevels(gamification) {
    const details = levelsPanel.querySelector('.levels-details');
    const status = levelsPanel.querySelector('.levels-status');
    if (!gamification) {
      status.hidden = false;
      status.textContent = 'Sign in or continue as guest to earn study points and unlock achievements.';
      details.hidden = true;
      return;
    }

    status.hidden = true;
    details.hidden = false;
    levelsPanel.querySelector('.levels-points').textContent = `${gamification.points} pts`;
    levelsPanel.querySelector('.level-name').textContent = gamification.level;
    levelsPanel.querySelector('.level-number').textContent = `Level ${gamification.levelNumber}`;
    const progress = levelsPanel.querySelector('.level-progress');
    progress.setAttribute('aria-valuenow', String(gamification.levelProgress));
    progress.querySelector('span').style.width = `${gamification.levelProgress}%`;
    levelsPanel.querySelector('.level-next').textContent = gamification.nextLevel
      ? `${gamification.pointsToNext} points to ${gamification.nextLevel}`
      : 'Top level reached';
    levelsPanel.querySelector('.levels-stats').textContent = `${gamification.testsCompleted} tests · ${gamification.currentStreak}-day streak · ${gamification.helpfulVotes} helpful votes`;

    const badges = levelsPanel.querySelector('.badge-list');
    badges.replaceChildren();
    gamification.badges.forEach((badge) => {
      const item = document.createElement('div');
      item.className = `level-badge${badge.earned ? ' earned' : ''}`;
      item.title = badge.description;
      const mark = document.createElement('span');
      mark.className = 'badge-mark';
      mark.textContent = badge.earned ? '✓' : '·';
      const title = document.createElement('span');
      title.textContent = badge.title;
      item.append(mark, title);
      badges.appendChild(item);
    });
  }

  async function loadLevels() {
    const token = localStorage.getItem('preply-session-token');
    if (!token) {
      renderLevels(null);
      return;
    }
    try {
      const response = await fetch('/api/profile/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Levels could not be loaded.');
      const profile = await response.json();
      renderLevels(profile.gamification);
    } catch (error) {
      levelsPanel.querySelector('.levels-status').textContent = error.message;
      levelsPanel.querySelector('.levels-status').hidden = false;
      levelsPanel.querySelector('.levels-details').hidden = true;
    }
  }

  window.addEventListener('profile-session-changed', loadLevels);
  window.addEventListener('community-vote-recorded', loadLevels);
  window.addEventListener('gamification-refresh', loadLevels);
  window.addEventListener('focus', loadLevels);
  window.addEventListener('storage', (event) => {
    if (event.key === 'preply-profile-stats-update' || event.key === 'preply-session-token') loadLevels();
  });
  if (typeof BroadcastChannel !== 'undefined') {
    const levelsChannel = new BroadcastChannel('result-darpan-profile');
    levelsChannel.addEventListener('message', loadLevels);
  }
  window.setInterval(loadLevels, 30000);
  loadLevels();
}