# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**english_savior** — A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube. Target audience: Taiwanese elementary school students. UI language is Traditional Chinese (zh-TW).

## Architecture

Pure frontend (HTML/CSS/JS), no build tools, bundlers, or backend required. Open `index.html` directly in a browser or serve via any static HTTP server (e.g. `python -m http.server`).

### File Structure
```
index.html              — Single-page app shell (all zones, modals, HUD)
css/
  style.css             — Global styles, HUD, modals, navigation
  minecraft.css         — Minecraft vocabulary theme
  roblox.css            — Roblox grammar theme
  youtube.css           — YouTube video theme
  spelling.css          — Spelling runner theme
  listening.css         — Listening game theme
  empire.css            — Empire 3D defense theme
  candy.css             — Candy match-3 theme
  sling.css             — Word slingshot theme
  builder.css           — Sentence builder theme
  speak.css             — Spell academy (speaking) theme
  tower.css             — Word boss tower (orb battle) theme
  rpg.css               — English adventure RPG (Undertale-style) theme
  sky.css               — Sky Citadel open-world 3D theme (prefix aw-)
js/
  app.js                — Navigation and initialization (DOMContentLoaded entry point)
  engine.js             — Core game engine (XP, levels, gems, inventory, achievements, shop, buff system, daily quest rewards, sound effects, localStorage save)
  music.js              — Background music (MusicManager: 18 synthesized Web Audio tracks, per-zone rotation playlists, crossfades, 🎵 toggle persisted as music_enabled)
  minecraft.js          — Minecraft-themed vocabulary crafting game
  roblox.js             — Roblox-themed grammar obstacle course
  youtube.js            — YouTube-themed reading comprehension with quizzes
  spelling.js           — Chrome Dino-style spelling runner (canvas; auto-skips non-letter chars in words like "MR.", power-ups/flyers+duck/biomes/combo transforms)
  listening.js          — Magical listening card game (Web Speech API)
  empire.js             — Age of Empires-style 3D castle defense (Three.js)
  candy.js              — Candy Crush-style match-3 with vocabulary quizzes
  sling.js              — Angry Birds-style word slingshot (canvas physics)
  builder.js            — Duolingo-style sentence builder (word-order game building 33 world landmarks with cultural facts)
  speak.js              — Spell academy speaking game (Web Speech Recognition, honor-mode fallback)
  tower.js              — Tower of Saviors-style word boss battle (drag letter orbs to spell words; 12 bosses scale endlessly by floor)
  rpg.js                — Undertale-style 2D RPG engine for conversation practice (interprets RPG_CHAPTERS data)
  sky.js                — Sky Citadel open-world 3D adventure (Three.js; islands/physics/camera/mobs/62 quests incl. 10 hidden/3 bosses/galaxy+secret portals/title perks/minimap)
  cloud.js              — Save backup: file export/import + optional Google Drive appDataFolder sync (owner fills GOOGLE_CLIENT_ID; see DEPLOYMENT.md)
  daily.js              — Daily quest tracking and rendering
  tts.js                — Text-to-speech module (Web Speech API)
  vendor/
    three.min.js        — Three.js r149 (vendored UMD build, no CDN)
  data/
    vocab.js            — Vocabulary words (VOCAB_DATA, easy/medium/hard, 2,080 words covering the 十二年國教課綱 2,000-word list)
    vocab2.js           — Vocabulary expansion pack #2 (+1,000 words pushed into VOCAB_DATA → 3,080 total; loaded after vocab.js)
    grammar.js          — Grammar questions (GRAMMAR_DATA, 480 questions, 68 topics covering the 國中基礎文法句構參考表)
    grammar2.js         — Grammar expansion pack #2 (+1,000 questions pushed into GRAMMAR_DATA → 1,480 total; loaded after grammar.js)
    video.js            — Video lessons (VIDEO_LESSONS, 42 lessons with 126 quiz questions)
    empire.js           — Empire dialogues (EMPIRE_DIALOGUES) and daily-life English (EMPIRE_LIFE), easy/medium/hard
    empire2.js          — Conversation expansion pack #2 (+1,200 dialogues → 1,260, +800 life scenes → 856; loaded after empire.js)
    rpg.js              — RPG chapters (RPG_CHAPTERS, 9 chapters mapped to 課綱學習主題; maps, NPCs, dialogue scripts)
    sky.js              — Sky Citadel world data (SKY_CONFIG, SKY_ISLANDS ×32 incl. 12 galaxy + 4 secret isles, SKY_BRIDGES, SKY_PADS, SKY_PORTALS ×10, SKY_QUESTS ×62 incl. 10 hidden sqh_, SKY_MOBS ×8, SKY_SKIN_TINTS)
    game.js             — Achievements (41, each with pts; `hidden` ones show ??? until unlocked), daily quests (12), inventory items (8, usable as charms), shop items (consumables/skins/titles/themes), ACH_POINT_REWARDS, LEVEL_MILESTONES, CHARM_PERKS, SELL_PRICES
reference/
  taiwan_elementary_1000_minecraft_flavor.csv  — Source word list reference
```

### Module Pattern

All game modules use the IIFE (Immediately Invoked Function Expression) pattern and expose a single global object:
- `GameEngine` — core state management (engine.js)
- `SoundManager` — synthesized audio (engine.js)
- `MusicManager` — synthesized background music (music.js)
- `MinecraftGame` — vocabulary game (minecraft.js)
- `RobloxGame` — grammar game (roblox.js)
- `YoutubeGame` — video comprehension (youtube.js)
- `SpellingGame` — spelling runner (spelling.js)
- `ListeningGame` — listening game (listening.js)
- `EmpireGame` — 3D castle defense (empire.js)
- `CandyGame` — match-3 vocabulary game (candy.js)
- `SlingGame` — word slingshot physics game (sling.js)
- `BuilderGame` — sentence builder word-order game (builder.js)
- `SpeakGame` — spell academy speaking game (speak.js)
- `TowerGame` — word boss tower orb battle (tower.js)
- `RpgGame` — English adventure RPG (rpg.js)
- `SkyGame` — Sky Citadel open-world 3D adventure (sky.js)
- `CloudSave` — save export/import + Google Drive sync (cloud.js)
- `DailyQuests` — daily quest system (daily.js)
- `TTSManager` — text-to-speech (tts.js)

Each game module exports `{ init }`. `app.js` calls all `.init()` methods on `DOMContentLoaded`. `EmpireGame`, `SlingGame`, `SpellingGame` and `SkyGame` additionally export `onShow()`, called by app.js when their zone becomes visible to resume their paused render loops.

### Adding Content
- **Vocabulary**: add entries to `VOCAB_DATA` in `js/data/vocab.js` (easy/medium/hard). Each entry needs `word`, `hint` (emoji), `zh` (Chinese explanation), `sentence` (fill-in-the-blank with `___`).
- **Grammar**: add entries to `GRAMMAR_DATA` in `js/data/grammar.js`. Each entry needs `sentence`, `blank`, `options` (4 choices), `explain`, `topic`.
- **Video lessons**: add entries to `VIDEO_LESSONS` in `js/data/video.js`. Each entry needs `title`, `titleZh`, `thumbnail`, `script`, `vocab`, and quiz `questions`.
- **Empire dialogues**: add entries to `EMPIRE_DIALOGUES` in `js/data/empire.js` (easy/medium/hard). Each entry needs `q` (line spoken to the player), `qZh` (Chinese meaning), `a` (correct response), `wrong` (3 distractors).
- **RPG chapters**: append entries to `RPG_CHAPTERS` in `js/data/rpg.js`. Each chapter needs `id`, `title`, `theme` (課綱學習主題), `icon`, tile emoji (`wall`/`deco`) and colours (`floor`/`path`), a 13×9 ASCII `map`, `spawn`, `npcs` (each with a `talk` script of say/ask entries), and a `boss`. The engine in js/rpg.js interprets everything — no code changes needed for new chapters.
- **Empire life English**: add entries to `EMPIRE_LIFE` in `js/data/empire.js` (easy/medium/hard). Each entry needs `scene` (Chinese scenario), `q` (English question), `a`, `wrong` (3 distractors). Empire also reuses `VOCAB_DATA` and `GRAMMAR_DATA` for vocabulary/grammar questions.
- **Sky quests**: add entries to `SKY_QUESTS` in `js/data/sky.js`. Each quest needs `id`, `island` (a SKY_ISLANDS id), `type` (`chest`/`gate`/`npc`/`listen`/`pillars`/`runes`/`arena`/`bridge`/`race`/`boss`), `name`, `diff` (`easy`/`medium`/`hard`/`boss` — sets the reward tier), `n` (questions/pairs/mobs/rings/words by type), `dx`/`dz` (position relative to the island centre), `intro`, and optionally `npc` (emoji), `mob` (SKY_MOBS id for arenas), `time` (race seconds), `lock` (total clears required). js/sky.js builds the quest object, marker and quiz flow automatically. New islands go in `SKY_ISLANDS` (id/name/type/pos/r/seed) and are decorated procedurally by type. The galaxy region (`isle_gx_*` islands, `sqg_*` quests, all `lock: 22`+) is reached through `SKY_PORTALS` after 22 total clears; bosses are parameterized via BOSS_DEFS in js/sky.js. The secret realm (`isle_sc_*` isles with `secret: true`, `sqh_*` quests with `hidden: true`) is entered through hidden portals that reveal within 12u proximity (persisted in `save.secretsFound`); hidden quests are masked as ??? in the journal, excluded from `totalCleared()` lock math, and tracked by the engine's `skySecretQuests`/`skySecretFound`/`skySecretBoss` counters for the 3 `hidden` achievements.
- **Achievements/quests/items/shop**: edit `js/data/game.js`.

### Key Systems
- **Gamification**: XP (dynamic scaling: 80 + level × 20 per level), gems (currency), streaks, achievements (each grants 15 gems + pts), daily quests
- **Achievement points**: derived from unlocked achievements (10/20/40 pts tiers, 830 total); ACH_POINT_REWARDS thresholds grant exclusive titles/skins/themes (state.pointRewardsClaimed)
- **Level milestones**: LEVEL_MILESTONES every 5 levels to 50 grant gems/items/exclusive unlocks (state.milestonesClaimed; granted in addXP via grantLevelMilestones)
- **Shop**: Consumables (buffs, some with `uses`/`minLevel`), skins (13), titles (15), themes (6) — `unlock`-flagged items are never purchasable (granted by milestones/points/collection)
- **Themes**: body[data-theme] overrides :root CSS vars (style.css); applyTheme() on load/equip; owned in state.owned.themes
- **Lucky charms**: equip an inventory collectible (state.equipped.charm) for passive XP/gem perks (CHARM_PERKS, applied inside addXP/addGems); duplicates sellable via sellItem (SELL_PRICES); owning all 8 grants a one-time collection reward
- **Buff system**: `double_xp`, `hint`, `revive`, `lucky`, `instant_xp`, `gem_bonus`, `streak_shield` (consumed in load()), `double_gems` (consumed in addGems), `glide`/`jump_boost` (consumed once per Sky Citadel adventure), plus instant effects `instant_xp_big`, `mystery_item`
- **Sky title perks**: js/sky.js maps every equipped shop title to an in-world ability (TITLE perks in computePerks(): speed/jump/double-jump/glide/damage/hearts/XP/gem multipliers, quiz hints); recomputed on adventure start and re-equip
- **Re-entrancy rule**: reward grants inside checkAchievements/checkPointRewards/grantLevelMilestones/checkCollectionReward mutate `state.gems`/`state.owned` directly — never call addGems/addXP there
- **Cloud save**: js/cloud.js exports all 9 localStorage keys as a v1 JSON payload; file export/import always works; Google Drive appDataFolder sync activates only when GOOGLE_CLIENT_ID is set (GIS script lazy-loaded on sign-in — the sole external-script exception); the ID can live in the source or be injected at deploy time from the repo's Actions variable/secret GOOGLE_CLIENT_ID by .github/workflows/deploy.yml (requires Pages source = GitHub Actions)
- **Sound**: Synthesized via Web Audio API (no audio files needed)
- **Music**: js/music.js composes 18 looping tracks as data (chords/bass/melody) and renders them live with Web Audio (soft palette for learning screens, chiptune for battle); `ZONE_TRACKS` maps each zone to a playlist and `MusicManager.playForZone()` (run on every zone switch, called in app.js switchZone) rotates through it per visit; the sky boss fight swaps to the `boss` track, secret realms to `mystic`; independent 🎵 HUD toggle persisted as localStorage `music_enabled`; playback starts only after the first user gesture (autoplay policy)
- **TTS**: Web Speech API for word pronunciation (en-US, zh-TW)
- **Storage**: All state persisted in `localStorage` as JSON
- **Level-up deferral**: `GameEngine.setDeferLevelUp(true/false)` prevents modal spam during rapid answer sequences; call `flushPendingLevelUps()` when the game round ends

### Reward Scaling by Difficulty
| Game | Easy | Medium | Hard |
|------|------|--------|------|
| Vocabulary (Minecraft) | 10 XP, 1 gem | 20 XP, 2 gems | 35 XP, 4 gems |
| Spelling runner | 15 XP + 1 gem/word, +10 gems round bonus | per-word same, +20 gems bonus | per-word same, +30 gems bonus |
| Listening | 10 XP/correct | 12 XP/correct | 15 XP/correct |
| Word slingshot | 12 XP + 1 gem/hit, +10 gems round bonus | 16 XP + 1 gem/hit, +15 gems bonus | 20 XP + 1 gem/hit, +20 gems bonus |
| Sentence builder | 15 XP + 1 gem/sentence, +10 gems house bonus | 20 XP + 1 gem, +15 gems bonus | 25 XP + 1 gem, +20 gems bonus |
| Spell academy | 12 XP + 1 gem/monster, +10 gems round bonus | 16 XP + 1 gem, +15 gems bonus | 20 XP + 1 gem, +20 gems bonus (honor mode halves XP and bonus) |

RPG (英語冒險物語) is chapter-based instead of difficulty-based: each first-try correct conversation answer grants 10 XP + 1 gem (5 XP after a retry, no gem), and clearing chapter N grants 40+15×(N-1) XP and 10+2×(N-1) gems with a 1-3 star rating from the first-try correct ratio. Tower (單字魔王塔) scales by floor tier (1-9 easy / 10-19 medium / 20+ hard): boss kill grants 30/45/60 XP + 5/8/11 gems, spelling the quest word grants 10 XP + 1 gem (plus double damage and +15 HP in-game). Empire (英語帝國) scales by age instead of difficulty: 10/15/20/25 XP + 1 gem per kill in Dark/Feudal/Castle/Imperial age, plus a 5/10/15/20-gem wave-clear bonus. Candy (糖果消消樂) scales by level tier (1-9 easy / 10-19 medium / 20+ hard): level clear grants 30/45/60 XP + 5/8/11 gems, and answering a magic-star vocabulary quiz on the first try grants 15 XP + 1 gem. Sky Citadel (天空之城) scales by quest `diff`: each first-try correct answer grants 8/12/16 XP + 1 gem (easy/medium/hard, retries half XP, no gem), first clears grant 30/50/80 XP + 5/8/12 gems (boss 150 XP + 25 gems), replays pay half XP with no clear bonus, mob kills pay +2 gems; equipped-title perks multiply these further. Every completed daily quest grants 10 XP; completing all of them grants a one-time 50 gems + random item per day.

### Browser APIs Used
- **Web Audio API** — synthesized sound effects (SoundManager)
- **Web Speech API** — text-to-speech pronunciation (TTSManager), listening game audio, and speech recognition for the spell academy (with self-graded "honor mode" fallback where unavailable, e.g. iOS Safari)
- **Canvas 2D API** — spelling runner rendering (800×340 px), word slingshot physics (880×420 px), and the Sky Citadel minimap (140×140 px)
- **WebGL via Three.js** — empire 3D battlefield and Sky Citadel open world (`js/vendor/three.min.js`, r149)
- **localStorage** — game state persistence (`english_savior_save` for the engine, `english_savior_empire` for empire campaign progress, `english_savior_candy` for candy level progress, `english_savior_builder` for the landmark collection, `english_savior_tower` for the tower floor, `english_savior_rpg` for RPG chapter progress, `english_savior_sky` for Sky Citadel quests/settings)

## Naming Conventions
- **CSS classes**: kebab-case with module prefix (`mc-block`, `rb-platform`, `yt-card`, `sp-canvas`, `ls-card`)
- **JavaScript functions/variables**: camelCase
- **Global modules**: PascalCase (`MinecraftGame`, `GameEngine`)
- **Data constants**: UPPER_SNAKE_CASE (`VOCAB_DATA`, `GRAMMAR_DATA`, `ACHIEVEMENTS`)
- **DOM IDs**: kebab-case (`zone-minecraft`, `modal-shop`, `btn-help`)

## Development

No build step. No dependencies. No package.json. To run locally:
```bash
# Any static file server works:
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Cache busting
All CSS/JS references in index.html carry a `?v=N` query string. GitHub Pages caches assets for 10 minutes, so a freshly deployed index.html can otherwise pair with stale cached JS/CSS (symptoms: a new game's zone shows but its dynamic UI is empty). **Bump the version number on every release that changes JS or CSS** (single `sed -i 's/?v=18/?v=19/g' index.html`-style edit).

### Testing
There is no automated test suite. Manual testing in a browser is the current workflow. Verify changes by opening `index.html` and exercising the affected game zone.

### External Resources
- **Google Fonts**: Press Start 2P (pixel game font), Noto Sans TC (Chinese text)
- **Google Identity Services** (`accounts.google.com/gsi/client`): lazy-loaded by js/cloud.js only when the owner has configured GOOGLE_CLIENT_ID and the user clicks sign-in — never loaded otherwise
- **Three.js r149**: vendored at `js/vendor/three.min.js`, loaded via plain script tag
- No CDN libraries or npm packages — fully self-contained
