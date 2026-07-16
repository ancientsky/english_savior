/* ===== Word Slingshot Module =====
   Angry Birds-style physics game for English learning (Canvas 2D).
   A question appears (Chinese meaning + emoji, or a spoken word via TTS);
   crates in the structure each carry an English word — slingshot the bird
   into the CORRECT crate to score. Wrong crates waste a bird.

   Five bird types cycle through a shuffled queue each shot, each with its
   own in-flight ability (triggered by tapping the canvas mid-flight).
   Obstacles (ice/stone/TNT) and floating balloons add extra juice; four
   rotating outdoor scenes reskin the backdrop each round. None of this
   touches the educational core: scoring only ever happens when a bird
   BODY collides with the correct word crate (see crateHit()).
*/

const SlingGame = (() => {
  // Canvas internal resolution (CSS scales it responsively)
  const W = 880, H = 420;
  const GROUND_Y = 375;
  const GRAVITY = 1350;          // px/s²
  const SLING_X = 115, SLING_Y = 305;
  const DRAG_RADIUS = 78;        // max pull distance
  // Launch velocity per pulled px. At max pull this gives ~1170 px/s.
  // Reachability check for the templates below: at distance d the max
  // height above launch is v²/2g − g·d²/2v²; with v=1170 that is ~256 px
  // at d=700 — comfortably above the highest crate spot (~+120 px)
  const POWER = 15;
  // Falcon birds fly steadier but slower (0.8×). The build-time
  // reachability simulation always uses this conservative worst case so a
  // question stays solvable no matter which bird type ends up in hand.
  const POWER_SAFE = POWER * 0.8;
  const BIRD_R = 15;
  const QUESTIONS_PER_ROUND = 10;
  const OW = 64, OH = 52; // obstacle size

  const DIFF_CONFIG = {
    easy:   { crates: 3, xp: 12, ammo: 15, bonusGems: 10, obs: [0, 1] },
    medium: { crates: 4, xp: 16, ammo: 14, bonusGems: 15, obs: [1, 2] },
    hard:   { crates: 4, xp: 20, ammo: 12, bonusGems: 20, obs: [2, 3] },
  };

  const BIRD_TYPES = {
    chick:  { emoji: '🐤', name: '小雞', tip: '基本鳥，穩紮穩打！' },
    dash:   { emoji: '🐦', name: '衝刺鳥', tip: '飛行中點擊畫面，直線加速衝刺！' },
    split:  { emoji: '🐧', name: '分裂鳥', tip: '飛行中點擊畫面，分裂成三隻！' },
    bomb:   { emoji: '🐔', name: '炸彈鳥', tip: '飛行中點擊畫面，爆炸震破障礙物！' },
    falcon: { emoji: '🦉', name: '獵鷹鳥', tip: '飛得穩，拉弓時看得到完整彈道！' },
  };

  const SCENES = [
    { name: 'grassland', skyTop: '#8ed1f5', skyBottom: '#d8f0d8', hill: '#a5d6a0',
      ground: '#7cb85a', groundLine: '#659947', sun: '#ffe28a', sunR: 30, decor: ['🌳', '🌼'] },
    { name: 'desert', skyTop: '#ffd9a0', skyBottom: '#ffefd0', hill: '#e0b36a',
      ground: '#d4a355', groundLine: '#b8863c', sun: '#ffdd66', sunR: 30, decor: ['🌵', '🌵'] },
    { name: 'snow', skyTop: '#cfe8ff', skyBottom: '#f0f8ff', hill: '#e8f2fa',
      ground: '#eef6fc', groundLine: '#d7e8f4', sun: '#fff6dd', sunR: 26, decor: ['⛄', '❄️'] },
    { name: 'sunset', skyTop: '#ff9a56', skyBottom: '#ffd1a3', hill: '#8a6a9e',
      ground: '#7a9a4f', groundLine: '#5f7d3a', sun: '#ff7847', sunR: 42, decor: ['🌇', '🐦'] },
  ];

  let canvas, ctx;
  let difficulty = 'easy';
  let state = 'idle'; // idle | playing | roundover
  let rafId = null;
  let lastTime = 0;

  // Round state
  let ammo = 0, qIndex = 0, correctCount = 0, missesThisQ = 0;
  let question = null;   // { word, zh, hint, mode }
  let crates = [];       // { x,y,w,h, word, correct, state:'alive'|'used'|'flying', vx,vy,vr,rot, fade, reveal }
  let platforms = [];    // decorative wooden planks under elevated crates
  let obstacles = [];    // { x,y,w,h, type:'ice'|'stone'|'tnt', hp, maxHp, cracked, state, fade, vx,vy,vr,rot }
  let balloons = [];     // { x,y,r,vy }
  let floaters = [];     // { x,y,text,vy,t,life,color }
  let particles = [];
  let queue = [];        // upcoming BIRD_TYPES keys
  let bird = null;       // ready/aiming bird: { x,y,vx,vy, mode:'ready'|'aiming', type }
  let birds = [];         // launched birds in flight/just-spent: { x,y,vx,vy,mode:'flying'|'spent',type,bounces,spentT }
  let abilityUsed = false;
  let shotActive = false;
  let shakeMag = 0;
  let sceneIdx = 0;
  let roundNum = 0;
  let aimPos = null;
  let hintUsedThisQ = false;
  let nextQTimer = 0;    // countdown to next question after a correct hit

  let els = {};

  function init() {
    canvas = document.getElementById('sg-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    els = {
      prompt: document.getElementById('sg-prompt'),
      ammoEl: document.getElementById('sg-ammo'),
      scoreEl: document.getElementById('sg-score'),
      feedback: document.getElementById('sg-feedback'),
      startScreen: document.getElementById('sg-start-screen'),
      startBtn: document.getElementById('sg-start-btn'),
      overScreen: document.getElementById('sg-over-screen'),
      overTitle: document.getElementById('sg-over-title'),
      overInfo: document.getElementById('sg-over-info'),
      overBtn: document.getElementById('sg-over-btn'),
    };

    document.querySelectorAll('.sg-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sg-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    els.startBtn.addEventListener('click', startRound);
    els.overBtn.addEventListener('click', startRound);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Read-only hooks for automated tests (crate/obstacle/bird layout is canvas-only)
    window.__slingTest = {
      crates: () => crates.map(c => ({ ...c })),
      obstacles: () => obstacles.map(o => ({ ...o })),
      birds: () => birds.map(b => ({ ...b })),
      bird: () => (bird ? { ...bird } : null),
      queue: () => queue.slice(),
      scene: () => sceneIdx,
      // Test-only deterministic balloon spawn (real gameplay uses
      // spawnBalloons()). Placed in open sky well before the crate
      // cluster (which starts around x=490) so a lofted test shot can
      // reach it without any crate/obstacle in the way.
      spawnBalloon: () => {
        const b = { x: 320, y: 160, r: 20, vy: -16 };
        balloons.push(b);
        return { ...b };
      },
    };
  }

  // ===== Round lifecycle =====
  function startRound() {
    const cfg = DIFF_CONFIG[difficulty];
    ammo = cfg.ammo;
    qIndex = 0;
    correctCount = 0;
    particles = [];
    floaters = [];
    balloons = [];
    obstacles = [];
    queue = [];
    shakeMag = 0;
    sceneIdx = roundNum % SCENES.length;
    roundNum++;
    state = 'playing';
    els.startScreen.style.display = 'none';
    els.overScreen.style.display = 'none';
    els.feedback.textContent = '';
    GameEngine.setDeferLevelUp(true);
    nextQuestion();
    updateHUD();
    lastTime = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function endRound(completed) {
    state = 'roundover';
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    if (completed) {
      let gems = DIFF_CONFIG[difficulty].bonusGems;
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 5;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+5 額外寶石', 'gem');
      }
      GameEngine.addGems(gems);
      SoundManager.playQuestComplete();
      els.overTitle.textContent = '🎉 全部命中！';
      els.overInfo.innerHTML = `完成 ${QUESTIONS_PER_ROUND} 題，剩 ${ammo} 隻小鳥！<br>回合獎勵 <b>+${gems} 💎</b>`;
    } else {
      els.overTitle.textContent = '🐤 小鳥用完了';
      els.overInfo.innerHTML = `打中了 <b>${correctCount}</b> / ${QUESTIONS_PER_ROUND} 個單字箱，獎勵都有拿到！<br><small>提示：拉越滿飛越遠，看準單字再發射！</small>`;
    }
    els.overBtn.textContent = '🐤 再玩一輪';
    els.overScreen.style.display = 'flex';
  }

  // ===== Questions =====
  function shortZh(zh) {
    const bold = zh.match(/\*\*(.+?)\*\*/);
    if (bold) return bold[1].trim();
    if (zh.includes('—')) return zh.split('—')[0].trim();
    return zh.trim();
  }

  function nextQuestion() {
    if (qIndex >= QUESTIONS_PER_ROUND) {
      endRound(true);
      return;
    }
    if (ammo <= 0) {
      // Last bird was spent on the previous question
      endRound(false);
      return;
    }
    qIndex++;
    missesThisQ = 0;
    hintUsedThisQ = false;
    nextQTimer = 0;

    const cfg = DIFF_CONFIG[difficulty];
    const fullPool = VOCAB_DATA[difficulty];
    const pool = fullPool.filter(w => {
      const m = shortZh(w.zh);
      // Short words fit on crates; concise meanings make fair prompts
      return m && m.length <= 8 && m !== w.zh && w.word.length <= 8;
    });
    const source = pool.length >= 8 ? pool : fullPool;

    const entry = source[Math.floor(Math.random() * source.length)];
    const options = [entry];
    let guard = 0;
    while (options.length < cfg.crates && guard < 300) {
      const w = source[Math.floor(Math.random() * source.length)];
      if (!options.some(o => o.word === w.word || shortZh(o.zh) === shortZh(w.zh)) &&
          w.word.length <= 8) {
        options.push(w);
      }
      guard++;
    }

    // Listening mode from medium difficulty, ~40% of questions
    const mode = difficulty !== 'easy' && Math.random() < 0.4 && TTSManager.isSupported()
      ? 'listen' : 'zh2en';
    question = { word: entry.word, zh: shortZh(entry.zh), hint: entry.hint, mode };

    buildStructure(shuffleArr(options), entry.word);
    spawnBalloons();
    resetBird(true);
    renderPrompt();
    updateHUD();
  }

  function renderPrompt() {
    els.prompt.innerHTML = '';
    const label = document.createElement('span');
    if (question.mode === 'listen') {
      label.textContent = '🔊 仔細聽，打中你聽到的單字箱！';
      els.prompt.appendChild(label);
      const btn = TTSManager.createButton(question.word.toLowerCase(), 'en-US');
      els.prompt.appendChild(btn);
      TTSManager.speak(question.word.toLowerCase(), 'en-US', 0.85);
    } else {
      label.textContent = `${question.hint}「${question.zh}」的英文是哪一箱？`;
      els.prompt.appendChild(label);
    }

    // Hint crystal: knock out one wrong crate automatically
    if (GameEngine.hasBuff('hint') && !hintUsedThisQ) {
      const wrongs = crates.filter(c => !c.correct && c.state === 'alive');
      if (wrongs.length > 1) {
        GameEngine.consumeBuff('hint');
        hintUsedThisQ = true;
        const out = wrongs[Math.floor(Math.random() * wrongs.length)];
        breakCrate(out, false);
        GameEngine.showToast('🔮 提示水晶生效！打掉了一個錯誤箱子', 'achievement');
      }
    }
  }

  // ===== Structure building =====
  function buildStructure(options, correctWord) {
    const cw = 108, ch = 52;
    const G = GROUND_Y;
    // Layout templates: [x, y] anchor spots (y = crate top).
    // Kept at most 2 tiers high and x ≤ 745 so every spot is reachable
    // with the sling's max launch velocity (see POWER note above)
    const templates = [
      // Ground row with one stacked
      [[520, G - ch], [660, G - ch], [590, G - ch * 2 - 8], [745, G - ch]],
      // Two towers
      [[540, G - ch], [540, G - ch * 2 - 8], [720, G - ch], [720, G - ch * 2 - 8]],
      // Low steps
      [[500, G - ch], [620, G - ch], [620, G - ch * 2 - 8], [745, G - ch]],
      // Elevated platforms
      [[550, G - ch], [690, G - ch], [620, G - ch * 2 - 24], [745, G - ch * 2 - 8]],
    ];
    // Guaranteed-solvable fallback: a flat row, every top face exposed
    const flatRow = [[490, G - ch], [615, G - ch], [740, G - ch], [560, G - ch * 2 - 8]];

    const order = shuffleArr(templates);
    order.push(flatRow);

    for (const template of order) {
      const spots = shuffleArr(template);
      crates = [];
      platforms = [];
      options.forEach((opt, i) => {
        const [x, y] = spots[i];
        crates.push({
          x, y, w: cw, h: ch,
          word: opt.word,
          correct: opt.word === correctWord,
          state: 'alive',
          vx: 0, vy: 0, vr: 0, rot: 0, fade: 1,
          reveal: false,
        });
      });

      // Verify which crates are actually hittable given the FULL structure
      // (other crates block shots — a rear-bottom crate can be in complete
      // shadow even though its spot alone is reachable)
      const reachable = crates.map((_, i) => canHitCrate(i));
      const correctIdx = crates.findIndex(c => c.correct);
      if (!reachable[correctIdx]) {
        // Move the correct answer onto a hittable crate by swapping words
        const okIdx = reachable.findIndex(ok => ok);
        if (okIdx === -1) continue; // no hittable spot at all — next template
        const a = crates[correctIdx], b = crates[okIdx];
        [a.word, b.word] = [b.word, a.word];
        a.correct = false;
        b.correct = true;
      }

      // Wooden platform under crates that would otherwise float mid-air
      // (elevated spots that aren't sitting right on another crate)
      crates.forEach(c => {
        const bottom = c.y + c.h;
        const restsOnCrate = crates.some(o =>
          o !== c && Math.abs(o.y - (bottom + 8)) < 2 && Math.abs(o.x - c.x) < cw * 0.8);
        if (bottom < G - 4 && !restsOnCrate) {
          platforms.push({ x: c.x - 10, y: bottom, w: cw + 20, h: 10 });
        }
      });

      // Obstacles (ice/stone/TNT) layered in front of wrong crates. The
      // correct crate must stay reachable — buildObstacles() drops
      // obstacles one by one if they seal off every path to it.
      const finalCorrectIdx = crates.findIndex(c => c.correct);
      buildObstacles(finalCorrectIdx);
      return;
    }
  }

  // Simulate every pull angle/strength with the game's own physics and
  // check whether `target` can be hit FIRST among `blockers`, with an 8px
  // safety inset so borderline grazes don't count. Uses the conservative
  // POWER_SAFE (falcon's reduced launch speed) so a question stays
  // solvable regardless of which bird type ends up being thrown. Runs in
  // a few ms per structure.
  function simulateHit(target, blockers) {
    const INSET = 8;
    const dt = 1 / 60;
    for (let ang = 8; ang < 88; ang += 2) {
      for (let pull = 24; pull <= DRAG_RADIUS; pull += 3) {
        const rad = ang * Math.PI / 180;
        let x = SLING_X - Math.cos(rad) * pull;
        let y = SLING_Y + Math.sin(rad) * pull;
        let vx = (SLING_X - x) * POWER_SAFE;
        let vy = (SLING_Y - y) * POWER_SAFE;
        let outcome = null;
        for (let t = 0; t < 3 && !outcome; t += dt) {
          vy += GRAVITY * dt; x += vx * dt; y += vy * dt;
          for (const c of blockers) {
            if (x + BIRD_R > c.x && x - BIRD_R < c.x + c.w &&
                y + BIRD_R > c.y && y - BIRD_R < c.y + c.h) {
              outcome = (c === target &&
                x + BIRD_R > c.x + INSET && x - BIRD_R < c.x + c.w - INSET &&
                y + BIRD_R > c.y + INSET && y - BIRD_R < c.y + c.h - INSET)
                ? 'hit' : 'blocked';
              break;
            }
          }
          if (!outcome && (y + BIRD_R >= GROUND_Y || x > W + 40)) outcome = 'miss';
        }
        if (outcome === 'hit') return true;
      }
    }
    return false;
  }

  function canHitCrate(idx) {
    return simulateHit(crates[idx], crates);
  }

  function canHitCrateWithObstacles(idx) {
    return simulateHit(crates[idx], crates.concat(obstacles.filter(o => o.hp > 0)));
  }

  // Place 0-3 obstacles (by difficulty) in front of wrong crates as partial
  // shields; anything left over is purely decorative. Never allowed to
  // seal off every path to the correct crate.
  function buildObstacles(correctIdx) {
    obstacles = [];
    const [lo, hi] = DIFF_CONFIG[difficulty].obs;
    const count = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (count <= 0) return;

    const wrongIdxs = shuffleArr(crates.map((c, i) => i).filter(i => i !== correctIdx));
    const types = difficulty === 'easy' ? ['ice'] : ['ice', 'stone', 'tnt'];

    for (let i = 0; i < count; i++) {
      let x, y;
      const wrongIdx = wrongIdxs[i];
      if (wrongIdx !== undefined) {
        const wc = crates[wrongIdx];
        x = wc.x - OW - 14;
        y = Math.min(wc.y, GROUND_Y - OH);
      } else {
        x = 250 + Math.random() * 150;
        y = GROUND_Y - OH;
      }
      if (x < SLING_X + 60) x = SLING_X + 60; // never sit on the slingshot itself
      const type = types[Math.floor(Math.random() * types.length)];
      const hp = type === 'stone' ? 2 : 1;
      obstacles.push({
        x, y, w: OW, h: OH, type, hp, maxHp: hp,
        cracked: false, state: 'alive', fade: 1, vx: 0, vy: 0, vr: 0, rot: 0,
      });
    }

    // Drop obstacles (last placed first) until the correct crate is
    // provably reachable again.
    while (obstacles.length > 0 && !canHitCrateWithObstacles(correctIdx)) {
      obstacles.pop();
    }
  }

  function spawnBalloons() {
    balloons = [];
    if (Math.random() < 0.25) {
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        balloons.push({
          x: W * 0.58 + Math.random() * (W * 0.38),
          y: GROUND_Y - 40 - Math.random() * 100,
          r: 20,
          vy: -(12 + Math.random() * 12),
        });
      }
    }
  }

  // `announce` shows the new bird's name/tip in the feedback bar. Only
  // nextQuestion() passes true — resolveShotEnd()'s resets happen while a
  // question is still in progress (mid-breather after a correct hit, or a
  // fresh bird after a miss/obstacle hit) and must not clobber that
  // feedback message before the player has had a chance to read it.
  function resetBird(announce) {
    const type = nextBirdType();
    bird = { x: SLING_X, y: SLING_Y, vx: 0, vy: 0, mode: 'ready', type };
    birds = [];
    abilityUsed = false;
    aimPos = null;
    if (announce) {
      const info = BIRD_TYPES[type];
      els.feedback.textContent = `${info.emoji} ${info.name}：${info.tip}`;
      els.feedback.className = 'sg-feedback';
    }
  }

  function refillQueue() {
    queue.push(...shuffleArr(Object.keys(BIRD_TYPES)));
  }

  function nextBirdType() {
    if (queue.length === 0) refillQueue();
    return queue.shift();
  }

  function birdPower(type) {
    return type === 'falcon' ? POWER * 0.8 : POWER;
  }

  // ===== Input =====
  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
  }

  function onPointerDown(e) {
    if (state !== 'playing') return;
    // A bird is already in the air — this tap triggers its ability instead
    // of starting a new aim.
    if (birds.some(b => b.mode === 'flying')) {
      triggerAbility();
      return;
    }
    if (!bird || bird.mode !== 'ready') return;
    if (ammo <= 0 || nextQTimer > 0) return;
    const p = canvasPos(e);
    const dist = Math.hypot(p.x - bird.x, p.y - bird.y);
    if (dist < 70) {
      bird.mode = 'aiming';
      aimPos = p;
      canvas.setPointerCapture?.(e.pointerId);
    }
  }

  function onPointerMove(e) {
    if (!bird || bird.mode !== 'aiming') return;
    aimPos = canvasPos(e);
  }

  function onPointerUp() {
    if (!bird || bird.mode !== 'aiming') return;
    const pull = pulledPos();
    const dx = SLING_X - pull.x;
    const dy = SLING_Y - pull.y;
    if (Math.hypot(dx, dy) < 12) {
      // Too weak — snap back
      bird.mode = 'ready';
      bird.x = SLING_X; bird.y = SLING_Y;
      aimPos = null;
      return;
    }
    const pw = birdPower(bird.type);
    bird.vx = dx * pw;
    bird.vy = dy * pw;
    bird.mode = 'flying';
    bird.x = pull.x; bird.y = pull.y;
    bird.bounces = 0;
    bird.spentT = 0;
    aimPos = null;
    ammo--;
    abilityUsed = false;
    shotActive = true;
    birds.push(bird);
    bird = null;
    updateHUD();
  }

  // Bird position while pulling (clamped to the sling radius)
  function pulledPos() {
    if (!aimPos) return { x: SLING_X, y: SLING_Y };
    let dx = aimPos.x - SLING_X;
    let dy = aimPos.y - SLING_Y;
    const d = Math.hypot(dx, dy);
    if (d > DRAG_RADIUS) {
      dx = dx / d * DRAG_RADIUS;
      dy = dy / d * DRAG_RADIUS;
    }
    return { x: SLING_X + dx, y: SLING_Y + dy };
  }

  // ===== Bird abilities =====
  function triggerAbility() {
    if (abilityUsed) return;
    const primary = birds.find(b => b.mode === 'flying');
    if (!primary) return;
    abilityUsed = true;
    const info = BIRD_TYPES[primary.type];

    if (primary.type === 'dash') {
      const sign = Math.sign(primary.vx) || 1;
      primary.vx = sign * Math.max(Math.abs(primary.vx) * 1.9, 950);
      primary.vy *= 0.25;
      spawnSpeedLines(primary.x, primary.y, primary.vx);
      els.feedback.textContent = `${info.emoji} ${info.name}衝刺！`;
      els.feedback.className = 'sg-feedback';
    } else if (primary.type === 'split') {
      const clone1 = { x: primary.x, y: primary.y, vx: primary.vx, vy: primary.vy - 110, mode: 'flying', type: primary.type, bounces: 0, spentT: 0 };
      const clone2 = { x: primary.x, y: primary.y, vx: primary.vx, vy: primary.vy + 110, mode: 'flying', type: primary.type, bounces: 0, spentT: 0 };
      birds.push(clone1, clone2);
      spawnEmojiParticles(primary.x, primary.y, '🪶', 10);
      els.feedback.textContent = `${info.emoji} ${info.name}分裂！`;
      els.feedback.className = 'sg-feedback';
    } else if (primary.type === 'bomb') {
      explodeAt(primary.x, primary.y, 95);
      markSpent(primary, 0.3);
      els.feedback.textContent = `${info.emoji} ${info.name}爆炸！`;
      els.feedback.className = 'sg-feedback';
    }
    // chick/falcon: no active ability (falcon's edge is passive — see
    // resetBird/onPointerUp/render for its slower launch + full trajectory
    // preview).
  }

  // ===== Hit handling =====
  function markSpent(b, delay) {
    b.mode = 'spent';
    b.spentT = delay;
    spawnParticles(b.x, b.y, '#ffdd55', 6);
  }

  function crateHit(crate) {
    if (crate.correct) {
      correctCount++;
      SoundManager.playCorrect();
      breakCrate(crate, true);
      spawnEmojiParticles(crate.x + crate.w / 2, crate.y + crate.h / 2, '✨', 12);
      // Fling the leftovers for juice
      crates.forEach(c => {
        if (c.state === 'alive') {
          c.state = 'flying';
          c.vx = 150 + Math.random() * 250;
          c.vy = -250 - Math.random() * 200;
          c.vr = (Math.random() - 0.5) * 8;
        }
      });
      els.feedback.textContent = `✅ ${question.word}（${question.zh}）命中！`;
      els.feedback.className = 'sg-feedback correct';
      if (TTSManager.isSupported()) TTSManager.speak(question.word.toLowerCase(), 'en-US', 0.85);

      // Rewards
      let xp = DIFF_CONFIG[difficulty].xp;
      if (GameEngine.hasBuff('double_xp')) {
        xp *= 2;
        GameEngine.consumeBuff('double_xp');
        GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
      }
      let gems = 1;
      if (GameEngine.hasBuff('gem_bonus')) {
        gems += 2;
        GameEngine.consumeBuff('gem_bonus');
        GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
      }
      GameEngine.addXP(xp);
      GameEngine.addGems(gems);
      GameEngine.recordWord(question.word);
      GameEngine.recordSling();

      floaters.push({ x: crate.x + crate.w / 2 - 16, y: crate.y, text: `+${xp} XP`, vy: -42, t: 0, life: 1.1, color: '#ffd166' });
      floaters.push({ x: crate.x + crate.w / 2 + 16, y: crate.y - 14, text: `+${gems}💎`, vy: -42, t: 0, life: 1.1, color: '#7cf29a' });

      nextQTimer = 1.4; // breather, then next question
    } else {
      missesThisQ++;
      SoundManager.playWrong();
      crate.state = 'used';
      els.feedback.textContent = `❌ 那是 ${crate.word}（${shortZhOf(crate.word)}），再試一次！`;
      els.feedback.className = 'sg-feedback wrong';
      if (missesThisQ >= 2) {
        const target = crates.find(c => c.correct && c.state === 'alive');
        if (target) target.reveal = true;
        els.feedback.textContent += ' 💡 正確的箱子在發光！';
      }
      spawnParticles(crate.x + crate.w / 2, crate.y + crate.h / 2, '#8b5a2b', 8);
    }
  }

  // Look up a concise meaning for a word on a wrong crate (for feedback)
  function shortZhOf(word) {
    const entry = VOCAB_DATA[difficulty].find(w => w.word === word);
    return entry ? shortZh(entry.zh) : '';
  }

  function breakCrate(crate, celebrate) {
    crate.state = 'flying';
    crate.fade = 0.99;
    crate.vx = (Math.random() - 0.5) * 100;
    crate.vy = -150;
    crate.vr = (Math.random() - 0.5) * 6;
    spawnParticles(crate.x + crate.w / 2, crate.y + crate.h / 2,
      celebrate ? '#ffd166' : '#8b5a2b', celebrate ? 22 : 10);
  }

  // ===== Obstacles =====
  function damageObstacle(o, dmg) {
    if (o.state !== 'alive') return;
    o.hp -= dmg;
    if (o.hp <= 0) {
      destroyObstacle(o);
    } else if (o.type === 'stone') {
      o.cracked = true;
    }
  }

  function destroyObstacle(o) {
    o.state = 'flying';
    o.vx = (Math.random() - 0.5) * 140;
    o.vy = -160;
    o.vr = (Math.random() - 0.5) * 6;
    o.fade = 0.99;
    if (o.type === 'ice') {
      spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#bfe8ff', 14);
    } else if (o.type === 'stone') {
      spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#9a9a9a', 14);
      shakeMag = Math.max(shakeMag, 10);
    } else if (o.type === 'tnt') {
      spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#ff8c42', 18);
      spawnParticles(o.x + o.w / 2, o.y + o.h / 2, '#ffe28a', 12);
      explodeAt(o.x + o.w / 2, o.y + o.h / 2, 100);
    }
  }

  // Explosion (bomb-bird ability or a chained TNT crate): damages every
  // live obstacle within `radius`, chaining further TNTs, plus juice.
  // Deliberately only ever touches `obstacles` — never `crates` — so it
  // can't score or destroy word crates.
  function explodeAt(x, y, radius) {
    shakeMag = Math.max(shakeMag, 16);
    spawnParticles(x, y, '#ff8c42', 22);
    spawnParticles(x, y, '#ffe28a', 14);
    obstacles.forEach(o => {
      if (o.state !== 'alive') return;
      const cx = Math.max(o.x, Math.min(x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(y, o.y + o.h));
      if (Math.hypot(x - cx, y - cy) <= radius) damageObstacle(o, 2);
    });
  }

  function hitObstacle(o, b) {
    damageObstacle(o, 1);
    const msg = o.type === 'ice' ? '🧊 冰塊碎了！' : o.type === 'stone' ? '🪨 石塊裂了！' : '💥 轟隆！';
    els.feedback.textContent = msg;
    els.feedback.className = 'sg-feedback';
    markSpent(b, 0.2);
  }

  // ===== Balloons =====
  function popBalloon(bl, i) {
    balloons.splice(i, 1);
    GameEngine.addGems(2);
    spawnParticles(bl.x, bl.y, '#ff6fa5', 12);
    floaters.push({ x: bl.x, y: bl.y, text: '+2💎', vy: -42, t: 0, life: 1.0, color: '#7cf29a' });
    els.feedback.textContent = '🎈 +2 💎';
    els.feedback.className = 'sg-feedback correct';
  }

  // ===== Particles / floaters =====
  function spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 420,
        vy: -Math.random() * 380,
        life: 0.5 + Math.random() * 0.4,
        t: 0,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  function spawnEmojiParticles(x, y, emoji, n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: -80 - Math.random() * 260,
        life: 0.5 + Math.random() * 0.5,
        t: 0,
        emoji,
        size: 8 + Math.random() * 6,
      });
    }
  }

  function spawnSpeedLines(x, y, vx) {
    const dir = vx >= 0 ? 1 : -1;
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: x - dir * 10 * i,
        y: y + (Math.random() - 0.5) * 20,
        vx: -dir * 250 + (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.25 + Math.random() * 0.15,
        t: 0,
        color: '#ffffff',
        size: 3 + Math.random() * 2,
      });
    }
  }

  // ===== Main loop =====
  function loop(now) {
    rafId = requestAnimationFrame(loop);

    // Pause when the zone is hidden
    if (!document.getElementById('zone-sling').classList.contains('active')) {
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (state === 'playing') update(dt);
    render();
  }

  function resolveShotEnd() {
    if (nextQTimer > 0) {
      // A correct hit already queued the next question — just get a bird
      // ready in the meantime (nextQuestion() will replace everything and
      // announce the bird that actually matters once the breather ends).
      resetBird(false);
      return;
    }
    if (ammo <= 0) {
      endRound(false);
      return;
    }
    resetBird(false);
  }

  function update(dt) {
    // Delayed question switch after a correct hit
    if (nextQTimer > 0) {
      nextQTimer -= dt;
      if (nextQTimer <= 0) {
        if (qIndex >= QUESTIONS_PER_ROUND) endRound(true);
        else nextQuestion();
      }
    }

    // Launched birds' physics
    birds.forEach(b => {
      if (b.mode === 'spent') {
        b.spentT -= dt;
        return;
      }
      if (b.mode !== 'flying') return;

      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Balloons: bonus pickups, never block flight
      for (let i = balloons.length - 1; i >= 0; i--) {
        const bl = balloons[i];
        if (Math.hypot(b.x - bl.x, b.y - bl.y) < bl.r + BIRD_R) {
          popBalloon(bl, i);
        }
      }

      // Obstacles block flight
      for (const o of obstacles) {
        if (o.state !== 'alive') continue;
        if (b.x + BIRD_R > o.x && b.x - BIRD_R < o.x + o.w &&
            b.y + BIRD_R > o.y && b.y - BIRD_R < o.y + o.h) {
          hitObstacle(o, b);
          return;
        }
      }

      // Crate collisions
      for (const c of crates) {
        if (c.state !== 'alive' && c.state !== 'used') continue;
        if (b.x + BIRD_R > c.x && b.x - BIRD_R < c.x + c.w &&
            b.y + BIRD_R > c.y && b.y - BIRD_R < c.y + c.h) {
          if (c.state === 'alive') crateHit(c);
          markSpent(b, 0.15);
          return;
        }
      }

      // Ground bounce
      if (b.y + BIRD_R >= GROUND_Y) {
        b.y = GROUND_Y - BIRD_R;
        b.vy *= -0.45;
        b.vx *= 0.7;
        b.bounces++;
        if (b.bounces >= 3 || Math.abs(b.vy) < 60) {
          markSpent(b, 0.35);
          return;
        }
      }

      // Off screen
      if (b.x - BIRD_R > W + 40 || b.x + BIRD_R < -40) {
        markSpent(b, 0.1);
        return;
      }
    });

    // Drop birds once their post-impact pause has elapsed; when none are
    // left, the shot is fully resolved.
    birds = birds.filter(b => !(b.mode === 'spent' && b.spentT <= 0));
    if (shotActive && birds.length === 0) {
      shotActive = false;
      resolveShotEnd();
    }

    // Aiming position follows the pointer
    if (bird && bird.mode === 'aiming') {
      const p = pulledPos();
      bird.x = p.x;
      bird.y = p.y;
    }

    // Tumbling crates
    crates.forEach(c => {
      if (c.state !== 'flying') return;
      c.vy += GRAVITY * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      if (c.fade < 1) c.fade = Math.max(0, c.fade - dt * 1.8);
    });
    crates = crates.filter(c => !(c.state === 'flying' && (c.y > H + 80 || c.fade <= 0)));

    // Tumbling (destroyed) obstacles
    obstacles.forEach(o => {
      if (o.state !== 'flying') return;
      o.vy += GRAVITY * dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.rot += o.vr * dt;
      if (o.fade < 1) o.fade = Math.max(0, o.fade - dt * 1.8);
    });
    obstacles = obstacles.filter(o => !(o.state === 'flying' && (o.y > H + 80 || o.fade <= 0)));

    // Balloons drift upward and despawn off the top
    balloons.forEach(bl => { bl.y += bl.vy * dt; });
    balloons = balloons.filter(bl => bl.y + bl.r > -20);

    // Floating reward texts
    floaters.forEach(f => { f.t += dt; f.y += f.vy * dt; });
    floaters = floaters.filter(f => f.t < f.life);

    // Particles
    particles.forEach(p => {
      p.t += dt;
      p.vy += GRAVITY * 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    particles = particles.filter(p => p.t < p.life);

    // Screen shake decay
    if (shakeMag > 0) shakeMag = Math.max(0, shakeMag - dt * 50);
  }

  // ===== Rendering =====
  function render() {
    ctx.save();
    if (shakeMag > 0.3) {
      ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    }

    const scene = SCENES[sceneIdx];

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, scene.skyTop);
    sky.addColorStop(1, scene.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Distant hills
    ctx.fillStyle = scene.hill;
    ctx.beginPath();
    ctx.ellipse(180, GROUND_Y + 30, 260, 90, 0, Math.PI, 0);
    ctx.ellipse(620, GROUND_Y + 40, 340, 120, 0, Math.PI, 0);
    ctx.fill();

    // Sun
    ctx.fillStyle = scene.sun;
    ctx.beginPath();
    ctx.arc(820, 60, scene.sunR, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = scene.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = scene.groundLine;
    ctx.fillRect(0, GROUND_Y, W, 6);

    // Theme decorations
    ctx.font = '26px serif';
    ctx.textAlign = 'center';
    scene.decor.forEach((emo, i) => ctx.fillText(emo, 205 + i * 70, GROUND_Y - 6));

    // Trajectory preview while aiming
    if (bird && bird.mode === 'aiming') {
      const pull = pulledPos();
      const pw = birdPower(bird.type);
      let px = pull.x, py = pull.y;
      let vx = (SLING_X - pull.x) * pw;
      let vy = (SLING_Y - pull.y) * pw;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const step = 0.055;
      const steps = bird.type === 'falcon' ? 60 : 22;
      for (let i = 0; i < steps; i++) {
        vy += GRAVITY * step;
        px += vx * step;
        py += vy * step;
        if (py > GROUND_Y) break;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6, 3.4 - i * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Slingshot (behind band drawn later)
    drawSlingshot();

    // Platforms under elevated crates
    platforms.forEach(p => {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#6e4520';
      ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
      // Support legs
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(p.x + 8, p.y + p.h, 7, GROUND_Y - p.y - p.h);
      ctx.fillRect(p.x + p.w - 15, p.y + p.h, 7, GROUND_Y - p.y - p.h);
    });

    // Obstacles
    obstacles.forEach(drawObstacle);

    // Crates
    crates.forEach(drawCrate);

    // Balloons
    balloons.forEach(drawBalloon);

    // Birds (ready + in-flight + waiting queue)
    drawBird();

    // Rubber bands over the bird while aiming
    if (bird && bird.mode === 'aiming') {
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(SLING_X - 14, SLING_Y - 26);
      ctx.lineTo(bird.x, bird.y);
      ctx.lineTo(SLING_X + 14, SLING_Y - 26);
      ctx.stroke();
    }

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      if (p.emoji) {
        ctx.font = `${p.size * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1;

    // Floating reward texts
    floaters.forEach(f => {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
      ctx.fillStyle = f.color;
      ctx.font = "bold 15px 'Noto Sans TC', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawSlingshot() {
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y);
    ctx.lineTo(SLING_X, SLING_Y - 8);
    ctx.moveTo(SLING_X, SLING_Y - 8);
    ctx.lineTo(SLING_X - 16, SLING_Y - 30);
    ctx.moveTo(SLING_X, SLING_Y - 8);
    ctx.lineTo(SLING_X + 16, SLING_Y - 30);
    ctx.stroke();
  }

  function drawBird() {
    if (bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.font = `${BIRD_R * 2.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BIRD_TYPES[bird.type].emoji, 0, 2);
      ctx.restore();
    }

    birds.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.mode === 'flying') {
        ctx.rotate(Math.atan2(b.vy, b.vx) * 0.25);
      }
      ctx.font = `${BIRD_R * 2.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BIRD_TYPES[b.type].emoji, 0, 2);
      ctx.restore();
    });

    // Waiting queue beside the sling — next few bird types to come
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    queue.slice(0, 3).forEach((t, i) => {
      ctx.fillText(BIRD_TYPES[t].emoji, 34 + i * 22, GROUND_Y - 10);
    });
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.globalAlpha = o.fade;
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
    ctx.rotate(o.rot);

    if (o.type === 'ice') {
      ctx.fillStyle = 'rgba(173, 216, 255, 0.55)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    } else if (o.type === 'stone') {
      ctx.fillStyle = '#8d8d8d';
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 3;
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
      if (o.cracked) {
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-o.w / 4, -o.h / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(o.w / 4, o.h / 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#e0662e';
      ctx.strokeStyle = '#8b3a12';
      ctx.lineWidth = 3;
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧨', 0, 0);
    }
    ctx.restore();
  }

  function drawBalloon(bl) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${bl.r * 1.8}px serif`;
    ctx.fillText('🎈', bl.x, bl.y);
    ctx.font = `${bl.r * 0.9}px serif`;
    ctx.fillText('💎', bl.x, bl.y - bl.r * 1.1);
    ctx.restore();
  }

  function drawCrate(c) {
    ctx.save();
    ctx.globalAlpha = c.fade;
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.rotate(c.rot);

    // Box
    ctx.fillStyle = c.state === 'used' ? '#5a4632' : '#c98d4f';
    ctx.strokeStyle = c.state === 'used' ? '#3d2f22' : '#8b5a2b';
    ctx.lineWidth = 3;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    // Cross planks
    ctx.beginPath();
    ctx.moveTo(-c.w / 2, -c.h / 2);
    ctx.lineTo(c.w / 2, c.h / 2);
    ctx.moveTo(c.w / 2, -c.h / 2);
    ctx.lineTo(-c.w / 2, c.h / 2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reveal glow for the correct crate after two misses
    if (c.reveal && c.state === 'alive') {
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 18 + Math.sin(performance.now() / 150) * 8;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.shadowBlur = 0;
    }

    // Word label
    ctx.fillStyle = c.state === 'used' ? '#9c8a75' : '#fff8ec';
    ctx.font = `bold ${c.word.length > 6 ? 17 : 20}px 'Noto Sans TC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.state === 'used' ? '✗' : c.word, 0, 0);

    ctx.restore();
  }

  function updateHUD() {
    let birdsHtml = '';
    for (let i = 0; i < ammo; i++) birdsHtml += '🐤';
    els.ammoEl.textContent = birdsHtml || '—';
    els.scoreEl.textContent = `${correctCount} / ${QUESTIONS_PER_ROUND}`;
  }

  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Called by app.js when the zone becomes visible — resume the loop
  function onShow() {
    if (state === 'playing' && !rafId) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  return { init, onShow };
})();
