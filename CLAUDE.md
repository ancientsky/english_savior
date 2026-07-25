# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**english_savior** — A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube. Target audience: Taiwanese elementary school students. UI language is Traditional Chinese (zh-TW).

## Architecture

Pure frontend (HTML/CSS/JS): no build step, no dependencies, no backend. Serve statically (`python3 -m http.server 8000`) or open `index.html` directly. Three.js r149 is vendored at `js/vendor/three.min.js` — no CDN libraries. The only external resources are Google Fonts and Google Identity Services (the latter lazy-loaded by js/cloud.js only when the owner configures GOOGLE_CLIENT_ID; see DEPLOYMENT.md and .github/workflows/deploy.yml).

### File Structure

- `index.html` — single-page app shell (all zones, modals, HUD)
- `css/` — `style.css` (global/HUD/modals/themes) + `hub.css` + one themed file per game
- `js/app.js` — navigation + init entry point (DOMContentLoaded); `js/hub.js` — hub landing page (read-only progress badges from localStorage)
- `js/engine.js` — GameEngine + SoundManager: XP/levels/gems/inventory/achievements/shop/buffs/daily rewards/save
- `js/music.js` — MusicManager: synthesized Web Audio BGM, per-zone playlists (`ZONE_TRACKS`, rotated in app.js switchZone)
- `js/tts.js` — TTSManager (Web Speech API); `js/daily.js` — daily quests; `js/cloud.js` — CloudSave file export/import + optional Google Drive sync
- Game modules (one file each in `js/`): minecraft (vocabulary crafting), roblox (grammar), youtube (video quizzes), spelling (canvas runner), listening, empire (Three.js castle defense), candy (match-3; `FOOD_THEMES` inline: 20 themes × 6 foods = 120 words; special-candy merges + special×special combos), sling (canvas slingshot physics), builder (sentence builder, 33 landmarks), speak (speech recognition with honor-mode fallback), tower (orb-spelling boss battle), rpg (Undertale-style engine that interprets RPG_CHAPTERS — no code changes for new chapters), pets (collect-and-battle, 90 pets/15 gyms), typing (typing defense), tutor (20-lesson touch-typing camp), detective (48 escape-room cases), fishing (TTS listening quiz, 305 fish/29 ponds), sky (Three.js open world, 84 quests)
- `js/data/` — vocab.js+vocab2.js (`VOCAB_DATA`, 3,080 words, easy/medium/hard), grammar.js+grammar2.js (`GRAMMAR_DATA`, 1,480), video.js (`VIDEO_LESSONS`, 42), empire.js+empire2.js (`EMPIRE_DIALOGUES` 1,260 / `EMPIRE_LIFE` 856), rpg.js+rpg2-4.js (`RPG_CHAPTERS`, 36), sky.js (`SKY_*` world data), pets.js (`PET_SPECIES` ×90), detective.js+detective2-4.js (`DETECTIVE_CASES` ×48), fishing.js (`FISH_SPECIES` ×305), game.js (`ACHIEVEMENTS`/quests/items/shop/`ACH_POINT_REWARDS`/`LEVEL_MILESTONES`/`CHARM_PERKS`/`SELL_PRICES`)

Expansion packs (`*2.js`, `*3.js`, `*4.js`) push into their base arrays and must load after the base file (script order in index.html).

### Module Pattern

Every game module is an IIFE exposing a single PascalCase global with `{ init }`; app.js calls all `.init()` on DOMContentLoaded. `EmpireGame`, `SlingGame`, `SpellingGame` and `SkyGame` additionally export `onShow()`, called by app.js when their zone becomes visible to resume paused render loops.

## Naming Conventions

- CSS classes: kebab-case with a short per-game prefix (`mc-`, `rb-`, `yt-`, `cd-`, `fh-`, `aw-` sky, `hb-` hub, …)
- JS: camelCase functions/variables, PascalCase module globals, UPPER_SNAKE_CASE data constants, kebab-case DOM IDs

## Adding Content

- **Vocabulary** (`VOCAB_DATA`, easy/medium/hard): `word`, `hint` (emoji), `zh`, `sentence` (fill-in-the-blank with `___`)
- **Grammar** (`GRAMMAR_DATA`): `sentence`, `blank`, `options` (4 choices), `explain`, `topic`
- **Video lessons** (`VIDEO_LESSONS`): `title`, `titleZh`, `thumbnail`, `script`, `vocab`, quiz `questions`
- **Empire dialogues** (`EMPIRE_DIALOGUES`, easy/medium/hard): `q`, `qZh`, `a`, `wrong` (3 distractors). **Life scenes** (`EMPIRE_LIFE`): `scene` (Chinese scenario), `q`, `a`, `wrong`. Empire also reuses VOCAB_DATA/GRAMMAR_DATA.
- **RPG chapters** (`RPG_CHAPTERS`): `id`, `title`, `theme`, `icon`, tile emoji (`wall`/`deco`) and colours (`floor`/`path`), 13×9 ASCII `map`, `spawn`, `npcs` (each with a `talk` script of say/ask entries), `boss`. Map tiles: `#` wall, `*` deco, `=` path, `.` floor, `K` key, `D` locked door, `S` switch, `G` gate, `P`/`Q` portal pair, `H` cracked wall, `!` chest. Run `node validate_rpg_chapters.js` (scratchpad) before shipping new chapters — checks schema, 10-asks rule and BFS puzzle solvability.
- **Sky quests** (`SKY_QUESTS`): `id`, `island`, `type` (`chest`/`gate`/`npc`/`listen`/`pillars`/`runes`/`arena`/`bridge`/`race`/`boss`/`order`/`maze`), `name`, `diff` (easy/medium/hard/boss — sets reward tier), `n`, `dx`/`dz`, `intro`, optional `npc`/`mob`/`time`/`lock`. New islands go in `SKY_ISLANDS` (id/name/type/pos/r/seed), decorated procedurally by type; bosses are parameterized via BOSS_DEFS in js/sky.js. Quests with `hidden: true` are masked as ??? and excluded from `totalCleared()` lock math.
- **Achievements/quests/items/shop**: edit `js/data/game.js`

## Key Systems (behavioral contracts)

- **XP/levels**: 80 + level × 20 per level; achievements grant 15 gems + pts; `ACH_POINT_REWARDS` thresholds grant exclusive titles/skins/themes; `LEVEL_MILESTONES` every 5 levels to 50 (granted in addXP via grantLevelMilestones)
- **Re-entrancy rule**: reward grants inside checkAchievements/checkPointRewards/grantLevelMilestones/checkCollectionReward mutate `state.gems`/`state.owned` directly — **never call addGems/addXP there**
- **Level-up deferral**: `GameEngine.setDeferLevelUp(true/false)` prevents modal spam during rapid answers; call `flushPendingLevelUps()` when the round ends
- **Buffs**: `double_xp`, `hint`, `revive`, `lucky`, `instant_xp`, `gem_bonus`, `streak_shield` (consumed in load()), `double_gems` (consumed in addGems), `glide`/`jump_boost` (once per Sky adventure); instant effects `instant_xp_big`, `mystery_item`
- **Charms**: `state.equipped.charm` gives passive perks (`CHARM_PERKS`, applied inside addXP/addGems); duplicates sellable (`SELL_PRICES`); owning all 8 grants a one-time reward
- **Shop**: `unlock`-flagged items are never purchasable (granted by milestones/points/collection). **Themes**: body[data-theme] overrides :root CSS vars; applyTheme() on load/equip
- **Sky title perks**: js/sky.js computePerks() maps every equipped shop title to an in-world ability; recomputed on adventure start and re-equip
- **Audio**: all sound and music is synthesized via Web Audio (no audio files); music playback starts only after the first user gesture (autoplay policy); 🎵 toggle persisted as `music_enabled`
- **Storage** (localStorage, JSON): `english_savior_save` (engine), `_empire`, `_candy`, `_builder`, `_tower`, `_rpg`, `_sky`, `_pets`, `_detective`, `_fishing`, `_typing_best`, `_tutor` (same prefix), plus `music_enabled`. js/cloud.js exports all keys as a v1 payload.

### Reward Scaling by Difficulty

| Game | Easy | Medium | Hard |
|------|------|--------|------|
| Vocabulary (Minecraft) | 10 XP, 1 gem | 20 XP, 2 gems | 35 XP, 4 gems |
| Spelling runner | 15 XP + 1 gem/word, +10 gems bonus | same, +20 gems | same, +30 gems |
| Listening | 10 XP/correct | 12 XP | 15 XP |
| Word slingshot | 12 XP + 1 gem/hit, +10 gems | 16 XP + 1 gem, +15 | 20 XP + 1 gem, +20 |
| Sentence builder | 15 XP + 1 gem/sentence, +10 gems | 20 XP + 1 gem, +15 | 25 XP + 1 gem, +20 |
| Spell academy | 12 XP + 1 gem/monster, +10 gems | 16 XP + 1 gem, +15 | 20 XP + 1 gem, +20 (honor mode halves) |

Tier-based instead of difficulty-based: **RPG** — 10 XP + 1 gem per first-try answer (5 XP retry, no gem); chapter N clear = 40+15×(N-1) XP, 10+2×(N-1) gems, 1-3 stars. **Tower** (floors 1-9/10-19/20+): boss 30/45/60 XP + 5/8/11 gems; quest-word spell 10 XP + 1 gem. **Empire** (by age): 10/15/20/25 XP + 1 gem per kill, +5/10/15/20 gems wave bonus. **Candy** (levels 1-9/10-19/20+): clear 30/45/60 XP + 5/8/11 gems; magic-star quiz first try 15 XP + 1 gem. **Sky** (by quest diff): 8/12/16 XP + 1 gem per first-try answer, first clears 30/50/80 XP + 5/8/12 gems (boss 150 XP + 25 gems), replays half XP. Daily quests: 10 XP each; all done = one-time 50 gems + random item per day.

## Development

No build step. Run locally with any static server (`python3 -m http.server 8000`).

### Cache busting

All CSS/JS references in index.html carry a `?v=N` query string. GitHub Pages caches assets for 10 minutes, so a freshly deployed index.html can otherwise pair with stale cached JS/CSS. **Bump the version on every release that changes JS or CSS** (single `sed -i 's/?v=49/?v=50/g' index.html`-style edit).

### Testing

No automated test suite. Verify changes by opening index.html in a browser and exercising the affected game zone.
