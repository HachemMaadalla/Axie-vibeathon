# GameBlocks integration
Source: https://github.com/xt4d/GameBlocks
Pinned revision: 668b7d8a558e23c800e619b33a72c5f8844c4b75
Copyright (c) 2026 Weihao Cheng. MIT license retained in lib/gameblocks/LICENSE and public/licenses/GameBlocks-LICENSE.txt.

The selected modules are copied into lib/gameblocks/modules with their upstream directory structure.

| Module | Status | Game use |
| --- | --- | --- |
| math/WorldBasis.js | Unchanged | Canonical +X right, +Y up, -Z forward for terrain and camera-relative movement. |
| math/ScalarUtils.js | Unchanged | Terrain interpolation and noise helpers. |
| math/RandomUtils.js | Unchanged | Seeded rock and grass placement. |
| world/environment/PlanarUtils.js | Unchanged | Terrain basis lookup for the mesh factory. |
| world/environment/TerrainSampler.js | Runtime unchanged; added JSDoc for road-segment types | NaturalTerrainSampler is the terrain base class. ArchipelagoTerrainSampler supplies layered fBm detail; RoadTerrainSampler supplies path distance and flattening masks. |
| world/environment/TerrainMeshFactory.js | Adapted | Added chunk center offsets, a circular cell mask, world-aligned pixel texture UVs, and trimmed masked indices. Original indexed triangle topology and basis conversion retained. |
| world/object/factory/RockVisualFactory.js | Unchanged | Seeded, varied ground rocks, then spatially merged for rendering. |

Wildseed's terrain subclass combines the samplers with biome colors, mountains, shelves, a river valley, bridge ramps, and a shoreline. The existing 10x dungeon area and farm terrain remain intact. Collision samples interpolate the same a-b-d / a-d-c triangle split as the mesh, so dashes and jumps follow the rendered slopes.

The game keeps its existing movement motor, combat, equipment, saves, and Axie models. No Rapier dependency is needed: GameBlocks' optional Rapier collider export is unused. NaturalEnvironment was reviewed; its monolithic world and physics setup are not instantiated because this game already has a chunked scene and movement system.

Validation: scripts/test-gameblocks.mjs checks chunk seams, exact collision sampling, bridge traversal, material/mesh bounds, and actual module integration. Existing movement, combat, camera, equipment, and farming checks cover integration regressions. Browser visual QA was not performed.

