// Aurora Valley — Ring Run: the game loop, the input, the camera, the
// states and the autopilot. The Kestrel flies eight rings over the valley
// and lands on the runway; the ground, the fuel and a hard landing end it.

import { buildWorld, drawValley, drawRings, drawClouds, distance, RUNWAY, RING_COUNT, WORLD } from './world.js';
import { createPlane, updatePlane, headingDegrees } from './plane.js';
import { createAudio, startAudio, updateAudio } from './audio.js';
import { drawPlane, drawShadow, drawHud, drawTitle, drawWin, drawCrash } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW = { width: canvas.width, height: canvas.height };

// ?auto=1 flies the route on its own: a demo and the playtest path.
const AUTO = new URLSearchParams(window.location.search).get('auto') === '1';

const audio = createAudio();
let world = buildWorld();
let plane = createPlane();

const game = {
  state: 'title',
  score: 0,
  ringScore: 0,
  landingBonus: 0,
  ringsPassed: 0,
  ringCount: RING_COUNT,
  time: 0,
  flash: '',
  flashColor: '#ffd94d',
  flashUntil: 0,
  crashReason: '',
  headingDeg: 0,
  nextRing: null,
  distToNext: 0,
  timeText: '0:00',
  landingCommitted: false,
};

const keys = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, movedAt: 0 };

function resetGame() {
  world = buildWorld();
  plane = createPlane();
  game.state = 'flying';
  game.score = 0;
  game.ringScore = 0;
  game.landingBonus = 0;
  game.ringsPassed = 0;
  game.time = 0;
  game.flash = '';
  game.crashReason = '';
  game.nextRing = world.rings[0];
  game.distToNext = distance(plane.x, plane.y, game.nextRing.x, game.nextRing.y);
  game.timeText = '0:00';
  game.landingCommitted = false;
}

function setFlash(text, color) {
  game.flash = text;
  game.flashColor = color || '#ffd94d';
  game.flashUntil = game.time + 2.5;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// The autopilot: turn toward the next gate, hold its altitude, slow down
// for the runway. It flies the same inputs a player would. The landing is
// a real approach: first fly to a fix 700 m west of the threshold, lined
// up with the runway, then a shallow final descent onto the strip. Aiming
// straight at the runway centre from any direction just orbits it.
function autopilotInput() {
  if (game.ringsPassed < RING_COUNT) {
    const ring = world.rings[game.ringsPassed];
    const dx = ring.x - plane.x;
    const dy = ring.y - plane.y;
    const wantHeading = Math.atan2(dy, dx);
    let diff = wantHeading - plane.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-1, Math.min(1, diff * 2.2));
    let desiredAlt = ring.alt;
    if (plane.alt < 35) desiredAlt = Math.max(desiredAlt, 90);
    if (plane.alt < 15) desiredAlt = 100;
    const vWant = Math.max(-12, Math.min(12, (desiredAlt - plane.alt) * 0.6));
    const pitch = Math.max(-1, Math.min(1, vWant / 14));
    return { turn, pitch, throttle: 0.8, boost: false };
  }

  // Land-now: low over the strip and inside it — ease down and land.
  // The glide slope alone hovers the plane a few metres up forever: its
  // altitude target rises again whenever the plane drifts from the centre.
  // This override catches any low pass over the strip and finishes it.
  if (
    plane.alt < 12 &&
    plane.x >= RUNWAY.x0 &&
    plane.x <= RUNWAY.x1 &&
    Math.abs(plane.y - RUNWAY.y) < 35
  ) {
    const wantHeading = Math.atan2(RUNWAY.y - plane.y, RUNWAY.x1 + 200 - plane.x);
    let diff = wantHeading - plane.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return { turn: Math.max(-1, Math.min(1, diff * 2.2)), pitch: -0.3, throttle: 0.3, boost: false };
  }

  // Landing: follow a 5% glide slope down the runway centreline. The
  // heading target is a carrot 400 m ahead on the centreline, so the plane
  // never chases a point behind it and never orbits a target. Once lined
  // up, low and close, the landing COMMITS: the target becomes a point
  // past the far threshold and the altitude target a shallow line to the
  // strip, so the plane stops chasing the centre and just lands. A plain
  // glide-slope target rises again whenever the plane moves away from the
  // centre, which shuttles it back and forth forever instead of landing.
  const centre = { x: (RUNWAY.x0 + RUNWAY.x1) / 2, y: RUNWAY.y };
  const distCentre = distance(plane.x, plane.y, centre.x, centre.y);
  let headingEast = plane.heading;
  while (headingEast > Math.PI) headingEast -= Math.PI * 2;
  while (headingEast < -Math.PI) headingEast += Math.PI * 2;
  const aligned =
    Math.abs(headingEast) < 0.4 && Math.abs(plane.y) < 60 && plane.x < RUNWAY.x1 && plane.alt < 40;
  if (game.landingCommitted) {
    if (plane.x > RUNWAY.x1 + 100 || Math.abs(plane.y) > 120) game.landingCommitted = false;
  } else if (aligned && distCentre < 400) {
    game.landingCommitted = true;
  }
  let target;
  let desiredAlt;
  let throttle;
  if (game.landingCommitted) {
    target = { x: RUNWAY.x1 + 300, y: RUNWAY.y };
    desiredAlt = Math.max(0, (distCentre - 100) * 0.04);
    throttle = 0.35;
  } else {
    const carrotX = Math.min(centre.x, plane.x + 400);
    target = { x: carrotX, y: RUNWAY.y };
    desiredAlt = Math.max(0, Math.min(120, distCentre * 0.05));
    throttle = distCentre < 500 ? 0.45 : 0.7;
    if (distCentre < 250 && plane.speed > 72) throttle = 0.3;
  }
  const wantHeading = Math.atan2(target.y - plane.y, target.x - plane.x);
  let diff = wantHeading - plane.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-1, Math.min(1, diff * 2.2));
  const vWant = Math.max(-12, Math.min(12, (desiredAlt - plane.alt) * 0.6));
  const pitch = Math.max(-1, Math.min(1, vWant / 14));
  return { turn, pitch, throttle, boost: false };
}

function playerInput() {
  let turn = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) turn -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) turn += 1;
  let pitch = 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
  // Mouse steer: hold the mouse off-centre to turn toward it.
  if (performance.now() - mouse.movedAt < 2000) {
    turn += Math.max(-1, Math.min(1, (mouse.x - VIEW.width / 2) / (VIEW.width / 2))) * 0.6;
  }
  turn = Math.max(-1, Math.min(1, turn));
  let throttle = plane.throttle;
  if (keys.has('ShiftLeft') || keys.has('ShiftRight')) throttle = Math.min(1, throttle + 0.02);
  if (keys.has('ControlLeft') || keys.has('ControlRight')) throttle = Math.max(0.15, throttle - 0.02);
  return { turn, pitch, throttle, boost: mouse.down };
}

function onGround(plane) {
  return (
    plane.alt <= 0 &&
    plane.x >= RUNWAY.x0 &&
    plane.x <= RUNWAY.x1 &&
    Math.abs(plane.y - RUNWAY.y) <= RUNWAY.halfWidth + 10
  );
}

function update(dt) {
  if (game.state !== 'flying') return;
  game.time += dt;
  game.timeText = formatTime(game.time);

  const input = AUTO ? autopilotInput() : playerInput();
  plane.throttle = input.throttle;
  updatePlane(plane, input, dt);
  updateAudio(audio, plane);

  // Keep the plane inside the valley.
  plane.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, plane.x));
  plane.y = Math.max(WORLD.minY, Math.min(WORLD.maxY, plane.y));

  game.headingDeg = headingDegrees(plane);
  game.nextRing = game.ringsPassed < RING_COUNT ? world.rings[game.ringsPassed] : null;
  if (game.nextRing) {
    game.distToNext = distance(plane.x, plane.y, game.nextRing.x, game.nextRing.y);
    const altGap = Math.abs(plane.alt - game.nextRing.alt);
    if (game.distToNext < game.nextRing.radius && altGap <= game.nextRing.altTol) {
      game.nextRing.passed = true;
      game.ringsPassed += 1;
      game.score += 100;
      game.ringScore += 100;
      setFlash(`RING ${game.ringsPassed}/${RING_COUNT}  +100`, '#7ed491');
      game.nextRing = game.ringsPassed < RING_COUNT ? world.rings[game.ringsPassed] : null;
    }
  }

  if (game.time > game.flashUntil) game.flash = '';

  if (plane.alt <= 0) {
    plane.alt = 0;
    const gentle = Math.abs(plane.vSpeed) < 6 && plane.speed < 75;
    if (onGround(plane) && gentle) {
      if (game.ringsPassed >= RING_COUNT) {
        game.landingBonus = 200 + Math.round(plane.fuel);
        game.score += game.landingBonus;
        game.state = 'win';
      } else {
        game.crashReason = 'Down on the runway before all 8 rings — the sortie is not done.';
        game.state = 'crash';
      }
    } else if (plane.fuel <= 0) {
      game.crashReason = 'Out of fuel over rough ground.';
      game.state = 'crash';
    } else if (onGround(plane)) {
      game.crashReason = 'Too fast and steep for the runway — the gear gave way.';
      game.state = 'crash';
    } else {
      game.crashReason = 'Down in the fields. The runway was the only safe ground.';
      game.state = 'crash';
    }
  }

  if (plane.fuel <= 0 && game.state === 'flying' && !game.flash) {
    setFlash('FUEL EMPTY — gliding down', '#ff6a5e');
  }
}

function draw(time) {
  const camX = plane.x;
  const camY = plane.y;
  const px = VIEW.width / 2;
  const py = VIEW.height / 2;
  // Chase-view zoom: the valley, the rings, the shadow and the plane are
  // drawn through one 2x scale about the screen centre, so the Kestrel
  // reads at thumbnail size. Only the render scale changes — the physics,
  // the world coordinates and the gameplay are untouched. Clouds, HUD and
  // end screens stay in screen space, unscaled.
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(2, 2);
  ctx.translate(-px, -py);
  drawValley(ctx, world, camX, camY, VIEW.width, VIEW.height, time);
  drawRings(ctx, world, camX, camY, VIEW.width, VIEW.height, time, plane.alt, game.ringsPassed);
  drawShadow(ctx, plane, px, py);
  drawPlane(ctx, plane, px, py);
  ctx.restore();
  drawClouds(ctx, world, VIEW.width, VIEW.height, time);

  if (game.state === 'title') drawTitle(ctx, VIEW);
  else if (game.state === 'win') drawWin(ctx, VIEW, game);
  else if (game.state === 'crash') drawCrash(ctx, VIEW, game);
  else drawHud(ctx, VIEW, plane, game);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw(now / 1000);
  requestAnimationFrame(loop);
}

// The playtest hook: the harness reads the flight state from the page.
window.__gameState = () => ({
  state: game.state,
  ringsPassed: game.ringsPassed,
  score: game.score,
  alt: Math.round(plane.alt),
  speed: Math.round(plane.speed),
  x: Math.round(plane.x),
  y: Math.round(plane.y),
  fuel: Math.round(plane.fuel),
  distToNext: Math.round(game.distToNext),
  distToRunway: Math.round(distance(plane.x, plane.y, (RUNWAY.x0 + RUNWAY.x1) / 2, RUNWAY.y)),
  timeText: game.timeText,
});

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  startAudio(audio);
  if (e.code === 'Enter' && game.state === 'title') {
    resetGame();
    return;
  }
  if (e.code === 'KeyR' && (game.state === 'win' || game.state === 'crash')) {
    resetGame();
    return;
  }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('mousedown', (e) => {
  startAudio(audio);
  mouse.down = true;
  if (game.state === 'title') resetGame();
});
window.addEventListener('mouseup', () => {
  mouse.down = false;
});
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * VIEW.width;
  mouse.y = ((e.clientY - rect.top) / rect.height) * VIEW.height;
  mouse.movedAt = performance.now();
});

// The title screen shows the valley drifting by behind it.
if (AUTO) {
  resetGame();
}
requestAnimationFrame(loop);
