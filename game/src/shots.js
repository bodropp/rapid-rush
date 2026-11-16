// Rapid Rush — screenshot states: ?shot=start|play|end&seed=N.
// Each state is built by running the game's own step function with a
// fixed seed and scripted steering, so repeated loads look the same.
// The states exist only for screenshots; live play never uses them.

import { VIEW_W } from './config.js';
import { createGame, startGame, stepGame, endGame } from './game.js';
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
  // end: a real run, then the wreck, with the true score breakdown.
  const game = createGame(seed, 1250);
  game.audio = null;
  startGame(game, seed);
  simulate(game, 16);
  if (game.mode !== 'over') {
    game.raft.hull = 0;
    endGame(game);
  }
  return game;
}

export { VIEW_W };
