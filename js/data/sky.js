// Sky Citadel (天空之城) world data — interpreted by js/sky.js.
// Adding an island/bridge here is enough; the engine builds geometry,
// colliders and decoration (seeded by `seed`) automatically.

const SKY_CONFIG = {
  worldSeed: 20260711,
  gravity: -30,
  jumpV: 11,
  walkSpeed: 8,
  sprintMult: 1.6,
  camRadius: 9,
  camPhi: 0.42,
  fogColor: 0xaee3ff,
  fogNear: 120,
  fogFar: 320,
  voidY: -40,          // absolute fall-death height
  maxHearts: 5,
};

// Island types drive colors + decoration in sky.js:
//   grass forest water flower mushroom ruin crystal cloud village ice lava pillars bone storm
const SKY_ISLANDS = [
  { id: 'isle_dawn', name: '晨曦之島', type: 'grass', pos: [0, 20, 0], r: 26, seed: 1 },
  { id: 'isle_meadow', name: '綠茵草原', type: 'grass', pos: [70, 18, -50], r: 20, seed: 2 },
  { id: 'isle_forest', name: '迷霧森林', type: 'forest', pos: [-90, 24, -70], r: 24, seed: 3 },
  { id: 'isle_falls', name: '銀瀑之島', type: 'water', pos: [140, 14, 20], r: 18, seed: 4 },
  { id: 'isle_flower', name: '花語花田', type: 'flower', pos: [-60, 16, 80], r: 16, seed: 5 },
  { id: 'isle_mushroom', name: '蘑菇谷', type: 'mushroom', pos: [30, 10, 110], r: 15, seed: 6 },
  { id: 'isle_ruins', name: '古文明遺跡', type: 'ruin', pos: [-160, 30, 10], r: 22, seed: 7 },
  { id: 'isle_crystal', name: '水晶尖峰', type: 'crystal', pos: [110, 42, -140], r: 18, seed: 8 },
  { id: 'isle_cloud', name: '雲朵牧場', type: 'cloud', pos: [-30, 50, -160], r: 17, seed: 9 },
  { id: 'isle_library', name: '天空圖書館', type: 'ruin', pos: [-180, 44, -150], r: 15, seed: 10 },
  { id: 'isle_market', name: '天空市集', type: 'village', pos: [190, 26, 120], r: 20, seed: 11 },
  { id: 'isle_ice', name: '冰霜之峰', type: 'ice', pos: [-220, 56, 130], r: 16, seed: 12 },
  { id: 'isle_lava', name: '熔岩浮島', type: 'lava', pos: [220, 20, -60], r: 17, seed: 13 },
  { id: 'isle_wind', name: '風之柱群', type: 'pillars', pos: [0, 34, -240], r: 14, seed: 14 },
  { id: 'isle_dragon', name: '龍骨荒島', type: 'bone', pos: [-120, 12, 200], r: 16, seed: 15 },
  { id: 'isle_storm', name: '暴風之眼', type: 'storm', pos: [60, 64, -280], r: 22, seed: 16 },
];

// Bridges / stepping stones between islands. style: plank | stone | stepstones
// quest: only materializes after that quest is cleared (Part 2+)
const SKY_BRIDGES = [
  { from: 'isle_dawn', to: 'isle_meadow', style: 'plank' },
  { from: 'isle_dawn', to: 'isle_forest', style: 'plank' },
  { from: 'isle_meadow', to: 'isle_falls', style: 'plank' },
  { from: 'isle_forest', to: 'isle_ruins', style: 'stone' },
  { from: 'isle_dawn', to: 'isle_flower', style: 'stepstones' },
  { from: 'isle_flower', to: 'isle_mushroom', style: 'plank' },
  { from: 'isle_ruins', to: 'isle_library', style: 'stepstones' },
  { from: 'isle_crystal', to: 'isle_cloud', style: 'stepstones' },
  { from: 'isle_falls', to: 'isle_market', style: 'plank' },
  { from: 'isle_dawn', to: 'isle_crystal', style: 'plank', quest: 'sq_bridge_crystal' },
  { from: 'isle_mushroom', to: 'isle_dragon', style: 'stepstones' },
];

// Cloud jump pads: bouncy discs that launch the player upward.
// launch = upward velocity applied on touch.
const SKY_PADS = [
  { island: 'isle_meadow', dx: 10, dz: 8, launch: 24 },       // meadow → crystal route boost
  { island: 'isle_forest', dx: -8, dz: -10, launch: 22 },
  { island: 'isle_cloud', dx: 6, dz: -6, launch: 26 },        // cloud → wind
  { island: 'isle_wind', dx: 0, dz: -8, launch: 30 },         // wind → storm
  { island: 'isle_flower', dx: -6, dz: 6, launch: 20 },
  { island: 'isle_library', dx: 5, dz: 5, launch: 26 },       // library → ice
  { island: 'isle_market', dx: -8, dz: -6, launch: 22 },
  { island: 'isle_crystal', dx: -6, dz: 8, launch: 26 },
];

// ===== Quests =====
// type: chest | gate | npc | listen | pillars | runes | arena | bridge | race | boss
// diff: easy | medium | hard | boss  (reward tier)
// n: questions / rounds / pairs / mobs / rings / letters-words, by type
// dx/dz: quest object position relative to the island centre
// lock: total quest clears required before this quest opens
const SKY_QUESTS = [
  { id: 'sq_first_chest', island: 'isle_dawn', type: 'chest', name: '新手的寶箱', diff: 'easy', n: 3, dx: 8, dz: -6,
    intro: '這個寶箱被單字咒語鎖住了！答對 3 題就能打開。' },
  { id: 'sq_dawn_npc', island: 'isle_dawn', type: 'npc', name: '島民的問候', diff: 'easy', n: 4, dx: -9, dz: 7, npc: '👵',
    intro: '琪琪奶奶想和你聊聊天，用英語回答她吧！' },
  { id: 'sq_meadow_runes', island: 'isle_meadow', type: 'runes', name: '草原尋字', diff: 'easy', n: 2, dx: -8, dz: -4,
    intro: '字母符文散落在草原上！撿回來拼出正確的單字。' },
  { id: 'sq_meadow_arena', island: 'isle_meadow', type: 'arena', name: '史萊姆入侵', diff: 'easy', n: 3, mob: 'slime', dx: 2, dz: -12,
    intro: '雲史萊姆入侵草原了！用英語魔法擊退牠們。' },
  { id: 'sq_forest_gate', island: 'isle_forest', type: 'gate', name: '迷霧石門', diff: 'easy', n: 4, dx: 6, dz: 5,
    intro: '古老的石門刻著文法謎題，答對 4 題才會敞開。' },
  { id: 'sq_forest_listen', island: 'isle_forest', type: 'listen', name: '森林的回音', diff: 'easy', n: 5, dx: 10, dz: -4,
    intro: '仔細聽森林水晶的聲音，點出你聽到的單字！' },
  { id: 'sq_falls_pillars', island: 'isle_falls', type: 'pillars', name: '瀑布配對石', diff: 'easy', n: 5, dx: -6, dz: 5,
    intro: '把英文單字和中文意思配成對，石柱就會發光！' },
  { id: 'sq_flower_npc', island: 'isle_flower', type: 'npc', name: '花田茶會', diff: 'medium', n: 5, dx: 6, dz: -5, npc: '🧚',
    intro: '花仙子邀請你參加茶會，禮貌地用英語應對吧！' },
  { id: 'sq_mushroom_chest', island: 'isle_mushroom', type: 'chest', name: '蘑菇下的秘寶', diff: 'medium', n: 4, dx: -5, dz: -6,
    intro: '大蘑菇底下藏著秘寶，答對單字題就是你的！' },
  { id: 'sq_bridge_crystal', island: 'isle_dawn', type: 'bridge', name: '通往水晶的橋', diff: 'medium', n: 3, dx: 15, dz: -19,
    intro: '逐字母拼出單字，每拼對一個字就會出現一段橋板！' },
  { id: 'sq_ruins_gate', island: 'isle_ruins', type: 'gate', name: '古文明之門', diff: 'medium', n: 5, dx: 5, dz: -7,
    intro: '遺跡之門考驗你的文法智慧，答對 5 題！' },
  { id: 'sq_ruins_runes', island: 'isle_ruins', type: 'runes', name: '失落的銘文', diff: 'medium', n: 2, dx: -8, dz: 6,
    intro: '收集失落的字母，還原古文明的銘文。' },
  { id: 'sq_crystal_listen', island: 'isle_crystal', type: 'listen', name: '共鳴水晶', diff: 'medium', n: 6, dx: 5, dz: -5,
    intro: '水晶會唸出單字，找到和聲音共鳴的那一顆！' },
  { id: 'sq_cloud_race', island: 'isle_cloud', type: 'race', name: '雲海飛環', diff: 'medium', n: 8, time: 60, dx: -5, dz: 4,
    intro: '限時穿越雲海中的光環！途中還要回答單字題。' },
  { id: 'sq_library_pillars', island: 'isle_library', type: 'pillars', name: '圖書館書架', diff: 'medium', n: 6, dx: -5, dz: -4,
    intro: '幫圖書館把英文書和中文書名排在一起！' },
  { id: 'sq_market_npc', island: 'isle_market', type: 'npc', name: '市集大採購', diff: 'medium', n: 6, dx: 6, dz: 7, npc: '🧑‍🍳',
    intro: '市集老闆只聽得懂英語，幫大家完成採購吧！' },
  { id: 'sq_lava_arena', island: 'isle_lava', type: 'arena', name: '熔岩守衛', diff: 'hard', n: 4, mob: 'wisp', dx: -5, dz: 5,
    intro: '熔岩守衛甦醒了！用進階英語魔法迎戰。' },
  { id: 'sq_ice_chest', island: 'isle_ice', type: 'chest', name: '冰封寶庫', diff: 'hard', n: 5, dx: 4, dz: -6,
    intro: '千年冰封的寶庫，只有單字大師能開啟。' },
  { id: 'sq_wind_race', island: 'isle_wind', type: 'race', name: '風柱競速', diff: 'hard', n: 10, time: 55, dx: 6, dz: 3,
    intro: '在風之柱間高速穿環，挑戰極限！' },
  { id: 'sq_dragon_runes', island: 'isle_dragon', type: 'runes', name: '龍骨咒文', diff: 'hard', n: 3, dx: -6, dz: -5,
    intro: '龍骨間散落著咒文字母，拼出遠古之語。' },
  { id: 'sq_dragon_arena', island: 'isle_dragon', type: 'arena', name: '骨龍的爪牙', diff: 'hard', n: 5, mob: 'bat', dx: 7, dz: 6, lock: 8,
    intro: '骨龍的爪牙守著荒島，這是場硬仗！' },
  { id: 'sq_storm_boss', island: 'isle_storm', type: 'boss', name: '暴風巨像', diff: 'boss', n: 8, dx: 0, dz: 0, lock: 12,
    intro: '吞噬天空的暴風巨像！集結你所有的英語之力，終結這場風暴！' },
];

// ===== Mobs (Part 3 combat) =====
const SKY_MOBS = [
  { id: 'slime', name: '雲史萊姆', hp: 1, quiz: 'vocab', diff: 'easy', color: 0x8fd4ff, speed: 3 },
  { id: 'wisp', name: '風靈', hp: 2, quiz: 'vocab', diff: 'medium', color: 0xa8ffd8, speed: 3.8 },
  { id: 'bat', name: '暗影蝙蝠', hp: 2, quiz: 'grammar', diff: 'medium', color: 0x5a4a7a, speed: 4.5 },
];

// Skin id → body tint for the voxel hero (head shows the emoji itself)
const SKY_SKIN_TINTS = {
  default: 0x3aa6a0,
  diamond_knight: 0x7fd4ff,
  fire_mage: 0xff7a45,
  ocean_explorer: 0x2e7bc4,
  shadow_ninja: 0x3a3a4e,
  rainbow_unicorn: 0xff9de2,
  space_astronaut: 0xcfd8e8,
  pixel_robot: 0x9aa7b8,
  dragon_master: 0x51b56d,
  blocky_miner: 0xb8802f,
  ender_wizard: 0x8f6bff,
  star_savior: 0xffe066,
  golden_champion: 0xf5c518,
};
