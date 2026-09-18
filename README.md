# Lunacia: Wildseed
A Three.js browser prototype for Axie Vibeathon: cozy farming feeds survival expeditions, and expeditions supply the next harvest.

## Play
Use WASD / arrow keys or click/tap terrain to move. Space jumps and double jumps, Shift sprints, and Q dashes. Move beside one of 24 farm beds and press E to plant, water or harvest the nearest bed. Cook two crops into a meal at the campfire. In dungeons, attacks fire automatically: collect dropped XP gems to level up and collect rare seed packets and supplies to bring home. Survive 90 seconds and defeat the guardian, then press E at the green return portal when ready to leave. Craft a Grove Key with 24 Sunroot at the farm portal. Deeper keys cost 12 Moonberry and 6 Glowcap.

Seven playable Axies: Pomodoro, Bing, Kotaro, Kibo, Paladill, Tripp, and Xia, each with its own perk and official equipped weapon. Press E beside an island companion to switch. All ten Sapidae variants populate the island services and paths.
Fertilizer accelerates a single crop. Rich soil permanently improves a bed's growth speed and yield.
Four mature starter beds let players immediately test harvesting and cooking.

## Run
Requires Node 22.13 or newer.
- npm install
- npm run dev
- npm run build
- npx tsc --noEmit
- node --experimental-strip-types scripts/test-game.mjs
- node --experimental-transform-types scripts/test-roadmap.mjs

Stack: Three.js, TypeScript, React, Vite/Vinext, existing Shadcn/Base UI primitives. No game backend, wallet or API key is required. Device-local saves use localStorage; expeditions themselves are not resumed after refresh. Crop timers run only during active play, including expeditions. Audio mixes official Axie Origins combat samples with synthesized pickup and movement cues. It starts after entering the game; the mute preference is saved locally.

## Assets and provenance
Axie/Sapidae models, textures, animations and preview portraits are from the event-listed jaatster/axie-3d-assets repository, pinned to commit 4eec7d9ccb1d0c962afc110e7be35d44e3d6356b. See public/licenses and ASSET_CREDITS.md. Original procedural Three.js terrain, farm structures, plants, enemies and game systems were created with AI assistance for this entry. Names for crops and locations are original game concepts, not claims about official Axie lore.

## Prototype limitations
- This is a Round 1 foundation, not a finalized competition submission.
- Uses supplied fixed Axie GLB models. The Round 2 live approved Mixer integration remains outstanding.
- Single-player, local saves, two expedition tiers; no cross-device saves.
- Solid scenery uses spatially indexed collisions. Player movement slides along edges, can jump onto low obstacles, and stops dashes at walls. Projectiles stop at scenery and ranged weapons prefer clear targets. Enemies use collision and local obstacle steering; full route pathfinding is not implemented.
- Keyboard/mouse and basic touch controls are implemented. Full mobile performance QA and broad browser QA remain to be done.
- A fallback demo video, final pitch, device information, and final submission package still need preparation.
- Optional WebMCP garden tools are feature-detected; live WebMCP registration verification depends on a supporting browser.

## Validation
Progression checks cover the initial harvest-to-meal-to-gate chain, watering, soil, fertilizer, resources, deeper dungeon loot, failed expedition recovery, and save validation.



Each expedition starts with one character weapon spell at level 1: Pomodoro / Thorn Bolt (staff), Bing / Cannon Shot, Kotaro and Tripp / Sword Slash, Kibo / Hammer Slam, Paladill and Xia / Axe Cleave. There is no opening spell draft. Weapon spells use the same level-up, four-slot, and evolution rules as other spells.


Battle drops use an 8% seed chance, 4% fertilizer chance and 2% soil chance per ordinary monster. Guardians drop one seed and one soil. Rewards enter the pack only on pickup; ending a run grants no extra seeds. Cleared runs retain all collected supplies, early returns and defeats retain half. Old 12-bed saves migrate to 24 beds while preserving existing crops and resources. The shop and currency system have been removed.

Both battle arenas use the same 30-unit floating-island footprint as home. They keep the grassy cel-shaded terrain, cliffs, sparse trees and natural rock cover while leaving out the farm, residents and service decorations.

The farm uses a floating-island art direction: faceted stone cliffs, hanging vines, animated waterfalls, flower patches, a tiled cottage and mushroom pavilion. Cream-and-teal controls keep planting, watering and harvesting in one contextual E action. The camera opens with an island overview and remains freely orbitable during play.

Farm hotbar: select one of eight seed types, the watering can, sickle, fertilizer, or rich soil. E uses the held item on the nearest reachable bed. Tools remain selected after use; watering and harvesting require their matching tool. Farm tools appear in the Axie hand and the character weapon returns in dungeons.

The garden has shader-driven wind on tree crowns, vines, flowers, bushes and crops. The stream and waterfall ribbons ripple continuously; waterfall foam falls, chimney smoke rises, clouds drift, and lightweight windborne leaves cross the island. Reduced-motion preferences freeze ambient movement.

Dungeon access uses consumable crafted keys. A Grove Key costs 24 Sunroot; a Hollow Key costs 12 Moonberry and 6 Glowcap. The portal crafts and displays each key, and entering consumes one. Sunroot seeds are unlimited and Sunroot takes 30 active seconds to grow after watering. The eight crops are Sunroot, Moonberry, Embercorn, Cloudmelon, Glowcap, Starpepper, Dewleaf and Crystalbean. Tier 1 and Tier 2 expeditions drop different seed pools.


## Progression and atmosphere update
The portal offers optional Elites, Rush, Bounty and Drought challenges. They trade difficulty for soil, fertilizer, doubled seed drops, or a returned key on clear. Drought blocks regeneration and level-up healing. Seed rarity stays at 8%, with each enemy favoring a different crop.

Open the pack for four crop-funded permanent upgrades, each capped at three levels. At the campfire, combine two Moonberry with fertilizer to advance watered crops by 35%, or two Cloudmelon with fertilizer for four bonus harvests. Three clears with an Axie unlock its mastery bonus for its evolved starting weapon. All seven characters remain available.

M opens the island map, discoveries and mastery collection. Level-up cards use short effect labels. Pause settings include saved volume and reduced motion preferences; touch farming tools use two rows of large targets.

The farm has roaming chickens, butterflies, fireflies, a moving windmill and scarecrow, a four-minute day/night cycle, and seasonal foliage every four in-game days. Tier 1 stays bright and Tier 2 uses dusk lighting. Ambient movement pauses with the game and respects reduced motion.

The roadmap integration suite verifies crop spending, save migration, compost quantities, character mastery, safe island spawns, drop rarity, challenges and bounded atmosphere objects. Visual and full mobile-device QA remain outstanding.

## Enemy and boss expansion
Seven regular enemies now use rounded, cel-shaded creature rigs with animated shells, legs, wings, mushroom caps and crystal armor. Cinder Puff marks spore blasts; Prism Sentry fires five-shot fans; Stoneback releases a jumpable ground wave. Reavers lunge, scarabs charge along a marked lane, Hexers fire spore volleys, and moths approach directly before swooping.

Bosses rotate with total expedition clears: the Grove alternates Elder Thornwarden and Lumina, Brood Queen; the Hollow cycles Prism Colossus, Lumina and Thornwarden. Each has three attack patterns and intensifies below half health. Boss fights slow regular spawning. Queen summons are capped, and the HUD shows only the boss name and health bar.

Enemy projectiles have different spore, petal, thorn and crystal silhouettes. Marked ground attacks follow terrain and can be jumped. Owner death cancels its remaining attacks. Shared creature geometry uses three rendering pools; attacks and summons are bounded. Existing keys, saves, XP pickups and 8% seed rarity remain compatible.

Run `node --experimental-transform-types scripts/test-enemy-expansion.mjs` for boss phases, warnings, jumping, cover, attack cleanup, population limits and drops. The full combat simulation also exercises all seven regular enemies. Visual/device QA is still outstanding.

Enemy attacks use brief eased anticipation, fast strikes and short recoil. Regular wind-ups are 0.24–0.5 seconds; bosses keep a 0.7-second warning. Ranged enemies hold a firing position instead of retreating, flyers approach directly without circling or slow bobbing, and hit stagger no longer stretches attack timers. Global impact pauses are shorter and less frequent.

## Cooking and dungeon feast
At the campfire, tap Stir or press Space/E when the marker is green, three times. Two crops produce one meal; three successful timings produce two portions. Misses still produce a meal. Canceling before completion spends no crops, and hidden-tab time does not advance cooking.

At the dungeon portal, add up to four meal portions to the food tray, including duplicates. Click a slot to remove it. Combined buffs appear below. Food and the key are consumed together only on successful entry; missing supplies consume neither. Inventory meals open the portal tray. Existing meal inventories and saves remain compatible.

Meals grant health, regeneration, speed, damage, spell area, shorter cooldown, armor and pickup reach. Food bonuses stack with caps: +120% damage, +60% speed, 40% shorter cooldown, 35% damage reduction and +4 pickup reach. Drought disables food regeneration. Consumed meal icons stay on the combat belt for the run.

## Star quality and forging
Seeds, crops, meals, keys, fertilizer and soil have one to three stars. Existing saves migrate to one star. Inventory totals stay stacked with a selected-item quality breakdown; planting and crafting use the best ingredients first. Sunroot seeds remain unlimited and free.

Forge a key at the portal with three timed strikes. Cooking and forging show live quality probabilities: by default 80% / 18% / 2%, rising to 32% / 48% / 20% after three successful timings before ingredient and luck bonuses. Higher-grade ingredients, greenhouse upgrades, clears and Crystalbean food improve the odds. Canceling before completion spends nothing.

Choose a key's star quality at entry. Two-star keys give 50% more supply-drop chance; three-star keys give 100% more (base seed chance 8% becomes 12% or 16%). Boss supply quantities scale 1/2/3 and better keys improve loot quality. XP is unchanged. Higher-grade food multiplies each portion's buffs by 1 / 1.3 / 1.6 before existing caps; soil and fertilizer improve growth more at higher grades. Physical pickups retain quality through collection and save/load, including partial expedition returns.

Run `node --experimental-transform-types scripts/test-quality.mjs` for quality migration, forging, cooking, exact probability distributions, planting, drops and partial returns.

## Automatic waves and extraction
Dungeons now run endless finite waves, starting with 10 enemies and adding four per wave up to 42. The next wave starts automatically four simulation seconds after the final enemy dies. Every fifth wave includes a rotating boss. Health and speed scale with the wave; population remains capped. The HUD shows only the wave and brief countdown.

A home portal opens on entry and stays available during all waves. Press E nearby to return with every collected item and its quality. Death loses all current-run loot without touching existing farm supplies. Clearing a boss and returning earns the existing mastery/challenge completion once per run. Inventory no longer teleports the player out.

Enemy locomotion follows distance traveled, so legs stop when blocked. Heavy enemies brace and slam, casters raise their arms, and reavers twist into their strikes. Impact scaling is subtler. Run scripts/test-waves.mjs with Node's experimental-transform-types flag for wave timing, boss cadence and extraction outcomes. These rules supersede the earlier timed-run and half-loot descriptions above.

## Expanded battle builds
Frost Nova, Void Well, Crystal Daggers, Dawn Beam, Earth Spike and Venom Flask bring the roster to 15 weapons. Each has three levels and a paired evolution. Iron Shell, Trail Boots, Lodestone, Hunter Eye, Hourglass and Lucky Clover bring the passive roster to 11, adding armor, movement speed, pickup reach, double-damage critical hits, field duration and loot-quality luck. Builds retain four weapon and four passive slots. Drafts prioritize a new weapon when a slot and card are available. New cards use compact symbol icons and short effect labels.

## Hosting on Vercel
Import HachemMaadalla/Axie-vibeathon in Vercel with the repository root as the root directory. The checked-in vercel.json selects Other, runs npm ci and npm run build:vercel, and serves dist/client. Select Node.js 24.x. No environment variables, database or server are required. Sites metadata integration is disabled for the Vercel build. Saves remain local to each browser and domain; existing Sites saves do not automatically transfer to a new Vercel domain.
