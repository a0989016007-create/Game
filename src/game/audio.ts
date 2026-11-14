import type { PropType } from './types';

// Procedural Web Audio API synthesizer for upbeat French patisserie BGM & tactile SFX

const PERFECT_SCALE_HZ = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66,// D6
  1318.51,// E6
  1567.98,// G6
];

// Upbeat 128 BPM French electropop / bouncy patisserie progression (16th-note steps, 64 steps = 4 bars)
// Progression: Fmaj7 -> G7 -> Em7 -> Am7 (bouncy & joyful)
const BASS_PATTERN_HZ = [
  // Bar 1: F2 / F3 bounce
  87.31, 0, 174.61, 0, 87.31, 0, 130.81, 174.61,
  87.31, 0, 174.61, 0, 98.0, 0, 130.81, 0,
  // Bar 2: G2 / G3 bounce
  98.0, 0, 196.0, 0, 98.0, 0, 146.83, 196.0,
  98.0, 0, 196.0, 0, 110.0, 0, 146.83, 0,
  // Bar 3: E2 / E3 bounce
  82.41, 0, 164.81, 0, 82.41, 0, 123.47, 164.81,
  82.41, 0, 164.81, 0, 98.0, 0, 123.47, 0,
  // Bar 4: A2 / A3 + turnaround C
  110.0, 0, 220.0, 0, 110.0, 0, 164.81, 220.0,
  130.81, 0, 196.0, 0, 146.83, 0, 164.81, 0,
];

// Bright playful French marimba/glockenspiel melody (64 steps)
const MELODY_PATTERN_HZ = [
  // Bar 1 (Fmaj7)
  659.25, 0, 523.25, 0, 698.46, 0, 880.0, 0,
  783.99, 0, 659.25, 0, 523.25, 587.33, 659.25, 0,
  // Bar 2 (G7)
  587.33, 0, 659.25, 0, 783.99, 0, 987.77, 0,
  880.0, 0, 783.99, 0, 659.25, 0, 587.33, 0,
  // Bar 3 (Em7)
  659.25, 0, 783.99, 0, 987.77, 0, 783.99, 0,
  659.25, 0, 587.33, 0, 493.88, 587.33, 659.25, 0,
  // Bar 4 (Am7 -> turnaround)
  880.0, 0, 1046.5, 0, 987.77, 0, 880.0, 0,
  783.99, 0, 659.25, 783.99, 880.0, 0, 783.99, 0,
];

export class PatisserieAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private bgmPlaying = false;
  private bgmTimerId: number | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private comboEnergy = 0;
  private slowMoActive = false;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 5200;
      this.bgmFilter.Q.value = 0.8;

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.34;
      this.bgmFilter.connect(this.bgmGain);
      this.bgmGain.connect(this.masterGain);

      // Shared short white-noise buffer for hi-hats & pastry slice cues
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicMood(combo: number, slowMoActive: boolean): void {
    this.comboEnergy = Math.min(1, combo / 5);
    this.slowMoActive = slowMoActive;

    if (this.bgmFilter && this.ctx) {
      const targetFreq = slowMoActive ? 1150 : 4800 + this.comboEnergy * 2400;
      this.bgmFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.12);
    }
  }

  public startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.04;

    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0.34, ctx.currentTime, 0.08);
    }

    this.bgmTimerId = window.setInterval(() => {
      this.scheduleBgmLookahead();
    }, 25);
  }

  public stopMusic(): void {
    this.bgmPlaying = false;
    if (this.bgmTimerId !== null) {
      window.clearInterval(this.bgmTimerId);
      this.bgmTimerId = null;
    }
  }

  public destroy(): void {
    this.stopMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
  }

  private scheduleBgmLookahead(): void {
    if (!this.bgmPlaying || !this.ctx || !this.bgmFilter) return;

    const bpm = this.slowMoActive ? 98 : 128 + this.comboEnergy * 8;
    const stepDuration = 60 / bpm / 4; // 16th note

    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.scheduleBgmStep(this.currentStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64;
    }
  }

  private scheduleBgmStep(step: number, time: number, stepDur: number): void {
    const ctx = this.ctx;
    const dest = this.bgmFilter;
    if (!ctx || !dest) return;

    // 1. Punchy bouncy kick on beat 1 & 3 (steps 0, 8) + syncopated kick on step 10
    const stepInBar = step % 16;
    if (stepInBar === 0 || stepInBar === 8 || stepInBar === 10) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(135, time);
      kickOsc.frequency.exponentialRampToValueAtTime(46, time + 0.095);

      const amp = stepInBar === 10 ? 0.16 : 0.24;
      kickGain.gain.setValueAtTime(amp, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      kickOsc.connect(kickGain);
      kickGain.connect(dest);
      kickOsc.start(time);
      kickOsc.stop(time + 0.12);
    }

    // 2. Crisp offbeat hi-hat & clap on 2 & 4
    if (this.noiseBuffer && (stepInBar % 4 === 2 || stepInBar === 4 || stepInBar === 12)) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const hp = ctx.createBiquadFilter();
      hp.type = stepInBar === 4 || stepInBar === 12 ? 'bandpass' : 'highpass';
      hp.frequency.setValueAtTime(stepInBar === 4 || stepInBar === 12 ? 1900 : 6500, time);

      const hatGain = ctx.createGain();
      const isClap = stepInBar === 4 || stepInBar === 12;
      hatGain.gain.setValueAtTime(isClap ? 0.1 : 0.055, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + (isClap ? 0.08 : 0.038));

      noise.connect(hp);
      hp.connect(hatGain);
      hatGain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.09);
    }

    // 3. Groovy French-pop Bassline
    const bassFreq = BASS_PATTERN_HZ[step];
    if (bassFreq > 0) {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, time);

      bassGain.gain.setValueAtTime(0.001, time);
      bassGain.gain.linearRampToValueAtTime(0.22, time + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.7);

      bassOsc.connect(bassGain);
      bassGain.connect(dest);
      bassOsc.start(time);
      bassOsc.stop(time + stepDur * 1.8);
    }

    // 4. Playful Parisian Glockenspiel / Pluck Melody
    const melFreq = MELODY_PATTERN_HZ[step];
    if (melFreq > 0) {
      const melOsc = ctx.createOscillator();
      const melGain = ctx.createGain();
      melOsc.type = 'sine';
      melOsc.frequency.setValueAtTime(melFreq, time);

      melGain.gain.setValueAtTime(0.001, time);
      melGain.gain.linearRampToValueAtTime(0.14, time + 0.012);
      melGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.9);

      melOsc.connect(melGain);
      melGain.connect(dest);
      melOsc.start(time);
      melOsc.stop(time + stepDur * 2.0);

      // Extra octave sparkle when combo fever is active
      if (this.comboEnergy > 0.4) {
        const sparkOsc = ctx.createOscillator();
        const sparkGain = ctx.createGain();
        sparkOsc.type = 'triangle';
        sparkOsc.frequency.setValueAtTime(melFreq * 2, time);

        sparkGain.gain.setValueAtTime(0.001, time);
        sparkGain.gain.linearRampToValueAtTime(0.045 * this.comboEnergy, time + 0.01);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.3);

        sparkOsc.connect(sparkGain);
        sparkGain.connect(dest);
        sparkOsc.start(time);
        sparkOsc.stop(time + stepDur * 1.4);
      }
    }
  }

  public playRelease(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.085);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playLand(isPerfect: boolean, combo: number, hadTrim: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'triangle';
    thumpOsc.frequency.setValueAtTime(isPerfect ? 190 : 155, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(68, now + 0.11);

    thumpGain.gain.setValueAtTime(0.28, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.sfxGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.13);

    if (isPerfect) {
      const idx = Math.min(Math.max(0, combo - 1), PERFECT_SCALE_HZ.length - 1);
      const baseFreq = PERFECT_SCALE_HZ[idx];

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(baseFreq, now);

      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.linearRampToValueAtTime(0.3, now + 0.012);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(now);
      chime.stop(now + 0.38);

      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(baseFreq * 1.5, now + 0.025);
      shimmerGain.gain.setValueAtTime(0.001, now + 0.025);
      shimmerGain.gain.linearRampToValueAtTime(0.13, now + 0.04);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(this.sfxGain);
      shimmer.start(now + 0.025);
      shimmer.stop(now + 0.32);
    } else if (hadTrim && this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(1.8, now);

      const sliceGain = ctx.createGain();
      sliceGain.gain.setValueAtTime(0.22, now);
      sliceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      noise.connect(filter);
      filter.connect(sliceGain);
      sliceGain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.09);
    }
  }

  public playPropCollect(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const notes = [659.25, 880, 1174.66];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const start = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playPropUse(type: PropType): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    if (type === 'slow') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'magnet') {
      const notes = [587.33, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        if (!this.sfxGain) return;
        const t = now + idx * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } else if (type === 'shield') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((f, idx) => {
        if (!this.sfxGain) return;
        const t = now + idx * 0.035;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } else {
      // widen: bouncy ascending cream puff chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.26);
    }
  }

  public playShieldSave(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      if (!this.sfxGain) return;
      const t = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playUnlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const start = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playGameOver(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const notes = [440, 392, 329.63, 261.63];
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const start = now + i * 0.095;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }
}
