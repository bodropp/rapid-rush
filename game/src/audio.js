// Rapid Rush — sound: every effect is synthesised with WebAudio.
// Oscillators for tones, filtered noise for water and impacts, no audio
// files. Audio starts only after the first user gesture, and every call
// is safe when no AudioContext exists yet (headless screenshots included).

export function createAudio() {
  const audio = {
    context: null,
    master: null,
    ambience: null,
    muted: false,
    started: false,
  };

  // Call from the first user gesture. Safe to call repeatedly.
  audio.start = function start() {
    if (audio.started) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      audio.context = new Ctor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.context.destination);
      audio.started = true;
      startAmbience(audio);
    } catch {
      audio.context = null;
    }
  };

  audio.resume = function resume() {
    if (audio.context && audio.context.state === 'suspended') {
      audio.context.resume().catch(() => {});
    }
  };

  audio.now = function now() {
    return audio.context ? audio.context.currentTime : 0;
  };

  return audio;
}

// A quiet river: looped brown noise through a low-pass filter, breathing
// slowly with an LFO so it never sounds like a flat hiss.
function startAmbience(audio) {
  const ctx = audio.context;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start();
  lfo.start();
  audio.ambience = { source, gain };
}

// One short tone: an oscillator with a pitch glide and a volume envelope.
function tone(audio, { type = 'sine', from = 440, to = null, at = 0, dur = 0.15, vol = 0.2 }) {
  if (!audio.context) return;
  const ctx = audio.context;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A burst of filtered noise: splashes, thuds, sparkles.
function noiseBurst(audio, { at = 0, dur = 0.2, vol = 0.25, freq = 1200, type = 'bandpass', q = 1 }) {
  if (!audio.context) return;
  const ctx = audio.context;
  const t0 = ctx.currentTime + at;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(t0);
  source.stop(t0 + dur + 0.02);
}

export function playPaddle(audio) {
  noiseBurst(audio, { dur: 0.18, vol: 0.22, freq: 900, q: 0.8 });
  tone(audio, { type: 'sine', from: 220, to: 130, dur: 0.12, vol: 0.08 });
}

export function playCoin(audio, doubled) {
  tone(audio, { from: 988, dur: 0.09, vol: 0.16 });
  tone(audio, { from: 1319, at: 0.07, dur: 0.16, vol: 0.16 });
  if (doubled) tone(audio, { from: 1760, at: 0.14, dur: 0.14, vol: 0.12 });
}

export function playHeart(audio) {
  tone(audio, { from: 523, dur: 0.12, vol: 0.16 });
  tone(audio, { from: 659, at: 0.09, dur: 0.12, vol: 0.16 });
  tone(audio, { from: 784, at: 0.18, dur: 0.22, vol: 0.16 });
}

export function playShield(audio) {
  tone(audio, { type: 'triangle', from: 660, to: 990, dur: 0.18, vol: 0.16 });
  tone(audio, { type: 'sine', from: 1320, at: 0.05, dur: 0.2, vol: 0.08 });
}

export function playStar(audio) {
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    tone(audio, { from: freq, at: i * 0.06, dur: 0.14, vol: 0.15 });
  });
}

export function playCrash(audio) {
  tone(audio, { type: 'sine', from: 130, to: 38, dur: 0.35, vol: 0.3 });
  noiseBurst(audio, { dur: 0.28, vol: 0.3, freq: 300, type: 'lowpass' });
}

export function playSection(audio) {
  tone(audio, { from: 784, dur: 0.12, vol: 0.14 });
  tone(audio, { from: 1047, at: 0.1, dur: 0.2, vol: 0.14 });
}

export function playGameOver(audio) {
  [392, 330, 262, 196].forEach((freq, i) => {
    tone(audio, { type: 'triangle', from: freq, at: i * 0.16, dur: 0.24, vol: 0.18 });
  });
}

export function playNewBest(audio) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    tone(audio, { from: freq, at: i * 0.09, dur: 0.18, vol: 0.15 });
  });
}

export function playClick(audio) {
  tone(audio, { type: 'square', from: 700, to: 900, dur: 0.06, vol: 0.08 });
}
