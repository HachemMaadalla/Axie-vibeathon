# Retro art prompts

Generated with the built-in imagegen tool. Atlases are sliced into inventory icons with alpha preserved; originals are retained in `sources/`. Pixelify Sans is bundled under the SIL Open Font License in `../fonts/PixelifySans-OFL.txt`.

## weapons

Create one production-ready sprite atlas PNG for a retro voxel farming-survival game inventory. Exactly 5 columns by 4 rows, 20 equally sized square cells, square overall canvas if possible or 5:4 canvas. Transparent background throughout, no tile backgrounds, no text, no labels, no grid lines. Every icon centered in its cell with generous 18% margins, isolated from neighbors. Original Minecraft-inspired 32-bit pixel art: hard square pixels, stepped dark charcoal outlines, flat clusters of 3-4 colors per material, crisp highlights, no smoothing, no blur, no round vector curves, no realistic shading. Readable bold silhouettes. Palette colorful diamond cyan, steel silver, brass gold, oak brown, emerald green, amethyst purple. Exact row-major subjects: ROW 1: chunky iron cannon; diamond steel longsword; heavy iron warhammer; crescent iron battle axe; icy blue snowflake crystal. ROW 2: purple black-hole orb with violet ring; three cyan crystal throwing daggers in fan; golden sun ray crystal wand; jagged brown earth spikes; glass bottle of neon green poison. ROW 3 evolved versions of row1: gold armored triple-barrel cannon; blazing gold longsword; gigantic rune-gold earth hammer; double crescent gold axe; radiant white-blue ice star burst. ROW 4 evolved versions of row2: dark violet singularity with gold orbital fragments; five rainbow crystal daggers fan; white-gold radiant beam prism; emerald-veined towering rock spikes; purple-green bubbling poison cauldron flask. Each item occupies only its own cell and no pixels touch neighboring cells. This is a single sprite-sheet asset, not a presentation mockup.

## supplies

Create one production-ready 4 by 4 square-grid sprite atlas PNG, exactly 16 equal-sized cells, transparent background, no text, no labels, no grid lines or tile backgrounds. Original retro voxel pixel art inventory sprites, Minecraft-inspired but original designs. Crisp hard square pixels with stepped charcoal outlines and bright 3-tone material clusters; no blur, gradients, realism or antialiasing. All objects centered in individual cells with 18% empty margins. Exact row-major contents: ROW 1: iron chest armor breastplate; pair of green-leather trail boots; red-and-cyan horseshoe magnet; amber gemstone eye talisman. ROW 2: gold wooden hourglass with blue sand; four-leaf emerald lucky clover; glass of turquoise melon soda with melon wedge; bowl of pink-purple glowing mushroom soup. ROW 3: black pot of red pepper stew with star-shaped pepper garnish; ceramic plate of green leaf salad with dew pearls; blue ceramic bowl of blue crystal beans; dark fertile soil sack with tiny green shoot. ROW 4: turquoise metal watering can with long spout; silver curved harvesting sickle with wood handle; green-gem brass dungeon key with round bow; purple-gem dark iron dungeon key with square bow. All 16 objects must be complete and recognizable at 48 pixels. This is one functional sprite-sheet game asset.

## frame

Create a single square game UI frame asset for nine-slice scaling, PNG 1024 square. Original Minecraft-inspired retro pixel art. A simple thick square stone frame with crisp stepped bevels, gray cobblestone pixel clusters, a very small iron rivet at each corner, dark brown oak inner trim, flat nearly uniform charcoal-gray center panel. Four straight symmetric edges exactly 96 pixels thick, corner motifs fully contained within 96 by 96 pixel corners, center flat dark charcoal from x96 to928 and y96 to928, no ornament protruding into center, no text, no buttons, no icons, no inventory slots, no game screenshot. Clearly pixelated 4x4 square clusters and hard edges, no blur, no curves, no glow, no smooth gradients. The frame must fill the whole canvas to the edges and be usable as a CSS border-image. Neutral gray and dark brown materials with clean bright upper-left bevel and dark lower-right bevel. Functional readable retro UI panel texture.


## Saved runtime assets

- UI frame: `ui/panel.png`
- Generated source sheets: `sources/weapons.png`, `sources/supplies.png`, `sources/frame.png`

