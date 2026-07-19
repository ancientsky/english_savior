/* ===== Fishing Pond Species Data =====
   30 species across 4 ponds:
     pond 1 — 陽光池塘 Sunny Pond      (8 fish, easy words, rarity 1)
     pond 2 — 森林小溪 Forest Stream   (8 fish, easy/medium, rarity 1-2)
     pond 3 — 珊瑚海灣 Coral Bay       (8 fish, medium, rarity 2)
     pond 4 — 傳說深海 Legendary Deep  (6 fish, hard + mythics, rarity 3)
   Each entry: { id, emoji, word (UPPERCASE EN), zh, rarity: 1|2|3, pond: 1-4 }
*/

const FISH_SPECIES = [
  // ===== Pond 1: 陽光池塘 (Sunny Pond) — easy, rarity 1 =====
  { id: 'fish',     emoji: '🐟', word: 'FISH',     zh: '魚',       rarity: 1, pond: 1 },
  { id: 'goldfish', emoji: '🐠', word: 'GOLDFISH', zh: '金魚',     rarity: 1, pond: 1 },
  { id: 'duck',     emoji: '🦆', word: 'DUCK',     zh: '鴨子',     rarity: 1, pond: 1 },
  { id: 'frog',     emoji: '🐸', word: 'FROG',     zh: '青蛙',     rarity: 1, pond: 1 },
  { id: 'turtle',   emoji: '🐢', word: 'TURTLE',   zh: '烏龜',     rarity: 1, pond: 1 },
  { id: 'crab',     emoji: '🦀', word: 'CRAB',     zh: '螃蟹',     rarity: 1, pond: 1 },
  { id: 'shrimp',   emoji: '🦐', word: 'SHRIMP',   zh: '蝦子',     rarity: 1, pond: 1 },
  { id: 'boot',     emoji: '🥾', word: 'BOOT',     zh: '舊靴子',   rarity: 1, pond: 1 },

  // ===== Pond 2: 森林小溪 (Forest Stream) — easy/medium, rarity 1-2 =====
  { id: 'otter',      emoji: '🦦', word: 'OTTER',      zh: '水獺',   rarity: 1, pond: 2 },
  { id: 'beaver',     emoji: '🦫', word: 'BEAVER',     zh: '河狸',   rarity: 1, pond: 2 },
  { id: 'snail',      emoji: '🐌', word: 'SNAIL',      zh: '蝸牛',   rarity: 1, pond: 2 },
  { id: 'worm',       emoji: '🪱', word: 'WORM',       zh: '蚯蚓',   rarity: 1, pond: 2 },
  { id: 'mosquito',   emoji: '🦟', word: 'MOSQUITO',   zh: '蚊子',   rarity: 1, pond: 2 },
  { id: 'salamander', emoji: '🦎', word: 'SALAMANDER', zh: '蠑螈',   rarity: 2, pond: 2 },
  { id: 'crocodile',  emoji: '🐊', word: 'CROCODILE',  zh: '鱷魚',   rarity: 2, pond: 2 },
  { id: 'carp',       emoji: '🎏', word: 'CARP',       zh: '鯉魚',   rarity: 2, pond: 2 },

  // ===== Pond 3: 珊瑚海灣 (Coral Bay) — medium, rarity 2 =====
  { id: 'clownfish',  emoji: '🐠', word: 'CLOWNFISH',  zh: '小丑魚', rarity: 2, pond: 3 },
  { id: 'octopus',    emoji: '🐙', word: 'OCTOPUS',    zh: '章魚',   rarity: 2, pond: 3 },
  { id: 'jellyfish',  emoji: '🪼', word: 'JELLYFISH',  zh: '水母',   rarity: 2, pond: 3 },
  { id: 'pufferfish', emoji: '🐡', word: 'PUFFERFISH', zh: '河豚',   rarity: 2, pond: 3 },
  { id: 'lobster',    emoji: '🦞', word: 'LOBSTER',    zh: '龍蝦',   rarity: 2, pond: 3 },
  { id: 'seal',       emoji: '🦭', word: 'SEAL',       zh: '海豹',   rarity: 2, pond: 3 },
  { id: 'shark',      emoji: '🦈', word: 'SHARK',      zh: '鯊魚',   rarity: 2, pond: 3 },
  { id: 'starfish',   emoji: '⭐', word: 'STARFISH',   zh: '海星',   rarity: 2, pond: 3 },

  // ===== Pond 4: 傳說深海 (Legendary Deep Sea) — hard + mythics, rarity 3 =====
  { id: 'squid',   emoji: '🦑', word: 'SQUID',   zh: '魷魚',     rarity: 3, pond: 4 },
  { id: 'whale',   emoji: '🐳', word: 'WHALE',   zh: '鯨魚',     rarity: 3, pond: 4 },
  { id: 'orca',    emoji: '🐋', word: 'ORCA',    zh: '虎鯨',     rarity: 3, pond: 4 },
  { id: 'dragon',  emoji: '🐉', word: 'DRAGON',  zh: '神龍',     rarity: 3, pond: 4 },
  { id: 'mermaid', emoji: '🧜', word: 'MERMAID', zh: '美人魚',   rarity: 3, pond: 4 },
  { id: 'ghost',   emoji: '👻', word: 'GHOST',   zh: '幽靈魚',   rarity: 3, pond: 4 },
];
