// Rapid Rush — pickups: coins, hearts, shields and stars.
// Pickups drift down with the river, bob gently, and lean toward the raft
// when it comes close, so a near miss still feels rewarding.

import { VIEW_H } from './config.js';

// Move every pickup down the river and magnetise coins toward the raft.
export function updatePickups(world, raft, dt) {
  for (const pickup of world.pickups) {
    pickup.y += world.speed * dt;
    pickup.bob += dt * 3;
    if (pickup.kind === 'coin') {
      const dx = raft.x - pickup.x;
      const dy = raft.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 86 && dist > 1) {
        const pull = (1 - dist / 86) * 130 * dt;
        pickup.x += (dx / dist) * pull;
        pickup.y += (dy / dist) * pull;
      }
    }
  }
  world.pickups = world.pickups.filter((pickup) => pickup.y < VIEW_H + 40);
}

// Find the first pickup touching the raft. Returns it, or null.
export function findPickupHit(world, raft) {
  for (const pickup of world.pickups) {
    const dx = pickup.x - raft.x;
    const dy = pickup.y - raft.y;
    const reach = pickup.radius + 26;
    if (dx * dx + dy * dy < reach * reach) return pickup;
  }
  return null;
}

export function removePickup(world, pickup) {
  const index = world.pickups.indexOf(pickup);
  if (index !== -1) world.pickups.splice(index, 1);
}
