import { initI18n, i18n, updateLanguageToggle } from './i18n.js';
import {
  initAudio,
  playChime,
  setVolume,
  setMute,
  isAudioInitialized,
  getCurrentVolume,
  isMutedState,
} from './audio.js';
import { Timer } from './timer.js';

const STORAGE_KEYS = {
  times: 'talk-timer.times',
  volume: 'talk-timer.volume',
  mute: 'talk-timer.mute',
};

const chimeCounts = [1, 2, 3];
const timer = new Timer(chimeCounts);
let messageTimeout = null;

async function bootstrap() {
  await initI18n();
  const elements = cacheElements();
  restoreSettings(elements);
  setupEventListeners(elements);
  timer.configureCallbacks({
    onTick: (snapshot) => updateUI(snapshot, elements),
    onSectionEnd: handleSectionEnd,
    onComplete: () => handleComplete(elements),
  });
  updateUI(timer.getSnapshot(), elements);
  i18n.onChange(() => {
    updateLanguageToggle();
    updateUI(timer.getSnapshot(), elements);
    updateManualChimeLabels(elements);
  });
  updateManualChimeLabels(elements);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    showMessage(i18n.t('audioError'), 'error');
  });
});

function cacheElements() {
  return {
    timeDisplay: document.getElementById('timeDisplay'),
    currentSection: document.getElementById('currentSection'),
    nextSection: document.getElementById('nextSection'),
    progressBars: [
      document.getElementById('progress1'),
      document.getElementById('progress2'),
      document.getElementById('progress3'),
    ],
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    skipBtn: document.getElementById('skipBtn'),
    chimeButtons: [
      document.getElementById('chime1'),
      document.getElementById('chime2'),
      document.getElementById('chime3'),
    ],
    inputs: [
      document.getElementById('minutes1'),
      document.getElementById('seconds1'),
      document.getElementById('minutes2'),
      document.getElementById('seconds2'),
      document.getElementById('minutes3'),
      document.getElementById('seconds3'),
    ],
    volumeSlider: document.getElementById('volume'),
    volumeValue: document.getElementById('volumeValue'),
    muteCheckbox: document.getElementById('mute'),
    messageArea: document.getElementById('messageArea'),
  };
}

function restoreSettings(elements) {
  const durations = loadDurations();
  timer.setDurations(durations);
  updateInputsFromDurations(elements.inputs, durations);

  const volume = loadVolume();
  setVolume(volume);
  elements.volumeSlider.value = volume;
  updateVolumeDisplay(elements.volumeValue, volume);

  const mute = loadMute();
  setMute(mute);
  elements.muteCheckbox.checked = mute;
}

function setupEventListeners(elements) {
  elements.startBtn.addEventListener('click', async () => {
    const audioReady = await ensureAudioReady();
    if (!audioReady) return;
    timer.start();
    updateControls(timer.getSnapshot().status, elements);
  });

  elements.pauseBtn.addEventListener('click', () => {
    timer.pause();
    updateControls(timer.getSnapshot().status, elements);
  });

  elements.resumeBtn.addEventListener('click', () => {
    timer.resume();
    updateControls(timer.getSnapshot().status, elements);
  });

  elements.resetBtn.addEventListener('click', () => {
    timer.reset();
    updateControls(timer.getSnapshot().status, elements);
  });

  elements.skipBtn.addEventListener('click', () => {
    timer.skip();
    updateControls(timer.getSnapshot().status, elements);
  });

  elements.inputs.forEach((input) => {
    input.addEventListener('change', () => handleTimeInputChange(elements));
    input.addEventListener('blur', () => handleTimeInputChange(elements));
  });

  elements.volumeSlider.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    saveVolume(value);
    updateVolumeDisplay(elements.volumeValue, value);
    if (isAudioInitialized()) {
      setMute(elements.muteCheckbox.checked);
    }
  });

  elements.muteCheckbox.addEventListener('change', (event) => {
    const mute = event.target.checked;
    setMute(mute);
    saveMute(mute);
  });

  elements.chimeButtons.forEach((btn, index) => {
    btn.addEventListener('click', async () => {
      const audioReady = await ensureAudioReady();
      if (!audioReady) return;
      try {
        await playChime(index + 1);
      } catch (error) {
        console.error(error);
        showMessage(i18n.t('audioError'), 'error');
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (timer.isRunning()) {
        timer.pause();
      } else if (timer.getSnapshot().status === 'paused') {
        timer.resume();
      } else {
        elements.startBtn.click();
        return;
      }
      updateControls(timer.getSnapshot().status, elements);
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      timer.reset();
      updateControls(timer.getSnapshot().status, elements);
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      timer.skip();
      updateControls(timer.getSnapshot().status, elements);
    }
  });
}

async function ensureAudioReady() {
  if (isAudioInitialized()) {
    return true;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('AudioContext not supported');
    const ctx = new Ctx();
    await initAudio(ctx);
    setVolume(getCurrentVolume());
    setMute(isMutedState());
    showMessage(i18n.t('audioReady'), 'success');
    return true;
  } catch (error) {
    console.error(error);
    showMessage(i18n.t('audioError'), 'error');
    return false;
  }
}

function handleSectionEnd(sectionIndex, chimes) {
  playChime(chimes).catch((error) => {
    console.error(error);
    showMessage(i18n.t('audioError'), 'error');
  });
}

function handleComplete(elements) {
  updateControls(timer.getSnapshot().status, elements);
  showMessage(i18n.t('finished'), 'success');
}

function handleTimeInputChange(elements) {
  const durations = readDurationsFromInputs(elements.inputs);
  timer.setDurations(durations);
  try {
    saveDurations(durations);
  } catch (error) {
    console.error(error);
    showMessage(i18n.t('savingError'), 'error');
  }
  updateUI(timer.getSnapshot(), elements);
}

function readDurationsFromInputs(inputs) {
  const values = [];
  for (let i = 0; i < inputs.length; i += 2) {
    const minutes = clampNumber(parseInt(inputs[i].value, 10));
    const seconds = clampNumber(parseInt(inputs[i + 1].value, 10));
    inputs[i].value = minutes;
    inputs[i + 1].value = seconds;
    values.push(minutes * 60 + seconds);
  }
  return values;
}

function clampNumber(value) {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(59, value);
}

function updateInputsFromDurations(inputs, durations) {
  for (let i = 0; i < durations.length; i += 1) {
    const minutes = Math.floor(durations[i] / 60);
    const seconds = durations[i] % 60;
    inputs[i * 2].value = minutes;
    inputs[i * 2 + 1].value = seconds;
  }
}

function updateVolumeDisplay(target, value) {
  const percent = Math.round(value * 100);
  target.textContent = `${percent}%`;
}

function updateUI(snapshot, elements) {
  if (!snapshot) return;
  updateTimeDisplay(snapshot, elements.timeDisplay);
  updateSectionLabels(snapshot, elements.currentSection);
  updateNextSection(snapshot, elements.nextSection);
  updateProgressBars(snapshot, elements.progressBars);
  updateControls(snapshot.status, elements);
}

function updateTimeDisplay(snapshot, timeDisplay) {
  const remaining = Math.max(0, snapshot.remaining || 0);
  timeDisplay.textContent = formatTime(remaining);
}

function formatTime(seconds) {
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateSectionLabels(snapshot, currentSectionEl) {
  const key = `section${snapshot.sectionIndex + 1}Name`;
  currentSectionEl.textContent = i18n.t(key);
}

function updateNextSection(snapshot, nextSectionEl) {
  const { nextSectionIndex } = snapshot;
  if (snapshot.status === 'finished') {
    nextSectionEl.textContent = i18n.t('finished');
    return;
  }
  if (nextSectionIndex == null) {
    nextSectionEl.textContent = '';
    return;
  }
  const key = `section${nextSectionIndex + 1}Name`;
  const name = i18n.t(key);
  const chimes = chimeCounts[nextSectionIndex];
  nextSectionEl.textContent = i18n.t('nextUp', { name, count: chimes });
}

function updateProgressBars(snapshot, bars) {
  snapshot.progress.forEach((value, index) => {
    if (!bars[index]) return;
    const width = Math.max(0, Math.min(100, value * 100));
    bars[index].style.width = `${width}%`;
  });
}

function updateControls(status, elements) {
  switch (status) {
    case 'running':
      elements.startBtn.disabled = true;
      elements.pauseBtn.disabled = false;
      elements.resumeBtn.disabled = true;
      elements.skipBtn.disabled = false;
      break;
    case 'paused':
      elements.startBtn.disabled = true;
      elements.pauseBtn.disabled = true;
      elements.resumeBtn.disabled = false;
      elements.skipBtn.disabled = false;
      break;
    case 'finished':
      elements.startBtn.disabled = false;
      elements.pauseBtn.disabled = true;
      elements.resumeBtn.disabled = true;
      elements.skipBtn.disabled = true;
      break;
    default:
      elements.startBtn.disabled = false;
      elements.pauseBtn.disabled = true;
      elements.resumeBtn.disabled = true;
      elements.skipBtn.disabled = true;
  }
}

function showMessage(message, type = 'error') {
  const area = document.getElementById('messageArea');
  if (!area) return;
  area.textContent = message;
  area.classList.remove('success', 'info');
  if (type === 'success') {
    area.classList.add('success');
  } else if (type === 'info') {
    area.classList.add('info');
  }
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
  if (message) {
    messageTimeout = setTimeout(() => {
      area.textContent = '';
      area.classList.remove('success', 'info');
    }, 5000);
  }
}

function updateManualChimeLabels(elements) {
  elements.chimeButtons.forEach((btn, index) => {
    const count = index + 1;
    const bellWord = i18n.t('bell');
    if (i18n.current === 'ja') {
      btn.setAttribute('aria-label', `${count}${bellWord}`);
    } else {
      const plural = count === 1 ? '' : 's';
      btn.setAttribute('aria-label', `${count} ${bellWord}${plural}`);
    }
  });
}

function loadDurations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.times);
    if (!raw) return [900, 300, 300];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return [900, 300, 300];
    return parsed.map((value) => Math.max(0, Number(value) || 0));
  } catch (error) {
    console.error(error);
    return [900, 300, 300];
  }
}

function saveDurations(durations) {
  localStorage.setItem(STORAGE_KEYS.times, JSON.stringify(durations));
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.volume);
    if (raw === null) return 1;
    const value = Number(raw);
    if (Number.isNaN(value)) return 1;
    return Math.min(1, Math.max(0, value));
  } catch (error) {
    console.error(error);
    return 1;
  }
}

function saveVolume(value) {
  localStorage.setItem(STORAGE_KEYS.volume, value);
}

function loadMute() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.mute);
    if (raw === null) return false;
    return raw === 'true';
  } catch (error) {
    console.error(error);
    return false;
  }
}

function saveMute(value) {
  localStorage.setItem(STORAGE_KEYS.mute, value);
}
