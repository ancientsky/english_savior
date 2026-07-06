/* ===== Spelling Runner Game =====
   Chrome-Dino-style side-scrolling runner where kids collect letters
   to spell words. Collide with correct letters in order, jump over wrong ones.
*/

const SpellingGame = (() => {
  // ===== CONSTANTS =====
  const CANVAS_W = 800;
  const CANVAS_H = 340;
  const GROUND_H = 45;
  const GROUND_Y = CANVAS_H - GROUND_H;
  const CHAR_X = 90;
  const GRAVITY = 0.264;
  const JUMP_VEL = -8.5;
  const APEX_GRAVITY = 0.153;
  const APEX_THRESHOLD = 2.5;
  const MAX_HP = 5;
  const WORDS_TO_WIN = 10;
  const HP_REWARD = 2;
  const XP_PER_WORD = 15;

  const DIFF_CONFIG = {
    easy:   { speed: 1.5, gapMin: 240, gapMax: 340, distractMin: 2, distractMax: 4, pool: 'easy', gems: 10 },
    medium: { speed: 2, gapMin: 200, gapMax: 300, distractMin: 2, distractMax: 3, pool: 'medium', gems: 20 },
    hard:   { speed: 2.6, gapMin: 220, gapMax: 320, distractMin: 1, distractMax: 3, pool: 'hard', gems: 30 },
  };

  const OBS_COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
    '#f39c12', '#1abc9c', '#e67e22', '#e91e63',
    '#00bcd4', '#8bc34a',
  ];

  const SHAPES = ['box', 'tall', 'diamond', 'round', 'cactus'];

  // ===== STATE =====
  let canvas, ctx;
  let state = 'idle'; // idle | running | gameover | complete
  let diff = 'easy';
  let hp, wordsCompleted, currentWord, letterIndex;
  let gemsEarnedThisRound = 0;
  let obstacles, groundScroll, mountainScroll, speed, frameCount;
  let usedWords;
  let distSinceCorrect;
  let nextObstacleAt;
  let lastTime, gameTime;

  // Character
  let charY, charVY, isJumping, runFrame;
  let jumpsUsed = 0;      // double jump support
  let landSquash = 0;     // squash & stretch timer

  // Fun systems
  let combo = 0;              // consecutive correct letters
  let damageThisWord = false; // PERFECT word bonus tracking
  let gemCoins = [];          // floating collectible gems
  let gemCoinsCollected = 0;
  let nextGemAt = 0;
  let skyPhase = 0;           // 0 day → 1 sunset → 2 night → 3 dawn

  // Effects
  let particles = [];
  let screenShake = 0;
  let damageFlash = 0;
  let collectEffects = [];
  let wordCompleteFlash = 0;

  // Cached ground gradient (rebuilding gradients every frame costs perf)
  let groundGrad = null;
  let skyGradCache = { phase: -1, grad: null };

  // Sky palettes for the day cycle (top, mid, bottom)
  const SKY_PHASES = [
    { top: [74, 144, 217], mid: [125, 184, 232], bot: [168, 216, 240], night: 0 },   // day
    { top: [116, 78, 130], mid: [217, 117, 90],  bot: [240, 201, 135], night: 0.15 }, // sunset
    { top: [15, 12, 41],   mid: [26, 26, 78],    bot: [48, 43, 99],    night: 1 },    // night
    { top: [43, 45, 94],   mid: [122, 92, 138],  bot: [217, 138, 106], night: 0.35 }, // dawn
  ];

  // Scenery
  let clouds = [];
  let mountains = [];
  let starSeed = [];

  // Idle animation
  let idleAnimId = null;
  let idleFrame = 0;

  // DOM refs
  let hpEl, wordEl, zhEl, scoreEl;
  let startScreen, gameoverScreen, completeScreen;

  // ===== INIT =====
  function init() {
    canvas = document.getElementById('sp-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    // Render at device-pixel resolution (capped 2×) so the game is crisp
    // on phones/retina instead of blurry upscaled 1×
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    hpEl = document.getElementById('sp-hp');
    wordEl = document.getElementById('sp-word-en');
    zhEl = document.getElementById('sp-word-zh');
    scoreEl = document.getElementById('sp-score');
    startScreen = document.getElementById('sp-start-screen');
    gameoverScreen = document.getElementById('sp-gameover-screen');
    completeScreen = document.getElementById('sp-complete-screen');

    // Difficulty buttons
    document.querySelectorAll('.sp-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state === 'running') return;
        document.querySelectorAll('.sp-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        diff = btn.dataset.diff;
      });
    });

    // Input
    document.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); onTap(e); });
    // The start overlay sits on top of the canvas, so "tap to start"
    // must listen on the overlay itself
    startScreen.addEventListener('click', onTap);

    // Restart buttons
    document.getElementById('sp-restart-btn').addEventListener('click', backToStart);
    document.getElementById('sp-complete-restart').addEventListener('click', backToStart);

    // Generate scenery
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * CANVAS_W,
        y: 15 + Math.random() * 55,
        w: 40 + Math.random() * 60,
        speed: 0.15 + Math.random() * 0.25,
      });
    }
    for (let i = 0; i < 8; i++) {
      mountains.push({ x: i * 120, h: 30 + Math.random() * 50, w: 80 + Math.random() * 60 });
    }
    for (let i = 0; i < 40; i++) {
      starSeed.push({ x: (i * 137.5 + 23) % CANVAS_W, y: (i * 73.3 + 11) % (GROUND_Y - 30), s: i % 3 === 0 ? 2 : 1 });
    }

    // Initial render (show background behind start screen)
    frameCount = 0;
    renderIdle();
  }

  function backToStart() {
    gameoverScreen.style.display = 'none';
    completeScreen.style.display = 'none';
    startScreen.style.display = 'flex';
    state = 'idle';
    renderIdle();
  }

  function onKey(e) {
    const zone = document.getElementById('zone-spelling');
    if (!zone || !zone.classList.contains('active')) return;
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    e.preventDefault();
    handleInput();
  }

  function onTap(e) {
    const zone = document.getElementById('zone-spelling');
    if (!zone || !zone.classList.contains('active')) return;
    handleInput();
  }

  function handleInput() {
    if (state === 'idle') {
      startGame();
    } else if (state === 'running') {
      if (!isJumping) {
        jump(false);
      } else if (jumpsUsed < 2) {
        jump(true); // double jump!
      }
    }
  }

  // ===== GAME LIFECYCLE =====
  function startGame() {
    const cfg = DIFF_CONFIG[diff];
    hp = MAX_HP;
    wordsCompleted = 0;
    gemsEarnedThisRound = 0;
    letterIndex = 0;
    obstacles = [];
    particles = [];
    collectEffects = [];
    groundScroll = 0;
    mountainScroll = 0;
    speed = cfg.speed;
    frameCount = 0;
    usedWords = [];
    distSinceCorrect = 0;
    nextObstacleAt = 280;
    charY = GROUND_Y;
    charVY = 0;
    isJumping = false;
    jumpsUsed = 0;
    landSquash = 0;
    runFrame = 0;
    combo = 0;
    damageThisWord = false;
    gemCoins = [];
    gemCoinsCollected = 0;
    nextGemAt = 500 + Math.random() * 300;
    skyPhase = 0;
    skyGradCache = { phase: -1, grad: null };
    screenShake = 0;
    damageFlash = 0;
    wordCompleteFlash = 0;
    lastTime = 0;
    gameTime = 0;

    // Stop idle animation
    if (idleAnimId) { cancelAnimationFrame(idleAnimId); idleAnimId = null; }

    startScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    completeScreen.style.display = 'none';

    GameEngine.setDeferLevelUp(true);
    pickNewWord();
    updateHUD();
    state = 'running';
    requestAnimationFrame(gameLoop);
  }

  function pickNewWord() {
    const cfg = DIFF_CONFIG[diff];
    const pool = VOCAB_DATA[cfg.pool];
    let available = pool.filter(w => !usedWords.includes(w.word));
    if (available.length === 0) {
      usedWords = [];
      available = pool;
    }
    currentWord = available[Math.floor(Math.random() * available.length)];
    usedWords.push(currentWord.word);
    letterIndex = 0;
    distSinceCorrect = 0;
    damageThisWord = false;
    updateWordDisplay();
    // Hearing the word helps kids connect spelling to sound
    if (TTSManager.isSupported()) {
      TTSManager.speak(currentWord.word.toLowerCase(), 'en-US', 0.85);
    }
  }

  // Extract the concise meaning from either VOCAB_DATA zh format
  function shortZh(zh) {
    const bold = zh.match(/\*\*(.+?)\*\*/);
    if (bold) return bold[1].trim();
    if (zh.includes('—')) return zh.split('—')[0].trim();
    return zh.trim();
  }

  // ===== MAIN LOOP =====
  const TARGET_FRAME_MS = 1000 / 60; // 60fps baseline

  function gameLoop(timestamp) {
    if (state !== 'running') return;
    // Pause (and stop burning CPU) while another zone is open
    if (!zoneActive()) {
      lastTime = 0;
      paused = true;
      return;
    }
    if (lastTime === 0) lastTime = timestamp;
    const rawDt = timestamp - lastTime;
    lastTime = timestamp;
    // Normalize to 60fps (dt=1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps)
    // Cap to avoid huge jumps when tab regains focus
    const dt = Math.min(rawDt, 50) / TARGET_FRAME_MS;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  let paused = false;

  function zoneActive() {
    const zone = document.getElementById('zone-spelling');
    return zone && zone.classList.contains('active');
  }

  // Called by app.js when the zone becomes visible again
  function onShow() {
    if (state === 'running' && paused) {
      paused = false;
      lastTime = 0;
      requestAnimationFrame(gameLoop);
    } else if (state !== 'running' && !idleAnimId) {
      renderIdle();
    }
  }

  function update(dt) {
    const cfg = DIFF_CONFIG[diff];
    frameCount++;
    gameTime += dt;

    // Scroll ground
    mountainScroll += speed * dt;
    groundScroll = (groundScroll + speed * dt) % 40;

    // Character physics (apex float: lower gravity near peak for longer hang time)
    if (isJumping) {
      const g = (Math.abs(charVY) < APEX_THRESHOLD) ? APEX_GRAVITY : GRAVITY;
      charVY += g * dt;
      charY += charVY * dt;
      if (charY >= GROUND_Y) {
        charY = GROUND_Y;
        charVY = 0;
        isJumping = false;
        jumpsUsed = 0;
        landSquash = 6; // squash on landing
      }
    }
    if (landSquash > 0) landSquash -= dt;

    // Sky day-cycle eases toward the phase for the current progress
    const targetPhase = Math.min(3, (wordsCompleted / WORDS_TO_WIN) * 3.6);
    skyPhase += (targetPhase - skyPhase) * 0.015 * dt;

    // Fever trail once the combo is hot
    if (combo >= 5 && frameCount % 3 === 0) {
      particles.push({
        x: CHAR_X + Math.random() * 10, y: charY - 20 - Math.random() * 20,
        vx: -2 - Math.random(), vy: (Math.random() - 0.5) * 1.5,
        life: 14 + Math.random() * 8,
        color: ['#f5c518', '#ff6b81', '#4ecca3', '#00b4d8'][frameCount % 4],
        size: 2 + Math.random() * 2,
      });
    }

    // Run animation (time-based, ~100ms per frame like 6 frames at 60fps)
    if (!isJumping) {
      runFrame = Math.floor(gameTime / 6) % 4;
    }

    // Spawn obstacles
    nextObstacleAt -= speed * dt;
    if (nextObstacleAt <= 0) {
      spawnObstacle();
      nextObstacleAt = cfg.gapMin + Math.random() * (cfg.gapMax - cfg.gapMin);
    }

    // Move obstacles
    for (let i = 0; i < obstacles.length; i++) {
      obstacles[i].x -= speed * dt;
    }
    obstacles = obstacles.filter(o => o.x + o.w > -60);

    // Floating gem coins: jump to collect (capped per round)
    nextGemAt -= speed * dt;
    if (nextGemAt <= 0) {
      if (gemCoinsCollected + gemCoins.length < 5) {
        gemCoins.push({
          x: CANVAS_W + 20,
          y: GROUND_Y - 78 - Math.random() * 28,
          bob: Math.random() * Math.PI * 2,
          hit: false,
        });
      }
      nextGemAt = 550 + Math.random() * 450;
    }
    for (let i = gemCoins.length - 1; i >= 0; i--) {
      const g = gemCoins[i];
      g.x -= speed * dt;
      g.bob += 0.08 * dt;
      if (!g.hit &&
          Math.abs(g.x - (CHAR_X + 16)) < 24 &&
          Math.abs((g.y + Math.sin(g.bob) * 5) - (charY - 30)) < 32) {
        g.hit = true;
        gemCoinsCollected++;
        GameEngine.addGems(1);
        gemsEarnedThisRound += 1;
        SoundManager.playCorrect();
        for (let j = 0; j < 8; j++) {
          particles.push({
            x: g.x, y: g.y,
            vx: -2 + Math.random() * 4, vy: -2 - Math.random() * 2,
            life: 16 + Math.random() * 8, color: '#7db8ff', size: 2 + Math.random() * 2,
          });
        }
      }
      if (g.hit || g.x < -30) gemCoins.splice(i, 1);
    }

    // Collision detection
    const cx = CHAR_X + 2;
    const cy = charY - 48;
    const cw = 30;
    const ch = 46;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.hit) continue;
      const ox = obs.x;
      const oy = GROUND_Y - obs.h;
      if (cx < ox + obs.w && cx + cw > ox && cy < oy + obs.h && cy + ch > oy) {
        obs.hit = true;
        // Check letter match at collision time (not spawn-time flag)
        // so that stale obstacles are handled correctly after letterIndex changes
        if (obs.letter === currentWord.word[letterIndex]) {
          collectLetter(obs);
        } else {
          takeDamage(obs);
        }
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.1 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update collect effects
    for (let i = collectEffects.length - 1; i >= 0; i--) {
      collectEffects[i].y -= 2 * dt;
      collectEffects[i].life -= dt;
      if (collectEffects[i].life <= 0) collectEffects.splice(i, 1);
    }

    // Clouds
    for (let i = 0; i < clouds.length; i++) {
      clouds[i].x -= clouds[i].speed * dt;
      if (clouds[i].x + clouds[i].w < 0) {
        clouds[i].x = CANVAS_W + Math.random() * 100;
        clouds[i].y = 15 + Math.random() * 55;
      }
    }

    // Decay effects
    if (screenShake > 0) { screenShake *= Math.pow(0.88, dt); if (screenShake < 0.5) screenShake = 0; }
    if (damageFlash > 0) damageFlash -= 0.04 * dt;
    if (wordCompleteFlash > 0) wordCompleteFlash -= 0.03 * dt;
  }

  function spawnObstacle() {
    const cfg = DIFF_CONFIG[diff];
    if (!currentWord) return;
    const word = currentWord.word;
    const nextLetter = word[letterIndex];

    // Decide correct vs distractor
    let isCorrect = false;
    if (distSinceCorrect >= cfg.distractMax) {
      isCorrect = true;
    } else if (distSinceCorrect >= cfg.distractMin && Math.random() < 0.4) {
      isCorrect = true;
    }

    let letter;
    if (isCorrect) {
      letter = nextLetter;
      distSinceCorrect = 0;
    } else {
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      do { letter = alpha[Math.floor(Math.random() * 26)]; } while (letter === nextLetter);
      distSinceCorrect++;
    }

    const shapeType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = OBS_COLORS[Math.floor(Math.random() * OBS_COLORS.length)];

    let w, h;
    switch (shapeType) {
      case 'tall':    w = 30; h = 52 + Math.random() * 14; break;
      case 'diamond': w = 40; h = 44; break;
      case 'round':   w = 38; h = 38; break;
      case 'cactus':  w = 28; h = 48 + Math.random() * 12; break;
      default:        w = 34 + Math.random() * 10; h = 34 + Math.random() * 10; break;
    }

    obstacles.push({ x: CANVAS_W + 20, w, h, letter, isCorrect, shapeType, color, hit: false });
  }

  function jump(isDouble) {
    isJumping = true;
    jumpsUsed++;
    charVY = isDouble ? JUMP_VEL * 0.88 : JUMP_VEL;
    if (isDouble) {
      // Air-ring puff for the double jump
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        particles.push({
          x: CHAR_X + 16, y: charY - 10,
          vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 1.2 + 0.5,
          life: 12 + Math.random() * 6, color: '#9adcff', size: 2.2,
        });
      }
    } else {
      // Ground dust
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: CHAR_X + 10, y: GROUND_Y,
          vx: -1 + Math.random() * 2, vy: -1 - Math.random() * 2,
          life: 12 + Math.random() * 8, color: '#8d7b68', size: 2 + Math.random() * 2,
        });
      }
    }
  }

  function collectLetter(obs) {
    letterIndex++;
    combo++;
    SoundManager.playCorrect();

    // Combo popup from ×2 up
    if (combo >= 2) {
      collectEffects.push({
        letter: `COMBO ×${combo}`, small: true,
        x: CHAR_X + 60, y: charY - 70, life: 30,
      });
    }

    // Gold sparkle particles
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14;
      particles.push({
        x: obs.x + obs.w / 2, y: GROUND_Y - obs.h / 2,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2) - 1,
        life: 22 + Math.random() * 10, color: '#f5c518', size: 2.5 + Math.random() * 1.5,
      });
    }

    collectEffects.push({
      letter: obs.letter, x: obs.x + obs.w / 2, y: GROUND_Y - obs.h, life: 35,
    });

    updateWordDisplay();

    if (letterIndex >= currentWord.word.length) {
      wordComplete();
    }
  }

  function takeDamage(obs) {
    hp--;
    combo = 0;
    damageThisWord = true;
    SoundManager.playWrong();
    screenShake = 10;
    damageFlash = 1;

    // Red hit particles
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: CHAR_X + 10, y: charY - 25,
        vx: -2 + Math.random() * 4, vy: -3 + Math.random() * 2,
        life: 18 + Math.random() * 8, color: '#e74c3c', size: 2.5 + Math.random() * 2,
      });
    }

    updateHUD();

    if (hp <= 0) {
      gameOver();
    }
  }

  function wordComplete() {
    wordsCompleted++;
    hp = Math.min(hp + HP_REWARD, MAX_HP);
    wordCompleteFlash = 1;

    // XP reward (with buff)
    let xp = XP_PER_WORD;
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    GameEngine.addXP(xp);
    GameEngine.recordWord(currentWord.word);
    GameEngine.recordSpelling();

    // Gem bonus per word
    let gemPerWord = 1;
    if (GameEngine.hasBuff('gem_bonus')) {
      gemPerWord += 2;
      GameEngine.consumeBuff('gem_bonus');
    }
    // PERFECT word: spelled without taking any damage → +2 bonus gems
    if (!damageThisWord) {
      gemPerWord += 2;
      collectEffects.push({
        letter: 'PERFECT! ⭐', small: true,
        x: CHAR_X + 80, y: charY - 85, life: 45,
      });
    }
    GameEngine.addGems(gemPerWord);
    gemsEarnedThisRound += gemPerWord;

    // Hear the completed word once more
    if (TTSManager.isSupported()) {
      TTSManager.speak(currentWord.word.toLowerCase(), 'en-US', 0.85);
    }

    // Speed ramps up a little with each word — builds excitement
    const cfgSpeed = DIFF_CONFIG[diff].speed;
    speed = Math.min(cfgSpeed + wordsCompleted * 0.07, cfgSpeed * 1.55);

    updateHUD();

    if (wordsCompleted >= WORDS_TO_WIN) {
      roundComplete();
    } else {
      // Celebration particles
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: CHAR_X + Math.random() * 60, y: charY - 50 + Math.random() * 30,
          vx: -2 + Math.random() * 4, vy: -4 + Math.random() * 2,
          life: 30 + Math.random() * 15,
          color: ['#f5c518', '#4ecca3', '#e94560', '#00b4d8', '#7b2ff7'][Math.floor(Math.random() * 5)],
          size: 2 + Math.random() * 2,
        });
      }
      // Clear stale obstacles so old letters aren't evaluated against the new word
      obstacles = [];
      const cfg = DIFF_CONFIG[diff];
      nextObstacleAt = cfg.gapMin;
      pickNewWord();
    }
  }

  function roundComplete() {
    state = 'complete';

    let gems = DIFF_CONFIG[diff].gems;
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += 5;
      GameEngine.consumeBuff('gem_bonus');
    }
    GameEngine.addGems(gems);
    gemsEarnedThisRound += gems;
    SoundManager.playQuestComplete();

    document.getElementById('sp-complete-words').textContent = wordsCompleted;
    // Show the true payout for the round (per-word gems + round bonus)
    document.getElementById('sp-complete-gems').textContent = gemsEarnedThisRound;
    completeScreen.style.display = 'flex';

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    // Final frame
    render();
  }

  function gameOver() {
    state = 'gameover';

    document.getElementById('sp-final-words').textContent = wordsCompleted;
    gameoverScreen.style.display = 'flex';

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    render();
  }

  // ===== RENDERING =====
  function renderIdle() {
    if (idleAnimId) cancelAnimationFrame(idleAnimId);
    idleFrame = 0;
    idleLoop();
  }

  function idleLoop() {
    if (state === 'running') return;
    // Don't burn CPU rendering the idle scene while another zone is open
    if (!zoneActive()) {
      idleAnimId = null;
      return;
    }
    idleFrame++;
    // Slow gentle bounce: period ~180 frames (~3 seconds at 60fps)
    const bounce = Math.sin(idleFrame * 0.035) * 6;
    drawSky();
    drawStars();
    drawMountains(0);
    drawCloudsScene();
    drawGround(0);
    // Draw idle character with bounce offset
    drawCharacterAt(CHAR_X, GROUND_Y + bounce, 0, false);
    idleAnimId = requestAnimationFrame(idleLoop);
  }

  function render() {
    const sx = screenShake ? (Math.random() - 0.5) * screenShake : 0;
    const sy = screenShake ? (Math.random() - 0.5) * screenShake : 0;

    ctx.save();
    ctx.translate(sx, sy);

    drawSky();
    drawStars();
    drawMountains(mountainScroll);
    drawCloudsScene();

    // Obstacles
    for (let i = 0; i < obstacles.length; i++) {
      if (!obstacles[i].hit) drawObstacle(obstacles[i]);
    }

    // Floating gem coins
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < gemCoins.length; i++) {
      const g = gemCoins[i];
      ctx.fillText('💎', g.x, g.y + Math.sin(g.bob) * 5);
    }

    // Character
    drawCharacterAt(CHAR_X, charY, runFrame, isJumping);

    // Ground (draw after character feet for proper layering)
    drawGround(groundScroll);

    // Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Collect letter effects & popups (float up)
    for (let i = 0; i < collectEffects.length; i++) {
      const e = collectEffects[i];
      ctx.globalAlpha = Math.max(0, e.life / 35);
      ctx.font = e.small
        ? 'bold 13px "Press Start 2P", monospace'
        : 'bold 22px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillText(e.letter, e.x + 2, e.y + 2);
      ctx.fillStyle = e.small ? '#4ecca3' : '#f5c518';
      ctx.fillText(e.letter, e.x, e.y);
    }
    ctx.globalAlpha = 1;

    // Word complete flash
    if (wordCompleteFlash > 0) {
      ctx.fillStyle = `rgba(78, 204, 163, ${wordCompleteFlash * 0.2})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Damage flash overlay
    if (damageFlash > 0) {
      ctx.fillStyle = `rgba(231, 76, 60, ${damageFlash * 0.25})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    ctx.restore();
  }

  // Interpolated sky palette for the current phase of the day cycle
  function skyColors() {
    const p = Math.min(3, Math.max(0, skyPhase));
    const a = SKY_PHASES[Math.floor(p)];
    const b = SKY_PHASES[Math.min(3, Math.ceil(p))];
    const t = p - Math.floor(p);
    const mix = (c1, c2) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
    return {
      top: mix(a.top, b.top),
      mid: mix(a.mid, b.mid),
      bot: mix(a.bot, b.bot),
      night: a.night + (b.night - a.night) * t,
    };
  }

  function drawSky() {
    // Rebuild the gradient only when the sky actually changes
    if (Math.abs(skyGradCache.phase - skyPhase) > 0.004 || !skyGradCache.grad) {
      const c = skyColors();
      const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      grad.addColorStop(0, `rgb(${c.top.join(',')})`);
      grad.addColorStop(0.5, `rgb(${c.mid.join(',')})`);
      grad.addColorStop(1, `rgb(${c.bot.join(',')})`);
      skyGradCache = { phase: skyPhase, grad };
    }
    ctx.fillStyle = skyGradCache.grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sun (day/sunset) fades into moon (night)
    const night = skyColors().night;
    if (night < 0.6) {
      ctx.globalAlpha = 1 - night;
      ctx.fillStyle = skyPhase > 0.5 ? '#ffb25e' : '#ffe28a';
      ctx.beginPath();
      ctx.arc(690, 55 + skyPhase * 30, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (night > 0.5) {
      ctx.globalAlpha = (night - 0.5) * 2;
      ctx.fillStyle = '#f4f1de';
      ctx.beginPath();
      ctx.arc(700, 55, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skyGradCache.grad ? `rgb(${skyColors().top.join(',')})` : '#0f0c29';
      ctx.beginPath();
      ctx.arc(707, 50, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawStars() {
    // Stars only show at night; fade with the day cycle
    const night = skyColors().night;
    if (night <= 0.05) return;
    for (let i = 0; i < starSeed.length; i++) {
      const s = starSeed[i];
      const twinkle = Math.sin(frameCount * 0.04 + i * 1.7) * 0.3 + 0.6;
      ctx.globalAlpha = twinkle * 0.6 * night;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawMountains(scroll) {
    const totalW = mountains.length * 120;
    for (let i = 0; i < mountains.length; i++) {
      const m = mountains[i];
      let x = m.x - scroll * 0.15;
      // Wrap seamlessly using total mountain strip width
      x = ((x % totalW) + totalW) % totalW - 120;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + m.w / 2, GROUND_Y - m.h);
      ctx.lineTo(x + m.w, GROUND_Y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(25, 25, 60, 0.7)';
      ctx.fill();
    }
  }

  function drawCloudsScene() {
    // Clouds read brighter in daylight, faint at night
    const alpha = 0.1 + (1 - skyColors().night) * 0.35;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.2, c.y + 5, c.w * 0.3, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.25, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawGround(scroll) {
    // Grass top
    ctx.fillStyle = '#3d6b1f';
    ctx.fillRect(0, GROUND_Y - 2, CANVAS_W, 5);

    // Dirt (gradient cached — building it per frame is wasted work)
    if (!groundGrad) {
      groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      groundGrad.addColorStop(0, '#4a3628');
      groundGrad.addColorStop(0.4, '#362518');
      groundGrad.addColorStop(1, '#1f1510');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y + 3, CANVAS_W, GROUND_H);

    // Scrolling ground details
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let x = -scroll; x < CANVAS_W; x += 40) {
      ctx.fillRect(x, GROUND_Y + 12, 2, 1);
      ctx.fillRect(x + 18, GROUND_Y + 28, 3, 1);
    }
  }

  function drawObstacle(obs) {
    const x = obs.x;
    const y = GROUND_Y - obs.h;

    ctx.save();
    ctx.fillStyle = obs.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;

    switch (obs.shapeType) {
      case 'tall':
        roundRect(ctx, x, y, obs.w, obs.h, 4);
        ctx.fill(); ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x + obs.w / 2, y);
        ctx.lineTo(x + obs.w, y + obs.h / 2);
        ctx.lineTo(x + obs.w / 2, y + obs.h);
        ctx.lineTo(x, y + obs.h / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      case 'round':
        ctx.beginPath();
        ctx.arc(x + obs.w / 2, y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        break;
      case 'cactus':
        roundRect(ctx, x + obs.w * 0.15, y, obs.w * 0.7, obs.h, 3);
        ctx.fill(); ctx.stroke();
        // Arms
        ctx.fillStyle = obs.color;
        roundRect(ctx, x - 2, y + obs.h * 0.28, obs.w * 0.4, 7, 2);
        ctx.fill();
        roundRect(ctx, x + obs.w * 0.62, y + obs.h * 0.48, obs.w * 0.4, 7, 2);
        ctx.fill();
        break;
      default: // box
        roundRect(ctx, x, y, obs.w, obs.h, 5);
        ctx.fill(); ctx.stroke();
        break;
    }

    // Letter shadow
    ctx.font = 'bold 18px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(obs.letter, x + obs.w / 2 + 1, y + obs.h / 2 + 1);
    // Letter
    ctx.fillStyle = '#fff';
    ctx.fillText(obs.letter, x + obs.w / 2, y + obs.h / 2);

    ctx.restore();
  }

  function drawCharacterAt(x, y, frame, jumping) {
    ctx.save();

    // Squash & stretch around the feet for lively motion
    let sxScale = 1, syScale = 1;
    if (landSquash > 0) { sxScale = 1.12; syScale = 0.85; }
    else if (jumping && charVY < -2.5) { sxScale = 0.94; syScale = 1.08; }
    if (sxScale !== 1 || syScale !== 1) {
      ctx.translate(x + 16, y);
      ctx.scale(sxScale, syScale);
      ctx.translate(-(x + 16), -y);
    }

    // Pixel-art T-Rex dinosaur (like Chrome dino)
    const dino = '#4ecca3';       // main body green
    const dinoDark = '#3ba88a';   // darker shade
    const eye = '#fff';

    // === Tail ===
    ctx.fillStyle = dino;
    ctx.fillRect(x - 4, y - 24, 6, 4);
    ctx.fillRect(x - 8, y - 22, 6, 4);
    ctx.fillRect(x - 10, y - 20, 4, 4);

    // === Body (main torso) ===
    ctx.fillStyle = dino;
    ctx.fillRect(x + 2, y - 32, 18, 20);  // torso
    ctx.fillRect(x + 4, y - 36, 14, 6);   // upper body

    // === Belly highlight ===
    ctx.fillStyle = dinoDark;
    ctx.fillRect(x + 4, y - 18, 12, 6);

    // === Head ===
    ctx.fillStyle = dino;
    ctx.fillRect(x + 12, y - 48, 18, 14);  // head block
    ctx.fillRect(x + 16, y - 50, 12, 4);   // top of head

    // Jaw
    ctx.fillRect(x + 18, y - 36, 14, 5);

    // Teeth (small white pixels on jaw)
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 26, y - 36, 2, 2);
    ctx.fillRect(x + 30, y - 36, 2, 2);

    // Eye
    ctx.fillStyle = eye;
    ctx.fillRect(x + 24, y - 46, 4, 4);
    // Pupil
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 26, y - 45, 2, 2);

    // === Small Arms ===
    ctx.fillStyle = dino;
    const armOff = jumping ? -2 : (frame % 2 === 0 ? 0 : 2);
    ctx.fillRect(x + 16, y - 22 + armOff, 4, 6);
    ctx.fillRect(x + 18, y - 16 + armOff, 2, 2);

    // === Legs ===
    if (jumping) {
      // Legs tucked up while jumping
      ctx.fillStyle = dino;
      ctx.fillRect(x + 4, y - 12, 6, 6);
      ctx.fillRect(x + 14, y - 12, 6, 6);
      // Feet
      ctx.fillRect(x + 2, y - 6, 8, 3);
      ctx.fillRect(x + 12, y - 6, 8, 3);
    } else {
      // Running legs alternate
      ctx.fillStyle = dino;
      const legFrames = [
        [{ lx: 4, ly: -12, lh: 10 }, { lx: 14, ly: -12, lh: 5 }],
        [{ lx: 6, ly: -12, lh: 8 },  { lx: 12, ly: -12, lh: 8 }],
        [{ lx: 14, ly: -12, lh: 5 }, { lx: 4, ly: -12, lh: 10 }],
        [{ lx: 12, ly: -12, lh: 8 }, { lx: 6, ly: -12, lh: 8 }],
      ];
      const legs = legFrames[frame];
      ctx.fillRect(x + legs[0].lx, y + legs[0].ly, 6, legs[0].lh);
      ctx.fillRect(x + legs[1].lx, y + legs[1].ly, 6, legs[1].lh);
      // Feet
      ctx.fillRect(x + legs[0].lx - 1, y + legs[0].ly + legs[0].lh, 8, 3);
      ctx.fillRect(x + legs[1].lx - 1, y + legs[1].ly + legs[1].lh, 8, 3);
    }

    // === Spikes on back ===
    ctx.fillStyle = dinoDark;
    ctx.fillRect(x + 8, y - 38, 4, 3);
    ctx.fillRect(x + 14, y - 40, 4, 3);
    ctx.fillRect(x + 6, y - 35, 3, 3);

    // Damage flash on character
    if (damageFlash > 0.5) {
      ctx.globalAlpha = (damageFlash - 0.5) * 0.6;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x - 10, y - 50, 44, 53);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // ===== HUD =====
  function updateHUD() {
    let hearts = '';
    for (let i = 0; i < MAX_HP; i++) hearts += i < hp ? '❤️' : '🖤';
    hpEl.textContent = hearts;
    scoreEl.textContent = wordsCompleted + ' / ' + WORDS_TO_WIN;
  }

  function updateWordDisplay() {
    if (!currentWord) return;
    const word = currentWord.word;
    let html = '';
    for (let i = 0; i < word.length; i++) {
      if (i < letterIndex) {
        html += '<span class="sp-letter collected">' + word[i] + '</span>';
      } else if (i === letterIndex) {
        html += '<span class="sp-letter next">' + word[i] + '</span>';
      } else {
        html += '<span class="sp-letter">' + word[i] + '</span>';
      }
    }
    wordEl.innerHTML = html;
    // Concise meaning + emoji hint (raw zh can be a full sentence with ** markers)
    zhEl.textContent = `${currentWord.hint} ${shortZh(currentWord.zh)}`;
  }

  return { init, onShow };
})();
