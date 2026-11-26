// Controller-side Web Audio synth SFX

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  playClick(type = 'soft') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    if (type === 'blast') {
      osc.frequency.setValueAtTime(120, t0);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.12);
      gain.gain.setValueAtTime(0.25, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    } else if (type === 'confirm') {
      osc.frequency.setValueAtTime(600, t0);
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    } else if (type === 'back') {
      osc.frequency.setValueAtTime(300, t0);
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
      osc.start(t0);
      osc.stop(t0 + 0.13);
    } else {
      osc.frequency.setValueAtTime(800, t0);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
      osc.start(t0);
      osc.stop(t0 + 0.07);
    }
  }
}

export const soundEngine = new SoundEngine();
