// Rapid Rush — particles: splashes, sparks, leaves' wakes and crash debris.
// Particles are pure feedback: they carry no gameplay, only the feeling
// that the river answers every move.

import { VIEW_H } from './config.js';

export function createParticles(rng) {
  const list = [];
  // The particle stream draws from the world's seeded generator, so a
  // fixed seed replays the exact same splashes and sparks.
  list.rng = rng ?? Math.random;
  return list;
}

function randomOf(particles) {
  return typeof particles.rng === 'function' ? particles.rng : Math.random;
}

export function burst(particles, x, y, options) {
  const rng = randomOf(particles);
  const { count = 10, color = '#ffffff', speed = 120, size = 4, life = 0.6, gravity = 0 } = options;
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const velocity = speed * (0.35 + rng() * 0.65);
    particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - speed * 0.25,
      size: size * (0.6 + rng() * 0.8),
      life: life * (0.6 + rng() * 0.7),
      maxLife: life,
      color,
      gravity,
    });
  }
}

export function splash(particles, x, y, strength = 1) {
  burst(particles, x, y, {
    count: Math.round(8 * strength), color: '#dff6ff', speed: 130 * strength,
    size: 3.5, life: 0.5, gravity: 260,
  });
}

export function sparkle(particles, x, y, color) {
  burst(particles, x, y, { count: 12, color, speed: 90, size: 3, life: 0.55 });
}

export function debris(particles, x, y) {
  burst(particles, x, y, { count: 22, color: '#b07a45', speed: 190, size: 5, life: 0.8, gravity: 320 });
  burst(particles, x, y, { count: 12, color: '#ffffff', speed: 150, size: 4, life: 0.6, gravity: 200 });
}

export function confetti(particles, x, y) {
  const colors = ['#ffd23f', '#ef476f', '#4cc9f0', '#06d6a0', '#ffb703', '#ffffff'];
  for (const color of colors) {
    burst(particles, x, y, { count: 14, color, speed: 240, size: 5, life: 1.4, gravity: 160 });
  }
}

// --- floating score text ----------------------------------------------------
// Floaters are separate from particles: short text labels that rise and
// fade above the action ("+150 ×3", "RING +200"). They carry no gameplay.

export function createFloaters() {
  return [];
}

export function addFloater(floaters, x, y, text, color) {
  floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

export function updateFloaters(floaters, dt) {
  for (const floater of floaters) {
    floater.y -= 42 * dt;
    floater.life -= dt;
  }
  return floaters.filter((floater) => floater.life > 0);
}

export function updateParticles(particles, dt) {
  for (const p of particles) {
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  const alive = particles.filter((p) => p.life > 0 && p.y < VIEW_H + 20);
  alive.rng = particles.rng; // keep the seeded stream across the new array
  return alive;
}
