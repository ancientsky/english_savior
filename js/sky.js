/* ===== Sky Citadel (天空之城) — open-world 3D sky-island adventure =====
   Third-person Roblox/Minecraft-style controller over hand-placed floating
   islands (js/data/sky.js). Part 1: world + player + camera. Quests, mobs
   and title perks arrive in later parts. */

const SkyGame = (() => {
  const SAVE_KEY = 'english_savior_sky';

  // ----- persistent progress (quests fill this in Part 2+) -----
  let save = {
    completed: {},          // questId -> clear count
    bridgeBuilt: false,     // sq_bridge_crystal permanent bridge
    lastIsland: 'isle_dawn',
    bestRace: {},
    settings: {},
  };

  // ----- three.js -----
  let renderer, scene, camera, clock;
  let rafId = null;
  let threeReady = false;
  let playing = false;
  let hemiLight, sunLight, skyDome;
  let cloudMesh = null;
  const cloudData = [];

  // ----- world -----
  const islandGroups = {};       // id -> THREE.Group
  const islandBob = {};          // id -> current bob offset
  const colliders = [];          // { kind:'isle'|'seg'|'pad', x, z, r, top, isle?, launch? }
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // ----- player -----
  let player = null;             // THREE.Group, origin at feet
  let playerParts = null;        // { head, armL, armR, legL, legR, badge }
  const pos = { x: 0, y: 30, z: 0 };
  let vy = 0;
  let grounded = false;
  let lastGroundedAt = -10;
  let jumpBufferedAt = -10;
  let lastGroundIsland = 'isle_dawn';
  let currentIsland = null;
  let hearts = 5;
  let heroYaw = 0;
  let walkTime = 0;
  let simTime = 0;

  // ----- camera orbit (third person) -----
  const cam = { theta: 0, phi: 0.42, radius: 9 };
  let pinchDist = 0;

  // ----- input -----
  const keys = { f: 0, b: 0, l: 0, r: 0, sprint: false };
  let jumpHeld = false;
  const joy = { active: false, pointerId: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const lookPointers = new Map();

  // ----- DOM -----
  let els = {};
  let toastTimer = null;

  // reused temp vectors (zero allocation inside animate)
  let _v1, _v2;

  // ===================== helpers =====================
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isleById(id) { return SKY_ISLANDS.find(i => i.id === id); }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) save = { ...save, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
  }
  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // ===================== init / zone =====================
  function init() {
    els = {
      zone: document.getElementById('zone-sky'),
      start: document.getElementById('sky-start'),
      startBtn: document.getElementById('sky-start-btn'),
      startStats: document.getElementById('sky-start-stats'),
      guide: document.getElementById('sky-controls-guide'),
      wrap: document.getElementById('sky-canvas-wrap'),
      hearts: document.getElementById('sky-hearts'),
      location: document.getElementById('sky-location'),
      titleBadge: document.getElementById('sky-title-badge'),
      hint: document.getElementById('sky-hint'),
      toast: document.getElementById('sky-toast'),
      flash: document.getElementById('sky-flash'),
      joyBase: document.getElementById('sky-joy'),
      joyKnob: document.getElementById('sky-joy-knob'),
      btnJump: document.getElementById('sky-btn-jump'),
      btnAct: document.getElementById('sky-btn-act'),
      belowHint: document.getElementById('sky-below-hint'),
      camReset: document.getElementById('sky-cam-reset'),
    };
    if (!els.zone) return;

    loadSave();
    renderStartScreen();

    els.startBtn.addEventListener('click', startAdventure);
    els.camReset?.addEventListener('click', () => { cam.theta = heroYaw + Math.PI; cam.phi = 0.42; cam.radius = SKY_CONFIG.camRadius; });
    window.addEventListener('resize', resizeRenderer);
    setupKeyboard();

    // test hooks
    window.__skyTest = {
      start: startAdventure,
      player: () => ({ x: pos.x, y: pos.y, z: pos.z, grounded, island: currentIsland, hearts }),
      teleport: (x, y, z) => { pos.x = x; pos.y = y; pos.z = z; vy = 0; },
      stats: () => ({ islands: SKY_ISLANDS.length, ready: threeReady, playing, colliders: colliders.length }),
      keys: k => Object.assign(keys, k),
      jump: () => { jumpBufferedAt = simTime; },
      camYaw: () => cam.theta,
      renderInfo: () => (renderer ? renderer.info.render : null),
    };
  }

  // Called by app.js when the zone tab becomes visible
  function onShow() {
    if (threeReady) {
      resizeRenderer();
      if (!rafId) animate();
    }
  }

  function renderStartScreen() {
    const clearedCount = Object.keys(save.completed).length;
    els.startStats.innerHTML = `
      <div class="aw-stat"><span>🏝️</span><b>${SKY_ISLANDS.length}</b><small>座浮空島嶼</small></div>
      <div class="aw-stat"><span>📜</span><b>${clearedCount} / 22</b><small>完成任務</small></div>
      <div class="aw-stat"><span>🌉</span><b>${SKY_BRIDGES.length}</b><small>空中橋樑</small></div>
    `;
    els.guide.innerHTML = isTouch
      ? `📱 <b>手機操作</b><br>
         🕹️ 左半邊拖曳＝虛擬搖桿移動（推到底衝刺）<br>
         👆 右半邊拖曳＝轉動視角 ・ 雙指縮放<br>
         🦘 跳躍鈕 ・ ⚡ 互動鈕`
      : `⌨️ <b>電腦操作</b><br>
         <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> 移動 ・
         <span class="kbd">Space</span> 跳躍 ・ <span class="kbd">Shift</span> 衝刺<br>
         🖱️ 拖曳畫面轉視角 ・ 滾輪縮放 ・ <span class="kbd">E</span> 互動`;
    els.startBtn.textContent = clearedCount > 0 ? '⚔️ 繼續冒險' : '⚔️ 開始冒險';
  }

  function startAdventure() {
    els.start.style.display = 'none';
    els.wrap.style.display = '';
    els.belowHint.style.display = isTouch ? 'none' : '';
    if (isTouch) els.wrap.classList.add('touch-mode');

    if (!threeReady) {
      try {
        initThree();
      } catch (err) {
        console.error('Sky 3D init failed:', err);
        els.wrap.innerHTML = '<p style="padding:30px;text-align:center;color:#fff">😢 你的裝置不支援 3D 顯示（WebGL）。</p>';
        return;
      }
    }
    // spawn at last visited island
    const isle = isleById(save.lastIsland) || SKY_ISLANDS[0];
    respawnAt(isle, false);
    hearts = SKY_CONFIG.maxHearts;
    playing = true;
    updateHudHearts();
    refreshEquipment();
    if (!rafId) animate();
  }

  // ===================== three.js scene =====================
  function canvasSize() {
    const w = els.wrap.clientWidth || 800;
    const h = Math.max(360, Math.min(Math.round(w * 0.75), Math.round(window.innerHeight * 0.72)));
    return { w, h };
  }

  function resizeRenderer() {
    if (!threeReady) return;
    const { w, h } = canvasSize();
    renderer.setSize(w, h);
    els.wrap.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function initThree() {
    const { w, h } = canvasSize();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'aw-canvas';
    els.wrap.insertBefore(renderer.domElement, els.wrap.firstChild);
    els.wrap.style.height = h + 'px';

    _v1 = new THREE.Vector3();
    _v2 = new THREE.Vector3();

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(SKY_CONFIG.fogColor, SKY_CONFIG.fogNear, SKY_CONFIG.fogFar);

    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1800);

    buildSkyDome();
    buildLights();
    buildClouds();
    SKY_ISLANDS.forEach(buildIsland);
    SKY_BRIDGES.forEach(b => {
      if (b.quest && !save.bridgeBuilt) return; // quest bridge appears in Part 2+
      buildBridge(b);
    });
    SKY_PADS.forEach(buildPad);
    buildPlayer();
    setupPointerControls();

    clock = new THREE.Clock();
    threeReady = true;
  }

  function buildSkyDome() {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 512;
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2a7fd4');
    grad.addColorStop(0.42, '#69b8ef');
    grad.addColorStop(0.62, '#aee3ff');
    grad.addColorStop(0.78, '#e8f7ff');
    grad.addColorStop(1, '#fdf0d5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 512);
    const tex = new THREE.CanvasTexture(cv);
    skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(820, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    scene.add(skyDome);

    // sun glow sprite
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const sctx = sc.getContext('2d');
    const g = sctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,250,220,1)');
    g.addColorStop(0.25, 'rgba(255,236,160,0.9)');
    g.addColorStop(1, 'rgba(255,236,160,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 128, 128);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(sc), transparent: true, fog: false,
    }));
    sun.scale.set(220, 220, 1);
    sun.position.set(420, 460, -520);
    scene.add(sun);
  }

  function buildLights() {
    hemiLight = new THREE.HemisphereLight(0xdfefff, 0x8a9db5, 0.75);
    scene.add(hemiLight);
    sunLight = new THREE.DirectionalLight(0xfff3d6, 1.05);
    sunLight.position.set(40, 60, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -45; sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45; sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.camera.near = 5; sunLight.shadow.camera.far = 220;
    scene.add(sunLight);
    scene.add(sunLight.target);
  }

  function buildClouds() {
    const rng = mulberry32(SKY_CONFIG.worldSeed);
    const COUNT = 70;
    const geo = new THREE.SphereGeometry(1, 7, 5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    cloudMesh = new THREE.InstancedMesh(geo, mat, COUNT);
    cloudMesh.castShadow = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      const d = {
        x: -420 + rng() * 840,
        y: -20 + rng() * 140,
        z: -420 + rng() * 840,
        sx: 7 + rng() * 14,
        sy: 2 + rng() * 3.2,
        sz: 5 + rng() * 9,
        speed: 1.2 + rng() * 2.4,
      };
      cloudData.push(d);
      p.set(d.x, d.y, d.z); s.set(d.sx, d.sy, d.sz);
      m.compose(p, q, s);
      cloudMesh.setMatrixAt(i, m);
    }
    scene.add(cloudMesh);
  }

  // ---------- shared geometry / material caches ----------
  const GEO = {};
  const MAT = {};
  function geoBox() { return GEO.box || (GEO.box = new THREE.BoxGeometry(1, 1, 1)); }
  function matOf(color, emissive) {
    const key = color + '_' + (emissive || 0);
    if (!MAT[key]) {
      MAT[key] = new THREE.MeshLambertMaterial({ color });
      if (emissive) { MAT[key].emissive = new THREE.Color(emissive); }
    }
    return MAT[key];
  }

  const ISLAND_STYLE = {
    grass: { top: 0x62c95e, side: 0x7a5230 },
    forest: { top: 0x3f8f4a, side: 0x6a4a2e },
    water: { top: 0x6fcf6f, side: 0x77572f },
    flower: { top: 0x7fd070, side: 0x7a5230 },
    mushroom: { top: 0x9c7bb8, side: 0x5e4a3a },
    ruin: { top: 0xb8b09a, side: 0x8a8272 },
    crystal: { top: 0x8fd8e8, side: 0x5a7a99 },
    cloud: { top: 0xf2f8ff, side: 0xd8e6f5 },
    village: { top: 0x8fce62, side: 0x7a5230 },
    ice: { top: 0xd8f0fa, side: 0x9ec3d8 },
    lava: { top: 0x4a3a38, side: 0x35292a },
    pillars: { top: 0xc9c3ae, side: 0x99917c },
    bone: { top: 0xb8ad8f, side: 0x847a5e },
    storm: { top: 0x5a5a72, side: 0x3c3c50 },
  };

  function buildIsland(isle) {
    const rng = mulberry32(SKY_CONFIG.worldSeed + isle.seed * 977);
    const style = ISLAND_STYLE[isle.type] || ISLAND_STYLE.grass;
    const g = new THREE.Group();
    g.position.set(isle.pos[0], isle.pos[1], isle.pos[2]);

    // top disc (walkable surface at local y = 0)
    const discH = 2.2;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(isle.r, isle.r * 0.92, discH, 22),
      matOf(style.top)
    );
    disc.position.y = -discH / 2;
    disc.receiveShadow = true;
    disc.matrixAutoUpdate = false;
    disc.updateMatrix();
    g.add(disc);

    // inverted rock cone below
    const rockH = isle.r * (0.9 + rng() * 0.5);
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(isle.r * 0.9, rockH, 12),
      matOf(style.side)
    );
    rock.rotation.x = Math.PI;
    rock.position.y = -discH - rockH / 2 + 0.1;
    rock.matrixAutoUpdate = false;
    rock.updateMatrix();
    g.add(rock);

    // hanging rubble chunks
    const nRubble = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < nRubble; i++) {
      const a = rng() * Math.PI * 2;
      const rr = isle.r * (0.55 + rng() * 0.5);
      const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + rng() * 1.6), matOf(style.side));
      chunk.position.set(Math.cos(a) * rr, -discH - rockH * (0.55 + rng() * 0.6), Math.sin(a) * rr);
      chunk.matrixAutoUpdate = false;
      chunk.updateMatrix();
      g.add(chunk);
    }

    decorateIsland(g, isle, rng);

    scene.add(g);
    islandGroups[isle.id] = g;
    islandBob[isle.id] = 0;

    colliders.push({ kind: 'isle', x: isle.pos[0], z: isle.pos[2], r: isle.r - 0.4, top: isle.pos[1], isle: isle.id });
  }

  // scatter a mesh factory n times inside radius (keeps centre walkable-ish)
  function scatter(g, isle, rng, n, minR, maxR, make) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const rr = isle.r * (minR + rng() * (maxR - minR));
      const obj = make(rng);
      obj.position.x += Math.cos(a) * rr;
      obj.position.z += Math.sin(a) * rr;
      obj.traverse(o => { o.matrixAutoUpdate = false; o.updateMatrix(); });
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
      g.add(obj);
    }
  }

  function makeTree(rng, leafColor = 0x3e8a3e) {
    const t = new THREE.Group();
    const h = 1.8 + rng() * 1.4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, h, 6), matOf(0x7a5230));
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    t.add(trunk);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.7 - i * 0.4, 1.9, 7), matOf(leafColor));
      leaf.position.y = h + 0.6 + i * 1.0;
      leaf.castShadow = true;
      t.add(leaf);
    }
    return t;
  }

  function makeCrystal(rng, color = 0x7fe8ff) {
    const c = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7 + rng() * 1.3),
      matOf(color, color)
    );
    c.position.y = 0.9;
    c.scale.y = 1.7;
    c.rotation.y = rng() * Math.PI;
    c.castShadow = true;
    return c;
  }

  function makeHouse(rng) {
    const hgroup = new THREE.Group();
    const bw = 2.6 + rng() * 1.2;
    const body = new THREE.Mesh(geoBox(), matOf(0xe8d9b8));
    body.scale.set(bw, 2.2, bw);
    body.position.y = 1.1;
    body.castShadow = true;
    hgroup.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.85, 1.6, 4), matOf(0xb0523a));
    roof.position.y = 2.2 + 0.8;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    hgroup.add(roof);
    return hgroup;
  }

  function decorateIsland(g, isle, rng) {
    switch (isle.type) {
      case 'grass':
        scatter(g, isle, rng, 4, 0.4, 0.85, r => makeTree(r));
        scatter(g, isle, rng, 8, 0.2, 0.9, r => {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5),
            matOf([0xff6b81, 0xffd166, 0xc77dff, 0xffffff][Math.floor(r() * 4)]));
          f.position.y = 0.25;
          return f;
        });
        break;
      case 'forest':
        scatter(g, isle, rng, 11, 0.25, 0.9, r => makeTree(r, 0x2e6e38));
        break;
      case 'water': {
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(isle.r * 0.4, isle.r * 0.4, 0.16, 18),
          matOf(0x4aa8e8, 0x1a4a7a));
        pond.position.set(isle.r * 0.2, 0.06, -isle.r * 0.1);
        g.add(pond);
        // waterfall pouring off the edge
        const fall = new THREE.Mesh(geoBox(), matOf(0x6fc2f2, 0x2a6a9a));
        fall.scale.set(3.2, 16, 0.8);
        fall.position.set(isle.r * 0.2, -7.4, -isle.r * 0.62);
        g.add(fall);
        scatter(g, isle, rng, 4, 0.55, 0.9, () => {
          const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), matOf(0xa8a49a));
          s.position.y = 0.4;
          return s;
        });
        break;
      }
      case 'flower':
        scatter(g, isle, rng, 22, 0.1, 0.92, r => {
          const f = new THREE.Group();
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4), matOf(0x3e8a3e));
          stem.position.y = 0.3;
          f.add(stem);
          const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5),
            matOf([0xff6b81, 0xffd166, 0xc77dff, 0xff9f1c, 0xffffff][Math.floor(r() * 5)]));
          bloom.position.y = 0.7;
          f.add(bloom);
          return f;
        });
        scatter(g, isle, rng, 2, 0.5, 0.8, r => makeTree(r, 0xd97fb8));
        break;
      case 'mushroom':
        scatter(g, isle, rng, 7, 0.15, 0.85, r => {
          const m = new THREE.Group();
          const h = 0.8 + r() * 2.2;
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, h, 8), matOf(0xe8dcc8));
          stem.position.y = h / 2;
          stem.castShadow = true;
          m.add(stem);
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            matOf(r() < 0.5 ? 0xd84848 : 0xb86bd8));
          cap.position.y = h;
          cap.castShadow = true;
          m.add(cap);
          return m;
        });
        break;
      case 'ruin':
        scatter(g, isle, rng, 6, 0.3, 0.85, r => {
          const h = 1.2 + r() * 3.4;
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, h, 9), matOf(0xcfc7ac));
          col.position.y = h / 2;
          col.rotation.z = (r() - 0.5) * 0.14;
          col.castShadow = true;
          return col;
        });
        scatter(g, isle, rng, 4, 0.2, 0.7, r => {
          const b = new THREE.Mesh(geoBox(), matOf(0xb8b09a));
          b.scale.set(1 + r(), 0.7, 1 + r());
          b.position.y = 0.35;
          b.rotation.y = r() * Math.PI;
          return b;
        });
        break;
      case 'crystal':
        scatter(g, isle, rng, 9, 0.15, 0.88, r => makeCrystal(r, r() < 0.4 ? 0xb08fff : 0x7fe8ff));
        break;
      case 'cloud':
        scatter(g, isle, rng, 6, 0.2, 0.85, r => {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.9, 8, 6), matOf(0xffffff));
          puff.position.y = 0.5;
          puff.scale.y = 0.6;
          return puff;
        });
        scatter(g, isle, rng, 6, 0.4, 0.9, () => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 5), matOf(0xc9b48a));
          post.position.y = 0.5;
          return post;
        });
        break;
      case 'village':
        scatter(g, isle, rng, 4, 0.3, 0.75, r => makeHouse(r));
        scatter(g, isle, rng, 3, 0.35, 0.8, r => {
          const stall = new THREE.Group();
          const table = new THREE.Mesh(geoBox(), matOf(0xa8763e));
          table.scale.set(1.8, 0.9, 1.1);
          table.position.y = 0.45;
          stall.add(table);
          const awning = new THREE.Mesh(geoBox(), matOf(r() < 0.5 ? 0xe85454 : 0x54a8e8));
          awning.scale.set(2, 0.16, 1.4);
          awning.position.y = 1.7;
          stall.add(awning);
          return stall;
        });
        scatter(g, isle, rng, 2, 0.6, 0.9, r => makeTree(r));
        break;
      case 'ice':
        scatter(g, isle, rng, 8, 0.15, 0.88, r => {
          const h = 1.4 + r() * 3;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5 + r() * 0.4, h, 6), matOf(0xbfeaff, 0x2a5a7a));
          spike.position.y = h / 2;
          spike.castShadow = true;
          return spike;
        });
        break;
      case 'lava': {
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(isle.r * 0.35, isle.r * 0.35, 0.18, 16),
          matOf(0xff7a20, 0xff4400));
        pool.position.set(-isle.r * 0.15, 0.08, isle.r * 0.15);
        g.add(pool);
        scatter(g, isle, rng, 6, 0.4, 0.88, r => {
          const h = 1 + r() * 2.6;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.45, h, 5), matOf(0x2a2026));
          spike.position.y = h / 2;
          spike.castShadow = true;
          return spike;
        });
        break;
      }
      case 'pillars':
        scatter(g, isle, rng, 8, 0.15, 0.85, r => {
          const h = 2 + r() * 6;
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, h, 8), matOf(0xd8d2bc));
          p.position.y = h / 2;
          p.castShadow = true;
          return p;
        });
        break;
      case 'bone':
        scatter(g, isle, rng, 5, 0.25, 0.8, r => {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(1.6 + r() * 1.4, 0.22, 6, 10, Math.PI), matOf(0xe8e0c8));
          rib.position.y = 0.1;
          rib.rotation.y = r() * Math.PI;
          rib.castShadow = true;
          return rib;
        });
        scatter(g, isle, rng, 4, 0.3, 0.85, r => {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6 + r(), 5), matOf(0xe8e0c8));
          b.rotation.z = Math.PI / 2 + (r() - 0.5);
          b.position.y = 0.2;
          return b;
        });
        break;
      case 'storm': {
        const obelisk = new THREE.Mesh(geoBox(), matOf(0x2c2c40, 0x4a4aff));
        obelisk.scale.set(1.6, 7, 1.6);
        obelisk.position.y = 3.5;
        obelisk.castShadow = true;
        g.add(obelisk);
        scatter(g, isle, rng, 6, 0.35, 0.85, r => {
          const h = 1.5 + r() * 3;
          const shard = new THREE.Mesh(new THREE.ConeGeometry(0.5, h, 4), matOf(0x3c3c55, 0x2a2aaa));
          shard.position.y = h / 2;
          shard.rotation.y = r();
          return shard;
        });
        break;
      }
    }

    // grass blades on green islands (InstancedMesh child → bobs with island)
    if (['grass', 'forest', 'flower', 'village'].includes(isle.type)) {
      const rng2 = mulberry32(isle.seed * 31 + 7);
      const N = 55;
      const gm = new THREE.InstancedMesh(
        GEO.grass || (GEO.grass = new THREE.ConeGeometry(0.1, 0.75, 4)),
        MAT.grassBlade || (MAT.grassBlade = new THREE.MeshLambertMaterial({ color: 0x4faf45 })),
        N
      );
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const s = new THREE.Vector3(1, 1, 1);
      const p = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const a = rng2() * Math.PI * 2;
        const rr = isle.r * Math.sqrt(rng2()) * 0.92;
        e.set(0, rng2() * Math.PI, (rng2() - 0.5) * 0.25);
        q.setFromEuler(e);
        p.set(Math.cos(a) * rr, 0.36, Math.sin(a) * rr);
        s.setScalar(0.7 + rng2() * 0.9);
        m.compose(p, q, s);
        gm.setMatrixAt(i, m);
      }
      g.add(gm);
    }
  }

  function buildBridge(b) {
    const A = isleById(b.from);
    const B = isleById(b.to);
    if (!A || !B) return;
    const ax = A.pos[0], az = A.pos[2], bx = B.pos[0], bz = B.pos[2];
    const dx = bx - ax, dz = bz - az;
    const dist = Math.hypot(dx, dz);
    const ux = dx / dist, uz = dz / dist;
    // endpoints just inside each island rim
    const sx = ax + ux * (A.r - 2), sz = az + uz * (A.r - 2), sy = A.pos[1];
    const ex = bx - ux * (B.r - 2), ez = bz - uz * (B.r - 2), ey = B.pos[1];
    const span = Math.hypot(ex - sx, ez - sz);
    const yaw = Math.atan2(ex - sx, ez - sz);

    if (b.style === 'stepstones') {
      const n = Math.max(3, Math.round(span / 3.4));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const px = sx + (ex - sx) * t;
        const pz = sz + (ez - sz) * t;
        const py = sy + (ey - sy) * t + Math.sin(i * 1.7) * 0.5;
        const stone = new THREE.Mesh(
          GEO.step || (GEO.step = new THREE.CylinderGeometry(1.7, 1.4, 0.8, 9)),
          matOf(0x9aa5a8)
        );
        stone.position.set(px, py - 0.4, pz);
        stone.receiveShadow = true;
        stone.matrixAutoUpdate = false;
        stone.updateMatrix();
        scene.add(stone);
        colliders.push({ kind: 'seg', x: px, z: pz, r: 1.7, top: py });
      }
      return;
    }

    const plank = b.style === 'plank';
    const segLen = 3;
    const n = Math.max(2, Math.round(span / segLen));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const px = sx + (ex - sx) * tm;
      const pz = sz + (ez - sz) * tm;
      const py = sy + (ey - sy) * tm;
      const seg = new THREE.Mesh(geoBox(),
        plank ? matOf(i % 2 ? 0xa8763e : 0x99672f) : matOf(i % 2 ? 0xa8a49a : 0x94908a));
      seg.scale.set(plank ? 2.6 : 3.2, 0.4, span / n + 0.25);
      seg.position.set(px, py - 0.2, pz);
      seg.rotation.y = yaw;
      seg.receiveShadow = true;
      seg.castShadow = true;
      seg.matrixAutoUpdate = false;
      seg.updateMatrix();
      scene.add(seg);
      colliders.push({ kind: 'seg', x: px, z: pz, r: 1.9, top: py });

      // plank bridge rope posts
      if (plank && i % 2 === 0) {
        [-1.2, 1.2].forEach(off => {
          const post = new THREE.Mesh(
            GEO.post || (GEO.post = new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5)),
            matOf(0x6a4a2e)
          );
          post.position.set(px + Math.cos(yaw) * off, py + 0.55, pz - Math.sin(yaw) * off);
          post.matrixAutoUpdate = false;
          post.updateMatrix();
          scene.add(post);
        });
      }
    }
  }

  function buildPad(p) {
    const isle = isleById(p.island);
    if (!isle) return;
    const g = islandGroups[isle.id];
    const pad = new THREE.Group();
    const disc = new THREE.Mesh(
      GEO.pad || (GEO.pad = new THREE.CylinderGeometry(2, 2.3, 0.5, 14)),
      matOf(0xffffff)
    );
    disc.position.y = 0.25;
    pad.add(disc);
    const glow = new THREE.Mesh(
      GEO.padGlow || (GEO.padGlow = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 12)),
      matOf(0x8fe8ff, 0x2a9adf)
    );
    glow.position.y = 0.55;
    pad.add(glow);
    const arrow = new THREE.Mesh(
      GEO.padArrow || (GEO.padArrow = new THREE.ConeGeometry(0.55, 1, 6)),
      matOf(0xffe066, 0xaa8800)
    );
    arrow.position.y = 1.3;
    pad.add(arrow);
    pad.position.set(p.dx, 0, p.dz);
    pad.traverse(o => { o.matrixAutoUpdate = false; o.updateMatrix(); });
    pad.matrixAutoUpdate = false;
    pad.updateMatrix();
    g.add(pad);
    colliders.push({
      kind: 'pad',
      x: isle.pos[0] + p.dx, z: isle.pos[2] + p.dz, r: 2.1,
      top: isle.pos[1] + 0.5, isle: isle.id, launch: p.launch,
    });
  }

  // ===================== player =====================
  function emojiTexture(emoji, bg) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 128);
    ctx.font = '92px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 72);
    return new THREE.CanvasTexture(cv);
  }

  function badgeTexture(text) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(10,40,70,0.78)';
    const w = Math.min(500, 90 + text.length * 34);
    const x = (512 - w) / 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, 20, w, 88, 22) : ctx.rect(x, 20, w, 88);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 66);
    return new THREE.CanvasTexture(cv);
  }

  function buildPlayer() {
    player = new THREE.Group();
    playerParts = {};

    const tint = 0x3aa6a0;
    const bodyMat = new THREE.MeshLambertMaterial({ color: tint });
    const limbMat = new THREE.MeshLambertMaterial({ color: tint });
    const skinTone = new THREE.MeshLambertMaterial({ color: 0xf2c99a });
    playerParts.bodyMat = bodyMat;
    playerParts.limbMat = limbMat;

    // legs (pivot at hip: geometry translated down)
    const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.26);
    legGeo.translate(0, -0.35, 0);
    const legL = new THREE.Mesh(legGeo, limbMat);
    legL.position.set(-0.16, 0.7, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, limbMat);
    legR.position.set(0.16, 0.7, 0);
    legR.castShadow = true;
    player.add(legL, legR);

    // torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), bodyMat);
    body.position.y = 1.06;
    body.castShadow = true;
    player.add(body);

    // arms (pivot at shoulder)
    const armGeo = new THREE.BoxGeometry(0.2, 0.66, 0.22);
    armGeo.translate(0, -0.28, 0);
    const armL = new THREE.Mesh(armGeo, limbMat);
    armL.position.set(-0.44, 1.38, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(armGeo, limbMat);
    armR.position.set(0.44, 1.38, 0);
    armR.castShadow = true;
    player.add(armL, armR);

    // head — emoji face on the front (+z)
    const headMats = [skinTone, skinTone, skinTone, skinTone, skinTone, skinTone];
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.56), headMats);
    head.position.y = 1.72;
    head.castShadow = true;
    player.add(head);
    playerParts.head = head;
    playerParts.armL = armL;
    playerParts.armR = armR;
    playerParts.legL = legL;
    playerParts.legR = legR;
    playerParts.body = body;

    // floating title badge
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    badge.scale.set(2.6, 0.65, 1);
    badge.position.y = 2.45;
    player.add(badge);
    playerParts.badge = badge;

    scene.add(player);
  }

  // re-read equipped skin/title (called on start; Part 4 adds perks here)
  function refreshEquipment() {
    if (!playerParts) return;
    const skin = GameEngine.getEquippedSkin();
    const title = GameEngine.getEquippedTitle();
    const tint = SKY_SKIN_TINTS[skin.id] || SKY_SKIN_TINTS.default;
    playerParts.bodyMat.color.setHex(tint);
    playerParts.limbMat.color.setHex(tint);
    // emoji face
    const faceTex = emojiTexture(skin.icon, '#f2c99a');
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
    playerParts.head.material[4] = faceMat; // +z face
    playerParts.head.material.needsUpdate = true;
    // badge
    playerParts.badge.material.map = badgeTexture(title.display || title.name);
    playerParts.badge.material.needsUpdate = true;
    if (els.titleBadge) els.titleBadge.textContent = `⭐ ${title.display || title.name}`;
  }

  // ===================== physics & collision =====================
  function bobOf(isleId) { return islandBob[isleId] || 0; }

  // highest support top at (x,z) that is not above maxTop
  function supportAt(x, z, maxTop) {
    let best = -Infinity;
    let bestCol = null;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz > c.r * c.r) continue;
      const top = c.top + (c.isle ? bobOf(c.isle) : 0);
      if (top <= maxTop && top > best) { best = top; bestCol = c; }
    }
    return { y: best, col: bestCol };
  }

  function respawnAt(isle, hurt) {
    pos.x = isle.pos[0];
    pos.z = isle.pos[2];
    pos.y = isle.pos[1] + bobOf(isle.id) + 2;
    vy = 0;
    if (hurt) {
      hearts--;
      if (hearts <= 0) {
        hearts = SKY_CONFIG.maxHearts;
        showWorldToast('💫 你在晨曦之島醒來了…');
        const dawn = SKY_ISLANDS[0];
        pos.x = dawn.pos[0]; pos.z = dawn.pos[2]; pos.y = dawn.pos[1] + 2;
      }
      updateHudHearts();
    }
  }

  function voidFall() {
    els.flash.classList.add('on');
    setTimeout(() => els.flash.classList.remove('on'), 420);
    SoundManager.playWrong();
    const isle = isleById(lastGroundIsland) || SKY_ISLANDS[0];
    respawnAt(isle, true);
  }

  function updateHudHearts() {
    if (!els.hearts) return;
    els.hearts.textContent = '❤️'.repeat(hearts) + '🖤'.repeat(Math.max(0, SKY_CONFIG.maxHearts - hearts));
  }

  function showWorldToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('on'), 2200);
  }

  function updatePlayer(dt) {
    simTime += dt;

    // input vector relative to camera yaw
    let ix = 0, iz = 0;
    if (joy.active) {
      ix = joy.dx;
      iz = joy.dy;
    } else {
      iz = keys.f - keys.b;
      ix = keys.r - keys.l;
    }
    const mag = Math.hypot(ix, iz);
    if (mag > 1) { ix /= mag; iz /= mag; }
    const sprint = keys.sprint || (joy.active && mag > 0.85);

    const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
    // camera sits at player + (sinθ, ·, cosθ)·r → forward on the ground is (-sinθ, -cosθ)
    const fx = -st, fz = -ct;
    const rx = -ct, rz = st;
    let mx = fx * iz + rx * ix;
    let mz = fz * iz + rz * ix;
    const mlen = Math.hypot(mx, mz);
    if (mlen > 0.001) {
      mx /= mlen; mz /= mlen;
      const speed = SKY_CONFIG.walkSpeed * (sprint ? SKY_CONFIG.sprintMult : 1) * Math.min(1, mag || 1);
      pos.x += mx * speed * dt;
      pos.z += mz * speed * dt;
      const targetYaw = Math.atan2(mx, mz);
      // shortest-path yaw lerp
      let d = targetYaw - heroYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      heroYaw += d * Math.min(1, dt * 12);
      walkTime += dt * (sprint ? 13 : 9);
    } else {
      walkTime *= 0.9;
    }

    // vertical
    const prevFeet = pos.y;
    vy += SKY_CONFIG.gravity * dt;
    pos.y += vy * dt;

    const sup = supportAt(pos.x, pos.z, prevFeet + 0.55);
    if (vy <= 0 && sup.col && pos.y <= sup.y) {
      pos.y = sup.y;
      vy = 0;
      grounded = true;
      lastGroundedAt = simTime;
      if (sup.col.isle) {
        lastGroundIsland = sup.col.isle;
        if (currentIsland !== sup.col.isle) {
          currentIsland = sup.col.isle;
          const isle = isleById(currentIsland);
          if (isle) {
            els.location.textContent = `🏝️ ${isle.name}`;
            if (save.lastIsland !== currentIsland) {
              save.lastIsland = currentIsland;
              persist();
              showWorldToast(`🏝️ 抵達「${isle.name}」！`);
              SoundManager.playCorrect();
            }
          }
        }
      }
      // bouncy jump pad
      if (sup.col.kind === 'pad') {
        vy = sup.col.launch;
        grounded = false;
        SoundManager.playCorrect();
      }
    } else {
      grounded = false;
    }

    // jump (with coyote time + buffered press; windows sized so a single
    // slow frame on a weak device can't swallow the input)
    if (jumpBufferedAt >= 0 && simTime - jumpBufferedAt < 0.25 &&
        simTime - lastGroundedAt < 0.15) {
      vy = SKY_CONFIG.jumpV;
      grounded = false;
      jumpBufferedAt = -10;
      lastGroundedAt = -10;
    }

    // fell into the void
    if (pos.y < SKY_CONFIG.voidY) voidFall();

    // apply to mesh
    player.position.set(pos.x, pos.y, pos.z);
    player.rotation.y = heroYaw;
    const swing = Math.sin(walkTime) * 0.55;
    playerParts.armL.rotation.x = swing;
    playerParts.armR.rotation.x = -swing;
    playerParts.legL.rotation.x = -swing;
    playerParts.legR.rotation.x = swing;
    if (!grounded) {
      playerParts.armL.rotation.x = -2.6;
      playerParts.armR.rotation.x = -2.6;
    }
    // idle breathing
    playerParts.body.scale.y = 1 + Math.sin(simTime * 2.2) * 0.015;
  }

  function updateCamera(dt) {
    const targetX = pos.x + Math.sin(cam.theta) * Math.cos(cam.phi) * cam.radius;
    const targetY = pos.y + 1.6 + Math.sin(cam.phi) * cam.radius;
    const targetZ = pos.z + Math.cos(cam.theta) * Math.cos(cam.phi) * cam.radius;
    const k = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
    _v1.set(targetX, targetY, targetZ);
    camera.position.lerp(_v1, k);
    // keep the camera above whatever it hovers over
    const gs = supportAt(camera.position.x, camera.position.z, Infinity);
    if (gs.col && camera.position.y < gs.y + 0.6) camera.position.y = gs.y + 0.6;
    _v2.set(pos.x, pos.y + 1.5, pos.z);
    camera.lookAt(_v2);

    // sun + shadow frustum follow the player
    sunLight.position.set(pos.x + 40, pos.y + 60, pos.z + 20);
    sunLight.target.position.set(pos.x, pos.y, pos.z);
    skyDome.position.set(pos.x, 0, pos.z);
  }

  function updateWorld(dt) {
    // islands bob gently; colliders read islandBob each query
    for (let i = 0; i < SKY_ISLANDS.length; i++) {
      const isle = SKY_ISLANDS[i];
      const bob = Math.sin(simTime * 0.45 + isle.seed * 1.7) * 0.35;
      islandBob[isle.id] = bob;
      islandGroups[isle.id].position.y = isle.pos[1] + bob;
    }
    // drifting clouds (cheap: advance a third of them per frame)
    if (cloudMesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      const p = new THREE.Vector3();
      const start = (Math.floor(simTime * 60) % 3);
      for (let i = start; i < cloudData.length; i += 3) {
        const d = cloudData[i];
        d.x += d.speed * dt * 3;
        if (d.x > 460) d.x = -460;
        p.set(d.x, d.y, d.z);
        s.set(d.sx, d.sy, d.sz);
        m.compose(p, q, s);
        cloudMesh.setMatrixAt(i, m);
      }
      cloudMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ===================== input =====================
  function zoneActive() {
    return els.zone && els.zone.classList.contains('active');
  }

  function setupKeyboard() {
    window.addEventListener('keydown', e => {
      if (!playing || !zoneActive()) return;
      if (document.querySelector('.modal.active')) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = 1; break;
        case 'KeyS': case 'ArrowDown': keys.b = 1; break;
        case 'KeyA': case 'ArrowLeft': keys.l = 1; break;
        case 'KeyD': case 'ArrowRight': keys.r = 1; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = true; break;
        case 'Space':
          if (!jumpHeld) { jumpBufferedAt = simTime; jumpHeld = true; }
          break;
        case 'KeyE': interact(); break;
        default: return;
      }
      e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.f = 0; break;
        case 'KeyS': case 'ArrowDown': keys.b = 0; break;
        case 'KeyA': case 'ArrowLeft': keys.l = 0; break;
        case 'KeyD': case 'ArrowRight': keys.r = 0; break;
        case 'ShiftLeft': case 'ShiftRight': keys.sprint = false; break;
        case 'Space': jumpHeld = false; break;
      }
    });
  }

  function interact() {
    // Quests plug in here in Part 2.
    showWorldToast('🔍 附近沒有可以互動的東西');
  }

  function setupPointerControls() {
    const el = els.wrap;

    el.addEventListener('pointerdown', e => {
      if (!playing) return;
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;

      if (isTouch && e.pointerType === 'touch' && relX < 0.45 && !joy.active) {
        // left side → movement joystick (dynamic origin)
        joy.active = true;
        joy.pointerId = e.pointerId;
        joy.ox = e.clientX; joy.oy = e.clientY;
        joy.dx = 0; joy.dy = 0;
        els.joyBase.style.display = 'block';
        els.joyBase.style.left = (e.clientX - rect.left) + 'px';
        els.joyBase.style.top = (e.clientY - rect.top) + 'px';
        els.joyKnob.style.transform = 'translate(-50%, -50%)';
      } else {
        // right side / mouse → look
        lookPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (lookPointers.size === 2) {
          const [a, b] = [...lookPointers.values()];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
      }
      try { el.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
    });

    el.addEventListener('pointermove', e => {
      if (joy.active && e.pointerId === joy.pointerId) {
        const R = 52;
        let dx = e.clientX - joy.ox;
        let dy = e.clientY - joy.oy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        joy.dx = dx / R;
        joy.dy = -dy / R;   // screen up = forward
        els.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        return;
      }
      if (!lookPointers.has(e.pointerId)) return;
      const prev = lookPointers.get(e.pointerId);
      lookPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (lookPointers.size === 1) {
        cam.theta -= (e.clientX - prev.x) * 0.0062;
        cam.phi += (e.clientY - prev.y) * 0.005;
        cam.phi = Math.min(1.3, Math.max(0.05, cam.phi));
      } else if (lookPointers.size === 2) {
        const [a, b] = [...lookPointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) {
          cam.radius = Math.min(16, Math.max(5, cam.radius * pinchDist / d));
        }
        pinchDist = d;
      }
    });

    const release = e => {
      if (joy.active && e.pointerId === joy.pointerId) {
        joy.active = false;
        joy.dx = 0; joy.dy = 0;
        els.joyBase.style.display = 'none';
      }
      lookPointers.delete(e.pointerId);
      pinchDist = 0;
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    el.addEventListener('wheel', e => {
      if (!playing) return;
      e.preventDefault();
      cam.radius = Math.min(16, Math.max(5, cam.radius * (1 + Math.sign(e.deltaY) * 0.09)));
    }, { passive: false });

    // touch buttons
    els.btnJump.addEventListener('pointerdown', e => {
      e.preventDefault();
      jumpBufferedAt = simTime;
    });
    els.btnAct.addEventListener('pointerdown', e => {
      e.preventDefault();
      interact();
    });
  }

  // ===================== main loop =====================
  function animate() {
    // stop rendering while another zone is visible; onShow() restarts us
    if (!zoneActive()) { rafId = null; return; }
    rafId = requestAnimationFrame(animate);

    const dt = Math.min(0.1, clock.getDelta());
    if (playing) {
      updateWorld(dt);
      updatePlayer(dt);
      updateCamera(dt);
    }
    renderer.render(scene, camera);
  }

  return { init, onShow };
})();
