/* ===== Rhythm Star Module (英語節奏星) =====
   A taiko-style rhythm game where the beats are SYLLABLES and the big beats
   are STRESSED syllables. Taiwanese kids reliably mis-time English words —
   giving every letter its own beat — so "ba-NA-na" as short-LONG-short is the
   one thing this game drills, and nothing else in the site teaches it.

   Difficulty is a real teaching ramp, not just speed:
     easy    one lane  — just tap the syllable count (syllables + stress shown)
     medium  two lanes — stressed goes up, unstressed goes down (word shown)
     hard    two lanes — blind: only the emoji and Chinese, listen to the TTS

   Timing runs off one performance.now() clock shared by the renderer and the
   input handler, so what you see and what you hit can never disagree.

   Save: localStorage `english_savior_rhythm`
     { best: { songId: { score, acc, rank, fc } }, diff }
*/

const RhythmGame = (() => {
  const SAVE_KEY = 'english_savior_rhythm';

  const W = 900, H = 320;
  const HIT_X = 150;                 // the judgement line
  const LEAD_MS = 2200;              // how long a note is on screen before its beat
  const LANE_HI = 112, LANE_LO = 216; // y of the stressed / unstressed lanes
  const PERFECT_MS = 95, GOOD_MS = 195;
  const EMOJI_FONT = '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji","Twemoji Mozilla",sans-serif';

  const DIFFS = {
    easy:   { label: '簡單', lanes: 1, rate: 0.85, xp: 10, gem: 1, bonus: 10,
              desc: '單軌：敲出音節數（會標出音節與重音）' },
    medium: { label: '中等', lanes: 2, rate: 1.0,  xp: 14, gem: 1, bonus: 15,
              desc: '雙軌：重音敲上排、輕音敲下排（顯示單字）' },
    hard:   { label: '困難', lanes: 2, rate: 1.18, xp: 18, gem: 2, bonus: 20,
              desc: '雙軌盲奏：只看圖和中文，用聽的判斷' },
  };

  let canvas = null, ctx = null, rafId = null;
  let els = {};
  let audioCtx = null;

  let save = { best: {}, diff: 'easy' };
  let difficulty = 'easy';

  // ---- current run ----
  let song = null, songIndex = -1;
  let notes = [];            // { t, lane, wordIdx, sylIdx, judged, verdict }
  let wordSpans = [];        // { word, from, to, spoken, cleared }
  let startTime = 0;         // performance.now() at song start
  let playing = false;
  let stats = null;          // { perfect, good, miss, combo, maxCombo, score }
  let popups = [];           // floating PERFECT/GOOD/MISS text
  let flash = { hi: 0, lo: 0 };
  let lastBeat = -1;

  /* ================= save ================= */

  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && typeof d === 'object') {
        save = {
          best: d.best && typeof d.best === 'object' ? d.best : {},
          diff: DIFFS[d.diff] ? d.diff : 'easy',
        };
      }
    } catch { /* first run */ }
    difficulty = save.diff;
  }

  function persist() {
    save.diff = difficulty;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* quota */ }
  }

  function clearedCount() { return Object.keys(save.best).length; }
  function isUnlocked(i) { return i === 0 || !!save.best[RHYTHM_SONGS[i - 1].id]; }

  /* ================= chart building ================= */

  // One note per syllable, one beat apart, with a one-beat rest between words.
  function buildChart(s) {
    const beat = (60000 / s.bpm) / DIFFS[difficulty].rate;
    const lanes = DIFFS[difficulty].lanes;
    notes = [];
    wordSpans = [];
    let t = 2600;   // lead-in so the first note isn't already on screen at t=0
    s.words.forEach((word, wi) => {
      const from = notes.length;
      word.syl.forEach((_, si) => {
        notes.push({
          t, wordIdx: wi, sylIdx: si,
          lane: lanes === 1 ? 0 : (si === word.stress ? 1 : 0),   // 1 = upper/stressed
          stressed: si === word.stress,
          judged: false, verdict: null,
        });
        t += beat;
      });
      wordSpans.push({ word, from, to: notes.length - 1, startT: notes[from].t, spoken: false, cleared: false });
      t += beat;   // one beat of rest between words
    });
    return beat;
  }

  /* ================= audio ================= */

  function tick(freq, vol) {
    if (typeof SoundManager !== 'undefined' && !SoundManager.isEnabled()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch { /* audio unavailable — the game is still fully playable */ }
  }

  /* ================= canvas ================= */

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) {
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min((rect.width * dpr) / W, 3);
    const bw = Math.round(W * scale), bh = Math.round(H * scale);
    if (canvas.width === bw && canvas.height === bh) return;
    canvas.width = bw; canvas.height = bh;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function drawEmoji(txt, x, y, size, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function laneY(lane) {
    if (DIFFS[difficulty].lanes === 1) return (LANE_HI + LANE_LO) / 2;
    return lane === 1 ? LANE_HI : LANE_LO;
  }

  /* ================= gameplay ================= */

  function startSong(i) {
    songIndex = i;
    song = RHYTHM_SONGS[i];
    buildChart(song);
    stats = { perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, wrongLane: 0 };
    popups = [];
    lastBeat = -1;
    playing = true;
    startTime = performance.now();
    GameEngine.setDeferLevelUp(true);
    els.start.style.display = 'none';
    els.songs.classList.remove('open');
    els.done.classList.remove('open');
    renderHUD();
    ensureLoop();
  }

  function now() { return performance.now() - startTime; }

  // The note the player is most plausibly aiming at: the earliest unjudged one
  // still inside the GOOD window (or already past the line but not yet missed).
  function nearestNote() {
    const t = now();
    let best = null, bestAbs = Infinity;
    for (const n of notes) {
      if (n.judged) continue;
      const d = Math.abs(n.t - t);
      if (d < bestAbs) { bestAbs = d; best = n; }
      if (n.t - t > GOOD_MS) break;    // notes are in time order
    }
    return bestAbs <= GOOD_MS ? best : null;
  }

  function hit(lane) {
    if (!playing) return;
    flash[lane === 1 ? 'hi' : 'lo'] = 1;
    const n = nearestNote();
    if (!n) { tick(180, 0.05); return; }

    const lanes = DIFFS[difficulty].lanes;
    if (lanes === 2 && n.lane !== lane) {
      // Right timing, wrong stress — the mistake this game exists to correct
      judge(n, 'lane');
      return;
    }
    const d = Math.abs(n.t - now());
    judge(n, d <= PERFECT_MS ? 'perfect' : 'good');
  }

  function judge(n, verdict) {
    n.judged = true;
    n.verdict = verdict;
    const y = laneY(n.lane);
    if (verdict === 'perfect') {
      stats.perfect++; stats.score += 100; stats.combo++;
      tick(n.stressed ? 880 : 660, 0.14);
      popups.push({ text: 'PERFECT', y, life: 0.7, color: '#ffd166' });
    } else if (verdict === 'good') {
      stats.good++; stats.score += 60; stats.combo++;
      tick(n.stressed ? 740 : 560, 0.11);
      popups.push({ text: 'GOOD', y, life: 0.7, color: '#7fd4ff' });
    } else {
      if (verdict === 'lane') { stats.wrongLane++; popups.push({ text: '重音錯了', y, life: 0.9, color: '#ff8fa3' }); }
      else popups.push({ text: 'MISS', y, life: 0.7, color: '#ff6b81' });
      stats.miss++; stats.combo = 0;
      tick(150, 0.07);
    }
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);

    // A word counts as learned once every one of its syllables landed
    const span = wordSpans[n.wordIdx];
    if (!span.cleared) {
      const all = notes.slice(span.from, span.to + 1);
      if (all.every(x => x.judged)) {
        span.cleared = true;
        if (all.every(x => x.verdict === 'perfect' || x.verdict === 'good')) {
          const cfg = DIFFS[difficulty];
          GameEngine.addXP(cfg.xp);
          GameEngine.addGems(cfg.gem);
        }
      }
    }
    renderHUD();
  }

  function finishSong() {
    playing = false;
    const total = notes.length;
    const acc = total ? Math.round(((stats.perfect + stats.good * 0.6) / total) * 100) : 0;
    const fc = stats.miss === 0;
    const rank = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C';
    const cfg = DIFFS[difficulty];

    const prev = save.best[song.id];
    const first = !prev;
    if (first) GameEngine.recordRhythmSong();
    if (fc) GameEngine.recordRhythmFC();

    let gems = 0;
    if (first) { gems += cfg.bonus; }
    if (fc) gems += 5;
    if (gems) GameEngine.addGems(gems);
    GameEngine.addXP(first ? 30 : 12);

    if (!prev || stats.score > prev.score) {
      save.best[song.id] = { score: stats.score, acc, rank, fc: fc || (prev && prev.fc) || false };
    } else if (fc && prev && !prev.fc) {
      save.best[song.id].fc = true;
    }
    persist();

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    SoundManager.playQuestComplete();
    showDone({ acc, rank, fc, gems, first });
  }

  /* ================= loop ================= */

  function step(dt) {
    const t = now();

    // auto-MISS anything that sailed past the window
    notes.forEach(n => {
      if (!n.judged && t - n.t > GOOD_MS) judge(n, 'miss');
    });

    // metronome + speak each word as it comes into view
    const beat = (60000 / song.bpm) / DIFFS[difficulty].rate;
    const b = Math.floor(t / beat);
    if (b !== lastBeat && t > 0) { lastBeat = b; tick(300, 0.03); }

    wordSpans.forEach(sp => {
      if (!sp.spoken && sp.startT - t <= LEAD_MS) {
        sp.spoken = true;
        if (typeof TTSManager !== 'undefined') TTSManager.speak(sp.word.w);
      }
    });

    popups.forEach(p => { p.life -= dt; });
    popups = popups.filter(p => p.life > 0);
    flash.hi = Math.max(0, flash.hi - dt * 4);
    flash.lo = Math.max(0, flash.lo - dt * 4);

    if (notes.every(n => n.judged) && t > notes[notes.length - 1].t + 400) finishSong();
  }

  function draw() {
    const t = now();
    const lanes = DIFFS[difficulty].lanes;
    const pxPerMs = (W - HIT_X) / LEAD_MS;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1236');
    g.addColorStop(1, '#3a1f5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // lanes
    const rows = lanes === 1 ? [{ y: laneY(0), lane: 0 }]
                             : [{ y: LANE_HI, lane: 1 }, { y: LANE_LO, lane: 0 }];
    rows.forEach(r => {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      roundRect(0, r.y - 40, W, 80, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, r.y + 40); ctx.lineTo(W, r.y + 40); ctx.stroke();
    });

    // hit line + pads
    rows.forEach(r => {
      const f = r.lane === 1 ? flash.hi : flash.lo;
      ctx.save();
      ctx.strokeStyle = r.lane === 1 ? '#ff9db1' : '#8fd4ff';
      ctx.lineWidth = 3 + f * 4;
      ctx.globalAlpha = 0.6 + f * 0.4;
      ctx.beginPath();
      ctx.arc(HIT_X, r.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      if (lanes === 2) ctx.fillText(r.lane === 1 ? '重音 ↑' : '輕音 ↓', HIT_X, r.y + 52);
    });

    // notes
    notes.forEach(n => {
      if (n.judged && n.verdict !== 'miss' && n.verdict !== 'lane') return;
      const x = HIT_X + (n.t - t) * pxPerMs;
      if (x < -60 || x > W + 60) return;
      const y = laneY(n.lane);
      const r = n.stressed ? 26 : 17;
      ctx.save();
      if (n.judged) ctx.globalAlpha = 0.25;
      ctx.fillStyle = n.stressed ? '#ff6b81' : '#4aa8e0';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // the syllable text rides on the note (hidden in blind mode)
      if (difficulty === 'easy') {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${n.stressed ? 15 : 12}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(wordSpans[n.wordIdx].word.syl[n.sylIdx], x, y);
      }
      ctx.restore();
    });

    // the word being sung right now
    const cur = wordSpans.find(sp => !sp.cleared) || wordSpans[wordSpans.length - 1];
    if (cur) {
      drawEmoji(cur.word.e, 62, 42, 34);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      const label = difficulty === 'hard' ? '？？？'
        : difficulty === 'medium' ? cur.word.w
        : cur.word.syl.map((s, i) => (i === cur.word.stress ? s.toUpperCase() : s)).join('-');
      ctx.fillText(label, 92, 36);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(cur.word.zh, 92, 56);
    }

    // combo
    if (stats.combo >= 3) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText(`${stats.combo}`, W - 22, 46);
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('COMBO', W - 22, 64);
    }

    popups.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, HIT_X, p.y - 44 - (0.7 - p.life) * 22);
      ctx.restore();
    });

    // 3-2-1 during the lead-in, so nobody is dropped straight into a beat
    const firstT = notes.length ? notes[0].t : 0;
    if (t < firstT) {
      const left = Math.ceil((firstT - t) / 700);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 74px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(left <= 3 ? String(left) : '準備', W / 2, H / 2);
      ctx.restore();
    }
  }

  let lastFrame = 0;
  function loop(ts) {
    const zone = document.getElementById('zone-rhythm');
    if (zone && !zone.classList.contains('active')) { stopLoop(); return; }
    const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0);
    lastFrame = ts;
    if (playing) step(dt);
    if (song) draw();
    rafId = requestAnimationFrame(loop);
  }

  function ensureLoop() {
    if (rafId || !song) return;
    lastFrame = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ================= DOM ================= */

  function buildShell() {
    const root = document.getElementById('rh-root');
    if (!root) return false;
    root.innerHTML = `
      <div class="rh-stage">
        <canvas id="rh-canvas" width="${W}" height="${H}"></canvas>
        <div class="rh-hud">
          <span class="rh-chip" id="rh-hud-song">—</span>
          <span class="rh-chip" id="rh-hud-score"></span>
        </div>
      </div>

      <div class="rh-bar">
        <div class="rh-keys" id="rh-keys"></div>
        <div class="rh-actions">
          <button class="rh-btn rh-btn-main" id="rh-list-btn">🎼 選歌</button>
          <button class="rh-btn" id="rh-retry-btn" title="重新開始這首">🔄</button>
        </div>
      </div>

      <div class="rh-screen" id="rh-start">
        <h3>🎵 英語節奏星</h3>
        <p>英文單字有<strong>節拍</strong>！一個<strong>音節</strong>就是一拍，其中一個音節唸得比較<strong>重、長、大聲</strong>——那就是重音。</p>
        <p>ba-<strong>NA</strong>-na 是「小-<strong>大</strong>-小」，不是「B-A-N-A-N-A」六拍喔！</p>
        <p>跟著節奏敲下去，抓到英文真正的節奏感。</p>
        <div class="rh-diff" id="rh-diff"></div>
        <button class="rh-btn rh-btn-main rh-btn-big" id="rh-start-btn">🎼 打開選歌清單</button>
      </div>

      <div class="rh-overlay" id="rh-songs">
        <div class="rh-panel">
          <div class="rh-panel-head">
            <h3>🎼 選歌</h3>
            <span class="rh-panel-sub" id="rh-songs-sub"></span>
            <button class="rh-close" data-rh-close="rh-songs">✕</button>
          </div>
          <div class="rh-diff" id="rh-diff2"></div>
          <div class="rh-song-grid" id="rh-song-grid"></div>
        </div>
      </div>

      <div class="rh-overlay" id="rh-done">
        <div class="rh-panel rh-panel-narrow">
          <div class="rh-done-body" id="rh-done-body"></div>
        </div>
      </div>
    `;

    els = {
      root,
      hudSong: root.querySelector('#rh-hud-song'),
      hudScore: root.querySelector('#rh-hud-score'),
      keys: root.querySelector('#rh-keys'),
      start: root.querySelector('#rh-start'),
      diffRow: root.querySelector('#rh-diff'),
      diffRow2: root.querySelector('#rh-diff2'),
      songs: root.querySelector('#rh-songs'),
      songsSub: root.querySelector('#rh-songs-sub'),
      songGrid: root.querySelector('#rh-song-grid'),
      done: root.querySelector('#rh-done'),
      doneBody: root.querySelector('#rh-done-body'),
    };

    canvas = root.querySelector('#rh-canvas');
    ctx = canvas.getContext('2d');
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    // Tap the canvas: upper half = stressed, lower half = unstressed
    const tap = e => {
      if (!playing) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const py = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) / r.height * H;
      hit(DIFFS[difficulty].lanes === 1 ? 0 : (py < (LANE_HI + LANE_LO) / 2 ? 1 : 0));
    };
    canvas.addEventListener('mousedown', tap);
    canvas.addEventListener('touchstart', tap, { passive: false });

    document.addEventListener('keydown', e => {
      const zone = document.getElementById('zone-rhythm');
      if (!playing || !zone || !zone.classList.contains('active')) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'j' || k === 'k') { e.preventDefault(); hit(1); }
      else if (k === 'arrowdown' || k === 'f' || k === 'd' || k === ' ') { e.preventDefault(); hit(DIFFS[difficulty].lanes === 1 ? 0 : 0); }
    });

    root.querySelectorAll('[data-rh-close]').forEach(b => {
      b.addEventListener('click', () => root.querySelector('#' + b.dataset.rhClose).classList.remove('open'));
    });
    root.querySelectorAll('.rh-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    });
    root.querySelector('#rh-start-btn').addEventListener('click', openSongs);
    root.querySelector('#rh-list-btn').addEventListener('click', openSongs);
    root.querySelector('#rh-retry-btn').addEventListener('click', () => { if (song) startSong(songIndex); });
    return true;
  }

  function renderKeys() {
    const lanes = DIFFS[difficulty].lanes;
    els.keys.innerHTML = lanes === 1
      ? '<span class="rh-key">空白鍵 / ↓ / 點畫面</span><span class="rh-key-note">每個音節敲一下</span>'
      : '<span class="rh-key up">↑ 或 J　點畫面上半</span><span class="rh-key-note">重音</span>' +
        '<span class="rh-key">↓ 或 F　點畫面下半</span><span class="rh-key-note">輕音</span>';
  }

  function renderHUD() {
    if (!song) {
      els.hudSong.textContent = `🎵 ${clearedCount()} / ${RHYTHM_SONGS.length} 首`;
      els.hudScore.textContent = '';
      return;
    }
    els.hudSong.textContent = `${song.e} ${song.name}　${DIFFS[difficulty].label}`;
    els.hudScore.textContent = `分數 ${stats.score}　最高連擊 ${stats.maxCombo}`;
  }

  function renderDiffRow(container) {
    if (!container) return;
    container.innerHTML = '';
    Object.entries(DIFFS).forEach(([key, cfg]) => {
      const b = document.createElement('button');
      b.className = 'rh-diff-btn' + (key === difficulty ? ' active' : '');
      b.innerHTML = `<strong>${cfg.label}</strong><span>${cfg.desc}</span>`;
      b.addEventListener('click', () => {
        difficulty = key;
        persist();
        renderDiffRow(els.diffRow);
        renderDiffRow(els.diffRow2);
        renderKeys();
      });
      container.appendChild(b);
    });
  }

  function openSongs() {
    els.songsSub.textContent = `已完成 ${clearedCount()} / ${RHYTHM_SONGS.length} 首`;
    renderDiffRow(els.diffRow2);
    els.songGrid.innerHTML = '';
    RHYTHM_SONGS.forEach((s, i) => {
      const open = isUnlocked(i);
      const best = save.best[s.id];
      const btn = document.createElement('button');
      btn.className = 'rh-song' + (open ? '' : ' locked');
      btn.disabled = !open;
      btn.innerHTML = open
        ? `<span class="rh-song-e">${s.e}</span>
           <span class="rh-song-name">${i + 1}. ${s.name}</span>
           <span class="rh-song-meta">${s.bpm} BPM・${s.words.length} 字</span>
           <span class="rh-song-best">${best ? `${best.rank}　${best.acc}%${best.fc ? '　💯' : ''}` : '未挑戰'}</span>`
        : `<span class="rh-song-e">🔒</span><span class="rh-song-name">???</span>
           <span class="rh-song-meta">先完成上一首</span><span class="rh-song-best"></span>`;
      if (open) btn.addEventListener('click', () => startSong(i));
      els.songGrid.appendChild(btn);
    });
    els.songs.classList.add('open');
  }

  function showDone(r) {
    const last = songIndex >= RHYTHM_SONGS.length - 1;
    const stressWords = song.words.filter(w => w.syl.length > 1 && w.stress > 0);
    els.doneBody.innerHTML = `
      <div class="rh-rank rank-${r.rank}">${r.rank}</div>
      <h3>${song.e} ${song.name}</h3>
      <p class="rh-done-line">正確率 <strong>${r.acc}%</strong>　分數 <strong>${stats.score}</strong>　最高連擊 <strong>${stats.maxCombo}</strong></p>
      <p class="rh-done-line">PERFECT ${stats.perfect}　GOOD ${stats.good}　MISS ${stats.miss}${stats.wrongLane ? `（其中重音敲錯 ${stats.wrongLane}）` : ''}</p>
      ${r.fc ? '<p class="rh-fc">💯 FULL COMBO！</p>' : ''}
      <p class="rh-done-reward">${r.first ? `首次完成 +30 XP` : '再次挑戰 +12 XP'}${r.gems ? `　+${r.gems} 💎` : ''}</p>
      ${stressWords.length
        ? `<p class="rh-done-tip">💡 這首歌裡重音不在第一個音節的字：
             ${stressWords.map(w => `<span class="rh-tag">${w.syl.map((s, i) => i === w.stress ? s.toUpperCase() : s).join('-')}</span>`).join('')}</p>`
        : '<p class="rh-done-tip">💡 這首歌的字重音都在第一個音節——英文名詞大多是這樣！</p>'}
      <div class="rh-done-row">
        <button class="rh-btn" id="rh-again">🔄 再挑戰</button>
        <button class="rh-btn" id="rh-tolist">🎼 選歌</button>
        ${last ? '' : '<button class="rh-btn rh-btn-main" id="rh-next">➡️ 下一首</button>'}
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#rh-again').addEventListener('click', () => startSong(songIndex));
    els.doneBody.querySelector('#rh-tolist').addEventListener('click', () => { els.done.classList.remove('open'); openSongs(); });
    const next = els.doneBody.querySelector('#rh-next');
    if (next) next.addEventListener('click', () => startSong(songIndex + 1));
    renderHUD();
  }

  /* ================= lifecycle ================= */

  function init() {
    loadSave();
    if (!buildShell()) return;
    renderDiffRow(els.diffRow);
    renderKeys();
    renderHUD();

    window.__rhythmTest = {
      state: () => ({
        songId: song && song.id,
        playing,
        notes: notes.length,
        judged: notes.filter(n => n.judged).length,
        stats: stats && { ...stats },
        cleared: clearedCount(),
      }),
      start: i => startSong(i),
      // Play the whole chart perfectly by judging every note on the beat.
      autoPlay: () => { notes.forEach(n => { if (!n.judged) judge(n, 'perfect'); }); },
      hit: lane => hit(lane),
      elapsed: () => (song ? now() : 0),
      chart: () => notes.map(n => ({ t: Math.round(n.t), lane: n.lane, stressed: n.stressed })),
      save: () => JSON.parse(JSON.stringify(save)),
      finish: () => finishSong(),
    };
  }

  function onShow() {
    if (!canvas) return;
    fitCanvas();
    if (song) ensureLoop();
  }

  return { init, onShow };
})();
