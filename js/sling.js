/* ===== Word Slingshot Module =====
   Angry Birds-style physics game for English learning (Canvas 2D).
   A question appears (Chinese meaning + emoji, or a spoken word via TTS);
   crates in the structure each carry an English word — slingshot the bird
   into the CORRECT crate to score. Wrong crates waste a bird.
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
  const BIRD_R = 15;
  const QUESTIONS_PER_ROUND = 10;

  const DIFF_CONFIG = {
    easy:   { crates: 3, xp: 12, ammo: 15, bonusGems: 10 },
    medium: { crates: 4, xp: 16, ammo: 14, bonusGems: 15 },
    hard:   { crates: 4, xp: 20, ammo: 12, bonusGems: 20 },
  };

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
  let bird = null;       // { x,y,vx,vy, mode:'ready'|'aiming'|'flying'|'spent', spentT, bounces }
  let particles = [];
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

    // Read-only hook for automated tests (crate layout is canvas-only)
    window.__slingTest = { crates: () => crates.map(c => ({ ...c })) };
  }

  // ===== Round lifecycle =====
  function startRound() {
    const cfg = DIFF_CONFIG[difficulty];
    ammo = cfg.ammo;
    qIndex = 0;
    correctCount = 0;
    particles = [];
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
    resetBird();
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
    crates = [];
    platforms = [];
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
    const spots = shuffleArr(templates[Math.floor(Math.random() * templates.length)]);

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
      // Wooden platform under crates that would otherwise float mid-air
      // (elevated spots that aren't sitting right on another crate)
      const bottom = y + ch;
      const restsOnCrate = spots.some(([sx, sy]) =>
        sy === bottom + 8 && Math.abs(sx - x) < cw * 0.8);
      if (bottom < G - 4 && !restsOnCrate) {
        platforms.push({ x: x - 10, y: bottom, w: cw + 20, h: 10 });
      }
    });
  }

  function resetBird() {
    bird = { x: SLING_X, y: SLING_Y, vx: 0, vy: 0, mode: 'ready', spentT: 0, bounces: 0 };
    aimPos = null;
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
    if (state !== 'playing' || !bird || bird.mode !== 'ready') return;
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
    bird.vx = dx * POWER;
    bird.vy = dy * POWER;
    bird.mode = 'flying';
    bird.x = pull.x; bird.y = pull.y;
    aimPos = null;
    ammo--;
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

  // ===== Hit handling =====
  function crateHit(crate) {
    if (crate.correct) {
      correctCount++;
      SoundManager.playCorrect();
      breakCrate(crate, true);
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

  // Bird is done (hit something, stopped, or flew away)
  function spendBird() {
    spawnParticles(bird.x, bird.y, '#ffdd55', 6);
    if (nextQTimer > 0) {
      resetBird();
      return;
    }
    if (ammo <= 0) {
      endRound(false);
      return;
    }
    resetBird();
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

  function update(dt) {
    // Delayed question switch after a correct hit
    if (nextQTimer > 0) {
      nextQTimer -= dt;
      if (nextQTimer <= 0) {
        if (qIndex >= QUESTIONS_PER_ROUND) endRound(true);
        else nextQuestion();
      }
    }

    // Bird physics
    if (bird && bird.mode === 'flying') {
      bird.vy += GRAVITY * dt;
      bird.x += bird.vx * dt;
      bird.y += bird.vy * dt;

      // Crate collisions
      for (const c of crates) {
        if (c.state !== 'alive' && c.state !== 'used') continue;
        if (bird.x + BIRD_R > c.x && bird.x - BIRD_R < c.x + c.w &&
            bird.y + BIRD_R > c.y && bird.y - BIRD_R < c.y + c.h) {
          if (c.state === 'alive') crateHit(c);
          bird.mode = 'spent';
          setTimeout(() => spendBird(), 0);
          return;
        }
      }

      // Ground bounce
      if (bird.y + BIRD_R >= GROUND_Y) {
        bird.y = GROUND_Y - BIRD_R;
        bird.vy *= -0.45;
        bird.vx *= 0.7;
        bird.bounces++;
        if (bird.bounces >= 3 || Math.abs(bird.vy) < 60) {
          bird.mode = 'spent';
          setTimeout(() => spendBird(), 350);
          return;
        }
      }

      // Off screen
      if (bird.x - BIRD_R > W + 40 || bird.x + BIRD_R < -40) {
        bird.mode = 'spent';
        setTimeout(() => spendBird(), 0);
        return;
      }
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

    // Particles
    particles.forEach(p => {
      p.t += dt;
      p.vy += GRAVITY * 0.6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    particles = particles.filter(p => p.t < p.life);
  }

  // ===== Rendering =====
  function render() {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#8ed1f5');
    sky.addColorStop(1, '#d8f0d8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Distant hills
    ctx.fillStyle = '#a5d6a0';
    ctx.beginPath();
    ctx.ellipse(180, GROUND_Y + 30, 260, 90, 0, Math.PI, 0);
    ctx.ellipse(620, GROUND_Y + 40, 340, 120, 0, Math.PI, 0);
    ctx.fill();

    // Sun
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    ctx.arc(820, 60, 30, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#7cb85a';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#659947';
    ctx.fillRect(0, GROUND_Y, W, 6);

    // Trajectory preview while aiming
    if (bird && bird.mode === 'aiming') {
      const pull = pulledPos();
      let px = pull.x, py = pull.y;
      let vx = (SLING_X - pull.x) * POWER;
      let vy = (SLING_Y - pull.y) * POWER;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const step = 0.055;
      for (let i = 0; i < 22; i++) {
        vy += GRAVITY * step;
        px += vx * step;
        py += vy * step;
        if (py > GROUND_Y) break;
        ctx.beginPath();
        ctx.arc(px, py, 3.4 - i * 0.12, 0, Math.PI * 2);
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

    // Crates
    crates.forEach(drawCrate);

    // Bird
    if (bird) drawBird();

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
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
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
    ctx.save();
    ctx.translate(bird.x, bird.y);
    if (bird.mode === 'flying') {
      ctx.rotate(Math.atan2(bird.vy, bird.vx) * 0.25);
    }
    ctx.font = `${BIRD_R * 2.4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐤', 0, 2);
    ctx.restore();

    // Waiting flock beside the sling
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < Math.min(Math.max(ammo - 1, 0), 3); i++) {
      ctx.fillText('🐤', 34 + i * 22, GROUND_Y - 10);
    }
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
