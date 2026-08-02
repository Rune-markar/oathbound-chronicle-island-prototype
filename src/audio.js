const AUDIO_STORAGE_KEY = "oathbound-audio-settings-v1";

export const AUDIO_CUES = Object.freeze([
  "ui",
  "select",
  "confirm",
  "cancel",
  "error",
  "save",
  "month",
  "event",
  "war",
  "peace",
  "reset",
]);

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  muted: false,
  bgmVolume: 0.28,
  seVolume: 0.46,
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeAudioSettings(value = {}) {
  const input = value && typeof value === "object" ? value : {};
  return {
    muted: typeof input.muted === "boolean" ? input.muted : DEFAULT_AUDIO_SETTINGS.muted,
    bgmVolume: clamp(Number.isFinite(input.bgmVolume) ? input.bgmVolume : DEFAULT_AUDIO_SETTINGS.bgmVolume, 0, 1),
    seVolume: clamp(Number.isFinite(input.seVolume) ? input.seVolume : DEFAULT_AUDIO_SETTINGS.seVolume, 0, 1),
  };
}

function createStrategyBgm(context) {
  const duration = 32;
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
  const progression = [
    [73.42, 110, 146.83],
    [65.41, 98, 130.81],
    [58.27, 87.31, 116.54],
    [65.41, 98, 130.81],
  ];
  const melody = [293.66, 349.23, 392, 440, 392, 349.23, 293.66, 261.63, 293.66, 349.23, 440, 392, 349.23, 293.66, 261.63, 220];
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let index = 0; index < buffer.length; index += 1) {
    const time = index / sampleRate;
    const chord = progression[Math.min(progression.length - 1, Math.floor(time / 8))];
    const loopFade = Math.min(1, time / 1.2, (duration - time) / 1.2);
    const breath = 0.82 + Math.sin((Math.PI * 2 * time) / 8 - Math.PI / 2) * 0.12;
    let bedLeft = 0;
    let bedRight = 0;

    chord.forEach((frequency, chordIndex) => {
      const weight = [0.075, 0.052, 0.038][chordIndex];
      bedLeft += Math.sin(Math.PI * 2 * frequency * time + chordIndex * 0.35) * weight;
      bedLeft += Math.sin(Math.PI * 2 * frequency * 2 * time) * weight * 0.11;
      bedRight += Math.sin(Math.PI * 2 * frequency * time + chordIndex * 0.35 + 0.025) * weight;
      bedRight += Math.sin(Math.PI * 2 * frequency * 2 * time + 0.04) * weight * 0.11;
    });

    const noteTime = time % 2;
    const noteIndex = Math.min(melody.length - 1, Math.floor(time / 2));
    const noteEnvelope = Math.max(0, Math.min(1, noteTime / 0.22, (1.72 - noteTime) / 0.42));
    const noteFrequency = melody[noteIndex];
    const melodyLeft = (Math.sin(Math.PI * 2 * noteFrequency * time) + Math.sin(Math.PI * 4 * noteFrequency * time) * 0.18) * noteEnvelope * 0.045;
    const melodyRight = (Math.sin(Math.PI * 2 * noteFrequency * time + 0.035) + Math.sin(Math.PI * 4 * noteFrequency * time + 0.06) * 0.18) * noteEnvelope * 0.045;

    const bellTime = time % 8;
    const bellEnvelope = Math.exp(-bellTime * 1.8);
    const bellFrequency = chord[2] * 4;
    const bell = (Math.sin(Math.PI * 2 * bellFrequency * time) + Math.sin(Math.PI * 2 * bellFrequency * 2.01 * time) * 0.3) * bellEnvelope * 0.025;

    left[index] = (bedLeft * breath + melodyLeft + bell) * loopFade;
    right[index] = (bedRight * breath + melodyRight + bell * 0.92) * loopFade;
  }

  return buffer;
}

export class GameAudio {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage;
    this.context = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.seGain = null;
    this.bgmFilter = null;
    this.bgmSource = null;
    this.started = false;
    this.listeners = new Set();
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const raw = this.storage?.getItem(AUDIO_STORAGE_KEY);
      return normalizeAudioSettings(raw ? JSON.parse(raw) : {});
    } catch {
      return normalizeAudioSettings();
    }
  }

  persistSettings() {
    try {
      this.storage?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Audio remains usable when storage is unavailable or full.
    }
  }

  getState() {
    return {
      ...this.settings,
      started: this.started,
      supported: Boolean(globalThis.AudioContext ?? globalThis.webkitAudioContext),
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  ensureContext() {
    if (this.context) return true;
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      this.notify();
      return false;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.bgmGain = this.context.createGain();
    this.seGain = this.context.createGain();
    this.bgmFilter = this.context.createBiquadFilter();
    const compressor = this.context.createDynamicsCompressor();

    this.bgmFilter.type = "lowpass";
    this.bgmFilter.frequency.value = 1450;
    this.bgmFilter.Q.value = 0.45;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.22;

    this.bgmGain.connect(this.bgmFilter);
    this.bgmFilter.connect(this.masterGain);
    this.seGain.connect(this.masterGain);
    this.masterGain.connect(compressor);
    compressor.connect(this.context.destination);
    this.applyGainSettings(true);
    return true;
  }

  applyGainSettings(immediate = false) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const masterTarget = this.settings.muted ? 0 : 0.92;
    const setGain = (parameter, value) => {
      parameter.cancelScheduledValues(now);
      if (immediate) parameter.setValueAtTime(value, now);
      else parameter.setTargetAtTime(value, now, 0.035);
    };
    setGain(this.masterGain.gain, masterTarget);
    setGain(this.bgmGain.gain, this.settings.bgmVolume);
    setGain(this.seGain.gain, this.settings.seVolume);
  }

  startBgm() {
    if (!this.context || this.bgmSource) return;
    const source = this.context.createBufferSource();
    source.buffer = createStrategyBgm(this.context);
    source.loop = true;
    source.connect(this.bgmGain);
    source.start();
    this.bgmSource = source;
  }

  async unlock() {
    if (this.settings.muted || !this.ensureContext()) return false;
    try {
      if (this.context.state === "suspended") await this.context.resume();
      this.startBgm();
      this.started = true;
      this.applyGainSettings();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  async toggle() {
    if (!this.started && !this.settings.muted) return this.unlock();
    this.settings = { ...this.settings, muted: !this.settings.muted };
    this.persistSettings();
    this.applyGainSettings();
    if (!this.settings.muted) await this.unlock();
    this.notify();
    return !this.settings.muted;
  }

  tone(frequency, duration, { when = 0, gain = 0.08, type = "triangle", endFrequency = frequency } = {}) {
    const start = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.018, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.seGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  noise(duration, { when = 0, gain = 0.06, frequency = 460 } = {}) {
    const frameCount = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x5e1e;
    for (let index = 0; index < channel.length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      channel[index] = ((seed / 0xffffffff) * 2 - 1) * (1 - index / channel.length);
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const start = this.context.currentTime + when;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.seGain);
    source.start(start);
  }

  play(cue = "ui") {
    if (this.settings.muted || !AUDIO_CUES.includes(cue) || !this.ensureContext()) return;
    void this.unlock();

    switch (cue) {
      case "ui":
        this.tone(540, 0.055, { gain: 0.025, type: "sine", endFrequency: 620 });
        break;
      case "select":
        this.tone(360, 0.1, { gain: 0.045, endFrequency: 480 });
        break;
      case "confirm":
        this.tone(440, 0.15, { gain: 0.055 });
        this.tone(660, 0.2, { when: 0.065, gain: 0.05 });
        break;
      case "cancel":
        this.tone(390, 0.14, { gain: 0.045, endFrequency: 230 });
        break;
      case "error":
        this.tone(180, 0.24, { gain: 0.065, type: "sawtooth", endFrequency: 112 });
        break;
      case "save":
        this.tone(523.25, 0.22, { gain: 0.05 });
        this.tone(783.99, 0.3, { when: 0.09, gain: 0.045 });
        break;
      case "month":
        this.noise(0.18, { gain: 0.08, frequency: 300 });
        this.tone(293.66, 0.48, { gain: 0.065 });
        this.tone(440, 0.52, { when: 0.13, gain: 0.058 });
        this.tone(587.33, 0.72, { when: 0.28, gain: 0.052 });
        break;
      case "event":
        this.noise(0.32, { gain: 0.11, frequency: 620 });
        this.tone(174.61, 0.62, { gain: 0.085, type: "sawtooth", endFrequency: 130.81 });
        this.tone(466.16, 0.75, { when: 0.12, gain: 0.045 });
        break;
      case "war":
        this.noise(0.28, { gain: 0.1, frequency: 260 });
        this.tone(146.83, 0.85, { gain: 0.09, type: "sawtooth" });
        this.tone(220, 0.88, { when: 0.08, gain: 0.065, type: "triangle" });
        this.tone(293.66, 0.92, { when: 0.16, gain: 0.055, type: "triangle" });
        break;
      case "peace":
        this.tone(293.66, 0.32, { gain: 0.055 });
        this.tone(369.99, 0.4, { when: 0.12, gain: 0.052 });
        this.tone(440, 0.62, { when: 0.25, gain: 0.05 });
        break;
      case "reset":
        this.noise(0.26, { gain: 0.07, frequency: 240 });
        this.tone(260, 0.42, { gain: 0.06, endFrequency: 95 });
        break;
      default:
        break;
    }
  }
}

export function createGameAudio(options) {
  return new GameAudio(options);
}
