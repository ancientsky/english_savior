/* ===== SkyProbe — 🧪 on-device graphics compatibility probe for 天空之城 (owner diagnostics) =====
   Loaded after js/sky-art.js, before js/sky.js. Kid-invisible: it only runs from the Sky debug panel
   (?skydebug=1 or a long press on the island-name pill).

   v3 is statistical and shadow-focused. The PowerVR phone's three earlier runs lost the GPU in about
   one of four steps that rendered a shadow map and in none of ~80 steps without one, and the same
   step passed in one run and died in the next — so one try per step proves nothing, and v2's
   "switch off the ingredient that died" verdict was noise. v3 repeats each configuration and only
   calls it safe when every repeat passed; a single crash marks it unsafe.
   1. safe part (should never crash): a context-churn control (fresh contexts, a plain draw), the
      whole world without shadows (fresh contexts, then several in one context), the composer +
      bloom without shadows at no MSAA / 2× / 4× (fresh), then several in one context;
   → the verdict (post on/off, MSAA, shadows OFF) is handed to SkyArt.applyProbe() right here;
   2. shadow part (each variant up to N tries on fresh contexts, stopping at its first crash, the
      whole part stopping after CAP crashes): PCF (shipped), VSM, Basic, receive-only minimum,
      PCF 512, shadow map warmed one frame before any receiver, receivers compiled first;
   → the final verdict turns shadows back on only with a variant that passed every try.
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
  const VER = 3;
  const CLEAR = '255,0,255';
  const CAP = 5;            // crashes the shadow part may cost before it stops
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
  // shadow groups, in test order; `ship` = a shadow map type the game can use
  const SHADOW = [
    { g: 's_pcf', n: 8, ship: 'pcf', label: 'PCF（目前用的）' },
    { g: 's_vsm', n: 8, ship: 'vsm', label: 'VSM（不用 compare sampler）' },
    { g: 's_basic', n: 8, ship: 'basic', label: 'Basic（最簡單）' },
    { g: 's_recv1', n: 5, label: '最小：地面只接收、一個方塊投影' },
    { g: 's_pcf512', n: 8, ship: 'pcf512', label: 'PCF 512²' },
    { g: 's_warm', n: 5, label: 'PCF，先畫一幀陰影圖、再畫接收者' },
    { g: 's_late', n: 5, label: 'PCF，接收者先編譯（沒陰影）、再開陰影' },
  ];
  const SHIP_PREF = ['s_pcf', 's_pcf512', 's_vsm', 's_basic'];   // which safe type the game uses first
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
  const groupDef = g => SAFE.concat(SHADOW).find(d => d.g === g);
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
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
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
      im.castShadow = true;
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
    const d2 = groupDef('cmp2'), d4 = groupDef('cmp4');
    if (d4.avail(st) && isSafe('cmp4') && (!d2.avail(st) || isSafe('cmp2'))) return f16Best(st, 4);
    if (d2.avail(st) && isSafe('cmp2')) return f16Two(st);
    return 0;
  }
  // the shadow tries render the configuration they would ship in: through the composer when the
  // safe part proved post, else straight to the screen
  function shipDraw(o, sc, n) { return verdictSafe().post ? drawPost(o, sc, msaaBest(), n) : drawN(o, sc, n); }

  // ---------- what each group does (one try) ----------
  const RUN = {
    context: o => { st.gpu = o.caps.gpu; st.f16 = o.caps.f16Samples || []; return { note: 'WebGL' + (o.caps.webgl2 ? '2' : '1') + ' f16 samples [' + st.f16.join(',') + ']' }; },
    churn: o => { const sc = rig(o, { env: false }); sc.add(mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x33cc66 }), -1.8)); sc.add(mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x5cb34c, roughness: 0.6 }), 0.3)); return { px: drawN(o, sc, 2), expect: 'drawn' }; },
    world_ns: o => ({ px: drawN(o, worldScene(o)), expect: 'drawn' }),
    ns_same: o => ({ px: drawN(o, worldScene(o)), expect: 'drawn' }),
    cmp0: o => ({ px: drawPost(o, worldScene(o), 0), expect: 'drawn', note: 'no MSAA' }),
    cmp2: o => ({ px: drawPost(o, worldScene(o), f16Two(st)), expect: 'drawn', note: f16Two(st) + '× MSAA' }),
    cmp4: o => ({ px: drawPost(o, worldScene(o), f16Best(st, 4)), expect: 'drawn', note: f16Best(st, 4) + '× MSAA' }),
    cmp_same: o => { const n = msaaBest(); return { px: drawPost(o, worldScene(o), n), expect: 'drawn', note: (n ? n + '× MSAA' : 'no MSAA') }; },
    s_pcf: o => ({ px: shipDraw(o, worldScene(o)), expect: 'drawn' }),
    s_vsm: o => ({ px: shipDraw(o, worldScene(o)), expect: 'drawn' }),
    s_basic: o => ({ px: shipDraw(o, worldScene(o)), expect: 'drawn' }),
    s_pcf512: o => ({ px: shipDraw(o, worldScene(o)), expect: 'drawn' }),
    s_recv1: o => {
      const sc = rig(o, { env: false });
      const box = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9a070 }), 0, 1.2, 0);
      box.castShadow = true; box.receiveShadow = false; sc.add(box);
      ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 }));
      return { px: drawN(o, sc), expect: 'drawn', note: 'direct' };
    },
    s_warm: o => {
      // frame 1: the shadow pass runs, but every visible material is unlit (no shadow sampler yet)
      const sc = worldScene(o);
      sc.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x88aa66 });
      o.junk.push(sc.overrideMaterial);
      drawN(o, sc, 1);
      sc.overrideMaterial = null;
      return { px: shipDraw(o, sc, 2), expect: 'drawn' };
    },
    s_late: o => {
      // receivers compile without a casting light, then the light starts casting
      const sc = worldScene(o), sun = sc.userData.sun;
      sun.castShadow = false;
      drawN(o, sc, 1);
      sun.castShadow = true;
      sc.traverse(c => (Array.isArray(c.material) ? c.material : c.material ? [c.material] : []).forEach(m => { m.needsUpdate = true; }));
      return { px: shipDraw(o, sc, 2), expect: 'drawn' };
    },
  };
  const SH_TYPE = { s_pcf: 'pcf', s_vsm: 'vsm', s_basic: 'basic', s_pcf512: 'pcf512', s_recv1: 'pcf', s_warm: 'pcf', s_late: 'pcf' };

  // ---------- the plan (rebuilt from the results after every step) ----------
  function tries(d) {
    const r = grp(d.g), out = [];
    if (r.bad) return out;
    for (let j = r.tried + 1; j <= d.n; j++) out.push({ id: d.g + '#' + j, g: d.g, j, fresh: !d.same || j === 1, sh: SH_TYPE[d.g] || null });
    return out;
  }
  function plan() {
    const out = [{ id: 'context#1', g: 'context', j: 1, fresh: true, sh: null }];
    if (!res('context#1')) return out.concat({ id: '…', placeholder: true });
    SAFE.forEach(d => { if (!d.avail || d.avail(st)) out.push(...tries(d)); });
    out.push({ id: '=apply1', apply: 1 });
    const left = CAP - crashCount();
    if (left > 0) SHADOW.forEach(d => out.push(...tries(d)));
    out.push({ id: '=apply2', apply: 2 });
    return out;
  }
  // the safe part's reading: post (composer + bloom without shadows) and the world without shadows
  function verdictSafe() {
    const churn = isSafe('churn');
    const ns = isSafe('world_ns') && isSafe('ns_same');
    const post = isSafe('cmp0') && isSafe('cmp_same') && ns;
    return { churn, ns, post, msaa: msaaBest() };
  }
  function verdict(final) {
    const v = verdictSafe();
    let shadow = null;
    if (final && v.churn) shadow = SHIP_PREF.find(g => isSafe(g)) || null;
    const type = shadow ? SH_TYPE[shadow] : null;
    let rec = v.post ? 0 : v.ns ? (type ? 1 : 2) : 3;
    if (!v.churn) rec = Math.max(rec, 2);
    const sw = { shadow: !!type };
    if (type && type !== 'pcf') sw.shadowType = type;
    const offered = f16Best(st, 4);
    if (rec === 0 && v.msaa < offered) sw.msaa = v.msaa >= 2 ? 2 : 0;
    const shTxt = !final ? '陰影先關（還沒測）' : type ? '陰影 ' + typeName(type) + ' 每次都通過' : SHADOW.some(d => grp(d.g).tried) ? '陰影全部不穩' : '陰影沒測到';
    const cb = grp('churn').bad;
    const why = !v.churn ? '對照組（一般繪圖）' + (cb && CRASHES.has(cb.r) ? '也當機' : '失敗（' + (cb ? cb.r : '?') + '）') + '：結果不可靠，先用 nopost、不開陰影' :
      !v.ns ? '連沒陰影的世界都會當 → 省電畫質 low' :
      v.post ? '泛光（bloom）穩定、' + shTxt + ' → ' + (type ? '完整畫質（' + typeName(type) + ' 陰影）' : '用「有泛光、沒陰影」') :
      'bloom 不穩、沒陰影的世界穩定、' + shTxt + ' → nopost' + (type ? '（' + typeName(type) + ' 陰影）' : '、不開陰影');
    const fail = st.results.filter(x => x.r !== 'ok').map(x => x.id + ':' + x.r).join(' ') || null;
    return { at: st.at, rec, sw, why, fail, final: !!final };
  }
  const typeName = t => ({ pcf: 'PCF', pcf512: 'PCF 512', vsm: 'VSM', basic: 'Basic' }[t] || t);

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
      if (s.g !== 'context' && s.g !== 'churn' && s.g !== 's_recv1') { try { R.envRT = R.kit.bakeEnv(R.r); } catch (e) { R.envRT = null; } }
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
    return { done, total: done + real.filter(s => !res(s.id)).length + (real.length < p.length ? 70 : 0) };
  }
  function groupLine(d) {
    const r = grp(d.g);
    if (d.avail && st.f16 && !d.avail(st)) return '  ' + d.g.padEnd(9) + ' n/a（這顆 GPU 沒有）  ' + d.label;
    const state = !r.tried ? (crashCount() >= CAP && d.g[0] === 's' ? 'not tried (crash cap)' : '-') :
      r.bad ? (CRASHES.has(r.bad.r) ? '✗ crashed at try ' + r.bad.j : '✗ ' + r.bad.r + ' at try ' + r.bad.j) :
      r.tried >= d.n ? '✓ safe' : '…';
    return '  ' + d.g.padEnd(9) + ' ' + (r.ok + '/' + r.tried).padStart(5) + ' ok of ' + d.n + '  ' + state.padEnd(20) + ' ' + d.label;
  }
  function text() {
    load();
    if (!st) return '';
    const lines = [];
    const hist = (st.hist || []).map(h => '  （之前 ' + h + '）');
    if (!st.results.length && st.idle) return ['🧪 相容性測試 probe v' + VER + ' — not run yet（按 🧪 開始；陰影測試可能讓 GPU 當機最多 ' + CAP + ' 次）'].concat(hist).join('\n');
    const pr = progress();
    lines.push('🧪 相容性測試 probe v' + VER + ' (' + st.at + ')  ' + (st.gpu || '') + '  ' + pr.done + '/' + pr.total +
      (busy ? '  running: ' + (st.running || '…') : st.done ? '  done' : st.noctx ? '  waiting for WebGL' : '  paused — tap ▶️ to continue'));
    if (!st.done) lines.push('  先測不會當機的部分（約 1 分鐘），結論馬上套用；最後測陰影：GPU 可能當機最多 ' + CAP + ' 次（已 ' + crashCount() + ' 次），Chrome 擋 3D 時要重開 Chrome（大概 0–2 次）。');
    lines.push('  安全部分（沒陰影）:');
    SAFE.forEach(d => lines.push(groupLine(d)));
    lines.push('  陰影（每種最多 N 次，第一次當機就停）:');
    SHADOW.forEach(d => lines.push(groupLine(d)));
    const bad = st.results.filter(x => x.r !== 'ok');
    if (bad.length) lines.push('  not ok: ' + bad.map(x => x.id + ' ' + x.r + (x.ms !== undefined ? ' ' + x.ms + 'ms' : '') + (x.gl ? ' gl ' + x.gl : '') + (x.log ? ' log ' + x.log : '') + (x.note ? ' (' + x.note + ')' : '')).join(' · '));
    if (st.noctx && !busy) lines.push('  ⛔ NOCTX ×' + st.noctx.n + ' at ' + st.noctx.step + ' (' + st.noctx.msg + ') — 請把 Chrome 完全關閉再開，然後按 ▶️（不算一步，會自動再試）');
    if (st.interrupted && !busy && !st.done) lines.push('  ⚠️ 上次在「' + st.interrupted + '」時整頁當掉（已記下）；按 ▶️ 繼續');
    if (st.summary) {
      const v = st.summary, T = SkyArt.probeKit().TIERS;
      lines.push('  結論：' + v.why);
      lines.push('    = start tier ' + (v.rec === 0 && !v.sw.shadow ? 'full（post，沒陰影）' : T[v.rec]) + '  switches ' + JSON.stringify(v.sw) + (v.final ? '' : '（暫定：陰影還沒測）') + '  → 已套用，重新載入後生效');
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
