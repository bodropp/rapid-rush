// Rapid Rush — hazards: rocks, drifting logs and whirlpools.
// Each hazard moves down with the river; logs drift sideways, whirlpools
// spin and pull the raft toward them. Collisions are circles, so a hit
// always feels like the picture that caused it.

import { VIEW_H, RIVER_CENTER_X } from './config.js';
import { riverHalfWidth } from './world.js';

// Move every hazard down the river and apply its own behaviour.
// Returns nothing; hazards that leave the screen are dropped.
export function updateHazards(world, raft, dt) {
  for (const hazard of world.hazards) {
    hazard.y += world.speed * dt;
    if (hazard.kind === 'log') {
      hazard.x += hazard.drift * dt + Math.sin(world.time * 1.1 + hazard.phase) * 14 * dt;
      const half = riverHalfWidth(world);
      const minX = RIVER_CENTER_X - half + 50;
      const maxX = RIVER_CENTER_X + half - 50;
      if (hazard.x < minX) { hazard.x = minX; hazard.drift = Math.abs(hazard.drift); }
      if (hazard.x > maxX) { hazard.x = maxX; hazard.drift = -Math.abs(hazard.drift); }
    }
    if (hazard.kind === 'whirlpool') {
      // A whirlpool drags the raft toward its centre when it gets close.
      const dx = hazard.x - raft.x;
      const dy = hazard.y - raft.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 190 && dist > 4) {
        const pull = hazard.pull * (1 - dist / 190) * dt;
        raft.x += (dx / dist) * pull;
        raft.y += (dy / dist) * pull * 0.25;
      }
      hazard.spin += dt;
    }
  }
  world.hazards = world.hazards.filter((hazard) => hazard.y < VIEW_H + 90);
}

// Find the first hazard touching the raft. Returns it, or null.
export function findHazardHit(world, raft) {
  for (const hazard of world.hazards) {
    const dx = hazard.x - raft.x;
    const dy = hazard.y - raft.y;
    const reach = hazard.radius + 24;
    if (dx * dx + dy * dy < reach * reach) return hazard;
  }
  return null;
}

// Remove one hazard (a whirlpool that just spat the raft out, for example).
export function removeHazard(world, hazard) {
  const index = world.hazards.indexOf(hazard);
  if (index !== -1) world.hazards.splice(index, 1);
}
