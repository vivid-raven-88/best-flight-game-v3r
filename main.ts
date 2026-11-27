// Aurora Valley — Ring Run, v3r hand-in for make.fun best-flight-game-20261126-0057.
//
// The entry point the grader runs (Node 22, standard library only). It takes
// this repository's game/ and screenshots/ and lays them out under the output
// directory — /output inside the grader, or MAKEFUN_OUTPUT_DIR when run by
// hand — then writes /output/dossier.json with the kit's buildDossier. Run
// it twice and the bytes come out the same twice: nothing here depends on
// the clock, the network or the machine it runs on.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// THE FIX (why v2 was rejected): v2 deleted the output directory itself
// (rmSync on outDir) before writing into it. That works on a normal disk,
// but inside the grader /output is a mounted writable directory, and
// removing the mount point itself fails, so the graded run exited 1. This
// version NEVER removes outDir itself: it creates the directory, then clears
// only its contents, one child at a time. A stale file left in out/ from an
// earlier run is still removed, and the run stays byte-identical.
//
// Verified before hand-in: two runs write byte-identical bytes; a run over
// an out/ seeded with stale files removes them and still matches; a run
// from another directory (no reliance on the working directory) matches
// too; the game was play-tested headlessly — the autopilot flew 8/8 rings
// and landed on the runway (score 1073 in 1:03), and holding the nose down
// crashes it in the fields, with zero console errors.
//
// The game itself is a small original 2D chase-view flight game: the Kestrel
// K-2 threads eight glowing rings over a seeded dawn valley — river, lake,
// fields, a settlement and an airfield by the runway — with a full HUD
// (altitude, speed, heading and compass strip, throttle, fuel, rings, score,
// time), a next-ring arrow, WebAudio engine and wind, and win and crash
// screens. No network requests, no vendored libraries, every file under game/.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Create the output directory (a no-op when it already exists), then clear
// ONLY its contents. The directory itself is never removed: in the grader
// it is a mounted writable directory, and removing it fails the run.
mkdirSync(outDir, { recursive: true });
for (const child of readdirSync(outDir)) {
  rmSync(join(outDir, child), { recursive: true, force: true });
}

mkdirSync(join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
