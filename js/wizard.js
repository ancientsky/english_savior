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

   A summon acts on the WHOLE scene, not just the blocker in front of the
   wizard: fire burns every dry thing, cold freezes every stretch of water,
   light reveals every dark room — and a flame you flew over is still burning,
   so it lights the way for you. Chained obstacles clear for free, which is
   what turns "which tool" into a decision worth making. Reactions are marked
   on the obstacles themselves (🪵 💧 💡 💦) so the chain is always visible in
   advance, and every reaction tag is already one of that obstacle's own
   solutions — a chain can never make a level unsolvable.

   Summoned things are boxes with real physics: they fall, land on whatever is
   under them, stack, float or sink, and the PLAYER picks the drop point (and
   can drag it again for free). Whether a gap is passable is then decided
   GEOMETRICALLY — walk the surface from here to the ⭐ — not by a lookup
   table. The tags stay the lesson: they are exactly what sets the box's size
   and how it behaves in water.

   Save: localStorage `english_savior_wizard`
     { cleared: {levelId: stars}, found: {levelId: [tags]}, learned: [words], diff }
   The shape is unchanged from the first version, so old saves load as they are.
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
  let hintShown = false;    // hint text currently revealed for this obstacle
  // W4: a summon that has been spelled but not yet placed, and the thing the
  // player is currently dragging.
  let placing = null, aimX = 0, dragging = null;
  // Every timer this game schedules is tied to the attempt that started it.
  // Without this a pending "you ran out of magic" from the previous try fires
  // in the middle of the next one and kills a perfectly good run.
  let runId = 0;
  function later(fn, ms) { const id = runId; setTimeout(() => { if (id === runId) fn(); }, ms); }
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

  // Summons that never contributed anything. Counted from the objects still
  // lying around rather than at drop time, because a thing dragged into a
  // useful spot later did help after all.
  function wastedCount() { return objects.filter(ob => ob.dropped && !ob.helped).length; }

  function runStars() {
    if (runHintUsed) return 1;        // a hint was opened
    if (wastedCount() > 0) return 2;  // cleared, no hints, but some summons missed
    return mana > 0 ? 3 : 2;          // perfect line, with magic to spare
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
    const wide = Math.max(80, Math.min(140, span / n - 24));
    obstacles.forEach((o, i) => {
      o.cx = 130 + (span * (i + 0.5)) / n;
      // Gaps are cut narrow enough that one summoned thing can genuinely span
      // them — the geometry has to agree with what the obstacle promises.
      const zw = (o.type === 'river' || o.type === 'pit') ? Math.min(GAP_W, wide) : wide;
      o.x0 = o.cx - zw / 2;
      o.x1 = o.cx + zw / 2;
    });
  }

  function startLevel(i) {
    levelIndex = i;
    level = WIZARD_LEVELS[i];
    obstacles = level.obs.map(type => ({ type, solved: false, solveTag: null, solveWord: null, chained: false, anim: 0 }));
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
    placing = null; dragging = null;
    runId++;
    if (els.placeBar) els.placeBar.style.display = 'none';
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

  /* ================= physics & terrain (W4) =================
     Summoned things used to be teleported to a scripted pose picked from a
     lookup table, so the sandbox never actually existed. Now they are boxes:
     they fall, land on whatever is underneath, stack, float or sink — and the
     PLAYER chooses where to drop them. Whether a gap is passable is then a
     geometric question ("is there a surface I can walk along?") rather than a
     flag someone set. The tags are still the whole lesson: they are exactly
     what decides how big the box is and how it behaves in water.
  */
  const PIT_DEPTH = 52, RIVER_DEPTH = 74;   // deeper than a heavy box is tall
  const PHYSICAL = new Set(['river', 'pit', 'wall']);   // terrain you build on
  const STEP_UP = 28, CLIMB_UP = 150;
  const GRAV = 1400;

  const GAP_W = 88;                       // how wide rivers and pits are cut

  function bodyOf(word) {
    const has = t => word.tags.includes(t);
    const b = { floats: has('float'), heavy: has('heavy'), climb: has('climb'),
                hover: has('fly'), spans: has('long') };
    orientBody(b, false);
    return b;
  }

  // A ladder, a rope, a fallen tree: long AND climbable at once. Which one it
  // is depends on what it lands over — laid flat across a gap it is a bridge,
  // stood against solid ground it is something to climb. That is what anyone
  // would actually do with it, so it needs no explaining.
  function orientBody(b, overGap) {
    if (b.hover)                     { b.w = 66; b.h = 46; }            // never lands
    else if (b.spans && (!b.climb || overGap)) { b.w = 138; b.h = 20; } // a plank
    else if (b.climb)                { b.w = 38; b.h = 96; }            // stood up
    else if (b.heavy)                { b.w = 80; b.h = PIT_DEPTH; }     // fills a pit flush
    else if (b.floats)               { b.w = 76; b.h = 44; }            // sits in the water
    else                             { b.w = 54; b.h = 44; }
    return b;
  }

  function overGapAt(x) {
    return obstacles.some(o => !o.frozen && (o.type === 'river' || o.type === 'pit') &&
      x > o.x0 - 8 && x < o.x1 + 8);
  }

  // Solid ground profile at x, and the water surface if there is any.
  function terrainAt(x) {
    let top = GROUND_Y, water = null;
    for (const o of obstacles) {
      if (o.type === 'wall' && x >= o.cx - 24 && x <= o.cx + 24) top = Math.min(top, GROUND_Y - WALL_H);
      else if (o.type === 'pit' && x >= o.x0 && x <= o.x1) top = GROUND_Y + PIT_DEPTH;
      else if (o.type === 'river' && x >= o.x0 && x <= o.x1) {
        if (o.frozen) top = GROUND_Y;                   // ice is just ground
        else { top = GROUND_Y + RIVER_DEPTH; water = GROUND_Y; }
      }
    }
    return { top, water };
  }

  // Centre-y a box would settle at if it were dropped with its centre at x.
  function restY(b, x, ignore) {
    let top = Infinity;
    const n = b.spans ? 11 : 3;
    for (let i = 0; i < n; i++) {
      const sx = x - b.w / 2 + (b.w * i) / (n - 1);
      const t = terrainAt(sx);
      // Buoyancy: something that floats sits half in the water; anything else
      // goes to the bottom. That IS the float/heavy lesson, made physical.
      top = Math.min(top, (t.water !== null && b.floats && !b.heavy) ? t.water + b.h / 2 : t.top);
    }
    objects.forEach(other => {
      if (other === ignore || !other.landed || other.hover || other.merged) return;
      if (x + b.w / 2 <= other.x - other.w / 2 || x - b.w / 2 >= other.x + other.w / 2) return;
      top = Math.min(top, other.y - other.h / 2);
    });
    return top - b.h / 2;
  }

  // Highest surface you could stand on at x.
  function walkSurfaceAt(x) {
    let top = terrainAt(x).top;
    objects.forEach(ob => {
      // a small margin: things settle snugly against the sides of a gap, and a
      // 2px sliver of open water is not something to fall down
      if (!ob.landed || ob.hover || ob.merged) return;
      if (x < ob.x - ob.w / 2 - 10 || x > ob.x + ob.w / 2 + 10) return;
      top = Math.min(top, ob.y - ob.h / 2);
    });
    return top;
  }

  function climbAt(x) {
    return objects.some(ob => ob.landed && ob.climb &&
      x >= ob.x - ob.w / 2 - 32 && x <= ob.x + ob.w / 2 + 32);
  }
  function hoverAt(x) {
    return objects.some(ob => ob.landed && ob.hover && x >= ob.x - 72 && x <= ob.x + 72);
  }

  // The geometric clear check: can the wizard get from fromX to toX on what is
  // actually in the scene right now? No lookup tables, no special cases.
  function walkable(fromX, toX) {
    const STEP = 5;
    let x = fromX, y = walkSurfaceAt(x);
    let guard = 0;
    while (x < toX && guard++ < 900) {
      const nx = Math.min(toX, x + STEP);
      if (hoverAt(nx)) { x = nx; y = GROUND_Y; continue; }   // being carried
      const blocked = obstacles.some(o => !o.solved && !PHYSICAL.has(o.type) &&
        nx >= o.x0 - 8 && nx <= o.x1 + 8);
      if (blocked) return false;
      const ny = walkSurfaceAt(nx);
      if (ny > GROUND_Y + 4) return false;                   // that's a hole or open water
      if (y - ny > (climbAt(nx) ? CLIMB_UP : STEP_UP)) return false;
      x = nx; y = ny;
    }
    return true;
  }

  // Which physical property got the wizard across — for the 📖 collection.
  // Every tag returned here is in that obstacle's own `solve` list.
  function physicalTagFor(o) {
    if (o.frozen) return 'cold';
    const over = f => objects.some(ob => ob.landed && ob[f] &&
      ob.x + ob.w / 2 > o.x0 && ob.x - ob.w / 2 < o.x1);
    const near = f => objects.some(ob => ob.landed && ob[f] &&
      ob.x + ob.w / 2 > o.x0 - 70 && ob.x - ob.w / 2 < o.x1 + 70);
    if (o.type === 'river') return over('spans') ? 'long' : over('floats') ? 'float' : near('hover') ? 'fly' : 'float';
    if (o.type === 'pit')   return over('spans') ? 'long' : over('heavy') ? 'heavy' : near('hover') ? 'fly' : 'heavy';
    return near('climb') ? 'climb' : near('hover') ? 'fly' : 'long';   // wall
  }

  // Re-judge every physical obstacle against the current geometry. Called
  // whenever anything settles or is dragged.
  function evaluateScene(cause) {
    const solved = [];
    obstacles.forEach(o => {
      if (o.solved || !PHYSICAL.has(o.type)) return;
      if (!walkable(o.x0 - 26, o.x1 + 26)) return;
      o.solved = true;
      o.solveTag = physicalTagFor(o);
      o.solveWord = cause && cause.word;
      o.solveObj = cause || null;
      o.anim = 0;
      solved.push(o);
    });
    return solved;
  }

  // W3: what this summon puts INTO THE SCENE, not just at the obstacle in
  // front of the wizard. Fire burns and glows; a flame you flew over is still
  // burning behind you, so it lights whatever is further down the path.
  function sceneEffects(tag, o) {
    const fx = new Set();
    if (tag === 'fire') { fx.add('fire'); fx.add('light'); }
    if (tag === 'cold') fx.add('cold');
    if (tag === 'water') fx.add('water');
    if (tag === 'light') fx.add('light');
    if (o && WIZARD_OBSTACLES[o.type].glows && tag === 'fly') fx.add('light');
    return fx;
  }

  // Apply those effects to every obstacle further along. A chained obstacle is
  // solved for FREE — no extra magic — which is the whole reward for picking
  // the tool that does two jobs. It can never make a level harder: every
  // reaction tag is already one of that obstacle's own solutions.
  function applyChains(tag, from, word) {
    const fx = sceneEffects(tag, from);
    if (!fx.size) return [];
    const hit = [];
    obstacles.forEach(o => {
      if (o.solved || o === from) return;
      const info = WIZARD_OBSTACLES[o.type];
      for (const f of fx) {
        const r = WIZARD_REACTS[f];
        if (!r || !info[r.prop]) continue;
        o.solved = true;
        o.solveTag = r.tag;
        o.solveWord = word;
        o.anim = 0;
        o.chained = true;
        if (r.tag === 'cold' && o.type === 'river') o.frozen = true;   // ice is real terrain
        burst(o.cx, GROUND_Y - 60, 10);
        hit.push({ o, tag: r.tag, verb: r.verb });
        creditSolution(r.tag);
        break;
      }
    });
    return hit;
  }

  // Record a solving tag against this level's 📖 collection, paying the
  // new-solution bonus once. Shared by direct summons and chained clears.
  function creditSolution(tag) {
    const known = save.found[level.id] || [];
    runFoundTags.add(tag);
    if (known.includes(tag)) return false;
    known.push(tag);
    save.found[level.id] = known;
    persist();
    GameEngine.addXP(NEW_SOLUTION_XP);
    GameEngine.addGems(NEW_SOLUTION_GEMS);
    GameEngine.recordWizardSolution();
    return true;
  }

  /* ================= summoning ================= */

  // Spelled correctly — now the child says WHERE. The magic is already spent
  // at this point; aiming and re-dragging are free, so a placement mistake
  // costs nothing but a moment. That is what makes it a sandbox rather than a
  // multiple-choice question with a nice animation.
  function summon(word) {
    if (typeof TTSManager !== 'undefined') TTSManager.speak(word.w);

    // Magic is spent per SUMMON, hit or miss — that is what makes stopping to
    // think worth more than trying the next card.
    mana = Math.max(0, mana - 1);

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

    const o = currentObstacle();
    placing = { word, body: bodyOf(word) };
    aimX = o ? o.cx : wizard.x + 90;
    els.placeBar.style.display = '';
    els.placeName.textContent = `${word.e} ${word.w}（${word.zh}）`;
    toast('👇 放在哪裡？', '在畫面上點一下決定位置——放錯了可以直接拖回來，不會再花魔力。', 3200);
    renderHUD();
    renderTask();
    ensureLoop();
  }

  function dropAt(x) {
    if (!placing) return;
    const { word, body } = placing;
    placing = null;
    els.placeBar.style.display = 'none';
    const px = Math.max(30, Math.min(W - 30, x));
    orientBody(body, overGapAt(px));
    const obj = {
      word, e: word.e, ...body,
      x: px,
      y: body.hover ? GROUND_Y - 96 : -40,
      vy: 0, bob: Math.random() * Math.PI * 2,
      landed: !!body.hover, dropped: true, helped: false,
    };
    objects.push(obj);
    // Cap the clutter so the scene stays readable
    const junk = objects.filter(ob => !ob.helped);
    while (junk.length > 6) objects.splice(objects.indexOf(junk.shift()), 1);
    if (obj.landed) resolveScene(obj);
    ensureLoop();
  }

  // Everything that happens once a dropped (or dragged) thing settles.
  function resolveScene(cause) {
    if (!level || finished) return;
    const solvedNow = [];
    // Cold landing in a river turns the terrain to ice, which the geometry
    // below then simply reads as ordinary walkable ground.
    obstacles.forEach(o => {
      if (o.solved || o.type !== 'river' || !cause) return;
      if (cause.x < o.x0 - 24 || cause.x > o.x1 + 24) return;
      if (!cause.word.tags.includes('cold')) return;
      o.frozen = true;
      // The ice block becomes the ice — otherwise it would be left standing on
      // top of the surface it just created, a 44px step out of nowhere.
      cause.merged = true;
      cause.y = GROUND_Y - 6;
    });
    // Effect blockers (fire/monster/lock/dark…) need the thing to be ON them.
    obstacles.forEach(o => {
      if (o.solved || PHYSICAL.has(o.type)) return;
      if (!cause || cause.x < o.x0 - 46 || cause.x > o.x1 + 46) return;
      const already = save.found[level.id] || [];
      const matches = WIZARD_OBSTACLES[o.type].solve.filter(t => cause.word.tags.includes(t));
      // Credit a tag the player hasn't discovered here yet, so a multi-ability
      // word can't keep re-scoring the same solution.
      const tag = matches.find(t => !already.includes(t)) || matches[0];
      if (!tag) return;
      o.solved = true; o.solveTag = tag; o.solveWord = cause.word; o.solveObj = cause; o.anim = 0;
      solvedNow.push(o);
    });
    // Physical blockers: geometry decides, nothing else.
    evaluateScene(cause).forEach(o => solvedNow.push(o));

    if (!solvedNow.length) {
      if (cause && cause.justDropped) {
        SoundManager.playWrong();
        const o = currentObstacle();
        const info = o ? WIZARD_OBSTACLES[o.type] : null;
        toast('🤔 還是過不去…', info
          ? `${cause.e} ${cause.word.w} 放在那裡幫不上忙。${info.tip}　剩下 ${mana} 點魔力（可以拖它換個位置試試）。`
          : `${cause.e} ${cause.word.w} 掉在地上了。`, 3600);
        if (mana <= 0 && !finished) later(outOfMana, 900);
      }
      renderHUD(); renderTask();
      return;
    }

    if (cause) cause.helped = true;
    SoundManager.playCorrect();
    hintShown = false;
    solvedNow.forEach(o => burst(o.cx, GROUND_Y - 60, 12));

    // credit each solution and let it act on the rest of the scene (W3)
    let chained = [];
    let fresh = false;
    solvedNow.forEach(o => {
      if (creditSolution(o.solveTag)) fresh = true;
      chained = chained.concat(applyChains(o.solveTag, o, o.solveWord || (cause && cause.word)));
    });
    chained.forEach(c => { if (creditSolution(c.tag)) fresh = true; });

    const first = solvedNow[0];
    if (chained.length) {
      toast('🔗 連鎖！', `${first.solveWord ? first.solveWord.e + ' ' + first.solveWord.w : '那股力量'} 傳了過去 — ` +
        chained.map(c => `${WIZARD_OBSTACLES[c.o.type].icon} ${WIZARD_OBSTACLES[c.o.type].name}${c.verb}`).join('、') +
        '！這一步等於省下一次召喚。', 3400);
    } else if (solvedNow.length > 1) {
      toast('🎉 一次解決兩關！', solvedNow.map(o => `${WIZARD_OBSTACLES[o.type].icon} ${WIZARD_OBSTACLES[o.type].name}`).join('、') + ' 都通了！', 3000);
    } else if (fresh) {
      toast('✨ 新解法！', `用「${WIZARD_TAGS[first.solveTag].name}」破解 — 這一關你已經找到 ${(save.found[level.id] || []).length}/${starTarget(level)} 種解法`, 2800);
    } else {
      toast(`${WIZARD_TAGS[first.solveTag].icon} 成功！`, `${WIZARD_TAGS[first.solveTag].verb}`, 2400);
    }
    renderHUD();
    renderTask();
    later(startWalk, chained.length ? 1000 : 720);
  }

  // W2: magic ran out with the path still blocked. Nothing already earned is
  // taken back — the level simply has to be started again.
  function outOfMana() {
    if (finished || mana > 0 || placing || currentObstacle() === null) return;
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

  // The wizard walks on whatever the physics actually produced — the plank he
  // is standing on, the boat bobbing in the river, the top of the wall. Sampled
  // over a small window so he steps up a little early instead of popping.
  function wizardY(x) {
    if (hoverAt(x)) return GROUND_Y - 92;
    let y = Infinity;
    for (let d = -16; d <= 16; d += 8) y = Math.min(y, walkSurfaceAt(x + d));
    return Math.min(y, GROUND_Y);
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
    if (!runHintUsed && wastedCount() === 0 && mana > 0) GameEngine.recordWizardFlawless();
    save.cleared[level.id] = Math.max(save.cleared[level.id] || 0, stars);
    persist();

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    later(() => showDone(firstClear, reward, stars), 900);
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
    // Holes and water are drawn at their REAL depth — the same numbers the
    // physics uses — so what you see is what a box will land on.
    obstacles.forEach(o => {
      if (o.type !== 'river' && o.type !== 'pit') return;
      if (o.type === 'pit') {
        ctx.fillStyle = '#1b1b26';
        ctx.fillRect(o.x0, GROUND_Y, o.x1 - o.x0, PIT_DEPTH);
        ctx.fillStyle = ch.deep;
        ctx.fillRect(o.x0, GROUND_Y + PIT_DEPTH, o.x1 - o.x0, H - GROUND_Y - PIT_DEPTH);
      } else if (o.frozen) {
        ctx.fillStyle = '#dff2ff';
        ctx.fillRect(o.x0, GROUND_Y - 6, o.x1 - o.x0, RIVER_DEPTH + 6);
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        for (let x = o.x0; x < o.x1; x += 22) ctx.fillRect(x + 3, GROUND_Y - 3, 12, 3);
      } else {
        ctx.fillStyle = '#2f8fd6';
        ctx.fillRect(o.x0, GROUND_Y, o.x1 - o.x0, RIVER_DEPTH);
        ctx.fillStyle = ch.deep;
        ctx.fillRect(o.x0, GROUND_Y + RIVER_DEPTH, o.x1 - o.x0, H - GROUND_Y - RIVER_DEPTH);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (let x = o.x0; x < o.x1; x += 18) ctx.fillRect(x + 2, GROUND_Y + 4, 10, 3);
      }
    });

    objects.forEach(ob => drawBody(ob));
    if (placing) drawGhost();

    obstacles.forEach(o => drawObstacle(o));
    obstacles.forEach(o => drawReactBadge(o));

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

  // Summoned things are boxes now, so they're drawn as boxes: a plank looks
  // like a plank, a ladder like a ladder, and the emoji rides on top.
  function drawBody(ob, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ob.spans) {
      ctx.fillStyle = '#a9713c';
      roundRect(ob.x - ob.w / 2, ob.y - ob.h / 2, ob.w, ob.h, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
      drawEmoji(ob.e, ob.x, ob.y - ob.h / 2 - 15, 28, alpha);
    } else if (ob.climb) {
      ctx.strokeStyle = '#b98a4a'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ob.x - ob.w / 2 + 4, ob.y - ob.h / 2); ctx.lineTo(ob.x - ob.w / 2 + 4, ob.y + ob.h / 2);
      ctx.moveTo(ob.x + ob.w / 2 - 4, ob.y - ob.h / 2); ctx.lineTo(ob.x + ob.w / 2 - 4, ob.y + ob.h / 2);
      ctx.stroke();
      ctx.lineWidth = 4;
      for (let y = ob.y - ob.h / 2 + 12; y < ob.y + ob.h / 2; y += 20) {
        ctx.beginPath(); ctx.moveTo(ob.x - ob.w / 2 + 4, y); ctx.lineTo(ob.x + ob.w / 2 - 4, y); ctx.stroke();
      }
      drawEmoji(ob.e, ob.x, ob.y - ob.h / 2 - 14, 28, alpha);
    } else {
      drawEmoji(ob.e, ob.x, ob.y, Math.min(52, ob.h + 8), alpha);
    }
    ctx.restore();
  }

  // While aiming: a see-through preview sitting exactly where it would land,
  // so choosing a spot is a decision you can make with your eyes.
  function drawGhost() {
    const b = orientBody(placing.body, overGapAt(aimX));
    const y = b.hover ? GROUND_Y - 96 : restY(b, aimX, null);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,214,102,.75)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(aimX, 8); ctx.lineTo(aimX, y - b.h / 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeRect(aimX - b.w / 2, y - b.h / 2, b.w, b.h);
    ctx.restore();
    drawBody({ ...b, e: placing.word.e, x: aimX, y }, 0.55);
  }

  // A marker on every obstacle that reacts to something in the air, so a
  // child can see the chain coming instead of being surprised by it. Dry
  // vines carry 🪵 (they burn), water 💧 (it freezes), and so on.
  function drawReactBadge(o) {
    const info = WIZARD_OBSTACLES[o.type];
    if (o.solved || !info.badge) return;
    const x = o.cx, y = GROUND_Y - 118;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(performance.now() / 500);
    ctx.fillStyle = 'rgba(20,12,40,.55)';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEmoji(info.badge, x, y, 17, 0.95);
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
    // ---- W4: real falling, landing, stacking and bobbing ----
    objects.forEach(ob => {
      if (ob === dragging || ob.merged) return;
      if (ob.hover) {                    // balloons and birds never come down
        ob.bob += dt * 1.6;
        ob.y = (ob.restY ?? (ob.restY = ob.y)) + Math.sin(ob.bob) * 5;
        return;
      }
      const rest = restY(ob, ob.x, ob);
      if (!ob.landed) {
        ob.vy += GRAV * dt;
        ob.y += ob.vy * dt;
        if (ob.y >= rest) {
          ob.y = rest;
          if (Math.abs(ob.vy) < 110) {
            ob.vy = 0;
            ob.landed = true;
            ob.restY = rest;
            const justDropped = !ob.settled;
            ob.settled = true;
            ob.justDropped = justDropped;
            resolveScene(ob);
            ob.justDropped = false;
          } else ob.vy *= -0.3;          // one small bounce, then it settles
        }
      } else {
        // the ground under it may have changed (something was dragged away)
        if (rest > ob.y + 1) { ob.landed = false; ob.vy = 0; }
        else if (ob.floats && !ob.heavy && terrainAt(ob.x).water !== null) {
          ob.bob += dt * 2.2;
          ob.y = rest + Math.sin(ob.bob) * 3;
        } else ob.y = rest;
      }
    });

    if (walkAnim) {
      walkAnim.t += dt;
      const u = Math.min(1, walkAnim.t / walkAnim.dur);
      wizard.x = walkAnim.fromX + (walkAnim.toX - walkAnim.fromX) * u;
      wizard.y = wizardY(wizard.x);
      if (u >= 1) {
        walkAnim = null;
        wizard.state = 'idle';
        if (!obstacles.some(o => !o.solved)) finishLevel();
        else renderTask();
      }
    } else if (wizard.state !== 'win') {
      wizard.y = wizardY(wizard.x);
    }

    // A flying mount carries the wizard instead of hovering on its own
    objects.forEach(ob => {
      if (!ob.hover || !ob.landed) return;
      if (Math.abs(wizard.x - ob.x) < 72) { ob.x = wizard.x; ob.y = wizard.y - 34; }
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
        <div class="wz-place" id="wz-place" style="display:none">
          <span class="wz-place-icon">👇</span>
          <span class="wz-place-name" id="wz-place-name"></span>
          <span class="wz-place-note">在畫面上點一下決定放的位置</span>
          <button class="wz-btn wz-btn-main" id="wz-place-front">放在正前方</button>
        </div>
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
        <p>召喚出來的東西會影響<strong>整個場景</strong>，不是只有眼前那一關：🔥 火會把場上所有
          乾燥的東西（帶 🪵 記號）一起燒掉，🧊 冰會凍住所有的水（💧），💡 光會照亮所有黑暗（💡）。
          挑對一個，後面的難關就自己解決了。</p>
        <p>拼完字之後，<strong>要自己決定放在哪裡</strong>：東西是真的會掉下來、疊上去、浮在水上或沉下去的。
          放錯了直接用手拖回來，不會再花魔力。</p>
        <p>每一關的 🔮 <strong>魔力有限</strong>，召喚一次就用掉一點，用完就得重來——所以「一次解兩關」
          不只是帥，是真的省魔力。</p>
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
      placeBar: root.querySelector('#wz-place'),
      placeName: root.querySelector('#wz-place-name'),
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
    root.querySelector('#wz-place-front').addEventListener('click', () => {
      const o = currentObstacle();
      dropAt(o ? o.cx : wizard.x + 90);
    });
    bindSceneInput();
    return true;
  }

  /* ---------- W4: pointing at the scene ---------- */

  function sceneX(e) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return ((cx - r.left) / r.width) * W;
  }
  function sceneY(e) {
    const r = canvas.getBoundingClientRect();
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return ((cy - r.top) / r.height) * H;
  }

  function objectAt(x, y) {
    // topmost first, and only things that haven't already done their job —
    // dragging away a solution would have to un-solve the level behind it.
    for (let i = objects.length - 1; i >= 0; i--) {
      const ob = objects[i];
      if (ob.helped) continue;
      if (Math.abs(x - ob.x) <= ob.w / 2 + 8 && Math.abs(y - ob.y) <= ob.h / 2 + 10) return ob;
    }
    return null;
  }

  function bindSceneInput() {
    const down = e => {
      if (!level || finished) return;
      const x = sceneX(e), y = sceneY(e);
      if (placing) { e.preventDefault(); dropAt(x); return; }
      const ob = objectAt(x, y);
      if (ob) {
        e.preventDefault();
        dragging = ob;
        ob.landed = false;
        ob.vy = 0;
        ob.grabDX = ob.x - x;
        ob.grabDY = ob.y - y;
        ensureLoop();
      }
    };
    const move = e => {
      if (placing) { aimX = sceneX(e); return; }
      if (!dragging) return;
      e.preventDefault();
      dragging.x = Math.max(30, Math.min(W - 30, sceneX(e) + dragging.grabDX));
      dragging.y = Math.max(20, Math.min(H - 20, sceneY(e) + dragging.grabDY));
    };
    const up = () => {
      if (!dragging) return;
      const ob = dragging;
      dragging = null;
      ob.vy = 0;
      orientBody(ob, overGapAt(ob.x));
      ob.landed = false;             // let it fall from wherever it was let go
      ob.settled = false;
      ensureLoop();
    };
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
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
    // What's still ahead matters now that a summon acts on the whole scene —
    // you can't plan a chain you can't see.
    const rest = obstacles.filter(x => !x.solved && x !== o);
    els.taskName.textContent = `${info.name} — ${info.zh}` +
      (rest.length ? `　（後面還有 ${rest.map(x => WIZARD_OBSTACLES[x.type].icon + WIZARD_OBSTACLES[x.type].name).join('、')}）` : '');
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
        : stars === 2 ? `${wastedCount()} 次召喚沒派上用場${mana ? '' : '、魔力也剛好用完'}，這次是 ⭐⭐`
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
        obstacles: obstacles.map(o => ({ type: o.type, solved: o.solved, tag: o.solveTag,
          cx: Math.round(o.cx), x0: Math.round(o.x0), x1: Math.round(o.x1), frozen: !!o.frozen })),
        wizardX: Math.round(wizard.x),
        finished,
        tier: bookTier(),
        cleared: clearedCount(),
        mana, manaMax, hintUsed: runHintUsed, wasted: wastedCount(), placing: !!placing,
        stars: level ? starsFor(level) : 0,
        runStars: level ? runStars() : 0,
        found: level ? foundCount(level) : 0,
        target: level ? starTarget(level) : 0,
      }),
      start: i => startLevel(i),
      hint: () => revealHint(),
      // W4: casting now needs a drop point. Omit x and it goes in front of the
      // blocker the wizard is standing at, which is what the button does.
      cast: (word, x) => {
        const entry = unlockedWords().find(w => w.w === word);
        if (!entry) return false;
        spellWord = entry; spellFlawed = false;
        summon(entry);
        const o = currentObstacle();
        dropAt(x !== undefined ? x : (o ? o.cx : wizard.x + 90));
        return true;
      },
      drop: x => dropAt(x),
      grab: (x, y) => objectAt(x, y),
      objects: () => objects.map(ob => ({ w: ob.word.w, x: Math.round(ob.x), y: Math.round(ob.y),
        bw: ob.w, bh: ob.h, landed: ob.landed, helped: ob.helped,
        floats: !!ob.floats, heavy: !!ob.heavy, spans: !!ob.spans, climb: !!ob.climb, hover: !!ob.hover })),
      surface: x => Math.round(walkSurfaceAt(x)),
      walkable: (a, b) => walkable(a, b),
      settle: () => { for (let i = 0; i < 400; i++) step(0.016); },
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
