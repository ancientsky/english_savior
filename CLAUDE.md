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
js/
  app.js                — Navigation and initialization (DOMContentLoaded entry point)
  engine.js             — Core game engine (XP, levels, gems, inventory, achievements, shop, buff system, sound effects, localStorage save)
  minecraft.js          — Minecraft-themed vocabulary crafting game
  roblox.js             — Roblox-themed grammar obstacle course
  youtube.js            — YouTube-themed reading comprehension with quizzes
  spelling.js           — Chrome Dino-style spelling runner game (canvas-based)
  listening.js          — Magical listening card game (Web Speech API)
  daily.js              — Daily quest tracking and rendering
  tts.js                — Text-to-speech module (Web Speech API)
  data/
    vocab.js            — Vocabulary words (VOCAB_DATA, easy/medium/hard, 1,270+ words)
    grammar.js          — Grammar questions (GRAMMAR_DATA, 430+ questions, 62 topics)
    video.js            — Video lessons (VIDEO_LESSONS, 42 lessons with 126 quiz questions)
    game.js             — Achievements (16), daily quests (4), inventory items, shop items
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
- `DailyQuests` — daily quest system (daily.js)
- `TTSManager` — text-to-speech (tts.js)

Each game module exports `{ init }`. `app.js` calls all `.init()` methods on `DOMContentLoaded`.

### Adding Content
- **Vocabulary**: add entries to `VOCAB_DATA` in `js/data/vocab.js` (easy/medium/hard). Each entry needs `word`, `hint` (emoji), `zh` (Chinese explanation), `sentence` (fill-in-the-blank with `___`).
- **Grammar**: add entries to `GRAMMAR_DATA` in `js/data/grammar.js`. Each entry needs `sentence`, `blank`, `options` (4 choices), `explain`, `topic`.
- **Video lessons**: add entries to `VIDEO_LESSONS` in `js/data/video.js`. Each entry needs `title`, `titleZh`, `thumbnail`, `script`, `vocab`, and quiz `questions`.
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
| Spelling runner | 10 gems/round | 20 gems/round | 30 gems/round |
| Listening | 10 XP/correct | 12 XP/correct | 15 XP/correct |

### Browser APIs Used
- **Web Audio API** — synthesized sound effects (SoundManager)
- **Web Speech API** — text-to-speech pronunciation (TTSManager) and listening game audio
- **Canvas 2D API** — spelling runner rendering (800×340 px)
- **localStorage** — game state persistence

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
- No CDN libraries or npm packages — fully self-contained
