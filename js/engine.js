/* ===== Game Engine =====
   Handles XP, levels, gems, inventory, achievements, save/load.
*/

const GameEngine = (() => {
  const SAVE_KEY = 'english_savior_save';
  const XP_PER_LEVEL = lvl => 80 + lvl * 20; // increases each level

  let state = getDefaultState();

  function getDefaultState() {
    return {
      level: 1,
      xp: 0,
      gems: 0,
      streak: 0,
      lastPlayDate: null,
      wordsLearned: 0,
      grammarPassed: 0,
      videosCompleted: 0,
      perfectGrammarRun: false,
      achievements: [],
      inventory: {},
      // daily tracking
      dailyWords: 0,
      dailyGrammar: 0,
      dailyVideos: 0,
      dailyDate: null,
      // history
      learnedWordsList: [],
    };
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        state = { ...getDefaultState(), ...saved };
      } catch { /* use default */ }
    }
    // Check streak
    const today = new Date().toDateString();
    if (state.lastPlayDate) {
      const last = new Date(state.lastPlayDate);
      const diff = Math.floor((new Date(today) - last) / 86400000);
      if (diff > 1) state.streak = 0; // streak broken
    }
    // Reset daily if new day
    if (state.dailyDate !== today) {
      state.dailyWords = 0;
      state.dailyGrammar = 0;
      state.dailyVideos = 0;
      state.dailyDate = today;
    }
    state.lastPlayDate = today;
    save();
    updateHUD();
  }

  function getState() { return state; }

  function addXP(amount) {
    state.xp += amount;
    const needed = XP_PER_LEVEL(state.level);
    let leveled = false;
    while (state.xp >= needed) {
      state.xp -= XP_PER_LEVEL(state.level);
      state.level++;
      leveled = true;
      // Level up rewards
      state.gems += 10;
      grantRandomItem();
    }
    if (leveled) showLevelUp();
    save();
    updateHUD();
    showToast(`+${amount} XP`, 'xp');
    return leveled;
  }

  function addGems(amount) {
    state.gems += amount;
    save();
    updateHUD();
    showToast(`+${amount} 💎`, 'gem');
  }

  function recordWord(word) {
    state.wordsLearned++;
    state.dailyWords++;
    if (!state.learnedWordsList.includes(word)) {
      state.learnedWordsList.push(word);
    }
    save();
    checkAchievements();
    updateStats();
  }

  function recordGrammar() {
    state.grammarPassed++;
    state.dailyGrammar++;
    save();
    checkAchievements();
    updateStats();
  }

  function recordVideo() {
    state.videosCompleted++;
    state.dailyVideos++;
    save();
    checkAchievements();
    updateStats();
  }

  function recordPerfectGrammar() {
    state.perfectGrammarRun = true;
    save();
    checkAchievements();
  }

  function recordStreak() {
    const today = new Date().toDateString();
    if (state.lastPlayDate !== today) {
      state.streak++;
      state.lastPlayDate = today;
    }
    save();
    updateHUD();
    checkAchievements();
  }

  function grantRandomItem() {
    const item = INVENTORY_ITEMS[Math.floor(Math.random() * INVENTORY_ITEMS.length)];
    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
    showToast(`獲得 ${item.icon} ${item.name}！`, 'achievement');
    save();
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
      if (!state.achievements.includes(ach.id) && ach.condition(state)) {
        state.achievements.push(ach.id);
        showToast(`🏆 成就解鎖：${ach.name}`, 'achievement');
        addGems(15);
      }
    });
    save();
  }

  // ===== UI Updates =====
  function updateHUD() {
    const needed = XP_PER_LEVEL(state.level);
    const pct = Math.min((state.xp / needed) * 100, 100);
    document.getElementById('hud-level').textContent = state.level;
    document.getElementById('xp-bar').style.width = pct + '%';
    document.getElementById('xp-text').textContent = `${state.xp} / ${needed} XP`;
    document.getElementById('hud-gems').textContent = state.gems;
    document.getElementById('hud-streak').textContent = state.streak;
  }

  function updateStats() {
    document.getElementById('stat-words').textContent = state.wordsLearned;
    document.getElementById('stat-grammar').textContent = state.grammarPassed;
    document.getElementById('stat-videos').textContent = state.videosCompleted;
    document.getElementById('stat-streak').textContent = state.streak;
  }

  function showLevelUp() {
    document.getElementById('levelup-level').textContent = `Lv.${state.level}`;
    document.getElementById('levelup-rewards').textContent = `獎勵：+10 💎 + 隨機道具`;
    document.getElementById('modal-levelup').classList.add('active');
  }

  function showInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    INVENTORY_ITEMS.forEach(item => {
      const count = state.inventory[item.id] || 0;
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (count > 0 ? '' : ' empty');
      slot.innerHTML = count > 0
        ? `${item.icon}<span class="inv-count">x${count}</span>`
        : '';
      slot.title = count > 0 ? `${item.name}: ${item.desc}` : '空';
      grid.appendChild(slot);
    });
    // Fill empty slots
    for (let i = INVENTORY_ITEMS.length; i < 20; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot empty';
      grid.appendChild(slot);
    }
    document.getElementById('modal-inventory').classList.add('active');
  }

  function showAchievements() {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
      const unlocked = state.achievements.includes(ach.id);
      const el = document.createElement('div');
      el.className = 'ach-item' + (unlocked ? ' unlocked' : '');
      el.innerHTML = `
        <span class="ach-icon">${unlocked ? ach.icon : '🔒'}</span>
        <div class="ach-info">
          <h4>${ach.name}</h4>
          <p>${ach.desc}</p>
        </div>
        <span class="ach-status">${unlocked ? '已解鎖' : '未解鎖'}</span>
      `;
      list.appendChild(el);
    });
    document.getElementById('modal-achievements').classList.add('active');
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  return {
    load, save, getState,
    addXP, addGems,
    recordWord, recordGrammar, recordVideo,
    recordPerfectGrammar, recordStreak,
    updateHUD, updateStats,
    showInventory, showAchievements, showToast,
    checkAchievements,
  };
})();
