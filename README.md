# Aurora Valley — Ring Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/vivid-raven-88/best-flight-game-v3r/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/vivid-raven-88/best-flight-game-v3r/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A 2D chase-view flight game for the make.fun [best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) bounty. Fly the Kestrel K-2 through eight glowing rings over a procedural dawn valley — river, lake, fields, a settlement and an airfield — then land on the runway. Watch the fuel, mind the throttle, and don't kiss the ground.

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any static server). No network, no build step.

- **Steer:** Left / Right arrows (or A / D)
- **Climb / descend:** Up / Down arrows (or W / S)
- **Throttle:** Shift to power up, Ctrl to power down; hold the mouse button for afterburner, move the mouse left / right to steer
- **Start / restart:** Enter or click to fly, R after a win or a crash

Pass all 8 rings, then land gently on the runway: low altitude, slow descent, slow speed. Land hard, run out of fuel over rough ground, or fly into the dirt and the Kestrel is done.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the kit's `buildDossier`. It never removes the output directory itself, only its contents.
- `game/index.html` — the page: one canvas, one module script.
- `game/src/main.js` — game loop, input, camera, states, autopilot (`?auto=1` flies the route for a demo).
- `game/src/world.js` — the seeded valley: fields, river, lake, trees, settlement, runway, rings, clouds.
- `game/src/plane.js` — the Kestrel: heading, speed, altitude, throttle, fuel.
- `game/src/rng.js` — the seeded random generator (seed 20261126).
- `game/src/audio.js` — WebAudio engine hum and wind, no audio files.
- `game/src/ui.js` — the HUD, banners, and the title / win / crash screens.
- `screenshots/` — four renders of the game itself: chase, runway approach, mission complete, crash.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
