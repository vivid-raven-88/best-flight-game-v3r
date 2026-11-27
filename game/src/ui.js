// Everything drawn on top of the valley: the Kestrel itself, the HUD with
// its compass strip, the next-ring banner and gold arrow, and the title,
// win and crash screens. All canvas, no images, no fonts from the network.

const NM_PER_METRE = 1 / 1852;

function compassLabel(deg) {
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  return labels[deg] ?? String(deg);
}

// The Kestrel from above: fuselage, swept wings, tail. Drawn at (x, y),
// rotated to the plane's heading.
export function drawPlane(ctx, plane, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.heading);
  ctx.fillStyle = '#e8e4da';
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 2;
  // Fuselage.
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-14, -7);
  ctx.lineTo(-20, -4);
  ctx.lineTo(-20, 4);
  ctx.lineTo(-14, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Main wings, swept back.
  ctx.fillStyle = '#c8ccd4';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-6, -26);
  ctx.lineTo(-12, -26);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-6, 26);
  ctx.lineTo(-12, 26);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tail fins.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-24, -6);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-24, 10);
  ctx.lineTo(-24, 6);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fill();
  // Cockpit.
  ctx.fillStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.arc(12, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The plane's shadow on the ground, offset and faded by altitude.
export function drawShadow(ctx, plane, x, y) {
  const offset = Math.min(34, plane.alt * 0.22);
  const alpha = Math.max(0.08, 0.3 - plane.alt * 0.001);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a2a1a';
  ctx.beginPath();
  ctx.ellipse(x + offset, y + offset, 24, 9, plane.heading, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The compass strip: ticks around the current heading, cardinal labels.
function drawCompass(ctx, headingDeg, cx, y, width) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 24, 0.55)';
  ctx.fillRect(cx - width / 2, y, width, 30);
  ctx.strokeStyle = '#d8c25a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + 8);
  ctx.stroke();
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = -60; d <= 60; d += 15) {
    const deg = ((Math.round(headingDeg) + d) % 360 + 360) % 360;
    const px = cx + (d / 60) * (width / 2 - 8);
    const isCardinal = deg % 45 === 0;
    ctx.fillStyle = isCardinal ? '#ffd94d' : '#c9c9c9';
    ctx.font = isCardinal ? 'bold 14px sans-serif' : '11px sans-serif';
    ctx.fillText(compassLabel(deg), px, y + 15);
    ctx.fillRect(px - 1, y + 24, 2, 5);
  }
  ctx.restore();
}

// Dark pill behind a centred banner line, so yellow/white text reads on
// any ground below it (pale fields, river, clouds).
function bannerBack(ctx, text, cx, y, halfH) {
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(8, 14, 24, 0.65)';
  ctx.fillRect(cx - w / 2 - 12, y - halfH, w + 24, halfH * 2);
}

// The HUD: altitude, speed, heading, throttle, fuel, rings, score, time.
export function drawHud(ctx, view, plane, game) {
  const w = view.width;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 24, 0.72)';
  ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = '#f2f0e4';
  ctx.textBaseline = 'middle';

  const cell = (x, label, value, color) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb4c8';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, x, 14);
    ctx.fillStyle = color || '#f2f0e4';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(value, x, 40);
  };

  cell(16, 'ALTITUDE', `${Math.max(0, Math.round(plane.alt))} m`);
  cell(140, 'SPEED', `${Math.round(plane.speed * 3.6)} km/h`);
  cell(280, 'HEADING', `${String(game.headingDeg).padStart(3, '0')}°`);
  drawCompass(ctx, game.headingDeg, 470, 17, 220);

  // Throttle bar.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '11px sans-serif';
  ctx.fillText('THROTTLE', 600, 14);
  ctx.fillStyle = '#22303f';
  ctx.fillRect(600, 26, 110, 12);
  ctx.fillStyle = plane.throttle > 0.85 ? '#ff9d45' : '#5ec8a0';
  ctx.fillRect(600, 26, 110 * plane.throttle, 12);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, 716, 32);

  // Fuel bar.
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '11px sans-serif';
  ctx.fillText('FUEL', 770, 14);
  ctx.fillStyle = '#22303f';
  ctx.fillRect(770, 26, 110, 12);
  ctx.fillStyle = plane.fuel < 20 ? '#e84c3d' : '#e8c33d';
  ctx.fillRect(770, 26, 110 * (plane.fuel / 100), 12);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 886, 32);

  cell(940, 'RINGS', `${game.ringsPassed} / ${game.ringCount}`, game.ringsPassed === game.ringCount ? '#7ed491' : '#f2f0e4');
  cell(1030, 'SCORE', String(game.score), '#ffd94d');
  cell(1150, 'TIME', game.timeText);

  // Next-ring banner + gold arrow, or the landing call.
  ctx.textAlign = 'center';
  ctx.font = 'bold 19px sans-serif';
  if (game.state === 'flying' && game.nextRing) {
    const nm = (game.distToNext * NM_PER_METRE).toFixed(1);
    const banner = `NEXT RING ${game.nextRing.index + 1}/${game.ringCount} — ${nm} nm`;
    bannerBack(ctx, banner, w / 2, 88, 15);
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(banner, w / 2, 88);
    const ax = w / 2;
    const ay = 118;
    const ang = Math.atan2(game.nextRing.y - plane.y, game.nextRing.x - plane.x);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const sub = `RING ALT ${game.nextRing.alt} m — match it to pass`;
    ctx.font = '13px sans-serif';
    bannerBack(ctx, sub, w / 2, 140, 12);
    ctx.fillStyle = '#f2f0e4';
    ctx.fillText(sub, w / 2, 140);
  } else if (game.state === 'flying' && game.ringsPassed === game.ringCount) {
    const banner = 'ALL RINGS — LAND ON THE RUNWAY';
    bannerBack(ctx, banner, w / 2, 88, 15);
    ctx.fillStyle = '#7ed491';
    ctx.fillText(banner, w / 2, 88);
    const sub = 'Low and slow over the strip: under 25 m, gentle descent';
    ctx.font = '13px sans-serif';
    bannerBack(ctx, sub, w / 2, 112, 12);
    ctx.fillStyle = '#f2f0e4';
    ctx.fillText(sub, w / 2, 112);
  }

  // Flash message (ring passed, low fuel, out of bounds).
  if (game.flash) {
    ctx.font = 'bold 22px sans-serif';
    bannerBack(ctx, game.flash, w / 2, 180, 16);
    ctx.fillStyle = game.flashColor || '#ffd94d';
    ctx.fillText(game.flash, w / 2, 180);
  }

  // Bottom hint bar.
  ctx.fillStyle = 'rgba(8, 14, 24, 0.6)';
  ctx.fillRect(0, view.height - 30, w, 30);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '13px sans-serif';
  ctx.fillText('Arrows / WASD fly  •  Shift throttle up, Ctrl down  •  Hold mouse: afterburner, move mouse: steer  •  R restart', w / 2, view.height - 15);
  ctx.restore();
}

function panel(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 20, 0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawTitle(ctx, view) {
  const { width: w, height: h } = view;
  panel(ctx, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('AURORA VALLEY', w / 2, h / 2 - 110);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('— RING RUN —', w / 2, h / 2 - 66);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#c9d6e2';
  ctx.fillText('Fly the Kestrel K-2 through 8 rings over a dawn valley,', w / 2, h / 2 - 16);
  ctx.fillText('then land her gently on the runway. Mind the fuel.', w / 2, h / 2 + 12);
  ctx.fillStyle = '#7ec8e3';
  ctx.font = '16px sans-serif';
  ctx.fillText('Arrows / WASD to fly  •  Shift / Ctrl throttle  •  Mouse: hold for afterburner', w / 2, h / 2 + 56);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER or click to fly', w / 2, h / 2 + 108);
  ctx.restore();
}

export function drawWin(ctx, view, game) {
  const { width: w, height: h } = view;
  panel(ctx, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ed491';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('MISSION COMPLETE', w / 2, h / 2 - 90);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = '20px sans-serif';
  ctx.fillText('All 8 rings, and the Kestrel is down safe on the runway.', w / 2, h / 2 - 44);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`SCORE ${game.score}`, w / 2, h / 2 + 4);
  ctx.fillStyle = '#c9d6e2';
  ctx.font = '17px sans-serif';
  ctx.fillText(`Rings ${game.ringScore}  •  Landing bonus ${game.landingBonus}  •  Time ${game.timeText}`, w / 2, h / 2 + 40);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press R to fly again', w / 2, h / 2 + 92);
  ctx.restore();
}

export function drawCrash(ctx, view, game) {
  const { width: w, height: h } = view;
  panel(ctx, w, h);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6a5e';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('CRASHED', w / 2, h / 2 - 80);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = '20px sans-serif';
  ctx.fillText(game.crashReason || 'The Kestrel met the ground.', w / 2, h / 2 - 34);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${game.score}`, w / 2, h / 2 + 8);
  ctx.fillStyle = '#c9d6e2';
  ctx.font = '17px sans-serif';
  ctx.fillText(`Rings ${game.ringsPassed} / ${game.ringCount}  •  Time ${game.timeText}`, w / 2, h / 2 + 44);
  ctx.fillStyle = '#f2f0e4';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press R to fly again', w / 2, h / 2 + 94);
  ctx.restore();
}
