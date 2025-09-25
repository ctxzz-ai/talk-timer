let audioContext = null;
let masterGain = null;
let volume = 1;
let isMuted = false;
let initialized = false;

export async function initAudio(ctx) {
  if (initialized) {
    return;
  }
  audioContext = ctx || new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = isMuted ? 0 : volume;
  masterGain.connect(audioContext.destination);
  await audioContext.resume();
  initialized = true;
}

function createMetallicChime(startTime) {
  const now = audioContext.currentTime;
  const start = Math.max(startTime, now);
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume * (isMuted ? 0 : 1), start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
  envelope.connect(masterGain);

  const osc1 = audioContext.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, start);
  osc1.detune.setValueAtTime(6, start);
  osc1.frequency.exponentialRampToValueAtTime(660, start + 0.6);

  const osc2 = audioContext.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1320, start);
  osc2.detune.setValueAtTime(-8, start);
  osc2.frequency.exponentialRampToValueAtTime(990, start + 0.5);

  const osc3 = audioContext.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(440, start);
  osc3.frequency.exponentialRampToValueAtTime(392, start + 0.5);

  const chimeGain = audioContext.createGain();
  chimeGain.gain.setValueAtTime(0.001, start);
  chimeGain.gain.exponentialRampToValueAtTime(0.6, start + 0.05);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, start + 1.3);

  osc1.connect(chimeGain);
  osc2.connect(chimeGain);
  osc3.connect(chimeGain);
  chimeGain.connect(envelope);

  osc1.start(start);
  osc2.start(start);
  osc3.start(start);
  osc1.stop(start + 1.4);
  osc2.stop(start + 1.4);
  osc3.stop(start + 1.4);
}

export async function playChime(count = 1) {
  if (!initialized || !audioContext) {
    throw new Error('Audio not initialized');
  }
  const spacing = 0.55;
  let time = audioContext.currentTime + 0.05;
  for (let i = 0; i < count; i += 1) {
    createMetallicChime(time);
    time += spacing;
  }
  return new Promise((resolve) => {
    setTimeout(resolve, (spacing * count + 1.5) * 1000);
  });
}

export function setVolume(value) {
  volume = value;
  if (masterGain && !isMuted) {
    masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
  }
}

export function setMute(mute) {
  isMuted = mute;
  if (masterGain) {
    const target = mute ? 0 : volume;
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
  return isMuted;
}
