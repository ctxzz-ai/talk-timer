let audioContext = null;
let masterGain = null;
let initialized = false;
let volume = 1;
let muted = false;
let noiseBuffer = null;

const CHIME_PATTERNS = {
  1: {
    offsets: [0],
    frequencies: [880],
  },
  2: {
    offsets: [0, 0.6],
    frequencies: [880, 880],
  },
  3: {
    offsets: [0, 0.6, 0.6],
    frequencies: [880, 880, 880],
  },
};

const PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2.01, gain: 0.42 },
  { ratio: 2.74, gain: 0.3 },
  { ratio: 3.76, gain: 0.25 },
  { ratio: 5.12, gain: 0.18 },
  { ratio: 6.79, gain: 0.12 },
];

const BELL_DURATION = 1.6;

export async function initAudio(ctx) {
  if (initialized) {
    return;
  }

  const suppliedContext = isAudioContext(ctx) ? ctx : null;
  const ContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!suppliedContext && !ContextCtor) {
    throw new Error('AudioContext not supported');
  }

  audioContext = suppliedContext || new ContextCtor();

  masterGain = audioContext.createGain();
  masterGain.gain.value = muted ? 0 : volume;
  masterGain.connect(audioContext.destination);

  await audioContext.resume();

  initialized = true;
}

export async function playChime(count = 1) {
  if (!initialized || !audioContext) {
    throw new Error('Audio not initialized');
  }
  const target = normalizeCount(count);
  const pattern = CHIME_PATTERNS[target] || CHIME_PATTERNS[1];
  const startAt = audioContext.currentTime + 0.05;
  let cursor = startAt;
  pattern.offsets.forEach((offset, index) => {
    if (index === 0) {
      cursor = startAt;
    } else {
      cursor += Math.max(0, Number(offset) || 0);
    }
    const freq = pattern.frequencies[index] || pattern.frequencies[pattern.frequencies.length - 1];
    scheduleBellStrike(cursor, freq);
  });

  const totalDuration = (cursor + BELL_DURATION) - audioContext.currentTime;
  if (totalDuration <= 0) return;
  await waitSeconds(totalDuration);
}

export function setVolume(value) {
  volume = clamp(value, 0, 1);
  if (masterGain && !muted) {
    masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
  }
}

export function setMute(state) {
  muted = Boolean(state);
  if (masterGain) {
    const target = muted ? 0 : volume;
    masterGain.gain.setValueAtTime(target, audioContext.currentTime);
  }
}

export function isAudioInitialized() {
  return initialized;
}

export function getCurrentVolume() {
  return volume;
}

export function isMutedState() {
  return muted;
}

function scheduleBellStrike(startTime, frequency) {
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(1, startTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.002, startTime + BELL_DURATION);
  envelope.connect(masterGain);

  const shimmer = audioContext.createGain();
  shimmer.gain.setValueAtTime(0.18, startTime);
  shimmer.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);
  shimmer.connect(masterGain);

  const vibrato = audioContext.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.setValueAtTime(5.2, startTime);
  const vibratoGain = audioContext.createGain();
  vibratoGain.gain.setValueAtTime(frequency * 0.003, startTime);
  vibrato.connect(vibratoGain);

  PARTIALS.forEach(({ ratio, gain }) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    const baseFreq = frequency * ratio;
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.998, startTime + BELL_DURATION);
    const partialGain = audioContext.createGain();
    partialGain.gain.setValueAtTime(gain, startTime);
    partialGain.gain.exponentialRampToValueAtTime(gain * 0.4, startTime + BELL_DURATION);
    vibratoGain.connect(osc.frequency);
    osc.connect(partialGain);
    partialGain.connect(envelope);
    osc.start(startTime);
    osc.stop(startTime + BELL_DURATION + 0.2);
  });

  const strikeSource = audioContext.createBufferSource();
  strikeSource.buffer = getNoiseBuffer();
  const strikeFilter = audioContext.createBiquadFilter();
  strikeFilter.type = 'bandpass';
  strikeFilter.frequency.setValueAtTime(frequency * 2.6, startTime);
  strikeFilter.Q.value = 10;

  const strikeGain = audioContext.createGain();
  strikeGain.gain.setValueAtTime(0.4, startTime);
  strikeGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);

  strikeSource.connect(strikeFilter);
  strikeFilter.connect(strikeGain);
  strikeGain.connect(shimmer);

  strikeSource.start(startTime);
  strikeSource.stop(startTime + 0.2);

  vibrato.start(startTime);
  vibrato.stop(startTime + BELL_DURATION + 0.2);
}

function normalizeCount(count) {
  const numeric = Math.round(Number(count) || 1);
  if (numeric <= 1) return 1;
  if (numeric >= 3) return 3;
  return numeric;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function dispose() {
  initialized = false;
  noiseBuffer = null;
  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch (error) {
      // ignore
    }
  }
  masterGain = null;
  audioContext = null;
}

function isAudioContext(candidate) {
  if (!candidate) return false;
  const ContextCtor = window.AudioContext || window.webkitAudioContext;
  return typeof candidate === 'object'
    && candidate !== null
    && typeof candidate.state === 'string'
    && typeof candidate.resume === 'function'
    && (!ContextCtor || candidate instanceof ContextCtor);
}

function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.max(1, Math.floor((audioContext.sampleRate || 44100) * 0.3));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2) - 1;
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

function waitSeconds(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, seconds) * 1000);
  });
}
