/* ===== English Adventure RPG Module (英語冒險物語) =====
   Undertale-inspired 2D RPG for conversation practice. Chapters are
   defined declaratively in js/data/rpg.js (one per 課綱學習主題) and
   interpreted here: tile-map exploration (keyboard / D-pad / tap),
   bump-into-NPC conversations in an Undertale-style black dialogue
   box with typewriter text + TTS, a boss "conversation battle" per
   chapter, star ratings, and persistent progress. Adding a chapter
   only requires appending to RPG_CHAPTERS.
*/

const RpgGame = (() => {
  const STORAGE_KEY = 'english_savior_rpg';
  const TYPE_MS = 28;             // typewriter speed per char

  let save = loadSave();          // { done: {chId: stars}, progress: {chId: {npcs:[], right, asked}} }
  let ch = null;                  // active chapter data
  let cols = 0, rows = 0;
  let px = 0, py = 0;             // player tile position
  let mode = 'select';            // 'select' | 'explore' | 'dialog'
  let dlg = null;                 // dialogue state
  let typeTimer = null;
  let els = {};

  // ----- puzzle-tile session state (reset per enterChapter, never persisted) -----
  let overrides = {};             // 'x,y' -> effective tile char (opened doors, broken walls...)
  let keysHeld = 0;               // 🔑 collected this run
  let switchesFired = new Set();  // 'x,y' of S tiles already triggered
  let portalPairs = {};           // 'x,y' -> {x,y} of the paired P/Q tile
  let lastDoorToastAt = 0;        // throttle the "need a key" toast

  function init() {
    els = {
      select: document.getElementById('rpg-select'),
      chapters: document.getElementById('rpg-chapters'),
      world: document.getElementById('rpg-world'),
      title: document.getElementById('rpg-title'),
      objective: document.getElementById('rpg-objective'),
      map: document.getElementById('rpg-map'),
      sprites: document.getElementById('rpg-sprites'),
      dialog: document.getElementById('rpg-dialog'),
      dlgFace: document.getElementById('rpg-dlg-face'),
      dlgName: document.getElementById('rpg-dlg-name'),
      dlgText: document.getElementById('rpg-dlg-text'),
      dlgZh: document.getElementById('rpg-dlg-zh'),
      dlgMore: document.getElementById('rpg-dlg-more'),
      dlgOptions: document.getElementById('rpg-dlg-options'),
      exitBtn: document.getElementById('rpg-exit-btn'),
      dpad: document.getElementById('rpg-dpad'),
      clear: document.getElementById('rpg-clear'),
      clearInfo: document.getElementById('rpg-clear-info'),
      clearBtn: document.getElementById('rpg-clear-btn'),
    };

    els.exitBtn.addEventListener('click', showSelect);
    els.clearBtn.addEventListener('click', showSelect);
    els.dialog.addEventListener('click', () => { if (mode === 'dialog') advance(); });

    // D-pad: tap = one step; hold = repeat
    els.dpad.querySelectorAll('[data-dir]').forEach(btn => {
      let rep = null;
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const step = () => {
        const [dx, dy] = dirs[btn.dataset.dir];
        tryMove(dx, dy);
      };
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        step();
        rep = setInterval(step, 170);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt =>
        btn.addEventListener(evt, () => { clearInterval(rep); rep = null; }));
    });

    // Tap-to-step: tapping the map moves one tile toward the tap
    els.map.parentElement.addEventListener('click', e => {
      if (mode !== 'explore') return;
      const rect = els.map.getBoundingClientRect();
      const tx = (e.clientX - rect.left) / rect.width * cols;
      const ty = (e.clientY - rect.top) / rect.height * rows;
      const dx = tx - (px + 0.5), dy = ty - (py + 0.5);
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(Math.sign(dx), 0);
      else tryMove(0, Math.sign(dy));
    });

    // Keyboard: arrows / WASD to move, Enter/Space to advance dialogue
    document.addEventListener('keydown', e => {
      const zone = document.getElementById('zone-rpg');
      if (!zone.classList.contains('active')) return;
      if (mode === 'explore') {
        const map = {
          ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        };
        const dir = map[e.key];
        if (dir) { e.preventDefault(); tryMove(dir[0], dir[1]); }
      } else if (mode === 'dialog') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
        if (['1', '2', '3'].includes(e.key) && dlg && dlg.waiting === 'option') {
          const btns = els.dlgOptions.querySelectorAll('button:not(:disabled)');
          const all = els.dlgOptions.querySelectorAll('button.rpg-opt');
          const idx = Number(e.key) - 1;
          if (all[idx] && !all[idx].disabled) all[idx].click();
        }
      }
    });

    renderSelect();

    // Test hook
    window.__rpgTest = {
      mode: () => mode,
      pos: () => ({ x: px, y: py }),
      chapter: () => (ch ? ch.id : null),
      startChapter: id => {
        const c = RPG_CHAPTERS.find(x => x.id === id);
        if (c) enterChapter(c);
      },
      talkTo: id => {
        const npc = id === ch.boss.id ? ch.boss : ch.npcs.find(n => n.id === id);
        if (npc) startTalk(npc);
      },
      dialog: () => (dlg ? {
        npc: dlg.npc.id, idx: dlg.idx, waiting: dlg.waiting,
        ask: currentEntry() && currentEntry().ask ? { options: currentEntry().options, a: currentEntry().a } : null,
      } : null),
      advance: () => advance(),
      choose: i => {
        // i is the ORIGINAL option index (display order is shuffled)
        const btn = els.dlgOptions.querySelector(`button.rpg-opt[data-orig="${i}"]`);
        if (btn) btn.click();
      },
      progress: () => JSON.parse(JSON.stringify(save)),
      npcDone: () => (ch ? chProg().npcs.slice() : []),
      keys: () => keysHeld,
      tile: (x, y) => tileAt(x, y),
      overrides: () => ({ ...overrides }),
    };
  }

  // ===== Persistence =====
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { done: (d && d.done) || {}, progress: (d && d.progress) || {} };
    } catch {
      return { done: {}, progress: {} };
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function chProg() {
    if (!save.progress[ch.id]) save.progress[ch.id] = { npcs: [], right: 0, asked: 0 };
    return save.progress[ch.id];
  }

  function isUnlocked(i) {
    return i === 0 || !!save.done[RPG_CHAPTERS[i - 1].id];
  }

  // ===== Chapter select =====
  function showSelect() {
    mode = 'select';
    stopTyping();
    dlg = null;
    els.world.style.display = 'none';
    els.clear.style.display = 'none';
    els.select.style.display = 'block';
    renderSelect();
  }

  const WORLD_NAMES = ['第一世界 · 英語大陸', '第二世界 · 生活城市', '第三世界 · 探索樂園', '第四世界 · 奇幻次元'];

  function renderSelect() {
    els.chapters.innerHTML = '';
    RPG_CHAPTERS.forEach((c, i) => {
      if (i % 9 === 0 && WORLD_NAMES[Math.floor(i / 9)]) {
        const h = document.createElement('div');
        h.className = 'rpg-world-header';
        h.textContent = `🗺️ ${WORLD_NAMES[Math.floor(i / 9)]}`;
        els.chapters.appendChild(h);
      }
      const unlocked = isUnlocked(i);
      const stars = save.done[c.id] || 0;
      const card = document.createElement('button');
      card.className = 'rpg-ch-card' + (unlocked ? '' : ' locked') + (stars ? ' cleared' : '');
      card.innerHTML =
        `<span class="rpg-ch-icon">${unlocked ? c.icon : '🔒'}</span>` +
        `<span class="rpg-ch-name">第 ${i + 1} 章 ${c.title}</span>` +
        `<span class="rpg-ch-theme">主題：${c.theme}</span>` +
        `<span class="rpg-ch-stars">${stars ? '⭐'.repeat(stars) : (unlocked ? '尚未通關' : '完成上一章解鎖')}</span>`;
      if (unlocked) card.addEventListener('click', () => enterChapter(c));
      els.chapters.appendChild(card);
    });
  }

  // ===== World / map =====
  function enterChapter(c) {
    ch = c;
    rows = ch.map.length;
    cols = ch.map[0].length;
    px = ch.spawn.x;
    py = ch.spawn.y;
    mode = 'explore';
    // Fresh puzzle state every run (nothing persisted — replays reset)
    overrides = {};
    keysHeld = 0;
    switchesFired = new Set();
    portalPairs = {};
    lastDoorToastAt = 0;
    let pTile = null, qTile = null;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (ch.map[y][x] === 'P') pTile = { x, y };
        if (ch.map[y][x] === 'Q') qTile = { x, y };
      }
    }
    if (pTile && qTile) {
      portalPairs[`${pTile.x},${pTile.y}`] = qTile;
      portalPairs[`${qTile.x},${qTile.y}`] = pTile;
    }
    updateKeyChip();
    els.select.style.display = 'none';
    els.clear.style.display = 'none';
    els.world.style.display = 'block';
    els.title.textContent = `${ch.icon} ${ch.title}`;
    renderMap();
    renderSprites();
    updateObjective();
    hideDialog();
    // Chapter intro as a narration bubble
    narrate(ch.introZh);
  }

  function tileAt(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return '#';
    const o = overrides[`${x},${y}`];
    return o !== undefined ? o : ch.map[y][x];
  }

  function setOverride(x, y, t) {
    overrides[`${x},${y}`] = t;
  }

  function walkable(x, y) {
    const t = tileAt(x, y);
    return t === '.' || t === '=' || t === 'K' || t === 'S' || t === 'P' || t === 'Q';
  }

  function npcAt(x, y) {
    if (ch.boss.x === x && ch.boss.y === y) return ch.boss;
    return ch.npcs.find(n => n.x === x && n.y === y) || null;
  }

  function renderMap() {
    els.map.innerHTML = '';
    els.map.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    els.map.style.setProperty('--rpg-floor', ch.floor);
    els.map.style.setProperty('--rpg-path', ch.path);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = tileAt(x, y);
        const d = document.createElement('div');
        if (t === '#') { d.className = 'rpg-tile wall'; d.textContent = ch.wall; }
        else if (t === '*') { d.className = 'rpg-tile deco'; d.textContent = ch.deco; }
        else if (t === '=') { d.className = 'rpg-tile path'; }
        else if (t === 'K') { d.className = 'rpg-tile floor key'; d.textContent = '🔑'; }
        else if (t === 'D') { d.className = 'rpg-tile wall door'; d.textContent = ch.door || '🚪'; }
        else if (t === 'S') { d.className = 'rpg-tile floor switch'; d.textContent = '🎚️'; }
        else if (t === 'G') { d.className = 'rpg-tile wall gate'; d.textContent = ch.gate || '⛓️'; }
        else if (t === 'P') { d.className = 'rpg-tile floor portal portal-p'; d.textContent = '🌀'; }
        else if (t === 'Q') { d.className = 'rpg-tile floor portal portal-q'; d.textContent = '🌀'; }
        else if (t === 'H') { d.className = 'rpg-tile wall cracked'; d.textContent = ch.wall; }
        else if (t === '!') { d.className = 'rpg-tile floor chest'; d.textContent = '🎁'; }
        else { d.className = 'rpg-tile floor'; }
        els.map.appendChild(d);
      }
    }
  }

  function placeSprite(el, x, y) {
    el.style.left = (x / cols * 100) + '%';
    el.style.top = (y / rows * 100) + '%';
    el.style.width = (100 / cols) + '%';
    el.style.height = (100 / rows) + '%';
  }

  function renderSprites() {
    els.sprites.innerHTML = '';
    const done = chProg().npcs;
    ch.npcs.forEach(n => {
      const s = document.createElement('div');
      s.className = 'rpg-sprite npc';
      s.dataset.npc = n.id;
      s.innerHTML = `<span class="rpg-marker">${done.includes(n.id) ? '✅' : '💬'}</span>${n.emoji}`;
      placeSprite(s, n.x, n.y);
      els.sprites.appendChild(s);
    });
    const allDone = done.length >= ch.npcs.length;
    const b = document.createElement('div');
    b.className = 'rpg-sprite boss' + (allDone ? ' ready' : '');
    b.dataset.npc = ch.boss.id;
    b.innerHTML = `<span class="rpg-marker">${allDone ? '⚔️' : '🔒'}</span>${ch.boss.emoji}`;
    placeSprite(b, ch.boss.x, ch.boss.y);
    els.sprites.appendChild(b);

    const p = document.createElement('div');
    p.className = 'rpg-sprite player';
    p.id = 'rpg-player';
    p.textContent = GameEngine.getEquippedSkin?.()?.icon || '🧑‍🎓';
    placeSprite(p, px, py);
    els.sprites.appendChild(p);
  }

  function updateObjective() {
    const done = chProg().npcs.length;
    els.objective.textContent = done >= ch.npcs.length
      ? `⚔️ 去找 ${ch.boss.emoji} ${ch.boss.zh} 挑戰吧！`
      : `💬 和村民對話（${done} / ${ch.npcs.length}），再挑戰首領`;
  }

  function bumpPlayer() {
    const p = document.getElementById('rpg-player');
    if (p) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  }

  function movePlayerSprite(dx) {
    const p = document.getElementById('rpg-player');
    if (p) {
      placeSprite(p, px, py);
      if (dx !== 0) p.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
      p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop');
    }
  }

  function flashTile(x, y) {
    const d = els.map.children[y * cols + x];
    if (!d) return;
    d.classList.add('rpg-tile-flash');
    setTimeout(() => d.classList.remove('rpg-tile-flash'), 400);
  }

  // Open every G gate on the map; returns whether anything changed
  function openAllGates() {
    let changed = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (tileAt(x, y) === 'G') { setOverride(x, y, '.'); changed = true; }
      }
    }
    return changed;
  }

  function updateKeyChip() {
    if (!els.keyChip) {
      const chip = document.createElement('div');
      chip.className = 'rpg-key-chip';
      els.objective.parentElement.appendChild(chip);
      els.keyChip = chip;
    }
    els.keyChip.textContent = '🔑×' + keysHeld;
    els.keyChip.style.display = keysHeld > 0 ? '' : 'none';
  }

  function tryMove(dx, dy) {
    if (mode !== 'explore') return;
    const nx = px + dx, ny = py + dy;
    const npc = npcAt(nx, ny);
    if (npc) { startTalk(npc); return; }
    const t = tileAt(nx, ny);
    // Puzzle tiles: bump-and-transform blockers (the tile opens on this
    // press; a second press walks through — mirrors NPC-bump semantics)
    if (t === 'D') {
      if (keysHeld > 0) {
        keysHeld--;
        setOverride(nx, ny, '.');
        SoundManager.playAchievement();
        GameEngine.showToast('🚪 鑰匙打開了門！', 'achievement');
        updateKeyChip();
        renderMap();
        flashTile(nx, ny);
      } else {
        bumpPlayer();
        const now = Date.now();
        if (now - lastDoorToastAt > 1500) {
          lastDoorToastAt = now;
          GameEngine.showToast('🔒 需要鑰匙！先去找 🔑', 'error');
        }
      }
      return;
    }
    if (t === 'G') { bumpPlayer(); return; }
    if (t === '!') {
      setOverride(nx, ny, '.');
      GameEngine.addGems(3);
      GameEngine.showToast('🎁 打開寶箱！+3 💎', 'gem');
      SoundManager.playQuestComplete();
      renderMap();
      flashTile(nx, ny);
      return;
    }
    if (t === 'H') {
      setOverride(nx, ny, '.');
      GameEngine.showToast('🧱 牆壁碎了！發現通道', 'info');
      SoundManager.playCorrect();
      renderMap();
      flashTile(nx, ny);
      return;
    }
    if (!walkable(nx, ny)) { bumpPlayer(); return; }
    px = nx; py = ny;
    movePlayerSprite(dx);
    // Walk-onto puzzle tiles: side effect fires after the move
    if (t === 'K') {
      keysHeld++;
      setOverride(nx, ny, '.');
      SoundManager.playCorrect();
      GameEngine.showToast('🔑 撿到鑰匙！', 'gem');
      updateKeyChip();
      renderMap();
    } else if (t === 'S') {
      const key = `${nx},${ny}`;
      if (!switchesFired.has(key)) {
        switchesFired.add(key);
        if (openAllGates()) {
          SoundManager.playAchievement();
          GameEngine.showToast('🎚️ 機關啟動！閘門打開了', 'achievement');
          renderMap();
        }
      }
    } else if (t === 'P' || t === 'Q') {
      const partner = portalPairs[`${nx},${ny}`];
      if (partner) {
        px = partner.x; py = partner.y;
        SoundManager.playAchievement();
        GameEngine.showToast('🌀 傳送！', 'info');
        movePlayerSprite(0);
      }
    }
  }

  // ===== Dialogue engine =====
  function startTalk(npc) {
    const isBoss = npc.id === ch.boss.id;
    const prog = chProg();
    if (isBoss && prog.npcs.length < ch.npcs.length) {
      showDialog(npc);
      dlg = { npc, script: [{ say: '...', zh: npc.lockZh, lockOnly: true }], idx: -1, waiting: null, isBoss: false };
      advance();
      return;
    }
    if (!isBoss && prog.npcs.includes(npc.id)) {
      // Re-talk: friendly reminder, no repeated rewards
      showDialog(npc);
      dlg = { npc, script: [{ say: 'See you, my friend!', zh: `（${npc.zh}已經和你聊過了）再見，我的朋友！`, lockOnly: true }], idx: -1, waiting: null, isBoss: false };
      advance();
      return;
    }
    showDialog(npc);
    dlg = { npc, script: npc.talk, idx: -1, waiting: null, isBoss, firstTry: true };
    advance();
  }

  function narrate(zh) {
    showDialog({ emoji: '📜', name: '', zh: '' });
    els.dlgName.textContent = '— 冒險筆記 —';
    dlg = { npc: { id: '__narr' }, script: [{ say: '', zh, narration: true }], idx: -1, waiting: null, isBoss: false };
    advance();
  }

  function showDialog(npc) {
    mode = 'dialog';
    els.dialog.style.display = 'flex';
    els.dpad.classList.add('hidden');
    els.dlgFace.textContent = npc.emoji;
    els.dlgName.textContent = npc.name ? `${npc.name}（${npc.zh}）` : '';
    els.dlgOptions.innerHTML = '';
    els.dlgText.textContent = '';
    els.dlgZh.textContent = '';
    els.dlgMore.style.display = 'none';
  }

  function hideDialog() {
    els.dialog.style.display = 'none';
    els.dpad.classList.remove('hidden');
    stopTyping();
    dlg = null;
    if (mode !== 'select') mode = 'explore';
  }

  function currentEntry() {
    return dlg && dlg.script[dlg.idx];
  }

  function advance() {
    if (!dlg) return;
    // finish typewriter instantly if still typing
    if (dlg.waiting === 'typing') {
      finishTyping();
      return;
    }
    if (dlg.waiting === 'option') return; // must pick an answer
    dlg.idx++;
    if (dlg.idx >= dlg.script.length) {
      endTalk();
      return;
    }
    const e = dlg.script[dlg.idx];
    els.dlgOptions.innerHTML = '';
    const line = e.say !== undefined ? e.say : e.you !== undefined ? e.you : e.ask;
    if (e.you !== undefined) els.dlgName.textContent = '你（Hero）';
    typeText(line, e.zh, () => {
      if (e.ask !== undefined) showOptions(e);
      else {
        dlg.waiting = 'next';
        els.dlgMore.style.display = 'block';
      }
    });
    if (line && !e.narration && TTSManager.isSupported()) {
      TTSManager.speak(line, 'en-US', 0.92);
    }
  }

  function typeText(en, zh, onDone) {
    stopTyping();
    dlg.waiting = 'typing';
    els.dlgMore.style.display = 'none';
    els.dlgZh.textContent = zh || '';
    els.dlgText.textContent = '';
    const text = en || '';
    if (!text) { dlg.waiting = null; onDone(); return; }
    let i = 0;
    dlg.onTypeDone = onDone;
    dlg.fullText = text;
    typeTimer = setInterval(() => {
      i++;
      els.dlgText.textContent = text.slice(0, i);
      if (i >= text.length) {
        stopTyping();
        dlg.waiting = null;
        onDone();
      }
    }, TYPE_MS);
  }

  function finishTyping() {
    if (!dlg || !typeTimer) return;
    stopTyping();
    els.dlgText.textContent = dlg.fullText || '';
    const cb = dlg.onTypeDone;
    dlg.waiting = null;
    dlg.onTypeDone = null;
    if (cb) cb();
  }

  function stopTyping() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  }

  function showOptions(e) {
    dlg.waiting = 'option';
    dlg.firstTry = true;
    els.dlgOptions.innerHTML = '';
    // Shuffle the display order (data always lists the correct answer
    // first) so kids can't learn to just pick option 1
    const order = e.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach(orig => {
      const b = document.createElement('button');
      b.className = 'rpg-opt';
      b.dataset.orig = orig;
      b.innerHTML = `<span class="rpg-heart">❤️</span><span>${e.options[orig]}</span>`;
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        pickOption(e, orig, b);
      });
      els.dlgOptions.appendChild(b);
    });
    // Hint crystal: remove one wrong option
    if (GameEngine.hasBuff('hint') && e.options.length > 2) {
      const hb = document.createElement('button');
      hb.className = 'rpg-hint-btn';
      hb.textContent = '🔮 用提示水晶刪去一個錯誤選項';
      hb.addEventListener('click', ev => {
        ev.stopPropagation();
        if (!GameEngine.hasBuff('hint')) return;
        GameEngine.consumeBuff('hint');
        GameEngine.showToast('🔮 提示水晶生效！', 'achievement');
        const wrongs = [...els.dlgOptions.querySelectorAll('button.rpg-opt')]
          .filter(btn => Number(btn.dataset.orig) !== e.a && !btn.disabled);
        if (wrongs.length) { wrongs[0].disabled = true; wrongs[0].classList.add('eliminated'); }
        hb.remove();
      });
      els.dlgOptions.appendChild(hb);
    }
  }

  function pickOption(e, i, btn) {
    if (dlg.waiting !== 'option') return;
    const prog = chProg();
    if (i === e.a) {
      SoundManager.playCorrect();
      prog.asked++;
      if (dlg.firstTry) prog.right++;
      persist();
      // Rewards per conversation success
      let xp = dlg.firstTry ? 10 : 5;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      let gems = dlg.firstTry ? 1 : 0;
      if (gems && GameEngine.hasBuff('gem_bonus')) {
        gems += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }
      GameEngine.addXP(xp);
      if (gems) GameEngine.addGems(gems);
      GameEngine.recordRpgTalk();

      btn.classList.add('correct');
      dlg.waiting = null;
      setTimeout(() => advance(), 650);
    } else {
      SoundManager.playWrong();
      dlg.firstTry = false;
      btn.disabled = true;
      btn.classList.add('wrong');
      els.dlgZh.textContent = `💡 ${e.explain || ''} 再試一次！`;
    }
  }

  function endTalk() {
    const npc = dlg.npc;
    const wasLock = dlg.script.length && dlg.script[0].lockOnly;
    const isBoss = dlg.isBoss;
    hideDialog();
    if (npc.id === '__narr' || wasLock) return;

    const prog = chProg();
    if (isBoss) {
      chapterClear();
    } else if (!prog.npcs.includes(npc.id)) {
      prog.npcs.push(npc.id);
      persist();
      renderSprites();
      updateObjective();
      if (prog.npcs.length >= ch.npcs.length) {
        GameEngine.showToast(`⚔️ 首領 ${ch.boss.zh} 開放挑戰了！`, 'achievement');
      }
    }
  }

  function chapterClear() {
    const prog = chProg();
    const ratio = prog.asked ? prog.right / prog.asked : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : 1;
    const idx = RPG_CHAPTERS.findIndex(c => c.id === ch.id);
    // Capped so 36 chapters don't inflate rewards endlessly (idx 0-8 —
    // the original 9 chapters — are below both caps, values unchanged)
    let xp = 40 + 15 * Math.min(idx, 12);
    let gems = 10 + 2 * Math.min(idx, 15);
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += 5;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
    }
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);
    GameEngine.recordRpgChapter();
    SoundManager.playQuestComplete();

    save.done[ch.id] = Math.max(save.done[ch.id] || 0, stars);
    delete save.progress[ch.id]; // fresh star run next time
    persist();

    els.world.style.display = 'none';
    const next = RPG_CHAPTERS[idx + 1];
    els.clearInfo.innerHTML =
      `<div class="rpg-clear-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` +
      `${ch.icon} <b>${ch.title}</b> 通關！（答對率 ${Math.round(ratio * 100)}%）<br>` +
      `獲得 <b>+${xp} XP</b> 和 <b>+${gems} 💎</b><br>` +
      (next ? `🔓 已解鎖：第 ${idx + 2} 章 ${next.icon} ${next.title}` : '🏆 你完成了目前所有章節，敬請期待新章節！');
    els.clear.style.display = 'flex';
  }

  return { init };
})();
