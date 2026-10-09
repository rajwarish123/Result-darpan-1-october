/**
 * Result Darpan - Gamified Learning & Dopamine Game Arena Engine
 * Web Audio API synthesizer, daily quests, mystery chest, combo multipliers, and league ladders.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PURE WEB AUDIO API SYNTHESIZER (ZERO LATENCY, ZERO EXTERNAL ASSETS)
  // =========================================================================
  class SoundFXEngine {
    constructor() {
      this.ctx = null;
      this.muted = window.localStorage.getItem('rd-sound-muted') === 'true';
    }

    _initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    isMuted() {
      return this.muted;
    }

    toggleMute() {
      this.muted = !this.muted;
      window.localStorage.setItem('rd-sound-muted', String(this.muted));
      return this.muted;
    }

    // Short crisp pop for button click / option selection
    pop() {
      if (this.muted) return;
      try {
        const ctx = this._initContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
      } catch (_) {}
    }

    // Bright chime for correct answers
    correct() {
      if (this.muted) return;
      try {
        const ctx = this._initContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [587.33, 880.00]; // D5 -> A5

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.23);
        });
      } catch (_) {}
    }

    // Escalating combo jingles for streaks (2x, 3x, 4x, 5x+)
    combo(level) {
      if (this.muted) return;
      try {
        const ctx = this._initContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        let scale = [440, 554.37, 659.25]; // A4, C#5, E5
        if (level === 2) scale = [523.25, 659.25]; // C5, E5
        else if (level === 3) scale = [523.25, 659.25, 783.99]; // C5, E5, G5
        else if (level === 4) scale = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        else scale = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

        scale.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.06;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.19);
        });
      } catch (_) {}
    }

    // Rewarding coin pickup sound for quest claims
    coin() {
      if (this.muted) return;
      try {
        const ctx = this._initContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [987.77, 1318.51]; // B5 -> E6

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.07;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.24, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.26);
        });
      } catch (_) {}
    }

    // Triumphant mystery chest / celebration fanfare
    fanfare() {
      if (this.muted) return;
      try {
        const ctx = this._initContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const chordNotes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        chordNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.2, start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.55);
        });
      } catch (_) {}
    }
  }

  const SoundFX = new SoundFXEngine();

  // =========================================================================
  // 2. GAME STATE MANAGEMENT (XP, STREAK, LEAGUES)
  // =========================================================================
  const LEAGUE_TIERS = [
    { name: 'Bronze League', icon: '🥉', minXP: 0, maxXP: 100, color: '#cd7f32' },
    { name: 'Silver League', icon: '🥈', minXP: 101, maxXP: 300, color: '#a0aab2' },
    { name: 'Gold League', icon: '🥇', minXP: 301, maxXP: 700, color: '#f7cc55' },
    { name: 'Diamond League', icon: '💎', minXP: 701, maxXP: 1500, color: '#00d2d3' },
    { name: 'Master League', icon: '👑', minXP: 1501, maxXP: Infinity, color: '#ff6b6b' }
  ];

  function getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getYesterdayDateStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function loadGameState() {
    const today = getTodayDateStr();
    const yesterday = getYesterdayDateStr();

    let xp = parseInt(window.localStorage.getItem('rd-user-xp') || '0', 10);
    // Sync with existing preply-profile-points if present and higher
    const oldPoints = parseInt(window.localStorage.getItem('preply-profile-points') || '0', 10);
    if (oldPoints > xp) xp = oldPoints;

    let streak = parseInt(window.localStorage.getItem('rd-user-streak') || '1', 10);
    let lastActive = window.localStorage.getItem('rd-user-last-active') || today;

    // Check streak rollover
    if (lastActive === yesterday) {
      streak += 1;
      lastActive = today;
    } else if (lastActive !== today) {
      streak = 1;
      lastActive = today;
    }

    window.localStorage.setItem('rd-user-streak', String(streak));
    window.localStorage.setItem('rd-user-last-active', lastActive);
    window.localStorage.setItem('rd-user-xp', String(xp));

    return { xp, streak, lastActive };
  }

  function saveGameState(state) {
    if (typeof state.xp === 'number') {
      window.localStorage.setItem('rd-user-xp', String(state.xp));
      window.localStorage.setItem('preply-profile-points', String(state.xp));
    }
    if (typeof state.streak === 'number') {
      window.localStorage.setItem('rd-user-streak', String(state.streak));
    }
  }

  function getLeagueForXP(xp) {
    for (let i = 0; i < LEAGUE_TIERS.length; i++) {
      const tier = LEAGUE_TIERS[i];
      if (xp <= tier.maxXP) {
        const span = tier.maxXP === Infinity ? 500 : (tier.maxXP - tier.minXP);
        const progress = tier.maxXP === Infinity ? 100 : Math.min(100, Math.round(((xp - tier.minXP) / span) * 100));
        const needed = tier.maxXP === Infinity ? 0 : Math.max(0, tier.maxXP - xp);
        return { ...tier, progress, needed, nextTier: LEAGUE_TIERS[i + 1] || null };
      }
    }
    return { ...LEAGUE_TIERS[LEAGUE_TIERS.length - 1], progress: 100, needed: 0, nextTier: null };
  }

  // Floating XP Particle Flyout
  function spawnFloatingXP(amount, originEl) {
    const pill = document.createElement('div');
    pill.className = 'rd-floating-xp-pill';
    pill.textContent = `+${amount} XP ✨`;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (originEl && originEl.getBoundingClientRect) {
      const rect = originEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    pill.style.left = `${Math.max(40, Math.min(window.innerWidth - 40, x))}px`;
    pill.style.top = `${Math.max(40, Math.min(window.innerHeight - 40, y))}px`;

    document.body.appendChild(pill);
    setTimeout(() => {
      pill.remove();
    }, 1150);
  }

  // =========================================================================
  // 3. DAILY QUESTS SYSTEM
  // =========================================================================
  const DEFAULT_QUEST_TEMPLATES = [
    {
      id: 'warmup',
      title: 'Daily Warmup',
      desc: 'Answer 5 practice questions',
      icon: '🎯',
      target: 5,
      xp: 25
    },
    {
      id: 'combo',
      title: 'Focus Master',
      desc: 'Hit a 3x question combo streak',
      icon: '🔥',
      target: 3,
      xp: 35
    },
    {
      id: 'sprint',
      title: 'Speed Sprint',
      desc: 'Complete 1 full test or set',
      icon: '⚡',
      target: 1,
      xp: 50
    }
  ];

  function loadDailyQuests() {
    const today = getTodayDateStr();
    const stored = window.localStorage.getItem('rd-daily-quests-v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && Array.isArray(parsed.quests)) {
          return parsed.quests;
        }
      } catch (_) {}
    }

    // Initialize fresh quests for today
    const fresh = DEFAULT_QUEST_TEMPLATES.map((tmpl) => ({
      ...tmpl,
      progress: 0,
      claimed: false
    }));

    window.localStorage.setItem('rd-daily-quests-v1', JSON.stringify({ date: today, quests: fresh }));
    return fresh;
  }

  function saveDailyQuests(quests) {
    const today = getTodayDateStr();
    window.localStorage.setItem('rd-daily-quests-v1', JSON.stringify({ date: today, quests }));
  }

  function updateQuestProgress(questId, amount) {
    const quests = loadDailyQuests();
    let updated = false;

    quests.forEach((q) => {
      if (q.id === questId && !q.claimed) {
        q.progress = Math.min(q.target, q.progress + amount);
        updated = true;
      }
    });

    if (updated) {
      saveDailyQuests(quests);
      renderDailyQuestsUI();
    }
  }

  function setQuestProgress(questId, value) {
    const quests = loadDailyQuests();
    let updated = false;

    quests.forEach((q) => {
      if (q.id === questId && !q.claimed) {
        if (value > q.progress) {
          q.progress = Math.min(q.target, value);
          updated = true;
        }
      }
    });

    if (updated) {
      saveDailyQuests(quests);
      renderDailyQuestsUI();
    }
  }

  function claimQuestReward(questId, originBtn) {
    const quests = loadDailyQuests();
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.claimed || quest.progress < quest.target) return;

    quest.claimed = true;
    saveDailyQuests(quests);

    // Reward sound & XP flyout
    SoundFX.coin();
    spawnFloatingXP(quest.xp, originBtn);

    // Update global state
    const state = loadGameState();
    state.xp += quest.xp;
    saveGameState(state);

    updateHUD();
    renderDailyQuestsUI();
    renderLeagueUI();

    // Check if level up
    if (typeof window.checkForLevelUp === 'function') {
      const levelNumber = Math.floor(state.xp / 100) + 1;
      window.checkForLevelUp({ levelNumber, level: `Scholar Tier ${levelNumber}` });
    }
  }

  // =========================================================================
  // 4. DAILY MYSTERY CHEST (24-HOUR REWARD BOX)
  // =========================================================================
  const MOTIVATIONAL_CHEST_TIPS = [
    '“Champions don’t rely on luck. They rely on daily reps.”',
    '“One solved concept today turns into 2 exam marks tomorrow.”',
    '“Consistency is a quiet superpower. Keep this momentum rolling!”',
    '“Top 1% rankers review every mistake. Solidify your accuracy today.”',
    '“Daily practice beats sporadic marathons every single time.”'
  ];

  function getMysteryChestStatus() {
    const lastClaim = parseInt(window.localStorage.getItem('rd-chest-last-claim') || '0', 10);
    const now = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;
    const timeRemaining = Math.max(0, lastClaim + cooldownMs - now);

    return {
      isReady: timeRemaining === 0,
      timeRemainingMs: timeRemaining
    };
  }

  function formatRemainingTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  }

  function openMysteryChestModal() {
    const modal = document.getElementById('rdChestModal');
    if (!modal) return;

    const status = getMysteryChestStatus();
    const title = modal.querySelector('#rdChestTitle');
    const rewardCard = modal.querySelector('#rdChestRewardCard');
    const actionBtn = modal.querySelector('#rdChestActionBtn');
    const icon = modal.querySelector('#rdChestIconLarge');

    modal.classList.remove('is-closing');
    modal.style.display = 'flex';

    if (status.isReady) {
      if (title) title.textContent = 'Daily Mystery Chest Ready!';
      if (rewardCard) rewardCard.style.display = 'none';
      if (icon) icon.textContent = '🎁';
      if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Open Mystery Box 🎁';
        actionBtn.onclick = () => claimMysteryChest();
      }
    } else {
      if (title) title.textContent = 'Chest Cooldown';
      if (icon) icon.textContent = '⏳';
      if (rewardCard) {
        rewardCard.style.display = 'block';
        const xpEl = rewardCard.querySelector('#rdChestRewardXp');
        const tipEl = rewardCard.querySelector('#rdChestTip');
        if (xpEl) xpEl.textContent = 'Chest Recharging';
        if (tipEl) tipEl.textContent = `Next daily mystery gift unlocks in ${formatRemainingTime(status.timeRemainingMs)}. Come back tomorrow!`;
      }
      if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.textContent = `Ready in ${formatRemainingTime(status.timeRemainingMs)}`;
      }
    }
  }

  function closeMysteryChestModal() {
    const modal = document.getElementById('rdChestModal');
    if (!modal) return;
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 280);
  }

  function claimMysteryChest() {
    const modal = document.getElementById('rdChestModal');
    if (!modal) return;

    const actionBtn = modal.querySelector('#rdChestActionBtn');
    const rewardCard = modal.querySelector('#rdChestRewardCard');
    const xpEl = modal.querySelector('#rdChestRewardXp');
    const tipEl = modal.querySelector('#rdChestTip');
    const icon = modal.querySelector('#rdChestIconLarge');

    // Roll reward: 35, 50, 65, 80, or 100 XP
    const rewards = [35, 50, 65, 80, 100];
    const rewardXP = rewards[Math.floor(Math.random() * rewards.length)];
    const quote = MOTIVATIONAL_CHEST_TIPS[Math.floor(Math.random() * MOTIVATIONAL_CHEST_TIPS.length)];

    // Sound effect & visual pop
    SoundFX.fanfare();
    if (icon) icon.textContent = '🎉';

    if (rewardCard) {
      rewardCard.style.display = 'block';
      if (xpEl) xpEl.textContent = `+${rewardXP} XP ⚡ + 🛡️ Streak Protected!`;
      if (tipEl) tipEl.textContent = quote;
    }

    // Award XP
    const state = loadGameState();
    state.xp += rewardXP;
    saveGameState(state);

    window.localStorage.setItem('rd-chest-last-claim', String(Date.now()));

    spawnFloatingXP(rewardXP, icon || actionBtn);
    updateHUD();
    renderLeagueUI();

    if (actionBtn) {
      actionBtn.textContent = 'Awesome! Got It 🚀';
      actionBtn.onclick = () => closeMysteryChestModal();
    }

    // Update chest button status in Game Arena
    renderChestCTA();
  }

  // =========================================================================
  // 5. IN-TEST COMBO MULTIPLIER & QUESTION INTERACTION
  // =========================================================================
  let inTestCombo = 0;
  let comboResetTimer = null;

  function handleQuestionAnswered(optionElement) {
    SoundFX.pop();
    inTestCombo += 1;

    // Show floating +10 XP
    spawnFloatingXP(10, optionElement);

    // Award question XP
    const state = loadGameState();
    state.xp += 10;
    saveGameState(state);
    updateHUD();
    renderLeagueUI();

    // Progress Quests
    updateQuestProgress('warmup', 1);
    setQuestProgress('combo', inTestCombo);

    // Display in-test combo banner if streak >= 2
    if (inTestCombo >= 2) {
      SoundFX.combo(inTestCombo);
      showComboBanner(inTestCombo);
    }

    clearTimeout(comboResetTimer);
    // Reset combo if inactive for 45 seconds during a test
    comboResetTimer = setTimeout(() => {
      inTestCombo = 0;
      hideComboBanner();
    }, 45000);
  }

  function showComboBanner(combo) {
    let banner = document.getElementById('rdTestComboBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'rdTestComboBanner';
      banner.className = 'rd-test-combo-banner';
      const questionArea = document.querySelector('.question-area') || document.querySelector('.test-header-center');
      if (questionArea) {
        questionArea.insertBefore(banner, questionArea.firstChild);
      }
    }

    let label = `${combo}x COMBO! 🔥`;
    if (combo >= 5) label = `${combo}x UNSTOPPABLE! 🏆`;
    else if (combo >= 3) label = `${combo}x ON FIRE! ⚡`;

    banner.textContent = label;
    banner.style.display = 'inline-flex';
  }

  function hideComboBanner() {
    const banner = document.getElementById('rdTestComboBanner');
    if (banner) banner.style.display = 'none';
  }

  function handleTestCompleted() {
    SoundFX.fanfare();
    inTestCombo = 0;
    hideComboBanner();

    // Complete Sprint quest
    updateQuestProgress('sprint', 1);

    // Bonus XP for finishing a test
    const bonusXP = 40;
    const state = loadGameState();
    state.xp += bonusXP;
    saveGameState(state);

    spawnFloatingXP(bonusXP, document.querySelector('#resultScore') || document.body);
    updateHUD();
    renderLeagueUI();
  }

  // =========================================================================
  // 6. UI RENDERERS (HUD, ARENA, LEAGUE, QUESTS)
  // =========================================================================
  function updateHUD() {
    const state = loadGameState();
    const league = getLeagueForXP(state.xp);
    const chestStatus = getMysteryChestStatus();

    const streakEl = document.getElementById('rdHudStreakCount');
    if (streakEl) streakEl.textContent = `${state.streak} ${state.streak === 1 ? 'Day' : 'Days'}`;

    const xpEl = document.getElementById('rdHudXpCount');
    if (xpEl) xpEl.textContent = `${state.xp} XP`;

    const leagueBadge = document.getElementById('rdHudLeagueBadge');
    if (leagueBadge) leagueBadge.textContent = `${league.icon} ${league.name.replace(' League', '')}`;

    const chestBtn = document.getElementById('rdHudChest');
    if (chestBtn) {
      if (chestStatus.isReady) {
        chestBtn.classList.add('has-reward');
        chestBtn.title = 'Mystery Chest Ready to Open!';
      } else {
        chestBtn.classList.remove('has-reward');
        chestBtn.title = `Chest recharging (${formatRemainingTime(chestStatus.timeRemainingMs)})`;
      }
    }

    const soundIcon = document.getElementById('rdHudSoundIcon');
    if (soundIcon) {
      soundIcon.textContent = SoundFX.isMuted() ? '🔇' : '🔊';
    }
  }

  function renderDailyQuestsUI() {
    const listEl = document.getElementById('gameQuestsList');
    if (!listEl) return;

    const quests = loadDailyQuests();
    listEl.innerHTML = '';

    quests.forEach((q) => {
      const isComplete = q.progress >= q.target;
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));

      const item = document.createElement('div');
      item.className = `game-quest-item${isComplete ? ' is-completed' : ''}`;

      let actionHtml = '';
      if (q.claimed) {
        actionHtml = '<span class="game-quest-claimed-badge">✓ Claimed</span>';
      } else if (isComplete) {
        actionHtml = `<button type="button" class="game-quest-claim-btn" data-quest-id="${q.id}">Claim +${q.xp} XP</button>`;
      } else {
        actionHtml = `<span class="game-quest-counter">${q.progress}/${q.target}</span>`;
      }

      item.innerHTML = `
        <div class="game-quest-info">
          <div class="game-quest-title-row">
            <span class="game-quest-icon">${q.icon}</span>
            <span class="game-quest-title">${q.title}</span>
            <span class="game-quest-reward-tag">+${q.xp} XP</span>
          </div>
          <div class="game-quest-progress-wrap">
            <div class="game-quest-progress-track">
              <div class="game-quest-fill" style="width: ${pct}%"></div>
            </div>
            <span class="game-quest-counter">${pct}%</span>
          </div>
        </div>
        <div>${actionHtml}</div>
      `;

      listEl.appendChild(item);
    });

    // Attach claim listeners
    listEl.querySelectorAll('.game-quest-claim-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        claimQuestReward(btn.dataset.questId, e.currentTarget);
      });
    });
  }

  function renderLeagueUI() {
    const state = loadGameState();
    const league = getLeagueForXP(state.xp);

    const tierPill = document.getElementById('gameLeagueTierPill');
    if (tierPill) tierPill.textContent = `${league.icon} ${league.name}`;

    const rankVal = document.getElementById('gameLeagueRankVal');
    if (rankVal) rankVal.textContent = `${state.xp} XP`;

    const fill = document.getElementById('gameLeagueFill');
    if (fill) fill.style.width = `${league.progress}%`;

    const subtext = document.getElementById('gameLeagueSubtext');
    if (subtext) {
      if (league.nextTier) {
        subtext.textContent = `Earn ${league.needed} more XP to reach ${league.nextTier.name}!`;
      } else {
        subtext.textContent = 'Top Master tier achieved! You dominate the leaderboard.';
      }
    }
  }

  function renderChestCTA() {
    const status = getMysteryChestStatus();
    const btn = document.getElementById('gameMysteryChestBtn');
    if (!btn) return;

    const smallText = btn.querySelector('small');
    if (status.isReady) {
      if (smallText) smallText.textContent = 'Free daily reward ready! Tap to unlock';
      btn.style.borderColor = '#f7cc55';
    } else {
      if (smallText) smallText.textContent = `Next gift unlocks in ${formatRemainingTime(status.timeRemainingMs)}`;
    }
  }

  // =========================================================================
  // 7. DOM INITIALIZATION & EVENT HOOKS
  // =========================================================================
  function initGameArena() {
    // 1. Render HUD
    updateHUD();

    // Sound toggle listener
    document.getElementById('rdHudSound')?.addEventListener('click', () => {
      const isMuted = SoundFX.toggleMute();
      const soundIcon = document.getElementById('rdHudSoundIcon');
      if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
      if (!isMuted) SoundFX.pop();
    });

    // Mystery chest trigger listeners
    document.getElementById('rdHudChest')?.addEventListener('click', openMysteryChestModal);
    document.getElementById('gameMysteryChestBtn')?.addEventListener('click', openMysteryChestModal);
    document.getElementById('rdChestClose')?.addEventListener('click', closeMysteryChestModal);
    document.getElementById('rdChestBackdrop')?.addEventListener('click', closeMysteryChestModal);

    // Render Quests & League
    renderDailyQuestsUI();
    renderLeagueUI();
    renderChestCTA();

    // 2. Intercept question answer clicks
    document.addEventListener('click', (event) => {
      const option = event.target.closest('.answer-option');
      if (option) {
        handleQuestionAnswered(option);
      }
    });

    // 3. Listen to test completion
    window.addEventListener('rd-test-completed', handleTestCompleted);
    window.addEventListener('test-completed', handleTestCompleted);

    // Watch for test result container becoming visible in DOM
    const testResult = document.getElementById('testResult');
    if (testResult && window.MutationObserver) {
      const observer = new MutationObserver(() => {
        if (!testResult.hidden && testResult.style.display !== 'none') {
          handleTestCompleted();
        }
      });
      observer.observe(testResult, { attributes: true, attributeFilter: ['hidden', 'style'] });
    }

    // Update countdown timers periodically
    setInterval(() => {
      renderChestCTA();
      updateHUD();
    }, 60000);
  }

  // Run on DOMContentLoaded or immediate if loaded later
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameArena);
  } else {
    initGameArena();
  }

  // Expose global controller for developer & sub-system access
  window.RDGameEngine = {
    SoundFX,
    loadGameState,
    saveGameState,
    addXP: (amount, reason, originEl) => {
      const state = loadGameState();
      state.xp += amount;
      saveGameState(state);
      spawnFloatingXP(amount, originEl);
      updateHUD();
      renderLeagueUI();
    },
    triggerQuestionAnswered: handleQuestionAnswered,
    triggerTestCompleted: handleTestCompleted,
    openMysteryChest: openMysteryChestModal
  };

})();

