const CHIME_URLS = {
  1: 'https://opengameart.org/sites/default/files/bell1.mp3',
  2: 'https://opengameart.org/sites/default/files/bell2.mp3',
  3: 'https://opengameart.org/sites/default/files/bell3.mp3',
};

let audioContext = null;
let masterGain = null;
let initialized = false;
let volume = 1;
let muted = false;
const chimeBuffers = new Map();

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

  try {
    await loadChimeBuffers();
    initialized = true;
  } catch (error) {
    dispose();
    throw error;
  }
}

export async function playChime(count = 1) {
  if (!initialized || !audioContext) {
    throw new Error('Audio not initialized');
  }
  const target = normalizeCount(count);
  const buffer = chimeBuffers.get(target);
  if (!buffer) {
    throw new Error('Chime audio unavailable');
  }
  await playBuffer(buffer);
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

async function loadChimeBuffers() {
  const entries = Object.entries(CHIME_URLS);
  if (entries.length === 0) return;
  chimeBuffers.clear();
  await Promise.all(entries.map(async ([count, url]) => {
    const buffer = await fetchAndDecode(url);
    chimeBuffers.set(Number(count), buffer);
  }));
}

async function fetchAndDecode(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return decodeBuffer(arrayBuffer);
}

function decodeBuffer(arrayBuffer) {
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(
      arrayBuffer,
      (decoded) => resolve(decoded),
      (error) => reject(error || new Error('Audio decode failed')),
    );
  });
}

function playBuffer(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain);
      source.onended = () => resolve();
      source.start();
    } catch (error) {
      reject(error);
    }
  });
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
  chimeBuffers.clear();
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
