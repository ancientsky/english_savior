/* ===== Fishing Pond Species Data =====
   110 species across 14 ponds:
     pond 1 — 陽光池塘 Sunny Pond        (8 fish, easy words, rarity 1)          [unchanged]
     pond 2 — 森林小溪 Forest Stream     (8 fish, easy/medium, rarity 1-2)       [unchanged]
     pond 3 — 珊瑚海灣 Coral Bay         (8 fish, medium, rarity 2)              [unchanged]
     pond 4 — 傳說深海 Legendary Deep    (6 fish, hard + mythics, rarity 3)      [unchanged]
     pond 5 — 火山溫泉湖 Volcanic Spring (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 6 — 極地冰洞 Polar Ice Cave    (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 7 — 雲霧瀑布潭 Misty Falls     (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 8 — 深海海溝 Abyssal Trench   (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 9 — 星空夢境湖 Starlight Lake  (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 10 — 櫻花花瓣溪 Blossom Stream (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 11 — 恐龍化石湖 Fossil Lake    (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 12 — 幽靈沼澤 Ghost Swamp      (8 fish: 7 rarity 1-2 + 1 legendary)
     pond 13 — 糖果汽水湖 Candy Soda Lake(8 fish: 7 rarity 1-2 + 1 legendary)
     pond 14 — 未來科技水道 Neon Tech Canal (8 fish: 7 rarity 1-2 + 1 legendary)
   Each entry: { id, emoji, word (UPPERCASE EN), zh, rarity: 1|2|3|4, pond: 1-14 }
   rarity 4 == legendary (also flagged `legendary: true` for readability/UI);
   the original 30 entries (ponds 1-4) are byte-for-byte unchanged so old
   saves (english_savior_fishing.caught) stay valid. 10 legendary species total
   (one per pond 5-14) back the 傳說獵人/傳說大師 achievements.
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

  // ===== Pond 5: 火山溫泉湖 (Volcanic Hot Spring) — heat-themed, rarity 1-2 + legendary =====
  { id: 'steam',    emoji: '♨️', word: 'STEAM',    zh: '蒸氣',     rarity: 1, pond: 5 },
  { id: 'ember',    emoji: '🔥', word: 'EMBER',    zh: '餘燼',     rarity: 1, pond: 5 },
  { id: 'kettle',   emoji: '🫖', word: 'KETTLE',   zh: '水壺',     rarity: 1, pond: 5 },
  { id: 'scorpion', emoji: '🦂', word: 'SCORPION', zh: '蠍子',     rarity: 1, pond: 5 },
  { id: 'lizard',   emoji: '🦎', word: 'LIZARD',   zh: '蜥蜴',     rarity: 2, pond: 5 },
  { id: 'torch',    emoji: '🕯️', word: 'TORCH',    zh: '火把',     rarity: 2, pond: 5 },
  { id: 'falcon',   emoji: '🦅', word: 'FALCON',   zh: '獵鷹',     rarity: 2, pond: 5 },
  { id: 'phoenix',  emoji: '🐦‍🔥', word: 'PHOENIX', zh: '火鳳凰',   rarity: 4, pond: 5, legendary: true },

  // ===== Pond 6: 極地冰洞 (Polar Ice Cave) — ice-themed, rarity 1-2 + legendary =====
  { id: 'penguin',    emoji: '🐧',  word: 'PENGUIN',    zh: '企鵝',   rarity: 1, pond: 6 },
  { id: 'walrus',     emoji: '🦭',  word: 'WALRUS',     zh: '海象',   rarity: 1, pond: 6 },
  { id: 'polarbear',  emoji: '🐻‍❄️', word: 'POLARBEAR', say: 'polar bear', zh: '北極熊', rarity: 1, pond: 6 },
  { id: 'icicle',     emoji: '🧊',  word: 'ICICLE',     zh: '冰柱',   rarity: 1, pond: 6 },
  { id: 'snowman',    emoji: '⛄',  word: 'SNOWMAN',    zh: '雪人',   rarity: 1, pond: 6 },
  { id: 'reindeer',   emoji: '🦌',  word: 'REINDEER',   zh: '馴鹿',   rarity: 2, pond: 6 },
  { id: 'husky',      emoji: '🐕',  word: 'HUSKY',      zh: '哈士奇', rarity: 2, pond: 6 },
  { id: 'icedragon',  emoji: '🐲',  word: 'ICEDRAGON',  say: 'ice dragon',  zh: '冰龍',   rarity: 4, pond: 6, legendary: true },

  // ===== Pond 7: 雲霧瀑布潭 (Misty Waterfall Pond) — mist/forest, rarity 1-2 + legendary =====
  { id: 'owl',          emoji: '🦉', word: 'OWL',          zh: '貓頭鷹', rarity: 1, pond: 7 },
  { id: 'rainbow',      emoji: '🌈', word: 'RAINBOW',      zh: '彩虹',   rarity: 1, pond: 7 },
  { id: 'lotus',        emoji: '🪷', word: 'LOTUS',        zh: '蓮花',   rarity: 1, pond: 7 },
  { id: 'cricket',      emoji: '🦗', word: 'CRICKET',      zh: '蟋蟀',   rarity: 1, pond: 7 },
  { id: 'butterfly',    emoji: '🦋', word: 'BUTTERFLY',    zh: '蝴蝶',   rarity: 2, pond: 7 },
  { id: 'trout',        emoji: '🐟', word: 'TROUT',        zh: '鱒魚',   rarity: 2, pond: 7 },
  { id: 'deer',         emoji: '🦌', word: 'DEER',         zh: '鹿',     rarity: 2, pond: 7 },
  { id: 'rainbowfish',  emoji: '🐠', word: 'RAINBOWFISH',  say: 'rainbow fish',  zh: '彩虹魚', rarity: 4, pond: 7, legendary: true },

  // ===== Pond 8: 深海海溝 (Abyssal Trench) — deep-sea, rarity 1-2 + legendary =====
  { id: 'anglerfish', emoji: '🏮', word: 'ANGLERFISH', zh: '鮟鱇魚', rarity: 2, pond: 8 },
  { id: 'eel',        emoji: '🐟', word: 'EEL',        zh: '鰻魚',   rarity: 1, pond: 8 },
  { id: 'seahorse',   emoji: '🐠', word: 'SEAHORSE',   zh: '海馬',   rarity: 1, pond: 8 },
  { id: 'clam',       emoji: '🐚', word: 'CLAM',       zh: '蛤蜊',   rarity: 1, pond: 8 },
  { id: 'pearl',      emoji: '🦪', word: 'PEARL',      zh: '珍珠',   rarity: 1, pond: 8 },
  { id: 'stingray',   emoji: '🐠', word: 'STINGRAY',   zh: '魟魚',   rarity: 2, pond: 8 },
  { id: 'cuttlefish', emoji: '🦑', word: 'CUTTLEFISH', zh: '花枝',   rarity: 2, pond: 8 },
  { id: 'kraken',     emoji: '🐙', word: 'KRAKEN',     zh: '海怪',   rarity: 4, pond: 8, legendary: true },

  // ===== Pond 9: 星空夢境湖 (Starlight Dream Lake) — fantasy, rarity 1-2 + legendary =====
  { id: 'unicorn',    emoji: '🦄', word: 'UNICORN',    zh: '獨角獸', rarity: 1, pond: 9 },
  { id: 'fairy',      emoji: '🧚', word: 'FAIRY',      zh: '仙子',   rarity: 1, pond: 9 },
  { id: 'moonfish',   emoji: '🌙', word: 'MOONFISH',   zh: '月魚',   rarity: 1, pond: 9 },
  { id: 'starlight',  emoji: '✨', word: 'STARLIGHT',  zh: '星光',   rarity: 1, pond: 9 },
  { id: 'comet',      emoji: '🌠', word: 'COMET',      zh: '彗星',   rarity: 2, pond: 9 },
  { id: 'cloud',      emoji: '☁️', word: 'CLOUD',      zh: '雲朵',   rarity: 2, pond: 9 },
  { id: 'wizard',     emoji: '🧙', word: 'WIZARD',     zh: '巫師',   rarity: 2, pond: 9 },
  { id: 'starwhale',  emoji: '🐳', word: 'STARWHALE',  say: 'star whale',  zh: '星空鯨', rarity: 4, pond: 9, legendary: true },

  // ===== Pond 10: 櫻花花瓣溪 (Cherry-Blossom Stream) — spring/petals, rarity 1-2 + legendary =====
  { id: 'petal',     emoji: '🌸', word: 'PETAL',     zh: '花瓣',     rarity: 1, pond: 10 },
  { id: 'blossom',   emoji: '🌼', word: 'BLOSSOM',   zh: '花朵',     rarity: 1, pond: 10 },
  { id: 'koi',       emoji: '🎏', word: 'KOI',       zh: '錦鯉',     rarity: 1, pond: 10 },
  { id: 'sparrow',   emoji: '🐦', word: 'SPARROW',   zh: '麻雀',     rarity: 1, pond: 10 },
  { id: 'rabbit',    emoji: '🐰', word: 'RABBIT',    zh: '兔子',     rarity: 2, pond: 10 },
  { id: 'lantern',   emoji: '🏮', word: 'LANTERN',   zh: '燈籠',     rarity: 2, pond: 10 },
  { id: 'origami',   emoji: '🎴', word: 'ORIGAMI',   zh: '摺紙',     rarity: 2, pond: 10 },
  { id: 'cherrykoi', emoji: '🎏', word: 'CHERRYKOI', say: 'cherry koi', zh: '櫻花錦鯉', rarity: 4, pond: 10, legendary: true },

  // ===== Pond 11: 恐龍化石湖 (Dino Fossil Lake) — prehistoric, rarity 1-2 + legendary =====
  { id: 'fossil',   emoji: '🦴', word: 'FOSSIL',   zh: '化石',     rarity: 1, pond: 11 },
  { id: 'bone',     emoji: '🍖', word: 'BONE',     zh: '骨頭',     rarity: 1, pond: 11 },
  { id: 'amber',    emoji: '🔶', word: 'AMBER',    zh: '琥珀',     rarity: 1, pond: 11 },
  { id: 'cave',     emoji: '🕳️', word: 'CAVE',     zh: '洞穴',     rarity: 1, pond: 11 },
  { id: 'rock',     emoji: '🪨', word: 'ROCK',     zh: '石頭',     rarity: 2, pond: 11 },
  { id: 'raptor',   emoji: '🦖', word: 'RAPTOR',   zh: '迅猛龍',   rarity: 2, pond: 11 },
  { id: 'mammoth',  emoji: '🐘', word: 'MAMMOTH',  zh: '長毛象',   rarity: 2, pond: 11 },
  { id: 'dinosaur', emoji: '🦕', word: 'DINOSAUR', zh: '恐龍',     rarity: 4, pond: 11, legendary: true },

  // ===== Pond 12: 幽靈沼澤 (Ghost Swamp) — cute-spooky, rarity 1-2 + legendary =====
  { id: 'pumpkin',    emoji: '🎃',  word: 'PUMPKIN',    zh: '南瓜',     rarity: 1, pond: 12 },
  { id: 'bat',        emoji: '🦇',  word: 'BAT',        zh: '蝙蝠',     rarity: 1, pond: 12 },
  { id: 'spider',     emoji: '🕷️', word: 'SPIDER',     zh: '蜘蛛',     rarity: 1, pond: 12 },
  { id: 'candle',     emoji: '🕯️', word: 'CANDLE',     zh: '蠟燭',     rarity: 1, pond: 12 },
  { id: 'witch',      emoji: '🧙‍♀️', word: 'WITCH',      zh: '女巫',     rarity: 2, pond: 12 },
  { id: 'skeleton',   emoji: '💀',  word: 'SKELETON',   zh: '骷髏',     rarity: 2, pond: 12 },
  { id: 'zombie',     emoji: '🧟',  word: 'ZOMBIE',     zh: '殭屍',     rarity: 2, pond: 12 },
  { id: 'ghostking',  emoji: '👑',  word: 'GHOSTKING',  say: 'ghost king', zh: '幽靈王', rarity: 4, pond: 12, legendary: true },

  // ===== Pond 13: 糖果汽水湖 (Candy Soda Lake) — sweets, rarity 1-2 + legendary =====
  { id: 'candy',        emoji: '🍬', word: 'CANDY',        zh: '糖果',     rarity: 1, pond: 13 },
  { id: 'cookie',       emoji: '🍪', word: 'COOKIE',       zh: '餅乾',     rarity: 1, pond: 13 },
  { id: 'donut',        emoji: '🍩', word: 'DONUT',        zh: '甜甜圈',   rarity: 1, pond: 13 },
  { id: 'lollipop',     emoji: '🍭', word: 'LOLLIPOP',     zh: '棒棒糖',   rarity: 1, pond: 13 },
  { id: 'gummy',        emoji: '🐻', word: 'GUMMY',        zh: '軟糖',     rarity: 2, pond: 13 },
  { id: 'marshmallow',  emoji: '🍡', word: 'MARSHMALLOW',  zh: '棉花糖',   rarity: 2, pond: 13 },
  { id: 'cupcake',      emoji: '🧁', word: 'CUPCAKE',      zh: '杯子蛋糕', rarity: 2, pond: 13 },
  { id: 'candywhale',   emoji: '🐳', word: 'CANDYWHALE',   say: 'candy whale', zh: '糖果鯨魚', rarity: 4, pond: 13, legendary: true },

  // ===== Pond 14: 未來科技水道 (Neon Tech Canal) — sci-fi, rarity 1-2 + legendary =====
  { id: 'robot',       emoji: '🤖', word: 'ROBOT',       zh: '機器人',   rarity: 1, pond: 14 },
  { id: 'laser',       emoji: '🔦', word: 'LASER',       zh: '雷射',     rarity: 1, pond: 14 },
  { id: 'rocket',      emoji: '🚀', word: 'ROCKET',      zh: '火箭',     rarity: 1, pond: 14 },
  { id: 'drone',       emoji: '🚁', word: 'DRONE',       zh: '無人機',   rarity: 1, pond: 14 },
  { id: 'circuit',     emoji: '🔌', word: 'CIRCUIT',     zh: '電路',     rarity: 2, pond: 14 },
  { id: 'hologram',    emoji: '🔮', word: 'HOLOGRAM',    zh: '全息影像', rarity: 2, pond: 14 },
  { id: 'android',     emoji: '🦾', word: 'ANDROID',     zh: '仿生人',   rarity: 2, pond: 14 },
  { id: 'cybershark',  emoji: '🦈', word: 'CYBERSHARK',  say: 'cyber shark', zh: '電子鯊魚', rarity: 4, pond: 14, legendary: true },
];
