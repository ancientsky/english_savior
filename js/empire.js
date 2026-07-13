/* ===== Empire English Module =====
   Age of Empires-style 3D castle defense built with Three.js.
   Enemies march toward the player's castle; answering English questions
   (vocabulary / dialogues / grammar / daily-life English) fires the
   castle's catapult to stop them. Progress persists in localStorage.

   FX overhaul: shared material/texture caches (matOf/GEO/MAT/TEX, ported
   from js/sky.js), a per-age sky dome + terrain recipe (rebuildScenery),
   combat juice (hit-flash, knockback, dust/debris, floating reward text,
   combo system), an in-world toast + synthesized SFX layer, and a
   window.__empTest hook for automated smoke tests.
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
  let castleHpCap = MAX_HP;  // raised (up to 13) for the battle by 城牆工事 (wall_repair)
  let enemies = [];          // live enemy objects
  let projectiles = [];
  let explosions = [];
  let debris = [];           // tumbling ram wood-box debris
  let rewardSprites = [];    // floating "+XP" / "+gems" sprites
  let currentTarget = null;
  let currentQuestion = null;
  let wrongAttempts = 0;
  let spawnQueue = [];
  let spawnTimer = 0;
  let waveInProgress = false;
  let shakeTime = 0;
  let comboCount = 0;
  let comboBonusGiven = false;
  // 消耗品：火焰彈／冰凍陷阱是「每場一次」的軍火，開戰時上膛（arm），
  // 於下一次相關事件觸發時引爆並卸除（disarm）
  let fireBombArmed = false;
  let freezeTrapArmed = false;
  let freezeUntil = 0;      // performance.now() timestamp; enemies frozen while now < this

  // ===== three.js =====
  let threeReady = false;
  let renderer, scene, camera, clock;
  let castleGroup = null;
  let rafId = null;
  let hemiLight = null, sunLight = null;
  let groundMat = null, pathMat = null;
  let skyDome = null, sunSprite = null;
  let cloudMesh = null, cloudData = [];
  let targetArrow = null;
  let sceneryGroup = null, sceneryAgeBuilt = null;
  let windmillBlades = null, sceneryParticles = null;

  // Reusable scratch objects for per-frame instanced-matrix updates
  // (avoids allocating a Matrix4/Vector3/Quaternion every frame)
  const _m4 = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();

  // Orbit camera (spherical coordinates around a look-at target).
  // Low + close by default so approaching enemies visibly grow.
  const CAM_HOME = { radius: 40, theta: 0.55, phi: 0.30 };
  const CAM_TARGET = { x: 0, y: 2, z: -16 };
  let cam = { ...CAM_HOME };
  let activePointers = new Map();  // pointerId -> {x, y}
  let pinchDist = 0;

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

    // In-world toast + combo badge (canvas-local, added via JS — see empire.css)
    els.toast = document.createElement('div');
    els.toast.className = 'emp-toast';
    els.toast.id = 'emp-toast';
    els.wrap.appendChild(els.toast);

    els.comboBadge = document.createElement('div');
    els.comboBadge.className = 'emp-combo-badge';
    els.comboBadge.id = 'emp-combo-badge';
    els.wrap.appendChild(els.comboBadge);

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

    // Camera control buttons (work once the 3D scene exists)
    document.getElementById('emp-cam-reset')?.addEventListener('click', () => {
      if (threeReady) resetCamera();
    });
    document.getElementById('emp-cam-zoomin')?.addEventListener('click', () => {
      if (threeReady) zoomCamera(0.85);
    });
    document.getElementById('emp-cam-zoomout')?.addEventListener('click', () => {
      if (threeReady) zoomCamera(1.18);
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
  // Canvas is 2:1 but never taller than ~55% of the viewport (62% in
  // maximized mode, since the HUD/nav are hidden there), so the
  // question panel stays visible in fullscreen / maximized mode
  function canvasSize() {
    const w = els.wrap.clientWidth || 800;
    const maxH = document.body.classList.contains('game-max') ? 0.62 : 0.55;
    const h = Math.max(300, Math.min(Math.round(w * 0.5), Math.round(window.innerHeight * maxH)));
    return { w, h };
  }

  // ===== shared geometry / material caches (ported from js/sky.js) =====
  const GEO = {};
  const MAT = {};
  function matOf(color, emissive, texKey) {
    const key = color + '_' + (emissive || 0) + '_' + (texKey || '');
    if (!MAT[key]) {
      const opts = { color };
      if (texKey && TEX[texKey]) opts.map = TEX[texKey];
      MAT[key] = new THREE.MeshLambertMaterial(opts);
      if (emissive) { MAT[key].emissive = new THREE.Color(emissive); }
    }
    return MAT[key];
  }

  // ---------- procedural surface textures (cosmetic-only, no new draw calls) ----------
  // Neutral overlay approach: base = near-white with subtle speckles/streaks so the
  // material's own `color` still shows through (Lambert multiplies map × color).
  const TEX = {};
  function noiseTexture(key, base, spots, density, opts) {
    if (TEX[key]) return TEX[key];
    opts = opts || {};
    const size = opts.size || 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < density; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.fillStyle = spots[i % spots.length];
      ctx.globalAlpha = 0.15 + Math.random() * 0.35;
      if (opts.angular) {
        const s = 1.5 + Math.random() * 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        ctx.restore();
      } else {
        const r = 1 + Math.random() * (opts.rmax || 2);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (opts.streaks) {
      const { color, count, len, random } = opts.streaks;
      ctx.strokeStyle = color;
      for (let i = 0; i < count; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const l = len * (0.5 + Math.random() * 0.9);
        const angle = random ? Math.random() * Math.PI * 2 : (Math.PI / 2 + (Math.random() - 0.5) * 0.3);
        ctx.globalAlpha = 0.1 + Math.random() * 0.25;
        ctx.lineWidth = 1 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * l, y + Math.sin(angle) * l);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat || 4, opts.repeat || 4);
    TEX[key] = tex;
    return tex;
  }

  // build every recipe once, eagerly, before any scenery/castle/enemy mesh is made
  function initTextures() {
    noiseTexture('grassTex', '#ffffff', ['#bfe0a8', '#a6cf8e', '#d8ecc4'], 300, { rmax: 5 });
    noiseTexture('dirtTex', '#ffffff', ['#caa876', '#b6935f', '#e0c295'], 260, { rmax: 4 });
    noiseTexture('stoneTex', '#ffffff', ['#c9c9c0', '#b3b3a8', '#dedbd0'], 200,
      { streaks: { color: '#8f8c80', count: 30, len: 9, random: true } });
    noiseTexture('woodTex', '#ffffff', ['#d8c6a8', '#e9dcc0'], 50,
      { streaks: { color: '#8a6a45', count: 55, len: 100 } });
    noiseTexture('rockTex', '#ffffff', ['#b5b5ab', '#96968c', '#cfcfc4'], 220,
      { streaks: { color: '#767268', count: 36, len: 11, random: true } });
  }

  // ---------- sky dome (per-age gradient) + sun sprite ----------
  const skyDomeTexCache = {};
  function initSky() {
    skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(400, 20, 14),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false })
    );
    scene.add(skyDome);

    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const sctx = sc.getContext('2d');
    const g = sctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.25, 'rgba(255,236,160,0.9)');
    g.addColorStop(1, 'rgba(255,236,160,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 128, 128);
    sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(sc), transparent: true, fog: false,
    }));
    sunSprite.scale.set(140, 140, 1);
    sunSprite.position.set(60, 70, -90);
    scene.add(sunSprite);
  }

  function applySkyForAge(ageId) {
    const st = AGE_STYLES[ageId] || AGE_STYLES[4];
    if (!skyDomeTexCache[ageId]) {
      const cv = document.createElement('canvas');
      cv.width = 48; cv.height = 384;
      const ctx = cv.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 384);
      st.sky.forEach((c, i) => grad.addColorStop(i / (st.sky.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 48, 384);
      skyDomeTexCache[ageId] = new THREE.CanvasTexture(cv);
    }
    skyDome.material.map = skyDomeTexCache[ageId];
    skyDome.material.needsUpdate = true;
    sunSprite.material.color.set(st.sun);
  }

  function initThree() {
    const { w, h } = canvasSize();
    initTextures();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'emp-canvas';
    els.wrap.insertBefore(renderer.domElement, els.wrap.firstChild);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x9fd4f5, 70, 150);

    camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 500);
    applyCamera();
    setupCameraControls();

    initSky();

    // Lights (kept as refs so each age can tint the atmosphere)
    hemiLight = new THREE.HemisphereLight(0xffffee, 0x7da35d, 0.85);
    scene.add(hemiLight);
    sunLight = new THREE.DirectionalLight(0xfff3d6, 1.0);
    sunLight.position.set(30, 40, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -60; sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60; sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.far = 200;
    scene.add(sunLight);

    // Ground — dedicated (non-cached) material: its color is retinted per
    // age in buildCastle(), so it can't share the matOf() cache.
    groundMat = new THREE.MeshLambertMaterial({ color: 0x6faf52, map: TEX.grassTex });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dirt path the enemies march along — also retinted per age
    pathMat = new THREE.MeshLambertMaterial({ color: 0xb08d57, map: TEX.dirtTex });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(7, 110), pathMat);
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

    // Flower patches — one InstancedMesh, vertex-colored for variety
    buildFlowers();

    // Border stones along the path
    const stoneMat = matOf(0xa8a49a, 0, 'rockTex');
    for (let i = 0; i < 14; i++) {
      [-4.2, 4.2].forEach(sx => {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), stoneMat);
        s.position.set(sx + (Math.random() - 0.5) * 0.5, 0.3, 4 - i * 6);
        scene.add(s);
      });
    }

    // Drifting clouds — single InstancedMesh (~20 puffs)
    buildClouds();

    // Bouncing marker above the enemy the current question belongs to
    targetArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 1.5, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3344 })
    );
    targetArrow.rotation.x = Math.PI;
    targetArrow.visible = false;
    scene.add(targetArrow);

    // Distant mountains
    const mountainMat = matOf(0x8b9dab, 0, 'rockTex');
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(14 + Math.random() * 10, 22 + Math.random() * 14, 5), mountainMat);
      m.position.set(-70 + i * 28 + Math.random() * 8, 0, -115 + Math.random() * 12);
      scene.add(m);
    }

    buildCastle(currentAge().id);

    clock = new THREE.Clock();
    threeReady = true;
    animate();
  }

  function buildFlowers() {
    const colors = [0xff6b81, 0xffd166, 0xc77dff, 0xffffff, 0xff9f1c];
    const COUNT = 220;
    const geo = new THREE.SphereGeometry(0.28, 6, 5);
    // note: plain white material — InstancedMesh per-instance colors come from
    // setColorAt/instanceColor; vertexColors:true would read a missing geometry
    // attribute and render every instance black
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (5 + Math.random() * 34);
      const z = 12 - Math.random() * 95;
      _m4.makeTranslation(x, 0.3, z);
      mesh.setMatrixAt(i, _m4);
      col.set(colors[i % colors.length]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
  }

  function buildClouds() {
    const COUNT = 20;
    const geo = new THREE.SphereGeometry(1, 7, 6);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    cloudMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    cloudData = [];
    for (let i = 0; i < COUNT; i++) {
      const d = {
        x: -90 + Math.random() * 180,
        y: 32 + Math.random() * 14,
        z: -70 - Math.random() * 40,
        sx: 2.8 + Math.random() * 2.4,
        sy: (1.6 + Math.random() * 1.2) * 0.6,
        sz: 2.2 + Math.random() * 1.8,
        speed: 1 + Math.random() * 1.6,
      };
      cloudData.push(d);
      _p.set(d.x, d.y, d.z); _s.set(d.sx, d.sy, d.sz);
      _m4.compose(_p, _q, _s);
      cloudMesh.setMatrixAt(i, _m4);
    }
    scene.add(cloudMesh);
  }

  // ===== Orbit camera controls =====
  function applyCamera(shakeX = 0, shakeY = 0) {
    const r = cam.radius;
    const x = r * Math.sin(cam.theta) * Math.cos(cam.phi) + CAM_TARGET.x;
    const y = r * Math.sin(cam.phi) + CAM_TARGET.y;
    const z = r * Math.cos(cam.theta) * Math.cos(cam.phi) + CAM_TARGET.z;
    camera.position.set(x + shakeX, y + shakeY, z);
    camera.lookAt(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
  }

  function clampCamera() {
    cam.phi = Math.min(1.05, Math.max(0.12, cam.phi));
    cam.theta = Math.min(1.25, Math.max(-1.25, cam.theta));
    cam.radius = Math.min(64, Math.max(20, cam.radius));
  }

  function resetCamera() {
    cam = { ...CAM_HOME };
    applyCamera();
  }

  function zoomCamera(factor) {
    cam.radius *= factor;
    clampCamera();
    applyCamera();
  }

  function setupCameraControls() {
    const el = renderer.domElement;

    el.addEventListener('pointerdown', e => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture?.(e.pointerId);
      if (activePointers.size === 2) {
        const [a, b] = [...activePointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });

    el.addEventListener('pointermove', e => {
      if (!activePointers.has(e.pointerId)) return;
      const prev = activePointers.get(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        // Drag to orbit
        cam.theta -= (e.clientX - prev.x) * 0.006;
        cam.phi += (e.clientY - prev.y) * 0.005;
        clampCamera();
        applyCamera();
      } else if (activePointers.size === 2) {
        // Pinch to zoom
        const [a, b] = [...activePointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) {
          cam.radius *= pinchDist / d;
          clampCamera();
          applyCamera();
        }
        pinchDist = d;
      }
    });

    const release = e => {
      activePointers.delete(e.pointerId);
      pinchDist = 0;
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);

    el.addEventListener('wheel', e => {
      e.preventDefault();
      zoomCamera(1 + Math.sign(e.deltaY) * 0.09);
    }, { passive: false });

    el.addEventListener('dblclick', resetCamera);
  }

  function makeTree(x, z, variant) {
    variant = variant || {};
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 2.2, 6),
      matOf(0x7a5230, 0, 'woodTex')
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    g.add(trunk);
    const leafMat = matOf(variant.leafColor || 0x3e8a3e);
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

  // Bare/dead tree for the Dark age's grimmer scenery
  function makeDeadTree(x, z) {
    const g = new THREE.Group();
    const trunkMat = matOf(0x4a3c2e, 0, 'woodTex');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.4, 6), trunkMat);
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 5), trunkMat);
      branch.position.set((Math.random() - 0.5) * 0.5, 2.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
      branch.rotation.z = (Math.random() - 0.5) * 1.6;
      branch.rotation.x = (Math.random() - 0.5) * 1.2;
      g.add(branch);
    }
    g.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.6;
    g.scale.set(s, s, s);
    return g;
  }

  function makeRock(x, z) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.8),
      matOf(0x9a9a94, 0, 'rockTex')
    );
    rock.position.set(x, 0.4, z);
    rock.castShadow = true;
    return rock;
  }

  // A pole + flag/pennant used for roadside banners (age 3) and festive
  // garlands (age 4). Needs a double-sided, non-mutated material — cheap
  // enough (a handful of instances) that caching isn't worth the extra
  // matOf() surface area.
  function makeBanner(x, z, color, triangle) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3.2, 5),
      matOf(0x5c3a21, 0, 'woodTex')
    );
    pole.position.y = 1.6;
    g.add(pole);
    if (!GEO.pennant) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.5); shape.lineTo(0.7, 0); shape.lineTo(0, -0.5); shape.lineTo(0, 0.5);
      GEO.pennant = new THREE.ShapeGeometry(shape);
    }
    const flagGeo = triangle ? GEO.pennant : new THREE.PlaneGeometry(0.7, 1.6);
    const flag = new THREE.Mesh(
      flagGeo,
      new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })
    );
    flag.position.set(0.35, 2.6, 0);
    g.add(flag);
    g.position.set(x, 0, z);
    return g;
  }

  // Each age has a visually distinct castle AND atmosphere so upgrades
  // feel like a real transformation, not just a taller box
  const AGE_STYLES = {
    1: { // 黑暗時代: rough wooden fort under a misty grey sky
      wall: 0x8a6237, roof: 0x6e4520, keepH: 4.5, towers: 2, towerH: 6.5,
      palisade: true, banners: false, spire: false, gold: false,
      sky: ['#4a5560', '#6b7885', '#93a0a8', '#c2c8c0', '#d8d4c8'],
      fog: 0xa8b8c2, fogNear: 55, fogFar: 108,
      sun: 0xd8d4c8, sunI: 0.8, hemiI: 0.7,
      flag: 0x8d5524,
      groundColor: 0x6b7a5e, pathColor: 0x8a7355,
    },
    2: { // 封建時代: proper stone castle, clear blue day
      wall: 0xb5aa97, roof: 0x8b3a3a, keepH: 6.5, towers: 4, towerH: 9,
      palisade: false, banners: false, spire: false, gold: false,
      sky: ['#2a7fd4', '#69b8ef', '#aee3ff', '#e8f7ff', '#fdf0d5'],
      fog: 0x9fd4f5, fogNear: 70, fogFar: 150,
      sun: 0xfff3d6, sunI: 1.0, hemiI: 0.85,
      flag: 0xe94560,
      groundColor: 0x7fc25a, pathColor: 0xb08d57,
    },
    3: { // 城堡時代: white-stone fortress with banners, bright sky
      wall: 0xe3e0d8, roof: 0xb8332f, keepH: 8.5, towers: 4, towerH: 12,
      palisade: false, banners: true, spire: false, gold: false,
      sky: ['#1f6fc9', '#5aa8e8', '#9adfff', '#e3f8ff', '#ffffff'],
      fog: 0xa9dcff, fogNear: 70, fogFar: 150,
      sun: 0xffffff, sunI: 1.1, hemiI: 0.95,
      flag: 0x2e6fd8,
      groundColor: 0x6faf52, pathColor: 0xb08d57,
    },
    4: { // 帝王時代: golden-roofed palace at golden hour
      wall: 0xefe9dc, roof: 0xd4af37, keepH: 10, towers: 4, towerH: 14,
      palisade: false, banners: true, spire: true, gold: true,
      sky: ['#d46a2a', '#e8944a', '#f5b876', '#ffd9a0', '#ffe3b8'],
      fog: 0xffe3b8, fogNear: 70, fogFar: 150,
      sun: 0xffca7a, sunI: 1.15, hemiI: 0.9,
      flag: 0xd4af37,
      groundColor: 0x8fbf5a, pathColor: 0xc9a267,
    },
  };

  function buildCastle(ageId) {
    if (castleGroup) scene.remove(castleGroup);
    castleGroup = new THREE.Group();
    const st = AGE_STYLES[ageId] || AGE_STYLES[4];

    // Atmosphere shift per age
    applySkyForAge(ageId);
    if (scene.fog) {
      scene.fog.color.set(st.fog);
      scene.fog.near = st.fogNear;
      scene.fog.far = st.fogFar;
    }
    if (sunLight) { sunLight.color.set(st.sun); sunLight.intensity = st.sunI; }
    if (hemiLight) hemiLight.intensity = st.hemiI;
    if (groundMat) groundMat.color.set(st.groundColor);
    if (pathMat) pathMat.color.set(st.pathColor);

    const wallMat = matOf(st.wall, 0, 'stoneTex');
    const roofMat = matOf(st.roof);
    const woodMat = matOf(0x5c3a21, 0, 'woodTex');

    // Main keep
    const keep = new THREE.Mesh(new THREE.BoxGeometry(10, st.keepH, 6), wallMat);
    keep.position.set(0, st.keepH / 2, 12);
    keep.castShadow = true;
    castleGroup.add(keep);

    // Gate
    const gate = new THREE.Mesh(new THREE.BoxGeometry(3, 3.6, 0.6), woodMat);
    gate.position.set(0, 1.8, 8.9);
    castleGroup.add(gate);

    // Dark-age palisade: a ring of sharpened logs instead of stone walls
    if (st.palisade) {
      for (let i = -7; i <= 7; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 3.6, 6), woodMat);
        log.position.set(i * 1.05, 1.8, 8.2);
        castleGroup.add(log);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 6), woodMat);
        tip.position.set(i * 1.05, 4.05, 8.2);
        castleGroup.add(tip);
      }
    } else {
      // Side curtain walls from feudal age on
      [-8.5, 8.5].forEach(wx => {
        const wallH = st.keepH * 0.55;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(7, wallH, 2.2), wallMat);
        wall.position.set(wx, wallH / 2, 11);
        wall.castShadow = true;
        castleGroup.add(wall);
        for (let i = -2; i <= 2; i++) {
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), wallMat);
          merlon.position.set(wx + i * 1.4, wallH + 0.45, 10.2);
          castleGroup.add(merlon);
        }
      });
    }

    // Towers
    const positions = [[-6, 9], [6, 9], [-6, 15], [6, 15]];
    for (let i = 0; i < st.towers; i++) {
      const [tx, tz] = positions[i];
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, st.towerH, 8), wallMat);
      tower.position.set(tx, st.towerH / 2, tz);
      tower.castShadow = true;
      castleGroup.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 2.6, 8), roofMat);
      roof.position.set(tx, st.towerH + 1.3, tz);
      roof.castShadow = true;
      castleGroup.add(roof);
      if (st.gold) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 8, 6),
          matOf(0xffe28a, 0x8a6a1a)
        );
        orb.position.set(tx, st.towerH + 2.8, tz);
        castleGroup.add(orb);
      }
      if (st.banners) {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, 2.2),
          new THREE.MeshLambertMaterial({ color: st.flag, side: THREE.DoubleSide })
        );
        banner.position.set(tx, st.towerH - 1.6, tz + 1.75);
        castleGroup.add(banner);
      }
    }

    // Battlements on the keep
    for (let i = -4; i <= 4; i += 2) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wallMat);
      merlon.position.set(i, st.keepH + 0.5, 9.2);
      castleGroup.add(merlon);
    }

    // Imperial central spire
    if (st.spire) {
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 5, 8), wallMat);
      spire.position.set(0, st.keepH + 2.5, 12);
      spire.castShadow = true;
      castleGroup.add(spire);
      const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3, 8), roofMat);
      spireRoof.position.set(0, st.keepH + 6.5, 12);
      castleGroup.add(spireRoof);
    }

    // Flag on the keep (or spire)
    const flagBaseY = st.spire ? st.keepH + 8 : st.keepH;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.5, 5),
      matOf(0x444444)
    );
    pole.position.set(0, flagBaseY + 1.75, 12);
    castleGroup.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1.2),
      new THREE.MeshLambertMaterial({ color: st.flag, side: THREE.DoubleSide })
    );
    flag.position.set(1.05, flagBaseY + 2.8, 12);
    castleGroup.add(flag);
    castleGroup.userData.flag = flag;

    scene.add(castleGroup);

    if (sceneryAgeBuilt !== ageId) rebuildScenery(ageId);
  }

  // ===== Per-age scenery (dead trees / wheat+windmill / autumn / cherry blossom) =====
  function disposeOwned(group) {
    group.traverse(obj => {
      if (obj.userData && obj.userData.owned) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }

  // One THREE.Points field per age (<=300 verts); driftType picked up by animate()
  function addParticles(colorHex, count, opts) {
    opts = opts || {};
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * (opts.spreadX || 70);
      arr[i * 3 + 1] = (opts.yMin || 0) + Math.random() * ((opts.yMax || 6) - (opts.yMin || 0));
      arr[i * 3 + 2] = (opts.zBase || -30) + (Math.random() - 0.5) * (opts.spreadZ || 100);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex, size: opts.size || 0.35, transparent: true,
      opacity: opts.opacity != null ? opts.opacity : 0.6, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.owned = true; // unique geometry+material — disposed on rebuild
    pts.userData.driftType = opts.driftType || 'mist';
    return pts;
  }

  function buildWheat(parent) {
    const COUNT = 180;
    if (!GEO.wheat) GEO.wheat = new THREE.ConeGeometry(0.12, 0.9, 4);
    const mesh = new THREE.InstancedMesh(GEO.wheat, matOf(0xd9c25a), COUNT);
    for (let i = 0; i < COUNT; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (9 + Math.random() * 30);
      const z = 8 - Math.random() * 90;
      _m4.makeTranslation(x, 0.45, z);
      mesh.setMatrixAt(i, _m4);
    }
    parent.add(mesh);
  }

  function buildWindmill() {
    const g = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 5.5, 8), matOf(0xcfc6b0, 0, 'stoneTex'));
    tower.position.y = 2.75;
    tower.castShadow = true;
    g.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2, 8), matOf(0x8a6237, 0, 'woodTex'));
    roof.position.y = 6.5;
    g.add(roof);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), matOf(0x5c3a21));
    hub.position.set(0, 5.6, 1.7);
    g.add(hub);

    const blades = new THREE.Group();
    const bladeMat = matOf(0xe8dcc0, 0, 'woodTex');
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.2), bladeMat);
      blade.position.y = 1.7;
      blade.rotation.z = (Math.PI / 2) * i;
      blades.add(blade);
    }
    blades.position.set(0, 5.6, 1.75);
    g.add(blades);
    windmillBlades = blades;

    return g;
  }

  function rebuildScenery(ageId) {
    if (sceneryGroup) {
      disposeOwned(sceneryGroup);
      scene.remove(sceneryGroup);
    }
    sceneryGroup = new THREE.Group();
    windmillBlades = null;
    sceneryParticles = null;

    if (ageId === 1) {
      // Dark age: dead trees + slow ground mist
      for (let i = 0; i < 9; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        sceneryGroup.add(makeDeadTree(side * (8 + Math.random() * 36), 10 - Math.random() * 95));
      }
      sceneryParticles = addParticles(0x8a9088, 220, {
        yMin: 0.3, yMax: 1.6, spreadX: 90, spreadZ: 120, zBase: -30,
        size: 0.9, opacity: 0.35, driftType: 'mist',
      });
      sceneryGroup.add(sceneryParticles);
    } else if (ageId === 2) {
      // Feudal age: wheat fields + one rotating windmill + pollen motes
      buildWheat(sceneryGroup);
      const mill = buildWindmill();
      mill.position.set(-24, 0, -6);
      sceneryGroup.add(mill);
      sceneryParticles = addParticles(0xf0d878, 160, {
        yMin: 0.2, yMax: 4, spreadX: 80, spreadZ: 110, zBase: -30,
        size: 0.3, opacity: 0.55, driftType: 'pollen',
      });
      sceneryGroup.add(sceneryParticles);
    } else if (ageId === 3) {
      // Castle age: autumn trees + roadside banners + falling leaves
      for (let i = 0; i < 9; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        sceneryGroup.add(makeTree(side * (7 + Math.random() * 38), 10 - Math.random() * 96,
          { leafColor: i % 2 ? 0xd9822b : 0xb5432f }));
      }
      for (let i = 0; i < 7; i++) {
        sceneryGroup.add(makeBanner(-4.6, 3 - i * 10, 0x2e6fd8));
        sceneryGroup.add(makeBanner(4.6, 3 - i * 10, 0xe94560));
      }
      sceneryParticles = addParticles(0xd9822b, 220, {
        yMin: 0, yMax: 10, spreadX: 80, spreadZ: 110, zBase: -30,
        size: 0.4, opacity: 0.65, driftType: 'leaves',
      });
      sceneryGroup.add(sceneryParticles);
    } else {
      // Imperial age: cherry blossoms + festive garlands + golden sparkle
      for (let i = 0; i < 9; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        sceneryGroup.add(makeTree(side * (7 + Math.random() * 38), 10 - Math.random() * 96,
          { leafColor: 0xffb7d1 }));
      }
      const garlandColors = [0xd4af37, 0xff6b81, 0x7db8ff, 0xffffff];
      for (let i = -6; i <= 6; i += 2) {
        sceneryGroup.add(makeBanner(i * 1.3, 9.4, garlandColors[(i + 6) % garlandColors.length], true));
      }
      sceneryParticles = addParticles(0xffe28a, 200, {
        yMin: 0.2, yMax: 7, spreadX: 70, spreadZ: 100, zBase: -30,
        size: 0.35, opacity: 0.7, driftType: 'sparkle',
      });
      sceneryGroup.add(sceneryParticles);
    }

    scene.add(sceneryGroup);
    sceneryAgeBuilt = ageId;
  }

  // Celebration fireworks above the castle (age up / wave clear)
  function fireworks(count) {
    if (!threeReady) return;
    const palette = [0xffd166, 0xff6b81, 0x4ecca3, 0x7db8ff, 0xc77dff];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!scene) return;
        if (explosions.length >= 12) return; // particle-burst cap
        const pos = new THREE.Vector3((Math.random() - 0.5) * 22, 14 + Math.random() * 8, 6 + Math.random() * 8);
        const group = new THREE.Group();
        const color = palette[Math.floor(Math.random() * palette.length)];
        if (!GEO.sparkParticle) GEO.sparkParticle = new THREE.SphereGeometry(0.2, 6, 6);
        for (let j = 0; j < 16; j++) {
          const p = new THREE.Mesh(
            GEO.sparkParticle,
            new THREE.MeshBasicMaterial({ color, transparent: true })
          );
          p.scale.setScalar(1.1);
          p.position.copy(pos);
          const a = (j / 16) * Math.PI * 2;
          p.userData.v = new THREE.Vector3(Math.cos(a) * 7, Math.sin(a) * 7 + 2, (Math.random() - 0.5) * 4);
          group.add(p);
        }
        scene.add(group);
        explosions.push({ mesh: group, t: 0, life: 1.2, grav: 6 });
      }, i * 450);
    }
  }

  // ---- confetti celebration (ported from js/sky.js spawnConfetti) ----
  function empConfetti(n = 30) {
    const colors = ['#ffd166', '#ff6b81', '#4ade80', '#7fd4ff', '#c77dff', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'emp-confetti';
      c.style.left = 8 + Math.random() * 84 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      els.wrap.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  }

  // ---- in-world toast (wave start / ram spawn / age-up name) ----
  let toastTimer = null;
  function showEmpToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('on'), 2200);
  }

  // ---- combo badge ----
  let comboBadgeTimer = null;
  function showComboBadge(n) {
    if (!els.comboBadge) return;
    els.comboBadge.textContent = `🔥 連擊 ×${n}！`;
    els.comboBadge.classList.remove('pop', 'tier-3', 'tier-5', 'tier-8');
    void els.comboBadge.offsetWidth; // reflow so the pop animation restarts
    els.comboBadge.classList.add('pop', 'tier-' + n);
    clearTimeout(comboBadgeTimer);
    comboBadgeTimer = setTimeout(() => els.comboBadge.classList.remove('pop', 'tier-' + n), 1000);
  }

  function hideComboBadge() {
    if (!els.comboBadge) return;
    clearTimeout(comboBadgeTimer);
    els.comboBadge.classList.remove('pop', 'tier-3', 'tier-5', 'tier-8');
  }

  // ---- floating reward text ("+10 XP", "💎+1") ----
  const rewardTexCache = new Map();
  function rewardTexture(text, crit) {
    const key = text + '|' + (crit ? 1 : 0);
    if (rewardTexCache.has(key)) return rewardTexCache.get(key);
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.font = (crit ? 'bold 40px' : 'bold 34px') + ' "Press Start 2P", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = crit ? '#7a1f1f' : '#2b1a0a';
    ctx.fillStyle = crit ? '#ffd166' : '#fff6dd';
    ctx.strokeText(text, 128, 48);
    ctx.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(cv);
    rewardTexCache.set(key, tex);
    return tex;
  }

  function spawnRewardText(text, pos, crit) {
    if (!threeReady) return;
    if (rewardSprites.length >= 10) return;
    const tex = rewardTexture(text, crit);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(crit ? 3.2 : 2.4, crit ? 1.2 : 0.9, 1);
    spr.position.copy(pos);
    spr.position.y += 1.2;
    scene.add(spr);
    rewardSprites.push({ mesh: spr, t: 0, life: 1.2 });
  }

  // ===== Local synthesized SFX (whoosh / thump / horn / fanfare) =====
  // SoundManager (engine.js) doesn't expose its AudioContext, so this
  // creates its own lazily on first use (a user gesture — the answer
  // click — always precedes it, so autoplay policies are satisfied).
  let sfxCtx = null;
  function getSfxCtx() {
    try {
      if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sfxCtx.state === 'suspended') sfxCtx.resume();
      return sfxCtx;
    } catch { return null; }
  }
  function sfxEnabled() {
    return typeof SoundManager !== 'undefined' && SoundManager.isEnabled ? SoundManager.isEnabled() : true;
  }
  function sfxTone(ctx, freq, dur, type, vol, delay) {
    delay = delay || 0;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur);
  }
  function sfxSweep(ctx, f0, f1, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + dur);
    osc.start(t0); osc.stop(t0 + dur);
  }
  function sfxWhoosh() {
    if (!sfxEnabled()) return;
    const ctx = getSfxCtx(); if (!ctx) return;
    sfxSweep(ctx, 900, 140, 0.28, 'sawtooth', 0.1);
  }
  function sfxThump() {
    if (!sfxEnabled()) return;
    const ctx = getSfxCtx(); if (!ctx) return;
    sfxTone(ctx, 90, 0.22, 'sine', 0.22, 0);
    sfxSweep(ctx, 300, 60, 0.15, 'square', 0.08);
  }
  function sfxHorn() {
    if (!sfxEnabled()) return;
    const ctx = getSfxCtx(); if (!ctx) return;
    sfxTone(ctx, 196, 0.35, 'sawtooth', 0.14, 0);
    sfxTone(ctx, 147, 0.45, 'sawtooth', 0.14, 0.3);
  }
  function sfxFanfare() {
    if (!sfxEnabled()) return;
    const ctx = getSfxCtx(); if (!ctx) return;
    [261.63, 329.63, 392.00].forEach((f, i) => sfxTone(ctx, f, 0.3, 'triangle', 0.16, i * 0.12));
  }

  // ===== Enemy construction (low-poly soldiers) =====
  function makeEnemy(typeKey, waveNum) {
    const t = ENEMY_TYPES[typeKey];
    const g = new THREE.Group();

    if (typeKey === 'ram') {
      // Siege ram: log on a wheeled frame. Frame material is cloned
      // (not shared) so the hit-flash only affects this one ram.
      const frameMat = matOf(0x6b4a2b).clone();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 4.6), frameMat);
      frame.position.y = 1.5;
      frame.castShadow = true;
      g.add(frame);
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 5.4, 8),
        matOf(0x8a6237, 0, 'woodTex')
      );
      log.rotation.x = Math.PI / 2;
      log.position.y = 1.7;
      g.add(log);
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1, 6),
        matOf(0x777777)
      );
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 1.7, 3.2);
      g.add(head);
      const wheelMat = matOf(0x3d2b1f);
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
      g.userData.flashMesh = frame;
      g.userData.flashMat = frameMat;
    } else {
      const colors = {
        militia: { body: 0x8d5524, head: 0xe8b88a, helmet: 0x6e6e6e, weapon: 0x777777 },
        archer:  { body: 0x2f6d3a, head: 0xe8b88a, helmet: 0x4a3520, weapon: 0x8a6237 },
        knight:  { body: 0x51617a, head: 0xe8b88a, helmet: 0xa8b0bd, weapon: 0xcccccc },
      }[typeKey];

      // Shared body material for the limbs; the torso gets its own CLONE
      // so the hit-flash (emissive mutation) only affects this one enemy.
      const bodyMat = matOf(colors.body);
      const torsoMat = bodyMat.clone();

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.6), torsoMat);
      torso.position.y = 1.75;
      torso.castShadow = true;
      g.add(torso);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.62, 0.62),
        matOf(colors.head)
      );
      head.position.y = 2.75;
      head.castShadow = true;
      g.add(head);

      const helmet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.44, 0.35, 8),
        matOf(colors.helmet)
      );
      helmet.position.y = 3.12;
      g.add(helmet);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.34), bodyMat);
      legL.position.set(-0.26, 0.55, 0);
      const legR = legL.clone();
      legR.position.x = 0.26;
      g.add(legL); g.add(legR);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.0, 0.26), bodyMat);
      armL.position.set(-0.68, 1.85, 0);
      const armR = armL.clone();
      armR.position.x = 0.68;
      g.add(armL); g.add(armR);

      // Weapon in the right hand
      const weapon = new THREE.Mesh(
        typeKey === 'archer'
          ? new THREE.TorusGeometry(0.5, 0.06, 6, 12, Math.PI)
          : new THREE.BoxGeometry(0.14, 1.3, 0.14),
        matOf(colors.weapon)
      );
      weapon.position.set(0.85, 1.7, 0.2);
      if (typeKey === 'archer') weapon.rotation.y = Math.PI / 2;
      g.add(weapon);

      if (typeKey !== 'archer') {
        const shield = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10),
          matOf(typeKey === 'knight' ? 0x27496d : 0x7a1f1f)
        );
        shield.rotation.x = Math.PI / 2;
        shield.position.set(-0.75, 1.7, 0.25);
        g.add(shield);
      }

      g.userData.legs = [legL, legR];
      g.userData.arms = [armL, armR];
      g.userData.flashMesh = torso;
      g.userData.flashMat = torsoMat;
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
      flashMat: g.userData.flashMat,
      flashMesh: g.userData.flashMesh,
      flashT: 0,
      leanT: 0,
    };
  }

  function flashEnemy(enemy) {
    if (!enemy.flashMat) return;
    enemy.flashMat.emissive.setRGB(1, 1, 1);
    enemy.flashT = 0.15;
    enemy.leanT = 0.18;
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
    castleHpCap = MAX_HP;
    fireBombArmed = false;
    freezeTrapArmed = false;
    freezeUntil = 0;
    comboCount = 0;
    comboBonusGiven = false;
    hideComboBadge();
    clearField();
    buildCastle(currentAge().id);
    GameEngine.setDeferLevelUp(true);
    applyBattleStartBuffs();
    updateHUD();
    if (!rafId) animate();
  }

  // Consumes the once-per-battle consumables (fire_bomb / castle_wall /
  // freeze_trap) and announces every battle-relevant item still active
  // (hint/double_xp/gem_bonus/revive/double_gems included) via one in-world
  // toast, then a follow-up for the wall-repair HP bump. Both fire before
  // startWave()'s own "⚔️ 第 X 波來襲" toast so the player gets a moment to
  // read the loadout instead of it being instantly overwritten.
  function applyBattleStartBuffs() {
    const parts = [];
    ['hint', 'double_xp', 'gem_bonus', 'revive', 'double_gems'].forEach(t => {
      if (GameEngine.hasBuff(t)) parts.push(`${BUFF_META[t].icon} ${BUFF_META[t].name}`);
    });

    let wallApplied = false;
    if (GameEngine.hasBuff('wall_repair')) {
      GameEngine.consumeBuff('wall_repair');
      castleHpCap = Math.min(13, MAX_HP + 3);
      castleHp = Math.min(castleHpCap, castleHp + 3);
      wallApplied = true;
      parts.push(`${BUFF_META.wall_repair.icon} ${BUFF_META.wall_repair.name}`);
    }
    if (GameEngine.hasBuff('fire_bomb')) {
      GameEngine.consumeBuff('fire_bomb');
      fireBombArmed = true;
      parts.push(`${BUFF_META.fire_bomb.icon} ${BUFF_META.fire_bomb.name}`);
    }
    if (GameEngine.hasBuff('freeze_trap')) {
      GameEngine.consumeBuff('freeze_trap');
      freezeTrapArmed = true;
      parts.push(`${BUFF_META.freeze_trap.icon} ${BUFF_META.freeze_trap.name}`);
    }
    updateHUD();

    if (parts.length === 0) {
      startWave();
      return;
    }
    showEmpToast(`🎒 本場道具：${parts.join('、')}`);
    setTimeout(() => {
      if (wallApplied) showEmpToast(`${BUFF_META.wall_repair.icon} 城牆工事！城堡生命 +3`);
      setTimeout(() => { if (battleActive) startWave(); }, wallApplied ? 1800 : 1600);
    }, 1600);
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
    showEmpToast(`⚔️ 第 ${wave} 波來襲！`);
  }

  function clearField() {
    enemies.forEach(e => scene && scene.remove(e.mesh));
    projectiles.forEach(p => scene && scene.remove(p.mesh));
    explosions.forEach(x => scene && scene.remove(x.mesh));
    debris.forEach(d => scene && scene.remove(d.mesh));
    rewardSprites.forEach(r => scene && scene.remove(r.mesh));
    enemies = []; projectiles = []; explosions = []; debris = []; rewardSprites = [];
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

      // Combo tracking: 3 / 5 / 8 pop an escalating badge; exactly 5 grants
      // a once-per-battle gem bonus (normal reward path, not an achievement)
      comboCount++;
      let milestone = 0;
      if ([3, 5, 8].includes(comboCount)) {
        milestone = comboCount;
        showComboBadge(comboCount);
        if (comboCount === 5 && !comboBonusGiven) {
          comboBonusGiven = true;
          GameEngine.addGems(2);
          GameEngine.showToast('🔥 連擊 ×5！額外 +2 💎', 'gem');
        }
      }

      fireProjectile(currentTarget);
      grantKillRewardsLater(currentTarget, currentQuestion, milestone);
      saveProgress();
    } else {
      SoundManager.playWrong();
      progress.wrong++;
      wrongAttempts++;
      comboCount = 0;
      hideComboBadge();
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
  function grantKillRewardsLater(enemy, question, comboMilestone) {
    enemy.pendingReward = { question, comboMilestone: comboMilestone || 0 };
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

    sfxThump();
    // Death dust burst (separate from the projectile-impact burst)
    spawnExplosion(enemy.mesh.position.clone().setY(0.3), {
      count: 8, colors: [0x9a8365, 0xc2a878, 0x6b5a42], life: 0.6, grav: 10,
      spread: 3, sizeMin: 0.1, sizeMax: 0.2,
    });
    if (enemy.type === 'ram') spawnWoodDebris(enemy.mesh.position.clone());

    enemy.dying = true;
    enemy.dieT = 0;
    progress.kills++;

    const age = currentAge();
    let xp = age.xp;
    let crit = false;
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      crit = true;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    let gems = 1;
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += 2;
      crit = true;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
    }
    // Check double_gems BEFORE addGems (which consumes it internally) so the
    // floating text can flag the doubling even though the actual multiply
    // happens inside GameEngine.addGems.
    const doubleGemsActive = GameEngine.hasBuff('double_gems');
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);
    GameEngine.recordEmpire();
    if (question.type === 'vocab' && question.word) {
      GameEngine.recordWord(question.word);
    }
    saveProgress();
    updateHUD();

    const rewardPos = enemy.mesh.position.clone();
    spawnRewardText(`+${xp} XP`, rewardPos.clone().setX(rewardPos.x - 0.6), crit);
    const gemsShown = doubleGemsActive ? gems * 2 : gems;
    const gemsLabel = doubleGemsActive ? `💎+${gemsShown} ×2` : `💎+${gems}`;
    spawnRewardText(gemsLabel, rewardPos.clone().setX(rewardPos.x + 0.6), crit || doubleGemsActive);

    currentTarget = null; // next frame picks the new frontmost enemy
    hideQuestion();

    // 🔥 Fire bomb: if armed, the NEXT kill that leaves ≥1 other enemy alive
    // also detonates the nearest other living enemy for a half-value kill.
    if (fireBombArmed) {
      const others = enemies.filter(o => o !== enemy && !o.dying);
      if (others.length > 0) {
        fireBombArmed = false;
        let nearest = null, nearestDist = Infinity;
        others.forEach(o => {
          const d = o.mesh.position.distanceTo(enemy.mesh.position);
          if (d < nearestDist) { nearestDist = d; nearest = o; }
        });
        if (nearest) {
          sfxThump();
          spawnExplosion(nearest.mesh.position.clone().setY(1.2), {
            count: 16, colors: [0xff6b35, 0xff2d00, 0xffcf5c], life: 0.8, grav: 12, spread: 10,
          });
          showEmpToast('🔥 火焰彈引爆！');
          fireBombKill(nearest);
        }
      }
    }
  }

  // 🔥 Fire bomb bonus kill: instantly kills `enemy` (reusing the normal
  // death path — dust burst, dying animation, kill counting) and grants
  // HALF the usual XP/gems since it wasn't earned by answering a question.
  function fireBombKill(enemy) {
    if (enemy.dying) return;
    const question = enemy.question;

    sfxThump();
    spawnExplosion(enemy.mesh.position.clone().setY(0.3), {
      count: 8, colors: [0x9a8365, 0xc2a878, 0x6b5a42], life: 0.6, grav: 10,
      spread: 3, sizeMin: 0.1, sizeMax: 0.2,
    });
    if (enemy.type === 'ram') spawnWoodDebris(enemy.mesh.position.clone());

    enemy.hp = 0;
    enemy.dying = true;
    enemy.dieT = 0;
    progress.kills++;

    const age = currentAge();
    const xp = Math.max(1, Math.round(age.xp / 2));
    const gems = 1;
    const doubleGemsActive = GameEngine.hasBuff('double_gems');
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);
    GameEngine.recordEmpire();
    if (question && question.type === 'vocab' && question.word) {
      GameEngine.recordWord(question.word);
    }
    saveProgress();
    updateHUD();

    const rewardPos = enemy.mesh.position.clone();
    spawnRewardText(`🔥+${xp} XP`, rewardPos.clone().setX(rewardPos.x - 0.6));
    const gemsShown = doubleGemsActive ? gems * 2 : gems;
    const gemsLabel = doubleGemsActive ? `💎+${gemsShown} ×2` : `💎+${gems}`;
    spawnRewardText(gemsLabel, rewardPos.clone().setX(rewardPos.x + 0.6), doubleGemsActive);

    if (currentTarget === enemy) { currentTarget = null; hideQuestion(); }
  }

  function fireProjectile(enemy) {
    if (!threeReady) return;
    sfxWhoosh();
    const from = new THREE.Vector3(0, 8, 10);
    if (!GEO.projectile) GEO.projectile = new THREE.SphereGeometry(0.45, 8, 8);
    const mesh = new THREE.Mesh(GEO.projectile, matOf(0xff6b35, 0xcc3300));
    mesh.position.copy(from);
    scene.add(mesh);
    projectiles.push({ mesh, from, target: enemy, t: 0 });
  }

  function spawnExplosion(pos, opts) {
    if (explosions.length >= 12) return; // particle-burst cap
    opts = opts || {};
    const count = opts.count || 10;
    const colors = opts.colors || [0xffd166, 0xff6b35, 0xef476f];
    const life = opts.life || 0.7;
    const grav = opts.grav != null ? opts.grav : 18;
    const spread = opts.spread || 8;
    const sizeMin = opts.sizeMin != null ? opts.sizeMin : 0.16;
    const sizeMax = opts.sizeMax != null ? opts.sizeMax : 0.34;
    if (!GEO.sparkParticle) GEO.sparkParticle = new THREE.SphereGeometry(0.2, 6, 6);
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const size = sizeMin + Math.random() * (sizeMax - sizeMin);
      // Opacity is mutated per-particle every frame (see the explosions
      // update loop below), so each particle needs its OWN material —
      // these are ephemeral (<1.2s) and intentionally not matOf()-cached.
      const p = new THREE.Mesh(
        GEO.sparkParticle,
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true })
      );
      p.scale.setScalar(size / 0.2);
      p.position.copy(pos);
      p.userData.v = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        Math.random() * (spread * 0.9) + 2,
        (Math.random() - 0.5) * spread
      );
      group.add(p);
    }
    scene.add(group);
    explosions.push({ mesh: group, t: 0, life, grav });
  }

  // Ram death: the frame breaks into a handful of tumbling wood boxes
  function spawnWoodDebris(pos) {
    const mat = matOf(0x6b4a2b, 0, 'woodTex');
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.4, 0.4, 0.4), mat);
      box.position.copy(pos);
      box.position.y += 1 + Math.random();
      box.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 3, (Math.random() - 0.5) * 6);
      box.userData.av = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      scene.add(box);
      debris.push({ mesh: box, t: 0, life: 1.6 });
    }
  }

  // Returns true when the hit was fully absorbed by the freeze trap (the
  // triggering enemy survives, gets pushed back and is NOT removed by the
  // caller); false otherwise (revive-blocked or a normal HP loss).
  function castleDamaged(dmg, enemy) {
    // Freeze trap is the OUTER shield — checked before revive, since it
    // prevents the hit from ever "landing" at all.
    if (freezeTrapArmed && enemy) {
      freezeTrapArmed = false;
      triggerFreezeTrap(enemy);
      return true;
    }
    // Revive feather blocks one hit
    if (GameEngine.hasBuff('revive')) {
      GameEngine.consumeBuff('revive');
      GameEngine.showToast('🪶 復活羽毛擋下了這次攻擊！', 'achievement');
      return false;
    }
    castleHp = Math.max(0, castleHp - dmg);
    shakeTime = 0.5;
    els.damageFlash.classList.add('active');
    setTimeout(() => els.damageFlash.classList.remove('active'), 350);
    SoundManager.playWrong();
    updateHUD();
    if (castleHp <= 0) defeat();
    return false;
  }

  // ❄️ Freeze trap: instead of losing HP, the whole battlefield freezes for
  // 4s (enemies stop marching, tinted icy blue) and the triggering enemy is
  // knocked back so it isn't instantly back at the castle line once thawed.
  function triggerFreezeTrap(enemy) {
    freezeUntil = performance.now() + 4000;
    enemy.mesh.position.z -= 6;
    enemy.rushUntil = 0;
    spawnExplosion(enemy.mesh.position.clone().setY(1.2), {
      count: 14, colors: [0xdff6ff, 0x8fd6ff, 0xffffff], life: 0.7, grav: 8, spread: 7,
      sizeMin: 0.14, sizeMax: 0.28,
    });
    sfxThump();
    showEmpToast('❄️ 冰凍陷阱發動！');
  }

  function waveCleared() {
    waveInProgress = false;
    const age = currentAge();
    const prevAgeId = age.id;

    let bonus = age.waveBonus;
    GameEngine.addGems(bonus);
    castleHp = Math.min(castleHpCap, castleHp + 2);
    GameEngine.showToast(`🎉 第 ${progress.wave} 波防守成功！+${bonus} 💎，城堡修復 +2 ❤️`, 'achievement');
    SoundManager.playQuestComplete();

    progress.wave++;
    saveProgress();
    updateHUD();

    const newAge = currentAge();
    if (newAge.id > prevAgeId) {
      // Advance to the next age!
      SoundManager.playLevelUp();
      sfxFanfare();
      GameEngine.recordEmpireAge(newAge.id);
      buildCastle(newAge.id);
      fireworks(6);
      empConfetti(30);
      showEmpToast(`${newAge.icon} ${newAge.name}`);
      els.ageDisplay.textContent = `${newAge.icon} ${newAge.name}`;
      els.ageupBanner.innerHTML = `${newAge.icon}<br>晉升「${newAge.name}」！<br><small>城堡大升級，連天空都變了！敵人與題目也更強了！</small>`;
      els.ageupBanner.style.display = 'flex';
      setTimeout(() => { els.ageupBanner.style.display = 'none'; }, 3200);
    } else {
      fireworks(2);
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
    // Hearts row tracks castleHpCap so 城牆工事 (wall_repair, cap 13) renders
    // the extra hearts instead of silently clipping the bonus HP.
    for (let i = 0; i < castleHpCap; i++) hearts += i < castleHp ? '❤️' : '🖤';
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
          const type = spawnQueue.shift();
          if (type === 'ram') {
            showEmpToast('🐏 攻城槌出現！小心！');
            sfxHorn();
          }
          enemies.push(makeEnemy(type, progress.wave));
          spawnTimer = 2.6;
        }
      }

      // March enemies
      enemies.forEach(e => {
        // Hit-flash + knockback lean decay (torso for humanoids, frame for the ram)
        if (e.flashT > 0) {
          e.flashT -= dt;
          const k = Math.max(0, e.flashT / 0.15);
          if (e.flashMat) e.flashMat.emissive.setRGB(k, k, k);
        }
        if (e.leanT > 0) {
          e.leanT -= dt;
          if (e.flashMesh) e.flashMesh.rotation.x = -Math.max(0, e.leanT / 0.18) * 0.35;
        } else if (e.flashMesh && !e.dying) {
          e.flashMesh.rotation.x = 0;
        }

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

        // ❄️ Freeze trap: tint every living enemy icy blue and hold them in
        // place for the freeze window; restore the original tint on thaw.
        const frozen = now < freezeUntil;
        if (frozen) {
          if (e.flashMat && e.frozenTint === undefined) {
            e.frozenTint = e.flashMat.color.getHex();
            e.flashMat.color.setHex(0x9fd8ff);
          }
          return;
        } else if (e.frozenTint !== undefined) {
          e.flashMat.color.setHex(e.frozenTint);
          e.frozenTint = undefined;
        }

        const rush = now < e.rushUntil ? 1.55 : 1;
        e.mesh.position.z += e.baseSpeed * rush * dt;
        e.walkT += dt * e.baseSpeed * rush * 3;

        // Grow as they close in — exaggerates perspective so the threat
        // of an approaching enemy is unmistakable
        const prog = Math.min(1, Math.max(0,
          (e.mesh.position.z - PATH_START_Z) / (CASTLE_LINE_Z - PATH_START_Z)));
        e.mesh.scale.setScalar(ENEMY_TYPES[e.type].scale * (0.9 + prog * 0.45));

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
          if (currentTarget === e) { currentTarget = null; hideQuestion(); }
          const absorbedByFreeze = castleDamaged(e.damage, e);
          if (!absorbedByFreeze) {
            scene.remove(e.mesh);
            e.remove = true;
            GameEngine.showToast(`💥 ${ENEMY_TYPES[e.type].name} 攻擊了城堡！-${e.damage} ❤️`, 'error');
          }
        }
      });
      enemies = enemies.filter(e => !e.remove);

      // Projectiles (arcing catapult shots)
      projectiles.forEach(p => {
        p.t += dt / 0.45;
        if (p.t >= 1) {
          const hitPos = p.target.mesh.position.clone().setY(1.2);
          flashEnemy(p.target);
          const milestone = p.target.pendingReward && p.target.pendingReward.comboMilestone;
          spawnExplosion(hitPos, milestone ? { count: 10 + milestone * 3, spread: 8 + milestone } : undefined);
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

    // Explosions & fireworks (per-burst life/gravity)
    explosions.forEach(x => {
      x.t += dt;
      const life = x.life || 0.7;
      const grav = x.grav !== undefined ? x.grav : 18;
      x.mesh.children.forEach(p => {
        p.position.addScaledVector(p.userData.v, dt);
        p.userData.v.y -= grav * dt;
        p.material.opacity = Math.max(0, 1 - x.t / life);
      });
      if (x.t > life) {
        scene.remove(x.mesh);
        x.remove = true;
      }
    });
    explosions = explosions.filter(x => !x.remove);

    // Tumbling ram debris
    debris.forEach(d => {
      d.t += dt;
      d.mesh.position.addScaledVector(d.mesh.userData.v, dt);
      d.mesh.userData.v.y -= 14 * dt;
      d.mesh.rotation.x += d.mesh.userData.av.x * dt;
      d.mesh.rotation.y += d.mesh.userData.av.y * dt;
      d.mesh.rotation.z += d.mesh.userData.av.z * dt;
      if (d.mesh.position.y < -2 || d.t > d.life) {
        scene.remove(d.mesh);
        d.remove = true;
      }
    });
    debris = debris.filter(d => !d.remove);

    // Floating reward text
    rewardSprites.forEach(r => {
      r.t += dt;
      r.mesh.position.y += dt * (2.5 / 1.2);
      r.mesh.material.opacity = Math.max(0, 1 - r.t / r.life);
      if (r.t > r.life) {
        scene.remove(r.mesh);
        r.mesh.material.dispose();
        r.remove = true;
      }
    });
    rewardSprites = rewardSprites.filter(r => !r.remove);

    // Drifting clouds (single InstancedMesh)
    if (cloudMesh) {
      cloudData.forEach((d, i) => {
        d.x += d.speed * dt;
        if (d.x > 100) d.x = -100;
        _p.set(d.x, d.y, d.z); _s.set(d.sx, d.sy, d.sz);
        _m4.compose(_p, _q, _s);
        cloudMesh.setMatrixAt(i, _m4);
      });
      cloudMesh.instanceMatrix.needsUpdate = true;
    }

    // Per-age ambient particle drift (mist / pollen / leaves / sparkle)
    if (sceneryParticles) {
      const posAttr = sceneryParticles.geometry.attributes.position;
      const n = posAttr.count;
      switch (sceneryParticles.userData.driftType) {
        case 'mist':
          for (let i = 0; i < n; i++) posAttr.array[i * 3] += Math.sin(now / 2000 + i) * 0.01;
          break;
        case 'pollen':
          for (let i = 0; i < n; i++) {
            posAttr.array[i * 3 + 1] += dt * 0.15;
            if (posAttr.array[i * 3 + 1] > 4.2) posAttr.array[i * 3 + 1] = 0.2;
          }
          break;
        case 'leaves':
          for (let i = 0; i < n; i++) {
            posAttr.array[i * 3 + 1] -= dt * 0.4;
            posAttr.array[i * 3] += Math.sin(now / 500 + i) * 0.02;
            if (posAttr.array[i * 3 + 1] < 0) posAttr.array[i * 3 + 1] = 8 + Math.random() * 2;
          }
          break;
        case 'sparkle':
          sceneryParticles.material.opacity = 0.5 + Math.sin(now / 300) * 0.2;
          for (let i = 0; i < n; i++) {
            posAttr.array[i * 3 + 1] += dt * 0.1;
            if (posAttr.array[i * 3 + 1] > 7) posAttr.array[i * 3 + 1] = 0.3;
          }
          break;
      }
      posAttr.needsUpdate = true;
    }

    // Windmill (Feudal age)
    if (windmillBlades) windmillBlades.rotation.z += dt * 1.4;

    // Bouncing marker above the current target enemy
    if (targetArrow) {
      if (currentTarget && !currentTarget.dying && battleActive) {
        const m = currentTarget.mesh;
        targetArrow.visible = true;
        targetArrow.position.set(
          m.position.x,
          4.6 * m.scale.x + 0.9 + Math.sin(now / 180) * 0.35,
          m.position.z
        );
      } else {
        targetArrow.visible = false;
      }
    }

    // Flag wave + camera (orbit controls + shake)
    if (castleGroup && castleGroup.userData.flag) {
      castleGroup.userData.flag.rotation.y = Math.sin(now / 300) * 0.25;
    }
    if (shakeTime > 0) {
      shakeTime -= dt;
      applyCamera((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
    } else if (activePointers.size === 0) {
      applyCamera();
    }

    renderer.render(scene, camera);
  }

  function resizeRenderer() {
    if (!threeReady) return;
    const { w, h } = canvasSize();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ===== Automated test hook =====
  window.__empTest = {
    state: () => ({
      wave: progress.wave,
      castleHp,
      castleHpCap,
      kills: progress.kills,
      enemies: enemies.length,
      combo: comboCount,
      ageId: currentAge().id,
      queue: spawnQueue.length,
      sceneryAge: sceneryAgeBuilt,
      fireBombArmed,
      freezeTrapArmed,
      frozen: performance.now() < freezeUntil,
    }),
    correctIndex: () => (currentQuestion ? currentQuestion.correctIndex : -1),
    answerCorrect: () => {
      if (!currentQuestion || !currentTarget) return false;
      const correctText = currentQuestion.options[currentQuestion.correctIndex];
      const btn = [...els.qOptions.querySelectorAll('.emp-q-option')].find(b => b.textContent === correctText);
      if (btn) { btn.click(); return true; }
      return false;
    },
    skipToWave: n => {
      progress.wave = Math.max(1, n);
      saveProgress();
      if (battleActive) {
        clearField();
        buildCastle(currentAge().id); // rebuilds scenery too if the age changed
        startWave();
        updateHUD();
      }
    },
    drawCalls: () => (renderer ? renderer.info.render.calls : 0),
    // Test-only: pushes a buff straight into GameEngine's activeBuffs (as if
    // bought + used) so tests don't have to drive the shop DOM every time.
    giveBuff: (type, uses) => {
      const st = GameEngine.getState();
      st.activeBuffs.push({ type, uses: uses || 1 });
      GameEngine.renderItemBar();
    },
    // Test-only: teleports the frontmost living enemy right up to the
    // castle line so the next animate() tick triggers castleDamaged()
    // (freeze trap / revive / normal HP loss) without waiting for the
    // march.
    forceBreach: () => {
      const alive = enemies.filter(e => !e.dying);
      if (alive.length === 0) return false;
      alive.sort((a, b) => b.mesh.position.z - a.mesh.position.z);
      alive[0].mesh.position.z = CASTLE_LINE_Z;
      return true;
    },
    // Test-only: current z-position of every living enemy, keyed by array
    // index (stable within a frame) — used to confirm freeze trap actually
    // halts movement (samples should be identical across ~1s while frozen).
    enemyPositions: () => enemies.filter(e => !e.dying).map(e => e.mesh.position.z),
  };

  return { init, onShow };
})();
