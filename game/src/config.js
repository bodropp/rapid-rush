// Rapid Rush — configuration: view size, tuning, sections and palettes.
// Every number the game balances on lives here, so tuning never means
// hunting through gameplay code.

export const VIEW_W = 960;
export const VIEW_H = 540;

// The raft's fixed vertical home (the lower third of the screen).
export const RAFT_Y = 418;
export const RAFT_RADIUS = 26;
export const RAFT_HALF_WIDTH = 34;

// River geometry (logical pixels). The river narrows as the run gets harder.
export const RIVER_CENTER_X = 480;

// Hull and pickups.
export const HULL_MAX = 3;
export const INVULN_AFTER_HIT = 1.6; // seconds of mercy after a crash
export const STAR_TIME = 6; // seconds of invulnerability + double points
export const PADDLE_BOOST_TIME = 0.9; // seconds of extra speed per paddle
export const PADDLE_COOLDOWN = 1.1; // seconds before the next paddle

// Scrolling: base speed plus a ramp that grows with distance (px per second).
export const BASE_SCROLL = 150;
export const SCROLL_RAMP_PER_METER = 0.12;
export const SCROLL_MAX = 330;
export const PADDLE_BOOST_SPEED = 135;

// One metre of river for every 12 scrolled pixels.
export const PX_PER_METER = 12;

// Points.
export const POINTS_PER_METER = 1;
export const POINTS_PER_COIN = 50;
export const POINTS_PER_SECTION = 250;
export const RING_POINTS = 200;
export const CONQUEST_BONUS = 500;

// Combo: chain coin pickups within COMBO_WINDOW seconds and each coin
// pays POINTS_PER_COIN times the combo level (capped at COMBO_MAX).
// A crash resets the chain to zero.
export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 8;

// The goal: reach WIN_DISTANCE metres and the river is conquered.
// The last FINAL_STRETCH_AT metres of Ember Gorge run denser and faster.
export const WIN_DISTANCE = 1500;
export const FINAL_STRETCH_AT = 1200;

// Golden rings: one roughly every RING_EVERY seconds of play.
export const RING_EVERY = 8;
export const RING_RADIUS = 34;

// Spawning: a new hazard or pickup every SPAWN_EVERY seconds at the start,
// shrinking toward SPAWN_MIN as distance grows.
export const SPAWN_EVERY = 1.05;
export const SPAWN_MIN = 0.42;

// Sections of the river, in order. Each one renames the stretch, recolours
// the world and raises the current.
export const SECTIONS = [
  {
    name: 'Calm Greenwater',
    fromMeters: 0,
    riverHalfWidth: 252,
    spawnScale: 1.0,
    speedScale: 1.0,
    palette: {
      skyTop: '#6ec1f5', skyBottom: '#d8f2ff',
      farBank: '#3f9e4d', bank: '#5dbb63', bankEdge: '#f2e3b3',
      water: '#2ec4b6', waterDeep: '#0f8f86', foam: '#e8fbff',
      cliff: '#7a9e6a',
    },
  },
  {
    name: 'Teal Rapids',
    fromMeters: 400,
    riverHalfWidth: 232,
    spawnScale: 1.35,
    speedScale: 1.18,
    palette: {
      skyTop: '#57b6ef', skyBottom: '#c9ecff',
      farBank: '#2f8f3e', bank: '#4caf50', bankEdge: '#efe0a8',
      water: '#12b5a5', waterDeep: '#0a7d74', foam: '#e2fbff',
      cliff: '#5d8a58',
    },
  },
  {
    name: 'Ember Gorge',
    fromMeters: 900,
    riverHalfWidth: 205,
    spawnScale: 1.7,
    speedScale: 1.38,
    palette: {
      skyTop: '#ff9e57', skyBottom: '#ffe3b3',
      farBank: '#8a4b2a', bank: '#c97b3f', bankEdge: '#e8c890',
      water: '#e07b39', waterDeep: '#a8541f', foam: '#fff1d6',
      cliff: '#7c4526',
    },
  },
];

// Storage key for the best score.
export const BEST_KEY = 'rapid-rush-best';
