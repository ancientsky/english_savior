/* ===== Word Wizard Module (單字魔法師) =====
   Scribblenauts-style summon puzzle. The little wizard is blocked; the player
   spells an English word to summon that object, and the object's ABILITY TAGS
   (from js/data/wizard.js) decide whether it clears the blocker.

   The design point: a level never has one right answer. Each obstacle lists
   every tag that beats it, so "know more words" literally means "have more
   ways through".

   Two award tracks, deliberately separate:
     ⭐ stars      how well THIS run went — no hint, no wasted summons, magic
                   left over. Efficiency.
     📖 solutions  how many different tags you have ever used to clear the
                   level. Collection, across runs, and the reason to come back
                   with a new idea.
   Collapsing them (e.g. "3★ = clear in 3 summons") would delete the only
   incentive to look for a second answer, which is the whole game.

   Magic (mana) is the one way to lose: 3 + obstacles per level, one per
   summon, hit or miss. Without it, browsing the spellbook and casting
   everything was strictly better than thinking.

   Physics is deliberately not a rigid-body engine: summoned objects fall to a
   resting spot chosen by what they solved. It reads as physical, is fully
   deterministic, and can never wedge a child in an unwinnable scene.

   Save: localStorage `english_savior_wizard`
     { cleared: {levelId: stars}, found: {levelId: [tags]}, learned: [words], diff }
*/

const WizardGame = (() => {
  const SAVE_KEY = 'english_savior_wizard';

  // Logical canvas space — all drawing code uses these, the backing store is
  // scaled up for HiDPI in fitCanvas() (same approach as js/sling.js).
  const W = 900, H = 360;
  const GROUND_Y = 244;          // sky above, a deep band below for water/pits
  const WIZ_START_X = 52;
  const GOAL_X = W - 46;
  const WALL_H = 132;
  const EMOJI_FONT = '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji","Twemoji Mozilla",sans-serif';

  // Reward per successful summon, by difficulty (see CLAUDE.md reward table).
  const DIFFS = {
    easy:   { label: '簡單', xp: 10, gem: 1, desc: '點字母方塊拼字' },
    medium: { label: '中等', xp: 14, gem: 1, desc: '用鍵盤打字（給第一個字母）' },
    hard:   { label: '困難', xp: 18, gem: 2, desc: '用鍵盤打字（沒有提示）' },
  };
  const NEW_SOLUTION_XP = 15, NEW_SOLUTION_GEMS = 2;

  // First clear of a level, by how deep the level is (matches Candy/Tower).
  function clearReward(levelIndex) {
    if (levelIndex < 9) return { xp: 30, gems: 5 };
    if (levelIndex < 19) return { xp: 45, gems: 8 };
    return { xp: 60, gems: 11 };
  }

  let canvas = null, ctx = null, rafId = null, lastTime = 0;
  let els = {};

  let save = { cleared: {}, found: {}, learned: [], diff: 'easy' };
  let difficulty = 'easy';

  // ---- current run ----
  let level = null;         // WIZARD_LEVELS entry
  let levelIndex = -1;
  let obstacles = [];       // [{ type, cx, x0, x1, solved, solveTag, solveWord, anim }]
  let objects = [];         // summoned things (solving ones + harmless clutter)
  let wizard = { x: WIZ_START_X, y: GROUND_Y, state: 'idle' };
  let walkAnim = null;      // { fromX, toX, t, dur }
  let runFoundTags = null;  // Set of tags used successfully this level
  let finished = false;
  // ---- W2: mana. Every summon costs one, hit or miss. Running out is the
  // only way to lose, and it's what makes "which word do I pick" a decision
  // instead of a shopping trip through the spellbook.
  let mana = 0, manaMax = 0;
  let runHintUsed = false;  // ⭐⭐ requires clearing without opening a hint
  let runWasted = 0;        // summons that solved nothing — blocks ⭐⭐⭐
  let hintShown = false;    // hint text currently revealed for this obstacle
  let effects = [];         // transient puffs/sparkles
  let deco = [];            // background scenery positions for this level

  // ---- spell panel state ----
  let spellWord = null;     // WIZARD_WORDS entry being cast
  let spellSlots = [];      // easy mode: chosen tile indices
  let spellTiles = [];      // easy mode: [{ ch, used }]
  let spellFlawed = false;  // hint used or a wrong attempt → reduced reward
  let bookFilter = 'all';

  /* ================= save ================= */

  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && typeof d === 'object') {
        save = {
          cleared: d.cleared && typeof d.cleared === 'object' ? d.cleared : {},
          found: d.found && typeof d.found === 'object' ? d.found : {},
          learned: Array.isArray(d.learned) ? d.learned : [],
          diff: DIFFS[d.diff] ? d.diff : 'easy',
        };
      }
    } catch { /* first run — defaults stand */ }
    difficulty = save.diff;
  }

  function persist() {
    save.diff = difficulty;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota */ }
  }

  function clearedCount() { return Object.keys(save.cleared).length; }

  // Which spellbook page (word tier) the player has reached.
  function bookTier() {
    const n = clearedCount();
    let tier = 1;
    for (let lv = 1; lv <= 5; lv++) if (n >= (WIZARD_UNLOCK[lv] ?? Infinity)) tier = lv;
    return tier;
  }

  function unlockedWords() { return WIZARD_WORDS.filter(w => w.lv <= bookTier()); }

  // Every distinct tag that can solve this level — the 3★ target is capped at
  // 4 so the 9-tag final level stays reachable.
  function levelTags(l) {
    const s = new Set();
    l.obs.forEach(o => WIZARD_OBSTACLES[o].solve.forEach(t => s.add(t)));
    return [...s];
  }
  function starTarget(l) { return Math.min(4, levelTags(l).length); }

  // W2: how much magic this level gives you. A little more than the number of
  // blockers, so one wrong guess per obstacle is survivable but browsing isn't.
  function manaFor(l) { return l.mana ?? (3 + l.obs.length); }

  // W5: two tracks that measure different things and must not be collapsed.
  //   ⭐ stars    — how well you played THIS run (efficiency)
  //   📖 solutions — how many different ways you have ever found (collection)
  // Merging them would kill the only reason to replay a level with a new idea,
  // which is the whole reason the obstacles list several solving tags.
  function starsFor(l) { return save.cleared[l.id] || 0; }

  function runStars() {
    if (runHintUsed) return 1;      // a hint was opened
    if (runWasted > 0) return 2;    // cleared, no hints, but some summons missed
    return mana > 0 ? 3 : 2;        // perfect line, with magic to spare
  }

  function foundCount(l) { return (save.found[l.id] || []).length; }

  function isUnlocked(i) { return i === 0 || save.cleared[WIZARD_LEVELS[i - 1].id] !== undefined; }

  /* ================= canvas ================= */

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) {
      // Zone hidden (display:none) — getBoundingClientRect is 0×0 here, so keep
      // a plain 1× buffer; onShow()/resize upgrades it once it's really visible.
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min((rect.width * dpr) / W, 3);
    const bw = Math.round(W * scale), bh = Math.round(H * scale);
    if (canvas.width === bw && canvas.height === bh) return;
    canvas.width = bw; canvas.height = bh;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function drawEmoji(txt, x, y, size, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ================= level setup ================= */

  function chapterOf(l) { return WIZARD_CHAPTERS.find(c => c.id === l.ch) || WIZARD_CHAPTERS[0]; }

  function layoutObstacles() {
    const n = obstacles.length;
    const span = W - 250;
    const zw = Math.max(80, Math.min(140, span / n - 24));
    obstacles.forEach((o, i) => {
      o.cx = 130 + (span * (i + 0.5)) / n;
      o.x0 = o.cx - zw / 2;
      o.x1 = o.cx + zw / 2;
    });
  }

  function startLevel(i) {
    levelIndex = i;
    level = WIZARD_LEVELS[i];
    obstacles = level.obs.map(type => ({ type, solved: false, solveTag: null, solveWord: null, anim: 0 }));
    layoutObstacles();
    objects = [];
    effects = [];
    wizard = { x: WIZ_START_X, y: GROUND_Y, state: 'idle' };
    walkAnim = null;
    finished = false;
    runFoundTags = new Set();
    manaMax = manaFor(level);
    mana = manaMax;
    runHintUsed = false;
    runWasted = 0;
    hintShown = false;

    // Scenery: deterministic-ish scatter so the scene doesn't re-shuffle on redraw
    const ch = chapterOf(level);
    deco = [];
    for (let d = 0; d < 8; d++) {
      deco.push({
        e: ch.deco[d % ch.deco.length],
        x: 20 + (d * 137 + level.ch * 53) % (W - 40),
        y: GROUND_Y - 14 - ((d * 37) % 30),   // hugs the ground, not floating mid-sky
        s: 22 + ((d * 29) % 16),
      });
    }

    GameEngine.setDeferLevelUp(true);
    showScreen(null);
    renderHUD();
    renderTask();
    ensureLoop();
    toast(`${chapterOf(level).icon} ${level.name}`, level.intro, 3200);
  }

  function currentObstacle() { return obstacles.find(o => !o.solved) || null; }

  /* ================= summoning ================= */

  // Where a summoned object comes to rest, and what it does to the scene.
  function restingSpot(o, tag) {
    if (!o) return { x: wizard.x + 70, y: GROUND_Y - 18, float: false };
    if (tag === 'fly') return { x: o.cx, y: GROUND_Y - 120, float: true };
    switch (o.type) {
      case 'river':
        if (tag === 'cold') return { x: o.cx, y: GROUND_Y - 14, float: false };
        if (tag === 'float') return { x: o.cx, y: GROUND_Y - 4, float: true };
        return { x: o.cx, y: GROUND_Y - 20, float: false };            // long → plank
      case 'pit':
        if (tag === 'heavy') return { x: o.cx, y: GROUND_Y + 40, float: false };
        if (tag === 'climb') return { x: o.x0 + 8, y: GROUND_Y + 10, float: false };
        return { x: o.cx, y: GROUND_Y - 20, float: false };
      case 'wall':
        if (tag === 'climb') return { x: o.x0 - 16, y: GROUND_Y - WALL_H / 2, float: false };
        return { x: o.x0 - 20, y: GROUND_Y - WALL_H / 2 + 10, float: false };
      case 'flame':   return { x: o.cx, y: GROUND_Y - 46, float: true };
      case 'rope':    return { x: o.cx, y: GROUND_Y - 60, float: true };
      case 'monster': return { x: o.cx - 34, y: GROUND_Y - 26, float: false };
      case 'dark':    return { x: o.cx, y: GROUND_Y - 90, float: true };
      case 'lock':    return { x: o.cx - 30, y: GROUND_Y - 40, float: false };
      default:        return { x: o.cx, y: GROUND_Y - 20, float: false };
    }
  }

  // Called once the player has spelled the word correctly.
  function summon(word) {
    const o = currentObstacle();
    // A word can carry several abilities (ice = 冰 + 浮). Credit the one the
    // player hasn't discovered on this level yet, otherwise a multi-tag word
    // would keep re-scoring the same solution and never earn the next star.
    const alreadyFound = save.found[level.id] || [];
    const matches = o ? WIZARD_OBSTACLES[o.type].solve.filter(t => word.tags.includes(t)) : [];
    const solveTag = matches.find(t => !alreadyFound.includes(t)) || matches[0] || null;
    const spot = restingSpot(o, solveTag);

    const obj = {
      word, e: word.e,
      x: spot.x + (solveTag ? 0 : (objects.length % 3 - 1) * 26),
      y: -40, vy: 0,
      targetY: solveTag ? spot.y : GROUND_Y - 18,
      floaty: solveTag ? spot.float : false,
      bob: Math.random() * Math.PI * 2,
      landed: false,
      solving: !!solveTag,
    };
    objects.push(obj);
    // Cap the harmless clutter so the scene stays readable
    const junk = objects.filter(x => !x.solving);
    while (junk.length > 5) objects.splice(objects.indexOf(junk.shift()), 1);

    if (typeof TTSManager !== 'undefined') TTSManager.speak(word.w);

    // Magic is spent whether or not the summon helps — that is what makes
    // stopping to think worth more than trying the next card.
    mana = Math.max(0, mana - 1);
    if (!solveTag) runWasted++;

    // ---- spelling reward (the learning act, independent of whether it worked) ----
    const cfg = DIFFS[difficulty];
    if (spellFlawed) {
      GameEngine.addXP(Math.floor(cfg.xp / 2));
    } else {
      GameEngine.addXP(cfg.xp);
      GameEngine.addGems(cfg.gem);
    }
    GameEngine.recordWizardCast();
    if (!save.learned.includes(word.w)) { save.learned.push(word.w); }
    persist();

    if (solveTag) {
      SoundManager.playCorrect();
      o.solved = true;
      o.solveTag = solveTag;
      o.solveWord = word;
      o.solveObj = obj;
      o.anim = 0;
      hintShown = false;
      burst(o.cx, GROUND_Y - 60, 14);

      // ---- new way of solving this level? ----
      const known = save.found[level.id] || [];
      const fresh = !known.includes(solveTag);
      runFoundTags.add(solveTag);
      if (fresh) {
        known.push(solveTag);
        save.found[level.id] = known;
        persist();
        GameEngine.addXP(NEW_SOLUTION_XP);
        GameEngine.addGems(NEW_SOLUTION_GEMS);
        GameEngine.recordWizardSolution();
        toast('✨ 新解法！', `用「${WIZARD_TAGS[solveTag].name}」破解 — 這一關你已經找到 ${known.length}/${starTarget(level)} 種解法`, 2800);
      } else {
        toast(`${WIZARD_TAGS[solveTag].icon} 成功！`, `${word.e} ${word.w}（${word.zh}）${WIZARD_TAGS[solveTag].verb}`, 2400);
      }
      renderHUD();
      setTimeout(startWalk, 720);
    } else {
      SoundManager.playWrong();
      const info = o ? WIZARD_OBSTACLES[o.type] : null;
      // Still no answer here — just the situation again, plus what it cost.
      toast('🤔 沒有用…', info
        ? `${word.e} ${word.w}（${word.zh}）幫不上忙。${info.tip}　剩下 ${mana} 點魔力。`
        : `${word.e} ${word.w}（${word.zh}）掉出來了！`, 3200);
      if (mana <= 0 && !finished) { setTimeout(outOfMana, 900); }
    }
    renderHUD();
    renderTask();
  }

  // W2: magic ran out with the path still blocked. Nothing already earned is
  // taken back — the level simply has to be started again.
  function outOfMana() {
    if (finished || currentObstacle() === null) return;
    finished = true;
    wizard.state = 'idle';
    SoundManager.playWrong();
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    const o = currentObstacle();
    const info = WIZARD_OBSTACLES[o.type];
    els.doneBody.innerHTML = `
      <div class="wz-done-icon">🪫</div>
      <h3>魔力用完了</h3>
      <p class="wz-done-line">還剩「${info.icon} ${info.name}」沒有解決。</p>
      <p class="wz-done-line">${info.tip}</p>
      <p class="wz-done-tip">💡 這一關有 <strong>${manaMax}</strong> 點魔力，每召喚一次就用掉一點——
        先想好哪個東西真的有用，再拼它。剛才賺到的 XP 和 💎 都留著喔！</p>
      <div class="wz-done-row">
        <button class="wz-btn wz-btn-main wz-btn-big" id="wz-retry">🔄 再試一次</button>
        <button class="wz-btn" id="wz-map">🗺️ 關卡</button>
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#wz-retry').addEventListener('click', () => {
      els.done.classList.remove('open');
      startLevel(levelIndex);
    });
    els.doneBody.querySelector('#wz-map').addEventListener('click', () => {
      els.done.classList.remove('open');
      openLevels();
    });
  }

  /* ================= wizard movement ================= */

  function standX(i) { return obstacles[i].x0 - 26; }

  function startWalk() {
    const nextIdx = obstacles.findIndex(o => !o.solved);
    const toX = nextIdx === -1 ? GOAL_X - 26 : standX(nextIdx);
    if (toX <= wizard.x + 1) { if (nextIdx === -1) finishLevel(); return; }
    walkAnim = { fromX: wizard.x, toX, t: 0, dur: Math.max(0.5, (toX - wizard.x) / 300) };
    wizard.state = 'walk';
    ensureLoop();
  }

  // Height the wizard is lifted at a given x — riding something that flies, or
  // going over the top of a wall.
  function liftAt(x) {
    let lift = 0;
    obstacles.forEach(o => {
      if (!o.solved) return;
      const a = o.x0 - 24, b = o.x1 + 24;
      if (x < a || x > b) return;
      let L = 0;
      if (o.solveTag === 'fly') L = 130;
      else if (o.type === 'wall') L = WALL_H + 26;
      else if (o.type === 'rope') L = 0;
      if (!L) return;
      const u = (x - a) / (b - a);
      lift = Math.max(lift, L * Math.sin(Math.PI * u));
    });
    return lift;
  }

  function finishLevel() {
    if (finished) return;
    finished = true;
    wizard.state = 'win';
    SoundManager.playQuestComplete();
    burst(GOAL_X, GROUND_Y - 70, 26);

    const firstClear = save.cleared[level.id] === undefined;
    const reward = clearReward(levelIndex);
    if (firstClear) {
      GameEngine.addXP(reward.xp);
      GameEngine.addGems(reward.gems);
      GameEngine.recordWizardLevel();
    } else {
      GameEngine.addXP(Math.floor(reward.xp / 2));
    }
    // ⭐ measures THIS run; the record keeps the best run ever.
    const stars = runStars();
    save.cleared[level.id] = Math.max(save.cleared[level.id] || 0, stars);
    persist();

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    setTimeout(() => showDone(firstClear, reward, stars), 900);
  }

  /* ================= effects ================= */

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 60 + Math.random() * 110;
      effects.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.8, max: 0.8 });
    }
  }

  /* ================= render ================= */

  function draw() {
    const ch = chapterOf(level);
    ctx.clearRect(0, 0, W, H);

    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, ch.sky[0]);
    g.addColorStop(1, ch.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GROUND_Y);

    deco.forEach(d => drawEmoji(d.e, d.x, d.y, d.s, 0.5));

    // ---- ground (with holes punched for rivers and unfilled pits) ----
    ctx.fillStyle = ch.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = ch.deep;
    ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
    obstacles.forEach(o => {
      if (o.type !== 'river' && o.type !== 'pit') return;
      const filled = o.solved && (o.solveTag === 'heavy' || o.solveTag === 'cold');
      if (o.type === 'pit') {
        ctx.fillStyle = '#1b1b26';
        ctx.fillRect(o.x0, GROUND_Y, o.x1 - o.x0, H - GROUND_Y);
        if (filled) { ctx.fillStyle = ch.deep; ctx.fillRect(o.x0, GROUND_Y + 26, o.x1 - o.x0, H - GROUND_Y); }
      } else {
        ctx.fillStyle = filled ? '#cfefff' : '#2f8fd6';
        ctx.fillRect(o.x0, GROUND_Y, o.x1 - o.x0, H - GROUND_Y);
        if (!filled) {
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          for (let x = o.x0; x < o.x1; x += 18) ctx.fillRect(x + 2, GROUND_Y + 4, 10, 3);
        }
      }
    });

    // ---- solved obstacles get a walkway so "you can cross now" is obvious ----
    obstacles.forEach(o => {
      if (!o.solved || o.solveTag === 'fly' || o.type === 'wall') return;
      ctx.fillStyle = o.solveTag === 'cold' ? '#eaf8ff' : '#b5793f';
      roundRect(o.x0 - 14, GROUND_Y - 8, o.x1 - o.x0 + 28, 9, 4);
      ctx.fill();
    });

    objects.forEach(ob => drawEmoji(ob.e, ob.x, ob.y, 46));

    obstacles.forEach(o => drawObstacle(o));

    // ---- goal ----
    const bob = Math.sin(performance.now() / 320) * 5;
    drawEmoji('⭐', GOAL_X, GROUND_Y - 40 + bob, 54);

    // ---- wizard (always the wizard — this game's character is the wizard) ----
    drawEmoji('🧙', wizard.x, wizard.y - 26, 52);
    if (wizard.state === 'win') drawEmoji('🎉', wizard.x + 30, wizard.y - 54, 30);

    effects.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawObstacle(o) {
    const t = performance.now() / 300;
    switch (o.type) {
      case 'wall': {
        ctx.fillStyle = o.solved ? '#9b8f7e' : '#7d7367';
        roundRect(o.cx - 24, GROUND_Y - WALL_H, 48, WALL_H, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.22)';
        ctx.lineWidth = 1.5;
        for (let y = GROUND_Y - WALL_H + 16; y < GROUND_Y; y += 16) {
          ctx.beginPath(); ctx.moveTo(o.cx - 24, y); ctx.lineTo(o.cx + 24, y); ctx.stroke();
        }
        if (o.solved) drawEmoji('🚩', o.cx, GROUND_Y - WALL_H - 14, 26);
        break;
      }
      case 'flame':
        if (o.solved) { drawEmoji('💨', o.cx, GROUND_Y - 26, 34, 0.75); break; }
        for (let x = o.x0; x <= o.x1; x += 26) {
          drawEmoji('🔥', x, GROUND_Y - 22 + Math.sin(t + x) * 4, 38);
        }
        break;
      case 'rope':
        if (o.solved) { drawEmoji('🍂', o.cx, GROUND_Y - 22, 30, 0.7); break; }
        ctx.strokeStyle = 'rgba(240,240,255,.75)';
        ctx.lineWidth = 2;
        for (let x = o.x0; x <= o.x1; x += 14) {
          ctx.beginPath(); ctx.moveTo(x, GROUND_Y - 132); ctx.lineTo(x, GROUND_Y); ctx.stroke();
        }
        for (let y = GROUND_Y - 132; y <= GROUND_Y; y += 18) {
          ctx.beginPath(); ctx.moveTo(o.x0, y); ctx.lineTo(o.x1, y); ctx.stroke();
        }
        drawEmoji('🕸️', o.cx, GROUND_Y - 66, 46);
        break;
      case 'monster':
        drawEmoji(o.solved ? '😋' : '👹', o.solved ? o.x1 + 10 : o.cx, GROUND_Y - 30, 58);
        break;
      case 'dark':
        if (o.solved) break;
        ctx.save();
        ctx.fillStyle = 'rgba(6,6,18,.9)';
        ctx.fillRect(o.x0 - 20, 0, o.x1 - o.x0 + 40, H);
        ctx.restore();
        drawEmoji('🌑', o.cx, GROUND_Y - 84, 46);
        break;
      case 'lock':
        drawEmoji('🚪', o.cx, GROUND_Y - 46, 62);
        if (!o.solved) drawEmoji('🔒', o.cx, GROUND_Y - 42, 34);
        else drawEmoji('✨', o.cx + 24, GROUND_Y - 72, 24);
        break;
      default: break;   // river / pit are drawn with the terrain
    }

    // Highlight the blocker the player is working on
    if (o === currentObstacle()) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,214,102,${0.55 + Math.sin(t * 2) * 0.25})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      roundRect(o.x0 - 18, GROUND_Y - 152, o.x1 - o.x0 + 36, 168, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ================= loop ================= */

  function step(dt) {
    objects.forEach(ob => {
      if (!ob.landed) {
        ob.vy += 900 * dt;
        ob.y += ob.vy * dt;
        if (ob.y >= ob.targetY) {
          ob.y = ob.targetY;
          if (Math.abs(ob.vy) < 90) { ob.landed = true; ob.vy = 0; }
          else ob.vy *= -0.34;
        }
      } else if (ob.floaty) {
        ob.bob += dt * 2.2;
        ob.y = ob.targetY + Math.sin(ob.bob) * 4;
      }
    });

    if (walkAnim) {
      walkAnim.t += dt;
      const u = Math.min(1, walkAnim.t / walkAnim.dur);
      wizard.x = walkAnim.fromX + (walkAnim.toX - walkAnim.fromX) * u;
      wizard.y = GROUND_Y - liftAt(wizard.x);
      if (u >= 1) {
        walkAnim = null;
        wizard.state = 'idle';
        if (!obstacles.some(o => !o.solved)) finishLevel();
        else renderTask();
      }
    } else if (wizard.state !== 'win') {
      wizard.y = GROUND_Y - liftAt(wizard.x);
    }

    // A flying mount carries the wizard across instead of hovering on its own
    obstacles.forEach(o => {
      if (!o.solved || o.solveTag !== 'fly' || !o.solveObj || !o.solveObj.landed) return;
      if (wizard.x > o.x0 - 30 && wizard.x < o.x1 + 30) {
        o.solveObj.x = wizard.x - 6;
        o.solveObj.y = wizard.y - 6;
      }
    });

    effects.forEach(p => {
      p.life -= dt;
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    effects = effects.filter(p => p.life > 0);
  }

  function loop(now) {
    // Zone hidden (player navigated away) — park the loop; onShow() restarts it.
    const zone = document.getElementById('zone-wizard');
    if (zone && !zone.classList.contains('active')) { stopLoop(); return; }
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    step(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function ensureLoop() {
    if (rafId || !level) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ================= DOM: shell ================= */

  function buildShell() {
    const root = document.getElementById('wz-root');
    if (!root) return false;
    root.innerHTML = `
      <div class="wz-stage">
        <canvas id="wz-canvas" width="${W}" height="${H}"></canvas>
        <div class="wz-hud">
          <span class="wz-chip" id="wz-hud-level">—</span>
          <span class="wz-chip wz-chip-mana" id="wz-hud-mana"></span>
          <span class="wz-chip" id="wz-hud-found"></span>
          <span class="wz-chip" id="wz-hud-book"></span>
        </div>
        <div class="wz-toast" id="wz-toast"></div>
      </div>

      <div class="wz-bar">
        <div class="wz-task" id="wz-task">
          <span class="wz-task-icon" id="wz-task-icon">🪄</span>
          <div class="wz-task-text">
            <div class="wz-task-name" id="wz-task-name">選一個關卡開始</div>
            <div class="wz-task-tip" id="wz-task-tip"></div>
          </div>
          <button class="wz-btn wz-btn-ghost wz-hint-btn" id="wz-hint-btn"
                  title="會少一顆星">💡 想不出來</button>
        </div>
        <div class="wz-actions">
          <button class="wz-btn wz-btn-main" id="wz-book-btn">📖 魔法書</button>
          <button class="wz-btn" id="wz-map-btn">🗺️ 關卡</button>
          <button class="wz-btn" id="wz-retry-btn" title="重新開始這一關">🔄</button>
        </div>
      </div>

      <div class="wz-screen" id="wz-start">
        <h3>🪄 單字魔法師</h3>
        <p>小巫師被困住了！<strong>拼出英文單字就能把那個東西召喚出來</strong>，用它想辦法讓小巫師走到 ⭐。</p>
        <p>⛵ 船會浮在水上、🪨 石頭會把坑填平、🪜 梯子可以爬、🎈 氣球帶你飛、🧊 冰塊把水凍起來……
          <strong>什麼東西有什麼用，要自己想</strong>——魔法書是照「種類」排的，不會告訴你答案。</p>
        <p>每一關的 🔮 <strong>魔力有限</strong>，召喚一次就用掉一點，用完就得重來，所以先想清楚再拼。</p>
        <p>⭐ 看你這一次玩得多漂亮（沒看提示 ⭐⭐、每個難關都一次解掉又有魔力剩下 ⭐⭐⭐）；
          📖 記錄你<strong>總共想到幾種不同的解法</strong>——每一關都不只一種喔！</p>
        <div class="wz-diff" id="wz-diff"></div>
        <button class="wz-btn wz-btn-main wz-btn-big" id="wz-start-btn">🗺️ 打開關卡地圖</button>
      </div>

      <div class="wz-overlay" id="wz-levels">
        <div class="wz-panel">
          <div class="wz-panel-head">
            <h3>🗺️ 關卡地圖</h3>
            <span class="wz-panel-sub" id="wz-levels-sub"></span>
            <button class="wz-close" data-wz-close="wz-levels">✕</button>
          </div>
          <div class="wz-levels-body" id="wz-levels-body"></div>
        </div>
      </div>

      <div class="wz-overlay" id="wz-book">
        <div class="wz-panel">
          <div class="wz-panel-head">
            <h3>📖 魔法書</h3>
            <span class="wz-panel-sub" id="wz-book-sub"></span>
            <button class="wz-close" data-wz-close="wz-book">✕</button>
          </div>
          <div class="wz-filters" id="wz-filters"></div>
          <div class="wz-cards" id="wz-cards"></div>
        </div>
      </div>

      <div class="wz-overlay" id="wz-spell">
        <div class="wz-panel wz-panel-narrow">
          <div class="wz-panel-head">
            <h3>✨ 唸出咒語</h3>
            <button class="wz-close" data-wz-close="wz-spell">✕</button>
          </div>
          <div class="wz-spell-body" id="wz-spell-body"></div>
        </div>
      </div>

      <div class="wz-overlay" id="wz-done">
        <div class="wz-panel wz-panel-narrow">
          <div class="wz-done-body" id="wz-done-body"></div>
        </div>
      </div>
    `;

    els = {
      root,
      hudLevel: root.querySelector('#wz-hud-level'),
      hudMana: root.querySelector('#wz-hud-mana'),
      hudFound: root.querySelector('#wz-hud-found'),
      hudBook: root.querySelector('#wz-hud-book'),
      toast: root.querySelector('#wz-toast'),
      taskIcon: root.querySelector('#wz-task-icon'),
      taskName: root.querySelector('#wz-task-name'),
      taskTip: root.querySelector('#wz-task-tip'),
      hintBtn: root.querySelector('#wz-hint-btn'),
      start: root.querySelector('#wz-start'),
      diffRow: root.querySelector('#wz-diff'),
      levels: root.querySelector('#wz-levels'),
      levelsBody: root.querySelector('#wz-levels-body'),
      levelsSub: root.querySelector('#wz-levels-sub'),
      book: root.querySelector('#wz-book'),
      bookSub: root.querySelector('#wz-book-sub'),
      filters: root.querySelector('#wz-filters'),
      cards: root.querySelector('#wz-cards'),
      spell: root.querySelector('#wz-spell'),
      spellBody: root.querySelector('#wz-spell-body'),
      done: root.querySelector('#wz-done'),
      doneBody: root.querySelector('#wz-done-body'),
    };

    canvas = root.querySelector('#wz-canvas');
    ctx = canvas.getContext('2d');
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    root.querySelectorAll('[data-wz-close]').forEach(b => {
      b.addEventListener('click', () => root.querySelector('#' + b.dataset.wzClose).classList.remove('open'));
    });
    root.querySelectorAll('.wz-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });
    root.querySelector('#wz-start-btn').addEventListener('click', openLevels);
    root.querySelector('#wz-map-btn').addEventListener('click', openLevels);
    root.querySelector('#wz-book-btn').addEventListener('click', openBook);
    root.querySelector('#wz-retry-btn').addEventListener('click', () => { if (level) startLevel(levelIndex); });
    els.hintBtn.addEventListener('click', revealHint);
    return true;
  }

  function showScreen(name) {
    els.start.style.display = name === 'start' ? '' : 'none';
  }

  function toast(title, body, ms = 2600) {
    els.toast.innerHTML = `<strong>${title}</strong>${body ? `<span>${body}</span>` : ''}`;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  function renderHUD() {
    if (!level) {
      els.hudLevel.textContent = `🪄 ${clearedCount()} / ${WIZARD_LEVELS.length} 關`;
      els.hudMana.textContent = '';
      els.hudMana.classList.remove('low');
      els.hudFound.textContent = '';
      els.hudBook.textContent = `📖 第 ${bookTier()} 頁`;
      return;
    }
    const n = levelIndex + 1;
    els.hudLevel.textContent = `${chapterOf(level).icon} 第 ${n} 關　${level.name}`;
    els.hudMana.textContent = `🔮 魔力 ${'●'.repeat(mana)}${'○'.repeat(Math.max(0, manaMax - mana))}`;
    els.hudMana.classList.toggle('low', mana <= 1);
    const target = starTarget(level);
    els.hudFound.textContent =
      `${'⭐'.repeat(starsFor(level)) || '☆☆☆'}　📖 ${Math.min(foundCount(level), target)}/${target} 種解法`;
    els.hudBook.textContent = `📖 第 ${bookTier()} 頁（${unlockedWords().length} 字）`;
  }

  function renderTask() {
    els.hintBtn.style.display = 'none';
    if (!level) {
      els.taskIcon.textContent = '🪄';
      els.taskName.textContent = '選一個關卡開始';
      els.taskTip.textContent = '';
      return;
    }
    const o = currentObstacle();
    if (!o) {
      els.taskIcon.textContent = '⭐';
      els.taskName.textContent = '路通了！小巫師出發囉';
      els.taskTip.textContent = '';
      return;
    }
    const info = WIZARD_OBSTACLES[o.type];
    els.taskIcon.textContent = info.icon;
    els.taskName.textContent = `${info.name} — ${info.zh}`;
    // W1: the situation is always visible, the ways through never are — the
    // whole puzzle used to be printed here, so the game was "read, then tap".
    els.taskTip.textContent = hintShown ? info.hint : info.tip;
    els.taskTip.classList.toggle('revealed', hintShown);
    els.hintBtn.style.display = hintShown ? 'none' : '';
  }

  function revealHint() {
    const o = currentObstacle();
    if (!o) return;
    hintShown = true;
    runHintUsed = true;
    renderTask();
    toast('💡 提示', `${WIZARD_OBSTACLES[o.type].hint}（這一次最多 ⭐，但 📖 解法收集不受影響）`, 4000);
  }

  /* ================= DOM: level map ================= */

  function openLevels() {
    els.levelsSub.textContent = `已通過 ${clearedCount()} / ${WIZARD_LEVELS.length}　魔法書第 ${bookTier()} 頁`;
    els.levelsBody.innerHTML = '';
    WIZARD_CHAPTERS.forEach(ch => {
      const sec = document.createElement('div');
      sec.className = 'wz-chapter';
      sec.innerHTML = `<h4>${ch.icon} 第 ${ch.id} 章　${ch.name}</h4>`;
      const grid = document.createElement('div');
      grid.className = 'wz-level-grid';
      WIZARD_LEVELS.forEach((l, i) => {
        if (l.ch !== ch.id) return;
        const open = isUnlocked(i);
        const stars = starsFor(l);
        const btn = document.createElement('button');
        btn.className = 'wz-level' + (open ? '' : ' locked') + (l.boss ? ' boss' : '');
        btn.disabled = !open;
        btn.innerHTML = open
          ? `<span class="wz-level-no">${i + 1}${l.boss ? ' 👑' : ''}</span>
             <span class="wz-level-name">${l.name}</span>
             <span class="wz-level-stars">${stars ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆'}</span>
             <span class="wz-level-found">📖 ${Math.min(foundCount(l), starTarget(l))}/${starTarget(l)}　🔮 ${manaFor(l)}</span>`
          : `<span class="wz-level-no">🔒</span><span class="wz-level-name">???</span>
             <span class="wz-level-stars">☆☆☆</span><span class="wz-level-found"></span>`;
        if (open) btn.addEventListener('click', () => { els.levels.classList.remove('open'); startLevel(i); });
        grid.appendChild(btn);
      });
      sec.appendChild(grid);
      els.levelsBody.appendChild(sec);
    });
    els.levels.classList.add('open');
  }

  /* ================= DOM: spellbook ================= */

  function renderDiffRow(container) {
    container.innerHTML = '';
    Object.entries(DIFFS).forEach(([key, cfg]) => {
      const b = document.createElement('button');
      b.className = 'wz-diff-btn' + (key === difficulty ? ' active' : '');
      b.innerHTML = `<strong>${cfg.label}</strong><span>${cfg.desc}</span>`;
      b.addEventListener('click', () => {
        difficulty = key;
        persist();
        renderDiffRow(container);
      });
      container.appendChild(b);
    });
  }

  function openBook() {
    if (!level) { openLevels(); return; }
    bookFilter = 'all';
    renderFilters();
    renderCards();
    els.bookSub.textContent = `第 ${bookTier()} 頁・共 ${unlockedWords().length} 個咒語`;
    els.book.classList.add('open');
  }

  // W1: browse by KIND of thing, not by ability. Filtering by "會浮" handed a
  // child the answer to every river level — the point of the game is to look
  // at a boat and work out that boats float.
  function renderFilters() {
    els.filters.innerHTML = '';
    const mk = (id, label) => {
      const b = document.createElement('button');
      b.className = 'wz-filter' + (bookFilter === id ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { bookFilter = id; renderFilters(); renderCards(); });
      els.filters.appendChild(b);
    };
    mk('all', '全部');
    // Only offer tabs that have something behind them at this tier — an empty
    // ✨魔法 tab on page 1 reads as a broken button.
    const pool = unlockedWords();
    Object.entries(WIZARD_CATS).forEach(([id, c]) => {
      const n = pool.filter(w => w.cat === id).length;
      if (n) mk(id, `${c.icon} ${c.name} ${n}`);
    });
  }

  function renderCards() {
    const pool = unlockedWords().filter(w => bookFilter === 'all' || w.cat === bookFilter);
    els.cards.innerHTML = '';
    if (!pool.length) {
      els.cards.innerHTML = '<p class="wz-empty">這一頁還沒有這種咒語，先去通關解鎖更多單字吧！</p>';
      return;
    }
    pool.forEach(w => {
      const card = document.createElement('button');
      const known = save.learned.includes(w.w);
      card.className = 'wz-card' + (known ? ' known' : ' fresh');
      // Abilities show only once you've actually summoned the thing. Printing
      // them up front turned the spellbook into an answer key you could scan.
      card.innerHTML = `
        <span class="wz-card-e">${w.e}</span>
        <span class="wz-card-zh">${w.zh}</span>
        <span class="wz-card-dots">${'●'.repeat(w.w.length)}</span>
        <span class="wz-card-tags">${known ? w.tags.map(t => WIZARD_TAGS[t].icon).join('') : '❓'}</span>`;
      card.title = known ? `${w.zh}（${w.w.length} 個字母）` : '新咒語！召喚過一次就會記下它的能力';
      card.addEventListener('click', () => openSpell(w));
      els.cards.appendChild(card);
    });
  }

  /* ================= DOM: spelling ================= */

  function openSpell(word) {
    spellWord = word;
    spellFlawed = false;
    els.spell.classList.add('open');
    if (!save.learned.includes(word.w)) renderTeach();
    else renderSpell();
  }

  // First time a word is ever opened: show it, say it, then hide it and ask
  // the child to spell it from memory.
  function renderTeach() {
    const w = spellWord;
    els.spellBody.innerHTML = `
      <div class="wz-teach">
        <span class="wz-teach-e">${w.e}</span>
        <div class="wz-teach-word">${w.w}</div>
        <div class="wz-teach-zh">${w.zh}</div>
        <p class="wz-teach-note">這是新的咒語！先記住它怎麼拼，等一下要自己拼出來。</p>
        <div class="wz-teach-row">
          <button class="wz-btn" id="wz-teach-say">🔊 再唸一次</button>
          <button class="wz-btn wz-btn-main" id="wz-teach-go">✅ 記住了！</button>
        </div>
      </div>`;
    if (typeof TTSManager !== 'undefined') TTSManager.speak(w.w);
    els.spellBody.querySelector('#wz-teach-say').addEventListener('click', () => TTSManager.speak(w.w));
    els.spellBody.querySelector('#wz-teach-go').addEventListener('click', renderSpell);
  }

  function renderSpell() {
    const w = spellWord;
    const head = `
      <div class="wz-spell-head">
        <span class="wz-spell-e">${w.e}</span>
        <div>
          <div class="wz-spell-zh">${w.zh}</div>
          <div class="wz-spell-meta">${w.w.length} 個字母　${save.learned.includes(w.w)
            ? w.tags.map(t => `${WIZARD_TAGS[t].icon}${WIZARD_TAGS[t].name}`).join('・')
            : '召喚看看它會做什麼'}</div>
        </div>
      </div>`;
    const foot = `
      <div class="wz-spell-foot">
        <button class="wz-btn wz-btn-ghost" id="wz-hint">💡 提示（獎勵減半）</button>
        <span class="wz-spell-msg" id="wz-msg"></span>
      </div>`;

    if (difficulty === 'easy') {
      spellSlots = [];
      spellTiles = buildTiles(w.w);
      els.spellBody.innerHTML = `${head}
        <div class="wz-slots" id="wz-slots"></div>
        <div class="wz-tiles" id="wz-tiles"></div>
        ${foot}`;
      renderTiles();
    } else {
      const prefix = difficulty === 'medium' ? w.w[0] : '';
      els.spellBody.innerHTML = `${head}
        <div class="wz-type">
          <input id="wz-input" type="text" autocomplete="off" autocapitalize="off"
                 autocorrect="off" spellcheck="false" maxlength="${w.w.length}"
                 value="${prefix}" placeholder="打出英文單字">
          <button class="wz-btn wz-btn-main" id="wz-cast">✨ 召喚</button>
        </div>
        ${foot}`;
      const input = els.spellBody.querySelector('#wz-input');
      input.addEventListener('keydown', e => { if (e.key === 'Enter') trySubmit(input.value); });
      els.spellBody.querySelector('#wz-cast').addEventListener('click', () => trySubmit(input.value));
      setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 60);
    }

    els.spellBody.querySelector('#wz-hint').addEventListener('click', showHint);
  }

  // Correct letters plus two decoys, shuffled.
  function buildTiles(word) {
    const letters = word.split('');
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 2; i++) letters.push(alphabet[Math.floor(Math.random() * 26)]);
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.map(ch => ({ ch, used: false }));
  }

  function renderTiles() {
    const w = spellWord;
    const slots = els.spellBody.querySelector('#wz-slots');
    const tiles = els.spellBody.querySelector('#wz-tiles');
    slots.innerHTML = '';
    for (let i = 0; i < w.w.length; i++) {
      const s = document.createElement('button');
      const idx = spellSlots[i];
      s.className = 'wz-slot' + (idx === undefined ? '' : ' filled');
      s.textContent = idx === undefined ? '' : spellTiles[idx].ch;
      if (idx !== undefined) {
        s.addEventListener('click', () => {   // tap a placed letter to take it back
          spellTiles[idx].used = false;
          spellSlots.splice(i, 1);
          renderTiles();
        });
      }
      slots.appendChild(s);
    }
    tiles.innerHTML = '';
    spellTiles.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'wz-tile' + (t.used ? ' used' : '');
      b.textContent = t.ch;
      b.disabled = t.used;
      b.addEventListener('click', () => {
        if (spellSlots.length >= w.w.length) return;
        t.used = true;
        spellSlots.push(i);
        renderTiles();
        if (spellSlots.length === w.w.length) {
          trySubmit(spellSlots.map(k => spellTiles[k].ch).join(''));
        }
      });
      tiles.appendChild(b);
    });
  }

  function showHint() {
    spellFlawed = true;
    const msg = els.spellBody.querySelector('#wz-msg');
    msg.textContent = `💡 ${spellWord.w}`;
    msg.className = 'wz-spell-msg hint';
    if (typeof TTSManager !== 'undefined') TTSManager.speak(spellWord.w);
    setTimeout(() => { if (msg.classList.contains('hint')) { msg.textContent = ''; msg.className = 'wz-spell-msg'; } }, 3000);
  }

  function trySubmit(value) {
    const guess = String(value || '').trim().toLowerCase();
    if (guess === spellWord.w) {
      els.spell.classList.remove('open');
      els.book.classList.remove('open');
      summon(spellWord);
      return;
    }
    spellFlawed = true;
    SoundManager.playWrong();
    const msg = els.spellBody.querySelector('#wz-msg');
    msg.textContent = '拼錯了，再試一次！';
    msg.className = 'wz-spell-msg bad';
    const head = els.spellBody.querySelector('.wz-spell-head');
    if (head) {
      head.classList.add('shake');
      setTimeout(() => head.classList.remove('shake'), 400);
    }
    if (difficulty === 'easy') {
      spellSlots = [];
      spellTiles.forEach(t => { t.used = false; });
      renderTiles();
    } else {
      const input = els.spellBody.querySelector('#wz-input');
      if (input) { input.value = difficulty === 'medium' ? spellWord.w[0] : ''; input.focus(); }
    }
  }

  /* ================= DOM: level complete ================= */

  function showDone(firstClear, reward, stars) {
    const found = (save.found[level.id] || []);
    const target = starTarget(level);
    const all = levelTags(level);
    const missing = all.filter(t => !found.includes(t)).slice(0, 4);
    const last = levelIndex >= WIZARD_LEVELS.length - 1;

    const best = save.cleared[level.id] || stars;
    const pct = Math.round(Math.min(found.length, target) / target * 100);
    els.doneBody.innerHTML = `
      <div class="wz-done-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <h3>${level.name} 完成！</h3>
      <p class="wz-done-why">${
        stars === 3 ? `一次到位、還剩 ${mana} 點魔力 — 滿星！`
        : stars === 2 ? `${runWasted} 次召喚沒派上用場${mana ? '' : '、魔力也剛好用完'}，這次是 ⭐⭐`
        : '這次看了提示，所以是 ⭐（📖 解法收集照算）'}${
        best > stars ? `　最佳紀錄 ${'⭐'.repeat(best)}` : ''}</p>
      <p class="wz-done-reward">${firstClear
        ? `首次通關 +${reward.xp} XP　+${reward.gems} 💎`
        : `再次通關 +${Math.floor(reward.xp / 2)} XP`}</p>
      <div class="wz-collect">
        <div class="wz-collect-head">📖 解法收集　<strong>${Math.min(found.length, target)} / ${target}</strong></div>
        <div class="wz-collect-bar"><span style="width:${pct}%"></span></div>
        <div class="wz-collect-tags">${found.map(t => `<span class="wz-done-tag">${WIZARD_TAGS[t].icon} ${WIZARD_TAGS[t].name}</span>`).join('')}</div>
      </div>
      ${missing.length
        ? `<p class="wz-done-hint">💡 換一種方法再過一次，每找到一種新解法 +${NEW_SOLUTION_XP} XP +${NEW_SOLUTION_GEMS} 💎。還沒試過：
             ${missing.map(t => `<span class="wz-done-tag dim">${WIZARD_TAGS[t].icon} ${WIZARD_TAGS[t].name}</span>`).join('')}</p>`
        : '<p class="wz-done-hint">🏆 這一關的解法你全部找到了！</p>'}
      <div class="wz-done-row">
        <button class="wz-btn" id="wz-again">🔄 再玩一次</button>
        <button class="wz-btn" id="wz-tomap">🗺️ 關卡地圖</button>
        ${last ? '' : '<button class="wz-btn wz-btn-main" id="wz-next">➡️ 下一關</button>'}
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#wz-again').addEventListener('click', () => {
      els.done.classList.remove('open');
      startLevel(levelIndex);
    });
    els.doneBody.querySelector('#wz-tomap').addEventListener('click', () => {
      els.done.classList.remove('open');
      openLevels();
    });
    const next = els.doneBody.querySelector('#wz-next');
    if (next) next.addEventListener('click', () => {
      els.done.classList.remove('open');
      startLevel(levelIndex + 1);
    });
    renderHUD();
  }

  /* ================= lifecycle ================= */

  function init() {
    loadSave();
    if (!buildShell()) return;
    renderDiffRow(els.diffRow);
    showScreen('start');
    renderHUD();
    renderTask();

    // Read-only hook for automated checks (all real state lives in this closure)
    window.__wizardTest = {
      state: () => ({
        levelId: level && level.id,
        obstacles: obstacles.map(o => ({ type: o.type, solved: o.solved, tag: o.solveTag })),
        wizardX: Math.round(wizard.x),
        finished,
        tier: bookTier(),
        cleared: clearedCount(),
        mana, manaMax, hintUsed: runHintUsed, wasted: runWasted,
        stars: level ? starsFor(level) : 0,
        runStars: level ? runStars() : 0,
        found: level ? foundCount(level) : 0,
        target: level ? starTarget(level) : 0,
      }),
      start: i => startLevel(i),
      hint: () => revealHint(),
      cast: word => {
        const entry = unlockedWords().find(w => w.w === word);
        if (!entry) return false;
        spellWord = entry; spellFlawed = false;
        summon(entry);
        return true;
      },
      settle: () => { while (walkAnim) step(0.05); },
      save: () => JSON.parse(JSON.stringify(save)),
    };
  }

  // Called by app.js when the zone becomes visible — the backing store can only
  // be measured once the zone is actually displayed.
  function onShow() {
    if (!canvas) return;
    fitCanvas();
    if (level) ensureLoop();
  }

  return { init, onShow };
})();
