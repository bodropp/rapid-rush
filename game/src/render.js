// Rapid Rush — rendering: the whole scene is drawn procedurally on one
// 2D canvas. Sky, banks, river, raft, hazards, pickups and particles are
// all shapes and gradients; no image ever loads.

import { VIEW_W, VIEW_H, RIVER_CENTER_X } from './config.js';
import { worldPalette, riverHalfWidth, currentSection } from './world.js';
import { hashSeed, makeRng, range } from './random.js';

// Clouds live on a fixed seed so the sky is the same every load.
const CLOUDS = (() => {
  const rng = makeRng(hashSeed('rapid-rush-sky'));
  return Array.from({ length: 6 }, (_, i) => ({
    x: range(rng, 0, VIEW_W), y: range(rng, 26, 110),
    size: range(rng, 34, 74), speed: range(rng, 4, 10), index: i,
  }));
})();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeartShape(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -11, 0, -5);
  ctx.bezierCurveTo(6, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawStarShape(ctx, x, y, radius, color, rotation = -Math.PI / 2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// --- the whole scene ---------------------------------------------------------

export function drawScene(ctx, game) {
  const { world, raft, particles } = game;
  const palette = worldPalette(world);
  const half = riverHalfWidth(world);

  ctx.save();
  // Screen shake after a crash. The jitter is a sine of game time, not
  // Math.random, so a seeded run shakes the same way every time.
  if (game.shake > 0) {
    const mag = game.shake * 7;
    ctx.translate(Math.sin(world.time * 91.7) * mag, Math.cos(world.time * 113.3) * mag);
  }

  drawSky(ctx, palette, world.time);
  drawFarBank(ctx, palette, world);
  drawBanks(ctx, palette, world, half);
  drawRiver(ctx, palette, world, half);
  drawLeaves(ctx, world);
  drawBankDecorations(ctx, palette, world);
  drawPickups(ctx, world);
  drawHazards(ctx, world);
  drawRaft(ctx, game);
  drawParticles(ctx, particles);
  ctx.restore();
}

function drawSky(ctx, palette, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 190);
  gradient.addColorStop(0, palette.skyTop);
  gradient.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, 190);

  // Sun, top right.
  ctx.save();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(856, 62, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 243, 176, 0.35)';
  ctx.beginPath();
  ctx.arc(856, 62, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Drifting clouds.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  for (const cloud of CLOUDS) {
    const x = ((cloud.x + time * cloud.speed) % (VIEW_W + 160)) - 80;
    ctx.beginPath();
    ctx.arc(x, cloud.y, cloud.size * 0.45, 0, Math.PI * 2);
    ctx.arc(x + cloud.size * 0.4, cloud.y + 6, cloud.size * 0.36, 0, Math.PI * 2);
    ctx.arc(x - cloud.size * 0.42, cloud.y + 8, cloud.size * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarBank(ctx, palette, world) {
  // A distant treeline, scrolling at 0.4x for parallax.
  const offset = (world.scrolled * 0.4) % 64;
  ctx.fillStyle = palette.farBank;
  ctx.fillRect(0, 150, VIEW_W, 44);
  for (let x = -64; x < VIEW_W + 64; x += 64) {
    const h = 26 + (hashSeed(`tree${Math.floor((x + offset) / 64)}`) % 20);
    ctx.beginPath();
    ctx.arc(x + offset, 158, h * 0.7, Math.PI, 0);
    ctx.fill();
  }
  // The far bank's sandy edge.
  ctx.fillStyle = palette.bankEdge;
  ctx.fillRect(0, 186, VIEW_W, 8);
}

function drawBanks(ctx, palette, world, half) {
  const leftEdge = RIVER_CENTER_X - half;
  const rightEdge = RIVER_CENTER_X + half;
  ctx.fillStyle = palette.bank;
  ctx.fillRect(0, 194, leftEdge, VIEW_H - 194);
  ctx.fillRect(rightEdge, 194, VIEW_W - rightEdge, VIEW_H - 194);

  // Grass tufts scrolling with the river.
  const offset = world.scrolled % 52;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let y = 194 - offset; y < VIEW_H + 52; y += 52) {
    for (let x = 14; x < leftEdge - 10; x += 46) {
      ctx.fillRect(x + ((y * 7) % 20), y, 10, 4);
    }
    for (let x = rightEdge + 16; x < VIEW_W - 10; x += 46) {
      ctx.fillRect(x + ((y * 11) % 20), y, 10, 4);
    }
  }

  // Sandy rims where the bank meets the water.
  ctx.fillStyle = palette.bankEdge;
  ctx.fillRect(leftEdge - 8, 194, 8, VIEW_H - 194);
  ctx.fillRect(rightEdge, 194, 8, VIEW_H - 194);
}

function drawRiver(ctx, palette, world, half) {
  const leftEdge = RIVER_CENTER_X - half;
  const rightEdge = RIVER_CENTER_X + half;
  const gradient = ctx.createLinearGradient(leftEdge, 0, rightEdge, 0);
  gradient.addColorStop(0, palette.waterDeep);
  gradient.addColorStop(0.5, palette.water);
  gradient.addColorStop(1, palette.waterDeep);
  ctx.fillStyle = gradient;
  ctx.fillRect(leftEdge, 194, rightEdge - leftEdge, VIEW_H - 194);

  // Moving wave lines.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  const offset = world.scrolled % 90;
  for (let row = 0; row < 5; row += 1) {
    const y = 224 + row * 72 - offset * (0.6 + row * 0.08);
    const yy = y < 194 ? y + 360 : y;
    if (yy > VIEW_H) continue;
    ctx.beginPath();
    for (let x = leftEdge + 12; x <= rightEdge - 12; x += 12) {
      const wave = Math.sin(x * 0.05 + world.time * 2 + row * 1.7) * 4;
      if (x === leftEdge + 12) ctx.moveTo(x, yy + wave);
      else ctx.lineTo(x, yy + wave);
    }
    ctx.stroke();
  }

  // Foam licking the banks.
  ctx.fillStyle = palette.foam;
  ctx.globalAlpha = 0.75;
  for (let y = 200 - (world.scrolled % 34); y < VIEW_H; y += 34) {
    ctx.beginPath();
    ctx.arc(leftEdge + 6, y, 5, 0, Math.PI * 2);
    ctx.arc(rightEdge - 6, y + 17, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLeaves(ctx, world) {
  for (const leaf of world.leaves) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.angle);
    ctx.fillStyle = leaf.hue;
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBankDecorations(ctx, palette, world) {
  for (const row of world.bankRows) {
    const sway = Math.sin(world.time * 1.6 + row.sway) * 2;
    ctx.save();
    ctx.translate(row.x + sway, row.y);
    ctx.scale(row.size, row.size);
    if (row.kind === 'tree') {
      ctx.fillStyle = '#8a5a33';
      ctx.fillRect(-3, 0, 6, 16);
      ctx.fillStyle = palette.farBank;
      ctx.beginPath();
      ctx.arc(0, -8, 16, 0, Math.PI * 2);
      ctx.arc(-11, 0, 10, 0, Math.PI * 2);
      ctx.arc(11, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(-5, -12, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (row.kind === 'bush') {
      ctx.fillStyle = palette.farBank;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.arc(-9, 3, 7, 0, Math.PI * 2);
      ctx.arc(9, 3, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (row.kind === 'flower') {
      ctx.strokeStyle = palette.farBank;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -10);
      ctx.stroke();
      ctx.fillStyle = '#ff8fab';
      for (let i = 0; i < 5; i += 1) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 5, -12 + Math.sin(a) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, -12, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = palette.cliff;
      ctx.beginPath();
      ctx.arc(0, 0, 9, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- entities ----------------------------------------------------------------

function drawPickups(ctx, world) {
  for (const pickup of world.pickups) {
    const bob = Math.sin(pickup.bob) * 3;
    const y = pickup.y + bob;
    ctx.save();
    ctx.translate(pickup.x, y);
    if (pickup.kind === 'coin') {
      ctx.fillStyle = '#e9a800';
      ctx.beginPath();
      ctx.arc(0, 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(-3, -3, 6, 0, Math.PI * 2);
      ctx.fill();
      drawStarShape(ctx, 1, 1, 6, '#e9a800');
    } else if (pickup.kind === 'heart') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      drawHeartShape(ctx, 0, 2, 22, '#ef476f');
    } else if (pickup.kind === 'shield') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4361ee';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(11, -8);
      ctx.lineTo(11, 2);
      ctx.quadraticCurveTo(11, 11, 0, 15);
      ctx.quadraticCurveTo(-11, 11, -11, 2);
      ctx.lineTo(-11, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 1);
    } else if (pickup.kind === 'star') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      drawStarShape(ctx, 0, 0, 14, '#ffb703');
      drawStarShape(ctx, 0, 0, 6, '#fff3b0');
    }
    ctx.restore();
  }
}

function drawHazards(ctx, world) {
  for (const hazard of world.hazards) {
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    if (hazard.kind === 'rock') {
      // Foam ring where the rock breaks the water.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, hazard.radius * 0.7, hazard.radius + 6, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      // A craggy polygon from the rock's own seed.
      const rng = makeRng(Math.floor(hazard.seed * 100000));
      ctx.fillStyle = '#7d8597';
      ctx.beginPath();
      const points = 7;
      for (let i = 0; i < points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const r = hazard.radius * (0.78 + rng() * 0.4);
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r * 0.85;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(-hazard.radius * 0.3, -hazard.radius * 0.35, hazard.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (hazard.kind === 'log') {
      ctx.rotate(hazard.angle);
      ctx.fillStyle = '#8a5a33';
      roundRect(ctx, -hazard.length / 2, -11, hazard.length, 22, 10);
      ctx.fill();
      ctx.fillStyle = '#a4713e';
      roundRect(ctx, -hazard.length / 2 + 4, -8, hazard.length - 8, 16, 8);
      ctx.fill();
      ctx.strokeStyle = '#6f4525';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-hazard.length / 2 + 8, 0, 7, 0, Math.PI * 2);
      ctx.arc(hazard.length / 2 - 8, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(-hazard.length / 2 + 16, -5);
      ctx.lineTo(hazard.length / 2 - 16, -5);
      ctx.stroke();
    } else {
      // Whirlpool: spinning concentric arcs over a dark pit.
      ctx.fillStyle = '#0a4d4a';
      ctx.beginPath();
      ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dff6ff';
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 3; ring += 1) {
        const r = hazard.radius - ring * 8;
        const start = hazard.spin * (2 + ring * 0.6) + ring * 1.9;
        ctx.beginPath();
        ctx.arc(0, 0, r, start, start + Math.PI * 1.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawRaft(ctx, game) {
  const { raft, world } = game;
  ctx.save();
  ctx.translate(raft.x, raft.y + Math.sin(world.time * 3.1) * 2);

  // Star power: a golden halo. Shield: a blue ring.
  if (raft.star > 0) {
    ctx.fillStyle = `rgba(255, 183, 3, ${0.25 + 0.12 * Math.sin(world.time * 9)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  if (raft.shield) {
    ctx.strokeStyle = 'rgba(67, 97, 238, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Blink while invulnerable (but not while the star shines).
  if (raft.invuln > 0 && raft.star <= 0) {
    ctx.globalAlpha = 0.5 + 0.35 * Math.sin(world.time * 26);
  }

  ctx.rotate(raft.tilt);

  // The paddle, sweeping on one side while a stroke runs.
  if (raft.paddle > 0) {
    const side = raft.paddleSide;
    const sweep = Math.sin(raft.paddleAnim * Math.PI) * 0.9;
    ctx.save();
    ctx.translate(side * 30, 6);
    ctx.rotate(side * (0.6 + sweep));
    ctx.strokeStyle = '#8a5a33';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 26);
    ctx.stroke();
    ctx.fillStyle = '#a4713e';
    ctx.beginPath();
    ctx.ellipse(0, 32, 6, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Five logs, then two cross planks, then the little flag.
  const wood = ['#b07a45', '#a06c3a', '#b07a45', '#a06c3a', '#b07a45'];
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = wood[i];
    roundRect(ctx, -34, -20 + i * 9, 68, 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(-34, -20 + i * 9 + 6, 68, 2);
  }
  ctx.fillStyle = '#8a5a33';
  roundRect(ctx, -24, -24, 9, 48, 3);
  ctx.fill();
  roundRect(ctx, 15, -24, 9, 48, 3);
  ctx.fill();
  // Flag on a pole at the back.
  ctx.strokeStyle = '#6f4525';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -22);
  ctx.lineTo(-26, -44);
  ctx.stroke();
  const wave = Math.sin(world.time * 8) * 3;
  ctx.fillStyle = '#ef476f';
  ctx.beginPath();
  ctx.moveTo(-26, -44);
  ctx.lineTo(-8, -39 + wave);
  ctx.lineTo(-26, -34);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
