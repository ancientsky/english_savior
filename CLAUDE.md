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
- Game modules (one file each in `js/`): minecraft (vocabulary crafting), roblox (grammar), youtube (video quizzes), spelling (canvas runner), listening, empire (Three.js castle defense), candy (match-3; `FOOD_THEMES` inline: 20 themes × 6 foods = 120 words; special-candy merges + special×special combos), sling (canvas slingshot physics), builder (sentence builder, 33 landmarks), speak (speech recognition with honor-mode fallback), tower (orb-spelling boss battle), rpg (Undertale-style engine that interprets RPG_CHAPTERS — no code changes for new chapters), pets (collect-and-battle, 90 pets/15 gyms), typing (typing defense), tutor (20-lesson touch-typing camp), detective (48 escape-room cases), fishing (TTS listening quiz, 305 fish/29 ponds), sky (Three.js open world, 84 quests), wizard (Scribblenauts-style summon puzzle — spell a word to summon it, its ability tags clear the blocker; 30 levels, every level multi-solution), rhythm (syllable/stress rhythm game, 20 songs; stressed syllables are a separate lane), alchemy (prefix+root morphology building, 16 chapters / 282 recipes), order (listening→action: build the food a customer orders in a full English sentence, 5 shops, procedurally generated orders)
- `js/data/` — vocab.js+vocab2.js (`VOCAB_DATA`, 3,080 words, easy/medium/hard), grammar.js+grammar2.js (`GRAMMAR_DATA`, 1,480), video.js (`VIDEO_LESSONS`, 42), empire.js+empire2.js (`EMPIRE_DIALOGUES` 1,260 / `EMPIRE_LIFE` 856), rpg.js+rpg2-4.js (`RPG_CHAPTERS`, 36), sky.js (`SKY_*` world data), pets.js (`PET_SPECIES` ×90), detective.js+detective2-4.js (`DETECTIVE_CASES` ×48), fishing.js (`FISH_SPECIES` ×305), wizard.js (`WIZARD_TAGS`/`WIZARD_OBSTACLES`/`WIZARD_WORDS` ×137/`WIZARD_CHAPTERS`/`WIZARD_LEVELS` ×30/`WIZARD_UNLOCK`), rhythm.js (`RHYTHM_SONGS` ×20 × 8 words), alchemy.js (`ALCHEMY_PARTS` ×214/`ALCHEMY_CHAPTERS` ×16/`ALCHEMY_RECIPES` ×282/`ALCHEMY_NEARMISS`), order.js (`ORDER_EXTRAS`/`ORDER_SHOPS` ×5/`ORDER_OPENERS`), game.js (`ACHIEVEMENTS`/quests/items/shop/`ACH_POINT_REWARDS`/`LEVEL_MILESTONES`/`CHARM_PERKS`/`SELL_PRICES`)

Expansion packs (`*2.js`, `*3.js`, `*4.js`) push into their base arrays and must load after the base file (script order in index.html).

### Module Pattern

Every game module is an IIFE exposing a single PascalCase global with `{ init }`; app.js calls all `.init()` on DOMContentLoaded. `EmpireGame`, `SlingGame`, `SpellingGame`, `SkyGame`, `WizardGame` and `RhythmGame` additionally export `onShow()`, called by app.js when their zone becomes visible to resume paused render loops.

## Naming Conventions

- CSS classes: kebab-case with a short per-game prefix (`mc-`, `rb-`, `yt-`, `cd-`, `fh-`, `aw-` sky, `wz-` wizard, `rh-` rhythm, `al-` alchemy, `od-` order, `hb-` hub, …)
- JS: camelCase functions/variables, PascalCase module globals, UPPER_SNAKE_CASE data constants, kebab-case DOM IDs

## Adding Content

- **Vocabulary** (`VOCAB_DATA`, easy/medium/hard): `word`, `hint` (emoji), `zh`, `sentence` (fill-in-the-blank with `___`)
- **Grammar** (`GRAMMAR_DATA`): `sentence`, `blank`, `options` (4 choices), `explain`, `topic`
- **Video lessons** (`VIDEO_LESSONS`): `title`, `titleZh`, `thumbnail`, `script`, `vocab`, quiz `questions`
- **Empire dialogues** (`EMPIRE_DIALOGUES`, easy/medium/hard): `q`, `qZh`, `a`, `wrong` (3 distractors). **Life scenes** (`EMPIRE_LIFE`): `scene` (Chinese scenario), `q`, `a`, `wrong`. Empire also reuses VOCAB_DATA/GRAMMAR_DATA.
- **RPG chapters** (`RPG_CHAPTERS`): `id`, `title`, `theme`, `icon`, tile emoji (`wall`/`deco`) and colours (`floor`/`path`), 13×9 ASCII `map`, `spawn`, `npcs` (each with a `talk` script of say/ask entries), `boss`. Map tiles: `#` wall, `*` deco, `=` path, `.` floor, `K` key, `D` locked door, `S` switch, `G` gate, `P`/`Q` portal pair, `H` cracked wall, `!` chest. Run `node validate_rpg_chapters.js` (scratchpad) before shipping new chapters — checks schema, 10-asks rule and BFS puzzle solvability.
- **Sky quests** (`SKY_QUESTS`): `id`, `island`, `type` (`chest`/`gate`/`npc`/`listen`/`pillars`/`runes`/`arena`/`bridge`/`race`/`boss`/`order`/`maze`), `name`, `diff` (easy/medium/hard/boss — sets reward tier), `n`, `dx`/`dz`, `intro`, optional `npc`/`mob`/`time`/`lock`. New islands go in `SKY_ISLANDS` (id/name/type/pos/r/seed), decorated procedurally by type; bosses are parameterized via BOSS_DEFS in js/sky.js. Quests with `hidden: true` are masked as ??? and excluded from `totalCleared()` lock math.
- **Wizard words** (`WIZARD_WORDS`): `w` (lowercase a-z only — it is compared against the child's spelling), `zh`, `e` (emoji), `tags` (from `WIZARD_TAGS`), `lv` (spellbook page 1-5, unlocked per `WIZARD_UNLOCK`). **Levels** (`WIZARD_LEVELS`): `id`, `ch`, `name`, `intro`, `obs` (obstacle ids, left to right), optional `boss`. A level never names an answer — each obstacle in `WIZARD_OBSTACLES` carries every tag that beats it, so adding a tag there adds a solution to every level using that obstacle. Run `node validate_wizard.js` (scratchpad) before shipping: it checks that at the point a child first reaches level N, every solution tag of every obstacle has ≥2 already-unlocked words, so no level can dead-end and 3★ stays reachable.
- **Rhythm songs** (`RHYTHM_SONGS`): `id`, `name`, `e`, `bpm`, 8 `words` of `{ w, zh, e, syl: [...], stress }`. `syl.join('')` must equal `w` and `stress` indexes a real syllable — run `node validate_rhythm.js` (scratchpad). Only pure syllable splits belong here; a wrong split teaches a wrong rhythm.
- **Alchemy recipes** (`ALCHEMY_RECIPES`): `{ ch, a, b, w, zh, e, bonus?, note? }` where a/b are `ALCHEMY_PARTS` ids. **Two hard rules.** (1) `parts[a].text + parts[b].text` must equal `w` exactly — no doubling, no y→i, so what's on screen IS the rule. (2) **Never tell a child a real word doesn't exist**: if two parts on a chapter's shelf spell a real English word it must appear here, as a target or with `bonus: true` (recognised, spoken, rewarded, collected — but not a ??? card and not required to clear the chapter). `node validate_alchemy.js` (scratchpad) enforces both: it fails on any shelf combination that spells a word the site teaches elsewhere (~3,300 words from VOCAB_DATA/wizard/rhythm/pets/fishing/order), and `--review` lists the remaining combinations for a human pass. Chapters with `compound: true` get their root+root pairs reviewed too. `ALCHEMY_NEARMISS` gives a real explanation for near-misses that genuinely aren't single words (`noone` → "要寫成兩個字 no one"). `note` covers affixes whose usual gloss doesn't land (dis- in discount means "off", not "not").
- **Order shops** (`ORDER_SHOPS`): menu items `{ w, zh, e, kind, sizes?, pl?, art?, def: [], ex: [] }`. `def` = ingredients the item ships with (what makes "no X" a real action); `ex` = optional add-ons; `pl` only where "two ___" is real English (items without it are never pluralised); `art` for `an`/`some`. Ingredients live in the shared `ORDER_EXTRAS` dict. Sentences are generated in js/order.js — modifiers are budgeted per *order*, not per item.
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
- **Storage** (localStorage, JSON): `english_savior_save` (engine), `_empire`, `_candy`, `_builder`, `_tower`, `_rpg`, `_sky`, `_pets`, `_detective`, `_fishing`, `_typing_best`, `_tutor`, `_wizard`, `_rhythm`, `_alchemy`, `_order` (same prefix), plus `music_enabled`. js/cloud.js exports all keys as a v1 payload.

### Reward Scaling by Difficulty

| Game | Easy | Medium | Hard |
|------|------|--------|------|
| Vocabulary (Minecraft) | 10 XP, 1 gem | 20 XP, 2 gems | 35 XP, 4 gems |
| Spelling runner | 15 XP + 1 gem/word, +10 gems bonus | same, +20 gems | same, +30 gems |
| Listening | 10 XP/correct | 12 XP | 15 XP |
| Word slingshot | 12 XP + 1 gem/hit, +10 gems | 16 XP + 1 gem, +15 | 20 XP + 1 gem, +20 |
| Sentence builder | 15 XP + 1 gem/sentence, +10 gems | 20 XP + 1 gem, +15 | 25 XP + 1 gem, +20 |
| Spell academy | 12 XP + 1 gem/monster, +10 gems | 16 XP + 1 gem, +15 | 20 XP + 1 gem, +20 (honor mode halves) |
| Word wizard (per successful summon) | 10 XP + 1 gem | 14 XP + 1 gem | 18 XP + 2 gems |
| Rhythm star (per word fully hit) | 10 XP + 1 gem, +10 gems song bonus | 14 XP + 1 gem, +15 | 18 XP + 2 gems, +20 |
| Order Up! (per order served first try) | 10 XP + 1 gem, +10 gems shift bonus | 14 XP + 1 gem, +15 | 18 XP + 2 gems, +20 |

Tier-based instead of difficulty-based: **RPG** — 10 XP + 1 gem per first-try answer (5 XP retry, no gem); chapter N clear = 40+15×(N-1) XP, 10+2×(N-1) gems, 1-3 stars. **Tower** (floors 1-9/10-19/20+): boss 30/45/60 XP + 5/8/11 gems; quest-word spell 10 XP + 1 gem. **Empire** (by age): 10/15/20/25 XP + 1 gem per kill, +5/10/15/20 gems wave bonus. **Candy** (levels 1-9/10-19/20+): clear 30/45/60 XP + 5/8/11 gems; magic-star quiz first try 15 XP + 1 gem. **Sky** (by quest diff): 8/12/16 XP + 1 gem per first-try answer, first clears 30/50/80 XP + 5/8/12 gems (boss 150 XP + 25 gems), replays half XP. **Wizard** (levels 1-9/10-19/20+): first clear 30/45/60 XP + 5/8/11 gems, replays half XP and no gems; each *newly discovered* solution tag on a level +15 XP + 2 gems; a hint or a wrong spelling halves that summon's XP and drops its gem. **Rhythm** — first clear of a song 30 XP (replay 12), Full Combo +5 gems. **Alchemy** (tier-based, not difficulty): each newly discovered word 12 XP + 1 gem (⭐ bonus finds included); chapter clear (1-4/5-8/9-12/13-16) 30/45/60/75 XP + 5/8/11/14 gems; timed-challenge answer 15 XP + 1 gem. **Order Up!** — a corrected order gives half XP and no gem; a perfect 6-customer shift adds 5 gems. Daily quests: 10 XP each; all done = one-time 50 gems + random item per day.

## Development

No build step. Run locally with any static server (`python3 -m http.server 8000`).

### Cache busting

All CSS/JS references in index.html carry a `?v=N` query string. GitHub Pages caches assets for 10 minutes, so a freshly deployed index.html can otherwise pair with stale cached JS/CSS. **Bump the version on every release that changes JS or CSS** (single `sed -i 's/?v=52/?v=53/g' index.html`-style edit).

### Testing

No automated test suite. Verify changes by opening index.html in a browser and exercising the affected game zone.
