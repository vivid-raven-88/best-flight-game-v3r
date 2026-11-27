// The Kestrel K-2: heading, speed, altitude, throttle and fuel. One update
// step moves the plane; the game decides what a landing or a crash is.

export const PLANE_START = { x: 0, y: 0, heading: 0, speed: 60, alt: 120, fuel: 100 };

export function createPlane() {
  return {
    x: PLANE_START.x,
    y: PLANE_START.y,
    heading: PLANE_START.heading,
    speed: PLANE_START.speed,
    alt: PLANE_START.alt,
    vSpeed: 0,
    throttle: 0.7,
    fuel: PLANE_START.fuel,
  };
}

// turn: -1 (left) .. 1 (right). pitch: -1 (down) .. 1 (up).
// boost: true while the mouse button is held (afterburner).
export function updatePlane(plane, input, dt) {
  const turnRate = 1.05 * (0.6 + 0.4 * (plane.speed / 120));
  plane.heading += input.turn * turnRate * dt;

  const throttle = input.boost ? 1 : plane.throttle;
  const targetSpeed = 35 + throttle * 85;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.8);

  // Out of fuel the Kestrel glides down: no thrust, a slow sink.
  let vTarget = input.pitch * 14;
  if (plane.fuel <= 0) vTarget = -4;
  plane.vSpeed += (vTarget - plane.vSpeed) * Math.min(1, dt * 2);
  plane.alt += plane.vSpeed * dt;

  plane.fuel = Math.max(0, plane.fuel - (0.1 + throttle * 0.45) * dt);

  plane.x += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += Math.sin(plane.heading) * plane.speed * dt;
}

// Heading in degrees, 0-359, for the HUD compass.
export function headingDegrees(plane) {
  let deg = (plane.heading * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return Math.round(deg);
}
