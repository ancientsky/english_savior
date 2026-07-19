// PET_SPECIES — 單字寵物島 (Word Pets Island) species roster.
// 90 species across 30 evolution chains (2-3 stages, evolution = a related
// English word) + 14 standalone rares, balanced 18-per-type across the 5
// types. Words are elementary-level (十二年國教課綱); rarity scales
// 1 (common/easy) -> 3 (rare/hard) with stage. baseHp/baseAtk scale with
// rarity/stage. `evolveLevel` is the level at which THIS species evolves
// into `evolvesTo` (null = final form / standalone).
// The original 30 (ids/words below this notice) are UNCHANGED — save data
// references them by id. The +60 expansion pack starts after that block;
// its 20 new chains + 10 standalones keep the same 6-per-type-per-30
// balance (12 new per type) and push rarity-3 stats slightly above the
// original ceiling (was hp60/atk14) so floors 6-15 stay a fair challenge.
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

  // ============================================================
  // ===== Expansion pack (+60): dex 30 -> 90, gyms 5 -> 15 =====
  // ============================================================

  // ===== Chain: PUP -> DOG -> WOLF (normal) =====
  { id: 'pup', emoji: '🐶', word: 'PUP', zh: '小狗', type: 'normal', rarity: 1, baseHp: 31, baseAtk: 6, evolvesTo: 'dog', evolveLevel: 5 },
  { id: 'dog', emoji: '🐕', word: 'DOG', zh: '狗', type: 'normal', rarity: 2, baseHp: 42, baseAtk: 9, evolvesTo: 'wolf', evolveLevel: 12 },
  { id: 'wolf', emoji: '🐺', word: 'WOLF', zh: '狼', type: 'normal', rarity: 3, baseHp: 60, baseAtk: 15, evolvesTo: null },

  // ===== Chain: KITTEN -> CAT -> TIGER (fire) =====
  { id: 'kitten', emoji: '🐱', word: 'KITTEN', zh: '小貓', type: 'fire', rarity: 1, baseHp: 30, baseAtk: 7, evolvesTo: 'cat', evolveLevel: 5 },
  { id: 'cat', emoji: '🐈', word: 'CAT', zh: '貓', type: 'fire', rarity: 2, baseHp: 41, baseAtk: 10, evolvesTo: 'tiger', evolveLevel: 12 },
  { id: 'tiger', emoji: '🐯', word: 'TIGER', zh: '老虎', type: 'fire', rarity: 3, baseHp: 62, baseAtk: 16, evolvesTo: null },

  // ===== Chain: ANT -> SPIDER -> SCORPION (grass) =====
  { id: 'ant', emoji: '🐜', word: 'ANT', zh: '螞蟻', type: 'grass', rarity: 1, baseHp: 29, baseAtk: 6, evolvesTo: 'spider', evolveLevel: 5 },
  { id: 'spider', emoji: '🕷️', word: 'SPIDER', zh: '蜘蛛', type: 'grass', rarity: 2, baseHp: 39, baseAtk: 9, evolvesTo: 'scorpion', evolveLevel: 12 },
  { id: 'scorpion', emoji: '🦂', word: 'SCORPION', zh: '蠍子', type: 'grass', rarity: 3, baseHp: 58, baseAtk: 14, evolvesTo: null },

  // ===== Chain: LEAF -> BUSH -> JUNGLE (grass) =====
  { id: 'leaf', emoji: '🍃', word: 'LEAF', zh: '葉子', type: 'grass', rarity: 1, baseHp: 32, baseAtk: 6, evolvesTo: 'bush', evolveLevel: 5 },
  { id: 'bush', emoji: '🌿', word: 'BUSH', zh: '灌木叢', type: 'grass', rarity: 2, baseHp: 43, baseAtk: 9, evolvesTo: 'jungle', evolveLevel: 12 },
  { id: 'jungle', emoji: '🌴', word: 'JUNGLE', zh: '叢林', type: 'grass', rarity: 3, baseHp: 59, baseAtk: 14, evolvesTo: null },

  // ===== Chain: ICE -> SNOWMAN -> PENGUIN (water) =====
  { id: 'ice', emoji: '🧊', word: 'ICE', zh: '冰', type: 'water', rarity: 1, baseHp: 33, baseAtk: 6, evolvesTo: 'snowman', evolveLevel: 5 },
  { id: 'snowman', emoji: '⛄', word: 'SNOWMAN', zh: '雪人', type: 'water', rarity: 2, baseHp: 44, baseAtk: 9, evolvesTo: 'penguin', evolveLevel: 12 },
  { id: 'penguin', emoji: '🐧', word: 'PENGUIN', zh: '企鵝', type: 'water', rarity: 3, baseHp: 60, baseAtk: 15, evolvesTo: null },

  // ===== Chain: CLOUD -> WIND -> TORNADO (water) =====
  { id: 'cloud', emoji: '☁️', word: 'CLOUD', zh: '雲', type: 'water', rarity: 1, baseHp: 31, baseAtk: 7, evolvesTo: 'wind', evolveLevel: 5 },
  { id: 'wind', emoji: '💨', word: 'WIND', zh: '風', type: 'water', rarity: 2, baseHp: 42, baseAtk: 10, evolvesTo: 'tornado', evolveLevel: 12 },
  { id: 'tornado', emoji: '🌪️', word: 'TORNADO', zh: '龍捲風', type: 'water', rarity: 3, baseHp: 61, baseAtk: 16, evolvesTo: null },

  // ===== Chain: MOON -> COMET -> GALAXY (electric) =====
  { id: 'moon', emoji: '🌙', word: 'MOON', zh: '月亮', type: 'electric', rarity: 1, baseHp: 32, baseAtk: 7, evolvesTo: 'comet', evolveLevel: 5 },
  { id: 'comet', emoji: '☄️', word: 'COMET', zh: '彗星', type: 'electric', rarity: 2, baseHp: 45, baseAtk: 10, evolvesTo: 'galaxy', evolveLevel: 12 },
  { id: 'galaxy', emoji: '🌌', word: 'GALAXY', zh: '銀河', type: 'electric', rarity: 3, baseHp: 63, baseAtk: 16, evolvesTo: null },

  // ===== Chain: GEM -> CRYSTAL -> DIAMOND (electric) =====
  { id: 'gem', emoji: '💎', word: 'GEM', zh: '寶石', type: 'electric', rarity: 1, baseHp: 34, baseAtk: 6, evolvesTo: 'crystal', evolveLevel: 5 },
  { id: 'crystal', emoji: '🔷', word: 'CRYSTAL', zh: '水晶', type: 'electric', rarity: 2, baseHp: 46, baseAtk: 9, evolvesTo: 'diamond', evolveLevel: 12 },
  { id: 'diamond', emoji: '💠', word: 'DIAMOND', zh: '鑽石', type: 'electric', rarity: 3, baseHp: 64, baseAtk: 15, evolvesTo: null },

  // ===== Chain: ROCKET -> SATELLITE -> ALIEN (fire) =====
  { id: 'rocket', emoji: '🚀', word: 'ROCKET', zh: '火箭', type: 'fire', rarity: 1, baseHp: 33, baseAtk: 7, evolvesTo: 'satellite', evolveLevel: 5 },
  { id: 'satellite', emoji: '🛰️', word: 'SATELLITE', zh: '衛星', type: 'fire', rarity: 2, baseHp: 44, baseAtk: 10, evolvesTo: 'alien', evolveLevel: 12 },
  { id: 'alien', emoji: '👽', word: 'ALIEN', zh: '外星人', type: 'fire', rarity: 3, baseHp: 62, baseAtk: 16, evolvesTo: null },

  // ===== Chain: CANDY -> COOKIE -> CAKE (normal) =====
  { id: 'candy', emoji: '🍬', word: 'CANDY', zh: '糖果', type: 'normal', rarity: 1, baseHp: 30, baseAtk: 6, evolvesTo: 'cookie', evolveLevel: 5 },
  { id: 'cookie', emoji: '🍪', word: 'COOKIE', zh: '餅乾', type: 'normal', rarity: 2, baseHp: 40, baseAtk: 9, evolvesTo: 'cake', evolveLevel: 12 },
  { id: 'cake', emoji: '🎂', word: 'CAKE', zh: '蛋糕', type: 'normal', rarity: 3, baseHp: 58, baseAtk: 14, evolvesTo: null },

  // ===== Chain: ACORN -> SQUIRREL (grass) =====
  { id: 'acorn', emoji: '🌰', word: 'ACORN', zh: '橡實', type: 'grass', rarity: 1, baseHp: 31, baseAtk: 6, evolvesTo: 'squirrel', evolveLevel: 6 },
  { id: 'squirrel', emoji: '🐿️', word: 'SQUIRREL', zh: '松鼠', type: 'grass', rarity: 2, baseHp: 46, baseAtk: 11, evolvesTo: null },

  // ===== Chain: DUCK -> SWAN (electric) =====
  { id: 'duck', emoji: '🦆', word: 'DUCK', zh: '鴨子', type: 'electric', rarity: 1, baseHp: 30, baseAtk: 7, evolvesTo: 'swan', evolveLevel: 6 },
  { id: 'swan', emoji: '🦢', word: 'SWAN', zh: '天鵝', type: 'electric', rarity: 2, baseHp: 45, baseAtk: 10, evolvesTo: null },

  // ===== Chain: PIG -> BOAR (fire) =====
  { id: 'pig', emoji: '🐷', word: 'PIG', zh: '豬', type: 'fire', rarity: 1, baseHp: 33, baseAtk: 7, evolvesTo: 'boar', evolveLevel: 6 },
  { id: 'boar', emoji: '🐗', word: 'BOAR', zh: '野豬', type: 'fire', rarity: 2, baseHp: 48, baseAtk: 12, evolvesTo: null },

  // ===== Chain: COW -> BULL (normal) =====
  { id: 'cow', emoji: '🐄', word: 'COW', zh: '母牛', type: 'normal', rarity: 1, baseHp: 34, baseAtk: 7, evolvesTo: 'bull', evolveLevel: 6 },
  { id: 'bull', emoji: '🐂', word: 'BULL', zh: '公牛', type: 'normal', rarity: 2, baseHp: 49, baseAtk: 11, evolvesTo: null },

  // ===== Chain: HORSE -> UNICORN (electric) =====
  { id: 'horse', emoji: '🐴', word: 'HORSE', zh: '馬', type: 'electric', rarity: 1, baseHp: 32, baseAtk: 8, evolvesTo: 'unicorn', evolveLevel: 6 },
  { id: 'unicorn', emoji: '🦄', word: 'UNICORN', zh: '獨角獸', type: 'electric', rarity: 2, baseHp: 50, baseAtk: 12, evolvesTo: null },

  // ===== Chain: CRAB -> LOBSTER (water) =====
  { id: 'crab', emoji: '🦀', word: 'CRAB', zh: '螃蟹', type: 'water', rarity: 1, baseHp: 31, baseAtk: 7, evolvesTo: 'lobster', evolveLevel: 6 },
  { id: 'lobster', emoji: '🦞', word: 'LOBSTER', zh: '龍蝦', type: 'water', rarity: 2, baseHp: 45, baseAtk: 11, evolvesTo: null },

  // ===== Chain: TURTLE -> DINOSAUR (normal) =====
  { id: 'turtle', emoji: '🐢', word: 'TURTLE', zh: '烏龜', type: 'normal', rarity: 1, baseHp: 36, baseAtk: 6, evolvesTo: 'dinosaur', evolveLevel: 6 },
  { id: 'dinosaur', emoji: '🦕', word: 'DINOSAUR', zh: '恐龍', type: 'normal', rarity: 2, baseHp: 50, baseAtk: 12, evolvesTo: null },

  // ===== Chain: BAT -> OWL (fire) =====
  { id: 'bat', emoji: '🦇', word: 'BAT', zh: '蝙蝠', type: 'fire', rarity: 1, baseHp: 29, baseAtk: 8, evolvesTo: 'owl', evolveLevel: 6 },
  { id: 'owl', emoji: '🦉', word: 'OWL', zh: '貓頭鷹', type: 'fire', rarity: 2, baseHp: 44, baseAtk: 11, evolvesTo: null },

  // ===== Chain: FROG -> CROCODILE (water) =====
  { id: 'frog', emoji: '🐸', word: 'FROG', zh: '青蛙', type: 'water', rarity: 1, baseHp: 30, baseAtk: 7, evolvesTo: 'crocodile', evolveLevel: 6 },
  { id: 'crocodile', emoji: '🐊', word: 'CROCODILE', zh: '鱷魚', type: 'water', rarity: 2, baseHp: 47, baseAtk: 12, evolvesTo: null },

  // ===== Chain: SNAIL -> SHELL (grass) =====
  { id: 'snail', emoji: '🐌', word: 'SNAIL', zh: '蝸牛', type: 'grass', rarity: 1, baseHp: 33, baseAtk: 6, evolvesTo: 'shell', evolveLevel: 6 },
  { id: 'shell', emoji: '🐚', word: 'SHELL', zh: '貝殼', type: 'grass', rarity: 2, baseHp: 44, baseAtk: 10, evolvesTo: null },

  // ===== Standalone rares (expansion pack) =====
  { id: 'koala', emoji: '🐨', word: 'KOALA', zh: '無尾熊', type: 'grass', rarity: 1, baseHp: 33, baseAtk: 7, evolvesTo: null },
  { id: 'rabbit', emoji: '🐰', word: 'RABBIT', zh: '兔子', type: 'grass', rarity: 1, baseHp: 30, baseAtk: 7, evolvesTo: null },
  { id: 'fox', emoji: '🦊', word: 'FOX', zh: '狐狸', type: 'normal', rarity: 1, baseHp: 31, baseAtk: 8, evolvesTo: null },
  { id: 'machine', emoji: '⚙️', word: 'MACHINE', zh: '機器', type: 'electric', rarity: 1, baseHp: 34, baseAtk: 7, evolvesTo: null },
  { id: 'octopus', emoji: '🐙', word: 'OCTOPUS', zh: '章魚', type: 'water', rarity: 2, baseHp: 46, baseAtk: 10, evolvesTo: null },
  { id: 'lion', emoji: '🦁', word: 'LION', zh: '獅子', type: 'fire', rarity: 2, baseHp: 47, baseAtk: 11, evolvesTo: null },
  { id: 'elephant', emoji: '🐘', word: 'ELEPHANT', zh: '大象', type: 'normal', rarity: 2, baseHp: 52, baseAtk: 9, evolvesTo: null },
  { id: 'rainbow', emoji: '🌈', word: 'RAINBOW', zh: '彩虹', type: 'water', rarity: 3, baseHp: 62, baseAtk: 15, evolvesTo: null },
  { id: 'treasure', emoji: '💰', word: 'TREASURE', zh: '寶藏', type: 'fire', rarity: 3, baseHp: 60, baseAtk: 16, evolvesTo: null },
  { id: 'rhino', emoji: '🦏', word: 'RHINO', zh: '犀牛', type: 'electric', rarity: 3, baseHp: 64, baseAtk: 15, evolvesTo: null },
];
