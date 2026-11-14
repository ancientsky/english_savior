/* ===== SkyArt — rendering, sky, terrain and prop kit for 天空之城 (js/sky.js) =====
   Loaded BEFORE js/sky.js. Owned by the ART workstream.

   What lives here
   - renderer + post-processing (ACES filmic, MSAA composer, UnrealBloom, OutputPass)
   - sky dome shader (gradient + sun + stars/nebula), sun/hemisphere lights, PMREM environment
   - stylised puffy clouds, the cloud sea (lava sea in 地心世界), ambient motes, altitude atmosphere
   - procedural islands: organic outline, grass lip, layered cliffs, roots/icicles/crystals underneath,
     a hand-painted canvas top per island, instanced swaying grass, a merged prop kit per biome
   - bridges / stepping stones / jump pads (visuals only — sky.js keeps every collider)

   Material pipeline (what sibling modules inherit through ctx.matOf):
   - normal quality: MeshStandardMaterial (roughness .6) lit by sun + hemi + a sky PMREM environment;
     `emissive` glows (emissiveIntensity 1.6 → crosses the bloom threshold)
   - lowPower(): MeshLambertMaterial, no shadows, no composer, fewer clouds/grass/props
   Merged props share ONE material (`propMat`) whose vertex attributes aSway / aGlow drive wind sway
   and per-vertex emissive glow, so a whole island's decoration is one draw call. */
const SkyArt = (() => {
  'use strict';

  let ctx = null;
  let renderer = null, scene = null, camera = null;
  let composer = null, bloomPass = null;
  let low = false;
  let time = 0;
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const U = { time: { value: 0 } };            // shared shader time uniform
  // see-through cutout: scenery (props, quest props, matOf materials) standing between the camera
  // and the hero is dithered away in a soft screen-space circle around the hero, and anything
  // closer than ~1.6 to the lens fades — so the camera can ignore trees/arches for collision
  // without ever losing the hero behind them. uOccDist = 0 disables it (cover, quiz, no hero).
  const OCC = {
    uOccScr: { value: new THREE.Vector2(0.5, 0.5) },    // hero chest, 0..1 drawing-buffer coords
    uOccRes: { value: new THREE.Vector2(1, 1) },        // drawing-buffer size (px)
    uOccDist: { value: 0 },                             // view depth of the hero (0 = off)
    uOccR: { value: 0.12 },                             // cutout radius (fraction of screen height)
  };
  const OCC_FRAG = `
    if (uOccDist > 0.0) {
      float occZ = vViewPosition.z;
      vec2 occP = floor(mod(gl_FragCoord.xy, 4.0));
      float occB = mod(occP.x * 4.0 + occP.y * 11.0 + occP.x * occP.y * 5.0, 16.0) / 16.0 + 0.03;
      float occK = 1.0;
      if (occZ < uOccDist - 1.1) {
        vec2 occD = (gl_FragCoord.xy / uOccRes - uOccScr) * vec2(uOccRes.x / uOccRes.y, 1.0);
        occK = smoothstep(uOccR * 0.55, uOccR, length(occD));
      }
      occK = min(occK, smoothstep(0.9, 1.9, occZ));
      if (occK < occB) discard;
    }`;
  function withOcclusion(sh) {
    Object.assign(sh.uniforms, OCC);
    sh.fragmentShader = 'uniform vec2 uOccScr;\nuniform vec2 uOccRes;\nuniform float uOccDist;\nuniform float uOccR;\n' +
      sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + OCC_FRAG);
  }
  const TEX = {};                               // named textures (sky.js reads TEX.crystalTex etc.)
  const fogBase = new THREE.Color(0xa9d8ff);    // daytime haze colour; sky.js' storm-boss victory brightens it
  const state = { gt: 0, ut: 0 };               // galaxy / underground blend 0..1 (read by sky.js test hooks)

  // world-space sun direction (towards the sun)
  const SUN_DIR = new THREE.Vector3(0.62, 0.58, 0.36).normalize();
  // light balance (physical units, r155+): warm key sun, cool sky fill, PMREM sky ambient
  const SUN_I = () => (low ? 2.5 : 2.35), HEMI_I = () => (low ? 1.7 : 0.75), ENV_I = 0.42;

  // ============================== renderer & post ==============================
  function pixelRatio() {
    const d = window.devicePixelRatio || 1;
    return low ? 1 : Math.min(d, isTouch ? 1.5 : 2);
  }

  function createRenderer(w, h, lowPower) {
    low = !!lowPower;
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.NeutralToneMapping;   // Khronos PBR Neutral: filmic shoulder that keeps toy colours saturated
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = !low;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.info.autoReset = false;   // count shadow + main + post passes together (renderInfo())
    return renderer;
  }

  function setupComposer(w, h) {
    if (low) return;
    try {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      composer = new THREE.EffectComposer(renderer, rt);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      composer.addPass(new THREE.RenderPass(scene, camera));
      bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.5, 1.0);
      composer.addPass(bloomPass);
      composer.addPass(new THREE.OutputPass());
    } catch (e) {
      console.error('[SkyArt] post-processing unavailable, rendering directly', e);
      composer = null;
    }
  }

  function resize(w, h) {
    if (!renderer) return;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
  }

  // ============================== materials ==============================
  const MAT = {};
  // inject wind sway (aSway) + per-vertex glow (aGlow) into a lit material
  function swayGlow(mat, key) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = U.time;
      sh.vertexShader = 'attribute float aSway;\nattribute float aGlow;\nvarying float vGlow;\nuniform float uTime;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vGlow = aGlow;
          if (aSway > 0.0) {
            vec4 swW = modelMatrix * vec4(transformed, 1.0);
            float swP = uTime * 1.7 + swW.x * 0.23 + swW.z * 0.19;
            transformed.x += (sin(swP) * 0.09 + sin(swP * 2.3) * 0.03) * aSway;
            transformed.z += cos(swP * 0.83) * 0.07 * aSway;
          }`);
      sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * vGlow;');
      // grass blades are double-sided cards with straight-up normals: keep the normal pointing
      // up on the back face too, or every blade seen from behind is lit like an overhang (near-black)
      if (key === 'grass') sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n  normal = normalize( vNormal );');
      else withOcclusion(sh);
    };
    mat.customProgramCacheKey = () => 'skyart-' + key;
    return mat;
  }
  function litMat(opts, key) {
    const o = Object.assign({}, opts);
    if (low) { delete o.roughness; delete o.metalness; return new THREE.MeshLambertMaterial(o); }
    if (o.roughness === undefined) o.roughness = 0.62;
    if (o.metalness === undefined) o.metalness = 0;
    return new THREE.MeshStandardMaterial(o);
  }
  let propMat = null, grassMat = null, cloudMat = null, waterMat = null, fallMat = null;
  function initMaterials() {
    propMat = swayGlow(litMat({ vertexColors: true, roughness: 0.7 }), 'prop');
    grassMat = swayGlow(litMat({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 'grass');
    cloudMat = litMat({ color: 0xffffff, roughness: 1, emissive: 0xaec4e6, emissiveIntensity: 0.16 });
    waterMat = litMat({
      color: 0x3fb8ec, roughness: 0.12, emissive: 0x0c4a6e, emissiveIntensity: 0.6,
      map: TEX.ripple, transparent: true, opacity: 0.92,
    });
  }

  // ctx.matOf — cached simple materials that sibling modules build with
  function matOf(color, emissive, texKey) {
    const key = color + '_' + (emissive || 0) + '_' + (texKey || '');
    if (!MAT[key]) {
      const opts = { color };
      if (texKey && TEX[texKey]) opts.map = TEX[texKey];
      if (emissive) { opts.emissive = new THREE.Color(emissive); opts.emissiveIntensity = low ? 1 : 1.6; }
      MAT[key] = litMat(opts);
      MAT[key].onBeforeCompile = withOcclusion;
      MAT[key].customProgramCacheKey = () => 'skyart-occ';
    }
    return MAT[key];
  }

  // ============================== procedural textures ==============================
  function canvasTex(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // tileable value-noise fbm in [0,1] (size must be a multiple of every octave cell count)
  function fbmField(size, octaves, seed) {
    const rng = mulberry(seed);
    const out = new Float32Array(size * size);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves.length; o++) {
      const g = octaves[o];
      const grid = new Float32Array(g * g);
      for (let i = 0; i < grid.length; i++) grid[i] = rng();
      const cell = size / g;
      for (let y = 0; y < size; y++) {
        const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
        const r0 = (y0 % g) * g, r1 = ((y0 + 1) % g) * g;
        for (let x = 0; x < size; x++) {
          const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
          const c0 = x0 % g, c1 = (x0 + 1) % g;
          const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * sx;
          const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * sx;
          out[y * size + x] += (a + (b - a) * sy) * amp;
        }
      }
      total += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }
  function fieldTex(size, field, fn, srgb) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c2 = cv.getContext('2d');
    const img = c2.createImageData(size, size);
    for (let i = 0; i < field.length; i++) {
      const v = fn(field[i], i);
      img.data[i * 4] = v[0]; img.data[i * 4 + 1] = v[1]; img.data[i * 4 + 2] = v[2]; img.data[i * 4 + 3] = v[3] === undefined ? 255 : v[3];
    }
    c2.putImageData(img, 0, 0);
    const t = srgb ? canvasTex(cv) : new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  // legacy speckle textures (sky.js' switch shard uses TEX.crystalTex; matOf texKey callers)
  function speckleTex(base, spots, density, opts) {
    opts = opts || {};
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c2 = cv.getContext('2d');
    c2.fillStyle = base;
    c2.fillRect(0, 0, size, size);
    const rng = mulberry(density * 7 + 3);
    for (let i = 0; i < density; i++) {
      c2.fillStyle = spots[i % spots.length];
      c2.globalAlpha = 0.15 + rng() * 0.3;
      c2.beginPath();
      c2.arc(rng() * size, rng() * size, 1 + rng() * (opts.rmax || 2), 0, Math.PI * 2);
      c2.fill();
    }
    c2.globalAlpha = 1;
    const t = canvasTex(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat || 3, opts.repeat || 3);
    return t;
  }
  let noiseField = null;
  function initTextures() {
    noiseField = fbmField(256, [4, 8, 16, 32, 64], 9137);
    // grey fbm, linear (shader input)
    TEX.noise = fieldTex(256, noiseField, v => { const b = v * 255; return [b, b, b]; }, false);
    // water ripple overlay (sRGB colour, near-white so material colour shows through)
    TEX.ripple = fieldTex(256, noiseField, v => {
      const s = Math.abs(Math.sin(v * 38));
      const b = 205 + Math.pow(1 - s, 6) * 50;
      return [b, b + 4, 255];
    }, true);
    TEX.ripple.repeat.set(3, 3);
    // soft round sprite for particles
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c2 = cv.getContext('2d');
    const g = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c2.fillStyle = g;
    c2.fillRect(0, 0, 64, 64);
    TEX.dot = canvasTex(cv);
    // legacy keys
    TEX.grassTex = speckleTex('#ffffff', ['#d6e2c4', '#c4d4ae', '#eef4e4'], 260, { rmax: 4 });
    TEX.rockTex = speckleTex('#ffffff', ['#c8c8c8', '#b4b4b4', '#e2e2e2'], 220);
    TEX.woodTex = speckleTex('#ffffff', ['#e0d6c6', '#ece4d6'], 80);
    TEX.sandTex = speckleTex('#ffffff', ['#ecdfc4', '#e0cfae', '#f6eedc'], 300, { rmax: 3 });
    TEX.snowTex = speckleTex('#ffffff', ['#dceafc', '#eaf2fe', '#cfe2f8'], 200, { rmax: 3 });
    TEX.crystalTex = speckleTex('#ffffff', ['#e6e6ff', '#d8d8f6'], 60);
  }

  // ============================== sky dome ==============================
  const SKY_VERT = `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const SKY_FRAG = `
    uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSunColor; uniform vec3 uSunDir;
    uniform float uSun; uniform float uDisc; uniform float uStars; uniform float uNebula; uniform float uTime;
    varying vec3 vDir;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x) {
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;
      vec3 col = h > 0.0
        ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, h), 0.55))
        : mix(uHorizon, uBottom, smoothstep(0.0, -0.3, h));
      float s = max(dot(d, uSunDir), 0.0);
      col += uSunColor * (pow(s, 5.0) * 0.22 + pow(s, 48.0) * 0.55) * uSun;
      col += uSunColor * smoothstep(0.99925, 0.99962, s) * 7.0 * uDisc;
      if (uStars > 0.002) {
        vec3 sp = d * 210.0;
        vec3 cell = floor(sp);
        float hs = hash(cell);
        float star = step(0.982, hs) * smoothstep(0.45, 0.05, length(fract(sp) - 0.5));
        float tw = 0.55 + 0.45 * sin(uTime * 2.3 + hs * 91.0);
        col += vec3(1.0, 0.94, 1.0) * star * tw * 2.6 * uStars * smoothstep(-0.15, 0.15, h);
        float n = vnoise(d * 2.6 + vec3(0.0, uTime * 0.01, 0.0)) * 0.6 + vnoise(d * 6.5) * 0.4;
        vec3 neb = mix(vec3(0.42, 0.06, 0.5), vec3(0.04, 0.28, 0.6), vnoise(d * 1.7 + 5.0));
        col += neb * smoothstep(0.42, 0.85, n) * uNebula;
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  let dome = null, skyU = null;
  function skyUniforms() {
    return {
      uTop: { value: new THREE.Color(0x1c6ce0) },
      uHorizon: { value: new THREE.Color(0xa9d8ff) },
      uBottom: { value: new THREE.Color(0xeaf6ff) },
      uSunColor: { value: new THREE.Color(0xffe7b8) },
      uSunDir: { value: SUN_DIR.clone() },
      uSun: { value: 1 }, uDisc: { value: 1 }, uStars: { value: 0 }, uNebula: { value: 0 },
      uTime: U.time,
    };
  }
  function buildSkyDome() {
    skyU = skyUniforms();
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 40, 20),
      new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    scene.add(dome);
  }
  // sky-gradient environment for PBR ambient/reflections (one-off PMREM bake)
  function buildEnvironment() {
    if (low) return;
    try {
      const envScene = new THREE.Scene();
      const u = skyUniforms();
      u.uSun.value = 0.6; u.uDisc.value = 0;
      u.uBottom.value.set(0x9cb08a); // a grassy bounce from below
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16),
        new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide })));
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(envScene, 0.04).texture;
      scene.environmentIntensity = ENV_I;
      pm.dispose();
    } catch (e) { console.error('[SkyArt] env bake failed', e); }
  }

  // ============================== lights ==============================
  let hemi = null, sun = null;
  function buildLights() {
    hemi = new THREE.HemisphereLight(0xd6ecff, 0x8f8a6a, HEMI_I());
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d8, SUN_I());
    sun.position.copy(SUN_DIR).multiplyScalar(80);
    sun.castShadow = !low;
    const ms = isTouch ? 1024 : 2048;
    sun.shadow.mapSize.set(ms, ms);
    const S = 38;
    sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
    sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
    sun.shadow.camera.near = 5; sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun);
    scene.add(sun.target);
  }

  // ============================== clouds ==============================
  const clouds = [];        // { x, y, z, s, sy, speed, mesh, idx, sea }
  const cloudMeshes = [];
  function cloudGeometry(rng) {
    const parts = [];
    const n = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const g = new THREE.SphereGeometry(1, 10, 7);
      const t = i / (n - 1);
      const x = (t - 0.5) * 2.6 + (rng() - 0.5) * 0.4;
      const big = 1 - Math.abs(t - 0.5) * 1.1;
      const r = 0.55 + big * 0.65 + rng() * 0.2;
      g.scale(r * 1.15, r, r);
      g.translate(x, r * 0.35 + (rng() - 0.3) * 0.25, (rng() - 0.5) * 0.9);
      parts.push(g);
    }
    // a couple of top puffs for a cauliflower silhouette
    for (let i = 0; i < 2; i++) {
      const g = new THREE.SphereGeometry(1, 9, 6);
      const r = 0.55 + rng() * 0.25;
      g.scale(r, r, r);
      g.translate((rng() - 0.5) * 1.4, 0.95 + rng() * 0.3, (rng() - 0.5) * 0.5);
      parts.push(g);
    }
    const geo = THREE.BufferGeometryUtils.mergeGeometries(parts);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.05) p.setY(i, -0.05 + (p.getY(i) + 0.05) * 0.25);
    geo.computeVertexNormals();
    parts.forEach(g => g.dispose());
    return geo;
  }
  function buildClouds() {
    const rng = mulberry(SKY_CONFIG.worldSeed + 11);
    const VARIANTS = 3;
    const MID = low ? 18 : 38, SEA = low ? 14 : 32;
    const per = Math.ceil((MID + SEA) / VARIANTS);
    for (let v = 0; v < VARIANTS; v++) {
      const im = new THREE.InstancedMesh(cloudGeometry(rng), cloudMat, per);
      im.frustumCulled = false;
      im.count = 0;
      scene.add(im);
      cloudMeshes.push(im);
    }
    for (let i = 0; i < MID + SEA; i++) {
      const sea = i >= MID;
      const mesh = cloudMeshes[i % VARIANTS];
      clouds.push({
        x: (rng() - 0.5) * 1100, z: (rng() - 0.5) * 1100,
        y: sea ? -2 + rng() * 6 : -6 + rng() * 96,
        s: sea ? 16 + rng() * 22 : 4 + rng() * 7,
        sy: sea ? 0.55 + rng() * 0.3 : 0.75 + rng() * 0.3,
        ry: rng() * Math.PI * 2,
        speed: 1 + rng() * 2.2,
        sea, mesh, idx: mesh.count++,
      });
    }
  }
  const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cs = new THREE.Vector3(), _cp = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  function wrap(v, L) { return ((v + L / 2) % L + L) % L - L / 2; }
  function updateClouds(dt, cx, cy, cz) {
    const L = 1100;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.x += c.speed * dt * 1.5;
      const wx = cx + wrap(c.x - cx, L), wz = cz + wrap(c.z - cz, L);
      const wy = c.sea ? seaY + c.y : (state.gt > 0.5 ? c.y + 30 : c.y);
      // clouds shrink away as the camera gets close, so they never swallow the view
      const d = Math.hypot(wx - cx, wy - cy, wz - cz);
      let k = Math.min(1, Math.max(0, (d - 30) / 80));
      // ...and melt away where they would intersect an island
      if (k > 0) {
        for (let j = 0; j < islands.length; j++) {
          const it = islands[j];
          if (wy < it.y - it.depth - c.s || wy > it.y + 10 + c.s) continue;
          const hd = Math.hypot(wx - it.x, wz - it.z) - it.isle.r - c.s * 1.6;
          if (hd < 14) k = Math.min(k, Math.max(0, hd / 14));
        }
      }
      const s = c.s * k;
      _cp.set(wx, wy, wz);
      _cq.setFromAxisAngle(_up, c.ry);
      _cs.set(s, s * c.sy, s);
      _cm.compose(_cp, _cq, _cs);
      c.mesh.setMatrixAt(c.idx, _cm);
    }
    for (let i = 0; i < cloudMeshes.length; i++) cloudMeshes[i].instanceMatrix.needsUpdate = true;
  }

  // ============================== cloud sea / lava sea ==============================
  const SEA_FRAG = `
    uniform sampler2D uNoise; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uFog; uniform vec3 uCam;
    uniform float uTime; uniform float uLava; uniform float uFar;
    varying vec3 vW;
    void main() {
      vec2 p = vW.xz;
      float n1 = texture2D(uNoise, p * 0.0026 + vec2(uTime * 0.0035, uTime * 0.001)).r;
      float n2 = texture2D(uNoise, p * 0.0105 - vec2(uTime * 0.002, uTime * 0.005)).r;
      float n3 = texture2D(uNoise, p * 0.041 + vec2(uTime * 0.01, 0.0)).r;
      float n = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
      vec3 col = mix(uShade, uLit, smoothstep(0.32, 0.72, n));
      col += uLit * pow(smoothstep(0.55, 0.85, n), 2.0) * 0.25;
      // lava: glowing veins between dark crust
      float vein = 1.0 - smoothstep(0.0, 0.022, abs(n - 0.5));
      col = mix(col, vec3(0.035, 0.008, 0.006) * (0.6 + n) + vec3(2.6, 0.5, 0.06) * vein * (0.7 + 0.3 * sin(uTime * 1.3 + n * 20.0)), uLava);
      float d = length(vW.xz - uCam.xz);
      col = mix(col, uFog, smoothstep(uFar * 0.25, uFar, d));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  let sea = null, seaU = null, seaY = -30;
  function buildSea() {
    seaU = {
      uNoise: { value: TEX.noise }, uTime: U.time,
      uLit: { value: new THREE.Color(0xffffff) }, uShade: { value: new THREE.Color(0xa9c6ea) },
      uFog: { value: new THREE.Color(0xbfe4ff) }, uCam: { value: new THREE.Vector3() },
      uLava: { value: 0 }, uFar: { value: 900 },
    };
    const geo = new THREE.PlaneGeometry(2400, 2400, 1, 1);
    geo.rotateX(-Math.PI / 2);
    sea = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: seaU, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: SEA_FRAG,
    }));
    sea.frustumCulled = false;
    sea.renderOrder = -5;
    scene.add(sea);
  }

  // ============================== particles ==============================
  let motes = null, moteBase = null;
  const MOTE_BOX = 70;
  function buildMotes() {
    const N = low ? 90 : 260;
    const rng = mulberry(SKY_CONFIG.worldSeed + 5);
    const arr = new Float32Array(N * 3);
    moteBase = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      moteBase[i * 4] = rng() * MOTE_BOX;
      moteBase[i * 4 + 1] = rng() * 40;
      moteBase[i * 4 + 2] = rng() * MOTE_BOX;
      moteBase[i * 4 + 3] = rng() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    motes = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xfff6d8, size: 0.28, map: TEX.dot, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    motes.frustumCulled = false;
    scene.add(motes);
  }
  function updateMotes(dt, cx, cy, cz) {
    const arr = motes.geometry.attributes.position.array;
    const N = arr.length / 3;
    const rise = 0.35 + state.ut * 2.2;
    for (let i = 0; i < N; i++) {
      const b = i * 4;
      moteBase[b + 1] += dt * rise;
      const ph = moteBase[b + 3];
      const lx = moteBase[b] + Math.sin(time * 0.4 + ph) * 1.5;
      const lz = moteBase[b + 2] + Math.cos(time * 0.35 + ph) * 1.5;
      arr[i * 3] = cx + wrap(lx - cx, MOTE_BOX);
      arr[i * 3 + 1] = cy + wrap(moteBase[b + 1] - cy, 40);
      arr[i * 3 + 2] = cz + wrap(lz - cz, MOTE_BOX);
    }
    motes.geometry.attributes.position.needsUpdate = true;
  }

  // per-island animated point systems (fireflies, waterfall mist)
  const pointSystems = [];   // { points, base, phase, kind, group }
  function addFireflies(g, isle, color, n, ymax) {
    if (low) n = Math.ceil(n / 2);
    const rng = mulberry(SKY_CONFIG.worldSeed + isle.seed * 29 + 7);
    const arr = new Float32Array(n * 3), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, rr = isle.r * (0.15 + rng() * 0.8);
      arr[i * 3] = Math.cos(a) * rr; arr[i * 3 + 1] = 0.6 + rng() * (ymax || 2.4); arr[i * 3 + 2] = Math.sin(a) * rr;
      phase[i] = rng() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size: 0.5, map: TEX.dot, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    g.add(pts);
    pointSystems.push({ points: pts, base: arr.slice(), phase, kind: 'fly', group: g });
  }
  function addMist(g, isle, x, y, z, w) {
    if (low) return;
    const n = 70;
    const rng = mulberry(SKY_CONFIG.worldSeed + isle.seed * 13 + 41);
    const arr = new Float32Array(n * 3), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rng() - 0.5) * w; arr[i * 3 + 1] = rng() * 6; arr[i * 3 + 2] = (rng() - 0.5) * w * 0.6;
      phase[i] = rng();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, map: TEX.dot, transparent: true, opacity: 0.45, depthWrite: false, sizeAttenuation: true,
    }));
    pts.position.set(x, y, z);
    g.add(pts);
    pointSystems.push({ points: pts, base: arr.slice(), phase, kind: 'mist', group: g });
  }
  function updatePointSystems(dt) {
    for (let s = 0; s < pointSystems.length; s++) {
      const sys = pointSystems[s];
      if (!sys.group.visible) continue;
      const arr = sys.points.geometry.attributes.position.array, base = sys.base, ph = sys.phase;
      if (sys.kind === 'fly') {
        for (let i = 0; i < ph.length; i++) {
          arr[i * 3] = base[i * 3] + Math.sin(time * 0.7 + ph[i]) * 0.6;
          arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * 1.3 + ph[i] * 1.7) * 0.4;
          arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(time * 0.6 + ph[i]) * 0.6;
        }
      } else {
        for (let i = 0; i < ph.length; i++) {
          arr[i * 3 + 1] += dt * (1.2 + ph[i]);
          arr[i * 3] += dt * (ph[i] - 0.5) * 0.8;
          if (arr[i * 3 + 1] > 7) { arr[i * 3 + 1] = 0; arr[i * 3] = base[i * 3]; }
        }
      }
      sys.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ============================== galaxy decor ==============================
  let planet = null;
  function buildPlanet() {
    planet = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(60, 40, 24), new THREE.MeshBasicMaterial({
      color: 0xb48cff, fog: false, map: fieldTex(128, fbmField(128, [4, 8, 16], 77), v => {
        const b = Math.floor(140 + v * 115);
        return [b, Math.floor(b * 0.8), 255];
      }, true),
    }));
    planet.add(body);
    const ring = new THREE.Mesh(new THREE.RingGeometry(80, 118, 64), new THREE.MeshBasicMaterial({
      color: 0xffd9a8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2.4;
    planet.add(ring);
    planet.rotation.z = 0.35;
    planet.visible = false;
    scene.add(planet);
  }

  // ============================== atmosphere ==============================
  const PAL = {
    day: { top: 0x1c6ce0, hor: 0xa9d8ff, bot: 0xdcefff, fog: 0xa9d8ff, hemiS: 0xd6ecff, hemiG: 0x8f8a6a, sun: 0xfff0d8, seaL: 0xffffff, seaS: 0xa9c6ea, cloud: 0xffffff, mote: 0xfff6d8 },
    gal: { top: 0x070319, hor: 0x3a2378, bot: 0x1a0d3a, fog: 0x2a1a5c, hemiS: 0xb4a2ff, hemiG: 0x4a2a6a, sun: 0xd8c8ff, seaL: 0xc49cff, seaS: 0x3b2672, cloud: 0xd9c4ff, mote: 0xc9b8ff },
    und: { top: 0x0d0303, hor: 0x3a0f06, bot: 0xff5a14, fog: 0x2a0c06, hemiS: 0x8a4a30, hemiG: 0xff7a2a, sun: 0xffb27a, seaL: 0xffffff, seaS: 0xa9c6ea, cloud: 0xffffff, mote: 0xff8a3a },
  };
  const CP = {};
  for (const k in PAL) { CP[k] = {}; for (const f in PAL[k]) CP[k][f] = new THREE.Color(PAL[k][f]); }
  const _ca = new THREE.Color(), _cb = new THREE.Color();
  function mix3(field, out) {
    // day → galaxy (gt) or day → underground (ut); the bands never overlap
    out.copy(field === 'hor' || field === 'fog' ? fogBase : CP.day[field]);
    if (state.gt > 0) out.lerp(CP.gal[field], state.gt);
    if (state.ut > 0) out.lerp(CP.und[field], state.ut);
    return out;
  }
  function updateAtmosphere(py) {
    state.ut = Math.min(1, Math.max(0, (-py - 20) / 40));
    state.gt = state.ut > 0 ? 0 : Math.min(1, Math.max(0, (py - 70) / 50));
    const gt = state.gt, ut = state.ut;
    mix3('top', skyU.uTop.value);
    mix3('hor', skyU.uHorizon.value);
    mix3('bot', skyU.uBottom.value);
    skyU.uStars.value = gt;
    skyU.uNebula.value = gt * 0.9;
    skyU.uSun.value = 1 - Math.max(gt * 0.7, ut);
    skyU.uDisc.value = 1 - Math.max(gt, ut);
    mix3('fog', scene.fog.color);
    scene.fog.near = 70 - ut * 30;
    scene.fog.far = 420 + (150 - 420) * ut;
    mix3('hemiS', hemi.color);
    mix3('hemiG', hemi.groundColor);
    hemi.intensity = HEMI_I() * (1 + ut * 0.35);
    mix3('sun', sun.color);
    sun.intensity = SUN_I() * (1 - gt * 0.35 - ut * 0.7);
    if (!low) scene.environmentIntensity = ENV_I * (1 - Math.max(gt, ut) * 0.75);
    mix3('seaL', seaU.uLit.value);
    mix3('seaS', seaU.uShade.value);
    seaU.uFog.value.copy(scene.fog.color);
    seaU.uLava.value = ut;
    seaY = ut > 0.5 ? -150 : (gt > 0.5 ? 48 : -30);
    mix3('cloud', cloudMat.color);
    for (let i = 0; i < cloudMeshes.length; i++) cloudMeshes[i].visible = ut < 0.5;
    mix3('mote', motes.material.color);
    if (planet) planet.visible = gt > 0.25;
    if (bloomPass) bloomPass.strength = 0.32 + gt * 0.3 + ut * 0.2;
  }

  // ============================== init / frame ==============================
  function init(c) {
    ctx = c;
    scene = c.scene;
    camera = c.camera;
    low = !!c.lowPower();
    scene.fog = new THREE.Fog(fogBase.getHex(), 70, 420);
    initTextures();
    initMaterials();
    buildSkyDome();
    buildEnvironment();
    buildLights();
    buildClouds();
    buildSea();
    buildMotes();
    buildPlanet();
    const sz = renderer.getSize(new THREE.Vector2());
    setupComposer(sz.x, sz.y);
    updateAtmosphere(c.pos.y);
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      window.__skyArt = {
        cam: (theta, phi, radius) => Object.assign(ctx.cam, { theta, phi, radius }),
        bloom: (s, r, t) => { if (bloomPass) Object.assign(bloomPass, { strength: s, radius: r, threshold: t }); },
        exposure: (e, tm) => { renderer.toneMappingExposure = e; if (tm) renderer.toneMapping = THREE[tm]; },
        perIsland: () => islands.map(it => {
          const t = m => (m ? Math.round(m.geometry.index.count / 3) : 0);
          return it.isle.id + ' props ' + t(it.props) + ' body ' + t(it.group.children[0]) + ' grass ' + (it.grass ? it.grass.count * 24 : 0);
        }).join('\n'),
        calls: () => {
          // visible draw objects in front of the camera, split into art-owned vs everything else
          const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          const out = { art: 0, other: 0, otherNames: {} };
          const artMats = new Set([propMat, grassMat, cloudMat, waterMat, fallMat, auroraMat, lavaMat, padRingMat]);
          scene.traverseVisible(o => {
            if (!(o.isMesh || o.isPoints || o.isSprite)) return;
            if (o.frustumCulled && !o.isSprite && o.geometry && !fr.intersectsObject(o)) return;
            const art = artMats.has(o.material) || (o.parent && islands.some(it => it.group === o.parent && it.group.children.indexOf(o) < 4)) || o === dome || o === sea;
            if (art) out.art++; else { out.other++; const k = (o.material && o.material.type) + (o.isSprite ? ':sprite' : ''); out.otherNames[k] = (out.otherNames[k] || 0) + 1; }
          });
          return out;
        },
        tris: () => {
          const out = {};
          scene.traverseVisible(o => {
            if (!o.isMesh || !o.geometry) return;
            const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
            const k = o.isInstancedMesh ? 'instanced' : (o.material === propMat ? 'prop/body' : o.material.type);
            out[k] = (out[k] || 0) + Math.round(n);
          });
          return out;
        },
      };
    }
  }

  // per-frame: animate + follow + render. Called from sky.js animate() after updateCamera().
  function frame(dt) {
    time += dt;
    U.time.value = time;
    const p = ctx.pos, cp = camera.position;
    updateAtmosphere(p.y);
    // sun + shadow frustum follow the player; the dome and sea follow the camera
    sun.position.set(p.x + SUN_DIR.x * 90, p.y + SUN_DIR.y * 90, p.z + SUN_DIR.z * 90);
    sun.target.position.set(p.x, p.y, p.z);
    dome.position.copy(cp);
    sea.position.set(cp.x, seaY, cp.z);
    seaU.uCam.value.copy(cp);
    if (planet) planet.position.set(cp.x - 380, cp.y + 260, cp.z + 520);
    updateClouds(dt, cp.x, cp.y, cp.z);
    updateMotes(dt, cp.x, cp.y, cp.z);
    updatePointSystems(dt);
    updateIslandsLod(cp);
    updateAnims(dt);
    TEX.ripple.offset.set(time * 0.02, time * 0.013);
    updateOcclusion();
    renderer.info.reset();
    if (composer && !ctx.lowPower()) composer.render(dt);
    else renderer.render(scene, camera);
  }

  const _occV = new THREE.Vector3(), _occS = new THREE.Vector2();
  function updateOcclusion() {
    if (!ctx.playing || ctx.quizOpen || !ctx.player || !ctx.player.visible) { OCC.uOccDist.value = 0; return; }
    camera.updateMatrixWorld();
    _occV.set(ctx.pos.x, ctx.pos.y + 1.0, ctx.pos.z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -_occV.z;
    if (depth < 0.5) { OCC.uOccDist.value = 0; return; }
    OCC.uOccDist.value = depth;
    _occV.set(ctx.pos.x, ctx.pos.y + 1.0, ctx.pos.z).project(camera);
    OCC.uOccScr.value.set(_occV.x * 0.5 + 0.5, _occV.y * 0.5 + 0.5);
    renderer.getDrawingBufferSize(_occS);
    OCC.uOccRes.value.copy(_occS);
    // the hero is ~2 units tall: keep the hole a bit larger than the hero on screen
    const fovH = 2 * depth * Math.tan(camera.fov * Math.PI / 360);
    OCC.uOccR.value = Math.min(0.32, Math.max(0.1, 1.9 / fovH));
  }

  // ============================== helpers ==============================
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================== geometry kit ==============================
  const G = {};
  function prismGeo() {
    // triangular prism: triangle (-.5,0)(.5,0)(0,1) in the z/y plane, extruded along x (-.5..+.5)
    const p = [-0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0];
    const tri = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
    const pos = [];
    for (let i = 0; i < tri.length; i++) pos.push(p[tri[i] * 3], p[tri[i] * 3 + 1], p[tri[i] * 3 + 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  function lathe(pts, seg) {
    return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
  }
  function rockGeo(seed, detail) {
    let g = new THREE.IcosahedronGeometry(1, detail);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = THREE.BufferGeometryUtils.mergeVertices(g);
    const nz = new THREE.ImprovedNoise();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + nz.noise(x * 1.3 + seed, y * 1.3, z * 1.3) * 0.32 + nz.noise(x * 3 + seed, y * 3, z * 3) * 0.08;
      p.setXYZ(i, x * k, y * k * (y < 0 ? 0.8 : 1), z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  function geo(name) {
    if (G[name]) return G[name];
    let g;
    switch (name) {
      case 'sphere': g = new THREE.SphereGeometry(1, 12, 8); break;
      case 'sphereLo': g = new THREE.SphereGeometry(1, 8, 5); break;
      case 'blossom': g = new THREE.SphereGeometry(1, 7, 4); break;
      case 'stem': g = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true); g.translate(0, 0.5, 0); break;
      case 'hemi': g = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2); break;
      case 'cyl': g = new THREE.CylinderGeometry(1, 1, 1, 14); g.translate(0, 0.5, 0); break;
      case 'cyl6': g = new THREE.CylinderGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0); break;
      case 'trunk': g = new THREE.CylinderGeometry(0.62, 1, 1, 9, 2); g.translate(0, 0.5, 0); break;
      case 'disc': g = new THREE.CylinderGeometry(1, 1, 1, 22); g.translate(0, 0.5, 0); break;
      case 'rbox': g = new THREE.RoundedBoxGeometry(1, 1, 1, 1, 0.12); break;
      case 'rboxS': g = new THREE.RoundedBoxGeometry(1, 1, 1, 3, 0.32); break;
      case 'prism': g = prismGeo(); break;
      case 'tier': g = lathe([[0.001, -0.02], [0.72, 0], [0.98, 0.1], [1, 0.22], [0.78, 0.45], [0.45, 0.78], [0.16, 0.97], [0.001, 1]], 12); break;
      case 'cap': g = lathe([[0.001, 0.05], [0.3, 0.04], [0.86, -0.02], [1, 0.08], [0.97, 0.26], [0.76, 0.47], [0.42, 0.59], [0.001, 0.62]], 14); break;
      case 'crystal': g = lathe([[0.001, 0], [0.4, 0.04], [0.5, 0.16], [0.5, 0.7], [0.001, 1]], 6).toNonIndexed(); g.computeVertexNormals(); break;
      case 'puck': g = lathe([[0.001, -0.45], [0.88, -0.45], [1, -0.32], [1, -0.1], [0.9, 0], [0.001, 0]], 14); break;
      case 'gem': g = new THREE.OctahedronGeometry(1, 0); break;
      case 'torus': g = new THREE.TorusGeometry(1, 0.12, 8, 28); break;
      case 'torusHalf': g = new THREE.TorusGeometry(1, 0.16, 8, 18, Math.PI); break;
      case 'rock0': case 'rock1': case 'rock2': case 'rock3': g = rockGeo(+name[4] * 7.1, 1); break;
      case 'rockHi0': case 'rockHi1': g = rockGeo(+name[6] * 13.7 + 3, 2); break;
      default: throw new Error('geo ' + name);
    }
    return (G[name] = g);
  }
  // tapered tube along a polyline (roots, vines, ropes)
  function tube(pts, r0, r1, radial) {
    radial = radial || 6;
    const pos = [], idx = [];
    const t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
      t.subVectors(c, a).normalize();
      up.set(0, 1, 0);
      if (Math.abs(t.y) > 0.9) up.set(1, 0, 0);
      n.crossVectors(t, up).normalize();
      b.crossVectors(t, n).normalize();
      const r = r0 + (r1 - r0) * (i / (pts.length - 1));
      for (let k = 0; k < radial; k++) {
        const ang = k / radial * Math.PI * 2;
        const cx = Math.cos(ang) * r, cy = Math.sin(ang) * r;
        pos.push(pts[i].x + n.x * cx + b.x * cy, pts[i].y + n.y * cx + b.y * cy, pts[i].z + n.z * cx + b.z * cy);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < radial; k++) {
        const a = i * radial + k, b2 = i * radial + (k + 1) % radial, c = a + radial, d = b2 + radial;
        idx.push(a, c, b2, b2, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ---------- merged batch: everything static on an island becomes one mesh ----------
  const _bm = new THREE.Matrix4(), _bm2 = new THREE.Matrix4(), _bnm = new THREE.Matrix3();
  const _bv = new THREE.Vector3(), _bn = new THREE.Vector3(), _bq = new THREE.Quaternion(), _be = new THREE.Euler();
  const _bs = new THREE.Vector3(), _bp = new THREE.Vector3(), _bc = new THREE.Color(), _ID = new THREE.Matrix4();
  class Batch {
    constructor() {
      this.P = []; this.N = []; this.C = []; this.S = []; this.Gl = []; this.I = [];
      this.n = 0; this.base = new THREE.Matrix4(); this.baseY = 0; this.scale = 1; this.swayH = 3;
    }
    at(x, y, z, ry, s) {
      s = s || 1;
      this.base.compose(_bp.set(x, y, z), _bq.setFromEuler(_be.set(0, ry || 0, 0)), _bs.set(s, s, s));
      this.baseY = y; this.scale = s;
      return this;
    }
    // add a cached geometry with a local transform relative to the current `at()` frame
    part(g, x, y, z, sx, sy, sz, color, o) {
      _be.set(o && o.rx || 0, o && o.ry || 0, o && o.rz || 0);
      _bm.compose(_bp.set(x, y, z), _bq.setFromEuler(_be), _bs.set(sx, sy, sz));
      _bm2.multiplyMatrices(this.base, _bm);
      this.add(g, _bm2, color, o ? o.sway || 0 : 0, o ? o.glow || 0 : 0);
    }
    add(g, m, color, sway, glow) {
      const P = g.attributes.position, N = g.attributes.normal, VC = g.attributes.color;
      _bnm.getNormalMatrix(m);
      let c = null;
      if (!VC) c = typeof color === 'number' ? _bc.setHex(color) : color;
      const off = this.n, h = this.swayH * this.scale;
      for (let i = 0; i < P.count; i++) {
        _bv.fromBufferAttribute(P, i).applyMatrix4(m);
        this.P.push(_bv.x, _bv.y, _bv.z);
        _bn.fromBufferAttribute(N, i).applyMatrix3(_bnm).normalize();
        this.N.push(_bn.x, _bn.y, _bn.z);
        if (VC) this.C.push(VC.getX(i), VC.getY(i), VC.getZ(i));
        else this.C.push(c.r, c.g, c.b);
        let sw = 0;
        if (sway) { const t = (_bv.y - this.baseY) / h; sw = sway * (t < 0 ? 0 : t > 1.4 ? 1.4 : t); }
        this.S.push(sw);
        this.Gl.push(glow);
      }
      // a mirrored transform (negative scale) flips the winding — swap two corners back
      const flip = m.determinant() < 0;
      const cnt = g.index ? g.index.count : P.count, ix = g.index ? g.index.array : null;
      for (let i = 0; i < cnt; i += 3) {
        const a = ix ? ix[i] : i, b = ix ? ix[i + 1] : i + 1, c2 = ix ? ix[i + 2] : i + 2;
        if (flip) this.I.push(off + a, off + c2, off + b);
        else this.I.push(off + a, off + b, off + c2);
      }
      this.n += P.count;
    }
    mesh(mat, shadow) {
      if (!this.n) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
      g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.S, 1));
      g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.Gl, 1));
      g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat || propMat);
      m.castShadow = !!shadow; m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      return m;
    }
  }
  function col(hex, rng, l, s) {
    const c = new THREE.Color(hex);
    if (rng) c.offsetHSL((rng() - 0.5) * 0.02, (rng() - 0.5) * (s || 0.08), (rng() - 0.5) * (l === undefined ? 0.07 : l));
    return c;
  }
  function tint(hex, k) { return new THREE.Color(hex).multiplyScalar(k); }

  // ============================== prop kit ==============================
  // every prop: (B, rng, x, z, ...) — B.at() positions it on the island (local y = 0 is the walk surface)
  const K = {
    oak(B, rng, x, z, s, leaf, trunk, fruit) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 4.5;
      const h = 1.7 + rng() * 0.9, lean = (rng() - 0.5) * 0.12;
      B.part(geo('trunk'), 0, 0, 0, 0.36, h + 0.4, 0.36, col(trunk || 0x8a5a34, rng), { rz: lean });
      B.part(geo('sphereLo'), 0, 0.05, 0, 0.62, 0.28, 0.62, col(trunk || 0x8a5a34, rng));
      const cy = h + 1.0;
      const blobs = [[0, cy, 0, 1.6], [1.0, cy - 0.35, 0.3, 1.1], [-0.9, cy - 0.3, -0.35, 1.15], [0.25, cy + 0.8, -0.2, 1.15], [-0.15, cy - 0.25, 0.95, 1.05]];
      for (let i = 0; i < blobs.length; i++) {
        const bb = blobs[i];
        B.part(geo('sphere'), bb[0] + lean * h, bb[1], bb[2], bb[3], bb[3] * 0.92, bb[3], col(leaf, rng, 0.06).multiplyScalar(i === 3 ? 1.15 : i === 0 ? 1.05 : 0.95), { sway: 0.9 });
      }
      if (fruit) for (let i = 0; i < 5; i++) {
        const a = rng() * 6.28, yy = cy - 0.2 + rng() * 0.9;
        B.part(geo('sphereLo'), Math.cos(a) * 1.45, yy, Math.sin(a) * 1.45, 0.17, 0.17, 0.17, fruit, { sway: 0.9 });
      }
    },
    poplar(B, rng, x, z, s, leaf, trunk) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 5;
      B.part(geo('trunk'), 0, 0, 0, 0.28, 1.6, 0.28, col(trunk || 0x8a5a34, rng));
      B.part(geo('sphere'), 0, 3.2, 0, 1.15, 2.1, 1.15, col(leaf, rng), { sway: 0.8 });
      B.part(geo('sphere'), 0.3, 4.6, 0.1, 0.75, 1.1, 0.75, col(leaf, rng).multiplyScalar(1.12), { sway: 0.8 });
    },
    pine(B, rng, x, z, s, leaf, snow, trunk) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 5;
      B.part(geo('trunk'), 0, 0, 0, 0.3, 1.4, 0.3, col(trunk || 0x6e4a2e, rng));
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const ty = 0.9 + i * 1.05, tr = 1.75 - i * 0.36;
        B.part(geo('tier'), 0, ty, 0, tr, 1.7, tr, col(leaf, rng, 0.04).multiplyScalar(0.9 + i * 0.07), { sway: 0.7 });
        if (snow) B.part(geo('tier'), 0, ty + 0.75, 0, tr * 0.7, 0.95, tr * 0.7, col(0xf4f9ff, rng, 0.02), { sway: 0.7 });
      }
    },
    sakura(B, rng, x, z, s, bloom) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 4.5;
      const h = 1.6 + rng() * 0.6;
      B.part(geo('trunk'), 0, 0, 0, 0.33, h + 0.5, 0.33, col(0x6e4a52, rng), { rz: 0.12 });
      B.part(geo('trunk'), 0.15, h * 0.6, 0, 0.16, 1.3, 0.16, col(0x6e4a52, rng), { rz: -0.8 });
      const cy = h + 1.0;
      const blobs = [[0.2, cy, 0, 1.5], [1.25, cy - 0.15, 0.2, 1.05], [-0.8, cy - 0.2, -0.4, 1.1], [0.3, cy + 0.75, 0.1, 1.05], [-0.4, cy, 0.9, 0.95], [0.7, cy - 0.1, -0.9, 0.9]];
      for (let i = 0; i < blobs.length; i++) {
        const bb = blobs[i];
        B.part(geo('sphere'), bb[0], bb[1], bb[2], bb[3], bb[3] * 0.85, bb[3], col(bloom, rng, 0.08).multiplyScalar(i === 3 ? 1.12 : 1), { sway: 0.9 });
      }
    },
    deadTree(B, rng, x, z, s, c) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 5;
      const cc = col(c || 0x6b5a4a, rng);
      B.part(geo('trunk'), 0, 0, 0, 0.3, 3.0, 0.3, cc, { rz: 0.08 });
      B.part(geo('trunk'), 0, 1.8, 0, 0.14, 1.6, 0.14, cc, { rz: 0.9 });
      B.part(geo('trunk'), 0, 2.3, 0, 0.12, 1.4, 0.12, cc, { rz: -0.8, ry: 1.2 });
      B.part(geo('trunk'), 0, 1.2, 0, 0.12, 1.2, 0.12, cc, { rx: 0.9, ry: 2 });
    },
    willow(B, rng, x, z, s, leaf) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 5;
      B.part(geo('trunk'), 0, 0, 0, 0.4, 2.6, 0.4, col(0x4a3c34, rng), { rz: 0.1 });
      B.part(geo('hemi'), 0.25, 2.8, 0, 1.9, 1.3, 1.9, col(leaf, rng), { sway: 0.5 });
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28 + rng() * 0.3, len = 1.2 + rng() * 1.3;
        B.part(geo('cyl6'), 0.25 + Math.cos(a) * 1.65, 2.85 - len, Math.sin(a) * 1.65, 0.07, len, 0.07, col(leaf, rng).multiplyScalar(1.1), { sway: 1 });
      }
    },
    crystalTree(B, rng, x, z, s, c) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 5;
      B.part(geo('trunk'), 0, 0, 0, 0.26, 2.2, 0.26, col(0x3a2c58, rng), { rz: 0.1 });
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.28;
        B.part(geo('crystal'), Math.cos(a) * 0.3, 2.3, Math.sin(a) * 0.3, 0.55, 1.6 + rng(), 0.55, col(c, rng), { rx: Math.sin(a) * 0.5, rz: -Math.cos(a) * 0.5, glow: 1.3 });
      }
      B.part(geo('crystal'), 0, 2.2, 0, 0.6, 2.4, 0.6, col(c, rng).multiplyScalar(1.1), { glow: 1.6 });
    },
    bush(B, rng, x, z, s, c, dots) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 1.5;
      const parts = [[0, 0.42, 0, 0.75], [0.6, 0.32, 0.25, 0.55], [-0.55, 0.32, -0.15, 0.6], [0.05, 0.3, -0.6, 0.5]];
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        B.part(geo('sphere'), p[0], p[1], p[2], p[3], p[3] * 0.85, p[3], col(c, rng).multiplyScalar(i === 0 ? 1.08 : 0.95), { sway: 0.4 });
      }
      if (dots) for (let i = 0; i < 6; i++) {
        const a = rng() * 6.28;
        B.part(geo('sphereLo'), Math.cos(a) * 0.62, 0.45 + rng() * 0.4, Math.sin(a) * 0.62, 0.12, 0.12, 0.12, dots, { sway: 0.4 });
      }
    },
    rock(B, rng, x, z, s, c, snow) {
      B.at(x, 0, z, rng() * 6.28, s);
      const v = 'rock' + Math.floor(rng() * 4);
      B.part(geo(v), 0, 0.2, 0, 1.15, 0.8, 1, col(c, rng));
      if (snow) B.part(geo(v), 0, 0.55, 0, 0.95, 0.4, 0.82, col(snow, rng, 0.02));
    },
    spire(B, rng, x, z, s, c, vein, glow) {
      B.at(x, 0, z, rng() * 6.28, s);
      const v = 'rockHi' + Math.floor(rng() * 2);
      B.part(geo(v), 0, 1.2, 0, 0.95, 2.6, 0.95, col(c, rng));
      B.part(geo('rock' + Math.floor(rng() * 4)), 0.5, 0.3, 0.3, 0.7, 0.6, 0.7, col(c, rng));
      if (vein) for (let i = 0; i < 3; i++) {
        const a = rng() * 6.28;
        B.part(geo('rbox'), Math.cos(a) * 0.72, 0.8 + rng() * 2.2, Math.sin(a) * 0.72, 0.12, 0.7 + rng() * 0.6, 0.12, vein, { ry: -a, rz: (rng() - 0.5) * 0.6, glow: glow || 2 });
      }
    },
    stalagmite(B, rng, x, z, s, c) {
      B.at(x, 0, z, rng() * 6.28, s);
      B.part(geo('tier'), 0, 0, 0, 0.9, 2.6 + rng() * 1.6, 0.9, col(c, rng));
      B.part(geo('tier'), 0.7, 0, 0.2, 0.5, 1.3, 0.5, col(c, rng));
    },
    crystals(B, rng, x, z, s, c, glow) {
      B.at(x, 0, z, rng() * 6.28, s);
      const g2 = glow === undefined ? 1.4 : glow;
      B.part(geo('crystal'), 0, -0.1, 0, 0.75, 2.6, 0.75, col(c, rng), { glow: g2 * 1.1 });
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * 6.28 + rng();
        B.part(geo('crystal'), Math.cos(a) * 0.6, -0.1, Math.sin(a) * 0.6, 0.45, 1.1 + rng() * 0.9, 0.45, col(c, rng, 0.12), { rx: Math.sin(a) * 0.55, rz: -Math.cos(a) * 0.55, glow: g2 });
      }
      B.part(geo('rock' + Math.floor(rng() * 4)), 0, 0, 0, 0.8, 0.35, 0.8, col(0x4a4a66, rng));
    },
    mushroom(B, rng, x, z, s, cap, spots, glow) {
      B.at(x, 0, z, rng() * 6.28, s); B.swayH = 3;
      const h = 1.1 + rng() * 0.7;
      B.part(geo('trunk'), 0, 0, 0, 0.32, h, 0.32, col(0xf2e6d0, rng), { rz: (rng() - 0.5) * 0.15 });
      B.part(geo('cap'), 0, h - 0.15, 0, 1.25, 1.05, 1.25, col(cap, rng), { glow: glow || 0, sway: 0.2 });
      if (spots) for (let i = 0; i < 6; i++) {
        const a = rng() * 6.28, q = 0.35 + rng() * 0.45;
        B.part(geo('sphereLo'), Math.cos(a) * q * 1.2, h - 0.15 + 1.05 * (0.62 * (1 - q * q) + 0.04), Math.sin(a) * q * 1.2, 0.2, 0.07, 0.2, spots, { rx: Math.sin(a) * q, rz: -Math.cos(a) * q, sway: 0.2 });
      }
    },
    flower(B, rng, x, z, s, c) {
      B.at(x, 0, z, 0, s); B.swayH = 0.8;
      const h = 0.35 + rng() * 0.3;
      B.part(geo('stem'), 0, 0, 0, 0.035, h, 0.035, 0x4f9a3e, { sway: 0.8 });
      B.part(geo('blossom'), 0, h, 0, 0.22, 0.09, 0.22, col(c, rng), { sway: 0.8 });
      B.part(geo('gem'), 0, h + 0.06, 0, 0.08, 0.06, 0.08, 0xffe066, { sway: 0.8 });
    },
    flowers(B, rng, x, z, palette, n) {
      n = n || 3 + Math.floor(rng() * 4);
      const c = palette[Math.floor(rng() * palette.length)];
      for (let i = 0; i < n; i++) K.flower(B, rng, x + (rng() - 0.5) * 1.6, z + (rng() - 0.5) * 1.6, 0.9 + rng() * 0.4, c);
    },
    reeds(B, rng, x, z) {
      B.at(x, 0, z, 0, 1); B.swayH = 1.6;
      for (let i = 0; i < 5; i++) {
        const ox = (rng() - 0.5) * 0.8, oz = (rng() - 0.5) * 0.8, h = 1.1 + rng() * 0.8;
        B.part(geo('cyl6'), ox, 0, oz, 0.035, h, 0.035, col(0x5f9a48, rng), { sway: 0.9 });
        if (i % 2 === 0) B.part(geo('cyl6'), ox, h - 0.1, oz, 0.07, 0.32, 0.07, 0x7a4e2a, { sway: 0.9 });
      }
    },
    lily(B, rng, x, z, y) {
      B.at(x, y || 0.05, z, rng() * 6.28, 0.7 + rng() * 0.5);
      B.part(geo('disc'), 0, 0, 0, 0.7, 0.05, 0.7, col(0x4fae52, rng));
      if (rng() < 0.4) B.part(geo('sphereLo'), 0.2, 0.08, 0.1, 0.18, 0.12, 0.18, 0xff9ec8);
    },
    log(B, rng, x, z, s) {
      B.at(x, 0, z, rng() * 6.28, s);
      B.part(geo('cyl'), -1.1, 0.38, 0, 0.38, 2.2, 0.38, col(0x7a5232, rng), { rz: -Math.PI / 2 });
      B.part(geo('disc'), 1.11, 0.38, 0, 0.32, 0.02, 0.32, 0xd8b98a, { rz: -Math.PI / 2 });
      B.part(geo('sphereLo'), 0.3, 0.72, 0.1, 0.28, 0.1, 0.22, 0x5aa04a);
    },
    column(B, rng, x, z, h, c, cap, broken) {
      B.at(x, 0, z, rng() * 6.28, 1);
      const cc = col(c, rng, 0.04);
      B.part(geo('rbox'), 0, 0.2, 0, 1.4, 0.4, 1.4, cc);
      if (broken) {
        B.part(geo('cyl'), 0, 0.4, 0, 0.5, h, 0.5, cc);
        B.part(geo('rock' + Math.floor(rng() * 4)), 0, h + 0.4, 0, 0.52, 0.35, 0.52, cc);
        B.part(geo('cyl'), 1.1, 0.48, 0.4, 0.48, 1.1, 0.48, cc, { rz: Math.PI / 2, ry: rng() });
      } else {
        B.part(geo('cyl'), 0, 0.4, 0, 0.47, h, 0.47, cc);
        B.part(geo('rbox'), 0, h + 0.55, 0, 1.3, 0.35, 1.3, cap === undefined ? cc : col(cap, rng, 0.03), cap !== undefined && cap !== c ? { glow: 0.5 } : undefined);
      }
    },
    arch(B, rng, x, z, ry, c) {
      B.at(x, 0, z, ry, 1);
      const cc = col(c, rng, 0.04);
      [-1.6, 1.6].forEach(o => {
        B.part(geo('rbox'), o, 0.2, 0, 1.1, 0.4, 1.1, cc);
        B.part(geo('rbox'), o, 1.9, 0, 0.8, 3.2, 0.8, cc);
      });
      B.part(geo('rbox'), 0, 3.75, 0, 4.4, 0.6, 1.0, cc);
    },
    block(B, rng, x, z, c) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('rbox'), 0, 0.3, 0, 1.2 + rng() * 0.6, 0.6, 0.9 + rng() * 0.5, col(c, rng, 0.05), { rz: (rng() - 0.5) * 0.2 });
    },
    house(B, rng, x, z, ry, wall, roof) {
      B.at(x, 0, z, ry, 1);
      const w = 3.0, d = 2.6, h = 2.2, th = 0.6, ov = 0.4;
      const ridge = (d / 2 + ov) * Math.tan(th), half = (d / 2 + ov) / Math.cos(th);
      B.part(geo('rbox'), 0, 0.15, 0, w + 0.4, 0.3, d + 0.4, col(0x9a948a, rng));
      B.part(geo('rbox'), 0, h / 2 + 0.2, 0, w, h, d, col(wall, rng, 0.04));
      B.part(geo('prism'), 0, h + 0.2, 0, w - 0.05, ridge - 0.15, d, col(wall, rng, 0.04));
      const rc = col(roof, rng, 0.05);
      B.part(geo('rbox'), 0, h + 0.2 + ridge / 2, (d / 2 + ov) / 2, w + 0.6, 0.26, half + 0.15, rc, { rx: th });
      B.part(geo('rbox'), 0, h + 0.2 + ridge / 2, -(d / 2 + ov) / 2, w + 0.6, 0.26, half + 0.15, rc, { rx: -th });
      B.part(geo('rbox'), 0, 0.85, d / 2 + 0.04, 0.75, 1.3, 0.14, 0x6e4426);
      B.part(geo('sphereLo'), 0.22, 0.9, d / 2 + 0.13, 0.06, 0.06, 0.06, 0xffd166);
      [-0.95, 0.95].forEach(o => {
        B.part(geo('rbox'), o, 1.45, d / 2 + 0.03, 0.62, 0.62, 0.1, 0xffd28a, { glow: 1.1 });
        B.part(geo('rbox'), o, 1.45, d / 2 + 0.07, 0.72, 0.1, 0.1, 0xf2ecdc);
        B.part(geo('rbox'), o, 1.12, d / 2 + 0.12, 0.8, 0.12, 0.22, 0x8a5a34);
      });
      B.part(geo('rbox'), w * 0.28, h + ridge * 0.75, -d * 0.18, 0.45, 1.0, 0.45, col(0xa09486, rng));
    },
    stall(B, rng, x, z, ry, a, b) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('rbox'), 0, 0.5, 0, 2.2, 1.0, 1.0, col(0xb07a44, rng));
      B.part(geo('rbox'), 0, 1.02, 0, 2.3, 0.1, 1.1, col(0xe8d2a8, rng));
      [[-1.05, -0.45], [1.05, -0.45], [-1.05, 0.45], [1.05, 0.45]].forEach(p => B.part(geo('cyl6'), p[0], 0, p[1], 0.07, 2.3, 0.07, 0x7a5232));
      for (let i = 0; i < 5; i++) B.part(geo('rbox'), -0.96 + i * 0.48, 2.35, 0.1, 0.5, 0.08, 1.5, i % 2 ? a : b, { rx: 0.22 });
      const fr = [0xff5a5a, 0xffb84a, 0x8fd65a, 0xffe066, 0xc77dff];
      for (let i = 0; i < 7; i++) B.part(geo('sphereLo'), -0.85 + i * 0.28, 1.2, (rng() - 0.5) * 0.4, 0.15, 0.15, 0.15, fr[Math.floor(rng() * fr.length)]);
    },
    lantern(B, rng, x, z, warm) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('cyl6'), 0, 0, 0, 0.09, 2.1, 0.09, 0x4a3828);
      B.part(geo('rbox'), 0, 2.1, 0, 0.42, 0.12, 0.42, 0x4a3828);
      B.part(geo('rbox'), 0, 2.38, 0, 0.32, 0.42, 0.32, warm || 0xffcf6a, { glow: 2.6 });
      B.part(geo('rbox'), 0, 2.66, 0, 0.46, 0.12, 0.46, 0x4a3828);
      B.part(geo('sphereLo'), 0, 2.76, 0, 0.1, 0.1, 0.1, 0x4a3828);
    },
    torch(B, rng, x, z, flame) {
      B.at(x, 0, z, 0, 1); B.swayH = 2.5;
      B.part(geo('cyl6'), 0, 0, 0, 0.1, 1.7, 0.1, 0x3a2c22);
      B.part(geo('cap'), 0, 1.6, 0, 0.32, -0.45, 0.32, 0x3a2c22);
      B.part(geo('sphereLo'), 0, 1.9, 0, 0.2, 0.36, 0.2, flame || 0xff8a2a, { glow: 3, sway: 0.4 });
      B.part(geo('sphereLo'), 0, 1.85, 0, 0.12, 0.2, 0.12, 0xffe08a, { glow: 3.5, sway: 0.4 });
    },
    brazier(B, rng, x, z, flame) {
      B.at(x, 0, z, 0, 1); B.swayH = 2;
      B.part(geo('trunk'), 0, 0, 0, 0.28, 0.8, 0.28, 0x2c2420);
      B.part(geo('cap'), 0, 1.1, 0, 0.55, -0.45, 0.55, 0x3a3028);
      B.part(geo('sphereLo'), 0, 1.25, 0, 0.36, 0.55, 0.36, flame || 0xff7a2a, { glow: 3, sway: 0.5 });
      B.part(geo('sphereLo'), 0, 1.2, 0, 0.2, 0.32, 0.2, 0xffe08a, { glow: 3.5, sway: 0.5 });
    },
    barrel(B, rng, x, z) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('cyl'), 0, 0, 0, 0.45, 1.0, 0.45, col(0x9a6a3a, rng));
      B.part(geo('torus'), 0, 0.25, 0, 0.46, 0.46, 0.5, 0x5a4a3a, { rx: Math.PI / 2 });
      B.part(geo('torus'), 0, 0.75, 0, 0.46, 0.46, 0.5, 0x5a4a3a, { rx: Math.PI / 2 });
    },
    crate(B, rng, x, z) {
      B.at(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.3);
      B.part(geo('rbox'), 0, 0.45, 0, 0.9, 0.9, 0.9, col(0xc08a50, rng));
      B.part(geo('rbox'), 0, 0.45, 0, 0.96, 0.18, 0.96, 0x8a5a30);
    },
    fence(B, rng, x0, z0, x1, z1, c) {
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
      const n = Math.max(1, Math.round(len / 1.6));
      B.at(x0, 0, z0, ry, 1);
      for (let i = 0; i <= n; i++) {
        B.part(geo('rbox'), 0, 0.55, i * len / n, 0.2, 1.1, 0.2, col(c || 0xb88a5a, rng, 0.05));
      }
      B.part(geo('rbox'), 0, 0.75, len / 2, 0.1, 0.14, len, col(c || 0xb88a5a, rng, 0.05));
      B.part(geo('rbox'), 0, 0.4, len / 2, 0.1, 0.14, len, col(c || 0xb88a5a, rng, 0.05));
    },
    signpost(B, rng, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('cyl6'), 0, 0, 0, 0.1, 2.2, 0.1, 0x7a5232);
      B.part(geo('rbox'), 0.35, 1.8, 0, 1.1, 0.34, 0.1, 0xd8a868, { rz: 0.05 });
      B.part(geo('rbox'), -0.3, 1.35, 0, 1.0, 0.32, 0.1, 0xc8945a, { rz: -0.06 });
    },
    well(B, rng, x, z) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('cyl'), 0, 0, 0, 1.0, 0.8, 1.0, col(0xa8a49a, rng));
      B.part(geo('disc'), 0, 0.75, 0, 0.8, 0.06, 0.8, 0x3a9ad8, { glow: 0.2 });
      [-0.85, 0.85].forEach(o => B.part(geo('cyl6'), o, 0.7, 0, 0.08, 1.6, 0.08, 0x6e4a2e));
      B.part(geo('rbox'), 0, 2.45, 0.32, 2.2, 0.12, 0.85, 0xb0523a, { rx: 0.5 });
      B.part(geo('rbox'), 0, 2.45, -0.32, 2.2, 0.12, 0.85, 0xb0523a, { rx: -0.5 });
    },
    haybale(B, rng, x, z) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('cyl'), -0.6, 0.62, 0, 0.62, 1.2, 0.62, col(0xe8c860, rng), { rz: -Math.PI / 2 });
    },
    puff(B, rng, x, z, s, c) {
      B.at(x, 0, z, rng() * 6.28, s);
      [[0, 0.5, 0, 1], [0.8, 0.35, 0.2, 0.7], [-0.75, 0.3, -0.1, 0.75], [0.1, 0.9, 0.1, 0.6]].forEach(p =>
        B.part(geo('sphere'), p[0], p[1], p[2], p[3], p[3] * 0.85, p[3], col(c || 0xffffff, rng, 0.03), { glow: 0.15 }));
    },
    rainbow(B, x, z, ry, R) {
      B.at(x, 0, z, ry, 1);
      const cs = [0xff5a5a, 0xffa94a, 0xffe066, 0x6ee06a, 0x5ab8ff, 0xa77dff];
      for (let i = 0; i < cs.length; i++) {
        const r = R - i * 0.32;
        B.part(geo('torusHalf'), 0, 0, 0, r, r, 1.4, cs[i], { glow: 0.55 });
      }
    },
    rib(B, rng, x, z, ry, s, c) {
      B.at(x, 0, z, ry, s);
      for (let i = 0; i < 4; i++) B.part(geo('torusHalf'), 0, -0.2, -1.2 + i * 0.8, 1.6 - Math.abs(i - 1.5) * 0.2, 2.2 - Math.abs(i - 1.5) * 0.3, 1.2, col(c || 0xf0e6cc, rng, 0.03));
      B.part(geo('cyl'), 0, 0.15, -1.8, 0.16, 3.6, 0.16, col(c || 0xf0e6cc, rng, 0.03), { rx: Math.PI / 2 });
    },
    bone(B, rng, x, z, c) {
      B.at(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.5);
      B.part(geo('cyl'), 0, 0.18, -0.8, 0.13, 1.6, 0.13, col(c || 0xf0e6cc, rng), { rx: Math.PI / 2 });
      [-0.8, 0.8].forEach(o => { B.part(geo('sphereLo'), 0.12, 0.2, o, 0.2, 0.2, 0.2, c || 0xf0e6cc); B.part(geo('sphereLo'), -0.12, 0.2, o, 0.2, 0.2, 0.2, c || 0xf0e6cc); });
    },
    skull(B, rng, x, z, ry, s, c, eye) {
      B.at(x, 0, z, ry, s);
      B.part(geo('sphere'), 0, 1.3, 0, 1.25, 1.1, 1.25, col(c || 0xf0e6cc, rng, 0.03));
      B.part(geo('rbox'), 0, 0.45, 0.35, 1.3, 0.6, 1.0, col(c || 0xf0e6cc, rng, 0.03));
      [-0.45, 0.45].forEach(o => B.part(geo('sphereLo'), o, 1.3, 1.0, 0.33, 0.38, 0.2, eye || 0x2a2018, eye ? { glow: 2.5 } : undefined));
    },
    cactus(B, rng, x, z) {
      B.at(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.4); B.swayH = 4;
      const c = col(0x5fae5a, rng);
      B.part(geo('cyl'), 0, 0, 0, 0.42, 2.4, 0.42, c); B.part(geo('sphere'), 0, 2.4, 0, 0.42, 0.42, 0.42, c);
      B.part(geo('cyl'), 0.45, 1.0, 0, 0.26, 0.5, 0.26, c, { rz: -Math.PI / 2 }); B.part(geo('cyl'), 0.75, 1.0, 0, 0.26, 0.8, 0.26, c); B.part(geo('sphere'), 0.75, 1.8, 0, 0.26, 0.26, 0.26, c);
      B.part(geo('sphereLo'), 0, 2.8, 0, 0.18, 0.12, 0.18, 0xff7ab0);
    },
    obelisk(B, rng, x, z, c, rune) {
      B.at(x, 0, z, rng() * 6.28, 1);
      B.part(geo('rbox'), 0, 0.3, 0, 2.0, 0.6, 2.0, col(c, rng));
      B.part(geo('rbox'), 0, 3.4, 0, 1.3, 5.8, 1.3, col(c, rng));
      B.part(geo('gem'), 0, 6.6, 0, 0.75, 0.9, 0.75, rune, { glow: 2.4 });
      for (let i = 0; i < 4; i++) B.part(geo('rbox'), 0, 1.6 + i * 1.2, 0.66, 0.5, 0.18, 0.06, rune, { glow: 2.2 });
    },
    starPillar(B, rng, x, z, h, c, tip) {
      B.at(x, 0, z, rng() * 6.28, 1); B.swayH = h;
      B.part(geo('rbox'), 0, 0.2, 0, 1.2, 0.4, 1.2, col(c, rng));
      B.part(geo('trunk'), 0, 0.4, 0, 0.38, h, 0.38, col(c, rng));
      B.part(geo('gem'), 0, h + 1.0, 0, 0.45, 0.62, 0.45, tip, { glow: 2.6 });
      B.part(geo('torus'), 0, h + 1.0, 0, 0.7, 0.7, 0.7, tip, { glow: 1.6, rx: Math.PI / 2 });
    },
    orb(B, rng, x, z, y, c, s) {
      B.at(x, y, z, 0, s || 1);
      B.part(geo('sphere'), 0, 0, 0, 0.42, 0.42, 0.42, c, { glow: 2.4 });
    },
    dome(B, rng, x, z, s) {
      B.at(x, 0, z, rng() * 6.28, s);
      B.part(geo('cyl'), 0, 0, 0, 1.7, 0.35, 1.7, 0x7a7f96);
      B.part(geo('hemi'), 0, 0.33, 0, 1.55, 1.4, 1.55, 0xbfe8ff, { glow: 0.45 });
      B.part(geo('torus'), 0, 0.4, 0, 1.6, 1.6, 1.0, 0x5ef0c0, { rx: Math.PI / 2, glow: 2 });
    },
    alienPlant(B, rng, x, z, c) {
      B.at(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.5); B.swayH = 2;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + rng(), h = 1 + rng() * 0.9;
        B.part(geo('cyl6'), Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2, 0.06, h, 0.06, 0x3e7a6a, { rx: Math.sin(a) * 0.3, rz: -Math.cos(a) * 0.3, sway: 1 });
        B.part(geo('sphere'), Math.cos(a) * (0.2 + h * 0.3), h, Math.sin(a) * (0.2 + h * 0.3), 0.22, 0.28, 0.22, c, { glow: 2.2, sway: 1 });
      }
    },
    snowman(B, rng, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('sphere'), 0, 0.6, 0, 0.72, 0.65, 0.72, 0xf8fbff);
      B.part(geo('sphere'), 0, 1.45, 0, 0.5, 0.48, 0.5, 0xf8fbff);
      B.part(geo('sphere'), 0, 2.08, 0, 0.36, 0.36, 0.36, 0xf8fbff);
      B.part(geo('cyl6'), 0, 2.08, 0.32, 0.06, 0.32, 0.06, 0xff8a2a, { rx: Math.PI / 2 });
      [-0.13, 0.13].forEach(o => B.part(geo('sphereLo'), o, 2.18, 0.31, 0.05, 0.05, 0.05, 0x222233));
      B.part(geo('torus'), 0, 1.78, 0, 0.36, 0.36, 0.8, 0xe84a5a, { rx: Math.PI / 2 });
    },
    iceSpike(B, rng, x, z, s) {
      B.at(x, 0, z, rng() * 6.28, s);
      B.part(geo('crystal'), 0, -0.2, 0, 0.9, 3.4 + rng() * 1.6, 0.9, col(0xbfe8ff, rng, 0.05), { glow: 0.35 });
      B.part(geo('crystal'), 0.6, -0.2, 0.2, 0.5, 1.8, 0.5, col(0xd8f2ff, rng, 0.05), { rz: -0.4, glow: 0.35 });
    },
    flag(B, rng, x, z, c) {
      B.at(x, 0, z, rng() * 6.28, 1); B.swayH = 3;
      B.part(geo('cyl6'), 0, 0, 0, 0.06, 2.8, 0.06, 0xd8d8e0);
      B.part(geo('rbox'), 0.55, 2.4, 0, 1.0, 0.65, 0.05, c, { sway: 0.8 });
    },
    banner(B, rng, x, z, ry, c) {
      B.at(x, 0, z, ry, 1); B.swayH = 3.6;
      B.part(geo('cyl6'), 0, 0, 0, 0.08, 3.6, 0.08, 0x6e4a2e);
      B.part(geo('rbox'), 0, 2.6, 0.1, 0.8, 1.6, 0.06, c, { sway: 0.6 });
      B.part(geo('gem'), 0, 3.7, 0, 0.16, 0.24, 0.16, 0xffd166, { glow: 1 });
    },
    runeStone(B, rng, x, z, c, glowCol) {
      // a chunky standing tablet with a glowing rune (rounded box, slight lean) — lumpy rocks here read as eggs
      B.at(x, 0, z, Math.atan2(-x, -z), 1);
      const h = 1.05 + rng() * 0.35;
      B.part(geo('rboxS'), 0, h / 2, 0, 0.62, h, 0.3, col(c, rng, 0.05).lerp(_rsTint, 0.55), { rx: (rng() - 0.5) * 0.12, rz: (rng() - 0.5) * 0.12 });
      B.part(geo('rbox'), 0, h * 0.55, 0.16, 0.14, h * 0.5, 0.04, glowCol, { glow: 2.2 });
      B.part(geo('rbox'), 0, h * 0.55, 0.16, 0.36, 0.1, 0.04, glowCol, { glow: 2.2 });
    },
    stump(B, rng, x, z, s) {
      B.at(x, 0, z, rng() * 6.28, s);
      B.part(geo('trunk'), 0, 0, 0, 0.6, 0.7, 0.6, col(0x7a5232, rng));
      B.part(geo('disc'), 0, 0.69, 0, 0.37, 0.03, 0.37, 0xd8b98a);
    },
  };

  // ============================== islands ==============================
  // per-biome palette: ground g[base, light, dark], path, lip(edge), dirt, rock strata, grass tufts, under-side feature
  const ST = {
    grass: { g: [0x5aae46, 0x7fcc5c, 0x47963e], path: 0xd9b980, edge: 0x63bb4f, dirt: 0xa86d3f, rock: [0xb98d66, 0x9c7658, 0x83654f], tuft: [0x52a843, 0x8fd862], under: 'roots', gate: 'lantern' },
    forest: { g: [0x4a9a48, 0x68b85a, 0x387d3c], path: 0xc6a068, edge: 0x45923f, dirt: 0x8a5a36, rock: [0x8e7560, 0x76604f, 0x5f4e42], tuft: [0x3f9a40, 0x78c858], under: 'roots', gate: 'lantern' },
    water: { g: [0x67c45c, 0x8fdc78, 0x4ea84e], path: 0xe8d3a0, edge: 0x5cb951, dirt: 0x9a6a40, rock: [0xa8987e, 0x8c8070, 0x6f675c], tuft: [0x58b450, 0x92dc72], under: 'roots', gate: 'lantern' },
    flower: { g: [0x86d266, 0xb0e886, 0x6abd56], path: 0xf2d9a8, edge: 0x7acb5c, dirt: 0xa8704a, rock: [0xc49a78, 0xa98065, 0x8e6c58], tuft: [0x7ccc58, 0xb8ee86], under: 'roots', gate: 'lantern' },
    mushroom: { g: [0x5aa884, 0x7cc89c, 0x4e9a80], path: 0xd9c7a8, edge: 0x4f9c78, dirt: 0x7a5a4a, rock: [0x7a6a8a, 0x66587a, 0x544868], tuft: [0x4fae7e, 0x8fdcb0], under: 'roots', gate: 'torch' },
    ruin: { g: [0xbfae86, 0xd4c7a2, 0xa2916c], path: 0xebe2c8, edge: 0x8fb862, dirt: 0xa8946e, rock: [0xc8b892, 0xae9f7c, 0x948666], tuft: [0x92bc60, 0xc4dc7a], tuftK: 0.35, under: 'roots', gate: 'torch', tiles: true },
    crystal: { g: [0xb4e1ec, 0xd8f4f8, 0x8cc4d8], path: 0xeaf8fc, edge: 0xc8ecf4, dirt: 0x8aa0c0, rock: [0x7c8fb8, 0x66789f, 0x55628a], tuft: null, under: 'crystals', glowC: 0x7fe8ff, gate: 'crystal' },
    cloud: { g: [0xf2f7ff, 0xffffff, 0xdbe6f6], path: 0xffefc6, edge: 0xffffff, dirt: 0xeef4fd, rock: [0xf4f8ff, 0xe4edf9, 0xd6e2f3], tuft: null, under: 'none', gate: 'post', cloudy: true },
    village: { g: [0x86cc5e, 0xaae081, 0x6cb250], path: 0xd9bb8c, edge: 0x7cc356, dirt: 0xa06a40, rock: [0xb98d66, 0x9c7658, 0x83654f], tuft: [0x6cbe4e, 0xa6e070], under: 'roots', gate: 'lantern', tiles: true },
    ice: { g: [0xeef6ff, 0xffffff, 0xcfe2f6], path: 0xd2e8fa, edge: 0xf6fbff, dirt: 0xa8c6e2, rock: [0x8fb0d0, 0x7698bb, 0x5f7fa6], tuft: null, under: 'icicles', gate: 'crystal', glowC: 0xbfeaff },
    lava: { g: [0x3d3436, 0x534849, 0x2a2224], path: 0x5a4c48, edge: 0x4a3e3e, dirt: 0x3a2f30, rock: [0x3a2f30, 0x2c2325, 0x221a1c], tuft: null, under: 'drips', cracks: 0xff6a1a, gate: 'torch' },
    pillars: { g: [0xd8d0b8, 0xece6d2, 0xbfb69a], path: 0xf2ecdb, edge: 0x9cc06a, dirt: 0xb0a284, rock: [0xcfc5a8, 0xb5aa8c, 0x9a9074], tuft: [0x9cc06a, 0xc8de86], tuftK: 0.4, under: 'roots', gate: 'torch', tiles: true },
    bone: { g: [0xdcc28a, 0xecd6a2, 0xc4a76e], path: 0xc8ab78, edge: 0xd2b47c, dirt: 0xc49a66, rock: [0xd09a62, 0xb8824e, 0xa06c42], tuft: [0xc8b56a, 0xa89a50], tuftK: 0.25, under: 'none', gate: 'torch', dunes: true },
    storm: { g: [0x4f5068, 0x62647e, 0x3d3e52], path: 0x6c6e88, edge: 0x5a5c76, dirt: 0x45465c, rock: [0x45465c, 0x37384a, 0x2c2c3c], tuft: null, under: 'crystals', glowC: 0x6aa0ff, cracks: 0x6aa0ff, gate: 'crystal' },
    star: { g: [0x3b3a7a, 0x4e4d98, 0x2c2b5e], path: 0x5a58a8, edge: 0x4a4890, dirt: 0x2e2c66, rock: [0x34336a, 0x2a2958, 0x201f46], tuft: null, under: 'crystals', glowC: 0xffe066, specks: [0xfff2a8, 0xffffff], gate: 'crystal' },
    nebula: { g: [0x5b3f8f, 0x7a58b0, 0x452f72], path: 0x8a68c0, edge: 0x6a4aa0, dirt: 0x3e2a66, rock: [0x4a3478, 0x3b2964, 0x2e2050], tuft: [0x9a6ae0, 0xe08ae8], tuftK: 0.5, under: 'crystals', glowC: 0xff9de2, specks: [0xff9de2, 0xc49cff], gate: 'crystal' },
    moon: { g: [0xc4c6d4, 0xdadce8, 0xa5a8ba], path: 0xb0b2c4, edge: 0xb8bacb, dirt: 0x9a9cb0, rock: [0x9a9cb0, 0x84869a, 0x6e7084], tuft: null, under: 'none', craters: true, gate: 'crystal', glowC: 0xa8f0ff },
    comet: { g: [0x3c4f78, 0x506696, 0x2c3a5c], path: 0x5a72a0, edge: 0x46598a, dirt: 0x2c3a5c, rock: [0x34456a, 0x2a3858, 0x202c46], tuft: null, under: 'crystals', glowC: 0x9fd4ff, specks: [0x9fd4ff], gate: 'crystal' },
    aurora: { g: [0x2f6b62, 0x3f8a7c, 0x22514a], path: 0x4a9a88, edge: 0x2f7a6a, dirt: 0x22443e, rock: [0x2a4a50, 0x223c44, 0x1a3036], tuft: [0x3fc9a0, 0x8ff0d0], tuftK: 0.6, under: 'icicles', glowC: 0x7ff0d0, specks: [0x7ff0d0], gate: 'crystal' },
    alien: { g: [0x7a52a8, 0x9670c6, 0x5e3d86], path: 0xa080d0, edge: 0x8a5ab8, dirt: 0x4a3070, rock: [0x5a3c84, 0x4a3070, 0x3a2458], tuft: [0xb36ae8, 0x5ef0c0], tuftK: 0.6, under: 'crystals', glowC: 0x5ef0c0, specks: [0x5ef0c0], gate: 'crystal' },
    cave: { g: [0x46465a, 0x585870, 0x34344a], path: 0x5a5a72, edge: 0x4a4a60, dirt: 0x34344a, rock: [0x3a3a4c, 0x2e2e3e, 0x242432], tuft: null, under: 'crystals', glowC: 0xb08fff, specks: [0xb08fff, 0x66e8ff], gate: 'crystal' },
    lake: { g: [0x3f9fd6, 0x6cc4ee, 0x2f7fb8], path: null, edge: 0x5cb951, dirt: 0x8a6a42, rock: [0x8e8676, 0x76705f, 0x5f5a4c], tuft: null, under: 'roots', water: true, gate: 'lantern', rough: 0.15 },
    mist: { g: [0x6d806a, 0x84987f, 0x56684f], path: 0x8a8a76, edge: 0x5e7458, dirt: 0x5a4a3c, rock: [0x6a6a62, 0x585850, 0x484840], tuft: [0x5e7a58, 0x86a07a], under: 'roots', gate: 'lantern' },
    temple: { g: [0x2e2840, 0x3c3454, 0x231e32], path: 0x4a4064, edge: 0x3a3250, dirt: 0x231e32, rock: [0x2a2438, 0x221d2e, 0x1a1624], tuft: null, under: 'crystals', glowC: 0xd8b34a, tiles: true, gold: true, gate: 'brazier' },
    garden: { g: [0xb8e49a, 0xd6f4bc, 0x9cd282], path: 0xfbe8c8, edge: 0xa4d688, dirt: 0x9a7050, rock: [0xc0a080, 0xa88a6c, 0x8e7458], tuft: [0xa0d880, 0xd0f2a8], under: 'roots', gate: 'lantern' },
    vault: { g: [0x231b1c, 0x302526, 0x181213], path: 0x3a2e2e, edge: 0x2a2020, dirt: 0x1a1414, rock: [0x231b1c, 0x1a1414, 0x120e0e], tuft: null, under: 'drips', cracks: 0xff5a1a, gate: 'brazier' },
    tree: { g: [0xbf9058, 0xd6aa70, 0x9e7244], path: null, edge: 0x7a5232, dirt: 0x6e4a2c, rock: [0x6e4a2c, 0x5d3e25, 0x4e331f], tuft: null, under: 'roots', rings: true, gate: 'lantern' },
    relic: { g: [0xe8dfc2, 0xf6f0dc, 0xd2c7a4], path: 0xf8f2e0, edge: 0xa8cc78, dirt: 0xc8b890, rock: [0xe0d4b0, 0xc8bc98, 0xb0a480], tuft: [0xa8cc78, 0xd0e69a], tuftK: 0.35, under: 'roots', tiles: true, gate: 'torch' },
    cavefloor: { g: [0x4d4038, 0x5e5046, 0x3b302a], path: 0x6a5a4e, edge: 0x4a3e36, dirt: 0x3e322b, rock: [0x3e322b, 0x332822, 0x281f1a], tuft: null, under: 'drips', cracks: 0xff7a2a, crackK: 0.35, gate: 'torch' },
    deepcrystal: { g: [0x3a2c56, 0x4a3a6c, 0x2c2142], path: 0x5a4a80, edge: 0x3e2e5e, dirt: 0x2c2142, rock: [0x2e2246, 0x241a38, 0x1a1228], tuft: null, under: 'crystals', glowC: 0x9a7bff, specks: [0x9a7bff, 0x6ae8ff], gate: 'crystal' },
    magma: { g: [0x2a1a16, 0x3a2420, 0x1c100e], path: 0x3a2622, edge: 0x2e1c18, dirt: 0x1c100e, rock: [0x2a1a16, 0x1e1210, 0x140c0a], tuft: null, under: 'drips', cracks: 0xff5a1a, gate: 'brazier' },
    bonecave: { g: [0x6e5d4a, 0x84705a, 0x56483a], path: 0x8a7660, edge: 0x5e4e3e, dirt: 0x4a3c30, rock: [0x56483a, 0x46392e, 0x382c22], tuft: null, under: 'drips', cracks: 0xff7a2a, crackK: 0.25, gate: 'torch' },
    coretemple: { g: [0x241812, 0x31211a, 0x1a110c], path: 0x3a281e, edge: 0x2a1c14, dirt: 0x1a110c, rock: [0x241812, 0x1a110c, 0x120a06], tuft: null, under: 'drips', cracks: 0xff6a1a, tiles: true, gold: true, gate: 'brazier' },
  };
  const hexCss = h => '#' + (h >>> 0).toString(16).padStart(6, '0');
  const islands = [];        // { isle, group, props, grass, center }
  const anims = [];          // { kind, obj, group, ... } small per-frame animations

  // where NOT to put solid props: quest spots, portals, switches, pads, bridge landings, spawn
  function exclusions(isle) {
    const ex = [{ x: 0, z: 0, r: 3.5 }];
    const anchors = [];
    if (typeof SKY_QUESTS !== 'undefined') SKY_QUESTS.forEach(q => {
      if (q.island !== isle.id) return;
      const big = q.type === 'boss' || q.type === 'arena';
      ex.push({ x: q.dx || 0, z: q.dz || 0, r: big ? 6.5 : 3.3, quest: true });
    });
    if (typeof SKY_PORTALS !== 'undefined') SKY_PORTALS.forEach(p => { if (p.island === isle.id) { ex.push({ x: p.dx, z: p.dz, r: 4.4, portal: true }); anchors.push({ x: p.dx, z: p.dz, kind: 'portal' }); } });
    if (typeof SKY_SWITCHES !== 'undefined') SKY_SWITCHES.forEach(s => { if (s.island === isle.id) ex.push({ x: s.dx, z: s.dz, r: 2.6 }); });
    if (typeof SKY_PADS !== 'undefined') SKY_PADS.forEach(p => { if (p.island === isle.id) { ex.push({ x: p.dx, z: p.dz, r: 3.2 }); anchors.push({ x: p.dx, z: p.dz, kind: 'pad' }); } });
    if (typeof SKY_BRIDGES !== 'undefined') SKY_BRIDGES.forEach(b => {
      let other = null;
      if (b.from === isle.id) other = b.to; else if (b.to === isle.id) other = b.from;
      const o = other && SKY_ISLANDS.find(i => i.id === other);
      if (!o) return;
      const a = Math.atan2(o.pos[2] - isle.pos[2], o.pos[0] - isle.pos[0]);
      for (let f = 0.4; f <= 1.12; f += 0.1) ex.push({ x: Math.cos(a) * isle.r * f, z: Math.sin(a) * isle.r * f, r: 2.6, bridge: true });
      anchors.push({ x: Math.cos(a) * (isle.r - 0.5), z: Math.sin(a) * (isle.r - 0.5), kind: 'bridge', a, hidden: !!(b.quest || b.switch) });
    });
    return { ex, anchors };
  }
  function blocked(ex, x, z, clear) {
    for (let i = 0; i < ex.length; i++) { const e = ex[i]; if (Math.hypot(x - e.x, z - e.z) < e.r + clear) return true; }
    return false;
  }
  function makePlacer(isle, rng, ex) {
    const placed = [];
    return function place(n, f0, f1, clear, spacing, cb) {
      let tries = n * 14;
      while (n > 0 && tries-- > 0) {
        const a = rng() * Math.PI * 2;
        const rr = isle.r * Math.sqrt(f0 * f0 + (f1 * f1 - f0 * f0) * rng());
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (blocked(ex, x, z, clear)) continue;
        let ok = true;
        if (spacing) for (let i = 0; i < placed.length; i++) { const p = placed[i]; if (Math.hypot(x - p.x, z - p.z) < spacing + p.s) { ok = false; break; } }
        if (!ok) continue;
        if (spacing) placed.push({ x, z, s: spacing * 0.5 });
        cb(x, z, a, rr);
        n--;
      }
    };
  }

  function outlineFn(isle, rng) {
    const p1 = rng() * 6.28, p2 = rng() * 6.28, p3 = rng() * 6.28, amp = Math.min(1.4, isle.r * 0.07);
    return a => isle.r + 0.1 + amp * (0.5 + 0.5 * (Math.sin(3 * a + p1) * 0.5 + Math.sin(5 * a + p2) * 0.3 + Math.sin(8 * a + p3) * 0.2));
  }
  function segsFor(r) { return Math.max(36, Math.min(76, Math.round(r * 2.8))); }

  // flat walkable top (local y = 0) with planar UVs onto the island's painted canvas
  function topGeometry(isle, R, Rm) {
    const S = segsFor(isle.r), Kr = Math.max(4, Math.ceil(isle.r / 3));
    const pos = [0, 0, 0], uv = [0.5, 0.5], idx = [];
    for (let k = 1; k <= Kr; k++) {
      for (let s = 0; s < S; s++) {
        const a = s / S * Math.PI * 2, rr = R(a) * k / Kr;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        pos.push(x, 0, z);
        uv.push(x / (2 * Rm) + 0.5, 0.5 - z / (2 * Rm));
      }
    }
    for (let s = 0; s < S; s++) idx.push(0, 1 + (s + 1) % S, 1 + s);
    for (let k = 1; k < Kr; k++) {
      const a0 = 1 + (k - 1) * S, a1 = 1 + k * S;
      for (let s = 0; s < S; s++) {
        const s1 = (s + 1) % S;
        idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const nrm = new Float32Array(pos.length);
    for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  }

  // grass lip + layered cliffs tapering to a point, with vertex colours
  function bodyGeometry(isle, st, R, rng, depth) {
    const S = segsFor(isle.r);
    const nz = new THREE.ImprovedNoise(), seed = isle.seed * 3.7;
    const rows = [];  // { r(a), y(a), c(a, y) }
    const edge = new THREE.Color(st.edge), dirt = new THREE.Color(st.dirt);
    const drip = a => 0.85 + 0.75 * (0.5 + 0.5 * nz.noise(Math.cos(a) * 3, Math.sin(a) * 3, seed));
    const lip = st.cloudy ? [[0, 0], [0.4, -0.2], [0.7, -0.7], [0.75, -1.4], [0.55, -2.1], [0.2, -2.6]]
      : [[0, 0], [0.3, -0.08], [0.5, -0.35], [0.54, -0.72], [0.42, -1.12], [0.16, -1.5]];
    lip.forEach(([dr, y]) => rows.push({ r: a => R(a) + dr, y: () => y, c: (a, yy) => (yy > -drip(a) ? edge : dirt), lip: true }));
    rows.push({ r: a => R(a) * 0.985 - 0.1, y: () => -2.0, c: () => dirt });
    const top = -2.4, layers = Math.max(3, Math.round(depth / 5.5));
    const taper = t => Math.pow(Math.max(0, 1 - Math.pow(t, 1.35)), 0.72);
    for (let j = 0; j < layers; j++) {
      const t0 = j / layers, t1 = (j + 1) / layers;
      const rc = new THREE.Color(st.rock[j % st.rock.length]);
      const steps = [[t0 + 0.02, 1.04, 1.12], [t0 + (t1 - t0) * 0.45, 1.0, 1.0], [t1 - 0.02, 0.9, 0.78]];
      steps.forEach(([t, k, light]) => {
        const y = top - t * (depth + top);
        rows.push({
          r: a => {
            const n = nz.noise(Math.cos(a) * 2.2 + seed, y * 0.11, Math.sin(a) * 2.2) * 0.22 + nz.noise(Math.cos(a) * 6 + seed, y * 0.3, Math.sin(a) * 6) * 0.07;
            return Math.max(0.3, R(a) * 0.98 * taper(t) * k * (1 + n));
          },
          y: () => y,
          c: () => tint(rc.getHex(), light * (1 - t * 0.38)),
        });
      });
    }
    const S1 = S;
    const pos = [], colA = [], idx = [];
    rows.forEach(row => {
      for (let s = 0; s < S1; s++) {
        const a = s / S1 * Math.PI * 2;
        const rr = row.r(a), y = row.y(a);
        pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        const c = row.c(a, y);
        const j = row.lip ? 1 : 0.94 + 0.12 * (0.5 + 0.5 * nz.noise(Math.cos(a) * 8, y * 0.5, Math.sin(a) * 8 + seed));
        colA.push(c.r * j, c.g * j, c.b * j);
      }
    });
    // tip
    const tip = pos.length / 3;
    pos.push(0, -depth - 1.2, 0);
    const lastC = new THREE.Color(st.rock[(layers - 1) % st.rock.length]).multiplyScalar(0.55);
    colA.push(lastC.r, lastC.g, lastC.b);
    for (let rI = 0; rI < rows.length - 1; rI++) {
      const a0 = rI * S1, a1 = (rI + 1) * S1;
      for (let s = 0; s < S1; s++) {
        const s1 = (s + 1) % S1;
        idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s);
      }
    }
    const last = (rows.length - 1) * S1;
    for (let s = 0; s < S1; s++) idx.push(last + s, last + (s + 1) % S1, tip);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geo: g, taper, top };
  }

  // ---------- the island's painted top (canvas → map, optional emissive map) ----------
  function paintTop(isle, st, R, Rm, info, rng, size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const k = size / (2 * Rm);
    const X = x => (x / (2 * Rm) + 0.5) * size;
    const em = (st.cracks || st.specks || st.gold) ? document.createElement('canvas') : null;
    let e = null;
    if (em) { em.width = em.height = size; e = em.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, size, size); }
    const rp = () => { const a = rng() * 6.28, rr = Math.sqrt(rng()) * isle.r; return [Math.cos(a) * rr, Math.sin(a) * rr]; };
    c.fillStyle = hexCss(st.g[0]);
    c.fillRect(0, 0, size, size);
    // soft large colour patches
    for (let i = 0; i < 34; i++) {
      const [x, z] = rp(), rad = (2.5 + rng() * 6) * k;
      const gr = c.createRadialGradient(X(x), X(z), 0, X(x), X(z), rad);
      const hc = hexCss(st.g[i % 3 === 0 ? 2 : 1]);
      gr.addColorStop(0, hc); gr.addColorStop(1, hc + '00');
      c.globalAlpha = 0.45;
      c.fillStyle = gr;
      c.fillRect(X(x) - rad, X(z) - rad, rad * 2, rad * 2);
    }
    // fine speckle
    const nSp = Math.floor(size * size / 60);
    for (let i = 0; i < nSp; i++) {
      c.globalAlpha = 0.18 + rng() * 0.25;
      c.fillStyle = hexCss(st.g[rng() < 0.5 ? 1 : 2]);
      const w = 1 + rng() * 2.2;
      c.fillRect(rng() * size, rng() * size, w, w * (st.tuft ? 2.2 : 1));
    }
    c.globalAlpha = 1;
    if (st.water) {   // whole top is a lake: ripple rings
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 26; i++) {
        const [x, z] = rp();
        c.lineWidth = 1 + rng() * 2;
        c.beginPath(); c.arc(X(x), X(z), (0.5 + rng() * 2.5) * k, 0, 6.28); c.stroke();
      }
      const gr = c.createRadialGradient(size / 2, size / 2, isle.r * 0.75 * k, size / 2, size / 2, Rm * k);
      gr.addColorStop(0, 'rgba(120,200,120,0)'); gr.addColorStop(0.7, hexCss(st.edge));
      c.fillStyle = gr; c.fillRect(0, 0, size, size);
    }
    if (st.rings) {   // tree stump growth rings + cracks
      c.strokeStyle = hexCss(0x8a5e34);
      for (let rr = 1.4; rr < isle.r; rr += 1.3 + rng() * 0.6) {
        c.lineWidth = (0.15 + rng() * 0.12) * k;
        c.globalAlpha = 0.55;
        c.beginPath();
        for (let s = 0; s <= 64; s++) {
          const a = s / 64 * 6.28, w = rr * (1 + Math.sin(a * 3 + rr) * 0.02);
          const px = X(Math.cos(a) * w), pz = X(Math.sin(a) * w);
          if (s) c.lineTo(px, pz); else c.moveTo(px, pz);
        }
        c.stroke();
      }
      c.globalAlpha = 0.6;
      for (let i = 0; i < 6; i++) {
        const a = rng() * 6.28;
        c.lineWidth = 0.25 * k;
        c.beginPath(); c.moveTo(X(Math.cos(a) * isle.r * 0.95), X(Math.sin(a) * isle.r * 0.95));
        c.lineTo(X(Math.cos(a + 0.1) * isle.r * 0.55), X(Math.sin(a + 0.1) * isle.r * 0.55)); c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (st.craters) {
      for (let i = 0; i < 9; i++) {
        const [x, z] = rp(), rad = (1 + rng() * 2.4) * k;
        c.fillStyle = 'rgba(80,82,100,0.35)';
        c.beginPath(); c.arc(X(x), X(z), rad, 0, 6.28); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = rad * 0.22;
        c.beginPath(); c.arc(X(x), X(z), rad, 3.6, 6.0); c.stroke();
      }
    }
    if (st.dunes) {
      c.strokeStyle = hexCss(st.g[1]); c.globalAlpha = 0.5;
      for (let i = 0; i < 40; i++) {
        const [x, z] = rp(); c.lineWidth = (0.15 + rng() * 0.2) * k;
        c.beginPath(); c.moveTo(X(x - 2), X(z)); c.quadraticCurveTo(X(x), X(z - 0.6), X(x + 2), X(z)); c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (st.cloudy) {
      for (let i = 0; i < 30; i++) {
        const [x, z] = rp(), rad = (1.5 + rng() * 3) * k;
        const gr = c.createRadialGradient(X(x), X(z) - rad * 0.2, 0, X(x), X(z), rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(190,210,240,0.25)');
        c.fillStyle = gr; c.beginPath(); c.arc(X(x), X(z), rad, 0, 6.28); c.fill();
      }
    }
    // paths: centre → every bridge landing / portal / pad
    if (st.path) {
      const pathTo = (ax, az, w) => {
        const mx = ax * 0.5 + (rng() - 0.5) * 3, mz = az * 0.5 + (rng() - 0.5) * 3;
        const stroke = (lw, style, alpha) => {
          c.globalAlpha = alpha; c.strokeStyle = style; c.lineWidth = lw; c.lineCap = 'round';
          c.beginPath(); c.moveTo(X(0), X(0)); c.quadraticCurveTo(X(mx), X(mz), X(ax), X(az)); c.stroke();
        };
        stroke((w + 0.7) * k, hexCss(st.g[2]), 0.35);
        stroke(w * k, hexCss(st.path), 1);
        stroke(w * 0.45 * k, 'rgba(255,255,255,0.18)', 1);
        c.globalAlpha = 1;
        // pebbles / pavers along the path
        for (let t = 0.08; t < 1; t += st.tiles ? 0.045 : 0.03) {
          const it = 1 - t;
          const px = it * it * 0 + 2 * it * t * mx + t * t * ax, pz = 2 * it * t * mz + t * t * az;
          const ox = (rng() - 0.5) * w * 0.7, oz = (rng() - 0.5) * w * 0.7;
          if (st.tiles) {
            c.fillStyle = hexCss(st.g[1]); c.globalAlpha = 0.5;
            const s2 = (0.7 + rng() * 0.3) * k;
            c.fillRect(X(px + ox * 0.5) - s2 / 2, X(pz + oz * 0.5) - s2 / 2, s2, s2);
          } else {
            c.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.12)';
            c.globalAlpha = 1;
            c.beginPath(); c.arc(X(px + ox), X(pz + oz), (0.08 + rng() * 0.12) * k, 0, 6.28); c.fill();
          }
        }
        c.globalAlpha = 1;
      };
      info.anchors.forEach(an => pathTo(an.x, an.z, an.kind === 'bridge' ? 2.2 : 1.6));
      // trampled spots where quests happen
      info.ex.forEach(q => {
        if (!q.quest) return;
        const gr = c.createRadialGradient(X(q.x), X(q.z), 0, X(q.x), X(q.z), 2.4 * k);
        gr.addColorStop(0, hexCss(st.path) + 'b0'); gr.addColorStop(1, hexCss(st.path) + '00');
        c.fillStyle = gr; c.fillRect(X(q.x) - 3 * k, X(q.z) - 3 * k, 6 * k, 6 * k);
      });
    }
    // portal plazas: a paved rune circle
    info.anchors.forEach(an => {
      if (an.kind !== 'portal') return;
      c.fillStyle = hexCss(st.tiles ? st.path : 0xc8c2b4); c.globalAlpha = 0.95;
      c.beginPath(); c.arc(X(an.x), X(an.z), 3.6 * k, 0, 6.28); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.12 * k;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * 6.28;
        c.beginPath(); c.moveTo(X(an.x + Math.cos(a) * 1.6), X(an.z + Math.sin(a) * 1.6)); c.lineTo(X(an.x + Math.cos(a) * 3.6), X(an.z + Math.sin(a) * 3.6)); c.stroke();
      }
      c.beginPath(); c.arc(X(an.x), X(an.z), 1.6 * k, 0, 6.28); c.stroke();
      c.globalAlpha = 1;
      const ring = ctx2 => { ctx2.strokeStyle = '#b48cff'; ctx2.lineWidth = 0.22 * k; ctx2.beginPath(); ctx2.arc(X(an.x), X(an.z), 3.1 * k, 0, 6.28); ctx2.stroke(); };
      ring(c); if (e) ring(e);
    });
    // tiled plaza around the centre for town/temple biomes
    if (st.tiles) {
      const rad = Math.min(5.5, isle.r * 0.3);
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 0.08 * k;
      c.fillStyle = hexCss(st.path); c.globalAlpha = 0.75;
      c.beginPath(); c.arc(X(0), X(0), rad * k, 0, 6.28); c.fill();
      c.globalAlpha = 1;
      for (let rr = 1.2; rr < rad; rr += 1.2) { c.beginPath(); c.arc(X(0), X(0), rr * k, 0, 6.28); c.stroke(); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; c.beginPath(); c.moveTo(X(Math.cos(a) * 1.2), X(Math.sin(a) * 1.2)); c.lineTo(X(Math.cos(a) * rad), X(Math.sin(a) * rad)); c.stroke(); }
      if (st.gold) {
        const gring = ctx2 => { ctx2.strokeStyle = '#e8c35a'; ctx2.lineWidth = 0.3 * k; ctx2.beginPath(); ctx2.arc(X(0), X(0), rad * k, 0, 6.28); ctx2.stroke(); ctx2.beginPath(); ctx2.arc(X(0), X(0), isle.r * 0.93 * k, 0, 6.28); ctx2.stroke(); };
        gring(c); if (e) gring(e);
      }
    }
    // glowing cracks (lava/storm/vault) drawn into both albedo and emissive
    if (st.cracks) {
      const n = Math.round((st.crackK || 1) * 16);
      for (let i = 0; i < n; i++) {
        let [x, z] = rp();
        let a = rng() * 6.28;
        const pts = [[x, z]];
        for (let s = 0; s < 6; s++) { a += (rng() - 0.5) * 1.4; x += Math.cos(a) * 1.4; z += Math.sin(a) * 1.4; if (Math.hypot(x, z) > isle.r) break; pts.push([x, z]); }
        [c, e].forEach((ctx2, j) => {
          ctx2.strokeStyle = hexCss(st.cracks); ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
          ctx2.lineWidth = (j ? 0.22 : 0.3) * k;
          ctx2.beginPath(); pts.forEach((p, q) => (q ? ctx2.lineTo(X(p[0]), X(p[1])) : ctx2.moveTo(X(p[0]), X(p[1])))); ctx2.stroke();
        });
      }
    }
    if (st.specks && e) {
      for (let i = 0; i < 160; i++) {
        const [x, z] = rp(); const s2 = (0.06 + rng() * 0.12) * k;
        const ch = hexCss(st.specks[i % st.specks.length]);
        e.fillStyle = ch; c.fillStyle = ch;
        e.beginPath(); e.arc(X(x), X(z), s2, 0, 6.28); e.fill();
        c.beginPath(); c.arc(X(x), X(z), s2, 0, 6.28); c.fill();
      }
    }
    // flower / snow sparkle specks
    if (isle.type === 'flower' || isle.type === 'garden') {
      const fc = ['#ff8fb0', '#ffe066', '#ffffff', '#c9a0ff', '#ffb070'];
      for (let i = 0; i < 700; i++) { const [x, z] = rp(); c.fillStyle = fc[i % fc.length]; c.beginPath(); c.arc(X(x), X(z), (0.06 + rng() * 0.08) * k, 0, 6.28); c.fill(); }
    }
    // rim shading (ambient occlusion feel near the lip)
    const gr = c.createRadialGradient(size / 2, size / 2, isle.r * 0.8 * k, size / 2, size / 2, Rm * k);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, st.water ? 'rgba(0,0,0,0)' : 'rgba(30,40,20,0.22)');
    c.fillStyle = gr; c.fillRect(0, 0, size, size);
    const map = canvasTex(cv);
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    let emap = null;
    if (em) { emap = canvasTex(em); emap.anisotropy = map.anisotropy; }
    return { map, emap };
  }

  // instanced chunky grass tufts that sway
  let tuftGeo = null;
  function getTuftGeo() {
    if (tuftGeo) return tuftGeo;
    const pos = [], colA = [], nor = [], sw = [], gl = [], idx = [];
    const B = 8;
    for (let b = 0; b < B; b++) {
      const a = b / B * 6.28 + (b % 2) * 0.4, h = 0.26 + ((b * 5) % 4) * 0.07, w = 0.12, lean = 0.55;
      const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, bx = dx * 0.12 * (b % 3), bz = dz * 0.12 * (b % 3);
      const o = pos.length / 3;
      const V = [[bx - px * w, 0, bz - pz * w, 0.8, 0], [bx + px * w, 0, bz + pz * w, 0.8, 0],
        [bx + dx * lean * h * 0.35 - px * w * 0.8, h * 0.6, bz + dz * lean * h * 0.35 - pz * w * 0.8, 0.95, 0.45],
        [bx + dx * lean * h * 0.35 + px * w * 0.8, h * 0.6, bz + dz * lean * h * 0.35 + pz * w * 0.8, 0.95, 0.45],
        [bx + dx * lean * h, h, bz + dz * lean * h, 1.12, 1]];
      V.forEach(v => { pos.push(v[0], v[1], v[2]); colA.push(v[3], v[3], v[3]); nor.push(0, 1, 0); sw.push(v[4] * 1.4); gl.push(0); });
      idx.push(o, o + 1, o + 3, o, o + 3, o + 2, o + 2, o + 3, o + 4);
    }
    tuftGeo = new THREE.BufferGeometry();
    tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tuftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    tuftGeo.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    tuftGeo.setAttribute('aSway', new THREE.Float32BufferAttribute(sw, 1));
    tuftGeo.setAttribute('aGlow', new THREE.Float32BufferAttribute(gl, 1));
    tuftGeo.setIndex(idx);
    return tuftGeo;
  }
  function buildGrass(isle, st, rng, info) {
    if (!st.tuft) return null;
    let N = Math.round(isle.r * isle.r * 0.7 * (st.tuftK || 1));
    if (low) N = Math.round(N * 0.35);
    N = Math.min(N, 760);
    const im = new THREE.InstancedMesh(getTuftGeo(), grassMat, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const ca = new THREE.Color(st.tuft[0]), cb = new THREE.Color(st.tuft[1]), cc = new THREE.Color();
    let n = 0;
    for (let i = 0; i < N * 3 && n < N; i++) {
      const a = rng() * 6.28, rr = Math.sqrt(rng()) * (isle.r - 0.3);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (info.water && Math.hypot(x - info.water.x, z - info.water.z) < info.water.r + 0.4) continue;
      let onPath = false;
      for (let j = 0; j < info.anchors.length; j++) {
        const an = info.anchors[j], L = Math.hypot(an.x, an.z) || 1;
        const t = Math.max(0, Math.min(1, (x * an.x + z * an.z) / (L * L)));
        if (Math.hypot(x - an.x * t, z - an.z * t) < 1.6) { onPath = true; break; }
      }
      if (onPath && rng() < 0.85) continue;
      p.set(x, 0, z);
      q.setFromEuler(e.set(0, rng() * 6.28, 0));
      const sc = 0.75 + rng() * 0.75;
      s.set(sc, sc * (0.8 + rng() * 0.5), sc);
      m.compose(p, q, s);
      im.setMatrixAt(n, m);
      im.setColorAt(n, cc.copy(ca).lerp(cb, rng()));
      n++;
    }
    im.count = n;
    im.receiveShadow = true;
    im.matrixAutoUpdate = false; im.updateMatrix();
    return im;
  }

  // ---------- under-side: hanging rocks, roots, vines, icicles, crystals, lava drips ----------
  function buildUnder(B, isle, st, R, rng, depth, taper, top) {
    const yAt = t => top - t * (depth + top);
    const radAt = (a, t) => R(a) * 0.98 * taper(t);
    // floating debris chunks around the underside
    const nChunk = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < nChunk; i++) {
      const a = rng() * 6.28, t = 0.25 + rng() * 0.5, s = 1.2 + rng() * 1.8 + isle.r * 0.04;
      const rr = radAt(a, t) + s + 1.2;
      B.at(Math.cos(a) * rr, yAt(t), Math.sin(a) * rr, rng() * 6.28, 1);
      B.part(geo('rockHi' + (i % 2)), 0, 0, 0, s, s * 1.3, s, col(st.rock[i % 3], rng));
      if (st.tuft && !st.cloudy) B.part(geo('sphere'), 0, s * 0.95, 0, s * 0.85, s * 0.3, s * 0.85, col(st.edge, rng));
    }
    const kind = st.under;
    if (kind === 'roots') {
      const n = 6 + Math.floor(isle.r / 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, r0 = R(a) - 0.35;
        const len = 2 + rng() * 3.5, pts = [];
        for (let k2 = 0; k2 <= 6; k2++) {
          const t = k2 / 6, out = Math.sin(t * 3 + i) * 0.5 - t * 0.8;
          pts.push(new THREE.Vector3(Math.cos(a) * (r0 + out), -1.3 - t * len, Math.sin(a) * (r0 + out)));
        }
        B.at(0, 0, 0, 0, 1);
        const tg = tube(pts, 0.24, 0.04, 6);
        B.add(tg, _ID, col(0x7a5232, rng), 0, 0);
        tg.dispose();
      }
      // vines draping over the grass lip
      const nv = 5 + Math.floor(isle.r / 2.5);
      for (let i = 0; i < nv; i++) {
        const a = rng() * 6.28, r0 = R(a) + 0.5;
        const len = 1.2 + rng() * 3.2, pts = [];
        for (let k2 = 0; k2 <= 5; k2++) pts.push(new THREE.Vector3(Math.cos(a) * (r0 + 0.08 - k2 * 0.05), -0.55 - k2 / 5 * len, Math.sin(a) * (r0 + 0.08 - k2 * 0.05)));
        const tg = tube(pts, 0.08, 0.05, 5);
        B.add(tg, _ID, col(tint(st.edge, 0.85).getHex(), rng), 0, 0);
        tg.dispose();
        for (let l = 0; l < 3; l++) {
          const p = pts[1 + Math.floor(rng() * 5)];
          B.at(p.x, p.y, p.z, rng() * 6.28, 1);
          B.part(geo('sphereLo'), 0, 0, 0, 0.22, 0.14, 0.22, col(st.edge, rng));
        }
      }
    } else if (kind === 'icicles') {
      const n = 10 + Math.floor(isle.r / 1.5);
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, rr = R(a) + 0.3;
        B.at(Math.cos(a) * rr, -0.9, Math.sin(a) * rr, rng() * 6.28, 0.5 + rng() * 0.7);
        B.part(geo('crystal'), 0, 0, 0, 0.55, 2.2 + rng() * 2, 0.55, col(st.glowC || 0xbfeaff, rng, 0.05), { rx: Math.PI, glow: 0.4 });
      }
    } else if (kind === 'crystals') {
      const n = 4 + Math.floor(isle.r / 4);
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, t = 0.15 + rng() * 0.6, rr = radAt(a, t) - 0.3;
        B.at(Math.cos(a) * rr, yAt(t), Math.sin(a) * rr, -a, 0.8 + rng() * 0.9);
        B.part(geo('crystal'), 0, 0, 0, 0.7, 2.6, 0.7, col(st.glowC, rng, 0.08), { rz: -(1.9 + rng() * 0.6), glow: 1.6 });
      }
      B.at(0, -depth - 1.0, 0, 0, 1 + isle.r * 0.05);
      B.part(geo('crystal'), 0, 0, 0, 1, 3.4, 1, col(st.glowC, rng), { rx: Math.PI, glow: 1.8 });
      B.part(geo('crystal'), 0.8, 0.3, 0, 0.6, 2.2, 0.6, col(st.glowC, rng), { rx: Math.PI, rz: 0.4, glow: 1.6 });
    } else if (kind === 'drips') {
      const n = 6 + Math.floor(isle.r / 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.28, t = rng() * 0.6, rr = radAt(a, t) + 0.05;
        B.at(Math.cos(a) * rr, yAt(t), Math.sin(a) * rr, -a, 1);
        B.part(geo('rbox'), 0, -0.9, 0, 0.22, 2.4 + rng() * 2, 0.22, st.cracks || 0xff6a1a, { glow: 2.4 });
      }
      B.at(0, -depth - 1.4, 0, 0, 1);
      B.part(geo('sphereLo'), 0, 0, 0, 0.5, 1.4, 0.5, st.cracks || 0xff6a1a, { glow: 3 });
    }
  }

  // ---------- water: pond, stream and waterfall ----------
  const FALL_FRAG = `
    uniform sampler2D uNoise; uniform float uTime; varying vec2 vUv;
    void main() {
      float n = texture2D(uNoise, vec2(vUv.x * 0.6, vUv.y * 0.35 - uTime * 0.9)).r;
      float n2 = texture2D(uNoise, vec2(vUv.x * 1.7 + 0.3, vUv.y * 0.9 - uTime * 1.6)).r;
      float streak = smoothstep(0.45, 0.75, n * 0.6 + n2 * 0.4);
      vec3 col = mix(vec3(0.22, 0.62, 0.92), vec3(1.0), streak * 0.85);
      float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
      float fade = 1.0 - smoothstep(0.55, 1.0, vUv.y);
      gl_FragColor = vec4(col * 1.15, (0.55 + streak * 0.4) * edge * fade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function getFallMat() {
    if (fallMat) return fallMat;
    fallMat = new THREE.ShaderMaterial({
      uniforms: { uNoise: { value: TEX.noise }, uTime: U.time },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: FALL_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    return fallMat;
  }
  // ribbon from (x0,z0) on the top, over the lip, straight down `drop`
  function waterfall(g, isle, a, R, width, drop) {
    const r0 = R(a) - 0.6, ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux;
    const prof = [[r0, 0.06], [r0 + 0.6, 0.02], [r0 + 1.1, -0.4], [r0 + 1.45, -1.3], [r0 + 1.6, -3]];
    for (let i = 1; i <= 10; i++) prof.push([r0 + 1.65 + i * 0.05, -3 - i / 10 * drop]);
    const pos = [], uv = [], idx = [];
    let L = 0;
    for (let i = 0; i < prof.length; i++) {
      if (i) L += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]);
      const w = width * (1 + Math.max(0, -prof[i][1]) * 0.02);
      for (let s = 0; s < 2; s++) {
        const o = (s - 0.5) * w;
        pos.push(ux * prof[i][0] + px * o, prof[i][1], uz * prof[i][0] + pz * o);
        uv.push(s, L / (drop + 4));
      }
      if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.setIndex(idx);
    const m = new THREE.Mesh(gg, getFallMat());
    m.renderOrder = 2;
    g.add(m);
    addMist(g, isle, ux * (r0 + 1.4), -2.4, uz * (r0 + 1.4), width);
  }
  function waterDisc(g, x, z, r, y) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), waterMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y || 0.035, z);
    m.receiveShadow = true;
    m.renderOrder = 1;
    g.add(m);
    return m;
  }
  function stream(g, x0, z0, x1, z1, w) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const pg = new THREE.PlaneGeometry(w, len, 1, 1);
    pg.rotateX(-Math.PI / 2);          // length now runs along z
    const m = new THREE.Mesh(pg, waterMat);
    m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
    m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    m.receiveShadow = true;
    m.renderOrder = 1;
    g.add(m);
  }
  // choose the rim direction farthest from every bridge/portal (waterfalls, houses, rainbows…)
  function quietAngle(info, rng, avoid) {
    let best = 0, bestD = -1;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * 6.28 + rng() * 0.1;
      let d = 9;
      info.anchors.forEach(an => { const da = Math.abs(Math.atan2(Math.sin(a - Math.atan2(an.z, an.x)), Math.cos(a - Math.atan2(an.z, an.x)))); d = Math.min(d, da); });
      (avoid || []).forEach(b => { const da = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); d = Math.min(d, da); });
      if (d > bestD) { bestD = d; best = a; }
    }
    return best;
  }

  // ---------- aurora curtains ----------
  let auroraMat = null;
  function auroraCurtain(g, isle, rng) {
    if (!auroraMat) {
      auroraMat = new THREE.ShaderMaterial({
        uniforms: { uTime: U.time, uNoise: { value: TEX.noise } },
        vertexShader: `uniform float uTime; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x * 0.35 + uTime * 0.8) * 1.2 + sin(p.x * 0.9 + uTime * 1.3) * 0.4; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `uniform float uTime; uniform sampler2D uNoise; varying vec2 vUv;
          void main(){ float n = texture2D(uNoise, vec2(vUv.x * 2.0 + uTime * 0.03, 0.2)).r;
            vec3 c = mix(vec3(0.2, 1.0, 0.65), vec3(0.55, 0.35, 1.0), vUv.y);
            float a = smoothstep(0.0, 0.25, vUv.y) * (1.0 - vUv.y) * (0.4 + n * 0.9) * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
            gl_FragColor = vec4(c * 1.6, a * 0.75);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      });
    }
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(isle.r * 1.6, 9, 24, 1), auroraMat);
      const a = rng() * 6.28;
      m.position.set(Math.cos(a) * isle.r * 0.4, 9 + i * 3, Math.sin(a) * isle.r * 0.4);
      m.rotation.y = a + Math.PI / 2;
      g.add(m);
    }
  }

  // ---------- biome recipes ----------
  const FLOWERS = [0xff7aa2, 0xffd166, 0xffffff, 0xc49aff, 0xff9f5a];
  function gateFor(B, rng, st, info) {
    // a pair of lanterns / torches / glowing crystals flanking every bridge landing
    info.anchors.forEach(an => {
      if (an.kind !== 'bridge') return;
      const a = an.a, rr = (Math.hypot(an.x, an.z)) - 0.8;
      [-1, 1].forEach(sd => {
        const x = Math.cos(a) * rr - Math.sin(a) * 2.6 * sd, z = Math.sin(a) * rr + Math.cos(a) * 2.6 * sd;
        if (st.gate === 'lantern') K.lantern(B, rng, x, z);
        else if (st.gate === 'torch') K.torch(B, rng, x, z);
        else if (st.gate === 'brazier') K.brazier(B, rng, x, z);
        else if (st.gate === 'crystal') { B.at(x, 0, z, rng() * 6, 0.55); B.part(geo('crystal'), 0, 0, 0, 0.7, 2.6, 0.7, st.glowC || 0x7fe8ff, { glow: 1.8 }); B.part(geo('rock0'), 0, 0, 0, 0.7, 0.4, 0.7, col(st.rock[0], rng)); }
        else if (st.gate === 'post') { B.at(x, 0, z, 0, 1); B.part(geo('cyl6'), 0, 0, 0, 0.12, 1.5, 0.12, 0xc9a070); B.part(geo('sphere'), 0, 1.55, 0, 0.22, 0.22, 0.22, 0xffd166, { glow: 1.6 }); }
      });
    });
  }
  function portalRing(B, rng, st, info) {
    info.anchors.forEach(an => {
      if (an.kind !== 'portal') return;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28 + 0.26;
        K.runeStone(B, rng, an.x + Math.cos(a) * 3.9, an.z + Math.sin(a) * 3.9, st.rock[0], 0xb48cff);
      }
    });
  }
  const DECOR = {
    grass(B, rng, isle, st, place, info, g, R) {
      const dawn = isle.id === 'isle_dawn';
      place(Math.round(isle.r * 0.36), 0.74, 0.97, 1.6, 3.4, (x, z) => {
        const k = rng();
        if (k < 0.18) K.poplar(B, rng, x, z, 1 + rng() * 0.3, 0x58b04a);
        else K.oak(B, rng, x, z, 0.95 + rng() * 0.4, rng() < 0.5 ? 0x5cb34c : 0x6cc054, null, k > 0.75 ? 0xff5a5a : null);
      });
      place(Math.round(isle.r * 0.45), 0.55, 0.98, 0.8, 1.8, (x, z) => K.bush(B, rng, x, z, 0.8 + rng() * 0.5, 0x4fa645, rng() < 0.4 ? FLOWERS[Math.floor(rng() * 5)] : null));
      place(5, 0.5, 0.95, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.6, 0xb4aa98));
      place(Math.round(isle.r * 0.7), 0.15, 0.95, 0.6, 0, (x, z) => K.flowers(B, rng, x, z, FLOWERS));
      if (dawn) {
        // starter village feel: a cottage, a well, a signpost, a pond with a waterfall, fences
        const ha = quietAngle(info, rng);
        const hx = Math.cos(ha) * isle.r * 0.8, hz = Math.sin(ha) * isle.r * 0.8;
        K.house(B, rng, hx, hz, Math.atan2(-hx, -hz), 0xfff1d6, 0xd9574a);
        const fa = quietAngle(info, rng, [ha]);
        const fx = Math.cos(fa) * isle.r * 0.72, fz = Math.sin(fa) * isle.r * 0.72;
        waterDisc(g, fx, fz, 3.2);
        info.water = { x: fx, z: fz, r: 3.2 };
        stream(g, fx + Math.cos(fa) * 2.6, fz + Math.sin(fa) * 2.6, Math.cos(fa) * (R(fa) - 0.4), Math.sin(fa) * (R(fa) - 0.4), 1.6);
        waterfall(g, isle, fa, R, 1.9, 26);
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; K.rock(B, rng, fx + Math.cos(a) * 3.5, fz + Math.sin(a) * 3.5, 0.35 + rng() * 0.2, 0xb8b2a4); }
        K.reeds(B, rng, fx + 2.4, fz - 1.8); K.lily(B, rng, fx - 0.8, fz + 0.6); K.lily(B, rng, fx + 0.9, fz - 0.4);
        K.signpost(B, rng, ...spot(isle, info, rng, 0.32), rng() * 6);
        K.well(B, rng, Math.cos(ha + 0.5) * isle.r * 0.6, Math.sin(ha + 0.5) * isle.r * 0.6);
        const fb = ha - 0.45;
        K.fence(B, rng, Math.cos(fb) * isle.r * 0.88, Math.sin(fb) * isle.r * 0.88, Math.cos(fb - 0.3) * isle.r * 0.9, Math.sin(fb - 0.3) * isle.r * 0.9);
      } else {
        K.haybale(B, rng, ...spot(isle, info, rng, 0.7));
        const a = quietAngle(info, rng);
        K.fence(B, rng, Math.cos(a - 0.3) * isle.r * 0.9, Math.sin(a - 0.3) * isle.r * 0.9, Math.cos(a + 0.3) * isle.r * 0.9, Math.sin(a + 0.3) * isle.r * 0.9);
      }
    },
    forest(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.5), 0.7, 0.98, 1.6, 3.0, (x, z) => (rng() < 0.65 ? K.pine(B, rng, x, z, 0.95 + rng() * 0.5, 0x2f7a46) : K.oak(B, rng, x, z, 1 + rng() * 0.3, 0x3f8f45, 0x6a4a2e)));
      place(Math.round(isle.r * 0.4), 0.5, 0.98, 0.8, 1.6, (x, z) => K.bush(B, rng, x, z, 0.7 + rng() * 0.4, 0x3a8a40));
      place(6, 0.3, 0.95, 0.8, 1.2, (x, z) => K.mushroom(B, rng, x, z, 0.35 + rng() * 0.2, 0xe04848, 0xffffff));
      place(2, 0.6, 0.9, 1.5, 3, (x, z) => K.log(B, rng, x, z, 1));
      place(3, 0.4, 0.9, 1, 2, (x, z) => K.stump(B, rng, x, z, 0.8 + rng() * 0.4));
      place(5, 0.5, 0.95, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.5, 0x8a9478, 0x5aa04a));
      addFireflies(g, isle, 0xe8ff9a, 30);
    },
    water(B, rng, isle, st, place, info, g, R) {
      const fa = quietAngle(info, rng);
      const px = isle.r * 0.18 + Math.cos(fa) * isle.r * 0.2, pz = Math.sin(fa) * isle.r * 0.2 - isle.r * 0.08;
      const pr = isle.r * 0.36;
      waterDisc(g, px, pz, pr);
      info.water = { x: px, z: pz, r: pr };
      const sx = px + Math.cos(fa) * (pr - 0.6), sz = pz + Math.sin(fa) * (pr - 0.6);
      stream(g, sx, sz, Math.cos(fa) * (R(fa) - 0.4), Math.sin(fa) * (R(fa) - 0.4), 2.4);
      waterfall(g, isle, fa, R, 3.2, 34);
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; if (Math.abs(Math.atan2(Math.sin(a - fa), Math.cos(a - fa))) < 0.35) continue; K.rock(B, rng, px + Math.cos(a) * (pr + 0.4), pz + Math.sin(a) * (pr + 0.4), 0.35 + rng() * 0.3, 0xa8a49a); }
      for (let i = 0; i < 6; i++) { const a = rng() * 6.28, rr = rng() * pr * 0.7; K.lily(B, rng, px + Math.cos(a) * rr, pz + Math.sin(a) * rr); }
      for (let i = 0; i < 4; i++) { const a = rng() * 6.28; K.reeds(B, rng, px + Math.cos(a) * (pr + 1.0), pz + Math.sin(a) * (pr + 1.0)); }
      place(Math.round(isle.r * 0.25), 0.74, 0.97, 1.6, 3.4, (x, z) => (Math.hypot(x - px, z - pz) > pr + 2.5) && K.oak(B, rng, x, z, 0.9 + rng() * 0.3, 0x55b050));
      place(Math.round(isle.r * 0.4), 0.55, 0.98, 0.8, 1.6, (x, z) => (Math.hypot(x - px, z - pz) > pr + 1.2) && K.bush(B, rng, x, z, 0.7 + rng() * 0.4, 0x4aa84a, rng() < 0.3 ? 0xffffff : null));
      place(Math.round(isle.r * 0.4), 0.2, 0.95, 0.6, 0, (x, z) => (Math.hypot(x - px, z - pz) > pr + 0.6) && K.flowers(B, rng, x, z, [0xffffff, 0x9fd8ff, 0xffd166]));
    },
    flower(B, rng, isle, st, place, info) {
      place(Math.round(isle.r * 0.3), 0.72, 0.97, 1.6, 3.4, (x, z) => K.sakura(B, rng, x, z, 0.9 + rng() * 0.35, rng() < 0.5 ? 0xffb3cf : 0xffc8dc));
      place(Math.round(isle.r * 2.2), 0.1, 0.97, 0.5, 0, (x, z) => K.flowers(B, rng, x, z, FLOWERS, 4 + Math.floor(rng() * 4)));
      place(Math.round(isle.r * 0.4), 0.55, 0.98, 0.8, 1.6, (x, z) => K.bush(B, rng, x, z, 0.7 + rng() * 0.3, 0x5cb24c, FLOWERS[Math.floor(rng() * 5)]));
      K.fence(B, rng, ...spot(isle, info, rng, 0.85), ...spot(isle, info, rng, 0.85));
    },
    mushroom(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.45), 0.7, 0.97, 1.8, 3.6, (x, z) => K.mushroom(B, rng, x, z, 1.1 + rng() * 0.9, rng() < 0.55 ? 0xe24a4a : 0xa86ae0, 0xffffff, 0));
      place(Math.round(isle.r * 0.8), 0.25, 0.97, 0.6, 1.0, (x, z) => K.mushroom(B, rng, x, z, 0.28 + rng() * 0.2, rng() < 0.5 ? 0x7ff0ff : 0xffa8f0, null, 1.6));
      place(Math.round(isle.r * 0.3), 0.5, 0.97, 0.8, 1.6, (x, z) => K.bush(B, rng, x, z, 0.6 + rng() * 0.4, 0x3f9a70));
      place(4, 0.5, 0.95, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.4, 0x8a80a0, 0x4f9c78));
      addFireflies(g, isle, 0xd9a8ff, 26);
    },
    ruin(B, rng, isle, st, place, info) {
      place(Math.round(isle.r * 0.32), 0.62, 0.95, 1.2, 2.8, (x, z) => K.column(B, rng, x, z, 1.4 + rng() * 3.2, 0xd8ccaa, undefined, rng() < 0.6));
      const a = quietAngle(info, rng);
      K.arch(B, rng, Math.cos(a) * isle.r * 0.82, Math.sin(a) * isle.r * 0.82, -a + Math.PI / 2, 0xd0c4a0);
      place(Math.round(isle.r * 0.3), 0.4, 0.95, 0.8, 1.5, (x, z) => K.block(B, rng, x, z, 0xc8bc98));
      place(Math.round(isle.r * 0.3), 0.6, 0.98, 0.8, 1.6, (x, z) => K.bush(B, rng, x, z, 0.6 + rng() * 0.3, 0x6aa04a));
      place(2, 0.75, 0.95, 1.6, 3, (x, z) => K.oak(B, rng, x, z, 0.85, 0x6aa84a));
    },
    crystal(B, rng, isle, st, place) {
      place(Math.round(isle.r * 0.45), 0.66, 0.97, 1.4, 2.8, (x, z) => K.crystals(B, rng, x, z, 0.9 + rng() * 0.8, rng() < 0.4 ? 0xb08fff : 0x7fe8ff, 1.6));
      place(Math.round(isle.r * 0.5), 0.25, 0.97, 0.7, 1.2, (x, z) => K.crystals(B, rng, x, z, 0.3 + rng() * 0.2, rng() < 0.5 ? 0xb08fff : 0x7fe8ff, 1.4));
      place(6, 0.5, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.6, 0x9aaccc));
    },
    cloud(B, rng, isle, st, place, info) {
      place(Math.round(isle.r * 0.7), 0.78, 1.0, 1, 1.4, (x, z) => K.puff(B, rng, x, z, 1 + rng() * 0.8));
      place(4, 0.45, 0.85, 1, 2.4, (x, z) => K.haybale(B, rng, x, z));
      place(5, 0.4, 0.9, 1, 1.5, (x, z) => K.flowers(B, rng, x, z, [0xffd166, 0xffffff, 0xff9ec8]));
      const a = quietAngle(info, rng);
      K.rainbow(B, Math.cos(a) * isle.r * 0.95, Math.sin(a) * isle.r * 0.95, -a + Math.PI / 2, 5.2);
      const b = a + 1.6;
      K.fence(B, rng, Math.cos(b - 0.35) * isle.r * 0.85, Math.sin(b - 0.35) * isle.r * 0.85, Math.cos(b + 0.35) * isle.r * 0.85, Math.sin(b + 0.35) * isle.r * 0.85, 0xf2e6d0);
    },
    village(B, rng, isle, st, place, info) {
      place(4, 0.68, 0.9, 2.2, 6.5, (x, z) => K.house(B, rng, x, z, Math.atan2(-x, -z), [0xfff1d6, 0xf6dcc0, 0xe8f0ff, 0xffe8d0][Math.floor(rng() * 4)], [0xd9574a, 0x4a7ad9, 0x3e9a5a, 0xe0903a][Math.floor(rng() * 4)]));
      place(4, 0.42, 0.62, 1.4, 3.2, (x, z) => K.stall(B, rng, x, z, Math.atan2(-x, -z), [0xe85454, 0x54a8e8, 0x5ac46a, 0xf2b84a][Math.floor(rng() * 4)], 0xffffff));
      place(6, 0.3, 0.9, 0.8, 2.6, (x, z) => (rng() < 0.5 ? K.barrel(B, rng, x, z) : K.crate(B, rng, x, z)));
      place(4, 0.5, 0.85, 0.8, 4, (x, z) => K.lantern(B, rng, x, z));
      place(3, 0.55, 0.9, 0.8, 4, (x, z, a) => K.banner(B, rng, x, z, -a, [0xe85454, 0x4a7ad9, 0xf2b84a][Math.floor(rng() * 3)]));
      place(2, 0.86, 0.98, 1.6, 3, (x, z) => K.oak(B, rng, x, z, 0.9, 0x5cb34c, null, 0xffa040));
      place(Math.round(isle.r * 0.3), 0.6, 0.98, 0.8, 1.4, (x, z) => K.bush(B, rng, x, z, 0.6 + rng() * 0.3, 0x4fa645, FLOWERS[Math.floor(rng() * 5)]));
    },
    ice(B, rng, isle, st, place) {
      place(Math.round(isle.r * 0.35), 0.7, 0.97, 1.6, 3.2, (x, z) => K.pine(B, rng, x, z, 0.9 + rng() * 0.4, 0x2f6a5a, true));
      place(Math.round(isle.r * 0.3), 0.6, 0.97, 1.2, 2.6, (x, z) => K.iceSpike(B, rng, x, z, 0.7 + rng() * 0.5));
      place(2, 0.4, 0.8, 1.2, 4, (x, z) => K.snowman(B, rng, x, z, Math.atan2(-x, -z)));
      place(5, 0.4, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.5, 0x8fa8c4, 0xffffff));
    },
    lava(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.42), 0.66, 0.97, 1.3, 2.8, (x, z) => K.spire(B, rng, x, z, 0.8 + rng() * 0.6, 0x3a3034, 0xff6a1a));
      lavaPool(B, rng, isle, info, 0.3, g);
      place(5, 0.4, 0.95, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.5, 0x2c2426));
      addFireflies(g, isle, 0xff8a3a, 30, 4);
    },
    pillars(B, rng, isle, st, place) {
      place(Math.round(isle.r * 0.62), 0.66, 0.97, 1.2, 2.6, (x, z) => K.column(B, rng, x, z, 3 + rng() * 6, 0xe0d8c0, 0xe8c35a, rng() < 0.2));
      place(Math.round(isle.r * 0.3), 0.3, 0.95, 0.8, 1.5, (x, z) => K.block(B, rng, x, z, 0xd0c8b0));
      place(4, 0.7, 0.95, 1, 3, (x, z, a) => K.banner(B, rng, x, z, -a, 0x5ab8ff));
    },
    bone(B, rng, isle, st, place) {
      place(3, 0.6, 0.9, 2.5, 6, (x, z) => K.rib(B, rng, x, z, rng() * 6.28, 0.9 + rng() * 0.3));
      place(1, 0.75, 0.9, 2.5, 6, (x, z) => K.skull(B, rng, x, z, Math.atan2(-x, -z), 1.2));
      place(6, 0.3, 0.95, 0.8, 1.5, (x, z) => K.bone(B, rng, x, z));
      place(4, 0.7, 0.97, 1.4, 3, (x, z) => K.cactus(B, rng, x, z));
      place(3, 0.75, 0.97, 1.4, 3, (x, z) => K.deadTree(B, rng, x, z, 0.9, 0x8a7058));
      place(6, 0.5, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.7, 0xc08a58));
    },
    storm(B, rng, isle, st, place) {
      K.obelisk(B, rng, isle.r * 0.55, isle.r * 0.35, 0x2c2c40, 0x6aa0ff);
      place(Math.round(isle.r * 0.4), 0.62, 0.97, 1.2, 2.8, (x, z) => K.spire(B, rng, x, z, 0.8 + rng() * 0.5, 0x3c3c55, 0x6aa0ff));
      place(Math.round(isle.r * 0.3), 0.4, 0.95, 0.8, 1.6, (x, z) => K.crystals(B, rng, x, z, 0.35 + rng() * 0.2, 0x6aa0ff, 1.8));
    },
    star(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.36), 0.68, 0.96, 1.2, 3, (x, z) => K.starPillar(B, rng, x, z, 1.6 + rng() * 3.5, 0x44446a, 0xffe066));
      place(Math.round(isle.r * 0.4), 0.3, 0.97, 0.7, 1.4, (x, z) => K.crystals(B, rng, x, z, 0.3 + rng() * 0.25, 0xffe066, 1.6));
      place(4, 0.4, 0.9, 0.5, 2, (x, z) => K.orb(B, rng, x, z, 3 + rng() * 2, 0xfff2a8));
      addFireflies(g, isle, 0xfff2a8, 24, 5);
    },
    nebula(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.4), 0.66, 0.97, 1.3, 2.8, (x, z) => K.crystals(B, rng, x, z, 0.8 + rng() * 0.7, rng() < 0.5 ? 0xff9de2 : 0xb08fff, 1.6));
      place(3, 0.72, 0.95, 1.4, 3.4, (x, z) => K.crystalTree(B, rng, x, z, 1 + rng() * 0.3, 0xff9de2));
      place(5, 0.3, 0.9, 0.5, 2, (x, z) => K.orb(B, rng, x, z, 2.5 + rng() * 2.5, 0xd8b4ff, 0.8 + rng() * 0.6));
      addFireflies(g, isle, 0xff9de2, 24, 5);
    },
    moon(B, rng, isle, st, place, info) {
      place(Math.round(isle.r * 0.5), 0.4, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.8, 0x9a9cb0));
      place(4, 0.7, 0.95, 1.2, 3, (x, z) => K.crystals(B, rng, x, z, 0.4 + rng() * 0.3, 0xa8f0ff, 1.5));
      K.flag(B, rng, ...spot(isle, info, rng, 0.6), 0xff5a5a);
    },
    comet(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.55), 0.5, 0.97, 1, 2.2, (x, z) => { B.at(x, 0, z, rng() * 6.28, 0.7 + rng() * 0.6); B.part(geo('crystal'), 0, -0.2, 0, 0.8, 2.6 + rng() * 2, 0.8, col(0x9fd4ff, rng), { rx: (rng() - 0.5) * 0.7, rz: (rng() - 0.5) * 0.7, glow: 1.5 }); });
      place(6, 0.4, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.6, 0x3a4a6a));
      addFireflies(g, isle, 0x9fd4ff, 24, 5);
    },
    aurora(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.3), 0.7, 0.97, 1.6, 3.2, (x, z) => K.pine(B, rng, x, z, 0.9 + rng() * 0.3, 0x1f5a52, true));
      place(Math.round(isle.r * 0.4), 0.3, 0.97, 0.7, 1.6, (x, z) => K.crystals(B, rng, x, z, 0.3 + rng() * 0.3, 0x7ff0d0, 1.6));
      auroraCurtain(g, isle, rng);
      addFireflies(g, isle, 0x7ff0d0, 24, 4);
    },
    alien(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.3), 0.7, 0.96, 1.6, 3.4, (x, z) => K.mushroom(B, rng, x, z, 1 + rng() * 0.6, rng() < 0.5 ? 0xb06ae8 : 0x4ae8b0, null, 1.2));
      place(3, 0.55, 0.85, 2.2, 5, (x, z) => K.dome(B, rng, x, z, 0.9 + rng() * 0.3));
      place(Math.round(isle.r * 0.5), 0.3, 0.97, 0.7, 1.4, (x, z) => K.alienPlant(B, rng, x, z, rng() < 0.5 ? 0x5ef0c0 : 0xff7af0));
      addFireflies(g, isle, 0x5ef0c0, 24, 4);
    },
    cave(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.75), 0.86, 1.0, 1.0, 1.8, (x, z) => K.spire(B, rng, x, z, 1.1 + rng() * 0.8, 0x2e2e3c));
      for (let i = 0; i < 9; i++) {   // stalactites overhead (decor only)
        const a = rng() * 6.28, rr = isle.r * (0.15 + rng() * 0.7);
        B.at(Math.cos(a) * rr, 9 + rng() * 3, Math.sin(a) * rr, 0, 0.8 + rng() * 0.6);
        B.part(geo('tier'), 0, 0, 0, 0.7, -2.4, 0.7, col(0x34344a, rng));
      }
      place(Math.round(isle.r * 0.4), 0.3, 0.9, 0.8, 1.8, (x, z) => K.crystals(B, rng, x, z, 0.5 + rng() * 0.6, rng() < 0.5 ? 0xb08fff : 0x66e8ff, 1.8));
      place(8, 0.3, 0.85, 0.6, 1.2, (x, z) => K.mushroom(B, rng, x, z, 0.3 + rng() * 0.2, 0x8f6bff, null, 1.6));
      addFireflies(g, isle, 0x9fd8ff, 20, 4);
    },
    lake(B, rng, isle, st, place, info, g) {
      for (let i = 0; i < 16; i++) { const a = rng() * 6.28, rr = isle.r * (0.2 + rng() * 0.75); if (!blocked(info.ex, Math.cos(a) * rr, Math.sin(a) * rr, 0.3)) K.lily(B, rng, Math.cos(a) * rr, Math.sin(a) * rr, 0.04); }
      place(10, 0.7, 0.98, 0.6, 1.4, (x, z) => K.reeds(B, rng, x, z));
      const a = quietAngle(info, rng);
      B.at(Math.cos(a) * isle.r * 0.75, 0, Math.sin(a) * isle.r * 0.75, -a + Math.PI / 2, 1);
      for (let i = 0; i < 6; i++) B.part(geo('rbox'), 0, 0.08, -2.5 + i, 1.8, 0.16, 0.85, col(0x9a7448, rng));
      [-0.8, 0.8].forEach(o => { B.part(geo('cyl6'), o, -0.6, -2.5, 0.1, 1.1, 0.1, 0x6a4a2e); B.part(geo('cyl6'), o, -0.6, 2.5, 0.1, 1.1, 0.1, 0x6a4a2e); });
      K.lantern(B, rng, Math.cos(a) * isle.r * 0.75 + 1, Math.sin(a) * isle.r * 0.75);
      
      addFireflies(g, isle, 0xbfefff, 20, 2);
    },
    mist(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.42), 0.66, 0.97, 1.6, 3.2, (x, z) => K.willow(B, rng, x, z, 0.9 + rng() * 0.4, 0x4a6a48));
      place(2, 0.7, 0.95, 1.4, 3, (x, z) => K.deadTree(B, rng, x, z, 0.9, 0x4a4038));
      place(6, 0.4, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.5, 0x6a7068, 0x5e7a58));
      place(6, 0.3, 0.9, 0.6, 1.2, (x, z) => K.mushroom(B, rng, x, z, 0.3, 0xc8ff8a, null, 1.4));
      addFireflies(g, isle, 0xd8ff8f, 40, 3);
      addMist(g, isle, 0, 0, 0, isle.r * 1.4);
    },
    temple(B, rng, isle, st, place) {
      place(10, 0.6, 0.85, 1.2, 2.6, (x, z) => K.column(B, rng, x, z, 3 + rng() * 1.5, 0x2a2438, 0xd8b34a));
      B.at(0, 0, 0, 0, 1);
      B.part(geo('cyl'), 0, 0, 0, 2.2, 0.6, 2.2, 0x1e1a2c);
      B.part(geo('cyl'), 0, 0.6, 0, 1.7, 0.5, 1.7, 0x2a2438);
      B.part(geo('torus'), 0, 1.1, 0, 1.7, 1.7, 1.2, 0xd8b34a, { rx: Math.PI / 2, glow: 1.2 });
      place(4, 0.3, 0.55, 1, 3, (x, z) => K.brazier(B, rng, x, z, 0xb48cff));
    },
    garden(B, rng, isle, st, place, info) {
      place(Math.round(isle.r * 1.8), 0.1, 0.97, 0.5, 0, (x, z) => K.flowers(B, rng, x, z, [0xffb0d0, 0xfff0a0, 0xd0b0ff, 0xffffff], 4 + Math.floor(rng() * 3)));
      place(3, 0.6, 0.85, 1.6, 4, (x, z, a) => { B.at(x, 0, z, -a, 1); B.part(geo('torusHalf'), 0, 0, 0, 1.8, 2.4, 1.2, 0x4a8a3a); for (let i = 0; i < 8; i++) { const t = i / 7 * Math.PI; B.part(geo('sphereLo'), Math.cos(t) * 1.8, Math.sin(t) * 2.4, 0, 0.18, 0.18, 0.18, FLOWERS[i % 5]); } });
      place(4, 0.72, 0.97, 1.4, 3, (x, z) => K.poplar(B, rng, x, z, 0.8, 0x6ab85a));
      place(2, 0.75, 0.97, 1.6, 3.4, (x, z) => K.sakura(B, rng, x, z, 0.9, 0xffc8dc));
      place(Math.round(isle.r * 0.3), 0.55, 0.98, 0.8, 1.6, (x, z) => K.bush(B, rng, x, z, 0.6 + rng() * 0.3, 0x6ab85a, 0xffb0d0));
    },
    vault(B, rng, isle, st, place, info, g) {
      place(7, 0.6, 0.92, 1.2, 2.8, (x, z) => K.column(B, rng, x, z, 2 + rng() * 3.5, 0x1a1414, 0xff5a1a));
      lavaPool(B, rng, isle, info, 0.26, g);
      place(3, 0.4, 0.8, 1, 3, (x, z) => K.brazier(B, rng, x, z));
      addFireflies(g, isle, 0xff8a3a, 24, 3);
    },
    tree(B, rng, isle, st, place, info, g) {
      // 古樹之心: the crown of the ancient tree hangs overhead around the rim
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.28 + rng() * 0.3, rr = isle.r * (0.8 + rng() * 0.25);
        B.at(Math.cos(a) * rr, 10.5 + rng() * 2, Math.sin(a) * rr, rng() * 6.28, 1); B.swayH = 1;
        B.part(geo('sphere'), 0, 0, 0, 2.2 + rng() * 1.1, 1.5 + rng() * 0.6, 2.2 + rng() * 1.1, col(0x4f9e48, rng), { sway: 0.5 });
      }
      place(6, 0.82, 1.0, 1.2, 3.4, (x, z, a) => { B.at(x, 0, z, -a, 1); B.part(geo('trunk'), 0, 0, 0, 0.7, 9, 0.7, col(0x6e4a2c, rng), { rz: -0.15 }); });
      place(8, 0.3, 0.9, 0.6, 1.2, (x, z) => K.mushroom(B, rng, x, z, 0.3 + rng() * 0.2, 0xff9a4a, 0xffffff));
      place(10, 0.2, 0.95, 0.5, 1, (x, z) => { B.at(x, 0, z, 0, 1); B.part(geo('sphereLo'), 0, 0.05, 0, 0.5 + rng() * 0.4, 0.18, 0.5, col(0x6ab84a, rng)); });
      addFireflies(g, isle, 0xe8ff9a, 30, 5);
    },
    relic(B, rng, isle, st, place) {
      place(8, 0.6, 0.95, 1.2, 2.6, (x, z) => K.column(B, rng, x, z, 1.5 + rng() * 3, 0xece2c4, undefined, rng() < 0.5));
      // a chunky guardian statue
      place(1, 0.55, 0.75, 2, 5, (x, z) => {
        B.at(x, 0, z, Math.atan2(-x, -z), 1);
        B.part(geo('rbox'), 0, 0.5, 0, 1.6, 1, 1.6, 0xd8cba0);
        B.part(geo('rboxS'), 0, 1.9, 0, 1.1, 1.8, 0.8, 0xe8dfc0);
        B.part(geo('sphere'), 0, 3.2, 0, 0.55, 0.55, 0.55, 0xf0e8d0);
        B.part(geo('rboxS'), 0.75, 1.9, 0, 0.35, 1.3, 0.35, 0xe8dfc0, { rz: 0.15 });
        B.part(geo('rboxS'), -0.75, 1.9, 0, 0.35, 1.3, 0.35, 0xe8dfc0, { rz: -0.15 });
        [-0.18, 0.18].forEach(o => B.part(geo('sphereLo'), o, 3.25, 0.48, 0.08, 0.08, 0.05, 0x7fe8ff, { glow: 2.5 }));
      });
      place(6, 0.2, 0.8, 0.5, 2, (x, z) => { B.at(x, 1 + rng() * 2.5, z, rng() * 6, 0.35 + rng() * 0.3); B.part(geo('rock' + Math.floor(rng() * 4)), 0, 0, 0, 1, 1, 1, col(0xd0c39a, rng)); });
    },
    cavefloor(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.5), 0.62, 0.97, 1.2, 2.6, (x, z) => K.stalagmite(B, rng, x, z, 0.9 + rng() * 0.5, 0x4a3c34));
      place(6, 0.3, 0.9, 0.8, 2, (x, z) => K.crystals(B, rng, x, z, 0.4 + rng() * 0.3, 0x6a8aff, 1.4));
      place(6, 0.4, 0.97, 0.8, 2, (x, z) => K.rock(B, rng, x, z, 0.5 + rng() * 0.5, 0x4a3e36));
    },
    deepcrystal(B, rng, isle, st, place, info, g) {
      place(Math.round(isle.r * 0.5), 0.62, 0.97, 1.3, 2.8, (x, z) => K.crystals(B, rng, x, z, 0.9 + rng() * 0.8, rng() < 0.5 ? 0x9a7bff : 0x6ae8ff, 1.8));
      const a = quietAngle(info, rng), px = Math.cos(a) * isle.r * 0.35, pz = Math.sin(a) * isle.r * 0.35;
      B.at(px, 0.02, pz, 0, 1); B.part(geo('disc'), 0, 0, 0, isle.r * 0.3, 0.02, isle.r * 0.3, 0x3a5aff, { glow: 1.2 });
      place(5, 0.3, 0.8, 0.5, 2, (x, z) => K.orb(B, rng, x, z, 1.5 + rng() * 2, 0xb08fff));
      addFireflies(g, isle, 0x9fd8ff, 24, 4);
    },
    magma(B, rng, isle, st, place, info, g) {
      lavaPool(B, rng, isle, info, 0.34, g);
      place(Math.round(isle.r * 0.4), 0.66, 0.97, 1.3, 2.8, (x, z) => K.spire(B, rng, x, z, 0.8 + rng() * 0.6, 0x1a100e, 0xff5a1a));
      addFireflies(g, isle, 0xff8a3a, 30, 4);
    },
    bonecave(B, rng, isle, st, place) {
      place(3, 0.6, 0.9, 2.5, 6, (x, z) => K.rib(B, rng, x, z, rng() * 6.28, 1 + rng() * 0.3, 0xe0d4b0));
      place(2, 0.7, 0.92, 2.5, 5, (x, z) => K.skull(B, rng, x, z, Math.atan2(-x, -z), 1, 0xe0d4b0, 0xff6a1a));
      place(7, 0.3, 0.95, 0.8, 1.5, (x, z) => K.bone(B, rng, x, z, 0xe0d4b0));
      place(4, 0.6, 0.97, 1.2, 2.6, (x, z) => K.stalagmite(B, rng, x, z, 0.8, 0x56483a));
    },
    coretemple(B, rng, isle, st, place, info, g) {
      place(8, 0.6, 0.9, 1.2, 2.6, (x, z) => K.column(B, rng, x, z, 3 + rng() * 2, 0x14100c, 0xd8a83a));
      // the molten core hangs BEHIND the boss altar (the 熔岩核心巨獸 spawns at z -7 and used to
      // stand inside it); glow kept under the white-out point so it stays orange, not pink-white
      B.at(0, 10.5, -15, 0, 1);
      B.part(geo('sphere'), 0, 0, 0, 1.8, 1.8, 1.8, 0xff5a10, { glow: 1.3 });
      B.part(geo('torus'), 0, 0, 0, 2.6, 2.6, 1.4, 0xd8a83a, { rx: 1.2, glow: 1 });
      B.part(geo('torus'), 0, 0, 0, 3.1, 3.1, 1.4, 0xd8a83a, { rx: 0.3, ry: 0.8, glow: 1 });
      place(4, 0.35, 0.55, 1, 3, (x, z) => K.brazier(B, rng, x, z));
      addFireflies(g, isle, 0xff8a3a, 30, 6);
    },
  };
  function spot(isle, info, rng, f) {
    for (let i = 0; i < 40; i++) {
      const a = rng() * 6.28, rr = isle.r * (f - 0.08 + rng() * 0.16);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (!blocked(info.ex, x, z, 0.8)) return [x, z];
    }
    return [isle.r * f, 0];
  }
  // animated molten pool: bright flowing lava with drifting dark crust plates
  let lavaMat = null;
  function getLavaMat() {
    if (lavaMat) return lavaMat;
    lavaMat = new THREE.ShaderMaterial({
      uniforms: { uNoise: { value: TEX.noise }, uTime: U.time },
      vertexShader: 'attribute vec2 uv2s; varying vec2 vUv; varying vec2 vE; void main(){ vUv = uv; vE = uv2s; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D uNoise; uniform float uTime; varying vec2 vUv; varying vec2 vE;
        void main() {
          vec2 p = vUv;
          float n1 = texture2D(uNoise, p * 0.35 + vec2(uTime * 0.012, uTime * 0.008)).r;
          float n2 = texture2D(uNoise, p * 0.9 - vec2(uTime * 0.02, 0.0)).r;
          float n = n1 * 0.65 + n2 * 0.35;
          vec3 hot = vec3(2.0, 0.42, 0.04) * (0.85 + 0.25 * sin(uTime * 1.7 + n * 14.0));
          vec3 crust = vec3(0.09, 0.02, 0.012);
          float c = smoothstep(0.5, 0.6, n);
          vec3 col = mix(hot, crust, c);
          col += vec3(2.4, 0.9, 0.15) * (1.0 - smoothstep(0.0, 0.03, abs(n - 0.5)));
          float edge = smoothstep(0.5, 0.42, length(vE - 0.5));
          col = mix(vec3(0.6, 0.08, 0.02), col, edge);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    return lavaMat;
  }
  function lavaPool(B, rng, isle, info, f, g) {
    let px = -isle.r * 0.12, pz = isle.r * 0.14;
    const pr = isle.r * f;
    for (let i = 0; i < 20 && blocked(info.ex.filter(e => !e.bridge), px, pz, pr * 0.6); i++) { const a = rng() * 6.28; px = Math.cos(a) * isle.r * 0.4; pz = Math.sin(a) * isle.r * 0.4; }
    B.at(px, 0, pz, 0, 1);
    B.part(geo('disc'), 0, 0, 0, pr + 0.5, 0.06, pr + 0.5, 0x2a1c1a);
    const cg = new THREE.CircleGeometry(pr, 36);
    cg.setAttribute('uv2s', cg.attributes.uv.clone());
    const uvA = cg.attributes.uv;   // world-scale uvs (one noise tile per ~3 units); edge fade uses uv2s
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * pr / 3, uvA.getY(i) * pr / 3);
    const m = new THREE.Mesh(cg, getLavaMat());
    m.rotation.x = -Math.PI / 2;
    m.position.set(px, 0.08, pz);
    g.add(m);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; K.rock(B, rng, px + Math.cos(a) * (pr + 0.5), pz + Math.sin(a) * (pr + 0.5), 0.35 + rng() * 0.25, 0x2a2224); }
    info.water = { x: px, z: pz, r: pr };
  }

  // ---------- main entry: build one island's visuals (sky.js adds the collider) ----------
  function buildIsland(isle) {
    const rng = mulberry(SKY_CONFIG.worldSeed + isle.seed * 977);
    const st = ST[isle.type] || ST.grass;
    const g = new THREE.Group();
    g.position.set(isle.pos[0], isle.pos[1], isle.pos[2]);
    const R = outlineFn(isle, rng);
    const Rm = isle.r + 2;
    const info = exclusions(isle);
    const depth = Math.min(38, isle.r * (0.95 + rng() * 0.35) + 4);

    // body: grass lip, strata cliffs, underside features
    const body = new Batch();
    const bg = bodyGeometry(isle, st, R, rng, depth);
    body.add(bg.geo, _ID, 0xffffff, 0, 0);
    bg.geo.dispose();
    buildUnder(body, isle, st, R, rng, depth, bg.taper, bg.top);
    const bodyMesh = body.mesh(propMat, false);
    bodyMesh.userData.camSolid = true;    // terrain blocks the camera (SkyAvatar.updateCamera); props do not
    g.add(bodyMesh);

    // props
    const B = new Batch();
    const place = makePlacer(isle, rng, info.ex);
    if (DECOR[isle.type]) DECOR[isle.type](B, rng, isle, st, place, info, g, R);
    gateFor(B, rng, st, info);
    portalRing(B, rng, st, info);
    const props = B.mesh(propMat, true);
    if (props) g.add(props);

    // painted top (after decor so ponds/pools are known for grass placement)
    const paint = paintTop(isle, st, R, Rm, info, rng, low ? 256 : (isle.id === 'isle_dawn' && !isTouch ? 1024 : isle.r >= 15 ? 512 : 256));
    const topOpts = { map: paint.map, roughness: st.rough || 0.92 };
    if (paint.emap) { topOpts.emissiveMap = paint.emap; topOpts.emissive = new THREE.Color(0xffffff); topOpts.emissiveIntensity = 1.6; }
    const topMat = litMat(topOpts);
    // crisp close-up grain: a world-scale tiling noise multiplies the painted canvas
    const detailScale = { value: 2 * Rm / 3.2 };
    topMat.onBeforeCompile = sh => {
      sh.uniforms.uDetail = { value: TEX.noise };
      sh.uniforms.uDetailScale = detailScale;
      sh.fragmentShader = 'uniform sampler2D uDetail;\nuniform float uDetailScale;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        `#include <map_fragment>
        float dt1 = texture2D(uDetail, vMapUv * uDetailScale).r;
        float dt2 = texture2D(uDetail, vMapUv * uDetailScale * 0.27 + 0.31).r;
        diffuseColor.rgb *= 0.8 + dt1 * 0.28 + dt2 * 0.12;`);
    };
    topMat.customProgramCacheKey = () => 'skyart-top';
    const top = new THREE.Mesh(topGeometry(isle, R, Rm), topMat);
    top.receiveShadow = true;
    top.userData.camSolid = true;
    top.matrixAutoUpdate = false; top.updateMatrix();
    g.add(top);

    const grass = buildGrass(isle, st, rng, info);
    if (grass) g.add(grass);

    scene.add(g);
    islands.push({ isle, group: g, props, grass, depth, x: isle.pos[0], y: isle.pos[1], z: isle.pos[2] });
    return g;
  }

  function updateIslandsLod(cp) {
    const propD = low ? 140 : 190, grassD = low ? 60 : 95;
    for (let i = 0; i < islands.length; i++) {
      const it = islands[i];
      if (!it.group.visible) continue;
      const d = Math.hypot(it.x - cp.x, it.y - cp.y, it.z - cp.z) - it.isle.r;
      if (it.props) it.props.visible = d < propD;
      if (it.grass) it.grass.visible = d < grassD;
    }
  }

  // ============================== bridges ==============================
  // pieces: [{ x, y, z, len }] in world space (y = walk surface); colliders stay in sky.js
  function regionOf(b) {
    const A = SKY_ISLANDS.find(i => i.id === b.from);
    if (!A) return 'sky';
    if (A.underground) return 'und';
    if (A.pos[1] >= 90 && A.pos[0] > 250) return 'gal';
    return 'sky';
  }
  function buildBridge(b, pieces, yaw, style) {
    const rng = mulberry(SKY_CONFIG.worldSeed + pieces.length * 31 + Math.round(pieces[0].x * 7));
    const reg = regionOf(b);
    const B = new Batch();
    if (style === 'stepstones') {
      const topC = reg === 'gal' ? 0x5a4a9a : reg === 'und' ? 0x4a3a32 : 0x6cc455;
      const rockC = reg === 'gal' ? 0x34306a : reg === 'und' ? 0x2a1e1a : 0x9c7658;
      pieces.forEach((p, i) => {
        B.at(p.x, p.y, p.z, rng() * 6.28, 1);
        B.part(geo('puck'), 0, 0, 0, 1.7, 1, 1.7, col(topC, rng, 0.05));
        B.part(geo('tier'), 0, -0.45, 0, 1.6, -(1.6 + rng() * 1.4), 1.6, col(rockC, rng));
        if (reg === 'sky') { B.part(geo('sphereLo'), 0.7, 0, 0.5, 0.25, 0.12, 0.25, col(0x4fae45, rng)); if (rng() < 0.4) B.part(geo('sphereLo'), -0.6, 0.04, -0.4, 0.12, 0.08, 0.12, FLOWERS[i % 5]); }
        else if (reg === 'gal') B.part(geo('crystal'), 0, -2.4, 0, 0.45, 1.6, 0.45, 0xb08fff, { rx: Math.PI, glow: 1.8 });
        else B.part(geo('rbox'), 0, -1.6, 0, 0.16, 1.6, 0.16, 0xff6a1a, { glow: 2.4, rz: 0.2 });
      });
    } else if (style === 'plank') {
      const posts = [[], []];
      pieces.forEach((p, i) => {
        B.at(p.x, p.y, p.z, yaw, 1);
        const n = 2, L = p.len;
        for (let k = 0; k < n; k++) B.part(geo('rbox'), (rng() - 0.5) * 0.12, -0.13, -L / 2 + (k + 0.5) * L / n, 2.7, 0.24, L / n - 0.08, col((i * 2 + k) % 3 ? 0xb0804a : 0x9c6c38, rng, 0.06), { ry: (rng() - 0.5) * 0.05 });
        [-1.15, 1.15].forEach(o => B.part(G.box || (G.box = new THREE.BoxGeometry(1, 1, 1)), o, -0.38, 0, 0.26, 0.26, L + 0.1, 0x6e4a2e));
        if (i % 2 === 0) {
          [-1.3, 1.3].forEach((o, sd) => {
            B.part(geo('cyl6'), o, -0.5, 0, 0.1, 1.75, 0.1, 0x6e4a2e);
            B.part(geo('sphereLo'), o, 1.28, 0, 0.14, 0.14, 0.14, 0x8a5e38);
            posts[sd].push(new THREE.Vector3(p.x + Math.cos(yaw) * o, p.y + 1.15, p.z - Math.sin(yaw) * o));
          });
        }
      });
      // sagging ropes between posts
      B.at(0, 0, 0, 0, 1);
      posts.forEach(list => {
        for (let i = 0; i < list.length - 1; i++) {
          const a = list[i], c = list[i + 1], pts = [];
          for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(new THREE.Vector3().lerpVectors(a, c, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * 0.35, 0))); }
          const tg = tube(pts, 0.05, 0.05, 5);
          B.add(tg, _ID, 0xd8b98a, 0, 0);
          tg.dispose();
        }
      });
    } else {
      const sc = reg === 'gal' ? [0x7a76b0, 0x6a6698] : reg === 'und' ? [0x4a3e36, 0x3e332c] : [0xc8c2b2, 0xb4ae9e];
      pieces.forEach((p, i) => {
        B.at(p.x, p.y, p.z, yaw, 1);
        B.part(geo('rbox'), 0, -0.25, 0, 3.3, 0.5, p.len + 0.05, col(sc[i % 2], rng, 0.04));
        [-1.55, 1.55].forEach(o => B.part(geo('rbox'), o, 0.05, 0, 0.3, 0.3, p.len * 0.92, col(sc[(i + 1) % 2], rng, 0.04)));
        B.part(geo('rbox'), 0, -0.85, 0, 2.2, 0.8, p.len * 0.7, col(sc[1], rng, 0.04));
        if (reg !== 'sky' && i % 3 === 1) B.part(geo('sphereLo'), 0, -1.3, 0, 0.2, 0.2, 0.2, reg === 'gal' ? 0xb08fff : 0xff6a1a, { glow: 2.4 });
      });
    }
    const m = B.mesh(propMat, true);
    if (m) scene.add(m);
    return m;
  }

  // ============================== jump pads ==============================
  let padRingMat = null;
  function buildPad(p, g) {
    if (!padRingMat) padRingMat = litMat({ color: 0x9ff0ff, emissive: 0x7fe8ff, emissiveIntensity: 1.1 });
    const B = new Batch();
    B.at(p.dx, 0, p.dz, 0, 1);
    B.part(geo('cyl'), 0, 0, 0, 2.3, 0.22, 2.3, 0xe8eef6);
    B.part(geo('cyl'), 0, 0.2, 0, 2.05, 0.2, 2.05, 0x4a6aa8);
    B.part(geo('torus'), 0, 0.4, 0, 2.05, 2.05, 1.4, 0xffffff, { rx: Math.PI / 2 });
    B.part(geo('disc'), 0, 0.4, 0, 1.6, 0.06, 1.6, 0x7fe8ff, { glow: 0.8 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; B.part(geo('sphereLo'), Math.cos(a) * 2.05, 0.42, Math.sin(a) * 2.05, 0.14, 0.14, 0.14, 0xffe066, { glow: 2 }); }
    const base = B.mesh(propMat, true);
    g.add(base);
    // animated: rising rings + bobbing chevron
    const holder = new THREE.Group();
    holder.position.set(p.dx, 0, p.dz);
    const rings = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(geo('torus'), padRingMat);
      r.rotation.x = Math.PI / 2;
      holder.add(r);
      rings.push(r);
    }
    const chev = new THREE.Group();
    const cm = matOf(0xffe066, 0xffc21a);
    [-1, 1].forEach(sd => {
      const bar = new THREE.Mesh(geo('rbox'), cm);
      bar.scale.set(0.95, 0.26, 0.26);
      bar.position.set(sd * 0.33, 0, 0);
      bar.rotation.z = -sd * 0.7;
      chev.add(bar);
    });
    holder.add(chev);
    g.add(holder);
    anims.push({ kind: 'pad', rings, chev, group: g, ph: p.dx * 0.37 });
  }

  // ============================== quest props & markers (integration pass) ==============================
  // The quest objects sky.js places (chests, gates, pillars, altars, portals, switches …) are built
  // from the same rounded kit + vertex colours + per-vertex glow as the islands, and merged into ONE
  // mesh per island (sky.js: buildQuestObjects). Runtime pieces (race rings, maze arches, order
  // stones, rune orbs, meteor shards) and the floating quest markers use cached geometries from
  // questGeo(), drawn with propMat so glow, fog and tone mapping match the world.
  const _rsTint = new THREE.Color(0xd4d0e4);
  const STONE = 0xd8d0bc, STONE_D = 0xb2a88f, WOOD = 0x9b5e2e, WOOD_D = 0x74431f, GOLD = 0xffc93a;
  const QP = {
    chest(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('rbox'), 0, 0.42, 0, 1.5, 0.8, 1.0, WOOD);
      B.part(geo('cyl'), -0.76, 0.84, 0, 0.5, 1.52, 0.5, WOOD_D, { rz: -Math.PI / 2 });
      [-0.47, 0.47].forEach(bx => {
        B.part(geo('rbox'), bx, 0.42, 0, 0.17, 0.84, 1.05, GOLD, { glow: 0.35 });
        B.part(geo('cyl'), bx - 0.09, 0.84, 0, 0.53, 0.18, 0.53, GOLD, { rz: -Math.PI / 2, glow: 0.35 });
      });
      B.part(geo('rbox'), 0, 0.8, 0.53, 0.34, 0.4, 0.1, GOLD, { glow: 1.1 });
      B.part(geo('rbox'), 0, 0.76, 0.59, 0.07, 0.15, 0.04, 0x3a2410);
      // a little spill of gold so it reads as treasure from across the island
      [[0.95, 0.35], [1.15, -0.1], [-0.95, 0.45]].forEach(([cx, cz], i) => B.part(geo('disc'), cx, 0.02 + i * 0.01, cz, 0.2, 0.06, 0.2, GOLD, { glow: 0.9, rx: i * 0.2 }));
    },
    gate(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      [-1.45, 1.45].forEach(px => {
        B.part(geo('rbox'), px, 0.18, 0, 1.15, 0.36, 1.15, STONE_D);
        B.part(geo('rbox'), px, 1.9, 0, 0.82, 3.2, 0.82, STONE);
        B.part(geo('rbox'), px, 3.6, 0, 1.05, 0.3, 1.05, STONE_D);
        B.part(geo('rbox'), px, 1.9, 0.42, 0.14, 1.9, 0.05, 0x6ff0ff, { glow: 1.6 });
      });
      B.part(geo('rbox'), 0, 4.0, 0, 4.3, 0.6, 1.1, STONE);
      B.part(geo('gem'), 0, 4.0, 0.62, 0.32, 0.42, 0.18, 0x6ff0ff, { glow: 2.2 });
    },
    listen(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('rock1'), 0, 0.05, 0, 1.3, 0.45, 1.1, 0x8090b8);
      [[0, 0, 2.4, 0.62], [0.65, 0.25, 1.6, 0.45], [-0.6, -0.2, 1.8, 0.48], [0.1, -0.6, 1.2, 0.38]].forEach(([cx, cz, h, w], i) =>
        B.part(geo('crystal'), cx, 0.1, cz, w, h, w, i ? 0x8ff4ff : 0xb8fbff, { rx: cz * 0.4, rz: -cx * 0.4, glow: 1.5 }));
    },
    pillars(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      [-1, 1].forEach(sd => {
        B.part(geo('rbox'), sd, 0.18, 0, 0.95, 0.36, 0.95, STONE_D);
        B.part(geo('cyl'), sd, 0.3, 0, 0.36, 1.45, 0.36, STONE);
        B.part(geo('rbox'), sd, 1.8, 0, 0.85, 0.24, 0.85, STONE_D);
        B.part(geo('sphere'), sd, 2.28, 0, 0.32, 0.32, 0.32, 0xffd166, { glow: 1.8 });
      });
    },
    runes(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('rbox'), 0, 0.16, 0, 2.2, 0.32, 2.2, STONE_D);
      B.part(geo('rbox'), 0, 0.34, 0, 1.0, 0.06, 1.0, 0xc49bff, { ry: Math.PI / 4, glow: 1.8 });
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => {
        B.part(geo('rbox'), a * 1.35, 0.55, b * 1.35, 0.42, 1.1, 0.3, STONE, { ry: Math.atan2(a, b) });
        B.part(geo('rbox'), a * 1.35, 0.7, b * 1.35, 0.44, 0.1, 0.1, 0xc49bff, { ry: Math.atan2(a, b), glow: 1.6 });
      });
    },
    arena(B, x, z, ry) {
      B.at(x, 0, z, ry, 1); B.swayH = 3.6;
      [-1.1, 1.1].forEach(px => {
        B.part(geo('cyl6'), px, 0, 0, 0.09, 3.4, 0.09, 0x6e4a2e);
        B.part(geo('rbox'), px, 2.55, 0.1, 0.85, 1.5, 0.07, 0xe8504f, { sway: 0.6 });
        B.part(geo('rbox'), px, 2.55, 0.15, 0.4, 0.4, 0.04, GOLD, { ry: Math.PI / 4, glow: 0.8, sway: 0.6 });
        B.part(geo('gem'), px, 3.5, 0, 0.16, 0.26, 0.16, GOLD, { glow: 1.4 });
      });
      B.part(geo('torus'), 0, 0.05, 0, 2.1, 2.1, 0.9, 0xb9ad94, { rx: Math.PI / 2 });
    },
    race(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      [-1.7, 1.7].forEach(px => {
        for (let k = 0; k < 4; k++) B.part(geo('cyl'), px, k * 0.85, 0, 0.16, 0.85, 0.16, k % 2 ? 0xffffff : 0xff5a5a);
        B.part(geo('sphere'), px, 3.45, 0, 0.22, 0.22, 0.22, GOLD, { glow: 1.5 });
      });
      for (let k = 0; k < 8; k++) B.part(geo('rbox'), -1.4 + k * 0.4, 3.05, 0, 0.4, 0.4, 0.08, k % 2 ? 0x22242c : 0xffffff);
      B.part(geo('torus'), 0, 1.6, 0, 1.15, 1.15, 1.6, GOLD, { glow: 1.4 });
    },
    bridge(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('cyl6'), 0, 0, 0, 0.11, 2.0, 0.11, 0x7a5232);
      B.part(geo('rbox'), 0, 1.65, 0.06, 1.4, 0.62, 0.12, 0xe0b070);
      B.part(geo('rbox'), 0, 1.65, 0.13, 1.05, 0.12, 0.03, 0x6fd3ff, { glow: 1.2 });
      for (let k = 0; k < 3; k++) B.part(geo('rbox'), 1.2, 0.1 + k * 0.17, 0.3 - k * 0.05, 1.6, 0.15, 0.45, k % 2 ? 0xc8945a : 0xd8a868, { ry: 0.2 + k * 0.15 });
      B.part(geo('torus'), -1.0, 0.12, 0.4, 0.38, 0.38, 1.6, 0xc9a26a, { rx: Math.PI / 2 });
    },
    boss(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('disc'), 0, 0, 0, 2.4, 0.4, 2.4, 0x3d3858);
      B.part(geo('disc'), 0, 0.38, 0, 1.8, 0.38, 1.8, 0x4a4470);
      B.part(geo('torus'), 0, 0.42, 0, 2.1, 2.1, 0.6, 0xb48cff, { rx: Math.PI / 2, glow: 1.8 });
      B.part(geo('gem'), 0, 1.35, 0, 0.42, 0.62, 0.42, 0xff6ad5, { glow: 2.0 });
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * 6.28 + 0.78;
        B.part(geo('rbox'), Math.cos(a) * 2.7, 0.8, Math.sin(a) * 2.7, 0.5, 1.6, 0.5, 0x4a4470, { ry: -a });
        B.part(geo('gem'), Math.cos(a) * 2.7, 1.85, Math.sin(a) * 2.7, 0.18, 0.28, 0.18, 0xb48cff, { glow: 2 });
      }
    },
    order(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * 6.28;
        B.part(geo('puck'), Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3, 0.5, 0.6, 0.5, STONE);
        B.part(geo('disc'), Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3, 0.3, 0.03, 0.3, 0xc49bff, { glow: 1.6 });
      }
      B.part(geo('cyl6'), 0, 0, 0, 0.08, 1.5, 0.08, 0x7a5232);
      B.part(geo('rbox'), 0, 1.35, 0, 0.9, 0.42, 0.1, 0xe0b070);
    },
    maze(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      [-0.95, 0.95].forEach(px => {
        B.part(geo('rbox'), px, 0.15, 0, 0.7, 0.3, 0.7, 0x3a2c58);
        B.part(geo('rbox'), px, 1.15, 0, 0.42, 2.0, 0.42, 0x4e3c78);
      });
      B.part(geo('torusHalf'), 0, 2.1, 0, 0.95, 0.95, 1.4, 0xc58bff, { glow: 1.7 });
    },
    // portal frame (the swirl itself is portalSwirl(), animated); crater = 地心 portals
    portal(B, x, z, ry, crater) {
      B.at(x, 0, z, ry, 1);
      const st = crater ? 0x4a3830 : 0xe2dcf4, st2 = crater ? 0x2e221e : 0xbfb4e0, glowC = crater ? 0xff7a2a : 0xb48cff;
      [-2.1, 2.1].forEach(px => {
        B.part(geo('rbox'), px, 0.25, 0, 1.2, 0.5, 1.2, st2);
        B.part(geo('rbox'), px, 2.2, 0, 0.78, 3.6, 0.78, st);
        B.part(geo('rbox'), px, 2.2, 0.4, 0.14, 2.4, 0.05, glowC, { glow: 1.8 });
        B.part(geo('gem'), px, 4.45, 0, 0.3, 0.45, 0.3, glowC, { glow: 2 });
      });
      B.part(geo('torus'), 0, 2.35, 0, 1.85, 1.85, 2.4, glowC, { glow: 1.5 });
      B.part(geo('torus'), 0, 2.35, 0, 2.05, 2.05, 1.4, st, {});
    },
    switch(B, x, z, ry) {
      B.at(x, 0, z, ry, 1);
      B.part(geo('rbox'), 0, 0.45, 0, 0.75, 0.9, 0.6, 0x3c3c52);
      B.part(geo('rbox'), 0, 0.6, 0.31, 0.12, 0.5, 0.04, 0x7fe8ff, { glow: 2 });
      B.part(geo('crystal'), 0, 1.15, 0, 0.36, 1.1, 0.36, 0x9ff4ff, { glow: 1.8 });
    },
  };
  function questProp(B, type, x, z, ry, opt) { if (QP[type]) QP[type](B, x, z, ry || 0, opt); }

  // ---- cached runtime geometries (markers, race rings, maze arches, order stones, orbs, shards) ----
  const QG = {};
  function questGeo(name) {
    if (QG[name]) return QG[name];
    const B = new Batch();
    B.at(0, 0, 0, 0, 1);
    switch (name) {
      case 'mk_quest':   // Roblox-style floating "!" (bar + dot), gold with a warm rim
        B.part(geo('rbox'), 0, 0.42, 0, 0.36, 1.0, 0.36, 0xffc21a, { glow: 0.8 });
        B.part(geo('sphereLo'), 0, -0.36, 0, 0.21, 0.21, 0.21, 0xffc21a, { glow: 0.8 });
        break;
      case 'mk_done':
        B.part(geo('rbox'), -0.17, -0.05, 0, 0.2, 0.46, 0.2, 0x4ade80, { rz: 0.8, glow: 0.9 });
        B.part(geo('rbox'), 0.17, 0.12, 0, 0.2, 0.86, 0.2, 0x4ade80, { rz: -0.62, glow: 0.9 });
        break;
      case 'mk_lock':
        B.part(geo('rbox'), 0, -0.15, 0, 0.72, 0.6, 0.34, 0xd9dee8, { glow: 0.12 });
        B.part(geo('torusHalf'), 0, 0.15, 0, 0.25, 0.3, 0.9, 0xa4adbd);
        B.part(geo('rbox'), 0, -0.17, 0.17, 0.1, 0.22, 0.04, 0x4a5262);
        break;
      case 'mk_portal':
        B.part(geo('gem'), 0, 0, 0, 0.36, 0.56, 0.36, 0xc58bff, { glow: 1.8 });
        break;
      case 'mk_switch':
        B.part(geo('gem'), 0, 0, 0, 0.3, 0.5, 0.3, 0x7fe8ff, { glow: 1.8 });
        break;
      case 'ring_idle': case 'ring_next': case 'ring_done': {
        const c = name === 'ring_next' ? GOLD : name === 'ring_done' ? 0x4ade80 : 0xdfe6f2;
        B.part(geo('torus'), 0, 0, 0, 1.8, 1.8, 1.6, c, { glow: name === 'ring_idle' ? 0.15 : 1.5 });
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; B.part(geo('sphereLo'), Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0, 0.17, 0.17, 0.17, name === 'ring_idle' ? 0xaab4c8 : 0xffffff, { glow: name === 'ring_idle' ? 0 : 1.6 }); }
        break;
      }
      case 'maze_arch':
        [-0.72, 0.72].forEach(px => {
          B.part(geo('rbox'), px, 0.12, 0, 0.5, 0.24, 0.5, 0x3a2c58);
          B.part(geo('rbox'), px, 0.9, 0, 0.3, 1.5, 0.3, 0x4e3c78);
        });
        B.part(geo('torusHalf'), 0, 1.65, 0, 0.72, 0.72, 1.1, 0xc58bff, { glow: 1.7 });
        break;
      case 'order_stone':
        B.part(geo('puck'), 0, 0.15, 0, 0.92, 0.6, 0.92, STONE);
        B.part(geo('torus'), 0, 0.16, 0, 0.78, 0.78, 0.6, 0xc49bff, { rx: Math.PI / 2, glow: 1.4 });
        break;
      case 'order_done':
        B.part(geo('puck'), 0, 0.15, 0, 0.92, 0.6, 0.92, 0xbfe8c4);
        B.part(geo('torus'), 0, 0.16, 0, 0.78, 0.78, 0.6, 0x4ade80, { rx: Math.PI / 2, glow: 1.6 });
        break;
      case 'orb':       // rune letter orb (the letter itself stays a sprite so it is always readable)
        B.part(geo('sphere'), 0, 0, 0, 0.42, 0.42, 0.42, 0xb48cff, { glow: 1.3 });
        B.part(geo('torus'), 0, 0, 0, 0.62, 0.62, 0.8, 0xe2ccff, { rx: Math.PI / 2, glow: 1.2 });
        break;
      case 'shard':
        B.part(geo('crystal'), 0, -0.45, 0, 0.42, 1.0, 0.42, 0xffe066, { glow: 1.8 });
        B.part(geo('crystal'), 0, 0.45, 0, 0.42, 0.9, 0.42, 0xffe066, { rx: Math.PI, glow: 1.8 });
        break;
      default: throw new Error('questGeo ' + name);
    }
    const m = B.mesh(propMat, false);
    QG[name] = m.geometry;
    return QG[name];
  }
  function questMesh(name) {
    const m = new THREE.Mesh(questGeo(name), propMat);
    m.castShadow = !low && !/^(mk_|orb|shard)/.test(name);
    return m;
  }

  // animated portal swirl: a bright spiral disc (crosses bloom) that turns; skipped with its island
  let swirlTex = null;
  function portalSwirl(g, x, z, crater) {
    if (!swirlTex) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const c = cv.getContext('2d');
      const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0.35)');
      c.fillStyle = gr; c.beginPath(); c.arc(128, 128, 128, 0, 6.28); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineCap = 'round';
      for (let arm = 0; arm < 4; arm++) {
        c.lineWidth = 9; c.beginPath();
        for (let t = 0; t <= 1; t += 0.02) {
          const a = arm * Math.PI / 2 + t * 5.2, r = 10 + t * 112;
          const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r;
          if (t === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.stroke();
      }
      swirlTex = canvasTex(cv);
    }
    const mat = new THREE.MeshBasicMaterial({ map: swirlTex, color: crater ? 0xff8a3a : 0xa77bff, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), mat);
    m.position.set(x, 2.35, z);
    m.renderOrder = 1;
    m.userData.camIgnore = true;
    g.add(m);
    anims.push({ kind: 'swirl', mesh: m, group: g, ph: x });
    return m;
  }

  function updateAnims() {
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (!a.group.visible) continue;
      if (a.kind === 'pad') {
        for (let k = 0; k < a.rings.length; k++) {
          const t = ((time * 0.8 + k * 0.5 + a.ph) % 1);
          const r = a.rings[k];
          r.position.y = 0.5 + t * 2.6;
          const s = 1.7 * (1 - t * 0.55);
          r.scale.set(s, s, 1 - t * 0.9 + 0.05);
        }
        a.chev.position.y = 2.1 + Math.sin(time * 3 + a.ph) * 0.25;
        a.chev.rotation.y = time * 1.5;
      }
      else if (a.kind === 'swirl') {
        a.mesh.rotation.z = -time * 1.6 - a.ph;
        const k = 1 + Math.sin(time * 2.2 + a.ph) * 0.04;
        a.mesh.scale.set(k, k, 1);
      }
    }
  }

  return {
    createRenderer, init, resize, frame, matOf,
    buildIsland, buildBridge, buildPad,
    TEX, fogBase, state,
    // prop kit for sibling modules: const B = new SkyArt.Batch(); SkyArt.K.oak(B, rng, x, z, 1, 0x5cb34c);
    // group.add(B.mesh()) — one merged, swaying, glow-capable draw call (shares propMat)
    Batch, K, geo, get propMat() { return propMat; },
    questProp, questGeo, questMesh, portalSwirl,
    get hemi() { return hemi; }, get sun() { return sun; }, get dome() { return dome; },
    get composer() { return composer; },
  };
})();
