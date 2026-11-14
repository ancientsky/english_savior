/* ===== SkyProbe — 🧪 on-device graphics compatibility probe for 天空之城 (owner diagnostics) =====
   Loaded after js/sky-art.js, before js/sky.js. Kid-invisible: it only runs from the Sky debug panel
   (?skydebug=1 or a long press on the island-name pill).

   A staged bisect of the world's rendering ingredients, run in its own small canvas/context so it
   works before (or without) an adventure: plain draws → PBR → PMREM → shadows → instancing → every
   custom shader the world compiles (built by SkyArt's own factories, so the probe can't drift from
   the game) → HalfFloat / MSAA targets → bloom → the full composer → a fresh context compiling
   everything in one frame, like the game's first frame used to.
   Before each step it writes "running X" to localStorage `english_savior_sky_probe` (device-local,
   not a save key, never exported); a GPU-process crash kills every context on the page — and often
   the page — so the next load records "CRASH at X" and the run continues from the step after it.
   When the run is complete the verdict is handed to SkyArt.applyProbe(), which may only lower the
   device's starting tier (or vouch for full on a touch device when everything passed). */
const SkyProbe = (() => {
  'use strict';
  const CPU2D = { willReadFrequently: true };   // texture canvases survive a GPU crash (see js/sky-art.js)
  const KEY = 'english_savior_sky_probe';
  const VER = 1;
  const CLEAR = '255,0,255';
  let st = null, busy = false, R = null, host = null, onUpdate = null, shaderLog = [];

  // ---------- persisted progress ----------
  function load() {
    if (st) return st;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
    if (!st || st.v !== VER || !Array.isArray(st.results)) { st = null; return st; }
    // the step that was running when the page died is the step that killed it
    if (st.running) {
      st.results.push({ id: st.running, r: 'CRASH', note: 'page / GPU process died during this step' });
      st.interrupted = st.running;
      st.next = Math.max(st.next | 0, STEPS.findIndex(s => s.id === st.running) + 1);
      st.running = null;
      save();
    }
    return st;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked: this run only */ } }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rgb = px => String(px || '').split(',').map(Number);
  const isGreen = px => { const [r, g, b] = rgb(px); return g > 40 && g > r + 10 && g > b + 10; };
  const isPurple = px => { const [r, g, b] = rgb(px); return r > 60 && b > 80 && b > g + 20; };
  const passed = id => !!(st && st.results.some(x => x.id === id && x.r === 'ok'));

  // ---------- the probe's own renderer (same settings as the world's) ----------
  function makeRenderer() {
    const kit = SkyArt.probeKit();
    const cv = document.createElement('canvas');
    const W = Math.round(Math.min(window.innerWidth || 800, 900));
    const H = Math.max(360, Math.min(Math.round(W * 0.75), Math.round((window.innerHeight || 800) * 0.72)));
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
    const gl = r.getContext();
    if (!gl) throw new Error('no WebGL context');
    const o = { r, gl, cv, kit, lost: false, W, H };
    cv.addEventListener('webglcontextlost', () => { o.lost = true; });
    const caps = kit.probeCaps(gl, {});
    if (!kit.caps.gpu) kit.probeCaps(gl);   // the panel's header shows the GPU even before a world exists
    o.caps = caps;
    r.setPixelRatio(kit.pixelRatio(W, H));
    r.setSize(W, H, false);
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
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
    try { if (o.envRT) o.envRT.dispose(); o.r.dispose(); if (!o.lost) o.r.forceContextLoss(); } catch (e) { /* ignore */ }
    if (o.cv.parentNode) o.cv.remove();
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

  // ---------- scene helpers (lights / fog / env / shadows as the world sets them) ----------
  function envFor(o) {
    if (!o.envRT && passed('pmrem')) o.envRT = o.kit.bakeEnv(o.r);
    return o.envRT;
  }
  function rig(o, opt) {
    opt = opt || {};
    const k = o.kit, sc = new THREE.Scene();
    sc.fog = new THREE.Fog(k.fogBase.getHex(), 70, 420);
    sc.add(new THREE.HemisphereLight(0xd6ecff, 0x8f8a6a, 0.75));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
    sun.position.copy(k.SUN_DIR).multiplyScalar(20);
    if (opt.shadow) {
      sun.castShadow = true;
      const ms = k.isTouch ? 1024 : 2048;
      sun.shadow.mapSize.set(ms, ms);
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 });
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
    }
    sc.add(sun, sun.target);
    if (opt.env) { const e = envFor(o); if (e) { sc.environment = e.texture; sc.environmentIntensity = 0.42; } }
    return sc;
  }
  const full = o => ({ env: passed('pmrem'), shadow: passed('shadow') });
  const fullNote = o => (passed('pmrem') ? '+env' : '') + (passed('shadow') ? '+shadow' : '');
  function mesh(g, m, x, y, z) { const me = new THREE.Mesh(g, m); me.position.set(x || 0, y === undefined ? 0.8 : y, z || 0); return me; }
  function ground(sc, mat) { const g = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; sc.add(g); return g; }
  function draw(o, sc) { o.r.setRenderTarget(null); o.r.render(sc, o.cam); return readPx(o); }
  function canvasTex(color, size, opts) {
    size = size || 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d', opts === undefined ? CPU2D : opts); c.fillStyle = color; c.fillRect(0, 0, size, size);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.font = 'bold ' + Math.round(size * 0.6) + 'px sans-serif'; c.fillText('A', size * 0.28, size * 0.72);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // sentinels: does a GPU crash wipe 2D canvases on this device? (default = GPU-eligible ≥256²)
  let sentinels = null;
  function makeSentinels() {
    const mk = opts => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d', opts); c.fillStyle = '#33cc66'; c.fillRect(0, 0, 512, 512); return c; };
    sentinels = { gpu: mk(undefined), cpu: mk(CPU2D) };
  }
  function sentinelNote() {
    if (!sentinels) return '';
    const chk = c => { try { const d = c.getImageData(256, 256, 1, 1).data; return d[1] > 150 && d[3] > 200 ? 'kept' : 'WIPED'; } catch (e) { return '?'; } };
    return '2D canvas after loss: default ' + chk(sentinels.gpu) + ', cpu ' + chk(sentinels.cpu);
  }
  // the world's custom materials, one builder each (normal-quality PBR variants)
  const WORLD = {
    prop(o, sc) {
      const k = o.kit, B = new k.Batch(), rng = k.mulberry(7);
      k.K.oak(B, rng, 0, 0, 0.9, 0x5cb34c);
      B.at(0, 0, 0, 0, 1);
      B.part(k.geo('sphere'), 1.2, 0.6, 0.6, 0.35, 0.35, 0.35, 0xffd166, { glow: 1.6 });
      const m = B.mesh(k.MK.prop(true), true);
      sc.add(m);
      // exercise the see-through discard path (uOccDist > 0) the way the world does mid-adventure
      k.OCC.uOccDist.value = 6; k.OCC.uOccScr.value.set(0.5, 0.5); k.OCC.uOccRes.value.set(o.gl.drawingBufferWidth, o.gl.drawingBufferHeight);
      return m;
    },
    grass(o, sc) {
      const k = o.kit, im = new THREE.InstancedMesh(k.getTuftGeo(), k.MK.grass(true), 60);
      const m4 = new THREE.Matrix4(), rng = k.mulberry(3);
      for (let i = 0; i < 60; i++) { m4.makeScale(3, 3, 3).setPosition((rng() - 0.5) * 4, 0, (rng() - 0.5) * 4 + 1); im.setMatrixAt(i, m4); }
      im.receiveShadow = true;
      sc.add(im);
      return im;
    },
    occ(o, sc) {
      const k = o.kit;
      const m = mesh(k.geo('rbox'), k.MK.occ({ color: 0xc9a070, map: k.TEX.rockTex, emissive: new THREE.Color(0x553300), emissiveIntensity: 1.6 }, true), -1.4, 0.6, 0.5);
      m.scale.setScalar(1.1); m.castShadow = true; sc.add(m); return m;
    },
    top(o, sc) {
      const k = o.kit, t = canvasTex('#5cbf54', 512);
      const mat = k.newTopMat({ map: t, emissiveMap: canvasTex('#000000'), emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.6, roughness: 0.92 }, 4, true);
      return ground(sc, mat);
    },
    water(o, sc) {
      const k = o.kit, m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), k.MK.water(true));
      m.rotation.x = -Math.PI / 2; m.position.set(1.4, 0.04, 1.2); m.receiveShadow = true; sc.add(m); return m;
    },
    cloud(o, sc) {
      const k = o.kit, rng = k.mulberry(11), im = new THREE.InstancedMesh(k.cloudGeometry(rng), k.MK.cloud(true), 6);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 6; i++) { m4.makeScale(0.9, 0.7, 0.9).setPosition(-3 + i * 1.2, 2.6 + (i % 2) * 0.4, -2); im.setMatrixAt(i, m4); }
      im.castShadow = true;
      sc.add(im); return im;
    },
    sky(o, sc, stars) {
      const k = o.kit, u = k.skyUniforms();
      if (stars) { u.uStars.value = 1; u.uNebula.value = 0.9; }
      const d = new THREE.Mesh(new THREE.SphereGeometry(60, 40, 20), k.skyMat(u));
      d.renderOrder = -10; d.frustumCulled = false; sc.add(d); return d;
    },
    sea(o, sc) {
      const k = o.kit, u = k.seaUniforms();
      u.uLava.value = 0.5;
      const g = new THREE.PlaneGeometry(200, 200); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, k.seaMat(u)); m.position.y = -0.05; m.renderOrder = -5; sc.add(m); return m;
    },
    fall(o, sc) {
      const m = mesh(new THREE.PlaneGeometry(1.6, 3.2), o.kit.newFallMat(), 0.4, 1.2, 0.8); m.renderOrder = 2; sc.add(m); return m;
    },
    aurora(o, sc) {
      const m = mesh(new THREE.PlaneGeometry(5, 3, 24, 1), o.kit.newAuroraMat(), 0, 1.6, -0.5); sc.add(m); return m;
    },
    lava(o, sc) {
      const cg = new THREE.CircleGeometry(1.3, 36);
      cg.setAttribute('uv2s', cg.attributes.uv.clone());
      const m = new THREE.Mesh(cg, o.kit.newLavaMat()); m.rotation.x = -Math.PI / 2; m.position.set(-1.2, 0.08, 1.6); sc.add(m); return m;
    },
    points(o, sc) {
      const k = o.kit, n = 80, arr = new Float32Array(n * 3), rng = k.mulberry(5);
      for (let i = 0; i < n * 3; i++) arr[i] = (rng() - 0.5) * 3 + (i % 3 === 1 ? 1 : 0);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      sc.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.3, map: k.TEX.dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      sc.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, map: k.TEX.dot, transparent: true, opacity: 0.45, depthWrite: false })));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex('#3a6ee8'), transparent: true, depthWrite: false }));
      sp.position.set(0, 0.8, 0); sp.scale.set(1.6, 1.6, 1); sc.add(sp);
      return sp;
    },
    swirl(o, sc) {
      const m = mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ map: canvasTex('#ffffff', 256), color: 0xa77bff, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
      m.renderOrder = 1; sc.add(m); return m;
    },
    avatar(o, sc) {   // hero / NPC / pet bodies: plain PBR + flat colours, a basic-material face
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x14a3a3, roughness: 0.6 }), 0, 0.9, 1.5));
      g.add(mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd9b0, roughness: 0.6, flatShading: true }), 0, 1.6, 1.5));
      g.add(mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: 0x222222 }), 0.1, 1.62, 1.86));
      g.traverse(c => { if (c.isMesh) c.castShadow = true; });
      sc.add(g); return g;
    },
  };
  // the whole world's material set in one scene (what the first frame of an adventure draws)
  function worldScene(o, opt) {
    const sc = rig(o, opt);
    ['sky', 'sea', 'top', 'prop', 'grass', 'occ', 'water', 'cloud', 'fall', 'aurora', 'lava', 'points', 'swirl', 'avatar'].forEach(n => WORLD[n](o, sc));
    return sc;
  }
  function single(name, opt) {
    return o => {
      const sc = rig(o, opt === 'full' ? full(o) : opt);
      WORLD[name](o, sc);
      const px = draw(o, sc);
      o.kit.OCC.uOccDist.value = 0;
      return { px, expect: 'drawn', note: opt === 'full' ? fullNote(o) : '' };
    };
  }
  function blit(o, tex) {
    const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, depthTest: false })));
    o.r.setRenderTarget(null);
    o.r.render(sc, cam);
    return readPx(o);
  }
  function fbStatus(o, rt) {
    o.r.setRenderTarget(rt);
    const st2 = o.gl.checkFramebufferStatus(o.gl.FRAMEBUFFER);
    o.r.setRenderTarget(null);
    return st2 === o.gl.FRAMEBUFFER_COMPLETE ? '' : 'fb 0x' + st2.toString(16);
  }
  function rtStep(opts) {
    return o => {
      const pr = o.r.getPixelRatio(), w = Math.round(o.W * pr), h = Math.round(o.H * pr);
      const rt = new THREE.WebGLRenderTarget(w, h, opts(o));
      const sc = rig(o, full(o)); WORLD.sky(o, sc); WORLD.prop(o, sc); WORLD.top(o, sc);
      const bad = fbStatus(o, rt);
      o.r.setRenderTarget(rt); o.r.render(sc, o.cam); o.r.setRenderTarget(null);
      const px = blit(o, rt.texture);
      o.kit.OCC.uOccDist.value = 0;
      rt.dispose();
      return { px, expect: 'drawn', note: [rt.width + '×' + rt.height, opts(o).samples ? opts(o).samples + '× MSAA' : '', bad].filter(Boolean).join(' ') };
    };
  }
  function f16Samples(o) { return (o.caps.f16Samples || []).filter(n => n <= 4).reduce((a, n) => Math.max(a, n), 0); }
  function composerStep(samples, scene) {
    return o => {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: samples(o) });
      const c = new THREE.EffectComposer(o.r, rt);
      c.setPixelRatio(o.r.getPixelRatio());
      c.setSize(o.W, o.H);
      const sc = scene(o);
      c.addPass(new THREE.RenderPass(sc, o.cam));
      c.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(o.W, o.H), 0.32, 0.5, 1.0));
      c.addPass(new THREE.OutputPass());
      c.render(0.016);
      const px = readPx(o);
      o.kit.OCC.uOccDist.value = 0;
      c.dispose();
      return { px, expect: 'drawn', note: (samples(o) ? samples(o) + '× MSAA' : 'no MSAA') + ' ' + fullNote(o) };
    };
  }
  // step list: id, what it adds, and the tier that avoids it if it fails (null = no tier does)
  const STEPS = [
    { id: 'context', rec: null, run: o => { st.gpu = o.caps.gpu; return { note: 'WebGL' + (o.caps.webgl2 ? '2' : '1') + ' f16 samples [' + (o.caps.f16Samples || []).join(',') + ']' }; } },
    { id: 'clear', rec: null, run: o => { o.r.setRenderTarget(null); o.r.clear(); return { px: readPx(o), expect: 'clear' }; } },
    { id: 'basic', rec: null, run: o => { const sc = new THREE.Scene(); sc.add(mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x33cc66 }))); return { px: draw(o, sc), expect: 'drawn' }; } },
    // 英語帝國's known-good recipe on this phone: Lambert + canvas textures + PCF shadows, no tone mapping
    { id: 'empire', rec: null, run: o => {
      const sc = rig(o, { shadow: true }), tm = o.r.toneMapping;
      const b = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: 0xffffff, map: canvasTex('#c9a070', 128) }));
      b.castShadow = true; sc.add(b);
      ground(sc, new THREE.MeshLambertMaterial({ color: 0x6faf52, map: canvasTex('#88cc66', 256) }));
      o.r.toneMapping = THREE.NoToneMapping;
      const px = draw(o, sc);
      o.r.toneMapping = tm;
      return { px, expect: 'drawn', note: 'Lambert + canvas map + PCF (英語帝國 baseline)' };
    } },
    { id: 'lambert', rec: null, run: o => { const sc = rig(o); sc.add(mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshLambertMaterial({ color: 0x5cb34c }))); return { px: draw(o, sc), expect: 'drawn' }; } },
    { id: 'standard', rec: 3, run: o => { const sc = rig(o); sc.add(mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0x5cb34c, roughness: 0.6 }))); return { px: draw(o, sc), expect: 'drawn' }; } },
    { id: 'pmrem', rec: 3, run: o => {
      o.envRT = o.kit.bakeEnv(o.r);
      const sc = rig(o); sc.environment = o.envRT.texture; sc.environmentIntensity = 0.42;
      sc.add(mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.5 })));
      return { px: draw(o, sc), expect: 'drawn', note: 'sky shader → PMREM (HalfFloat cube-UV)' };
    } },
    { id: 'shadow', rec: 2, run: o => {
      const sc = rig(o, { shadow: true, env: passed('pmrem') });
      const b = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9a070 }));
      b.castShadow = true; b.receiveShadow = true; sc.add(b);
      ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 }));
      return { px: draw(o, sc), expect: 'drawn', note: 'PCF ' + (o.kit.isTouch ? 1024 : 2048) };
    } },
    { id: 'instanced', rec: 3, run: o => { const sc = rig(o, full(o)); WORLD.cloud(o, sc); const im = sc.children[sc.children.length - 1]; im.position.set(0.6, -1.9, 2); return { px: draw(o, sc), expect: 'drawn', note: 'clouds ' + fullNote(o) }; } },
    { id: 'sky', rec: null, run: o => { const sc = new THREE.Scene(); WORLD.sky(o, sc); return { px: draw(o, sc), expect: 'drawn', note: 'day' }; } },
    { id: 'sky_stars', rec: null, run: o => { const sc = new THREE.Scene(); WORLD.sky(o, sc, true); return { px: draw(o, sc), expect: 'drawn', note: 'galaxy: stars + nebula noise' }; } },
    { id: 'sea', rec: null, run: o => { const sc = new THREE.Scene(); WORLD.sea(o, sc); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn', note: 'cloud + lava sea' }; } },
    { id: 'prop', rec: 3, run: single('prop', 'full') },
    { id: 'grass', rec: 3, run: single('grass', 'full') },
    { id: 'occ', rec: 3, run: o => { const sc = rig(o, full(o)); WORLD.occ(o, sc).position.set(0, 0.8, 0); return { px: draw(o, sc), expect: 'drawn', note: 'matOf: map + emissive + see-through patch ' + fullNote(o) }; } },
    // the two materials that came back black / invisible after the phone's context restore: if these
    // pass here, they are fine on a fresh context (the restore lost their canvas pixels)
    { id: 'island_top', rec: 3, run: o => { const sc = rig(o, full(o)); WORLD.top(o, sc); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'green', note: '512² painted map + emissive map + detail noise ' + fullNote(o) }; } },
    { id: 'water', rec: 3, run: o => { const sc = rig(o, full(o)); WORLD.water(o, sc).position.set(0, 0.04, 2); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn', note: fullNote(o) }; } },
    { id: 'fall', rec: null, run: o => { const sc = rig(o); WORLD.fall(o, sc); sc.children[sc.children.length - 1].position.set(0, 0.8, 0); return { px: draw(o, sc), expect: 'drawn', note: 'waterfall' }; } },
    { id: 'aurora', rec: null, run: single('aurora') },
    { id: 'lava', rec: null, run: o => { const sc = rig(o); WORLD.lava(o, sc).position.set(0, 0.08, 2); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn' }; } },
    { id: 'points', rec: null, run: single('points') },
    { id: 'portal_swirl', rec: null, run: o => { const sc = rig(o); WORLD.swirl(o, sc); return { px: draw(o, sc), expect: 'purple', note: '256² canvas map, transparent, double-sided' }; } },
    { id: 'avatar', rec: 3, run: o => { const sc = rig(o, full(o)); WORLD.avatar(o, sc); sc.children[sc.children.length - 1].position.set(0, -0.4, -1.5); return { px: draw(o, sc), expect: 'drawn', note: fullNote(o) }; } },
    { id: 'lowpath', rec: null, run: o => {
      // the low tier's materials: Lambert with the same sway/glow/occlusion patches, no env, no shadows
      const k = o.kit, sc = rig(o);
      const [pm, gm, om] = k.asLow(() => [k.MK.prop(), k.MK.grass(), k.MK.occ({ color: 0xc9a070, map: k.TEX.rockTex })]);
      const B = new k.Batch(); k.K.oak(B, k.mulberry(7), 0, 0, 0.9, 0x5cb34c); sc.add(B.mesh(pm, false));
      const im = new THREE.InstancedMesh(k.getTuftGeo(), gm, 20); const m4 = new THREE.Matrix4();
      for (let i = 0; i < 20; i++) { m4.makeScale(3, 3, 3).setPosition(i * 0.2 - 2, 0, 1); im.setMatrixAt(i, m4); }
      sc.add(im); sc.add(mesh(k.geo('rbox'), om, -1.4, 0.6, 0.5));
      return { px: draw(o, sc), expect: 'drawn', note: 'Lambert' };
    } },
    { id: 'world', rec: 2, run: o => { const sc = worldScene(o, full(o)); const px = draw(o, sc); o.kit.OCC.uOccDist.value = 0; return { px, expect: 'drawn', note: 'every world material in one frame ' + fullNote(o) }; } },
    { id: 'rt16', rec: 1, run: rtStep(() => ({ type: THREE.HalfFloatType })) },
    { id: 'msaa16', rec: 1, run: rtStep(o => ({ type: THREE.HalfFloatType, samples: f16Samples(o) || 4 })) },
    { id: 'msaa8', rec: null, run: o => {   // the pet-collection thumbnails (every tier)
      const rt = new THREE.WebGLRenderTarget(160, 160, { samples: 4 }), buf = new Uint8Array(160 * 160 * 4);
      const sc = rig(o); WORLD.avatar(o, sc);
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.2, 4.5); cam.lookAt(0, 1.2, 1.5);
      o.r.setRenderTarget(rt); o.r.setClearColor(0x000000, 0); o.r.clear(); o.r.render(sc, cam);
      o.r.readRenderTargetPixels(rt, 0, 0, 160, 160, buf);
      o.r.setRenderTarget(null); o.r.setClearColor(0xff00ff, 1);
      rt.dispose();
      const i = (80 * 160 + 80) * 4;
      return { px: buf[i] + ',' + buf[i + 1] + ',' + buf[i + 2], note: 'pet thumbnail RT' };
    } },
    { id: 'bloom', rec: 1, run: composerStep(() => 0, o => { const sc = rig(o); WORLD.sky(o, sc); WORLD.prop(o, sc); return sc; }) },
    { id: 'composer', rec: 1, run: composerStep(f16Samples, o => worldScene(o, full(o))) },
    // a brand-new context compiling every program of a full-quality frame at once — what the
    // game's first frame did before the staged warm-up
    { id: 'burst', rec: 1, fresh: true, run: composerStep(f16Samples, o => worldScene(o, { env: true, shadow: true })) },
  ];

  // ---------- running ----------
  async function runOne(i) {
    const s = STEPS[i];
    st.running = s.id; st.next = i; save();
    update();
    await sleep(60);   // paint "running X" before the GPU gets busy
    if (s.fresh) teardown();
    if (!R) {
      try { R = makeRenderer(); } catch (e) {
        st.results.push({ id: s.id, r: 'NOCTX', note: String(e && e.message || e) + ' — Chrome may have blocked WebGL here after a GPU crash: close Chrome completely, reopen, continue' });
        st.running = null; save();
        return 'stop';
      }
      if (s.fresh && passed('pmrem')) R.envRT = R.kit.bakeEnv(R.r);   // bake outside the timed burst, like the warm-up does
    }
    const o = R;
    shaderLog = [];
    drain(o.gl);
    const t0 = performance.now();
    let out = {}, exc = null;
    try { out = s.run(o) || {}; } catch (e) { exc = e; }
    const ms = Math.round(performance.now() - t0);
    const gle = o.gl.isContextLost() ? [] : drain(o.gl);
    await sleep(350);   // a dying GPU process takes a moment to be noticed
    const lost = o.lost || o.gl.isContextLost();
    let r = 'ok';
    if (lost) r = 'LOST';
    else if (shaderLog.length) r = 'FAIL';
    else if (exc) r = 'ERR';
    else if (gle.length) r = 'GLERR';
    else if (out.expect && out.expect !== 'clear' && out.px === CLEAR) r = 'BLANK';
    else if (out.expect === 'green' && !isGreen(out.px)) r = 'DARK';
    else if (out.expect === 'purple' && !isPurple(out.px)) r = 'DARK';
    else if (out.expect === 'clear' && out.px !== CLEAR) r = 'ODD';
    const res = { id: s.id, r, ms };
    if (out.px) res.px = out.px;
    const note = [out.note, exc && String(exc && exc.message || exc).slice(0, 160)].filter(Boolean).join(' ');
    if (note) res.note = note;
    if (gle.length) res.gl = gle.join(' ');
    if (shaderLog.length) res.log = shaderLog.join(' || ').slice(0, 800);
    st.results.push(res);
    st.running = null; st.next = i + 1; save();
    if (lost) { res.note = [res.note, sentinelNote()].filter(Boolean).join(' · '); save(); teardown(); await sleep(1500); }
    return r;
  }
  function verdict() {
    const bad = st.results.filter(x => x.r !== 'ok');
    let rec = null;
    const hard = [];
    bad.forEach(x => {
      const s = STEPS.find(q => q.id === x.id);
      if (!s) return;
      if (s.rec === null) hard.push(x.id); else rec = Math.max(rec === null ? 0 : rec, s.rec);
    });
    return { at: st.at, fail: bad.map(x => x.id + ':' + x.r).join(' ') || null, rec, hard, allOk: !bad.length };
  }
  async function run(el, cb) {
    if (busy) return;
    host = el; onUpdate = cb;
    load();
    if (!st || st.done) st = { v: VER, at: new Date().toISOString().slice(0, 16).replace('T', ' '), results: [], next: 0, running: null };
    st.interrupted = null;
    busy = true;
    if (!sentinels) makeSentinels();
    update();
    try {
      for (let i = st.next | 0; i < STEPS.length; i++) {
        if (await runOne(i) === 'stop') break;
        update();
      }
      if ((st.next | 0) >= STEPS.length) {
        st.done = true;
        st.summary = verdict();
        save();
        SkyArt.applyProbe({ at: st.summary.at, fail: st.summary.fail, rec: st.summary.rec, allOk: st.summary.allOk });
      }
    } finally {
      teardown();
      busy = false;
      if (host) host.innerHTML = '';
      update();
    }
  }
  function update() { if (onUpdate) onUpdate(); }

  // ---------- panel text ----------
  function text() {
    load();
    if (!st) return '';
    const T = SkyArt.probeKit().TIERS;
    const lines = ['🧪 相容性測試 probe v' + VER + ' (' + st.at + ')  ' + (st.gpu || '') + '  ' + st.results.length + '/' + STEPS.length +
      (busy ? '  running: ' + (st.running || '…') : st.done ? '  done' : '  paused — tap ▶️ to continue')];
    st.results.forEach(x => {
      const n = String(STEPS.findIndex(s => s.id === x.id) + 1).padStart(2, '0');
      lines.push('  ' + n + ' ' + x.id.padEnd(10) + ' ' + x.r.padEnd(5) + (x.ms !== undefined ? String(x.ms).padStart(5) + 'ms' : '       ') +
        (x.px ? ' px ' + x.px : '') + (x.note ? '  ' + x.note : '') + (x.gl ? '  gl ' + x.gl : '') + (x.log ? '\n       log: ' + x.log : ''));
    });
    if (st.interrupted && !busy) lines.push('  ⚠️ 上次在「' + st.interrupted + '」時整頁當掉；按 ▶️ 從下一步繼續');
    if (st.done && st.summary) {
      const v = st.summary;
      lines.push('  結論: ' + (v.allOk ? 'all steps passed (touch devices may now start at full)'
        : 'failed ' + v.fail + (v.rec !== null ? ' → start tier ≥ ' + T[v.rec] : '') + (v.hard.length ? '; no tier avoids: ' + v.hard.join(', ') + ' (needs a shader fix)' : '')));
    }
    return lines.join('\n');
  }
  function label() {
    load();
    if (busy) return '🧪 測試中…';
    if (!st) return '🧪 相容性測試';
    if (st.done) return '🔁 重新測試';
    return '▶️ 繼續測試（' + Math.min(STEPS.length, (st.next | 0) + 1) + '/' + STEPS.length + '）';
  }
  function interrupted() { load(); return !!(st && st.interrupted && !st.done); }

  return { run, text, label, busy: () => busy, interrupted, steps: () => STEPS.map(s => s.id), reset: () => { st = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } } };
})();
