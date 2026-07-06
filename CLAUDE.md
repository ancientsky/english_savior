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
js/
  app.js                — Navigation and initialization (DOMContentLoaded entry point)
  engine.js             — Core game engine (XP, levels, gems, inventory, achievements, shop, buff system, daily quest rewards, sound effects, localStorage save)
  minecraft.js          — Minecraft-themed vocabulary crafting game
  roblox.js             — Roblox-themed grammar obstacle course
  youtube.js            — YouTube-themed reading comprehension with quizzes
  spelling.js           — Chrome Dino-style spelling runner game (canvas-based)
  listening.js          — Magical listening card game (Web Speech API)
  empire.js             — Age of Empires-style 3D castle defense (Three.js)
  candy.js              — Candy Crush-style match-3 with vocabulary quizzes
  sling.js              — Angry Birds-style word slingshot (canvas physics)
  daily.js              — Daily quest tracking and rendering
  tts.js                — Text-to-speech module (Web Speech API)
  vendor/
    three.min.js        — Three.js r149 (vendored UMD build, no CDN)
  data/
    vocab.js            — Vocabulary words (VOCAB_DATA, easy/medium/hard, 2,080 words covering the 十二年國教課綱 2,000-word list)
    grammar.js          — Grammar questions (GRAMMAR_DATA, 480 questions, 68 topics covering the 國中基礎文法句構參考表)
    video.js            — Video lessons (VIDEO_LESSONS, 42 lessons with 126 quiz questions)
    empire.js           — Empire dialogues (EMPIRE_DIALOGUES) and daily-life English (EMPIRE_LIFE), easy/medium/hard
    game.js             — Achievements (23), daily quests (7), inventory items, shop items
reference/
  taiwan_elementary_1000_minecraft_flavor.csv  — Source word list reference
```

### Module Pattern

All game modules use the IIFE (Immediately Invoked Function Expression) pattern and expose a single global object:
- `GameEngine` — core state management (engine.js)
- `SoundManager` — synthesized audio (engine.js)
- `MinecraftGame` — vocabulary game (minecraft.js)
- `RobloxGame` — grammar game (roblox.js)
- `YoutubeGame` — video comprehension (youtube.js)
- `SpellingGame` — spelling runner (spelling.js)
- `ListeningGame` — listening game (listening.js)
- `EmpireGame` — 3D castle defense (empire.js)
- `CandyGame` — match-3 vocabulary game (candy.js)
- `SlingGame` — word slingshot physics game (sling.js)
- `DailyQuests` — daily quest system (daily.js)
- `TTSManager` — text-to-speech (tts.js)

Each game module exports `{ init }`. `app.js` calls all `.init()` methods on `DOMContentLoaded`. `EmpireGame` and `SlingGame` additionally export `onShow()`, called by app.js when their zone becomes visible to resume their paused render loops.

### Adding Content
- **Vocabulary**: add entries to `VOCAB_DATA` in `js/data/vocab.js` (easy/medium/hard). Each entry needs `word`, `hint` (emoji), `zh` (Chinese explanation), `sentence` (fill-in-the-blank with `___`).
- **Grammar**: add entries to `GRAMMAR_DATA` in `js/data/grammar.js`. Each entry needs `sentence`, `blank`, `options` (4 choices), `explain`, `topic`.
- **Video lessons**: add entries to `VIDEO_LESSONS` in `js/data/video.js`. Each entry needs `title`, `titleZh`, `thumbnail`, `script`, `vocab`, and quiz `questions`.
- **Empire dialogues**: add entries to `EMPIRE_DIALOGUES` in `js/data/empire.js` (easy/medium/hard). Each entry needs `q` (line spoken to the player), `qZh` (Chinese meaning), `a` (correct response), `wrong` (3 distractors).
- **Empire life English**: add entries to `EMPIRE_LIFE` in `js/data/empire.js` (easy/medium/hard). Each entry needs `scene` (Chinese scenario), `q` (English question), `a`, `wrong` (3 distractors). Empire also reuses `VOCAB_DATA` and `GRAMMAR_DATA` for vocabulary/grammar questions.
- **Achievements/quests/items/shop**: edit `js/data/game.js`.

### Key Systems
- **Gamification**: XP (dynamic scaling: 80 + level × 20 per level), gems (currency), streaks, achievements, daily quests
- **Shop**: Consumables (buffs), skins (9), titles (9) — all purchasable with gems
- **Buff system**: `double_xp`, `hint`, `revive`, `lucky`, `instant_xp`, `gem_bonus`
- **Sound**: Synthesized via Web Audio API (no audio files needed)
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

Empire (英語帝國) scales by age instead of difficulty: 10/15/20/25 XP + 1 gem per kill in Dark/Feudal/Castle/Imperial age, plus a 5/10/15/20-gem wave-clear bonus. Candy (糖果消消樂) scales by level tier (1-9 easy / 10-19 medium / 20+ hard): level clear grants 30/45/60 XP + 5/8/11 gems, and answering a magic-star vocabulary quiz on the first try grants 15 XP + 1 gem. Every completed daily quest grants 10 XP; completing all of them grants a one-time 50 gems + random item per day.

### Browser APIs Used
- **Web Audio API** — synthesized sound effects (SoundManager)
- **Web Speech API** — text-to-speech pronunciation (TTSManager) and listening game audio
- **Canvas 2D API** — spelling runner rendering (800×340 px) and word slingshot physics (880×420 px)
- **WebGL via Three.js** — empire 3D battlefield rendering (`js/vendor/three.min.js`, r149)
- **localStorage** — game state persistence (`english_savior_save` for the engine, `english_savior_empire` for empire campaign progress, `english_savior_candy` for candy level progress)

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

### Testing
There is no automated test suite. Manual testing in a browser is the current workflow. Verify changes by opening `index.html` and exercising the affected game zone.

### External Resources
- **Google Fonts**: Press Start 2P (pixel game font), Noto Sans TC (Chinese text)
- **Three.js r149**: vendored at `js/vendor/three.min.js`, loaded via plain script tag
- No CDN libraries or npm packages — fully self-contained
