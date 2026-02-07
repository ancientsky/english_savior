# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**english_savior** — A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube.

## Architecture

Pure frontend (HTML/CSS/JS), no build tools or backend required. Open `index.html` in a browser.

### Structure
- `index.html` — Single-page app shell
- `css/` — Stylesheets
  - `style.css` — Global styles, HUD, modals, navigation
  - `minecraft.css` — Minecraft theme
  - `roblox.css` — Roblox theme
  - `youtube.css` — YouTube theme
  - `spelling.css` — Spelling runner theme
- `js/data/` — Game content data (split by category)
  - `vocab.js` — Vocabulary words (`VOCAB_DATA`, easy/medium/hard, 1,200+ words)
  - `grammar.js` — Grammar questions (`GRAMMAR_DATA`, 430+ questions, 62 topics)
  - `video.js` — Video lessons (`VIDEO_LESSONS`, 42 lessons with 126 comprehension questions)
  - `game.js` — Achievements (14), daily quests, inventory items, shop items (consumables/skins/titles)
- `js/engine.js` — Core game engine (XP, levels, gems, inventory, achievements, shop, buff system, sound effects via Web Audio API, localStorage save)
- `js/minecraft.js` — Minecraft-themed vocabulary crafting game
- `js/roblox.js` — Roblox-themed grammar obstacle course
- `js/youtube.js` — YouTube-themed reading comprehension with quizzes
- `js/spelling.js` — Chrome Dino-style spelling runner game (canvas-based)
- `js/daily.js` — Daily quest tracking
- `js/tts.js` — Text-to-speech module (Web Speech API)
- `js/app.js` — Navigation and initialization

### Adding Content
- Vocabulary: add entries to `VOCAB_DATA` in `js/data/vocab.js` (easy/medium/hard). Each entry needs `word`, `hint` (emoji), `zh` (Chinese explanation), `sentence` (fill-in-the-blank).
- Grammar: add entries to `GRAMMAR_DATA` in `js/data/grammar.js`. Each entry needs `sentence`, `blank`, `options` (4 choices), `explain`, `topic`.
- Video lessons: add entries to `VIDEO_LESSONS` in `js/data/video.js`. Each entry needs `title`, `titleZh`, `thumbnail`, `script`, `vocab`, and quiz `questions`.
- Achievements/quests/items/shop: edit `js/data/game.js`

### Key Systems
- **Gamification**: XP (100 per level), gems (currency), streaks, achievements, daily quests
- **Shop**: Consumables (buffs), skins, titles — all purchasable with gems
- **Buff system**: double_xp, hint, revive, lucky, instant_xp, gem_bonus
- **Sound**: Synthesized via Web Audio API (no audio files)
- **TTS**: Web Speech API for word pronunciation
- **Storage**: All state persisted in localStorage
