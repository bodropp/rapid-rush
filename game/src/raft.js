// Rapid Rush — the raft: steering, paddle boost, hull and power-ups.
// The raft never moves itself; update() takes the input and the river and
// returns what happened, so the loop stays the only place that reads keys.

import {
  RAFT_Y, RAFT_RADIUS, RAFT_HALF_WIDTH, HULL_MAX,
  INVULN_AFTER_HIT, STAR_TIME, PADDLE_BOOST_TIME, PADDLE_COOLDOWN,
} from './config.js';

export function createRaft() {
  return {
    x: 480, // logical x; the river centre is 480
    y: RAFT_Y,
    vx: 0,
    tilt: 0, // visual lean, radians
    hull: HULL_MAX,
    shield: false,
    star: 0, // seconds of star power left
    invuln: 0, // seconds of mercy left
    paddle: 0, // seconds of boost left
    paddleCooldown: 0,
    paddleSide: 1, // the paddle alternates sides each stroke
    paddleAnim: 0, // 0..1 progress of the visible stroke
  };
}

// Steer with keys or the mouse, spend a paddle stroke, tick the timers.
// Returns an object naming the frame's events for the loop to sound out.
export function updateRaft(raft, input, dt, riverHalfWidth, audio, playPaddle) {
  const events = { paddled: false, moved: false };
  const accel = 1500;
  const maxSpeed = 430;

  let steer = 0;
  if (input.left) steer -= 1;
  if (input.right) steer += 1;

  if (input.mouseActive && input.mouseX !== null) {
    // The mouse steers by pointing: the raft chases the pointer.
    const dx = input.mouseX - raft.x;
    if (Math.abs(dx) > 4) {
      raft.vx += Math.max(-accel, Math.min(accel, dx * 14)) * dt;
      events.moved = true;
    }
  }
  if (steer !== 0) {
    raft.vx += steer * accel * dt;
    events.moved = true;
  }
  if (steer === 0 && !(input.mouseActive && input.mouseX !== null)) {
    raft.vx *= Math.pow(0.0015, dt); // strong drag when nobody steers
  }
  raft.vx = Math.max(-maxSpeed, Math.min(maxSpeed, raft.vx));
  raft.x += raft.vx * dt;

  // Stay inside the river, with a soft bounce off the banks.
  const minX = 480 - riverHalfWidth + RAFT_HALF_WIDTH + 6;
  const maxX = 480 + riverHalfWidth - RAFT_HALF_WIDTH - 6;
  if (raft.x < minX) { raft.x = minX; raft.vx = Math.abs(raft.vx) * 0.4; }
  if (raft.x > maxX) { raft.x = maxX; raft.vx = -Math.abs(raft.vx) * 0.4; }

  // Lean into the motion.
  const targetTilt = Math.max(-0.22, Math.min(0.22, raft.vx * 0.00045));
  raft.tilt += (targetTilt - raft.tilt) * Math.min(1, dt * 10);

  // Paddle: a short burst of speed, on a cooldown.
  raft.paddleCooldown = Math.max(0, raft.paddleCooldown - dt);
  raft.paddle = Math.max(0, raft.paddle - dt);
  if ((input.paddlePressed || input.paddleHeld) && raft.paddleCooldown <= 0 && raft.paddle <= 0) {
    raft.paddle = PADDLE_BOOST_TIME;
    raft.paddleCooldown = PADDLE_COOLDOWN;
    raft.paddleSide = -raft.paddleSide;
    raft.paddleAnim = 0;
    events.paddled = true;
    if (audio) playPaddle(audio);
  }
  if (raft.paddle > 0) raft.paddleAnim = Math.min(1, raft.paddleAnim + dt / PADDLE_BOOST_TIME);

  // Power-up and mercy timers.
  raft.star = Math.max(0, raft.star - dt);
  raft.invuln = Math.max(0, raft.invuln - dt);
  return events;
}

// A hit lands: the shield eats it, the star ignores it, otherwise a hull
// point is lost and the raft gets a mercy window. Returns 'shield' |
// 'ignored' | 'hit' | 'sunk'.
export function hitRaft(raft) {
  if (raft.star > 0 || raft.invuln > 0) return 'ignored';
  if (raft.shield) {
    raft.shield = false;
    raft.invuln = INVULN_AFTER_HIT;
    return 'shield';
  }
  raft.hull -= 1;
  raft.invuln = INVULN_AFTER_HIT;
  return raft.hull <= 0 ? 'sunk' : 'hit';
}

export function giveStar(raft) {
  raft.star = STAR_TIME;
}

export function giveShield(raft) {
  raft.shield = true;
}

export function healRaft(raft) {
  raft.hull = Math.min(HULL_MAX, raft.hull + 1);
}

export function raftRadius() {
  return RAFT_RADIUS;
}
