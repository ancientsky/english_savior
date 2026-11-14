/* ===== SkyProbe — 🧪 on-device graphics compatibility probe for 天空之城 (owner diagnostics) =====
   Loaded after js/sky-art.js, before js/sky.js. Kid-invisible: it only runs from the Sky debug panel
   (?skydebug=1 or a long press on the island-name pill).

   v2 runs in its own small canvas/context, so it works before (or without) an adventure:
   1. baseline: plain draws → PBR → PMREM → shadows → instancing → every custom world material,
      built by SkyArt's own factories (probeKit) so the probe can't drift from the game;
   2. a bisect of the merged-prop material (the v1 run on a PowerVR phone lost the GPU on it):
      each ingredient alone, then a build-up in "most worth keeping first" order — the ingredient
      whose addition kills the GPU is switched off and the build-up carries on without it. Every
      bisect step gets a fresh context, so no step inherits another one's programs or memory;
   3. the world / render targets / composer with the switches applied (composer split into
      no-MSAA / 2× / 4× without props, then with them);
   → the verdict (a start tier + feature switches) is handed to SkyArt.applyProbe() here, BEFORE
   4. informational steps that may still crash: a whole-world one-frame burst on a fresh context,
      and a "with it" confirmation (the shipped prop material back on, in the world).
   Before each step it writes "running X" to localStorage `english_savior_sky_probe` (device-local,
   not a save key, never exported); a GPU-process crash that kills the page is recorded on the next
   load as "CRASH at X" and the plan adapts. When Chrome refuses to create a context at all after a
   crash (NOCTX) nothing is counted: the panel asks for a Chrome restart and retries by itself. */
const SkyProbe = (() => {
  'use strict';
  const CPU2D = { willReadFrequently: true };   // texture canvases survive a GPU crash (see js/sky-art.js)
  const KEY = 'english_savior_sky_probe';
  const VER = 2;
  const CLEAR = '255,0,255';
  let st = null, busy = false, R = null, host = null, onUpdate = null, shaderLog = [];
  let retryT = 0, retryN = 0;

  // ---------- persisted progress ----------
  function compact(o) {   // an earlier run, kept as one line per run in the panel
    const seen = [];
    (o.results || []).forEach(x => {
      const last = seen[seen.length - 1];
      if (last && last.id === x.id && last.r === x.r) last.n++;
      else seen.push({ id: x.id, r: x.r, n: 1 });
    });
    return { v: o.v, at: o.at, gpu: o.gpu, txt: seen.map(x => x.id + ' ' + x.r + (x.n > 1 ? '×' + x.n : '')).join(' · ').slice(0, 1600),
      verdict: o.summary ? 'tier ' + (o.summary.rec === null || o.summary.rec === undefined ? '-' : o.summary.rec) + (o.summary.sw ? ' sw ' + JSON.stringify(o.summary.sw) : '') : '' };
  }
  function fresh(prev) { return { v: VER, at: new Date().toISOString().slice(0, 16).replace('T', ' '), results: [], running: null, prev: prev || null }; }
  function load() {
    if (st) return st;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (raw && raw.v === VER && Array.isArray(raw.results)) st = raw;
    else if (raw && Array.isArray(raw.results) && raw.results.length) { st = fresh(compact(raw)); st.idle = true; save(); }
    else return null;
    // the step that was running when the page died is the step that killed it
    if (st.running) {
      st.results.push({ id: st.running, r: 'CRASH', note: 'page / GPU process died during this step' });
      st.interrupted = st.running;
      st.running = null;
      // the verdict was stored before the informational tail: a crash in the last step ends the run
      if (st.applied && !plan().some(p => !p.placeholder && !p.apply && !res(p.id))) st.done = true;
      save();
    }
    return st;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked: this run only */ } }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rgb = px => String(px || '').split(',').map(Number);
  const isGreen = px => { const [r, g, b] = rgb(px); return g > 40 && g > r + 10 && g > b + 10; };
  const isPurple = px => { const [r, g, b] = rgb(px); return r > 60 && b > 80 && b > g + 20; };
  const res = id => st && st.results.find(x => x.id === id);
  const passed = id => { const x = res(id); return !!(x && x.r === 'ok'); };
  const failed = id => { const x = res(id); return !!(x && x.r !== 'ok'); };

  // ---------- the probe's own renderer (same settings as the world's) ----------
  function makeRenderer() {
    const kit = SkyArt.probeKit();
    const cv = document.createElement('canvas');
    const W = Math.round(Math.min(window.innerWidth || 800, 900));
    const H = Math.max(360, Math.min(Math.round(W * 0.75), Math.round((window.innerHeight || 800) * 0.72)));
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
    const gl = r.getContext();
    if (!gl) throw new Error('no WebGL context');
    const o = { r, gl, cv, kit, lost: false, W, H, scenes: [], junk: [] };
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
    try { if (o.envRT && !o.lost) o.envRT.dispose(); o.r.dispose(); if (!o.lost) o.r.forceContextLoss(); } catch (e) { /* ignore */ }
    if (o.cv.parentNode) o.cv.remove();
  }
  // free everything a step made, so steps sharing a context don't pile up GPU memory
  // (v1 never did: every step's shadow map, targets and textures stayed alive)
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

  // ---------- scene helpers (lights / fog / env / shadows as the world sets them) ----------
  function envFor(o) {
    if (!o.envRT && passed('pmrem')) o.envRT = o.kit.bakeEnv(o.r);
    return o.envRT;
  }
  function rig(o, opt) {
    opt = opt || {};
    const k = o.kit, sc = new THREE.Scene();
    o.scenes.push(sc);
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
  const envOk = () => passed('pmrem');
  const shadowOk = () => passed('shadow');
  const full = () => ({ env: envOk(), shadow: shadowOk() });
  const fullNote = opt => { opt = opt || full(); return (opt.env ? '+env' : '') + (opt.shadow ? '+shadow' : ''); };
  function mesh(g, m, x, y, z) { const me = new THREE.Mesh(g, m); me.position.set(x || 0, y === undefined ? 0.8 : y, z || 0); return me; }
  function ground(sc, mat) { const g = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), mat); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; sc.add(g); return g; }
  function draw(o, sc) { o.r.setRenderTarget(null); o.r.render(sc, o.cam); return readPx(o); }
  function canvasTex(color, size, opts) {
    size = size || 64;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d', opts === undefined ? CPU2D : opts); c.fillStyle = color; c.fillRect(0, 0, size, size);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.font = 'bold ' + Math.round(size * 0.6) + 'px sans-serif'; c.fillText('A', size * 0.28, size * 0.72);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    made.push(t);
    return t;
  }
  let made = [];   // textures this probe painted (the kit's own textures and cached geometries are
                   // shared with a running world: disposing them would make its renderer re-upload)
  // the see-through cutout really discarding: a hole over the test tree's crown with every fragment
  // counted as "in front of the hero" (v1's prop step barely hit the discard; its occ step never did)
  function occLive(o) {
    const O = o.kit.OCC;
    O.uOccDist.value = 50; O.uOccScr.value.set(0.5, 0.8); O.uOccR.value = 0.16;
    O.uOccRes.value.set(o.gl.drawingBufferWidth, o.gl.drawingBufferHeight);
  }
  function occOff(o) { const O = o.kit.OCC; O.uOccDist.value = 0; O.uOccScr.value.set(0.5, 0.5); O.uOccR.value = 0.12; }
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

  // ---------- prop ingredients ----------
  // a prop config: { vc, env, shadow, recv, cast, glow, sway, occ: '' | 'on' (compiled, hole off) |
  // 'live' (hole really discarding) | 'late' (live, discard after the colour is written) }
  const ING = ['vc', 'env', 'shadow', 'recv', 'cast', 'glow', 'sway', 'occ'];
  const cfgId = c => 'p:' + (ING.filter(k => c[k]).map(k => (k === 'occ' ? 'occ' + (c.occ === 'on' ? '' : '.' + c.occ) : k)).join('+') || 'bare');
  const SHIPPED = () => ({ vc: true, env: envOk(), shadow: shadowOk(), recv: shadowOk(), cast: shadowOk(), glow: true, sway: true, occ: 'live' });
  const occMode = c => (!c || !c.occ ? 'off' : c.occ === 'late' ? 'late' : 'on');

  // the world's custom materials, one builder each (normal-quality PBR variants)
  const WORLD = {
    prop(o, sc, cfg) {
      const k = o.kit, B = new k.Batch(), rng = k.mulberry(7);
      k.K.oak(B, rng, 0, 0, 0.9, 0x5cb34c);
      B.at(0, 0, 0, 0, 1);
      B.part(k.geo('sphere'), 1.2, 0.6, 0.6, 0.35, 0.35, 0.35, 0xffd166, { glow: 1.6 });
      const m = B.mesh(k.MK.prop(true, { vc: !!cfg.vc, sway: !!cfg.sway, glow: !!cfg.glow, occ: occMode(cfg) }), true);
      m.castShadow = !!cfg.cast; m.receiveShadow = !!cfg.recv;
      sc.add(m);
      if (cfg.occ === 'live' || cfg.occ === 'late') occLive(o);
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
    occ(o, sc, mode) {
      const k = o.kit;
      const m = mesh(k.geo('rbox'), k.MK.occ({ color: 0xc9a070, map: k.TEX.rockTex, emissive: new THREE.Color(0x553300), emissiveIntensity: 1.6 }, true, mode || 'on'), -1.4, 0.6, 0.5);
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
  // the whole world's material set in one scene (what the first frame of an adventure draws);
  // `cfg` = the prop config to draw (null: no props), `occ` = see-through mode of the matOf materials
  function worldScene(o, opt, cfg, occ) {
    const sc = rig(o, opt);
    ['sky', 'sea', 'top', 'grass', 'water', 'cloud', 'fall', 'aurora', 'lava', 'points', 'swirl', 'avatar'].forEach(n => WORLD[n](o, sc));
    WORLD.occ(o, sc, occ);
    if (occ && occ !== 'off') occLive(o);
    if (cfg) WORLD.prop(o, sc, cfg);
    return sc;
  }
  function single(name) {
    return o => { const sc = rig(o); WORLD[name](o, sc); return { px: draw(o, sc), expect: 'drawn' }; };
  }
  // one prop config on the default framebuffer (what nopost / noshadow draw), with a plain PBR
  // caster + ground when shadows are on so the prop's receive / cast paths have something to do
  function propStep(cfg) {
    return o => {
      const opt = { env: !!cfg.env, shadow: !!cfg.shadow };
      const sc = rig(o, opt);
      WORLD.prop(o, sc, cfg);
      if (cfg.shadow) {
        const box = mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xc9a070 }), 1.6, 3.6, 0.6);
        box.castShadow = true; sc.add(box);
        ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 }));
      }
      return { px: draw(o, sc), expect: 'drawn' };
    };
  }
  function blit(o, tex) {
    const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    o.scenes.push(sc);
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
  function rtStep(opts, cfg) {
    return o => {
      const pr = o.r.getPixelRatio(), w = Math.round(o.W * pr), h = Math.round(o.H * pr);
      const ro = opts(o), rt = new THREE.WebGLRenderTarget(w, h, ro);
      o.junk.push(rt);
      const sc = rig(o, wopt(cfg)); WORLD.sky(o, sc); if (cfg) WORLD.prop(o, sc, cfg); WORLD.top(o, sc);
      const bad = fbStatus(o, rt);
      o.r.setRenderTarget(rt); o.r.render(sc, o.cam); o.r.setRenderTarget(null);
      const px = blit(o, rt.texture);
      return { px, expect: 'drawn', note: [rt.width + '×' + rt.height, ro.samples ? ro.samples + '× MSAA' : '', bad, cfg ? cfgId(cfg) : 'no props'].filter(Boolean).join(' ') };
    };
  }
  const f16 = o => (o.caps.f16Samples || []).filter(n => n <= 4);
  const f16Max = o => f16(o).reduce((a, n) => Math.max(a, n), 0);
  function composerStep(samples, scene, label) {
    return o => {
      const n = samples(o);
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: n });
      const c = new THREE.EffectComposer(o.r, rt);
      c.setPixelRatio(o.r.getPixelRatio());
      c.setSize(o.W, o.H);
      const sc = scene(o);
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(o.W, o.H), 0.32, 0.5, 1.0);
      c.addPass(new THREE.RenderPass(sc, o.cam));
      c.addPass(bloom);
      c.addPass(new THREE.OutputPass());
      o.junk.push(c, bloom);
      c.render(0.016);
      return { px: readPx(o), expect: 'drawn', note: (n ? n + '× MSAA' : 'no MSAA') + ' ' + (label || '') };
    };
  }

  // ---------- the plan (rebuilt from the results after every step) ----------
  // rec: the tier that avoids a failure (null = none: needs a shader fix), 'env' = switch env off
  const BASE = [
    { id: 'context', rec: null, run: o => { st.gpu = o.caps.gpu; return { note: 'WebGL' + (o.caps.webgl2 ? '2' : '1') + ' f16 samples [' + (o.caps.f16Samples || []).join(',') + ']' }; } },
    { id: 'clear', rec: null, run: o => { o.r.setRenderTarget(null); o.r.clear(); return { px: readPx(o), expect: 'clear' }; } },
    { id: 'basic', rec: null, run: o => { const sc = rig(o); sc.add(mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x33cc66 }))); return { px: draw(o, sc), expect: 'drawn' }; } },
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
    { id: 'pmrem', rec: 'env', run: o => {
      o.envRT = o.kit.bakeEnv(o.r);
      const sc = rig(o); sc.environment = o.envRT.texture; sc.environmentIntensity = 0.42;
      sc.add(mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.5 })));
      return { px: draw(o, sc), expect: 'drawn', note: 'sky shader → PMREM (HalfFloat cube-UV)' };
    } },
    { id: 'shadow', rec: 2, run: o => {
      const sc = rig(o, { shadow: true, env: envOk() });
      const b = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xc9a070 }));
      b.castShadow = true; b.receiveShadow = true; sc.add(b);
      ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 }));
      return { px: draw(o, sc), expect: 'drawn', note: 'PCF ' + (o.kit.isTouch ? 1024 : 2048) };
    } },
    { id: 'instanced', rec: 3, run: o => { const sc = rig(o, full()); WORLD.cloud(o, sc).position.set(0.6, -1.9, 2); return { px: draw(o, sc), expect: 'drawn', note: 'clouds ' + fullNote() }; } },
    { id: 'sky', rec: null, run: o => { const sc = rig(o); WORLD.sky(o, sc); return { px: draw(o, sc), expect: 'drawn', note: 'day' }; } },
    { id: 'sky_stars', rec: null, run: o => { const sc = rig(o); WORLD.sky(o, sc, true); return { px: draw(o, sc), expect: 'drawn', note: 'galaxy: stars + nebula noise' }; } },
    { id: 'sea', rec: null, run: o => { const sc = rig(o); WORLD.sea(o, sc); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn', note: 'cloud + lava sea' }; } },
    { id: 'grass', rec: 3, run: o => { const sc = rig(o, full()); WORLD.grass(o, sc); return { px: draw(o, sc), expect: 'drawn', note: fullNote() }; } },
    { id: 'occ', rec: 3, run: o => { const sc = rig(o, full()); WORLD.occ(o, sc).position.set(0, 0.8, 0); return { px: draw(o, sc), expect: 'drawn', note: 'matOf: map + emissive + see-through compiled, hole off ' + fullNote() }; } },
    // the two materials that came back black / invisible after the phone's context restore
    { id: 'island_top', rec: 3, run: o => { const sc = rig(o, full()); WORLD.top(o, sc); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'green', note: '512² painted map + emissive map + detail noise ' + fullNote() }; } },
    { id: 'water', rec: 3, run: o => { const sc = rig(o, full()); WORLD.water(o, sc).position.set(0, 0.04, 2); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn', note: fullNote() }; } },
    { id: 'fall', rec: null, run: o => { const sc = rig(o); WORLD.fall(o, sc).position.set(0, 0.8, 0); return { px: draw(o, sc), expect: 'drawn', note: 'waterfall' }; } },
    { id: 'aurora', rec: null, run: single('aurora') },
    { id: 'lava', rec: null, run: o => { const sc = rig(o); WORLD.lava(o, sc).position.set(0, 0.08, 2); o.cam.lookAt(0, -1, 0); const px = draw(o, sc); o.cam.lookAt(0, 0.8, 0); return { px, expect: 'drawn' }; } },
    { id: 'points', rec: null, run: single('points') },
    { id: 'portal_swirl', rec: null, run: o => { const sc = rig(o); WORLD.swirl(o, sc); return { px: draw(o, sc), expect: 'purple', note: '256² canvas map, transparent, double-sided' }; } },
    { id: 'avatar', rec: 3, run: o => { const sc = rig(o, full()); WORLD.avatar(o, sc).position.set(0, -0.4, -1.5); return { px: draw(o, sc), expect: 'drawn', note: fullNote() }; } },
    { id: 'lowpath', rec: null, run: o => {
      // the low tier's materials: Lambert with the same sway/glow/occlusion patches, no env, no shadows
      const k = o.kit, sc = rig(o);
      const [pm, gm, om] = k.asLow(() => [k.MK.prop(), k.MK.grass(), k.MK.occ({ color: 0xc9a070, map: k.TEX.rockTex })]);
      const B = new k.Batch(); k.K.oak(B, k.mulberry(7), 0, 0, 0.9, 0x5cb34c); sc.add(B.mesh(pm, false));
      const im = new THREE.InstancedMesh(k.getTuftGeo(), gm, 20); const m4 = new THREE.Matrix4();
      for (let i = 0; i < 20; i++) { m4.makeScale(3, 3, 3).setPosition(i * 0.2 - 2, 0, 1); im.setMatrixAt(i, m4); }
      sc.add(im); sc.add(mesh(k.geo('rbox'), om, -1.4, 0.6, 0.5));
      return { px: draw(o, sc), expect: 'drawn', note: 'Lambert (device switches)' };
    } },
    { id: 'msaa8', rec: null, run: o => {   // the pet-collection thumbnails (every tier)
      const rt = new THREE.WebGLRenderTarget(160, 160, { samples: 4 }), buf = new Uint8Array(160 * 160 * 4);
      o.junk.push(rt);
      const sc = rig(o); WORLD.avatar(o, sc);
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.2, 4.5); cam.lookAt(0, 1.2, 1.5);
      o.r.setRenderTarget(rt); o.r.setClearColor(0x000000, 0); o.r.clear(); o.r.render(sc, cam);
      o.r.readRenderTargetPixels(rt, 0, 0, 160, 160, buf);
      o.r.setRenderTarget(null); o.r.setClearColor(0xff00ff, 1);
      const i = (80 * 160 + 80) * 4;
      return { px: buf[i] + ',' + buf[i + 1] + ',' + buf[i + 2], note: 'pet thumbnail RT' };
    } },
  ];

  // the prop bisect: singles (cheapest / least suspect first), then the build-up. Unknown results
  // are assumed to pass, so the plan is also the progress estimate.
  function bisect() {
    const steps = [], seen = new Set(), ex = {};
    const add = (cfg, why) => {
      const id = cfgId(cfg);
      if (!seen.has(id)) { seen.add(id); steps.push({ id, cfg, why, fresh: true, prop: true, run: propStep(cfg) }); }
      return failed(id);
    };
    if (add({}, 'alone')) return { steps, safe: null, ex: { bare: true } };   // nothing to bisect: props are out
    const singles = [{ vc: true }, { sway: true }, { glow: true }, { occ: 'on' }];
    if (envOk()) singles.push({ env: true });
    if (shadowOk()) singles.push({ shadow: true });
    singles.forEach(c => add(c, 'alone'));
    ['vc', 'sway', 'glow', 'env', 'shadow'].forEach(k => { if (failed(cfgId({ [k]: true }))) ex[k] = true; });
    if (shadowOk() && !ex.shadow) {
      if (add({ shadow: true, recv: true }, 'alone')) ex.recv = true;
      if (add({ shadow: true, cast: true }, 'alone')) ex.cast = true;
    }
    // see-through: compiled → really discarding → (if that dies) the late-discard variant
    let occ = '';
    if (!failed(cfgId({ occ: 'on' }))) {
      if (!add({ occ: 'live' }, 'alone')) occ = 'live';
      else if (!add({ occ: 'late' }, 'alone')) occ = 'late';
    }
    if (!occ) ex.occ = true;
    // build-up: what is most worth keeping goes in first, so in an interaction the cheaper
    // ingredient is the one that gets blamed (and switched off)
    let cur = {};
    ['vc', 'env', 'shadow', 'occ', 'glow', 'recv', 'cast', 'sway'].forEach(k => {
      if (ex[k] || (k === 'env' && !envOk()) || (k === 'shadow' && !shadowOk()) || ((k === 'recv' || k === 'cast') && !cur.shadow)) return;
      const cand = Object.assign({}, cur, { [k]: k === 'occ' ? occ : true });
      if (add(cand, 'build-up')) ex[k] = true; else cur = cand;
    });
    return { steps, safe: cur, ex };
  }
  // what the bisect + the steps after it decided (the same function drives the plan and the verdict)
  function decide() {
    const b = bisect();
    const safe = b.safe ? Object.assign({}, b.safe) : null;
    if (safe && safe.occ && failed('occ_live')) delete safe.occ;
    const occ = !safe ? (failed('occ_live') ? 'off' : 'on') : occMode(safe);
    return { b, safe, occ };
  }
  const wopt = cfg => ({ env: envOk() && (!cfg || !!cfg.env), shadow: shadowOk() && (!cfg || !!cfg.shadow) });
  function plan() {
    const out = BASE.slice();
    if (!BASE.every(s => res(s.id))) return out.concat({ id: '…prop bisect…', placeholder: true });
    const { b, safe, occ } = decide();
    out.push(...b.steps);
    const bOcc = b.safe ? occMode(b.safe) : 'on';
    const sNote = safe ? cfgId(safe) : 'no props';
    if (bOcc !== 'off') out.push({ id: 'occ_live', rec: 'occ', run: o => { const sc = rig(o, wopt(safe)); WORLD.occ(o, sc, bOcc).position.set(0, 2.6, 0); occLive(o); ground(sc, new THREE.MeshStandardMaterial({ color: 0x5cbf54, roughness: 0.9 })); return { px: draw(o, sc), expect: 'drawn', note: 'matOf see-through ' + bOcc + ', really discarding ' + fullNote(wopt(safe)) }; } });
    out.push({ id: 'rt16', rec: 1, run: rtStep(() => ({ type: THREE.HalfFloatType }), safe) });
    out.push({ id: 'msaa16', rec: 'msaa', run: rtStep(o => ({ type: THREE.HalfFloatType, samples: f16Max(o) || 4 }), safe) });
    out.push({ id: 'bloom', rec: 1, run: composerStep(() => 0, o => { const sc = rig(o); WORLD.sky(o, sc); if (safe) WORLD.prop(o, sc, safe); return sc; }, sNote) });
    // the world on the default framebuffer = a nopost frame (with shadows) / a noshadow frame
    out.push({ id: 'world', rec: 'world', run: o => { const op = wopt(safe); return { px: draw(o, worldScene(o, op, safe, occ)), expect: 'drawn', note: 'every world material, one frame ' + fullNote(op) + ' ' + sNote }; } });
    if (failed('world') && shadowOk()) out.push({ id: 'world_ns', rec: 3, run: o => { const op = { env: wopt(safe).env, shadow: false }; return { px: draw(o, worldScene(o, op, safe && Object.assign({}, safe, { recv: false, cast: false, shadow: false }), occ)), expect: 'drawn', note: 'world, no shadows ' + fullNote(op) }; } });
    // the composer, split: without props (no MSAA → 2× → 4×), then with them at the best count
    const noProps = (o, n) => composerStep(() => n, oo => worldScene(oo, wopt(safe), null, occ), 'world without props ' + fullNote(wopt(safe)))(o);
    out.push({ id: 'cmp0', rec: 1, run: o => noProps(o, 0) });
    const msaaOk = !failed('msaa16');
    if (passed('cmp0') || !res('cmp0')) {
      if (msaaOk) {
        out.push({ id: 'cmp2', rec: 'msaa', skip: o => !f16(o).some(n => n >= 2 && n < 4), run: o => noProps(o, f16(o).filter(n => n >= 2 && n < 4)[0] || 2) });
        if (!failed('cmp2')) out.push({ id: 'cmp4', rec: 'msaa', skip: o => f16Max(o) < 4, run: o => noProps(o, f16Max(o)) });
      }
      out.push({ id: 'cmp_prop', rec: 1, run: composerStep(o => msaaBest(o), o => worldScene(o, wopt(safe), safe, occ), 'world ' + sNote + ' ' + fullNote(wopt(safe))) });
    }
    out.push({ id: '=apply', apply: true });
    // informational, after the verdict is stored: may still crash, costs nothing if it does
    const v = verdict();
    if (v.rec === 0) out.push({ id: 'burst', info: true, fresh: true, run: composerStep(o => msaaBest(o), o => worldScene(o, { env: envOk(), shadow: shadowOk() }, safe, occ), 'fresh context, whole world one frame ' + sNote) });
    if (Object.keys(v.sw).some(k => k !== 'msaa' && k !== 'env')) {
      const sh = SHIPPED();
      out.push({ id: 'confirm', info: true, run: o => { const op = { env: envOk(), shadow: shadowOk() }; return { px: draw(o, worldScene(o, op, sh, 'on')), expect: 'drawn', note: '"with it": the shipped prop + see-through back on, in the world ' + fullNote(op) }; } });
    }
    return out;
  }
  function msaaBest(o) {
    if (failed('msaa16') || failed('cmp2')) return 0;
    if (failed('cmp4')) return f16(o).filter(n => n >= 2 && n < 4)[0] || 0;
    return f16Max(o);
  }
  function verdict() {
    let rec = 0;
    const sw = {}, hard = [];
    const up = t => { rec = Math.max(rec, t); };
    BASE.forEach(s => {
      if (!failed(s.id)) return;
      if (s.rec === 'env') sw.env = false;
      else if (typeof s.rec === 'number') up(s.rec);
      else hard.push(s.id);
    });
    const { b, safe, occ } = decide();
    if (b.ex.bare) { up(3); hard.push('prop'); }
    if (b.ex.vc) { up(3); hard.push('prop vertex colours'); }
    if (b.ex.env) sw.env = false;
    if (b.ex.shadow) up(2);
    if (safe && !b.ex.shadow && shadowOk()) { if (b.ex.recv) sw.propRecv = false; if (b.ex.cast) sw.propCast = false; }
    if (b.ex.glow) sw.glow = false;
    if (b.ex.sway) sw.sway = false;
    if (occ !== 'on') sw.occ = occ;
    if (failed('rt16') || failed('bloom')) up(1);
    if (failed('world')) up(passed('world_ns') ? 2 : 3);
    if (failed('cmp0') || failed('cmp_prop')) up(1);
    if (failed('msaa16') || failed('cmp2')) sw.msaa = 0;
    else if (failed('cmp4')) sw.msaa = 2;
    const fail = st.results.filter(x => x.r !== 'ok' && !(PLAN_INFO.has(x.id))).map(x => x.id + ':' + x.r).join(' ') || null;
    return { at: st.at, rec, sw, hard, fail };
  }
  const PLAN_INFO = new Set(['burst', 'confirm']);

  // ---------- running ----------
  async function runOne(s) {
    st.running = s.id; save();
    update();
    await sleep(60);   // paint "running X" before the GPU gets busy
    if (s.fresh) teardown();
    if (!R) {
      try { R = makeRenderer(); } catch (e) {
        // Chrome refuses WebGL after a GPU crash until it is restarted: not a result, not a step
        st.running = null;
        st.noctx = { n: (st.noctx && st.noctx.step === s.id ? st.noctx.n : 0) + 1, step: s.id, msg: String(e && e.message || e).slice(0, 120) };
        save();
        return 'noctx';
      }
      st.noctx = null;
      if (s.fresh && passed('pmrem') && (!s.cfg || s.cfg.env)) R.envRT = R.kit.bakeEnv(R.r);   // bake outside the timed draw
    }
    const o = R;
    if (s.skip && s.skip(o)) {
      st.results.push({ id: s.id, r: 'ok', note: 'skipped: not offered by this GPU' });
      st.running = null; save();
      return 'ok';
    }
    shaderLog = [];
    drain(o.gl);
    const t0 = performance.now();
    let out = {}, exc = null;
    try { out = s.run(o) || {}; } catch (e) { exc = e; }
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
    else if (out.expect && out.expect !== 'clear' && out.px === CLEAR) r = 'BLANK';
    else if (out.expect === 'green' && !isGreen(out.px)) r = 'DARK';
    else if (out.expect === 'purple' && !isPurple(out.px)) r = 'DARK';
    else if (out.expect === 'clear' && out.px !== CLEAR) r = 'ODD';
    const x = { id: s.id, r, ms };
    if (out.px) x.px = out.px;
    const note = [s.why && '(' + s.why + ')', out.note, exc && String(exc && exc.message || exc).slice(0, 160)].filter(Boolean).join(' ');
    if (note) x.note = note;
    if (gle.length) x.gl = gle.join(' ');
    if (shaderLog.length) x.log = shaderLog.join(' || ').slice(0, 800);
    st.results.push(x);
    st.running = null; save();
    if (lost) { x.note = [x.note, sentinelNote()].filter(Boolean).join(' · '); save(); teardown(); await sleep(1500); }
    else cleanup(o);
    return r;
  }
  function applyNow() {
    const v = verdict();
    st.applied = true;
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
    if (!st || st.done) st = fresh(st && st.done ? compact(st) : null);
    clearTimeout(retryT);
    if (!auto) retryN = 0;
    st.interrupted = null; st.idle = false;
    busy = true;
    if (!sentinels) makeSentinels();
    update();
    let stop = false;
    try {
      for (let guard = 0; guard < 80 && !stop; guard++) {
        const s = plan().find(p => !p.placeholder && !res(p.id) && !(p.apply && st.applied));
        if (!s) {
          if (!st.applied) applyNow();
          st.done = true; save();
          break;
        }
        if (s.apply) { applyNow(); continue; }
        const r = await runOne(s);
        if (r === 'noctx') stop = true;
        update();
      }
    } finally {
      teardown();
      busy = false;
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
  // done / planned (unknown results assumed to pass; ~20 for a bisect not reached yet)
  function progress() {
    const p = plan().filter(s => !s.apply);
    const real = p.filter(s => !s.placeholder);
    return { done: real.filter(s => res(s.id)).length, total: real.length + (real.length < p.length ? 20 : 0) };
  }
  function text() {
    load();
    if (!st) return '';
    const T = SkyArt.probeKit().TIERS;
    const lines = [];
    if (st.prev) lines.push('  (上一次 probe v' + st.prev.v + ' ' + st.prev.at + ': ' + st.prev.txt + (st.prev.verdict ? ' → ' + st.prev.verdict : '') + ')');
    if (!st.results.length && st.idle) return ['🧪 相容性測試 probe v' + VER + ' — not run yet（按 🧪 開始）'].concat(lines).join('\n');
    const pr = progress();
    lines.unshift('🧪 相容性測試 probe v' + VER + ' (' + st.at + ')  ' + (st.gpu || '') + '  ' + pr.done + '/' + pr.total +
      (busy ? '  running: ' + (st.running || '…') : st.done ? '  done' : st.noctx ? '  waiting for WebGL' : '  paused — tap ▶️ to continue'));
    st.results.forEach((x, i) => {
      lines.push('  ' + String(i + 1).padStart(2, '0') + ' ' + x.id.padEnd(12) + ' ' + x.r.padEnd(5) + (x.ms !== undefined ? String(x.ms).padStart(5) + 'ms' : '       ') +
        (x.px ? ' px ' + x.px : '') + (x.note ? '  ' + x.note : '') + (x.gl ? '  gl ' + x.gl : '') + (x.log ? '\n       log: ' + x.log : ''));
    });
    if (st.noctx && !busy) lines.push('  ⛔ NOCTX ×' + st.noctx.n + ' at ' + st.noctx.step + ' (' + st.noctx.msg + ') — 請把 Chrome 完全關閉再開，然後按 ▶️（不算一步，會自動再試）');
    if (st.interrupted && !busy && !st.done) lines.push('  ⚠️ 上次在「' + st.interrupted + '」時整頁當掉（已記下）；按 ▶️ 繼續');
    if (st.summary) {
      const v = st.summary;
      lines.push('  結論: start tier ' + T[v.rec] + '  switches ' + (Object.keys(v.sw).map(k => k + '=' + (v.sw[k] === false ? 'off' : v.sw[k])).join(' ') || 'none') +
        (v.fail ? '  (failed: ' + v.fail + ')' : '  (all passed)') + (v.hard.length ? '; no tier avoids: ' + v.hard.join(', ') + ' (needs a shader fix)' : '') +
        '  → 已套用，重新載入後生效' + (st.done ? '' : '（剩下的步驟只是確認）'));
    }
    return lines.join('\n');
  }
  function label() {
    load();
    if (busy) return '🧪 測試中…';
    if (!st || (st.idle && !st.results.length)) return '🧪 相容性測試';
    if (st.done) return '🔁 重新測試';
    const pr = progress();
    return (st.noctx ? '▶️ 再試一次（' : '▶️ 繼續測試（') + Math.min(pr.total, pr.done + 1) + '/' + pr.total + '）';
  }
  function interrupted() { load(); return !!(st && !st.done && (st.interrupted || st.noctx)); }

  return { run: (el, cb) => run(el, cb, false), text, label, busy: () => busy, interrupted, steps: () => { load(); return plan().map(s => s.id); },
    reset: () => { st = null; clearTimeout(retryT); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } } };
})();
