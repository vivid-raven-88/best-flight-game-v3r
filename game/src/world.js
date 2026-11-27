// The valley of Aurora Valley: one seeded layout holding the fields, the
// river, the lake, the trees, the settlement, the runway and the rings.
// Everything is placed from seed 20261126, so the route is the same every
// flight and the autopilot can learn it.

import { makeRandom } from './rng.js';

export const VALLEY_SEED = 20261126;
export const RING_COUNT = 8;

// World bounds in metres. x runs east along the route, y runs south.
export const WORLD = { minX: -600, maxX: 5800, minY: -1600, maxY: 1600 };

// The runway: a strip along x at y = 0, with approach lights to its west.
export const RUNWAY = { x0: 4960, x1: 5360, y: 0, halfWidth: 30 };

export function buildWorld() {
  const rng = makeRandom(VALLEY_SEED);

  // The river winds south of the route, from the west edge to the lake.
  const river = [];
  for (let x = -600; x <= 4200; x += 200) {
    river.push({ x, y: 900 + Math.sin(x * 0.0011 + 1.3) * 260 + rng.range(-40, 40) });
  }
  // The lake sits east of the river's end, south of ring 7.
  const lake = { x: 4300, y: 1050, rx: 420, ry: 260 };

  // Fields: big rectangles of autumn green and gold, scattered so they
  // never cover the runway or the ring line.
  const fieldPalette = ['#7da35c', '#8fae62', '#a9b96a', '#c2b268', '#6f9a55'];
  const fields = [];
  for (let i = 0; i < 46; i++) {
    const f = {
      x: rng.range(-500, 5400),
      y: rng.range(-1500, 1500),
      w: rng.range(220, 520),
      h: rng.range(160, 380),
      color: rng.pick(fieldPalette),
    };
    if (f.x + f.w > RUNWAY.x0 - 120 && f.x < RUNWAY.x1 + 120 && f.y + f.h > -160 && f.y < 160) continue;
    fields.push(f);
  }

  // Trees: deterministic clumps, kept off the runway and the ring line.
  const trees = [];
  for (let i = 0; i < 220; i++) {
    const t = { x: rng.range(-550, 5700), y: rng.range(-1550, 1550), r: rng.range(7, 13) };
    if (t.x > RUNWAY.x0 - 90 && t.x < RUNWAY.x1 + 90 && Math.abs(t.y) < 120) continue;
    trees.push(t);
  }

  // The settlement: houses, two hangars and a tower, beside the runway.
  const houses = [];
  for (let i = 0; i < 16; i++) {
    houses.push({
      x: rng.range(RUNWAY.x0 - 700, RUNWAY.x0 - 120),
      y: (i % 2 === 0 ? -1 : 1) * rng.range(140, 420),
      w: rng.range(26, 40),
      h: rng.range(22, 32),
      roof: rng.pick(['#a4553a', '#7d4a2d', '#96502f']),
    });
  }
  const hangars = [
    { x: RUNWAY.x0 - 260, y: -150, w: 110, h: 70 },
    { x: RUNWAY.x0 - 260, y: 150, w: 110, h: 70 },
  ];
  const tower = { x: RUNWAY.x0 - 60, y: -120, w: 26, h: 26 };

  // The rings: eight gates along the route, each with its own altitude.
  const rings = [];
  for (let i = 0; i < RING_COUNT; i++) {
    rings.push({
      index: i,
      x: 500 + i * 520,
      y: Math.sin(i * 1.7 + 0.6) * 420,
      alt: 90 + ((i * 37) % 3) * 45,
      radius: 70,
      altTol: 30,
      passed: false,
    });
  }

  // Clouds: three slow layers of soft ellipses, screen-space parallax.
  const clouds = [];
  for (let layer = 0; layer < 3; layer++) {
    const puffs = [];
    for (let i = 0; i < 14; i++) {
      puffs.push({
        x: rng.range(0, 1400),
        y: rng.range(0, 760),
        rx: rng.range(60, 170),
        ry: rng.range(18, 42),
        speed: rng.range(4, 10) * (layer + 1),
      });
    }
    clouds.push({ depth: (layer + 1) * 0.35, alpha: 0.16 + layer * 0.05, puffs });
  }

  // Approach lights: a line of amber dots west of the runway threshold.
  const approachLights = [];
  for (let i = 1; i <= 6; i++) {
    approachLights.push({ x: RUNWAY.x0 - i * 90, y: 0 });
  }

  return { river, lake, fields, trees, houses, hangars, tower, rings, clouds, approachLights };
}

// ---------------------------------------------------------------- drawing

// World to screen: the camera sits on the plane, north up, 1 metre = 1 px.
function toScreen(camX, camY, viewW, viewH, wx, wy) {
  return { x: wx - camX + viewW / 2, y: wy - camY + viewH / 2 };
}

function inView(sx, sy, viewW, viewH, margin) {
  return sx > -margin && sx < viewW + margin && sy > -margin && sy < viewH + margin;
}

// The valley floor: dawn-green ground, fields, river, lake, trees, the
// settlement and the runway with its approach lights.
export function drawValley(ctx, world, camX, camY, viewW, viewH, time) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#8fb573');
  g.addColorStop(1, '#6f9a55');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  for (const f of world.fields) {
    const a = toScreen(camX, camY, viewW, viewH, f.x, f.y);
    if (!inView(a.x, a.y, viewW, viewH, Math.max(f.w, f.h))) continue;
    ctx.fillStyle = f.color;
    ctx.fillRect(a.x, a.y, f.w, f.h);
    ctx.strokeStyle = 'rgba(60, 90, 40, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(a.x, a.y, f.w, f.h);
  }

  // River: a winding blue band.
  ctx.strokeStyle = '#5a9ec9';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  world.river.forEach((p, i) => {
    const s = toScreen(camX, camY, viewW, viewH, p.x, p.y);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.stroke();
  ctx.strokeStyle = '#7fb8dd';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Lake.
  const lake = toScreen(camX, camY, viewW, viewH, world.lake.x, world.lake.y);
  if (inView(lake.x, lake.y, viewW, viewH, 500)) {
    ctx.fillStyle = '#5a9ec9';
    ctx.beginPath();
    ctx.ellipse(lake.x, lake.y, world.lake.rx, world.lake.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fb8dd';
    ctx.beginPath();
    ctx.ellipse(lake.x - 40, lake.y - 30, world.lake.rx * 0.6, world.lake.ry * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trees.
  for (const t of world.trees) {
    const s = toScreen(camX, camY, viewW, viewH, t.x, t.y);
    if (!inView(s.x, s.y, viewW, viewH, 20)) continue;
    ctx.fillStyle = '#2f6b34';
    ctx.beginPath();
    ctx.arc(s.x, s.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a8a44';
    ctx.beginPath();
    ctx.arc(s.x - 2, s.y - 2, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Settlement: houses with pitched roofs, two hangars, the tower.
  for (const hs of world.houses) {
    const s = toScreen(camX, camY, viewW, viewH, hs.x, hs.y);
    if (!inView(s.x, s.y, viewW, viewH, 60)) continue;
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(s.x, s.y, hs.w, hs.h);
    ctx.fillStyle = hs.roof;
    ctx.beginPath();
    ctx.moveTo(s.x - 3, s.y);
    ctx.lineTo(s.x + hs.w / 2, s.y - 12);
    ctx.lineTo(s.x + hs.w + 3, s.y);
    ctx.closePath();
    ctx.fill();
  }
  for (const hg of world.hangars) {
    const s = toScreen(camX, camY, viewW, viewH, hg.x, hg.y);
    if (!inView(s.x, s.y, viewW, viewH, 140)) continue;
    ctx.fillStyle = '#9aa2ab';
    ctx.fillRect(s.x, s.y, hg.w, hg.h);
    ctx.strokeStyle = '#5c636c';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, hg.w, hg.h);
    ctx.fillStyle = '#6e7680';
    ctx.fillRect(s.x + 8, s.y + hg.h - 22, hg.w - 16, 18);
  }
  const tw = toScreen(camX, camY, viewW, viewH, world.tower.x, world.tower.y);
  if (inView(tw.x, tw.y, viewW, viewH, 60)) {
    ctx.fillStyle = '#c8ccd4';
    ctx.fillRect(tw.x, tw.y, world.tower.w, world.tower.h);
    ctx.strokeStyle = '#5c636c';
    ctx.beginPath();
    ctx.moveTo(tw.x + 13, tw.y);
    ctx.lineTo(tw.x + 13, tw.y - 26);
    ctx.stroke();
    ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? '#ff5a4d' : '#a33';
    ctx.beginPath();
    ctx.arc(tw.x + 13, tw.y - 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Runway: dark strip, white centreline, threshold bars, number.
  const r0 = toScreen(camX, camY, viewW, viewH, RUNWAY.x0, RUNWAY.y - RUNWAY.halfWidth);
  const r1 = toScreen(camX, camY, viewW, viewH, RUNWAY.x1, RUNWAY.y + RUNWAY.halfWidth);
  if (r0.x < viewW && r1.x > 0 && r0.y < viewH && r1.y > 0) {
    ctx.fillStyle = '#3c4148';
    ctx.fillRect(r0.x, r0.y, r1.x - r0.x, r1.y - r0.y);
    ctx.fillStyle = '#f2f0e4';
    const midY = (r0.y + r1.y) / 2;
    for (let x = RUNWAY.x0 + 30; x < RUNWAY.x1 - 20; x += 60) {
      const d = toScreen(camX, camY, viewW, viewH, x, RUNWAY.y);
      ctx.fillRect(d.x, midY - 2, 34, 4);
    }
    for (const tx of [RUNWAY.x0 + 12, RUNWAY.x1 - 12]) {
      const d = toScreen(camX, camY, viewW, viewH, tx, RUNWAY.y);
      ctx.fillRect(d.x - 8, midY - 16, 16, 8);
      ctx.fillRect(d.x - 8, midY + 8, 16, 8);
    }
    const num = toScreen(camX, camY, viewW, viewH, RUNWAY.x0 + 60, RUNWAY.y);
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('27', num.x, midY);
  }

  // Approach lights: amber dots blinking toward the threshold.
  for (const light of world.approachLights) {
    const s = toScreen(camX, camY, viewW, viewH, light.x, light.y);
    if (!inView(s.x, s.y, viewW, viewH, 20)) continue;
    const on = Math.floor(time * 3 - (RUNWAY.x0 - light.x) / 90) % 2 === 0;
    ctx.fillStyle = on ? '#ffcf4d' : '#8a6d2f';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The rings: gold gates in the sky. The next one pulses; a passed one
// turns green and fades. The colour also tells the altitude match: bright
// gold when the plane is near the ring's altitude, dim when far off.
export function drawRings(ctx, world, camX, camY, viewW, viewH, time, planeAlt, nextIndex) {
  for (const ring of world.rings) {
    const s = toScreen(camX, camY, viewW, viewH, ring.x, ring.y);
    if (!inView(s.x, s.y, viewW, viewH, 140)) continue;
    const isNext = ring.index === nextIndex;
    const altGap = Math.abs(planeAlt - ring.alt);
    const match = altGap <= ring.altTol;
    const pulse = isNext ? 1 + Math.sin(time * 4) * 0.08 : 1;
    const r = ring.radius * pulse;

    ctx.save();
    if (ring.passed) {
      ctx.strokeStyle = 'rgba(126, 212, 145, 0.55)';
      ctx.lineWidth = 8;
    } else if (isNext) {
      ctx.strokeStyle = match ? '#ffd94d' : '#d8a93a';
      ctx.lineWidth = 10;
    } else {
      ctx.strokeStyle = 'rgba(216, 169, 58, 0.5)';
      ctx.lineWidth = 7;
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    // Tick marks at the cardinal points.
    ctx.strokeStyle = ctx.strokeStyle;
    ctx.lineWidth = 3;
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(a) * (r - 8), s.y + Math.sin(a) * (r - 8));
      ctx.lineTo(s.x + Math.cos(a) * (r + 8), s.y + Math.sin(a) * (r + 8));
      ctx.stroke();
    }
    ctx.fillStyle = ring.passed ? '#7ed491' : '#fff3c4';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ring.passed ? `✓ RING ${ring.index + 1}` : `RING ${ring.index + 1} • ${ring.alt} m`, s.x, s.y - r - 16);
    ctx.restore();
  }
}

// Distance in metres between two world points.
export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Clouds: soft screen-space ellipses drifting with time, three layers.
export function drawClouds(ctx, world, viewW, viewH, time) {
  for (const layer of world.clouds) {
    ctx.save();
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = '#ffffff';
    for (const p of layer.puffs) {
      const x = ((p.x + time * p.speed) % (viewW + 360)) - 180;
      const y = p.y * (viewH / 760);
      ctx.beginPath();
      ctx.ellipse(x, y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

