# Lunacia: Wildseed
A Three.js browser prototype for Axie Vibeathon: cozy farming feeds survival expeditions, and expeditions supply the next harvest.

## Play
Use WASD / arrow keys or click/tap terrain to move. Space jumps and double jumps, Shift sprints, and Q dashes. Move beside one of 24 farm beds and press E to plant, water or harvest the nearest bed. Cook two crops into a meal at the campfire. In dungeons, attacks fire automatically: collect dropped XP gems to level up and collect rare seed packets and supplies to bring home. Survive 90 seconds and defeat the guardian, then press E at the green return portal when ready to leave. Offer 4 Sunroot and 2 Moonberry at the farm portal to unlock Bramble Hollow and Embercorn seeds.

Seven playable Axies: Pomodoro, Bing, Kotaro, Kibo, Paladill, Tripp, and Xia, each with its own perk and official equipped weapon. Press E beside an island companion to switch. All ten Sapidae variants populate the island services and paths.
Fertilizer accelerates a single crop. Rich soil permanently improves a bed's growth speed and yield.
Four mature starter beds let players immediately test cooking and the gate offering.

## Run
Requires Node 22.13 or newer.
- npm install
- npm run dev
- npm run build
- npx tsc --noEmit
- node --experimental-strip-types scripts/test-game.mjs

Stack: Three.js, TypeScript, React, Vite/Vinext, existing Shadcn/Base UI primitives. No game backend, wallet or API key is required. Device-local saves use localStorage; expeditions themselves are not resumed after refresh. Crop timers run only during active play, including expeditions. Audio mixes official Axie Origins combat samples with synthesized pickup and movement cues. It starts after entering the game; the mute preference is saved locally.

## Assets and provenance
Axie/Sapidae models, textures, animations and preview portraits are from the event-listed jaatster/axie-3d-assets repository, pinned to commit 4eec7d9ccb1d0c962afc110e7be35d44e3d6356b. See public/licenses and ASSET_CREDITS.md. Original procedural Three.js terrain, farm structures, plants, enemies and game systems were created with AI assistance for this entry. Names for crops and locations are original game concepts, not claims about official Axie lore.

## Prototype limitations
- This is a Round 1 foundation, not a finalized competition submission.
- Uses supplied fixed Axie GLB models. The Round 2 live approved Mixer integration remains outstanding.
- Single-player, local saves, two expedition tiers; no cross-device saves.
- No obstacle collision or pathfinding around scenery; player/enemy movement is bounded by the island.
- Keyboard/mouse and basic touch controls are implemented. Full mobile performance QA and broad browser QA remain to be done.
- A fallback demo video, final pitch, device information, and final submission package still need preparation.
- Optional WebMCP garden tools are feature-detected; live WebMCP registration verification depends on a supporting browser.

## Validation
Progression checks cover the initial harvest-to-meal-to-gate chain, watering, soil, fertilizer, resources, deeper dungeon loot, failed expedition recovery, and save validation.



Each expedition starts with one character weapon spell at level 1: Pomodoro / Thorn Bolt (staff), Bing / Cannon Shot, Kotaro and Tripp / Sword Slash, Kibo / Hammer Slam, Paladill and Xia / Axe Cleave. There is no opening spell draft. Weapon spells use the same level-up, four-slot, and evolution rules as other spells.


Battle drops use an 8% seed chance, 4% fertilizer chance and 2% soil chance per ordinary monster. Guardians drop one seed and one soil. Rewards enter the pack only on pickup; ending a run grants no extra seeds. Cleared runs retain all collected supplies, early returns and defeats retain half. Old 12-bed saves migrate to 24 beds while preserving existing crops and resources. The shop and currency system have been removed.

The battle arena has a 120-unit radius (about half the area of the previous 170-unit arena). Biomes, hills, paths, bridges and landmarks fit the smaller footprint; vegetation counts follow its area.
