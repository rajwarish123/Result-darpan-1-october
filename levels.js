// Result Darpan Gamification & 5-Second Full-Screen Level Up Celebration System

function playCelebrationFanfare() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.16 },  // C5
      { freq: 659.25, time: 0.15, duration: 0.16 }, // E5
      { freq: 783.99, time: 0.30, duration: 0.20 }, // G5
      { freq: 1046.50, time: 0.48, duration: 0.65 } // C6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });
  } catch (_) {
    // Audio synthesis is non-blocking and safe against strict autoplay policies
  }
}

function createConfettiParticles(container) {
  const colors = ['#f27e63', '#f7cc55', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6', '#ff9ff3', '#54a0ff'];
  const shapes = ['rect', 'circle', 'ribbon'];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 48; i++) {
    const particle = document.createElement('div');
    particle.className = 'rd-confetti-particle';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const left = Math.random() * 100;
    const duration = (2.2 + Math.random() * 2.2).toFixed(2);
    const delay = (Math.random() * 1.5).toFixed(2);
    const size = (8 + Math.random() * 7).toFixed(0);

    particle.style.left = `${left}%`;
    particle.style.backgroundColor = color;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;

    if (shape === 'circle') {
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '50%';
    } else if (shape === 'ribbon') {
      particle.style.width = `${Math.round(size * 0.5)}px`;
      particle.style.height = `${Math.round(size * 1.8)}px`;
      particle.style.borderRadius = '2px';
    } else {
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.borderRadius = '3px';
    }

    fragment.appendChild(particle);
  }

  container.appendChild(fragment);
}

function triggerLevelUpCelebration(levelName, levelNumber) {
  const name = levelName || 'Scholar';
  const num = Number(levelNumber) || 2;

  // Remove any existing modal
  const existingModal = document.getElementById('rdLevelUpModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'rd-levelup-modal';
  modal.id = 'rdLevelUpModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Level ${num} Unlocked!`);

  modal.innerHTML = `
    <div class="rd-levelup-backdrop"></div>
    <div class="rd-levelup-confetti-container" aria-hidden="true"></div>
    <div class="rd-levelup-card">
      <button type="button" class="rd-levelup-close" aria-label="Close celebration">✕</button>
      <div class="rd-levelup-trophy-wrap">
        <div class="rd-levelup-glow-aura"></div>
        <div class="rd-levelup-trophy-icon">🏆</div>
      </div>
      <div class="rd-levelup-badge-pill">🎉 LEVEL UP UNLOCKED! 🎉</div>
      <h2 class="rd-levelup-title">CONGRATULATIONS!</h2>
      <div class="rd-levelup-level-box">
        <span class="rd-levelup-level-kicker">NEW ACHIEVEMENT UNLOCKED</span>
        <div class="rd-levelup-level-name">Level ${num} · ${name}</div>
      </div>
      <p class="rd-levelup-message">
        Outstanding dedication! You've successfully crossed another milestone on Result Darpan. Keep practicing to reach the next tier!
      </p>
      <div class="rd-levelup-timer-wrap">
        <div class="rd-levelup-timer-info">
          <span class="rd-levelup-timer-text">Auto-closing in <strong id="rdLevelUpSeconds">5</strong>s...</span>
          <span class="rd-levelup-timer-pill">5 sec celebration</span>
        </div>
        <div class="rd-levelup-timer-track">
          <div class="rd-levelup-timer-bar" id="rdLevelUpTimerBar"></div>
        </div>
      </div>
      <div class="rd-levelup-actions">
        <button type="button" class="rd-levelup-btn-continue" id="rdLevelUpDismiss">Continue Practicing 🚀</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Confetti particles
  const confettiContainer = modal.querySelector('.rd-levelup-confetti-container');
  if (confettiContainer) {
    createConfettiParticles(confettiContainer);
  }

  // Audio fanfare
  playCelebrationFanfare();

  // Exactly 5-second countdown & auto-dismiss
  let dismissed = false;
  const startTime = Date.now();
  const totalDurationMs = 5000;
  const secondsDisplay = modal.querySelector('#rdLevelUpSeconds');

  function dismissModal() {
    if (dismissed) return;
    dismissed = true;
    clearInterval(timerInterval);
    clearTimeout(autoDismissTimeout);
    document.removeEventListener('keydown', handleKeyDown);

    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.remove();
    }, 320);
  }

  const timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remainingSeconds = Math.max(0, Math.ceil((totalDurationMs - elapsed) / 1000));
    if (secondsDisplay) {
      secondsDisplay.textContent = String(remainingSeconds);
    }
  }, 100);

  const autoDismissTimeout = setTimeout(() => {
    dismissModal();
  }, totalDurationMs);

  modal.querySelector('.rd-levelup-close')?.addEventListener('click', dismissModal);
  modal.querySelector('#rdLevelUpDismiss')?.addEventListener('click', dismissModal);
  modal.querySelector('.rd-levelup-backdrop')?.addEventListener('click', dismissModal);

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      dismissModal();
    }
  }
  document.addEventListener('keydown', handleKeyDown);
}

// Level Up Detection Logic
function checkForLevelUp(gamification) {
  if (!gamification || !gamification.levelNumber) return;

  const currentLevel = Number(gamification.levelNumber);
  const currentEmail = localStorage.getItem('preply-account-email') || 'guest';
  const storedEmail = localStorage.getItem('rd-user-level-email') || '';
  const storedLevel = parseInt(localStorage.getItem('rd-user-level-num') || '0', 10);

  // If email changed, align stored level without pop-up
  if (storedEmail !== currentEmail) {
    localStorage.setItem('rd-user-level-email', currentEmail);
    localStorage.setItem('rd-user-level-num', String(currentLevel));
    return;
  }

  // If level number increased from previously stored level, trigger 5s full-screen celebration!
  if (storedLevel > 0 && currentLevel > storedLevel) {
    localStorage.setItem('rd-user-level-num', String(currentLevel));
    triggerLevelUpCelebration(gamification.level, currentLevel);
  } else if (storedLevel === 0) {
    // Initial load for this user: store without false popup
    localStorage.setItem('rd-user-level-num', String(currentLevel));
  }
}

// Profile Levels UI Panel
const profileGrid = document.querySelector('.profile-grid');
let levelsPanel = null;

if (profileGrid) {
  levelsPanel = document.createElement('article');
  levelsPanel.className = 'profile-card levels-card';
  levelsPanel.innerHTML = '<div class="levels-heading"><div><span class="mini-kicker">YOUR PROGRESS</span><h3>Levels &amp; Badges</h3></div><div style="display:flex;align-items:center;gap:8px;"><button type="button" class="preview-levelup-btn" id="previewLevelUpBtn" title="Preview celebration popup">🎉 Celebrate</button><strong class="levels-points">0 pts</strong></div></div><p class="levels-rules">5 points per completed test · 100 points per level · streak and helpful-vote bonuses</p><p class="levels-status" role="status">Sign in or continue as guest to earn study points and unlock achievements.</p><div class="levels-details" hidden><div class="level-summary"><strong class="level-name"></strong><span class="level-number"></span></div><div class="level-progress" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100"><span></span></div><p class="level-next"></p><div class="levels-stats"></div><div class="badge-list" aria-label="Badges"></div></div>';
  profileGrid.querySelector('.profile-summary')?.after(levelsPanel);

  levelsPanel.querySelector('#previewLevelUpBtn')?.addEventListener('click', () => {
    const nameEl = levelsPanel.querySelector('.level-name');
    const numEl = levelsPanel.querySelector('.level-number');
    const name = nameEl?.textContent || 'Scholar';
    const numText = numEl?.textContent || 'Level 2';
    const num = parseInt(numText.replace(/\D/g, '') || '2', 10);
    triggerLevelUpCelebration(name, num);
  });
}

function renderLevels(gamification) {
  if (!levelsPanel) return;
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
    checkForLevelUp(profile.gamification);
  } catch (error) {
    if (levelsPanel) {
      levelsPanel.querySelector('.levels-status').textContent = error.message;
      levelsPanel.querySelector('.levels-status').hidden = false;
      levelsPanel.querySelector('.levels-details').hidden = true;
    }
  }
}

// Global Event Listeners & Periodic Sync
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

// Expose on window for easy developer preview, cross-script triggers, and tests
window.triggerLevelUpCelebration = triggerLevelUpCelebration;
window.checkForLevelUp = checkForLevelUp;
window.loadLevels = loadLevels;
window.renderLevels = renderLevels;