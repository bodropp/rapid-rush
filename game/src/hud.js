// Rapid Rush — the HUD and the menu screens: title, pause and game over.
// Everything is drawn on the same canvas, in big type that still reads
// when a screenshot is shrunk to a contact sheet.

import { VIEW_W, VIEW_H, HULL_MAX, COMBO_WINDOW, WIN_DISTANCE, FINAL_STRETCH_AT } from './config.js';
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

  // Combo meter: how hot the chain is, and how long it has left.
  if (game.combo >= 2) {
    const label = `COMBO ×${game.combo}`;
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 5;
    ctx.fillText(label, 14, 84);
    ctx.shadowBlur = 0;
    const barW = 110;
    ctx.fillStyle = 'rgba(12, 42, 54, 0.6)';
    ctx.beginPath();
    ctx.roundRect(14, 96, barW, 7, 3);
    ctx.fill();
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.roundRect(14, 96, barW * Math.max(0, game.comboTimer / COMBO_WINDOW), 7, 3);
    ctx.fill();
  }

  // Goal progress: how far to the falls at 1500 m, with section marks.
  const goalX = VIEW_W / 2 - 190;
  const goalW = 380;
  const goalY = VIEW_H - 22;
  ctx.fillStyle = 'rgba(12, 42, 54, 0.6)';
  ctx.beginPath();
  ctx.roundRect(goalX, goalY, goalW, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#06d6a0';
  ctx.beginPath();
  ctx.roundRect(goalX, goalY, goalW * Math.min(1, world.distance / WIN_DISTANCE), 9, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (const mark of [400, 900, FINAL_STRETCH_AT]) {
    const mx = goalX + (goalW * mark) / WIN_DISTANCE;
    ctx.fillRect(mx - 1, goalY - 2, 2, 13);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE FALLS — 1,500 m', VIEW_W / 2, goalY - 7);

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

  // Final-stretch banner: the gorge narrows and the falls are close.
  if (world.finalFlash > 0) {
    const alpha = Math.min(1, world.finalFlash);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('FINAL STRETCH!', VIEW_W / 2, 150);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('THE GORGE NARROWS — 300 m TO THE FALLS', VIEW_W / 2, 178);
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
  panel(ctx, VIEW_W / 2 - 300, 76, 600, 146, 0.88);
  bigTitle(ctx, 'RAPID RUSH', 124, 64, '#ffd23f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ride the river. Dodge the rocks. Grab the gold.', VIEW_W / 2, 174);
  ctx.fillText('How far can your raft go?', VIEW_W / 2, 200);

  // Controls.
  panel(ctx, VIEW_W / 2 - 300, 238, 600, 148, 0.8);
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
    const y = 268 + i * 30;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(keys, VIEW_W / 2 - 278, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(what, VIEW_W / 2 - 40, y);
  });

  // The new rules: combos, rings and the goal, in one gold strip.
  panel(ctx, VIEW_W / 2 - 300, 394, 600, 34, 0.9);
  ctx.fillStyle = '#ffb703';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ Chain coins for COMBO ×8  •  gold rings +200  •  reach 1,500 m to win! ★', VIEW_W / 2, 416);

  // Best score and the start prompt.
  if (game.best > 0) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BEST  ${game.best.toLocaleString('en-US')}`, VIEW_W / 2, 448);
  }
  // Dark pill behind the start prompt so it reads over bright water.
  panel(ctx, VIEW_W / 2 - 330, 458, 660, 40, 0.75);
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  bigTitle(ctx, 'PRESS ENTER OR CLICK TO START', 490, 24, '#ffffff');
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
  bigTitle(ctx, 'WRECKED!', 96, 60, '#ef476f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Your raft broke apart on the river.', VIEW_W / 2, 146);
  drawBreakdown(ctx, game);
  endPrompt(ctx, game, 'PRESS R OR CLICK TO RAFT AGAIN');
}

export function drawWin(ctx, game) {
  dim(ctx, 0.5);
  // Golden glow behind the conquest headline.
  const glow = ctx.createRadialGradient(VIEW_W / 2, 104, 10, VIEW_W / 2, 104, 300);
  glow.addColorStop(0, 'rgba(255, 210, 63, 0.30)');
  glow.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(VIEW_W / 2 - 300, 0, 600, 240);
  bigTitle(ctx, 'RIVER CONQUERED!', 96, 52, '#ffd23f');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('You rode 1,500 m through the gorge and beat the falls!', VIEW_W / 2, 146);
  drawBreakdown(ctx, game);
  endPrompt(ctx, game, 'PRESS R OR CLICK TO RAFT AGAIN');
}

function endPrompt(ctx, game, text) {
  if (game.newBest) {
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ NEW BEST SCORE! ★', VIEW_W / 2, 424);
  }
  // Dark pill behind the replay prompt so it reads over the scene.
  panel(ctx, VIEW_W / 2 - 300, 436, 600, 38, 0.7);
  const blink = 0.65 + 0.35 * Math.sin(game.world.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  bigTitle(ctx, text, 466, 22, '#ffffff');
  ctx.restore();
}

// The score breakdown, shared by the wreck and the win screens.
function drawBreakdown(ctx, game) {
  panel(ctx, VIEW_W / 2 - 230, 172, 460, 222, 0.88);
  const rows = [
    ['Distance', `${Math.floor(game.world.distance)} m`, `${game.breakdown.distance} pts`],
    ['Coins', `× ${game.coins}`, `${game.breakdown.coins} pts`],
    ['Golden rings', `× ${game.rings}`, `${game.breakdown.ringPoints} pts`],
    ['Sections reached', `${game.breakdown.sections}`, `${game.breakdown.sectionPoints} pts`],
    ['Best combo', `× ${game.maxCombo}`, ''],
  ];
  ctx.font = 'bold 16px sans-serif';
  rows.forEach(([label, value, points], i) => {
    const y = 200 + i * 30;
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
  if (game.breakdown.conquest > 0) {
    ctx.fillStyle = '#06d6a0';
    ctx.textAlign = 'left';
    ctx.fillText('Conquest bonus', VIEW_W / 2 - 208, 350);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'right';
    ctx.fillText(`${game.breakdown.conquest} pts`, VIEW_W / 2 + 208, 350);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(VIEW_W / 2 - 208, 362, 416, 2);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', VIEW_W / 2 - 208, 384);
  ctx.textAlign = 'right';
  ctx.fillText(Math.floor(game.score).toLocaleString('en-US'), VIEW_W / 2 + 208, 384);
}
