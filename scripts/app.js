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

const DEFAULT_DURATIONS = [900, 300, 300];
const MIN_MARKERS = 3;
const state = {
  durations: [...DEFAULT_DURATIONS],
  markerLines: [],
  markerLabels: [],
};

const timer = new Timer({ durations: DEFAULT_DURATIONS });
let elements = null;
let messageTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    showMessage(i18n.t('audioError'), 'error');
  });
});

async function bootstrap() {
  await initI18n();
  elements = cacheElements();
  restoreSettings();
  setupEventListeners();

  timer.configureCallbacks({
    onTick: (snapshot) => updateUI(snapshot),
    onSectionEnd: handleSectionEnd,
    onComplete: handleComplete,
  });

  i18n.onChange(() => {
    updateLanguageToggle();
    updateManualChimeLabels();
    updateSettingsDisplay();
    renderProgressStructure();
    updateUI(timer.getSnapshot());
  });

  updateLanguageToggle();
  updateManualChimeLabels();
  updateUI(timer.getSnapshot());
}

function cacheElements() {
  return {
    timeDisplay: document.getElementById('timeDisplay'),
    currentSection: document.getElementById('currentSection'),
    nextSection: document.getElementById('nextSection'),
    progressTrack: document.getElementById('progressTrack'),
    progressFill: document.getElementById('progressFill'),
    progressMarkerLabels: document.getElementById('progressMarkerLabels'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    resetBtn: document.getElementById('resetBtn'),
    skipBtn: document.getElementById('skipBtn'),
    chimeButtons: Array.from(document.querySelectorAll('[data-chime]')),
    volumeSlider: document.getElementById('volume'),
    volumeValue: document.getElementById('volumeValue'),
    muteCheckbox: document.getElementById('mute'),
    markerList: document.getElementById('markerList'),
    addMarkerBtn: document.getElementById('addMarkerBtn'),
    messageArea: document.getElementById('messageArea'),
  };
}

function restoreSettings() {
  const storedDurations = loadDurations();
  state.durations = ensureMinimumDurations(storedDurations);
  timer.setDurations(state.durations);
  renderSettings();
  renderProgressStructure();
  updateSettingsDisplay();

  const volume = loadVolume();
  setVolume(volume);
  elements.volumeSlider.value = volume;
  updateVolumeDisplay(volume);

  const mute = loadMute();
  setMute(mute);
  elements.muteCheckbox.checked = mute;
}

function setupEventListeners() {
  elements.startBtn.addEventListener('click', async () => {
    const audioReady = await ensureAudioReady();
    if (!audioReady) return;
    timer.start();
    updateControls(timer.getSnapshot());
  });

  elements.pauseBtn.addEventListener('click', () => {
    timer.pause();
    updateControls(timer.getSnapshot());
  });

  elements.resumeBtn.addEventListener('click', () => {
    timer.resume();
    updateControls(timer.getSnapshot());
  });

  elements.resetBtn.addEventListener('click', () => {
    timer.reset();
    updateControls(timer.getSnapshot());
  });

  elements.skipBtn.addEventListener('click', () => {
    timer.skip();
    updateControls(timer.getSnapshot());
  });

  elements.volumeSlider.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    saveVolume(value);
    updateVolumeDisplay(value);
    if (isAudioInitialized()) {
      setMute(elements.muteCheckbox.checked);
    }
  });

  elements.muteCheckbox.addEventListener('change', (event) => {
    const mute = event.target.checked;
    setMute(mute);
    saveMute(mute);
  });

  elements.chimeButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const audioReady = await ensureAudioReady();
      if (!audioReady) return;
      const count = Number(btn.dataset.chime) || 1;
      playChime(count).catch((error) => {
        console.error(error);
        showMessage(i18n.t('audioError'), 'error');
      });
    });
  });

  elements.markerList.addEventListener('change', (event) => {
    if (!event.target.classList.contains('time-input')) return;
    handleMarkerUpdate();
  });

  elements.markerList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="remove"]');
    if (!target) return;
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) return;
    removeMarker(index);
  });

  elements.addMarkerBtn.addEventListener('click', () => {
    addMarker();
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
      updateControls(timer.getSnapshot());
    } else if (event.code === 'KeyR') {
      event.preventDefault();
      timer.reset();
      updateControls(timer.getSnapshot());
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      timer.skip();
      updateControls(timer.getSnapshot());
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

function handleSectionEnd(sectionIndex) {
  const chimes = timer.getChimeCount(sectionIndex);
  playChime(chimes).catch((error) => {
    console.error(error);
    showMessage(i18n.t('audioError'), 'error');
  });
}

function handleComplete() {
  updateControls(timer.getSnapshot());
  showMessage(i18n.t('finished'), 'success');
}

function addMarker() {
  const durations = [...state.durations];
  const defaultStep = 300;
  durations.push(defaultStep);
  state.durations = durations;
  applyDurations(durations, { rebuild: true });
}

function removeMarker(index) {
  if (state.durations.length <= MIN_MARKERS) return;
  if (index < MIN_MARKERS) {
    // Do not remove the primary three markers.
    return;
  }
  const durations = state.durations.filter((_, idx) => idx !== index);
  state.durations = ensureMinimumDurations(durations);
  applyDurations(state.durations, { rebuild: true });
}

function handleMarkerUpdate() {
  const totals = readTotalsFromSettings();
  if (!totals.length) return;
  const durations = totals.map((total, index) => {
    if (index === 0) return total;
    return total - totals[index - 1];
  });
  state.durations = ensureMinimumDurations(durations);
  applyDurations(state.durations, { rebuild: false });
}

function applyDurations(durations, { rebuild = false } = {}) {
  timer.setDurations(durations);
  saveDurations(durations);
  if (rebuild) {
    renderSettings();
  }
  renderProgressStructure();
  updateSettingsDisplay();
  updateUI(timer.getSnapshot());
}

function readTotalsFromSettings() {
  const rows = Array.from(elements.markerList.querySelectorAll('.settings-row'));
  const totals = [];
  rows.forEach((row, index) => {
    const minutesInput = row.querySelector('[data-role="minutes"]');
    const secondsInput = row.querySelector('[data-role="seconds"]');
    if (!minutesInput || !secondsInput) return;
    let minutes = clamp(Number(minutesInput.value), 0, 180);
    let seconds = clamp(Number(secondsInput.value), 0, 59);
    minutesInput.value = minutes;
    secondsInput.value = seconds;
    let total = minutes * 60 + seconds;
    const previous = totals[index - 1] ?? 0;
    if (index === 0 && total < 1) total = 1;
    if (index > 0 && total <= previous) {
      total = previous + 1;
    }
    totals.push(total);
  });
  return totals;
}

function renderSettings() {
  const list = elements.markerList;
  list.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.durations.forEach((_, index) => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.dataset.index = index;

    const label = document.createElement('span');
    label.className = 'settings-label';
    row.appendChild(label);

    const minutesGroup = document.createElement('div');
    minutesGroup.className = 'input-group';
    const minutesLabel = document.createElement('label');
    minutesLabel.setAttribute('for', `marker-${index}-minutes`);
    minutesLabel.dataset.i18n = 'minutes';
    minutesLabel.textContent = i18n.t('minutes');
    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.id = `marker-${index}-minutes`;
    minutesInput.className = 'time-input';
    minutesInput.dataset.role = 'minutes';
    minutesInput.dataset.index = index;
    minutesInput.min = '0';
    minutesInput.max = '180';
    minutesInput.inputMode = 'numeric';
    minutesGroup.appendChild(minutesLabel);
    minutesGroup.appendChild(minutesInput);

    const secondsGroup = document.createElement('div');
    secondsGroup.className = 'input-group';
    const secondsLabel = document.createElement('label');
    secondsLabel.setAttribute('for', `marker-${index}-seconds`);
    secondsLabel.dataset.i18n = 'seconds';
    secondsLabel.textContent = i18n.t('seconds');
    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.id = `marker-${index}-seconds`;
    secondsInput.className = 'time-input';
    secondsInput.dataset.role = 'seconds';
    secondsInput.dataset.index = index;
    secondsInput.min = '0';
    secondsInput.max = '59';
    secondsInput.inputMode = 'numeric';
    secondsGroup.appendChild(secondsLabel);
    secondsGroup.appendChild(secondsInput);

    row.appendChild(minutesGroup);
    row.appendChild(secondsGroup);

    if (index >= MIN_MARKERS) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'icon-button remove-marker';
      removeBtn.dataset.action = 'remove';
      removeBtn.dataset.index = index;
      removeBtn.setAttribute('aria-label', i18n.t('removeMarker', { index: index + 1 }));
      removeBtn.innerHTML = '×';
      row.appendChild(removeBtn);
    }

    fragment.appendChild(row);
  });
  list.appendChild(fragment);
}

function updateSettingsDisplay() {
  const cumulative = getCumulativeDurations(state.durations);
  const rows = Array.from(elements.markerList.querySelectorAll('.settings-row'));
  rows.forEach((row, index) => {
    const total = typeof cumulative[index] === 'number' ? cumulative[index] : 0;
    const label = row.querySelector('.settings-label');
    if (label) {
      label.textContent = formatMarkerHeading(index, total);
    }
    const minutesInput = row.querySelector('[data-role="minutes"]');
    const secondsInput = row.querySelector('[data-role="seconds"]');
    if (minutesInput && secondsInput) {
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      minutesInput.value = minutes;
      secondsInput.value = seconds;
    }
    const removeBtn = row.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.setAttribute('aria-label', i18n.t('removeMarker', { index: index + 1 }));
    }
  });
  const addLabel = elements.addMarkerBtn;
  if (addLabel) {
    addLabel.textContent = i18n.t('addMarker');
  }
  updateMarkerLabels();
}

function renderProgressStructure() {
  if (!elements.progressTrack || !elements.progressMarkerLabels) return;
  clearProgressMarkers();

  const cumulative = getCumulativeDurations(state.durations);
  const total = cumulative.length ? cumulative[cumulative.length - 1] : 0;

  cumulative.forEach((totalSeconds, index) => {
    const percent = total > 0 ? (totalSeconds / total) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, percent));

    const marker = document.createElement('div');
    marker.className = 'progress-marker';
    marker.dataset.index = index;
    marker.style.left = `${clamped}%`;
    marker.setAttribute('aria-hidden', 'true');
    elements.progressTrack.appendChild(marker);
    state.markerLines.push(marker);

    const label = document.createElement('div');
    label.className = 'progress-marker-label';
    label.dataset.index = index;
    label.style.left = `${clamped}%`;
    label.setAttribute('role', 'listitem');
    if (clamped < 8) {
      label.classList.add('align-start');
    } else if (clamped > 92) {
      label.classList.add('align-end');
    }
    elements.progressMarkerLabels.appendChild(label);
    state.markerLabels.push(label);
  });

  updateMarkerLabels();
}

function clearProgressMarkers() {
  state.markerLines.forEach((marker) => {
    if (marker && typeof marker.remove === 'function') {
      marker.remove();
    }
  });
  state.markerLabels.forEach((label) => {
    if (label && typeof label.remove === 'function') {
      label.remove();
    }
  });
  state.markerLines = [];
  state.markerLabels = [];
}

function updateUI(snapshot) {
  if (!snapshot) return;
  ensureProgressMarkers();
  updateTimeDisplay(snapshot);
  updateSectionLabels(snapshot);
  updateNextSection(snapshot);
  updateProgress(snapshot);
  updateControls(snapshot);
}

function ensureProgressMarkers() {
  if (!elements.progressTrack) return;
  if (state.markerLines.length !== state.durations.length) {
    renderProgressStructure();
  }
}

function updateTimeDisplay(snapshot) {
  if (!elements.timeDisplay) return;
  const elapsed = Math.max(0, snapshot.totalElapsed);
  elements.timeDisplay.textContent = formatTimeValue(elapsed);
  elements.timeDisplay.classList.toggle('overtime', snapshot.isOverrun);
}

function updateSectionLabels(snapshot) {
  const cumulative = getCumulativeDurations(state.durations);
  if (!cumulative.length) {
    elements.currentSection.textContent = '';
    return;
  }
  if (snapshot.isOverrun) {
    const overtimeText = formatTimeValue(snapshot.overrun);
    elements.currentSection.textContent = i18n.t('overtimeWith', { time: overtimeText });
    return;
  }
  const index = snapshot.nextSectionIndex ?? Math.max(cumulative.length - 1, 0);
  elements.currentSection.textContent = formatMarkerHeading(index, cumulative[index]);
}

function updateNextSection(snapshot) {
  if (snapshot.isOverrun || snapshot.nextSectionIndex === null) {
    elements.nextSection.textContent = '';
    return;
  }
  const cumulative = getCumulativeDurations(state.durations);
  const nextIndex = snapshot.nextSectionIndex + 1;
  if (nextIndex >= cumulative.length) {
    elements.nextSection.textContent = '';
    return;
  }
  const countText = formatCountText(timer.getChimeCount(nextIndex));
  const time = formatTimeValue(cumulative[nextIndex]);
  elements.nextSection.textContent = i18n.t('nextMarker', { count: countText, time });
}

function updateProgress(snapshot) {
  if (!elements.progressFill || !elements.progressTrack) return;
  const cumulative = getCumulativeDurations(state.durations);
  const total = cumulative.length ? cumulative[cumulative.length - 1] : 0;
  const elapsed = Math.max(0, snapshot.totalElapsed);
  const percent = total > 0 ? (Math.min(elapsed, total) / total) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, percent));
  elements.progressFill.style.width = `${clamped}%`;
  elements.progressTrack.classList.toggle('overtime', snapshot.isOverrun);
  updateMarkerStates(snapshot, cumulative);
}

function updateMarkerLabels() {
  if (!state.markerLabels.length) return;
  const cumulative = getCumulativeDurations(state.durations);
  state.markerLabels.forEach((label, index) => {
    const total = cumulative[index] ?? 0;
    const text = formatMarkerHeading(index, total);
    label.textContent = text;
    label.setAttribute('aria-label', text);
  });
}

function updateMarkerStates(snapshot, cumulative) {
  if (!cumulative) {
    cumulative = getCumulativeDurations(state.durations);
  }
  const nextIndex = snapshot.nextSectionIndex;
  state.markerLines.forEach((marker, index) => {
    const threshold = cumulative[index] ?? 0;
    const completed = snapshot.totalElapsed >= threshold - 0.01;
    marker.classList.toggle('completed', completed);
    marker.classList.toggle('active', !snapshot.isOverrun && nextIndex === index);
  });
  state.markerLabels.forEach((label, index) => {
    const threshold = cumulative[index] ?? 0;
    const completed = snapshot.totalElapsed >= threshold - 0.01;
    label.classList.toggle('completed', completed);
    label.classList.toggle('active', !snapshot.isOverrun && nextIndex === index);
  });
}

function updateControls(snapshot) {
  const status = snapshot?.status ?? 'idle';
  const hasNext = Boolean(snapshot && snapshot.nextSectionIndex !== null);

  switch (status) {
    case 'running':
      elements.startBtn.disabled = true;
      elements.pauseBtn.disabled = false;
      elements.resumeBtn.disabled = true;
      break;
    case 'paused':
      elements.startBtn.disabled = true;
      elements.pauseBtn.disabled = true;
      elements.resumeBtn.disabled = false;
      break;
    default:
      elements.startBtn.disabled = false;
      elements.pauseBtn.disabled = true;
      elements.resumeBtn.disabled = true;
      break;
  }

  elements.skipBtn.disabled = !hasNext || status === 'idle';
}

function updateVolumeDisplay(value) {
  const percent = Math.round(value * 100);
  elements.volumeValue.textContent = `${percent}%`;
}

function showMessage(message, type = 'error') {
  const area = elements.messageArea;
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

function updateManualChimeLabels() {
  elements.chimeButtons.forEach((btn) => {
    const count = Number(btn.dataset.chime) || 1;
    const label = formatCountText(count);
    btn.setAttribute('aria-label', label);
  });
}

function formatMarkerHeading(index, totalSeconds) {
  const countText = formatCountText(timer.getChimeCount(index));
  return i18n.t('markerHeading', {
    count: countText,
    time: formatTimeValue(totalSeconds),
  });
}

function formatCountText(count) {
  const bellWord = i18n.t('bell');
  if (i18n.current === 'ja') {
    return `${count}${bellWord}`;
  }
  const plural = count === 1 ? '' : 's';
  return `${count} ${bellWord}${plural}`;
}

function formatTimeValue(seconds) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getCumulativeDurations(durations) {
  const result = [];
  let sum = 0;
  durations.forEach((duration) => {
    sum += Math.max(0, Number(duration) || 0);
    result.push(sum);
  });
  return result;
}

function ensureMinimumDurations(list) {
  const sanitized = Array.isArray(list)
    ? list.map((value) => Math.max(0, Number(value) || 0)).filter((value) => Number.isFinite(value))
    : [];
  if (sanitized.length === 0) {
    return [...DEFAULT_DURATIONS];
  }
  while (sanitized.length < MIN_MARKERS) {
    sanitized.push(300);
  }
  return sanitized;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function loadDurations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.times);
    if (!raw) return [...DEFAULT_DURATIONS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_DURATIONS];
    const sanitized = parsed.map((value) => Math.max(0, Number(value) || 0));
    if (
      sanitized.length === 3 &&
      sanitized[0] === 900 &&
      sanitized[1] === 300 &&
      sanitized[2] === 300
    ) {
      return [...DEFAULT_DURATIONS];
    }
    return sanitized;
  } catch (error) {
    console.error(error);
    return [...DEFAULT_DURATIONS];
  }
}

function saveDurations(durations) {
  try {
    localStorage.setItem(STORAGE_KEYS.times, JSON.stringify(durations));
  } catch (error) {
    console.error(error);
    showMessage(i18n.t('savingError'), 'error');
  }
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.volume);
    if (raw === null) return 1;
    const value = Number(raw);
    if (Number.isNaN(value)) return 1;
    return clamp(value, 0, 1);
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
