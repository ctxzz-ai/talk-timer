export class Timer {
  constructor(chimeCounts = [1, 2, 3]) {
    this.chimeCounts = chimeCounts;
    this.baseDurations = [900, 300, 300];
    this.onTick = null;
    this.onSectionEnd = null;
    this.onComplete = null;
    this._resetState();
  }

  _resetState() {
    this.sectionIndex = 0;
    this.elapsedInSection = 0;
    this.status = 'idle';
    this.sectionProgress = this.baseDurations.map(() => 0);
    this.remaining = this.baseDurations[0];
    this.rafId = null;
    this.lastTimestamp = null;
  }

  configureCallbacks({ onTick, onSectionEnd, onComplete } = {}) {
    this.onTick = onTick || null;
    this.onSectionEnd = onSectionEnd || null;
    this.onComplete = onComplete || null;
    this._emitTick();
  }

  setDurations(secondsArray) {
    if (!Array.isArray(secondsArray) || secondsArray.length !== this.baseDurations.length) {
      return;
    }
    this.baseDurations = secondsArray.map((s) => Math.max(0, Number(s) || 0));
    if (this.status === 'idle' || this.status === 'finished') {
      this._resetState();
      this._emitTick();
    } else {
      const currentDuration = this.baseDurations[this.sectionIndex];
      const progress = currentDuration === 0 ? 1 : Math.min(1, this.elapsedInSection / currentDuration);
      this.elapsedInSection = progress * currentDuration;
      this.remaining = Math.max(0, currentDuration - this.elapsedInSection);
      this.sectionProgress = this.baseDurations.map((duration, idx) => {
        if (idx < this.sectionIndex) return 1;
        if (idx > this.sectionIndex) return 0;
        return duration === 0 ? 1 : Math.min(1, this.elapsedInSection / duration);
      });
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
    if (this.status === 'idle' || this.status === 'finished') {
      return;
    }
    this._advanceSection(false);
  }

  isRunning() {
    return this.status === 'running';
  }

  _loop() {
    if (this.status !== 'running') return;
    const now = performance.now();
    const delta = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.elapsedInSection += delta;
    const duration = this.baseDurations[this.sectionIndex];
    const remainingBefore = this.remaining;
    this.remaining = Math.max(0, duration - this.elapsedInSection);
    this.sectionProgress[this.sectionIndex] = duration === 0 ? 1 : Math.min(1, this.elapsedInSection / duration);
    this._emitTick();

    if (duration === 0) {
      this._advanceSection(true);
      return;
    }

    if (remainingBefore > 0 && this.remaining <= 0) {
      this._advanceSection(true);
      return;
    }

    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _advanceSection(triggerChime) {
    if (triggerChime && typeof this.onSectionEnd === 'function') {
      const chimes = this.chimeCounts[this.sectionIndex] ?? 1;
      this.onSectionEnd(this.sectionIndex, chimes);
    }
    this.sectionProgress[this.sectionIndex] = 1;

    if (this.sectionIndex >= this.baseDurations.length - 1) {
      this.status = 'finished';
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
      this._emitTick();
      return;
    }

    this.sectionIndex += 1;
    this.elapsedInSection = 0;
    this.remaining = this.baseDurations[this.sectionIndex];
    this.lastTimestamp = performance.now();
    if (this.status === 'running') {
      this._emitTick();
      this.rafId = requestAnimationFrame(() => this._loop());
    } else {
      this._emitTick();
    }
  }

  getSnapshot() {
    return {
      sectionIndex: this.sectionIndex,
      status: this.status,
      remaining: this.remaining,
      elapsedInSection: this.elapsedInSection,
      duration: this.baseDurations[this.sectionIndex],
      progress: [...this.sectionProgress],
      sections: this.baseDurations.map((duration, idx) => ({
        duration,
        progress: this.sectionProgress[idx],
      })),
      nextSectionIndex: this.sectionIndex + 1 < this.baseDurations.length ? this.sectionIndex + 1 : null,
    };
  }

  _emitTick() {
    if (typeof this.onTick === 'function') {
      this.onTick(this.getSnapshot());
    }
  }
}
