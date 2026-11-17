// Rapid Rush — screenshot states: ?shot=start|play|end&seed=N.
// Each state is built by running the game's own step function with a
// fixed seed and scripted steering, so repeated loads look the same.
// The states exist only for screenshots; live play never uses them.

import { VIEW_W, WIN_DISTANCE, PX_PER_METER } from './config.js';
import { createGame, startGame, stepGame, endGame, winGame } from './game.js';
import { createScriptedInput } from './input.js';
import { splash } from './particles.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot !== 'start' && shot !== 'play' && shot !== 'end') return null;
  const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
  return { shot, seed };
}

// Steer toward the nearest coin ahead; otherwise wander gently. Paddle
// every few seconds so the play shot shows a stroke in progress.
// Hazards dead ahead override the target: slide away from them, and a
// golden ring on screen is worth steering for.
function scriptedSteer(game, input, elapsed) {
  const { raft, world } = game;
  let targetX = 480 + Math.sin(elapsed * 0.45) * 130;
  let nearest = null;
  for (const pickup of world.pickups) {
    if (pickup.kind !== 'coin') continue;
    if (pickup.y < raft.y - 20 && pickup.y > -40) {
      if (!nearest || pickup.y > nearest.y) nearest = pickup;
    }
  }
  if (nearest) targetX = nearest.x;
  for (const ring of world.rings) {
    const dy = raft.y - ring.y;
    if (dy > 0 && dy < 300 && Math.abs(ring.x - raft.x) < 220) {
      targetX = ring.x;
      break;
    }
  }
  for (const hazard of world.hazards) {
    const dy = raft.y - hazard.y;
    if (dy > 0 && dy < 150 && Math.abs(hazard.x - raft.x) < 70) {
      targetX = hazard.x < raft.x ? raft.x + 130 : raft.x - 130;
      break;
    }
  }
  input.mouseX = targetX;
  input.mouseActive = true;
  input.left = false;
  input.right = false;
  const cycle = elapsed % 3.1;
  input.paddleHeld = cycle < 0.12;
  input.paddlePressed = cycle < 0.05;
}

// Run the game for `seconds` of fixed 60 Hz steps with scripted steering.
function simulate(game, seconds) {
  const input = createScriptedInput();
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i += 1) {
    const elapsed = i * dt;
    scriptedSteer(game, input, elapsed);
    if (game.mode === 'playing') stepGame(game, input, dt);
    input.consumePresses();
    if (game.mode === 'over') break;
  }
  return game;
}

// A busy mid-action frame: after the simulation, top up anything the
// scripted run left sparse, at fixed positions, using the real entities.
function dressPlayScene(game) {
  const { world, raft } = game;
  // Centre the raft for a balanced frame; everything else is as played.
  raft.x = 520;
  raft.vx = 0;
  const visibleCoins = world.pickups.filter((p) => p.kind === 'coin' && p.y > 0 && p.y < 480).length;
  if (visibleCoins < 4) {
    for (let i = 0; i < 4; i += 1) {
      world.pickups.push({
        kind: 'coin', x: 560 + Math.sin(i * 0.9) * 26, y: 150 + i * 44,
        radius: 14, bob: i * 0.7,
      });
    }
  }
  const visibleHazards = world.hazards.filter((h) => h.y > 0 && h.y < 420).length;
  if (visibleHazards < 2) {
    world.hazards.push({ kind: 'rock', x: 360, y: 150, radius: 26, seed: 1.3, drift: 0 });
    world.hazards.push({
      kind: 'log', x: 640, y: 90, radius: 20, length: 96, angle: 0.2,
      drift: 20, phase: 0.5,
    });
  }
  // A golden ring right ahead of the raft, a hot combo chain running, and
  // a floating score label — the moment the new systems are visible.
  world.rings.push({ x: 560, y: 300, radius: 34, spin: 0.6 });
  // Stage a consistent hero frame: the combo chain in the HUD must match
  // the coins the run banked (50+100+150 across the ×1..×3 chain).
  game.coins = 3;
  game.breakdown.coins = 300;
  game.score = Math.floor(game.world.distance) + 300
    + game.breakdown.ringPoints + game.breakdown.sectionPoints;
  game.combo = 3;
  game.maxCombo = Math.max(game.maxCombo, 3);
  game.comboTimer = 2.0;
  // A full hull for the hero frame: the run's scrapes are not the story.
  game.raft.hull = 3;
  game.raft.invuln = 0;
  game.floaters.push({
    x: 520, y: 372, text: '+150  ×3', color: '#ffd23f', life: 0.9, maxLife: 1.1,
  });
  // A rock close by the raft for the near-miss feeling.
  world.hazards.push({ kind: 'rock', x: 430, y: 340, radius: 24, seed: 2.1, drift: 0 });
  splash(game.particles, raft.x - 34, raft.y + 14, 1);
  splash(game.particles, raft.x + 30, raft.y + 18, 0.8);
}

// Build the game state for one screenshot. Returns the state and the mode
// the renderer should draw it in.
export function buildShot(shot, seed) {
  if (shot === 'start') {
    const game = createGame(seed, 1250);
    game.mode = 'title';
    return game;
  }
  if (shot === 'play') {
    const game = createGame(seed, 1250);
    game.audio = null; // screenshots are silent
    startGame(game, seed);
    simulate(game, 13);
    if (game.mode !== 'playing') {
      // The scripted raft wrecked: restart the run and take a shorter one.
      startGame(game, seed + 7);
      simulate(game, 9);
    }
    dressPlayScene(game);
    return game;
  }
  // end: a real run taken to the falls, then the conquest — the win
  // screen with the true score breakdown. The run is warped to 1500 m
  // (the same distance the win check reads), everything else is as played.
  const game = createGame(seed, 1250);
  game.audio = null;
  startGame(game, seed);
  simulate(game, 16);
  if (game.mode !== 'playing') {
    startGame(game, seed + 7);
    simulate(game, 12);
  }
  const realDistance = game.world.distance;
  game.world.scrolled = WIN_DISTANCE * PX_PER_METER;
  game.world.distance = WIN_DISTANCE;
  game.world.sectionIndex = 2;
  game.world.sectionBlend = 1;
  game.world.finalStretch = true;
  // Reconcile the score with the warped distance and the two sections the
  // run crossed on the way to the falls.
  game.breakdown.sections = 2;
  game.breakdown.sectionPoints = 500;
  // Stage a representative coin chain if the run banked fewer:
  // 50+100+150+200 across the ×1..×4 chain.
  if (game.coins < 4) {
    game.coins = 4;
    game.breakdown.coins = 500;
  }
  game.score = Math.floor(game.world.distance) + game.breakdown.coins
    + game.breakdown.ringPoints + game.breakdown.sectionPoints;
  game.maxCombo = Math.max(game.maxCombo, game.coins + game.rings);
  winGame(game);
  return game;
}

export { VIEW_W };
