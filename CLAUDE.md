# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**english_savior** — A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube.

## Architecture

Pure frontend (HTML/CSS/JS), no build tools or backend required. Open `index.html` in a browser.

### Structure
- `index.html` — Single-page app shell
- `css/` — Stylesheets (style.css, minecraft.css, roblox.css, youtube.css)
- `js/data/` — Game content data (split by category)
  - `vocab.js` — Vocabulary words (`VOCAB_DATA`, easy/medium/hard)
  - `grammar.js` — Grammar questions (`GRAMMAR_DATA`)
  - `video.js` — Video lessons (`VIDEO_LESSONS`)
  - `game.js` — Achievements, daily quests, inventory items, shop items
- `js/engine.js` — Core game engine (XP, levels, gems, inventory, achievements, localStorage save)
- `js/minecraft.js` — Minecraft-themed vocabulary crafting game
- `js/roblox.js` — Roblox-themed grammar obstacle course
- `js/youtube.js` — YouTube-themed reading comprehension with quizzes
- `js/daily.js` — Daily quest tracking
- `js/app.js` — Navigation and initialization

### Adding Content
- Vocabulary: add entries to `VOCAB_DATA` in `js/data/vocab.js` (easy/medium/hard)
- Grammar: add entries to `GRAMMAR_DATA` in `js/data/grammar.js`
- Video lessons: add entries to `VIDEO_LESSONS` in `js/data/video.js`
- Achievements/quests/items/shop: edit `js/data/game.js`
