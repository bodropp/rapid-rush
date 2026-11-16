// Rapid Rush — the game itself: state, scoring and one fixed step.
// main.js owns the loop and the screen; this module owns what a step of
// play does, so the loop, the tests and the screenshot simulations all
// play the exact same game.

import {
  HULL_MAX, POINTS_PER_METER, POINTS_PER_COIN, POINTS_PER_SECTION,
  PX_PER_METER, STAR_TIME, BEST_KEY,
} from './config.js';
import { createWorld, updateWorld, currentSection, riverHalfWidth, sectionBonus } from './world.js';
import { createRaft, updateRaft, hitRaft, giveStar, giveShield, healRaft } from './raft.js';
import { updateHazards, findHazardHit, removeHazard } from './hazards.js';
import { updatePickups, findPickupHit, removePickup } from './pickups.js';
import {
  createParticles, updateParticles, splash, sparkle, debris,
} from './particles.js';
import {
  playCoin, playHeart, playShield, playStar, playCrash, playSection,
  playGameOver, playNewBest, playPaddle,
} from './audio.js';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode or headless: the best score simply does not persist.
  }
}

export function createGame(seed, best) {
  const world = createWorld(seed);
  return {
    seed,
    mode: 'title', // title | playing | paused | over
    world,
    raft: createRaft(),
    particles: createParticles(world.rng),
    score: 0,
    coins: 0,
    breakdown: { distance: 0, coins: 0, sections: 0, sectionPoints: 0 },
    starBonusMeters: 0,
    shake: 0,
    best: best ?? loadBest(),
    newBest: false,
    audio: null,
    time: 0,
  };
}

export function startGame(game, seed) {
  const fresh = createGame(seed ?? Math.floor(Math.random() * 1e9), game.best);
  fresh.audio = game.audio;
  fresh.mode = 'playing';
  Object.assign(game, fresh);
}

// One fixed step of play. Input is the shared input state; audio may be
// null in screenshot mode. Returns nothing; the state carries the result.
export function stepGame(game, input, dt) {
  const { world, raft } = game;
  game.time += dt;
  game.shake = Math.max(0, game.shake - dt * 2.2);

  updateWorld(world, raft, dt, (section) => {
    game.breakdown.sections += 1;
    game.breakdown.sectionPoints += sectionBonus();
    game.score += POINTS_PER_SECTION;
    if (game.audio) playSection(game.audio);
  });

  updateRaft(raft, input, dt, riverHalfWidth(world), game.audio, playPaddle);
  updateHazards(world, raft, dt);
  updatePickups(world, raft, dt);
  game.particles = updateParticles(game.particles, dt);

  // Paddle splashes trail the raft while a stroke runs.
  if (raft.paddle > 0 && world.rng() < dt * 22) {
    splash(game.particles, raft.x + raft.paddleSide * 34, raft.y + 14, 0.7);
  }

  // Distance points, doubled while the star shines.
  const meters = (world.speed * dt) / PX_PER_METER;
  const gained = meters * POINTS_PER_METER;
  if (raft.star > 0) game.starBonusMeters += meters;
  game.score += gained;
  game.breakdown.distance = Math.floor(world.distance + game.starBonusMeters);

  // A hazard hit: shield, star or mercy may eat it; otherwise a hull point.
  const hazard = findHazardHit(world, raft);
  if (hazard) {
    const result = hitRaft(raft);
    if (result === 'hit' || result === 'sunk') {
      game.shake = 1;
      debris(game.particles, raft.x, raft.y);
      if (game.audio) playCrash(game.audio);
      if (hazard.kind === 'whirlpool') removeHazard(world, hazard);
      if (result === 'sunk') endGame(game);
    } else if (result === 'shield') {
      sparkle(game.particles, raft.x, raft.y, '#4cc9f0');
      if (game.audio) playShield(game.audio);
      removeHazard(world, hazard);
    }
  }

  // Pickups.
  const pickup = findPickupHit(world, raft);
  if (pickup) {
    removePickup(world, pickup);
    const doubled = raft.star > 0;
    if (pickup.kind === 'coin') {
      const points = POINTS_PER_COIN * (doubled ? 2 : 1);
      game.coins += 1;
      game.score += points;
      game.breakdown.coins += points;
      sparkle(game.particles, pickup.x, pickup.y, '#ffd23f');
      if (game.audio) playCoin(game.audio, doubled);
    } else if (pickup.kind === 'heart') {
      healRaft(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#ef476f');
      if (game.audio) playHeart(game.audio);
    } else if (pickup.kind === 'shield') {
      giveShield(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#4cc9f0');
      if (game.audio) playShield(game.audio);
    } else if (pickup.kind === 'star') {
      giveStar(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#ffb703');
      if (game.audio) playStar(game.audio);
    }
  }

  // The score stays a float while playing; only the displays floor it.
  // (Flooring every step would throw away the fractional distance points.)
}

// The raft is wrecked: freeze the run, work out the best score, jingle.
export function endGame(game) {
  game.mode = 'over';
  game.breakdown.distance = Math.floor(game.world.distance + game.starBonusMeters);
  const finalScore = Math.floor(game.score);
  if (finalScore > game.best) {
    game.best = finalScore;
    game.newBest = true;
    saveBest(game.best);
    if (game.audio) playNewBest(game.audio);
  }
  if (game.audio) playGameOver(game.audio);
}

export function sectionName(game) {
  return currentSection(game.world).name;
}

export { STAR_TIME, HULL_MAX };
