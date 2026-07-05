/* ===== Empire English Module =====
   Age of Empires-style 3D castle defense built with Three.js.
   Enemies march toward the player's castle; answering English questions
   (vocabulary / dialogues / grammar / daily-life English) fires the
   castle's catapult to stop them. Progress persists in localStorage.
*/

const EmpireGame = (() => {
  const SAVE_KEY = 'english_savior_empire';

  // ===== Ages (difficulty tiers) =====
  const AGES = [
    { id: 1, name: '黑暗時代', icon: '🌑', xp: 10, waveBonus: 5 },
    { id: 2, name: '封建時代', icon: '🏘️', xp: 15, waveBonus: 10 },
    { id: 3, name: '城堡時代', icon: '🏰', xp: 20, waveBonus: 15 },
    { id: 4, name: '帝王時代', icon: '👑', xp: 25, waveBonus: 20 },
  ];
  const WAVES_PER_AGE = 3;
  const MAX_HP = 10;
  const PATH_START_Z = -78;   // enemy spawn
  const CASTLE_LINE_Z = 6;    // reaching this = castle takes damage

  // Enemy archetypes
  const ENEMY_TYPES = {
    militia: { name: '民兵', icon: '🪓', speed: 2.0, hp: 1, damage: 1, scale: 1.0 },
    archer:  { name: '弓箭手', icon: '🏹', speed: 2.4, hp: 1, damage: 1, scale: 1.0 },
    knight:  { name: '騎士', icon: '🛡️', speed: 2.9, hp: 1, damage: 2, scale: 1.15 },
    ram:     { name: '攻城槌', icon: '🪵', speed: 1.1, hp: 3, damage: 3, scale: 1.0 },
  };

  // ===== Persistent progress =====
  let progress = { wave: 1, kills: 0, correct: 0, wrong: 0, bestWave: 0 };

  // ===== Battle state =====
  let battleActive = false;
  let castleHp = MAX_HP;
  let enemies = [];          // live enemy objects
  let projectiles = [];
  let explosions = [];
  let currentTarget = null;
  let currentQuestion = null;
  let wrongAttempts = 0;
  let spawnQueue = [];
  let spawnTimer = 0;
  let waveInProgress = false;
  let shakeTime = 0;

  // ===== three.js =====
  let threeReady = false;
  let renderer, scene, camera, clock;
  let castleGroup = null;
  let rafId = null;

  // DOM refs
  let els = {};

  function init() {
    els = {
      wrap: document.getElementById('emp-canvas-wrap'),
      ageDisplay: document.getElementById('emp-age-display'),
      hp: document.getElementById('emp-hp'),
      wave: document.getElementById('emp-wave'),
      kills: document.getElementById('emp-kills'),
      accuracy: document.getElementById('emp-accuracy'),
      startScreen: document.getElementById('emp-start-screen'),
      startBtn: document.getElementById('emp-start-btn'),
      resetBtn: document.getElementById('emp-reset-btn'),
      startStats: document.getElementById('emp-start-stats'),
      defeatScreen: document.getElementById('emp-defeat-screen'),
      defeatStats: document.getElementById('emp-defeat-stats'),
      retryBtn: document.getElementById('emp-retry-btn'),
      ageupBanner: document.getElementById('emp-ageup-banner'),
      damageFlash: document.getElementById('emp-damage-flash'),
      question: document.getElementById('emp-question'),
      qTarget: document.getElementById('emp-q-target'),
      qPrompt: document.getElementById('emp-q-prompt'),
      qOptions: document.getElementById('emp-q-options'),
      qFeedback: document.getElementById('emp-q-feedback'),
    };

    loadProgress();
    renderStartStats();
    updateHUD();

    els.startBtn.addEventListener('click', startBattle);
    els.retryBtn.addEventListener('click', () => {
      els.defeatScreen.style.display = 'none';
      startBattle();
    });
    els.resetBtn.addEventListener('click', () => {
      if (confirm('確定要重新開始帝國戰役嗎？所有波數進度將歸零（成就和寶石會保留）。')) {
        progress = { wave: 1, kills: 0, correct: 0, wrong: 0, bestWave: progress.bestWave };
        saveProgress();
        renderStartStats();
        updateHUD();
      }
    });

    window.addEventListener('resize', resizeRenderer);
  }

  // Called by app.js when the zone becomes visible
  function onShow() {
    if (threeReady) {
      resizeRenderer();
      if (!rafId) animate();
    }
  }

  // ===== Progress persistence =====
  function loadProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) progress = { ...progress, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
  }

  function saveProgress() {
    progress.bestWave = Math.max(progress.bestWave, progress.wave - 1);
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  }

  function currentAge() {
    const idx = Math.min(AGES.length - 1, Math.floor((progress.wave - 1) / WAVES_PER_AGE));
    return AGES[idx];
  }

  function renderStartStats() {
    const age = currentAge();
    const total = progress.correct + progress.wrong;
    const acc = total > 0 ? Math.round(progress.correct / total * 100) : 0;
    els.startStats.innerHTML = `
      <div class="emp-stat"><span>${age.icon}</span><b>${age.name}</b><small>目前時代</small></div>
      <div class="emp-stat"><span>🚩</span><b>第 ${progress.wave} 波</b><small>戰役進度</small></div>
      <div class="emp-stat"><span>⚔️</span><b>${progress.kills}</b><small>擊敗敵人</small></div>
      <div class="emp-stat"><span>🎯</span><b>${acc}%</b><small>答對率</small></div>
    `;
    els.startBtn.textContent = progress.wave > 1 ? '⚔️ 繼續戰役' : '⚔️ 開始戰役';
  }

  // ===== three.js scene =====
  function initThree() {
    const w = els.wrap.clientWidth || 800;
    const h = Math.max(300, Math.round(w * 0.5));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'emp-canvas';
    els.wrap.insertBefore(renderer.domElement, els.wrap.firstChild);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fd4f5);
    scene.fog = new THREE.Fog(0x9fd4f5, 70, 150);

    camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 300);
    camera.position.set(20, 15, 30);
    camera.lookAt(0, 0, -12);

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffee, 0x7da35d, 0.85));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.0);
    sun.position.set(30, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -100;
    sun.shadow.camera.far = 200;
    scene.add(sun);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshLambertMaterial({ color: 0x6faf52 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dirt path the enemies march along
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 110),
      new THREE.MeshLambertMaterial({ color: 0xb08d57 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, -30);
    path.receiveShadow = true;
    scene.add(path);

    // Scatter trees and rocks (kept off the path)
    for (let i = 0; i < 26; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (6 + Math.random() * 40);
      const z = 14 - Math.random() * 100;
      if (Math.random() < 0.78) scene.add(makeTree(x, z));
      else scene.add(makeRock(x, z));
    }

    // Distant mountains
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(14 + Math.random() * 10, 22 + Math.random() * 14, 5),
        new THREE.MeshLambertMaterial({ color: 0x8b9dab })
      );
      m.position.set(-70 + i * 28 + Math.random() * 8, 0, -115 + Math.random() * 12);
      scene.add(m);
    }

    buildCastle(currentAge().id);

    clock = new THREE.Clock();
    threeReady = true;
    animate();
  }

  function makeTree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 2.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a5230 })
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    g.add(trunk);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3e8a3e });
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.9 - i * 0.45, 2.2, 7), leafMat);
      leaf.position.y = 2.6 + i * 1.15;
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.7;
    g.scale.set(s, s, s);
    return g;
  }

  function makeRock(x, z) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.8),
      new THREE.MeshLambertMaterial({ color: 0x9a9a94 })
    );
    rock.position.set(x, 0.4, z);
    rock.castShadow = true;
    return rock;
  }

  // Castle grows grander with each age
  function buildCastle(ageId) {
    if (castleGroup) scene.remove(castleGroup);
    castleGroup = new THREE.Group();

    const stone = new THREE.MeshLambertMaterial({ color: ageId >= 3 ? 0xcfcfd6 : 0xb5aa97 });
    const roofMat = new THREE.MeshLambertMaterial({ color: ageId >= 4 ? 0xd4af37 : 0x8b3a3a });

    // Main keep
    const keepH = 5 + ageId * 1.5;
    const keep = new THREE.Mesh(new THREE.BoxGeometry(10, keepH, 6), stone);
    keep.position.set(0, keepH / 2, 12);
    keep.castShadow = true;
    castleGroup.add(keep);

    // Gate
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3.6, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x5c3a21 })
    );
    gate.position.set(0, 1.8, 8.9);
    castleGroup.add(gate);

    // Corner towers (more + taller as ages advance)
    const towerCount = ageId >= 2 ? 4 : 2;
    const towerH = keepH + 2.5;
    const positions = [[-6, 9], [6, 9], [-6, 15], [6, 15]];
    for (let i = 0; i < towerCount; i++) {
      const [tx, tz] = positions[i];
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, towerH, 8), stone);
      tower.position.set(tx, towerH / 2, tz);
      tower.castShadow = true;
      castleGroup.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 2.4, 8), roofMat);
      roof.position.set(tx, towerH + 1.2, tz);
      roof.castShadow = true;
      castleGroup.add(roof);
    }

    // Battlements on the keep
    for (let i = -4; i <= 4; i += 2) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stone);
      merlon.position.set(i, keepH + 0.5, 9.2);
      castleGroup.add(merlon);
    }

    // Flag
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.5, 5),
      new THREE.MeshLambertMaterial({ color: 0x444444 })
    );
    pole.position.set(0, keepH + 1.75, 12);
    castleGroup.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xe94560, side: THREE.DoubleSide })
    );
    flag.position.set(1.05, keepH + 2.8, 12);
    castleGroup.add(flag);
    castleGroup.userData.flag = flag;

    scene.add(castleGroup);
  }

  // ===== Enemy construction (low-poly soldiers) =====
  function makeEnemy(typeKey, waveNum) {
    const t = ENEMY_TYPES[typeKey];
    const g = new THREE.Group();

    if (typeKey === 'ram') {
      // Siege ram: log on a wheeled frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.6, 4.6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2b })
      );
      frame.position.y = 1.5;
      frame.castShadow = true;
      g.add(frame);
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 5.4, 8),
        new THREE.MeshLambertMaterial({ color: 0x8a6237 })
      );
      log.rotation.x = Math.PI / 2;
      log.position.y = 1.7;
      g.add(log);
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1, 6),
        new THREE.MeshLambertMaterial({ color: 0x777777 })
      );
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 1.7, 3.2);
      g.add(head);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
      const wheels = [];
      [[-1.2, 1.6], [1.2, 1.6], [-1.2, -1.6], [1.2, -1.6]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.7, wz);
        wheel.castShadow = true;
        g.add(wheel);
        wheels.push(wheel);
      });
      g.userData.wheels = wheels;
    } else {
      const colors = {
        militia: { body: 0x8d5524, head: 0xe8b88a, helmet: 0x6e6e6e, weapon: 0x777777 },
        archer:  { body: 0x2f6d3a, head: 0xe8b88a, helmet: 0x4a3520, weapon: 0x8a6237 },
        knight:  { body: 0x51617a, head: 0xe8b88a, helmet: 0xa8b0bd, weapon: 0xcccccc },
      }[typeKey];

      const bodyMat = new THREE.MeshLambertMaterial({ color: colors.body });
      const limbMat = new THREE.MeshLambertMaterial({ color: colors.body });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.6), bodyMat);
      torso.position.y = 1.75;
      torso.castShadow = true;
      g.add(torso);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.62, 0.62),
        new THREE.MeshLambertMaterial({ color: colors.head })
      );
      head.position.y = 2.75;
      head.castShadow = true;
      g.add(head);

      const helmet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.44, 0.35, 8),
        new THREE.MeshLambertMaterial({ color: colors.helmet })
      );
      helmet.position.y = 3.12;
      g.add(helmet);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.34), limbMat);
      legL.position.set(-0.26, 0.55, 0);
      const legR = legL.clone();
      legR.position.x = 0.26;
      g.add(legL); g.add(legR);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.0, 0.26), limbMat);
      armL.position.set(-0.68, 1.85, 0);
      const armR = armL.clone();
      armR.position.x = 0.68;
      g.add(armL); g.add(armR);

      // Weapon in the right hand
      const weapon = new THREE.Mesh(
        typeKey === 'archer'
          ? new THREE.TorusGeometry(0.5, 0.06, 6, 12, Math.PI)
          : new THREE.BoxGeometry(0.14, 1.3, 0.14),
        new THREE.MeshLambertMaterial({ color: colors.weapon })
      );
      weapon.position.set(0.85, 1.7, 0.2);
      if (typeKey === 'archer') weapon.rotation.y = Math.PI / 2;
      g.add(weapon);

      if (typeKey !== 'archer') {
        const shield = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10),
          new THREE.MeshLambertMaterial({ color: typeKey === 'knight' ? 0x27496d : 0x7a1f1f })
        );
        shield.rotation.x = Math.PI / 2;
        shield.position.set(-0.75, 1.7, 0.25);
        g.add(shield);
      }

      g.userData.legs = [legL, legR];
      g.userData.arms = [armL, armR];
    }

    g.scale.setScalar(t.scale);
    const laneX = (Math.random() - 0.5) * 4;
    g.position.set(laneX, 0, PATH_START_Z - Math.random() * 6);
    g.rotation.y = 0; // facing +z (toward castle)
    scene.add(g);

    const speedScale = 1 + Math.min(0.5, (waveNum - 1) * 0.035);
    return {
      mesh: g,
      type: typeKey,
      hp: t.hp,
      damage: t.damage,
      baseSpeed: t.speed * speedScale,
      rushUntil: 0,
      dying: false,
      dieT: 0,
      walkT: Math.random() * 10,
      question: makeQuestion(),
    };
  }

  // ===== Question generation =====
  function makeQuestion() {
    const age = currentAge().id;
    // Question type pools open up as ages advance
    const pools = {
      1: ['vocab', 'dialogue', 'life', 'vocab'],
      2: ['vocab', 'dialogue', 'life', 'grammar'],
      3: ['vocab', 'dialogue', 'life', 'grammar', 'grammar'],
      4: ['vocab', 'dialogue', 'life', 'grammar'],
    }[age];
    const type = pools[Math.floor(Math.random() * pools.length)];
    const diff = age === 1 ? 'easy' : age === 2 ? 'medium' : age === 3 ? (Math.random() < 0.5 ? 'medium' : 'hard') : 'hard';

    if (type === 'vocab') return makeVocabQuestion(diff);
    if (type === 'dialogue') return makeChoiceQuestion(EMPIRE_DIALOGUES[diff], 'dialogue');
    if (type === 'life') return makeChoiceQuestion(EMPIRE_LIFE[diff], 'life');
    return makeGrammarQuestion(age);
  }

  function makeVocabQuestion(diff) {
    const pool = VOCAB_DATA[diff];
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const options = [entry.word];
    while (options.length < 4) {
      const w = pool[Math.floor(Math.random() * pool.length)].word;
      if (!options.includes(w)) options.push(w);
    }
    const shuffled = shuffle(options);
    return {
      type: 'vocab',
      typeLabel: '📖 單字',
      prompt: `${entry.hint} ${entry.zh.replace(/\*\*/g, '')}`,
      sub: '選出正確的英文單字',
      options: shuffled,
      correctIndex: shuffled.indexOf(entry.word),
      speak: entry.word,
      word: entry.word,
      explain: entry.sentence.replace('_____', entry.word),
    };
  }

  function makeChoiceQuestion(pool, type) {
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const options = shuffle([entry.a, ...entry.wrong]);
    if (type === 'dialogue') {
      return {
        type, typeLabel: '💬 對話',
        prompt: `對方說：「${entry.q}」`,
        sub: `（${entry.qZh}）該怎麼回應呢？`,
        options,
        correctIndex: options.indexOf(entry.a),
        speak: entry.a,
        speakFirst: entry.q,
        explain: `${entry.q} → ${entry.a}`,
      };
    }
    return {
      type, typeLabel: '🌏 生活英文',
      prompt: `${entry.scene}`,
      sub: entry.q,
      options,
      correctIndex: options.indexOf(entry.a),
      speak: entry.a,
      explain: entry.a,
    };
  }

  function makeGrammarQuestion(age) {
    // Later ages draw from deeper (harder) sections of the grammar bank
    const n = GRAMMAR_DATA.length;
    const lo = age === 2 ? 0 : Math.floor(n * 0.3);
    const hi = age >= 4 ? n : Math.floor(n * (age === 2 ? 0.4 : 0.75));
    const entry = GRAMMAR_DATA[lo + Math.floor(Math.random() * (hi - lo))];
    const options = shuffle([...entry.options]);
    return {
      type: 'grammar',
      typeLabel: '✏️ 文法',
      prompt: entry.sentence,
      sub: entry.translation || entry.topic,
      options,
      correctIndex: options.indexOf(entry.blank),
      speak: entry.sentence.replace(/_+/g, entry.blank),
      explain: entry.explain,
    };
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== Battle flow =====
  function startBattle() {
    if (!threeReady) initThree();
    els.startScreen.style.display = 'none';
    els.defeatScreen.style.display = 'none';

    battleActive = true;
    castleHp = MAX_HP;
    clearField();
    buildCastle(currentAge().id);
    GameEngine.setDeferLevelUp(true);
    startWave();
    updateHUD();
    if (!rafId) animate();
  }

  function startWave() {
    const wave = progress.wave;
    const age = currentAge();
    els.ageDisplay.textContent = `${age.icon} ${age.name}`;
    els.wave.textContent = `第 ${wave} 波`;

    // Compose the wave
    const count = Math.min(4 + Math.ceil(wave / 2), 9);
    spawnQueue = [];
    for (let i = 0; i < count; i++) {
      let type = 'militia';
      const r = Math.random();
      if (age.id >= 2 && r > 0.7) type = 'knight';
      else if (r > 0.45) type = 'archer';
      spawnQueue.push(type);
    }
    // Boss ram closes out every 3rd wave
    if (wave % 3 === 0) spawnQueue.push('ram');

    spawnTimer = 0;
    waveInProgress = true;
    GameEngine.showToast(`🚩 第 ${wave} 波敵軍來襲！（${spawnQueue.length} 個敵人）`, 'info');
  }

  function clearField() {
    enemies.forEach(e => scene && scene.remove(e.mesh));
    projectiles.forEach(p => scene && scene.remove(p.mesh));
    explosions.forEach(x => scene && scene.remove(x.mesh));
    enemies = []; projectiles = []; explosions = [];
    currentTarget = null;
    currentQuestion = null;
    hideQuestion();
  }

  // Frontmost living enemy becomes the question target
  function pickTarget() {
    const alive = enemies.filter(e => !e.dying);
    if (alive.length === 0) {
      currentTarget = null;
      hideQuestion();
      return;
    }
    alive.sort((a, b) => b.mesh.position.z - a.mesh.position.z);
    const front = alive[0];
    if (front !== currentTarget) {
      currentTarget = front;
      showQuestion(front);
    }
  }

  function showQuestion(enemy) {
    currentQuestion = enemy.question;
    wrongAttempts = 0;
    const t = ENEMY_TYPES[enemy.type];
    els.question.style.display = 'block';
    els.qTarget.innerHTML = `${t.icon} <b>${t.name}</b> 逼近中！${enemy.hp > 1 ? `（還需答對 ${enemy.hp} 題）` : ''} <span class="emp-q-type">${currentQuestion.typeLabel}</span>`;
    els.qPrompt.innerHTML = '';
    const promptText = document.createElement('span');
    promptText.textContent = currentQuestion.prompt;
    els.qPrompt.appendChild(promptText);
    if (currentQuestion.speakFirst && TTSManager.isSupported()) {
      els.qPrompt.appendChild(TTSManager.createButton(currentQuestion.speakFirst, 'en-US'));
      TTSManager.speak(currentQuestion.speakFirst, 'en-US', 0.9);
    }
    const sub = document.createElement('div');
    sub.className = 'emp-q-sub';
    sub.textContent = currentQuestion.sub || '';
    els.qPrompt.appendChild(sub);

    els.qFeedback.textContent = '';
    els.qFeedback.className = 'emp-q-feedback';
    els.qOptions.innerHTML = '';

    let options = currentQuestion.options.map((opt, i) => ({ opt, i }));
    // Hint crystal: remove two wrong options
    if (GameEngine.hasBuff('hint')) {
      GameEngine.consumeBuff('hint');
      GameEngine.showToast('🔮 提示水晶生效！移除兩個錯誤選項', 'achievement');
      const wrongs = shuffle(options.filter(o => o.i !== currentQuestion.correctIndex)).slice(0, 1);
      options = options.filter(o => o.i === currentQuestion.correctIndex || wrongs.includes(o));
      options = shuffle(options);
    }

    options.forEach(({ opt, i }) => {
      const btn = document.createElement('button');
      btn.className = 'emp-q-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => answer(i, btn));
      els.qOptions.appendChild(btn);
    });
  }

  function hideQuestion() {
    els.question.style.display = 'none';
  }

  function answer(index, btn) {
    if (!battleActive || !currentTarget || !currentQuestion) return;

    if (index === currentQuestion.correctIndex) {
      SoundManager.playCorrect();
      progress.correct++;
      els.qFeedback.textContent = `✅ 正確！${currentQuestion.explain || ''}`;
      els.qFeedback.className = 'emp-q-feedback correct';
      if (TTSManager.isSupported() && currentQuestion.speak) {
        TTSManager.speak(currentQuestion.speak, 'en-US', 0.9);
      }
      els.qOptions.querySelectorAll('.emp-q-option').forEach(b => {
        b.disabled = true;
        if (b === btn) b.classList.add('correct');
      });

      fireProjectile(currentTarget);
      grantKillRewardsLater(currentTarget, currentQuestion);
      saveProgress();
    } else {
      SoundManager.playWrong();
      progress.wrong++;
      wrongAttempts++;
      btn.disabled = true;
      btn.classList.add('wrong');
      // Penalty: the enemy charges for a few seconds
      currentTarget.rushUntil = performance.now() + 3500;
      if (wrongAttempts >= 2) {
        // Reveal the answer so they learn it, then let them click it
        const correctBtnIndex = currentQuestion.correctIndex;
        els.qOptions.querySelectorAll('.emp-q-option').forEach(b => {
          if (b.textContent === currentQuestion.options[correctBtnIndex]) {
            b.classList.add('reveal');
          }
        });
        els.qFeedback.textContent = `💡 答案是「${currentQuestion.options[correctBtnIndex]}」，點它擊退敵人！`;
        els.qFeedback.className = 'emp-q-feedback hint';
      } else {
        els.qFeedback.textContent = '❌ 答錯了！敵人加速衝鋒，再試一次！';
        els.qFeedback.className = 'emp-q-feedback wrong';
      }
      saveProgress();
    }
  }

  // Rewards are granted when the projectile lands (feels causal)
  function grantKillRewardsLater(enemy, question) {
    enemy.pendingReward = { question };
  }

  function grantKillRewards(enemy) {
    if (!enemy.pendingReward) return;
    const { question } = enemy.pendingReward;
    enemy.pendingReward = null;

    enemy.hp--;
    if (enemy.hp > 0) {
      // Siege ram survives — assign a fresh question
      enemy.question = makeQuestion();
      GameEngine.showToast(`🪵 攻城槌受創！再答對 ${enemy.hp} 題摧毀它！`, 'info');
      if (currentTarget === enemy) showQuestion(enemy);
      return;
    }

    enemy.dying = true;
    enemy.dieT = 0;
    progress.kills++;

    const age = currentAge();
    let xp = age.xp;
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
    GameEngine.recordEmpire();
    if (question.type === 'vocab' && question.word) {
      GameEngine.recordWord(question.word);
    }
    saveProgress();
    updateHUD();

    currentTarget = null; // next frame picks the new frontmost enemy
    hideQuestion();
  }

  function fireProjectile(enemy) {
    if (!threeReady) return;
    const from = new THREE.Vector3(0, (castleGroup ? 8 : 8), 10);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xff6b35, emissive: 0xcc3300 })
    );
    mesh.position.copy(from);
    scene.add(mesh);
    projectiles.push({ mesh, from, target: enemy, t: 0 });
  }

  function spawnExplosion(pos) {
    const group = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 + Math.random() * 0.18, 6, 6),
        new THREE.MeshBasicMaterial({
          color: [0xffd166, 0xff6b35, 0xef476f][i % 3],
          transparent: true,
        })
      );
      p.position.copy(pos);
      p.userData.v = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 7 + 2,
        (Math.random() - 0.5) * 8
      );
      group.add(p);
    }
    scene.add(group);
    explosions.push({ mesh: group, t: 0 });
  }

  function castleDamaged(dmg) {
    // Revive feather blocks one hit
    if (GameEngine.hasBuff('revive')) {
      GameEngine.consumeBuff('revive');
      GameEngine.showToast('🪶 復活羽毛擋下了這次攻擊！', 'achievement');
      return;
    }
    castleHp = Math.max(0, castleHp - dmg);
    shakeTime = 0.5;
    els.damageFlash.classList.add('active');
    setTimeout(() => els.damageFlash.classList.remove('active'), 350);
    SoundManager.playWrong();
    updateHUD();
    if (castleHp <= 0) defeat();
  }

  function waveCleared() {
    waveInProgress = false;
    const age = currentAge();
    const prevAgeId = age.id;

    let bonus = age.waveBonus;
    GameEngine.addGems(bonus);
    castleHp = Math.min(MAX_HP, castleHp + 2);
    GameEngine.showToast(`🎉 第 ${progress.wave} 波防守成功！+${bonus} 💎，城堡修復 +2 ❤️`, 'achievement');
    SoundManager.playQuestComplete();

    progress.wave++;
    saveProgress();
    updateHUD();

    const newAge = currentAge();
    if (newAge.id > prevAgeId) {
      // Advance to the next age!
      SoundManager.playLevelUp();
      GameEngine.recordEmpireAge(newAge.id);
      buildCastle(newAge.id);
      els.ageDisplay.textContent = `${newAge.icon} ${newAge.name}`;
      els.ageupBanner.innerHTML = `${newAge.icon}<br>晉升「${newAge.name}」！<br><small>城堡升級了，敵人與題目也更強了！</small>`;
      els.ageupBanner.style.display = 'flex';
      setTimeout(() => { els.ageupBanner.style.display = 'none'; }, 3200);
    }

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    GameEngine.setDeferLevelUp(true);

    // Short breather, then the next wave marches in
    setTimeout(() => {
      if (battleActive) startWave();
    }, 3400);
  }

  function defeat() {
    battleActive = false;
    waveInProgress = false;
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    hideQuestion();

    const total = progress.correct + progress.wrong;
    const acc = total > 0 ? Math.round(progress.correct / total * 100) : 0;
    els.defeatStats.innerHTML = `
      <p>🏰 城堡被攻陷了……但你的英文變強了！</p>
      <p>本場戰役進度：第 <b>${progress.wave}</b> 波 ｜ 總擊敗 <b>${progress.kills}</b> 敵人 ｜ 答對率 <b>${acc}%</b></p>
      <p><small>別擔心，波數進度會保留，再接再厲！</small></p>
    `;
    els.defeatScreen.style.display = 'flex';
    saveProgress();
  }

  function updateHUD() {
    let hearts = '';
    for (let i = 0; i < MAX_HP; i++) hearts += i < castleHp ? '❤️' : '🖤';
    els.hp.textContent = hearts;
    els.wave.textContent = `第 ${progress.wave} 波`;
    els.kills.textContent = `⚔️ ${progress.kills}`;
    const age = currentAge();
    els.ageDisplay.textContent = `${age.icon} ${age.name}`;
    const total = progress.correct + progress.wrong;
    els.accuracy.textContent = `🎯 ${total > 0 ? Math.round(progress.correct / total * 100) : 0}%`;
  }

  // ===== Main loop =====
  function animate() {
    rafId = requestAnimationFrame(animate);

    // Pause the world when the zone is hidden (keeps battery + sanity)
    const zoneVisible = document.getElementById('zone-empire').classList.contains('active');
    if (!zoneVisible) {
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    const dt = Math.min(clock.getDelta(), 0.1);
    const now = performance.now();

    if (battleActive) {
      // Spawn queued enemies with spacing
      if (spawnQueue.length > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          enemies.push(makeEnemy(spawnQueue.shift(), progress.wave));
          spawnTimer = 2.6;
        }
      }

      // March enemies
      enemies.forEach(e => {
        if (e.dying) {
          e.dieT += dt;
          e.mesh.rotation.x = -Math.min(1, e.dieT * 2.5) * Math.PI / 2;
          e.mesh.position.y = -e.dieT * 0.8;
          if (e.dieT > 1.1) {
            scene.remove(e.mesh);
            e.remove = true;
          }
          return;
        }
        const rush = now < e.rushUntil ? 1.55 : 1;
        e.mesh.position.z += e.baseSpeed * rush * dt;
        e.walkT += dt * e.baseSpeed * rush * 3;

        // Walk cycle
        if (e.mesh.userData.legs) {
          const swing = Math.sin(e.walkT) * 0.55;
          e.mesh.userData.legs[0].rotation.x = swing;
          e.mesh.userData.legs[1].rotation.x = -swing;
          e.mesh.userData.arms[0].rotation.x = -swing * 0.8;
          e.mesh.userData.arms[1].rotation.x = swing * 0.8;
          e.mesh.position.y = Math.abs(Math.sin(e.walkT)) * 0.08;
        }
        if (e.mesh.userData.wheels) {
          e.mesh.userData.wheels.forEach(w => { w.rotation.x += e.baseSpeed * rush * dt; });
        }

        // Reached the castle
        if (e.mesh.position.z >= CASTLE_LINE_Z) {
          scene.remove(e.mesh);
          e.remove = true;
          if (currentTarget === e) { currentTarget = null; hideQuestion(); }
          castleDamaged(e.damage);
          GameEngine.showToast(`💥 ${ENEMY_TYPES[e.type].name} 攻擊了城堡！-${e.damage} ❤️`, 'error');
        }
      });
      enemies = enemies.filter(e => !e.remove);

      // Projectiles (arcing catapult shots)
      projectiles.forEach(p => {
        p.t += dt / 0.45;
        if (p.t >= 1) {
          const hitPos = p.target.mesh.position.clone().setY(1.2);
          spawnExplosion(hitPos);
          scene.remove(p.mesh);
          p.remove = true;
          grantKillRewards(p.target);
        } else {
          const targetPos = p.target.mesh.position.clone().setY(1.2);
          const pos = p.from.clone().lerp(targetPos, p.t);
          pos.y += Math.sin(p.t * Math.PI) * 7;
          p.mesh.position.copy(pos);
        }
      });
      projectiles = projectiles.filter(p => !p.remove);

      // Wave cleared?
      if (battleActive && waveInProgress && spawnQueue.length === 0 &&
          enemies.length === 0 && projectiles.length === 0) {
        waveCleared();
      }

      if (battleActive) pickTarget();
    }

    // Explosions
    explosions.forEach(x => {
      x.t += dt;
      x.mesh.children.forEach(p => {
        p.position.addScaledVector(p.userData.v, dt);
        p.userData.v.y -= 18 * dt;
        p.material.opacity = Math.max(0, 1 - x.t / 0.7);
      });
      if (x.t > 0.7) {
        scene.remove(x.mesh);
        x.remove = true;
      }
    });
    explosions = explosions.filter(x => !x.remove);

    // Flag wave + camera shake
    if (castleGroup && castleGroup.userData.flag) {
      castleGroup.userData.flag.rotation.y = Math.sin(now / 300) * 0.25;
    }
    if (shakeTime > 0) {
      shakeTime -= dt;
      camera.position.set(
        20 + (Math.random() - 0.5) * 0.8,
        15 + (Math.random() - 0.5) * 0.8,
        30
      );
    } else {
      camera.position.set(20, 15, 30);
    }
    camera.lookAt(0, 0, -12);

    renderer.render(scene, camera);
  }

  function resizeRenderer() {
    if (!threeReady) return;
    const w = els.wrap.clientWidth || 800;
    const h = Math.max(300, Math.round(w * 0.5));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { init, onShow };
})();
