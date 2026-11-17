// Rapid Rush — the main loop: canvas setup, the frame, and the screens.
// The game state lives in game.js; this file only runs it, draws it and
// moves between title, play, pause and game over.

import { VIEW_W, VIEW_H } from './config.js';
import { createGame, startGame, stepGame } from './game.js';
import { createInput } from './input.js';
import { createAudio, playClick } from './audio.js';
import { drawScene } from './render.js';
import { drawHud, drawTitle, drawPaused, drawGameOver, drawWin } from './hud.js';
import { parseShot, buildShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = createAudio();
const input = createInput(canvas);

let game = createGame(Math.floor(Math.random() * 1e9));
game.audio = audio;

let shot = null;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  const width = Math.floor(VIEW_W * scale);
  const height = Math.floor(VIEW_H * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScene(ctx, game);
  if (game.mode === 'playing' || game.mode === 'paused') {
    drawHud(ctx, game);
  }
  if (game.mode === 'title') drawTitle(ctx, game);
  if (game.mode === 'paused') drawPaused(ctx);
  if (game.mode === 'over') drawGameOver(ctx, game);
  if (game.mode === 'won') drawWin(ctx, game);
}

function beginPlay() {
  audio.start();
  audio.resume();
  playClick(audio);
  startGame(game, Math.floor(Math.random() * 1e9));
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (game.mode === 'playing') {
    stepGame(game, input, dt);
    if (input.pausePressed) game.mode = 'paused';
    else if (input.restartPressed) beginPlay();
  } else if (game.mode === 'paused') {
    if (input.pausePressed || input.startPressed) game.mode = 'playing';
    else if (input.restartPressed) beginPlay();
  } else if (game.mode === 'title') {
    // The title river drifts behind the logo.
    game.world.time += dt;
    game.world.scrolled += 40 * dt;
    if (input.startPressed || input.anyPressed) beginPlay();
  } else if (game.mode === 'over' || game.mode === 'won') {
    if (input.restartPressed || input.anyPressed) beginPlay();
  }

  input.consumePresses();
  render();
  requestAnimationFrame(frame);
}

function start() {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  shot = parseShot();
  if (shot) {
    // Screenshot mode: one deterministic frame, no loop, no audio.
    game = buildShot(shot.shot, shot.seed);
    game.audio = null;
    render();
    document.title = `Rapid Rush — ${shot.shot}`;
    return;
  }

  requestAnimationFrame(frame);
}

start();
