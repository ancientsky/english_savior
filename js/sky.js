/* ===== Sky Citadel (天空之城) — open-world 3D sky-island adventure =====
   Third-person Roblox/Minecraft-style controller over hand-placed floating
   islands (js/data/sky.js). Part 1: world + player + camera. Quests, mobs
   and title perks arrive in later parts. */

const SkyGame = (() => {
  const SAVE_KEY = 'english_savior_sky';

  // ----- persistent progress (quests fill this in Part 2+) -----
  let save = {
    completed: {},          // questId -> clear count
    bridgesBuilt: {},       // bridge-questId -> true (permanent quest bridges)
    secretsFound: {},       // secret-portal/switch id -> true (once discovered, stays visible)
    stairsBuilt: {},        // switch id -> true (hidden stepstone stairway built)
    lastIsland: 'isle_dawn',
    bestRace: {},
    settings: {},
  };

  // ----- three.js -----
  let renderer, scene, camera, clock;
  let rafId = null;
  let threeReady = false;
  let playing = false;
  let hemiLight, sunLight, skyDome;   // owned by js/sky-art.js (SkyArt.hemi/sun/dome)
  // altitude atmosphere (computed in SkyArt): base sky ↔ deep-space purple (galaxy
  // region sits high) ↔ deep-red cave gloom (地心世界 sits far below, y ≈ -70..-95).
  // fogBase is SkyArt.fogBase — the daytime haze colour the storm-boss victory brightens.
  let fogBase = null;
  let galaxyBlend = -1;
  let undergroundBlend = -1;

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
  let regionUnderground = false; // true while standing on/under an `underground: true` island (地心世界)
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
  let imeToastShown = false; // show the IME hint toast at most once per adventure

  // ----- DOM -----
  let els = {};
  let toastTimer = null;

  // ----- equipped-title perks + consumable session buffs (Part 4) -----
  let perks = {};
  let gemCarry = 0;            // fractional gem bonus accumulator
  let gliderOn = false;        // sky_glider consumable active this adventure
  let jumpBoostOn = false;     // cloud_boots consumable active this adventure

  // ----- active-use item consumables (⚡ Wave 4) -----
  let shieldT = 0;             // 泡泡護罩 seconds remaining
  let mountT = 0;              // 飛天雲 seconds remaining
  let mountWarned = false;     // 3s-before-expiry warning already shown this ride
  let shieldMesh = null;       // translucent bubble around the player
  let mountMesh = null;        // small fluffy cloud under the player's feet
  let lightningLines = [];     // { mesh, t } chain-lightning visuals, expire after ~0.3s
  const ITEM_TYPES = ['lightning_staff', 'bubble_shield', 'cloud_mount'];
  const ITEM_META = {
    lightning_staff: { icon: '⚡', name: '雷霆法杖', key: 'Q' },
    bubble_shield: { icon: '🫧', name: '泡泡護罩', key: 'R' },
    cloud_mount: { icon: '☁️', name: '飛天雲', key: 'F' },
  };
  function computePerks() {
    const id = GameEngine.getEquippedTitle().id;
    perks = {
      voidSafe: id === 'beginner',                                   // 摔虛空不扣心
      xpMult: id === 'english_star' ? 1.1 : 1,                       // XP +10%
      gemMult: id === 'point_master' ? 1.25 : 1,                     // 💎 +25%
      firstLetter: id === 'word_hunter',                             // 單字題送首字母
      dropWrong: id === 'grammar_master',                            // 文法題刪一個錯項
      heartBonus: (id === 'bookworm' || id === 'legend_50') ? 1 : 0, // +1❤️
      speedMult: id === 'speed_learner' ? 1.25 : (id === 'legend_50' ? 1.15 : 1),
      freeMiss: id === 'persistent',                                 // 每任務首錯免罰
      doubleJump: id === 'legend',                                   // 二段跳
      glide: id === 'legend',                                        // 滑翔
      dmg: id === 'champion' ? 2 : (id === 'legend_50' ? 1.5 : 1),   // 傷害倍率
      jumpMult: id === 'block_master' ? 1.3 : 1,                     // 跳高 +30%
      mobSlow: id === 'ach_legend' ? 0.7 : 1,                        // 怪速 −30%
      chestGem: id === 'collection_king',                            // 寶箱每題 +1💎
      padMult: id === 'summit_25' ? 1.5 : 1,                         // 跳墊 +50%
    };
  }
  function maxHearts() { return SKY_CONFIG.maxHearts + (perks.heartBonus || 0); }
  function skyAddGems(n) {
    gemCarry += n * ((perks.gemMult || 1) - 1);
    let bonus = 0;
    while (gemCarry >= 1) { gemCarry -= 1; bonus++; }
    GameEngine.addGems(n + bonus);
    uiPop('gem', n + bonus);
  }

  // reused temp vectors (zero allocation inside animate)
  let _v1, _v2;

  // ===================== module contract (sky-art / sky-avatar / sky-play) =====================
  // Per-frame movement snapshot: WRITTEN by the physics half of updatePlayer(),
  // READ by avatar animation, camera feel and FX. Never write it from a reader.
  const motion = { speed: 0, moving: false, sprint: false, vy: 0, grounded: true, airJumps: 0, dashing: false, riding: null, gliding: false };
  // One-shot gameplay events -> visual/audio feedback. Emit from gameplay code,
  // listen from presentation code. Known names (add more, document them here):
  //   'jump' 'airjump'{n} 'land'{v} 'pad' 'hurt' 'respawn' 'arrive'{isle}
  //   'start' (adventure begins → camera reveal + wave) 'teleport' (camera snaps)
  //   PLAY: 'dash'{x,z,grounded} 'coin'{x,y,z,combo} 'checkpoint'{x,y,z} 'gate'{ok,word}
  //         'courseStart'{id} 'courseFinish'{id,time,best} 'hatch'{pet,rarity} 'respawn'{course:true}
  // motion.airJumps = air jumps used this airtime; motion.dashing; motion.gliding (glide title /
  // 🪂 glider held at the capped fall speed); motion.platform
  // (standing on a moving obby platform).
  const fxListeners = [];
  function emitFx(name, data) {
    for (let i = 0; i < fxListeners.length; i++) {
      try { fxListeners[i](name, data || {}); } catch (e) { console.error('[sky fx]', name, e); }
    }
  }
  // Shared context handed to the companion modules (SkyArt / SkyAvatar / SkyPlay).
  // Getters because several of these are assigned after this object is created.
  // Extend it from YOUR OWN section with Object.assign(ctx, {...}) /
  // Object.defineProperty — do not edit this literal (keeps merges clean).
  const ctx = {
    get THREE() { return THREE; },
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get player() { return player; },
    get playerParts() { return playerParts; },
    get save() { return save; },
    get perks() { return perks; },
    get simTime() { return simTime; },
    get playing() { return playing; },
    get currentIsland() { return currentIsland; },
    get hearts() { return hearts; },
    pos, cam, motion, colliders, islandGroups, isTouch,
    onFx: fn => fxListeners.push(fn),
    emitFx,
    persist: () => persist(),
    lowPower: () => lowPower(),
    toast: msg => showWorldToast(msg),
    matOf: (color, emissive, texKey) => matOf(color, emissive, texKey),
    isleById: id => isleById(id),
    bobOf: id => bobOf(id),
    supportAt: (x, z, maxTop) => supportAt(x, z, maxTop),
    mulberry32: seed => mulberry32(seed),
  };

  // ===================== helpers =====================
  // colour canvas texture (three r152+ colour management: canvas pixels are sRGB)
  function canvasTex(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
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
    if (!save.bridgesBuilt) save.bridgesBuilt = {};
    if (!save.secretsFound) save.secretsFound = {};
    if (!save.stairsBuilt) save.stairsBuilt = {};
    // migrate the old single-bridge flag (pre-galaxy saves)
    if (save.bridgeBuilt) save.bridgesBuilt.sq_bridge_crystal = true;
  }

  function isBridgeBuilt(questId) { return !!save.bridgesBuilt[questId]; }
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
      minimap: document.getElementById('sky-minimap'),
      buffs: document.getElementById('sky-buffs'),
      tracker: document.getElementById('sky-tracker'),
      trackerArrow: document.getElementById('sky-tracker-arrow'),
      trackerText: document.getElementById('sky-tracker-text'),
      journalBtn: document.getElementById('sky-btn-journal'),
      homeBtn: document.getElementById('sky-btn-home'),
      lowPower: document.getElementById('sky-lowpower'),
      itemTray: document.getElementById('sky-item-tray'),
    };
    if (!els.zone) return;

    uiInit();
    SkyPlay.registerUi?.(ctx);   // PLAY's cover stats (⭐ / 🐾 / 🏁) + dash / pets rows in the controls guide
    loadSave();
    renderStartScreen();
    if (els.minimap) minimapCtx = els.minimap.getContext('2d');
    els.journalBtn?.addEventListener('click', toggleJournal);
    els.homeBtn?.addEventListener('click', goHome);
    if (els.lowPower) {
      els.lowPower.checked = lowPower();
      els.lowPower.addEventListener('change', () => {
        save.settings.lowPower = els.lowPower.checked;
        // asking for high quality again also forgets an automatic step-down on this device
        if (!els.lowPower.checked) SkyArt.gfxReset();
        persist();
        if (threeReady) {
          resizeRenderer();
          showWorldToast(lowPower() ? '🔋 省電模式開啟（陰影下次進入時關閉）' : '✨ 高畫質模式（下次進入完整生效）');
        }
      });
    }

    // owner diagnostics (kid-invisible): hold the island-name pill ~1.2 s, or open with ?skydebug=1
    if (els.location) {
      let lpT = 0, lpX = 0, lpY = 0, lpAt = 0;
      const open = () => { if (threeReady) SkyArt.showDiag(); };
      const cancel = () => { clearTimeout(lpT); lpT = 0; lpAt = 0; };
      els.location.addEventListener('pointerdown', e => {
        cancel();
        lpX = e.clientX; lpY = e.clientY; lpAt = performance.now();
        lpT = setTimeout(() => { lpT = 0; lpAt = 0; open(); }, 1200);
      });
      els.location.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - lpX, e.clientY - lpY) > 12) cancel(); });
      // a busy main thread can starve the timer — judge the hold by the clock on release too
      els.location.addEventListener('pointerup', () => { const held = lpAt && performance.now() - lpAt >= 1200; cancel(); if (held) open(); });
      ['pointercancel', 'pointerleave'].forEach(t => els.location.addEventListener(t, cancel));
      els.location.addEventListener('contextmenu', e => e.preventDefault());
    }
    els.startBtn.addEventListener('click', startAdventure);
    els.camReset?.addEventListener('click', () => { cam.theta = heroYaw + Math.PI; cam.phi = 0.42; cam.radius = SKY_CONFIG.camRadius; });
    window.addEventListener('resize', resizeRenderer);
    setupKeyboard();
    els.itemTray?.addEventListener('pointerdown', e => {
      const btn = e.target.closest('.aw-item-btn');
      if (!btn) return;
      e.preventDefault();
      useActiveItem(btn.dataset.item);
    });

    // test hooks — localhost only (they teleport, add coins, open any quest)
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__skyTest = {
      start: startAdventure,
      player: () => ({ x: pos.x, y: pos.y, z: pos.z, grounded, island: currentIsland, hearts, simTime }),
      teleport: (x, y, z) => { pos.x = x; pos.y = y; pos.z = z; vy = 0; },
      warp: id => usePortal({ to: id }),   // like a portal: sets the region (underground void depth) too
      stats: () => ({ islands: SKY_ISLANDS.length, ready: threeReady, playing, colliders: colliders.length }),
      keys: k => Object.assign(keys, k),
      jump: () => { jumpBufferedAt = simTime; },
      camYaw: () => cam.theta,
      renderInfo: () => (renderer ? renderer.info.render : null),
      // quest hooks (Part 2)
      questState: () => ({ completed: { ...save.completed }, total: totalCleared() }),
      target: () => (currentTarget ? (currentTarget.play ? 'play:' + currentTarget.id : currentTarget.q.id) : null),
      openQuest: id => {
        const q = SKY_QUESTS.find(x => x.id === id);
        if (q) openQuest(q);
      },
      quizInfo: () => (active ? { id: active.q.id, step: active.step, n: active.q.n, open: quizOpen, combat: !!active.combat } : { open: quizOpen }),
      interact,
      closeQuiz,
      // combat hooks (Part 3)
      mobs: () => mobs.filter(m => !m.gone).map((m, i) => ({
        i: mobs.indexOf(m), id: m.def.id, hp: m.hp, dead: m.dead, boss: !!m.isBoss,
        quest: m.questId, x: m.mesh.position.x, z: m.mesh.position.z, scale: m.def.scale || 1,
      })),
      engage: i => openCombatQuiz(mobs[i]),
      setHearts: n => { hearts = n; updateHudHearts(); },
      hearts: () => hearts,
      arena: () => (arenaActive ? { id: arenaActive.q.id, remaining: arenaActive.remaining } : null),
      race: () => (raceActive ? { id: raceActive.q.id, idx: raceActive.idx, n: raceActive.q.n, time: raceActive.time } : null),
      ringPos: i => {
        const r = raceActive && raceActive.rings[i];
        return r ? { x: r.x, y: r.y, z: r.z } : null;
      },
      runes: () => {
        if (!runeActive) return null;
        const isle = isleById(runeActive.q.island);
        return {
          word: runeActive.entry ? runeActive.entry.word : null,
          wordIdx: runeActive.wordIdx,
          collected: runeActive.collected.join(''),
          orbs: runeActive.orbs.filter(o => !o.got).map(o => ({
            letter: o.letter,
            x: isle.pos[0] + o.sprite.position.x,
            z: isle.pos[2] + o.sprite.position.z,
          })),
        };
      },
      boss: () => (bossActive ? { hp: bossActive.mob.hp, phase: bossActive.phase, waveR: bossActive.waveR, warnT: bossActive.warnT } : null),
      damage: n => damagePlayer(n || 1),
      spellWord: () => (active && active.spellEntry ? active.spellEntry.word.toUpperCase() : null),
      // perk hooks (Part 4)
      perks: () => ({ ...perks, maxHearts: maxHearts(), gliderOn, jumpBoostOn }),
      refreshEquipment,
      // active-use item hooks (⚡ Wave 4)
      useItem: useActiveItem,
      itemTray: () => ITEM_TYPES.map(type => {
        const b = (GameEngine.getState().activeBuffs || []).find(x => x.type === type && x.uses > 0);
        return b ? { type, uses: b.uses, active: (type === 'bubble_shield' && shieldT > 0) || (type === 'cloud_mount' && mountT > 0) } : null;
      }).filter(Boolean),
      effects: () => ({ shieldT, mountT }),
      // secret realm hooks (Part 6)
      secretState: () => ({
        found: { ...save.secretsFound },
        secretCleared: secretCleared(),
        portals: interactables.filter(it => it.q.type === 'portal').length,
        switches: interactables.filter(it => it.q.type === 'switch').length,
        stairsBuilt: { ...save.stairsBuilt },
      }),
      // underground realm hooks (Part 7 / Wave 1)
      region: () => ({
        underground: regionUnderground,
        blend: undergroundBlend,
        island: currentIsland,
        fogHex: scene ? scene.fog.color.getHex() : null,
        fogFar: scene ? scene.fog.far : null,
      }),
      // world-event hooks (☄️ Wave 2)
      event: () => (worldEvent ? {
        type: worldEvent.type,
        t: worldEvent.t,
        shardsLeft: worldEvent.type === 'meteor'
          ? worldEvent.shards.filter(s => !s.got && !s.gone).length : undefined,
        falconsLeft: worldEvent.type === 'raid'
          ? worldEvent.falcons.filter(f => !f.dead && !f.gone).length : undefined,
        word: worldEvent.type === 'meteor' ? worldEvent.word : undefined,
        spellIdx: worldEvent.type === 'meteor' ? worldEvent.spellIdx : undefined,
        spellFail: worldEvent.type === 'meteor' ? worldEvent.spellFail : undefined,
      } : null),
      triggerEvent: type => {
        if (!canStartEvent(type)) return false;
        if (type === 'meteor') startMeteorShower(); else startAirRaid();
        return true;
      },
      shardPos: i => {
        const s = worldEvent && worldEvent.type === 'meteor' && worldEvent.shards[i];
        return s ? { x: s.mesh.position.x, y: s.mesh.position.y, z: s.mesh.position.z, letter: s.letter } : null;
      },
      // puzzle-quest hooks (🧩 Wave 3: order 語序踏石 / maze 傳送迷宮)
      // PLAY hooks (coins / pets / eggs / obby courses) — see SkyPlay.test in js/sky-play.js
      play: SkyPlay.test,
      motion: () => ({ ...motion }),
      dash: () => requestDash(),
      jumpHold: v => { if (v && !jumpHeld) jumpBufferedAt = simTime; jumpHeld = !!v; },
      // deterministic fixed-step play: runs the REAL world + physics updates `sec` seconds
      // at `step` (headless software GL renders at a few fps; this lets a scripted
      // controller drive input every step). onStep(i) runs before each step.
      simulate: (sec, step, onStep) => {
        step = step || 1 / 60;
        const n = Math.round(sec / step);
        for (let i = 0; i < n; i++) {
          if (onStep && onStep(i) === false) break;
          if (!playing) break;
          updateWorld(step);
          updatePlayer(step);
        }
        updateCamera(1);
      },
      supportAt: (x, z, maxTop) => { const s = supportAt(x, z, maxTop); return { y: s.y, kind: s.col && s.col.kind, play: !!(s.col && s.col.play) }; },
      setCam: (theta, phi, radius) => { cam.theta = theta; if (phi !== undefined) cam.phi = phi; if (radius !== undefined) cam.radius = radius; },
      puzzle: () => (orderActive
        ? {
          type: 'order', idx: orderActive.idx, expected: orderActive.words.slice(),
          done: orderActive.done, n: orderActive.q.n,
          stones: orderActive.stones.map(s => ({ x: s.x, z: s.z, word: s.word, done: s.done })),
        }
        : mazeActive
          ? { type: 'maze', idx: mazeActive.idx, nodes: mazeActive.nodes.map(n => ({ x: n.x, z: n.z })) }
          : null),
    };
  }

  // Called by app.js when the zone tab becomes visible
  function onShow() {
    if (threeReady) {
      resizeRenderer();
      if (!rafId) animate();
    }
  }

  // ===================== SkyUI: presentation helpers (UI workstream) =====================
  // Everything below is DOM/CSS presentation only (css/sky.css, prefix aw-). It never
  // changes what is asked, how answers are judged or what is paid. Other modules reach
  // it through `ctx.ui`:
  //   ctx.ui.pop(kind, amount, {text})   floating "+12 XP" chip that flies to the top bar
  //                                       (kind: 'xp' | 'gem' | 'coin' | 'text')
  //   ctx.ui.banner(title, small, icon)  big ribbon (island arrival / unlock); queued while a quiz is open
  //   ctx.ui.toast(msg)                  the in-world toast (kind picked from the leading emoji)
  //   ctx.ui.addStartStat(fn)            fn() -> html chip(s) appended to the cover's stats row
  //   ctx.ui.addControl({id, icon, kbd:['Q'], touch:'💨 衝刺鈕', text:'衝刺', isNew:true})
  //                                       adds/overrides a row of the cover's controls guide
  //   ctx.ui.refreshStart()              re-render the cover (after a save change)
  // HUD chips: append `.aw-chip` elements to `.aw-hud` (top-left column) for extra HUD pieces.
  const uiState = {
    streak: 0, hearts: -1, heartsMax: 0, bossW: 100, live: 0,
    lastBanner: 0, queue: [], arriveT: 0,
    startStats: [], controls: {},
  };
  function uiReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function uiInit() {
    Object.assign(ctx, {
      ui: {
        pop: uiPop, banner: uiBanner, toast: msg => showWorldToast(msg),
        addStartStat: fn => { uiState.startStats.push(fn); renderStartScreen(); },
        addControl: c => { if (c && c.id) { uiState.controls[c.id] = c; renderStartScreen(); } },
        refreshStart: () => renderStartScreen(),
      },
    });
    ctx.onFx((name, d) => {
      if (name === 'arrive' && d && d.isle) uiBanner(d.isle.name, '抵達', d.isle.underground ? '🌋' : '🏝️');
    });
  }

  // ---- floating reward pop-ups ----
  function uiPop(kind, amount, opts) {
    if (!els.wrap || !(amount > 0 || (opts && opts.text))) return;
    const el = document.createElement('div');
    el.className = 'aw-pop ' + kind;
    el.textContent = (opts && opts.text) ||
      (kind === 'xp' ? `+${amount} XP` : kind === 'gem' ? `+${amount} 💎` : kind === 'coin' ? `+${amount} ⭐` : String(amount));
    document.body.appendChild(el);
    const wr = els.wrap.getBoundingClientRect();
    let ox = wr.left + wr.width / 2;
    let oy = wr.top + wr.height * 0.4;
    const card = quizOpen && quiz && quiz.root.querySelector('.aw-quiz-card');
    if (card) { const cr = card.getBoundingClientRect(); ox = cr.left + cr.width / 2; oy = cr.top + 30; }
    const idx = uiState.live++;
    oy -= Math.min(idx, 4) * 38;
    ox += (idx % 2 ? 1 : -1) * Math.min(idx, 3) * 14;
    const targetEl = kind === 'xp' ? document.getElementById('xp-text') : (kind === 'gem' ? document.getElementById('hud-gems') : null);
    let tr = targetEl ? targetEl.getBoundingClientRect() : null;
    if (tr && (!tr.width || tr.bottom < 0)) tr = null;
    const tx = tr ? tr.left + tr.width / 2 : ox;
    const ty = tr ? Math.max(14, tr.top + tr.height / 2) : oy - 90;
    const at = (x, y, sc) => `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%) scale(${sc})`;
    const done = () => {
      el.remove();
      uiState.live = Math.max(0, uiState.live - 1);
      if (tr && targetEl) {
        const b = targetEl.closest('.hud-coins') || targetEl.closest('.xp-bar-container') || targetEl;
        b.classList.remove('aw-bump');
        void b.offsetWidth;
        b.classList.add('aw-bump');
      }
    };
    if (!el.animate) { setTimeout(done, 900); return; }
    const frames = uiReduced()
      ? [{ transform: at(ox, oy, 1), opacity: 0 }, { transform: at(ox, oy, 1), opacity: 1, offset: 0.2 }, { transform: at(ox, oy, 1), opacity: 1, offset: 0.8 }, { transform: at(ox, oy, 1), opacity: 0 }]
      : [
        { transform: at(ox, oy + 24, 0.3), opacity: 0 },
        { transform: at(ox, oy - 8, 1.3), opacity: 1, offset: 0.16 },
        { transform: at(ox, oy - 22, 1), opacity: 1, offset: 0.45 },
        { transform: at(tx, ty, 0.45), opacity: 0.95, offset: 0.94 },
        { transform: at(tx, ty, 0.3), opacity: 0 },
      ];
    const a = el.animate(frames, { duration: uiReduced() ? 1100 : 1350 + idx * 60, easing: 'cubic-bezier(.35,.05,.3,1)', fill: 'forwards' });
    a.onfinish = done;
    a.oncancel = done;
  }

  // ---- banner (arrival / unlock) ----
  function uiBanner(title, small, icon) {
    if (!els.wrap) return;
    if (quizOpen) { uiState.queue.push([title, small, icon]); return; }
    els.wrap.querySelectorAll('.aw-banner').forEach(b => b.remove());
    const el = document.createElement('div');
    el.className = 'aw-banner';
    el.innerHTML = `<div class="aw-banner-card"><div class="aw-banner-small"></div><div class="aw-banner-title aw-outline-text"></div></div>`;
    el.querySelector('.aw-banner-small').textContent = small || '';
    el.querySelector('.aw-banner-title').textContent = `${icon || ''} ${title}`.trim();
    els.wrap.appendChild(el);
    uiState.lastBanner = Date.now();
    setTimeout(() => el.remove(), 2700);
  }
  function uiFlushBanners() {
    const q = uiState.queue.splice(0);
    q.forEach((a, i) => setTimeout(() => uiBanner(a[0], a[1], a[2]), 350 + i * 2700));
  }

  // ---- little star burst on a button ----
  function uiBurst(el) {
    if (uiReduced() || !el) return;
    for (let i = 0; i < 8; i++) {
      const sp = document.createElement('i');
      sp.className = 'aw-spark';
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const d = 34 + Math.random() * 26;
      sp.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      sp.style.setProperty('--dy', Math.sin(ang) * d + 'px');
      sp.style.background = ['#ffe45c', '#fff', '#7dff9a', '#8bd8ff'][i % 4];
      el.appendChild(sp);
      setTimeout(() => sp.remove(), 800);
    }
  }
  function uiStepAnim() {
    if (!quiz || !quiz.card || uiReduced()) return;
    quiz.card.classList.remove('step');
    void quiz.card.offsetWidth;
    quiz.card.classList.add('step');
  }
  function uiStreakUpdate(bump) {
    if (!quiz || !quiz.streak) return;
    const n = uiState.streak;
    quiz.streak.classList.toggle('on', n >= 2);
    quiz.streak.textContent = `🔥 ×${n}`;
    if (bump && n >= 2) {
      quiz.streak.classList.remove('bump');
      void quiz.streak.offsetWidth;
      quiz.streak.classList.add('bump');
      if (n === 3 || n === 5 || n === 8 || n === 12) uiPop('text', 0, { text: `🔥 連續答對 ${n} 題！` });
    }
  }
  function uiCountUp(root) {
    root.querySelectorAll('[data-count]').forEach((b, i) => {
      const target = +b.dataset.count || 0;
      if (uiReduced()) { b.textContent = target; return; }
      const t0 = performance.now() + 500 + i * 200;
      const tick = now => {
        if (!b.isConnected) return;
        const k = Math.min(1, Math.max(0, (now - t0) / 700));
        b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---- cover: explorer's passport + controls guide ----
  const SKY_RANKS = [
    [0, '🌱 見習旅人'], [0.08, '🧭 探險新手'], [0.25, '🎒 空島冒險家'],
    [0.5, '⚔️ 雲海戰士'], [0.75, '👑 天空勇者'], [1, '🌟 天空之城傳說'],
  ];
  function guideHtml() {
    const C = uiState.controls;
    const kbd = (...k) => k.map(x => `<span class="kbd">${x}</span>`).join('');
    const row = (ico, html, isNew) => `<div class="aw-guide-row${isNew ? ' new' : ''}"><span class="aw-guide-ico">${ico}</span><span>${html}</span></div>`;
    const extraK = Object.values(C).filter(c => c.kbd).map(c => row(c.icon || '✨', `${kbd(...c.kbd)} ${c.text || ''}`, c.isNew));
    const extraT = Object.values(C).filter(c => c.touch).map(c => row(c.icon || '✨', c.touch, c.isNew));
    const keyboard = [
      row('🏃', `${kbd('W', 'A', 'S', 'D')} 或方向鍵 移動`),
      row('🦘', `${kbd('Space')} 跳躍`),
      row('🦘', `空中再按一次 ${kbd('Space')} ＝ 二段跳`, true),
      ...extraK,
      row('👟', `按住 ${kbd('Shift')} 奔跑`),
      row('⚡', `${kbd('E')} 互動／攻擊怪物`),
      row('🖱️', '拖曳畫面轉視角、滾輪縮放'),
    ].join('');
    const touch = [
      row('🕹️', '左半邊拖曳＝搖桿（推到底奔跑）'),
      row('👆', '右半邊拖曳＝轉視角・雙指縮放'),
      row('🦘', '綠色鈕＝跳躍，空中再按一次＝二段跳', true),
      row('⚡', '橘色鈕＝互動（也可直接點怪物）'),
      ...extraT,
    ].join('');
    const first = isTouch ? ['📱 手機操作', touch] : ['⌨️ 電腦操作', keyboard];
    const other = isTouch ? ['⌨️ 有鍵盤時', keyboard] : ['📱 手機／平板', touch];
    return `<div class="aw-guide-h">${first[0]}</div><div class="aw-guide-grid">${first[1]}</div>
      <details class="aw-guide-more"><summary>${other[0]}怎麼玩？</summary><div class="aw-guide-grid" style="margin-top:6px">${other[1]}</div></details>`;
  }

  function renderStartScreen() {
    if (!els.startStats) return;
    const cleared = totalCleared();
    const total = visibleQuestTotal();
    const frac = total ? cleared / total : 0;
    const pct = Math.round(frac * 100);
    let rank = SKY_RANKS[0][1];
    for (const r of SKY_RANKS) if (frac >= r[0] && (r[0] < 1 || cleared >= total)) rank = r[1];
    const bridges = Object.keys(save.bridgesBuilt || {}).filter(k => save.bridgesBuilt[k]).length;
    const secrets = Object.keys(save.secretsFound || {}).length;
    let extra = '';
    for (const fn of uiState.startStats) { try { extra += fn() || ''; } catch (e) { console.error('[sky ui]', e); } }
    els.startStats.innerHTML = `
      <div class="aw-passport">
        <div class="aw-ring" style="--p:${pct}"><b>${pct}%</b></div>
        <div><div class="aw-rank">${rank}</div>
          <div class="aw-passport-sub">任務 ${cleared} / ${total}</div></div>
      </div>
      <div class="aw-stat"><span>🌉</span><div><b>${bridges} / ${SKY_BRIDGES.length}</b><small>空中橋樑</small></div></div>
      <div class="aw-stat"><span>🏝️</span><div><b>${SKY_ISLANDS.length}</b><small>座浮空島</small></div></div>
      ${secrets ? `<div class="aw-stat"><span>🔮</span><div><b>${secrets}</b><small>秘密發現</small></div></div>` : ''}
      ${extra}`;
    els.guide.innerHTML = guideHtml();
    els.startBtn.textContent = cleared > 0 ? '⚔️ 繼續冒險' : '⚔️ 開始冒險';
    const resume = document.getElementById('sky-start-resume');
    if (resume) {
      const isle = save.lastIsland && isleById(save.lastIsland);
      resume.textContent = isle ? `📍 上次到過：${isle.name}` : '';
    }
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
        els.wrap.innerHTML = '<p style="padding:30px;text-align:center;color:#fff">😢 3D 畫面（WebGL）現在無法啟動。<br>' +
          '請把瀏覽器完全關掉再打開一次；如果還是不行，代表這台裝置不支援 3D 顯示。<br><small style="opacity:.7">' +
          String(err && err.message || err).replace(/[<>&]/g, '') + '</small></p>';
        return;
      }
    }
    // spawn at last visited island
    const isle = isleById(save.lastIsland) || SKY_ISLANDS[0];
    respawnAt(isle, false);
    refreshEquipment();
    emitFx('start');
    hearts = maxHearts();
    playing = true;
    updateHudHearts();
    // ☄️ world-event scheduler: fresh per adventure, first roll ~75s in
    worldEvent = null;
    eventTimer = 0;
    eventCooldown = 75;
    imeToastShown = false;
    // consumable session buffs: one use per adventure
    gliderOn = GameEngine.consumeBuff('glide');
    if (gliderOn) showWorldToast('🪂 滑翔翼啟動！按住跳躍鍵緩慢降落');
    jumpBoostOn = GameEngine.consumeBuff('jump_boost');
    if (jumpBoostOn) showWorldToast('🌨️ 彈跳雲靴啟動！跳躍高度 +40%');
    // active-use items reset per adventure (they're activated in-world, not consumed at start)
    clearActiveItemEffects();
    updateItemTray();
    SkyPlay.onAdventureStart?.();   // PLAY: welcome-back card / tutorial pointer
    if (!rafId) animate();
  }

  // ===================== three.js scene =====================
  function canvasSize() {
    // maximize mode: the wrap goes position:fixed inset:0 (css/sky.css),
    // so the 3D view fills the whole screen
    if (document.body.classList.contains('game-max') && zoneActive()) {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    const w = els.wrap.clientWidth || 800;
    const h = Math.max(360, Math.min(Math.round(w * 0.75), Math.round(window.innerHeight * 0.72)));
    return { w, h };
  }

  function resizeRenderer() {
    if (!threeReady) return;
    const { w, h } = canvasSize();
    SkyArt.resize(w, h);
    els.wrap.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function initThree() {
    const { w, h } = canvasSize();

    // renderer, post FX, sky, lights, clouds and particles: js/sky-art.js
    renderer = SkyArt.createRenderer(w, h, lowPower());
    renderer.domElement.className = 'aw-canvas';
    els.wrap.insertBefore(renderer.domElement, els.wrap.firstChild);
    els.wrap.style.height = h + 'px';

    _v1 = new THREE.Vector3();
    _v2 = new THREE.Vector3();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1800);
    SkyArt.init(ctx);
    hemiLight = SkyArt.hemi;
    sunLight = SkyArt.sun;
    skyDome = SkyArt.dome;
    fogBase = SkyArt.fogBase;   // the storm-boss victory brightens the haze through this

    SKY_ISLANDS.forEach(buildIsland);
    SKY_BRIDGES.forEach(b => {
      if (b.quest && !isBridgeBuilt(b.quest)) return; // built by its quest
      if (b.switch && !save.stairsBuilt[b.switch]) return; // built by its switch
      buildBridge(b);
    });
    SKY_PADS.forEach(buildPad);
    buildQuestObjects();
    buildPortals();
    buildSwitches();
    flushQuestProps();
    AMBIENT_MOBS.forEach(a => spawnMob(a.mob, a.island, a.dx, a.dz));
    buildPlayer();
    setupPointerControls();
    SkyPlay.init(ctx);   // PLAY: coins, pets, egg stand, obby courses (js/sky-play.js)

    clock = new THREE.Timer();
    threeReady = true;
  }

  // ---------- art pipeline: everything visual about the world lives in js/sky-art.js ----------
  // (sky, lights, clouds, island terrain + props, bridges, pads, particles, post FX)
  const GEO = {};
  function geoBox() { return GEO.box || (GEO.box = new THREE.BoxGeometry(1, 1, 1)); }
  function matOf(color, emissive, texKey) { return SkyArt.matOf(color, emissive, texKey); }
  const TEX = SkyArt.TEX;

  function buildIsland(isle) {
    const g = SkyArt.buildIsland(isle);
    islandGroups[isle.id] = g;
    islandBob[isle.id] = 0;
    colliders.push({ kind: 'isle', x: isle.pos[0], z: isle.pos[2], r: isle.r - 0.4, top: isle.pos[1], isle: isle.id });
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
    const pieces = [];

    if (b.style === 'stepstones') {
      // steep climbs get extra, overlapping stones (a stair ramp) so each
      // step rises ≤ ~1.3 — the jump apex is only ~2 units
      const climb = Math.abs(ey - sy);
      const n = Math.max(3, Math.round(span / 3.4), Math.ceil(climb / 1.3));
      const wobble = climb > span * 0.25 ? 0 : 0.5;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const px = sx + (ex - sx) * t;
        const pz = sz + (ez - sz) * t;
        const py = sy + (ey - sy) * t + Math.sin(i * 1.7) * wobble;
        pieces.push({ x: px, y: py, z: pz });
        colliders.push({ kind: 'seg', x: px, z: pz, r: 1.7, top: py });
      }
    } else {
      const segLen = 3;
      const n = Math.max(2, Math.round(span / segLen));
      for (let i = 0; i < n; i++) {
        const tm = (i + 0.5) / n;
        const px = sx + (ex - sx) * tm;
        const pz = sz + (ez - sz) * tm;
        const py = sy + (ey - sy) * tm;
        pieces.push({ x: px, y: py, z: pz, len: span / n + 0.25 });
        colliders.push({ kind: 'seg', x: px, z: pz, r: 1.9, top: py });
      }
    }
    SkyArt.buildBridge(b, pieces, yaw, b.style);
  }

  function buildPad(p) {
    const isle = isleById(p.island);
    if (!isle) return;
    SkyArt.buildPad(p, islandGroups[isle.id]);
    colliders.push({
      kind: 'pad',
      x: isle.pos[0] + p.dx, z: isle.pos[2] + p.dz, r: 2.1,
      top: isle.pos[1] + 0.5, isle: isle.id, launch: p.launch,
    });
  }

  // ===================== quests =====================
  const SKY_REWARD = {
    easy: { xp: 30, gems: 5, ans: 8 },
    medium: { xp: 50, gems: 8, ans: 12 },
    hard: { xp: 80, gems: 12, ans: 16 },
    boss: { xp: 150, gems: 25, ans: 16 },
  };
  const LIVE_TYPES = new Set(['chest', 'gate', 'npc', 'listen', 'pillars',
    'runes', 'arena', 'bridge', 'race', 'boss', 'portal', 'order', 'maze']);

  const interactables = [];    // { q, x, z, isle, marker }
  let quizOpen = false;
  let currentTarget = null;
  let quiz = null;             // quiz overlay DOM refs
  let active = null;           // running quest session

  // totalCleared() drives the galaxy-portal lock math (22/45/48) — hidden
  // secret-realm quests (sqh_) must never count toward it or that math shifts.
  function totalCleared() { return Object.keys(save.completed).filter(k => !k.startsWith('sqh_')).length; }
  function secretCleared() { return Object.keys(save.completed).filter(k => k.startsWith('sqh_')).length; }
  function visibleQuestTotal() { return SKY_QUESTS.filter(q => !q.hidden).length; }
  function isCleared(q) { return (save.completed[q.id] || 0) > 0; }
  function isLocked(q) {
    if (q.lockSecret) return secretCleared() < q.lockSecret;
    return q.lock && totalCleared() < q.lock;
  }

  function markerState(q) {
    if (q.type === 'portal') {
      return isLocked(q) ? { s: '🔒', c: '#cbd5e1' } : { s: '🌀', c: '#c77dff' };
    }
    if (q.type === 'switch') {
      return save.stairsBuilt[q.id] ? { s: '✅', c: '#4ade80' } : { s: '⚙️', c: '#7fe8ff' };
    }
    if (isCleared(q)) return { s: '✓', c: '#4ade80' };
    if (isLocked(q)) return { s: '🔒', c: '#cbd5e1' };
    if (!LIVE_TYPES.has(q.type)) return { s: '⏳', c: '#cbd5e1' };
    return { s: '!', c: '#ffd166' };
  }

  function updateQuestMarkers() {
    for (const it of interactables) {
      const st = markerState(it.q);
      it.markerSym = st.s;
      it.mkKind = MK_OF[st.s] || 'lock';
    }
  }

  // ---- floating quest markers: ONE instanced mesh per marker kind for the whole world ----
  // (they used to be one emoji sprite per quest = ~110 draw calls). 3D "!" / ✓ / 🔒 / gems from
  // SkyArt.questGeo, glowing through the bloom pass; `it.marker` stays a { visible } handle.
  const MK_OF = { '!': 'quest', '✓': 'done', '✅': 'done', '🔒': 'lock', '⏳': 'lock', '🌀': 'portal', '⚙️': 'switch' };
  const MK_KINDS = ['quest', 'done', 'lock', 'portal', 'switch'];
  const MK_SCALE = { quest: 1.1, done: 0.75, lock: 0.85, portal: 1, switch: 1 };
  const mkMesh = {};
  const _mkObj = new THREE.Object3D();
  function buildMarkerMeshes() {
    const cap = interactables.length + 4;
    for (const k of MK_KINDS) {
      const m = new THREE.InstancedMesh(SkyArt.questGeo('mk_' + k), SkyArt.propMat, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
      mkMesh[k] = m;
    }
  }
  function updateMarkers() {
    const n = {};
    for (const k of MK_KINDS) n[k] = 0;
    for (let i = 0; i < interactables.length; i++) {
      const it = interactables[i];
      if (!it.marker.visible) continue;
      // the quest being played right now loses its marker (a boss stands on its altar)
      if ((bossActive && bossActive.q.id === it.q.id) || (arenaActive && arenaActive.q.id === it.q.id)) continue;
      const g = islandGroups[it.isle.id];
      if (!g.visible) continue;
      const dx = it.x - pos.x, dz = it.z - pos.z;
      if (dx * dx + dz * dz > 170 * 170) continue;
      const m = mkMesh[it.mkKind];
      if (!m) continue;
      const sc = MK_SCALE[it.mkKind] * (it.mkKind === 'quest' ? 1 + Math.max(0, Math.sin(simTime * 4 + i)) * 0.08 : 1);
      _mkObj.position.set(it.x, g.position.y + it.mkY + Math.sin(simTime * 2 + i) * 0.25, it.z);
      _mkObj.rotation.set(0, simTime * 1.6 + i, 0);
      _mkObj.scale.set(sc, sc, sc);
      _mkObj.updateMatrix();
      m.setMatrixAt(n[it.mkKind]++, _mkObj.matrix);
    }
    for (const k of MK_KINDS) {
      const m = mkMesh[k];
      if (!m) continue;
      m.count = n[k];
      m.instanceMatrix.needsUpdate = true;
    }
    // quest props: one merged mesh per island, hidden beyond prop distance (like SkyArt's props)
    if ((questLodT -= 1) <= 0) {
      questLodT = 20;
      for (const qm of questMeshes) qm.mesh.visible = Math.hypot(qm.x - camera.position.x, qm.y - camera.position.y, qm.z - camera.position.z) - qm.r < (lowPower() ? 140 : 190);
    }
  }
  let questLodT = 0;
  const questMeshes = [];   // { mesh, x, y, z, r }
  const questBatches = {};  // isleId -> SkyArt.Batch (filled by buildQuestObjects / buildPortals / buildSwitches)
  function questBatch(isleId) { return questBatches[isleId] || (questBatches[isleId] = new SkyArt.Batch()); }
  function flushQuestProps() {
    for (const id in questBatches) {
      const mesh = questBatches[id].mesh(SkyArt.propMat, !lowPower());
      if (!mesh) continue;
      const isle = isleById(id);
      islandGroups[id].add(mesh);
      questMeshes.push({ mesh, x: isle.pos[0], y: isle.pos[1], z: isle.pos[2], r: isle.r });
    }
    buildMarkerMeshes();
    updateQuestMarkers();
    if (window.__skyTest) window.__skyTest.markers = () => MK_KINDS.map(k => k + ':' + mkMesh[k].count).join(' ');
  }
  // face the island centre (props are authored with their "front" on local +z)
  function faceCentre(dx, dz) { return Math.hypot(dx, dz) < 0.5 ? 0 : Math.atan2(-dx, -dz); }

  // little NPC characters (built + idle-animated by js/sky-avatar.js)
  function makeNpcFigure(emoji, tint) {
    return SkyAvatar.makeNpc(emoji, tint);
  }

  function buildQuestObjects() {
    for (const q of SKY_QUESTS) {
      const isle = isleById(q.island);
      const g = islandGroups[q.island];
      if (!isle || !g) continue;
      if (q.type === 'npc') {
        const npc = makeNpcFigure(q.npc || '🙂', 0xc47ab8);
        npc.position.set(q.dx, 0, q.dz);
        npc.rotation.y = faceCentre(q.dx, q.dz);
        g.add(npc);
      } else {
        SkyArt.questProp(questBatch(q.island), q.type, q.dx, q.dz, faceCentre(q.dx, q.dz));
      }
      const st = markerState(q);
      interactables.push({
        q, marker: { visible: true }, markerSym: st.s, mkKind: MK_OF[st.s], mkY: q.type === 'gate' ? 5.6 : q.type === 'race' ? 4.6 : 3.9,
        x: isle.pos[0] + q.dx, z: isle.pos[2] + q.dz, isle,
      });
    }
  }

  // ---- portals (dawn ↔ galaxy) ----
  function buildPortals() {
    for (const p of SKY_PORTALS) {
      const isle = isleById(p.island);
      const g = islandGroups[p.island];
      if (!isle || !g) continue;
      // crater portals (火山口深洞 ↔ 地心世界) get a basalt frame + lava-orange swirl
      const isCraterPortal = p.id.startsWith('portal_crater') || p.id.startsWith('portal_und');
      SkyArt.questProp(questBatch(p.island), 'portal', p.dx, p.dz, 0, isCraterPortal);
      SkyArt.portalSwirl(g, p.dx, p.dz, isCraterPortal);

      const q = { id: p.id, type: 'portal', name: p.name, lock: p.lock, to: p.to };
      const st = markerState(q);
      interactables.push({
        q, marker: { visible: !(p.secret && !save.secretsFound[p.id]) }, markerSym: st.s, mkKind: MK_OF[st.s], mkY: 5.9, secret: !!p.secret,
        x: isle.pos[0] + p.dx, z: isle.pos[2] + p.dz, isle,
      });
    }
  }

  // ---- hidden mechanisms (神秘符文石) that build a stepstone stairway ----
  function buildSwitches() {
    for (const sw of SKY_SWITCHES) {
      const isle = isleById(sw.island);
      const g = islandGroups[sw.island];
      if (!isle || !g) continue;
      SkyArt.questProp(questBatch(sw.island), 'switch', sw.dx, sw.dz, faceCentre(sw.dx, sw.dz));
      const q = { id: sw.id, type: 'switch', name: sw.name, to: sw.to };
      const st = markerState(q);
      interactables.push({
        q, marker: { visible: !!save.secretsFound[sw.id] }, markerSym: st.s, mkKind: MK_OF[st.s], mkY: 3.0, secret: true,
        x: isle.pos[0] + sw.dx, z: isle.pos[2] + sw.dz, isle,
      });
    }
  }

  // reveal a hidden secret portal/switch once the player wanders within range —
  // called every frame from updateWorld() (cheap: ≤12 secret interactables)
  function checkSecretDiscovery() {
    for (const it of interactables) {
      if (!it.secret || save.secretsFound[it.q.id]) continue;
      if (Math.abs(pos.y - it.isle.pos[1]) > 14) continue;
      const d = Math.hypot(pos.x - it.x, pos.z - it.z);
      if (d > 12) continue;
      save.secretsFound[it.q.id] = true;
      persist();
      it.marker.visible = true;
      showWorldToast(it.q.type === 'switch' ? '🔮 發現神秘機關！' : '🔮 發現隱藏傳送門！');
      SoundManager.playAchievement();
      GameEngine.recordSkySecretFound?.();
    }
  }

  // trigger a switch: builds its matching SKY_BRIDGES `switch:` stairway once
  function interactSwitch(q) {
    if (save.stairsBuilt[q.id]) {
      showWorldToast('✅ 機關已啟動');
      return;
    }
    save.stairsBuilt[q.id] = true;
    persist();
    const b = SKY_BRIDGES.find(x => x.switch === q.id);
    if (b) {
      buildBridge(b);
      const target = isleById(b.to);
      showWorldToast(`⚙️ 機關啟動！通往${target ? target.name : '秘境'}的隱藏階梯出現了！`);
    } else {
      showWorldToast('⚙️ 機關啟動！隱藏階梯出現了！');
    }
    SoundManager.playAchievement();
    GameEngine.recordSkySwitch?.();
    updateQuestMarkers();
    // force the ⚡ hint label to refresh immediately (updateInteractTarget()
    // only recomputes text when the nearest target *changes*, and the player
    // is still standing on the same switch right after triggering it)
    currentTarget = null;
  }

  function usePortal(q) {
    const target = isleById(q.to);
    if (!target) return;
    els.flash.classList.add('on');
    setTimeout(() => els.flash.classList.remove('on'), 420);
    pos.x = target.pos[0];
    pos.z = target.pos[2];
    pos.y = target.pos[1] + bobOf(target.id) + 2;
    vy = 0;
    lastGroundIsland = target.id;
    regionUnderground = !!target.underground;
    SoundManager.playAchievement();
    playRegionMusic(target);
    showWorldToast(target.underground ? `🌋 你進入了「${target.name}」！`
      : target.secret ? `🔮 你發現了「${target.name}」！`
      : q.to === 'isle_gx_hub'
        ? '🌌 歡迎來到銀河空島！新的任務在等著你！'
        : '🏝️ 回到了天空之城本土！');
  }

  // nearest quest object in range → Ⓔ hint
  function updateInteractTarget() {
    let best = null, bestD = 4.5;
    for (const it of interactables) {
      if (it.secret && !save.secretsFound[it.q.id]) continue; // not discovered yet
      if (Math.abs(pos.y - it.isle.pos[1]) > 8) continue;
      const d = Math.hypot(pos.x - it.x, pos.z - it.z);
      if (d < bestD) { bestD = d; best = it; }
    }
    // PLAY interactables (egg stand, course arches): a stable { play: true, label, use }
    // object per target, closer than the nearest quest → it wins; `label` may change
    const pt = SkyPlay.target ? SkyPlay.target(pos.x, pos.y, pos.z, bestD) : null;
    if (pt) best = pt;
    if (best === currentTarget && !(best && best.play && best.shown !== best.label)) return;
    currentTarget = best;
    if (!best) { els.hint.style.display = 'none'; return; }
    if (best.play) {
      best.shown = best.label;
      els.hint.textContent = `${isTouch ? '點 ⚡' : '按 E'}　${best.label}`;
      els.hint.style.display = '';
      return;
    }
    const q = best.q;
    const key = isTouch ? '點 ⚡' : '按 E';
    let label;
    if (q.type === 'portal') {
      label = isLocked(q)
        ? `🔒 ${q.name}（完成 ${q.lock} 個任務後開啟，還差 ${q.lock - totalCleared()} 個）`
        : `${key}　🌀 ${q.name}`;
    }
    else if (q.type === 'switch') {
      label = save.stairsBuilt[q.id] ? `✅ ${q.name}（已啟動）` : `${key}　⚙️ ${q.name}`;
    }
    else if (isLocked(q)) {
      label = q.lockSecret
        ? `🔒 ${q.name}（完成更多秘境任務解鎖，還差 ${q.lockSecret - secretCleared()} 個）`
        : `🔒 ${q.name}（再完成 ${q.lock - totalCleared()} 個任務解鎖）`;
    }
    else if (!LIVE_TYPES.has(q.type)) label = `⏳ ${q.name}（即將開放）`;
    else if (isCleared(q)) label = `${key}　🔁 再玩一次「${q.name}」`;
    else label = `${key}　📜 ${q.name}`;
    els.hint.textContent = label;
    els.hint.style.display = '';
  }

  // ===================== UI/UX polish (Part 5) =====================
  let minimapCtx = null;
  let minimapTimer = 0;
  let buffBarTimer = 0;
  let trackerTimer = 0;
  let journalEl = null;
  let cullIdx = 0;
  let fpsFrames = 0, fpsTime = 0, lowPowerSuggested = false;

  const MINI_COLORS = {
    grass: '#5cbf54', forest: '#2e7d3a', water: '#4aa8e8', flower: '#7fd070',
    mushroom: '#9c7bb8', ruin: '#b8b09a', crystal: '#7fd8e8', cloud: '#eef6ff',
    village: '#8fce62', ice: '#cfeaf8', lava: '#e86a2a', pillars: '#c9c3ae',
    bone: '#d8cfae', storm: '#6a6a88',
    nebula: '#8a6acc', star: '#7a7ae0', moon: '#c8c8d8',
    comet: '#5a7ac8', aurora: '#4ae8b0', alien: '#b06ae8',
    cave: '#3a3a4a', lake: '#4aa8d8', mist: '#6a7a6a', temple: '#2a2438',
    garden: '#e8b8d8', vault: '#3a1410', tree: '#8a6a3e', relic: '#e8dfc0',
    cavefloor: '#4a3f38', deepcrystal: '#7a5cc8', magma: '#c8481a',
    bonecave: '#cfc4b0', coretemple: '#3a2410',
  };

  // the player's 省電模式 checkbox, or a device that already proved it needs the low path
  // (SkyArt's quality tiers, stored outside the save in english_savior_sky_gfx)
  function lowPower() { return !!save.settings.lowPower || SkyArt.gfxLow(); }

  function drawMinimap() {
    if (!minimapCtx) return;
    const ctx = minimapCtx;
    const S = 140, C = S / 2;
    const scale = C / 160;                 // 160 world units → map edge
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, C - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(8, 30, 55, 0.72)';
    ctx.fillRect(0, 0, S, S);
    // islands
    for (const isle of SKY_ISLANDS) {
      const dx = (isle.pos[0] - pos.x) * scale;
      const dz = (isle.pos[2] - pos.z) * scale;
      if (Math.abs(dx) > C + 30 || Math.abs(dz) > C + 30) continue;
      ctx.beginPath();
      ctx.arc(C + dx, C + dz, Math.max(2.5, isle.r * scale), 0, Math.PI * 2);
      ctx.fillStyle = MINI_COLORS[isle.type] || '#5cbf54';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // quest dots
    for (const it of interactables) {
      if (it.secret && !save.secretsFound[it.q.id]) continue; // hidden until discovered
      const dx = (it.x - pos.x) * scale;
      const dz = (it.z - pos.z) * scale;
      if (Math.hypot(dx, dz) > C + 6) continue;
      ctx.beginPath();
      ctx.arc(C + dx, C + dz, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = isCleared(it.q) ? '#4ade80' : (isLocked(it.q) ? '#9aa5b5' : '#ffd166');
      ctx.fill();
    }
    // PLAY points of interest: egg stand, course arches, coin trails
    SkyPlay.drawMinimap?.(ctx, C, scale, pos.x, pos.z);
    // tracked quest: pulsing ring (clamped to the rim when far)
    if (save.tracked) {
      const it = interactables.find(x => x.q.id === save.tracked);
      if (it && !isCleared(it.q)) {
        let dx = (it.x - pos.x) * scale, dz = (it.z - pos.z) * scale;
        const d = Math.hypot(dx, dz);
        if (d > C - 8) { dx = dx / d * (C - 8); dz = dz / d * (C - 8); }
        ctx.beginPath();
        ctx.arc(C + dx, C + dz, 5 + Math.sin(simTime * 5) * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // player arrow — the top-down projection (x→right, z→down) mirrors a
    // Y-axis rotation, so the canvas angle is π − yaw, not π + yaw
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(Math.PI - heroYaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    // rim
    ctx.restore();
    ctx.beginPath();
    ctx.arc(C, C, C - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 215, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function usesOf(buffs, type) {
    const b = buffs.find(x => x.type === type && x.uses > 0);
    return b ? b.uses : 0;
  }
  function updateBuffBar() {
    if (!els.buffs) return;
    const buffs = (GameEngine.getState().activeBuffs) || [];
    const chips = [];
    // consumed-once-per-adventure buffs: show a ✓ (no numeric count applies)
    if (gliderOn) chips.push('🪂<sup>✓</sup>');
    if (jumpBoostOn) chips.push('🌨️<sup>✓</sup>');
    // stackable consumables: show remaining uses
    const revive = usesOf(buffs, 'revive');
    if (revive) chips.push(`🪶<sup>×${revive}</sup>`);
    const hint = usesOf(buffs, 'hint');
    if (hint) chips.push(`🔮<sup>×${hint}</sup>`);
    const dxp = usesOf(buffs, 'double_xp');
    if (dxp) chips.push(`📜<sup>×${dxp}</sup>`);
    const dgems = usesOf(buffs, 'double_gems');
    if (dgems) chips.push(`⚗️<sup>×${dgems}</sup>`);
    els.buffs.innerHTML = chips.map(c => `<span class="aw-buff-chip">${c}</span>`).join('');
  }

  // ---- ⚡ active-use item tray (lightning staff / bubble shield / cloud mount) ----
  function updateItemTray() {
    if (!els.itemTray) return;
    const buffs = (GameEngine.getState().activeBuffs) || [];
    const items = ITEM_TYPES.map(type => {
      const b = buffs.find(x => x.type === type && x.uses > 0);
      return b ? { type, uses: b.uses } : null;
    }).filter(Boolean);
    if (!items.length) {
      els.itemTray.innerHTML = '';
      els.itemTray.style.display = 'none';
      return;
    }
    els.itemTray.style.display = '';
    els.itemTray.innerHTML = items.map(it => {
      const meta = ITEM_META[it.type];
      const active = (it.type === 'bubble_shield' && shieldT > 0) || (it.type === 'cloud_mount' && mountT > 0);
      return `<button class="aw-item-btn${active ? ' active' : ''}" data-item="${it.type}" title="${meta.name}（${meta.key} 鍵）">${meta.icon}<span class="aw-item-uses">${it.uses}</span></button>`;
    }).join('');
  }

  function updateTracker() {
    if (!els.tracker) return;
    let it = save.tracked && interactables.find(x => x.q.id === save.tracked);
    if (!it || isCleared(it.q)) {
      if (it && isCleared(it.q)) { save.tracked = null; persist(); }
      // PLAY: with no tracked quest, point newcomers at the tutorial course / egg stand
      it = SkyPlay.tracker ? SkyPlay.tracker() : null;   // { x, z, q: { name } } or null
      if (!it) { els.tracker.style.display = 'none'; return; }
    }
    els.tracker.style.display = '';
    const dx = it.x - pos.x, dz = it.z - pos.z;
    const dist = Math.round(Math.hypot(dx, dz));
    // project the target direction onto the camera's forward/right axes;
    // ➤ glyph points right at 0°, CSS rotation is clockwise
    const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
    const af = dx * -st + dz * -ct;   // ahead (screen up)
    const ar = dx * ct + dz * -st;    // screen right
    const deg = Math.atan2(-af, ar) * 180 / Math.PI;
    els.trackerArrow.style.transform = `rotate(${Math.round(deg)}deg)`;
    els.trackerText.textContent = `${it.q.name}　${dist}m`;
  }

  // ---- quest journal overlay ----
  function toggleJournal() {
    if (journalEl && journalEl.style.display !== 'none') {
      journalEl.style.display = 'none';
      return;
    }
    renderJournal();
  }

  function renderJournal() {
    if (!journalEl) {
      journalEl = document.createElement('div');
      journalEl.className = 'aw-journal';
      els.wrap.appendChild(journalEl);
      journalEl.addEventListener('click', e => { if (e.target === journalEl) journalEl.style.display = 'none'; });
    }
    const prevList = journalEl.querySelector('.aw-j-list');
    const prevScroll = prevList ? prevList.scrollTop : -1;
    const diffLabel = { easy: '簡單', medium: '中等', hard: '困難', boss: '魔王' };
    const groups = new Map();
    for (const q of SKY_QUESTS) {
      if (!groups.has(q.island)) groups.set(q.island, []);
      groups.get(q.island).push(q);
    }
    let rows = '';
    for (const [isleId, qs] of groups) {
      const isle = isleById(isleId);
      // a secret realm is "revealed" once any secret portal or hidden-stairway
      // switch into it has been found, or one of its quests is already cleared
      // (can't clear without having found the entrance first) — until then,
      // mask the whole section
      const revealed = !isle.secret || SKY_PORTALS.some(p => p.secret && p.to === isleId && save.secretsFound[p.id])
        || SKY_SWITCHES.some(sw => sw.to === isleId && save.secretsFound[sw.id])
        || qs.some(q => isCleared(q));
      const shown = qs.filter(q => !(q.hidden && !revealed));
      const done = shown.filter(q => isCleared(q)).length;
      const full = revealed && shown.length > 0 && done === shown.length;
      const here = revealed && isleId === currentIsland;
      rows += `<div class="aw-j-island${here ? ' here' : ''}${full ? ' full' : ''}">
          <span>${revealed ? `${full ? '🏅' : (isle.underground ? '🌋' : '🏝️')} ${isle.name}` : '❓ ？？？（秘境）'}</span>
          ${revealed ? `<span class="aw-j-n">${here ? '📍 ' : ''}${done}/${shown.length}</span><span class="aw-bar"><i style="--p:${shown.length ? done / shown.length * 100 : 0}%"></i></span>` : ''}
        </div>`;
      for (const q of qs) {
        if (q.hidden && !revealed) {
          rows += `
            <div class="aw-j-row">
              <span class="aw-j-icon">❓</span>
              <span class="aw-j-name">？？？（秘境任務）</span>
            </div>`;
          continue;
        }
        const cleared = isCleared(q);
        const locked = isLocked(q);
        const icon = cleared ? '✅' : (locked ? '🔒' : (q.type === 'boss' ? '⛈️' : '📜'));
        const count = save.completed[q.id] ? `<span class="aw-j-count">×${save.completed[q.id]}</span>` : '';
        const tier = SKY_REWARD[q.diff];
        const tracked = save.tracked === q.id;
        const trackBtn = cleared ? '' :
          `<button class="aw-j-track${tracked ? ' on' : ''}" data-track="${q.id}">${tracked ? '🧭 追蹤中' : '追蹤'}</button>`;
        rows += `
          <div class="aw-j-row${cleared ? ' done' : ''}">
            <span class="aw-j-icon">${icon}</span>
            <span class="aw-j-name">${q.name}${count}</span>
            <span class="aw-j-diff ${q.diff}">${diffLabel[q.diff]}</span>
            <span class="aw-j-reward">${tier.xp}XP+${tier.gems}💎</span>
            ${trackBtn}
          </div>`;
      }
    }
    const tc = totalCleared(), tv = visibleQuestTotal();
    journalEl.innerHTML = `
      <div class="aw-j-card">
        <div class="aw-j-head">
          <span class="aw-j-title">📜 任務日誌</span>
          <span class="aw-j-total"><span class="aw-bar"><i style="--p:${tv ? tc / tv * 100 : 0}%"></i></span>${tc} / ${tv}</span>
          <button class="aw-quiz-close" id="sky-j-close" title="關閉">✕</button>
        </div>
        <div class="aw-j-list">${rows}</div>
      </div>`;
    journalEl.style.display = '';
    const list = journalEl.querySelector('.aw-j-list');
    if (prevScroll >= 0) {
      list.style.scrollBehavior = 'auto';
      list.scrollTop = prevScroll;
    } else {
      const here = list.querySelector('.aw-j-island.here');
      if (here) {
        list.style.scrollBehavior = 'auto';
        list.scrollTop = Math.max(0, here.getBoundingClientRect().top - list.getBoundingClientRect().top - 8);
      }
    }
    journalEl.querySelector('#sky-j-close').addEventListener('click', () => {
      journalEl.style.display = 'none';
    });
    journalEl.querySelectorAll('[data-track]').forEach(btn => {
      btn.addEventListener('click', () => {
        save.tracked = save.tracked === btn.dataset.track ? null : btn.dataset.track;
        persist();
        renderJournal();
        updateTracker();
      });
    });
  }

  // ---- confetti celebration ----
  function spawnConfetti(n = 36) {
    SkyAvatar.celebrate(n); // 3D confetti burst + the hero cheers
    const colors = ['#ffd166', '#ff6b81', '#4ade80', '#7fd4ff', '#c77dff', '#fff'];
    const shapes = ['', 'round', 'star', ''];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'aw-confetti ' + shapes[i % shapes.length];
      c.style.left = 4 + Math.random() * 92 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.5 + 's';
      c.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      c.style.setProperty('--sway', (Math.random() * 120 - 60) + 'px');
      els.wrap.appendChild(c);
      setTimeout(() => c.remove(), 3400);
    }
  }

  // ---- distance culling + fps watchdog (called from updateWorld) ----
  function updateCulling() {
    for (let k = 0; k < 2; k++) {
      cullIdx = (cullIdx + 1) % SKY_ISLANDS.length;
      const isle = SKY_ISLANDS[cullIdx];
      const g = islandGroups[isle.id];
      if (g) g.visible = Math.hypot(isle.pos[0] - pos.x, isle.pos[2] - pos.z) < 340;
    }
    // mobs live directly on `scene` (not inside their island's group), so they
    // aren't covered by the culling above — hide them once their home island
    // is far away too (they'd be invisible/unreachable behind that island's
    // own cull anyway). Mob count is small (<25), so a full pass each frame is cheap.
    for (const m of mobs) {
      if (m.gone) continue;
      if (m.def.flies) {
        // free-flying mobs aren't tied to their home island's group visibility
        m.mesh.visible = Math.hypot(pos.x - m.mesh.position.x, pos.z - m.mesh.position.z) < 120;
        continue;
      }
      const g = islandGroups[m.isle.id];
      m.mesh.visible = !g || g.visible;
    }
  }

  function watchFps(dt) {
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 5) {
      const fps = fpsFrames / fpsTime;
      fpsFrames = 0;
      fpsTime = 0;
      if (fps < 18 && !lowPower() && !lowPowerSuggested) {
        lowPowerSuggested = true;
        showWorldToast('🔋 畫面有點卡？回到開始畫面勾選「省電模式」會更順！');
      }
    }
  }

  // ===================== combat & advanced quests (Part 3) =====================
  const mobs = [];
  let lastDamageAt = -100;
  let bolt = null;             // { mesh, t, from, to, mob }
  let arenaActive = null;      // { q, remaining }
  let raceActive = null;       // { q, idx, time, rings, sinceQ }
  let runeActive = null;       // { q, wordIdx, entry, orbs, collected }
  let orderActive = null;      // { q, entry, words, sentence, zh, stones, idx, done, standingOn, usedTexts }
  let mazeActive = null;       // { q, startX, startZ, isleY, nodes, idx, chest }
  let SENTENCE_POOL = null;    // cached order-quest word-order sentence pool
  let bossActive = null;       // { q, mob, phase, sinceSummon, shockT, warnT, waveR, waveHit }
  let bossParts = null;
  let shockRing = null, warnRing = null;
  let raidWarnRing = null;  // dive-telegraph ring for storm_falcon air raids (Wave 2)
  let raycaster = null;
  let combatHud = null;        // { bossBar, bossFill, bossLabel, race }

  const AMBIENT_MOBS = [
    { mob: 'slime', island: 'isle_meadow', dx: -6, dz: 8 },
    { mob: 'slime', island: 'isle_mushroom', dx: 5, dz: 4 },
    { mob: 'slime', island: 'isle_falls', dx: 6, dz: -5 },
    { mob: 'wisp', island: 'isle_crystal', dx: -4, dz: -6 },
    { mob: 'wisp', island: 'isle_cloud', dx: -5, dz: -5 },
    { mob: 'bat', island: 'isle_ruins', dx: -4, dz: -6 },
    // galaxy region
    { mob: 'starling', island: 'isle_gx_nebula', dx: 6, dz: 6 },
    { mob: 'starling', island: 'isle_gx_aurora', dx: 0, dz: -8 },
    { mob: 'shade', island: 'isle_gx_void', dx: -4, dz: -4 },
    { mob: 'shade', island: 'isle_gx_twin', dx: 6, dz: 5 },
    // secret realms (elites)
    { mob: 'golem', island: 'isle_sc_cave', dx: -4, dz: -10 },
    { mob: 'lurker', island: 'isle_sc_lake', dx: 6, dz: 10 },
    { mob: 'knight', island: 'isle_sc_mist', dx: -4, dz: 4 },
    { mob: 'lurker', island: 'isle_sc_mist', dx: 4, dz: -6 },
    { mob: 'knight', island: 'isle_sc_temple', dx: 6, dz: -6 },
    // 地心世界 (underground)
    { mob: 'magma_slime', island: 'isle_und_hub', dx: 6, dz: 6 },
    { mob: 'magma_bat', island: 'isle_und_cavern', dx: 4, dz: 4 },
    { mob: 'magma_slime', island: 'isle_und_cavern', dx: -8, dz: -3 },
    { mob: 'magma_bat', island: 'isle_und_magma', dx: 7, dz: 3 },
    { mob: 'magma_slime', island: 'isle_und_magma', dx: -7, dz: -4 },
    { mob: 'magma_bat', island: 'isle_und_bones', dx: 3, dz: 7 },
  ];

  function mobDef(id) { return SKY_MOBS.find(m => m.id === id); }

  // creature look + animation live in js/sky-avatar.js (keeps g.userData.body / .wings)
  function makeMobMesh(def) {
    return SkyAvatar.makeMob(def);
  }

  function spawnMob(defId, isleId, dx, dz, questId) {
    const def = mobDef(defId);
    const isle = isleById(isleId);
    if (!def || !isle) return null;
    const mesh = makeMobMesh(def);
    const x = isle.pos[0] + dx, z = isle.pos[2] + dz;
    mesh.position.set(x, isle.pos[1], z);
    scene.add(mesh);
    const mob = {
      def, isle, mesh, hp: def.hp, dead: false, gone: false,
      home: { x, z }, angle: Math.random() * 6.28,
      cooldown: 0, boost: 0, shieldT: 0, fade: 0, questId: questId || null,
    };
    if (def.flies) {
      mob.air = { state: 'patrol', t: 0, dur: 3 + Math.random() * 3, angle: Math.random() * 6.28 };
    }
    mesh.traverse(o => { o.userData.mobRef = mob; });
    mesh.userData.mobRef = mob;
    mobs.push(mob);
    return mob;
  }

  function despawnQuestMobs(questId) {
    for (const m of mobs) {
      if (m.questId === questId && !m.gone) {
        m.gone = true;
        scene.remove(m.mesh);
      }
    }
  }

  function clearActiveItemEffects() {
    shieldT = 0;
    mountT = 0;
    mountWarned = false;
    if (shieldMesh) shieldMesh.visible = false;
    if (mountMesh) mountMesh.visible = false;
  }

  function damagePlayer(n, sx, sz) {
    if (!playing) return;
    if (shieldT > 0) {
      showWorldToast('🫧 泡泡護罩擋下了攻擊！');
      return;
    }
    hearts -= n;
    lastDamageAt = simTime;
    emitFx('hurt', { n });
    els.flash.classList.add('red', 'on');
    setTimeout(() => els.flash.classList.remove('on', 'red'), 350);
    SoundManager.playWrong();
    if (sx !== undefined) {
      // knockback away from the attacker
      const dx = pos.x - sx, dz = pos.z - sz;
      const d = Math.hypot(dx, dz) || 1;
      pos.x += (dx / d) * 2.2;
      pos.z += (dz / d) * 2.2;
      vy = 5;
      grounded = false;
    }
    if (hearts <= 0) {
      if (GameEngine.consumeBuff('revive')) {
        hearts = maxHearts();
        showWorldToast('💖 復活羽毛救了你！');
      } else {
        softKO();
      }
    }
    updateHudHearts();
  }

  // 🏠 safety teleport back to the starting island — guarantees the player
  // can never be stranded, whatever the world layout (no heart penalty)
  function goHome() {
    if (!playing || quizOpen) return;
    if (raceActive) cancelRace('🏁 競速取消了');
    if (orderActive) cancelOrder('');
    if (mazeActive) cancelMaze('');
    if (arenaActive) {
      despawnQuestMobs(arenaActive.q.id);
      arenaActive = null;
    }
    if (bossActive) resetBoss();   // the boss waits on its altar (full HP) — same as a KO
    const dawn = SKY_ISLANDS[0];
    pos.x = dawn.pos[0];
    pos.z = dawn.pos[2];
    pos.y = dawn.pos[1] + bobOf(dawn.id) + 2;
    vy = 0;
    lastGroundIsland = dawn.id;
    clearActiveItemEffects();
    updateItemTray();
    showWorldToast('🏠 回到晨曦之島！');
    SoundManager.playCorrect();
  }

  function softKO() {
    showWorldToast('💫 你被擊倒了，在晨曦之島醒來…（任務進度保留）');
    if (arenaActive) {
      despawnQuestMobs(arenaActive.q.id);
      arenaActive = null;
    }
    if (bossActive) resetBoss();
    if (raceActive) cancelRace('');
    if (orderActive) cancelOrder('');
    if (mazeActive) cancelMaze('');
    if (worldEvent) endWorldEvent(); // KO during a raid/meteor shower ends it quietly (no reward)
    hearts = maxHearts();
    const dawn = SKY_ISLANDS[0];
    pos.x = dawn.pos[0]; pos.z = dawn.pos[2]; pos.y = dawn.pos[1] + 2;
    vy = 0;
    clearActiveItemEffects();
    updateItemTray();
  }

  // ---- combat quiz ----
  function combatDiff(mob) {
    if (mob.isBoss) return bossActive && bossActive.phase === 2 ? 'hard' : 'medium';
    if (mob.questId) {
      const q = SKY_QUESTS.find(x => x.id === mob.questId);
      if (q) return q.diff;
    }
    return mob.def.diff;
  }

  function openCombatQuiz(mob) {
    if (quizOpen || !mob || mob.dead) return;
    if (mob.def.flies && !flyerAttackable(mob)) {
      showWorldToast('🦅 牠飛得太高了，等牠俯衝時再攻擊！');
      return;
    }
    const d = Math.hypot(pos.x - mob.mesh.position.x, pos.z - mob.mesh.position.z);
    if (d > 14) { showWorldToast('🏃 再靠近一點才能攻擊！'); return; }
    ensureQuizDom();
    active = {
      combat: mob,
      q: { name: mob.def.name, diff: combatDiff(mob), n: mob.hp, type: 'combat' },
      replay: false, wrongThis: false, anyWrong: false, step: 0, ttsText: null,
    };
    quizOpen = true;
    keys.f = keys.b = keys.l = keys.r = 0;
    joy.dx = joy.dy = 0;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.add('on');
    quiz.npc.style.display = 'none';
    quiz.tts.style.display = 'none';
    quiz.fb.textContent = '';
    quiz.zh.textContent = '';
    askCombat();
  }

  function askCombat() {
    const mob = active && active.combat;
    if (!mob || mob.dead) { closeQuiz(); return; }
    active.wrongThis = false;
    quiz.name.textContent = `⚔️ ${mob.def.name}`;
    quiz.prog.textContent = '❤️'.repeat(Math.max(0, mob.hp));
    quiz.fb.textContent = '';
    quiz.fb.className = 'aw-quiz-feedback';
    const useGrammar = mob.isBoss
      ? bossActive && bossActive.phase === 2
      : mob.def.quiz === 'grammar';
    const diff = active.q.diff;
    if (useGrammar) {
      const entry = GRAMMAR_DATA[Math.floor(Math.random() * GRAMMAR_DATA.length)];
      const options = shuffled(entry.options.slice());
      quiz.prompt.innerHTML = entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>');
      quiz.zh.textContent = entry.translation || '';
      renderOptions(options, options.indexOf(entry.blank),
        () => onCombatCorrect(mob, false, null, entry.explain),
        null, () => onCombatWrong(mob));
      if (perks.dropWrong) autoEliminateOne();
    } else {
      const pool = vocabPool(diff);
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const distract = pickN(pool.filter(e => e.word !== entry.word), 3).map(e => e.word);
      const options = shuffled([entry.word, ...distract]);
      quiz.prompt.innerHTML = `${entry.hint} ${entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>')}`;
      quiz.zh.innerHTML = zhPretty(entry.zh);
      renderOptions(options, options.indexOf(entry.word),
        () => onCombatCorrect(mob, true, entry.word),
        null, () => onCombatWrong(mob));
    }
  }

  function onCombatCorrect(mob, isVocab, word, explain) {
    awardAnswer(isVocab, word);
    quiz.fb.textContent = explain ? `✨ 魔法彈發射！${explain}` : '✨ 魔法彈發射！';
    quiz.fb.className = 'aw-quiz-feedback good';
    fireBolt(mob);
  }

  function onCombatWrong(mob) {
    // no HP loss for the player — the mob shields and gets a new question
    mob.shieldT = 0.6;
    mob.boost = 2;
    quiz.fb.textContent = '🛡️ 怪物擋下了攻擊！換一題再試！';
    quiz.fb.className = 'aw-quiz-feedback';
    setTimeout(() => { if (active && active.combat === mob) askCombat(); }, 900);
  }

  function fireBolt(mob) {
    if (!bolt) {
      bolt = { mesh: SkyAvatar.makeBolt(), t: -1, mob: null };
      scene.add(bolt.mesh);
      bolt.mesh.visible = false;
    }
    bolt.t = 0;
    bolt.mob = mob;
    bolt.from = { x: pos.x, y: pos.y + 1.5, z: pos.z };
    bolt.mesh.visible = true;
  }

  function updateBolt(dt) {
    if (!bolt || bolt.t < 0) return;
    bolt.t += dt * 3.2;
    const m = bolt.mob.mesh.position;
    const ty = m.y + 1;
    if (bolt.t >= 1) {
      bolt.t = -1;
      bolt.mesh.visible = false;
      hitMob(bolt.mob);
      return;
    }
    bolt.mesh.position.set(
      bolt.from.x + (m.x - bolt.from.x) * bolt.t,
      bolt.from.y + (ty - bolt.from.y) * bolt.t + Math.sin(bolt.t * Math.PI) * 1.2,
      bolt.from.z + (m.z - bolt.from.z) * bolt.t
    );
    bolt.mesh.rotation.z += dt * 12;
    SkyAvatar.boltTrail(bolt.mesh.position.x, bolt.mesh.position.y, bolt.mesh.position.z);
  }

  function hitMob(mob) {
    if (mob.dead) return;
    SkyAvatar.mobHit(mob);
    mob.hp -= perks.dmg || 1;   // 冠軍 ×2 / 五十級傳說 ×1.5
    if (mob.isBoss) { onBossHit(mob); return; }
    if (mob.hp <= 0) {
      killMob(mob);
    } else if (active && active.combat === mob) {
      setTimeout(() => { if (active && active.combat === mob) askCombat(); }, 500);
    }
  }

  function killMob(mob) {
    mob.dead = true;
    GameEngine.addGems(2);
    uiPop('gem', 2);
    SoundManager.playCorrect();
    showWorldToast(`⚔️ 擊敗 ${mob.def.name}！+2💎`);
    if (active && active.combat === mob) closeQuiz();
    if (mob.questId && arenaActive && arenaActive.q.id === mob.questId) {
      arenaActive.remaining--;
      if (arenaActive.remaining <= 0) {
        const q = arenaActive.q;
        arenaActive = null;
        setTimeout(() => finishQuestDirect(q), 700);
      } else {
        showWorldToast(`⚔️ 還剩 ${arenaActive.remaining} 隻！`);
      }
    }
  }

  // ===================== ⚡ active-use item consumables (Wave 4) =====================
  function spawnLightningLine(mob) {
    const line = SkyAvatar.lightning(pos.x, pos.y + 1.4, pos.z,
      mob.mesh.position.x, mob.mesh.position.y + 1, mob.mesh.position.z);
    scene.add(line);
    lightningLines.push({ mesh: line, t: 0.3 });
  }

  function updateLightningLines(dt) {
    for (let i = lightningLines.length - 1; i >= 0; i--) {
      const L = lightningLines[i];
      L.t -= dt;
      L.mesh.material.opacity = Math.max(0, L.t / 0.3);
      if (L.t <= 0) {
        scene.remove(L.mesh);
        L.mesh.geometry.dispose();
        L.mesh.material.dispose();
        lightningLines.splice(i, 1);
      }
    }
  }

  function ensureShieldMesh() {
    if (shieldMesh || !player) return;
    shieldMesh = SkyAvatar.makeShield();
    shieldMesh.position.y = 1.05;
    shieldMesh.visible = false;
    player.add(shieldMesh);
  }

  function ensureMountMesh() {
    if (mountMesh || !player) return;
    mountMesh = SkyAvatar.makeMount();
    mountMesh.visible = false;
    player.add(mountMesh);
  }

  // 按 Q/R/F 或點擊道具列啟用主動道具（僅在冒險中、非答題時可用）
  function useActiveItem(type) {
    if (!playing || quizOpen) return;
    if (!GameEngine.hasBuff(type)) return;
    if (type === 'lightning_staff') {
      const targets = mobs.filter(m => !m.dead && !m.gone &&
        Math.hypot(m.mesh.position.x - pos.x, m.mesh.position.z - pos.z) <= 12);
      if (!targets.length) {
        showWorldToast('附近沒有怪物');
        return;
      }
      GameEngine.consumeBuff('lightning_staff');
      targets.forEach(m => { hitMob(m); spawnLightningLine(m); });
      els.flash.classList.add('on');
      setTimeout(() => els.flash.classList.remove('on'), 300);
      SoundManager.playCorrect();
      showWorldToast(`⚡ 雷霆法杖電擊了 ${targets.length} 隻怪物！`);
      GameEngine.recordSkyItemUse();
    } else if (type === 'bubble_shield') {
      GameEngine.consumeBuff('bubble_shield');
      ensureShieldMesh();
      shieldT = 15;
      if (shieldMesh) shieldMesh.visible = true;
      showWorldToast('🫧 泡泡護罩展開！15 秒內無敵');
      GameEngine.recordSkyItemUse();
    } else if (type === 'cloud_mount') {
      GameEngine.consumeBuff('cloud_mount');
      ensureMountMesh();
      mountT = 12;
      mountWarned = false;
      if (mountMesh) mountMesh.visible = true;
      showWorldToast('☁️ 飛天雲召喚成功！自由飛行 12 秒');
      GameEngine.recordSkyItemUse();
    } else {
      return;
    }
    updateBuffBar();
    updateItemTray();
  }

  function updateMobs(dt) {
    for (const mob of mobs) {
      if (mob.gone) continue;
      const isleTop = mob.isle.pos[1] + bobOf(mob.isle.id);
      if (mob.dead) {
        mob.fade += dt;
        SkyAvatar.mobDying(mob, dt); // wobble → poof
        if (mob.fade > 0.55) { mob.gone = true; scene.remove(mob.mesh); }
        continue;
      }
      if (mob.isBoss) continue; // boss animated in updateBoss
      if (mob.def.flies) { updateFlyer(mob, dt); continue; } // free-flight AI (☄️ world events)
      // idle animation / hop / hit flash (presentation: js/sky-avatar.js)
      SkyAvatar.animateMob(mob, dt);
      if (mob.shieldT > 0) mob.shieldT -= dt;
      mob.mesh.position.y = isleTop;
      if (quizOpen || playLocked()) continue;   // combat/quiz (or a PLAY panel: egg hatching, shop) pauses mob AI
      mob.cooldown -= dt;
      mob.boost -= dt;

      const dxp = pos.x - mob.mesh.position.x;
      const dzp = pos.z - mob.mesh.position.z;
      const distP = Math.hypot(dxp, dzp);
      const sameLevel = Math.abs(pos.y - isleTop) < 6;
      let vx = 0, vz = 0;
      if (distP < 12 && sameLevel) {
        const sp = mob.def.speed * (perks.mobSlow || 1) * (mob.boost > 0 ? 1.5 : 1);
        vx = (dxp / (distP || 1)) * sp;
        vz = (dzp / (distP || 1)) * sp;
      } else {
        mob.angle += dt * 0.5;
        const tx = mob.home.x + Math.cos(mob.angle) * 3.5;
        const tz = mob.home.z + Math.sin(mob.angle) * 3.5;
        const dxh = tx - mob.mesh.position.x, dzh = tz - mob.mesh.position.z;
        const dh = Math.hypot(dxh, dzh);
        if (dh > 0.3) {
          vx = (dxh / dh) * mob.def.speed * 0.45;
          vz = (dzh / dh) * mob.def.speed * 0.45;
        }
      }
      let nx = mob.mesh.position.x + vx * dt;
      let nz = mob.mesh.position.z + vz * dt;
      // stay on the island
      const cx = mob.isle.pos[0], cz = mob.isle.pos[2];
      const dc = Math.hypot(nx - cx, nz - cz);
      const maxR = mob.isle.r - 1.2;
      if (dc > maxR) {
        nx = cx + ((nx - cx) / dc) * maxR;
        nz = cz + ((nz - cz) / dc) * maxR;
      }
      mob.mesh.position.x = nx;
      mob.mesh.position.z = nz;
      if (vx || vz) mob.mesh.rotation.y = Math.atan2(vx, vz);

      // contact damage (elites use a larger scaled-up hitbox to match their bigger mesh)
      if (distP < 1.35 * (mob.def.scale || 1) && sameLevel && Math.abs(pos.y - isleTop) < 2.4 && mob.cooldown <= 0) {
        mob.cooldown = 2.5;
        damagePlayer(1, mob.mesh.position.x, mob.mesh.position.z);
      }
    }
  }

  // ---- flying mob AI (☄️ 天空事件系統 — air raid storm_falcons) ----
  // state machine on mob.air: patrol (circle above home) → telegraph (dip low
  // + warning ring, 1.2s) → dive (fast low swoop at the player, one hit) →
  // recover (climb back to patrol height) → patrol again.
  function ensureRaidWarnRing() {
    if (raidWarnRing) return;
    raidWarnRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.16, 6, 28),
      new THREE.MeshLambertMaterial({ color: 0xff5555, emissive: 0xaa2222, transparent: true, opacity: 0.8 })
    );
    raidWarnRing.rotation.x = Math.PI / 2;
    raidWarnRing.visible = false;
    scene.add(raidWarnRing);
  }

  // kid-friendly: falcons only take damage while flying low (telegraph, the
  // dive itself, and the first ~1s of recovery) — not while circling high overhead.
  function flyerAttackable(mob) {
    const air = mob.air;
    if (!air) return false;
    return air.state === 'telegraph' || air.state === 'dive' ||
      (air.state === 'recover' && air.t < 1.0);
  }

  function updateFlyer(mob, dt) {
    SkyAvatar.animateMob(mob, dt);
    if (mob.shieldT > 0) mob.shieldT -= dt;
    if (quizOpen) return; // combat quiz freezes state timers (kid-friendly)
    const air = mob.air;
    air.t += dt;
    const homeX = mob.home.x, homeZ = mob.home.z;
    const groundY = mob.isle.pos[1] + bobOf(mob.isle.id);
    const patrolY = groundY + 12;

    if (air.state === 'patrol') {
      air.angle += dt * 0.5;
      const tx = homeX + Math.cos(air.angle) * 10;
      const tz = homeZ + Math.sin(air.angle) * 10;
      mob.mesh.position.set(tx, patrolY, tz);
      mob.mesh.rotation.y = air.angle + Math.PI / 2;
      if (air.t >= air.dur) {
        air.state = 'telegraph';
        air.t = 0; air.dur = 1.2;
        air.targetX = pos.x; air.targetZ = pos.z;
        air.startX = tx; air.startY = patrolY; air.startZ = tz;
        air.lowY = groundY + 1.6; // low enough to be within the player's vertical hit/attack tolerance
        ensureRaidWarnRing();
        raidWarnRing.visible = true;
        SoundManager.playWrong(); // screech cue
      }
      return;
    }
    if (air.state === 'telegraph') {
      const k = Math.min(1, air.t / air.dur);
      mob.mesh.position.set(
        air.startX + (air.targetX - air.startX) * k,
        air.startY + (air.lowY - air.startY) * k,
        air.startZ + (air.targetZ - air.startZ) * k
      );
      if (raidWarnRing) {
        raidWarnRing.position.set(air.targetX, groundY + 0.3, air.targetZ);
        raidWarnRing.material.opacity = 0.4 + Math.abs(Math.sin(simTime * 8)) * 0.5;
      }
      if (air.t >= air.dur) {
        air.state = 'dive';
        air.t = 0; air.dur = 0.45;
        air.diveStartX = mob.mesh.position.x;
        air.diveStartY = mob.mesh.position.y;
        air.diveStartZ = mob.mesh.position.z;
        air.hitDone = false;
        if (raidWarnRing) raidWarnRing.visible = false;
      }
      return;
    }
    if (air.state === 'dive') {
      const k = Math.min(1, air.t / air.dur);
      mob.mesh.position.set(
        air.diveStartX + (air.targetX - air.diveStartX) * k,
        air.diveStartY,
        air.diveStartZ + (air.targetZ - air.diveStartZ) * k
      );
      if (!air.hitDone) {
        const d = Math.hypot(pos.x - mob.mesh.position.x, pos.z - mob.mesh.position.z);
        if (d < 1.6 && Math.abs(pos.y - mob.mesh.position.y) < 3) {
          air.hitDone = true;
          damagePlayer(1, mob.mesh.position.x, mob.mesh.position.z);
        }
      }
      if (air.t >= air.dur) {
        air.state = 'recover';
        air.t = 0; air.dur = 1.5;
        air.recoverStartX = mob.mesh.position.x;
        air.recoverStartY = mob.mesh.position.y;
        air.recoverStartZ = mob.mesh.position.z;
      }
      return;
    }
    // recover
    const k = Math.min(1, air.t / air.dur);
    mob.mesh.position.set(
      air.recoverStartX,
      air.recoverStartY + (patrolY - air.recoverStartY) * k,
      air.recoverStartZ
    );
    if (air.t >= air.dur) {
      air.state = 'patrol';
      air.t = 0; air.dur = 3 + Math.random() * 3;
      air.angle = Math.atan2(air.recoverStartZ - homeZ, air.recoverStartX - homeX) || 0;
    }
  }

  // ---- arena ----
  function startArena(q) {
    if (arenaActive && arenaActive.q.id === q.id) {
      showWorldToast(`⚔️ 還剩 ${arenaActive.remaining} 隻，點擊怪物攻擊！`);
      return;
    }
    if (arenaActive) despawnQuestMobs(arenaActive.q.id);
    arenaActive = { q, remaining: q.n };
    for (let i = 0; i < q.n; i++) {
      const a = (i / q.n) * Math.PI * 2;
      spawnMob(q.mob, q.island, q.dx + Math.cos(a) * 5, q.dz + Math.sin(a) * 5, q.id);
    }
    showWorldToast(`⚔️ ${q.name}：點擊怪物（或按 ⚡）用英語魔法擊敗 ${q.n} 隻！`);
    SoundManager.playAchievement();
  }

  // finish a quest that has no quiz session running (arena / race / runes / boss)
  function finishQuestDirect(q) {
    ensureQuizDom();
    active = { q, replay: isCleared(q), wrongThis: false, anyWrong: false, step: q.n, ttsText: null };
    quizOpen = true;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.add('on');
    quiz.name.textContent = `📜 ${q.name}`;
    quiz.npc.style.display = 'none';
    quiz.tts.style.display = 'none';
    completeQuest();
  }

  // ---- word spelling (bridge quest + rune arranging) ----
  function pickWordEntry(diff, maxLen = 7) {
    const pool = vocabPool(diff).filter(e => new RegExp(`^[A-Za-z]{3,${maxLen}}$`).test(e.word));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderSpelling(entry, extraLetters, onDone) {
    const word = entry.word.toUpperCase();
    if (active) active.spellEntry = entry;
    let idx = 0;
    quiz.prompt.innerHTML = `${entry.hint} <span class="aw-spell-slots" id="sky-spell-slots"></span>`;
    quiz.zh.innerHTML = zhPretty(entry.zh);
    quiz.tts.style.display = 'none';
    const slotsEl = quiz.prompt.querySelector('#sky-spell-slots');
    const renderSlots = () => {
      slotsEl.innerHTML = word.split('').map((c, i) =>
        `<span class="aw-tile${i < idx ? ' on' : ''}${i === idx - 1 ? ' pop' : ''}">${i < idx ? c : ''}</span>`).join('');
    };
    renderSlots();
    const letters = shuffled([...word.split(''), ...(extraLetters || [])]);
    quiz.opts.innerHTML = '';
    uiStepAnim();
    const grid = document.createElement('div');
    grid.className = 'aw-letters';
    letters.forEach(ch => {
      const b = document.createElement('button');
      b.className = 'aw-opt aw-letter';
      b.textContent = ch;
      b.dataset.letter = ch;
      b.addEventListener('click', () => {
        if (!active || b.disabled) return;
        if (ch === word[idx]) {
          idx++;
          b.disabled = true;
          b.classList.add('right');
          uiBurst(b);
          SoundManager.playCorrect();
          renderSlots();
          if (idx >= word.length) {
            TTSManager.speak(entry.word, 'en-US');
            quiz.fb.textContent = `✨ ${entry.word} — ${zhShort(entry)}`;
            quiz.fb.className = 'aw-quiz-feedback good';
            setTimeout(onDone, 900);
          }
        } else {
          b.classList.add('wrong');
          markWrong();
          SoundManager.playWrong();
          setTimeout(() => b.classList.remove('wrong'), 500);
        }
      });
      grid.appendChild(b);
    });
    quiz.opts.appendChild(grid);
    // hint crystal: reveal (auto-press) the next correct letter
    if (active) {
      active.hintFn = () => {
        const next = word[idx];
        const btn = [...grid.querySelectorAll('button')].find(b => !b.disabled && b.dataset.letter === next);
        if (btn) btn.click();
      };
      updateHintBtn();
    }
  }

  function askSpellWord() {
    const entry = pickWordEntry(active.q.diff);
    const decoys = pickN('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !entry.word.toUpperCase().includes(c)), 3);
    renderSpelling(entry, decoys, () => {
      awardAnswer(true, entry.word);
      active.step++;
      renderProg();
      if (active.q.type === 'bridge' && active.step < active.q.n) {
        quiz.fb.textContent += '　🌉 橋又延伸了一段！';
      }
      setTimeout(nextStep, 600);
    });
  }

  // ---- runes (collect letters in the world, then arrange) ----
  function letterTexture(letter) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(80, 40, 160, 0.9)';
    ctx.beginPath();
    ctx.arc(48, 48, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8b4ff';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 48, 50);
    return canvasTex(cv);
  }

  function startRunes(q) {
    if (runeActive && runeActive.q.id === q.id) {
      const left = runeActive.orbs.filter(o => !o.got).length;
      showWorldToast(left > 0 ? `🔤 還有 ${left} 個字母散落在島上！` : '🔤 字母都到手了，回符文石排列！');
      if (left === 0) openRuneArrange();
      return;
    }
    clearRunes();
    runeActive = { q, wordIdx: 0, entry: null, orbs: [], collected: [] };
    scatterRuneWord();
  }

  function clearRunes() {
    if (!runeActive) return;
    runeActive.orbs.forEach(o => { if (!o.got) o.sprite.parent?.remove(o.sprite); });
    runeActive = null;
  }

  function scatterRuneWord() {
    const q = runeActive.q;
    const isle = isleById(q.island);
    const g = islandGroups[q.island];
    const entry = pickWordEntry(q.diff, 6);
    runeActive.entry = entry;
    runeActive.collected = [];
    runeActive.orbs = [];
    const word = entry.word.toUpperCase();
    for (let i = 0; i < word.length; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = isle.r * (0.25 + Math.random() * 0.6);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture(word[i]), transparent: true }));
      sprite.scale.set(1.1, 1.1, 1);
      sprite.position.set(Math.cos(a) * rr, 1.3, Math.sin(a) * rr);
      const orb = SkyArt.questMesh('orb');
      orb.position.set(0, -0.95, 0);
      orb.scale.setScalar(0.8);
      sprite.add(orb);   // removed together with the letter
      g.add(sprite);
      runeActive.orbs.push({ sprite, letter: word[i], got: false });
    }
    showWorldToast(`🔤 第 ${runeActive.wordIdx + 1}/${q.n} 組：收集島上 ${word.length} 個字母符文！`);
  }

  function updateRunePickup() {
    if (!runeActive || quizOpen) return;
    const isle = isleById(runeActive.q.island);
    let left = 0;
    for (const o of runeActive.orbs) {
      if (o.got) continue;
      const wx = isle.pos[0] + o.sprite.position.x;
      const wz = isle.pos[2] + o.sprite.position.z;
      if (Math.hypot(pos.x - wx, pos.z - wz) < 1.7 && Math.abs(pos.y - isle.pos[1]) < 4) {
        o.got = true;
        o.sprite.parent?.remove(o.sprite);
        runeActive.collected.push(o.letter);
        SoundManager.playCorrect();
        const remaining = runeActive.orbs.filter(x => !x.got).length;
        showWorldToast(remaining > 0
          ? `🔤 拿到「${o.letter}」！還剩 ${remaining} 個`
          : '🔤 字母收集完成！排列咒文吧！');
        if (remaining === 0) setTimeout(openRuneArrange, 700);
      } else {
        left++;
      }
    }
  }

  function openRuneArrange() {
    if (!runeActive || quizOpen) return;
    const q = runeActive.q;
    ensureQuizDom();
    active = { q, replay: isCleared(q), wrongThis: false, anyWrong: false, step: runeActive.wordIdx, ttsText: null };
    quizOpen = true;
    keys.f = keys.b = keys.l = keys.r = 0;
    joy.dx = joy.dy = 0;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.add('on');
    quiz.name.textContent = `📜 ${q.name}`;
    quiz.npc.style.display = 'none';
    quiz.fb.textContent = '';
    quiz.fb.className = 'aw-quiz-feedback';
    renderProg();
    renderSpelling(runeActive.entry, [], () => {
      awardAnswer(true, runeActive.entry.word);
      runeActive.wordIdx++;
      active.step = runeActive.wordIdx;
      renderProg();
      if (runeActive.wordIdx < q.n) {
        closeQuiz();
        scatterRuneWord();
      } else {
        runeActive = null;
        completeQuest();
      }
    });
  }

  // ---- order (語序踏石: step on floating word-stones in correct word order) ----

  // pool of short (3-6 word) EMPIRE_DIALOGUES/EMPIRE_LIFE answer sentences with
  // unique, letters-only tokens — safe to scramble into stepping stones without
  // ambiguity. Built once and cached (the underlying data arrays never change
  // at runtime).
  function sentencePool() {
    if (SENTENCE_POOL) return SENTENCE_POOL;
    const raw = [];
    ['easy', 'medium', 'hard'].forEach(d => {
      (EMPIRE_DIALOGUES[d] || []).forEach(e => raw.push({ text: e.a, zh: e.qZh }));
      (EMPIRE_LIFE[d] || []).forEach(e => raw.push({ text: e.a, zh: e.scene }));
    });
    const seen = new Set();
    const pool = [];
    raw.forEach(({ text, zh }) => {
      if (!text || seen.has(text)) return;
      const words = text.split(/\s+/)
        .map(w => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, ''))
        .filter(Boolean);
      if (words.length < 3 || words.length > 6) return;
      if (!words.every(w => /^[A-Za-z']+$/.test(w))) return;
      const lower = words.map(w => w.toLowerCase());
      if (new Set(lower).size !== lower.length) return; // no duplicate tokens (ambiguous order)
      seen.add(text);
      pool.push({ text, words, zh: zh || '' });
    });
    SENTENCE_POOL = pool;
    return pool;
  }

  // rounded word-plaque texture for the floating sprite above each stone
  function wordTexture(text) {
    const w = Math.max(150, text.length * 30 + 46);
    const h = 84;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const r = 18;
    ctx.fillStyle = 'rgba(45, 30, 75, 0.9)';
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d8b4ff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 38px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
    return canvasTex(cv);
  }

  function pickOrderSentence() {
    const pool = sentencePool();
    const avail = pool.filter(p => !orderActive.usedTexts.has(p.text));
    const list = avail.length ? avail : pool;
    return list[Math.floor(Math.random() * list.length)];
  }

  function removeOrderStoneMeshes() {
    if (!orderActive) return;
    orderActive.stones.forEach(s => { scene.remove(s.mesh); scene.remove(s.sprite); });
    orderActive.stones = [];
  }

  function buildOrderSentence() {
    const oa = orderActive;
    if (!oa) return;
    const q = oa.q;
    const isle = isleById(q.island);
    removeOrderStoneMeshes();
    const entry = pickOrderSentence();
    oa.usedTexts.add(entry.text);
    oa.entry = entry;
    oa.words = entry.words.slice();
    oa.sentence = entry.text;
    oa.zh = entry.zh;
    oa.idx = 0;
    oa.standingOn = null;
    const baseX = isle.pos[0] + q.dx, baseZ = isle.pos[2] + q.dz;
    const topY = isle.pos[1] + 0.15;
    const n = oa.words.length;
    const order = shuffled(oa.words.map((_, i) => i));
    const stones = [];
    const rr = 2 + n * 0.28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = baseX + Math.cos(a) * rr;
      const z = baseZ + Math.sin(a) * rr;
      const word = oa.words[order[i]];
      const mesh = SkyArt.questMesh('order_stone');
      mesh.position.set(x, topY - 0.15, z);
      scene.add(mesh);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(word), transparent: true }));
      sprite.scale.set(Math.max(1.5, word.length * 0.3 + 0.5), 0.85, 1);
      sprite.position.set(x, topY + 1.3, z);
      scene.add(sprite);
      stones.push({ mesh, sprite, word, x, z, done: false });
    }
    oa.stones = stones;
    showWorldToast(`🪨 中文意思：${entry.zh}　依序踏上正確的英文語序！(${oa.done + 1}/${q.n})`);
    updateOrderHud();
  }

  function startOrder(q) {
    if (orderActive && orderActive.q.id === q.id) {
      showWorldToast(`🪨 語序踏石進行中！中文意思：${orderActive.zh}`);
      return;
    }
    if (orderActive) cancelOrder('');
    if (mazeActive) cancelMaze('');
    if (raceActive) cancelRace('');
    orderActive = {
      q, entry: null, words: [], sentence: '', zh: '',
      stones: [], idx: 0, done: 0, standingOn: null, usedTexts: new Set(),
    };
    buildOrderSentence();
    SoundManager.playAchievement();
  }

  function cancelOrder(msg) {
    if (!orderActive) return;
    removeOrderStoneMeshes();
    orderActive = null;
    updateOrderHud();
    if (msg) showWorldToast(msg);
  }

  function resetOrderStones() {
    const oa = orderActive;
    oa.idx = 0;
    oa.stones.forEach(s => {
      s.done = false;
      s.mesh.material.color.setHex(0x8a8270);
      s.mesh.material.emissive = new THREE.Color(0x000000);
    });
    updateOrderHud();
  }

  function handleOrderStep(s) {
    const oa = orderActive;
    const expected = oa.words[oa.idx];
    if (s.word === expected) {
      s.done = true;
      s.mesh.material.color.setHex(0x4ade80);
      s.mesh.material.emissive = new THREE.Color(0x1a5a2a);
      SoundManager.playCorrect();
      oa.idx++;
      updateOrderHud();
      if (oa.idx >= oa.words.length) {
        if (typeof TTSManager !== 'undefined' && TTSManager) TTSManager.speak(oa.sentence, 'en-US');
        oa.done++;
        spawnConfetti(12);
        if (oa.done >= oa.q.n) {
          showWorldToast(`✨ 語序全對！(${oa.done}/${oa.q.n})`);
          const q = oa.q;
          setTimeout(() => {
            removeOrderStoneMeshes();
            orderActive = null;
            updateOrderHud();
            finishQuestDirect(q);
          }, 1000);
        } else {
          showWorldToast(`✨ 完成一句！(${oa.done}/${oa.q.n})`);
          setTimeout(buildOrderSentence, 1100);
        }
      }
    } else {
      SoundManager.playWrong();
      showWorldToast('🪨 再想想語序！');
      resetOrderStones();
    }
  }

  function updateOrder() {
    if (!orderActive || quizOpen) return;
    const isle = isleById(orderActive.q.island);
    const topY = isle.pos[1] + 0.15;
    let onStone = null;
    for (const s of orderActive.stones) {
      if (s.done) continue;
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      if (d < 1.6 && Math.abs(pos.y - topY) < 2.4) { onStone = s; break; }
    }
    if (onStone) {
      if (orderActive.standingOn !== onStone) {
        orderActive.standingOn = onStone;
        handleOrderStep(onStone);
      }
    } else {
      orderActive.standingOn = null;
    }
  }

  function updateOrderHud() {
    ensureCombatHud();
    if (!orderActive) { if (!mazeActive) combatHud.session.style.display = 'none'; return; }
    combatHud.session.style.display = '';
    combatHud.session.textContent =
      `🪨 中文意思：${orderActive.zh}　踏對 ${orderActive.idx}/${orderActive.words.length}　📜 ${orderActive.done}/${orderActive.q.n}`;
  }

  // ---- maze (傳送迷宮: answer a clue at each of 4 portal-gate nodes to advance) ----
  function makeMazeArch() { return SkyArt.questMesh('maze_arch'); }

  function buildMazeNodes(q) {
    const isle = isleById(q.island);
    const baseX = isle.pos[0] + q.dx, baseZ = isle.pos[2] + q.dz;
    const nodes = [];
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2) + 0.5;
      const rr = 1.6 + i * 1.0;
      const x = baseX + Math.cos(a) * rr;
      const z = baseZ + Math.sin(a) * rr;
      const mesh = makeMazeArch();
      mesh.position.set(x, isle.pos[1], z);
      scene.add(mesh);
      nodes.push({ mesh, x, z });
    }
    return { nodes, baseX, baseZ, isleY: isle.pos[1] };
  }

  function startMaze(q) {
    if (mazeActive && mazeActive.q.id === q.id) {
      showWorldToast(`🌀 傳送迷宮進行中！前往第 ${mazeActive.idx + 1}/4 個傳送門！`);
      return;
    }
    if (mazeActive) cancelMaze('');
    if (orderActive) cancelOrder('');
    if (raceActive) cancelRace('');
    const isle = isleById(q.island);
    const { nodes, baseX, baseZ, isleY } = buildMazeNodes(q);
    mazeActive = { q, startX: baseX, startZ: baseZ, isleY, nodes, idx: 0, chest: null };
    els.flash.classList.add('on');
    setTimeout(() => els.flash.classList.remove('on'), 420);
    pos.x = baseX; pos.z = baseZ; pos.y = isleY + bobOf(isle.id) + 2; vy = 0;
    showWorldToast('🌀 傳送迷宮：走到發光的傳送門前回答問題，答對前進、答錯彈回起點！');
    SoundManager.playAchievement();
    updateMazeHud();
  }

  function clearMaze() {
    if (!mazeActive) return;
    mazeActive.nodes.forEach(n => scene.remove(n.mesh));
    if (mazeActive.chest) scene.remove(mazeActive.chest);
    mazeActive = null;
    updateMazeHud();
  }

  function cancelMaze(msg) {
    clearMaze();
    if (msg) showWorldToast(msg);
  }

  function mazeWarpTo(x, z) {
    const isle = isleById(mazeActive.q.island);
    els.flash.classList.add('on');
    setTimeout(() => els.flash.classList.remove('on'), 420);
    pos.x = x; pos.z = z; pos.y = mazeActive.isleY + bobOf(isle.id) + 2; vy = 0;
  }

  function mazeAdvance() {
    if (!mazeActive) return;
    mazeActive.idx++;
    if (mazeActive.idx >= mazeActive.nodes.length) {
      mazeSpawnChest();
      return;
    }
    const next = mazeActive.nodes[mazeActive.idx];
    mazeWarpTo(next.x, next.z);
    showWorldToast(`🌀 傳送門開啟！前進到第 ${mazeActive.idx + 1}/4 關！`);
    SoundManager.playCorrect();
    updateMazeHud();
  }

  function mazeResetToStart() {
    if (!mazeActive) return;
    mazeActive.idx = 0;
    mazeWarpTo(mazeActive.startX, mazeActive.startZ);
    showWorldToast('💫 答錯了！傳送門把你彈回起點了！');
    updateMazeHud();
  }

  function mazeSpawnChest() {
    const last = mazeActive.nodes[mazeActive.nodes.length - 1];
    const cb = new SkyArt.Batch();
    SkyArt.questProp(cb, 'chest', 0, 0, faceCentre(last.x - mazeActive.startX, last.z - mazeActive.startZ) + Math.PI);
    const chest = cb.mesh(SkyArt.propMat, !lowPower());
    chest.matrixAutoUpdate = true;
    chest.position.set(last.x, mazeActive.isleY, last.z);
    scene.add(chest);
    mazeActive.chest = chest;
    spawnConfetti(24);
    showWorldToast('📦 四座傳送門都通過了！寶箱出現了！');
    SoundManager.playQuestComplete();
    const q = mazeActive.q;
    updateMazeHud();
    setTimeout(() => { clearMaze(); finishQuestDirect(q); }, 1200);
  }

  function onMazeCorrect(word) {
    awardAnswer(!!word, word);
    quiz.fb.textContent = '✨ 答對了！傳送門開啟！';
    quiz.fb.className = 'aw-quiz-feedback good';
    setTimeout(() => { closeQuiz(); mazeAdvance(); }, 700);
  }

  function onMazeWrong() {
    quiz.fb.textContent = '💫 答錯了！傳送門要把你彈回起點了！';
    quiz.fb.className = 'aw-quiz-feedback';
    setTimeout(() => { closeQuiz(); mazeResetToStart(); }, 900);
  }

  function openMazeClue() {
    const q = mazeActive.q;
    ensureQuizDom();
    active = { q: { ...q, type: 'chest' }, replay: isCleared(q), wrongThis: false, anyWrong: false, step: 0, ttsText: null, mazeBonus: true };
    quizOpen = true;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.add('on');
    quiz.name.textContent = `🌀 傳送門謎題（第 ${mazeActive.idx + 1}/4 關）`;
    quiz.prog.textContent = '';
    quiz.npc.style.display = 'none';
    quiz.tts.style.display = 'none';
    quiz.fb.textContent = '';
    if (Math.random() < 0.5) {
      const entry = GRAMMAR_DATA[Math.floor(Math.random() * GRAMMAR_DATA.length)];
      const options = shuffled(entry.options.slice());
      quiz.prompt.innerHTML = entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>');
      quiz.zh.textContent = entry.translation || '';
      renderOptions(options, options.indexOf(entry.blank), () => onMazeCorrect(), null, () => onMazeWrong());
    } else {
      const pool = vocabPool(q.diff);
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const distract = pickN(pool.filter(e => e.word !== entry.word), 3).map(e => e.word);
      const options = shuffled([entry.word, ...distract]);
      quiz.prompt.innerHTML = `${entry.hint} ${entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>')}`;
      quiz.zh.innerHTML = zhPretty(entry.zh);
      renderOptions(options, options.indexOf(entry.word), () => onMazeCorrect(entry.word), null, () => onMazeWrong());
    }
  }

  function updateMaze(dt) {
    if (!mazeActive || quizOpen) return;
    const node = mazeActive.nodes[mazeActive.idx];
    if (!node) return;
    node.mesh.rotation.y += dt * 1.4;
    const d = Math.hypot(pos.x - node.x, pos.z - node.z);
    if (d < 2 && Math.abs(pos.y - mazeActive.isleY) < 4) {
      openMazeClue();
    }
  }

  function updateMazeHud() {
    ensureCombatHud();
    if (!mazeActive) { if (!orderActive) combatHud.session.style.display = 'none'; return; }
    combatHud.session.style.display = '';
    combatHud.session.textContent = `🌀 傳送迷宮：第 ${mazeActive.idx + 1}/4 個傳送門`;
  }

  // ---- race ----
  function startRace(q) {
    if (raceActive) { showWorldToast('🏁 比賽進行中！穿過金色的環！'); return; }
    ensureCombatHud();
    const isle = isleById(q.island);
    const rings = [];
    for (let i = 0; i < q.n; i++) {
      const a = (i / q.n) * Math.PI * 2 * 1.4 + 0.6;
      const rr = isle.r * (0.3 + 0.35 * ((i % 3) / 2));
      const x = isle.pos[0] + Math.cos(a) * rr;
      const z = isle.pos[2] + Math.sin(a) * rr;
      const y = isle.pos[1] + 1.5 + (i % 2) * 0.9;
      const mesh = SkyArt.questMesh('ring_idle');
      mesh.position.set(x, y, z);
      mesh.rotation.y = a + Math.PI / 2;
      scene.add(mesh);
      rings.push({ mesh, x, y, z, passed: false });
    }
    raceActive = { q, idx: 0, time: q.time, rings, sinceQ: 0 };
    highlightRing();
    combatHud.race.style.display = '';
    showWorldToast(`🏁 ${q.name}：${q.time} 秒內穿過 ${q.n} 個光環！`);
    SoundManager.playAchievement();
  }

  function highlightRing() {
    raceActive.rings.forEach((r, i) => {
      r.mesh.geometry = SkyArt.questGeo(r.passed ? 'ring_done' : i === raceActive.idx ? 'ring_next' : 'ring_idle');
    });
  }

  function cancelRace(msg) {
    if (!raceActive) return;
    raceActive.rings.forEach(r => scene.remove(r.mesh));
    raceActive = null;
    if (combatHud) combatHud.race.style.display = 'none';
    if (msg) showWorldToast(msg);
  }

  function updateRace(dt) {
    if (!raceActive || quizOpen) return;
    raceActive.time -= dt;
    if (raceActive.time <= 0) {
      cancelRace('⏰ 時間到！再挑戰一次吧！');
      return;
    }
    const r = raceActive.rings[raceActive.idx];
    r.mesh.rotation.z += dt * 2;
    const d = Math.hypot(pos.x - r.x, pos.y + 1 - r.y, pos.z - r.z);
    if (d < 2) {
      r.passed = true;
      raceActive.idx++;
      raceActive.sinceQ++;
      SoundManager.playCorrect();
      if (raceActive.idx >= raceActive.q.n) {
        const q = raceActive.q;
        cancelRace('');
        finishQuestDirect(q);
        return;
      }
      highlightRing();
      if (raceActive.sinceQ >= 3) {
        raceActive.sinceQ = 0;
        openRaceQuestion();
      }
    }
    combatHud.race.textContent = `⏱ ${Math.ceil(raceActive.time)}s　💫 ${raceActive.idx}/${raceActive.q.n}`;
  }

  function openRaceQuestion() {
    const q = raceActive.q;
    ensureQuizDom();
    active = { q: { ...q, type: 'chest' }, replay: isCleared(q), wrongThis: false, anyWrong: false, step: 0, ttsText: null, raceBonus: true };
    quizOpen = true;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.add('on');
    quiz.name.textContent = '💫 空中單字題（答對 +4 秒）';
    quiz.prog.textContent = '';
    quiz.npc.style.display = 'none';
    quiz.fb.textContent = '';
    const pool = vocabPool(q.diff);
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const distract = pickN(pool.filter(e => e.word !== entry.word), 3).map(e => e.word);
    const options = shuffled([entry.word, ...distract]);
    quiz.prompt.innerHTML = `${entry.hint} ${entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>')}`;
    quiz.zh.innerHTML = zhPretty(entry.zh);
    renderOptions(options, options.indexOf(entry.word), () => {
      awardAnswer(true, entry.word);
      if (raceActive && !active.wrongThis) {
        raceActive.time += 4;
        quiz.fb.textContent = '✨ +4 秒！';
        quiz.fb.className = 'aw-quiz-feedback good';
      }
      setTimeout(closeQuiz, 700);
    });
  }

  // ---- boss ----
  function ensureCombatHud() {
    if (combatHud) return;
    const bar = document.createElement('div');
    bar.className = 'aw-bossbar';
    bar.innerHTML = '<div class="aw-bossbar-label" id="sky-boss-label"></div><div class="aw-bossbar-track"><div class="aw-bossbar-fill" id="sky-boss-fill"></div></div>';
    bar.style.display = 'none';
    els.wrap.appendChild(bar);
    const race = document.createElement('div');
    race.className = 'aw-race';
    race.style.display = 'none';
    els.wrap.appendChild(race);
    // shared HUD pill for the 'order'/'maze' puzzle sessions (mutually
    // exclusive with each other and with race, so one div covers both)
    const session = document.createElement('div');
    session.className = 'aw-race';
    session.style.display = 'none';
    els.wrap.appendChild(session);
    combatHud = {
      bossBar: bar,
      bossLabel: bar.querySelector('#sky-boss-label'),
      bossFill: bar.querySelector('#sky-boss-fill'),
      race,
      session,
    };
  }

  // per-boss looks & behaviour; mechanics (phases/summons/shockwaves) are shared
  const BOSS_DEFS = {
    sq_storm_boss: {
      name: '暴風巨像', icon: '⛈️', body: 0x3c3c58, bodyEm: 0x14143a,
      head: 0x4a4a68, arm: 0x34344e, eye: 0x66aaff, eyeEm: 0x2255cc,
      rage: 0xff4444, rageEm: 0xcc1111, summon: 'slime', scale: 1,
      wake: '⛈️ 暴風巨像甦醒了！點擊它（或按 ⚡）用英語魔法攻擊！',
      win: '🎆 暴風平息了！天空之城重獲和平！',
    },
    sqg_dragon_boss: {
      name: '星雲暗影龍', icon: '🐉', body: 0x2a1a4a, bodyEm: 0x12082a,
      head: 0x3a2a5e, arm: 0x1f1238, eye: 0xff66ff, eyeEm: 0xaa22cc,
      rage: 0xff3366, rageEm: 0xcc1133, summon: 'shade', scale: 1.15,
      wake: '🐉 星雲暗影龍展開了羽翼！用你最強的英語迎戰！',
      win: '🎆 暗影散去，銀河的星光回來了！你是真正的英語傳說！',
    },
    sqh_temple_boss: {
      name: '星影守護者', icon: '🌑', body: 0x1a1a2a, bodyEm: 0x0a0a15,
      head: 0x2a2a3a, arm: 0x14141f, eye: 0xb08fff, eyeEm: 0x5a2a9a,
      rage: 0xffd700, rageEm: 0xaa8800, summon: 'knight', scale: 1.2,
      wake: '🌑 星影守護者甦醒了！古老的力量在神殿中匯聚！',
      win: '🎆 星影散去，神殿重現光明！你成為傳說中的秘境英雄！',
    },
    squ_core_boss: {
      name: '熔岩核心巨獸', icon: '🌋', body: 0x1a0f08, bodyEm: 0x3a0e02,
      head: 0x241408, arm: 0x140b05, eye: 0xff8a1a, eyeEm: 0xdd3300,
      rage: 0xffe066, rageEm: 0xff5500, summon: 'magma_slime', scale: 1.25,
      wake: '🌋 熔岩核心巨獸甦醒了！地心的怒火在燃燒！',
      win: '🎆 核心的怒火平息了！你征服了整個地心世界！',
    },
  };
  function bossDef(q) { return BOSS_DEFS[q.id] || BOSS_DEFS.sq_storm_boss; }

  function buildBossMesh(q) {
    const d = bossDef(q);
    const isle = isleById(q.island);
    const built = SkyAvatar.makeBoss(q.id, d); // { group, eyeMat, torso }
    const g = built.group;
    g.scale.setScalar(d.scale);
    g.position.set(isle.pos[0], isle.pos[1], isle.pos[2] - 7);
    scene.add(g);
    bossParts = built;
    return g;
  }

  function startBoss(q) {
    ensureCombatHud();
    const d = bossDef(q);
    const mesh = buildBossMesh(q);
    const isle = isleById(q.island);
    const mob = {
      def: { id: 'boss', name: d.name, hp: q.n, quiz: 'boss', speed: 0, diff: 'hard' },
      isle, mesh, hp: q.n, dead: false, gone: false, isBoss: true,
      home: { x: mesh.position.x, z: mesh.position.z },
      angle: 0, cooldown: 0, boost: 0, shieldT: 0, fade: 0, questId: q.id,
    };
    mesh.traverse(o => { o.userData.mobRef = mob; });
    mobs.push(mob);
    bossActive = { q, mob, phase: 1, sinceSummon: 0, shockT: 6, warnT: 0, waveR: -1, waveHit: false };
    updateBossBar();
    combatHud.bossBar.style.display = '';
    showWorldToast(d.wake);
    SoundManager.playAchievement();
    if (typeof MusicManager !== 'undefined') MusicManager.play('boss');
  }

  function resetBoss() {
    if (!bossActive) return;
    bossActive.mob.gone = true;
    scene.remove(bossActive.mob.mesh);
    despawnQuestMobs(bossActive.q.id);
    bossActive = null;
    bossParts = null;
    if (combatHud) combatHud.bossBar.style.display = 'none';
    if (shockRing) shockRing.visible = false;
    if (warnRing) warnRing.visible = false;
    if (typeof MusicManager !== 'undefined') MusicManager.playForZone('sky');
  }

  function engageBoss() {
    if (bossActive) openCombatQuiz(bossActive.mob);
  }

  function updateBossBar() {
    if (!combatHud || !bossActive) return;
    const m = bossActive.mob;
    const d = bossDef(bossActive.q);
    combatHud.bossLabel.textContent = `${d.icon} ${d.name} ${bossActive.phase === 2 ? '(狂暴!)' : ''}`;
    const bw = Math.max(0, (m.hp / m.def.hp) * 100);
    combatHud.bossFill.style.width = bw + '%';
    if (bw < uiState.bossW - 0.1) {
      combatHud.bossBar.classList.remove('hit');
      void combatHud.bossBar.offsetWidth;
      combatHud.bossBar.classList.add('hit');
    }
    uiState.bossW = bw;
  }

  function onBossHit(mob) {
    updateBossBar();
    SoundManager.playCorrect();
    if (mob.hp <= 0) { bossVictory(); return; }
    const d = bossDef(bossActive.q);
    if (bossActive.phase === 1 && mob.hp <= mob.def.hp / 2) {
      bossActive.phase = 2;
      bossParts.eyeMat.color.setHex(d.rage);
      bossParts.eyeMat.emissive.setHex(d.rageEm);
      bossActive.shockT = 3;
      updateBossBar();
      showWorldToast(`${d.icon} ${d.name}狂暴化了！小心衝擊波，跳起來閃避！`);
    }
    bossActive.sinceSummon++;
    if (bossActive.phase === 1 && bossActive.sinceSummon >= 3) {
      bossActive.sinceSummon = 0;
      spawnMob(d.summon, bossActive.q.island, -6 + Math.random() * 4, 4, bossActive.q.id);
      spawnMob(d.summon, bossActive.q.island, 6 - Math.random() * 4, 4, bossActive.q.id);
      showWorldToast(`${d.icon} ${d.name}召喚了${mobDef(d.summon).name}！`);
    }
    if (active && active.combat === mob) {
      setTimeout(() => { if (active && active.combat === mob) askCombat(); }, 600);
    }
  }

  function bossVictory() {
    const q = bossActive.q;
    bossActive.mob.dead = true;   // collapse animation via updateMobs
    despawnQuestMobs(q.id);
    if (combatHud) combatHud.bossBar.style.display = 'none';
    if (shockRing) shockRing.visible = false;
    if (warnRing) warnRing.visible = false;
    const bossIsle = isleById(q.island);
    if (bossIsle && bossIsle.underground) {
      // no sky to clear this deep down — just force the underground blend to
      // recompute so it doesn't fight the (unchanged) galaxy blend afterwards
      undergroundBlend = -1;
    } else {
      // the sky clears (via the atmosphere base so the altitude blend keeps working)
      fogBase.setHex(0xcfeeff);
      galaxyBlend = -1;
    }
    const winMsg = bossDef(q).win;
    bossActive = null;
    bossParts = null;
    if (quizOpen) closeQuiz();
    if (typeof MusicManager !== 'undefined') MusicManager.playForZone('sky');
    showWorldToast(winMsg);
    setTimeout(() => finishQuestDirect(q), 1200);
  }

  function ensureShockRings() {
    if (shockRing) return;
    shockRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.28, 6, 28),
      new THREE.MeshLambertMaterial({ color: 0x88ccff, emissive: 0x2255cc })
    );
    shockRing.rotation.x = Math.PI / 2;
    shockRing.visible = false;
    scene.add(shockRing);
    warnRing = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.14, 6, 32),
      new THREE.MeshLambertMaterial({ color: 0xff5555, emissive: 0xaa2222, transparent: true, opacity: 0.8 })
    );
    warnRing.rotation.x = Math.PI / 2;
    warnRing.visible = false;
    scene.add(warnRing);
  }

  function updateBoss(dt) {
    if (!bossActive) return;
    const mesh = bossActive.mob.mesh;
    if (!bossActive.mob.dead) {
      mesh.position.y = bossActive.mob.isle.pos[1] + bobOf(bossActive.mob.isle.id) + Math.sin(simTime * 0.8) * 0.3;
      mesh.rotation.y = Math.sin(simTime * 0.4) * 0.15;
      SkyAvatar.animateBoss(mesh, dt, bossActive.phase);
    }
    if (bossActive.phase !== 2 || quizOpen) return;
    ensureShockRings();
    const bx = mesh.position.x, bz = mesh.position.z;
    const groundY = bossActive.mob.isle.pos[1] + bobOf(bossActive.mob.isle.id);
    if (bossActive.waveR >= 0) {
      // expanding shockwave
      bossActive.waveR += dt * 11;
      shockRing.scale.setScalar(bossActive.waveR);
      shockRing.position.set(bx, groundY + 0.4, bz);
      const pd = Math.hypot(pos.x - bx, pos.z - bz);
      if (!bossActive.waveHit && Math.abs(pd - bossActive.waveR) < 1.4 &&
          grounded && Math.abs(pos.y - groundY) < 2.5) {
        bossActive.waveHit = true;
        damagePlayer(1, bx, bz);
      }
      if (bossActive.waveR > 26) {
        bossActive.waveR = -1;
        shockRing.visible = false;
        bossActive.shockT = 6.5;
      }
    } else if (bossActive.warnT > 0) {
      bossActive.warnT -= dt;
      warnRing.position.set(bx, groundY + 0.3, bz);
      warnRing.material.opacity = 0.4 + Math.abs(Math.sin(simTime * 8)) * 0.5;
      if (bossActive.warnT <= 0) {
        warnRing.visible = false;
        bossActive.waveR = 0.5;
        bossActive.waveHit = false;
        shockRing.visible = true;
        shockRing.scale.setScalar(0.5);
      }
    } else {
      bossActive.shockT -= dt;
      if (bossActive.shockT <= 0) {
        bossActive.warnT = 1.5;
        warnRing.visible = true;
        showWorldToast('⚠️ 衝擊波要來了，跳起來！');
      }
    }
  }

  // tap-to-attack: raycast mobs on a short, non-drag tap
  function tapAttack(clientX, clientY) {
    if (!raycaster) raycaster = new THREE.Raycaster();
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    };
    raycaster.setFromCamera(ndc, camera);
    const targets = mobs.filter(m => !m.dead && !m.gone).map(m => m.mesh);
    if (!targets.length) return;
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.mobRef) o = o.parent;
    const mob = o && o.userData.mobRef;
    if (mob && !mob.dead) openCombatQuiz(mob);
  }

  function nearestMob(maxD) {
    let best = null, bd = maxD;
    for (const m of mobs) {
      if (m.dead || m.gone) continue;
      if (m.def.flies && !flyerAttackable(m)) continue; // flying too high to reach
      const d = Math.hypot(pos.x - m.mesh.position.x, pos.z - m.mesh.position.z);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  // ===================== ☄️ 天空事件系統 (world events — Wave 2) =====================
  // Random world events roll while the player is free-roaming (not mid-quiz,
  // boss fight or race). Two kinds: a 30s METEOR SHOWER (collect falling star
  // shards) and an up-to-45s AIR RAID (kill 3 storm_falcons). Only one event
  // is ever active at a time; both freeze while a combat/quest quiz is open.
  let worldEvent = null;     // { type:'meteor'|'raid', t, ... } — see startMeteorShower/startAirRaid
  let eventTimer = 0;
  let eventCooldown = 75;    // seconds until the next roll attempt

  // re-plays whichever track fits where the player currently stands — shared
  // by the island-change ground check, portal travel, and world-event cleanup
  // so all three branch identically instead of duplicating the underground/
  // secret/normal logic three times.
  function playRegionMusic(isle) {
    isle = isle || isleById(currentIsland) || SKY_ISLANDS[0];
    try {
      if (typeof MusicManager === 'undefined') return;
      if (isle.underground) MusicManager.play('cave');
      else if (isle.secret) MusicManager.play('mystic');
      else MusicManager.playForZone('sky');
    } catch (e) { /* music optional — never block gameplay */ }
  }

  // type omitted → let the scheduler pick; both bypass the "no concurrent
  // event" / lock checks the same way so the __skyTest.triggerEvent hook can
  // reuse this for its own eligibility assertions.
  function canStartEvent(type) {
    if (worldEvent || !playing || quizOpen || bossActive || raceActive) return false;
    if (orderActive || mazeActive) return false; // both use the shared session HUD pill — avoid collisions
    if (type === 'meteor' && regionUnderground) return false; // 地心世界 doesn't get a sky meteor shower
    if (type === 'raid' && totalCleared() < 10) return false; // protect beginners from air raids
    return true;
  }

  function rollWorldEvent() {
    const canMeteor = canStartEvent('meteor');
    const canRaid = canStartEvent('raid');
    if (!canMeteor && !canRaid) return;
    const type = (canMeteor && canRaid) ? (Math.random() < 0.5 ? 'meteor' : 'raid')
      : (canMeteor ? 'meteor' : 'raid');
    if (type === 'meteor') startMeteorShower(); else startAirRaid();
  }

  // ---- meteor shower ----
  function makeShardMesh() {
    const g = new THREE.Group();
    // a glowing double-ended crystal (bloom does the halo — no sprite glow)
    const core = SkyArt.questMesh('shard');
    core.scale.setScalar(0.75);
    g.add(core);
    return g;
  }

  // pick a short, all-unique-letter easy word for the shower's spelling
  // mini-game; falls back to a small hardcoded list if the vocab pool ever
  // comes up empty for the length/uniqueness filter.
  function pickShardWord() {
    const pool = vocabPool('easy').filter(e => {
      if (!/^[A-Za-z]{3,5}$/.test(e.word)) return false;
      const up = e.word.toUpperCase();
      return new Set(up).size === up.length;
    });
    if (pool.length === 0) {
      const fallback = ['STAR', 'MOON', 'SKY', 'FIRE', 'WIND'];
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)].word.toUpperCase();
  }

  function startMeteorShower() {
    const isle = isleById(currentIsland) || isleById(lastGroundIsland) || SKY_ISLANDS[0];
    const groundY = isle.pos[1] + bobOf(isle.id);
    const word = pickShardWord();
    const shards = [];
    const N = lowPower() ? word.length + 1 : Math.max(8, word.length + 2);
    const decoyPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !word.includes(c));
    const decoys = pickN(decoyPool, Math.max(0, N - word.length));
    // shuffle letters across shard SPAWN INDEX (not spatial position, which
    // is already randomized below) so collection order ≠ spatial order
    const letters = shuffled([...word.split(''), ...decoys]);
    // keep shards spread at least 2× the pickup radius (1.8) apart so a
    // player standing still next to one shard can never simultaneously
    // sweep up a neighbor — otherwise the letter-order spelling chain could
    // register two pickups in the same frame in an unintended order
    const MIN_SHARD_SPACING = 3.6;
    for (let i = 0; i < N; i++) {
      let a, r, gx, gz, tries = 0;
      do {
        a = Math.random() * Math.PI * 2;
        r = Math.random() * Math.max(2, isle.r - 3);
        gx = isle.pos[0] + Math.cos(a) * r;
        gz = isle.pos[2] + Math.sin(a) * r;
        tries++;
      } while (tries < 12 && shards.some(s => Math.hypot(s.gx - gx, s.gz - gz) < MIN_SHARD_SPACING));
      const mesh = makeShardMesh();
      mesh.position.set(gx, groundY + 25, gz);
      const letter = letters[i] || decoyPool[Math.floor(Math.random() * decoyPool.length)] || 'X';
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({
        map: letterTexture(letter), transparent: true, depthWrite: false, fog: false,
      }));
      badge.scale.set(0.8, 0.8, 1);
      badge.position.set(0, 0.9, 0);
      mesh.add(badge);
      scene.add(mesh);
      shards.push({
        mesh, gx, gz, groundY, state: 'falling', t: 0,
        fallDur: 1.5 + Math.random() * 0.5, got: false, gone: false,
        spin: Math.random() * 6.28, letter,
      });
    }
    worldEvent = { type: 'meteor', t: 0, dur: 30, shards, collected: 0, word, spellIdx: 0, spellFail: false };
    showWorldToast(`☄️ 流星雨來了！快按順序拼出「${word}」（字母標在星屑上）！`);
    if (typeof MusicManager !== 'undefined') { try { MusicManager.play('starfall'); } catch (e) { /* optional */ } }
    buildMeteorStreaks();
    updateMeteorHud();
  }

  function updateMeteorShower(dt) {
    const ev = worldEvent;
    for (const s of ev.shards) {
      if (s.got || s.gone) continue;
      if (s.state === 'falling') {
        s.t += dt;
        const k = Math.min(1, s.t / s.fallDur);
        s.mesh.position.y = (s.groundY + 25) + ((s.groundY + 0.6) - (s.groundY + 25)) * k;
        if (k >= 1) s.state = 'resting';
      } else {
        s.mesh.position.y = s.groundY + 0.6 + Math.sin(simTime * 3 + s.spin) * 0.15;
      }
      s.mesh.rotation.y += dt * 2;
      const d = Math.hypot(pos.x - s.mesh.position.x, pos.z - s.mesh.position.z);
      if (d < 1.8 && Math.abs(pos.y - s.mesh.position.y) < 3) {
        s.got = true;
        scene.remove(s.mesh);
        ev.collected++;
        skyAddGems(1);
        SoundManager.playCorrect();
        GameEngine.recordSkyShard?.();
        spawnConfetti(6);
        // spelling mini-game: collecting shards in the word's letter order
        // (regardless of which shard/position they came from) pays a bonus;
        // a wrong-order word letter locks the chain but base rewards continue
        const L = s.letter;
        if (ev.word && !ev.spellFail && L) {
          if (L === ev.word[ev.spellIdx]) {
            ev.spellIdx++;
            updateMeteorHud();
            if (ev.spellIdx === ev.word.length) {
              skyAddGems(10);
              showWorldToast(`✨ 拼出 ${ev.word}！額外 +10 💎`);
              TTSManager.speak(ev.word, 'en-US');
              GameEngine.recordWord?.(ev.word);
            }
          } else if (ev.word.includes(L)) {
            ev.spellFail = true;
            showWorldToast('哎呀順序錯了！星屑獎勵照拿，下次再拼拼看');
            updateMeteorHud();
          }
        }
      }
    }
    updateMeteorStreaks(dt);
    if (ev.collected >= ev.shards.length) {
      skyAddGems(5);
      showWorldToast('🌟 全部接住了！額外 +5 💎');
      endWorldEvent();
      return;
    }
    if (ev.t >= ev.dur) endWorldEvent(); // uncollected shards fade via despawnEventVisuals
  }

  // shared session HUD pill (see ensureCombatHud) — mirrors updateOrderHud/
  // updateMazeHud but only touches it when neither of those puzzle sessions
  // owns it (canStartEvent already prevents a NEW meteor shower from
  // starting while one is active; this guards the reverse ordering too).
  function updateMeteorHud() {
    ensureCombatHud();
    if (orderActive || mazeActive) return;
    const ev = worldEvent;
    if (!ev || ev.type !== 'meteor' || !ev.word) { combatHud.session.style.display = 'none'; return; }
    combatHud.session.style.display = '';
    combatHud.session.textContent = ev.spellFail
      ? '☄️ 拼字失敗 ✗（獎勵照拿）'
      : `☄️ 拼出 ${ev.word}：` + ev.word.split('').map((c, i) => c + (i < ev.spellIdx ? '✓' : '─')).join(' ');
  }

  // decorative meteor streaks crossing the sky dome (cheap: 3 sprites, no new draw calls per streak)
  let meteorStreaks = null;
  let _streakTex = null;
  function meteorStreakTex() {
    if (_streakTex) return _streakTex;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 16;
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.7, 'rgba(255,240,180,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 16);
    _streakTex = canvasTex(cv);
    return _streakTex;
  }
  function resetStreak(s, immediate) {
    s.startX = pos.x - 150 + Math.random() * 100;
    s.startZ = pos.z - 150 + Math.random() * 300;
    s.y = pos.y + 60 + Math.random() * 40;
    s.t = immediate ? Math.random() : 0;
    s.dur = 1.2 + Math.random() * 0.8;
  }
  function buildMeteorStreaks() {
    if (lowPower() || meteorStreaks) return;
    meteorStreaks = [];
    for (let i = 0; i < 3; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: meteorStreakTex(), transparent: true, depthWrite: false, fog: false, rotation: -0.7,
      }));
      spr.scale.set(40, 5, 1);
      scene.add(spr);
      const s = { spr, t: 0, dur: 1 };
      resetStreak(s, true);
      meteorStreaks.push(s);
    }
  }
  function updateMeteorStreaks(dt) {
    if (!meteorStreaks) return;
    meteorStreaks.forEach(s => {
      s.t += dt / s.dur;
      if (s.t >= 1) resetStreak(s, false);
      const k = Math.min(1, s.t);
      s.spr.position.set(s.startX + k * 90, s.y - k * 60, s.startZ + k * 40);
      s.spr.material.opacity = Math.sin(k * Math.PI);
    });
  }
  function clearMeteorStreaks() {
    if (!meteorStreaks) return;
    meteorStreaks.forEach(s => scene.remove(s.spr));
    meteorStreaks = null;
  }

  // ---- air raid ----
  function startAirRaid() {
    const isle = isleById(currentIsland) || isleById(lastGroundIsland) || SKY_ISLANDS[0];
    const falcons = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const m = spawnMob('storm_falcon', isle.id, Math.cos(a) * 8, Math.sin(a) * 8, '__raid');
      if (m) falcons.push(m);
    }
    worldEvent = { type: 'raid', t: 0, dur: 45, falcons };
    showWorldToast('🦅 空襲警報！風暴隼來襲！');
    SoundManager.playAchievement();
  }

  function updateAirRaid(dt) {
    const ev = worldEvent;
    const alive = ev.falcons.filter(f => !f.dead && !f.gone);
    if (alive.length === 0) {
      skyAddGems(8);
      showWorldToast('🛡️ 擊退空襲！+8 💎');
      GameEngine.recordSkyRaid?.();
      spawnConfetti(20);
      endWorldEvent();
      return;
    }
    if (ev.t >= ev.dur) {
      showWorldToast('風暴隼飛走了…');
      endWorldEvent();
    }
  }

  // ---- shared lifecycle ----
  // remove/fade whatever's left of an event's visuals without granting any
  // reward — used by the timeout and player-KO exits (win exits have nothing
  // left to clean up: shards are all `.got`, falcons all `.dead`).
  function despawnEventVisuals(ev) {
    if (!ev) return;
    if (ev.type === 'meteor') {
      ev.shards.forEach(s => { if (!s.got && !s.gone) { scene.remove(s.mesh); s.gone = true; } });
      clearMeteorStreaks();
    } else if (ev.type === 'raid') {
      // mark still-alive falcons dead (no gems/toast) so updateMobs' existing
      // shrink-and-fade animation carries them off screen — no extra code needed
      ev.falcons.forEach(f => { if (!f.dead && !f.gone) f.dead = true; });
      if (raidWarnRing) raidWarnRing.visible = false;
    }
  }

  function endWorldEvent() {
    despawnEventVisuals(worldEvent);
    worldEvent = null;
    playRegionMusic();
    updateMeteorHud();
  }

  function updateWorldEvent(dt) {
    if (!worldEvent) {
      // only count toward the next roll while the player is genuinely free
      // (not mid-quiz/quest, boss fight or race) — being busy pauses the
      // countdown rather than silently spending it on a roll that would
      // just get rejected by canStartEvent() anyway
      if (playing && !quizOpen && !bossActive && !raceActive && !(SkyPlay.inRun && SkyPlay.inRun())) {   // PLAY: no events mid-obby
        eventTimer += dt;
        if (eventTimer > eventCooldown) {
          eventTimer = 0;
          eventCooldown = 90 + Math.random() * 60;
          rollWorldEvent();
        }
      }
      return;
    }
    if (quizOpen || playLocked()) return; // events pause while any quiz / PLAY panel is open
    worldEvent.t += dt;
    if (worldEvent.type === 'meteor') updateMeteorShower(dt);
    else updateAirRaid(dt);
  }

  // ===================== player =====================
  // The hero's look, animation, movement FX and the camera live in js/sky-avatar.js.
  SkyAvatar.init(ctx);

  function buildPlayer() {
    player = new THREE.Group();
    playerParts = SkyAvatar.buildPlayer(player);
    scene.add(player);
    if (window.__skyTest) {
      Object.assign(window.__skyTest, {
        avatar: () => SkyAvatar.debug(),
        fx: (name, data) => emitFx(name, data),
        celebrate: n => spawnConfetti(n || 36),
        motion: () => ({ ...motion }),
        cam: () => ({ ...cam }),
        scene: () => scene,
        camera: () => camera,
        // (PLAY's setCam(theta, phi, radius) and AVATAR's setCam({theta, phi, radius}) both work)
        setCam: (o, phi, radius) => { if (typeof o === 'object') Object.assign(cam, o); else { cam.theta = o; if (phi !== undefined) cam.phi = phi; if (radius !== undefined) cam.radius = radius; } },
        spawnMobHere: (id, dx, dz) => { const isle = isleById(currentIsland) || SKY_ISLANDS[0]; return mobs.indexOf(spawnMob(id, isle.id, pos.x - isle.pos[0] + dx, pos.z - isle.pos[2] + dz)); },
        hitMob: i => hitMob(mobs[i]),
      });
    }
  }

  // re-read equipped skin/title and recompute title perks
  function refreshEquipment() {
    computePerks();
    if (!playerParts) return;
    const skin = GameEngine.getEquippedSkin();
    const title = GameEngine.getEquippedTitle();
    SkyAvatar.refreshLook(skin.id, SKY_SKIN_TINTS[skin.id], title.display || title.name);
    if (els.titleBadge) els.titleBadge.textContent = `⭐ ${title.display || title.name}`;
  }

  // ===================== physics & collision =====================
  function bobOf(isleId) { return islandBob[isleId] || 0; }

  // ---- PLAY: movement-ability state (air jumps, dash) — see SKY_PLAY_PHYS ----
  let groundCol = null;          // collider under the feet while grounded (carry / SkyPlay hooks)
  let airJumpsUsed = 0;
  let jumpBaseTop = 0;           // top of the surface the current airtime started from
  let jumpCapV = 11;             // take-off speed that sets the air-jump height cap
  let dashT = 0, dashUsed = false, dashReadyAt = 0, dashQueuedAt = -10, dashDirX = 0, dashDirZ = 1;
  function maxAirJumps() { return SKY_PLAY_PHYS.airJumps + (perks.doubleJump ? 1 : 0); }
  // An air jump is SKY_CONFIG.jumpV × airJumpMult — never scaled by jump titles / boots —
  // and can't lift you above H(take-off speed) + maxAir × H(airV) over the take-off
  // surface. That keeps jump-height titles meaning a higher ground jump without letting
  // them stack with air jumps onto gated/secret islands (check_sky_play.js proves it).
  function airJumpVel() {
    const g2 = -2 * SKY_CONFIG.gravity;
    const airV = SKY_CONFIG.jumpV * SKY_PLAY_PHYS.airJumpMult;
    const cap = jumpBaseTop + (jumpCapV * jumpCapV + maxAirJumps() * airV * airV) / g2;
    const room = cap - pos.y;
    return room <= 0 ? 0 : Math.min(airV, Math.sqrt(g2 * room));
  }
  function playLocked() { return !!(SkyPlay.locked && SkyPlay.locked()); }
  function requestDash() { dashQueuedAt = simTime; }
  // teleport used by SkyPlay (course checkpoints / finish / start)
  function setPlayerPos(x, y, z, yaw) {
    pos.x = x; pos.y = y; pos.z = z;
    vy = 0; dashT = 0; dashUsed = false; airJumpsUsed = 0;
    groundCol = null; grounded = false;
    if (yaw !== undefined) heroYaw = yaw;
  }
  // English answered correctly inside a SkyPlay activity (word gates). Same rates and
  // paths as awardAnswer(): SKY_REWARD[diff].ans XP (+1 💎) first try, half XP retry.
  function playReward(diff, firstTry, word) {
    const tier = SKY_REWARD[diff] || SKY_REWARD.easy;
    const xp = Math.round((firstTry ? tier.ans : Math.ceil(tier.ans / 2)) * (perks.xpMult || 1));
    GameEngine.addXP(xp);
    if (firstTry) skyAddGems(1);
    if (word && firstTry) GameEngine.recordWord(word);
    GameEngine.recordSkyAnswer?.();
    return { xp, gems: firstTry ? 1 : 0 };
  }
  // course clear: pays like a quest first clear of that difficulty; replays half XP, no gems
  function playClear(diff, first) {
    const tier = SKY_REWARD[diff] || SKY_REWARD.easy;
    const xp = Math.round((first ? tier.xp : Math.round(tier.xp / 2)) * (perks.xpMult || 1));
    GameEngine.addXP(xp);
    if (first) skyAddGems(tier.gems);
    return { xp, gems: first ? tier.gems : 0 };
  }
  Object.assign(ctx, {
    setPlayerPos, playReward, playClear, requestDash,
    cameraShot: shot => SkyAvatar.cameraShot && SkyAvatar.cameraShot(shot),   // AVATAR camera owns the framing
    setDeferLevelUp: v => { if (!quizOpen) GameEngine.setDeferLevelUp(v); if (!v && !quizOpen) GameEngine.flushPendingLevelUps(); },
    flash: () => { els.flash.classList.add('on'); setTimeout(() => els.flash.classList.remove('on'), 420); },
  });
  // (getters must be defined, not Object.assign-ed — assign would copy today's value)
  Object.defineProperties(ctx, {
    grounded: { get: () => grounded },
    groundCol: { get: () => groundCol },
    heroYaw: { get: () => heroYaw },
    quizOpen: { get: () => quizOpen },
    lastGroundIsland: { get: () => lastGroundIsland },
    wrap: { get: () => els.wrap },
  });

  // highest support top at (x,z) that is not above maxTop.
  // PLAY: a collider may also be a rotated rectangle (`box: {hw, hd, c, s}`, `r` = its
  // bounding radius) and may be switched `off` (vanishing / not-yet-solid obby platforms).
  function supportAt(x, z, maxTop) {
    let best = -Infinity;
    let bestCol = null;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz > c.r * c.r) continue;
      if (c.off) continue;
      if (c.box) {
        const b = c.box;
        if (Math.abs(dx * b.c - dz * b.s) > b.hw || Math.abs(dx * b.s + dz * b.c) > b.hd) continue;
      }
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
    dashT = 0; dashUsed = false; airJumpsUsed = 0; groundCol = null;
    if (hurt && !perks.voidSafe) {
      hearts--;
      if (hearts <= 0) {
        hearts = maxHearts();
        showWorldToast('💫 你在晨曦之島醒來了…');
        const dawn = SKY_ISLANDS[0];
        pos.x = dawn.pos[0]; pos.z = dawn.pos[2]; pos.y = dawn.pos[1] + 2;
      }
      updateHudHearts();
    } else if (hurt) {
      showWorldToast('🍀 初心者的祝福：墜落不扣愛心！');
    }
  }

  function voidFall() {
    // PLAY: falling off an obby course pops you back to its checkpoint — no heart lost
    if (SkyPlay.onVoid && SkyPlay.onVoid()) return;
    els.flash.classList.add('on');
    setTimeout(() => els.flash.classList.remove('on'), 420);
    SoundManager.playWrong();
    lastDamageAt = simTime;
    const isle = isleById(lastGroundIsland) || SKY_ISLANDS[0];
    respawnAt(isle, true);
    emitFx('respawn');
  }

  const HEART_PATH = 'M16 28C14 26.6 2.5 19.4 2.5 10.6 2.5 6 5.9 2.8 10 2.8c2.4 0 4.6 1.2 6 3.2 1.4-2 3.6-3.2 6-3.2 4.1 0 7.5 3.2 7.5 7.8 0 8.8-11.5 16-13.5 17.4z';
  function updateHudHearts() {
    if (!els.hearts) return;
    const max = maxHearts();
    const h = Math.max(0, Math.min(hearts, max));
    const box = els.hearts;
    if (uiState.heartsMax !== max || box.children.length !== max) {
      uiState.heartsMax = max;
      uiState.hearts = -1;
      box.innerHTML = Array.from({ length: max }, () =>
        `<span class="aw-heart empty"><svg viewBox="0 0 32 30" aria-hidden="true"><path class="hb" d="${HEART_PATH}"/><path class="hs" d="M8 8.4c1.4-2 4-2.6 5.6-1.4-2.4.2-4.2 1.6-4.8 3.6-.6-.6-1-1.4-.8-2.2z"/></svg></span>`).join('');
    }
    const prev = uiState.hearts;
    for (let i = 0; i < max; i++) {
      const el = box.children[i];
      const full = i < h;
      const was = prev >= 0 ? i < prev : full;
      el.classList.toggle('full', full);
      el.classList.toggle('empty', !full);
      el.classList.remove('lose', 'gain');
      if (prev >= 0 && full !== was) {
        void el.offsetWidth;
        el.classList.add(full ? 'gain' : 'lose');
      }
    }
    box.classList.toggle('low', h === 1 && max > 1);
    box.setAttribute('aria-label', `生命 ${h} / ${max}`);
    uiState.hearts = h;
  }

  function showWorldToast(msg) {
    if (!els.toast) return;
    // arrival is shown as a big banner (fx 'arrive'); only fall back to the toast if no banner came
    if (/^🏝️ 抵達「/.test(msg) && !uiState.noBanner) {
      clearTimeout(uiState.arriveT);
      uiState.arriveT = setTimeout(() => {
        if (Date.now() - uiState.lastBanner > 600) { uiState.noBanner = true; showWorldToast(msg); uiState.noBanner = false; }
      }, 80);
      return;
    }
    const kind = /^(💫|⚠️|🔒|😢|🏃|🦅 牠|⏳|哎呀|🔍)/.test(msg) ? 'warn'
      : /^(✅|✨|🎆|🌉|💗|💖|🍀|🌌|📦|🌟|⚔️ 擊敗|🛡️)/.test(msg) ? 'good'
      : /^(🏝️|🔮|🪂|🌨️|☄️|🏁|🔋)/.test(msg) ? 'gold' : '';
    els.toast.textContent = msg;
    els.toast.dataset.kind = kind;
    els.toast.classList.remove('on');
    void els.toast.offsetWidth;
    els.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('on'), 1900 + Math.min(2200, msg.length * 50));
  }

  function updatePlayer(dt) {
    simTime += dt;

    // PLAY: moving / rotating / conveyor supports (SkyPlay obby platforms) carry the
    // player. SkyPlay.update() already moved them this frame and left the deltas on
    // the collider (mdx/mdz/mdy/myaw); island colliders never set these, so islands,
    // bridges and pads behave exactly as before.
    if (grounded && groundCol && mountT <= 0) {
      if (groundCol.moving) {
        pos.x += groundCol.mdx; pos.z += groundCol.mdz; pos.y += groundCol.mdy;
        if (groundCol.myaw) {
          const ox = pos.x - groundCol.x, oz = pos.z - groundCol.z;
          const c = Math.cos(groundCol.myaw), s = Math.sin(groundCol.myaw);
          pos.x = groundCol.x + ox * c + oz * s;
          pos.z = groundCol.z - ox * s + oz * c;
          heroYaw += groundCol.myaw;
        }
      }
      if (groundCol.conv) { pos.x += groundCol.conv.x * dt; pos.z += groundCol.conv.z * dt; }
    }

    // input vector relative to camera yaw (frozen while a quiz or a SkyPlay panel is open)
    let ix = 0, iz = 0;
    if (quizOpen || playLocked()) {
      // no movement input
    } else if (joy.active) {
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
    // camera sits at player + (sinθ, ·, cosθ)·r → forward on the ground is
    // (-sinθ, -cosθ); screen-right = cross(forward, up) = (cosθ, -sinθ)
    const fx = -st, fz = -ct;
    const rx = ct, rz = -st;
    let mx = fx * iz + rx * ix;
    let mz = fz * iz + rz * ix;
    const mlen = Math.hypot(mx, mz);
    // PLAY: dash (C key / 💨 button) — a short burst with gravity paused, usable on the
    // ground and once per airtime (a ground dash that runs off an edge counts as it)
    if (dashQueuedAt >= 0 && simTime - dashQueuedAt < 0.2 && dashT <= 0 && !dashUsed &&
        simTime >= dashReadyAt && mountT <= 0 && !quizOpen && !playLocked()) {
      if (mlen > 0.001) { dashDirX = mx / mlen; dashDirZ = mz / mlen; }
      else { dashDirX = Math.sin(heroYaw); dashDirZ = Math.cos(heroYaw); }
      dashT = SKY_PLAY_PHYS.dashTime;
      dashReadyAt = simTime + SKY_PLAY_PHYS.dashCooldown;
      dashUsed = true;
      dashQueuedAt = -10;
      heroYaw = Math.atan2(dashDirX, dashDirZ);
      emitFx('dash', { x: dashDirX, z: dashDirZ, grounded });
    }
    if (dashT > 0) {
      const step = Math.min(dt, dashT);
      pos.x += dashDirX * SKY_PLAY_PHYS.dashSpeed * step;
      pos.z += dashDirZ * SKY_PLAY_PHYS.dashSpeed * step;
      walkTime += dt * 13;
    } else if (mlen > 0.001) {
      mx /= mlen; mz /= mlen;
      const speed = SKY_CONFIG.walkSpeed * (perks.speedMult || 1) *
        (sprint ? SKY_CONFIG.sprintMult : 1) * Math.min(1, mag || 1) * (mountT > 0 ? 1.6 : 1);
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

    // vertical (hold jump to glide with 傳說勇者 title or 🪂 glider)
    const prevFeet = pos.y;
    let glidingNow = false;
    if (mountT > 0) {
      // ☁️ 飛天雲: free flight — hold jump to ascend, release to sink gently;
      // the entire gravity/collision/jump/void block below is skipped while mounted
      vy = jumpHeld ? 6 : -2;
      pos.y += vy * dt;
      grounded = false;
    } else {
    if (dashT > 0) {
      dashT -= dt;          // gravity paused for the dash
      vy = 0;
    } else {
      vy += SKY_CONFIG.gravity * dt;
      if (jumpHeld && vy < -3.2 && (perks.glide || gliderOn)) { vy = -3.2; glidingNow = true; }
    }
    pos.y += vy * dt;

    const sup = supportAt(pos.x, pos.z, prevFeet + 0.55);
    if (vy <= 0 && sup.col && pos.y <= sup.y) {
      pos.y = sup.y;
      vy = 0;
      grounded = true;
      lastGroundedAt = simTime;
      groundCol = sup.col;
      jumpBaseTop = sup.y;
      jumpCapV = SKY_CONFIG.jumpV;
      if (dashT <= 0) dashUsed = false;
      if (sup.col.play) SkyPlay.onGround(sup.col);
      if (sup.col.isle) {
        lastGroundIsland = sup.col.isle;
        if (currentIsland !== sup.col.isle) {
          currentIsland = sup.col.isle;
          const isle = isleById(currentIsland);
          if (isle) {
            els.location.textContent = `🏝️ ${isle.name}`;
            regionUnderground = !!isle.underground;
            // secret realms (portal or hidden-stairway entry) swap to the mystic
            // track; 地心世界 swaps to the cave track; leaving either back to the
            // normal per-zone rotation — this also covers the stairway-only
            // secret realms and the underground cluster, neither of which are
            // always reached through usePortal()
            playRegionMusic(isle);
            if (save.lastIsland !== currentIsland) {
              save.lastIsland = currentIsland;
              persist();
              showWorldToast(`🏝️ 抵達「${isle.name}」！`);
              emitFx('arrive', { isle });
              SoundManager.playCorrect();
            }
          }
        }
      }
      if (!motion.grounded && motion.vy < -4) emitFx('land', { v: -motion.vy });
      // bouncy jump pad
      if (sup.col.kind === 'pad') {
        vy = sup.col.launch * (perks.padMult || 1);
        grounded = false;
        jumpCapV = vy;
        SoundManager.playCorrect();
        emitFx('pad');
      }
      airJumpsUsed = 0;
    } else {
      grounded = false;
    }

    // jump (with coyote time + buffered press; windows sized so a single
    // slow frame on a weak device can't swallow the input)
    if (jumpBufferedAt >= 0 && simTime - jumpBufferedAt < 0.25) {
      const jumpV = SKY_CONFIG.jumpV * (perks.jumpMult || 1) * (jumpBoostOn ? 1.4 : 1);
      if (simTime - lastGroundedAt < 0.15) {
        vy = jumpV;
        grounded = false;
        jumpBufferedAt = -10;
        lastGroundedAt = -10;
        jumpCapV = SKY_CONFIG.jumpV;
        emitFx('jump');
      } else if (airJumpsUsed < maxAirJumps() && vy < jumpV * 0.5 && dashT <= 0) {
        // PLAY: everyone has an air jump; 傳說勇者 (perks.doubleJump) gets a second one
        vy = airJumpVel();
        airJumpsUsed++;
        jumpBufferedAt = -10;
        emitFx('airjump', { n: airJumpsUsed });
      }
    }
    }

    // fell into the void (地心世界 uses a much deeper threshold — its own
    // islands sit at y -70..-95, well below the surface voidY of -40);
    // skipped while ☁️ 飛天雲 is active so the free-flight ride never gets
    // interrupted by a stray void check.
    if (mountT <= 0 && pos.y < (regionUnderground ? SKY_CONFIG.undergroundVoidY : SKY_CONFIG.voidY)) voidFall();
    if (!grounded) groundCol = null;

    // movement snapshot for avatar / camera / FX (see `motion` contract at the top)
    motion.moving = mlen > 0.001 || dashT > 0;
    motion.sprint = motion.moving && sprint;
    motion.speed = dashT > 0 ? SKY_PLAY_PHYS.dashSpeed
      : motion.moving ? SKY_CONFIG.walkSpeed * (sprint ? SKY_CONFIG.sprintMult : 1) : 0;
    motion.vy = vy;
    motion.grounded = grounded;
    motion.airJumps = airJumpsUsed;
    motion.dashing = dashT > 0;
    motion.gliding = glidingNow && !grounded;   // explicit (AVATAR used to infer it from vy)
    motion.riding = mountT > 0 ? 'cloud' : null;
    motion.platform = !!(groundCol && groundCol.moving);   // standing on a moving obby platform

    // ---- presentation half (avatar animation) below; physics above ----
    SkyAvatar.animatePlayer(dt, { yaw: heroYaw, quiz: quizOpen });
    SkyAvatar.update(dt);

    if (!quizOpen) updateInteractTarget();
  }

  function updateCamera(dt) {
    SkyAvatar.updateCamera(dt); // collision, follow lag, FOV kick, shake, start reveal

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
    updateMarkers();   // bobbing / spinning 3D quest markers (instanced)
    // combat & advanced quests
    updateMobs(dt);
    updateBolt(dt);
    updateBoss(dt);
    updateRace(dt);
    updateRunePickup();
    updateOrder();
    updateMaze(dt);
    checkSecretDiscovery();
    updateWorldEvent(dt);
    SkyPlay.update(dt);   // PLAY: moves obby platforms (before updatePlayer reads them), coins, pets
    // slowly regain hearts out of combat
    if (playing && hearts < maxHearts() && simTime - lastDamageAt > 20) {
      hearts++;
      lastDamageAt = simTime;
      updateHudHearts();
      showWorldToast('💗 恢復了一顆心！');
    }
    // Part 5 HUD & perf upkeep
    minimapTimer += dt;
    if (minimapTimer > 0.12) { minimapTimer = 0; drawMinimap(); }
    buffBarTimer += dt;
    if (buffBarTimer > 1) { buffBarTimer = 0; updateBuffBar(); updateItemTray(); }
    trackerTimer += dt;
    if (trackerTimer > 0.15) { trackerTimer = 0; updateTracker(); }
    updateCulling();
    watchFps(dt);
    // clouds, particles, atmosphere and island LOD animate in SkyArt.frame();
    // mirror its altitude blends here for the __skyTest.region() hook
    undergroundBlend = SkyArt.state.ut > 0.001 ? SkyArt.state.ut : -1;
    galaxyBlend = SkyArt.state.gt;
    // ⚡ active-use item timers: chain-lightning fade + shield/mount durations
    updateLightningLines(dt);
    if (shieldT > 0) {
      shieldT -= dt;
      if (shieldMesh) {
        shieldMesh.rotation.y += dt * 0.6;
        shieldMesh.material.opacity = 0.18 + Math.sin(simTime * 3) * 0.07;
      }
      if (shieldT <= 0) {
        shieldT = 0;
        if (shieldMesh) shieldMesh.visible = false;
        showWorldToast('🫧 泡泡護罩消失了！');
        SoundManager.playCorrect();
        updateItemTray();
      }
    }
    if (mountT > 0) {
      mountT -= dt;
      if (mountMesh) mountMesh.position.y = -0.05 + Math.sin(simTime * 3) * 0.06;
      if (!mountWarned && mountT <= 3) {
        mountWarned = true;
        showWorldToast('☁️ 雲朵即將散開⋯⋯');
      }
      if (mountT <= 0) {
        mountT = 0;
        if (mountMesh) mountMesh.visible = false;
        showWorldToast('☁️ 雲朵散開了！');
        updateItemTray();
      }
    }
  }

  // ===================== input =====================
  function zoneActive() {
    return els.zone && els.zone.classList.contains('active');
  }

  // release every held input — used when the window/tab loses the ability
  // to receive the matching keyup/pointerup (right-click context menu,
  // alt-tab/blur, tab hidden) so movement doesn't get stuck "on" forever.
  function releaseAllInputs() {
    keys.f = 0; keys.b = 0; keys.l = 0; keys.r = 0;
    keys.sprint = false;
    jumpHeld = false;
    joy.active = false; joy.dx = 0; joy.dy = 0;
    lookPointers.clear();
  }

  function setupKeyboard() {
    window.addEventListener('keydown', e => {
      if (!playing || !zoneActive()) return;
      if (document.querySelector('.modal.active')) return;
      if (quizOpen) {
        if (e.code === 'Escape') closeQuiz();
        return;
      }
      // PLAY panels (egg shop / hatching / pet collection) own the keyboard while open
      if (playLocked()) {
        if (e.code === 'Escape') SkyPlay.onEscape?.();
        return;
      }
      // IME (Chinese/Japanese/Korean input method) composition steals WASD —
      // detect it and nudge the player to switch back to English, but keep
      // falling into the switch below so movement still works once it does.
      if (e.key === 'Process' || e.keyCode === 229) {
        if (!imeToastShown) {
          imeToastShown = true;
          showWorldToast('⌨️ 偵測到中文輸入法：按 Shift 切換成英文，WASD 才會動！也可以用方向鍵移動');
        }
      }
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
        case 'KeyQ': useActiveItem('lightning_staff'); break;
        case 'KeyR': useActiveItem('bubble_shield'); break;
        case 'KeyF': useActiveItem('cloud_mount'); break;
        case 'KeyC': requestDash(); break;           // PLAY: dash
        case 'KeyP': SkyPlay.togglePets?.(); break;  // PLAY: pet collection
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
    // tab loses focus / goes to the background → release everything so a
    // held key/drag doesn't keep driving the player after the user left
    window.addEventListener('blur', releaseAllInputs);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseAllInputs();
    });
  }

  function interact() {
    if (quizOpen || playLocked()) return;
    if (currentTarget && currentTarget.play) { currentTarget.use(); return; }   // PLAY interactables
    if (!currentTarget) {
      const mob = nearestMob(10);
      if (mob) { openCombatQuiz(mob); return; }
      showWorldToast('🔍 附近沒有可以互動的東西，去找金色的「!」標記吧');
      return;
    }
    const q = currentTarget.q;
    if (q.type === 'portal') {
      if (isLocked(q)) {
        showWorldToast(`🔒 銀河傳送門沉睡中⋯⋯再完成 ${q.lock - totalCleared()} 個任務就會甦醒！`);
      } else {
        usePortal(q);
      }
      return;
    }
    if (q.type === 'switch') {
      interactSwitch(q);
      return;
    }
    if (isLocked(q)) {
      showWorldToast(q.lockSecret
        ? `🔒 再完成 ${q.lockSecret - secretCleared()} 個秘境任務就能挑戰「${q.name}」！`
        : `🔒 再完成 ${q.lock - totalCleared()} 個任務就能挑戰「${q.name}」！`);
      return;
    }
    if (!LIVE_TYPES.has(q.type)) {
      showWorldToast('⏳ 這個任務即將在後續更新開放！');
      return;
    }
    if (raceActive && raceActive.q.id !== q.id) cancelRace('🏁 競速取消了');
    if (orderActive && orderActive.q.id !== q.id) cancelOrder('🪨 語序踏石取消了');
    if (mazeActive && mazeActive.q.id !== q.id) cancelMaze('🌀 傳送迷宮取消了');
    switch (q.type) {
      case 'arena': startArena(q); return;
      case 'race': startRace(q); return;
      case 'runes': startRunes(q); return;
      case 'order': startOrder(q); return;
      case 'maze': startMaze(q); return;
      case 'boss':
        if (bossActive && bossActive.q.id === q.id) engageBoss();
        else {
          // another boss is still awake far away (left by portal / bridge): it goes back to sleep
          if (bossActive) resetBoss();
          startBoss(q);
        }
        return;
      default: openQuest(q);
    }
  }

  // ===================== quiz overlay =====================
  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffled(arr).slice(0, n); }
  function vocabPool(diff) { return VOCAB_DATA[diff] || VOCAB_DATA.easy; }
  // vocab zh comes in two styles: '劍 — 用來攻擊怪物的武器' and '尋找沈**船**來獲得寶藏。'
  function zhShort(entry) {
    const zh = entry.zh || '';
    const m = zh.match(/\*\*([^*]+)\*\*/);
    return m ? m[1] : zh.split(' — ')[0];
  }
  function zhPretty(zh) {
    return (zh || '').replace(/\*\*([^*]+)\*\*/g, '<b class="aw-zh-key">$1</b>');
  }

  function ensureQuizDom() {
    if (quiz) return;
    const div = document.createElement('div');
    div.className = 'aw-quiz';
    div.id = 'sky-quiz';
    div.innerHTML = `
      <div class="aw-quiz-card">
        <div class="aw-quiz-head">
          <span class="aw-quiz-name" id="sky-qz-name"></span>
          <span class="aw-quiz-streak" id="sky-qz-streak"></span>
          <span class="aw-quiz-prog" id="sky-qz-prog"></span>
          <button class="aw-quiz-close" id="sky-qz-close" title="離開任務">✕</button>
        </div>
        <div class="aw-quiz-body">
          <div class="aw-quiz-npc" id="sky-qz-npc" style="display:none"></div>
          <div class="aw-quiz-prompt" id="sky-qz-prompt"></div>
          <div class="aw-quiz-zh" id="sky-qz-zh"></div>
          <button class="aw-quiz-tts" id="sky-qz-tts" style="display:none">🔊 再聽一次</button>
          <button class="aw-quiz-hint" id="sky-qz-hint" style="display:none">🔮 使用提示水晶</button>
          <div class="aw-quiz-options" id="sky-qz-opts"></div>
          <div class="aw-quiz-feedback" id="sky-qz-fb"></div>
        </div>
      </div>`;
    els.wrap.appendChild(div);
    quiz = {
      root: div,
      card: div.querySelector('.aw-quiz-card'),
      streak: div.querySelector('#sky-qz-streak'),
      name: div.querySelector('#sky-qz-name'),
      prog: div.querySelector('#sky-qz-prog'),
      close: div.querySelector('#sky-qz-close'),
      npc: div.querySelector('#sky-qz-npc'),
      prompt: div.querySelector('#sky-qz-prompt'),
      zh: div.querySelector('#sky-qz-zh'),
      tts: div.querySelector('#sky-qz-tts'),
      hint: div.querySelector('#sky-qz-hint'),
      opts: div.querySelector('#sky-qz-opts'),
      fb: div.querySelector('#sky-qz-fb'),
    };
    quiz.close.addEventListener('click', closeQuiz);
    quiz.tts.addEventListener('click', () => {
      if (active && active.ttsText) TTSManager.speak(active.ttsText, 'en-US');
    });
    quiz.hint.addEventListener('click', useQuizHint);
  }

  function openQuest(q) {
    ensureQuizDom();
    active = {
      q, step: 0,
      replay: isCleared(q),
      wrongThis: false,        // wrong attempt on the current question
      anyWrong: false,
      ttsText: null,
      pairsLeft: 0,
      selectedPair: null,
    };
    quizOpen = true;
    keys.f = keys.b = keys.l = keys.r = 0;
    joy.dx = joy.dy = 0;
    GameEngine.setDeferLevelUp(true);
    quiz.root.classList.remove('win');
    quiz.root.classList.add('on');
    uiState.streak = 0;
    uiStreakUpdate(false);
    quiz.name.textContent = `📜 ${q.name}`;
    quiz.npc.style.display = 'none';
    quiz.tts.style.display = 'none';
    quiz.fb.textContent = '';
    quiz.zh.textContent = '';
    renderProg();
    // intro screen
    quiz.prompt.textContent = q.intro;
    quiz.opts.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'aw-opt aw-opt-go';
    btn.textContent = active.replay ? '🔁 開始複習（獎勵減半）' : '⚔️ 開始挑戰！';
    btn.addEventListener('click', nextStep);
    quiz.opts.appendChild(btn);
  }

  function closeQuiz() {
    if (!quizOpen) return;
    quizOpen = false;
    active = null;
    quiz.root.classList.remove('on', 'win');
    TTSManager.stop();
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    uiFlushBanners();
  }

  function renderProg() {
    if (!active) return;
    const n = active.q.n;
    const st = Math.min(active.step, n);
    const pct = n ? (st / n) * 100 : 0;
    const bar = quiz.prog.querySelector('.aw-prog-bar');
    if (bar) {
      bar.style.setProperty('--p', pct + '%');
      quiz.prog.querySelector('.aw-prog-n').textContent = `${st}/${n}`;
    } else {
      quiz.prog.innerHTML = `<span class="aw-prog"><span class="aw-prog-bar" style="--p:${pct}%"><span class="aw-prog-fill"></span></span><span class="aw-prog-n">${st}/${n}</span></span>`;
    }
  }

  // reward one correct answer (call BEFORE step++ so wrongThis is per-question)
  function awardAnswer(isVocab, word) {
    const tier = SKY_REWARD[active.q.diff];
    const firstTry = !active.wrongThis && !active.replay;
    const base = firstTry ? tier.ans : Math.ceil(tier.ans / 2);
    const xpGain = Math.round(base * (perks.xpMult || 1));
    GameEngine.addXP(xpGain);
    uiPop('xp', xpGain);
    uiState.streak = firstTry ? uiState.streak + 1 : 0;
    uiStreakUpdate(true);
    if (firstTry) {
      // 收藏之王: chests pay double per-answer gems
      skyAddGems(perks.chestGem && active.q.type === 'chest' ? 2 : 1);
    }
    if (isVocab && !active.wrongThis) GameEngine.recordWord(word || '');
    GameEngine.recordSkyAnswer?.();
  }

  // 永不放棄 title: the first miss of each quest costs nothing
  function markWrong() {
    if (!active) return;
    if (perks.freeMiss && !active.freeMissUsed) {
      active.freeMissUsed = true;
      quiz.fb.textContent = '💪 永不放棄：這次失誤不算！再試一次！';
      quiz.fb.className = 'aw-quiz-feedback good';
      return;
    }
    active.wrongThis = true;
    active.anyWrong = true;
    uiState.streak = 0;
    uiStreakUpdate(false);
  }

  // 🔮 hint-crystal consumable inside quizzes
  function updateHintBtn() {
    if (!quiz.hint) return;
    quiz.hint.style.display = (GameEngine.hasBuff('hint') && active && active.hintFn) ? '' : 'none';
  }
  function useQuizHint() {
    if (!active || !active.hintFn || !GameEngine.consumeBuff('hint')) return;
    active.hintFn();
    SoundManager.playCorrect();
    updateHintBtn();
  }

  function nextStep() {
    if (!active) return;
    active.wrongThis = false;
    if (active.step >= active.q.n) { completeQuest(); return; }
    quiz.fb.textContent = '';
    quiz.fb.className = 'aw-quiz-feedback';
    renderProg();
    switch (active.q.type) {
      case 'chest': askVocab(); break;
      case 'gate': askGrammar(); break;
      case 'npc': askDialog(); break;
      case 'listen': askListen(); break;
      case 'pillars': askPairs(); break;
      case 'bridge': askSpellWord(); break;
      case 'combat': askCombat(); break;
    }
  }

  function renderOptions(options, correctIdx, onCorrect, labeler, onWrong) {
    quiz.opts.innerHTML = '';
    uiStepAnim();
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'aw-opt';
      b.dataset.k = 'ABCD'[i] || String(i + 1);
      b.dataset.c = String(i % 4);
      b.textContent = labeler ? labeler(opt) : opt;
      if (i === correctIdx) b.dataset.correct = '1';
      b.addEventListener('click', () => {
        if (!active) return;
        if (i === correctIdx) {
          b.classList.add('right');
          uiBurst(b);
          SoundManager.playCorrect();
          quiz.opts.querySelectorAll('button').forEach(x => (x.disabled = true));
          onCorrect();
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          markWrong();
          if (!quiz.fb.classList.contains('good')) {
            quiz.fb.textContent = '再想想看，你可以的！';
            quiz.fb.className = 'aw-quiz-feedback bad';
          }
          SoundManager.playWrong();
          onWrong?.();
        }
      });
      quiz.opts.appendChild(b);
    });
    // hint crystal: eliminate one wrong option
    if (active) {
      active.hintFn = () => {
        const btns = [...quiz.opts.querySelectorAll('button')];
        const wrongBtn = btns.find(b => !b.dataset.correct && !b.disabled);
        if (wrongBtn) { wrongBtn.disabled = true; wrongBtn.classList.add('dim'); }
      };
      updateHintBtn();
    }
  }

  function askVocab() {
    const pool = vocabPool(active.q.diff);
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const distract = pickN(pool.filter(e => e.word !== entry.word), 3).map(e => e.word);
    const options = shuffled([entry.word, ...distract]);
    quiz.prompt.innerHTML = `${entry.hint} ${entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>')}`;
    quiz.zh.innerHTML = zhPretty(entry.zh) +
      (perks.firstLetter ? `　<span class="aw-perk-hint">💡 開頭：${entry.word[0].toUpperCase()}</span>` : '');
    quiz.tts.style.display = 'none';
    renderOptions(options, options.indexOf(entry.word), () => {
      TTSManager.speak(entry.word, 'en-US');
      quiz.fb.textContent = `✨ 正確！${entry.word} — ${zhShort(entry)}`;
      quiz.fb.className = 'aw-quiz-feedback good';
      awardAnswer(true, entry.word);
      active.step++;
      setTimeout(nextStep, 1100);
    });
  }

  function askGrammar() {
    const entry = GRAMMAR_DATA[Math.floor(Math.random() * GRAMMAR_DATA.length)];
    const options = shuffled(entry.options.slice());
    quiz.prompt.innerHTML = entry.sentence.replace(/_+/g, '<span class="aw-blank">____</span>');
    quiz.zh.textContent = entry.translation || '';
    quiz.tts.style.display = 'none';
    renderOptions(options, options.indexOf(entry.blank), () => {
      quiz.fb.textContent = `✨ 正確！${entry.explain}`;
      quiz.fb.className = 'aw-quiz-feedback good';
      awardAnswer(false);
      active.step++;
      setTimeout(nextStep, 1400);
    });
    if (perks.dropWrong) autoEliminateOne();  // 文法大師
  }

  // 文法大師 perk: silently disable one wrong option on grammar questions
  function autoEliminateOne() {
    const btns = [...quiz.opts.querySelectorAll('button')];
    const wrongBtn = btns.find(b => !b.dataset.correct && !b.disabled);
    if (wrongBtn) { wrongBtn.disabled = true; wrongBtn.classList.add('dim'); }
  }

  function askDialog() {
    const diff = active.q.diff;
    const useLife = Math.random() < 0.4 && EMPIRE_LIFE[diff]?.length;
    const pool = useLife ? EMPIRE_LIFE[diff] : EMPIRE_DIALOGUES[diff];
    const entry = pool[Math.floor(Math.random() * pool.length)];
    const options = shuffled([entry.a, ...entry.wrong]);
    quiz.npc.style.display = '';
    quiz.npc.textContent = active.q.npc || '🙂';
    quiz.prompt.textContent = `「${entry.q}」`;
    quiz.zh.textContent = useLife ? `💭 ${entry.scene}` : entry.qZh;
    active.ttsText = entry.q;
    quiz.tts.style.display = '';
    TTSManager.speak(entry.q, 'en-US');
    renderOptions(options, options.indexOf(entry.a), () => {
      quiz.fb.textContent = '✨ 回答得真好！';
      quiz.fb.className = 'aw-quiz-feedback good';
      awardAnswer(false);
      active.step++;
      setTimeout(nextStep, 1100);
    });
  }

  function askListen() {
    const pool = vocabPool(active.q.diff);
    const four = pickN(pool, 4);
    const target = four[Math.floor(Math.random() * 4)];
    quiz.prompt.textContent = '👂 仔細聽，水晶唸出了哪個單字？';
    quiz.zh.textContent = '';
    active.ttsText = target.word;
    quiz.tts.style.display = '';
    TTSManager.speak(target.word, 'en-US');
    const options = four.map(e => e.word);
    renderOptions(options, options.indexOf(target.word), () => {
      quiz.fb.textContent = `✨ 沒錯！${target.word} — ${zhShort(target)}`;
      quiz.fb.className = 'aw-quiz-feedback good';
      awardAnswer(true, target.word);
      active.step++;
      setTimeout(nextStep, 1100);
    }, w => `💎 ${w}`);
  }

  // pillars: match n English↔Chinese pairs; one matched pair = one "answer"
  function askPairs() {
    const pool = vocabPool(active.q.diff);
    const pairs = pickN(pool, active.q.n);
    active.pairsLeft = pairs.length;
    active.selectedPair = null;
    active.step = 0;
    renderProg();
    quiz.prompt.textContent = '🏛️ 點一個英文，再點它的中文意思，配成對！';
    quiz.zh.textContent = '';
    quiz.tts.style.display = 'none';
    quiz.opts.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'aw-pairs';
    const left = pairs.map((e, i) => ({ i, label: e.word, en: true }));
    const right = pairs.map((e, i) => ({ i, label: zhShort(e), en: false }));
    const cells = [...shuffled(left), ...shuffled(right)];
    const colA = document.createElement('div');
    const colB = document.createElement('div');
    colA.className = colB.className = 'aw-pair-col';
    cells.forEach(c => (c.en ? colA : colB).appendChild(makePairBtn(c, pairs)));
    grid.appendChild(colA);
    grid.appendChild(colB);
    quiz.opts.appendChild(grid);
  }

  function makePairBtn(cell, pairs) {
    const b = document.createElement('button');
    b.className = 'aw-opt aw-pair';
    b.textContent = cell.label;
    b.dataset.pair = String(cell.i);
    b.dataset.en = cell.en ? '1' : '0';
    b.addEventListener('click', () => {
      if (!active || b.classList.contains('matched')) return;
      const sel = active.selectedPair;
      if (!sel) {
        active.selectedPair = { i: cell.i, en: cell.en, btn: b };
        b.classList.add('picked');
        return;
      }
      if (sel.btn === b) {  // deselect
        b.classList.remove('picked');
        active.selectedPair = null;
        return;
      }
      if (sel.en === cell.en) {  // switched selection within same column
        sel.btn.classList.remove('picked');
        active.selectedPair = { i: cell.i, en: cell.en, btn: b };
        b.classList.add('picked');
        return;
      }
      active.selectedPair = null;
      sel.btn.classList.remove('picked');
      if (sel.i === cell.i) {
        sel.btn.classList.add('matched');
        b.classList.add('matched');
        uiBurst(b);
        uiBurst(sel.btn);
        SoundManager.playCorrect();
        const word = pairs[cell.i].word;
        TTSManager.speak(word, 'en-US');
        awardAnswer(true, word);
        active.wrongThis = false;
        active.step++;
        active.pairsLeft--;
        renderProg();
        if (active.pairsLeft <= 0) setTimeout(completeQuest, 900);
      } else {
        sel.btn.classList.add('wrong');
        b.classList.add('wrong');
        markWrong();
        SoundManager.playWrong();
        setTimeout(() => {
          sel.btn.classList.remove('wrong');
          b.classList.remove('wrong');
        }, 600);
      }
    });
    return b;
  }

  function completeQuest() {
    if (!active) return;
    const q = active.q;
    const tier = SKY_REWARD[q.diff];
    const first = !active.replay;
    save.completed[q.id] = (save.completed[q.id] || 0) + 1;
    persist();
    let xpGain = 0;
    if (first) {
      xpGain = Math.round(tier.xp * (perks.xpMult || 1));
      GameEngine.addXP(xpGain);
      uiPop('xp', xpGain);
      skyAddGems(tier.gems);
      GameEngine.recordSkyQuest?.(q.id.startsWith('sqg_'), q.id.startsWith('sqh_'), q.id.startsWith('squ_'));
      if (q.type === 'bridge') {
        save.bridgesBuilt[q.id] = true;
        persist();
        const b = SKY_BRIDGES.find(x => x.quest === q.id);
        if (b) {
          buildBridge(b);
          const target = isleById(b.to);
          showWorldToast(`🌉 通往${target ? target.name : '遠方'}的天空之橋出現了！`);
          uiBanner(target ? `通往${target.name}的橋` : '天空之橋', '橋樑出現了', '🌉');
        }
      }
      if (q.type === 'boss') {
        GameEngine.recordSkyBoss?.();
        if (q.id === 'sqh_temple_boss') GameEngine.recordSkySecretBoss?.();
      }
      if (q.type === 'order' || q.type === 'maze') GameEngine.recordSkyPuzzle?.();
    }
    SoundManager.playQuestComplete();
    if (first) spawnConfetti(q.type === 'boss' ? 70 : 36);
    updateQuestMarkers();
    renderStartScreen();
    quiz.npc.style.display = 'none';
    quiz.tts.style.display = 'none';
    // quest-complete celebration (presentation only; stars just mirror "no wrong answers")
    const graded = ['chest', 'gate', 'npc', 'listen', 'pillars', 'bridge'].includes(q.type);
    const flawless = !graded || !active.anyWrong;
    quiz.root.classList.add('win');
    quiz.prompt.innerHTML = `<div class="aw-win"><div class="aw-win-rays"></div>
      <div class="aw-win-trophy">${q.type === 'boss' ? '👑' : '🏆'}</div>
      <div class="aw-win-title aw-outline-text">${first ? '任務完成！' : '複習完成！'}</div>
      <div class="aw-win-stars"><i>★</i><i>★</i><i${flawless ? '' : ' class="off"'}>★</i></div>
      ${graded ? `<div class="aw-win-note">${flawless ? '全部一次答對，太厲害了！' : '再練一次，下次挑戰全對！'}</div>` : ''}
      ${first
        ? `<div class="aw-win-rewards"><span class="aw-reward xp">+<b data-count="${xpGain}">0</b> XP</span><span class="aw-reward gem">+<b data-count="${tier.gems}">0</b> 💎</span></div>`
        : '<div class="aw-win-note">繼續探索其他島嶼吧！</div>'}
    </div>`;
    uiCountUp(quiz.prompt);
    const cleared = totalCleared();
    quiz.zh.textContent = !first ? ''
      : cleared >= 22 ? '🌌 銀河傳送門開啟了！去晨曦之島找 🌀 吧！'
      : cleared >= 12 ? '⛈️ 暴風之眼的封印鬆動了…'
      : '';
    if (first && cleared === 22) {
      updateQuestMarkers();   // portal 🔒 → 🌀
      showWorldToast('🌌 銀河傳送門開啟了！晨曦之島出現了神秘的漩渦！');
      uiBanner('銀河傳送門開啟！', '新區域解鎖', '🌌');
    }
    quiz.fb.textContent = '';
    quiz.opts.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'aw-opt aw-opt-go';
    btn.textContent = '🏝️ 繼續冒險';
    btn.addEventListener('click', closeQuiz);
    quiz.opts.appendChild(btn);
    active.step = q.n;
    renderProg();
  }

  function setupPointerControls() {
    const el = els.wrap;

    // right-click drag-cancel: no matching pointerup ever arrives once the
    // browser's context menu takes over, so the look-drag/joystick state
    // would otherwise stay "stuck" — suppress the menu and release inputs
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      releaseAllInputs();
    });

    el.addEventListener('pointerdown', e => {
      // right mouse button drives the OS/browser context menu, not the
      // camera drag — bail before touching joy/lookPointers state so its
      // eventual contextmenu (and no matching pointerup) can't leave input stuck
      if (e.pointerType === 'mouse' && e.button === 2) return;
      if (!playing) return;
      // clicks on overlay UI (quiz card, buttons) must reach their targets —
      // capturing them here would swallow the click event
      if (e.target !== renderer.domElement) return;
      if (quizOpen) return;
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
        // right side / mouse → look (also candidate for a tap-attack)
        lookPointers.set(e.pointerId, {
          x: e.clientX, y: e.clientY,
          sx: e.clientX, sy: e.clientY, t: performance.now(),
        });
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
      lookPointers.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });
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
      const lp = lookPointers.get(e.pointerId);
      lookPointers.delete(e.pointerId);
      pinchDist = 0;
      // short non-drag tap → try to attack a mob under the cursor
      if (lp && playing && !quizOpen &&
          Math.hypot(e.clientX - lp.sx, e.clientY - lp.sy) < 8 &&
          performance.now() - lp.t < 400) {
        tapAttack(e.clientX, e.clientY);
      }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    el.addEventListener('wheel', e => {
      if (!playing) return;
      e.preventDefault();
      cam.radius = Math.min(16, Math.max(5, cam.radius * (1 + Math.sign(e.deltaY) * 0.09)));
    }, { passive: false });

    // touch buttons (held state feeds the glide perk)
    els.btnJump.addEventListener('pointerdown', e => {
      e.preventDefault();
      jumpBufferedAt = simTime;
      jumpHeld = true;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
      els.btnJump.addEventListener(evt, () => { jumpHeld = false; }));
    els.btnAct.addEventListener('pointerdown', e => {
      e.preventDefault();
      interact();
    });
  }

  // ===================== main loop =====================
  function animate() {
    // stop rendering while another zone is visible; onShow() restarts us
    if (!zoneActive()) { rafId = null; SkyArt.idle(); return; }
    rafId = requestAnimationFrame(animate);

    const dt = Math.min(0.1, (clock.update(), clock.getDelta()));
    if (playing) {
      updateWorld(dt);
      updatePlayer(dt);
      updateCamera(dt);
    }
    SkyArt.frame(dt);   // world animation, atmosphere, sun/sky follow + render (js/sky-art.js)
  }

  return { init, onShow };
})();
