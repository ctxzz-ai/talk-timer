let audioContext = null;
let masterGain = null;
let volume = 1;
let isMuted = false;
let initialized = false;
let chimeDataUrl = null;
let fallbackMode = false;

export async function initAudio(ctx) {
  if (initialized) {
    return;
  }
  audioContext = ctx || new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();
  try {
    const base64 = await createMp3Chime();
    if (base64) {
      chimeDataUrl = `data:audio/mpeg;base64,${base64}`;
    } else {
      activateFallback();
    }
  } catch (error) {
    console.warn('MP3 chime generation failed, using synthesized fallback.', error);
    activateFallback();
  }
  initialized = true;
}

function activateFallback() {
  fallbackMode = true;
  masterGain = audioContext.createGain();
  masterGain.gain.value = isMuted ? 0 : volume;
  masterGain.connect(audioContext.destination);
}

async function createMp3Chime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('audio/mpeg')) {
    throw new Error('MediaRecorder MP3 not supported');
  }
  return new Promise((resolve, reject) => {
    const destination = audioContext.createMediaStreamDestination();
    const recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/mpeg' });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      reject(event.error || new Error('Recorder error'));
    };

    recorder.onstop = async () => {
      if (!chunks.length) {
        reject(new Error('No audio data captured'));
        return;
      }
      try {
        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        const arrayBuffer = await blob.arrayBuffer();
        resolve(arrayBufferToBase64(arrayBuffer));
      } catch (error) {
        reject(error);
      }
    };

    const { stopTime, cleanup } = scheduleChimeRecording(destination);
    recorder.start();
    const waitTime = Math.max(0, stopTime - audioContext.currentTime) + 0.3;
    setTimeout(() => {
      try {
        recorder.stop();
      } catch (error) {
        reject(error);
      }
      cleanup();
    }, waitTime * 1000);
  });
}

function scheduleChimeRecording(destination) {
  const start = audioContext.currentTime + 0.05;
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);
  envelope.connect(destination);

  const chimeGain = audioContext.createGain();
  chimeGain.gain.setValueAtTime(0.001, start);
  chimeGain.gain.exponentialRampToValueAtTime(0.7, start + 0.04);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
  chimeGain.connect(envelope);

  const oscillators = [
    createOscillator('sine', 880, 660, start),
    createOscillator('triangle', 1320, 990, start, -8),
    createOscillator('sine', 440, 392, start),
  ];

  oscillators.forEach((osc) => {
    osc.connect(chimeGain);
    osc.start(start);
    osc.stop(start + 1.4);
  });

  return {
    stopTime: start + 1.5,
    cleanup: () => {
      oscillators.forEach((osc) => {
        try {
          osc.disconnect();
        } catch (error) {
          // ignore
        }
      });
      try {
        chimeGain.disconnect();
        envelope.disconnect();
      } catch (error) {
        // ignore
      }
    },
  };
}

function createOscillator(type, startFreq, endFreq, startTime, detune = 0) {
  const osc = audioContext.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq && endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.6);
  }
  if (detune) {
    osc.detune.setValueAtTime(detune, startTime);
  }
  return osc;
}

export async function playChime(count = 1) {
  if (!initialized || !audioContext) {
    throw new Error('Audio not initialized');
  }
  if (!fallbackMode && chimeDataUrl) {
    await playMp3Chime(count);
    return;
  }
  await playFallbackChime(count);
}

async function playMp3Chime(count) {
  for (let i = 0; i < count; i += 1) {
    await playSingleMp3();
    if (i < count - 1) {
      await delay(550);
    }
  }
}

function playSingleMp3() {
  return new Promise((resolve, reject) => {
    if (!chimeDataUrl) {
      reject(new Error('Chime audio unavailable'));
      return;
    }
    const audio = new Audio(chimeDataUrl);
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.addEventListener('error', () => reject(new Error('Audio playback failed')), { once: true });
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(reject);
    }
  });
}

async function playFallbackChime(count) {
  if (!masterGain) {
    activateFallback();
  }
  const spacing = 0.55;
  let time = audioContext.currentTime + 0.05;
  for (let i = 0; i < count; i += 1) {
    createMetallicChime(time);
    time += spacing;
  }
  const waitMs = (spacing * (count - 1) + 1.5) * 1000;
  await delay(waitMs);
}

function createMetallicChime(startTime) {
  const start = Math.max(startTime, audioContext.currentTime);
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume * (isMuted ? 0 : 1), start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
  envelope.connect(masterGain);

  const osc1 = audioContext.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, start);
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

export function setVolume(value) {
  volume = value;
  if (fallbackMode && masterGain && !isMuted) {
    masterGain.gain.setValueAtTime(volume, audioContext.currentTime);
  }
}

export function setMute(mute) {
  isMuted = mute;
  if (fallbackMode && masterGain) {
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

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
