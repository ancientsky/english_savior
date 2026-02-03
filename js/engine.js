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
      // shop system
      owned: {
        consumables: {},  // { itemId: quantity }
        skins: ['default'],
        titles: ['beginner']
      },
      equipped: {
        skin: 'default',
        title: 'beginner'
      },
      activeBuffs: [],  // [{ type: 'double_xp', uses: 1 }, ...]
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
        const defaults = getDefaultState();
        state = { ...defaults, ...saved };
        // Deep merge for nested objects (shop system)
        state.owned = {
          consumables: { ...defaults.owned.consumables, ...(saved.owned?.consumables || {}) },
          skins: saved.owned?.skins || defaults.owned.skins,
          titles: saved.owned?.titles || defaults.owned.titles,
        };
        state.equipped = { ...defaults.equipped, ...(saved.equipped || {}) };
        state.activeBuffs = saved.activeBuffs || [];
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

    // Update equipped skin and title
    const skin = SHOP_ITEMS?.skins?.find(s => s.id === (state.equipped?.skin || 'default'));
    const title = SHOP_ITEMS?.titles?.find(t => t.id === (state.equipped?.title || 'beginner'));
    if (skin) {
      document.getElementById('hud-avatar').textContent = skin.icon;
    }
    if (title) {
      document.getElementById('hud-name').textContent = title.display || '冒險者';
    }
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

  // ===== Shop System =====
  let currentShopTab = 'consumables';

  function showShop() {
    renderShopItems(currentShopTab);
    document.getElementById('shop-gems').textContent = state.gems;
    document.getElementById('modal-shop').classList.add('active');
  }

  function switchShopTab(tab) {
    currentShopTab = tab;
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.shop-tab[data-tab="${tab}"]`).classList.add('active');
    renderShopItems(tab);
  }

  function renderShopItems(category) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const items = SHOP_ITEMS[category];

    items.forEach(item => {
      const owned = isItemOwned(category, item.id);
      const equipped = isItemEquipped(category, item.id);
      const canAfford = state.gems >= item.price;
      const quantity = category === 'consumables' ? (state.owned.consumables[item.id] || 0) : 0;

      const card = document.createElement('div');
      card.className = 'shop-card' + (owned && category !== 'consumables' ? ' owned' : '') + (equipped ? ' equipped' : '');

      let buttonHtml = '';
      if (category === 'consumables') {
        buttonHtml = `<button class="shop-buy-btn${!canAfford ? ' disabled' : ''}"
          onclick="GameEngine.buyItem('${category}', '${item.id}')"
          ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? '購買' : '寶石不足'}
        </button>`;
        if (quantity > 0) {
          buttonHtml += `<span class="shop-owned-qty">已擁有: ${quantity}</span>`;
        }
      } else if (owned) {
        if (equipped) {
          buttonHtml = `<button class="shop-equipped-btn" disabled>裝備中</button>`;
        } else {
          buttonHtml = `<button class="shop-equip-btn" onclick="GameEngine.equipItem('${category}', '${item.id}')">裝備</button>`;
        }
      } else if (item.price === 0) {
        buttonHtml = `<button class="shop-buy-btn" onclick="GameEngine.buyItem('${category}', '${item.id}')">免費領取</button>`;
      } else {
        buttonHtml = `<button class="shop-buy-btn${!canAfford ? ' disabled' : ''}"
          onclick="GameEngine.buyItem('${category}', '${item.id}')"
          ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? '購買' : '寶石不足'}
        </button>`;
      }

      const iconHtml = item.icon || '';
      const priceHtml = item.price > 0 ? `<span class="shop-price">💎 ${item.price}</span>` : `<span class="shop-price free">免費</span>`;
      const specialClass = item.special ? ' special' : '';

      card.innerHTML = `
        <div class="shop-card-icon${specialClass}">${iconHtml}</div>
        <div class="shop-card-info">
          <h4 class="shop-card-name${specialClass}">${item.name}</h4>
          <p class="shop-card-desc">${item.desc}</p>
          ${priceHtml}
        </div>
        <div class="shop-card-action">
          ${buttonHtml}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function isItemOwned(category, itemId) {
    if (category === 'consumables') {
      return (state.owned.consumables[itemId] || 0) > 0;
    }
    return state.owned[category]?.includes(itemId);
  }

  function isItemEquipped(category, itemId) {
    if (category === 'consumables') return false;
    const key = category === 'skins' ? 'skin' : 'title';
    return state.equipped[key] === itemId;
  }

  function buyItem(category, itemId) {
    const item = SHOP_ITEMS[category].find(i => i.id === itemId);
    if (!item) {
      showToast('商品不存在', 'error');
      return false;
    }

    if (state.gems < item.price) {
      showToast('寶石不足！', 'error');
      return false;
    }

    // Check if already owned (for skins/titles)
    if (category !== 'consumables' && state.owned[category]?.includes(itemId)) {
      showToast('已擁有此商品', 'error');
      return false;
    }

    // Deduct gems
    state.gems -= item.price;

    // Add to owned
    if (category === 'consumables') {
      state.owned.consumables[itemId] = (state.owned.consumables[itemId] || 0) + 1;
      showToast(`購買成功！獲得 ${item.icon} ${item.name}`, 'achievement');
    } else {
      if (!state.owned[category]) state.owned[category] = [];
      state.owned[category].push(itemId);
      showToast(`購買成功！獲得 ${item.icon || ''} ${item.name}`, 'achievement');
    }

    save();
    updateHUD();
    renderShopItems(currentShopTab);
    document.getElementById('shop-gems').textContent = state.gems;
    return true;
  }

  function equipItem(category, itemId) {
    if (!state.owned[category]?.includes(itemId)) {
      showToast('尚未擁有此商品', 'error');
      return false;
    }

    const key = category === 'skins' ? 'skin' : 'title';
    state.equipped[key] = itemId;

    const item = SHOP_ITEMS[category].find(i => i.id === itemId);
    showToast(`已裝備 ${item?.icon || ''} ${item?.name || itemId}`, 'info');

    save();
    updateHUD();
    renderShopItems(currentShopTab);
    return true;
  }

  function useConsumable(itemId) {
    if (!state.owned.consumables[itemId] || state.owned.consumables[itemId] <= 0) {
      showToast('沒有此道具', 'error');
      return false;
    }

    const item = SHOP_ITEMS.consumables.find(i => i.id === itemId);
    if (!item) return false;

    // Apply effect
    if (item.effect === 'instant_xp') {
      // Instant effect: add XP directly
      state.owned.consumables[itemId]--;
      save();
      addXP(50);
      showToast(`使用 ${item.icon} ${item.name}，獲得 50 XP！`, 'xp');
    } else {
      // Buff effect: add to active buffs
      state.owned.consumables[itemId]--;
      const uses = item.effect === 'gem_bonus' ? 5 : 1;
      state.activeBuffs.push({ type: item.effect, uses: uses });
      save();
      showToast(`啟用 ${item.icon} ${item.name}！`, 'achievement');
    }

    renderShopItems(currentShopTab);
    return true;
  }

  function hasBuff(buffType) {
    return state.activeBuffs.some(b => b.type === buffType && b.uses > 0);
  }

  function consumeBuff(buffType) {
    const buff = state.activeBuffs.find(b => b.type === buffType && b.uses > 0);
    if (buff) {
      buff.uses--;
      if (buff.uses <= 0) {
        state.activeBuffs = state.activeBuffs.filter(b => b !== buff);
      }
      save();
      return true;
    }
    return false;
  }

  function getEquippedSkin() {
    const skinId = state.equipped?.skin || 'default';
    return SHOP_ITEMS.skins.find(s => s.id === skinId) || SHOP_ITEMS.skins[0];
  }

  function getEquippedTitle() {
    const titleId = state.equipped?.title || 'beginner';
    return SHOP_ITEMS.titles.find(t => t.id === titleId) || SHOP_ITEMS.titles[0];
  }

  return {
    load, save, getState,
    addXP, addGems,
    recordWord, recordGrammar, recordVideo,
    recordPerfectGrammar, recordStreak,
    updateHUD, updateStats,
    showInventory, showAchievements, showToast,
    checkAchievements,
    // Shop functions
    showShop, switchShopTab, buyItem, equipItem,
    useConsumable, hasBuff, consumeBuff,
    getEquippedSkin, getEquippedTitle,
  };
})();
