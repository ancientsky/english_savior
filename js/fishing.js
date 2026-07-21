/* ===== 悠閒釣魚塘 (Cozy Fishing Pond) =====
   A listening + collection game across 14 ponds (110 species total):
     1. 拋竿: the interaction lives INSIDE the scene as overlays anchored to a
        hand-held rod (bottom-right) with an SVG line running to the bobber.
        A power-meter arc oscillates near the waterline; click/space stops it
        — the rod bends, the line follows the bobber as it arcs out (JS-driven,
        per-frame) and lands with a splash + ripples. Stopping near the
        center biases the catch toward a rarer species.
     2. 等待上鉤: the bobber floats while silhouette fish drift beneath the
        surface; one shadow gradually approaches the bobber as the bite
        nears, then a bite flash fires and the camera zooms in toward the
        bobber (transform-origin zoom + soft vignette; skipped under
        prefers-reduced-motion).
     3. 拉竿大戰 (tension fight): still zoomed in, a fish silhouette thrashes
        at the line point with splash bursts while the tension bar (now
        floating over the bobber's splash point) tugs in pulses (stronger &
        faster for rarer fish) and the rod jerks. Hold (pointer/space) to
        reel in and raise tension, release to ease off. Keep the tension
        marker inside the safe band to fill a progress bar; drifting too low
        (line goes slack) lets the fish escape, spiking too high snaps the
        line (line whips back + the shadow darts away).
     4. 上鉤瞬間: on a successful reel, a short catch-moment plays — the fish
        leaps out of the water in an arc with water droplets — then the
        camera zooms back out and the game transitions to the listening quiz.
     5. 聽力題: TTSManager speaks the caught fish's word (🔊 replay).
        Rarity 1-2 -> 4 zh-meaning multiple choice. Rarity 3-4 -> spell it
        from a shuffled letter bank (word letters + 4 decoys). Legendary
        (rarity 4) catches get a full-screen shine + fanfare.
        Correct -> catch (rewards + fish card). Wrong -> fish escapes.
     6. 水族箱: full-screen overlay — a themed mini-tank + dex strip per
        pond tab, with a per-pond collected counter and a legendary badge.
        Caught fish swim in the tank; uncaught species show as ??? cards.
   Save: localStorage `english_savior_fishing` = { caught, pond, pondsCompleted }
   (shape unchanged from the 30-species/4-pond version — old saves load as-is).
*/

const FishingGame = (() => {
  const SAVE_KEY = 'english_savior_fishing';

  // ambience: which ambient-particle layer to render in the scene/tank
  //   default = gentle bubbles, leaf = forest, coral = coral bay,
  //   abyss = deep glints, ember = volcano, snow = ice cave,
  //   mist = waterfall, bubble = trench, stars = dream lake,
  //   petal = blossom stream, fossil = dino lake, ghost = swamp wisps,
  //   soda = candy lake bubbles, tech = neon grid glow
  const PONDS = [
    { id: 1, name: '陽光池塘',     icon: '☀️', unlockAt: 0,  ambience: 'default' },
    { id: 2, name: '森林小溪',     icon: '🌲', unlockAt: 6,  ambience: 'leaf' },
    { id: 3, name: '珊瑚海灣',     icon: '🪸', unlockAt: 14, ambience: 'coral' },
    { id: 4, name: '傳說深海',     icon: '🌌', unlockAt: 22, ambience: 'abyss' },
    { id: 5, name: '火山溫泉湖',   icon: '🌋', unlockAt: 30, ambience: 'ember' },
    { id: 6, name: '極地冰洞',     icon: '🧊', unlockAt: 37, ambience: 'snow' },
    { id: 7, name: '雲霧瀑布潭',   icon: '🏞️', unlockAt: 44, ambience: 'mist' },
    { id: 8, name: '深海海溝',     icon: '🕳️', unlockAt: 50, ambience: 'bubble' },
    { id: 9, name: '星空夢境湖',   icon: '🌌', unlockAt: 55, ambience: 'stars' },
    { id: 10, name: '櫻花花瓣溪',  icon: '🌸', unlockAt: 60, ambience: 'petal' },
    { id: 11, name: '恐龍化石湖',  icon: '🦴', unlockAt: 66, ambience: 'fossil' },
    { id: 12, name: '幽靈沼澤',    icon: '👻', unlockAt: 72, ambience: 'ghost' },
    { id: 13, name: '糖果汽水湖',  icon: '🍬', unlockAt: 78, ambience: 'soda' },
    { id: 14, name: '未來科技水道', icon: '🤖', unlockAt: 84, ambience: 'tech' },
  ];

  const RARITY_REWARD = {
    1: { xp: 10, gems: 1 },
    2: { xp: 14, gems: 2 },
    3: { xp: 20, gems: 3 },
    4: { xp: 30, gems: 5 },
  };

  // Tension-fight tuning per rarity: wider safe band + gentler/slower
  // pulses for common fish (winnable by a 7-year-old), narrow band + sharp
  // frequent pulses for legendaries (a real fight).
  const FIGHT_TUNING = {
    1: { half: 26, pulseEvery: 2.6, pulseStrength: 14, holdRate: 46, drainRate: 34, fillRate: 40, drainOut: 26 },
    2: { half: 21, pulseEvery: 2.1, pulseStrength: 18, holdRate: 50, drainRate: 38, fillRate: 36, drainOut: 28 },
    3: { half: 17, pulseEvery: 1.7, pulseStrength: 24, holdRate: 56, drainRate: 42, fillRate: 33, drainOut: 30 },
    4: { half: 13, pulseEvery: 1.3, pulseStrength: 30, holdRate: 62, drainRate: 46, fillRate: 30, drainOut: 34 },
  };

  let save = { caught: {}, pond: 1, pondsCompleted: [] };
  let els = {};
  let currentScreen = 'pond'; // pond | cast | reel | quiz | result
  let aquariumOpen = false;
  let aquariumPond = 1;

  let forcedFishId = null;   // set by the test hook forceFish()
  let castState = null;      // { pos, dir, speed, lastTs, raf }
  let reelState = null;      // { fish, tension, vel, progress, holding, time, tuning, nextPulse, lastTs, raf }
  let activeQuiz = null;     // { type: 'options'|'spell', fish, ... }

  function init() {
    const root = document.getElementById('fh-root');
    if (!root) return;
    loadSave();
    buildDom(root);
    renderPondScreen();
    showScreen('pond');

    window.__fhTest = {
      save: () => JSON.parse(JSON.stringify(save)),
      cast: () => { skipToBite(); },
      forceFish: (id) => { forcedFishId = id; },
      reel: () => forceReelSuccess(),
      reelSnap: () => forceReelSnap(),
      answer: (correct) => testAnswer(correct),
      pond: (n) => selectPond(n),
      screen: () => (aquariumOpen ? 'aquarium' : currentScreen),
      cancelCast: () => cancelCast(),
    };
  }

  // ===== Persistence =====
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        save = {
          caught: parsed.caught && typeof parsed.caught === 'object' ? parsed.caught : {},
          pond: Number(parsed.pond) || 1,
          pondsCompleted: Array.isArray(parsed.pondsCompleted) ? parsed.pondsCompleted : [],
        };
      }
    } catch { /* keep defaults */ }
    if (!isPondUnlocked(save.pond)) save.pond = 1;
  }

  function persist() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  // ===== Helpers =====
  function distinctCaughtCount() { return Object.keys(save.caught).length; }
  function isPondUnlocked(id) {
    const p = PONDS.find(x => x.id === id);
    return !!p && distinctCaughtCount() >= p.unlockAt;
  }
  function isZoneActive() {
    const z = document.getElementById('zone-fishing');
    return !!z && z.classList.contains('active');
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // 自創複合字（ICEDRAGON 等）用 say 欄位唸出自然的兩個單字
  function sayWord(fish) { return (fish && (fish.say || fish.word)) || ''; }

  function isLegendary(fish) { return !!fish && (fish.legendary || fish.rarity >= 4); }
  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch { return false; }
  }
  function ambienceFor(pondId) {
    const p = PONDS.find(x => x.id === pondId);
    return p ? p.ambience : 'default';
  }
  function ambienceParticleHtml(ambience, n) {
    const glyphByAmbience = {
      default: '💧', leaf: '🍃', coral: '🫧', abyss: '✨',
      ember: '🔥', snow: '❄️', mist: '🌫️', bubble: '🫧', stars: '⭐',
      petal: '🌸', fossil: '🦴', ghost: '👻', soda: '🫧', tech: '💠',
    };
    const glyph = glyphByAmbience[ambience] || '💧';
    let html = '';
    for (let i = 0; i < n; i++) {
      const left = (Math.random() * 96).toFixed(1);
      const dur = (4 + Math.random() * 6).toFixed(2);
      const delay = (-(Math.random() * 8)).toFixed(2);
      const size = (10 + Math.random() * 10).toFixed(0);
      html += `<span class="fh-particle" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;font-size:${size}px;">${glyph}</span>`;
    }
    return html;
  }
  function fishShadowHtml(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      const top = (10 + Math.random() * 70).toFixed(1);
      const dur = (7 + Math.random() * 7).toFixed(2);
      const delay = (-(Math.random() * 10)).toFixed(2);
      const dir = Math.random() < 0.5 ? 'fh-shadow-ltr' : 'fh-shadow-rtl';
      html += `<div class="fh-fish-shadow ${dir}" style="top:${top}%;animation-duration:${dur}s;animation-delay:${delay}s;">🐟</div>`;
    }
    return html;
  }

  // Coordinates (0-100 scene-relative space, matching the SVG line viewBox)
  // that the rod's resting tip and the hooked-fish point live at. Used both
  // to draw the line and to place the fly-cast animation's start/end.
  const ROD_TIP_BASE = { x: 80, y: 76 };
  const HOOK_POINT = { x: 50, y: 60 };

  // ===== DOM scaffold =====
  function buildDom(root) {
    root.innerHTML = `
      <div class="fh-screen" id="fh-screen-pond">
        <div class="fh-topbar">
          <div class="fh-dex-counter" id="fh-dex-counter">📖 圖鑑 0/110</div>
          <div class="fh-pond-tabs" id="fh-pond-tabs"></div>
        </div>
        <div class="fh-scene fh-pond-1" id="fh-scene">
          <div class="fh-scene-zoomwrap" id="fh-scene-zoomwrap">
            <div class="fh-scene-sky"></div>
            <div class="fh-scene-far"></div>
            <div class="fh-scene-particles" id="fh-scene-particles"></div>
            <div class="fh-water">
              <div class="fh-fish-shadows" id="fh-scene-shadows"></div>
              <div class="fh-wave fh-wave-1"></div>
              <div class="fh-wave fh-wave-2"></div>
              <div class="fh-wait-shadows" id="fh-wait-shadows"></div>
              <div class="fh-approach-shadow" id="fh-approach-shadow">🐟</div>
            </div>
            <div class="fh-hook-point" id="fh-hook-point">
              <div class="fh-ripple-idle" id="fh-ripple-idle"></div>
              <div class="fh-bobber" id="fh-bobber">🔴</div>
              <div class="fh-fight-fish" id="fh-fight-fish">🐟</div>
              <div class="fh-fx-layer" id="fh-fx-layer"></div>
              <div class="fh-fish-leap" id="fh-fish-leap"></div>
            </div>
            <div class="fh-flying-bobber" id="fh-flying-bobber">🔴</div>
            <div class="fh-dock"><div class="fh-boat">🚣</div></div>
          </div>
          <div class="fh-vignette" id="fh-vignette"></div>
          <svg class="fh-line-svg" id="fh-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line id="fh-line-el" x1="${ROD_TIP_BASE.x}" y1="${ROD_TIP_BASE.y}" x2="${HOOK_POINT.x}" y2="${HOOK_POINT.y}" />
          </svg>
          <div class="fh-rod-anchor" id="fh-rod-anchor">
            <div class="fh-hand-emoji">🤚</div>
            <div class="fh-rod" id="fh-rod">🎣</div>
          </div>
          <div class="fh-bite-flash" id="fh-bite-flash">🎣 上鉤了！！</div>
          <div class="fh-cast-meter-overlay" id="fh-cast-meter-overlay">
            <div class="fh-cast-title">🎣 抓準時機，讓浮標甩到中間！</div>
            <div class="fh-cast-track" id="fh-cast-track">
              <div class="fh-cast-center-zone"></div>
              <div class="fh-cast-marker" id="fh-cast-marker">🎯</div>
            </div>
            <div class="fh-cast-hint">點擊畫面或按空白鍵停止！</div>
          </div>
          <div class="fh-tension-overlay" id="fh-tension-overlay">
            <div class="fh-reel-title">按住畫面或空白鍵拉緊魚線，讓張力停在安全區！</div>
            <div class="fh-reel-gauges-row">
              <div class="fh-reel-gauge" id="fh-reel-gauge">
                <div class="fh-reel-zone-hi"></div>
                <div class="fh-reel-target" id="fh-reel-target"></div>
                <div class="fh-reel-zone-lo"></div>
                <div class="fh-reel-marker" id="fh-reel-marker">🐟</div>
              </div>
              <div class="fh-reel-progress-wrap"><div class="fh-reel-progress-fill" id="fh-reel-progress-fill"></div></div>
            </div>
          </div>
        </div>
        <div class="fh-actions">
          <button type="button" class="fh-btn-primary fh-btn-cast" id="fh-btn-cast">🎣 拋竿</button>
          <button type="button" class="fh-btn-secondary fh-btn-aquarium" id="fh-btn-aquarium">🐠 水族箱</button>
        </div>
      </div>

      <div class="fh-screen" id="fh-screen-quiz" style="display:none">
        <div class="fh-quiz-fish-emoji" id="fh-quiz-emoji">🐟</div>
        <div class="fh-quiz-word-fallback" id="fh-quiz-word-fallback" style="display:none"></div>
        <button type="button" class="fh-quiz-replay-btn" id="fh-quiz-replay">🔊 再聽一次</button>
        <div class="fh-quiz-prompt">聽聲音，這是什麼？</div>
        <div class="fh-quiz-body" id="fh-quiz-body"></div>
        <div class="fh-quiz-feedback" id="fh-quiz-feedback"></div>
      </div>

      <div class="fh-screen" id="fh-screen-result">
        <div id="fh-result-body"></div>
      </div>

      <div class="fh-legendary-shine" id="fh-legendary-shine"></div>

      <div class="fh-aquarium-overlay" id="fh-aquarium-overlay">
        <div class="fh-aq-panel">
          <div class="fh-aq-header">
            <div class="fh-aq-title">🐠 水族箱</div>
            <div class="fh-aq-counter" id="fh-aq-counter">0/110</div>
            <button type="button" class="fh-aq-close" id="fh-aq-close">✕</button>
          </div>
          <div class="fh-aq-tabs" id="fh-aq-tabs"></div>
          <div class="fh-aq-pond-stats" id="fh-aq-pond-stats"></div>
          <div class="fh-aq-tank" id="fh-aq-tank"></div>
          <div class="fh-aq-detail" id="fh-aq-detail" style="display:none"></div>
          <div class="fh-aq-dex-strip" id="fh-aq-dex-strip"></div>
        </div>
      </div>
    `;
    // Set initial screen(result) hidden — it starts empty and is only shown
    // via showScreen(), but give it display:none up front like the others.
    document.getElementById('fh-screen-result').style.display = 'none';

    els = {
      screens: {
        pond: document.getElementById('fh-screen-pond'),
        quiz: document.getElementById('fh-screen-quiz'),
        result: document.getElementById('fh-screen-result'),
      },
      dexCounter: document.getElementById('fh-dex-counter'),
      pondTabs: document.getElementById('fh-pond-tabs'),
      sceneWrap: document.getElementById('fh-scene'),
      zoomwrap: document.getElementById('fh-scene-zoomwrap'),
      vignette: document.getElementById('fh-vignette'),
      sceneParticles: document.getElementById('fh-scene-particles'),
      sceneShadows: document.getElementById('fh-scene-shadows'),
      btnCast: document.getElementById('fh-btn-cast'),
      btnAquarium: document.getElementById('fh-btn-aquarium'),
      lineSvg: document.getElementById('fh-line-svg'),
      lineEl: document.getElementById('fh-line-el'),
      rodAnchor: document.getElementById('fh-rod-anchor'),
      rodEl: document.getElementById('fh-rod'),
      biteFlash: document.getElementById('fh-bite-flash'),
      castOverlay: document.getElementById('fh-cast-meter-overlay'),
      castTrack: document.getElementById('fh-cast-track'),
      castMarker: document.getElementById('fh-cast-marker'),
      tensionOverlay: document.getElementById('fh-tension-overlay'),
      reelTarget: document.getElementById('fh-reel-target'),
      reelMarker: document.getElementById('fh-reel-marker'),
      reelProgressFill: document.getElementById('fh-reel-progress-fill'),
      reelGauge: document.getElementById('fh-reel-gauge'),
      hookPoint: document.getElementById('fh-hook-point'),
      bobberEl: document.getElementById('fh-bobber'),
      rippleIdle: document.getElementById('fh-ripple-idle'),
      fightFish: document.getElementById('fh-fight-fish'),
      fxLayer: document.getElementById('fh-fx-layer'),
      fishLeap: document.getElementById('fh-fish-leap'),
      flyingBobber: document.getElementById('fh-flying-bobber'),
      waitShadows: document.getElementById('fh-wait-shadows'),
      approachShadow: document.getElementById('fh-approach-shadow'),
      quizEmoji: document.getElementById('fh-quiz-emoji'),
      quizWordFallback: document.getElementById('fh-quiz-word-fallback'),
      quizReplayBtn: document.getElementById('fh-quiz-replay'),
      quizBody: document.getElementById('fh-quiz-body'),
      quizFeedback: document.getElementById('fh-quiz-feedback'),
      resultBody: document.getElementById('fh-result-body'),
      legendaryShine: document.getElementById('fh-legendary-shine'),
      aqOverlay: document.getElementById('fh-aquarium-overlay'),
      aqCounter: document.getElementById('fh-aq-counter'),
      aqTabs: document.getElementById('fh-aq-tabs'),
      aqPondStats: document.getElementById('fh-aq-pond-stats'),
      aqTank: document.getElementById('fh-aq-tank'),
      aqDetail: document.getElementById('fh-aq-detail'),
      aqDexStrip: document.getElementById('fh-aq-dex-strip'),
      aqClose: document.getElementById('fh-aq-close'),
    };

    resetSceneOverlays();

    els.btnCast.addEventListener('click', beginCast);
    els.btnAquarium.addEventListener('click', openAquarium);
    els.aqClose.addEventListener('click', closeAquarium);

    els.quizReplayBtn.addEventListener('click', () => {
      if (activeQuiz && activeQuiz.fish) TTSManager.speak(sayWord(activeQuiz.fish), 'en-US', 0.85);
    });

    // Cast: click anywhere on the scene to stop the timing bar
    els.sceneWrap.addEventListener('click', () => {
      if (currentScreen === 'cast' && castState) stopCast();
    });

    // Reel: hold via pointer anywhere on the scene
    els.sceneWrap.addEventListener('pointerdown', () => { if (reelState) reelState.holding = true; });
    els.sceneWrap.addEventListener('pointerup', () => { if (reelState) reelState.holding = false; });
    els.sceneWrap.addEventListener('pointerleave', () => { if (reelState) reelState.holding = false; });

    // Space bar: stop cast / hold reel (only while the fishing zone is visible)
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || !isZoneActive()) return;
      if (currentScreen === 'cast' && castState) { e.preventDefault(); stopCast(); }
      else if (currentScreen === 'reel' && reelState) { e.preventDefault(); reelState.holding = true; }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' || !isZoneActive()) return;
      if (currentScreen === 'reel' && reelState) reelState.holding = false;
    });

    renderSceneAmbience(save.pond);
  }

  function showScreen(name) {
    currentScreen = name;
    // The 'pond' / 'cast' / 'reel' phases all share the same persistent
    // scene screen — only overlay layers toggle between them so the water,
    // rod and line never disappear mid-interaction. 'quiz' / 'result' still
    // fully replace the view.
    els.screens.pond.style.display = (name === 'pond' || name === 'cast' || name === 'reel') ? 'block' : 'none';
    els.screens.quiz.style.display = name === 'quiz' ? 'block' : 'none';
    els.screens.result.style.display = name === 'result' ? 'block' : 'none';
  }

  // ===== Pond scene =====
  function renderSceneAmbience(pondId) {
    const ambience = ambienceFor(pondId);
    els.sceneParticles.innerHTML = ambienceParticleHtml(ambience, 10);
    els.sceneShadows.innerHTML = fishShadowHtml(4);
  }

  function renderPondScreen() {
    els.dexCounter.textContent = `📖 圖鑑 ${distinctCaughtCount()}/${FISH_SPECIES.length}`;
    els.sceneWrap.className = 'fh-scene fh-pond-' + save.pond;
    renderSceneAmbience(save.pond);
    els.pondTabs.innerHTML = '';
    PONDS.forEach(p => {
      const unlocked = isPondUnlocked(p.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-pond-tab' + (p.id === save.pond ? ' active' : '') + (unlocked ? '' : ' locked');
      btn.innerHTML = unlocked ? `${p.icon} ${p.name}` : `🔒 需收藏 ${p.unlockAt} 種`;
      btn.title = p.name;
      btn.addEventListener('click', () => selectPond(p.id));
      els.pondTabs.appendChild(btn);
    });
  }

  function selectPond(id) {
    const p = PONDS.find(x => x.id === id);
    if (!p) return;
    if (!isPondUnlocked(id)) {
      GameEngine.showToast(`🔒 需先收藏 ${p.unlockAt} 種魚才能解鎖 ${p.name}！`, 'info');
      return;
    }
    save.pond = id;
    persist();
    renderPondScreen();
  }

  // ===== Scene overlay helpers (cast meter / tension bar / rod+line / zoom) =====
  function resetSceneOverlays() {
    showCastMeter(false);
    showTensionOverlay(false);
    showBiteFlash(false);
    showFightVisuals(false);
    showBobber(false);
    showFishLeap(false);
    els.waitShadows.style.display = 'none';
    els.approachShadow.style.display = 'none';
    els.flyingBobber.style.display = 'none';
    triggerZoom(false);
    positionRod(0);
  }

  function showCastMeter(show) { els.castOverlay.classList.toggle('active', show); }
  function showTensionOverlay(show) { els.tensionOverlay.classList.toggle('active', show); }
  function showBiteFlash(show) { els.biteFlash.classList.toggle('active', show); }
  function showFightVisuals(show) { els.fightFish.style.display = show ? 'block' : 'none'; }
  function showBobber(show) { els.bobberEl.style.display = show ? 'block' : 'none'; els.rippleIdle.style.display = show ? 'block' : 'none'; }
  function showFishLeap(show) { els.fishLeap.style.display = show ? 'block' : 'none'; if (!show) els.fishLeap.innerHTML = ''; }

  function triggerZoom(on) {
    if (els.zoomwrap) els.zoomwrap.classList.toggle('fh-zoomed', on);
    if (els.vignette) els.vignette.classList.toggle('active', on);
  }

  function setLineStart(x, y) { if (els.lineEl) { els.lineEl.setAttribute('x1', x); els.lineEl.setAttribute('y1', y); } }
  function setLineEnd(x, y) { if (els.lineEl) { els.lineEl.setAttribute('x2', x); els.lineEl.setAttribute('y2', y); } }

  // Bends the hand-held rod by `deg` (driven by cast power / reel pulses) and
  // keeps the line's rod-side anchor roughly in sync with the bend — cheap
  // trig only, no layout reads, safe to call every animation frame.
  function positionRod(deg) {
    if (els.rodEl) els.rodEl.style.transform = `rotate(${deg}deg)`;
    const rad = (deg || 0) * Math.PI / 180;
    setLineStart(ROD_TIP_BASE.x + Math.sin(rad) * 5, ROD_TIP_BASE.y - Math.cos(rad) * 3 + 3);
  }

  function jerkRod() {
    if (!els.rodEl) return;
    els.rodEl.classList.remove('fh-rod-pulse');
    void els.rodEl.offsetWidth;
    els.rodEl.classList.add('fh-rod-pulse');
  }

  function spawnSplashFx() {
    if (!els.fxLayer) return;
    const fx = document.createElement('div');
    fx.className = 'fh-splash-fx fh-splash-fx-fight';
    fx.textContent = '💦';
    els.fxLayer.appendChild(fx);
    setTimeout(() => fx.remove(), 500);
  }

  function spawnCastSplash() {
    if (!els.fxLayer) return;
    const fx = document.createElement('div');
    fx.className = 'fh-splash-fx';
    fx.textContent = '💦';
    els.fxLayer.appendChild(fx);
    const r1 = document.createElement('div');
    r1.className = 'fh-ripple fh-ripple-1';
    const r2 = document.createElement('div');
    r2.className = 'fh-ripple fh-ripple-2';
    els.fxLayer.appendChild(r1);
    els.fxLayer.appendChild(r2);
    setTimeout(() => fx.remove(), 500);
    setTimeout(() => { r1.remove(); r2.remove(); }, 1100);
  }

  // ===== Cast (power meter overlay + hand-held rod/line + fly animation) =====
  function beginCast() {
    showScreen('cast');
    showCastMeter(true);
    positionRod(0);
    castState = { pos: 0, dir: 1, speed: 65, lastTs: null, raf: null };
    castState.raf = requestAnimationFrame(castLoop);
  }

  function castLoop(ts) {
    if (!castState) return;
    if (castState.lastTs == null) castState.lastTs = ts;
    const dt = Math.min(0.05, (ts - castState.lastTs) / 1000);
    castState.lastTs = ts;
    castState.pos += castState.dir * castState.speed * dt;
    if (castState.pos > 100) { castState.pos = 100; castState.dir = -1; }
    if (castState.pos < 0) { castState.pos = 0; castState.dir = 1; }
    if (els.castMarker) els.castMarker.style.left = castState.pos + '%';
    positionRod((castState.pos - 50) / 6);
    castState.raf = requestAnimationFrame(castLoop);
  }

  function stopCast() {
    if (!castState) return;
    if (castState.raf) cancelAnimationFrame(castState.raf);
    const score = 1 - Math.abs(castState.pos - 50) / 50; // 0..1, 1 = perfect center
    castState = null;
    showCastMeter(false);
    playCastFly(() => {
      if (currentScreen !== 'cast') return;
      renderCastWaitingDom();
      const waitMs = 1500 + Math.random() * 2500;
      animateApproachingShadow(waitMs);
      setTimeout(() => {
        if (currentScreen !== 'cast') return;
        renderCastBiteDom();
        setTimeout(() => {
          if (currentScreen !== 'cast') return;
          enterReel(pickFishForCast(score));
        }, 550);
      }, waitMs);
    });
  }

  // Rod bends back and the line follows the bobber (JS-driven, per animation
  // frame) as it arcs from the rod tip out to the water; it lands with a
  // splash + expanding ripples at the fixed hook point.
  function playCastFly(cb) {
    els.flyingBobber.style.display = 'block';
    const dur = reducedMotion() ? 1 : 520;
    const from = ROD_TIP_BASE;
    const to = HOOK_POINT;
    const start = performance.now();
    function step(ts) {
      const t = Math.min(1, (ts - start) / dur);
      const ease = 1 - Math.pow(1 - t, 2);
      const x = from.x + (to.x - from.x) * ease;
      const lift = Math.sin(Math.PI * t) * -16;
      const y = from.y + (to.y - from.y) * ease + lift;
      els.flyingBobber.style.left = x + '%';
      els.flyingBobber.style.top = y + '%';
      setLineEnd(x, y);
      if (t < 1) { requestAnimationFrame(step); }
      else {
        els.flyingBobber.style.display = 'none';
        setLineEnd(to.x, to.y);
        spawnCastSplash();
        showBobber(true);
        cb();
      }
    }
    requestAnimationFrame(step);
  }

  function renderCastWaitingDom() {
    els.waitShadows.innerHTML = fishShadowHtml(3);
    els.waitShadows.style.display = 'block';
    els.approachShadow.style.display = 'block';
  }

  // Animate a shadow drifting toward the bobber over the wait duration to
  // build anticipation before the bite.
  function animateApproachingShadow(waitMs) {
    const shadow = els.approachShadow;
    if (!shadow) return;
    shadow.style.left = '-15%';
    shadow.style.top = '58%';
    shadow.style.opacity = '0.35';
    // Force layout so the transition below actually animates from the start.
    void shadow.offsetWidth;
    const dur = reducedMotion() ? 200 : Math.max(300, waitMs - 300);
    shadow.style.transition = `left ${dur}ms linear, opacity ${dur}ms linear`;
    requestAnimationFrame(() => {
      if (currentScreen !== 'cast') return;
      shadow.style.left = '46%';
      shadow.style.opacity = '0.9';
    });
  }

  function renderCastBiteDom() {
    els.waitShadows.style.display = 'none';
    els.approachShadow.style.display = 'none';
    showBobber(false);
    showBiteFlash(true);
    triggerZoom(true);
  }

  // Test hook: skip the timing bar + wait entirely and go straight to the
  // reel-in minigame (deterministic — no click timing / random wait needed).
  function skipToBite() {
    if (castState) { cancelAnimationFrame(castState.raf); castState = null; }
    showScreen('cast');
    showCastMeter(false);
    triggerZoom(true);
    enterReel(pickFishForCast(1));
  }

  function pickFishForCast(score) {
    if (forcedFishId) {
      const wanted = forcedFishId;
      forcedFishId = null;
      const f = FISH_SPECIES.find(x => x.id === wanted);
      if (f) return f;
    }
    const pool = FISH_SPECIES.filter(f => f.pond === save.pond);
    const source = pool.length ? pool : FISH_SPECIES;
    const weights = source.map(f => {
      const base = f.rarity === 1 ? 70 : f.rarity === 2 ? 25 : f.rarity === 3 ? 10 : 4;
      const bonus = f.rarity === 1 ? (1 - score) * 40 : (f.rarity === 3 || f.rarity === 4) ? score * 60 : score * 20;
      return base + bonus;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < source.length; i++) {
      r -= weights[i];
      if (r <= 0) return source[i];
    }
    return source[source.length - 1];
  }

  // ===== Reel-in tension fight (still zoomed in from the bite) =====
  function enterReel(fish) {
    GameEngine.setDeferLevelUp(true);
    showScreen('reel');
    showBiteFlash(false);
    showBobber(false);
    showFightVisuals(true);
    showTensionOverlay(true);
    const tuning = FIGHT_TUNING[fish.rarity] || FIGHT_TUNING[1];
    els.reelTarget.style.bottom = (50 - tuning.half) + '%';
    els.reelTarget.style.height = (tuning.half * 2) + '%';
    reelState = {
      fish, tuning, tension: 50, progress: 0, holding: false,
      time: 0, nextPulse: tuning.pulseEvery * (0.6 + Math.random() * 0.6),
      lastTs: null, raf: null,
    };
    reelState.raf = requestAnimationFrame(reelLoop);
  }

  function reelLoop(ts) {
    if (!reelState) return;
    if (reelState.lastTs == null) reelState.lastTs = ts;
    const dt = Math.min(0.05, (ts - reelState.lastTs) / 1000);
    reelState.lastTs = ts;
    reelState.time += dt;

    const t = reelState.tuning;

    // Baseline: holding tightens the line (tension rises), releasing eases
    // it (tension falls back toward slack).
    reelState.tension += (reelState.holding ? t.holdRate : -t.drainRate) * dt;

    // Fish pulls a pulse periodically — a sudden yank that loosens the
    // line hard, independent of whether the player is holding.
    reelState.nextPulse -= dt;
    if (reelState.nextPulse <= 0) {
      reelState.tension -= t.pulseStrength;
      reelState.nextPulse = t.pulseEvery * (0.7 + Math.random() * 0.6);
      jerkRod();
      spawnSplashFx();
    }

    reelState.tension = Math.max(0, Math.min(100, reelState.tension));

    // The rod stays gently bent toward the fish throughout the fight, with
    // pulse jerks layered on top via the fh-rod-pulse animation class.
    positionRod((reelState.tension - 50) / 8);

    if (reelState.tension <= 0) { resolveReelFail('loose'); return; }
    if (reelState.tension >= 100) { resolveReelFail('snap'); return; }

    const inZone = Math.abs(reelState.tension - 50) <= t.half;
    reelState.progress += (inZone ? t.fillRate : -t.drainOut) * dt;
    reelState.progress = Math.max(0, Math.min(100, reelState.progress));

    updateReelDom();

    if (reelState.progress >= 100) { reelSuccess(); return; }
    reelState.raf = requestAnimationFrame(reelLoop);
  }

  function updateReelDom() {
    if (!reelState || !els.reelMarker) return;
    els.reelMarker.style.bottom = reelState.tension + '%';
    els.reelProgressFill.style.height = reelState.progress + '%';
    if (els.reelGauge) {
      els.reelGauge.classList.toggle('fh-danger-low', reelState.tension < 12);
      els.reelGauge.classList.toggle('fh-danger-high', reelState.tension > 88);
    }
  }

  function reelSuccess() {
    if (!reelState) return;
    if (reelState.raf) cancelAnimationFrame(reelState.raf);
    const fish = reelState.fish;
    reelState = null;
    showTensionOverlay(false);
    showFightVisuals(false);
    positionRod(0);
    triggerZoom(false);
    playCatchLeap(fish, () => startQuiz(fish));
  }

  function resolveReelFail(reason) {
    if (!reelState) return;
    if (reelState.raf) cancelAnimationFrame(reelState.raf);
    const fish = reelState.fish;
    reelState = null;
    SoundManager.playWrong();
    showTensionOverlay(false);
    positionRod(0);
    triggerZoom(false);
    if (reason === 'snap') {
      playLineSnapFx(() => { showFightVisuals(false); doEscape(fish, reason); });
    } else {
      showFightVisuals(false);
      doEscape(fish, reason);
    }
  }

  // Catch moment: the fish leaps out of the water in an arc with water
  // droplets before the game hands off to the listening quiz. Skipped
  // (near-instant) under prefers-reduced-motion.
  function playCatchLeap(fish, cb) {
    if (reducedMotion()) { cb(); return; }
    els.fishLeap.innerHTML = fishLeapHtml(fish);
    els.fishLeap.style.display = 'block';
    els.fishLeap.classList.remove('fh-leap-play');
    void els.fishLeap.offsetWidth;
    els.fishLeap.classList.add('fh-leap-play');
    setTimeout(() => {
      showFishLeap(false);
      els.fishLeap.classList.remove('fh-leap-play');
      cb();
    }, 650);
  }

  function fishLeapHtml(fish) {
    let html = `<span class="fh-leap-fish">${fish.emoji}</span>`;
    for (let i = 0; i < 5; i++) {
      const dx = (Math.random() * 46 - 23).toFixed(1);
      const delay = (Math.random() * 0.15).toFixed(2);
      html += `<span class="fh-leap-drop" style="--dx:${dx}px; animation-delay:${delay}s;">💧</span>`;
    }
    return html;
  }

  // Line-snap failure: the line whips back and the fish's shadow darts away
  // before the escape message shows.
  function playLineSnapFx(cb) {
    if (reducedMotion()) { cb(); return; }
    els.lineSvg.classList.add('fh-line-snap');
    els.fightFish.classList.add('fh-shadow-dart');
    setTimeout(() => {
      els.lineSvg.classList.remove('fh-line-snap');
      els.fightFish.classList.remove('fh-shadow-dart');
      cb();
    }, 420);
  }

  // Test hook: instantly complete the reel-in regardless of gauge state.
  function forceReelSuccess() {
    if (!reelState) return false;
    reelState.progress = 100;
    reelSuccess();
    return true;
  }

  // Test hook: force a line-snap failure regardless of gauge state.
  function forceReelSnap() {
    if (!reelState) return false;
    reelState.tension = 100;
    resolveReelFail('snap');
    return true;
  }

  // Test hook: abort a pending cast cleanly (used by tests to measure the
  // cast-meter overlay without following through the whole random-wait chain).
  function cancelCast() {
    if (!castState) return false;
    cancelAnimationFrame(castState.raf);
    castState = null;
    showCastMeter(false);
    positionRod(0);
    showScreen('pond');
    return true;
  }

  // ===== Listening quiz =====
  function startQuiz(fish) {
    showScreen('quiz');
    els.quizEmoji.textContent = fish.emoji;
    els.quizEmoji.className = 'fh-quiz-fish-emoji' + (isLegendary(fish) ? ' fh-legendary-emoji' : fish.rarity >= 2 ? ' fh-rare-emoji' : '');
    els.quizFeedback.textContent = '';
    els.quizFeedback.className = 'fh-quiz-feedback';

    const supported = TTSManager.isSupported();
    if (supported) {
      els.quizWordFallback.style.display = 'none';
      els.quizReplayBtn.style.display = 'inline-flex';
      TTSManager.speak(sayWord(fish), 'en-US', 0.85);
    } else {
      // No-TTS fallback (mirrors js/listening.js's audio-optional design):
      // show the word text so the game stays playable without speech.
      els.quizWordFallback.style.display = 'block';
      els.quizWordFallback.textContent = fish.word;
      els.quizReplayBtn.style.display = 'none';
    }

    if (fish.rarity <= 2) renderZhQuiz(fish); else renderSpellQuiz(fish);
  }

  function renderZhQuiz(fish) {
    const others = shuffle(FISH_SPECIES.filter(f => f.id !== fish.id));
    const options = [fish];
    for (const f of others) {
      if (options.length >= 4) break;
      if (!options.some(o => o.zh === f.zh)) options.push(f);
    }
    const finalOptions = shuffle(options);

    els.quizBody.innerHTML = `<div class="fh-quiz-options" id="fh-quiz-options"></div>`;
    const wrap = document.getElementById('fh-quiz-options');

    activeQuiz = { type: 'options', fish, options: [] };
    finalOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-quiz-option';
      btn.textContent = opt.zh;
      const isCorrect = opt.id === fish.id;
      btn.addEventListener('click', () => {
        if (!activeQuiz) return;
        activeQuiz.options.forEach(o => { o.btn.disabled = true; });
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) activeQuiz.options.forEach(o => { if (o.isCorrect) o.btn.classList.add('reveal'); });
        setTimeout(() => handleQuizAnswer(isCorrect, fish), 550);
      });
      wrap.appendChild(btn);
      activeQuiz.options.push({ btn, isCorrect });
    });
  }

  function renderSpellQuiz(fish) {
    const word = fish.word;
    const letters = word.split('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !letters.includes(c));
    const decoys = shuffle(alphabet).slice(0, 4);
    const tilesData = shuffle([
      ...letters.map(c => ({ char: c })),
      ...decoys.map(c => ({ char: c })),
    ]);

    els.quizBody.innerHTML = `
      <div class="fh-spell-slots" id="fh-spell-slots"></div>
      <div class="fh-spell-bank" id="fh-spell-bank"></div>
      <button type="button" class="fh-btn-secondary fh-spell-backspace" id="fh-spell-backspace">⌫ 刪除</button>
    `;
    const bank = document.getElementById('fh-spell-bank');

    activeQuiz = { type: 'spell', fish, word, tiles: [], typed: [] };
    tilesData.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-spell-tile';
      btn.textContent = t.char;
      btn.addEventListener('click', () => handleSpellTileClick(i));
      bank.appendChild(btn);
      activeQuiz.tiles.push({ char: t.char, btn, used: false });
    });
    document.getElementById('fh-spell-backspace').addEventListener('click', handleSpellBackspace);
    renderSpellSlots();
  }

  function renderSpellSlots() {
    const wrap = document.getElementById('fh-spell-slots');
    if (!wrap || !activeQuiz) return;
    wrap.innerHTML = '';
    for (let i = 0; i < activeQuiz.word.length; i++) {
      const s = document.createElement('span');
      const entry = activeQuiz.typed[i];
      s.className = 'fh-spell-slot' + (entry ? ' filled' : '');
      s.textContent = entry ? entry.char : '';
      wrap.appendChild(s);
    }
  }

  function handleSpellTileClick(i) {
    if (!activeQuiz || activeQuiz.type !== 'spell') return;
    const tile = activeQuiz.tiles[i];
    if (!tile || tile.used) return;
    tile.used = true;
    tile.btn.disabled = true;
    tile.btn.classList.add('used');
    activeQuiz.typed.push({ char: tile.char, tileIndex: i });
    renderSpellSlots();
    if (activeQuiz.typed.length === activeQuiz.word.length) {
      const typedWord = activeQuiz.typed.map(t => t.char).join('');
      const isCorrect = typedWord === activeQuiz.word;
      const fish = activeQuiz.fish;
      activeQuiz.tiles.forEach(t => { t.btn.disabled = true; });
      const bs = document.getElementById('fh-spell-backspace');
      if (bs) bs.disabled = true;
      setTimeout(() => handleQuizAnswer(isCorrect, fish), 400);
    }
  }

  function handleSpellBackspace() {
    if (!activeQuiz || activeQuiz.type !== 'spell') return;
    const last = activeQuiz.typed.pop();
    if (!last) return;
    const tile = activeQuiz.tiles[last.tileIndex];
    tile.used = false;
    tile.btn.disabled = false;
    tile.btn.classList.remove('used');
    renderSpellSlots();
  }

  // Test hook: click zh option / type the letter bank deterministically.
  function testAnswer(correct) {
    if (!activeQuiz) return false;
    if (activeQuiz.type === 'options') {
      const entry = activeQuiz.options.find(o => o.isCorrect === !!correct);
      if (!entry) return false;
      entry.btn.click();
      return true;
    }
    if (activeQuiz.type === 'spell') {
      const word = activeQuiz.word;
      let sequence = word;
      if (!correct) {
        const rev = [...word].reverse().join('');
        sequence = rev !== word ? rev : (word.slice(1) + word[0]);
      }
      for (const ch of sequence.split('')) {
        const tile = activeQuiz.tiles.find(t => !t.used && t.char === ch);
        if (!tile) return false;
        tile.btn.click();
      }
      return true;
    }
    return false;
  }

  // ===== Resolve quiz =====
  function handleQuizAnswer(isCorrect, fish) {
    activeQuiz = null;
    if (isCorrect) { SoundManager.playCorrect(); doCatch(fish); }
    else { SoundManager.playWrong(); doEscape(fish, 'quiz'); }
  }

  function doCatch(fish) {
    const isNew = !save.caught[fish.id];
    save.caught[fish.id] = (save.caught[fish.id] || 0) + 1;
    persist();

    GameEngine.recordWord(fish.word);
    GameEngine.recordFishCatch();
    // Distinct/legendary dex counters only advance on a species' FIRST catch,
    // so they always equal the count of distinct (legendary) species caught —
    // never on repeat catches of an already-caught species.
    if (isNew) {
      GameEngine.recordFishDistinct();
      if (isLegendary(fish)) GameEngine.recordFishLegendary();
    }

    const reward = RARITY_REWARD[fish.rarity] || RARITY_REWARD[1];
    let xp = reward.xp, gems = reward.gems;
    if (GameEngine.hasBuff('double_xp')) {
      xp *= 2;
      GameEngine.consumeBuff('double_xp');
      GameEngine.showToast('📜 雙倍經驗卷軸生效！', 'achievement');
    }
    if (GameEngine.hasBuff('gem_bonus')) {
      gems += 2;
      GameEngine.consumeBuff('gem_bonus');
      GameEngine.showToast('💠 寶石探測器生效！+2 額外寶石', 'gem');
    }
    GameEngine.addXP(xp);
    GameEngine.addGems(gems);

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    checkPondCompletion(fish.pond);

    const legendary = isLegendary(fish);
    if (legendary) {
      SoundManager.playAchievement();
      SoundManager.playQuestComplete();
      playLegendaryShine();
      TTSManager.speak(`Wow! Legendary catch! ${sayWord(fish)}`, 'en-US', 0.9);
    } else {
      SoundManager.playQuestComplete();
      TTSManager.speak(sayWord(fish), 'en-US', 0.85);
    }

    showScreen('result');
    const rareClass = legendary ? 'fh-catch-card fh-legendary-card' : fish.rarity >= 2 ? 'fh-catch-card fh-rare-card' : 'fh-catch-card';
    els.resultBody.innerHTML = `
      <div class="fh-splash">💦</div>
      <div class="${rareClass}">
        ${fish.rarity >= 2 ? '<div class="fh-sparkle-burst">✨✨✨</div>' : ''}
        <div class="fh-catch-emoji">${fish.emoji}</div>
        <div class="fh-catch-word">${fish.word}</div>
        <div class="fh-catch-zh">${fish.zh}</div>
        ${legendary ? '<div class="fh-legendary-badge">🌟 傳說級魚種！</div>' : ''}
        <div class="fh-catch-rewards">${isNew ? '🆕 新魚種加入圖鑑！' : '再次釣起！'} +${xp} XP・+${gems} 💎</div>
        <div class="fh-catch-count">已收集 ${save.caught[fish.id]} 次</div>
      </div>
      <div class="fh-result-btns">
        <button type="button" class="fh-btn-primary" id="fh-result-cast-again">🎣 再釣一次</button>
        <button type="button" class="fh-btn-secondary" id="fh-result-back">🏠 返回池塘</button>
      </div>`;
    bindResultButtons();
  }

  function playLegendaryShine() {
    if (!els.legendaryShine) return;
    els.legendaryShine.classList.remove('active');
    void els.legendaryShine.offsetWidth;
    els.legendaryShine.classList.add('active');
    setTimeout(() => els.legendaryShine.classList.remove('active'), 1400);
  }

  const ESCAPE_MSG = {
    quiz: (fish) => `💨 ${fish.emoji} ${fish.word}（${fish.zh}）溜走了……下次再試試看！`,
    loose: (fish) => `🌊 魚線太鬆了，${fish.emoji} ${fish.word}（${fish.zh}）掙脫溜走了！`,
    snap: (fish) => `💥 魚線繃太緊斷掉了！${fish.emoji} ${fish.word}（${fish.zh}）跑掉了！`,
  };

  function doEscape(fish, reason) {
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();

    showScreen('result');
    const msg = (ESCAPE_MSG[reason] || ESCAPE_MSG.quiz)(fish);
    els.resultBody.innerHTML = `
      <div class="fh-escape-msg">${msg}</div>
      <div class="fh-result-btns">
        <button type="button" class="fh-btn-primary" id="fh-result-cast-again">🎣 再釣一次</button>
        <button type="button" class="fh-btn-secondary" id="fh-result-back">🏠 返回池塘</button>
      </div>`;
    bindResultButtons();
    setTimeout(() => TTSManager.speak(sayWord(fish), 'en-US', 0.8), 400);
  }

  function bindResultButtons() {
    const again = document.getElementById('fh-result-cast-again');
    const back = document.getElementById('fh-result-back');
    if (again) again.addEventListener('click', () => { renderPondScreen(); showScreen('pond'); beginCast(); });
    if (back) back.addEventListener('click', () => { renderPondScreen(); showScreen('pond'); });
  }

  function checkPondCompletion(pondId) {
    if (save.pondsCompleted.includes(pondId)) return;
    const speciesInPond = FISH_SPECIES.filter(f => f.pond === pondId);
    const allCaught = speciesInPond.length > 0 && speciesInPond.every(f => (save.caught[f.id] || 0) >= 1);
    if (!allCaught) return;
    save.pondsCompleted.push(pondId);
    persist();
    GameEngine.addGems(20);
    const pond = PONDS.find(p => p.id === pondId);
    GameEngine.showToast(`🎉 ${pond ? pond.name : ''} 全部收服！+20💎`, 'achievement');
  }

  // ===== Aquarium overlay =====
  function openAquarium() {
    aquariumOpen = true;
    aquariumPond = save.pond;
    els.aqOverlay.classList.add('active');
    renderAquarium();
  }

  function closeAquarium() {
    aquariumOpen = false;
    els.aqOverlay.classList.remove('active');
  }

  function renderAquarium() {
    els.aqCounter.textContent = `${distinctCaughtCount()}/${FISH_SPECIES.length}`;

    els.aqTabs.innerHTML = '';
    PONDS.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-aq-tab' + (p.id === aquariumPond ? ' active' : '');
      btn.textContent = `${p.icon} ${p.name}`;
      btn.addEventListener('click', () => { aquariumPond = p.id; renderAquarium(); });
      els.aqTabs.appendChild(btn);
    });

    const speciesInPond = FISH_SPECIES.filter(f => f.pond === aquariumPond);
    const caughtInPond = speciesInPond.filter(f => save.caught[f.id]).length;
    const legendaryFish = speciesInPond.find(f => isLegendary(f));
    const legendaryCaught = legendaryFish && save.caught[legendaryFish.id];

    els.aqPondStats.innerHTML = `
      <span class="fh-aq-pond-count">🐟 本池收集 ${caughtInPond}/${speciesInPond.length}</span>
      ${legendaryFish ? `<span class="fh-aq-legend-badge${legendaryCaught ? ' caught' : ''}">${legendaryCaught ? '🌟 傳說已收服' : '🔒 傳說未收服'}</span>` : ''}
    `;

    els.aqTank.className = 'fh-aq-tank fh-aq-tank-' + ambienceFor(aquariumPond);
    els.aqTank.innerHTML = ambienceParticleHtml(ambienceFor(aquariumPond), 6);
    speciesInPond.filter(f => save.caught[f.id]).forEach(f => {
      const el = document.createElement('div');
      el.className = 'fh-swim-fish ' + (Math.random() < 0.5 ? 'fh-swim-ltr' : 'fh-swim-rtl') + (isLegendary(f) ? ' fh-swim-legendary' : '');
      el.textContent = f.emoji;
      el.style.top = (8 + Math.random() * 72) + '%';
      el.style.animationDuration = (6 + Math.random() * 8).toFixed(2) + 's';
      el.style.animationDelay = '-' + (Math.random() * 6).toFixed(2) + 's';
      el.addEventListener('click', () => showAqDetail(f));
      els.aqTank.appendChild(el);
    });

    els.aqDexStrip.innerHTML = '';
    speciesInPond.forEach(f => {
      const count = save.caught[f.id];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'fh-dex-cell' + (count ? '' : ' unknown') + (isLegendary(f) ? ' fh-dex-legendary' : '');
      if (count) {
        cell.innerHTML = `<span class="fh-dex-emoji">${f.emoji}</span><span class="fh-dex-word">${f.word}</span><span class="fh-dex-count">×${count}</span>${isLegendary(f) ? '<span class="fh-dex-legend-tag">🌟</span>' : ''}`;
        cell.addEventListener('click', () => showAqDetail(f));
      } else {
        cell.innerHTML = `<span class="fh-dex-emoji">${isLegendary(f) ? '🌟' : '❓'}</span><span class="fh-dex-word">???</span>`;
      }
      els.aqDexStrip.appendChild(cell);
    });

    els.aqDetail.style.display = 'none';
  }

  function showAqDetail(f) {
    TTSManager.speak(sayWord(f), 'en-US', 0.85);
    els.aqDetail.style.display = 'flex';
    els.aqDetail.innerHTML = `<span class="fh-dex-emoji">${f.emoji}</span><b>${f.word}</b> — ${f.zh}（已捕獲 ${save.caught[f.id] || 0} 次）${isLegendary(f) ? ' 🌟傳說級' : ''}`;
  }

  return { init };
})();
