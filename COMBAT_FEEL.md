# Combat feel pass — September 4, 2026

Research references:
- [Celeste & Forgiveness, Maddy Thorson](https://www.mattmakesgames.com/articles/celeste_and_forgiveness/index.html): buffered inputs and coyote time preserve player intention. We retain those controls and improve movement response and air steering.
- [Dead Cells, Sébastien Bénard, GDC 2019](https://media.gdcvault.com/gdc2019/presentations/Benard-Sebastian-DeepCells.pdf): responsive controls and assistance such as auto-aim remove friction outside the intended challenge. Ranged attacks now lead moving enemies.
- [Megabonk, official Steam description](https://store.steampowered.com/app/3405340/Megabonk/): hordes, loot and XP feed escalating builds. Small spawn groups and accelerating XP attraction strengthen that loop.

These are design references, not claims that those games use our exact implementation. No copied game assets or code.

Movement no longer slows on kills. Hit stagger belongs to enemies. Camera distance recovers smoothly after an obstruction, with gentler sprint/dash FOV changes. Model recoil and landing squash leave collision position unchanged.

Melee resolves after a short wind-up. Faster projectiles lead targets. Weak moths fall to a base Thorn Bolt. Directional impacts, tumbling defeated monsters and restrained damage numbers clarify hits. Defeated rigs are capped at 24 and disposed after 0.32 seconds (guardian: 0.55).

Official Axie Origins sounds use normalized volume, leading-silence trimming, fades, slight pitch variation, cooldowns, compression and bounded simultaneous voices. Synthesized XP tones rise through a pentatonic phrase. Audio starts on the enter-game gesture and respects saved mute preferences.

Farm meshes rebuild only when their visible growth stage changes, and are not refreshed during battle. Rendering density is capped at 1.5 device pixels per CSS pixel.

Validation covers movement/terrain, camera clearance, starters/evolutions, melee timing/cancellation, enemy stagger, recoil recovery, death cleanup, farm mesh reuse, audio concurrency/muting, pickup conservation and bounded VFX. Type checking and a production build precede release. These checks do not measure browser GPU frame rate or replace hands-on playtesting.
