/* ===== Rhythm Star Module (英語節奏星) =====
   A taiko-style rhythm game where the beats are SYLLABLES and the big beats
   are STRESSED syllables. Taiwanese kids reliably mis-time English words —
   giving every letter its own beat — so "ba-NA-na" as short-LONG-short is the
   one thing this game drills, and nothing else in the site teaches it.

   Difficulty is a real teaching ramp, not just speed:
     easy    one lane  — just tap the syllable count (syllables + stress shown)
     medium  two lanes — stressed goes up, unstressed goes down (word shown)
     hard    two lanes — blind: only the emoji and Chinese, listen to the TTS

   The chart itself teaches the rule: a stressed syllable is a LONG note and an
   unstressed one is short, so the contour is something the hands play rather
   than a colour on the screen. The eight words split into an A section and a
   denser B section (the chorus), and the song signs off with a three-note roll.

   Every song has a real backing track (MusicManager.startGameTrack) and the
   whole game runs off the AUDIO clock, not performance.now(). That matters:
   performance.now() drifts against the audio hardware, so over a song the notes
   slowly stop landing on the beat — which is exactly what makes a rhythm game
   feel wrong. The chart's lead-in is bar-aligned so note 1 is a downbeat.

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
              desc: '單軌：重音是長音、輕音是短音（會標出音節）' },
    medium: { label: '中等', lanes: 2, rate: 1.0,  xp: 14, gem: 1, bonus: 15,
              desc: '雙軌：重音敲上排、輕音敲下排（附點節奏）' },
    hard:   { label: '困難', lanes: 2, rate: 1.18, xp: 18, gem: 2, bonus: 20,
              desc: '雙軌盲奏：套用歌曲的節奏型，只看圖和中文' },
  };

  // Note LENGTH is the lesson. A stressed syllable is a long note and an
  // unstressed one is short, so "ba-NA-na" is something the hands play, not
  // just a colour on the screen. The first version gave every syllable one
  // beat — which is why all 20 songs felt like the same chart at 20 speeds.
  const FEEL = {
    easy:   { s: 2,   u: 1,   rest: 1 },   // clearest rule: long is twice short
    medium: { s: 1.5, u: 0.5, rest: 1 },   // dotted — the real English contour
  };
  // Hard takes its lengths from the song's groove, so a ballad and a chiptune
  // song genuinely play differently. Every entry keeps s > u — the teaching
  // point survives whichever groove a song uses.
  const GROOVE_FEEL = {
    pop:      { s: 1.5,     u: 0.5,     rest: 1    },
    rock:     { s: 1.5,     u: 0.5,     rest: 0.5  },
    march:    { s: 1,       u: 0.5,     rest: 1    },
    swing:    { s: 4 / 3,   u: 2 / 3,   rest: 4 / 3 },  // triplet feel, like its hats
    latin:    { s: 1,       u: 0.5,     rest: 0.5  },
    chiptune: { s: 1,       u: 0.5,     rest: 0.75 },   // lands on 16ths, like its kick
    ballad:   { s: 2,       u: 1,       rest: 1.5  },
    bossa:    { s: 1.5,     u: 0.5,     rest: 1.5  },
  };
  function feelOf(s) {
    if (difficulty !== 'hard') return FEEL[difficulty] || FEEL.easy;
    return GROOVE_FEEL[s.groove] || GROOVE_FEEL.pop;
  }

  let canvas = null, ctx = null, rafId = null;
  let els = {};
  let audioCtx = null;
  // The song's clock. `band` is the handle from MusicManager.startGameTrack —
  // when it exists the game judges against the AUDIO clock, which is the only
  // clock the music itself is on. performance.now() drifts against the audio
  // hardware, so on the old code the notes slowly stopped landing on the beat.
  let band = null;

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
  // Momentum gauge — the only way this game can be lost, and the reason a
  // stretch of misses now costs something instead of just scrolling past.
  let gauge = 50;
  const GAUGE_START = 50, GAUGE_CLEAR = 60;
  const GAUGE_DELTA = { perfect: 3, good: 1, miss: -6, lane: -4 };
  let parts = [], rings = [], shake = 0;
  let dancer = { mood: 'idle', until: 0 };
  let previewTimers = [], previewIndex = 0;
  // Judgement windows are per-chart, not per-game — see buildChart().
  let perfectMs = PERFECT_MS, goodMs = GOOD_MS;
  let bSectionT = 0;         // when the denser B section starts
  let bAnnounced = false, sectionFlash = 0;

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

  // One note per syllable, its LENGTH set by the stress, with the eight words
  // split into an A section and a denser B section and a drum roll to finish.
  function buildChart(s) {
    const beat = 60000 / songTempo(s);
    const lanes = DIFFS[difficulty].lanes;
    const feel = feelOf(s);
    const bStart = Math.ceil(s.words.length / 2);   // first word of the B section
    notes = [];
    wordSpans = [];
    // Lead-in is a whole number of bars so the first note falls on a downbeat
    // and the count-in matches what the drums are doing.
    const barMs = beat * 4;
    let t = barMs * Math.max(2, Math.ceil(2600 / barMs));
    s.words.forEach((word, wi) => {
      const from = notes.length;
      const section = wi >= bStart ? 'B' : 'A';
      word.syl.forEach((_, si) => {
        const stressed = si === word.stress;
        notes.push({
          t, wordIdx: wi, sylIdx: si,
          lane: lanes === 1 ? 0 : (stressed ? 1 : 0),   // 1 = upper/stressed
          stressed, roll: false,
          judged: false, verdict: null,
        });
        t += beat * (stressed ? feel.s : feel.u);
      });
      wordSpans.push({ word, section, from, to: notes.length - 1, startT: notes[from].t, spoken: false, cleared: false });
      // The B section is the chorus: half the breathing room between words, so
      // the song builds instead of ticking along at one density throughout.
      // The last word gets no trailing rest — the roll below follows it.
      if (wi < s.words.length - 1) t += beat * feel.rest * (section === 'B' ? 0.5 : 1);
    });
    bSectionT = wordSpans[bStart] ? wordSpans[bStart].startT : 0;
    // Finish on a roll: three quick taps on the lane the song ended on, so the
    // last thing a child does is a flourish rather than a fade-out. They sit
    // outside the last word's span, so they can't affect its reward.
    if (notes.length) {
      const last = notes[notes.length - 1];
      const w = s.words[last.wordIdx];
      t += beat * 0.5;
      for (let i = 0; i < 3; i++) {
        notes.push({
          t, wordIdx: last.wordIdx, sylIdx: w.stress,
          lane: last.lane, stressed: false, roll: true,
          judged: false, verdict: null,
        });
        t += beat * 0.5;
      }
    }
    // Judgement windows follow the chart's density: the fixed 195ms GOOD window
    // would swallow two notes at once on the tightest hard charts.
    let minGap = Infinity;
    for (let i = 1; i < notes.length; i++) minGap = Math.min(minGap, notes[i].t - notes[i - 1].t);
    goodMs = Math.max(110, Math.min(GOOD_MS, minGap * 0.45));
    perfectMs = Math.max(60, Math.min(PERFECT_MS, goodMs * 0.55));
    return beat;
  }

  /* ================= backing track ================= */

  // Expand the song's two data fields into a real 8-bar arrangement: bass root,
  // a triad pad, and a simple melody that outlines the chord. Hand-writing 20
  // arrangements would have been the alternative; this keeps the data to two
  // fields per song and still gives every song its own harmony and beat.
  // The song's actual tempo, after the difficulty rate. The band must be built
  // at this tempo too — scaling only the note spacing (as the first version
  // did) puts every note between the band's beats, which is worse than having
  // no music at all.
  function songTempo(s) { return s.bpm * DIFFS[difficulty].rate; }

  function bandDef(s) {
    const SCALE = typeof RHYTHM_SCALE !== 'undefined' ? RHYTHM_SCALE : [0, 2, 4, 5, 7, 9, 11];
    const deg = d => SCALE[((d % 7) + 7) % 7];
    const bars = [];
    for (let rep = 0; rep < 2; rep++) {
      s.chords.forEach((d, i) => {
        const root = 36 + deg(d);
        const triad = [60 + deg(d), 60 + deg(d + 2), 60 + deg(d + 4)];
        // last bar of each pass gets a turnaround so the loop doesn't feel flat
        const top = 72 + deg(d + (rep ? 4 : 2));
        const m = (i === s.chords.length - 1)
          ? [[triad[2], 1], [top, 1], [triad[1], 2]]
          : [[triad[0], 1.5], [triad[1], .5], [triad[2], 1], [top, 1]];
        bars.push({ b: root, p: triad, m });
      });
    }
    return { style: 'soft', tempo: songTempo(s), groove: s.groove || 'pop', bars };
  }

  /* ================= audio ================= */

  // One tone with an optional pitch slide. `to = 0` holds the pitch.
  function blip(from, to, type, vol, dur, delay = 0) {
    if (typeof SoundManager !== 'undefined' && !SoundManager.isEnabled()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch { /* audio unavailable — the game is still fully playable */ }
  }

  function tick(freq, vol) { blip(freq, 0, 'triangle', vol, 0.09); }

  // The three verdicts have to be tellable apart with your eyes on the notes:
  // a rising chime, a flat blip, and a falling thud are different enough that a
  // child hears they are drifting before they read it.
  function judgeSound(verdict, stressed) {
    if (verdict === 'perfect') {
      blip(stressed ? 1046 : 784, stressed ? 1568 : 1175, 'triangle', 0.15, 0.12);
      blip(stressed ? 2093 : 1568, 0, 'sine', 0.07, 0.22, 0.03);
    } else if (verdict === 'good') {
      blip(stressed ? 660 : 523, 0, 'triangle', 0.12, 0.11);
    } else if (verdict === 'lane') {
      blip(440, 262, 'square', 0.09, 0.17);       // buzzy "wrong door"
    } else {
      blip(190, 70, 'sawtooth', 0.11, 0.24);      // falling thud
    }
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

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 200;
      parts.push({
        x, y, color,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
        life: 0.45 + Math.random() * 0.35, r: 2 + Math.random() * 3.5,
      });
    }
    if (parts.length > 300) parts.splice(0, parts.length - 300);
  }

  /* ================= gameplay ================= */

  function startSong(i) {
    clearPreviewTimers();
    songIndex = i;
    song = RHYTHM_SONGS[i];
    buildChart(song);
    stats = { perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, score: 0, wrongLane: 0 };
    popups = [];
    parts = []; rings = []; shake = 0;
    dancer = { mood: 'idle', until: 0 };
    gauge = GAUGE_START;
    lastBeat = -1;
    bAnnounced = false;
    sectionFlash = 0;
    playing = true;
    // Hand the speakers over from the zone BGM and take its clock. Playing a
    // 92 BPM zone track underneath a 76 BPM chart is what made this feel wrong.
    band = (typeof MusicManager !== 'undefined' && MusicManager.startGameTrack)
      ? MusicManager.startGameTrack(bandDef(song)) : null;
    startTime = performance.now();
    GameEngine.setDeferLevelUp(true);
    els.start.style.display = 'none';
    els.songs.classList.remove('open');
    els.done.classList.remove('open');
    renderHUD();
    ensureLoop();
  }

  // One clock for everything: the audio clock while the band is playing (so the
  // chart can never drift against the music), performance.now() as the fallback
  // when music is switched off or Web Audio is unavailable.
  function now() {
    if (band && typeof MusicManager !== 'undefined') {
      return (MusicManager.audioNow() - band.startTime) * 1000;
    }
    return performance.now() - startTime;
  }

  // The note the player is most plausibly aiming at: the earliest unjudged one
  // still inside the GOOD window (or already past the line but not yet missed).
  function nearestNote() {
    const t = now();
    let best = null, bestAbs = Infinity;
    for (const n of notes) {
      if (n.judged) continue;
      const d = Math.abs(n.t - t);
      if (d < bestAbs) { bestAbs = d; best = n; }
      if (n.t - t > goodMs) break;    // notes are in time order
    }
    return bestAbs <= goodMs ? best : null;
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
    judge(n, d <= perfectMs ? 'perfect' : 'good');
  }

  function judge(n, verdict) {
    n.judged = true;
    n.verdict = verdict;
    const y = laneY(n.lane);
    judgeSound(verdict, n.stressed);
    gauge = Math.max(0, Math.min(100, gauge + (GAUGE_DELTA[verdict] || 0)));
    if (verdict === 'perfect') {
      stats.perfect++; stats.score += 100; stats.combo++;
      popups.push({ text: 'PERFECT', y, life: 0.7, color: '#ffd166' });
      burst(HIT_X, y, '#ffd166', n.stressed ? 16 : 11);
      rings.push({ y, r: n.stressed ? 26 : 18, life: 1, color: '#ffd166' });
      dancer = { mood: 'great', until: 0.45 };
    } else if (verdict === 'good') {
      stats.good++; stats.score += 60; stats.combo++;
      popups.push({ text: 'GOOD', y, life: 0.7, color: '#7fd4ff' });
      burst(HIT_X, y, '#7fd4ff', 7);
      rings.push({ y, r: 18, life: 1, color: '#7fd4ff' });
      if (dancer.mood !== 'great') dancer = { mood: 'ok', until: 0.3 };
    } else {
      if (verdict === 'lane') { stats.wrongLane++; popups.push({ text: '重音錯了', y, life: 0.9, color: '#ff8fa3' }); }
      else popups.push({ text: 'MISS', y, life: 0.7, color: '#ff6b81' });
      stats.miss++; stats.combo = 0;
      shake = 1;
      dancer = { mood: 'bad', until: 0.6 };
    }
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
    // Out of momentum — the song stops rather than scrolling on unheard.
    if (gauge <= 0 && playing) { failSong(); return; }

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

  function stopBand() {
    if (typeof MusicManager !== 'undefined' && MusicManager.stopGameTrack) MusicManager.stopGameTrack();
    band = null;
  }

  // Momentum ran out. Nothing is written to the save and no bonus is paid, but
  // the XP already earned word-by-word stays — practice is never punished.
  function failSong() {
    playing = false;
    stopBand();
    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    blip(300, 90, 'sawtooth', 0.16, 0.7);
    showFailed();
  }

  function finishSong() {
    playing = false;
    stopBand();
    const total = notes.length;
    const acc = total ? Math.round(((stats.perfect + stats.good * 0.6) / total) * 100) : 0;
    const fc = stats.miss === 0;
    const rank = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C';
    const cfg = DIFFS[difficulty];
    // A run that limped to the end on a near-empty gauge isn't a clear. XP is
    // still paid — the point is to make the gauge worth watching, not to take
    // rewards away from a child who kept playing.
    const clear = gauge >= GAUGE_CLEAR;

    const prev = save.best[song.id];
    const first = clear && !prev;
    if (first) GameEngine.recordRhythmSong();
    if (fc && clear) GameEngine.recordRhythmFC();

    let gems = 0;
    if (first) { gems += cfg.bonus; }
    if (fc && clear) gems += 5;
    if (gems) GameEngine.addGems(gems);
    GameEngine.addXP(first ? 30 : 12);

    if (clear) {
      if (!prev || stats.score > prev.score) {
        save.best[song.id] = { score: stats.score, acc, rank, gauge, fc: fc || (prev && prev.fc) || false };
      } else {
        if (fc && !prev.fc) save.best[song.id].fc = true;
        save.best[song.id].gauge = Math.max(prev.gauge || 0, gauge);
      }
      persist();
    }

    GameEngine.setDeferLevelUp(false);
    GameEngine.flushPendingLevelUps();
    if (clear) SoundManager.playQuestComplete();
    showDone({ acc, rank, fc, gems, first, clear });
  }

  /* ================= loop ================= */

  function step(dt) {
    const t = now();

    // auto-MISS anything that sailed past the window
    notes.forEach(n => {
      if (!n.judged && t - n.t > goodMs) judge(n, 'miss');
    });

    // metronome + speak each word as it comes into view
    const beat = 60000 / songTempo(song);
    const b = Math.floor(t / beat);
    // Only click when there's no band — the drum kit is the metronome now.
    if (b !== lastBeat && t > 0) { lastBeat = b; if (!band) tick(300, 0.03); }

    // Speech during play used to run over the beat on every difficulty, which
    // is the one thing a rhythm game cannot do. Easy and medium now hear the
    // words once on the preview screen and then play in silence. Blind hard
    // mode still needs the word — it arrives in the rest before the note and
    // the band ducks under it instead of fighting it.
    if (difficulty === 'hard') {
      wordSpans.forEach(sp => {
        if (!sp.spoken && sp.startT - t <= LEAD_MS) {
          sp.spoken = true;
          if (typeof TTSManager !== 'undefined') TTSManager.speak(sp.word.w);
          if (typeof MusicManager !== 'undefined' && MusicManager.duck) MusicManager.duck(1.1);
        }
      });
    }

    parts.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.life -= dt;
    });
    parts = parts.filter(p => p.life > 0);
    rings.forEach(r => { r.r += 260 * dt; r.life -= dt * 1.8; });
    rings = rings.filter(r => r.life > 0);
    shake = Math.max(0, shake - dt * 5);
    dancer.until = Math.max(0, dancer.until - dt);
    if (dancer.until === 0) dancer.mood = 'idle';

    // The chorus gets its own announcement — the chart visibly tightens here
    // and a child should know it's coming rather than just start missing.
    if (!bAnnounced && bSectionT > 0 && t >= bSectionT - LEAD_MS) {
      bAnnounced = true;
      sectionFlash = 1.4;
    }
    sectionFlash = Math.max(0, sectionFlash - dt);

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
    const beat = song ? 60000 / songTempo(song) : 500;
    const combo = stats ? stats.combo : 0;

    ctx.save();
    // A miss you can feel. Three frames of jitter, then it settles.
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 9 * shake, (Math.random() - 0.5) * 7 * shake);

    // The stage lights up as the combo climbs — the reward for a long clean
    // run is that the whole screen looks different, not a bigger number.
    // Warmer, not brighter — the notes have to stay readable at combo 40.
    const heat = Math.min(1, combo / 20);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, heat > 0.5 ? `rgb(${27 + heat * 28},${18 + heat * 4},${54 + heat * 12})` : '#1b1236');
    g.addColorStop(1, heat > 0.5 ? `rgb(${58 + heat * 34},${31 + heat * 8},${92 + heat * 16})` : '#3a1f5c');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);

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

    // combo ≥10: the lane edges catch fire and flicker on the beat
    if (combo >= 10) {
      const flick = 0.55 + 0.45 * Math.sin(t / 55);
      rows.forEach(r => {
        [r.y - 40, r.y + 40].forEach((edge, k) => {
          const fg = ctx.createLinearGradient(0, edge, 0, edge + (k ? 16 : -16));
          fg.addColorStop(0, `rgba(255,${140 + flick * 70},60,${0.42 + flick * 0.3})`);
          fg.addColorStop(1, 'rgba(255,90,40,0)');
          ctx.fillStyle = fg;
          ctx.fillRect(0, k ? edge : edge - 16, W, 16);
        });
      });
      // licks of flame along the judgement line
      for (let i = 0; i < 7; i++) {
        const fx = HIT_X - 34 + i * 11;
        const h = 12 + Math.abs(Math.sin(t / 90 + i * 1.7)) * (combo >= 20 ? 26 : 16);
        ctx.fillStyle = `rgba(255,${170 + i * 8},70,.5)`;
        ctx.beginPath();
        ctx.moveTo(fx, rows[rows.length - 1].y + 42);
        ctx.quadraticCurveTo(fx + 5, rows[rows.length - 1].y + 42 - h * 0.6, fx + 2, rows[rows.length - 1].y + 42 - h);
        ctx.quadraticCurveTo(fx - 2, rows[rows.length - 1].y + 42 - h * 0.6, fx - 5, rows[rows.length - 1].y + 42);
        ctx.fill();
      }
    }

    // expanding judgement rings
    rings.forEach(r => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.life) * 0.7;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(HIT_X, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
      const r = n.roll ? 13 : n.stressed ? 26 : 17;
      ctx.save();
      if (n.judged) ctx.globalAlpha = 0.25;
      ctx.fillStyle = n.roll ? '#ffd166' : n.stressed ? '#ff6b81' : '#4aa8e0';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // the syllable text rides on the note (hidden in blind mode)
      if (n.roll) {
        ctx.fillStyle = '#5b3b00';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', x, y + 1);
      } else if (difficulty === 'easy') {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${n.stressed ? 15 : 12}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(wordSpans[n.wordIdx].word.syl[n.sylIdx], x, y);
      }
      ctx.restore();
    });

    // hit sparks
    parts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
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

    // Combo sits bottom-right, clear of the HUD chips that float over the
    // canvas's top-right corner — it was unreadable underneath them.
    if (stats.combo >= 3) {
      const pop = 1 + Math.max(0, 0.35 - (Date.now() % 1000) / 3000) * (combo >= 10 ? 1 : 0);
      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = combo >= 20 ? '#ffb347' : '#ffd166';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('COMBO', W - 24, 276);
      ctx.font = `bold ${Math.round(32 * pop)}px system-ui, sans-serif`;
      if (combo >= 10) { ctx.shadowColor = 'rgba(255,140,60,.9)'; ctx.shadowBlur = 14; }
      ctx.fillText(`${stats.combo}`, W - 86, 278);
      ctx.restore();
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

    if (sectionFlash > 0) {
      const rise = (1.4 - sectionFlash) * 16;
      ctx.save();
      ctx.globalAlpha = Math.min(1, sectionFlash * 1.6);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText('♪ B 段', W / 2, 74 - rise);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('節奏變密了！', W / 2, 98 - rise);
      ctx.restore();
    }

    drawDancer(t, beat);
    drawGauge();

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

    ctx.restore();
  }

  // A partner who is dancing to the same beat. It hops every beat, leaps on a
  // PERFECT and face-plants on a MISS — feedback you catch out of the corner
  // of your eye while your attention is on the notes.
  function drawDancer(t, beat) {
    const phase = ((t % beat) + beat) % beat / beat;
    const hop = Math.abs(Math.sin(phase * Math.PI));
    const mood = dancer.mood;
    const lift = mood === 'great' ? 10 + hop * 16 : mood === 'bad' ? 0 : hop * 9;
    const face = mood === 'bad' ? '😵' : mood === 'great' ? '🤩' : '🕺';
    const size = mood === 'bad' ? 34 : 38 + hop * 5;
    drawEmoji(face, 52, 274 - lift, size, 0.95);
    if (mood === 'great') drawEmoji('✨', 82, 252 - lift, 20, 0.9);
  }

  // Momentum. Empty means the song stops, and the CLEAR line is drawn on the
  // bar itself so "60" is somewhere you can see, not a number in the rules.
  function drawGauge() {
    const x = 68, y = 298, w = W - x - 22, h = 13;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    roundRect(x, y, w, h, 7); ctx.fill();
    const low = gauge < 25;
    const fw = Math.max(0, w * gauge / 100);
    if (fw > 2) {
      const gg = ctx.createLinearGradient(x, 0, x + w, 0);
      gg.addColorStop(0, low ? '#ff5c78' : '#7fd4ff');
      gg.addColorStop(1, low ? '#ff9db1' : gauge >= GAUGE_CLEAR ? '#ffd166' : '#a8b8ff');
      ctx.fillStyle = gg;
      // pulse when the gauge is nearly out, so it can't be missed
      ctx.globalAlpha = low ? 0.65 + 0.35 * Math.abs(Math.sin(Date.now() / 140)) : 1;
      roundRect(x, y, fw, h, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // the CLEAR line
    const cx = x + w * GAUGE_CLEAR / 100;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, y - 3); ctx.lineTo(cx, y + h + 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('氣勢', 22, y + h / 2);
    ctx.fillText(`${Math.round(gauge)}`, 68, y + h / 2);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.textAlign = 'center';
    ctx.fillText('過關線', cx, y - 9);
    ctx.restore();
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
    // Navigating away mid-song would otherwise leave the band playing under
    // whatever zone the player moved to.
    if (!document.getElementById('zone-rhythm').classList.contains('active')) {
      clearPreviewTimers();
      if (band) {
        if (typeof MusicManager !== 'undefined') MusicManager.stopGameTrack();
        band = null;
        playing = false;
      }
    }
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
        <p>ba-<strong>NA</strong>-na 是「短-<strong>長</strong>-短」，不是「B-A-N-A-N-A」六拍喔！</p>
        <p>大顆的重音是<strong>長音</strong>、小顆的輕音是<strong>短音</strong>；唱到一半會進 <strong>B 段</strong>，節奏變密，最後還有三下 ♪ 連打收尾。</p>
        <p>下面那條是<strong>氣勢條</strong>：敲中會漲、漏掉會掉，掉光歌就停了；要超過過關線才算過關。</p>
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

      <div class="rh-overlay" id="rh-preview">
        <div class="rh-panel rh-panel-narrow">
          <div class="rh-panel-head">
            <h3>🔊 試聽</h3>
            <span class="rh-panel-sub" id="rh-preview-sub"></span>
          </div>
          <div class="rh-preview-body">
            <p class="rh-preview-tip">先聽一次這八個字，等一下歌一開始就<strong>不會再唸了</strong>。</p>
            <div class="rh-preview-grid" id="rh-preview-grid"></div>
            <div class="rh-done-row">
              <button class="rh-btn" id="rh-preview-back">← 換一首</button>
              <button class="rh-btn rh-btn-main rh-btn-big" id="rh-preview-go">▶️ 開始！</button>
            </div>
          </div>
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
      preview: root.querySelector('#rh-preview'),
      previewSub: root.querySelector('#rh-preview-sub'),
      previewGrid: root.querySelector('#rh-preview-grid'),
      stage: root.querySelector('.rh-stage'),
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
    root.querySelector('#rh-preview-go').addEventListener('click', () => {
      clearPreviewTimers();
      els.preview.classList.remove('open');
      startSong(previewIndex);
    });
    root.querySelector('#rh-preview-back').addEventListener('click', () => {
      clearPreviewTimers();
      els.preview.classList.remove('open');
      openSongs();
    });
    return true;
  }

  /* ---------- preview (R5: the only place words are spoken) ---------- */

  function clearPreviewTimers() {
    previewTimers.forEach(clearTimeout);
    previewTimers = [];
    if (typeof TTSManager !== 'undefined' && TTSManager.stop) TTSManager.stop();
  }

  // Speaking a word while the beat is running is the one thing a rhythm game
  // must not do, so every word gets heard here instead — once, before the
  // music starts. "開始！" is live from the first frame for anyone who'd
  // rather not wait.
  function openPreview(i) {
    clearPreviewTimers();
    previewIndex = i;
    const s = RHYTHM_SONGS[i];
    els.previewSub.textContent = `${s.e} ${s.name}　${DIFFS[difficulty].label}`;
    els.previewGrid.innerHTML = '';
    s.words.forEach((w, wi) => {
      const card = document.createElement('button');
      card.className = 'rh-pv-card';
      card.innerHTML =
        `<span class="rh-pv-e">${w.e}</span>` +
        `<span class="rh-pv-w">${w.syl.map((x, k) => k === w.stress
          ? `<b>${x.toUpperCase()}</b>` : x).join('<i>·</i>')}</span>` +
        `<span class="rh-pv-zh">${w.zh}</span>`;
      card.addEventListener('click', () => {
        if (typeof TTSManager !== 'undefined') TTSManager.speak(w.w);
      });
      els.previewGrid.appendChild(card);
      previewTimers.push(setTimeout(() => {
        if (typeof TTSManager !== 'undefined') TTSManager.speak(w.w);
        [...els.previewGrid.children].forEach(c => c.classList.remove('now'));
        card.classList.add('now');
      }, 350 + wi * 1050));
    });
    previewTimers.push(setTimeout(() => {
      [...els.previewGrid.children].forEach(c => c.classList.remove('now'));
    }, 350 + s.words.length * 1050));
    els.songs.classList.remove('open');
    els.done.classList.remove('open');
    els.preview.classList.add('open');
  }

  function rhConfetti(n = 30) {
    if (!els.stage) return;
    const colors = ['#ffd166', '#ff6b81', '#7fd4ff', '#c77dff', '#8ce8a8', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'rh-confetti';
      c.style.left = 5 + Math.random() * 90 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.animationDuration = 1.3 + Math.random() * 0.9 + 's';
      els.stage.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
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
      if (open) btn.addEventListener('click', () => openPreview(i));
      els.songGrid.appendChild(btn);
    });
    els.songs.classList.add('open');
  }

  function showFailed() {
    els.doneBody.innerHTML = `
      <div class="rh-rank rank-fail">💔</div>
      <h3>${song.e} ${song.name}</h3>
      <p class="rh-done-line">氣勢用完了，這首先停在這裡。</p>
      <p class="rh-done-line">敲中一個音符氣勢就會回來——<strong>重音敲上排、輕音敲下排</strong>，
        抓穩了就不會掉。</p>
      <p class="rh-done-line">PERFECT ${stats.perfect}　GOOD ${stats.good}　MISS ${stats.miss}${stats.wrongLane ? `（其中重音敲錯 ${stats.wrongLane}）` : ''}</p>
      <p class="rh-done-tip">💡 覺得太快的話，換到<strong>簡單</strong>難度：重音是兩拍的長音，好抓很多。</p>
      <div class="rh-done-row">
        <button class="rh-btn rh-btn-main rh-btn-big" id="rh-again">🔄 再挑戰一次</button>
        <button class="rh-btn" id="rh-tolist">🎼 選歌</button>
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#rh-again').addEventListener('click', () => startSong(songIndex));
    els.doneBody.querySelector('#rh-tolist').addEventListener('click', () => { els.done.classList.remove('open'); openSongs(); });
    renderHUD();
  }

  function showDone(r) {
    const last = songIndex >= RHYTHM_SONGS.length - 1;
    const stressWords = song.words.filter(w => w.syl.length > 1 && w.stress > 0);
    if (r.fc && r.clear) rhConfetti(34);
    els.doneBody.innerHTML = `
      <div class="rh-rank rank-${r.clear ? r.rank : 'fail'}">${r.clear ? r.rank : '—'}</div>
      <h3>${song.e} ${song.name}</h3>
      <p class="rh-done-line rh-gauge-line ${r.clear ? 'ok' : 'no'}">氣勢 <strong>${Math.round(gauge)}</strong> / 100　${
        r.clear ? '✅ 過關！' : `未達過關線 ${GAUGE_CLEAR}，成績不列入紀錄（XP 照給）`}</p>
      <p class="rh-done-line">正確率 <strong>${r.acc}%</strong>　分數 <strong>${stats.score}</strong>　最高連擊 <strong>${stats.maxCombo}</strong></p>
      <p class="rh-done-line">PERFECT ${stats.perfect}　GOOD ${stats.good}　MISS ${stats.miss}${stats.wrongLane ? `（其中重音敲錯 ${stats.wrongLane}）` : ''}</p>
      ${r.fc ? '<p class="rh-fc">💯 FULL COMBO！</p>' : ''}
      <p class="rh-done-reward">${r.first ? `首次完成 +30 XP` : '練習 +12 XP'}${r.gems ? `　+${r.gems} 💎` : ''}</p>
      ${stressWords.length
        ? `<p class="rh-done-tip">💡 這首歌裡重音不在第一個音節的字：
             ${stressWords.map(w => `<span class="rh-tag">${w.syl.map((s, i) => i === w.stress ? s.toUpperCase() : s).join('-')}</span>`).join('')}</p>`
        : '<p class="rh-done-tip">💡 這首歌的字重音都在第一個音節——英文名詞大多是這樣！</p>'}
      <div class="rh-done-row">
        <button class="rh-btn" id="rh-again">🔄 再挑戰</button>
        <button class="rh-btn" id="rh-tolist">🎼 選歌</button>
        ${last || !r.clear ? '' : '<button class="rh-btn rh-btn-main" id="rh-next">➡️ 下一首</button>'}
      </div>`;
    els.done.classList.add('open');
    els.doneBody.querySelector('#rh-again').addEventListener('click', () => startSong(songIndex));
    els.doneBody.querySelector('#rh-tolist').addEventListener('click', () => { els.done.classList.remove('open'); openSongs(); });
    const next = els.doneBody.querySelector('#rh-next');
    // A new song means new words, so the next one goes through the preview.
    if (next) next.addEventListener('click', () => openPreview(songIndex + 1));
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
        gauge: Math.round(gauge),
        cleared: clearedCount(),
        failed: !playing && !!song && notes.some(n => !n.judged),
      }),
      start: i => startSong(i),
      preview: i => openPreview(i),
      setGauge: v => { gauge = v; },
      // Play the whole chart perfectly by judging every note on the beat.
      autoPlay: () => { notes.forEach(n => { if (!n.judged) judge(n, 'perfect'); }); },
      hit: lane => hit(lane),
      elapsed: () => (song ? now() : 0),
      chart: () => notes.map(n => ({ t: Math.round(n.t), lane: n.lane, stressed: n.stressed, roll: !!n.roll, wordIdx: n.wordIdx })),
      spans: () => wordSpans.map(sp => ({ w: sp.word.w, section: sp.section, from: sp.from, to: sp.to, startT: Math.round(sp.startT) })),
      windows: () => ({ perfectMs: Math.round(perfectMs), goodMs: Math.round(goodMs) }),
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
