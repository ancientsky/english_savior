// PET_SPECIES — 單字寵物島 (Word Pets Island) species roster.
// 30 species across 10 evolution chains (2-3 stages, evolution = a related
// English word) + 4 standalone rares, balanced 6-per-type across the 5
// types. Words are elementary-level (十二年國教課綱); rarity scales
// 1 (common/easy) -> 3 (rare/hard) with stage. baseHp/baseAtk scale with
// rarity/stage. `evolveLevel` is the level at which THIS species evolves
// into `evolvesTo` (null = final form / standalone).
const PET_SPECIES = [
  // ===== Chain: SEED -> FLOWER -> TREE (grass) =====
  { id: 'seed', emoji: '🌱', word: 'SEED', zh: '種子', type: 'grass', rarity: 1, baseHp: 32, baseAtk: 6, evolvesTo: 'flower', evolveLevel: 5 },
  { id: 'flower', emoji: '🌸', word: 'FLOWER', zh: '花朵', type: 'grass', rarity: 2, baseHp: 42, baseAtk: 9, evolvesTo: 'tree', evolveLevel: 12 },
  { id: 'tree', emoji: '🌳', word: 'TREE', zh: '樹', type: 'grass', rarity: 3, baseHp: 56, baseAtk: 13, evolvesTo: null },

  // ===== Chain: EGG -> CHICK -> ROOSTER (normal) =====
  { id: 'egg', emoji: '🥚', word: 'EGG', zh: '蛋', type: 'normal', rarity: 1, baseHp: 30, baseAtk: 6, evolvesTo: 'chick', evolveLevel: 5 },
  { id: 'chick', emoji: '🐤', word: 'CHICK', zh: '小雞', type: 'normal', rarity: 2, baseHp: 40, baseAtk: 8, evolvesTo: 'rooster', evolveLevel: 12 },
  { id: 'rooster', emoji: '🐓', word: 'ROOSTER', zh: '公雞', type: 'normal', rarity: 3, baseHp: 54, baseAtk: 12, evolvesTo: null },

  // ===== Chain: DROP -> RAIN -> STORM (water) =====
  { id: 'drop', emoji: '💧', word: 'DROP', zh: '水滴', type: 'water', rarity: 1, baseHp: 33, baseAtk: 6, evolvesTo: 'rain', evolveLevel: 5 },
  { id: 'rain', emoji: '🌧️', word: 'RAIN', zh: '雨', type: 'water', rarity: 2, baseHp: 44, baseAtk: 9, evolvesTo: 'storm', evolveLevel: 12 },
  { id: 'storm', emoji: '⛈️', word: 'STORM', zh: '暴風雨', type: 'water', rarity: 3, baseHp: 58, baseAtk: 14, evolvesTo: null },

  // ===== Chain: SPARK -> FLASH -> THUNDER (electric) =====
  { id: 'spark', emoji: '✨', word: 'SPARK', zh: '火花', type: 'electric', rarity: 1, baseHp: 31, baseAtk: 7, evolvesTo: 'flash', evolveLevel: 5 },
  { id: 'flash', emoji: '⚡', word: 'FLASH', zh: '閃光', type: 'electric', rarity: 2, baseHp: 41, baseAtk: 10, evolvesTo: 'thunder', evolveLevel: 12 },
  { id: 'thunder', emoji: '🌩️', word: 'THUNDER', zh: '雷', type: 'electric', rarity: 3, baseHp: 55, baseAtk: 14, evolvesTo: null },

  // ===== Chain: STONE -> HILL -> MOUNTAIN (normal) =====
  { id: 'stone', emoji: '🪨', word: 'STONE', zh: '石頭', type: 'normal', rarity: 1, baseHp: 36, baseAtk: 6, evolvesTo: 'hill', evolveLevel: 5 },
  { id: 'hill', emoji: '⛰️', word: 'HILL', zh: '小山丘', type: 'normal', rarity: 2, baseHp: 46, baseAtk: 9, evolvesTo: 'mountain', evolveLevel: 12 },
  { id: 'mountain', emoji: '🏔️', word: 'MOUNTAIN', zh: '山', type: 'normal', rarity: 3, baseHp: 60, baseAtk: 12, evolvesTo: null },

  // ===== Chain: MATCH -> FLAME -> BLAZE (fire) =====
  { id: 'match', emoji: '🔥', word: 'MATCH', zh: '火柴', type: 'fire', rarity: 1, baseHp: 30, baseAtk: 7, evolvesTo: 'flame', evolveLevel: 5 },
  { id: 'flame', emoji: '🔥', word: 'FLAME', zh: '火焰', type: 'fire', rarity: 2, baseHp: 40, baseAtk: 10, evolvesTo: 'blaze', evolveLevel: 12 },
  { id: 'blaze', emoji: '🌋', word: 'BLAZE', zh: '烈焰', type: 'fire', rarity: 3, baseHp: 54, baseAtk: 14, evolvesTo: null },

  // ===== Chain: FISH -> SHARK (water) =====
  { id: 'fish', emoji: '🐟', word: 'FISH', zh: '魚', type: 'water', rarity: 1, baseHp: 34, baseAtk: 7, evolvesTo: 'shark', evolveLevel: 6 },
  { id: 'shark', emoji: '🦈', word: 'SHARK', zh: '鯊魚', type: 'water', rarity: 2, baseHp: 48, baseAtk: 11, evolvesTo: null },

  // ===== Chain: WORM -> BUTTERFLY (grass) =====
  { id: 'worm', emoji: '🐛', word: 'WORM', zh: '蟲', type: 'grass', rarity: 1, baseHp: 30, baseAtk: 6, evolvesTo: 'butterfly', evolveLevel: 6 },
  { id: 'butterfly', emoji: '🦋', word: 'BUTTERFLY', zh: '蝴蝶', type: 'grass', rarity: 2, baseHp: 38, baseAtk: 9, evolvesTo: null },

  // ===== Chain: SUN -> STAR (fire) =====
  { id: 'sun', emoji: '☀️', word: 'SUN', zh: '太陽', type: 'fire', rarity: 1, baseHp: 32, baseAtk: 7, evolvesTo: 'star', evolveLevel: 6 },
  { id: 'star', emoji: '⭐', word: 'STAR', zh: '星星', type: 'fire', rarity: 2, baseHp: 42, baseAtk: 10, evolvesTo: null },

  // ===== Chain: BATTERY -> ROBOT (electric) =====
  { id: 'battery', emoji: '🔋', word: 'BATTERY', zh: '電池', type: 'electric', rarity: 1, baseHp: 30, baseAtk: 6, evolvesTo: 'robot', evolveLevel: 6 },
  { id: 'robot', emoji: '🤖', word: 'ROBOT', zh: '機器人', type: 'electric', rarity: 2, baseHp: 46, baseAtk: 11, evolvesTo: null },

  // ===== Standalone rares (no evolution) =====
  { id: 'panda', emoji: '🐼', word: 'PANDA', zh: '貓熊', type: 'grass', rarity: 1, baseHp: 36, baseAtk: 7, evolvesTo: null },
  { id: 'bee', emoji: '🐝', word: 'BEE', zh: '蜜蜂', type: 'electric', rarity: 1, baseHp: 28, baseAtk: 8, evolvesTo: null },
  { id: 'whale', emoji: '🐳', word: 'WHALE', zh: '鯨魚', type: 'water', rarity: 2, baseHp: 50, baseAtk: 9, evolvesTo: null },
  { id: 'dragon', emoji: '🐉', word: 'DRAGON', zh: '龍', type: 'fire', rarity: 3, baseHp: 60, baseAtk: 14, evolvesTo: null },
];
