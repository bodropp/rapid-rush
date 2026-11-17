// Rapid Rush — the river world: sections, scrolling, spawning and the
// decorations that scroll past. The world owns distance, speed and the
// lists of hazards and pickups; the loop owns the raft and the rules.

import {
  VIEW_W, VIEW_H, RIVER_CENTER_X, SECTIONS, BASE_SCROLL, SCROLL_RAMP_PER_METER,
  SCROLL_MAX, PADDLE_BOOST_SPEED, PX_PER_METER, SPAWN_EVERY, SPAWN_MIN,
  POINTS_PER_SECTION, RING_EVERY, RING_RADIUS, FINAL_STRETCH_AT,
} from './config.js';
import { makeRng, range, pick } from './random.js';

export function createWorld(seed) {
  return {
    rng: makeRng(seed),
    seed,
    distance: 0, // metres travelled
    scrolled: 0, // pixels scrolled in total
    speed: BASE_SCROLL, // current scroll speed, px per second
    sectionIndex: 0,
    sectionBlend: 0, // 0..1 palette lerp into the next section
    sectionFlash: 0, // seconds the section banner stays up
    finalFlash: 0, // seconds the final-stretch banner stays up
    finalStretch: false, // true once the run passes FINAL_STRETCH_AT
    spawnTimer: 1.2,
    ringTimer: 5.5, // first golden ring a few seconds in
    hazards: [],
    pickups: [],
    rings: [], // golden rings to steer through
    leaves: [],
    bankRows: [], // decorations on the banks, one row per 46 px
    nextBankRow: 0,
    time: 0,
  };
}

export function currentSection(world) {
  return SECTIONS[world.sectionIndex];
}

export function nextSection(world) {
  return SECTIONS[Math.min(world.sectionIndex + 1, SECTIONS.length - 1)];
}

// Lerp between two palettes while the river changes character.
function lerpPalette(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) {
    const ca = parseInt(a[key].slice(1), 16);
    const cb = parseInt(b[key].slice(1), 16);
    const r = Math.round(((ca >> 16) & 255) + (((cb >> 16) & 255) - ((ca >> 16) & 255)) * t);
    const g = Math.round(((ca >> 8) & 255) + (((cb >> 8) & 255) - ((ca >> 8) & 255)) * t);
    const bl = Math.round((ca & 255) + ((cb & 255) - (ca & 255)) * t);
    out[key] = `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
  }
  return out;
}

export function worldPalette(world) {
  const section = currentSection(world);
  const next = nextSection(world);
  if (world.sectionIndex >= SECTIONS.length - 1 || world.sectionBlend <= 0) {
    return section.palette;
  }
  return lerpPalette(section.palette, next.palette, world.sectionBlend);
}

export function riverHalfWidth(world) {
  const section = currentSection(world);
  const next = nextSection(world);
  if (world.sectionIndex >= SECTIONS.length - 1) return section.riverHalfWidth;
  return section.riverHalfWidth
    + (next.riverHalfWidth - section.riverHalfWidth) * world.sectionBlend;
}

// Advance the world one step. Returns 'section' when a new stretch begins.
export function updateWorld(world, raft, dt, onSection) {
  world.time += dt;
  const section = currentSection(world);

  // Speed grows with distance and with the section, plus the paddle boost.
  // The final stretch adds another kick on top.
  const ramp = Math.min(SCROLL_MAX - BASE_SCROLL, world.distance * SCROLL_RAMP_PER_METER);
  let speed = (BASE_SCROLL + ramp) * section.speedScale;
  if (world.finalStretch) speed *= 1.12;
  if (raft.paddle > 0) speed += PADDLE_BOOST_SPEED;
  world.speed = speed;

  const dy = speed * dt;
  world.scrolled += dy;
  world.distance = world.scrolled / PX_PER_METER;

  // Section changes: blend the palette over 1.5 s, flash the name.
  if (world.sectionIndex < SECTIONS.length - 1
    && world.distance >= SECTIONS[world.sectionIndex + 1].fromMeters) {
    world.sectionIndex += 1;
    world.sectionBlend = 0;
    world.sectionFlash = 2.4;
    if (onSection) onSection(currentSection(world));
  }
  if (world.sectionBlend < 1) {
    world.sectionBlend = Math.min(1, world.sectionBlend + dt / 1.5);
  }
  world.sectionFlash = Math.max(0, world.sectionFlash - dt);

  // The final stretch: the last leg of Ember Gorge runs denser and
  // faster, and gets its own banner the first time the raft enters it.
  if (!world.finalStretch && world.distance >= FINAL_STRETCH_AT) {
    world.finalStretch = true;
    world.finalFlash = 2.6;
  }
  world.finalFlash = Math.max(0, world.finalFlash - dt);

  spawnEntities(world, dt);
  spawnRings(world, dt);
  updateLeaves(world, dt);
  updateBankRows(world, dy);
  return world;
}

// --- rings ------------------------------------------------------------------

function spawnRings(world, dt) {
  world.ringTimer -= dt;
  if (world.ringTimer > 0) return;
  const rng = world.rng;
  world.ringTimer = RING_EVERY * range(rng, 0.85, 1.2);
  world.rings.push({
    x: riverX(world, rng, 70),
    y: -70,
    radius: RING_RADIUS,
    spin: rng() * Math.PI * 2,
  });
}

export function updateRings(world, dt) {
  for (const ring of world.rings) {
    ring.y += world.speed * dt;
    ring.spin += dt * 2;
  }
  world.rings = world.rings.filter((ring) => ring.y < VIEW_H + 80);
}

// A ring counts when its centre crosses the raft's height and the raft is
// inside the hoop. Returns the ring, or null.
export function findRingHit(world, raft) {
  for (const ring of world.rings) {
    if (Math.abs(ring.y - raft.y) < 26 && Math.abs(ring.x - raft.x) < ring.radius) {
      return ring;
    }
  }
  return null;
}

export function removeRing(world, ring) {
  const index = world.rings.indexOf(ring);
  if (index !== -1) world.rings.splice(index, 1);
}

// --- spawning ---------------------------------------------------------------

function riverX(world, rng, margin) {
  const half = riverHalfWidth(world) - margin;
  return RIVER_CENTER_X + range(rng, -half, half);
}

// Keep the river fair: never spawn a hazard within 110 px of another one
// that is still near the top of the screen.
function tooCloseToRecent(world, x, y) {
  for (const h of world.hazards) {
    if (h.y < y + 120 && Math.abs(h.x - x) < 110) return true;
  }
  return false;
}

function spawnEntities(world, dt) {
  const rng = world.rng;
  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;
  const section = currentSection(world);
  // The final stretch spawns 30% denser on top of the section scale.
  const stretchScale = world.finalStretch ? 1.3 : 1;
  const interval = Math.max(
    SPAWN_MIN,
    (SPAWN_EVERY - world.distance * 0.00045) / (section.spawnScale * stretchScale),
  );
  world.spawnTimer = interval * range(rng, 0.75, 1.25);

  const roll = rng();
  if (roll < 0.62) {
    spawnHazard(world);
  } else if (roll < 0.86) {
    spawnCoinLine(world);
  } else {
    spawnPowerup(world);
  }
}

function spawnHazard(world) {
  const rng = world.rng;
  const kinds = ['rock', 'rock', 'log', 'log', 'whirlpool'];
  const kind = pick(rng, kinds);
  const x = riverX(world, rng, 46);
  const y = -60;
  if (tooCloseToRecent(world, x, y)) return;
  const section = currentSection(world);
  if (kind === 'rock') {
    world.hazards.push({
      kind, x, y,
      radius: range(rng, 20, 30),
      seed: rng() * Math.PI * 2,
      drift: 0,
    });
  } else if (kind === 'log') {
    world.hazards.push({
      kind, x, y,
      radius: 20,
      length: range(rng, 74, 110),
      angle: range(rng, -0.35, 0.35),
      drift: range(rng, -46, 46) * section.speedScale,
      phase: rng() * Math.PI * 2,
    });
  } else {
    world.hazards.push({
      kind, x, y,
      radius: 27,
      spin: range(rng, 2.2, 3.4),
      pull: 260,
    });
  }
}

function spawnCoinLine(world) {
  const rng = world.rng;
  const x = riverX(world, rng, 60);
  const count = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i += 1) {
    world.pickups.push({
      kind: 'coin', x: x + Math.sin(i * 0.9) * 26, y: -40 - i * 44,
      radius: 14, bob: rng() * Math.PI * 2,
    });
  }
}

function spawnPowerup(world) {
  const rng = world.rng;
  const kind = pick(rng, ['heart', 'shield', 'star', 'heart', 'shield']);
  world.pickups.push({
    kind, x: riverX(world, rng, 56), y: -50,
    radius: 17, bob: rng() * Math.PI * 2,
  });
}

// --- decorations ------------------------------------------------------------

function updateLeaves(world, dt) {
  const rng = world.rng;
  if (world.leaves.length < 9 && rng() < dt * 6) {
    world.leaves.push({
      x: range(rng, RIVER_CENTER_X - 240, RIVER_CENTER_X + 240),
      y: -12,
      size: range(rng, 5, 9),
      spin: range(rng, -1.4, 1.4),
      angle: rng() * Math.PI * 2,
      hue: pick(rng, ['#7bc96f', '#a3d977', '#5dbb63', '#e8c95a']),
    });
  }
  for (const leaf of world.leaves) {
    leaf.y += world.speed * 0.92 * dt;
    leaf.x += Math.sin(world.time * 1.4 + leaf.angle) * 12 * dt;
    leaf.angle += leaf.spin * dt;
  }
  world.leaves = world.leaves.filter((leaf) => leaf.y < VIEW_H + 16);
}

// One row of bank decoration every 46 px of scroll, placed by the seed.
function updateBankRows(world, dy) {
  world.nextBankRow -= dy;
  const rng = world.rng;
  while (world.nextBankRow <= 0) {
    world.nextBankRow += 46;
    const side = rng() < 0.5 ? -1 : 1;
    const roll = rng();
    const kind = roll < 0.42 ? 'tree' : roll < 0.72 ? 'bush' : roll < 0.88 ? 'flower' : 'rock';
    const half = riverHalfWidth(world);
    const x = RIVER_CENTER_X + side * (half + 26 + rng() * (VIEW_W / 2 - half - 60));
    world.bankRows.push({ kind, x, y: -30, size: range(rng, 0.8, 1.3), sway: rng() * Math.PI * 2 });
  }
  for (const row of world.bankRows) row.y += dy;
  world.bankRows = world.bankRows.filter((row) => row.y < VIEW_H + 60);
}

export function sectionBonus() {
  return POINTS_PER_SECTION;
}
