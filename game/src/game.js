// Rapid Rush — the game itself: state, scoring and one fixed step.
// main.js owns the loop and the screen; this module owns what a step of
// play does, so the loop, the tests and the screenshot simulations all
// play the exact same game.

import {
  HULL_MAX, POINTS_PER_METER, POINTS_PER_COIN, POINTS_PER_SECTION,
  PX_PER_METER, STAR_TIME, BEST_KEY, COMBO_WINDOW, COMBO_MAX,
  RING_POINTS, WIN_DISTANCE, CONQUEST_BONUS,
} from './config.js';
import { createWorld, updateWorld, currentSection, riverHalfWidth, sectionBonus, updateRings, findRingHit, removeRing } from './world.js';
import { createRaft, updateRaft, hitRaft, giveStar, giveShield, healRaft } from './raft.js';
import { updateHazards, findHazardHit, removeHazard } from './hazards.js';
import { updatePickups, findPickupHit, removePickup } from './pickups.js';
import {
  createParticles, updateParticles, splash, sparkle, debris, confetti,
  createFloaters, updateFloaters, addFloater,
} from './particles.js';
import {
  playCoin, playHeart, playShield, playStar, playCrash, playSection,
  playGameOver, playNewBest, playPaddle, playRing, playWin,
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
    floaters: createFloaters(),
    score: 0,
    coins: 0,
    rings: 0,
    combo: 0, // current chain of coin pickups
    comboTimer: 0, // seconds left before the chain expires
    maxCombo: 0, // best chain of this run
    breakdown: { distance: 0, coins: 0, sections: 0, sectionPoints: 0, rings: 0, ringPoints: 0, conquest: 0 },
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
  updateRings(world, dt);
  game.particles = updateParticles(game.particles, dt);
  game.floaters = updateFloaters(game.floaters, dt);

  // The combo chain ticks down; when it lapses the multiplier is lost.
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  // The river is conquered: 1500 m and the run ends in triumph.
  if (world.distance >= WIN_DISTANCE && game.mode === 'playing') {
    winGame(game);
    return;
  }

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
      game.shake = result === 'sunk' ? 1.6 : 1;
      // A crash breaks the combo chain.
      game.combo = 0;
      game.comboTimer = 0;
      debris(game.particles, raft.x, raft.y);
      addFloater(game.floaters, raft.x, raft.y - 44, 'HULL -1', '#ef476f');
      if (game.audio) playCrash(game.audio);
      if (hazard.kind === 'whirlpool') removeHazard(world, hazard);
      if (result === 'sunk') endGame(game);
    } else if (result === 'shield') {
      sparkle(game.particles, raft.x, raft.y, '#4cc9f0');
      if (game.audio) playShield(game.audio);
      removeHazard(world, hazard);
    }
  }

  // A golden ring: steer through the hoop for a flat bonus and a combo
  // bump — the chain timer refreshes, so rings keep a run alive.
  if (game.mode !== 'playing') return;
  const ring = findRingHit(world, raft);
  if (ring) {
    removeRing(world, ring);
    game.rings += 1;
    game.score += RING_POINTS;
    game.breakdown.rings += 1;
    game.breakdown.ringPoints += RING_POINTS;
    game.combo = Math.min(COMBO_MAX, game.combo + 1);
    game.comboTimer = COMBO_WINDOW;
    game.maxCombo = Math.max(game.maxCombo, game.combo);
    sparkle(game.particles, ring.x, ring.y, '#ffb703');
    sparkle(game.particles, ring.x, ring.y, '#fff3b0');
    addFloater(game.floaters, ring.x, ring.y - 30, `RING +${RING_POINTS}`, '#ffb703');
    if (game.audio) playRing(game.audio);
  }

  // Pickups.
  const pickup = findPickupHit(world, raft);
  if (pickup) {
    removePickup(world, pickup);
    const doubled = raft.star > 0;
    if (pickup.kind === 'coin') {
      // Chain the combo: each coin within the window raises the
      // multiplier, so a bold line of coins pays far more than one coin.
      game.combo = Math.min(COMBO_MAX, game.combo + 1);
      game.comboTimer = COMBO_WINDOW;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      const points = POINTS_PER_COIN * game.combo * (doubled ? 2 : 1);
      game.coins += 1;
      game.score += points;
      game.breakdown.coins += points;
      sparkle(game.particles, pickup.x, pickup.y, '#ffd23f');
      addFloater(
        game.floaters, pickup.x, pickup.y - 24,
        game.combo > 1 ? `+${points}  ×${game.combo}` : `+${points}`, '#ffd23f',
      );
      if (game.audio) playCoin(game.audio, doubled);
    } else if (pickup.kind === 'heart') {
      healRaft(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#ef476f');
      addFloater(game.floaters, pickup.x, pickup.y - 24, '+1 HULL', '#ef476f');
      if (game.audio) playHeart(game.audio);
    } else if (pickup.kind === 'shield') {
      giveShield(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#4cc9f0');
      addFloater(game.floaters, pickup.x, pickup.y - 24, 'SHIELD!', '#4cc9f0');
      if (game.audio) playShield(game.audio);
    } else if (pickup.kind === 'star') {
      giveStar(raft);
      sparkle(game.particles, pickup.x, pickup.y, '#ffb703');
      addFloater(game.floaters, pickup.x, pickup.y - 24, 'DOUBLE POINTS!', '#ffb703');
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

// The river is conquered: 1500 m down, the falls are beaten. Same
// breakdown as a wreck, plus the conquest bonus and a confetti storm.
export function winGame(game) {
  game.mode = 'won';
  game.breakdown.distance = Math.floor(game.world.distance + game.starBonusMeters);
  game.breakdown.conquest = CONQUEST_BONUS;
  game.score += CONQUEST_BONUS;
  const finalScore = Math.floor(game.score);
  if (finalScore > game.best) {
    game.best = finalScore;
    game.newBest = true;
    saveBest(game.best);
    if (game.audio) playNewBest(game.audio);
  }
  confetti(game.particles, game.raft.x, game.raft.y - 60);
  if (game.audio) playWin(game.audio);
}

export function sectionName(game) {
  return currentSection(game.world).name;
}

export { STAR_TIME, HULL_MAX };
