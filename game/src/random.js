// Rapid Rush — seeded randomness.
// One tiny generator (mulberry32) drives every random choice in the game,
// so a fixed seed replays the exact same river. Live play seeds from the
// clock; screenshot states seed from the URL.

export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random number in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A random integer in [min, max].
export function intIn(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

// Pick one element of an array.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A stable hash of a string, for seeding a decoration from its row.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
