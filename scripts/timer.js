export class Timer {
  constructor({ durations = [600, 300, 300], chimeStrategy } = {}) {
    this.chimeStrategy = typeof chimeStrategy === 'function'
      ? chimeStrategy
      : (index) => (index + 1 >= 3 ? 3 : index + 1);

    this.onTick = null;
    this.onSectionEnd = null;
    this.onComplete = null;

    this._applyDurations(Array.isArray(durations) && durations.length ? durations : [600, 300, 300]);
    this._resetState();
  }

  configureCallbacks({ onTick, onSectionEnd, onComplete } = {}) {
    this.onTick = onTick || null;
    this.onSectionEnd = onSectionEnd || null;
    this.onComplete = onComplete || null;
    this._emitTick();
  }

  setDurations(secondsArray) {
    if (!Array.isArray(secondsArray) || secondsArray.length === 0) {
      return;
    }
    this._applyDurations(secondsArray);
    if (this.status !== 'idle') {
      this.reset();
    } else {
      this._resetState();
      this._emitTick();
    }
  }

  start() {
    if (this.status === 'running') return;
    this._resetState();
    this.status = 'running';
    this.lastTimestamp = performance.now();
    this._emitTick();
    this._loop();
  }

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  resume() {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.lastTimestamp = performance.now();
    this._loop();
  }

  reset() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._resetState();
    this._emitTick();
  }

  skip() {
    if (this.status === 'idle') return;
    if (this.nextMarkerIndex === null) return;
    const index = this.nextMarkerIndex;
    this.totalElapsed = Math.max(this.totalElapsed, this.markerTimes[index]);
    this._completeMarker(index, false);
    this.lastTimestamp = performance.now();
    this._emitTick();
  }

  isRunning() {
    return this.status === 'running';
  }

  getSnapshot() {
    const sections = this.intervals.map((duration, idx) => {
      const start = idx === 0 ? 0 : this.markerTimes[idx - 1];
      const end = this.markerTimes[idx];
      if (duration === 0) {
        return { duration: 0, progress: this.totalElapsed >= end ? 1 : 0 };
      }
      const elapsedInSection = clamp(this.totalElapsed - start, 0, duration);
      const progress = clamp(elapsedInSection / duration, 0, 1);
      return { duration, progress };
    });

    const remainingToNext = this.nextMarkerIndex === null
      ? 0
      : Math.max(0, this.markerTimes[this.nextMarkerIndex] - this.totalElapsed);

    const overrun = Math.max(0, this.totalElapsed - this.totalDuration);

    return {
      sectionIndex: this.nextMarkerIndex === null ? this.intervals.length - 1 : this.nextMarkerIndex,
      status: this.status,
      remaining: remainingToNext,
      sections,
      nextSectionIndex: this.nextMarkerIndex,
      totalSections: this.intervals.length,
      totalElapsed: this.totalElapsed,
      totalDuration: this.totalDuration,
      remainingTotal: Math.max(0, this.totalDuration - this.totalElapsed),
      overrun,
      isOverrun: overrun > 0,
    };
  }

  getChimeCount(index) {
    if (typeof this.chimeStrategy === 'function') {
      const result = this.chimeStrategy(index);
      const numeric = Math.max(1, Number(result) || 1);
      return Math.round(numeric);
    }
    return Math.min(index + 1, 3);
  }

  setChimeStrategy(strategy) {
    if (typeof strategy === 'function') {
      this.chimeStrategy = strategy;
    }
  }

  _applyDurations(durations) {
    this.intervals = durations.map((value) => Math.max(0, Number(value) || 0));
    if (this.intervals.length === 0) {
      this.intervals = [0];
    }
    this.markerTimes = this.intervals.reduce((acc, value, index) => {
      const previous = index === 0 ? 0 : acc[index - 1];
      acc.push(previous + value);
      return acc;
    }, []);
    this.totalDuration = this.markerTimes.length ? this.markerTimes[this.markerTimes.length - 1] : 0;
  }

  _resetState() {
    this.status = 'idle';
    this.totalElapsed = 0;
    this.nextMarkerIndex = this.intervals.length ? 0 : null;
    this.currentMarkerIndex = -1;
    this.rafId = null;
    this.lastTimestamp = null;
    this.completedNotified = false;
  }

  _loop() {
    if (this.status !== 'running') return;
    const now = performance.now();
    const delta = this.lastTimestamp ? (now - this.lastTimestamp) / 1000 : 0;
    this.lastTimestamp = now;
    this.totalElapsed += delta;

    this._checkMarkers(true);
    this._emitTick();

    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _checkMarkers(shouldChime) {
    while (this.nextMarkerIndex !== null && this.totalElapsed >= this.markerTimes[this.nextMarkerIndex]) {
      this._completeMarker(this.nextMarkerIndex, shouldChime);
    }
  }

  _completeMarker(index, shouldChime) {
    if (shouldChime && typeof this.onSectionEnd === 'function') {
      const chimes = this.getChimeCount(index);
      this.onSectionEnd(index, chimes);
    }

    this.currentMarkerIndex = index;
    const nextIndex = index + 1;
    this.nextMarkerIndex = nextIndex < this.markerTimes.length ? nextIndex : null;

    if (this.nextMarkerIndex === null && !this.completedNotified) {
      this.completedNotified = true;
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    }
  }

  _emitTick() {
    if (typeof this.onTick === 'function') {
      this.onTick(this.getSnapshot());
    }
  }
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
