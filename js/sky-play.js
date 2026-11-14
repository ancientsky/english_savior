/* ===== SkyPlay — star coins, pets, egg hatching, obby courses and word gates for 天空之城 =====
   Loaded BEFORE js/sky.js; data in js/data/sky-play.js; styles in css/sky-play.css (prefix aw-).
   sky.js hands us `ctx` (SkyPlay.init) and calls:
     update(dt)            every frame from updateWorld(), BEFORE updatePlayer() — obby platforms
                           move here and leave their frame delta on the collider (mdx/mdz/mdy/myaw)
                           so the physics half of updatePlayer() can carry the player
     onGround(col)         each grounded frame on a collider that has `col.play`
     onVoid()              from voidFall(); true = we handled it (course checkpoint respawn)
     target(x,y,z,d)       nearest PLAY interactable closer than d → { play:true, id, label, use }
     drawMinimap / tracker / locked / onEscape / togglePets / onAdventureStart
   Learning integrity: ⭐ star coins are earned by moving and spent only here (eggs). XP / 💎 are
   only paid for English answered correctly at word gates (ctx.playReward = awardAnswer rates)
   and for clearing a course (ctx.playClear = quest-clear rates). Hatching questions pay nothing. */
const SkyPlay = (() => {
  let ctx = null;
  let ready = false;
  let P = null;                 // ctx.save.play (see ensureSave)
  let freshSave = false;        // the save had no `play` block when we loaded (old or new player)
  let simT = 0;
  const _m4 = { obj: null };    // reused Object3D for instance matrices

  // =====================================================================
  // save (one add-only block: save.play)
  // =====================================================================
  function ensureSave() {
    const s = ctx.save;
    freshSave = !s.play || typeof s.play !== 'object';
    if (freshSave) s.play = {};
    P = s.play;
    if (typeof P.coins !== 'number' || !isFinite(P.coins) || P.coins < 0) P.coins = 0;
    if (typeof P.coinsTotal !== 'number') P.coinsTotal = P.coins;
    if (!P.groups || typeof P.groups !== 'object') P.groups = {};     // gid -> { t: ms first taken, got: bitmask }
    if (!P.pets || typeof P.pets !== 'object') P.pets = {};           // petId -> { n, stars }
    if (!Array.isArray(P.equip)) P.equip = [];
    P.equip = P.equip.filter(id => P.pets[id] && SKY_PETS.some(p => p.id === id)).slice(0, SKY_PET_SLOTS);
    if (!P.courses || typeof P.courses !== 'object') P.courses = {};  // courseId -> { best, clears }
    if (typeof P.hatched !== 'number') P.hatched = 0;
    if (!P.seen || typeof P.seen !== 'object') P.seen = {};
    if (P.pendingEgg && !SKY_EGGS.some(e => e.id === P.pendingEgg)) P.pendingEgg = null;
    // imported saves are untrusted: keep only known ids and finite numbers
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    for (const id of Object.keys(P.pets)) {
      const st = P.pets[id];
      if (!petDef(id) || !st || typeof st !== 'object') { delete P.pets[id]; continue; }
      st.n = num(st.n, 1, 9999, 1); st.stars = Math.round(num(st.stars, 1, 5, 1));
    }
    for (const id of Object.keys(P.courses)) {
      const st = P.courses[id];
      if (!st || typeof st !== 'object') { delete P.courses[id]; continue; }
      st.best = num(st.best, 0, 1e6, 0); st.clears = Math.round(num(st.clears, 0, 1e6, 0));
    }
    for (const gid of Object.keys(P.groups)) {
      const st = P.groups[gid];
      if (!st || typeof st !== 'object' || typeof st.t !== 'number' || typeof st.got !== 'number') delete P.groups[gid];
    }
    P.equip = P.equip.filter(id => P.pets[id]);
  }
  let persistAt = 0;
  function persistSoon() { if (!persistAt) persistAt = simT + 2; }
  function persistNow() { persistAt = 0; ctx.persist(); }

  // =====================================================================
  // small synth (coin chime / boops) — own context, respects the 🔊 setting
  // =====================================================================
  let actx = null;
  function audio() {
    if (typeof SoundManager !== 'undefined' && SoundManager.isEnabled && !SoundManager.isEnabled()) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch { return null; }
    return actx;
  }
  function blip(freq, dur, type, vol, delay) {
    const a = audio();
    if (!a) return;
    try {
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch { /* audio is best-effort */ }
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  function coinChime(combo) {
    const f = 784 * Math.pow(2, PENTA[Math.min(combo, PENTA.length - 1)] / 12);
    blip(f, 0.16, 'sine', 0.09);
    blip(f * 2, 0.1, 'triangle', 0.035, 0.015);
  }
  function boop(up) {
    blip(up ? 520 : 330, 0.14, 'triangle', 0.09);
    blip(up ? 780 : 220, 0.18, 'sine', 0.06, 0.07);
  }
  function fanfare() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, 0.28, 'triangle', 0.08, i * 0.09));
  }

  // =====================================================================
  // shared geometry / materials / textures
  // =====================================================================
  const GEO = {};
  function rbox(w, h, d) {
    const k = `rb${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
    if (!GEO[k]) GEO[k] = new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(0.22, Math.min(w, h, d) * 0.28));
    return GEO[k];
  }
  function sphere(seg) {
    const k = 'sp' + (seg || 18);
    return GEO[k] || (GEO[k] = new THREE.SphereGeometry(1, seg || 18, Math.max(8, Math.round((seg || 18) * 0.7))));
  }
  function capsule() { return GEO.cap || (GEO.cap = new THREE.CapsuleGeometry(0.5, 1, 4, 10)); }
  function mat(color, emissive) { return ctx.matOf(color, emissive || 0); }
  // own copy of the house material (inherits whatever material type ART's matOf makes),
  // for things we animate per instance (opacity, emissive pulse, scrolling map)
  function ownMat(color, emissive) {
    const m = ctx.matOf(color, emissive || 0).clone();
    return m;
  }
  function tex(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  // a rounded card with text, used for signs / answer labels / arch boards
  function cardCanvas(lines, opts) {
    opts = opts || {};
    const W = opts.w || 1024, H = opts.h || 256;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    drawCard(g, W, H, lines, opts);
    return cv;
  }
  function drawCard(g, W, H, lines, opts) {
    g.clearRect(0, 0, W, H);
    const pad = 14;
    roundRect(g, pad, pad, W - pad * 2, H - pad * 2, Math.min(56, H * 0.24));
    g.fillStyle = opts.bg || 'rgba(255,255,255,0.96)';
    g.fill();
    g.lineWidth = 12;
    g.strokeStyle = opts.border || '#5ad1ff';
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const n = lines.length;
    for (let i = 0; i < n; i++) {
      const L = typeof lines[i] === 'string' ? { t: lines[i] } : lines[i];
      let size = L.size || opts.size || (n === 1 ? H * 0.46 : H * 0.3);
      g.font = `900 ${size}px ${FONT}`;
      const maxW = W - pad * 2 - 50;
      while (g.measureText(L.t).width > maxW && size > 18) { size -= 4; g.font = `900 ${size}px ${FONT}`; }
      const y = n === 1 ? H / 2 + 4 : pad + (H - pad * 2) * (i + 0.5) / n + 3;
      g.fillStyle = L.color || opts.color || '#1d2b45';
      g.fillText(L.t, W / 2, y);
    }
  }
  function cardSprite(lines, opts, scale) {
    const cv = cardCanvas(lines, opts);
    const m = new THREE.SpriteMaterial({ map: tex(cv), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    const aspect = cv.width / cv.height;
    const h = scale || 1.2;
    s.scale.set(h * aspect, h, 1);
    s.userData.cv = cv;
    return s;
  }
  function redrawSprite(s, lines, opts) {
    const cv = s.userData.cv;
    drawCard(cv.getContext('2d'), cv.width, cv.height, lines, opts || {});
    s.material.map.needsUpdate = true;
  }

  // =====================================================================
  // ⭐ star coins
  // =====================================================================
  const COIN_CAP = 180;
  const coins = [];             // { x, y, z, isle, gid, bit, alive, fly, fx, fy, fz, ph, course }
  const groupsById = {};        // gid -> { coins: [], persist: bool, cx, cz, isle }
  let coinMesh = null;
  const activeCoins = [];
  let activeN = 0, coinScanT = 0, respawnScanT = 0;
  let combo = 0, lastCoinAt = -10;
  let flyingN = 0;

  function starGeometry() {
    const s = new THREE.Shape();
    const n = 5, R = 0.46, r = 0.24;
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2;
      const rr = i % 2 ? r : R;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 1, curveSegments: 1,
    });
    g.center();
    return g;
  }

  function addCoin(gid, x, y, z, isle, course) {
    const g = groupsById[gid];
    const c = { x, y, z, isle: isle || null, isleObj: isle ? ctx.isleById(isle) : null, gid, bit: g.coins.length, alive: true, fly: 0, fx: 0, fy: 0, fz: 0,
      ph: Math.random() * 6.28, course: course || null };
    g.coins.push(c);
    coins.push(c);
    return c;
  }
  function newGroup(gid, persist, isle) {
    groupsById[gid] = { gid, coins: [], persist, isle: isle || null, cx: 0, cz: 0 };
    return groupsById[gid];
  }
  function finishGroup(g) {
    let sx = 0, sz = 0;
    for (const c of g.coins) { sx += c.x; sz += c.z; }
    g.cx = sx / Math.max(1, g.coins.length);
    g.cz = sz / Math.max(1, g.coins.length);
    // restore collected state from the save
    const st = g.persist && P.groups[g.gid];
    if (st) for (const c of g.coins) if (st.got & (1 << c.bit)) c.alive = false;
  }
  // line / arc of coins between a and b (arc: parabola h above the chord)
  function linePoints(a, b, n, h, out) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (h || 0) * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
    return out;
  }

  function buildWorldCoins() {
    for (const def of SKY_COIN_GROUPS) {
      const isle = ctx.isleById(def.isle);
      if (!isle) continue;
      const g = newGroup(def.id, true, def.isle);
      const pts = [];
      if (def.shape === 'ring') {
        for (let i = 0; i < def.n; i++) {
          const a = i / def.n * Math.PI * 2;
          pts.push([Math.cos(a) * def.r, def.y, Math.sin(a) * def.r]);
        }
      } else {
        linePoints(def.a, def.b, def.n, def.shape === 'arc' ? def.h : 0, pts);
      }
      for (const p of pts.slice(0, 31)) addCoin(def.id, isle.pos[0] + p[0], p[1], isle.pos[2] + p[2], def.isle);
      finishGroup(g);
    }
    buildBridgeCoins();
  }
  // trails along every walkable bridge (same geometry as buildBridge in js/sky.js)
  function buildBridgeCoins() {
    const s = ctx.save;
    for (const b of SKY_BRIDGES) {
      if (b.quest && !(s.bridgesBuilt && s.bridgesBuilt[b.quest])) continue;
      if (b.switch && !(s.stairsBuilt && s.stairsBuilt[b.switch])) continue;
      const A = ctx.isleById(b.from), B = ctx.isleById(b.to);
      if (!A || !B || A.secret || B.secret) continue;
      const ax = A.pos[0], az = A.pos[2], bx = B.pos[0], bz = B.pos[2];
      const dist = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / dist, uz = (bz - az) / dist;
      const sx = ax + ux * (A.r - 2), sz = az + uz * (A.r - 2), sy = A.pos[1];
      const ex = bx - ux * (B.r - 2), ez = bz - uz * (B.r - 2), ey = B.pos[1];
      const span = Math.hypot(ex - sx, ez - sz);
      const gid = `cg_br_${b.from}_${b.to}`;
      const g = newGroup(gid, true, null);
      if (b.style === 'stepstones') {
        const climb = Math.abs(ey - sy);
        const n = Math.max(3, Math.round(span / 3.4), Math.ceil(climb / 1.3));
        const wobble = climb > span * 0.25 ? 0 : 0.5;
        for (let i = 1; i < n && g.coins.length < 30; i += 1) {
          if (n > 14 && i % 2) continue;
          const t = i / n;
          addCoin(gid, sx + (ex - sx) * t, sy + (ey - sy) * t + Math.sin(i * 1.7) * wobble + 1.3, sz + (ez - sz) * t);
        }
      } else {
        const n = Math.max(2, Math.round(span / 3));
        for (let i = 0; i < n && g.coins.length < 30; i += 2) {
          const t = (i + 0.5) / n;
          addCoin(gid, sx + (ex - sx) * t, sy + (ey - sy) * t + 1.1, sz + (ez - sz) * t);
        }
      }
      finishGroup(g);
    }
  }

  function buildCoinMesh() {
    coinMesh = new THREE.InstancedMesh(starGeometry(), mat(0xffd23f, 0x8a5600), COIN_CAP);
    coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    coinMesh.frustumCulled = false;
    coinMesh.count = 0;
    coinMesh.castShadow = false;
    ctx.scene.add(coinMesh);
    _m4.obj = new THREE.Object3D();
  }

  function coinWorldY(c) { return c.isleObj ? c.isleObj.pos[1] + ctx.bobOf(c.isle) + c.y : c.y; }

  function scanCoins() {
    const px = ctx.pos.x, py = ctx.pos.y, pz = ctx.pos.z;
    const R2 = (ctx.lowPower() ? 55 : 75) ** 2;
    activeN = 0;
    for (let i = 0; i < coins.length && activeN < COIN_CAP; i++) {
      const c = coins[i];
      if (!c.alive) continue;
      const dx = c.x - px, dz = c.z - pz;
      const dy = (c.isle ? 0 : c.y) - (c.isle ? 0 : py);
      if (dx * dx + dz * dz + dy * dy * 0.25 > R2) continue;
      activeCoins[activeN++] = c;
    }
  }

  function magnetRadius() { return SKY_COIN_RULES.magnet * (1 + petPerks.magnet); }

  function updateCoins(dt) {
    coinScanT -= dt;
    if (coinScanT <= 0 || flyingN > 0) { coinScanT = 0.25; scanCoins(); }
    respawnScanT -= dt;
    if (respawnScanT <= 0) { respawnScanT = 5; respawnGroups(); }
    const px = ctx.pos.x, py = ctx.pos.y + 1.0, pz = ctx.pos.z;
    const mr = magnetRadius(), mr2 = mr * mr;
    const o = _m4.obj;
    let n = 0;
    flyingN = 0;
    for (let i = 0; i < activeN; i++) {
      const c = activeCoins[i];
      if (!c.alive) continue;
      let x, y, z;
      if (c.fly > 0) {
        c.fly += dt / 0.2;
        const k = Math.min(1, c.fly);
        x = c.fx + (px - c.fx) * k; y = c.fy + (py - c.fy) * k; z = c.fz + (pz - c.fz) * k;
        flyingN++;
        if (c.fly >= 1) { collectCoin(c); continue; }
      } else {
        x = c.x; z = c.z;
        y = coinWorldY(c) + Math.sin(simT * 2.2 + c.ph) * 0.12;
        const dx = x - px, dy = y - py, dz = z - pz;
        if (ctx.playing && !lockedFlag && dx * dx + dz * dz + dy * dy < mr2) {
          c.fly = 0.0001; c.fx = x; c.fy = y; c.fz = z;
        }
      }
      o.position.set(x, y, z);
      o.rotation.set(0, simT * 3 + c.ph, 0);
      const s = c.fly > 0 ? 1 - c.fly * 0.6 : 1;
      o.scale.set(s, s, s);
      o.updateMatrix();
      coinMesh.setMatrixAt(n++, o.matrix);
    }
    coinMesh.count = n;
    coinMesh.instanceMatrix.needsUpdate = true;
  }

  function collectCoin(c) {
    c.alive = false;
    c.fly = 0;
    if (simT - lastCoinAt < SKY_COIN_RULES.comboWindow) combo++; else combo = 0;
    lastCoinAt = simT;
    const lucky = Math.random() < petPerks.lucky;
    const v = lucky ? 2 : 1;
    P.coins += v;
    P.coinsTotal += v;
    coinChime(combo);
    if (lucky) blip(1568, 0.2, 'sine', 0.06, 0.06);
    hudCoins(true, lucky ? '+2 🍀' : null);
    const g = groupsById[c.gid];
    if (g && g.persist) {
      const st = P.groups[c.gid] || (P.groups[c.gid] = { t: Date.now(), got: 0 });
      st.got |= (1 << c.bit);
      persistSoon();
    }
    ctx.emitFx('coin', { x: c.x, y: ctx.pos.y + 1, z: c.z, combo });
    petsCheer(combo);
  }

  // world groups refill SKY_COIN_RULES.respawnMin minutes after their first coin was taken
  function respawnGroups() {
    const now = Date.now(), wait = SKY_COIN_RULES.respawnMin * 60000;
    for (const gid in P.groups) {
      const st = P.groups[gid];
      if (!st || now - st.t < wait) continue;
      delete P.groups[gid];
      const g = groupsById[gid];
      if (g) for (const c of g.coins) { c.alive = true; c.fly = 0; }
      persistSoon();
      coinScanT = 0;
    }
  }
  function resetCourseCoins(C) {
    for (const c of C.coins) { c.alive = true; c.fly = 0; }
    coinScanT = 0;
  }

  // =====================================================================
  // 🐾 pets — procedural chunky toys
  // =====================================================================
  const petPerks = { magnet: 0, lucky: 0 };
  const followers = [];      // { def, mesh, x, y, z, yaw, hop, spin, slot }
  function petDef(id) { return SKY_PETS.find(p => p.id === id); }

  // part helper: adds an ellipsoid (sphere scaled) / capsule / rounded box to g
  function part(g, geo, m, x, y, z, sx, sy, sz, rx, ry, rz, anim) {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    me.scale.set(sx, sy, sz);
    me.rotation.set(rx || 0, ry || 0, rz || 0);
    if (anim) me.userData.anim = anim;
    g.add(me);
    return me;
  }
  function buildPet(def, forThumb) {
    const g = new THREE.Group();
    const glow = def.glow || 0;
    const shiny = def.rarity === 'epic' || def.rarity === 'legendary';
    const body = mat(def.body, shiny && def.id === 'jellyfish' ? 0x1a4a7a : (def.id === 'whale' ? 0x0a1450 : 0));
    const belly = mat(def.belly);
    const acc = mat(def.accent, shiny ? glow : 0);
    const glowM = mat(def.accent, glow || def.accent);
    const black = mat(0x1a1a24);
    const white = mat(0xffffff, 0x666666);
    const pink = mat(0xff9eb5);
    const SP = sphere(18), SPs = sphere(10);
    const has = x => def.extras.includes(x);
    // body: a soft rounded bean-cube (head and body in one, pet-sim style)
    if (has('dome')) {
      part(g, SP, body, 0, 0.1, 0, 0.55, 0.5, 0.55);
      part(g, SP, glowM, 0, -0.18, 0, 0.5, 0.12, 0.5);
    } else if (def.id === 'whale') {
      part(g, SP, body, 0, 0, 0, 0.6, 0.48, 0.68);
      part(g, SP, belly, 0, -0.16, 0.08, 0.5, 0.32, 0.56);
    } else {
      part(g, rbox(1, 0.92, 0.9), body, 0, 0, 0, 1, 1, 1);
      part(g, SP, belly, 0, -0.12, 0.38, 0.32, 0.28, 0.12);
    }
    const fz = def.id === 'whale' ? 0.6 : (has('dome') ? 0.48 : 0.45);
    // eyes
    const eyeR = has('bigeyes') ? 0.14 : 0.1;
    const eyeY = has('frogeyes') ? 0.46 : (def.id === 'whale' ? 0.02 : 0.1);
    for (const sx of [-1, 1]) {
      const ex = sx * (has('bigeyes') ? 0.22 : 0.2);
      if (has('frogeyes')) part(g, SPs, body, ex, 0.42, 0.18, 0.2, 0.18, 0.2);
      if (has('bigeyes')) part(g, SPs, white, ex, eyeY, fz - 0.02, 0.2, 0.2, 0.06);
      if (has('patches')) part(g, SPs, acc, ex, eyeY, fz - 0.03, 0.17, 0.2, 0.07, 0, 0, sx * 0.5);
      part(g, SPs, black, ex, eyeY, fz + (has('frogeyes') ? -0.1 : 0.01), eyeR, eyeR * 1.15, eyeR * 0.6);
      part(g, SPs, white, ex + 0.035, eyeY + 0.05, fz + 0.05 + (has('frogeyes') ? -0.1 : 0), eyeR * 0.32, eyeR * 0.32, eyeR * 0.25);
      if (has('cheeks')) part(g, SPs, pink, sx * 0.33, -0.06, fz - 0.03, 0.09, 0.06, 0.04);
    }
    // ears
    for (const sx of [-1, 1]) {
      switch (def.ears) {
        case 'long':
          part(g, capsule(), body, sx * 0.2, 0.78, -0.02, 0.2, 0.4, 0.14, 0, 0, sx * -0.18);
          part(g, capsule(), pink, sx * 0.2, 0.8, 0.04, 0.1, 0.3, 0.06, 0, 0, sx * -0.18);
          break;
        case 'pointy':
          part(g, SP, body, sx * 0.3, 0.56, -0.02, 0.16, 0.24, 0.1, 0, 0, sx * -0.4);
          part(g, SP, def.id === 'fox' ? acc : pink, sx * 0.3, 0.58, 0.03, 0.08, 0.14, 0.05, 0, 0, sx * -0.4);
          break;
        case 'round': part(g, SPs, acc, sx * 0.34, 0.47, -0.02, 0.16, 0.16, 0.1); break;
        case 'floppy': part(g, SP, acc, sx * 0.53, 0.12, 0, 0.12, 0.3, 0.2, 0, 0, sx * 0.25); break;
        case 'tuft': part(g, SP, acc, sx * 0.3, 0.52, 0, 0.1, 0.2, 0.08, 0, 0, sx * -0.55); break;
      }
    }
    // face bits
    if (has('beak')) part(g, SPs, mat(def.id === 'penguin' || def.id === 'chick' || def.id === 'owl' ? 0xffa21a : def.accent, def.id === 'phoenix' ? 0x7a3a00 : 0), 0, -0.02, fz + 0.06, 0.1, 0.07, 0.1);
    if (has('nose')) part(g, SPs, black, 0, -0.02, fz + 0.03, 0.06, 0.045, 0.05);
    if (has('snout')) {
      part(g, SP, acc, 0, -0.05, fz + 0.03, 0.17, 0.12, 0.08);
      part(g, SPs, black, -0.05, -0.05, fz + 0.1, 0.025, 0.035, 0.02);
      part(g, SPs, black, 0.05, -0.05, fz + 0.1, 0.025, 0.035, 0.02);
    }
    if (has('tuft')) part(g, SP, acc, 0, 0.55, 0.05, 0.08, 0.14, 0.08, -0.3);
    if (has('horn')) {
      const horn = new THREE.Mesh(GEO.horn || (GEO.horn = new THREE.CylinderGeometry(0.02, 0.09, 0.42, 10, 3)), mat(0xffe27a, def.glow || 0xffd84a));
      horn.position.set(0, 0.66, 0.16); horn.rotation.x = 0.35; g.add(horn);
    }
    if (has('horns')) for (const sx of [-1, 1]) part(g, capsule(), mat(0xfff2c8, 0x3a3010), sx * 0.24, 0.55, -0.05, 0.08, 0.14, 0.08, -0.4, 0, sx * -0.4);
    if (has('crest')) for (let i = 0; i < 3; i++) part(g, SP, glowM, (i - 1) * 0.1, 0.55 + (i === 1 ? 0.08 : 0), -0.05, 0.07, 0.2, 0.07, -0.4, 0, (i - 1) * -0.4);
    if (has('mane')) for (let i = 0; i < 4; i++) part(g, SP, mat([0xff8fd8, 0x9fd8ff, 0xc7a0ff, 0xfff27a][i], shiny ? 0x2a1a30 : 0), 0, 0.42 - i * 0.16, -0.38 - i * 0.04, 0.16, 0.13, 0.13);
    if (has('spines')) for (let i = 0; i < 3; i++) part(g, SP, acc, 0, 0.44 - i * 0.2, -0.42, 0.07, 0.12, 0.1, -0.5);
    if (has('stars')) for (let i = 0; i < 7; i++) {
      const a = i * 2.1, yy = 0.05 + Math.sin(i * 1.7) * 0.22;
      part(g, SPs, mat(0xfff27a, 0xfff27a), Math.cos(a) * 0.5, yy, Math.sin(a) * 0.5 - 0.05, 0.035, 0.035, 0.035);
    }
    if (has('spout')) for (let i = 0; i < 3; i++) part(g, SPs, mat(0x9fe8ff, 0x3a9adf), (i - 1) * 0.08, 0.6 + (i === 1 ? 0.12 : 0), -0.05, 0.05, 0.08, 0.05, 0, 0, 0, 'spout');
    // wings / flippers
    if (has('wings')) for (const sx of [-1, 1]) part(g, SP, def.id === 'phoenix' ? glowM : acc, sx * 0.6, 0.15, -0.12, 0.34, 0.08, 0.22, 0, sx * 0.3, sx * 0.3, sx > 0 ? 'wingR' : 'wingL');
    if (has('tinywings')) for (const sx of [-1, 1]) part(g, SP, acc, sx * 0.53, -0.05, -0.02, 0.1, 0.2, 0.16, 0, 0, sx * 0.3, sx > 0 ? 'wingR' : 'wingL');
    if (has('flippers')) for (const sx of [-1, 1]) part(g, SP, body, sx * 0.52, -0.12, 0.02, 0.09, 0.26, 0.14, 0, 0, sx * 0.4, sx > 0 ? 'wingR' : 'wingL');
    if (has('tentacles')) for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      part(g, capsule(), i % 2 ? glowM : body, Math.cos(a) * 0.3, -0.42, Math.sin(a) * 0.3, 0.08, 0.32, 0.08, 0, 0, 0, 'tent' + i);
    }
    // tails
    switch (def.tail) {
      case 'puff': part(g, SPs, belly, 0, -0.18, -0.5, 0.16, 0.16, 0.16); break;
      case 'curl': {
        const t = new THREE.Mesh(GEO.curl || (GEO.curl = new THREE.TorusGeometry(0.1, 0.04, 8, 16, Math.PI * 1.6)), acc);
        t.position.set(0, -0.05, -0.5); g.add(t); t.userData.anim = 'tail';
        break;
      }
      case 'wag': part(g, capsule(), acc, 0, 0.0, -0.52, 0.09, 0.22, 0.09, -0.8, 0, 0, 'tail'); break;
      case 'fluffy':
        part(g, SP, body, 0, 0.05, -0.62, 0.22, 0.22, 0.4, -0.5, 0, 0, 'tail');
        part(g, SP, belly, 0, 0.3, -0.92, 0.15, 0.15, 0.17, -0.5, 0, 0, 'tail');
        break;
      case 'mane': break;
      case 'spike': part(g, capsule(), body, 0, -0.18, -0.6, 0.12, 0.3, 0.12, -1.2, 0, 0, 'tail'); break;
      case 'flame':
        for (let i = 0; i < 3; i++) part(g, SP, mat([0xffe14a, 0xff9a2a, 0xff5a1a][i], [0xffb000, 0xff6a00, 0xff3000][i]), (i - 1) * 0.12, 0.05 - i * 0.04, -0.55 - i * 0.06, 0.1, 0.12, 0.34, -0.6 + i * 0.15, (i - 1) * 0.4, 0, 'flame');
        break;
      case 'fin':
        for (const sx of [-1, 1]) part(g, SP, body, sx * 0.2, 0.12, -0.78, 0.24, 0.06, 0.14, 0, sx * 0.5, 0, 'tail');
        break;
    }
    // little feet (floating pets keep them tucked)
    if (!has('dome') && def.id !== 'whale' && def.id !== 'phoenix') {
      for (const sx of [-1, 1]) part(g, SPs, def.id === 'chick' || def.id === 'penguin' ? mat(0xffa21a) : belly, sx * 0.24, -0.47, 0.18, 0.13, 0.08, 0.15);
    }
    // aura: orbiting sparkles for legendaries
    if (has('aura') && !forThumb) {
      const ring = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        part(ring, SPs, mat(def.glow || 0xfff27a, def.glow || 0xfff27a), Math.cos(a) * 0.85, Math.sin(a * 2) * 0.15, Math.sin(a) * 0.85, 0.05, 0.05, 0.05);
      }
      mergeStatic(ring, true);
      ring.userData.anim = 'aura';
      g.add(ring);
    }
    return mergeStatic(g, true);
  }
  // merge every non-animated part by material → a handful of draw calls per pet
  function mergeStatic(g, noShadow) {
    const BGU = THREE.BufferGeometryUtils;
    if (!BGU || !BGU.mergeGeometries) return g;
    const byMat = new Map();
    const keep = [];
    g.updateMatrixWorld(true);
    for (const ch of g.children.slice()) {
      if (!ch.isMesh || ch.userData.anim) { keep.push(ch); continue; }
      const geo = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone();
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      geo.applyMatrix4(ch.matrix);
      if (!byMat.has(ch.material)) byMat.set(ch.material, []);
      byMat.get(ch.material).push(geo);
      g.remove(ch);
    }
    for (const [m, geos] of byMat) {
      const merged = BGU.mergeGeometries(geos, false);
      geos.forEach(x => x.dispose());
      if (!merged) continue;
      const me = new THREE.Mesh(merged, m);
      me.castShadow = !noShadow;
      me.receiveShadow = true;
      g.add(me);
    }
    return g;
  }

  function recomputePerks() {
    petPerks.magnet = 0; petPerks.lucky = 0;
    for (const id of P.equip) {
      const d = petDef(id), st = P.pets[id];
      if (!d || !st) continue;
      const k = 1 + 0.1 * ((st.stars || 1) - 1);
      petPerks.magnet += (d.perk.magnet || 0) * k;
      petPerks.lucky += (d.perk.lucky || 0) * k;
    }
    petPerks.lucky = Math.min(0.5, petPerks.lucky);
  }
  function refreshFollowers() {
    for (const f of followers) { ctx.scene.remove(f.mesh); }
    followers.length = 0;
    P.equip.forEach((id, slot) => {
      const d = petDef(id);
      if (!d) return;
      const mesh = buildPet(d);
      mesh.scale.setScalar(0.62);
      ctx.scene.add(mesh);
      followers.push({ def: d, mesh, x: ctx.pos.x, y: ctx.pos.y + 2, z: ctx.pos.z, yaw: 0, hop: 0, spin: 0, slot,
        ph: Math.random() * 6 });
    });
    recomputePerks();
  }
  function petsCheer(c) {
    if (c > 0 && c % 6 === 0) for (const f of followers) f.spin = 1;
  }
  function updatePets(dt) {
    if (!followers.length) return;
    const px = ctx.pos.x, py = ctx.pos.y, pz = ctx.pos.z;
    const yaw = ctx.heroYaw;
    const bx = -Math.sin(yaw), bz = -Math.cos(yaw);   // behind the hero
    const sx = -bz, sz = bx;                             // hero's side
    const k = 1 - Math.exp(-dt * 4.5);
    for (const f of followers) {
      const side = followers.length === 1 ? 0.9 : (f.slot === 0 ? 1.15 : -1.15);
      const tx = px + bx * 1.7 + sx * side;
      const tz = pz + bz * 1.7 + sz * side;
      const bob = Math.sin(simT * 2.6 + f.ph) * 0.18;
      f.hop = Math.max(0, f.hop - dt * 2.2);
      const hopY = Math.sin(f.hop * Math.PI) * 0.9;
      const ty = py + 1.55 + bob + hopY;
      f.x += (tx - f.x) * k; f.z += (tz - f.z) * k; f.y += (ty - f.y) * Math.min(1, k * 1.6);
      // teleport catch-up (respawn / portal)
      if (Math.abs(f.x - px) + Math.abs(f.z - pz) > 30) { f.x = tx; f.y = ty; f.z = tz; }
      const vx = tx - f.x, vz = tz - f.z;
      const targetYaw = Math.hypot(vx, vz) > 0.25 ? Math.atan2(vx, vz) : yaw;
      let d = targetYaw - f.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      f.yaw += d * Math.min(1, dt * 6);
      f.spin = Math.max(0, f.spin - dt * 1.4);
      f.mesh.position.set(f.x, f.y, f.z);
      f.mesh.rotation.set(Math.sin(simT * 1.7 + f.ph) * 0.06, f.yaw + (1 - f.spin) * 0 + f.spin * Math.PI * 4, Math.sin(simT * 2.1 + f.ph) * 0.05);
      animParts(f.mesh, simT + f.ph);
    }
  }
  function animParts(g, t) {
    for (const ch of g.children) {
      const a = ch.userData.anim;
      if (!a) continue;
      if (a === 'wingL') ch.rotation.z = -0.3 - Math.sin(t * 10) * 0.5;
      else if (a === 'wingR') ch.rotation.z = 0.3 + Math.sin(t * 10) * 0.5;
      else if (a === 'tail') ch.rotation.y = Math.sin(t * 7) * 0.45;
      else if (a === 'ear') ch.rotation.x = Math.sin(t * 3) * 0.12;
      else if (a === 'flame') {
        if (!ch.userData.sy0) ch.userData.sy0 = ch.scale.y;
        ch.scale.y = ch.userData.sy0 * (1 + Math.sin(t * 14 + ch.position.x * 9) * 0.18);
      }
      else if (a === 'aura') ch.rotation.y = t * 1.6;
      else if (a === 'spout') ch.position.y = 0.6 + ((t * 0.9 + ch.position.x * 3) % 1) * 0.3;
      else if (a.startsWith('tent')) ch.rotation.x = Math.sin(t * 3 + ch.position.x * 5) * 0.35;
    }
  }

  // thumbnails for the collection panel (rendered once per pet into a render target)
  const thumbs = {};
  let thumbRig = null;
  const SRGB = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    SRGB[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  }
  function petThumb(def) {
    if (thumbs[def.id]) return thumbs[def.id];
    const S = 160;
    try {
      if (!thumbRig) {
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 2.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2.4);
        sun.position.set(2, 3, 4);
        scene.add(sun);
        const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        cam.position.set(0.75, 0.5, 2.7);
        cam.lookAt(0, 0.05, 0);
        const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
        thumbRig = { scene, cam, rt, buf: new Uint8Array(S * S * 4) };
      }
      const mesh = buildPet(def, true);
      mesh.rotation.y = -0.35;
      thumbRig.scene.add(mesh);
      const r = ctx.renderer;
      const prevTarget = r.getRenderTarget();
      const prevClear = r.getClearAlpha();
      const prevColor = r.getClearColor(new THREE.Color());
      r.setRenderTarget(thumbRig.rt);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(thumbRig.scene, thumbRig.cam);
      r.readRenderTargetPixels(thumbRig.rt, 0, 0, S, S, thumbRig.buf);
      r.setRenderTarget(prevTarget);
      r.setClearColor(prevColor, prevClear);
      thumbRig.scene.remove(mesh);
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const g = cv.getContext('2d');
      const img = g.createImageData(S, S);
      const sil = g.createImageData(S, S);
      const b = thumbRig.buf;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const si = ((S - 1 - y) * S + x) * 4, di = (y * S + x) * 4;
          const a = b[si + 3];
          img.data[di] = SRGB[b[si]]; img.data[di + 1] = SRGB[b[si + 1]]; img.data[di + 2] = SRGB[b[si + 2]];
          img.data[di + 3] = a;
          sil.data[di] = 20; sil.data[di + 1] = 26; sil.data[di + 2] = 48; sil.data[di + 3] = a ? 235 : 0;
        }
      }
      g.putImageData(img, 0, 0);
      const url = cv.toDataURL();
      g.clearRect(0, 0, S, S);
      g.putImageData(sil, 0, 0);
      thumbs[def.id] = { url, sil: cv.toDataURL() };
    } catch (e) {
      console.warn('[sky-play] pet thumbnail failed', e);
      thumbs[def.id] = { url: '', sil: '' };
    }
    return thumbs[def.id];
  }

  // =====================================================================
  // 🥚 egg stand + hatching
  // =====================================================================
  let stand = null;      // { group, eggs:[], x, z, y, yaw, target }
  function eggCanvas(shell, spot, cracks) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    paintEgg(cv.getContext('2d'), shell, spot, cracks || 0);
    return cv;
  }
  function hexCss(h) { return '#' + h.toString(16).padStart(6, '0'); }
  function paintEgg(g, shell, spot, cracks) {
    g.fillStyle = hexCss(shell);
    g.fillRect(0, 0, 256, 128);
    const rnd = ctx.mulberry32(shell ^ spot);
    g.fillStyle = hexCss(spot);
    for (let i = 0; i < 16; i++) {
      g.beginPath();
      g.ellipse(rnd() * 256, 20 + rnd() * 88, 8 + rnd() * 12, 6 + rnd() * 9, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // zig-zag band
    g.strokeStyle = hexCss(spot);
    g.lineWidth = 7;
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, 64 + ((x / 16) % 2 ? 9 : -9));
    g.stroke();
    if (cracks > 0) {
      g.strokeStyle = '#2a1a10';
      g.lineWidth = 4;
      for (let k = 0; k < cracks; k++) {
        const cx = 40 + k * 70;
        g.beginPath();
        g.moveTo(cx, 10);
        let y = 10, x = cx;
        while (y < 100) { x += (rnd() - 0.5) * 30; y += 10 + rnd() * 12; g.lineTo(x, y); }
        g.stroke();
      }
    }
  }
  function makeEgg(def, scale) {
    const cv = eggCanvas(def.shell, def.spot, 0);
    const m = ownMat(0xffffff, def.id === 'egg_legend' ? 0x3a2a08 : 0);
    m.map = tex(cv);
    m.needsUpdate = true;
    const egg = new THREE.Mesh(GEO.egg || (GEO.egg = new THREE.SphereGeometry(0.5, 28, 20)), m);
    egg.scale.set(scale, scale * 1.28, scale);
    egg.castShadow = false;
    egg.userData.cv = cv;
    egg.userData.def = def;
    return egg;
  }
  function buildStand() {
    const isle = ctx.isleById(SKY_EGG_STAND.isle);
    const ig = ctx.islandGroups[SKY_EGG_STAND.isle];
    if (!isle || !ig) return;
    const g = new THREE.Group();
    g.position.set(SKY_EGG_STAND.dx, 0, SKY_EGG_STAND.dz);
    // face the spawn point (island centre)
    const yaw = Math.atan2(-SKY_EGG_STAND.dx, -SKY_EGG_STAND.dz);
    g.rotation.y = yaw;
    const wood = mat(0xc98a4e), cream = mat(0xfff4e0), pinkM = mat(0xff8fb8), mint = mat(0x7fe0c8);
    const add = (geo, m, x, y, z, sx, sy, sz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (sx) me.scale.set(sx, sy, sz); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
    add(rbox(4.6, 1.2, 1.7), wood, 0, 0.6, 0);
    add(rbox(4.9, 0.22, 1.95), cream, 0, 1.3, 0);
    add(rbox(4.2, 0.5, 0.12), pinkM, 0, 0.65, 0.86);
    for (const sx of [-2.15, 2.15]) add(rbox(0.32, 3.4, 0.32), cream, sx, 2.6, -0.55);
    // striped awning
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 32;
    const c2 = cv.getContext('2d');
    for (let i = 0; i < 8; i++) { c2.fillStyle = i % 2 ? '#ffffff' : '#ff7aa8'; c2.fillRect(i * 32, 0, 32, 32); }
    const awM = ownMat(0xffffff, 0);
    awM.map = tex(cv);
    const aw = add(rbox(5.4, 0.36, 2.5), awM, 0, 4.3, 0.1);
    aw.rotation.x = 0.18;
    // scalloped trim
    for (let i = 0; i < 7; i++) add(sphere(10), i % 2 ? cream : pinkM, -2.4 + i * 0.8, 4.0, 1.35, 0.4, 0.25, 0.18);
    // eggs on pedestals
    const eggs = [];
    SKY_EGGS.forEach((def, i) => {
      const x = (i - 1) * 1.45;
      add(rbox(0.9, 0.3, 0.9), i === 2 ? mat(0xffd84a, 0x4a3000) : mint, x, 1.55, 0);
      const egg = makeEgg(def, 0.85);
      egg.position.set(x, 2.25, 0);
      egg.userData.anim = 'egg';
      g.add(egg);
      eggs.push(egg);
    });
    const sign = cardSprite([{ t: '🥚 寵物蛋 Pet Eggs', color: '#7a2a52' }], { border: '#ff7aa8', h: 220 }, 1.25);
    sign.position.set(0, 5.4, 0.4);
    g.add(sign);
    mergeStatic(g);
    ig.add(g);
    const wx = isle.pos[0] + SKY_EGG_STAND.dx, wz = isle.pos[2] + SKY_EGG_STAND.dz;
    stand = {
      group: g, eggs, isle, x: wx, z: wz, yaw,
      target: { play: true, id: 'eggstand', label: '🥚 寵物蛋商店', use: openShop },
    };
  }
  function updateStand() {
    if (!stand) return;
    stand.eggs.forEach((e, i) => {
      e.rotation.y = simT * 0.8 + i;
      e.position.y = 2.25 + Math.sin(simT * 2 + i * 1.3) * 0.08;
    });
  }

  // ---- hatch state machine ----
  let hatch = null;   // { egg, mesh, step, need, phase, t, pet, dup, beam, top, petMesh, q }
  function rollPet(egg) {
    const odds = egg.odds;
    let total = 0;
    for (const k in odds) total += odds[k];
    let r = Math.random() * total, rar = 'common';
    for (const k in odds) { r -= odds[k]; if (r <= 0) { rar = k; break; } }
    const pool = SKY_PETS.filter(p => p.rarity === rar);
    let wsum = 0;
    const w = pool.map(p => { const x = P.pets[p.id] ? 1 : 2.5; wsum += x; return x; });
    let q = Math.random() * wsum;
    for (let i = 0; i < pool.length; i++) { q -= w[i]; if (q <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function buyEgg(id) {
    const egg = SKY_EGGS.find(e => e.id === id);
    if (!egg) return false;
    if (P.pendingEgg) { startHatch(SKY_EGGS.find(e => e.id === P.pendingEgg)); return true; }
    if (P.coins < egg.price) { ctx.toast(`⭐ 還差 ${egg.price - P.coins} 枚星幣！去跑酷和撿星幣吧`); return false; }
    P.coins -= egg.price;
    P.pendingEgg = egg.id;     // a paid egg survives closing the game until it hatches
    persistNow();
    hudCoins(false);
    startHatch(egg);
    return true;
  }
  function startHatch(egg) {
    closePanel(true);
    const yaw = stand ? stand.yaw : 0;
    // hatch spot: in front of the stand; the player stands further out, camera behind them
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const top = stand.isle.pos[1] + ctx.bobOf(stand.isle.id);
    // hero stands 6 in front of the stand facing it; the egg floats between them, a little to
    // the side and at head height, so the hero never hides it and the stand frames it
    const px = stand.x + fx * 6.4, pz = stand.z + fz * 6.4;
    const sx = fz, sz = -fx;                       // hero's right (screen right)
    const ex = stand.x + fx * 3.2 + sx * 1.9, ez = stand.z + fz * 3.2 + sz * 1.9;
    ctx.setPlayerPos(px, top + 0.05, pz, yaw + Math.PI);
    ctx.cam.theta = yaw;            // camera behind the player, looking at the stand
    ctx.cam.phi = 0.2;
    ctx.cam.radius = 6;
    const mesh = makeEgg(egg, 1.5);
    mesh.position.set(ex, top + 2.0, ez);
    ctx.scene.add(mesh);
    hatch = { egg, mesh, x: ex, z: ez, y: top + 2.0, step: 0, need: egg.q, phase: 'quiz', t: 0, wob: 0, cracks: 0 };
    lockedFlag = true;
    renderHatchQuestion();
  }
  function hatchPool(diff) {
    const pool = (VOCAB_DATA[diff] || VOCAB_DATA.easy).filter(e => /^[A-Za-z]{3,10}$/.test(e.word));
    return pool;
  }
  function zhShort(entry) {
    const zh = entry.zh || '';
    const m = zh.match(/\*\*([^*]+)\*\*/);
    return m ? m[1] : zh.split(' — ')[0];
  }
  function pickWords(diff, n) {
    const pool = hatchPool(diff);
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const e = pool[Math.floor(Math.random() * pool.length)];
      if (used.has(e.word) || used.has(zhShort(e))) continue;
      used.add(e.word); used.add(zhShort(e));
      out.push(e);
    }
    return out;
  }
  function renderHatchQuestion() {
    if (!hatch) return;
    const nOpt = hatch.egg.diff === 'easy' ? 3 : 4;
    const opts = pickWords(hatch.egg.diff, nOpt);
    const ans = opts[Math.floor(Math.random() * opts.length)];
    hatch.q = { ans, opts };
    const listen = hatch.step % 2 === 1;
    const dots = '●'.repeat(hatch.step) + '○'.repeat(hatch.need - hatch.step);
    showPanel('hatch', `
      <div class="aw-hatch-head"><span>${hatch.egg.e} ${hatch.egg.name}</span><span class="aw-hatch-dots">${dots}</span></div>
      <div class="aw-hatch-prompt">${listen
        ? '🔊 蛋寶寶在說哪個英文字？<button class="aw-play-btn small" data-act="say">🔊 再聽一次</button>'
        : `<span class="aw-hatch-emoji">${ans.hint || '❓'}</span> 「${esc(zhShort(ans))}」的英文是？`}</div>
      <div class="aw-hatch-opts">${opts.map((o, i) => `<button class="aw-opt-btn" data-opt="${i}">${esc(o.word)}</button>`).join('')}</div>
      <div class="aw-hatch-sub">答對 ${hatch.need} 題，蛋就會孵化！答錯沒關係，再選一次 💪
        <button class="aw-play-btn ghost small" data-act="later">稍後再孵</button></div>`, true);
    if (listen) TTSManager.speak(ans.word, 'en-US');
  }
  function hatchAnswer(i) {
    if (!hatch || hatch.phase !== 'quiz') return;
    const o = hatch.q.opts[i];
    const btn = panelEl.querySelector(`[data-opt="${i}"]`);
    if (o === hatch.q.ans) {
      btn && btn.classList.add('right');
      panelEl.querySelectorAll('[data-opt]').forEach(b => (b.disabled = true));
      TTSManager.speak(o.word, 'en-US');
      boop(true);
      hatch.step++;
      hatch.wob = 1;
      hatch.cracks = Math.min(3, hatch.step);
      paintEgg(hatch.mesh.userData.cv.getContext('2d'), hatch.egg.shell, hatch.egg.spot, hatch.cracks);
      hatch.mesh.material.map.needsUpdate = true;
      if (hatch.step >= hatch.need) setTimeout(beginCrack, 700);
      else setTimeout(renderHatchQuestion, 900);
    } else {
      btn && (btn.classList.add('wrong'), btn.disabled = true);
      hatch.wob = -0.6;
      SoundManager.playWrong();
    }
  }
  function beginCrack() {
    if (!hatch) return;
    hatch.phase = 'crack';
    hatch.t = 0;
    hatch.pet = rollPet(hatch.egg);
    closePanel(true);
    lockedFlag = true;
  }
  function updateHatch(dt) {
    if (!hatch) return;
    const h = hatch;
    h.t += dt;
    const m = h.mesh;
    if (h.phase === 'quiz') {
      h.wob *= Math.pow(0.04, dt);
      m.rotation.z = Math.sin(simT * (h.wob < 0 ? 26 : 14)) * 0.35 * Math.abs(h.wob) + Math.sin(simT * 2) * 0.04;
      m.position.y = h.y + Math.sin(simT * 2.2) * 0.12 + Math.max(0, h.wob) * 0.3;
      m.rotation.y += dt * 0.6;
    } else if (h.phase === 'crack') {
      const t = h.t;
      if (t < 1.4) {
        const k = t / 1.4;
        m.rotation.z = Math.sin(t * (20 + k * 30)) * (0.12 + k * 0.3);
        m.position.y = h.y + Math.abs(Math.sin(t * 9)) * 0.3 * k;
        if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) blip(300 + k * 500, 0.06, 'square', 0.03);
      } else if (!h.beam) {
        // crack open: beam of light in the rarity colour, the shell flies apart, pet pops out
        const rar = SKY_PET_RARITY[h.pet.rarity];
        const bm = new THREE.MeshBasicMaterial({ color: rar.hex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
        h.beam = new THREE.Mesh(GEO.beam || (GEO.beam = new THREE.CylinderGeometry(1.1, 1.6, 40, 24, 1, true)), bm);
        h.beam.position.set(h.x, h.y + 18, h.z);
        ctx.scene.add(h.beam);
        m.visible = false;
        h.halves = [0, 1].map(k => {
          const half = new THREE.Mesh(GEO.half || (GEO.half = new THREE.SphereGeometry(0.85, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), m.material);
          half.scale.set(1, 1.28, 1);
          half.position.set(h.x, h.y, h.z);
          if (k) half.rotation.x = Math.PI;
          half.userData.v = k ? -3 : 6;
          ctx.scene.add(half);
          return half;
        });
        h.petMesh = buildPet(h.pet);
        h.petMesh.position.set(h.x, h.y, h.z);
        h.petMesh.scale.setScalar(0.01);
        ctx.scene.add(h.petMesh);
        ctx.flash();
        fanfare();
        if (h.pet.rarity === 'legendary' || h.pet.rarity === 'epic') setTimeout(() => SoundManager.playAchievement(), 400);
      } else {
        const t2 = t - 1.4;
        h.beam.material.opacity = Math.max(0, Math.min(0.55, t2 * 2) - Math.max(0, t2 - 2.2) * 0.4);
        h.beam.scale.x = h.beam.scale.z = 0.6 + Math.sin(simT * 8) * 0.06 + Math.min(1, t2 * 2) * 0.4;
        for (const half of h.halves) {
          half.userData.v -= 12 * dt;
          half.position.y += half.userData.v * dt;
          half.position.x += (half.rotation.x ? -1 : 1) * dt * 1.6;
          half.rotation.z += dt * 4;
        }
        const s = t2 < 0.35 ? (t2 / 0.35) * 2.0 : 2.0 - Math.min(0.35, (t2 - 0.35)) * 1.4;
        h.petMesh.scale.setScalar(Math.max(0.01, s));
        h.petMesh.rotation.y = faceCam(h.petMesh) + Math.max(0, 1 - t2 * 1.6) * Math.PI * 4;
        h.petMesh.position.y = h.y + Math.sin(simT * 2.4) * 0.15;
        animParts(h.petMesh, simT);
        if (t2 > 0.7 && h.phase === 'crack') { h.phase = 'reveal'; revealPet(); }
      }
    } else if (h.phase === 'reveal') {
      const t2 = h.t - 1.4;
      if (h.beam) h.beam.material.opacity = Math.max(0.12, 0.55 - (t2 - 1) * 0.15);
      if (h.petMesh) {
        h.petMesh.rotation.y = faceCam(h.petMesh) + Math.sin(simT * 1.6) * 0.45;
        h.petMesh.position.y = h.y + Math.sin(simT * 2.4) * 0.15;
        animParts(h.petMesh, simT);
      }
      if (h.halves) for (const half of h.halves) { half.userData.v -= 12 * dt; half.position.y += half.userData.v * dt; if (half.position.y < h.y - 30) half.visible = false; }
    }
  }
  function faceCam(o) {
    const c = ctx.camera.position;
    return Math.atan2(c.x - o.position.x, c.z - o.position.z);
  }
  function revealPet() {
    const h = hatch, d = h.pet, rar = SKY_PET_RARITY[d.rarity];
    const had = P.pets[d.id];
    let dupMsg = '';
    if (had) {
      had.n = (had.n || 1) + 1;
      const before = had.stars || 1;
      had.stars = Math.min(5, before + 1);
      const refund = Math.round(h.egg.price * SKY_PET_DUP_REFUND);
      P.coins += refund;
      dupMsg = `已經有 ${d.en} 了！${had.stars > before ? `升級成 ${'★'.repeat(had.stars)}，能力變強` : '已經滿星'}，還退還 ⭐${refund}`;
    } else {
      P.pets[d.id] = { n: 1, stars: 1 };
    }
    P.hatched++;
    P.pendingEgg = null;
    persistNow();
    hudCoins(false);
    recomputePerks();
    ctx.emitFx('hatch', { pet: d.id, rarity: d.rarity });
    setTimeout(() => TTSManager.speak(d.en, 'en-US'), 350);
    const equipped = P.equip.includes(d.id);
    showPanel('reveal', `
      <div class="aw-reveal" style="--rar:${rar.color}">
        <div class="aw-reveal-rar">${'⭐'.repeat(rar.stars)} ${rar.name}</div>
        <div class="aw-reveal-en">${esc(d.en)}</div>
        <div class="aw-reveal-zh">${esc(d.zh)}　<button class="aw-play-btn small" data-act="sayPet">🔊 ${esc(d.en)}</button></div>
        <div class="aw-reveal-perk">${perkText(d, P.pets[d.id].stars)}</div>
        ${dupMsg ? `<div class="aw-reveal-dup">${dupMsg}</div>` : `<div class="aw-reveal-dup">🎉 新寵物！你學會了一個英文字：<b>${esc(d.en)}</b></div>`}
        <div class="aw-reveal-btns">
          ${equipped ? '' : `<button class="aw-play-btn" data-act="equipNew">🐾 帶牠一起冒險</button>`}
          <button class="aw-play-btn ghost" data-act="doneHatch">好耶！</button>
        </div>
      </div>`, true);
  }
  function endHatch() {
    if (!hatch) return;
    const h = hatch;
    for (const o of [h.mesh, h.beam, h.petMesh, ...(h.halves || [])]) if (o) ctx.scene.remove(o);
    hatch = null;
    lockedFlag = false;
  }
  function perkText(d, stars) {
    const k = 1 + 0.1 * ((stars || 1) - 1);
    const bits = [];
    if (d.perk.magnet) bits.push(`🧲 星幣磁吸 +${Math.round(d.perk.magnet * k * 100)}%`);
    if (d.perk.lucky) bits.push(`🍀 雙倍星幣機率 ${Math.round(d.perk.lucky * k * 100)}%`);
    return bits.join('　');
  }

  // =====================================================================
  // 🏁 obby courses
  // =====================================================================
  const courses = [];      // runtime course objects
  let run = null;          // active run
  const GATE = () => SKY_GATE;
  const PALETTES = {
    0x5ad1ff: [0x6fd0ff, 0xffd84a, 0xff8fc8],   // tutorial: sky blue / sun yellow / candy pink
    0xff7ab8: [0xff8fc8, 0xffe066, 0x7fdcff],
    0x7dff9a: [0x7fe08f, 0xffd27a, 0xb08cff],
    0x4fc3ff: [0x5ac8ff, 0xc8f4ff, 0xff9fcf],
    0xff5a2a: [0x5a4a5e, 0x3a3044, 0xffb84a],
  };
  function diffPool(diff) { return diff === 'hard' ? 'hard' : diff === 'medium' ? 'medium' : 'easy'; }

  function buildCourse(def) {
    const I = ctx.isleById(def.isle);
    const ig = ctx.islandGroups[def.isle];
    if (!I || !ig) return;
    const h = def.heading * Math.PI / 180;
    const fx = Math.cos(h), fz = Math.sin(h);
    const rx = fz, rz = -fx;
    const startD = def.els[0].d || 6;
    const ox = I.pos[0] + fx * (I.r + startD / 2 - 0.6), oz = I.pos[2] + fz * (I.r + startD / 2 - 0.6);
    const oy = I.pos[1];
    const a = Math.atan2(fx, fz);
    const ca = Math.cos(a), sa = Math.sin(a);
    const group = new THREE.Group();
    group.position.set(ox, oy, oz);
    group.rotation.y = a;
    ctx.scene.add(group);
    const C = {
      def, I, group, a, ca, sa, ox, oy, oz, fx, fz, rx, rz,
      cols: [], movers: [], spinners: [], vanishers: [], sweeps: [], convs: [], gates: [], checks: [], coins: [],
      start: null, finish: null, minY: oy, maxZ: 0, trophy: null, flags: [],
      world(lx, lz) { return [ox + rx * lx + fx * lz, oz + rz * lx + fz * lz]; },
    };
    const pal = PALETTES[def.color] || [0xffffff, 0xdddddd, def.color];
    let pi = 0, seg = 0;
    const STATIC_TYPES = new Set(['p', 'check', 'start', 'finish', 'kill']);
    const plat = (el, type, color, extra) => {
      const mesh = new THREE.Mesh(rbox(el.w, 0.9, el.d), extra && extra.mat ? extra.mat : mat(color));
      mesh.position.set(el.x || 0, el.y - 0.45, el.z || 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (!STATIC_TYPES.has(type)) { mesh.userData.anim = type; mesh.castShadow = false; }
      group.add(mesh);
      const [wx, wz] = C.world(el.x || 0, el.z || 0);
      const col = {
        kind: 'play', x: wx, z: wz, r: Math.hypot(el.w, el.d) / 2 + 0.1, top: oy + el.y,
        box: { hw: el.w / 2, hd: el.d / 2, c: ca, s: sa },
        off: false, moving: false, mdx: 0, mdz: 0, mdy: 0, myaw: 0,
        play: { C, el, type, seg, mesh },
      };
      ctx.colliders.push(col);
      C.cols.push(col);
      C.minY = Math.min(C.minY, oy + el.y);
      C.maxZ = Math.max(C.maxZ, (el.z || 0) + el.d / 2);
      return col;
    };
    for (const el of def.els) {
      switch (el.t) {
        case 'start': {
          const col = plat({ x: 0, y: 0, z: 0, w: el.w, d: el.d }, 'start', def.color);
          C.start = col;
          // "START" painted flat on the platform (a floating sprite here would sit in the camera's face)
          const cv = cardCanvas([{ t: 'START', color: '#ffffff' }], { bg: hexCss(def.color), border: '#ffffff', h: 256, w: 768 });
          const dm = new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true, depthWrite: false });
          const decal = new THREE.Mesh(new THREE.PlaneGeometry(el.w * 0.8, el.w * 0.8 / 3), dm);
          decal.rotation.set(-Math.PI / 2, 0, Math.PI);
          decal.position.set(0, 0.03, el.d / 2 - 1.1);
          group.add(decal);
          break;
        }
        case 'p': plat(el, 'p', pal[pi++ % 2]); break;
        case 'check': {
          const col = plat(el, 'check', 0xf4f7ff);
          C.checks.push(col);
          // flag
          const pole = new THREE.Mesh(rbox(0.18, 3, 0.18), mat(0xdfe6f0));
          pole.position.set(el.x - el.w / 2 + 0.6, el.y + 1.5, el.z);
          group.add(pole);
          const flagM = ownMat(0x9aa5b5, 0);
          const flag = new THREE.Mesh(rbox(1.3, 0.8, 0.12), flagM);
          flag.position.set(el.x - el.w / 2 + 1.35, el.y + 2.55, el.z);
          group.add(flag);
          const ring = new THREE.Mesh(GEO.cring || (GEO.cring = new THREE.TorusGeometry(0.7, 0.12, 8, 24)), ownMat(0x9aa5b5, 0));
          ring.rotation.x = Math.PI / 2;
          ring.position.set(el.x - el.w / 2 + 0.6, el.y + 0.15, el.z);
          group.add(ring);
          col.play.flag = flag; col.play.ring = ring;
          flag.userData.anim = 'flag'; ring.userData.anim = 'flag';
          break;
        }
        case 'move': {
          const col = plat(el, 'move', pal[2]);
          col.moving = true;
          C.movers.push({ col, el, mesh: col.play.mesh });
          C.minY = Math.min(C.minY, oy + el.y + Math.min(0, el.ay));
          C.maxZ = Math.max(C.maxZ, el.z + el.az + el.d / 2);
          break;
        }
        case 'spin': {
          const col = plat(el, 'spin', pal[2]);
          col.moving = true;
          col.r = Math.hypot(el.w, el.d) / 2 + 0.1;
          const hub = new THREE.Mesh(GEO.hub || (GEO.hub = new THREE.CylinderGeometry(0.6, 0.8, 6, 12)), mat(0x8a96a8));
          hub.position.set(el.x, el.y - 3.8, el.z);
          group.add(hub);
          C.spinners.push({ col, el, mesh: col.play.mesh, ang: 0 });
          break;
        }
        case 'vanish': {
          const m = ownMat(0xb8f0ff, 0x1a5a7a);
          m.transparent = true;
          const col = plat(el, 'vanish', 0, { mat: m });
          C.vanishers.push({ col, el, mesh: col.play.mesh, m });
          break;
        }
        case 'conv': {
          const m = ownMat(0x3a4a5e, 0);
          const cv = document.createElement('canvas');
          cv.width = 64; cv.height = 128;
          const g2 = cv.getContext('2d');
          g2.fillStyle = '#3a4a5e'; g2.fillRect(0, 0, 64, 128);
          g2.fillStyle = '#ffd166';
          for (let k = 0; k < 2; k++) {
            g2.beginPath(); g2.moveTo(8, 50 + k * 64); g2.lineTo(32, 26 + k * 64); g2.lineTo(56, 50 + k * 64);
            g2.lineTo(56, 62 + k * 64); g2.lineTo(32, 38 + k * 64); g2.lineTo(8, 62 + k * 64); g2.fill();
          }
          const t = tex(cv);
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          // rounded-box UVs span each face 0..1: repeat along the belt's long side
          const vlen = Math.hypot(el.vx, el.vz) || 1;
          t.repeat.set(1, Math.max(1, Math.round((Math.abs(el.vz) > Math.abs(el.vx) ? el.d : el.w) / 2)));
          t.rotation = Math.abs(el.vx) > Math.abs(el.vz) ? (el.vx > 0 ? -Math.PI / 2 : Math.PI / 2) : (el.vz > 0 ? 0 : Math.PI);
          t.center.set(0.5, 0.5);
          m.map = t;
          m.emissive && m.emissive.setHex(0x111822);
          const col = plat(el, 'conv', 0, { mat: m });
          // world velocity of the belt
          col.conv = { x: rx * el.vx + fx * el.vz, z: rz * el.vx + fz * el.vz };
          C.convs.push({ col, t, speed: vlen });
          break;
        }
        case 'kill': {
          const m = C.killMat || (C.killMat = ownMat(0xff3355, 0xff1a40));
          const col = plat(el, 'kill', 0, { mat: m });
          col.play.mesh.scale.y = 0.6;
          col.play.mesh.position.y = el.y - 0.27;
          col.play.pulse = m;
          break;
        }
        case 'bounce': {
          const [wx, wz] = C.world(el.x, el.z);
          const padG = new THREE.Group();
          const base = new THREE.Mesh(GEO.bpad || (GEO.bpad = new THREE.CylinderGeometry(1.6, 1.8, 0.5, 20)), mat(0xffe066));
          base.position.y = 0.25;
          padG.add(base);
          const top = new THREE.Mesh(GEO.btop || (GEO.btop = new THREE.CylinderGeometry(1.25, 1.25, 0.16, 20)), ownMat(0xfff27a, 0xffb000));
          top.position.y = 0.52;
          padG.add(top);
          padG.position.set(el.x, el.y - 0.1, el.z);
          group.add(padG);
          const col = { kind: 'pad', x: wx, z: wz, r: 1.6, top: oy + el.y + 0.4, launch: el.launch,
            play: { C, el, type: 'bounce', seg, mesh: padG, top } };
          ctx.colliders.push(col);
          C.cols.push(col);
          break;
        }
        case 'sweep': {
          const bar = new THREE.Group();
          const m = ownMat(0xff3355, 0xff1a40);
          const beam = new THREE.Mesh(capsule(), m);
          beam.rotation.z = Math.PI / 2;
          beam.scale.set(0.42, el.len * 2 / 1.5, 0.42);
          bar.add(beam);
          const post = new THREE.Mesh(rbox(0.5, 0.9, 0.5), mat(0x3a3044));
          post.position.y = -0.45;
          bar.add(post);
          bar.position.set(el.x, el.y + 0.62, el.z);
          group.add(bar);
          const [wx, wz] = C.world(el.x, el.z);
          C.sweeps.push({ el, bar, wx, wz, wy: oy + el.y, ang: 0, m });
          break;
        }
        case 'gate': {
          const G = GATE();
          const gate = { C, el, seg, answers: [], exit: null, sign: null, labels: [], solved: false, missed: false,
            correct: 0, entry: null, opts: [], spoken: false, down: [false, false, false], fallV: [0, 0, 0] };
          [-1, 0, 1].forEach((k, i) => {
            const m = ownMat(0xb8a8ff, 0x2a1a5a);
            const col = plat({ x: k * G.ansX, y: el.y, z: el.z + G.ansZ, w: G.ansW, d: G.ansD }, 'answer', 0, { mat: m });
            col.play.gate = gate; col.play.opt = i; col.play.m = m;
            gate.answers.push(col);
            // the word floats low over the platform's FAR edge: readable on the approach,
            // never over the kid's head once they stand on it
            const lbl = cardSprite(['?'], { border: '#8f6bff', h: 230, w: 760 }, 1.0);
            lbl.position.set(k * G.ansX, el.y + 1.25, el.z + G.ansZ + G.ansD / 2 + 0.2);
            group.add(lbl);
            gate.labels.push(lbl);
          });
          seg++;
          const em = ownMat(def.color, def.color);
          em.transparent = true;
          em.opacity = 0.18;
          const exit = plat({ x: 0, y: el.y, z: el.z + G.exitZ, w: G.exitW, d: G.exitD }, 'exit', 0, { mat: em });
          exit.off = true;
          exit.play.m = em;
          gate.exit = exit;
          const sign = cardSprite(['🪧'], { border: '#ffd166', h: 300, w: 1200 }, 1.7);
          sign.position.set(0, el.y + 4.0, el.z + G.ansZ + G.ansD / 2 + 2.2);   // behind the doors, above the exit
          group.add(sign);
          gate.sign = sign;
          C.gates.push(gate);
          break;
        }
        case 'finish': {
          const col = plat({ x: el.x, y: el.y, z: el.z, w: 6, d: 6 }, 'finish', 0xffd84a);
          C.finish = col;
          const cup = buildTrophy();
          cup.position.set(el.x, el.y + 1.6, el.z + 1.2);
          group.add(cup);
          C.trophy = cup;
          C.finishY = el.y;
          break;
        }
        case 'sign': {
          const s = cardSprite([el.text], { border: hexCss(def.color), h: 190, w: 1300 }, 0.8);
          s.position.set(el.x, el.y, el.z);
          group.add(s);
          break;
        }
        case 'coins': {
          const gid = 'course:' + def.id;
          if (!groupsById[gid]) newGroup(gid, false, null);
          const pts = linePoints(el.a, el.b, el.n, el.h || 0, []);
          for (const p of pts) {
            const [wx, wz] = C.world(p[0], p[2]);
            C.coins.push(addCoin(gid, wx, oy + p[1], wz, null, def.id));
          }
          break;
        }
      }
    }
    // auto coins: one hovering over every platform on the path (rewards following the route)
    const gid = 'course:' + def.id;
    if (!groupsById[gid]) newGroup(gid, false, null);
    for (const col of C.cols) {
      const t = col.play.type;
      if (t !== 'p' && t !== 'move' && t !== 'vanish' && t !== 'conv') continue;
      if (t === 'move') continue;
      C.coins.push(addCoin(gid, col.x, col.top + 1.2, col.z, null, def.id));
    }
    const fin = groupsById[gid];
    if (fin) finishGroup(fin);
    const [mx, mz] = C.world(0, C.maxZ / 2);
    C.cx = mx; C.cz = mz; C.rad = C.maxZ / 2 + 20;
    mergeStatic(group);   // every static platform / pole / hub → one mesh per material
    buildArch(C, ig);
    courses.push(C);
  }

  function buildTrophy() {
    const g = new THREE.Group();
    const gold = mat(0xffcf3a, 0x8a5a00);
    const pts = [];
    const prof = [[0.0, 0], [0.55, 0], [0.6, 0.12], [0.22, 0.25], [0.16, 0.6], [0.28, 0.8], [0.7, 1.05], [0.82, 1.7], [0.78, 1.78], [0.62, 1.2], [0.0, 1.0]];
    for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), gold);
    g.add(cup);
    for (const sx of [-1, 1]) {
      const hdl = new THREE.Mesh(GEO.hdl || (GEO.hdl = new THREE.TorusGeometry(0.32, 0.09, 8, 16, Math.PI * 1.2)), gold);
      hdl.position.set(sx * 0.82, 1.35, 0);
      hdl.rotation.z = sx > 0 ? -Math.PI * 0.6 : Math.PI * 1.6;
      g.add(hdl);
    }
    const star = new THREE.Mesh(coinMesh.geometry, mat(0xfff27a, 0xffc000));
    star.position.y = 2.25;
    star.scale.setScalar(1.3);
    g.add(star);
    g.scale.setScalar(1.15);
    return g;
  }

  function buildArch(C, ig) {
    const def = C.def, I = C.I;
    const g = new THREE.Group();
    const lx = C.fx * (I.r - 2.4), lz = C.fz * (I.r - 2.4);
    g.position.set(lx, 0, lz);
    g.rotation.y = C.a;
    const frame = mat(0xf4f7ff);
    const neon = ownMat(def.color, def.color);
    for (const sx of [-2.7, 2.7]) {
      const p = new THREE.Mesh(rbox(0.9, 4.6, 0.9), frame);
      p.position.set(sx, 2.3, 0); p.castShadow = true; g.add(p);
      const strip = new THREE.Mesh(rbox(0.25, 4.0, 0.95), neon);
      strip.position.set(sx * 0.86, 2.3, 0); g.add(strip);
    }
    const beam = new THREE.Mesh(rbox(6.6, 1.0, 1.0), frame);
    beam.position.set(0, 4.9, 0); beam.castShadow = true; g.add(beam);
    const nb = new THREE.Mesh(rbox(5.0, 0.24, 1.05), neon);
    nb.position.set(0, 4.35, 0); g.add(nb);
    const board = cardSprite(archLines(C), { border: hexCss(def.color), h: 300, w: 1100 }, 1.6);
    board.position.set(0, 6.6, 0);
    g.add(board);
    mergeStatic(g);
    ig.add(g);
    const wx = I.pos[0] + lx, wz = I.pos[2] + lz;
    C.arch = { group: g, board, neon, x: wx, z: wz };
    C.target = { play: true, id: 'arch:' + def.id, label: '', use: () => teleportToStart(C) };
    refreshArchLabel(C);
  }
  function archLines(C) {
    const st = P.courses[C.def.id];
    const diffName = { easy: '簡單', medium: '中等', hard: '困難' }[C.def.diff] || '';
    return [
      { t: `${C.def.e} ${C.def.name}`, color: '#1d2b45' },
      { t: st && st.best ? `🏆 最佳 ${st.best.toFixed(1)} 秒` : `🏁 空中跑酷・${diffName}`, color: st && st.best ? '#b07800' : '#4a6a8a', size: 70 },
    ];
  }
  function refreshArchLabel(C) {
    const st = P.courses[C.def.id];
    C.target.label = `🏁 ${C.def.name}${st && st.best ? `（最佳 ${st.best.toFixed(1)} 秒）` : ''}・走過拱門開始`;
    redrawSprite(C.arch.board, archLines(C), { border: hexCss(C.def.color) });
  }

  function questionFor(gate, diff) {
    const pool = hatchPool(diffPool(diff)).filter(e => e.word.length <= 9 && (gate.el.q !== 'blank' || /_/.test(e.sentence || '')));
    const used = new Set();
    const opts = [];
    let guard = 0;
    while (opts.length < 3 && guard++ < 300) {
      const e = pool[Math.floor(Math.random() * pool.length)];
      if (used.has(e.word) || used.has(zhShort(e))) continue;
      used.add(e.word); used.add(zhShort(e));
      opts.push(e);
    }
    gate.opts = opts;
    gate.correct = Math.floor(Math.random() * 3);
    gate.entry = opts[gate.correct];
    gate.solved = false; gate.missed = false; gate.spoken = false;
    gate.down = [false, false, false];
    gate.fallV = [0, 0, 0];
    const e = gate.entry;
    const q = gate.el.q;
    gate.prompt = q === 'listen' ? '🔊 聽一聽，是哪個英文字？'
      : q === 'blank' ? `${e.hint || ''} ${e.sentence.replace(/_+/g, '____')}`
        : `${e.hint || ''} 「${zhShort(e)}」的英文是？`;
    gate.promptSub = q === 'blank' ? `（${zhShort(e)}）` : q === 'listen' ? '站上正確的單字！' : '站上正確的英文單字！';
    redrawSprite(gate.sign, [gate.prompt, { t: gate.promptSub, size: 64, color: '#4a6a8a' }], { border: '#ffd166' });
    gate.labels.forEach((l, i) => redrawSprite(l, [opts[i].word], { border: '#8f6bff' }));
    gate.answers.forEach((col, i) => {
      col.off = false;
      col.play.mesh.visible = true;
      col.play.mesh.position.y = gate.el.y - 0.45;
      col.play.mesh.rotation.set(0, 0, 0);
      col.play.m.color.setHex(0xb8a8ff);
      col.play.m.emissive && col.play.m.emissive.setHex(0x2a1a5a);
      gate.labels[i].visible = true; gate.labels[i].userData.hiddenByGate = false;
    });
    gate.exit.off = true;
    gate.exit.play.m.opacity = 0.18;
    gate.exit.play.m.transparent = true;
    gate.exit.play.m.depthWrite = false;
  }

  function teleportToStart(C) {
    const s = C.start;
    ctx.setPlayerPos(s.x, s.top + 0.3, s.z, C.a);
    ctx.cam.theta = C.a + Math.PI;
    beginRun(C);
  }
  function beginRun(C) {
    if (run && run.C === C) return;
    if (run) endRun(false);
    run = { C, started: false, t0: 0, t: 0, solved: 0, cp: C.start, cpIdx: -1, replay: !!(P.courses[C.def.id] && P.courses[C.def.id].clears),
      falls: 0, done: false };
    for (const g of C.gates) questionFor(g, C.def.diff);
    for (const ch of C.checks) setFlag(ch, false);
    resetCourseCoins(C);
    ctx.setDeferLevelUp(true);
    runHud(true);
    ctx.emitFx('courseStart', { id: C.def.id });
    ctx.toast(`${C.def.e} ${C.def.name}：${C.def.intro}`);
    P.seen.course = 1;
  }
  function endRun(silent) {
    if (!run) return;
    run = null;
    ctx.setDeferLevelUp(false);
    runHud(false);
    gateBanner(null);
    if (!silent) { /* cancelled quietly */ }
  }
  function setFlag(col, on) {
    const pm = col.play;
    if (!pm.flag) return;
    pm.flag.material.color.setHex(on ? pm.C.def.color : 0x9aa5b5);
    pm.flag.material.emissive && pm.flag.material.emissive.setHex(on ? pm.C.def.color : 0);
    pm.ring.material.color.setHex(on ? pm.C.def.color : 0x9aa5b5);
    pm.ring.material.emissive && pm.ring.material.emissive.setHex(on ? pm.C.def.color : 0);
    pm.on = on;
  }
  function respawnCheckpoint(why) {
    if (!run) return;
    const cp = run.cp;
    run.falls++;
    ctx.setPlayerPos(cp.x, cp.top + 0.25, cp.z, run.C.a);
    ctx.cam.theta = run.C.a + Math.PI;
    boop(false);
    flashPlay();
    ctx.emitFx('respawn', { course: true, why });
    // listen gates re-speak when you come back to their checkpoint
    const g = nextGate();
    if (g && g.el.q === 'listen' && !g.solved) setTimeout(() => sayGate(g), 450);
  }
  function nextGate() {
    if (!run) return null;
    return run.C.gates[run.solved] || null;
  }
  function sayGate(g) { if (g && g.entry) TTSManager.speak(g.entry.word, 'en-US'); }

  // grounded on one of our colliders (called by sky.js every grounded frame)
  function onGround(col) {
    const m = col.play;
    if (!m || !m.C) return;
    const C = m.C;
    if (!run || run.C !== C) {
      if (m.type === 'finish') return;
      beginRun(C);
    }
    if (run.done) return;
    if (m.seg > run.solved) {
      ctx.toast('🪧 要先通過單字門喔！');
      respawnCheckpoint('skip');
      return;
    }
    switch (m.type) {
      case 'start':
        if (run.started) { run.started = false; run.t = 0; }
        break;
      case 'check':
        if (run.cp !== col) {
          run.cp = col;
          if (!m.on) {
            setFlag(col, true);
            boop(true);
            ctx.emitFx('checkpoint', { x: col.x, y: col.top, z: col.z });
            const g = nextGate();
            if (g && g.el.q === 'listen' && !g.solved && !g.spoken) { g.spoken = true; setTimeout(() => sayGate(g), 300); }
          }
        }
        break;
      case 'kill':
        ctx.toast('💥 碰到霓虹磚了！回到存檔點');
        respawnCheckpoint('kill');
        return;
      case 'answer':
        gateAnswer(m.gate, m.opt, col);
        break;
      case 'finish':
        finishRun();
        return;
    }
    if (!run.started && m.type !== 'start') { run.started = true; run.t0 = simT; }
  }

  function gateAnswer(g, i, col) {
    if (g.solved) return;
    if (i === g.correct) {
      g.solved = true;
      run.solved = Math.max(run.solved, g.seg + 1);
      const firstTry = !g.missed && !run.replay;
      const r = ctx.playReward(diffPool(g.C.def.diff), firstTry, g.entry.word);
      TTSManager.speak(g.entry.word, 'en-US');
      SoundManager.playCorrect();
      col.play.m.color.setHex(0x6ee7a0);
      col.play.m.emissive && col.play.m.emissive.setHex(0x0a6a3a);
      redrawSprite(g.labels[i], [{ t: '✔ ' + g.entry.word, color: '#0a7a3a' }], { border: '#22c55e' });
      redrawSprite(g.sign, [{ t: `✨ ${g.entry.word} = ${zhShort(g.entry)}`, color: '#0a7a3a' }, { t: `+${r.xp} XP${r.gems ? '　+1 💎' : ''}`, size: 70, color: '#b07800' }], { border: '#22c55e' });
      g.exit.off = false;
      g.exit.play.m.opacity = 1;
      g.exit.play.m.transparent = false;
      g.exit.play.m.depthWrite = true;
      g.exit.play.m.needsUpdate = true;
      g.popT = 1;
      ctx.toast(`✨ 正確！${g.entry.word} — ${zhShort(g.entry)}　+${r.xp} XP${r.gems ? ' +1 💎' : ''}`);
      ctx.emitFx('gate', { ok: true, word: g.entry.word });
      gateBanner(nextGate());
    } else if (!g.down[i]) {
      g.down[i] = true;
      g.missed = true;
      col.play.m.color.setHex(0xff5a6a);
      col.play.m.emissive && col.play.m.emissive.setHex(0x6a0a14);
      redrawSprite(g.labels[i], [{ t: '✘ ' + g.opts[i].word, color: '#c81e3a' }], { border: '#ff5a6a' });
      SoundManager.playWrong();
      ctx.toast('😵 不是這個！掉下去再試一次 💪');
      ctx.emitFx('gate', { ok: false, word: g.opts[i].word });
      g.dropT = g.dropT || [0, 0, 0];
      g.dropT[i] = 0.35;
    }
  }

  function finishRun() {
    const C = run.C, id = C.def.id;
    if (run.done) return;
    run.done = true;
    const time = run.started ? simT - run.t0 : 0;
    const st = P.courses[id] || (P.courses[id] = { best: 0, clears: 0 });
    const first = !st.clears;
    const newBest = !st.best || time < st.best;
    st.clears++;
    if (newBest) st.best = Math.round(time * 10) / 10;
    const mult = { easy: 1, medium: 1.5, hard: 2 }[C.def.diff] || 1;
    const bonus = first ? Math.round(SKY_COIN_RULES.courseFirstClear * mult) : SKY_COIN_RULES.courseReplay;
    P.coins += bonus;
    P.coinsTotal += bonus;
    const r = ctx.playClear(diffPool(C.def.diff), first);
    persistNow();
    hudCoins(true);
    refreshArchLabel(C);
    SoundManager.playQuestComplete();
    fanfare();
    ctx.emitFx('courseFinish', { id, time, best: st.best });
    if (C.trophy) C.trophyPop = 1;
    burst(C.finish.x, C.finish.top + 2, C.finish.z, C.def.color);
    const nextC = nextCourseAfter(C);
    showPanel('result', `
      <div class="aw-result">
        <div class="aw-result-t">🏆 ${esc(C.def.name)} 完成！</div>
        <div class="aw-result-time">⏱ ${time.toFixed(1)} 秒 ${newBest ? '<span class="aw-newbest">新紀錄！</span>' : `<small>（最佳 ${st.best.toFixed(1)} 秒）</small>`}</div>
        <div class="aw-result-rw">${first ? '首次通關' : '再次通關'}：+${r.xp} XP${r.gems ? `　+${r.gems} 💎` : ''}　+${bonus} ⭐</div>
        <div class="aw-result-sub">${run.falls ? `掉下去 ${run.falls} 次也沒關係，你還是做到了！` : '一次都沒掉下去，太強了！'}${nextC ? `<br>下一關：${nextC.def.e} ${esc(nextC.def.name)}（${esc(nextC.I.name)}）` : ''}</div>
        <div class="aw-reveal-btns">
          <button class="aw-play-btn" data-act="again">🔁 再跑一次</button>
          <button class="aw-play-btn ghost" data-act="leave">🏝️ 回到島上</button>
        </div>
      </div>`, false);
    resultTimer = 6;
  }
  let resultTimer = 0;
  function leaveCourse(C) {
    const I = C.I;
    const ax = C.arch.x - C.fx * 3, az = C.arch.z - C.fz * 3;
    endRun(true);
    ctx.setPlayerPos(ax, I.pos[1] + ctx.bobOf(I.id) + 0.4, az, C.a + Math.PI);
    ctx.cam.theta = C.a;
  }
  function nextCourseAfter(C) {
    const i = courses.indexOf(C);
    for (let k = 1; k < courses.length; k++) {
      const n = courses[(i + k) % courses.length];
      if (!(P.courses[n.def.id] && P.courses[n.def.id].clears)) return n;
    }
    return null;
  }

  // per-frame course animation + hazards
  const _burst = [];
  function updateCourses(dt) {
    const px = ctx.pos.x, pz = ctx.pos.z;
    for (const C of courses) {
      const dC = Math.hypot(px - C.cx, pz - C.cz);
      const mine = !!(run && run.C === C);
      const near = mine || dC < C.rad + (ctx.lowPower() ? 70 : 120);
      // detail LOD: word labels, signs and flags only when you're at (or on) the course
      const detail = mine || dC < C.rad + 25;
      if (detail !== C.detailOn) {
        C.detailOn = detail;
        if (!C.detail) {
          C.detail = [];
          C.group.traverse(o => { if (o.isSprite || o.userData.anim === 'flag') C.detail.push(o); });
        }
        for (const o of C.detail) o.visible = detail && !(o.userData.hiddenByGate);
      }
      C.group.visible = near && !C.hiddenTest;
      // movers keep running even when hidden so their colliders stay in step (cheap)
      for (const mv of C.movers) {
        const el = mv.el;
        const s = 0.5 - 0.5 * Math.cos(simT * Math.PI * 2 / el.T);
        const lx = el.x + el.ax * s, ly = el.y + el.ay * s, lz = el.z + el.az * s;
        const [wx, wz] = C.world(lx, lz);
        const col = mv.col;
        col.mdx = wx - col.x; col.mdz = wz - col.z; col.mdy = C.oy + ly - col.top;
        col.x = wx; col.z = wz; col.top = C.oy + ly;
        if (near) mv.mesh.position.set(lx, ly - 0.45, lz);
      }
      for (const sp of C.spinners) {
        const d = sp.el.rate * dt;
        sp.ang += d;
        const col = sp.col;
        col.myaw = d; col.mdx = 0; col.mdz = 0; col.mdy = 0;
        const yaw = C.a + sp.ang;
        col.box.c = Math.cos(yaw); col.box.s = Math.sin(yaw);
        if (near) sp.mesh.rotation.y = sp.ang;
      }
      for (const v of C.vanishers) {
        const el = v.el;
        const ph = ((simT / el.T + el.ph) % 1 + 1) % 1;
        const solid = ph < el.on;
        const warn = solid && ph > el.on - 0.12;
        v.col.off = !solid;
        if (near) {
          v.m.opacity = solid ? (warn ? (Math.sin(simT * 40) > 0 ? 1 : 0.35) : 1) : 0.12;
          v.m.depthWrite = solid;
          v.mesh.scale.setScalar(solid ? 1 : 0.92);
        }
      }
      if (!near) continue;
      for (const cv of C.convs) cv.t.offset.y = (cv.t.offset.y - dt * cv.speed * 0.5) % 1;
      for (const sw of C.sweeps) {
        sw.ang += sw.el.rate * dt;
        sw.bar.rotation.y = sw.ang;
        if (run && run.C === C && !run.done) {
          // hit test: player vs the bar's segment in the horizontal plane + height band
          const fy = ctx.pos.y;
          if (fy > sw.wy - 1.15 && fy < sw.wy + 0.8) {
            const yaw = C.a + sw.ang;
            const dx = Math.cos(yaw), dz = -Math.sin(yaw);   // bar's local +x in world
            const ox = ctx.pos.x - sw.wx, oz = ctx.pos.z - sw.wz;
            let t = ox * dx + oz * dz;
            t = Math.max(-sw.el.len, Math.min(sw.el.len, t));
            const qx = ox - dx * t, qz = oz - dz * t;
            // the arms hit; the hub post itself never does (standing by the pivot is safe)
            if (Math.abs(t) > 0.75 && qx * qx + qz * qz < 0.6 * 0.6) { ctx.toast('💥 被橫桿掃到了！回到存檔點'); respawnCheckpoint('sweep'); }
          }
        }
      }
      for (const g of C.gates) {
        if (g.dropT) for (let i = 0; i < 3; i++) {
          if (!g.down[i]) continue;
          const col = g.answers[i];
          if (g.dropT[i] > 0) {
            g.dropT[i] -= dt;
            col.play.mesh.position.x = (i - 1) * SKY_GATE.ansX + Math.sin(simT * 60) * 0.08;
            if (g.dropT[i] <= 0) { col.off = true; g.fallV[i] = 0; }
          } else if (col.play.mesh.visible) {
            g.fallV[i] -= 30 * dt;
            col.play.mesh.position.y += g.fallV[i] * dt;
            col.play.mesh.rotation.z += dt * 1.5;
            if (col.play.mesh.position.y < g.el.y - 40) { col.play.mesh.visible = false; g.labels[i].visible = false; g.labels[i].userData.hiddenByGate = true; }
          }
        }
        if (g.popT > 0) {
          g.popT = Math.max(0, g.popT - dt * 2.5);
          g.exit.play.mesh.scale.set(1 + g.popT * 0.15, 1 + g.popT * 0.6, 1 + g.popT * 0.15);
        }
      }
      for (const col of C.cols) {
        if (col.play.pulse && col.play.pulse.emissive) col.play.pulse.emissive.setRGB(0.6 + Math.sin(simT * 6) * 0.4, 0.04, 0.12);
        if (col.play.type === 'bounce' && col.play.top) col.play.top.position.y = 0.52 + Math.max(0, Math.sin(simT * 5)) * 0.06;
      }
      if (C.trophy) {
        C.trophy.rotation.y += dt * 1.4;
        C.trophyPop = Math.max(0, (C.trophyPop || 0) - dt);
        C.trophy.position.y = C.finishY + 1.6 + Math.sin(simT * 2) * 0.15 + Math.sin(C.trophyPop * Math.PI) * 1.5;
      }
      if (C.arch) C.arch.neon.emissive && C.arch.neon.emissive.setHex(C.def.color).multiplyScalar(0.75 + Math.sin(simT * 3) * 0.25);
    }
    // run upkeep
    if (run) {
      const C = run.C;
      if (!run.done) {
        // leaving the start platform (incl. jumping off it) starts the clock
        const onStart = ctx.grounded && ctx.groundCol === C.start;
        if (!run.started && !onStart && !ctx.grounded) { run.started = true; run.t0 = simT; }
        if (run.started) run.t = simT - run.t0;
        // stepped back onto anything that isn't this course → quietly cancel
        const gc = ctx.groundCol;
        if (ctx.grounded && gc && (!gc.play || gc.play.C !== C)) { endRun(true); }
        else if (ctx.pos.y < Math.max(C.minY - 7, run.cp.top - 10)) respawnCheckpoint('fall');
      }
      if (run) {
        runHud(true);
        const g = nextGate();
        gateBanner(g && !run.done && Math.hypot(ctx.pos.x - g.answers[1].x, ctx.pos.z - g.answers[1].z) < 34 ? g : null);
      }
    }
    if (resultTimer > 0) {
      resultTimer -= dt;
      if (resultTimer <= 0 && panelKind === 'result') { closePanel(); if (run && run.done) leaveCourse(run.C); }
    }
    updateBurst(dt);
  }

  // small celebratory particle burst (one shared Points object, reused)
  let burstPts = null, burstT = 0;
  const BURST_N = 90;
  const burstV = new Float32Array(BURST_N * 3);
  function burst(x, y, z, color) {
    if (!burstPts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST_N * 3), 3));
      burstPts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.35, color: 0xffffff, transparent: true, depthWrite: false }));
      burstPts.frustumCulled = false;
      ctx.scene.add(burstPts);
    }
    burstPts.material.color.setHex(color || 0xffd84a);
    const p = burstPts.geometry.attributes.position.array;
    for (let i = 0; i < BURST_N; i++) {
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = 6 + Math.random() * 8;
      burstV[i * 3] = Math.cos(a) * Math.sqrt(1 - u * u) * s;
      burstV[i * 3 + 1] = Math.abs(u) * s + 4;
      burstV[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - u * u) * s;
    }
    burstPts.geometry.attributes.position.needsUpdate = true;
    burstPts.visible = true;
    burstT = 2.2;
  }
  function updateBurst(dt) {
    if (!burstPts || burstT <= 0) return;
    burstT -= dt;
    const p = burstPts.geometry.attributes.position.array;
    for (let i = 0; i < BURST_N; i++) {
      burstV[i * 3 + 1] -= 14 * dt;
      p[i * 3] += burstV[i * 3] * dt; p[i * 3 + 1] += burstV[i * 3 + 1] * dt; p[i * 3 + 2] += burstV[i * 3 + 2] * dt;
    }
    burstPts.geometry.attributes.position.needsUpdate = true;
    burstPts.material.opacity = Math.min(1, burstT);
    if (burstT <= 0) burstPts.visible = false;
  }

  // =====================================================================
  // DOM: HUD, panels
  // =====================================================================
  let dom = {};
  let panelEl = null, panelKind = null, lockedFlag = false;
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function buildDom() {
    const wrap = ctx.wrap;
    const hud = document.createElement('div');
    hud.className = 'aw-play-hud';
    hud.innerHTML = `
      <div class="aw-coin-pill" id="sky-coin-pill" title="星幣：跑酷和探索撿到的，可以買寵物蛋"><span class="aw-coin-ico">⭐</span><b id="sky-coin-n">0</b><span class="aw-coin-plus" id="sky-coin-plus"></span></div>
      <button class="aw-pet-btn" id="sky-pet-btn" title="寵物圖鑑（P）">🐾</button>`;
    wrap.appendChild(hud);
    const runEl = document.createElement('div');
    runEl.className = 'aw-run-hud';
    runEl.id = 'sky-run-hud';
    runEl.style.display = 'none';
    wrap.appendChild(runEl);
    const gate = document.createElement('div');
    gate.className = 'aw-gate-banner';
    gate.id = 'sky-gate-banner';
    wrap.appendChild(gate);
    const dash = document.createElement('button');
    dash.className = 'aw-dash-btn';
    dash.id = 'sky-btn-dash';
    dash.title = '衝刺（C）';
    dash.textContent = '💨';
    wrap.appendChild(dash);
    const panel = document.createElement('div');
    panel.className = 'aw-play-panel';
    panel.id = 'sky-play-panel';
    wrap.appendChild(panel);
    const fl = document.createElement('div');
    fl.className = 'aw-play-flash';
    wrap.appendChild(fl);
    dom = { hud, coinPill: hud.querySelector('#sky-coin-pill'), coinN: hud.querySelector('#sky-coin-n'),
      coinPlus: hud.querySelector('#sky-coin-plus'), petBtn: hud.querySelector('#sky-pet-btn'),
      run: runEl, gate, dash, panel, flash: fl };
    panelEl = panel;
    dom.petBtn.addEventListener('click', togglePets);
    dash.addEventListener('pointerdown', e => { e.preventDefault(); ctx.requestDash(); });
    gate.addEventListener('click', e => { if (e.target.closest('[data-act="sayGate"]')) sayGate(nextGate()); });
    panel.addEventListener('click', onPanelClick);
    hudCoins(false);
  }
  let plusTimer = null;
  function hudCoins(pop, plusText) {
    if (!dom.coinN) return;
    dom.coinN.textContent = String(P.coins);
    if (pop) {
      dom.coinPill.classList.remove('pop');
      void dom.coinPill.offsetWidth;
      dom.coinPill.classList.add('pop');
      if (plusText) {
        dom.coinPlus.textContent = plusText;
        dom.coinPlus.classList.add('on');
        clearTimeout(plusTimer);
        plusTimer = setTimeout(() => dom.coinPlus.classList.remove('on'), 700);
      }
    }
  }
  let runHudKey = '';
  function runHud(on) {
    if (!dom.run) return;
    if (!on || !run) { dom.run.style.display = 'none'; runHudKey = ''; return; }
    const n = run.C.gates.length;
    const t = run.started ? run.t.toFixed(1) : '0.0';
    const key = t + '|' + run.solved;
    if (key === runHudKey) return;
    runHudKey = key;
    dom.run.style.display = '';
    const st = P.courses[run.C.def.id];
    dom.run.innerHTML = `<span>${run.C.def.e} ${esc(run.C.def.name)}</span><b>⏱ ${t}</b><span>🪧 ${run.solved}/${n}</span>${st && st.best ? `<span class="aw-run-best">🏆 ${st.best.toFixed(1)}</span>` : ''}${run.started ? '' : '<span class="aw-run-go">跳下起點開始計時！</span>'}`;
  }
  let gateShown = null;
  function gateBanner(g) {
    if (!dom.gate) return;
    if (g === gateShown) return;
    gateShown = g;
    if (!g) { dom.gate.classList.remove('on'); return; }
    dom.gate.innerHTML = `<div class="aw-gate-q">🪧 ${esc(g.prompt)}</div><div class="aw-gate-sub">${esc(g.promptSub)}　${g.opts.map(o => `<span class="aw-gate-opt">${esc(o.word)}</span>`).join('')}</div>${g.el.q === 'listen' ? '<button class="aw-play-btn small" data-act="sayGate">🔊 再聽一次</button>' : ''}`;
    dom.gate.classList.add('on');
  }
  function flashPlay() {
    if (!dom.flash) return;
    dom.flash.classList.remove('on');
    void dom.flash.offsetWidth;
    dom.flash.classList.add('on');
  }
  function showPanel(kind, html, bottom) {
    panelKind = kind;
    panelEl.className = 'aw-play-panel on' + (bottom ? ' bottom' : '') + ' k-' + kind;
    panelEl.innerHTML = `<div class="aw-play-card">${kind === 'hatch' || kind === 'reveal' ? '' : '<button class="aw-play-x" data-act="close" title="關閉">✕</button>'}${html}</div>`;
    lockedFlag = kind !== 'result';
  }
  function closePanel(keepLock) {
    panelKind = null;
    panelEl.className = 'aw-play-panel';
    panelEl.innerHTML = '';
    if (!keepLock) lockedFlag = !!hatch;
  }
  function onPanelClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (b.dataset.opt !== undefined) { hatchAnswer(+b.dataset.opt); return; }
    if (b.dataset.buy) { buyEgg(b.dataset.buy); return; }
    if (b.dataset.equip) { toggleEquip(b.dataset.equip); return; }
    switch (act) {
      case 'close': closePanel(); break;
      case 'say': if (hatch && hatch.q) TTSManager.speak(hatch.q.ans.word, 'en-US'); break;
      case 'later': {
        // keep the paid egg for later (P.pendingEgg stays set)
        if (hatch) { ctx.scene.remove(hatch.mesh); hatch = null; }
        closePanel();
        ctx.toast('🥚 蛋寶寶會等你！回到寵物蛋商店就能繼續孵化');
        break;
      }
      case 'sayPet': if (hatch && hatch.pet) TTSManager.speak(hatch.pet.en, 'en-US'); break;
      case 'equipNew': if (hatch && hatch.pet) { equipPet(hatch.pet.id); } endHatch(); closePanel(); break;
      case 'doneHatch': endHatch(); closePanel(); break;
      case 'again': {
        const C = run && run.C;
        closePanel();
        resultTimer = 0;
        if (C) { endRun(true); teleportToStart(C); }
        break;
      }
      case 'leave': {
        const C = run && run.C;
        closePanel();
        resultTimer = 0;
        if (C) leaveCourse(C);
        break;
      }
      case 'goTut': {
        closePanel();
        P.seen.welcome = 1;
        persistNow();
        const C = courses.find(c => c.def.tutorial);
        if (C) teleportToStart(C);
        break;
      }
      case 'goEgg': closePanel(); P.seen.welcome = 1; persistNow(); openShop(); break;
      case 'shop': openShop(); break;
      case 'pets': renderCollection(); break;
    }
  }

  function openShop() {
    if (hatch) return;
    const pend = P.pendingEgg && SKY_EGGS.find(e => e.id === P.pendingEgg);
    const rarBadge = (k, v) => `<span class="aw-odds" style="--rar:${SKY_PET_RARITY[k].color}">${SKY_PET_RARITY[k].name} ${v}%</span>`;
    showPanel('shop', `
      <div class="aw-shop-t">🥚 寵物蛋商店</div>
      <div class="aw-shop-sub">用跑酷撿到的 ⭐ 星幣買蛋，再用英文把蛋寶寶喚醒！你有 <b class="aw-coin-inline">⭐ ${P.coins}</b></div>
      ${pend ? `<button class="aw-play-btn wide" data-buy="${pend.id}">🐣 繼續孵化你的${esc(pend.name)}</button>` : ''}
      <div class="aw-shop-list">${SKY_EGGS.map(e => `
        <div class="aw-shop-egg">
          <div class="aw-egg-ico" style="--shell:${hexCss(e.shell)};--spot:${hexCss(e.spot)}"></div>
          <div class="aw-egg-info"><b>${e.e} ${esc(e.name)}</b>
            <div class="aw-egg-odds">${Object.entries(e.odds).map(([k, v]) => rarBadge(k, v)).join('')}</div>
            <small>孵化要答對 ${e.q} 題英文</small></div>
          <button class="aw-play-btn" data-buy="${e.id}" ${P.coins < e.price || pend ? 'disabled' : ''}>⭐ ${e.price}</button>
        </div>`).join('')}</div>
      <div class="aw-shop-foot"><button class="aw-play-btn ghost" data-act="pets">🐾 我的寵物圖鑑（${Object.keys(P.pets).length}/${SKY_PETS.length}）</button></div>`);
  }

  function renderCollection() {
    recomputePerks();
    const owned = Object.keys(P.pets).length;
    showPanel('pets', `
      <div class="aw-shop-t">🐾 寵物圖鑑 ${owned}/${SKY_PETS.length}</div>
      <div class="aw-shop-sub">最多帶 ${SKY_PET_SLOTS} 隻寵物一起冒險・目前加成：🧲 磁吸 +${Math.round(petPerks.magnet * 100)}%　🍀 雙倍 ${Math.round(petPerks.lucky * 100)}%</div>
      <div class="aw-pet-grid">${SKY_PETS.map(d => {
        const st = P.pets[d.id];
        const th = petThumb(d);
        const rar = SKY_PET_RARITY[d.rarity];
        const eq = P.equip.includes(d.id);
        return st ? `
          <div class="aw-pet-card${eq ? ' eq' : ''}" style="--rar:${rar.color}">
            <img src="${th.url}" alt="${esc(d.en)}">
            <b class="aw-pet-en">${esc(d.en)}</b><small>${esc(d.zh)}・${'★'.repeat(st.stars || 1)}</small>
            <div class="aw-pet-perk">${perkText(d, st.stars)}</div>
            <button class="aw-play-btn small" data-equip="${d.id}">${eq ? '✔ 跟隨中' : '帶出門'}</button>
          </div>` : `
          <div class="aw-pet-card missing" style="--rar:${rar.color}">
            <img src="${th.sil}" alt="???">
            <b class="aw-pet-en">???</b><small>${rar.name}</small>
          </div>`;
      }).join('')}</div>
      <div class="aw-shop-foot"><button class="aw-play-btn ghost" data-act="shop">🥚 去寵物蛋商店</button></div>`);
  }
  function toggleEquip(id) {
    if (P.equip.includes(id)) P.equip = P.equip.filter(x => x !== id);
    else equipPet(id);
    persistNow();
    refreshFollowers();
    renderCollection();
  }
  function equipPet(id) {
    if (P.equip.includes(id) || !P.pets[id]) return;
    P.equip.push(id);
    while (P.equip.length > SKY_PET_SLOTS) P.equip.shift();
    persistNow();
    refreshFollowers();
  }
  function togglePets() {
    if (hatch) return;
    if (panelKind === 'pets') closePanel(); else renderCollection();
  }

  function welcome() {
    const s = ctx.save;
    const returning = Object.keys(s.completed || {}).length > 0 || s.lastIsland !== 'isle_dawn';
    if (returning) {
      P.coins += 100;
      P.coinsTotal += 100;
      hudCoins(true);
    }
    const dashKey = ctx.isTouch ? '💨 按鈕' : '<span class="kbd">C</span>';
    showPanel('welcome', `
      <div class="aw-welcome">
        <div class="aw-shop-t">${returning ? '🎉 天空之城大更新！' : '🏝️ 歡迎來到天空之城！'}</div>
        ${returning ? '<div class="aw-shop-sub">你的任務進度都還在！還多了這些新玩法：</div>' : ''}
        <ul class="aw-welcome-list">
          <li>🦘🦘 <b>二段跳</b>：空中再按一次跳躍</li>
          <li>💨 <b>衝刺</b>：${dashKey}，地上和空中都能用</li>
          <li>⭐ <b>星幣</b>：到處都有，跟著星幣走就是路線</li>
          <li>🏁 <b>空中跑酷</b>：走過發光拱門，選對英文單字才站得住！</li>
          <li>🥚 <b>寵物蛋</b>：用星幣買蛋，答英文題孵出寵物</li>
        </ul>
        ${returning ? '<div class="aw-welcome-gift">🎁 老玩家見面禮：⭐ 100 星幣！</div>' : ''}
        <div class="aw-reveal-btns">
          <button class="aw-play-btn" data-act="goTut">🏁 先去新手跑酷</button>
          <button class="aw-play-btn ghost" data-act="goEgg">🥚 看看寵物蛋</button>
        </div>
      </div>`);
    P.seen.welcome = 1;
    persistNow();
  }

  // =====================================================================
  // hooks for sky.js
  // =====================================================================
  function init(c) {
    ctx = c;
    if (typeof SKY_COURSES === 'undefined') return;
    ensureSave();
    buildCoinMesh();
    buildWorldCoins();
    buildStand();
    SKY_COURSES.forEach(buildCourse);
    buildDom();
    refreshFollowers();
    ctx.onFx((name) => { if (name === 'jump' || name === 'airjump') for (const f of followers) f.hop = 1; });
    ready = true;
  }
  function onAdventureStart() {
    if (!ready) return;
    hudCoins(false);
    refreshFollowers();
    if (!P.seen.welcome) setTimeout(() => { if (ctx.playing && !P.seen.welcome && !ctx.quizOpen) welcome(); }, 900);
  }
  function update(dt) {
    if (!ready) return;
    simT += dt;
    updateCourses(dt);
    updateCoins(dt);
    updatePets(dt);
    updateStand();
    updateHatch(dt);
    if (persistAt && simT > persistAt) persistNow();
  }
  function onVoid() {
    if (run && !run.done) { respawnCheckpoint('void'); return true; }
    return false;
  }
  function target(x, y, z, bestD) {
    if (!ready || run) return null;
    let best = null, bd = bestD;
    if (stand && Math.abs(y - stand.isle.pos[1]) < 8) {
      const d = Math.hypot(x - stand.x, z - stand.z) - 1.2;
      if (d < bd) { bd = d; best = stand.target; }
    }
    for (const C of courses) {
      if (Math.abs(y - C.I.pos[1]) > 8) continue;
      const d = Math.hypot(x - C.arch.x, z - C.arch.z) - 0.8;
      if (d < bd) { bd = d; best = C.target; }
    }
    return best;
  }
  function tracker() {
    if (!ready || run) return null;
    const tut = courses.find(c => c.def.tutorial);
    if (tut && !(P.courses[tut.def.id] && P.courses[tut.def.id].clears)) return { x: tut.arch.x, z: tut.arch.z, q: { name: '🏁 新手跑酷訓練場' } };
    if (stand && !Object.keys(P.pets).length && (P.coins >= SKY_EGGS[0].price || P.pendingEgg)) return { x: stand.x, z: stand.z, q: { name: '🥚 寵物蛋商店' } };
    return null;
  }
  function drawMinimap(g, C0, scale, px, pz) {
    if (!ready) return;
    // coin groups with coins left
    g.fillStyle = '#ffd84a';
    for (const gid in groupsById) {
      const gr = groupsById[gid];
      if (!gr.persist) continue;
      const st = P.groups[gid];
      if (st && st.got && gr.coins.every(c => !c.alive)) continue;
      const dx = (gr.cx - px) * scale, dz = (gr.cz - pz) * scale;
      if (dx * dx + dz * dz > (C0 - 4) * (C0 - 4)) continue;
      g.fillRect(C0 + dx - 1, C0 + dz - 1, 2, 2);
    }
    for (const C of courses) {
      const dx = (C.arch.x - px) * scale, dz = (C.arch.z - pz) * scale;
      if (dx * dx + dz * dz > (C0 - 4) * (C0 - 4)) continue;
      const done = P.courses[C.def.id] && P.courses[C.def.id].clears;
      g.save();
      g.translate(C0 + dx, C0 + dz);
      g.rotate(Math.PI / 4);
      g.fillStyle = done ? '#4ade80' : hexCss(C.def.color);
      g.fillRect(-3.2, -3.2, 6.4, 6.4);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1;
      g.strokeRect(-3.2, -3.2, 6.4, 6.4);
      g.restore();
    }
    if (stand) {
      const dx = (stand.x - px) * scale, dz = (stand.z - pz) * scale;
      if (dx * dx + dz * dz < (C0 - 4) * (C0 - 4)) {
        g.beginPath();
        g.ellipse(C0 + dx, C0 + dz, 3, 3.8, 0, 0, Math.PI * 2);
        g.fillStyle = '#ff8fb8';
        g.fill();
        g.strokeStyle = '#ffffff';
        g.stroke();
      }
    }
  }
  function locked() { return lockedFlag; }
  function onEscape() {
    if (hatch) return;            // the egg card has its own 稍後再孵 button
    closePanel();
  }

  // =====================================================================
  // test API (window.__skyTest.play)
  // =====================================================================
  const test = {
    state: () => ({ coins: P.coins, coinsTotal: P.coinsTotal, pets: JSON.parse(JSON.stringify(P.pets)), equip: P.equip.slice(),
      courses: JSON.parse(JSON.stringify(P.courses)), pendingEgg: P.pendingEgg || null, panel: panelKind, locked: lockedFlag,
      followers: followers.length, perks: { ...petPerks }, activeCoins: coinMesh ? coinMesh.count : 0 }),
    course: id => {
      const C = courses.find(c => c.def.id === id);
      if (!C) return null;
      const col = x => ({ x: x.x, z: x.z, top: x.top, off: !!x.off, type: x.play.type });
      return { start: col(C.start), finish: col(C.finish), arch: { x: C.arch.x, z: C.arch.z, top: C.I.pos[1] }, a: C.a,
        fx: C.fx, fz: C.fz, minY: C.minY,
        path: C.cols.map(col), gates: C.gates.map(g => ({ correct: g.correct, word: g.entry && g.entry.word, solved: g.solved, missed: g.missed,
          answers: g.answers.map(col), exit: col(g.exit) })) };
    },
    live: id => courses.find(c => c.def.id === id) || null,   // raw runtime course (test autopilot)
    run: () => (run ? { id: run.C.def.id, started: run.started, t: run.t, solved: run.solved, falls: run.falls, done: run.done,
      cp: { x: run.cp.x, z: run.cp.z, top: run.cp.top, type: run.cp.play.type } } : null),
    startCourse: id => { const C = courses.find(c => c.def.id === id); if (C) teleportToStart(C); return !!C; },
    leave: () => { if (run) leaveCourse(run.C); },
    nearestCoin: () => {
      let best = null, bd = Infinity;
      for (const c of coins) {
        if (!c.alive || c.course) continue;
        const y = coinWorldY(c);
        const d = Math.hypot(c.x - ctx.pos.x, c.z - ctx.pos.z, (y - ctx.pos.y) * 0.5);
        if (d < bd) { bd = d; best = { x: c.x, y, z: c.z, gid: c.gid, d }; }
      }
      return best;
    },
    addCoins: n => { P.coins += n; hudCoins(true); persistNow(); },
    stand: () => (stand ? { x: stand.x, z: stand.z, top: stand.isle.pos[1] } : null),
    openShop, buyEgg, renderCollection, closePanel, togglePets,
    hatch: () => (hatch ? { phase: hatch.phase, step: hatch.step, need: hatch.need, answer: hatch.q && hatch.q.ans.word,
      opts: hatch.q && hatch.q.opts.map(o => o.word), pet: hatch.pet && hatch.pet.id } : null),
    hatchAnswer: correct => {
      if (!hatch || !hatch.q) return false;
      const i = correct ? hatch.q.opts.indexOf(hatch.q.ans) : hatch.q.opts.findIndex(o => o !== hatch.q.ans);
      hatchAnswer(i);
      return true;
    },
    panelClick: act => { const b = panelEl.querySelector(`[data-act="${act}"]`); if (b) b.click(); return !!b; },
    equip: id => { equipPet(id); },
    groups: () => ({ ...P.groups }),
    // art review: line every species up in front of the hero (removed again with parade(false))
    parade: on => {
      if (test._parade) { test._parade.forEach(m => ctx.scene.remove(m)); test._parade = null; }
      if (on === false) return;
      const yaw = ctx.cam.theta + Math.PI, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;   // in front of the camera
      test._parade = SKY_PETS.map((d, i) => {
        const m = buildPet(d);
        const row = i < 7 ? 0 : 1, col = (i % 7) - 3;
        m.position.set(ctx.pos.x + fx * (5 + row * 2.4) + rx * col * 1.5, ctx.pos.y + 0.9 + row * 1.2, ctx.pos.z + fz * (5 + row * 2.4) + rz * col * 1.5);
        m.rotation.y = yaw + Math.PI;
        ctx.scene.add(m);
        return m;
      });
    },
    // draw-call accounting: hide one PLAY layer at a time
    hide: (what, on) => {
      if (what === 'coins') coinMesh.visible = !on;
      if (what === 'stand' && stand) stand.group.visible = !on;
      if (what === 'courses') courses.forEach(C => { C.group.visible = !on; C.hiddenTest = on; });
      if (what === 'arches') courses.forEach(C => { C.arch.group.visible = !on; });
      if (what === 'pets') followers.forEach(f => { f.mesh.visible = !on; });
    },
    forceRespawnGroups: () => { for (const k in P.groups) P.groups[k].t = 0; respawnGroups(); },
  };

  function inRun() { return !!(run && !run.done); }

  return { init, update, onGround, onVoid, target, tracker, drawMinimap, locked, onEscape, togglePets, onAdventureStart, inRun, test };
})();
