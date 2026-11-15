/* ===== SkyProbe — 🧪 on-device graphics compatibility probe for 天空之城 (owner diagnostics) =====
   Loaded after js/sky-art.js / js/sky-avatar.js, before js/sky.js. Kid-invisible: it only runs from the
   Sky debug panel (?skydebug=1 or a long press on the island-name pill).

   v4 bisects shadows by object class. On the PowerVR phone v3 found every configuration without
   shadows safe (38/38) and the whole world with shadows unsafe in every shadow type, while the
   minimal scene (ground receives, one box casts) passed 15/15 — so the shadow mechanism works and
   something in "the whole world" kills the GPU. Each step is repeated; a configuration is safe only
   when every repeat passed, one crash marks it unsafe.
   1. safe part (should never crash): context-churn control, the world without shadows, the composer
      + bloom without shadows (0 / 2 / 4× MSAA). SKIPPED when an earlier v3/v4 verdict on the same GPU
      string already proved it (then only a 2-try control runs) → applied at once (shadows off);
   2. shadow classes: the v3-proven minimal scene plus ONE class at a time (island top material,
      avatars, merged props, matOf objects, PMREM env, the composer, grass, water, unlit effects, the
      real shadow frustum at game scale), ≤5 tries each on fresh contexts, a class stops at its first
      crash, the whole part after CAP crashes;
   3. the combination of everything that passed, in the configuration the game would ship, 8 tries
      (VSM once survived 7); if it crashes, the same with a small shadow frustum around the hero;
   → the final verdict turns shadows on only with a combination that passed every try, with the
     failed classes switched off (`sw.shOff`, `sw.env`, nopost, `sw.shNear`), else shadows stay off.
   Every step runs in the probe's own canvas, and never next to a live world (SkyArt reloads the
   page without one first): a GPU-process crash kills every context on the page. Before each step it
   writes "running X" to localStorage `english_savior_sky_probe` (device-local, never exported); a
   crash that kills the page is recorded on the next load as "CRASH at X". When Chrome refuses to
   create a context after a crash (NOCTX) nothing is counted: the panel asks for a Chrome restart and
   retries by itself. */
const SkyProbe = (() => {
  'use strict';
  const CPU2D = { willReadFrequently: true };   // texture canvases survive a GPU crash (see js/sky-art.js)
  const KEY = 'english_savior_sky_probe', GO_KEY = 'english_savior_sky_probe_go';
  const VER = 4;
  const CLEAR = '255,0,255';
  const CAP = 5;            // crashes the shadow part may cost before it stops (expect 1–3)
  // safe groups: { g, n, same (one context for all tries), avail(st) }
  const SAFE = [
    { g: 'churn', n: 6, label: '對照組：新 context + 一般繪圖' },
    { g: 'world_ns', n: 6, label: '整個世界、沒陰影（每次新 context）' },
    { g: 'ns_same', n: 4, same: true, label: '整個世界、沒陰影（同一個 context）' },
    { g: 'cmp0', n: 6, label: 'bloom composer、沒陰影、無 MSAA' },
    { g: 'cmp2', n: 6, avail: s => (s.f16 || []).some(n => n >= 2 && n < 4), label: 'bloom composer、沒陰影、2× MSAA' },
    { g: 'cmp4', n: 6, avail: s => (s.f16 || []).some(n => n >= 4), label: 'bloom composer、沒陰影、4× MSAA' },
    { g: 'cmp_same', n: 4, same: true, label: 'bloom composer、沒陰影（同一個 context，最佳 MSAA）' },
  ];
  // shadow classes, in test order (most valuable / most likely safe first). Each = the minimal scene
  // + one ingredient. `cls`: a SkyArt shadow class the game can exclude; `need`: without it the game
  // gets no useful shadows at all (a crash there ends the shadow part: shadows stay off).
  const SHADOW = [
    { g: 'b_base', n: 3, need: true, label: '對照：最小陰影（地面接收、一個方塊投影；v3 15/15）' },
    { g: 'c_top', n: 5, need: true, label: '島嶼地面材質（貼圖 + 細節 + 發光，接收陰影）' },
    { g: 'c_avatar', n: 5, cls: 'avatar', label: '角色 NPC（真的 SkyAvatar 模型）投影' },
    { g: 'c_prop', n: 5, cls: 'prop', label: '合併道具（樹 + 發光；搖動 / 透視材質）投影 + 接收' },
    { g: 'c_occ', n: 5, cls: 'occ', label: 'matOf 材質（跑酷平台、蛋舖）投影 + 接收' },
    { g: 'c_env', n: 5, sw: 'env', label: '環境光貼圖（PMREM）' },
    { g: 'c_post', n: 5, sw: 'post', avail: () => verdictSafe().post, label: 'bloom composer（最佳 MSAA）' },
    { g: 'c_grass', n: 5, cls: 'grass', label: '草（instanced，接收）' },
    { g: 'c_water', n: 5, cls: 'water', label: '水面（半透明，接收）' },
    { g: 'c_fx', n: 5, need: true, label: '不打光的東西（天空、雲海、瀑布、極光、岩漿、粒子、看板、雲）' },
    { g: 'c_scale', n: 5, sw: 'scale', label: '實際規模：陰影範圍 ±38、2048/1024 貼圖、40 棵樹 + 40 個方塊' },
  ];
  const COMBO = [
    { g: 'combo', n: 8, label: '全部通過的類別一起（遊戲實際的設定）' },
    { g: 'near', n: 8, avail: () => !!grp('combo').bad && isSafe('c_scale'), label: '同上，但陰影只在主角附近（±14）' },
  ];
  const CRASHES = new Set(['LOST', 'CRASH']);
  let st = null, busy = false, R = null, host = null, onUpdate = null, shaderLog = [], endedAt = 0;
  let retryT = 0, retryN = 0;

  // ---------- persisted progress ----------
  // an earlier run in one line: what crashed, and what it concluded
  function histLine(o) {
    if (!o || !Array.isArray(o.results)) return null;
    const bad = o.results.filter(x => x.r !== 'ok').map(x => x.id + (x.r === 'LOST' ? '' : ':' + x.r));
    const v = o.summary ? 'tier ' + (o.summary.rec === null || o.summary.rec === undefined ? '-' : o.summary.rec) + (o.summary.sw && Object.keys(o.summary.sw).length ? ' ' + JSON.stringify(o.summary.sw) : '') : 'no verdict';
    return 'v' + (o.v || 1) + ' ' + (o.at || '?') + ': ' + o.results.length + ' steps, not ok: ' + (bad.join(' ') || 'none') + ' → ' + v + (o.v < 3 ? '（已捨棄）' : '');
  }
  function histOf(o) {
    if (!o) return [];
    const own = histLine(o);
    const older = Array.isArray(o.hist) ? o.hist : o.prev ? (o.prev.txt ? ['v' + (o.prev.v || 1) + ' ' + o.prev.at + ': ' + String(o.prev.txt).replace(/ ok(×\d+)?/g, '').slice(0, 300) + (o.prev.verdict ? ' → ' + o.prev.verdict : '') + '（已捨棄）'] : histOf(o.prev)) : [];
    return (own ? [own] : []).concat(older).slice(0, 3);
  }
  function fresh(hist) { return { v: VER, at: new Date().toISOString().slice(0, 16).replace('T', ' '), results: [], running: null, hist: hist || [] }; }
  function load() {
    if (st) return st;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (raw && raw.v === VER && Array.isArray(raw.results)) st = raw;
    else if (raw && Array.isArray(raw.results) && raw.results.length) { st = fresh(histOf(raw)); st.idle = true; save(); }
    else return null;
    // the step that was running when the page died is the step that killed it
    if (st.running) {
      const id = st.running;
      st.results.push({ id, g: id.split('#')[0], r: 'CRASH', note: 'page / GPU process died during this step' });
      st.interrupted = id;
      st.running = null;
      save();
    }
    return st;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked: this run only */ } }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const res = id => st && st.results.find(x => x.id === id);
  const crashCount = () => (st ? st.results.filter(x => CRASHES.has(x.r)).length : 0);
  // a group's record: tries so far, passes, the first bad try
  function grp(g) {
    const xs = st ? st.results.filter(x => x.g === g) : [];
    const i = xs.findIndex(x => x.r !== 'ok');
    return { tried: xs.length, ok: xs.filter(x => x.r === 'ok').length, bad: i < 0 ? null : { j: i + 1, r: xs[i].r } };
  }
  const groupDef = g => SAFE.concat(SHADOW, COMBO).find(d => d.g === g);
  const isSafe = g => { const d = groupDef(g), r = grp(g); return !!d && !r.bad && r.tried >= d.n; };

  // ---------- the probe's own renderer (same settings as the world's) ----------
  // `sh`: null (shadow map disabled, as a no-shadow world) or a shadow type for the map
  function makeRenderer(sh) {
    const kit = SkyArt.probeKit();
    const cv = document.createElement('canvas');
    const W = Math.round(Math.min(window.innerWidth || 800, 900));
    const H = Math.max(360, Math.min(Math.round(W * 0.75), Math.round((window.innerHeight || 800) * 0.72)));
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
    const gl = r.getContext();
    if (!gl) throw new Error('no WebGL context');
    const o = { r, gl, cv, kit, lost: false, W, H, scenes: [], junk: [], sh };
    cv.addEventListener('webglcontextlost', () => { o.lost = true; });
    o.caps = kit.probeCaps(gl, {});
    if (!kit.caps.gpu) kit.probeCaps(gl);   // the panel's header shows the GPU even before a world exists
    r.setPixelRatio(kit.pixelRatio(W, H));
    r.setSize(W, H, false);
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = !!sh;
    r.shadowMap.type = kit.SHADOW_MAP_TYPE[sh] || THREE.PCFShadowMap;
    r.setClearColor(0xff00ff, 1);
    r.debug.onShaderError = (g2, program, vs, fs) => {
      const p = r.info.programs && r.info.programs.find(q => q.program === program);
      const lg = s => (s && g2.getShaderInfoLog(s) || '').trim();
      const txt = [(g2.getProgramInfoLog(program) || '').trim(), lg(vs) && 'VS ' + lg(vs), lg(fs) && 'FS ' + lg(fs)].filter(Boolean).join(' | ');
      shaderLog.push((p ? p.name || p.type : '?') + ': ' + (txt || '(empty log)'));
    };
    o.cam = new THREE.PerspectiveCamera(55, W / H, 0.1, 1800);
    o.cam.position.set(0, 2.2, 6);
    o.cam.lookAt(0, 0.8, 0);
    if (host) { host.innerHTML = ''; host.appendChild(cv); }
    return o;
  }
  function teardown() {
    if (!R) return;
    const o = R;
    R = null;
    try { if (o.envRT && !o.lost) o.envRT.dispose(); o.r.dispose(); if (!o.lost) o.r.forceContextLoss(); } catch (e) { /* ignore */ }
    if (o.cv.parentNode) o.cv.remove();
  }
  // free everything a step made, so tries sharing a context don't pile up GPU memory
  let made = [];   // textures this probe painted (the kit's own textures / cached geometries are shared)
  function cleanup(o) {
    const scenes = o.scenes, junk = o.junk;
    o.scenes = []; o.junk = [];
    if (o.lost || o.gl.isContextLost()) { made = []; return; }
    try {
      const shared = new Set([o.kit.geo('rbox'), o.kit.getTuftGeo()]);
      scenes.forEach(sc => sc.traverse(c => {
        if (c.shadow && c.shadow.map) c.shadow.dispose();
        if (c.geometry && !shared.has(c.geometry)) c.geometry.dispose();
        (Array.isArray(c.material) ? c.material : c.material ? [c.material] : []).forEach(m => m.dispose());
      }));
      junk.concat(made).forEach(j => { try { j.dispose(); } catch (e) { /* ignore */ } });
      made = [];
    } catch (e) { /* best effort */ }
  }
  function drain(gl) {
    const out = [];
    let e, n = 0;
    while ((e = gl.getError()) !== gl.NO_ERROR && n++ < 8) out.push('0x' + e.toString(16));
    return out;
  }
  function readPx(o) {
    const gl = o.gl, px = new Uint8Array(4);
    gl.readPixels(gl.drawingBufferWidth >> 1, gl.drawingBufferHeight >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px[0] + ',' + px[1] + ',' + px[2];
  }

  // ---------- scenes (lights / fog / env / shadows as the world sets them) ----------
  function rig(o, opt) {
    opt = opt || {};
    const k = o.kit, sc = new THREE.Scene();
    o.scenes.push(sc);
    sc.fog = new THREE.Fog(k.fogBase.getHex(), 70, 420);
    sc.add(new THREE.HemisphereLight(0xd6ecff, 0x8f8a6a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
    sun.position.copy(k.SUN_DIR).multiplyScalar(20);
    if (o.sh) {
      sun.castShadow = true;
      const ms = o.sh === 'pcf512' ? 512 : k.isTouch ? 1024 : 2048;
      sun.shadow.mapSize.set(ms, ms);
      // opt.frustum: the game's own shadow camera (half-size 38, or 14 with shNear) — else the small test one
      const S = opt.frustum || 8;
      if (opt.frustum) sun.position.copy(k.SUN_DIR).multiplyScalar(90);
      Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: opt.frustum ? 5 : 1, far: opt.frustum ? 220 : 60 });
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
    }
    sc.add(sun, sun.target);
    sc.userData.sun = sun;
    if (opt.env !== false && o.envRT) { sc.environment = o.envRT.texture; sc.environmentIntensity = 0.42; }
    return sc;
  }
  function mesh(g, m, x, y, z) { const me = new THREE.Mesh(g, m); me.position.set(x || 0, y === undefined ? 0.8 : y, z || 0); return me; }
  function ground(sc, mat) { const g = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; sc.add(g); return g; }
  function canvasTex(color, size) {
    size = size || 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d', CPU2D); c.fillStyle = color; c.fillRect(0, 0, size, size);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.font = 'bold ' + Math.round(size * 0.6) + 'px sans-serif'; c.fillText('A', size * 0.28, size * 0.72);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    made.push(t);
    return t;
  }
  // the see-through cutout really discarding over the test tree's crown
  function occLive(o) {
    const O = o.kit.OCC;
    O.uOccDist.value = 50; O.uOccScr.value.set(0.5, 0.8); O.uOccR.value = 0.16;
    O.uOccRes.value.set(o.gl.drawingBufferWidth, o.gl.drawingBufferHeight);
  }
  function occOff(o) { const O = o.kit.OCC; O.uOccDist.value = 0; O.uOccScr.value.set(0.5, 0.5); O.uOccR.value = 0.12; }

  // the world's custom materials, built by SkyArt's own factories exactly as shipped
  const WORLD = {
    prop(o, sc) {
      const k = o.kit, B = new k.Batch(), rng = k.mulberry(7);
      k.K.oak(B, rng, 0, 0, 0.9, 0x5cb34c);
      B.at(0, 0, 0, 0, 1);
      B.part(k.geo('sphere'), 1.2, 0.6, 0.6, 0.35, 0.35, 0.35, 0xffd166, { glow: 1.6 });
      const m = B.mesh(k.MK.prop(true, { vc: true, sway: true, glow: true, occ: 'on' }), true);
      m.castShadow = true; m.receiveShadow = true;
      sc.add(m);
      return m;
    },
    grass(o, sc) {
      const k = o.kit, im = new THREE.InstancedMesh(k.getTuftGeo(), k.MK.grass(true), 60);
      const m4 = new THREE.Matrix4(), rng = k.mulberry(3);
      for (let i = 0; i < 60; i++) { m4.makeScale(3, 3, 3).setPosition((rng() - 0.5) * 4, 0, (rng() - 0.5) * 4 + 1); im.setMatrixAt(i, m4); }
      im.receiveShadow = true;
      sc.add(im);
    },
    occ(o, sc) {
      const k = o.kit;
      const m = mesh(k.geo('rbox'), k.MK.occ({ color: 0xc9a070, map: k.TEX.rockTex, emissive: new THREE.Color(0x553300), emissiveIntensity: 1.6 }, true, 'on'), -1.4, 0.6, 0.5);
      m.scale.setScalar(1.1); m.castShadow = true; m.receiveShadow = true; sc.add(m);
    },
    top(o, sc) {
      const k = o.kit, t = canvasTex('#5cbf54', 512);
      const mat = k.newTopMat({ map: t, emissiveMap: canvasTex('#000000'), emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.6, roughness: 0.92 }, 4, true);
      ground(sc, mat);
    },
    water(o, sc) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), o.kit.MK.water(true));
      m.rotation.x = -Math.PI / 2; m.position.set(1.4, 0.04, 1.2); m.receiveShadow = true; sc.add(m);
    },
    cloud(o, sc) {
      const k = o.kit, rng = k.mulberry(11), im = new THREE.InstancedMesh(k.cloudGeometry(rng), k.MK.cloud(true), 6);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 6; i++) { m4.makeScale(0.9, 0.7, 0.9).setPosition(-3 + i * 1.2, 2.6 + (i % 2) * 0.4, -2); im.setMatrixAt(i, m4); }
      im.castShadow = false;   // as in the game: clouds neither cast nor receive (v3 had them casting)
      sc.add(im);
    },
    sky(o, sc) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(60, 40, 20), o.kit.skyMat(o.kit.skyUniforms()));
      d.renderOrder = -10; d.frustumCulled = false; sc.add(d);
    },
    sea(o, sc) {
      const k = o.kit, u = k.seaUniforms();
      u.uLava.value = 0.5;
      const g = new THREE.PlaneGeometry(200, 200); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, k.seaMat(u)); m.position.y = -0.05; m.renderOrder = -5; sc.add(m);
    },
    fall(o, sc) { const m = mesh(new THREE.PlaneGeometry(1.6, 3.2), o.kit.newFallMat(), 0.4, 1.2, 0.8); m.renderOrder = 2; sc.add(m); },
    aurora(o, sc) { sc.add(mesh(new THREE.PlaneGeometry(5, 3, 24, 1), o.kit.newAuroraMat(), 0, 1.6, -0.5)); },
    lava(o, sc) {
      const cg = new THREE.CircleGeometry(1.3, 36);
      cg.setAttribute('uv2s', cg.attributes.uv.clone());
      const m = new THREE.Mesh(cg, o.kit.newLavaMat()); m.rotation.x = -Math.PI / 2; m.position.set(-1.2, 0.08, 1.6); sc.add(m);
    },
    points(o, sc) {
      const k = o.kit, n = 80, arr = new Float32Array(n * 3), rng = k.mulberry(5);
      for (let i = 0; i < n * 3; i++) arr[i] = (rng() - 0.5) * 3 + (i % 3 === 1 ? 1 : 0);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      sc.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.3, map: k.TEX.dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('#3a6ee8'), transparent: true, depthWrite: false }));
      sp.position.set(0, 0.8, 0); sp.scale.set(1.6, 1.6, 1); sc.add(sp);
    },
    swirl(o, sc) {
      const m = mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ map: canvasTex('#ffffff', 256), color: 0xa77bff, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
      m.renderOrder = 1; sc.add(m);
    },
    avatar(o, sc) {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x14a3a3, roughness: 0.6 }), 0, 0.9, 1.5));
      g.add(mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd9b0, roughness: 0.6, flatShading: true }), 0, 1.6, 1.5));
      g.add(mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: 0x222222 }), 0.1, 1.62, 1.86));
      g.traverse(c => { if (c.isMesh) c.castShadow = true; });
      sc.add(g);
    },
  };
  // the whole world's material set in one scene, as shipped (props with sway / glow / live see-through)
  function worldScene(o) {
    const sc = rig(o);
    Object.keys(WORLD).forEach(n => WORLD[n](o, sc));
    occLive(o);
    return sc;
  }
  // v4: the v3-proven minimal scene (ground receives, one box casts) + the named ingredients.
  // `S` = the game's shadow frustum half-size (38, or 14 = shNear); omitted = the small test one.
  function clsScene(o, parts, S) {
    const k = o.kit, has = n => parts.indexOf(n) >= 0;
    const sc = rig(o, { env: has('env'), frustum: S });
    const box = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9a070 }), 0, 1.2, 0);
    box.castShadow = true; box.receiveShadow = false; sc.add(box);
    const big = has('scale');
    if (has('top')) {
      const t = canvasTex('#5cbf54', 512);
      const mat = k.newTopMat({ map: t, emissiveMap: canvasTex('#000000'), emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.6, roughness: 0.92 }, 4, true);
      const g = ground(sc, mat);
      if (big) g.scale.setScalar(6);
    } else {
      const g = ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 }));
      if (big) g.scale.setScalar(6);
    }
    if (has('avatar')) {
      // the game's real rigs (same materials, decals and cast flags as on an island)
      if (typeof SkyAvatar !== 'undefined' && SkyAvatar.makeNpc) {
        [['🧝', -1.6, 1.4], ['👻', 1.7, 1.2]].forEach(([e, x, z]) => { const n = SkyAvatar.makeNpc(e); n.position.set(x, 0, z); sc.add(n); });
      } else WORLD.avatar(o, sc);
    }
    if (has('prop')) WORLD.prop(o, sc);
    if (has('occ')) {
      WORLD.occ(o, sc);
      const pl = mesh(k.geo('rbox'), k.MK.occ({ color: 0x7fe0c8 }, true, 'on'), 1.8, 0.45, -0.6);
      pl.scale.set(2.2, 0.9, 1.6); pl.castShadow = true; pl.receiveShadow = true; sc.add(pl);
    }
    if (has('grass')) WORLD.grass(o, sc);
    if (has('water')) WORLD.water(o, sc);
    if (has('fx')) ['cloud', 'sky', 'sea', 'fall', 'aurora', 'lava', 'points', 'swirl'].forEach(n => WORLD[n](o, sc));
    if (big) {
      // the real scale: 40 trees in one merged mesh + 40 separate boxes over the game's frustum
      const B = new k.Batch(), rng = k.mulberry(17);
      for (let i = 0; i < 40; i++) k.K.oak(B, rng, (rng() - 0.5) * 70, (rng() - 0.5) * 70, 0.9 + rng() * 0.4, 0x5cb34c);
      const m = B.mesh(k.MK.prop(true, { vc: true, sway: true, glow: true, occ: 'on' }), true);
      m.castShadow = true; m.receiveShadow = true; sc.add(m);
      const bm = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.7 });
      for (let i = 0; i < 40; i++) {
        const b = mesh(k.geo('rbox'), bm, (rng() - 0.5) * 70, 0.6, (rng() - 0.5) * 70);
        b.castShadow = true; b.receiveShadow = true; sc.add(b);
      }
    }
    if (has('prop') || has('occ')) occLive(o);
    // a game-like view for the big scenes; the small test view otherwise
    if (S) { o.cam.position.set(0, 5.5, 12); o.cam.lookAt(0, 1, 0); } else { o.cam.position.set(0, 2.2, 6); o.cam.lookAt(0, 0.8, 0); }
    return sc;
  }
  // 3 frames, direct to the default framebuffer
  function drawN(o, sc, n) { o.r.setRenderTarget(null); for (let i = 0; i < (n || 3); i++) o.r.render(sc, o.cam); return readPx(o); }
  function composer(o, samples) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples });
    const c = new THREE.EffectComposer(o.r, rt);
    c.setPixelRatio(o.r.getPixelRatio());
    c.setSize(o.W, o.H);
    return c;
  }
  function drawPost(o, sc, samples, n) {
    const c = composer(o, samples);
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(o.W, o.H), 0.32, 0.5, 1.0);
    c.addPass(new THREE.RenderPass(sc, o.cam));
    c.addPass(bloom);
    c.addPass(new THREE.OutputPass());
    o.junk.push(c, bloom);
    for (let i = 0; i < (n || 3); i++) c.render(0.016);
    return readPx(o);
  }
  const f16Best = (s, cap) => (s.f16 || []).filter(n => n <= cap).reduce((a, n) => Math.max(a, n), 0);
  const f16Two = s => (s.f16 || []).filter(n => n >= 2 && n < 4)[0] || 2;
  // the MSAA the composer proved with (the same rule the verdict applies)
  function msaaBest() {
    if (st.reuse) return st.reuse.msaa;
    const d2 = groupDef('cmp2'), d4 = groupDef('cmp4');
    if (d4.avail(st) && isSafe('cmp4') && (!d2.avail(st) || isSafe('cmp2'))) return f16Best(st, 4);
    if (d2.avail(st) && isSafe('cmp2')) return f16Two(st);
    return 0;
  }

  // ---------- what each group does (one try) ----------
  const RUN = {
    context: o => {
      st.gpu = o.caps.gpu; st.f16 = o.caps.f16Samples || [];
      st.reuse = reuseFrom(o.kit.stored(), st.gpu);
      return { note: 'WebGL' + (o.caps.webgl2 ? '2' : '1') + ' f16 samples [' + st.f16.join(',') + ']' + (st.reuse ? ' · 沿用 ' + st.reuse.from : '') };
    },
    churn: o => { const sc = rig(o, { env: false }); sc.add(mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x33cc66 }), -1.8)); sc.add(mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x5cb34c, roughness: 0.6 }), 0.3)); return { px: drawN(o, sc, 2), expect: 'drawn' }; },
    world_ns: o => ({ px: drawN(o, worldScene(o)), expect: 'drawn' }),
    ns_same: o => ({ px: drawN(o, worldScene(o)), expect: 'drawn' }),
    cmp0: o => ({ px: drawPost(o, worldScene(o), 0), expect: 'drawn', note: 'no MSAA' }),
    cmp2: o => ({ px: drawPost(o, worldScene(o), f16Two(st)), expect: 'drawn', note: f16Two(st) + '× MSAA' }),
    cmp4: o => ({ px: drawPost(o, worldScene(o), f16Best(st, 4)), expect: 'drawn', note: f16Best(st, 4) + '× MSAA' }),
    cmp_same: o => { const n = msaaBest(); return { px: drawPost(o, worldScene(o), n), expect: 'drawn', note: (n ? n + '× MSAA' : 'no MSAA') }; },
    // v4 shadow classes: the minimal scene + one ingredient; combo / near: everything that passed
    b_base: o => ({ px: drawN(o, clsScene(o, [])), expect: 'drawn', note: 'direct' }),
    c_top: o => ({ px: drawN(o, clsScene(o, ['top'])), expect: 'drawn' }),
    c_avatar: o => ({ px: drawN(o, clsScene(o, ['avatar'])), expect: 'drawn' }),
    c_prop: o => ({ px: drawN(o, clsScene(o, ['prop'])), expect: 'drawn' }),
    c_occ: o => ({ px: drawN(o, clsScene(o, ['occ'])), expect: 'drawn' }),
    c_env: o => ({ px: drawN(o, clsScene(o, ['env'])), expect: 'drawn' }),
    c_post: o => { const n = msaaBest(); return { px: drawPost(o, clsScene(o, []), n), expect: 'drawn', note: n ? n + '× MSAA' : 'no MSAA' }; },
    c_grass: o => ({ px: drawN(o, clsScene(o, ['grass'])), expect: 'drawn' }),
    c_water: o => ({ px: drawN(o, clsScene(o, ['water'])), expect: 'drawn' }),
    c_fx: o => ({ px: drawN(o, clsScene(o, ['fx'])), expect: 'drawn' }),
    c_scale: o => ({ px: drawN(o, clsScene(o, ['scale'], 38)), expect: 'drawn', note: 'frustum ±38' }),
    combo: o => comboDraw(o, isSafe('c_scale') ? 38 : 14),
    near: o => comboDraw(o, 14),
  };
  // the ingredients the combination ships with (decided once every class step is over)
  function comboParts() {
    return ['top', 'avatar', 'prop', 'occ', 'env', 'grass', 'water', 'fx'].filter(n => isSafe('c_' + n));
  }
  const comboPost = () => verdictSafe().post && isSafe('c_post');
  function comboDraw(o, S) {
    const parts = comboParts().concat('scale');   // the game's world is at scale either way: with
    // the small frustum (near) the far casters are simply culled from the depth pass
    const sc = clsScene(o, parts, S);
    const n = msaaBest();
    return { px: comboPost() ? drawPost(o, sc, n) : drawN(o, sc), expect: 'drawn', note: 'frustum ±' + S + ' ' + (comboPost() ? 'post ' + n + '×' : 'direct') + ' [' + parts.join(',') + ']' };
  }
  const SH_TYPE = {};
  [...SHADOW, ...COMBO].forEach(d => { SH_TYPE[d.g] = 'pcf'; });
  // which tries need the PMREM environment baked into their context
  const needsEnv = g => g === 'c_env' || ((g === 'combo' || g === 'near') && isSafe('c_env')) || (SAFE.some(d => d.g === g) && g !== 'churn');

  // an earlier v3/v4 verdict for this very GPU string already proved the safe part: reuse it
  function reuseFrom(stored, gpu) {
    const p = stored && stored.probe;
    if (!p || !(p.v >= 3) || !gpu) return null;
    const at = 'v' + p.v + ' ' + (p.at || '?');
    if (p.safe) return p.safe.ns && p.safe.gpu === gpu ? { post: !!p.safe.post, msaa: p.safe.msaa | 0, from: at } : null;
    if (stored.gpu !== gpu || typeof p.rec !== 'number' || p.rec > 2) return null;
    const msaa = p.sw && typeof p.sw.msaa === 'number' ? p.sw.msaa : f16Best(st, 4);
    return { post: p.rec === 0, msaa, from: at };
  }
  // ---------- the plan (rebuilt from the results after every step) ----------
  function tries(d) {
    const r = grp(d.g), out = [];
    if (r.bad) return out;
    const n = st.reuse && d.g === 'churn' ? 2 : d.n;
    for (let j = r.tried + 1; j <= n; j++) out.push({ id: d.g + '#' + j, g: d.g, j, fresh: !d.same || j === 1, sh: SH_TYPE[d.g] || null });
    return out;
  }
  const groupN = d => (st && st.reuse && d.g === 'churn' ? 2 : d.n);
  // a shadow class that crashed where the game cannot do without it ends the shadow part
  const needBroken = () => SHADOW.some(d => d.need && grp(d.g).bad);
  function plan() {
    const out = [{ id: 'context#1', g: 'context', j: 1, fresh: true, sh: null }];
    if (!res('context#1')) return out.concat({ id: '…', placeholder: true });
    SAFE.forEach(d => { if (st.reuse ? d.g === 'churn' : !d.avail || d.avail(st)) out.push(...tries(d)); });
    out.push({ id: '=apply1', apply: 1 });
    const v = verdictSafe();
    if (v.churn && v.ns) {
      for (const d of SHADOW) {
        if (crashCount() >= CAP || needBroken()) break;
        if (!d.avail || d.avail(st)) out.push(...tries(d));
      }
      // the combination only once every class step is over (it is built from their results)
      const classesDone = SHADOW.every(d => (d.avail && !d.avail(st)) || grp(d.g).bad || grp(d.g).tried >= d.n);
      if (classesDone && !needBroken()) {
        for (const d of COMBO) {
          if (crashCount() >= CAP) break;
          if (!d.avail || d.avail(st)) out.push(...tries(d));
          if (d.g === 'combo' && !grp('combo').bad && grp('combo').tried < d.n) break;   // near is decided by combo
        }
      }
    }
    out.push({ id: '=apply2', apply: 2 });
    return out;
  }
  // the safe part's reading: post (composer + bloom without shadows) and the world without shadows
  function verdictSafe() {
    const churn = isSafeN('churn');
    if (st && st.reuse) return { churn, ns: true, post: st.reuse.post, msaa: st.reuse.msaa, reused: st.reuse.from };
    const ns = isSafe('world_ns') && isSafe('ns_same');
    const post = isSafe('cmp0') && isSafe('cmp_same') && ns;
    return { churn, ns, post, msaa: msaaBest() };
  }
  function isSafeN(g) { const d = groupDef(g), r = grp(g); return !!d && !r.bad && r.tried >= groupN(d); }
  const failedCls = () => SHADOW.filter(d => d.cls && grp(d.g).bad).map(d => d.cls);
  function verdict(final) {
    const v = verdictSafe();
    const comboOk = isSafe('combo'), nearOk = isSafe('near');
    const shadow = !!(final && v.churn && v.ns && (comboOk || nearOk));
    const postWithSh = comboPost();
    let rec = v.post ? 0 : v.ns ? 2 : 3;
    if (shadow && rec === 0 && !postWithSh) rec = 1;   // shadows proven only without the composer: nopost
    if (shadow && rec === 2) rec = 1;                   // nopost with shadows
    if (!v.churn) rec = Math.max(rec, 2);
    const sw = { shadow };
    if (shadow) {
      const off = failedCls();
      if (off.length) sw.shOff = off.join(',');
      if (!comboOk || !isSafe('c_scale')) sw.shNear = true;   // combo itself ran at ±14 when scale crashed
      if (!isSafe('c_env')) sw.env = false;
    }
    const offered = f16Best(st, 4);
    if (rec === 0 && v.msaa < offered) sw.msaa = v.msaa >= 2 ? 2 : 0;
    const bad = SHADOW.concat(COMBO).filter(d => grp(d.g).bad).map(d => d.g.replace(/^c_/, ''));
    const shTxt = !final ? '陰影先關（還沒測）' :
      shadow ? '陰影開' + (sw.shOff ? '（不含 ' + sw.shOff + '）' : '') + (sw.shNear ? '（只有主角附近）' : '') + (sw.env === false ? '（不用環境光貼圖）' : '') + (rec === 1 && v.post ? '，但要關掉 bloom' : '') :
      needBroken() ? '基本陰影就會當（' + bad.join(' ') + '）→ 陰影關' :
      SHADOW.some(d => grp(d.g).tried) ? '組合不穩（' + (bad.join(' ') || '-') + '）→ 陰影關' : '陰影沒測到';
    const cb = grp('churn').bad;
    const why = !v.churn ? '對照組（一般繪圖）' + (cb && CRASHES.has(cb.r) ? '也當機' : '失敗（' + (cb ? cb.r : '?') + '）') + '：結果不可靠，先用 nopost、不開陰影' :
      !v.ns ? '連沒陰影的世界都會當 → 省電畫質 low' :
      (v.reused ? '（沿用 ' + v.reused + ' 的無陰影結果）' : '') + (v.post ? '泛光（bloom）穩定、' : 'bloom 不穩、') + shTxt + ' → ' + TIERS_TXT[rec];
    const fail = st.results.filter(x => x.r !== 'ok').map(x => x.id + ':' + x.r).join(' ') || null;
    return { v: VER, at: st.at, rec, sw, why, fail, final: !!final, safe: { post: v.post, ns: v.ns, msaa: v.msaa, gpu: st.gpu } };
  }
  const TIERS_TXT = ['full（post）', 'nopost', 'noshadow', 'low'];

  // ---------- running ----------
  async function runOne(s) {
    st.running = s.id; save();
    update();
    await sleep(60);   // paint "running X" before the GPU gets busy
    if (s.fresh) teardown();
    if (!R) {
      try { R = makeRenderer(s.sh); } catch (e) {
        // Chrome refuses WebGL after a GPU crash until it is restarted: not a result, not a step
        st.running = null;
        st.noctx = { n: (st.noctx && st.noctx.step === s.id ? st.noctx.n : 0) + 1, step: s.id, msg: String(e && e.message || e).slice(0, 120) };
        save();
        return 'noctx';
      }
      st.noctx = null;
      if (needsEnv(s.g)) { try { R.envRT = R.kit.bakeEnv(R.r); } catch (e) { R.envRT = null; } }
    }
    const o = R;
    shaderLog = [];
    drain(o.gl);
    const t0 = performance.now();
    let out = {}, exc = null;
    try { out = RUN[s.g](o) || {}; } catch (e) { exc = e; }
    const ms = Math.round(performance.now() - t0);
    occOff(o);
    const gle = o.gl.isContextLost() ? [] : drain(o.gl);
    await sleep(350);   // a dying GPU process takes a moment to be noticed
    const lost = o.lost || o.gl.isContextLost();
    let r = 'ok';
    if (lost) r = 'LOST';
    else if (shaderLog.length) r = 'FAIL';
    else if (exc) r = 'ERR';
    else if (gle.length) r = 'GLERR';
    else if (out.expect && out.px === CLEAR) r = 'BLANK';
    const x = { id: s.id, g: s.g, r, ms };
    if (out.px && r !== 'ok') x.px = out.px;
    const note = [out.note, exc && String(exc && exc.message || exc).slice(0, 160)].filter(Boolean).join(' ');
    if (note && (r !== 'ok' || s.j === 1)) x.note = note;
    if (gle.length) x.gl = gle.join(' ');
    if (shaderLog.length) x.log = shaderLog.join(' || ').slice(0, 600);
    st.results.push(x);
    st.running = null; save();
    if (lost) { teardown(); await sleep(1500); }
    else cleanup(o);
    return r;
  }
  function applyNow(final) {
    const v = verdict(final);
    st.applied = final ? 2 : 1;
    st.summary = v;
    save();
    SkyArt.applyProbe(v);
  }
  async function run(el, cb, auto) {
    if (busy) return;
    load();
    if (auto && !(st && st.noctx && !st.done)) return;
    if (el) host = el;
    if (cb) onUpdate = cb;
    // never next to a live world: SkyArt's 🧪 button reloads the page without one first
    if (SkyArt.probeKit().worldAlive()) { if (host) host.innerHTML = '<div class="aw-gfx-probe-msg">🧪 3D 世界還開著：請重新載入頁面（?skydebug=1）再測。</div>'; return; }
    if (!st || st.done) st = fresh(st && st.done ? histOf(st) : null);
    clearTimeout(retryT);
    if (!auto) retryN = 0;
    st.interrupted = null; st.idle = false;
    busy = true;
    update();
    let stop = false;
    try {
      for (let guard = 0; guard < 160 && !stop; guard++) {
        const s = plan().find(p => !p.placeholder && (p.apply ? (st.applied || 0) < p.apply : !res(p.id)));
        if (!s) { st.done = true; save(); break; }
        if (s.apply) { applyNow(s.apply === 2); if (s.apply === 2) { st.done = true; save(); break; } continue; }
        const r = await runOne(s);
        if (r === 'noctx') stop = true;
        update();
      }
    } finally {
      teardown();
      busy = false;
      endedAt = Date.now();
      if (host) host.innerHTML = st.noctx ? '<div class="aw-gfx-probe-msg">⛔ Chrome 現在不讓網頁使用 3D（GPU 剛當機）。<b>請把 Chrome 完全關閉再開</b>（從最近使用的 App 把 Chrome 滑掉），回到這頁再按 ▶️。<br><small>會每幾秒自己再試一次。</small></div>' : '';
      update();
      if (st.noctx) scheduleRetry();
    }
  }
  // the context may come back on its own (Chrome un-blocks WebGL after a while / on refocus)
  function scheduleRetry() {
    clearTimeout(retryT);
    if (retryN >= 30) return;
    retryT = setTimeout(() => { retryN++; run(null, null, true); }, retryN < 6 ? 5000 : 20000);
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (!document.hidden && st && st.noctx && !busy) { retryN = 0; run(null, null, true); }
  });
  function update() { if (onUpdate) onUpdate(); }

  // ---------- panel text ----------
  function progress() {
    const p = plan().filter(s => !s.apply);
    const real = p.filter(s => !s.placeholder);
    const done = st.results.length;
    // steps not planned yet (the safe part before `context`, the combination before the classes end)
    const later = real.length < p.length ? 70 : (st.done ? 0 : COMBO[0].n * (grp('combo').tried || needBroken() || crashCount() >= CAP ? 0 : 1));
    return { done, total: done + real.filter(s => !res(s.id)).length + later };
  }
  function groupLine(d) {
    const r = grp(d.g);
    const isSh = SHADOW.concat(COMBO).indexOf(d) >= 0;
    if (st.reuse && !isSh && d.g !== 'churn') return '  ' + d.g.padEnd(9) + ' 沿用 ' + st.reuse.from + '  ' + d.label;
    if (d.avail && (isSh ? st.results.length > 1 : st.f16) && !d.avail(st)) return '  ' + d.g.padEnd(9) + (isSh ? ' 不需要  ' : ' n/a（這顆 GPU 沒有）  ') + d.label;
    const n = groupN(d);
    const state = !r.tried ? (isSh && crashCount() >= CAP ? 'not tried (crash cap)' : isSh && needBroken() ? 'not tried' : '-') :
      r.bad ? (CRASHES.has(r.bad.r) ? '✗ crashed at try ' + r.bad.j : '✗ ' + r.bad.r + ' at try ' + r.bad.j) :
      r.tried >= n ? '✓ safe' : '…';
    return '  ' + d.g.padEnd(9) + ' ' + (r.ok + '/' + r.tried).padStart(5) + ' ok of ' + n + '  ' + state.padEnd(20) + ' ' + d.label;
  }
  function text() {
    load();
    if (!st) return '';
    const lines = [];
    const hist = (st.hist || []).map(h => '  （之前 ' + h + '）');
    if (!st.results.length && st.idle) return ['🧪 相容性測試 probe v' + VER + ' — not run yet（按 🧪 開始；陰影逐類測試，GPU 大概會當機 1–3 次、最多 ' + CAP + ' 次）'].concat(hist).join('\n');
    const pr = progress();
    lines.push('🧪 相容性測試 probe v' + VER + ' (' + st.at + ')  ' + (st.gpu || '') + '  ' + pr.done + '/' + pr.total +
      (busy ? '  running: ' + (st.running || '…') : st.done ? '  done' : st.noctx ? '  waiting for WebGL' : '  paused — tap ▶️ to continue'));
    if (!st.done) lines.push('  ' + (st.reuse ? '沒陰影的部分沿用上次（同一顆 GPU）' : '先測不會當機的部分（約 1 分鐘）') + '；陰影逐類測試：每當機一次就重開 Chrome 再按 ▶️。預計 1–3 次、最多 ' + CAP + ' 次（已 ' + crashCount() + ' 次）。');
    lines.push('  安全部分（沒陰影）:');
    SAFE.forEach(d => lines.push(groupLine(d)));
    lines.push('  陰影類別（最小場景 + 一類，每類最多 N 次，第一次當機就停）:');
    SHADOW.forEach(d => lines.push(groupLine(d)));
    lines.push('  組合（全部通過的類別一起，要 8 次都過才開陰影）:');
    COMBO.forEach(d => lines.push(groupLine(d)));
    const bad = st.results.filter(x => x.r !== 'ok');
    if (bad.length) lines.push('  not ok: ' + bad.map(x => x.id + ' ' + x.r + (x.ms !== undefined ? ' ' + x.ms + 'ms' : '') + (x.gl ? ' gl ' + x.gl : '') + (x.log ? ' log ' + x.log : '') + (x.note ? ' (' + x.note + ')' : '')).join(' · '));
    if (st.noctx && !busy) lines.push('  ⛔ NOCTX ×' + st.noctx.n + ' at ' + st.noctx.step + ' (' + st.noctx.msg + ') — 請把 Chrome 完全關閉再開，然後按 ▶️（不算一步，會自動再試）');
    if (st.interrupted && !busy && !st.done) lines.push('  ⚠️ 上次在「' + st.interrupted + '」時整頁當掉（已記下）；按 ▶️ 繼續');
    if (st.summary) {
      const v = st.summary, T = SkyArt.probeKit().TIERS;
      lines.push('  結論：' + v.why);
      lines.push('    = start tier ' + (v.rec === 0 && !v.sw.shadow ? 'full（post，沒陰影）' : T[v.rec]) + '  switches ' + JSON.stringify(v.sw) + (v.final ? '' : '（暫定：陰影還沒測）') + '  → 已套用，重新載入後生效');
      if (v.final && v.sw.shadow) lines.push('    ⚠️ 開陰影後如果遊戲又當掉，畫質階梯會自己把陰影關掉（不用再測）');
    }
    return lines.concat(hist).join('\n');
  }
  function label() {
    load();
    if (busy) return '🧪 測試中…';
    if (!st || (st.idle && !st.results.length)) return '🧪 相容性測試';
    if (st.done) return '🔁 重新測試';
    const pr = progress();
    return (st.noctx ? '▶️ 再試一次（' : '▶️ 繼續測試（') + Math.min(pr.total, pr.done + 1) + '/' + pr.total + '）';
  }
  function interrupted() { load(); return goPending() || !!(st && !st.done && (st.interrupted || st.noctx)); }
  function goPending() { try { return !!sessionStorage.getItem(GO_KEY); } catch (e) { return false; } }

  return {
    run: (el, cb) => run(el, cb, false), text, label, busy: () => busy, interrupted,
    // a context lost now (or within 10 s of the probe) was the probe's doing, not the world's tier
    active: () => busy || (endedAt && Date.now() - endedAt < 10000),
    goAfterReload: () => { try { sessionStorage.setItem(GO_KEY, '1'); } catch (e) { /* ignore */ } },
    takeGo: () => { const g = goPending(); try { sessionStorage.removeItem(GO_KEY); } catch (e) { /* ignore */ } return g; },
    steps: () => { load(); return plan().map(s => s.id); },
    reset: () => { st = null; clearTimeout(retryT); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };
})();
