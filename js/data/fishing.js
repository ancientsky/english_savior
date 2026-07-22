/* ===== Fishing Pond Species Data =====
   305 species across 29 ponds:
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
     pond 15 — 忍者庭園池 Ninja Garden Pond      (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 16 — 城堡護城河 Castle Moat            (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 17 — 亞馬遜雨林河 Amazon Rainforest River (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 18 — 沙漠綠洲 Desert Oasis             (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 19 — 沉船寶藏灣 Shipwreck Treasure Bay  (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 20 — 人魚珊瑚宮 Mermaid Coral Palace    (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 21 — 神社錦鯉池 Shrine Koi Pond         (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 22 — 馬戲團水舞台 Circus Water Stage     (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 23 — 萬聖南瓜沼 Halloween Pumpkin Swamp (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 24 — 聖誕冰湖 Christmas Ice Lake        (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 25 — 夕陽金灘 Sunset Golden Beach       (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 26 — 魔法藥水湖 Magic Potion Lake        (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 27 — 雷雨閃電湖 Thunderstorm Lightning Lake (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 28 — 天空雲海池 Sky Cloud Sea Pond       (13 fish: 12 rarity 1-2 + 1 legendary)
     pond 29 — 彩虹瀑布秘境 Rainbow Waterfall Secret Realm (13 fish: 12 rarity 1-2 + 1 legendary)
   Each entry: { id, emoji, word (UPPERCASE EN), zh, rarity: 1|2|3|4, pond: 1-29 }
   rarity 4 == legendary (also flagged `legendary: true` for readability/UI);
   the original 30 entries (ponds 1-4) are byte-for-byte unchanged so old
   saves (english_savior_fishing.caught) stay valid. 25 legendary species total
   (one per pond 5-29) back the 傳說獵人/傳說大師/傳說之王 achievements.
   Invented compound words (two real words jammed together with no
   dictionary-standard single-word form, e.g. SHADOWKOI, GHOSTSHIP,
   CANDYCANE) carry a `say` field so TTSManager reads them as natural
   two-word phrases instead of spelling through the jammed string.
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

  // ===== Pond 15: 忍者庭園池 (Ninja Garden Pond) — night bamboo, rarity 1-2 + legendary =====
  { id: 'ninja',       emoji: '🥷', word: 'NINJA',       zh: '忍者',     rarity: 1, pond: 15 },
  { id: 'bamboo',      emoji: '🎋', word: 'BAMBOO',      zh: '竹子',     rarity: 1, pond: 15 },
  { id: 'shuriken',    emoji: '🌟', word: 'SHURIKEN',    zh: '手裏劍',   rarity: 1, pond: 15 },
  { id: 'katana',      emoji: '🗡️', word: 'KATANA',      zh: '武士刀',   rarity: 1, pond: 15 },
  { id: 'scroll',      emoji: '📜', word: 'SCROLL',      zh: '卷軸',     rarity: 1, pond: 15 },
  { id: 'lanternfish', emoji: '🏮', word: 'LANTERNFISH', say: 'lantern fish', zh: '提燈魚', rarity: 2, pond: 15 },
  { id: 'firefly',     emoji: '✨', word: 'FIREFLY',     zh: '螢火蟲',   rarity: 1, pond: 15 },
  { id: 'moth',        emoji: '🦋', word: 'MOTH',        zh: '蛾',       rarity: 1, pond: 15 },
  { id: 'tatami',      emoji: '🟫', word: 'TATAMI',      zh: '榻榻米',   rarity: 1, pond: 15 },
  { id: 'toad',        emoji: '🐸', word: 'TOAD',        zh: '蟾蜍',     rarity: 1, pond: 15 },
  { id: 'ronin',       emoji: '🥋', word: 'RONIN',       zh: '浪人武士', rarity: 2, pond: 15 },
  { id: 'smokebomb',   emoji: '💨', word: 'SMOKEBOMB',   say: 'smoke bomb', zh: '煙霧彈', rarity: 2, pond: 15 },
  { id: 'shadowkoi',   emoji: '🎏', word: 'SHADOWKOI',   say: 'shadow koi', zh: '暗影錦鯉', rarity: 4, pond: 15, legendary: true },

  // ===== Pond 16: 城堡護城河 (Castle Moat) — stone grey-blue, rarity 1-2 + legendary =====
  { id: 'castle',       emoji: '🏰', word: 'CASTLE',       zh: '城堡',     rarity: 1, pond: 16 },
  { id: 'knight',       emoji: '🛡️', word: 'KNIGHT',       zh: '騎士',     rarity: 1, pond: 16 },
  { id: 'sword',        emoji: '⚔️', word: 'SWORD',        zh: '劍',       rarity: 1, pond: 16 },
  { id: 'shield',       emoji: '🛡️', word: 'SHIELD',       zh: '盾牌',     rarity: 1, pond: 16 },
  { id: 'crown',        emoji: '👑', word: 'CROWN',        zh: '皇冠',     rarity: 1, pond: 16 },
  { id: 'tower',        emoji: '🗼', word: 'TOWER',        zh: '塔',       rarity: 1, pond: 16 },
  { id: 'drawbridge',   emoji: '🌉', word: 'DRAWBRIDGE',   zh: '吊橋',     rarity: 2, pond: 16 },
  { id: 'moatfish',     emoji: '🐟', word: 'MOATFISH',     say: 'moat fish', zh: '護城河魚', rarity: 2, pond: 16 },
  { id: 'armor',        emoji: '🥼', word: 'ARMOR',        zh: '盔甲',     rarity: 1, pond: 16 },
  { id: 'trumpet',      emoji: '📯', word: 'TRUMPET',      zh: '號角',     rarity: 1, pond: 16 },
  { id: 'banner',       emoji: '🚩', word: 'BANNER',       zh: '旗幟',     rarity: 2, pond: 16 },
  { id: 'catapult',     emoji: '🪨', word: 'CATAPULT',     zh: '投石機',   rarity: 2, pond: 16 },
  { id: 'moatserpent',  emoji: '🐍', word: 'MOATSERPENT',  say: 'moat serpent', zh: '護城河巨蛇', rarity: 4, pond: 16, legendary: true },

  // ===== Pond 17: 亞馬遜雨林河 (Amazon Rainforest River) — deep green, rarity 1-2 + legendary =====
  { id: 'parrot',      emoji: '🦜', word: 'PARROT',      zh: '鸚鵡',     rarity: 1, pond: 17 },
  { id: 'monkey',      emoji: '🐒', word: 'MONKEY',      zh: '猴子',     rarity: 1, pond: 17 },
  { id: 'toucan',      emoji: '🦤', word: 'TOUCAN',      zh: '巨嘴鳥',   rarity: 1, pond: 17 },
  { id: 'jaguar',      emoji: '🐆', word: 'JAGUAR',      zh: '美洲豹',   rarity: 2, pond: 17 },
  { id: 'piranha',     emoji: '🐟', word: 'PIRANHA',     zh: '食人魚',   rarity: 2, pond: 17 },
  { id: 'anaconda',    emoji: '🐍', word: 'ANACONDA',    zh: '森蚺',     rarity: 2, pond: 17 },
  { id: 'vine',        emoji: '🌿', word: 'VINE',        zh: '藤蔓',     rarity: 1, pond: 17 },
  { id: 'waterfall',   emoji: '🌊', word: 'WATERFALL',   zh: '瀑布',     rarity: 1, pond: 17 },
  { id: 'canoe',       emoji: '🛶', word: 'CANOE',       zh: '獨木舟',   rarity: 1, pond: 17 },
  { id: 'tarantula',   emoji: '🕷️', word: 'TARANTULA',   zh: '狼蛛',     rarity: 2, pond: 17 },
  { id: 'sloth',       emoji: '🦥', word: 'SLOTH',       zh: '樹懶',     rarity: 1, pond: 17 },
  { id: 'poisonfrog',  emoji: '🐸', word: 'POISONFROG',  say: 'poison frog', zh: '毒蛙', rarity: 2, pond: 17 },
  { id: 'jungledragon',emoji: '🐉', word: 'JUNGLEDRAGON',say: 'jungle dragon', zh: '雨林巨龍', rarity: 4, pond: 17, legendary: true },

  // ===== Pond 18: 沙漠綠洲 (Desert Oasis) — sand + turquoise, rarity 1-2 + legendary =====
  { id: 'camel',       emoji: '🐫', word: 'CAMEL',       zh: '駱駝',     rarity: 1, pond: 18 },
  { id: 'cactus',      emoji: '🌵', word: 'CACTUS',      zh: '仙人掌',   rarity: 1, pond: 18 },
  { id: 'oasis',       emoji: '🏝️', word: 'OASIS',       zh: '綠洲',     rarity: 1, pond: 18 },
  { id: 'sandstorm',   emoji: '🌪️', word: 'SANDSTORM',   zh: '沙塵暴',   rarity: 2, pond: 18 },
  { id: 'mirage',      emoji: '🌫️', word: 'MIRAGE',      zh: '海市蜃樓', rarity: 2, pond: 18 },
  { id: 'palmtree',    emoji: '🌴', word: 'PALMTREE',    say: 'palm tree', zh: '棕櫚樹', rarity: 1, pond: 18 },
  { id: 'dune',        emoji: '⛰️', word: 'DUNE',        zh: '沙丘',     rarity: 1, pond: 18 },
  { id: 'vulture',     emoji: '🦅', word: 'VULTURE',     zh: '禿鷹',     rarity: 2, pond: 18 },
  { id: 'gecko',       emoji: '🦎', word: 'GECKO',       zh: '沙漠壁虎', rarity: 1, pond: 18 },
  { id: 'pyramid',     emoji: '🔺', word: 'PYRAMID',     zh: '金字塔',   rarity: 2, pond: 18 },
  { id: 'desertfox',   emoji: '🦊', word: 'DESERTFOX',   say: 'desert fox', zh: '沙漠狐', rarity: 1, pond: 18 },
  { id: 'scarab',      emoji: '🪲', word: 'SCARAB',      zh: '聖甲蟲',   rarity: 2, pond: 18 },
  { id: 'oasisdragon', emoji: '🐉', word: 'OASISDRAGON', say: 'oasis dragon', zh: '綠洲神龍', rarity: 4, pond: 18, legendary: true },

  // ===== Pond 19: 沉船寶藏灣 (Shipwreck Treasure Bay) — teal depths, rarity 1-2 + legendary =====
  { id: 'anchor',      emoji: '⚓', word: 'ANCHOR',      zh: '錨',       rarity: 1, pond: 19 },
  { id: 'treasure',    emoji: '💰', word: 'TREASURE',    zh: '寶藏',     rarity: 1, pond: 19 },
  { id: 'shipwreck',   emoji: '🚢', word: 'SHIPWRECK',   zh: '沉船',     rarity: 1, pond: 19 },
  { id: 'compass',     emoji: '🧭', word: 'COMPASS',     zh: '羅盤',     rarity: 1, pond: 19 },
  { id: 'telescope',   emoji: '🔭', word: 'TELESCOPE',   zh: '望遠鏡',   rarity: 2, pond: 19 },
  { id: 'cannon',      emoji: '💣', word: 'CANNON',      zh: '大砲',     rarity: 1, pond: 19 },
  { id: 'pirate',      emoji: '🏴‍☠️', word: 'PIRATE',      zh: '海盜',     rarity: 1, pond: 19 },
  { id: 'skullflag',   emoji: '🏴‍☠️', word: 'SKULLFLAG',   say: 'skull flag', zh: '骷髏旗', rarity: 2, pond: 19 },
  { id: 'goldcoin',    emoji: '🪙', word: 'GOLDCOIN',    say: 'gold coin', zh: '金幣', rarity: 1, pond: 19 },
  { id: 'barnacle',    emoji: '🦪', word: 'BARNACLE',    zh: '藤壺',     rarity: 2, pond: 19 },
  { id: 'map',         emoji: '🗺️', word: 'MAP',         zh: '地圖',     rarity: 1, pond: 19 },
  { id: 'captain',     emoji: '🧑‍✈️', word: 'CAPTAIN',     zh: '船長',     rarity: 2, pond: 19 },
  { id: 'ghostship',   emoji: '👻', word: 'GHOSTSHIP',   say: 'ghost ship', zh: '幽靈船', rarity: 4, pond: 19, legendary: true },

  // ===== Pond 20: 人魚珊瑚宮 (Mermaid Coral Palace) — pearl pink-teal, rarity 1-2 + legendary =====
  { id: 'seashell',       emoji: '🐚', word: 'SEASHELL',       say: 'sea shell', zh: '貝殼', rarity: 1, pond: 20 },
  { id: 'coral',          emoji: '🪸', word: 'CORAL',          zh: '珊瑚',     rarity: 1, pond: 20 },
  { id: 'palace',         emoji: '🏛️', word: 'PALACE',         zh: '皇宮',     rarity: 1, pond: 20 },
  { id: 'trident',        emoji: '🔱', word: 'TRIDENT',        zh: '三叉戟',   rarity: 2, pond: 20 },
  { id: 'conch',          emoji: '🐚', word: 'CONCH',          zh: '海螺',     rarity: 1, pond: 20 },
  { id: 'seaprincess',    emoji: '🧜‍♀️', word: 'SEAPRINCESS',    say: 'sea princess', zh: '人魚公主', rarity: 2, pond: 20 },
  { id: 'pearlnecklace',  emoji: '📿', word: 'PEARLNECKLACE',  say: 'pearl necklace', zh: '珍珠項鍊', rarity: 2, pond: 20 },
  { id: 'merman',         emoji: '🧜‍♂️', word: 'MERMAN',         zh: '人魚王子', rarity: 2, pond: 20 },
  { id: 'dolphin',        emoji: '🐬', word: 'DOLPHIN',        zh: '海豚',     rarity: 1, pond: 20 },
  { id: 'anemone',        emoji: '🪼', word: 'ANEMONE',        zh: '海葵',     rarity: 2, pond: 20 },
  { id: 'seasnail',       emoji: '🐌', word: 'SEASNAIL',       say: 'sea snail', zh: '海蝸牛', rarity: 1, pond: 20 },
  { id: 'wave',           emoji: '🌊', word: 'WAVE',           zh: '海浪',     rarity: 1, pond: 20 },
  { id: 'coralqueen',     emoji: '👑', word: 'CORALQUEEN',     say: 'coral queen', zh: '珊瑚女王', rarity: 4, pond: 20, legendary: true },

  // ===== Pond 21: 神社錦鯉池 (Shrine Koi Pond) — vermillion + koi white, rarity 1-2 + legendary =====
  { id: 'toriigate',   emoji: '⛩️', word: 'TORIIGATE',   say: 'torii gate', zh: '鳥居', rarity: 1, pond: 21 },
  { id: 'shrine',      emoji: '⛩️', word: 'SHRINE',      zh: '神社',     rarity: 1, pond: 21 },
  { id: 'bell',        emoji: '🔔', word: 'BELL',        zh: '鈴鐺',     rarity: 1, pond: 21 },
  { id: 'monk',        emoji: '🧘', word: 'MONK',        zh: '和尚',     rarity: 1, pond: 21 },
  { id: 'incense',     emoji: '🕯️', word: 'INCENSE',     zh: '香',       rarity: 2, pond: 21 },
  { id: 'goldkoi',     emoji: '🎏', word: 'GOLDKOI',     say: 'gold koi', zh: '金錦鯉', rarity: 1, pond: 21 },
  { id: 'silkkoi',     emoji: '🎏', word: 'SILKKOI',     say: 'silk koi', zh: '絲綢錦鯉', rarity: 2, pond: 21 },
  { id: 'wishribbon',  emoji: '🎀', word: 'WISHRIBBON',  say: 'wish ribbon', zh: '祈願繩', rarity: 2, pond: 21 },
  { id: 'stonelion',   emoji: '🦁', word: 'STONELION',   say: 'stone lion', zh: '石獅', rarity: 1, pond: 21 },
  { id: 'mapleleaf',   emoji: '🍁', word: 'MAPLELEAF',   say: 'maple leaf', zh: '楓葉', rarity: 1, pond: 21 },
  { id: 'drum',        emoji: '🥁', word: 'DRUM',        zh: '太鼓',     rarity: 1, pond: 21 },
  { id: 'foxstatue',   emoji: '🦊', word: 'FOXSTATUE',   say: 'fox statue', zh: '狐狸雕像', rarity: 2, pond: 21 },
  { id: 'koiemperor',  emoji: '👑', word: 'KOIEMPEROR',  say: 'koi emperor', zh: '錦鯉王', rarity: 4, pond: 21, legendary: true },

  // ===== Pond 22: 馬戲團水舞台 (Circus Water Stage) — festive red/gold, rarity 1-2 + legendary =====
  { id: 'circus',      emoji: '🎪', word: 'CIRCUS',      zh: '馬戲團',   rarity: 1, pond: 22 },
  { id: 'clown',       emoji: '🤡', word: 'CLOWN',       zh: '小丑',     rarity: 1, pond: 22 },
  { id: 'juggler',     emoji: '🤹', word: 'JUGGLER',     zh: '雜耍者',   rarity: 2, pond: 22 },
  { id: 'acrobat',     emoji: '🤸', word: 'ACROBAT',     zh: '特技演員', rarity: 2, pond: 22 },
  { id: 'tightrope',   emoji: '🎪', word: 'TIGHTROPE',   zh: '走鋼索',   rarity: 2, pond: 22 },
  { id: 'ringmaster',  emoji: '🎩', word: 'RINGMASTER',  zh: '馬戲團長', rarity: 2, pond: 22 },
  { id: 'balloon',     emoji: '🎈', word: 'BALLOON',     zh: '氣球',     rarity: 1, pond: 22 },
  { id: 'trapeze',     emoji: '🤸‍♀️', word: 'TRAPEZE',     zh: '空中飛人', rarity: 2, pond: 22 },
  { id: 'popcorn',     emoji: '🍿', word: 'POPCORN',     zh: '爆米花',   rarity: 1, pond: 22 },
  { id: 'confetti',    emoji: '🎊', word: 'CONFETTI',    zh: '彩紙',     rarity: 1, pond: 22 },
  { id: 'unicycle',    emoji: '🚲', word: 'UNICYCLE',    zh: '獨輪車',   rarity: 2, pond: 22 },
  { id: 'firehoop',    emoji: '🔥', word: 'FIREHOOP',    say: 'fire hoop', zh: '火圈', rarity: 1, pond: 22 },
  { id: 'circuswhale', emoji: '🐳', word: 'CIRCUSWHALE', say: 'circus whale', zh: '馬戲團鯨魚', rarity: 4, pond: 22, legendary: true },

  // ===== Pond 23: 萬聖南瓜沼 (Halloween Pumpkin Swamp) — orange/purple dusk, rarity 1-2 + legendary =====
  { id: 'jackolantern', emoji: '🎃', word: 'JACKOLANTERN', say: 'jack o lantern', zh: '南瓜燈', rarity: 1, pond: 23 },
  { id: 'mummy',        emoji: '🧟', word: 'MUMMY',        zh: '木乃伊',   rarity: 1, pond: 23 },
  { id: 'vampire',      emoji: '🧛', word: 'VAMPIRE',      zh: '吸血鬼',   rarity: 1, pond: 23 },
  { id: 'werewolf',     emoji: '🐺', word: 'WEREWOLF',     zh: '狼人',     rarity: 2, pond: 23 },
  { id: 'cauldron',     emoji: '🍯', word: 'CAULDRON',     zh: '大鍋',     rarity: 2, pond: 23 },
  { id: 'broomstick',   emoji: '🧹', word: 'BROOMSTICK',   zh: '掃帚',     rarity: 1, pond: 23 },
  { id: 'gravestone',   emoji: '🪦', word: 'GRAVESTONE',   zh: '墓碑',     rarity: 2, pond: 23 },
  { id: 'trickortreat', emoji: '🍬', word: 'TRICKORTREAT', say: 'trick or treat', zh: '不給糖就搗蛋', rarity: 1, pond: 23 },
  { id: 'cobweb',       emoji: '🕸️', word: 'COBWEB',       zh: '蜘蛛網',   rarity: 1, pond: 23 },
  { id: 'raven',        emoji: '🐦‍⬛', word: 'RAVEN',        zh: '烏鴉',     rarity: 1, pond: 23 },
  { id: 'scarecrow',    emoji: '🎃', word: 'SCARECROW',    zh: '稻草人',   rarity: 1, pond: 23 },
  { id: 'goblin',       emoji: '👺', word: 'GOBLIN',       zh: '哥布林',   rarity: 2, pond: 23 },
  { id: 'pumpkinking',  emoji: '👑', word: 'PUMPKINKING',  say: 'pumpkin king', zh: '南瓜王', rarity: 4, pond: 23, legendary: true },

  // ===== Pond 24: 聖誕冰湖 (Christmas Ice Lake) — deep green/red + snow, rarity 1-2 + legendary =====
  { id: 'santa',        emoji: '🎅', word: 'SANTA',        zh: '聖誕老人', rarity: 1, pond: 24 },
  { id: 'elf',          emoji: '🧝', word: 'ELF',          zh: '精靈',     rarity: 1, pond: 24 },
  { id: 'sleigh',       emoji: '🛷', word: 'SLEIGH',       zh: '雪橇',     rarity: 1, pond: 24 },
  { id: 'gingerbread',  emoji: '🍪', word: 'GINGERBREAD',  zh: '薑餅人',   rarity: 1, pond: 24 },
  { id: 'ornament',     emoji: '🎄', word: 'ORNAMENT',     zh: '裝飾品',   rarity: 2, pond: 24 },
  { id: 'mistletoe',    emoji: '🌿', word: 'MISTLETOE',    zh: '檞寄生',   rarity: 2, pond: 24 },
  { id: 'candycane',    emoji: '🍭', word: 'CANDYCANE',    say: 'candy cane', zh: '糖果拐杖', rarity: 1, pond: 24 },
  { id: 'wreath',       emoji: '🎄', word: 'WREATH',       zh: '花環',     rarity: 1, pond: 24 },
  { id: 'carol',        emoji: '🎶', word: 'CAROL',        zh: '頌歌',     rarity: 1, pond: 24 },
  { id: 'fireplace',    emoji: '🔥', word: 'FIREPLACE',    zh: '壁爐',     rarity: 1, pond: 24 },
  { id: 'stocking',     emoji: '🧦', word: 'STOCKING',     zh: '聖誕襪',   rarity: 2, pond: 24 },
  { id: 'frostfairy',   emoji: '🧚', word: 'FROSTFAIRY',   say: 'frost fairy', zh: '冰霜精靈', rarity: 2, pond: 24 },
  { id: 'crystalstag',  emoji: '🦌', word: 'CRYSTALSTAG',  say: 'crystal stag', zh: '水晶麋鹿', rarity: 4, pond: 24, legendary: true },

  // ===== Pond 25: 夕陽金灘 (Sunset Golden Beach) — gold/orange, rarity 1-2 + legendary =====
  { id: 'seagull',       emoji: '🐦', word: 'SEAGULL',       zh: '海鷗',     rarity: 1, pond: 25 },
  { id: 'sandcastle',    emoji: '🏰', word: 'SANDCASTLE',    zh: '沙堡',     rarity: 1, pond: 25 },
  { id: 'sunset',        emoji: '🌅', word: 'SUNSET',        zh: '夕陽',     rarity: 1, pond: 25 },
  { id: 'palmleaf',      emoji: '🌴', word: 'PALMLEAF',      say: 'palm leaf', zh: '棕櫚葉', rarity: 2, pond: 25 },
  { id: 'horizon',       emoji: '🌄', word: 'HORIZON',       zh: '地平線',   rarity: 2, pond: 25 },
  { id: 'driftwood',     emoji: '🪵', word: 'DRIFTWOOD',     zh: '浮木',     rarity: 2, pond: 25 },
  { id: 'beachball',     emoji: '🏐', word: 'BEACHBALL',     say: 'beach ball', zh: '沙灘球', rarity: 1, pond: 25 },
  { id: 'flamingo',      emoji: '🦩', word: 'FLAMINGO',      zh: '紅鶴',     rarity: 1, pond: 25 },
  { id: 'sanddollar',    emoji: '⭐', word: 'SANDDOLLAR',    say: 'sand dollar', zh: '沙錢海星', rarity: 2, pond: 25 },
  { id: 'sunhat',        emoji: '👒', word: 'SUNHAT',        say: 'sun hat', zh: '遮陽帽', rarity: 1, pond: 25 },
  { id: 'coconut',       emoji: '🥥', word: 'COCONUT',       zh: '椰子',     rarity: 1, pond: 25 },
  { id: 'tide',          emoji: '🌊', word: 'TIDE',          zh: '潮汐',     rarity: 1, pond: 25 },
  { id: 'goldensunfish',  emoji: '🐠', word: 'GOLDENSUNFISH', say: 'golden sun fish', zh: '黃金太陽魚', rarity: 4, pond: 25, legendary: true },

  // ===== Pond 26: 魔法藥水湖 (Magic Potion Lake) — violet glow, rarity 1-2 + legendary =====
  { id: 'potion',        emoji: '🧪', word: 'POTION',        zh: '藥水',     rarity: 1, pond: 26 },
  { id: 'flask',         emoji: '⚗️', word: 'FLASK',         zh: '燒瓶',     rarity: 1, pond: 26 },
  { id: 'wizardhat',     emoji: '🎩', word: 'WIZARDHAT',     say: 'wizard hat', zh: '巫師帽', rarity: 2, pond: 26 },
  { id: 'spellbook',     emoji: '📖', word: 'SPELLBOOK',     say: 'spell book', zh: '魔法書', rarity: 2, pond: 26 },
  { id: 'crystalball',   emoji: '🔮', word: 'CRYSTALBALL',   say: 'crystal ball', zh: '水晶球', rarity: 2, pond: 26 },
  { id: 'magicwand',     emoji: '🪄', word: 'MAGICWAND',     say: 'magic wand', zh: '魔杖', rarity: 1, pond: 26 },
  { id: 'alchemist',     emoji: '🧑‍🔬', word: 'ALCHEMIST',     zh: '煉金術士', rarity: 2, pond: 26 },
  { id: 'elixir',        emoji: '🍶', word: 'ELIXIR',        zh: '萬能藥',   rarity: 2, pond: 26 },
  { id: 'stardust',      emoji: '✨', word: 'STARDUST',      zh: '星塵',     rarity: 1, pond: 26 },
  { id: 'glowmushroom',  emoji: '🍄', word: 'GLOWMUSHROOM',  say: 'glow mushroom', zh: '發光蘑菇', rarity: 1, pond: 26 },
  { id: 'runestone',     emoji: '🪨', word: 'RUNESTONE',     zh: '符文石',   rarity: 2, pond: 26 },
  { id: 'sorceress',     emoji: '🧙‍♀️', word: 'SORCERESS',     zh: '女巫師',   rarity: 2, pond: 26 },
  { id: 'potiondragon',  emoji: '🐉', word: 'POTIONDRAGON',  say: 'potion dragon', zh: '藥水巨龍', rarity: 4, pond: 26, legendary: true },

  // ===== Pond 27: 雷雨閃電湖 (Thunderstorm Lightning Lake) — dark grey + electric blue, rarity 1-2 + legendary =====
  { id: 'thunder',      emoji: '⛈️', word: 'THUNDER',      zh: '雷聲',     rarity: 1, pond: 27 },
  { id: 'lightning',    emoji: '⚡', word: 'LIGHTNING',    zh: '閃電',     rarity: 1, pond: 27 },
  { id: 'stormcloud',   emoji: '🌩️', word: 'STORMCLOUD',   say: 'storm cloud', zh: '暴風雲', rarity: 1, pond: 27 },
  { id: 'raindrop',     emoji: '💧', word: 'RAINDROP',     say: 'rain drop', zh: '雨滴', rarity: 1, pond: 27 },
  { id: 'umbrella',     emoji: '☂️', word: 'UMBRELLA',     zh: '雨傘',     rarity: 1, pond: 27 },
  { id: 'tornado',      emoji: '🌪️', word: 'TORNADO',      zh: '龍捲風',   rarity: 2, pond: 27 },
  { id: 'hurricane',    emoji: '🌀', word: 'HURRICANE',    zh: '颶風',     rarity: 2, pond: 27 },
  { id: 'electriceel',  emoji: '🐍', word: 'ELECTRICEEL',  say: 'electric eel', zh: '電鰻', rarity: 2, pond: 27 },
  { id: 'thunderbird',  emoji: '🦅', word: 'THUNDERBIRD',  zh: '雷鳥',     rarity: 2, pond: 27 },
  { id: 'raincoat',     emoji: '🧥', word: 'RAINCOAT',     zh: '雨衣',     rarity: 1, pond: 27 },
  { id: 'spark',        emoji: '✨', word: 'SPARK',        zh: '火花',     rarity: 1, pond: 27 },
  { id: 'windstorm',    emoji: '💨', word: 'WINDSTORM',    zh: '風暴',     rarity: 2, pond: 27 },
  { id: 'thunderdragon',emoji: '🐉', word: 'THUNDERDRAGON',say: 'thunder dragon', zh: '雷霆巨龍', rarity: 4, pond: 27, legendary: true },

  // ===== Pond 28: 天空雲海池 (Sky Cloud Sea Pond) — white/azure, rarity 1-2 + legendary =====
  { id: 'skywhale',      emoji: '🐳', word: 'SKYWHALE',      say: 'sky whale', zh: '天空鯨', rarity: 2, pond: 28 },
  { id: 'cloudsheep',    emoji: '🐑', word: 'CLOUDSHEEP',    say: 'cloud sheep', zh: '雲朵羊', rarity: 1, pond: 28 },
  { id: 'kite',          emoji: '🪁', word: 'KITE',          zh: '風箏',     rarity: 1, pond: 28 },
  { id: 'hotairballoon', emoji: '🎈', word: 'HOTAIRBALLOON', say: 'hot air balloon', zh: '熱氣球', rarity: 2, pond: 28 },
  { id: 'feather',       emoji: '🪶', word: 'FEATHER',       zh: '羽毛',     rarity: 1, pond: 28 },
  { id: 'sunbeam',       emoji: '☀️', word: 'SUNBEAM',       zh: '陽光',     rarity: 1, pond: 28 },
  { id: 'skylark',       emoji: '🐦', word: 'SKYLARK',       zh: '雲雀',     rarity: 2, pond: 28 },
  { id: 'cloudcastle',   emoji: '☁️', word: 'CLOUDCASTLE',   say: 'cloud castle', zh: '雲朵城堡', rarity: 2, pond: 28 },
  { id: 'glider',        emoji: '🛩️', word: 'GLIDER',        zh: '滑翔機',   rarity: 1, pond: 28 },
  { id: 'jetstream',     emoji: '💫', word: 'JETSTREAM',     say: 'jet stream', zh: '高空氣流', rarity: 2, pond: 28 },
  { id: 'angelfish',     emoji: '🐠', word: 'ANGELFISH',     zh: '天使魚',   rarity: 1, pond: 28 },
  { id: 'moonbeam',      emoji: '🌙', word: 'MOONBEAM',      zh: '月光',     rarity: 1, pond: 28 },
  { id: 'cloudphoenix',  emoji: '🐦‍🔥', word: 'CLOUDPHOENIX',  say: 'cloud phoenix', zh: '雲之鳳凰', rarity: 4, pond: 28, legendary: true },

  // ===== Pond 29: 彩虹瀑布秘境 (Rainbow Waterfall Secret Realm) — multi pastel, rarity 1-2 + legendary =====
  { id: 'prism',         emoji: '🔷', word: 'PRISM',         zh: '稜鏡',     rarity: 1, pond: 29 },
  { id: 'spectrum',      emoji: '🌈', word: 'SPECTRUM',      zh: '光譜',     rarity: 2, pond: 29 },
  { id: 'cascade',       emoji: '💦', word: 'CASCADE',       zh: '瀑布傾瀉', rarity: 2, pond: 29 },
  { id: 'rainbowtrout',  emoji: '🐟', word: 'RAINBOWTROUT',  say: 'rainbow trout', zh: '彩虹鱒魚', rarity: 2, pond: 29 },
  { id: 'aurora',        emoji: '🌌', word: 'AURORA',        zh: '極光',     rarity: 2, pond: 29 },
  { id: 'gemstone',      emoji: '💎', word: 'GEMSTONE',      zh: '寶石',     rarity: 1, pond: 29 },
  { id: 'crystalfalls',  emoji: '🏞️', word: 'CRYSTALFALLS',  say: 'crystal falls', zh: '水晶瀑布', rarity: 2, pond: 29 },
  { id: 'pixie',         emoji: '🧚', word: 'PIXIE',         zh: '小精靈',   rarity: 1, pond: 29 },
  { id: 'dewdrop',       emoji: '💧', word: 'DEWDROP',       zh: '露珠',     rarity: 1, pond: 29 },
  { id: 'sunshower',     emoji: '🌦️', word: 'SUNSHOWER',     say: 'sun shower', zh: '太陽雨', rarity: 2, pond: 29 },
  { id: 'colorbird',     emoji: '🐦', word: 'COLORBIRD',     say: 'color bird', zh: '彩色鳥', rarity: 1, pond: 29 },
  { id: 'magicmist',     emoji: '🌫️', word: 'MAGICMIST',     say: 'magic mist', zh: '魔法薄霧', rarity: 2, pond: 29 },
  { id: 'prismdragon',   emoji: '🐉', word: 'PRISMDRAGON',   say: 'prism dragon', zh: '稜鏡神龍', rarity: 4, pond: 29, legendary: true },
];
