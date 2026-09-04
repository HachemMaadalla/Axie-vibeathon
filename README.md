# Lunacia: Wildseed
A Three.js browser prototype for Axie Vibeathon: cozy farming feeds survival expeditions, and expeditions supply the next harvest.

## Play
Use WASD / arrow keys or click/tap terrain to move. Select a garden bed, choose a seed, and press E or the garden action button to plant, water, or harvest. The camp kitchen turns two crops into one meal. Pack a meal before entering a dungeon. Attacks fire automatically; Space dashes. Win by surviving at least 90 seconds and defeating the guardian that arrives at 60 seconds. Offer 4 Sunroot and 2 Moonberry to open Bramble Hollow, which drops Embercorn seeds.

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

Stack: Three.js, TypeScript, React, Vite/Vinext, existing Shadcn/Base UI primitives. No game backend, wallet or API key is required. Device-local saves use localStorage; expeditions themselves are not resumed after refresh. Crop timers run only during active play, including expeditions. Audio is optional synthesized feedback.

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


