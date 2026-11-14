// 天空之城 gameplay layer data (star coins / pets / eggs / obby courses) — interpreted by js/sky-play.js.
// Owned by the PLAY workstream. Run the reach checker after editing courses or physics:
//   node <scratchpad>/play/check_sky_play.js <repo root>
// (see the PLAY report — it proves every course is completable with the base move set
// and that the new moves + courses open no gated island).

// ----- movement abilities (read by js/sky.js updatePlayer and by the checker) -----
const SKY_PLAY_PHYS = {
  airJumps: 1,          // everyone; the 傳說勇者 title (perks.doubleJump) adds one more
  airJumpMult: 0.8,     // air-jump velocity = SKY_CONFIG.jumpV × this (NOT scaled by title / boot jump bonuses — keeps secret stairways honest)
  dashSpeed: 20,        // horizontal speed during a dash (units/s), gravity paused
  dashTime: 0.18,       // seconds
  dashCooldown: 0.5,    // seconds between dashes; one dash per airtime
};

// ----- star coins -----
const SKY_COIN_RULES = {
  magnet: 2.4,          // base pickup radius (pets add a % on top)
  respawnMin: 4,        // a world coin group refills this many minutes after its FIRST coin was taken
  comboWindow: 0.75,    // seconds between pickups that keep the chime climbing
  courseFirstClear: 60, // coin bonus for a course's first clear (×1 / ×1.5 / ×2 by difficulty)
  courseReplay: 15,     // coin bonus for any later clear
};

// World coin groups (island-local coordinates, y above the island top).
// shape: ring {r, n, y} | line {a:[x,y,z], b:[x,y,z], n} | arc {a, b, n, h} (parabola peaking h above the chord)
// Bridges get their own coin trails automatically (js/sky-play.js buildBridgeCoins).
const SKY_COIN_GROUPS = [
  // 晨曦之島 — spawn: a ring round the centre and trails that lead to the egg stand and the tutorial arch
  { id: 'cg_dawn_ring', isle: 'isle_dawn', shape: 'ring', r: 5, n: 10, y: 1.1 },
  { id: 'cg_dawn_egg', isle: 'isle_dawn', shape: 'line', a: [-1, 1.1, -3], b: [-5, 1.1, -6], n: 4 },
  { id: 'cg_dawn_tut', isle: 'isle_dawn', shape: 'line', a: [4, 1.1, 3.5], b: [13, 1.1, 10.5], n: 6 },
  { id: 'cg_dawn_hop', isle: 'isle_dawn', shape: 'arc', a: [-14, 1.1, 0], b: [-20, 1.1, -4], n: 6, h: 2.2 },
  { id: 'cg_dawn_rim', isle: 'isle_dawn', shape: 'ring', r: 21, n: 16, y: 1.1 },
  // 綠茵草原
  { id: 'cg_meadow_ring', isle: 'isle_meadow', shape: 'ring', r: 6, n: 10, y: 1.1 },
  { id: 'cg_meadow_pad', isle: 'isle_meadow', shape: 'line', a: [10, 3, 8], b: [10, 8.5, 8], n: 5 },
  { id: 'cg_meadow_hop', isle: 'isle_meadow', shape: 'arc', a: [-14, 1.1, 6], b: [-6, 1.1, 12], n: 6, h: 2.6 },
  // 迷霧森林
  { id: 'cg_forest_ring', isle: 'isle_forest', shape: 'ring', r: 8, n: 12, y: 1.1 },
  { id: 'cg_forest_pad', isle: 'isle_forest', shape: 'line', a: [-8, 3, -10], b: [-8, 7.5, -10], n: 5 },
  // 銀瀑之島
  { id: 'cg_falls_ring', isle: 'isle_falls', shape: 'ring', r: 5, n: 9, y: 1.1 },
  { id: 'cg_falls_arc', isle: 'isle_falls', shape: 'arc', a: [-12, 1.1, -4], b: [-4, 1.1, -12], n: 6, h: 2.4 },
  // 花語花田
  { id: 'cg_flower_ring', isle: 'isle_flower', shape: 'ring', r: 7, n: 12, y: 1.1 },
  { id: 'cg_flower_pad', isle: 'isle_flower', shape: 'line', a: [-6, 3, 6], b: [-6, 6.5, 6], n: 4 },
  // 蘑菇谷
  { id: 'cg_mush_ring', isle: 'isle_mushroom', shape: 'ring', r: 5, n: 8, y: 1.1 },
  // 古文明遺跡
  { id: 'cg_ruins_ring', isle: 'isle_ruins', shape: 'ring', r: 9, n: 12, y: 1.1 },
  { id: 'cg_ruins_arc', isle: 'isle_ruins', shape: 'arc', a: [-15, 1.1, -2], b: [-5, 1.1, 14], n: 8, h: 2.5 },
  // 天空市集
  { id: 'cg_market_ring', isle: 'isle_market', shape: 'ring', r: 7, n: 12, y: 1.1 },
  { id: 'cg_market_pad', isle: 'isle_market', shape: 'line', a: [-8, 3, -6], b: [-8, 8, -6], n: 5 },
  // 熔岩浮島
  { id: 'cg_lava_ring', isle: 'isle_lava', shape: 'ring', r: 6, n: 10, y: 1.1 },
  // 龍骨荒島 / 天空圖書館 / 冰霜之峰
  { id: 'cg_dragon_ring', isle: 'isle_dragon', shape: 'ring', r: 6, n: 10, y: 1.1 },
  { id: 'cg_library_pad', isle: 'isle_library', shape: 'line', a: [5, 3, 5], b: [5, 9, 5], n: 5 },
  { id: 'cg_ice_ring', isle: 'isle_ice', shape: 'ring', r: 6, n: 10, y: 1.1 },
  // 水晶尖峰 / 雲朵牧場 / 風之柱群 (after the crystal bridge quest)
  { id: 'cg_crystal_ring', isle: 'isle_crystal', shape: 'ring', r: 6, n: 10, y: 1.1 },
  { id: 'cg_cloud_ring', isle: 'isle_cloud', shape: 'ring', r: 6, n: 10, y: 1.1 },
  { id: 'cg_wind_pad', isle: 'isle_wind', shape: 'line', a: [0, 3, -8], b: [0, 11, -8], n: 6 },
  // 銀河 / 地心 hubs (later regions still get a sprinkle)
  { id: 'cg_gx_hub_ring', isle: 'isle_gx_hub', shape: 'ring', r: 7, n: 12, y: 1.1 },
  { id: 'cg_gx_aurora_ring', isle: 'isle_gx_aurora', shape: 'ring', r: 6, n: 10, y: 1.1 },
  { id: 'cg_und_hub_ring', isle: 'isle_und_hub', shape: 'ring', r: 6, n: 10, y: 1.1 },
];

// ----- pets -----
// Each pet's name IS the English word the kid learns by owning it (spoken on hatch).
// Perks only ever touch coins/movement-side fun — never XP or gems.
//   magnet: +% coin pickup radius ・ lucky: chance a coin counts double
// Look: body/belly/accent colours, ears, tail and extras drive the procedural builder.
const SKY_PET_RARITY = {
  common: { name: '普通', color: '#4cbf6a', hex: 0x7dffa0, stars: 1 },
  rare: { name: '稀有', color: '#5ab8ff', hex: 0x3aa0ff, stars: 2 },
  epic: { name: '史詩', color: '#c77dff', hex: 0xb05cff, stars: 3 },
  legendary: { name: '傳說', color: '#ffc93a', hex: 0xffb800, stars: 4 },
};
const SKY_PETS = [
  { id: 'bunny', en: 'bunny', zh: '兔子', rarity: 'common', body: 0xfff4f6, belly: 0xffd6e2, accent: 0xff9ec0,
    ears: 'long', tail: 'puff', extras: ['cheeks'], perk: { magnet: 0.15 } },
  { id: 'chick', en: 'chick', zh: '小雞', rarity: 'common', body: 0xffe066, belly: 0xfff3b0, accent: 0xff9f1c,
    ears: 'none', tail: 'none', extras: ['beak', 'tinywings', 'tuft', 'cheeks'], perk: { magnet: 0.1, lucky: 0.03 } },
  { id: 'frog', en: 'frog', zh: '青蛙', rarity: 'common', body: 0x7ed957, belly: 0xd8f5b0, accent: 0x3e9e3a,
    ears: 'none', tail: 'none', extras: ['frogeyes', 'cheeks'], perk: { magnet: 0.2 } },
  { id: 'pig', en: 'pig', zh: '小豬', rarity: 'common', body: 0xffb3c6, belly: 0xffd6e0, accent: 0xff8fab,
    ears: 'pointy', tail: 'curl', extras: ['snout'], perk: { lucky: 0.05 } },
  { id: 'puppy', en: 'puppy', zh: '小狗', rarity: 'common', body: 0xe8b77d, belly: 0xfff0dc, accent: 0x8a5a33,
    ears: 'floppy', tail: 'wag', extras: ['nose', 'cheeks'], perk: { magnet: 0.15, lucky: 0.02 } },
  { id: 'fox', en: 'fox', zh: '狐狸', rarity: 'rare', body: 0xff8a3d, belly: 0xfff4e6, accent: 0x3a2418,
    ears: 'pointy', tail: 'fluffy', extras: ['nose'], perk: { magnet: 0.3, lucky: 0.04 } },
  { id: 'panda', en: 'panda', zh: '熊貓', rarity: 'rare', body: 0xf8f8f8, belly: 0xffffff, accent: 0x2b2b33,
    ears: 'round', tail: 'none', extras: ['patches', 'cheeks'], perk: { magnet: 0.35 } },
  { id: 'penguin', en: 'penguin', zh: '企鵝', rarity: 'rare', body: 0x2f3a56, belly: 0xffffff, accent: 0xffb020,
    ears: 'none', tail: 'none', extras: ['beak', 'flippers', 'cheeks'], perk: { lucky: 0.1 } },
  { id: 'owl', en: 'owl', zh: '貓頭鷹', rarity: 'rare', body: 0x9c6b45, belly: 0xf0d9b5, accent: 0xffc93a,
    ears: 'tuft', tail: 'none', extras: ['beak', 'tinywings', 'bigeyes'], perk: { magnet: 0.25, lucky: 0.05 } },
  { id: 'unicorn', en: 'unicorn', zh: '獨角獸', rarity: 'epic', body: 0xffffff, belly: 0xfff0fb, accent: 0xff8fd8,
    glow: 0xffd84a, ears: 'pointy', tail: 'mane', extras: ['horn', 'mane', 'cheeks'], perk: { magnet: 0.5, lucky: 0.08 } },
  { id: 'dragon', en: 'dragon', zh: '小龍', rarity: 'epic', body: 0x3ec9a7, belly: 0xc8f7e1, accent: 0x1f8a74,
    glow: 0x7dffe0, ears: 'none', tail: 'spike', extras: ['horns', 'wings', 'spines'], perk: { magnet: 0.4, lucky: 0.12 } },
  { id: 'jellyfish', en: 'jellyfish', zh: '水母', rarity: 'epic', body: 0x9fd8ff, belly: 0xd8f0ff, accent: 0xff9fe0,
    glow: 0x7fd0ff, ears: 'none', tail: 'none', extras: ['tentacles', 'dome', 'cheeks'], perk: { magnet: 0.6 } },
  { id: 'phoenix', en: 'phoenix', zh: '鳳凰', rarity: 'legendary', body: 0xff6a2a, belly: 0xffd36a, accent: 0xffe14a,
    glow: 0xff7a1a, ears: 'none', tail: 'flame', extras: ['beak', 'wings', 'crest', 'aura'], perk: { magnet: 0.8, lucky: 0.15 } },
  { id: 'whale', en: 'whale', zh: '星空鯨', rarity: 'legendary', body: 0x3b4fd8, belly: 0xa9c8ff, accent: 0xfff27a,
    glow: 0x8fa8ff, ears: 'none', tail: 'fin', extras: ['stars', 'spout', 'aura', 'cheeks'], perk: { magnet: 1.0, lucky: 0.1 } },
];

// Eggs sold at the 晨曦之島 egg stand (prices in star coins). `q` = English questions to hatch.
const SKY_EGGS = [
  { id: 'egg_meadow', name: '草原蛋', e: '🥚', price: 120, q: 2, diff: 'easy', shell: 0xfff3d6, spot: 0x8fd16a,
    odds: { common: 72, rare: 23, epic: 5 } },
  { id: 'egg_star', name: '星光蛋', e: '✨', price: 350, q: 3, diff: 'medium', shell: 0xcfe6ff, spot: 0x5ab8ff,
    odds: { common: 20, rare: 50, epic: 25, legendary: 5 } },
  { id: 'egg_legend', name: '傳說蛋', e: '👑', price: 900, q: 4, diff: 'medium', shell: 0xffe9a8, spot: 0xc77dff,
    odds: { rare: 20, epic: 50, legendary: 30 } },
];
const SKY_EGG_STAND = { isle: 'isle_dawn', dx: -7, dz: -10, face: 0.35 };   // face: yaw toward the spawn point
const SKY_PET_SLOTS = 2;            // pets that can follow at once
const SKY_PET_DUP_REFUND = 0.3;     // a duplicate hatch refunds this share of the egg price and adds a ★

// ----- obby courses (空中跑酷) -----
// A course hangs off an island rim. Local frame: origin = centre of the start platform
// (just past the rim, at the island's top height), +z = outward along `heading`
// (degrees, 0 = +x, 90 = +z), +x = right when facing outward. y is relative to the island top.
// Elements are listed in PATH order (the checker walks supports in this order):
//   start {w,d} ・ p {x,y,z,w,d} platform ・ check {…} checkpoint ・ move {…, ax,ay,az, T}
//   spin {…, rate} ・ vanish {…, T, on, ph} ・ conv {…, vx, vz} ・ bounce {x,y,z, launch}
//   gate {z, y, q:'meaning'|'listen'|'blank'} (z = front edge of the approach platform;
//        builds 3 answer platforms + an exit platform that only turns solid once solved)
//   finish {x,y,z} ・ off-path: kill {x,y,z,w,d} ・ sweep {x,y,z,len,rate} ・ sign {x,y,z,text}
//   coins {a:[x,y,z], b:[x,y,z], n, h?}
// Each course must pass the checker: every step reachable with the BASE move set
// (walk speed for easy/tutorial, sprint allowed for medium/hard).
const SKY_GATE = { ansZ: 3.3, ansX: 4.4, ansW: 3.4, ansD: 3.4, exitZ: 10, exitW: 13, exitD: 6 };
const SKY_COURSES = [
  {
    id: 'ob_tutorial', name: '新手跑酷訓練場', e: '🐣', isle: 'isle_dawn', heading: 38, diff: 'easy', tutorial: true,
    color: 0x5ad1ff, intro: '跳 → 二段跳 → 衝刺 → 存檔點 → 單字門，一分鐘學會所有招式！',
    els: [
      { t: 'start', w: 6, d: 6 },
      { t: 'sign', x: -5, y: 2.4, z: 6, text: '⬆️ 按 Space（手機 🦘）跳過去！' },
      { t: 'p', x: 0, y: 0, z: 7, w: 5, d: 4 },
      { t: 'p', x: 0, y: 1, z: 12, w: 5, d: 3.5 },
      { t: 'p', x: 1.5, y: 2, z: 17, w: 4.5, d: 3.5 },
      { t: 'sign', x: -4.2, y: 4.4, z: 17, text: '🦘🦘 空中再按一次跳＝二段跳！' },
      { t: 'coins', a: [1.5, 3, 19.5], b: [1.5, 3, 24.5], n: 5, h: 2.8 },
      { t: 'p', x: 1.5, y: 2, z: 27, w: 5, d: 4 },
      { t: 'check', x: 1.5, y: 2, z: 33, w: 6, d: 5 },
      { t: 'sign', x: -4.5, y: 4.4, z: 33, text: '💨 跳起來再按 C（手機 💨）衝刺！' },
      { t: 'coins', a: [1.5, 3.4, 36.5], b: [1.5, 3.4, 44], n: 6, h: 2.4 },
      { t: 'p', x: 1.5, y: 2, z: 47, w: 5, d: 4 },
      { t: 'check', x: 1.5, y: 2, z: 53, w: 7, d: 5 },
      { t: 'sign', x: -5.2, y: 4.4, z: 53, text: '🚩 存檔點　🪧 走到正確的英文上！' },
      { t: 'gate', z: 55.5, y: 2, q: 'meaning' },
      { t: 'bounce', x: 1.5, y: 2, z: 67, launch: 18 },
      { t: 'sign', x: -4.6, y: 4.4, z: 66, text: '🟡 踩彈跳墊飛上去！' },
      { t: 'check', x: 1.5, y: 7, z: 73, w: 7, d: 5 },
      { t: 'gate', z: 75.5, y: 7, q: 'listen' },
      { t: 'coins', a: [-2, 8.2, 86], b: [5, 8.2, 86], n: 5 },
      { t: 'finish', x: 1.5, y: 7, z: 92 },
    ],
  },
  {
    id: 'ob_meadow', name: '彩虹草原跑酷', e: '🌈', isle: 'isle_meadow', heading: -32, diff: 'easy',
    color: 0xff7ab8, intro: '會動的平台和輸送帶！小心紅色的霓虹磚。',
    els: [
      { t: 'start', w: 6, d: 6 },
      { t: 'p', x: 0, y: 0.5, z: 7.5, w: 4, d: 4 },
      { t: 'move', x: 0, y: 0.5, z: 14.5, w: 4, d: 4, ax: 0, ay: 0, az: 5, T: 4 },
      { t: 'p', x: 0, y: 0.5, z: 26, w: 5, d: 4 },
      { t: 'conv', x: 0, y: 0.5, z: 33, w: 4, d: 10, vx: 2.4, vz: 0 },
      { t: 'kill', x: 4.5, y: 0.3, z: 33, w: 4, d: 10 },
      { t: 'check', x: 0, y: 0.5, z: 42, w: 6, d: 5 },
      { t: 'gate', z: 44.5, y: 0.5, q: 'meaning' },
      { t: 'move', x: 0, y: 0.5, z: 61, w: 4, d: 4, ax: 5, ay: 0, az: 0, T: 4.5 },
      { t: 'coins', a: [0, 2, 59.5], b: [5, 2, 61.5], n: 4 },
      { t: 'p', x: 5, y: 1.5, z: 68, w: 4, d: 4 },
      { t: 'p', x: 0, y: 2.5, z: 74, w: 4, d: 4 },
      { t: 'kill', x: -2.5, y: 2.3, z: 79, w: 3, d: 3 },
      { t: 'check', x: 2, y: 2.5, z: 81, w: 6, d: 5 },
      { t: 'gate', z: 83.5, y: 2.5, q: 'blank' },
      { t: 'conv', x: 0, y: 2.5, z: 101, w: 4, d: 8, vx: 0, vz: 2.6 },
      { t: 'p', x: 0, y: 3.5, z: 108, w: 5, d: 3 },
      { t: 'move', x: 0, y: 3.5, z: 113, w: 4, d: 4, ax: 0, ay: 4, az: 0, T: 5 },
      { t: 'check', x: 0, y: 7.5, z: 119.5, w: 6, d: 5 },
      { t: 'gate', z: 122, y: 7.5, q: 'meaning' },
      { t: 'finish', x: 0, y: 7.5, z: 139.5 },
    ],
  },
  {
    id: 'ob_forest', name: '迷霧森林藤蔓關', e: '🍃', isle: 'isle_forest', heading: -95, diff: 'medium',
    color: 0x7dff9a, intro: '旋轉平台、會消失的葉片和掃過來的橫桿！',
    els: [
      { t: 'start', w: 6, d: 6 },
      { t: 'vanish', x: 0, y: 0.5, z: 7.5, w: 4, d: 4, T: 3, on: 0.7, ph: 0 },
      { t: 'vanish', x: 0, y: 1, z: 14, w: 4, d: 4, T: 3, on: 0.7, ph: 0.35 },
      { t: 'p', x: 0, y: 1.5, z: 20.5, w: 6, d: 4 },
      { t: 'spin', x: 0, y: 1.5, z: 30, w: 12, d: 3, rate: 0.7 },
      { t: 'p', x: 0, y: 1.5, z: 39.5, w: 6, d: 4 },
      { t: 'check', x: 0, y: 1.5, z: 45, w: 7, d: 5 },
      { t: 'gate', z: 47.5, y: 1.5, q: 'blank' },
      { t: 'p', x: 0, y: 1.5, z: 66, w: 8, d: 8 },
      { t: 'sweep', x: 0, y: 1.5, z: 66, len: 4, rate: 1.3 },
      { t: 'vanish', x: -4, y: 2.5, z: 75, w: 3.5, d: 3.5, T: 2.6, on: 0.65, ph: 0 },
      { t: 'vanish', x: 0, y: 3.5, z: 81, w: 3.5, d: 3.5, T: 2.6, on: 0.65, ph: 0.33 },
      { t: 'vanish', x: 4, y: 4.5, z: 87, w: 3.5, d: 3.5, T: 2.6, on: 0.65, ph: 0.66 },
      { t: 'check', x: 4, y: 4.5, z: 93.5, w: 7, d: 5 },
      { t: 'gate', z: 96, y: 4.5, q: 'listen' },
      { t: 'spin', x: 0, y: 4.5, z: 117, w: 14, d: 3, rate: -0.8 },
      { t: 'p', x: 0, y: 5.5, z: 127.5, w: 5, d: 4 },
      { t: 'check', x: 0, y: 5.5, z: 133.5, w: 7, d: 5 },
      { t: 'gate', z: 136, y: 5.5, q: 'meaning' },
      { t: 'finish', x: 0, y: 5.5, z: 153.5 },
    ],
  },
  {
    id: 'ob_falls', name: '銀瀑彈跳急流', e: '💦', isle: 'isle_falls', heading: 15, diff: 'medium',
    color: 0x4fc3ff, intro: '彈跳墊一路往上，搭上急流輸送帶衝刺！',
    els: [
      { t: 'start', w: 6, d: 6 },
      { t: 'bounce', x: 0, y: 0, z: 2, launch: 17 },
      { t: 'p', x: 0, y: 4, z: 10, w: 5, d: 4 },
      { t: 'conv', x: 0, y: 4, z: 18, w: 4, d: 10, vx: 0, vz: -3 },
      { t: 'p', x: 0, y: 4, z: 26, w: 5, d: 4 },
      { t: 'move', x: -5, y: 4, z: 34, w: 4, d: 4, ax: 10, ay: 0, az: 0, T: 5 },
      { t: 'check', x: 0, y: 4, z: 42, w: 7, d: 5 },
      { t: 'gate', z: 44.5, y: 4, q: 'meaning' },
      { t: 'bounce', x: 0, y: 4, z: 56, launch: 18 },
      { t: 'p', x: 0, y: 9, z: 62, w: 4, d: 4 },
      { t: 'kill', x: 0, y: 9, z: 67, w: 6, d: 2 },
      { t: 'p', x: 0, y: 9, z: 72.5, w: 6, d: 6 },
      { t: 'sweep', x: 0, y: 9, z: 72.5, len: 3, rate: 1.8 },
      { t: 'conv', x: 0, y: 9, z: 82, w: 4, d: 10, vx: 0, vz: 4 },
      { t: 'check', x: 0, y: 9, z: 91, w: 7, d: 5 },
      { t: 'gate', z: 93.5, y: 9, q: 'blank' },
      { t: 'bounce', x: 0, y: 9, z: 105, launch: 19 },
      { t: 'check', x: 0, y: 15, z: 113, w: 7, d: 5 },
      { t: 'gate', z: 115.5, y: 15, q: 'listen' },
      { t: 'finish', x: 0, y: 15, z: 133 },
    ],
  },
  {
    id: 'ob_lava', name: '熔岩霓虹高塔', e: '🌋', isle: 'isle_lava', heading: 25, diff: 'hard',
    color: 0xff5a2a, intro: '高手專用！消失磚、掃桿、移動平台全部一起來。',
    els: [
      { t: 'start', w: 6, d: 6 },
      { t: 'p', x: 0, y: 1, z: 8, w: 3.5, d: 3.5 },
      { t: 'vanish', x: 0, y: 2, z: 15, w: 3.5, d: 3.5, T: 2.4, on: 0.6, ph: 0.2 },
      { t: 'p', x: 0, y: 3, z: 22, w: 3.5, d: 3.5 },
      { t: 'move', x: 0, y: 3, z: 30, w: 3.5, d: 3.5, ax: 0, ay: 3, az: 6, T: 4 },
      { t: 'p', x: 0, y: 6, z: 44, w: 6, d: 6 },
      { t: 'sweep', x: 0, y: 6, z: 44, len: 3, rate: 2 },
      { t: 'check', x: 0, y: 6, z: 50.5, w: 7, d: 5 },
      { t: 'gate', z: 53, y: 6, q: 'blank' },
      { t: 'spin', x: 0, y: 6, z: 74, w: 14, d: 2.6, rate: 1.0 },
      { t: 'kill', x: 0, y: 5.2, z: 74, w: 3, d: 3 },
      { t: 'vanish', x: 0, y: 7, z: 84.5, w: 3.5, d: 3.5, T: 2.5, on: 0.6, ph: 0 },
      { t: 'vanish', x: 0, y: 8, z: 91, w: 3.5, d: 3.5, T: 2.5, on: 0.6, ph: 0.5 },
      { t: 'check', x: 0, y: 8, z: 97.5, w: 7, d: 5 },
      { t: 'gate', z: 100, y: 8, q: 'meaning' },
      { t: 'conv', x: 0, y: 8, z: 119, w: 4, d: 8, vx: 3, vz: 0 },
      { t: 'kill', x: 4.5, y: 7.8, z: 119, w: 3, d: 8 },
      { t: 'move', x: 0, y: 8, z: 128, w: 3.5, d: 3.5, ax: 0, ay: 4, az: 0, T: 4 },
      { t: 'p', x: 0, y: 12, z: 135, w: 4, d: 4 },
      { t: 'check', x: 0, y: 12, z: 141.5, w: 7, d: 5 },
      { t: 'gate', z: 144, y: 12, q: 'listen' },
      { t: 'bounce', x: 0, y: 12, z: 157, launch: 18 },
      { t: 'check', x: 0, y: 17, z: 164, w: 7, d: 5 },
      { t: 'gate', z: 166.5, y: 17, q: 'blank' },
      { t: 'finish', x: 0, y: 17, z: 184 },
    ],
  },
];
