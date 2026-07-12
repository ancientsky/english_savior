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
  // ===== 銀河空島 (galaxy region — reached via the 銀河傳送門 after 22 clears) =====
  { id: 'isle_gx_hub', name: '星門樞紐', type: 'star', pos: [420, 100, 380], r: 22, seed: 17 },
  { id: 'isle_gx_nebula', name: '紫星雲海', type: 'nebula', pos: [350, 108, 300], r: 18, seed: 18 },
  { id: 'isle_gx_moon', name: '月岩高地', type: 'moon', pos: [500, 96, 310], r: 18, seed: 19 },
  { id: 'isle_gx_comet', name: '彗星尾跡', type: 'comet', pos: [330, 120, 420], r: 15, seed: 20 },
  { id: 'isle_gx_aurora', name: '極光平原', type: 'aurora', pos: [480, 116, 460], r: 19, seed: 21 },
  { id: 'isle_gx_alien', name: '外星小村', type: 'alien', pos: [560, 104, 400], r: 17, seed: 22 },
  { id: 'isle_gx_ring', name: '星環之丘', type: 'star', pos: [400, 130, 500], r: 15, seed: 23 },
  { id: 'isle_gx_dust', name: '星塵沙洲', type: 'moon', pos: [280, 100, 360], r: 14, seed: 24 },
  { id: 'isle_gx_twin', name: '雙子星島', type: 'nebula', pos: [530, 128, 520], r: 14, seed: 25 },
  { id: 'isle_gx_void', name: '虛空邊境', type: 'comet', pos: [300, 136, 500], r: 13, seed: 26 },
  { id: 'isle_gx_crown', name: '星冠聖殿', type: 'aurora', pos: [430, 148, 570], r: 16, seed: 27 },
  { id: 'isle_gx_dragon', name: '暗星龍巢', type: 'alien', pos: [560, 140, 590], r: 20, seed: 28 },
  // ===== 隱藏秘境（透過隱藏傳送門進入，需先在既有島嶼上發現入口）=====
  { id: 'isle_sc_cave', name: '水晶洞窟', type: 'cave', pos: [-420, 30, 300], r: 20, seed: 29, secret: true },
  { id: 'isle_sc_lake', name: '鏡之湖', type: 'lake', pos: [380, 45, -360], r: 24, seed: 30, secret: true },
  { id: 'isle_sc_mist', name: '迷霧秘境', type: 'mist', pos: [-380, 85, -340], r: 19, seed: 31, secret: true },
  { id: 'isle_sc_temple', name: '星影神殿', type: 'temple', pos: [0, 130, 520], r: 22, seed: 32, secret: true },
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
  // routes below keep every island escapable on foot — the jump pads alone
  // can't cross these gaps (pads only launch upward ~launch²/60 units)
  { from: 'isle_cloud', to: 'isle_wind', style: 'stepstones' },   // 雲朵(50)→風柱(34)
  { from: 'isle_wind', to: 'isle_storm', style: 'stepstones' },   // 風柱(34)→暴風(64) 攀登段
  { from: 'isle_ruins', to: 'isle_ice', style: 'stepstones' },    // 遺跡(30)→冰霜(56)
  { from: 'isle_falls', to: 'isle_lava', style: 'stepstones' },   // 銀瀑(14)→熔岩(20)
  // ===== 銀河空島內部路網（全連通；暗星龍巢由雙子星島常規路＋星冠任務橋雙路線）=====
  { from: 'isle_gx_hub', to: 'isle_gx_nebula', style: 'stepstones' },
  { from: 'isle_gx_hub', to: 'isle_gx_moon', style: 'stepstones' },
  { from: 'isle_gx_hub', to: 'isle_gx_comet', style: 'stepstones' },
  { from: 'isle_gx_hub', to: 'isle_gx_aurora', style: 'plank' },
  { from: 'isle_gx_aurora', to: 'isle_gx_alien', style: 'plank' },
  { from: 'isle_gx_aurora', to: 'isle_gx_ring', style: 'stepstones' },
  { from: 'isle_gx_nebula', to: 'isle_gx_dust', style: 'stepstones' },
  { from: 'isle_gx_comet', to: 'isle_gx_void', style: 'stepstones' },
  { from: 'isle_gx_ring', to: 'isle_gx_crown', style: 'stepstones' },
  { from: 'isle_gx_crown', to: 'isle_gx_twin', style: 'stepstones' },
  { from: 'isle_gx_twin', to: 'isle_gx_dragon', style: 'stepstones' },
  { from: 'isle_gx_crown', to: 'isle_gx_dragon', style: 'plank', quest: 'sqg_crown_bridge' },
];

// Portals: special interactables that teleport between regions.
// lock = total quest clears required before the portal activates.
const SKY_PORTALS = [
  { id: 'portal_dawn', island: 'isle_dawn', dx: -2, dz: -16, to: 'isle_gx_hub',
    lock: 22, name: '銀河傳送門' },
  { id: 'portal_hub', island: 'isle_gx_hub', dx: 0, dz: 9, to: 'isle_dawn',
    name: '回程傳送門' },

  // ===== 隱藏傳送門（marker 藏到玩家靠近 12 格內才會顯現）=====
  { id: 'portal_sc_cave_in', island: 'isle_dawn', dx: -18, dz: 12, to: 'isle_sc_cave',
    name: '水晶洞窟入口', secret: true },
  { id: 'portal_sc_cave_out', island: 'isle_sc_cave', dx: 0, dz: -16, to: 'isle_dawn',
    name: '回到晨曦之島' },
  { id: 'portal_sc_lake_in', island: 'isle_forest', dx: -14, dz: 14, to: 'isle_sc_lake',
    name: '鏡之湖入口', secret: true },
  { id: 'portal_sc_lake_out', island: 'isle_sc_lake', dx: 0, dz: -20, to: 'isle_forest',
    name: '回到迷霧森林' },
  { id: 'portal_sc_mist_in', island: 'isle_ice', dx: -10, dz: -10, to: 'isle_sc_mist',
    name: '迷霧秘境入口', secret: true },
  { id: 'portal_sc_mist_out', island: 'isle_sc_mist', dx: 0, dz: -15, to: 'isle_ice',
    name: '回到冰霜之峰' },
  { id: 'portal_sc_temple_in', island: 'isle_gx_moon', dx: 12, dz: 10, to: 'isle_sc_temple',
    name: '星影神殿入口', secret: true },
  { id: 'portal_sc_temple_out', island: 'isle_sc_temple', dx: 0, dz: -18, to: 'isle_gx_moon',
    name: '回到月岩高地' },
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
  { island: 'isle_gx_hub', dx: 9, dz: -8, launch: 26 },
  { island: 'isle_gx_aurora', dx: -7, dz: 7, launch: 26 },
  { island: 'isle_gx_crown', dx: 6, dz: -6, launch: 28 },
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

  // ===== 銀河空島任務（完成 22 個基礎任務後由銀河傳送門進入）=====
  { id: 'sqg_hub_npc', island: 'isle_gx_hub', type: 'npc', name: '星門管理員', diff: 'medium', n: 5, dx: 8, dz: -3, npc: '👽', lock: 22,
    intro: '星門管理員歐米想確認你的英語資格，回答他的問題吧！' },
  { id: 'sqg_hub_chest', island: 'isle_gx_hub', type: 'chest', name: '星際旅人的行李', diff: 'medium', n: 4, dx: -9, dz: -6, lock: 22,
    intro: '旅人遺落的星際行李箱，用單字密碼打開它！' },
  { id: 'sqg_nebula_listen', island: 'isle_gx_nebula', type: 'listen', name: '星雲的低語', diff: 'medium', n: 6, dx: 5, dz: -5, lock: 22,
    intro: '紫色星雲會輕聲唸出單字，聽出它在說什麼！' },
  { id: 'sqg_nebula_runes', island: 'isle_gx_nebula', type: 'runes', name: '星塵符文', diff: 'medium', n: 2, dx: -7, dz: 5, lock: 22,
    intro: '字母星塵飄散在雲海上，收集它們拼出星語！' },
  { id: 'sqg_moon_chest', island: 'isle_gx_moon', type: 'chest', name: '月岩寶盒', diff: 'medium', n: 4, dx: 6, dz: 5, lock: 22,
    intro: '藏在環形山裡的月岩寶盒，等你用單字解鎖。' },
  { id: 'sqg_moon_arena', island: 'isle_gx_moon', type: 'arena', name: '月面守衛戰', diff: 'medium', n: 4, mob: 'starling', dx: -6, dz: -6, lock: 22,
    intro: '星光史萊姆佔領了月岩高地！用英語魔法趕走牠們。' },
  { id: 'sqg_comet_race', island: 'isle_gx_comet', type: 'race', name: '彗尾飛行', diff: 'medium', n: 9, time: 60, dx: 5, dz: 4, lock: 22,
    intro: '沿著彗星的尾跡穿越光環，感受星際飛行！' },
  { id: 'sqg_comet_gate', island: 'isle_gx_comet', type: 'gate', name: '彗核之門', diff: 'medium', n: 5, dx: -5, dz: -5, lock: 22,
    intro: '彗核裡封印著古老的文法之門，答對才能開啟。' },
  { id: 'sqg_aurora_pillars', island: 'isle_gx_aurora', type: 'pillars', name: '極光配對柱', diff: 'medium', n: 6, dx: 7, dz: -5, lock: 22,
    intro: '把英文和中文配成對，極光就會為你起舞！' },
  { id: 'sqg_aurora_npc', island: 'isle_gx_aurora', type: 'npc', name: '極光牧者', diff: 'medium', n: 5, dx: -8, dz: -4, npc: '🧝', lock: 22,
    intro: '極光牧者艾拉想和地面來的旅人聊聊天。' },
  { id: 'sqg_alien_npc', island: 'isle_gx_alien', type: 'npc', name: '外星村長', diff: 'hard', n: 6, dx: 6, dz: 4, npc: '👾', lock: 22,
    intro: '外星村長只學過英語！幫他處理村裡的大小事。' },
  { id: 'sqg_alien_chest', island: 'isle_gx_alien', type: 'chest', name: '飛碟零件箱', diff: 'hard', n: 5, dx: -6, dz: -5, lock: 22,
    intro: '修飛碟需要零件，零件箱的密碼是英文單字！' },
  { id: 'sqg_alien_gate', island: 'isle_gx_alien', type: 'gate', name: '母艦閘門', diff: 'hard', n: 5, dx: 0, dz: 9, lock: 22,
    intro: '外星母艦的閘門用地球文法上鎖，證明你的實力！' },
  { id: 'sqg_ring_race', island: 'isle_gx_ring', type: 'race', name: '星環競速', diff: 'hard', n: 10, time: 55, dx: 5, dz: 3, lock: 22,
    intro: '在星環之丘的高空環道全速衝刺！' },
  { id: 'sqg_ring_listen', island: 'isle_gx_ring', type: 'listen', name: '星環回聲', diff: 'hard', n: 6, dx: -5, dz: -4, lock: 22,
    intro: '星環傳來遙遠的回聲，聽出正確的單字！' },
  { id: 'sqg_dust_runes', island: 'isle_gx_dust', type: 'runes', name: '沙洲拾字', diff: 'medium', n: 2, dx: 5, dz: -4, lock: 22,
    intro: '星塵沙洲埋著發光的字母，把它們挖出來排好！' },
  { id: 'sqg_dust_arena', island: 'isle_gx_dust', type: 'arena', name: '沙洲遭遇戰', diff: 'medium', n: 4, mob: 'starling', dx: -5, dz: 4, lock: 22,
    intro: '一群星光史萊姆從沙洲底下冒出來了！' },
  { id: 'sqg_twin_pillars', island: 'isle_gx_twin', type: 'pillars', name: '雙星對應', diff: 'hard', n: 6, dx: 5, dz: -4, lock: 22,
    intro: '雙子星喜歡成雙成對——幫單字找到它的中文雙星！' },
  { id: 'sqg_twin_chest', island: 'isle_gx_twin', type: 'chest', name: '雙子寶匣', diff: 'hard', n: 5, dx: -5, dz: 4, lock: 22,
    intro: '一對寶匣共用一組單字密碼，全部答對才打得開。' },
  { id: 'sqg_twin_listen', island: 'isle_gx_twin', type: 'listen', name: '雙星共鳴', diff: 'medium', n: 6, dx: 0, dz: -7, lock: 22,
    intro: '兩顆星星輪流唱出單字，仔細聽是哪一個！' },
  { id: 'sqg_void_arena', island: 'isle_gx_void', type: 'arena', name: '虛空來襲', diff: 'hard', n: 5, mob: 'shade', dx: 4, dz: 4, lock: 22,
    intro: '暗影星靈從虛空裂縫湧出，守住邊境！' },
  { id: 'sqg_void_gate', island: 'isle_gx_void', type: 'gate', name: '虛空封印門', diff: 'hard', n: 6, dx: -5, dz: -4, lock: 22,
    intro: '封印虛空的大門搖搖欲墜，用文法之力補強它！' },
  { id: 'sqg_void_runes', island: 'isle_gx_void', type: 'runes', name: '裂縫咒文', diff: 'hard', n: 3, dx: 0, dz: 7, lock: 22,
    intro: '從裂縫飄出的咒文字母，拼出封印之語！' },
  { id: 'sqg_crown_bridge', island: 'isle_gx_crown', type: 'bridge', name: '通往龍巢的星橋', diff: 'hard', n: 3, dx: 10, dz: 4, lock: 22,
    intro: '逐字拼出單字，鋪出直達暗星龍巢的星光之橋！' },
  { id: 'sqg_crown_npc', island: 'isle_gx_crown', type: 'npc', name: '聖殿祭司', diff: 'hard', n: 6, dx: -7, dz: -5, npc: '🌟', lock: 22,
    intro: '星冠聖殿的祭司想考考你最道地的英語會話。' },
  { id: 'sqg_crown_pillars', island: 'isle_gx_crown', type: 'pillars', name: '聖殿石板', diff: 'hard', n: 6, dx: 0, dz: -9, lock: 22,
    intro: '聖殿的石板刻著單字與意義，把它們對應起來！' },
  { id: 'sqg_crown_gate', island: 'isle_gx_crown', type: 'gate', name: '星冠試煉門', diff: 'medium', n: 5, dx: 7, dz: -6, lock: 22,
    intro: '通過星冠的文法試煉，證明你配得上聖殿的祝福。' },
  { id: 'sqg_dragon_arena', island: 'isle_gx_dragon', type: 'arena', name: '龍巢前哨戰', diff: 'hard', n: 5, mob: 'shade', dx: 8, dz: 6, lock: 45,
    intro: '暗星龍的親衛隊擋在巢穴前，先擊敗牠們！' },
  { id: 'sqg_dragon_chest', island: 'isle_gx_dragon', type: 'chest', name: '龍之寶庫', diff: 'hard', n: 5, dx: -8, dz: 5, lock: 22,
    intro: '暗星龍收藏的寶庫，只認得單字大師。' },
  { id: 'sqg_dragon_boss', island: 'isle_gx_dragon', type: 'boss', name: '星雲暗影龍', diff: 'boss', n: 10, dx: 0, dz: 0, lock: 48,
    intro: '吞噬星光的暗影龍甦醒了！這是銀河最終的英語試煉！' },

  // ===== 隱藏秘境任務（找到隱藏傳送門後才能挑戰）=====
  { id: 'sqh_cave_chest', island: 'isle_sc_cave', type: 'chest', name: '深洞的封印寶箱', diff: 'hard', n: 5, dx: -6, dz: 6, hidden: true,
    intro: '洞窟深處的封印寶箱，被古老的單字咒語緊緊鎖住。' },
  { id: 'sqh_cave_runes', island: 'isle_sc_cave', type: 'runes', name: '水晶洞的祕文', diff: 'hard', n: 6, dx: 6, dz: -6, hidden: true,
    intro: '發光水晶間散落著祕文字母，拼出它們才能解開洞窟的秘密。' },
  { id: 'sqh_cave_arena', island: 'isle_sc_cave', type: 'arena', name: '魔像的試煉', diff: 'hard', n: 4, mob: 'golem', dx: 8, dz: 6, hidden: true,
    intro: '沉睡的水晶魔像甦醒了！用最強的英語魔法擊退牠們！' },
  { id: 'sqh_lake_listen', island: 'isle_sc_lake', type: 'listen', name: '鏡湖的回音', diff: 'hard', n: 6, dx: -6, dz: 6, hidden: true,
    intro: '湖面倒映著單字的聲音，仔細聽並選出正確答案！' },
  { id: 'sqh_lake_pillars', island: 'isle_sc_lake', type: 'pillars', name: '湖畔配對石', diff: 'hard', n: 6, dx: 8, dz: 4, hidden: true,
    intro: '把英文單字和中文意思配成對，湖水就會泛起漣漪！' },
  { id: 'sqh_lake_race', island: 'isle_sc_lake', type: 'race', name: '鏡湖飛環', diff: 'hard', n: 8, time: 40, dx: -8, dz: -4, hidden: true,
    intro: '沿著湖面上的光環全速飛行，限時挑戰你的極限！' },
  { id: 'sqh_mist_npc', island: 'isle_sc_mist', type: 'npc', name: '迷霧中的低語', diff: 'hard', n: 5, dx: 6, dz: 6, npc: '👻', hidden: true,
    intro: '迷霧深處傳來神秘的低語，鼓起勇氣用英語回應吧！' },
  { id: 'sqh_mist_gate', island: 'isle_sc_mist', type: 'gate', name: '迷霧封印門', diff: 'hard', n: 5, dx: -6, dz: 6, hidden: true,
    intro: '被濃霧籠罩的封印之門，只有精通文法的人才能通過。' },
  { id: 'sqh_temple_arena', island: 'isle_sc_temple', type: 'arena', name: '神殿的暗影騎士', diff: 'hard', n: 5, mob: 'knight', dx: -8, dz: 6, hidden: true,
    intro: '守衛神殿的暗影騎士擋住了去路，準備迎戰！' },
  { id: 'sqh_temple_boss', island: 'isle_sc_temple', type: 'boss', name: '星影守護者', diff: 'boss', n: 10, dx: 0, dz: 0, hidden: true, lockSecret: 8,
    intro: '沉睡在神殿深處的星影守護者甦醒了！這是秘境最終的試煉！' },
];

// ===== Mobs =====
// shape: which body build makeMobMesh() uses ('slime' | 'wisp' | 'bat')
const SKY_MOBS = [
  { id: 'slime', name: '雲史萊姆', hp: 1, quiz: 'vocab', diff: 'easy', color: 0x8fd4ff, speed: 3, shape: 'slime' },
  { id: 'wisp', name: '風靈', hp: 2, quiz: 'vocab', diff: 'medium', color: 0xa8ffd8, speed: 3.8, shape: 'wisp' },
  { id: 'bat', name: '暗影蝙蝠', hp: 2, quiz: 'grammar', diff: 'medium', color: 0x5a4a7a, speed: 4.5, shape: 'bat' },
  // galaxy mobs
  { id: 'starling', name: '星光史萊姆', hp: 2, quiz: 'vocab', diff: 'medium', color: 0xffd166, speed: 3.4, shape: 'slime' },
  { id: 'shade', name: '暗影星靈', hp: 2, quiz: 'grammar', diff: 'medium', color: 0x8f6bff, speed: 4.2, shape: 'bat' },
  // secret-realm elites (stronger stats + larger scale)
  { id: 'knight', name: '暗影騎士', hp: 6, quiz: 'grammar', diff: 'hard', color: 0x241a30, speed: 5.2, shape: 'bat', scale: 1.35 },
  { id: 'golem', name: '水晶魔像', hp: 8, quiz: 'vocab', diff: 'hard', color: 0x8fd8f0, speed: 2, shape: 'slime', scale: 1.5 },
  { id: 'lurker', name: '深淵潛伏者', hp: 7, quiz: 'vocab', diff: 'hard', color: 0x1a5a5a, speed: 4, shape: 'wisp', scale: 1.3 },
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
