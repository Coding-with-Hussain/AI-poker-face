/**
 * Tiny synthesiser for game sounds. Everything is generated with the Web
 * Audio API at runtime, so there are no sound files to host or download.
 */

export type SoundName = 'click' | 'countdown' | 'go' | 'warning' | 'strike' | 'challenge' | 'win' | 'lose' | 'save';

type Wave = OscillatorType;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a user gesture (e.g. the PLAY NOW click) to allow audio. */
  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'click':
        this.tone(t, 720, 0.05, 'triangle', 0.12);
        break;
      case 'countdown':
        this.tone(t, 523, 0.16, 'sine', 0.22);
        break;
      case 'go':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.07, f, 0.16, 'triangle', 0.2));
        break;
      case 'warning':
        this.tone(t, 880, 0.06, 'square', 0.05);
        this.tone(t + 0.09, 880, 0.06, 'square', 0.05);
        break;
      case 'strike':
        this.tone(t, 320, 0.42, 'sawtooth', 0.16, 110);
        this.tone(t, 160, 0.42, 'square', 0.08, 70);
        break;
      case 'challenge':
        this.tone(t, 1250, 0.12, 'sine', 0.05, 620);
        break;
      case 'win':
        [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.12, f, 0.18, 'triangle', 0.18));
        [523, 659, 784, 1047].forEach((f) => this.tone(t + 0.4, f, 0.6, 'triangle', 0.1));
        break;
      case 'lose':
        [392, 370, 349].forEach((f, i) => this.tone(t + i * 0.32, f, 0.28, 'triangle', 0.16));
        this.tone(t + 0.96, 330, 0.7, 'triangle', 0.16, 300);
        break;
      case 'save':
        this.tone(t, 880, 0.1, 'sine', 0.15);
        this.tone(t + 0.1, 1320, 0.18, 'sine', 0.15);
        break;
    }
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext | undefined =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    } catch (error) {
      console.warn('[AI Poker Face] Audio is unavailable', error);
      this.ctx = null;
    }
    return this.ctx;
  }

  private tone(start: number, freq: number, duration: number, wave: Wave, volume: number, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

export const sound = new SoundEngine();
