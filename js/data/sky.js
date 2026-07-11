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
