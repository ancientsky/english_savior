/* ===== SkyAvatar — player avatar, NPCs, creatures, animation and movement FX for 天空之城 =====
   Loaded BEFORE js/sky.js. Owned by the AVATAR workstream.

   Everything here is procedural: chunky rounded "toy" characters are assembled
   from RoundedBox / lathe / sphere parts, vertex-coloured and MERGED per bone
   (one draw call per moving part), faces are canvas-drawn and swapped per
   expression. No per-frame allocation in any update path — FX use fixed
   InstancedMesh pools.

   Public API (see the bottom of the file):
     init(ctx)                      — called once by sky.js (ctx = shared module context)
     buildPlayer(group)             — fills the hero group, returns the playerParts object
     refreshLook(skinId, tint, titleText) — re-dress the hero for an equipped skin + badge
     animatePlayer(dt, info)        — presentation half of updatePlayer ({ yaw, quiz })
     update(dt)                     — FX pools, NPC idle/turning, auras, mob shadows
     updateCamera(dt)               — third-person camera (collision, lag, FOV kick, shake, reveal)
     makeNpc(emoji, tint)           — a little NPC character (registered for idle animation)
     makeMob(def)                   — creature mesh (slime / wisp / bat / flyer + variants)
     animateMob(mob, dt) / mobHit(mob) / mobDying(mob, dt) — creature presentation
     makeBoss(id, d) / animateBoss(group, dt, phase)       — boss presentation
     makeShield() / makeMount() / makeBolt() / boltTrail(x,y,z) / lightning(from, to)
     celebrate(n)                   — 3D confetti burst + hero cheer
     burst(kind, x, y, z, n, color) — generic one-shot FX ('puff' | 'spark' | 'ring' | 'confetti')

   Camera collision: only meshes inside an island group (islandGroups[id]) flagged
   `obj.userData.camSolid = true` block the camera (SkyArt flags island terrain).
   `obj.userData.camIgnore = true` still opts a flagged object out. */
const SkyAvatar = (() => {
  'use strict';
  let C = null;                 // shared sky.js context (set by init)
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (dt, rate) => 1 - Math.exp(-rate * dt);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function low() { return !!(C && C.lowPower && C.lowPower()); }
  function tex(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // damped spring, sub-stepped so it stays stable on slow frames (dt up to 0.1)
  function spring(o, kx, kv, rest, k, d, dt, lo, hi) {
    let steps = Math.ceil(dt / 0.008);
    const h = dt / steps;
    let x = o[kx], v = o[kv];
    while (steps--) {
      v += (-k * (x - rest) - d * v) * h;
      x += v * h;
    }
    o[kx] = clamp(x, lo, hi); o[kv] = v;
  }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // ===================== geometry kit =====================
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _c = new THREE.Color();
  const GC = {};
  // tessellation: the hero gets full detail; NPCs / creatures (usually further
  // away, and many of them) are built with DETAIL = 0 → about half the triangles
  let DETAIL = 1;
  function rbox(w, h, d, r) {
    const seg = DETAIL ? 3 : 2;
    const k = `rb${w}_${h}_${d}_${r}_${seg}`;
    if (!GC[k]) {
      const rr = Math.max(0.005, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
      GC[k] = new THREE.RoundedBoxGeometry(w, h, d, seg, rr);
    }
    return GC[k];
  }
  function sph(r, ws = 14, hs = 10) {
    if (!DETAIL) { ws = Math.max(8, Math.round(ws * 0.7)); hs = Math.max(6, Math.round(hs * 0.7)); }
    const k = `sp${r}_${ws}_${hs}`;
    return GC[k] || (GC[k] = new THREE.SphereGeometry(r, ws, hs));
  }
  function cyl(rt, rb, h, seg = 14, open = false, ts = 0, tl = TAU) {
    const k = `cy${rt}_${rb}_${h}_${seg}_${open}_${ts}_${tl}`;
    return GC[k] || (GC[k] = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl));
  }
  function torus(r, t, rs = 8, ts = 20, arc = TAU) {
    const k = `to${r}_${t}_${rs}_${ts}_${arc}`;
    return GC[k] || (GC[k] = new THREE.TorusGeometry(r, t, rs, ts, arc));
  }
  function octa(r) { const k = 'oc' + r; return GC[k] || (GC[k] = new THREE.OctahedronGeometry(r, 0)); }
  function ico(r, d = 1) { const k = `ic${r}_${d}`; return GC[k] || (GC[k] = new THREE.IcosahedronGeometry(r, d)); }
  // rounded cylinder profile (the classic rounded head / gumdrops)
  function roundedProfile(r, h, rr, steps = 5) {
    const pts = [new THREE.Vector2(0.0001, -h / 2)];
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * Math.PI / 2;
      pts.push(new THREE.Vector2(r - rr + rr * Math.cos(a), -h / 2 + rr + rr * Math.sin(a)));
    }
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI / 2;
      pts.push(new THREE.Vector2(r - rr + rr * Math.cos(a), h / 2 - rr + rr * Math.sin(a)));
    }
    pts.push(new THREE.Vector2(0.0001, h / 2));
    return pts;
  }
  function lathe(key, pts, seg = 20, ps = 0, pl = TAU) {
    if (!DETAIL) seg = Math.max(8, Math.round(seg * 0.65));
    const k = 'la' + key + '_' + seg + '_' + ps + '_' + pl;
    return GC[k] || (GC[k] = new THREE.LatheGeometry(pts, seg, ps, pl));
  }
  function v2(list) { return list.map(p => new THREE.Vector2(p[0], p[1])); }
  function headGeo(r, h) { return lathe(`head${r}_${h}`, roundedProfile(r, h, Math.min(0.13, h * 0.22)), 22); }
  // top part of a rounded profile (hair caps / helmets hugging the head)
  function capGeo(key, r, h, cut, ps = 0, pl = TAU) {
    const prof = roundedProfile(r, h, Math.min(0.15, h * 0.24)).filter(p => p.y >= cut);
    prof.unshift(new THREE.Vector2(r, cut - 0.02));
    return lathe('cap' + key + r + h + cut, prof, 22, ps, pl);
  }
  function starGeo(r, depth, pts = 5, inner = 0.5) {
    const k = `st${r}_${depth}_${pts}_${inner}`;
    if (GC[k]) return GC[k];
    const sh = new THREE.Shape();
    for (let i = 0; i <= pts * 2; i++) {
      const a = Math.PI / 2 + (i / (pts * 2)) * TAU;
      const rr = i % 2 ? r * inner : r;
      if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const g = new THREE.ExtrudeGeometry(sh, {
      depth, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: r * 0.12, bevelSegments: 2, curveSegments: 4,
    });
    g.translate(0, 0, -depth / 2);
    return (GC[k] = g);
  }
  function shapeGeo(key, pts, depth = 0.04) {
    const k = 'sh' + key;
    if (GC[k]) return GC[k];
    const sh = new THREE.Shape();
    pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, {
      depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 1, curveSegments: 3,
    });
    g.translate(0, 0, -depth / 2);
    return (GC[k] = g);
  }

  // A Kit collects transformed, vertex-coloured copies of parts and merges them
  // into one geometry (= one draw call).
  function Kit() { this.list = []; }
  Kit.prototype.add = function (geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.clearGroups();
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(_m);
    _c.set(color);
    const ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ca[i * 3] = _c.r; ca[i * 3 + 1] = _c.g; ca[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    this.list.push(g);
    return this;
  };
  Kit.prototype.mesh = function (mat, shadow = true) {
    if (!this.list.length) return null;
    const geo = THREE.BufferGeometryUtils.mergeGeometries(this.list, false);
    this.list.forEach(g => g.dispose());
    this.list.length = 0;
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    return m;
  };

  function bodyMat(rough = 0.5, metal = 0) {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
  }
  function glowMat(boost = 1.7) {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    m.color.setScalar(boost); // > 1 → picked up by the bloom pass
    return m;
  }
  let SHARED = null;
  function shared() {
    if (SHARED) return SHARED;
    SHARED = {
      npcBody: bodyMat(0.55),
      glow: glowMat(1.8),
      eye: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
      pupil: new THREE.MeshStandardMaterial({ color: 0x15121f, roughness: 0.2 }),
    };
    return SHARED;
  }

  // ===================== canvas faces =====================
  const FACE_W = 256, FACE_H = 160;
  const faceCache = {};
  // style: kid | grandma | elf | ghost | alien | skull | star | ninja | robot | ender | chef
  // expr : happy | blink | effort | ouch | cheer | wow | focus
  function faceTex(style, expr) {
    const key = style + '|' + expr;
    if (faceCache[key]) return faceCache[key];
    const mk = () => { const cv = document.createElement('canvas'); cv.width = FACE_W; cv.height = FACE_H; return cv; };
    const cvMap = mk();
    const glowEyes = style === 'robot' || style === 'ender';
    const glowMouth = style === 'robot';
    const cvGlow = glowEyes ? mk() : null;
    const M = cvMap.getContext('2d');
    const Gx = cvGlow ? cvGlow.getContext('2d') : null;
    const eyeCtx = glowEyes ? [M, Gx] : [M];
    const mouthCtx = glowMouth ? [M, Gx] : [M];
    const ink = style === 'robot' ? '#8ff8ff' : style === 'ender' ? '#f08cff'
      : style === 'skull' ? '#2a2230' : style === 'alien' ? '#0d0b18' : '#2b1b17';
    const cx = FACE_W / 2;
    const ex = style === 'alien' ? 50 : style === 'ghost' ? 44 : 44;
    const ey = style === 'ninja' ? 62 : style === 'ender' ? 66 : 70;
    const all = (list, fn) => list.forEach(g => { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.fillStyle = ink; g.strokeStyle = ink; fn(g); g.restore(); });

    // blush first (under everything)
    if (style === 'kid' || style === 'grandma' || style === 'ghost' || style === 'star' || style === 'elf' || style === 'chef') {
      M.fillStyle = 'rgba(255,120,140,0.42)';
      [-1, 1].forEach(s => { M.beginPath(); M.ellipse(cx + s * 76, ey + 34, 20, 11, 0, 0, TAU); M.fill(); });
    }
    if (style === 'robot') {
      // faint scanlines so the screen reads as a screen
      M.fillStyle = 'rgba(120,240,255,0.08)';
      for (let y = 8; y < FACE_H; y += 8) M.fillRect(20, y, FACE_W - 40, 2);
    }

    // ---- eyes ----
    const oval = (g, x, y, w, h, lx = 0, ly = 0) => {
      g.beginPath(); g.ellipse(x, y, w, h, 0, 0, TAU); g.fill();
      if (style === 'robot' || style === 'ender') return;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(x - w * 0.3 + lx, y - h * 0.38 + ly, w * 0.36, h * 0.26, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + w * 0.35 + lx, y + h * 0.35 + ly, w * 0.16, 0, TAU); g.fill();
      g.fillStyle = ink;
    };
    const arcEye = (g, x, y, up) => {
      g.lineWidth = 9;
      g.beginPath();
      if (up) g.arc(x, y + 10, 18, Math.PI * 1.15, Math.PI * 1.85);
      else g.arc(x, y - 8, 17, Math.PI * 0.2, Math.PI * 0.8);
      g.stroke();
    };
    const chevron = (g, x, y, dir) => {
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(x - 14 * dir, y - 14); g.lineTo(x + 12 * dir, y); g.lineTo(x - 14 * dir, y + 14); g.stroke();
    };
    const xEye = (g, x, y) => {
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(x - 13, y - 13); g.lineTo(x + 13, y + 13); g.moveTo(x + 13, y - 13); g.lineTo(x - 13, y + 13); g.stroke();
    };
    const brows = (g, tilt, lift = 0, only = 0) => {
      g.lineWidth = 7;
      [-1, 1].forEach(s => {
        if (only && only !== s) return;
        g.beginPath();
        g.moveTo(cx + s * (ex - 18), ey - 36 - lift + tilt * 7);
        g.lineTo(cx + s * (ex + 16), ey - 38 - lift - tilt * 7);
        g.stroke();
      });
    };
    all(eyeCtx, g => {
      if (style === 'skull') {
        [-1, 1].forEach(s => { g.beginPath(); g.ellipse(cx + s * ex, ey, 24, 26, 0, 0, TAU); g.fill(); });
        g.beginPath(); g.moveTo(cx, ey + 24); g.lineTo(cx - 9, ey + 40); g.lineTo(cx + 9, ey + 40); g.closePath(); g.fill();
        if (expr === 'blink') { g.fillStyle = '#d8d2c4'; [-1, 1].forEach(s => g.fillRect(cx + s * ex - 26, ey - 28, 52, 24)); }
        else { g.fillStyle = '#9fe8ff'; [-1, 1].forEach(s => { g.beginPath(); g.arc(cx + s * ex, ey + 4, 6, 0, TAU); g.fill(); }); }
        return;
      }
      if (style === 'alien') {
        [-1, 1].forEach(s => {
          g.save(); g.translate(cx + s * ex, ey); g.rotate(s * 0.45);
          if (expr === 'blink') { g.lineWidth = 8; g.beginPath(); g.moveTo(-22, 0); g.lineTo(22, 0); g.stroke(); }
          else {
            g.beginPath(); g.ellipse(0, 0, 30, 19, 0, 0, TAU); g.fill();
            g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-8, -6, 8, 5, 0, 0, TAU); g.fill();
          }
          g.restore();
        });
        return;
      }
      if (style === 'robot') {
        const R = (x, y, w, h) => { g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, 6) : g.rect(x - w / 2, y - h / 2, w, h); g.fill(); };
        [-1, 1].forEach(s => {
          const x = cx + s * ex;
          if (expr === 'blink') R(x, ey + 6, 34, 7);
          else if (expr === 'effort') chevron(g, x, ey, s);
          else if (expr === 'ouch') xEye(g, x, ey);
          else if (expr === 'cheer') arcEye(g, x, ey, true);
          else if (expr === 'wow') { g.lineWidth = 8; g.beginPath(); g.arc(x, ey, 17, 0, TAU); g.stroke(); }
          else if (expr === 'focus') R(x + 6, ey - 4, 26, 30);
          else R(x, ey, 28, 36);
        });
        return;
      }
      const big = style === 'ghost' ? 1.2 : 1;
      [-1, 1].forEach(s => {
        const x = cx + s * ex;
        if (expr === 'blink') arcEye(g, x, ey, false);
        else if (expr === 'cheer') arcEye(g, x, ey, true);
        else if (expr === 'ouch') chevron(g, x, ey, s);
        else if (expr === 'effort') oval(g, x, ey + 3, 17 * big, 19 * big);
        else if (expr === 'wow') oval(g, x, ey, 21 * big, 27 * big);
        else if (expr === 'focus') oval(g, x, ey, 17 * big, 25 * big, 5, -4);
        else oval(g, x, ey, 17 * big, 26 * big);
      });
      if (style === 'ghost') return;
      if (expr === 'effort') brows(g, 1);
      else if (expr === 'ouch') brows(g, -1, 2);
      else if (expr === 'focus') brows(g, -0.6, 6, 1);
      else if (style === 'ninja') brows(g, 0.8);
      if (style === 'grandma') {
        g.strokeStyle = '#a0784a'; g.lineWidth = 5;
        [-1, 1].forEach(s => { g.beginPath(); g.arc(cx + s * ex, ey, 27, 0, TAU); g.stroke(); });
        g.beginPath(); g.moveTo(cx - ex + 27, ey); g.quadraticCurveTo(cx, ey - 10, cx + ex - 27, ey); g.stroke();
      }
    });

    // ---- mouth ----
    if (style !== 'ninja' && style !== 'skull') {
      const my = ey + 44;
      all(mouthCtx, g => {
        g.lineWidth = 8;
        if (expr === 'cheer') {
          g.beginPath(); g.moveTo(cx - 30, my - 6); g.quadraticCurveTo(cx, my + 44, cx + 30, my - 6); g.closePath(); g.fill();
          if (style !== 'robot') {
            g.fillStyle = '#ff7b8f';
            g.beginPath(); g.ellipse(cx, my + 14, 14, 7, 0, 0, TAU); g.fill();
          }
        } else if (expr === 'wow') {
          g.beginPath(); g.ellipse(cx, my + 4, 10, 13, 0, 0, TAU); g.fill();
        } else if (expr === 'ouch') {
          g.beginPath(); g.moveTo(cx - 24, my + 6);
          for (let i = 1; i <= 4; i++) g.lineTo(cx - 24 + i * 12, my + (i % 2 ? -2 : 6));
          g.stroke();
        } else if (expr === 'effort') {
          g.beginPath(); g.moveTo(cx - 20, my); g.quadraticCurveTo(cx, my + 16, cx + 20, my); g.closePath(); g.fill();
          if (style !== 'robot') { g.fillStyle = '#ffffff'; g.fillRect(cx - 14, my, 28, 4); }
        } else if (expr === 'focus') {
          g.beginPath(); g.moveTo(cx - 14, my + 4); g.lineTo(cx + 12, my); g.stroke();
        } else {
          const w = style === 'alien' ? 12 : 22;
          g.beginPath(); g.moveTo(cx - w, my - 2); g.quadraticCurveTo(cx, my + 18, cx + w, my - 2); g.stroke();
        }
      });
    } else if (style === 'skull') {
      M.fillStyle = '#2a2230';
      for (let i = -2; i <= 2; i++) M.fillRect(cx + i * 13 - 4, ey + 50, 8, 14);
      M.fillRect(cx - 32, ey + 48, 64, 4);
    }
    const out = { map: tex(cvMap), glow: cvGlow ? tex(cvGlow) : null };
    faceCache[key] = out;
    return out;
  }
  function faceMaterial(style, expr) {
    const f = faceTex(style, expr);
    const mat = new THREE.MeshStandardMaterial({
      map: f.map, transparent: true, roughness: 0.6, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    if (f.glow) { mat.emissiveMap = f.glow; mat.emissive.setScalar(1); mat.emissiveIntensity = style === 'ender' ? 1.5 : 2.2; }
    mat.userData.style = style;
    return mat;
  }
  function setExpr(mat, expr) {
    if (mat.userData.expr === expr) return;
    mat.userData.expr = expr;
    const f = faceTex(mat.userData.style, expr);
    mat.map = f.map;
    if (f.glow) mat.emissiveMap = f.glow;
  }

  // ===================== looks (one per shop skin) =====================
  // shirt/pants/shoes/skin/hair colours + a dress() that adds headgear,
  // accessories and emblems. aura = the particle kind that trails fancy skins.
  const SKIN_TONE = 0xf6cfa2;
  const LOOKS = {
    default: { shirt: 0x3aa6a0, pants: 0x2f4a78, shoes: 0xf4f1ea, sole: 0xff8a3d, hair: 0x5b3a24, hairStyle: 'messy', hat: 'cap', hatColor: 0xff8a3d, face: 'kid', emblem: 'stripe' },
    diamond_knight: { shirt: 0xcfe8ff, pants: 0x4c6fa5, shoes: 0x2e4a7a, hair: 0x3a2a1c, hairStyle: 'none', hat: 'knight', face: 'kid', emblem: 'diamond', glow: 0x7fe8ff, aura: 'sparkle', auraColor: 0x9ff0ff, back: 'sword', pauldrons: 0x9fd8ff },
    fire_mage: { shirt: 0xd8452a, pants: 0x7a1f18, shoes: 0x3a1410, hair: 0xff9a3a, hairStyle: 'back', hat: 'wizard', hatColor: 0xb8321e, face: 'kid', emblem: 'flame', glow: 0xffa040, aura: 'ember', auraColor: 0xff8a2a, robe: true },
    ocean_explorer: { shirt: 0x2e7bc4, pants: 0xe6cf94, shoes: 0x1f9aa0, hair: 0x2a1a10, hairStyle: 'messy', hat: 'snorkel', face: 'kid', emblem: 'wave', aura: 'bubble', auraColor: 0xbff4ff, back: 'tank', vest: 0xff9b3d },
    shadow_ninja: { shirt: 0x2a2a3c, pants: 0x22222e, shoes: 0x16161e, skin: 0xe8bf92, hair: 0x15151c, hairStyle: 'none', hat: 'ninja', face: 'ninja', emblem: 'sash', aura: 'smoke', auraColor: 0x6a4a9a, back: 'katana' },
    rainbow_unicorn: { shirt: 0xffa6e4, pants: 0xb9a4ff, shoes: 0xffffff, hair: 0xffffff, hairStyle: 'mane', hat: 'unicorn', face: 'kid', emblem: 'rainbow', glow: 0xffe27a, aura: 'rainbow', auraColor: 0xffffff },
    space_astronaut: { shirt: 0xeef2f8, pants: 0xdfe5ee, shoes: 0x6a7488, hair: 0x7a4a2a, hairStyle: 'messy', hat: 'astro', face: 'kid', emblem: 'patch', glow: 0x7fd8ff, aura: 'star', auraColor: 0xbfe6ff, back: 'pack', accent: 0xff7a2a },
    pixel_robot: { shirt: 0xa8b4c6, pants: 0x6c788c, shoes: 0x3e4658, skin: 0xb8c4d4, hair: 0, hairStyle: 'none', hat: 'robot', head: 'box', face: 'robot', emblem: 'panel', glow: 0x6ff6ff, aura: 'pixel', auraColor: 0x6ff6ff },
    dragon_master: { shirt: 0x47a862, pants: 0x2f6a3e, shoes: 0x7a4a22, hair: 0x2a1a10, hairStyle: 'messy', hat: 'dragon', face: 'kid', emblem: 'scales', glow: 0xffc24a, aura: 'ember', auraColor: 0xffd060, wings: 0x5ccf7a, tail: 0x47a862 },
    blocky_miner: { shirt: 0x8a5a32, pants: 0x2f4f8a, shoes: 0x4a3020, hair: 0x3a2414, hairStyle: 'messy', hat: 'miner', face: 'kid', emblem: 'overalls', glow: 0xfff2a0, back: 'pickaxe' },
    ender_wizard: { shirt: 0x3a2266, pants: 0x22143e, shoes: 0x140c24, skin: 0x7a6a9c, hair: 0x1a1030, hairStyle: 'none', hat: 'hood', hatColor: 0x2a1650, face: 'ender', emblem: 'eye', glow: 0xd07aff, aura: 'smoke', auraColor: 0xc06aff, orbs: 0xb45cff, robe: true },
    star_savior: { shirt: 0xfff2c2, pants: 0x3a5ad8, shoes: 0xffd34a, hair: 0xffd34a, hairStyle: 'messy', hat: 'halo', face: 'kid', emblem: 'star', glow: 0xffe066, aura: 'star', auraColor: 0xffe680, cape: 0x3a5ad8 },
    golden_champion: { shirt: 0xf5c518, pants: 0xc8961a, shoes: 0x8a5a10, hair: 0x5b3a24, hairStyle: 'messy', hat: 'crown', face: 'kid', emblem: 'medal', glow: 0xffe27a, aura: 'gold', auraColor: 0xffd34a, cape: 0xd82a3a, pauldrons: 0xffd34a },
  };
  const RAINBOW = [0xff5a6e, 0xffa53a, 0xffe14a, 0x5ce07a, 0x4ab8ff, 0xa77bff];

  // The rig: root → squash (scale from the feet) → spin (flip pivot at the waist)
  // → body → hips (bob) → { legL, legR, chest → { neck(head), armL, armR, cape, wings } }
  function newRig() {
    const r = {};
    r.root = new THREE.Group();
    r.squash = new THREE.Group(); r.root.add(r.squash);
    r.spin = new THREE.Group(); r.spin.position.y = 1.05; r.squash.add(r.spin);
    r.body = new THREE.Group(); r.body.position.y = -1.05; r.spin.add(r.body);
    r.hips = new THREE.Group(); r.hips.position.y = 0.74; r.body.add(r.hips);
    r.chest = new THREE.Group(); r.hips.add(r.chest);
    r.neck = new THREE.Group(); r.neck.position.y = 0.76; r.chest.add(r.neck);
    r.armL = new THREE.Group(); r.armL.position.set(0.55, 0.64, 0); r.chest.add(r.armL);
    r.armR = new THREE.Group(); r.armR.position.set(-0.55, 0.64, 0); r.chest.add(r.armR);
    r.legL = new THREE.Group(); r.legL.position.set(0.2, 0, 0); r.hips.add(r.legL);
    r.legR = new THREE.Group(); r.legR.position.set(-0.2, 0, 0); r.hips.add(r.legR);
    r.cape = null;
    r.flappers = [];
    r.orbiters = [];
    r.spinners = [];
    return r;
  }
  function kits() {
    const k = {};
    ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'cape', 'gTorso', 'gHead', 'gArmL', 'gArmR', 'glass', 'wingL', 'wingR'].forEach(n => { k[n] = new Kit(); });
    return k;
  }
  const HEAD_R = 0.37, HEAD_H = 0.66, HEAD_Y = 0.37;

  function dressBase(K, L) {
    const skin = L.skin || SKIN_TONE;
    // torso + belt
    K.torso.add(rbox(0.8, 0.74, 0.44, 0.15), L.shirt, 0, 0.37, 0);
    K.torso.add(rbox(0.82, 0.12, 0.46, 0.05), L.pants, 0, 0.05, 0);
    K.torso.add(cyl(0.15, 0.17, 0.12, 12), skin, 0, 0.76, 0); // neck
    if (L.robe) K.torso.add(rbox(0.84, 0.44, 0.48, 0.14), L.pants, 0, -0.16, 0);
    // arms: sleeve + skin forearm/hand
    [['armL', 1], ['armR', -1]].forEach(([n]) => {
      K[n].add(rbox(0.3, 0.44, 0.33, 0.13), L.shirt, 0, -0.17, 0);
      K[n].add(rbox(0.27, 0.32, 0.3, 0.12), skin, 0, -0.5, 0);
    });
    // legs: trouser + chunky shoe
    ['legL', 'legR'].forEach(n => {
      K[n].add(rbox(0.36, 0.6, 0.38, 0.13), L.pants, 0, -0.3, 0);
      K[n].add(rbox(0.38, 0.2, 0.48, 0.09), L.shoes, 0, -0.64, 0.05);
      if (L.sole) K[n].add(rbox(0.39, 0.06, 0.49, 0.03), L.sole, 0, -0.725, 0.05);
    });
    // head
    if (L.head === 'box') K.head.add(rbox(0.74, 0.64, 0.68, 0.14), skin, 0, HEAD_Y, 0);
    else K.head.add(headGeo(HEAD_R, HEAD_H), skin, 0, HEAD_Y, 0);
    // hair
    const hc = L.hair;
    const hatted = L.hat && L.hat !== 'halo' && L.hat !== 'unicorn' && L.hat !== 'astro' && L.hat !== 'dragon' && L.hat !== 'snorkel' && L.hat !== 'crown';
    if (L.hairStyle === 'messy' || L.hairStyle === 'mane' || L.hairStyle === 'back') {
      if (!hatted) K.head.add(capGeo('h', HEAD_R + 0.035, HEAD_H + 0.06, 0.16), hc, 0, HEAD_Y, 0);
      // back of the head: a shell hugging the skull from ear to ear
      K.head.add(capGeo('hb', HEAD_R + 0.03, HEAD_H + 0.05, -0.2, Math.PI * 0.58, Math.PI * 0.84), hc, 0, HEAD_Y, 0);
      if (hatted) {
        // side tufts peeking out under the hat
        [-1, 1].forEach(s => K.head.add(sph(0.1, 10, 8), hc, s * 0.33, HEAD_Y + 0.12, 0.08, 0, 0, 0, 0.7, 1.2, 1));
      } else if (L.hairStyle === 'messy') {
        [[-0.2, 0.3, 0.12], [0.02, 0.33, 0.16], [0.22, 0.29, 0.12]].forEach(([x, y, z], i) =>
          K.head.add(sph(0.12 + (i === 1 ? 0.02 : 0), 10, 8), hc, x, HEAD_Y + y, z + 0.14, 0, 0, 0, 1.2, 0.85, 1));
      }
    }
    if (L.hairStyle === 'mane') {
      RAINBOW.forEach((c, i) => K.head.add(sph(0.11, 10, 8), c, 0, HEAD_Y + 0.36 - i * 0.1, -0.28 - Math.sin(i * 0.5) * 0.08, 0, 0, 0, 1.3, 1, 1));
    }
    // emblem on the shirt front
    const ez = 0.235, ey = 0.42;
    const G = L.glow || 0xffffff;
    switch (L.emblem) {
      case 'stripe': K.torso.add(rbox(0.82, 0.1, 0.46, 0.04), 0xffffff, 0, 0.52, 0); break;
      case 'diamond': K.gTorso.add(octa(0.14), G, 0, ey, ez, 0, 0, 0, 1, 1.3, 0.35); break;
      case 'flame': K.gTorso.add(lathe('flame', v2([[0.0001, 0], [0.09, 0.05], [0.11, 0.12], [0.06, 0.22], [0.0001, 0.3]]), 10), G, 0, ey - 0.15, ez, 0, 0, 0, 1, 1, 0.4); break;
      case 'wave': K.torso.add(rbox(0.82, 0.46, 0.46, 0.14), L.vest, 0, 0.42, 0, 0, 0, 0, 1, 1, 1.02);
        K.torso.add(rbox(0.14, 0.42, 0.06, 0.03), 0xffffff, 0, 0.42, 0.24); break;
      case 'sash': K.torso.add(rbox(0.16, 0.95, 0.47, 0.05), 0x8a2a3a, 0, 0.38, 0, 0, 0, 0.75); break;
      case 'rainbow': [0xff5a6e, 0xffe14a, 0x4ab8ff].forEach((c, i) => K.torso.add(torus(0.17 - i * 0.045, 0.022, 6, 14, Math.PI), c, 0, ey - 0.06, ez)); break;
      case 'patch': K.torso.add(rbox(0.22, 0.22, 0.04, 0.05), L.accent, 0.18, ey + 0.08, ez - 0.01);
        K.gTorso.add(rbox(0.3, 0.08, 0.03, 0.02), G, -0.14, ey - 0.05, ez - 0.005); break;
      case 'panel': K.torso.add(rbox(0.46, 0.34, 0.05, 0.06), 0x262e3e, 0, ey, ez - 0.01);
        [-0.12, 0, 0.12].forEach((x, i) => K.gTorso.add(rbox(0.07, 0.07, 0.03, 0.02), [0x6ff6ff, 0x9dff6f, 0xff6f9d][i], x, ey + 0.06, ez + 0.012));
        K.gTorso.add(rbox(0.3, 0.04, 0.03, 0.015), 0x6ff6ff, 0, ey - 0.07, ez + 0.012); break;
      case 'scales': for (let i = 0; i < 3; i++) K.torso.add(rbox(0.5 - i * 0.1, 0.1, 0.05, 0.04), 0xd8e86a, 0, ey + 0.1 - i * 0.13, ez - 0.01); break;
      case 'overalls': K.torso.add(rbox(0.6, 0.38, 0.47, 0.1), L.pants, 0, 0.22, 0);
        [-0.22, 0.22].forEach(x => K.torso.add(rbox(0.1, 0.42, 0.47, 0.04), L.pants, x, 0.5, 0));
        [-0.22, 0.22].forEach(x => K.torso.add(sph(0.04, 8, 6), 0xffd34a, x, 0.4, 0.245)); break;
      case 'eye': K.torso.add(sph(0.12, 12, 8), 0x1a0f2a, 0, ey, ez - 0.03, 0, 0, 0, 1, 1, 0.4);
        K.gTorso.add(sph(0.07, 10, 8), G, 0, ey, ez + 0.01, 0, 0, 0, 1.2, 0.6, 0.4); break;
      case 'star': K.gTorso.add(starGeo(0.15, 0.03), G, 0, ey, ez + 0.01); break;
      case 'medal': K.torso.add(rbox(0.08, 0.26, 0.04, 0.02), 0xd82a3a, 0, ey + 0.08, ez);
        K.gTorso.add(cyl(0.1, 0.1, 0.04, 16), G, 0, ey - 0.08, ez + 0.02, Math.PI / 2); break;
    }
  }

  function dressHeadgear(K, L) {
    const y = HEAD_Y, G = L.glow || 0xffffff, hc = L.hatColor;
    switch (L.hat) {
      case 'cap': {
        K.head.add(capGeo('cap', HEAD_R + 0.05, HEAD_H + 0.08, 0.13), hc, 0, y, 0);
        K.head.add(cyl(0.3, 0.32, 0.05, 16, false, -Math.PI / 2, Math.PI), hc, 0, y + 0.17, 0.25, -0.12);
        K.head.add(sph(0.05, 8, 6), 0xffffff, 0, y + 0.42, 0);
        K.head.add(rbox(0.2, 0.11, 0.04, 0.03), 0xffffff, 0, y + 0.27, 0.39, -0.3);
        break;
      }
      case 'knight': {
        // open-face helmet + crystal crest + pauldrons
        K.head.add(capGeo('kn', HEAD_R + 0.07, HEAD_H + 0.14, -0.2, 0.75, TAU - 1.5), 0xd6e6f6, 0, y, 0);
        K.head.add(capGeo('kn2', HEAD_R + 0.075, HEAD_H + 0.15, 0.14), 0xd6e6f6, 0, y, 0);
        K.head.add(rbox(0.1, 0.36, 0.12, 0.04), 0xb8cce4, 0, y + 0.2, 0.39, 0.15);
        [0, 1, 2].forEach(i => K.gHead.add(octa(0.11 - i * 0.02), G, 0, y + 0.47 + i * 0.03, -0.06 - i * 0.14, 0.4, 0, 0, 0.8, 1.6, 0.8));
        break;
      }
      case 'wizard': {
        const pts = v2([[0.42, 0], [0.34, 0.12], [0.24, 0.34], [0.14, 0.58], [0.06, 0.78], [0.0001, 0.9]]);
        const g = new THREE.LatheGeometry(pts, 18);
        const pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const py = pa.getY(i);
          if (py > 0.4) pa.setZ(i, pa.getZ(i) - (py - 0.4) * (py - 0.4) * 1.1);
        }
        g.computeVertexNormals();
        K.head.add(g, hc, 0, y + 0.22, 0);
        K.head.add(cyl(0.62, 0.62, 0.06, 22), hc, 0, y + 0.24, 0);
        K.head.add(cyl(0.425, 0.425, 0.1, 18), 0xffc24a, 0, y + 0.31, 0);
        K.gHead.add(starGeo(0.08, 0.03), G, 0, y + 0.95, -0.28, -0.6);
        g.dispose();
        break;
      }
      case 'snorkel': {
        K.head.add(torus(HEAD_R + 0.02, 0.035, 6, 22), 0x1f9aa0, 0, y + 0.18, 0, Math.PI / 2 + 0.1);
        K.head.add(rbox(0.5, 0.18, 0.12, 0.07), 0x1f9aa0, 0, y + 0.22, 0.34, -0.15);
        K.glass.add(rbox(0.42, 0.13, 0.06, 0.05), 0xbff4ff, 0, y + 0.22, 0.41, -0.15);
        K.head.add(cyl(0.035, 0.035, 0.5, 8), 0xff9b3d, 0.36, y + 0.32, 0.05, 0.1, 0, -0.15);
        break;
      }
      case 'ninja': {
        K.head.add(capGeo('nj', HEAD_R + 0.04, HEAD_H + 0.1, 0.13), L.shirt, 0, y, 0);
        K.head.add(cyl(HEAD_R + 0.04, HEAD_R + 0.04, 0.3, 22, true), L.shirt, 0, y - 0.15, 0);
        K.head.add(torus(HEAD_R + 0.05, 0.045, 6, 24), 0xd8343e, 0, y + 0.13, 0, Math.PI / 2);
        K.head.add(rbox(0.08, 0.32, 0.05, 0.025), 0xd8343e, 0.08, y + 0.02, -0.42, 0.2, 0, 0.3);
        K.head.add(rbox(0.08, 0.28, 0.05, 0.025), 0xd8343e, -0.06, y + 0.03, -0.42, 0.2, 0, -0.2);
        break;
      }
      case 'unicorn': {
        const horn = v2([[0.09, 0], [0.075, 0.08], [0.08, 0.1], [0.06, 0.18], [0.065, 0.2], [0.04, 0.28], [0.045, 0.3], [0.0001, 0.42]]);
        K.gHead.add(lathe('horn', horn, 10), G, 0, y + 0.3, 0.12, 0.35);
        [-1, 1].forEach(s => K.head.add(lathe('ear', v2([[0.08, 0], [0.07, 0.08], [0.0001, 0.2]]), 8), 0xffffff, s * 0.25, y + 0.32, -0.02, 0, 0, -s * 0.35));
        break;
      }
      case 'astro': {
        K.glass.add(sph(0.56, 22, 16), 0xcfefff, 0, y + 0.02, 0.02);
        K.torso.add(torus(0.36, 0.08, 8, 22), 0xeef2f8, 0, 0.76, 0, Math.PI / 2);
        K.head.add(cyl(0.025, 0.025, 0.36, 6), 0xb8c0cc, 0.3, y + 0.5, -0.12, 0, 0, -0.2);
        K.gHead.add(sph(0.05, 8, 6), 0xff5a5a, 0.34, y + 0.68, -0.12);
        break;
      }
      case 'robot': {
        K.head.add(rbox(0.6, 0.42, 0.05, 0.08), 0x1a2030, 0, y + 0.0, 0.335);
        [-1, 1].forEach(s => K.head.add(cyl(0.1, 0.1, 0.08, 12), 0x6c788c, s * 0.39, y, 0, 0, 0, Math.PI / 2));
        K.head.add(cyl(0.025, 0.025, 0.28, 6), 0x6c788c, 0, y + 0.44, 0);
        K.gHead.add(sph(0.07, 10, 8), G, 0, y + 0.6, 0);
        break;
      }
      case 'dragon': {
        [-1, 1].forEach(s => {
          for (let i = 0; i < 4; i++) {
            const t = i / 3;
            K.head.add(sph(0.09 - i * 0.017, 8, 6), 0xf3e6c4, s * (0.2 + t * 0.12), y + 0.34 + t * 0.2, -0.04 - t * t * 0.22);
          }
        });
        [0, 1, 2].forEach(i => K.head.add(lathe('spk', v2([[0.06, 0], [0.04, 0.06], [0.0001, 0.13]]), 8), 0x2f7a46, 0, y + 0.3 - i * 0.18, -0.38, -1.2 - i * 0.2));
        break;
      }
      case 'miner': {
        K.head.add(capGeo('mn', HEAD_R + 0.07, HEAD_H + 0.12, 0.12), 0xffcf3a, 0, y, 0);
        K.head.add(cyl(0.5, 0.5, 0.05, 20), 0xffcf3a, 0, y + 0.15, 0);
        K.head.add(rbox(0.07, 0.24, 0.62, 0.03), 0xf0b820, 0, y + 0.43, 0);
        K.head.add(cyl(0.09, 0.1, 0.1, 12), 0x5a5a5a, 0, y + 0.27, 0.4, Math.PI / 2 - 0.25);
        K.gHead.add(cyl(0.07, 0.07, 0.03, 12), G, 0, y + 0.27, 0.45, Math.PI / 2 - 0.25);
        break;
      }
      case 'hood': {
        K.head.add(capGeo('hd', HEAD_R + 0.07, HEAD_H + 0.16, -0.26, 0.8, TAU - 1.6), hc, 0, y, -0.01);
        K.head.add(capGeo('hd2', HEAD_R + 0.075, HEAD_H + 0.17, 0.15), hc, 0, y, -0.01);
        K.head.add(lathe('hdt', v2([[0.2, 0], [0.12, 0.14], [0.0001, 0.28]]), 10), hc, 0, y + 0.3, -0.24, -1.1);
        break;
      }
      case 'halo': {
        // a floating star + halo ring, animated on its own (spinners)
        break;
      }
      case 'crown': {
        K.head.add(cyl(HEAD_R - 0.02, HEAD_R - 0.04, 0.16, 20, true), 0xffd34a, 0, y + 0.39, 0);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          K.head.add(lathe('cr', v2([[0.07, 0], [0.05, 0.08], [0.0001, 0.17]]), 8), 0xffd34a, Math.sin(a) * 0.32, y + 0.47, Math.cos(a) * 0.32);
          K.gHead.add(sph(0.04, 8, 6), [0xff3a5a, 0x3ad0ff, 0x6aff7a][i % 3], Math.sin(a) * 0.34, y + 0.4, Math.cos(a) * 0.34);
        }
        break;
      }
    }
    if (L.pauldrons) {
      [['armL', 1], ['armR', -1]].forEach(([n, s]) => {
        K[n].add(sph(0.22, 14, 10), L.pauldrons, 0.03 * s, 0.02, 0, 0, 0, 0, 1.05, 0.7, 1.05);
        K[n].add(torus(0.17, 0.035, 6, 16), L.hat === 'crown' ? 0xd82a3a : 0x7fb8e8, 0.03 * s, -0.04, 0, Math.PI / 2);
      });
    }
    // back items (on the torso kit, behind the shoulders)
    switch (L.back) {
      case 'sword':
        K.torso.add(rbox(0.08, 0.3, 0.08, 0.03), 0x6a4a2a, 0.28, 0.98, -0.3, 0, 0, 0.6);
        K.torso.add(rbox(0.32, 0.07, 0.1, 0.03), 0xb8cce4, 0.2, 0.84, -0.3, 0, 0, 0.6);
        K.gTorso.add(rbox(0.13, 0.8, 0.04, 0.05), L.glow, -0.04, 0.5, -0.3, 0, 0, 0.6);
        break;
      case 'katana':
        K.torso.add(rbox(0.07, 0.95, 0.07, 0.03), 0x2a1a20, 0, 0.5, -0.28, 0, 0, -0.7);
        K.torso.add(rbox(0.2, 0.05, 0.1, 0.02), 0xd8b84a, 0.2, 0.75, -0.28, 0, 0, -0.7);
        K.torso.add(rbox(0.07, 0.24, 0.08, 0.03), 0xd8343e, 0.3, 0.86, -0.28, 0, 0, -0.7);
        break;
      case 'tank':
        [-0.13, 0.13].forEach(x => K.torso.add(lathe('tank', roundedProfile(0.13, 0.62, 0.12), 14), 0xffcf3a, x, 0.42, -0.36));
        K.torso.add(rbox(0.5, 0.08, 0.1, 0.03), 0x5a6a7a, 0, 0.5, -0.33);
        break;
      case 'pack':
        K.torso.add(rbox(0.66, 0.62, 0.26, 0.1), 0xdfe5ee, 0, 0.42, -0.33);
        K.torso.add(rbox(0.5, 0.12, 0.05, 0.03), L.accent, 0, 0.55, -0.47);
        K.gTorso.add(rbox(0.06, 0.06, 0.03, 0.015), 0x6aff8a, -0.18, 0.32, -0.47);
        K.gTorso.add(rbox(0.06, 0.06, 0.03, 0.015), 0xff6a6a, -0.06, 0.32, -0.47);
        break;
      case 'pickaxe':
        K.torso.add(rbox(0.07, 1.0, 0.07, 0.03), 0x7a4a22, 0, 0.45, -0.3, 0, 0, 0.75);
        K.torso.add(lathe('pick', v2([[0.06, -0.38], [0.08, -0.15], [0.09, 0], [0.08, 0.15], [0.06, 0.38]]), 8), 0x9aa7b8, 0.3, 0.83, -0.3, 0, 0, 0.75 + Math.PI / 2, 1, 1, 0.8);
        K.gTorso.add(octa(0.06), 0x7fe8ff, 0.3, 0.83, -0.24);
        break;
    }
    if (L.tail) {
      for (let i = 0; i < 5; i++) K.torso.add(sph(0.14 - i * 0.022, 10, 8), L.tail, 0, 0.02 - i * 0.06, -0.3 - i * 0.14);
      K.torso.add(lathe('spk', v2([[0.06, 0], [0.04, 0.06], [0.0001, 0.13]]), 8), 0xd8e86a, 0, 0.02 - 5 * 0.06, -0.3 - 5 * 0.14, -1.7);
    }
    if (L.cape) {
      const cp = v2([[-0.36, 0], [0.36, 0], [0.46, -1.05], [0.15, -1.12], [0, -1.08], [-0.15, -1.12], [-0.46, -1.05]]);
      K.cape.add(shapeGeo('cape', cp.map(p => [p.x, p.y]), 0.03), L.cape, 0, 0, 0);
      K.torso.add(rbox(0.76, 0.08, 0.12, 0.04), L.shirt === 0xf5c518 ? 0xffd34a : 0xffe066, 0, 0.72, -0.2);
    }
    if (L.wings) {
      const wp = [[0, 0], [0.35, 0.28], [0.62, 0.2], [0.55, 0.0], [0.6, -0.18], [0.36, -0.12], [0.2, -0.28]];
      K.wingL.add(shapeGeo('dwing', wp, 0.03), L.wings, 0, 0, 0);
      K.wingR.add(shapeGeo('dwing', wp, 0.03), L.wings, 0, 0, 0, 0, Math.PI, 0);
    }
  }

  function faceGeo(boxHead) {
    if (boxHead) { const k = 'fplane'; return GC[k] || (GC[k] = new THREE.PlaneGeometry(0.58, 0.36)); }
    return cyl(HEAD_R + 0.006, HEAD_R + 0.006, 0.42, 14, true, -0.95, 1.9);
  }

  // Assemble a full character rig from a look. opts: { npc, mats? }
  function buildRig(L, opts = {}) {
    const r = newRig();
    const K = kits();
    dressBase(K, L);
    dressHeadgear(K, L);
    if (opts.extra) opts.extra(K, L);
    const S = shared();
    r.mats = opts.npc
      ? { body: S.npcBody, glow: S.glow }
      : { body: bodyMat(0.5), glow: glowMat(1.8) };
    const put = (kit, parent, mat, shadow = true) => { const m = kit.mesh(mat, shadow); if (m) parent.add(m); return m; };
    put(K.torso, r.chest, r.mats.body);
    put(K.gTorso, r.chest, r.mats.glow, false);
    put(K.head, r.neck, r.mats.body);
    put(K.gHead, r.neck, r.mats.glow, false);
    put(K.armL, r.armL, r.mats.body); put(K.gArmL, r.armL, r.mats.glow, false);
    put(K.armR, r.armR, r.mats.body); put(K.gArmR, r.armR, r.mats.glow, false);
    put(K.legL, r.legL, r.mats.body);
    put(K.legR, r.legR, r.mats.body);
    if (K.glass.list.length) {
      const gm = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false });
      const gl = put(K.glass, r.neck, gm, false);
      if (gl) gl.renderOrder = 2;
    }
    if (K.cape.list.length) {
      r.cape = new THREE.Group();
      r.cape.position.set(0, 0.72, -0.25);
      r.chest.add(r.cape);
      put(K.cape, r.cape, r.mats.body);
    }
    if (K.wingL.list.length) {
      [['wingL', 1], ['wingR', -1]].forEach(([n, s]) => {
        const p = new THREE.Group();
        p.position.set(s * 0.12, 0.55, -0.26);
        r.chest.add(p);
        put(K[n], p, r.mats.body);
        r.flappers.push({ g: p, s });
      });
    }
    // face decal
    r.faceMat = faceMaterial(L.face || 'kid', 'happy');
    const face = new THREE.Mesh(faceGeo(L.head === 'box'), r.faceMat);
    face.position.set(0, HEAD_Y - 0.02, L.head === 'box' ? 0.365 : 0);
    face.renderOrder = 1;
    r.neck.add(face);
    r.face = face;
    // floating extras
    if (L.hat === 'halo') {
      const h = new THREE.Group();
      h.position.set(0, HEAD_Y + 0.5, 0);
      const k = new Kit();
      k.add(torus(0.3, 0.045, 8, 26), L.glow, 0, 0, 0, Math.PI / 2);
      k.add(starGeo(0.13, 0.04), L.glow, 0, 0.2, 0);
      h.add(k.mesh(r.mats.glow, false));
      r.neck.add(h);
      r.spinners.push({ g: h, rate: 1.4, bob: 0.05, y: h.position.y });
    }
    if (L.orbs) {
      for (let i = 0; i < 2; i++) {
        const k = new Kit();
        k.add(sph(0.11, 12, 10), 0x1a3a3a, 0, 0, 0);
        k.add(sph(0.07, 10, 8), L.orbs, 0, 0, 0.07);
        const o = new THREE.Group();
        o.add(k.mesh(i ? r.mats.glow : r.mats.body, false));
        const k2 = new Kit(); k2.add(sph(0.06, 8, 6), L.orbs, 0, 0, 0);
        o.add(k2.mesh(r.mats.glow, false));
        r.root.add(o);
        r.orbiters.push({ g: o, ph: i * Math.PI, r: 0.85, y: 1.25 });
      }
    }
    if (opts.npc) {
      r.root.traverse(o => { if (o.isMesh) o.castShadow = !low(); });
    }
    r.look = L;
    return r;
  }
  function disposeRig(r) {
    if (!r) return;
    r.root.traverse(o => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material && o.material !== r.mats.body && o.material !== r.mats.glow && o.material !== r.faceMat) o.material.dispose();
      }
    });
    if (r.root.parent) r.root.parent.remove(r.root);
    r.mats.body.dispose(); r.mats.glow.dispose(); r.faceMat.dispose();
  }

  // ===================== the hero =====================
  const P = {
    group: null, rig: null, badge: null, parts: null, look: null,
    w: new Float32Array(12), tw: new Float32Array(12),
    pose: new Float32Array(16), tmp: new Float32Array(16),
    phase: 0, sprintF: 0, airT: 0, gT: 0, glideT: 0, flipT: -1, flipDir: 1,
    sq: 1, sv: 0, hurtT: 0, flash: 0, cheerT: 0, waveT: 0, landT: 0, dashT: 0,
    blinkT: 2, blinkOn: 0, wowT: 0, yawPrev: 0, yawVel: 0, t: 0,
    lastX: 0, lastZ: 0, dustAcc: 0, auraAcc: 0, trailAcc: 0, prevGrounded: true, padT: 0,
  };
  // pose ids and joint ids
  const IDLE = 0, RUN = 1, UP = 2, DOWN = 3, GLIDE = 4, RIDE = 5, QUIZ = 6, CHEER = 7, HURT = 8, DASH = 9, WAVE = 10, LAND = 11;
  const NPOSE = 12;
  const LLX = 0, LRX = 1, ALX = 2, ARX = 3, ALZ = 4, ARZ = 5, CX = 6, CY = 7, CZ = 8, HX = 9, HY = 10, HZ = 11, BOB = 12, LLZ = 13, LRZ = 14, CAPE = 15;
  const NJ = 16;
  const poseBuf = [];
  for (let i = 0; i < NPOSE; i++) poseBuf.push(new Float32Array(NJ));

  function buildPlayer(group) {
    P.group = group;
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    badge.scale.set(2.2, 0.55, 1);
    badge.position.y = 3.0;
    badge.renderOrder = 3;
    group.add(badge);
    P.badge = badge;
    P.parts = { badge };
    P.w[IDLE] = 1;
    dressPlayer('default', null);
    ensureFx();
    return P.parts;
  }

  function lookFor(skinId, tint) {
    const base = LOOKS[skinId] || LOOKS.default;
    const L = Object.assign({}, base);
    // the SKY_SKIN_TINTS body tint drives the shirt of the default look (and of
    // any future skin we don't know yet), so every shop skin still reads as itself
    if (!LOOKS[skinId] && tint != null) L.shirt = tint;
    return L;
  }

  function dressPlayer(skinId, tint) {
    if (P.rig) disposeRig(P.rig);
    P.look = lookFor(skinId, tint);
    P.rig = buildRig(P.look);
    P.group.add(P.rig.root);
    const r = P.rig;
    // keep the legacy playerParts shape for any code that pokes at it
    Object.assign(P.parts, {
      head: r.neck, body: r.chest, armL: r.armL, armR: r.armR, legL: r.legL, legR: r.legR,
      bodyMat: r.mats.body, limbMat: r.mats.body, rig: r,
    });
  }

  function badgeTexture(text) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    g.font = 'bold 50px "Noto Sans TC", sans-serif';
    const tw = Math.min(400, g.measureText(text).width);
    const w = tw + 96, x = (512 - w) / 2, y = 22, h = 84;
    const rr = (px, py, pw, ph, rad) => { g.beginPath(); if (g.roundRect) g.roundRect(px, py, pw, ph, rad); else g.rect(px, py, pw, ph); };
    // drop shadow
    g.fillStyle = 'rgba(10,20,40,0.35)'; rr(x + 3, y + 6, w, h, 42); g.fill();
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#3b2a8a'); grad.addColorStop(1, '#1d1550');
    g.fillStyle = grad; rr(x, y, w, h, 42); g.fill();
    g.lineWidth = 6; g.strokeStyle = '#ffd166'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.14)'; rr(x + 8, y + 6, w - 16, h * 0.4, 30); g.fill();
    // star
    const sx = x + 40, sy = y + h / 2;
    g.fillStyle = '#ffd166';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 9 : 21;
      g.lineTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
    g.fillStyle = '#fff4cc';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(text, x + 70, sy + 2, 400);
    return tex(cv);
  }

  function refreshLook(skinId, tint, titleText) {
    if (!P.group) return;
    if (!P.rig || P.skinId !== skinId) { dressPlayer(skinId, tint); P.skinId = skinId; }
    if (P.badgeText !== titleText) {
      if (P.badge.material.map) P.badge.material.map.dispose();
      P.badge.material.map = badgeTexture(titleText);
      P.badge.material.needsUpdate = true;
      P.badgeText = titleText;
    }
  }

  // ---- pose library: each fills a joint array from time/phase ----
  function fillPoses(t, ph, sF) {
    const p = poseBuf;
    for (let i = 0; i < NPOSE; i++) p[i].fill(0);
    let a;
    // idle — breathing, weight shift, glancing around
    a = p[IDLE];
    const br = Math.sin(t * 2.1);
    a[ALZ] = 0.1 + br * 0.025; a[ARZ] = -0.1 - br * 0.025;
    a[ALX] = Math.sin(t * 1.3) * 0.05; a[ARX] = -Math.sin(t * 1.3) * 0.05;
    a[CZ] = Math.sin(t * 0.7) * 0.03; a[CY] = Math.sin(t * 0.45) * 0.06;
    a[HY] = Math.sin(t * 0.37) * 0.3 + Math.sin(t * 0.91) * 0.12; a[HX] = Math.sin(t * 0.53) * 0.06;
    a[BOB] = br * 0.012; a[LLZ] = 0.04; a[LRZ] = -0.04; a[CAPE] = 0.06 + br * 0.03;
    // run / sprint
    a = p[RUN];
    const s = Math.sin(ph), c = Math.cos(ph);
    const amp = lerp(0.72, 1.05, sF);
    a[LLX] = -s * amp; a[LRX] = s * amp;
    a[ALX] = s * amp * 0.9; a[ARX] = -s * amp * 0.9;
    a[ALZ] = 0.1 + sF * 0.1; a[ARZ] = -0.1 - sF * 0.1;
    a[CX] = lerp(0.14, 0.34, sF); a[CY] = s * 0.13; a[HX] = -a[CX] * 0.55; a[HY] = -s * 0.08;
    a[BOB] = Math.abs(c) * lerp(0.07, 0.12, sF) - 0.02;
    a[CAPE] = lerp(0.6, 1.05, sF) + Math.sin(ph * 2) * 0.08;
    // airborne, rising: classic arms-up
    a = p[UP];
    a[LLX] = -0.85; a[LRX] = 0.35; a[ALX] = -3.0; a[ARX] = -3.1; a[ALZ] = 0.4; a[ARZ] = -0.4;
    a[CX] = -0.06; a[HX] = -0.18; a[CAPE] = 0.3;
    // falling: arms out, flail
    a = p[DOWN];
    a[LLX] = -0.3 + Math.sin(t * 13) * 0.12; a[LRX] = 0.25 - Math.sin(t * 13) * 0.12;
    a[ALX] = -0.7; a[ARX] = -0.5; a[ALZ] = 1.15 + Math.sin(t * 15) * 0.15; a[ARZ] = -1.2 - Math.cos(t * 15) * 0.15;
    a[CX] = 0.06; a[HX] = 0.22; a[LLZ] = 0.12; a[LRZ] = -0.12; a[CAPE] = 1.4;
    // glide: superman-ish T
    a = p[GLIDE];
    a[LLX] = 0.4; a[LRX] = 0.5; a[ALX] = -0.15; a[ARX] = -0.15; a[ALZ] = 1.5; a[ARZ] = -1.5;
    a[CX] = 0.5; a[CZ] = Math.sin(t * 1.4) * 0.14; a[HX] = -0.45; a[CAPE] = 1.3;
    // riding the cloud: surf stance
    a = p[RIDE];
    a[LLX] = -0.25; a[LRX] = 0.3; a[LLZ] = 0.2; a[LRZ] = -0.2;
    a[ALX] = -0.35; a[ARX] = 0.45; a[ALZ] = 0.95 + Math.sin(t * 2.3) * 0.08; a[ARZ] = -0.75;
    a[CX] = 0.16; a[CY] = 0.38; a[CZ] = Math.sin(t * 1.9) * 0.08; a[HY] = -0.32; a[BOB] = Math.sin(t * 3) * 0.03; a[CAPE] = 0.9;
    // quiz: thinking, hand on chin
    a = p[QUIZ];
    a[ALX] = -0.15; a[ALZ] = 0.14; a[ARX] = -2.05; a[ARZ] = 0.55;
    a[CX] = 0.04; a[CZ] = 0.04; a[HX] = 0.12 + Math.sin(t * 0.8) * 0.04; a[HY] = 0.14 + Math.sin(t * 0.6) * 0.07; a[HZ] = 0.14;
    a[BOB] = Math.sin(t * 2) * 0.01; a[CAPE] = 0.08;
    // cheer: arms pumping + hops
    a = p[CHEER];
    const hop = Math.abs(Math.sin(t * 7.5));
    a[ALX] = -3.0 + Math.sin(t * 15) * 0.2; a[ARX] = -3.0 - Math.sin(t * 15) * 0.2; a[ALZ] = 0.55; a[ARZ] = -0.55;
    a[LLX] = -hop * 0.3; a[LRX] = hop * 0.1; a[CX] = -0.1; a[HX] = -0.22; a[BOB] = hop * 0.24; a[CAPE] = 0.4 + hop * 0.4;
    // hurt recoil
    a = p[HURT];
    a[CX] = -0.38; a[HX] = -0.3; a[ALX] = -1.1; a[ARX] = -1.2; a[ALZ] = 0.75; a[ARZ] = -0.75; a[LLX] = 0.3; a[LRX] = -0.2; a[CAPE] = 0.8;
    // dash: torpedo
    a = p[DASH];
    a[CX] = 0.78; a[HX] = -0.62; a[ALX] = 1.25; a[ARX] = 1.25; a[ALZ] = 0.32; a[ARZ] = -0.32; a[LLX] = 0.55; a[LRX] = -0.55; a[CAPE] = 1.5;
    // wave hello (adventure start)
    a = p[WAVE];
    a[ALZ] = 0.1; a[ARX] = -0.2; a[ARZ] = -2.7 + Math.sin(t * 11) * 0.35; a[HY] = 0.15; a[HZ] = -0.08; a[CZ] = 0.05; a[CAPE] = 0.1;
    // landing crouch
    a = p[LAND];
    a[CX] = 0.4; a[HX] = -0.25; a[ALX] = 0.3; a[ARX] = 0.3; a[ALZ] = 0.55; a[ARZ] = -0.55; a[LLZ] = 0.16; a[LRZ] = -0.16; a[CAPE] = 0.5;
  }

  function animatePlayer(dt, info) {
    if (!P.rig || !C) return;
    const M = P.force || C.motion, pos = C.pos, r = P.rig;
    const yaw = info.yaw, quiz = P.force ? !!P.force.quiz : !!info.quiz;
    P.t += dt;
    const t = P.t;
    P.group.position.set(pos.x, pos.y, pos.z);
    P.group.rotation.y = yaw;
    // turning speed (for banking)
    let dy = yaw - P.yawPrev;
    while (dy > Math.PI) dy -= TAU;
    while (dy < -Math.PI) dy += TAU;
    P.yawPrev = yaw;
    P.yawVel = lerp(P.yawVel, dy / Math.max(dt, 1e-3), damp(dt, 8));

    const grounded = M.grounded;
    if (grounded) { P.airT = 0; P.gT += dt; } else { P.airT += dt; P.gT = 0; }
    const air = !grounded && P.airT > 0.08;
    const moving = M.moving && !quiz;
    P.sprintF = lerp(P.sprintF, M.sprint ? 1 : 0, damp(dt, 6));
    if (moving && grounded) P.phase += dt * (M.speed * 2.0 + 6);
    const gliding = !!M.gliding || (air && M.vy > -3.45 && M.vy < -2.95 && !M.riding);
    P.glideT = gliding ? P.glideT + dt : 0;
    P.hurtT = Math.max(0, P.hurtT - dt);
    P.cheerT = Math.max(0, P.cheerT - dt);
    P.waveT = Math.max(0, P.waveT - dt);
    P.landT = Math.max(0, P.landT - dt * 3.2);
    P.dashT = Math.max(0, P.dashT - dt);
    P.wowT = Math.max(0, P.wowT - dt);
    P.padT = Math.max(0, P.padT - dt);

    // ---- pick target weights ----
    const tw = P.tw;
    tw.fill(0);
    if (M.riding === 'cloud') tw[RIDE] = 1;
    else if (M.dashing || P.dashT > 0) tw[DASH] = 1;
    else if (P.hurtT > 0) tw[HURT] = 1;
    else if (air) {
      if (P.glideT > 0.12) tw[GLIDE] = 1;
      else {
        const up = clamp((M.vy + 2) / 8, 0, 1);
        tw[UP] = up; tw[DOWN] = 1 - up;
      }
    } else if (P.cheerT > 0 && !moving) tw[CHEER] = 1;
    else if (P.waveT > 0 && !moving) tw[WAVE] = 1;
    else if (moving) tw[RUN] = 1;
    else if (quiz) tw[QUIZ] = 1;
    else tw[IDLE] = 1;
    if (grounded && P.landT > 0) tw[LAND] = P.landT;

    fillPoses(t, P.phase, P.sprintF);
    // blend weights (fast in, a bit slower out — nothing pops)
    let sum = 0;
    for (let i = 0; i < NPOSE; i++) {
      const rate = (i === HURT || i === DASH || i === LAND) ? 22 : (i === UP || i === DOWN) ? 10 : 9;
      P.w[i] = lerp(P.w[i], tw[i], damp(dt, rate));
      sum += P.w[i];
    }
    const out = P.pose;
    out.fill(0);
    for (let i = 0; i < NPOSE; i++) {
      const wi = P.w[i] / (sum || 1);
      if (wi < 0.0005) continue;
      const src = poseBuf[i];
      for (let j = 0; j < NJ; j++) out[j] += src[j] * wi;
    }
    // banking into turns while moving
    if (moving) out[CZ] += clamp(-P.yawVel * 0.045, -0.22, 0.22);

    r.legL.rotation.set(out[LLX], 0, out[LLZ]);
    r.legR.rotation.set(out[LRX], 0, out[LRZ]);
    r.armL.rotation.set(out[ALX], 0, out[ALZ]);
    r.armR.rotation.set(out[ARX], 0, out[ARZ]);
    r.chest.rotation.set(out[CX], out[CY], out[CZ]);
    r.neck.rotation.set(out[HX], out[HY], out[HZ]);
    r.hips.position.y = 0.74 + out[BOB];
    if (r.cape) r.cape.rotation.x = -(out[CAPE] * 0.85) - Math.sin(t * 9 + P.phase * 0.5) * 0.04 * (1 + out[CAPE]);
    for (let i = 0; i < r.flappers.length; i++) {
      const f = r.flappers[i];
      const fl = air ? 0.6 + Math.sin(t * 16) * 0.5 : 0.25 + Math.sin(t * 2.5) * 0.1;
      f.g.rotation.y = f.s * (0.5 - fl);
    }
    for (let i = 0; i < r.spinners.length; i++) {
      const s = r.spinners[i];
      s.g.rotation.y += dt * s.rate;
      s.g.position.y = s.y + Math.sin(t * 2.4) * s.bob;
    }
    for (let i = 0; i < r.orbiters.length; i++) {
      const o = r.orbiters[i];
      const a = t * 2.1 + o.ph;
      o.g.position.set(Math.cos(a) * o.r, o.y + Math.sin(t * 3 + o.ph) * 0.15, Math.sin(a) * o.r);
    }

    // ---- squash & stretch spring (rest point stretches with vertical speed) ----
    const rest = air ? 1 + clamp(Math.abs(M.vy) * 0.006, 0, 0.08) : 1;
    spring(P, 'sq', 'sv', rest, 340, 20, dt, 0.62, 1.38);
    const xz = 1 / Math.sqrt(P.sq);
    r.squash.scale.set(xz, P.sq, xz);

    // ---- air-jump flip ----
    if (P.flipT >= 0) {
      P.flipT += dt / 0.48;
      if (P.flipT >= 1 || grounded) { P.flipT = -1; r.spin.rotation.x = 0; }
      else r.spin.rotation.x = easeIO(P.flipT) * TAU * P.flipDir;
    }

    // ---- face ----
    P.blinkT -= dt;
    if (P.blinkT <= 0) { P.blinkOn = 0.12; P.blinkT = 2 + hash(t) * 3; }
    P.blinkOn = Math.max(0, P.blinkOn - dt);
    let ex = 'happy';
    if (P.hurtT > 0) ex = 'ouch';
    else if (P.cheerT > 0) ex = 'cheer';
    else if (P.wowT > 0 || (air && M.vy < -14)) ex = 'wow';
    else if (M.dashing || P.dashT > 0 || (air && M.vy > 2) || (moving && P.sprintF > 0.6)) ex = 'effort';
    else if (quiz) ex = 'focus';
    if (P.blinkOn > 0 && (ex === 'happy' || ex === 'focus')) ex = 'blink';
    setExpr(r.faceMat, ex);

    // ---- hurt flash (emissive pulse on the hero's own material) ----
    P.flash = Math.max(0, P.flash - dt * 2.6);
    const f = P.flash > 0 ? P.flash * (0.6 + 0.4 * Math.sin(t * 40)) : 0;
    r.mats.body.emissive.setRGB(f * 0.9, f * 0.15, f * 0.15);

    // ---- movement FX emission ----
    emitMoveFx(dt, moving, grounded, air);
    P.prevGrounded = grounded;
  }

  // ===================== FX pools (InstancedMesh, zero per-frame allocation) =====================
  const FX = { ready: false };
  const _o = new THREE.Object3D();
  function makePool(geo, mat, n) {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const pool = {
      mesh, n, next: 0,
      x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
      vx: new Float32Array(n), vy: new Float32Array(n), vz: new Float32Array(n),
      life: new Float32Array(n), max: new Float32Array(n), size: new Float32Array(n),
      grav: new Float32Array(n), drag: new Float32Array(n), rot: new Float32Array(n), spin: new Float32Array(n),
      grow: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), sz: new Float32Array(n),
      alive: 0,
    };
    _o.scale.setScalar(0); _o.updateMatrix();
    for (let i = 0; i < n; i++) { mesh.setMatrixAt(i, _o.matrix); mesh.setColorAt(i, _c.setRGB(1, 1, 1)); }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return pool;
  }
  function spawn(pool, x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 0, grow = 0) {
    const i = pool.next;
    pool.next = (i + 1) % pool.n;
    pool.x[i] = x; pool.y[i] = y; pool.z[i] = z;
    pool.vx[i] = vx; pool.vy[i] = vy; pool.vz[i] = vz;
    pool.life[i] = life; pool.max[i] = life; pool.size[i] = size;
    pool.grav[i] = grav; pool.drag[i] = drag; pool.grow[i] = grow;
    pool.rot[i] = Math.random() * TAU; pool.spin[i] = (Math.random() - 0.5) * 10;
    pool.sx[i] = 1; pool.sy[i] = 1; pool.sz[i] = 1;
    pool.mesh.setColorAt(i, _c.setHex(color));
    pool.mesh.instanceColor.needsUpdate = true;
    pool.alive = 1;
    return i;
  }
  function stepPool(pool, dt, shape) {
    if (!pool.alive) return;
    let any = 0;
    const m = pool.mesh;
    for (let i = 0; i < pool.n; i++) {
      if (pool.life[i] <= 0) continue;
      pool.life[i] -= dt;
      const k = pool.life[i] / pool.max[i];
      if (pool.life[i] <= 0) {
        _o.scale.setScalar(0); _o.position.set(0, -9999, 0); _o.updateMatrix();
        m.setMatrixAt(i, _o.matrix);
        any = 1;
        continue;
      }
      any = 1;
      const dr = 1 - pool.drag[i] * dt;
      pool.vx[i] *= dr; pool.vz[i] *= dr; pool.vy[i] = pool.vy[i] * dr + pool.grav[i] * dt;
      pool.x[i] += pool.vx[i] * dt; pool.y[i] += pool.vy[i] * dt; pool.z[i] += pool.vz[i] * dt;
      pool.rot[i] += pool.spin[i] * dt;
      _o.position.set(pool.x[i], pool.y[i], pool.z[i]);
      let s = pool.size[i];
      if (shape === 'puff') s *= (1 + pool.grow[i] * (1 - k)) * Math.min(1, k * 2.2) ;
      else if (shape === 'spark') s *= Math.min(1, k * 3) * (0.7 + 0.3 * Math.sin(pool.rot[i] * 3));
      else s *= Math.min(1, k * 3);
      if (shape === 'line') {
        _o.rotation.set(0, Math.atan2(pool.vx[i], pool.vz[i]), 0);
        _o.scale.set(s * 0.06, s * 0.06, s * pool.sz[i]);
      } else {
        _o.rotation.set(pool.rot[i], pool.rot[i] * 0.7, 0);
        _o.scale.set(s * pool.sx[i], s * pool.sy[i], s * pool.sz[i]);
      }
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    pool.alive = any;
  }

  function ensureFx() {
    if (FX.ready || !C || !C.scene) return;
    const scene = C.scene;
    const lp = low();
    FX.puff = makePool(ico(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x2a2a2a, transparent: true, opacity: 0.72, depthWrite: false, flatShading: true }), lp ? 32 : 80);
    FX.spark = makePool(octa(1), (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); m.color.setScalar(2.2); return m; })(), lp ? 48 : 140);
    FX.confetti = makePool(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6 }), lp ? 40 : 110);
    FX.line = makePool(new THREE.BoxGeometry(1, 1, 1), (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }); m.color.setScalar(1.6); return m; })(), 28);
    scene.add(FX.puff.mesh, FX.spark.mesh, FX.confetti.mesh, FX.line.mesh);
    // expanding rings (air jump / pad / boss hits)
    FX.rings = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(torus(1, 0.06, 6, 32), mat);
      ring.visible = false;
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      FX.rings.push({ mesh: ring, t: -1, dur: 0.5, size: 2 });
    }
    // soft blob shadows: the hero has its own; mobs share an instanced pool
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const st = new THREE.CanvasTexture(cv);
    const smat = new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, color: 0x101830, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true });
    const sgeo = new THREE.PlaneGeometry(1, 1);
    sgeo.rotateX(-Math.PI / 2);
    FX.shadow = new THREE.Mesh(sgeo, smat.clone());
    FX.shadow.renderOrder = 1;
    scene.add(FX.shadow);
    FX.mobShadow = new THREE.InstancedMesh(sgeo, smat, 40);
    FX.mobShadow.frustumCulled = false;
    FX.mobShadow.renderOrder = 1;
    FX.mobShadow.count = 0;
    scene.add(FX.mobShadow);
    FX.ready = true;
  }

  function ring(x, y, z, color, size = 2.2, dur = 0.45, flat = true) {
    if (!FX.ready) return;
    let best = FX.rings[0];
    for (const r of FX.rings) { if (r.t < 0) { best = r; break; } if (r.t > best.t) best = r; }
    best.t = 0; best.dur = dur; best.size = size;
    best.mesh.position.set(x, y, z);
    best.mesh.rotation.set(flat ? Math.PI / 2 : 0, 0, 0);
    best.mesh.material.color.setHex(color);
    best.mesh.material.color.multiplyScalar(1.8);
    best.mesh.visible = true;
  }
  function stepRings(dt) {
    for (const r of FX.rings) {
      if (r.t < 0) continue;
      r.t += dt / r.dur;
      if (r.t >= 1) { r.t = -1; r.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - r.t, 3);
      r.mesh.scale.setScalar(0.2 + e * r.size);
      r.mesh.material.opacity = (1 - r.t) * 0.9;
    }
  }

  function burst(kind, x, y, z, n, color, spread = 1) {
    if (!FX.ready) return;
    if (low()) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, u = Math.random();
      if (kind === 'puff') {
        const sp = (1.5 + u * 2.5) * spread;
        spawn(FX.puff, x + Math.cos(a) * 0.2, y + 0.1, z + Math.sin(a) * 0.2, Math.cos(a) * sp, 0.6 + u * 1.4, Math.sin(a) * sp,
          0.45 + u * 0.35, (0.18 + u * 0.16) * spread, color, 0.5, 4, 1.4);
      } else if (kind === 'spark') {
        const sp = (2 + u * 4) * spread;
        const el = (Math.random() - 0.3) * 1.6;
        spawn(FX.spark, x, y, z, Math.cos(a) * sp, el * sp * 0.8 + 1.5, Math.sin(a) * sp, 0.5 + u * 0.4, 0.07 + u * 0.06, color, -6, 2.5);
      } else if (kind === 'confetti') {
        const sp = 2 + u * 4;
        const i2 = spawn(FX.confetti, x, y, z, Math.cos(a) * sp, 5 + u * 5, Math.sin(a) * sp, 1.6 + u * 1.2, 0.16 + u * 0.06,
          RAINBOW[(Math.random() * RAINBOW.length) | 0], -9, 1.8);
        FX.confetti.spin[i2] = (Math.random() - 0.5) * 18;
      } else if (kind === 'ember') {
        spawn(FX.spark, x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, 1.2 + u, (Math.random() - 0.5) * 0.4, 0.7 + u * 0.5, 0.05 + u * 0.04, color, 0.5, 1);
      }
    }
  }

  function emitMoveFx(dt, moving, grounded, air) {
    if (!FX.ready) return;
    const M = C.motion, pos = C.pos;
    const lp = low();
    // dust while running (more when sprinting)
    if (moving && grounded) {
      P.dustAcc += dt * (M.sprint ? 14 : 6);
      while (P.dustAcc >= 1) {
        P.dustAcc -= 1;
        const yaw = P.group.rotation.y;
        const bx = pos.x - Math.sin(yaw) * 0.3 + (Math.random() - 0.5) * 0.4;
        const bz = pos.z - Math.cos(yaw) * 0.3 + (Math.random() - 0.5) * 0.4;
        spawn(FX.puff, bx, pos.y + 0.08, bz, -Math.sin(yaw) * 0.8, 0.6 + Math.random() * 0.6, -Math.cos(yaw) * 0.8, 0.45, 0.12 + Math.random() * 0.08, 0xf2ead8, 0.4, 3, 1.6);
      }
    } else P.dustAcc = 0;
    // speed lines while sprinting / dashing
    if ((M.sprint && moving) || M.dashing || P.dashT > 0) {
      P.trailAcc += dt * (M.dashing || P.dashT > 0 ? 40 : 12);
      while (P.trailAcc >= 1) {
        P.trailAcc -= 1;
        const yaw = P.group.rotation.y;
        const side = (Math.random() - 0.5) * 1.6, up = 0.3 + Math.random() * 1.6;
        const i = spawn(FX.line, pos.x - Math.sin(yaw) * 0.6 + Math.cos(yaw) * side, pos.y + up, pos.z - Math.cos(yaw) * 0.6 - Math.sin(yaw) * side,
          -Math.sin(yaw) * 6, 0, -Math.cos(yaw) * 6, 0.22, 1, 0xffffff, 0, 0);
        FX.line.sz[i] = 1.2 + Math.random() * 1.4;
      }
    } else P.trailAcc = 0;
    // riding the cloud: puffs stream off it
    if (M.riding === 'cloud') {
      P.auraAcc += dt * 10;
    }
    // fancy-skin aura
    const L = P.look;
    const rate = M.riding === 'cloud' ? 10 : (L && L.aura ? (lp ? 3 : 8) : 0);
    if (rate) {
      P.auraAcc += dt * rate;
      while (P.auraAcc >= 1) {
        P.auraAcc -= 1;
        if (M.riding === 'cloud') {
          spawn(FX.puff, pos.x + (Math.random() - 0.5) * 1.2, pos.y - 0.25, pos.z + (Math.random() - 0.5) * 1.2, 0, -0.6, 0, 0.6, 0.25, 0xffffff, 0, 2, 0.8);
          continue;
        }
        const a = Math.random() * TAU, rr = 0.4 + Math.random() * 0.5;
        const x = pos.x + Math.cos(a) * rr, z = pos.z + Math.sin(a) * rr, y = pos.y + 0.2 + Math.random() * 1.9;
        let col = L.auraColor;
        if (L.aura === 'rainbow') col = RAINBOW[(Math.random() * RAINBOW.length) | 0];
        if (L.aura === 'ember') spawn(FX.spark, x, pos.y + 0.2 + Math.random() * 0.6, z, 0, 1.4 + Math.random(), 0, 0.9, 0.05 + Math.random() * 0.03, col, 0.6, 0.5);
        else if (L.aura === 'bubble') spawn(FX.puff, x, y - 0.5, z, 0, 0.9, 0, 1.0, 0.06 + Math.random() * 0.05, col, 0.3, 0.5, 0.3);
        else if (L.aura === 'smoke') spawn(FX.puff, x, pos.y + 0.1 + Math.random() * 0.3, z, 0, 0.7, 0, 0.8, 0.05 + Math.random() * 0.04, col, 0.3, 1, 0.8);
        else spawn(FX.spark, x, y, z, 0, 0.35, 0, 0.8 + Math.random() * 0.4, 0.045 + Math.random() * 0.035, col, 0, 0.5);
      }
    }
  }

  // ===================== fx events from gameplay =====================
  function onFx(name, data) {
    if (!P.rig || !C) return;
    const pos = C.pos;
    switch (name) {
      case 'jump':
        P.sv += 4.2;
        burst('puff', pos.x, pos.y, pos.z, 6, 0xf2ead8, 0.8);
        break;
      case 'airjump':
        P.sv += 3.2;
        P.flipT = 0; P.flipDir = 1; P.wowT = 0.3;
        ring(pos.x, pos.y + 0.1, pos.z, 0xbfefff, 2.4, 0.42);
        burst('spark', pos.x, pos.y + 0.2, pos.z, 10, 0xd8f6ff, 0.8);
        break;
      case 'land': {
        const v = data.v || 0;
        const k = clamp((v - 4) / 22, 0, 1);
        P.sv -= 2.5 + k * 6.5;
        P.landT = 0.25 + k * 0.75;
        burst('puff', pos.x, pos.y, pos.z, 4 + Math.round(k * 10), 0xf2ead8, 0.7 + k * 0.8);
        if (k > 0.45) ring(pos.x, pos.y + 0.06, pos.z, 0xffffff, 1.6 + k * 1.6, 0.35);
        CAM.trauma = Math.min(1, CAM.trauma + k * 0.55);
        break;
      }
      case 'pad':
        P.sv += 6;
        P.padT = 0.6; P.wowT = 0.5;
        ring(pos.x, pos.y + 0.12, pos.z, 0xffe27a, 2.6, 0.5);
        burst('spark', pos.x, pos.y + 0.3, pos.z, 18, 0xfff0a0, 1.1);
        break;
      case 'hurt':
        P.hurtT = 0.6; P.flash = 1;
        CAM.trauma = Math.min(1, CAM.trauma + 0.6);
        burst('spark', pos.x, pos.y + 1.2, pos.z, 8, 0xff6a6a, 0.7);
        break;
      case 'respawn':
        P.flash = 0; P.hurtT = 0.35;
        CAM.snap = true;
        burst('spark', pos.x, pos.y + 0.6, pos.z, 16, 0xbfefff, 0.9);
        break;
      case 'arrive':
        P.waveT = 1.2;
        break;
      case 'dash':
        P.dashT = 0.32;
        CAM.fovKick = Math.max(CAM.fovKick, 1);
        ring(pos.x, pos.y + 1, pos.z, 0xbfefff, 1.8, 0.3, false);
        break;
      case 'start':
        P.waveT = 2.2;
        CAM.reveal = 0;
        CAM.snap = true;
        break;
      case 'teleport':
        CAM.snap = true;
        burst('spark', pos.x, pos.y + 1, pos.z, 20, 0xd8b8ff, 1);
        break;
    }
  }

  function celebrate(n) {
    if (!C || !P.rig) return;
    const pos = C.pos;
    P.cheerT = Math.max(P.cheerT, n >= 60 ? 3 : 2.2);
    burst('confetti', pos.x, pos.y + 2.2, pos.z, Math.min(70, Math.round(n * 1.2)), 0xffffff);
    burst('spark', pos.x, pos.y + 1.5, pos.z, 14, 0xffe680, 1.2);
    ring(pos.x, pos.y + 0.1, pos.z, 0xffe27a, 3, 0.6);
  }

  // ===================== camera =====================
  const CAM = {
    fx: 0, fy: 0, fz: 0, init: false, curR: 9, trauma: 0, fov: 55, fovKick: 0,
    reveal: -1, snap: true, frame: 0, hitR: 99, lift: 0, liftT: 0,
    ray: null, dir: new THREE.Vector3(), org: new THREE.Vector3(), look: new THREE.Vector3(),
    hits: [], solids: new Map(), list: [],
  };
  const BASE_FOV = 55;
  // Only TERRAIN blocks the camera (meshes flagged userData.camSolid — SkyArt marks each
  // island's cliff body and painted top). Props, foliage, quest objects, coins, arches and
  // NPCs never do: a camera that zooms into the hero's back or jerks top-down every time a
  // grass tuft or a tree crosses the line of sight felt far worse than briefly seeing
  // through a bush. Opt a big structure in with `obj.userData.camSolid = true`.
  function solidsOf(g) {
    let e = CAM.solids.get(g);
    if (e && e.n === g.children.length) return e.list;
    const list = [];
    g.traverse(o => {
      if (o.userData.camIgnore || !o.userData.camSolid || !o.isMesh) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      list.push(o);
    });
    e = { n: g.children.length, list };
    CAM.solids.set(g, e);
    return list;
  }
  function gatherSolids(x, y, z, reach) {
    const L = CAM.list;
    L.length = 0;
    if (typeof SKY_ISLANDS === 'undefined') return L;
    for (let i = 0; i < SKY_ISLANDS.length; i++) {
      const isle = SKY_ISLANDS[i];
      const g = C.islandGroups[isle.id];
      if (!g || !g.visible) continue;
      const dx = isle.pos[0] - x, dz = isle.pos[2] - z, dy = isle.pos[1] - y;
      const rr = isle.r + reach + 6;
      if (dx * dx + dz * dz > rr * rr || Math.abs(dy) > 40) continue;
      const s = solidsOf(g);
      for (let j = 0; j < s.length; j++) {
        // cheap pre-cull: object's bounding sphere must be near the camera segment
        L.push(s[j]);
      }
    }
    return L;
  }

  function castCam(list, theta, phi, radius) {
    if (!list.length) return 99;
    const cp = Math.cos(phi);
    CAM.org.set(CAM.fx, CAM.fy, CAM.fz);
    CAM.dir.set(Math.sin(theta) * cp, Math.sin(phi), Math.cos(theta) * cp);
    CAM.ray.set(CAM.org, CAM.dir);
    CAM.ray.near = 0.3;
    CAM.ray.far = radius + 0.6;
    CAM.hits.length = 0;
    CAM.ray.intersectObjects(list, false, CAM.hits);
    const d = CAM.hits.length ? CAM.hits[0].distance : 99;
    CAM.hitObj = CAM.hits.length ? CAM.hits[0].object : null;
    CAM.hits.length = 0;
    return d;
  }
  function setHeroFade(a) {
    if (!P.rig) return;
    const m = P.rig.mats.body;
    const want = a < 0.99;
    if (m.transparent !== want) {
      m.transparent = want;
      m.depthWrite = true;
      m.needsUpdate = true;
      P.rig.mats.glow.transparent = want;
      P.rig.mats.glow.needsUpdate = true;
    }
    m.opacity = a;
    P.rig.mats.glow.opacity = a;
    P.rig.faceMat.opacity = a;
  }

  function updateCamera(dt) {
    if (!C) return;
    const camera = C.camera, cam = C.cam, pos = C.pos, M = C.motion;
    if (!CAM.ray) CAM.ray = new THREE.Raycaster();
    const tx = pos.x, ty = pos.y + 1.55, tz = pos.z;
    // follow lag on the focus point (snap after teleports / respawns)
    if (!CAM.init || CAM.snap || Math.abs(tx - CAM.fx) + Math.abs(ty - CAM.fy) + Math.abs(tz - CAM.fz) > 10) {
      CAM.fx = tx; CAM.fy = ty; CAM.fz = tz; CAM.init = true; CAM.snap = false;
      CAM.curR = cam.radius;
    } else {
      const kh = damp(dt, 14), kv = damp(dt, M.grounded ? 10 : 5);
      CAM.fx += (tx - CAM.fx) * kh;
      CAM.fz += (tz - CAM.fz) * kh;
      CAM.fy += (ty - CAM.fy) * kv;
      // never let the lag drift far from the hero
      const ly = CAM.fy - ty;
      if (ly > 1.2) CAM.fy = ty + 1.2; else if (ly < -1.6) CAM.fy = ty - 1.6;
    }
    let theta = cam.theta, phi = cam.phi, radius = cam.radius;
    let revealing = false;
    if (CAM.reveal >= 0) {
      CAM.reveal += dt / 2.6;
      if (CAM.reveal >= 1) CAM.reveal = -1;
      else {
        revealing = true;
        const e = easeIO(CAM.reveal);
        theta = lerp(cam.theta + 2.4, cam.theta, e);
        phi = lerp(1.05, cam.phi, e);
        radius = lerp(cam.radius * 2.8 + 6, cam.radius, e);
      }
    }
    // ---- collision ----
    // 1) probe the orbit the player chose; if scenery blocks it, probe a higher
    //    orbit — rising over a tree reads much better than zooming into the face.
    // 2) the final orbit (with lift) gets its own ray: pull in fast, ease out slow.
    let allowed = radius;
    if (!revealing) {
      CAM.frame++;
      if (CAM.frame % 2 === 0 || CAM.hitR > 50) {
        const list = gatherSolids(CAM.fx, CAM.fy, CAM.fz, radius);
        const base = castCam(list, theta, phi, radius);
        let liftT = 0;
        if (base < radius * 0.8 && phi < 1.1) {
          const up = castCam(list, theta, Math.min(1.25, phi + 0.65), radius);
          if (up > base + 1) liftT = Math.min(1.25, phi + 0.65) - phi;
        }
        CAM.liftT = liftT;
        CAM.hitR = castCam(list, theta, phi + CAM.lift, radius);
      }
      CAM.lift = lerp(CAM.lift, CAM.liftT, damp(dt, CAM.liftT > CAM.lift ? 5 : 1.6));
      phi += CAM.lift;
      if (CAM.hitR < radius + 0.6) allowed = Math.max(1.1, CAM.hitR - 0.45);
    }
    const cp = Math.cos(phi);
    const dx = Math.sin(theta) * cp, dy = Math.sin(phi), dz = Math.cos(theta) * cp;
    if (allowed < CAM.curR) CAM.curR = lerp(CAM.curR, allowed, damp(dt, 30));
    else CAM.curR = lerp(CAM.curR, allowed, damp(dt, revealing ? 30 : 3.5));
    if (CAM.curR > allowed + 0.05 && !revealing && allowed < radius) CAM.curR = Math.min(CAM.curR, allowed + 0.4);
    // hero turns see-through when the camera is squeezed right up against them
    setHeroFade(clamp((CAM.curR - 1.2) / 1.1, 0.25, 1));
    const r = CAM.curR;
    let px = CAM.fx + dx * r, py = CAM.fy + dy * r, pz = CAM.fz + dz * r;
    // stay above whatever the camera hovers over (walkable tops)
    const gs = C.supportAt(px, pz, py + 1.5);
    if (gs.col && py < gs.y + 0.6) py = gs.y + 0.6;
    // ---- shake (trauma²) ----
    CAM.trauma = Math.max(0, CAM.trauma - dt * 1.8);
    const sh = CAM.trauma * CAM.trauma * 0.35;
    let ox = 0, oy = 0;
    if (sh > 0.0005) {
      const t = P.t * 38;
      ox = (Math.sin(t) + Math.sin(t * 1.7) * 0.5) * sh;
      oy = (Math.cos(t * 1.3) + Math.sin(t * 2.3) * 0.5) * sh;
    }
    camera.position.set(px + ox * Math.cos(theta), py + oy, pz - ox * Math.sin(theta));
    CAM.look.set(CAM.fx, CAM.fy - (revealing ? 0.3 : 0), CAM.fz);
    camera.lookAt(CAM.look);
    // ---- FOV kick (sprint / dash / cloud ride) ----
    CAM.fovKick = Math.max(0, CAM.fovKick - dt * 2.5);
    const targetFov = BASE_FOV + (M.sprint ? 7 : 0) + (M.dashing ? 9 : 0) + CAM.fovKick * 6 + (M.riding ? 4 : 0) + (P.padT > 0 ? 5 : 0);
    CAM.fov = lerp(CAM.fov, targetFov, damp(dt, M.dashing ? 12 : 5));
    if (Math.abs(camera.fov - CAM.fov) > 0.02) { camera.fov = CAM.fov; camera.updateProjectionMatrix(); }
  }

  // ===================== NPCs =====================
  const NPC_LOOKS = {
    '👵': { shirt: 0x9a6ac8, pants: 0x6a4a8a, shoes: 0x5a3a2a, hair: 0xe8e8ee, hairStyle: 'messy', face: 'grandma', emblem: 'stripe', robe: true, npc: 'grandma' },
    '🧚': { shirt: 0xff9ad8, pants: 0xffc8ec, shoes: 0xffffff, hair: 0xffe27a, hairStyle: 'messy', face: 'kid', npc: 'fairy', glow: 0xc8f8ff },
    '🧝': { shirt: 0x3e9a5a, pants: 0x6a4a2a, shoes: 0x4a3020, hair: 0xffe08a, hairStyle: 'messy', hat: 'hood', hatColor: 0x2f7a46, face: 'elf', npc: 'elf' },
    '👻': { npc: 'ghost', face: 'ghost' },
    '👽': { shirt: 0x9aa7c8, pants: 0x6a7498, shoes: 0x3a4058, skin: 0x8fe07a, hairStyle: 'none', face: 'alien', npc: 'alien', emblem: 'patch', accent: 0x6ff6ff, glow: 0x6ff6ff },
    '👾': { npc: 'invader' },
    '💀': { shirt: 0xe8e2d2, pants: 0xd8d2c0, shoes: 0x8a8478, skin: 0xf0eadc, hairStyle: 'none', face: 'skull', npc: 'skeleton' },
    '🧑‍🍳': { shirt: 0xffffff, pants: 0x3a3a48, shoes: 0x22222a, hair: 0x5b3a24, hairStyle: 'messy', face: 'chef', npc: 'chef' },
    '🌟': { npc: 'star', face: 'star' },
  };
  const npcs = [];
  let _fairyWing = null;
  function fairyWingMat() {
    return _fairyWing || (_fairyWing = new THREE.MeshStandardMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.7, emissive: 0x6ad8ff, emissiveIntensity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  }
  function npcExtras(kind) {
    return (K, L) => {
      const y = HEAD_Y;
      if (kind === 'grandma') {
        K.head.add(sph(0.17, 12, 10), L.hair, 0, y + 0.42, -0.14);
        K.armL.add(cyl(0.035, 0.035, 0.9, 8), 0x8a5a2a, 0, -0.75, 0.16);
        K.armL.add(torus(0.08, 0.035, 6, 10, Math.PI), 0x8a5a2a, 0, -0.3, 0.16, 0, Math.PI / 2);
        K.torso.add(rbox(0.6, 0.12, 0.47, 0.05), 0xffd0e0, 0, 0.66, 0);
      } else if (kind === 'fairy') {
        K.gHead.add(sph(0.05, 8, 6), L.glow, 0.12, y + 0.62, 0);
        K.head.add(cyl(0.012, 0.012, 0.28, 5), 0x5a3a2a, 0.08, y + 0.48, 0, 0, 0, -0.3);
      } else if (kind === 'elf') {
        [-1, 1].forEach(s => K.head.add(lathe('elfear', v2([[0.07, 0], [0.05, 0.1], [0.0001, 0.24]]), 8), L.skin || SKIN_TONE, s * 0.38, y + 0.05, -0.02, 0, 0, -s * 1.15));
      } else if (kind === 'skeleton') {
        for (let i = 0; i < 3; i++) K.torso.add(rbox(0.66, 0.06, 0.46, 0.03), 0x9a9486, 0, 0.55 - i * 0.14, 0);
        K.torso.add(rbox(0.08, 0.6, 0.47, 0.03), 0x9a9486, 0, 0.4, 0);
      } else if (kind === 'chef') {
        K.head.add(cyl(0.3, 0.27, 0.22, 16), 0xffffff, 0, y + 0.42, 0);
        [[-0.13, 0], [0.13, 0], [0, 0.12], [0, -0.12], [0, 0]].forEach(([x, z]) => K.head.add(sph(0.17, 10, 8), 0xffffff, x, y + 0.6, z));
        [-0.15, 0.15].forEach(x => K.torso.add(sph(0.04, 8, 6), 0x3a3a48, x, 0.5, 0.235));
        K.torso.add(rbox(0.5, 0.36, 0.46, 0.1), 0xe8e8f0, 0, 0.12, 0.02);
      } else if (kind === 'alien') {
        [-1, 1].forEach(s => {
          K.head.add(cyl(0.02, 0.02, 0.3, 6), 0x6ac05a, s * 0.12, y + 0.46, 0, 0, 0, -s * 0.3);
          K.gHead.add(sph(0.06, 8, 6), 0x9dff6f, s * 0.17, y + 0.62, 0);
        });
      }
    };
  }
  function buildCreatureNpc(kind) {
    const S = shared();
    const r = newRig();
    const k = new Kit(), kg = new Kit();
    let faceStyle = kind, faceY = 0.9, faceR = 0.5, boxFace = false, faceZ = 0;
    if (kind === 'ghost') {
      const pts = v2([[0.0001, 1.75], [0.3, 1.7], [0.5, 1.5], [0.58, 1.1], [0.6, 0.6], [0.66, 0.3], [0.5, 0.22], [0.0001, 0.2]]).reverse();
      k.add(new THREE.LatheGeometry(pts, 20), 0xf4f6ff, 0, 0, 0);
      [-1, 1].forEach(s => k.add(sph(0.14, 10, 8), 0xf4f6ff, s * 0.62, 0.9, 0.05, 0, 0, 0, 1, 0.8, 0.8));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; k.add(sph(0.16, 10, 8), 0xf4f6ff, Math.sin(a) * 0.48, 0.25, Math.cos(a) * 0.48); }
      faceY = 1.2; faceR = 0.585;
    } else if (kind === 'star') {
      k.add(starGeo(0.75, 0.32, 5, 0.52), 0xffd34a, 0, 1.15, 0);
      kg.add(starGeo(0.3, 0.1), 0xfff2a0, 0.55, 1.95, -0.1);
      boxFace = true; faceY = 1.12; faceZ = 0.37;
    } else if (kind === 'invader') {
      // a chunky rounded "pixel" critter
      const col = 0x9a5aff;
      k.add(rbox(1.1, 0.6, 0.6, 0.18), col, 0, 1.1, 0);
      k.add(rbox(0.7, 0.32, 0.56, 0.14), col, 0, 1.5, 0);
      [-1, 1].forEach(s => {
        k.add(rbox(0.18, 0.4, 0.4, 0.08), col, s * 0.62, 0.8, 0, 0, 0, s * 0.3);
        k.add(rbox(0.16, 0.36, 0.36, 0.07), col, s * 0.25, 0.62, 0);
        k.add(rbox(0.1, 0.3, 0.1, 0.05), col, s * 0.32, 1.78, 0, 0, 0, -s * 0.4);
      });
      faceStyle = 'robot'; boxFace = true; faceY = 1.12; faceZ = 0.31;
    }
    const body = k.mesh(S.npcBody);
    r.chest.add(body);
    if (kg.list.length) r.chest.add(kg.mesh(S.glow, false));
    r.hips.position.y = 0; r.neck.position.y = 0;
    r.faceMat = faceMaterial(faceStyle, 'happy');
    const geo = boxFace ? new THREE.PlaneGeometry(0.62, 0.39) : new THREE.CylinderGeometry(faceR + 0.01, faceR + 0.01, 0.48, 14, 1, true, -0.85, 1.7);
    const face = new THREE.Mesh(geo, r.faceMat);
    face.position.set(0, faceY, faceZ);
    face.renderOrder = 1;
    r.chest.add(face);
    r.face = face;
    r.mats = { body: S.npcBody, glow: S.glow };
    r.creature = kind;
    return r;
  }
  function makeNpc(emoji, tint) {
    DETAIL = 0;
    try { return makeNpcInner(emoji, tint); } finally { DETAIL = 1; }
  }
  function makeNpcInner(emoji, tint) {
    const base = NPC_LOOKS[emoji];
    let r;
    if (base && (base.npc === 'ghost' || base.npc === 'star' || base.npc === 'invader')) r = buildCreatureNpc(base.npc);
    else {
      const L = Object.assign({ shirt: tint || 0xc47ab8, pants: 0x4a4a68, shoes: 0x3a2a22, hair: 0x5b3a24, hairStyle: 'messy', face: 'kid', emblem: 'stripe' }, base || {});
      r = buildRig(L, { npc: true, extra: base ? npcExtras(base.npc) : null });
      if (base && base.npc === 'fairy') {
        r.root.scale.setScalar(0.72);
        const wp = [[0, 0], [0.3, 0.45], [0.55, 0.42], [0.5, 0.1], [0.3, -0.05], [0.42, -0.3], [0.2, -0.32]];
        const wgeo = shapeGeo('fwing', wp, 0.02);
        const wm = fairyWingMat();
        [1, -1].forEach(s => {
          const g = new THREE.Group();
          g.position.set(s * 0.1, 0.55, -0.24);
          const m = new THREE.Mesh(wgeo, wm);
          if (s < 0) m.rotation.y = Math.PI;
          g.add(m);
          r.chest.add(g);
          r.flappers.push({ g, s, fast: true });
        });
        r.float = 0.5;
      }
    }
    const g = new THREE.Group();
    g.add(r.root);
    r.kind = base ? base.npc : 'kid';
    if (r.creature === 'ghost' || r.creature === 'star') r.float = 0.25;
    r.ph = Math.random() * TAU;
    r.yaw = 0;
    r.blink = 1 + Math.random() * 3;
    g.userData.npcRig = r;
    npcs.push({ g, r });
    return g;
  }
  const _wp = new THREE.Vector3();
  function updateNpcs(dt) {
    if (!C) return;
    const pos = C.pos;
    const t = P.t;
    for (let i = 0; i < npcs.length; i++) {
      const { g, r } = npcs[i];
      if (!g.parent) continue;
      g.getWorldPosition(_wp);
      const dx = pos.x - _wp.x, dz = pos.z - _wp.z;
      const d2 = dx * dx + dz * dz;
      const show = d2 < 110 * 110;
      if (r.root.visible !== show) r.root.visible = show;
      if (d2 > 60 * 60) continue;
      const near = d2 < 8 * 8 && Math.abs(pos.y - _wp.y) < 4;
      // face the player when near (parent groups are unrotated islands)
      const want = near ? Math.atan2(dx, dz) : Math.sin(t * 0.3 + r.ph) * 0.6;
      let dd = want - r.yaw;
      while (dd > Math.PI) dd -= TAU;
      while (dd < -Math.PI) dd += TAU;
      r.yaw += dd * damp(dt, near ? 6 : 1.5);
      r.root.rotation.y = r.yaw;
      const ph = t + r.ph;
      const br = Math.sin(ph * 2);
      r.root.position.y = r.float ? r.float + Math.sin(ph * 2.2) * 0.15 : 0;
      r.hips.position.y = (r.creature ? 0 : 0.74) + br * 0.012;
      r.chest.rotation.z = Math.sin(ph * 0.7) * 0.04;
      if (r.creature) {
        r.chest.scale.set(1 + br * 0.03, 1 - br * 0.03, 1 + br * 0.03);
      } else {
        r.neck.rotation.set(Math.sin(ph * 0.5) * 0.06, near ? 0 : Math.sin(ph * 0.4) * 0.3, 0);
        r.armL.rotation.set(0, 0, 0.1 + br * 0.03);
        // wave at the player while near
        if (near) r.armR.rotation.set(-0.2, 0, -2.6 + Math.sin(ph * 10) * 0.35);
        else r.armR.rotation.set(Math.sin(ph * 1.1) * 0.05, 0, -0.1 - br * 0.03);
        r.armL.updateMatrix(); r.armR.updateMatrix(); r.neck.updateMatrix();
      }
      for (let k = 0; k < r.flappers.length; k++) {
        const f = r.flappers[k];
        f.g.rotation.y = f.s * (0.3 + Math.sin(ph * (f.fast ? 22 : 3)) * 0.35);
        f.g.updateMatrix();
      }
      r.blink -= dt;
      if (r.blink < 0) { setExpr(r.faceMat, 'blink'); if (r.blink < -0.12) { r.blink = 2 + Math.random() * 3; } }
      else setExpr(r.faceMat, near && r.kind !== 'skeleton' ? 'cheer' : 'happy');
      // quest visuals are built with matrixAutoUpdate off — refresh what we moved
      r.root.updateMatrix(); r.hips.updateMatrix(); r.chest.updateMatrix();
    }
  }

  // ===================== creatures (mobs) =====================
  const MOB_VARIANT = {
    starling: 'star', golem: 'crystal', magma_slime: 'magma', lurker: 'abyss', ember: 'flame',
    shade: 'cosmic', knight: 'knight', magma_bat: 'magma', storm_falcon: 'storm',
  };
  function shade(hex, k) {
    _c.setHex(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    _c.getHSL(hsl);
    _c.setHSL(hsl.h, Math.min(1, hsl.s * (k < 1 ? 1.05 : 0.9)), clamp(hsl.l * k, 0, 1));
    return _c.getHex();
  }
  // big cartoon eyes: whites + pupils (pupils on their own mesh so they can look around)
  function addEyes(k, kp, y, z, sep, size, opts = {}) {
    [-1, 1].forEach(s => {
      const x = s * sep;
      k.add(sph(size, 14, 10), opts.white || 0xffffff, x, y, z, 0, 0, 0, 1, 1.15, 0.75);
      kp.add(sph(size * 0.55, 12, 8), opts.pupil || 0x1a1424, x, y - size * 0.05, z + size * 0.55, 0, 0, 0, 1, 1.15, 0.6);
      kp.add(sph(size * 0.18, 8, 6), 0xffffff, x - size * 0.18, y + size * 0.22, z + size * 0.85);
      if (opts.brow !== false) k.add(rbox(size * 1.5, size * 0.38, size * 0.5, size * 0.15), opts.browColor || 0x1a1424, x, y + size * 1.15, z + size * 0.25, 0, 0, s * 0.45);
    });
  }
  function makeMob(def) {
    DETAIL = 0;
    try { return makeMobInner(def); } finally { DETAIL = 1; }
  }
  function makeMobInner(def) {
    const shape = def.shape || def.id;
    const variant = MOB_VARIANT[def.id] || '';
    const col = def.color;
    const dark = shade(col, 0.55);
    const g = new THREE.Group();
    const rig = new THREE.Group();
    g.add(rig);
    const k = new Kit(), kp = new Kit(), kg = new Kit();
    const wings = [];
    let rough = 0.45;
    let eyeGlow = false;
    if (shape === 'slime') {
      const pts = v2([[0.0001, 0], [0.62, 0.02], [0.8, 0.18], [0.82, 0.42], [0.7, 0.72], [0.48, 0.95], [0.22, 1.06], [0.0001, 1.08]]);
      k.add(lathe('slime', pts, 22), col, 0, 0, 0);
      k.add(sph(0.16, 10, 8), 0xffffff, -0.3, 0.86, 0.32, 0, 0, 0, 1.3, 0.7, 0.8); // glossy highlight
      k.add(sph(0.06, 8, 6), 0xffffff, -0.12, 0.98, 0.3);
      addEyes(k, kp, 0.58, 0.6, 0.26, 0.17);
      k.add(torus(0.1, 0.035, 6, 12, Math.PI), 0x3a1424, 0, 0.36, 0.74, 0, 0, Math.PI);
      [-1, 1].forEach(s => k.add(lathe('fang', v2([[0.035, 0], [0.0001, -0.07]]), 6), 0xffffff, s * 0.05, 0.35, 0.75));
      rough = 0.18;
      if (variant === 'star') kg.add(starGeo(0.24, 0.08), 0xfff2a0, 0, 1.22, 0, 0.2);
      if (variant === 'crystal') {
        [[0, 1.1, -0.1, 0, 0], [0.32, 0.92, -0.2, 0, -0.5], [-0.34, 0.9, -0.22, 0, 0.5], [0.1, 0.7, -0.55, -0.8, 0]].forEach(([x, y, z, rx, rz], i) =>
          kg.add(octa(0.2 - i * 0.025), 0xbff4ff, x, y, z, rx, 0, rz, 0.7, 1.8, 0.7));
      }
      if (variant === 'magma') {
        [[0.3, 0.6, 0.45], [-0.45, 0.5, 0.35], [0.5, 0.3, -0.3], [-0.2, 0.85, -0.35], [0.1, 0.2, -0.6]].forEach(([x, y, z]) => kg.add(sph(0.09, 8, 6), 0xffe066, x, y, z));
        [[0.2, 0.98, -0.1], [-0.25, 0.92, 0.05], [0.45, 0.7, -0.25]].forEach(([x, y, z], i) => k.add(ico(0.15 - i * 0.02, 0), 0x3a1a10, x, y, z));
      }
    } else if (shape === 'wisp') {
      const pts = v2([[0.0001, 0], [0.26, 0.06], [0.5, 0.32], [0.58, 0.68], [0.5, 1.0], [0.3, 1.28], [0.12, 1.5], [0.0001, 1.62]]);
      const lg = new THREE.LatheGeometry(pts, 18);
      const pa = lg.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const py = pa.getY(i);
        if (py > 0.85) pa.setZ(i, pa.getZ(i) - (py - 0.85) * (py - 0.85) * 1.2);
      }
      lg.computeVertexNormals();
      k.add(lg, col, 0, 0, 0);
      lg.dispose();
      k.add(sph(0.38, 14, 10), shade(col, 1.25), 0, 0.5, 0.12, 0, 0, 0, 1, 0.9, 0.9);
      [-1, 1].forEach(s => k.add(sph(0.13, 10, 8), col, s * 0.58, 0.55, 0.1, 0, 0, 0, 1, 0.8, 0.8));
      addEyes(k, kp, 0.72, 0.42, 0.2, 0.15, { browColor: dark });
      k.add(torus(0.07, 0.03, 6, 10, Math.PI), 0x1a1424, 0, 0.48, 0.52, 0, 0, Math.PI);
      if (variant === 'abyss') {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + 0.4;
          for (let j = 0; j < 3; j++) k.add(sph(0.11 - j * 0.025, 8, 6), dark, Math.sin(a) * (0.3 + j * 0.08), -0.05 - j * 0.16, Math.cos(a) * (0.3 + j * 0.08));
        }
      }
      if (variant === 'flame') kg.add(lathe('flame', v2([[0.0001, 0], [0.09, 0.05], [0.11, 0.12], [0.06, 0.22], [0.0001, 0.3]]), 10), 0xffe066, 0, 1.25, -0.15, -0.4, 0, 0, 1.6);
      rough = 0.35;
    } else if (shape === 'flyer') {
      const body = col, belly = 0xf2eee0;
      k.add(sph(0.42, 16, 12), body, 0, 0, 0, 0, 0, 0, 1, 0.85, 1.6);
      k.add(sph(0.3, 14, 10), belly, 0, -0.12, 0.12, 0, 0, 0, 1, 0.8, 1.4);
      k.add(sph(0.3, 14, 10), body, 0, 0.12, 0.62);
      k.add(lathe('beak', v2([[0.11, 0], [0.07, 0.12], [0.0001, 0.24]]), 8), 0xffc23a, 0, 0.06, 0.9, Math.PI / 2 + 0.3);
      addEyes(k, kp, 0.2, 0.8, 0.13, 0.1, { browColor: 0x1a2030 });
      for (let i = 0; i < 3; i++) k.add(rbox(0.16, 0.06, 0.5, 0.03), shade(body, 0.8), (i - 1) * 0.14, 0.02, -0.72, 0, (i - 1) * 0.35, 0);
      const wp = [[0, 0.1], [0.5, 0.18], [1.0, 0.12], [1.5, 0.0], [1.3, -0.14], [1.1, -0.08], [0.95, -0.22], [0.7, -0.14], [0.5, -0.28], [0.2, -0.2]];
      [-1, 1].forEach(s => {
        const wk = new Kit();
        wk.add(shapeGeo('fwing2', wp, 0.05), shade(body, 0.85), 0, 0, 0, Math.PI / 2, s < 0 ? Math.PI : 0, 0);
        wk.add(rbox(1.1, 0.07, 0.12, 0.03), 0xf2eee0, s * 0.75, 0.02, -0.12);
        wings.push({ kit: wk, s, x: s * 0.3, y: 0.05, z: 0 });
      });
      rig.position.y = 1.4;
    } else {
      // bat (and its variants)
      const furry = variant === 'knight' ? 0x2a2038 : col;
      k.add(sph(0.52, 16, 12), furry, 0, 0, 0, 0, 0, 0, 1, 0.95, 0.95);
      k.add(sph(0.32, 14, 10), shade(furry, 1.35), 0, -0.12, 0.25, 0, 0, 0, 1, 0.9, 0.7);
      [-1, 1].forEach(s => {
        k.add(lathe('batear', v2([[0.15, 0], [0.12, 0.12], [0.05, 0.3], [0.0001, 0.36]]), 10), furry, s * 0.28, 0.36, 0, 0, 0, -s * 0.35, 1, 1, 0.6);
        k.add(lathe('fang', v2([[0.035, 0], [0.0001, -0.07]]), 6), 0xffffff, s * 0.07, -0.2, 0.47);
        k.add(sph(0.08, 8, 6), dark, s * 0.18, -0.48, 0.05);
      });
      if (variant === 'knight') {
        eyeGlow = true;
        k.add(capGeo('kmob', 0.56, 0.9, 0.05, 0.9, TAU - 1.8), 0x4a4a5e, 0, 0, 0);
        k.add(rbox(0.08, 0.3, 0.6, 0.04), 0x4a4a5e, 0, 0.42, 0, 0, 0, 0);
        kg.add(octa(0.12), 0xff3a5a, 0, 0.62, -0.1, 0, 0, 0, 0.6, 1.6, 0.6);
      }
      if (variant === 'cosmic' || variant === 'magma') {
        eyeGlow = true;
        [[0.3, 0.2, 0.38], [-0.35, 0.05, 0.36], [0.1, 0.35, -0.42], [-0.2, -0.3, 0.38]].forEach(([x, y, z]) =>
          kg.add(variant === 'cosmic' ? octa(0.05) : sph(0.06, 8, 6), variant === 'cosmic' ? 0xffffff : 0xffc23a, x, y, z));
      }
      if (eyeGlow) {
        [-1, 1].forEach(s => {
          kg.add(sph(0.13, 12, 8), variant === 'knight' ? 0xff3a3a : variant === 'magma' ? 0xffd040 : 0xf0b0ff, s * 0.18, 0.08, 0.44, 0, 0, 0, 1, 0.7, 0.6);
          k.add(rbox(0.22, 0.07, 0.1, 0.03), 0x0a0810, s * 0.18, 0.2, 0.47, 0, 0, s * 0.45);
        });
      } else addEyes(k, kp, 0.08, 0.38, 0.19, 0.14, { browColor: dark });
      const wp = [[0, 0.15], [0.4, 0.3], [0.85, 0.42], [1.05, 0.2], [0.85, 0.02], [0.7, -0.18], [0.5, -0.02], [0.35, -0.22], [0.15, -0.05]];
      const wc = variant === 'magma' ? 0x5a1a0a : variant === 'knight' ? 0x1a1424 : shade(furry, 0.7);
      [-1, 1].forEach(s => {
        const wk = new Kit();
        wk.add(shapeGeo('batwing', wp, 0.04), wc, 0, 0, 0, 0, s < 0 ? Math.PI : 0, 0);
        if (variant === 'magma') { const wkg = new Kit(); wkg.add(rbox(0.8, 0.04, 0.06, 0.02), 0xffa040, s * 0.45, 0.2, 0.02, 0, 0, s * 0.25); wings.push({ kit: wk, glowKit: wkg, s, x: s * 0.4, y: 0.1, z: -0.05 }); }
        else wings.push({ kit: wk, s, x: s * 0.4, y: 0.1, z: -0.05 });
      });
      rig.position.y = 1.6;
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
    if (shape === 'wisp') { _c.setHex(col); mat.emissive.copy(_c).multiplyScalar(variant === 'flame' ? 0.9 : 0.45); }
    if (variant === 'magma') mat.emissive.setRGB(0.25, 0.06, 0.0);
    const S = shared();
    const body = k.mesh(mat);
    rig.add(body);
    const pupils = kp.list.length ? kp.mesh(S.pupil, false) : null;
    if (pupils) {
      // pupils carry their own white highlights → vertex colours on a plain material
      pupils.material = mobPupilMat();
      rig.add(pupils);
    }
    if (kg.list.length) rig.add(kg.mesh(S.glow, false));
    const wingGroups = [];
    wings.forEach(w => {
      const p = new THREE.Group();
      p.position.set(w.x, w.y, w.z);
      const wm = w.kit.mesh(mat);
      wm.material = mat;
      if (shape === 'bat') wm.material = mobWingMat(mat);
      p.add(wm);
      if (w.glowKit) p.add(w.glowKit.mesh(S.glow, false));
      rig.add(p);
      p.userData.side = w.s;
      wingGroups.push(p);
    });
    if (def.scale) g.scale.setScalar(def.scale);
    g.userData.body = body;          // legacy field (combat code reads it)
    g.userData.wings = wingGroups.length ? wingGroups : null;
    g.userData.anim = {
      rig, body, pupils, mat, shape, variant, base: rig.position.y, ph: Math.random() * TAU,
      hit: 0, sq: 1, sv: 0, poof: false, lastX: 0, lastZ: 0, hop: 0, flying: !!def.flies,
    };
    mobMeshes.push(g);
    return g;
  }
  let _pupilMat = null;
  function mobPupilMat() {
    return _pupilMat || (_pupilMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15 }));
  }
  function mobWingMat(mat) {
    // bat wings: same colours, double-sided
    if (!mat.userData.wing) {
      mat.userData.wing = mat.clone();
      mat.userData.wing.side = THREE.DoubleSide;
    }
    return mat.userData.wing;
  }
  const mobMeshes = [];

  function animateMob(mob, dt) {
    const g = mob.mesh, A = g.userData.anim;
    if (!A) return;
    const t = P.t + A.ph;
    if (C) {
      const lx = C.pos.x - g.position.x, lz = C.pos.z - g.position.z;
      A.rig.visible = lx * lx + lz * lz < 130 * 130;
    }
    // movement speed from position delta (drives hop rate)
    const mx = g.position.x - A.lastX, mz = g.position.z - A.lastZ;
    A.lastX = g.position.x; A.lastZ = g.position.z;
    const sp = dt > 0 ? Math.min(12, Math.hypot(mx, mz) / dt) : 0;
    const rig = A.rig;
    if (A.shape === 'slime') {
      A.hop += dt * (3.2 + sp * 0.9);
      const s = Math.sin(A.hop);
      const air = Math.max(0, s);
      rig.position.y = air * (0.25 + sp * 0.04);
      // squash on contact, stretch in the air
      const sy = s > 0 ? 1 + air * 0.12 : 1 + s * 0.15;
      rig.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    } else if (A.shape === 'wisp') {
      rig.position.y = A.base + 0.35 + Math.sin(t * 2.4) * 0.22;
      rig.rotation.z = Math.sin(t * 1.7) * 0.08;
      const br = 1 + Math.sin(t * 5) * 0.04;
      rig.scale.set(br, 2 - br, br);
    } else if (A.shape === 'flyer') {
      rig.rotation.z = Math.sin(t * 1.3) * 0.15;
      rig.scale.set(1, 1, 1);
    } else {
      rig.position.y = A.base + Math.sin(t * 5) * 0.14;
      rig.rotation.x = Math.sin(t * 2.5) * 0.08;
      rig.scale.set(1, 1, 1);
    }
    const wings = g.userData.wings;
    if (wings) {
      const rate = A.shape === 'flyer' ? 9 : 14;
      const amp = A.shape === 'flyer' ? 0.55 : 0.7;
      for (let i = 0; i < wings.length; i++) {
        const w = wings[i];
        w.rotation.z = w.userData.side * Math.sin(t * rate) * amp;
      }
    }
    // pupils follow the player
    if (A.pupils && C) {
      const dx = C.pos.x - g.position.x, dz = C.pos.z - g.position.z;
      let rel = Math.atan2(dx, dz) - g.rotation.y;
      while (rel > Math.PI) rel -= TAU;
      while (rel < -Math.PI) rel += TAU;
      A.pupils.position.x = clamp(rel, -1, 1) * 0.035;
      A.pupils.position.y = clamp((C.pos.y - g.position.y) * 0.01, -0.03, 0.03);
    }
    // hit flash + squash spring
    A.hit = Math.max(0, A.hit - dt * 3);
    spring(A, 'sq', 'sv', 1, 260, 14, dt, 0.6, 1.4);
    if (Math.abs(A.sq - 1) > 0.002) rig.scale.y *= A.sq;
    const shieldGlow = mob.shieldT > 0 ? 0.4 : 0;
    const f = Math.max(A.hit, shieldGlow);
    if (f > 0) A.mat.emissive.setRGB(f, f, f);
    else if (A.shape === 'wisp') { _c.setHex(mob.def.color); A.mat.emissive.copy(_c).multiplyScalar(A.variant === 'flame' ? 0.9 : 0.45); }
    else if (A.variant === 'magma') A.mat.emissive.setRGB(0.25, 0.06, 0);
    else A.mat.emissive.setRGB(0, 0, 0);
  }
  function mobHit(mob) {
    const A = mob.mesh.userData.anim;
    const p = mob.mesh.position;
    const s = mob.mesh.scale.x || 1;
    if (A) { A.hit = 1; A.sv -= 5; }
    if (mob.mesh.userData.boss) mob.mesh.userData.boss.flash = 1;
    burst('spark', p.x, p.y + (A ? A.base : 1) * s + 0.6 * s, p.z, 12, 0xfff0a0, 1);
    ring(p.x, p.y + 1 * s, p.z, 0xffe27a, 1.6 * s, 0.3, false);
    if (mob.isBoss) CAM.trauma = Math.min(1, CAM.trauma + 0.35);
  }
  // fade 0 → 0.55: wobble, inflate, POOF (then sky.js removes the mesh)
  function mobDying(mob, dt) {
    const g = mob.mesh;
    const A = g.userData.anim;
    if (!g.userData.baseScale) g.userData.baseScale = g.scale.x;
    const s0 = g.userData.baseScale;
    const f = mob.fade;
    if (f < 0.2) {
      const k = f / 0.2;
      const s = s0 * (1 + k * 0.35);
      g.scale.set(s * (1 + Math.sin(f * 60) * 0.06), s * (1 - k * 0.15), s);
      if (A) A.mat.emissive.setRGB(k, k, k);
      if (A) A.rig.rotation.y += dt * 18;
    } else if (!g.userData.poofed) {
      g.userData.poofed = true;
      g.scale.setScalar(0.0001);
      const p = g.position;
      const h = (A ? A.base : (mob.isBoss ? 4 : 0.6)) * s0 + 0.5 * s0;
      const big = mob.isBoss ? 3 : 1;
      burst('puff', p.x, p.y + h * 0.6, p.z, 14 * big, 0xffffff, 1.3 * s0 * (mob.isBoss ? 1.6 : 1));
      burst('puff', p.x, p.y + h * 0.6, p.z, 6 * big, mob.def.color || 0xaaaaaa, 1.0 * s0);
      burst('spark', p.x, p.y + h, p.z, 18 * big, 0xffe066, 1.3 * s0);
      ring(p.x, p.y + 0.2, p.z, 0xffffff, 2.4 * s0 * big, 0.5);
      if (mob.isBoss) { CAM.trauma = 1; burst('confetti', p.x, p.y + 6, p.z, 60, 0xffffff); }
    }
  }

  // ===================== bosses =====================
  // looks per boss id; all share one kit: chunky body, big head, floating fists
  // presentation palette per boss (BOSS_DEFS colours are near-black under the new lighting)
  const BOSS_LOOK = {
    sq_storm_boss: { body: 0x5b6282, head: 0x6c7396, arm: 0x4a5072, belly: 0x9aa2c8 },
    sqg_dragon_boss: { body: 0x5b3a9e, head: 0x6a48b2, arm: 0x4a2e86, belly: 0xc6aef4 },
    sqh_temple_boss: { body: 0x2c2646, head: 0x3a3458, arm: 0x1a1628, belly: 0x3a3458 },
    squ_core_boss: { body: 0x3e2618, head: 0x4c301e, arm: 0x2e1c10, belly: 0x6a3a1e },
  };
  function makeBoss(id, d) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const k = new Kit(), kg = new Kit();
    const BL = BOSS_LOOK[id] || {};
    const B = BL.body || d.body, H = BL.head || d.head, A = BL.arm || d.arm;
    const dragon = id === 'sqg_dragon_boss', temple = id === 'sqh_temple_boss', lava = id === 'squ_core_boss';
    // legs
    [-1, 1].forEach(s => k.add(rbox(1.3, 1.8, 1.4, 0.45), A, s * 0.95, 0.9, 0));
    // torso + belly
    if (temple) {
      const robe = v2([[0.0001, 0.2], [2.3, 0.2], [2.2, 1.2], [1.9, 3.2], [1.8, 5.6], [1.2, 6.2], [0.0001, 6.3]]);
      k.add(lathe('robe', robe, 22), B, 0, 0, 0);
      k.add(torus(1.85, 0.16, 8, 26), 0xffd34a, 0, 3.2, 0, Math.PI / 2);
    } else {
      k.add(rbox(3.6, 3.8, 2.7, 0.9), B, 0, 3.9, 0);
      k.add(rbox(2.4, 2.4, 0.4, 0.5), BL.belly || shade(B, 1.5), 0, 3.6, 1.25);
    }
    // shoulders
    [-1, 1].forEach(s => k.add(sph(1.05, 16, 12), dragon ? shade(B, 1.2) : A, s * 2.1, 5.3, 0, 0, 0, 0, 1, 0.85, 1));
    // head
    const head = new THREE.Group();
    head.position.set(0, 7.0, 0.2);
    body.add(head);
    const kh = new Kit(), khg = new Kit();
    if (dragon) {
      kh.add(rbox(2.0, 1.6, 2.2, 0.6), H, 0, 0, 0);
      kh.add(rbox(1.6, 0.9, 1.6, 0.4), H, 0, -0.3, 1.4);
      [-1, 1].forEach(s => {
        for (let i = 0; i < 4; i++) kh.add(sph(0.3 - i * 0.06, 10, 8), 0xe8dcc0, s * (0.6 + i * 0.2), 0.8 + i * 0.3, -0.4 - i * i * 0.12);
        kh.add(sph(0.1, 8, 6), 0x1a0a2a, s * 0.4, -0.05, 2.2);
        kh.add(lathe('bfang', v2([[0.1, 0], [0.0001, -0.3]]), 8), 0xffffff, s * 0.45, -0.75, 1.9);
      });
    } else if (temple) {
      kh.add(capGeo('bhood', 1.25, 2.4, -1.1, 0.9, TAU - 1.8), H, 0, 0.1, 0);
      kh.add(headGeo(1.0, 1.9), 0x0a0a14, 0, 0, 0);
      khg.add(torus(1.4, 0.09, 8, 30), 0xffd34a, 0, 1.6, -0.6, 0.3);
    } else {
      kh.add(rbox(2.3, 1.9, 2.1, 0.6), H, 0, 0, 0);
      kh.add(rbox(2.0, 0.35, 0.6, 0.15), shade(H, 0.7), 0, 0.42, 1.0, 0.1); // brow ridge
      if (lava) {
        [-1, 1].forEach(s => kh.add(lathe('bhorn', v2([[0.3, 0], [0.22, 0.5], [0.0001, 1.1]]), 10), 0x2a1a10, s * 0.9, 0.9, 0, 0, 0, -s * 0.5));
      } else {
        // storm crown of clouds + lightning crest
        [[-0.8, 1.1, 0], [0, 1.3, -0.2], [0.8, 1.1, 0], [-0.4, 1.2, 0.5], [0.4, 1.2, 0.5]].forEach(([x, y, z], i) => kh.add(sph(0.55 - (i % 2) * 0.1, 12, 10), 0x8a8aa8, x, y, z));
        khg.add(shapeGeo('bolt', [[0, 0.8], [0.35, 0.8], [0.1, 0.3], [0.4, 0.3], [-0.2, -0.6], [0.0, -0.05], [-0.3, -0.05]], 0.1), 0x9fe0ff, 0, 1.7, 0.5);
      }
      kh.add(rbox(0.9, 0.18, 0.2, 0.08), 0x0a0a14, 0, -0.55, 1.03);
    }
    const eyeMat = new THREE.MeshStandardMaterial({ color: d.eye, emissive: d.eyeEm, emissiveIntensity: 2.4, roughness: 0.3 });
    const ek = new Kit();
    [-1, 1].forEach(s => ek.add(rbox(0.6, 0.38, 0.2, 0.15), 0xffffff, s * 0.5, dragon ? 0.45 : 0.1, dragon ? 1.05 : 1.05, 0, 0, s * 0.25));
    const mats = { body: bodyMat(0.55), glow: shared().glow };
    if (lava) mats.body.emissive.setRGB(0.18, 0.04, 0);
    if (!temple) {
      const bm = kh.mesh(mats.body); head.add(bm);
    } else head.add(kh.mesh(mats.body));
    if (khg.list.length) head.add(khg.mesh(mats.glow, false));
    const eyes = ek.mesh(eyeMat, false);
    if (temple) eyes.position.set(0, -0.1, 0);
    head.add(eyes);
    // lava cracks / storm runes on the body
    if (lava) {
      for (let i = 0; i < 9; i++) {
        const a = hash(i) * 2 - 1, b = hash(i + 7);
        kg.add(rbox(0.1, 0.6 + b * 0.8, 0.1, 0.04), 0xffa030, a * 1.5, 2.6 + b * 2.4, 1.36, 0, 0, a * 0.8);
      }
    } else if (!temple && !dragon) {
      kg.add(shapeGeo('bolt', [[0, 0.8], [0.35, 0.8], [0.1, 0.3], [0.4, 0.3], [-0.2, -0.6], [0.0, -0.05], [-0.3, -0.05]], 0.1), 0x9fe0ff, 0, 3.7, 1.5, 0, 0, 0, 1.4);
    }
    if (dragon) {
      for (let i = 0; i < 4; i++) k.add(lathe('bspike', v2([[0.3, 0], [0.18, 0.3], [0.0001, 0.6]]), 8), 0x6a3aa8, 0, 5.4 - i * 1.1, -1.25, -1.2);
      for (let i = 0; i < 6; i++) k.add(sph(0.7 - i * 0.1, 12, 10), B, 0, 1.4 - i * 0.12, -1.6 - i * 0.7);
    }
    body.add(k.mesh(mats.body));
    if (kg.list.length) body.add(kg.mesh(mats.glow, false));
    // floating fists
    const fists = [];
    [-1, 1].forEach(s => {
      const fg = new THREE.Group();
      fg.position.set(s * 2.9, 3.2, 0.6);
      const fk = new Kit();
      if (temple) { fk.add(sph(0.6, 14, 10), 0x0a0a14, 0, 0, 0); }
      else {
        fk.add(rbox(1.3, 1.3, 1.3, 0.45), A, 0, 0, 0);
        fk.add(rbox(1.1, 0.4, 0.4, 0.18), shade(A, 1.3), 0, 0.3, 0.55);
      }
      fg.add(fk.mesh(mats.body));
      if (temple) { const fkg = new Kit(); fkg.add(sph(0.25, 10, 8), d.eye, 0, 0, 0.45); fg.add(fkg.mesh(mats.glow, false)); }
      body.add(fg);
      fists.push(fg);
    });
    // wings for the dragon
    const wings = [];
    if (dragon) {
      const wp = [[0, 0], [1.2, 1.4], [2.6, 2.4], [3.8, 2.0], [3.4, 0.9], [3.6, -0.2], [2.6, 0.2], [2.2, -0.9], [1.3, -0.2], [0.6, -1.0]];
      [-1, 1].forEach(s => {
        const wk = new Kit();
        wk.add(shapeGeo('bwing', wp, 0.12), 0x7a52c8, 0, 0, 0, 0, s < 0 ? Math.PI : 0, 0);
        const wg = new THREE.Group();
        wg.position.set(s * 1.2, 5.5, -1.2);
        const wm = wk.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1a0a3a }));
        wg.add(wm);
        body.add(wg);
        wg.userData.side = s;
        wings.push(wg);
      });
    }
    g.userData.boss = { body, head, fists, wings, mats, eyes, ph: 0, id };
    g.userData.body = body;
    return { group: g, eyeMat, torso: body };
  }
  function animateBoss(g, dt, phase) {
    const B = g.userData.boss;
    if (!B) return;
    B.ph += dt * (phase === 2 ? 1.6 : 1);
    B.flash = Math.max(0, (B.flash || 0) - dt * 3);
    const lava = B.id === 'squ_core_boss';
    B.mats.body.emissive.setRGB(B.flash + (lava ? 0.18 : 0), B.flash + (lava ? 0.04 : 0), B.flash);
    const t = B.ph;
    const br = Math.sin(t * 1.6);
    B.body.scale.set(1 + br * 0.02, 1 - br * 0.02, 1 + br * 0.02);
    B.head.rotation.y = Math.sin(t * 0.7) * 0.2;
    B.head.rotation.x = Math.sin(t * 1.1) * 0.05;
    for (let i = 0; i < B.fists.length; i++) {
      const f = B.fists[i], s = i ? 1 : -1;
      f.position.y = 3.2 + Math.sin(t * 2 + i * 1.7) * 0.35;
      f.position.z = 0.6 + Math.sin(t * 1.3 + i) * 0.3;
      f.rotation.x = Math.sin(t * 1.5 + i) * 0.2;
      if (phase === 2) f.position.x = s * (2.9 + Math.sin(t * 6 + i) * 0.15);
    }
    for (let i = 0; i < B.wings.length; i++) {
      const w = B.wings[i];
      w.rotation.y = w.userData.side * (0.4 + Math.sin(t * 2.4) * 0.35);
    }
    if (phase === 2) {
      B.body.position.x = Math.sin(t * 40) * 0.04;
      if (Math.random() < dt * 6) { const p = g.position; burst('ember', p.x + (Math.random() - 0.5) * 4, p.y + 1, p.z + (Math.random() - 0.5) * 4, 1, 0xff6a3a); }
    }
  }

  // ===================== item visuals =====================
  function makeShield() {
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2a8ad0, emissiveIntensity: 0.8, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false })
    );
    const k = new Kit();
    k.add(torus(1.58, 0.03, 6, 48), 0xbff4ff, 0, 0, 0, Math.PI / 2);
    k.add(torus(1.58, 0.03, 6, 48), 0xbff4ff, 0, 0, 0, Math.PI / 2 + 1.0, 0.6);
    g.add(k.mesh(shared().glow, false));
    g.renderOrder = 2;
    g.userData.camIgnore = true;
    return g;
  }
  function makeMount() {
    const g = new THREE.Group();
    const k = new Kit();
    [[0, 0, 0, 0.62], [0.5, 0.05, 0.12, 0.42], [-0.48, 0.04, -0.1, 0.44], [0.12, 0.14, -0.4, 0.38], [-0.1, 0.1, 0.42, 0.36], [0.62, -0.02, -0.3, 0.3]].forEach(([x, y, z, r]) =>
      k.add(sph(r, 14, 10), 0xffffff, x, y, z, 0, 0, 0, 1, 0.62, 1));
    k.add(sph(0.6, 14, 8), 0xd8ecff, 0, -0.14, 0, 0, 0, 0, 1.5, 0.3, 1.3);
    const m = k.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0x6a7a9a, emissiveIntensity: 0.25 }));
    g.add(m);
    const kg = new Kit();
    kg.add(torus(0.7, 0.03, 6, 32), 0xbfefff, 0, -0.18, 0, Math.PI / 2);
    g.add(kg.mesh(shared().glow, false));
    g.position.y = -0.05;
    return g;
  }
  function makeBolt() {
    const k = new Kit();
    k.add(starGeo(0.26, 0.1), 0xfff2a0, 0, 0, 0);
    k.add(sph(0.18, 12, 8), 0xffffff, 0, 0, 0);
    return k.mesh(shared().glow, false);
  }
  function boltTrail(x, y, z) {
    if (!FX.ready) return;
    spawn(FX.spark, x, y, z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0.35, 0.09, 0xfff0a0, 0, 1);
  }
  // jagged glowing ribbon between two points (built once per strike, disposed by sky.js)
  function lightning(ax, ay, az, bx, by, bz) {
    const N = 9, pos = [], idx = [];
    const w = 0.16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const j = i === 0 || i === N ? 0 : 0.45;
      const x = lerp(ax, bx, t) + (Math.random() - 0.5) * j;
      const y = lerp(ay, by, t) + (Math.random() - 0.5) * j;
      const z = lerp(az, bz, t) + (Math.random() - 0.5) * j;
      pos.push(x, y - w, z, x, y + w, z, x - w, y, z - w, x + w, y, z + w);
      if (i < N) {
        const a = i * 4, b = (i + 1) * 4;
        idx.push(a, b, a + 1, a + 1, b, b + 1, a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false });
    mat.color.multiplyScalar(2.2);
    burst('spark', bx, by, bz, 10, 0xbfe8ff, 0.8);
    return new THREE.Mesh(geo, mat);
  }

  // ===================== per-frame =====================
  function update(dt) {
    if (!C) return;
    ensureFx();
    if (!FX.ready) return;
    updateNpcs(dt);
    stepPool(FX.puff, dt, 'puff');
    stepPool(FX.spark, dt, 'spark');
    stepPool(FX.confetti, dt, 'conf');
    stepPool(FX.line, dt, 'line');
    stepRings(dt);
    // hero blob shadow: shrinks + fades with height above the ground
    const pos = C.pos;
    const sup = C.supportAt(pos.x, pos.z, pos.y + 0.3);
    if (sup.col && P.group && P.group.visible) {
      const h = Math.max(0, pos.y - sup.y);
      const k = clamp(1 - h / 14, 0.15, 1);
      FX.shadow.visible = true;
      FX.shadow.position.set(pos.x, sup.y + 0.04, pos.z);
      FX.shadow.scale.setScalar(1.5 * (0.45 + 0.55 * k));
      FX.shadow.material.opacity = (low() ? 0.6 : 0.42) * k;
    } else FX.shadow.visible = false;
    // creature blob shadows
    let n = 0;
    for (let i = mobMeshes.length - 1; i >= 0; i--) {
      const g = mobMeshes[i];
      if (!g.parent) { mobMeshes.splice(i, 1); continue; }
      if (!g.visible || g.userData.poofed || n >= 40) continue;
      const A = g.userData.anim;
      const s = g.scale.x;
      let gy = g.position.y;
      if (A && A.flying) { const su = C.supportAt(g.position.x, g.position.z, g.position.y); if (!su.col) continue; gy = su.y; }
      const h = A ? Math.max(0, (g.position.y - gy) + A.rig.position.y * s - (A.shape === 'slime' ? 0 : 0.5)) : 0;
      const k = clamp(1 - h / 16, 0.3, 1);
      _o.position.set(g.position.x, gy + 0.05, g.position.z);
      _o.rotation.set(0, 0, 0);
      _o.scale.setScalar(1.6 * s * k);
      _o.updateMatrix();
      FX.mobShadow.setMatrixAt(n++, _o.matrix);
    }
    FX.mobShadow.count = n;
    FX.mobShadow.instanceMatrix.needsUpdate = true;
  }

  function init(ctx) {
    C = ctx;
    ctx.onFx(onFx);
  }

  // test-only: pin the motion snapshot the animator sees (null = live)
  function debugForce(o) {
    P.force = o ? Object.assign({ speed: 0, moving: false, sprint: false, vy: 0, grounded: true, dashing: false, riding: null }, o) : null;
  }
  function triCount(o) {
    let n = 0;
    o.traverse(m => { if (m.isMesh && m.geometry) { const g = m.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1); } });
    return Math.round(n);
  }
  function debug() {
    return {
      tris: { hero: P.rig ? triCount(P.rig.root) : 0, npc: npcs.length ? triCount(npcs[0].g) : 0, mobs: mobMeshes.map(m => triCount(m)) },
      skin: P.skinId, pose: Array.from(P.w).map(v => +v.toFixed(2)),
      expr: P.rig ? P.rig.faceMat.userData.expr : null,
      camR: +CAM.curR.toFixed(2), camHit: +CAM.hitR.toFixed(2), fov: +CAM.fov.toFixed(1),
      hitObj: CAM.hitObj ? { type: CAM.hitObj.type, geo: CAM.hitObj.geometry.type, r: +CAM.hitObj.geometry.boundingSphere.radius.toFixed(2), mat: CAM.hitObj.material.type, col: CAM.hitObj.material.color && CAM.hitObj.material.color.getHexString(), y: +CAM.hitObj.getWorldPosition(new THREE.Vector3()).y.toFixed(1) } : null,
      npcs: npcs.length, mobs: mobMeshes.length,
    };
  }

  return {
    init, buildPlayer, refreshLook, animatePlayer, update, updateCamera,
    makeNpc, makeMob, animateMob, mobHit, mobDying, makeBoss, animateBoss,
    makeShield, makeMount, makeBolt, boltTrail, lightning, celebrate, burst, debug, debugForce,
    _dbgMobs: () => mobMeshes,
    LOOKS,
  };
})();
