/* ===== MusicManager — synthesized background music (Web Audio API) =====
   No audio files: every track is composed as data (chords / bass / melody)
   and rendered live through oscillators, matching the project's fully
   self-contained rule. Two sound palettes:
     soft — triangle/sine leads, warm pads, gentle (learning screens)
     chip — square leads, driving bass, noise drums (battle / action)
   A bar-level lookahead scheduler keeps timing solid even when the UI
   thread stutters. Tracks crossfade on zone switches. */

const MusicManager = (() => {
  const STORAGE_KEY = 'music_enabled';

  let ctx = null;
  let masterGain = null;
  let trackGain = null;        // per-track gain for crossfades
  let enabled = true;
  let unlocked = false;        // becomes true on first user gesture
  let currentId = null;
  let pendingId = null;        // requested before the audio unlock
  let lastZone = 'hub';
  const zoneVisitCount = {}; // module-level rotation counters per zone (not persisted)
  let schedTimer = null;
  let nextBarTime = 0;
  let barIdx = 0;

  // ---------- track compositions ----------
  // bars: { b: bass midi, p: [pad midis], m: [[melody midi|0=rest, beats], ...] }
  const TRACKS = {
    // 溫暖平靜 — hub / youtube / daily
    home: {
      style: 'soft', tempo: 72,
      bars: [
        { b: 36, p: [60, 64, 67], m: [[64, 1.5], [67, 0.5], [69, 1], [67, 1]] },
        { b: 45, p: [57, 60, 64], m: [[64, 2], [60, 1], [57, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 1.5], [64, 0.5], [62, 1], [60, 1]] },
        { b: 43, p: [59, 62, 67], m: [[62, 4]] },
        { b: 36, p: [60, 64, 67], m: [[67, 1.5], [69, 0.5], [72, 1], [69, 1]] },
        { b: 45, p: [57, 60, 64], m: [[67, 2], [64, 2]] },
        { b: 41, p: [57, 60, 65], m: [[65, 1], [64, 1], [62, 1], [60, 1]] },
        { b: 43, p: [59, 62, 67], m: [[62, 2], [64, 2]] },
      ],
    },
    // 溫暖搖擺 — hub / youtube 輪播
    home2: {
      style: 'soft', tempo: 76,
      bars: [
        { b: 36, p: [60, 64, 67], m: [[64, 1], [67, 1], [71, 1], [67, 1]] },
        { b: 33, p: [57, 60, 64], m: [[64, 1], [60, 1], [64, 1], [67, 1]] },
        { b: 41, p: [53, 57, 60], m: [[65, 1], [69, 1], [65, 1], [60, 1]] },
        { b: 43, p: [55, 59, 62], m: [[62, 1], [67, 1], [71, 1], [67, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 1], [67, 1], [64, 1], [67, 1]] },
        { b: 33, p: [57, 60, 64], m: [[69, 1], [64, 1], [60, 1], [64, 1]] },
        { b: 41, p: [53, 57, 60], m: [[65, 1], [69, 1], [72, 1], [69, 1]] },
        { b: 43, p: [55, 59, 62], m: [[71, 2], [67, 2]] },
      ],
    },
    // 真.搖籃曲 — hub / daily 輪播
    home3: {
      style: 'soft', tempo: 58,
      bars: [
        { b: 43, p: [55, 59, 62], m: [[74, 2], [71, 2]] },
        { b: 40, p: [52, 55, 59], m: [[71, 2], [67, 2]] },
        { b: 36, p: [60, 64, 67], m: [[67, 3], [0, 1]] },
        { b: 38, p: [50, 54, 57], m: [[64, 4]] },
        { b: 43, p: [55, 59, 62], m: [[62, 2], [59, 2]] },
        { b: 40, p: [52, 55, 59], m: [[59, 2], [55, 2]] },
        { b: 36, p: [60, 64, 67], m: [[64, 3], [0, 1]] },
        { b: 38, p: [50, 54, 57], m: [[62, 2], [0, 2]] },
      ],
    },
    // 飄逸琶音 — sky / listening / speak
    explore: {
      style: 'soft', tempo: 84, arp: true,
      bars: [
        { b: 33, p: [57, 60, 64], m: [[76, 2], [72, 2]] },
        { b: 41, p: [53, 57, 60], m: [[74, 3], [0, 1]] },
        { b: 36, p: [55, 60, 64], m: [[72, 2], [67, 2]] },
        { b: 43, p: [55, 59, 62], m: [[71, 4]] },
        { b: 33, p: [57, 60, 64], m: [[76, 1], [77, 1], [76, 1], [72, 1]] },
        { b: 41, p: [53, 57, 60], m: [[74, 2], [69, 2]] },
        { b: 36, p: [55, 60, 64], m: [[72, 2], [64, 2]] },
        { b: 40, p: [56, 59, 64], m: [[71, 3], [0, 1]] },
      ],
    },
    // 開闊四五度 — sky / listening 輪播
    explore2: {
      style: 'soft', tempo: 84, arp: true,
      bars: [
        { b: 41, p: [53, 57, 60], m: [[65, 1], [72, 1], [79, 1], [72, 1]] },
        { b: 36, p: [60, 64, 67], m: [[67, 1], [74, 1], [67, 1], [62, 1]] },
        { b: 38, p: [57, 60, 65], m: [[62, 1], [69, 1], [65, 1], [69, 1]] },
        { b: 36, p: [60, 64, 67], m: [[60, 4]] },
        { b: 41, p: [53, 57, 60], m: [[65, 1], [70, 1], [77, 1], [70, 1]] },
        { b: 36, p: [60, 64, 67], m: [[67, 1], [74, 1], [67, 1], [64, 1]] },
        { b: 38, p: [57, 60, 65], m: [[62, 1], [67, 1], [74, 1], [67, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 2], [0, 2]] },
      ],
    },
    // 神秘 drone — listening 輪播調味
    mystic: {
      style: 'soft', tempo: 62,
      bars: [
        { b: 40, p: [64, 67, 71], m: [[64, 1.5], [65, 0.5], [64, 1], [0, 1]] },
        { b: 40, p: [64, 67, 71], m: [[0, 1], [71, 1.5], [72, 0.5], [71, 1]] },
        { b: 41, p: [65, 69, 72], m: [[65, 2], [64, 1], [0, 1]] },
        { b: 41, p: [65, 69, 72], m: [[0, 2], [69, 1.5], [68, 0.5]] },
        { b: 40, p: [64, 67, 71], m: [[64, 1], [65, 1], [64, 2]] },
        { b: 40, p: [64, 67, 71], m: [[0, 1.5], [71, 1], [72, 0.5], [71, 1]] },
        { b: 43, p: [67, 71, 74], m: [[67, 2], [0, 2]] },
        { b: 43, p: [67, 71, 74], m: [[67, 1], [68, 1], [67, 2]] },
      ],
    },
    // 湖面五聲 — listening / builder 輪播
    lake: {
      style: 'soft', tempo: 56,
      bars: [
        { b: 41, p: [60, 65, 69], m: [[65, 2], [72, 2]] },
        { b: 41, p: [60, 65, 69], m: [[69, 2], [60, 2]] },
        { b: 41, p: [55, 60, 65], m: [[74, 1], [0, 1], [65, 2]] },
        { b: 41, p: [55, 60, 65], m: [[67, 4]] },
        { b: 36, p: [55, 60, 65], m: [[60, 2], [69, 2]] },
        { b: 36, p: [55, 60, 65], m: [[72, 2], [62, 2]] },
        { b: 36, p: [60, 65, 69], m: [[65, 1], [0, 1], [74, 2]] },
        { b: 36, p: [60, 65, 69], m: [[69, 4]] },
      ],
    },
    // 敘事搖籃曲 — rpg / builder
    story: {
      style: 'soft', tempo: 66,
      bars: [
        { b: 41, p: [57, 60, 65], m: [[69, 1], [72, 1], [69, 1], [65, 1]] },
        { b: 38, p: [57, 62, 65], m: [[67, 3], [65, 1]] },
        { b: 34, p: [58, 62, 65], m: [[65, 1], [67, 1], [69, 1], [70, 1]] },
        { b: 36, p: [55, 60, 64], m: [[67, 4]] },
        { b: 41, p: [57, 60, 65], m: [[72, 1.5], [74, 0.5], [72, 1], [69, 1]] },
        { b: 38, p: [57, 62, 65], m: [[70, 2], [67, 2]] },
        { b: 34, p: [58, 62, 65], m: [[69, 1], [67, 1], [65, 1], [62, 1]] },
        { b: 36, p: [55, 60, 64], m: [[65, 4]] },
      ],
    },
    // 惆悵敘事弧線 — rpg / builder 輪播
    story2: {
      style: 'soft', tempo: 70,
      bars: [
        { b: 38, p: [57, 60, 65], m: [[62, 1], [65, 1], [69, 1], [65, 1]] },
        { b: 34, p: [58, 62, 65], m: [[65, 1], [67, 1], [70, 1], [67, 1]] },
        { b: 36, p: [60, 64, 67], m: [[67, 1], [69, 1], [72, 1], [69, 1]] },
        { b: 33, p: [57, 60, 64], m: [[72, 2], [74, 2]] },
        { b: 38, p: [57, 60, 65], m: [[74, 1.5], [72, 0.5], [69, 1], [65, 1]] },
        { b: 34, p: [58, 62, 65], m: [[65, 1], [64, 1], [62, 1], [60, 1]] },
        { b: 36, p: [60, 64, 67], m: [[60, 2], [57, 2]] },
        { b: 33, p: [57, 60, 64], m: [[57, 4]] },
      ],
    },
    // 跳跳糖節奏 — minecraft / candy / sling
    playful: {
      style: 'chip', tempo: 132,
      bars: [
        { b: 36, p: [60, 64, 67], m: [[60, 0.5], [64, 0.5], [67, 0.5], [64, 0.5], [60, 0.5], [64, 0.5], [67, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 0.5], [69, 0.5], [72, 0.5], [69, 0.5], [65, 0.5], [69, 0.5], [72, 1]] },
        { b: 43, p: [59, 62, 67], m: [[67, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [71, 0.5], [74, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 1], [67, 1], [64, 1], [60, 1]] },
        { b: 36, p: [60, 64, 67], m: [[64, 0.5], [65, 0.5], [67, 0.5], [69, 0.5], [67, 1], [64, 1]] },
        { b: 41, p: [57, 60, 65], m: [[69, 0.5], [70, 0.5], [72, 0.5], [74, 0.5], [72, 1], [69, 1]] },
        { b: 43, p: [59, 62, 67], m: [[74, 0.5], [72, 0.5], [71, 0.5], [67, 0.5], [71, 1], [62, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 2], [0, 2]] },
      ],
    },
    // 彈跳切分 — minecraft / candy / sling 輪播
    playful2: {
      style: 'chip', tempo: 132,
      bars: [
        { b: 36, p: [60, 64, 67], m: [[64, 1.5], [67, 0.5], [72, 1], [67, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 0.5], [69, 1.5], [65, 0.5], [72, 1.5]] },
        { b: 43, p: [59, 62, 67], m: [[67, 1.5], [71, 0.5], [74, 1], [71, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 0.5], [67, 1.5], [64, 0.5], [60, 1.5]] },
        { b: 36, p: [60, 64, 67], m: [[64, 1.5], [67, 0.5], [71, 1.5], [67, 0.5]] },
        { b: 41, p: [57, 60, 65], m: [[69, 0.5], [65, 1.5], [72, 0.5], [69, 1.5]] },
        { b: 43, p: [59, 62, 67], m: [[74, 1.5], [71, 0.5], [67, 1.5], [71, 0.5]] },
        { b: 36, p: [60, 64, 67], m: [[72, 2], [0, 2]] },
      ],
    },
    // 快速歡樂音階 — minecraft / candy 輪播
    playful3: {
      style: 'chip', tempo: 144,
      bars: [
        { b: 43, p: [59, 62, 67], m: [[62, 0.5], [64, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [67, 0.5]] },
        { b: 36, p: [60, 64, 67], m: [[64, 0.5], [67, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [64, 0.5], [60, 0.5]] },
        { b: 38, p: [62, 66, 69], m: [[66, 0.5], [69, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [69, 0.5]] },
        { b: 43, p: [59, 62, 67], m: [[74, 1], [71, 1], [67, 1], [62, 1]] },
        { b: 43, p: [59, 62, 67], m: [[67, 0.5], [69, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [67, 0.5]] },
        { b: 36, p: [60, 64, 67], m: [[71, 0.5], [74, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [72, 0.5], [67, 0.5], [64, 0.5]] },
        { b: 38, p: [62, 66, 69], m: [[69, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [69, 0.5], [66, 0.5]] },
        { b: 43, p: [59, 62, 67], m: [[79, 2], [0, 2]] },
      ],
    },
    // 進行曲小調 — tower / empire / roblox / spelling
    battle: {
      style: 'chip', tempo: 140,
      bars: [
        { b: 33, p: [57, 60, 64], m: [[69, 0.5], [69, 0.5], [72, 1], [69, 0.5], [67, 0.5], [69, 1]] },
        { b: 33, p: [57, 60, 64], m: [[69, 0.5], [71, 0.5], [72, 1], [74, 1], [72, 1]] },
        { b: 41, p: [53, 57, 60], m: [[72, 0.5], [72, 0.5], [74, 1], [72, 0.5], [70, 0.5], [69, 1]] },
        { b: 43, p: [55, 59, 62], m: [[71, 1], [74, 1], [71, 1], [67, 1]] },
        { b: 33, p: [57, 60, 64], m: [[76, 0.5], [74, 0.5], [72, 1], [71, 0.5], [72, 0.5], [74, 1]] },
        { b: 33, p: [57, 60, 64], m: [[72, 1], [69, 1], [72, 1], [76, 1]] },
        { b: 40, p: [56, 59, 64], m: [[76, 1], [71, 1], [68, 1], [71, 1]] },
        { b: 33, p: [57, 60, 64], m: [[69, 2], [0, 2]] },
      ],
    },
    // 緊迫固定音型 — tower / empire / roblox / spelling 輪播
    battle2: {
      style: 'chip', tempo: 152,
      bars: [
        { b: 33, p: [57, 60, 64], m: [[69, 0.5], [69, 0.5], [69, 0.5], [69, 0.5], [72, 1], [69, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 0.5], [65, 0.5], [65, 0.5], [65, 0.5], [69, 1], [65, 1]] },
        { b: 36, p: [60, 64, 67], m: [[67, 0.5], [67, 0.5], [67, 0.5], [67, 0.5], [72, 1], [67, 1]] },
        { b: 43, p: [59, 62, 67], m: [[71, 1], [69, 1], [67, 1], [71, 1]] },
        { b: 33, p: [57, 60, 64], m: [[69, 0.5], [69, 0.5], [72, 0.5], [69, 0.5], [76, 1], [72, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 0.5], [65, 0.5], [69, 0.5], [65, 0.5], [72, 1], [69, 1]] },
        { b: 36, p: [60, 64, 67], m: [[67, 0.5], [67, 0.5], [71, 0.5], [67, 0.5], [74, 1], [71, 1]] },
        { b: 43, p: [59, 62, 67], m: [[71, 2], [0, 2]] },
      ],
    },
    // 進行曲附點 — tower / empire / roblox / spelling 輪播
    battle3: {
      style: 'chip', tempo: 120,
      bars: [
        { b: 36, p: [60, 63, 67], m: [[72, 1.5], [0, 0.5], [67, 1], [63, 1]] },
        { b: 44, p: [56, 60, 63], m: [[68, 1.5], [0, 0.5], [63, 1], [60, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 1.5], [0, 0.5], [69, 1], [65, 1]] },
        { b: 43, p: [59, 62, 67], m: [[71, 2], [67, 1], [62, 1]] },
        { b: 36, p: [60, 63, 67], m: [[72, 1.5], [0, 0.5], [75, 1], [72, 1]] },
        { b: 44, p: [56, 60, 63], m: [[68, 1.5], [0, 0.5], [72, 1], [68, 1]] },
        { b: 41, p: [57, 60, 65], m: [[69, 1.5], [0, 0.5], [65, 1], [63, 1]] },
        { b: 43, p: [59, 62, 67], m: [[67, 2], [0, 2]] },
      ],
    },
    // 永動八分音符 — sling / roblox / spelling 輪播
    race: {
      style: 'chip', tempo: 160,
      bars: [
        { b: 40, p: [64, 67, 71], m: [[64, 0.5], [67, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [64, 0.5], [62, 0.5]] },
        { b: 36, p: [60, 64, 67], m: [[67, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [64, 0.5]] },
        { b: 38, p: [62, 66, 69], m: [[69, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [78, 0.5], [76, 0.5], [74, 0.5], [71, 0.5]] },
        { b: 40, p: [64, 67, 71], m: [[76, 0.5], [74, 0.5], [71, 0.5], [67, 0.5], [64, 0.5], [67, 0.5], [71, 0.5], [74, 0.5]] },
        { b: 40, p: [64, 67, 71], m: [[64, 0.5], [66, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [66, 0.5]] },
        { b: 36, p: [60, 64, 67], m: [[67, 0.5], [69, 0.5], [71, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [64, 0.5]] },
        { b: 38, p: [62, 66, 69], m: [[71, 0.5], [74, 0.5], [76, 0.5], [78, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [69, 0.5]] },
        { b: 40, p: [64, 67, 71], m: [[79, 2], [0, 2]] },
      ],
    },
    // 凱旋號角琶音 — 過關慶祝可用背景
    victory: {
      style: 'chip', tempo: 112,
      bars: [
        { b: 36, p: [60, 64, 67], m: [[60, 1], [64, 1], [67, 1], [72, 1]] },
        { b: 41, p: [57, 60, 65], m: [[65, 1], [69, 1], [72, 1], [77, 1]] },
        { b: 43, p: [59, 62, 67], m: [[67, 1], [71, 1], [74, 1], [79, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 2], [76, 1], [79, 1]] },
        { b: 36, p: [60, 64, 67], m: [[79, 1], [76, 1], [72, 1], [67, 1]] },
        { b: 41, p: [57, 60, 65], m: [[77, 1], [72, 1], [69, 1], [65, 1]] },
        { b: 43, p: [59, 62, 67], m: [[79, 1], [74, 1], [71, 1], [67, 1]] },
        { b: 36, p: [60, 64, 67], m: [[72, 4]] },
      ],
    },
    // 快速緊張 — 天空之城魔王戰
    boss: {
      style: 'chip', tempo: 160,
      bars: [
        { b: 38, p: [62, 65, 69], m: [[74, 0.5], [74, 0.5], [77, 1], [74, 0.5], [72, 0.5], [74, 1]] },
        { b: 38, p: [62, 65, 69], m: [[77, 0.5], [79, 0.5], [81, 1], [79, 0.5], [77, 0.5], [74, 1]] },
        { b: 34, p: [58, 62, 65], m: [[82, 1], [81, 0.5], [79, 0.5], [77, 1], [74, 1]] },
        { b: 33, p: [57, 61, 64], m: [[73, 1], [76, 1], [73, 1], [69, 1]] },
        { b: 38, p: [62, 65, 69], m: [[74, 0.5], [74, 0.5], [77, 1], [74, 0.5], [72, 0.5], [74, 1]] },
        { b: 36, p: [60, 64, 67], m: [[76, 0.5], [76, 0.5], [79, 1], [76, 0.5], [74, 0.5], [76, 1]] },
        { b: 34, p: [58, 62, 65], m: [[77, 1], [79, 1], [81, 1], [82, 1]] },
        { b: 33, p: [57, 61, 64], m: [[81, 2], [73, 2]] },
      ],
    },
  };

  const ZONE_TRACKS = {
    hub: ['home', 'home2', 'home3'],
    youtube: ['home', 'home2'],
    daily: ['home', 'home3'],
    sky: ['explore', 'explore2'],
    listening: ['explore', 'lake', 'explore2'],
    speak: ['explore', 'lake'],
    rpg: ['story', 'story2'],
    builder: ['story', 'story2', 'lake'],
    minecraft: ['playful', 'playful2', 'playful3'],
    candy: ['playful', 'playful2', 'playful3'],
    sling: ['playful2', 'race', 'playful'],
    tower: ['battle', 'battle2', 'battle3'],
    empire: ['battle', 'battle3', 'battle2'],
    roblox: ['battle2', 'race', 'battle'],
    spelling: ['battle', 'race', 'battle2'],
  };

  // ---------- audio plumbing ----------
  function noteFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.16;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  let noiseBuf = null;
  function getNoise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function env(g, t, attack, peak, dur, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, Math.max(t + attack, t + dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function osc(type, freq, out) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(out);
    return o;
  }

  // ---------- voices ----------
  function softLead(t, midi, dur) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1900;
    g.connect(lp).connect(trackGain);
    env(g, t, Math.min(0.12, dur * 0.25), 0.15, dur, Math.min(0.35, dur * 0.4));
    const o = osc('triangle', noteFreq(midi), g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function chipLead(t, midi, dur) {
    const g = ctx.createGain();
    g.connect(trackGain);
    const len = Math.min(dur * 0.85, dur - 0.02);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.075, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.02, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const o = osc('square', noteFreq(midi), g);
    o.start(t);
    o.stop(t + len + 0.03);
  }

  function bassNote(t, midi, dur, chip) {
    const g = ctx.createGain();
    g.connect(trackGain);
    env(g, t, 0.01, chip ? 0.11 : 0.12, dur, Math.min(0.2, dur * 0.4));
    const o = osc(chip ? 'triangle' : 'sine', noteFreq(midi), g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function padChord(t, midis, dur) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(trackGain);
    for (const m of midis) {
      [-4, 4].forEach(cents => {
        const g = ctx.createGain();
        g.connect(lp);
        env(g, t, 0.35, 0.03, dur, 0.5);
        const o = osc('triangle', noteFreq(m), g);
        o.detune.value = cents;
        o.start(t);
        o.stop(t + dur + 0.1);
      });
    }
  }

  function arpNote(t, midi, dur) {
    const g = ctx.createGain();
    g.connect(trackGain);
    env(g, t, 0.01, 0.045, dur, dur * 0.5);
    const o = osc('triangle', noteFreq(midi + 12), g);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function hat(t) {
    const g = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    g.connect(hp).connect(trackGain);
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    const s = ctx.createBufferSource();
    s.buffer = getNoise();
    s.connect(g);
    s.start(t);
    s.stop(t + 0.04);
  }

  function kick(t) {
    const g = ctx.createGain();
    g.connect(trackGain);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const o = osc('sine', 140, g);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    o.start(t);
    o.stop(t + 0.13);
  }

  function snare(t) {
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    g.connect(bp).connect(trackGain);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    const s = ctx.createBufferSource();
    s.buffer = getNoise();
    s.connect(g);
    s.start(t);
    s.stop(t + 0.12);
  }

  // ---------- scheduler (one bar of lookahead) ----------
  function scheduleBar(track, t) {
    const bar = track.bars[barIdx % track.bars.length];
    const beat = 60 / track.tempo;
    const chip = track.style === 'chip';

    // bass
    if (chip) {
      for (let s = 0; s < 8; s++) {
        bassNote(t + s * beat / 2, s % 2 ? bar.b + 12 : bar.b, beat / 2 * 0.9, true);
      }
    } else {
      bassNote(t, bar.b, beat * 4, false);
    }

    // pad
    padChord(t, bar.p, beat * 4);

    // arpeggio (soft-explore flavour)
    if (track.arp) {
      const seq = [0, 1, 2, 1, 0, 1, 2, 1];
      for (let s = 0; s < 8; s++) {
        arpNote(t + s * beat / 2, bar.p[seq[s]], beat / 2 * 0.95);
      }
    }

    // percussion (chip only)
    if (chip) {
      kick(t);
      kick(t + beat * 2);
      snare(t + beat);
      snare(t + beat * 3);
      for (let s = 0; s < 8; s++) hat(t + s * beat / 2);
    }

    // melody
    let off = 0;
    for (const [midi, beats] of bar.m) {
      if (midi > 0) {
        if (chip) chipLead(t + off * beat, midi, beats * beat);
        else softLead(t + off * beat, midi, beats * beat);
      }
      off += beats;
    }

    barIdx++;
  }

  function startScheduler(trackId) {
    stopScheduler();
    const track = TRACKS[trackId];
    if (!track) return;
    getCtx();
    trackGain = ctx.createGain();
    trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
    trackGain.connect(masterGain);
    barIdx = 0;
    nextBarTime = ctx.currentTime + 0.06;
    const barDur = () => (60 / track.tempo) * 4;
    schedTimer = setInterval(() => {
      while (nextBarTime < ctx.currentTime + 0.35) {
        scheduleBar(track, nextBarTime);
        nextBarTime += barDur();
      }
    }, 90);
  }

  function stopScheduler() {
    if (schedTimer) {
      clearInterval(schedTimer);
      schedTimer = null;
    }
    if (trackGain && ctx) {
      // fade out whatever tail is still scheduled, then disconnect
      const g = trackGain;
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      setTimeout(() => { try { g.disconnect(); } catch { /* already gone */ } }, 900);
    }
    trackGain = null;
  }

  // ---------- public API ----------
  function play(trackId) {
    if (!TRACKS[trackId]) return;
    if (currentId === trackId && schedTimer) return;
    currentId = trackId;
    if (!unlocked || !enabled) {
      pendingId = trackId;
      return;
    }
    pendingId = null;
    startScheduler(trackId);
  }

  function playForZone(zoneId) {
    const list = ZONE_TRACKS[zoneId] || ['home'];
    // Same zone as last time and already playing something from its family?
    // Keep it going instead of restarting/rotating (e.g. re-navigating to
    // the same tab, or a track directly forced by a game — like the sky
    // boss track — that already belongs to this zone's rotation).
    if (zoneId === lastZone && list.includes(currentId)) {
      lastZone = zoneId;
      return;
    }
    const count = zoneVisitCount[zoneId] || 0;
    zoneVisitCount[zoneId] = count + 1;
    lastZone = zoneId;
    play(list[count % list.length]);
  }

  function stop() {
    currentId = null;
    pendingId = null;
    stopScheduler();
  }

  function setEnabled(value) {
    enabled = value;
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    if (!value) {
      stopScheduler();
    } else if (currentId || lastZone) {
      const id = currentId || (ZONE_TRACKS[lastZone] || ['home'])[0];
      currentId = null; // force restart
      unlocked ? play(id) : (pendingId = id, currentId = id);
    }
  }

  function isEnabled() { return enabled; }
  function current() { return schedTimer ? currentId : (pendingId || null); }

  // RMS level at the master bus — used by automated tests to confirm the
  // synth graph is actually producing signal
  let analyser = null;
  function debugLevel() {
    if (!ctx || !masterGain) return 0;
    if (!analyser) {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      masterGain.connect(analyser);
    }
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    getCtx();
    if (enabled && (pendingId || currentId)) {
      const id = pendingId || currentId;
      currentId = null;
      play(id);
    }
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) enabled = saved === '1';
    // browsers only allow audio after a user gesture
    ['pointerdown', 'keydown'].forEach(evt =>
      document.addEventListener(evt, unlock, { once: false, passive: true }));
  }

  return { init, play, playForZone, stop, setEnabled, isEnabled, current, debugLevel };
})();
