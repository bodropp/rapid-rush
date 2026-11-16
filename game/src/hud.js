// Rapid Rush — the HUD and the menu screens: title, pause and game over.
// Everything is drawn on the same canvas, in big type that still reads
// when a screenshot is shrunk to a contact sheet.

import { VIEW_W, VIEW_H, HULL_MAX } from './config.js';
import { currentSection } from './world.js';

function panel(ctx, x, y, w, h, alpha = 0.82) {
  ctx.fillStyle = `rgba(12, 42, 54, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
}

function heartIcon(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ef476f' : 'rgba(255, 255, 255, 0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, game) {
  const { raft, world, score, coins } = game;
  const section = currentSection(world);

  // Top bar.
  panel(ctx, 12, 10, VIEW_W - 24, 52, 0.72);

  // Hearts, top left.
  for (let i = 0; i < HULL_MAX; i += 1) {
    heartIcon(ctx, 40 + i * 30, 36, 20, i < raft.hull);
  }
  if (raft.shield) {
    ctx.fillStyle = '#4cc9f0';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡 SHIELD', 128, 37);
  }

  // Score, big and centred.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.floor(score)).padStart(6, '0'), VIEW_W / 2, 30);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(section.name.toUpperCase(), VIEW_W / 2, 52);

  // Coins, distance and speed, top right.
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(VIEW_W - 268, 36, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0c2a36';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', VIEW_W - 268, 37);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`× ${coins}`, VIEW_W - 252, 37);
  ctx.fillText(`${Math.floor(world.distance)} m`, VIEW_W - 196, 37);
  ctx.fillStyle = '#9be7ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${Math.round(world.speed * 0.36)} km/h`, VIEW_W - 118, 37);

  // Star timer bar, under the top bar.
  if (raft.star > 0) {
    const w = 180;
    ctx.fillStyle = 'rgba(12, 42, 54, 0.6)';
    ctx.beginPath();
    ctx.roundRect(VIEW_W / 2 - w / 2, 70, w, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.roundRect(VIEW_W / 2 - w / 2, 70, w * (raft.star / 6), 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText('★ DOUBLE POINTS ★', VIEW_W / 2, 90);
    ctx.shadowBlur = 0;
  }

  // Section banner when a new stretch begins.
  if (world.sectionFlash > 0) {
    const alpha = Math.min(1, world.sectionFlash);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText(section.name, VIEW_W / 2, 150);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`+250  •  THE CURRENT RUNS FASTER`, VIEW_W / 2, 178);
    ctx.restore();
  }
}

// --- screens ----------------------------------------------------------------

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 30, 42, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function bigTitle(ctx, text, y, size, color) {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.shadowBlur = 0;
}

export function drawTitle(ctx, game) {
  dim(ctx, 0.45);
  // Logo panel.
  panel(ctx, VIEW_W / 2 - 300, 84, 600, 150, 0.88);
  bigTitle(ctx, 'RAPID RUSH', 132, 64, '#ffd23f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ride the river. Dodge the rocks. Grab the gold.', VIEW_W / 2, 182);
  ctx.fillText('How far can your raft go?', VIEW_W / 2, 208);

  // Controls.
  panel(ctx, VIEW_W / 2 - 300, 252, 600, 148, 0.8);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    ['← →  or  A / D', 'steer the raft'],
    ['Mouse move', 'steer by pointing'],
    ['SPACE  or  hold click', 'paddle — a burst of speed'],
    ['P', 'pause      •      R  restart'],
  ];
  lines.forEach(([keys, what], i) => {
    const y = 282 + i * 30;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(keys, VIEW_W / 2 - 278, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(what, VIEW_W / 2 - 40, y);
  });

  // Best score and the start prompt.
  if (game.best > 0) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BEST  ${game.best.toLocaleString('en-US')}`, VIEW_W / 2, 428);
  }
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  bigTitle(ctx, 'PRESS ENTER OR CLICK TO START', 472, 24, '#ffffff');
  ctx.restore();
}

export function drawPaused(ctx) {
  dim(ctx, 0.5);
  bigTitle(ctx, 'PAUSED', 240, 56, '#ffffff');
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press P to keep rafting', VIEW_W / 2, 300);
}

export function drawGameOver(ctx, game) {
  dim(ctx, 0.62);
  bigTitle(ctx, 'WRECKED!', 108, 60, '#ef476f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Your raft broke apart on the river.', VIEW_W / 2, 158);

  // Score breakdown.
  panel(ctx, VIEW_W / 2 - 230, 186, 460, 168, 0.88);
  const rows = [
    ['Distance', `${Math.floor(game.world.distance)} m`, `${game.breakdown.distance} pts`],
    ['Coins', `× ${game.coins}`, `${game.breakdown.coins} pts`],
    ['Sections reached', `${game.breakdown.sections}`, `${game.breakdown.sectionPoints} pts`],
  ];
  ctx.font = 'bold 16px sans-serif';
  rows.forEach(([label, value, points], i) => {
    const y = 216 + i * 34;
    ctx.fillStyle = '#9be7ff';
    ctx.textAlign = 'left';
    ctx.fillText(label, VIEW_W / 2 - 208, y);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(value, VIEW_W / 2 + 10, y);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'right';
    ctx.fillText(points, VIEW_W / 2 + 208, y);
  });
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(VIEW_W / 2 - 208, 306, 416, 2);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', VIEW_W / 2 - 208, 334);
  ctx.textAlign = 'right';
  ctx.fillText(Math.floor(game.score).toLocaleString('en-US'), VIEW_W / 2 + 208, 334);

  if (game.newBest) {
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ NEW BEST SCORE! ★', VIEW_W / 2, 384);
  }

  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  bigTitle(ctx, 'PRESS R OR CLICK TO RAFT AGAIN', 436, 22, '#ffffff');
  ctx.restore();
}
