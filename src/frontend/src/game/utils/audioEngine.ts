/**
 * Digital Zindagi — Audio Engine v4 (Beep-Free Overhaul)
 *
 * FIX 4 — Complete sound engine rewrite:
 * - Theme music replaced: no more 120BPM sawtooth/noise beeping
 * - New theme: smooth sine-wave ambient hum at 220Hz through lowpass filter
 * - Theme only starts on explicit user click (window 'click' listener, once)
 * - All SFX guarded: only play when audioContext is 'running'
 * - resumeAudio() exposed for user-gesture handlers
 * - No tone() loops, no setInterval before user interaction
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _muted = false;
let _masterVolume = 0.75;

// Theme state
let themeRunning = false;
let themeOscillator: OscillatorNode | null = null;
let themeGain: GainNode | null = null;
let themeFilter: BiquadFilterNode | null = null;
// Secondary harmony oscillator
let themeOsc2: OscillatorNode | null = null;
let themeGain2: GainNode | null = null;

/**
 * Get or create an AudioContext.
 * If the existing context is 'closed', create a fresh one.
 */
function getCtx(): AudioContext {
  try {
    if (ctx && ctx.state === "closed") {
      ctx = null;
      masterGain = null;
    }
    if (!ctx) {
      ctx = new AudioContext();
    }
    return ctx;
  } catch (e) {
    console.warn("[AudioEngine] Failed to create AudioContext:", e);
    throw e;
  }
}

function getMaster(): GainNode {
  const c = getCtx();
  if (!masterGain) {
    masterGain = c.createGain();
    masterGain.gain.value = _masterVolume;
    masterGain.connect(c.destination);
  }
  return masterGain;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Guard: only proceed if audioContext is running */
function isReady(): boolean {
  try {
    return !!ctx && ctx.state === "running";
  } catch {
    return false;
  }
}

/** Resume AudioContext — MUST be called from a user gesture handler */
export function resumeAudio() {
  try {
    const c = getCtx();
    if (c.state === "suspended") void c.resume();
  } catch (e) {
    console.warn("[AudioEngine] resumeAudio failed:", e);
  }
}

/** Legacy compat */
export function setMasterVolume(v: number) {
  GameAudio.setMasterVolume(v);
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

function tone(
  freq: number,
  duration: number,
  vol: number,
  type: OscillatorType = "sine",
  freqEnd?: number,
  delayMs = 0,
) {
  // Guard: only play SFX when context is running
  if (!isReady()) return;
  try {
    const c = getCtx();
    const startAt = c.currentTime + delayMs / 1000;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqEnd, 10),
        startAt + duration,
      );
    }
    g.gain.setValueAtTime(clamp(vol, 0.001, 1), startAt);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.connect(g);
    g.connect(getMaster());
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  } catch {}
}

function noiseBurst(
  duration: number,
  vol: number,
  centerFreq: number,
  q = 1.5,
  filterType: BiquadFilterType = "bandpass",
  delayMs = 0,
) {
  // Guard: only play SFX when context is running
  if (!isReady()) return;
  try {
    const c = getCtx();
    const startAt = c.currentTime + delayMs / 1000;
    const bufSize = Math.ceil(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = centerFreq;
    filter.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(clamp(vol, 0.001, 1), startAt);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(getMaster());
    src.start(startAt);
    src.stop(startAt + duration + 0.02);
  } catch {}
}

// ─── Theme Music (FIX 4) ──────────────────────────────────────────────────────
// Replaces the 120BPM sawtooth/noise beeping loop.
// New approach: smooth continuous sine-wave ambient drone through lowpass filter.
// A3 (220Hz) + E4 (329Hz) harmony = pleasant, non-beeping background hum.

function stopThemeOscillators() {
  try {
    if (themeOscillator) {
      themeOscillator.stop();
      themeOscillator.disconnect();
    }
  } catch {}
  try {
    if (themeGain) themeGain.disconnect();
  } catch {}
  try {
    if (themeFilter) themeFilter.disconnect();
  } catch {}
  try {
    if (themeOsc2) {
      themeOsc2.stop();
      themeOsc2.disconnect();
    }
  } catch {}
  try {
    if (themeGain2) themeGain2.disconnect();
  } catch {}
  themeOscillator = null;
  themeGain = null;
  themeFilter = null;
  themeOsc2 = null;
  themeGain2 = null;
}

function startThemeOscillators() {
  try {
    const c = getCtx();

    // Primary ambient tone: A3 = 220Hz, sine, very quiet (0.08)
    themeOscillator = c.createOscillator();
    themeOscillator.type = "sine";
    themeOscillator.frequency.value = 220;

    // Lowpass filter at 800Hz — ensures smooth, non-buzzy output
    themeFilter = c.createBiquadFilter();
    themeFilter.type = "lowpass";
    themeFilter.frequency.value = 800;
    themeFilter.Q.value = 0.5;

    themeGain = c.createGain();
    themeGain.gain.value = 0;

    themeOscillator.connect(themeFilter);
    themeFilter.connect(themeGain);
    themeGain.connect(getMaster());
    themeOscillator.start();

    // Fade in gently over 1.5 seconds
    themeGain.gain.setValueAtTime(0, c.currentTime);
    themeGain.gain.linearRampToValueAtTime(0.08, c.currentTime + 1.5);

    // Secondary harmony: E4 = 329Hz, triangle, very quiet (0.04)
    themeOsc2 = c.createOscillator();
    themeOsc2.type = "triangle";
    themeOsc2.frequency.value = 329;

    themeGain2 = c.createGain();
    themeGain2.gain.value = 0;
    themeOsc2.connect(themeGain2);
    themeGain2.connect(getMaster());
    themeOsc2.start();

    // Fade in secondary slightly later
    themeGain2.gain.setValueAtTime(0, c.currentTime);
    themeGain2.gain.linearRampToValueAtTime(0.04, c.currentTime + 2.5);
  } catch (e) {
    console.warn("[AudioEngine] startThemeOscillators failed:", e);
    themeRunning = false;
  }
}

// ─── SFX ─────────────────────────────────────────────────────────────────────

export const SFX = {
  heroAttack(volume = 0.5) {
    if (!isReady()) return;
    try {
      const c = getCtx();
      const bufSize = Math.ceil(c.sampleRate * 0.08);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1000;
      const g = c.createGain();
      g.gain.setValueAtTime(clamp(volume * 0.6, 0.001, 1), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      src.connect(filter);
      filter.connect(g);
      g.connect(getMaster());
      src.start();
      src.stop(c.currentTime + 0.1);
    } catch {}
  },

  enemyHit(volume = 0.5) {
    if (!isReady()) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(80, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.12);
      const wave = c.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 255 - 1;
        curve[i] = Math.tanh(x * 4);
      }
      wave.curve = curve;
      const g = c.createGain();
      g.gain.setValueAtTime(clamp(volume * 0.8, 0.001, 1), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      osc.connect(wave);
      wave.connect(g);
      g.connect(getMaster());
      osc.start();
      osc.stop(c.currentTime + 0.14);
    } catch {}
  },

  waveStart(volume = 0.6) {
    if (!isReady()) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 1.5);
      const g = c.createGain();
      g.gain.setValueAtTime(clamp(volume * 0.4, 0.001, 1), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);
      osc.connect(g);
      g.connect(getMaster());
      osc.start();
      osc.stop(c.currentTime + 1.55);
    } catch {}
  },

  powerUp(volume = 0.3) {
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone(freq, 0.12, volume, "sine", undefined, i * 120);
    });
  },

  coinCollect(volume = 0.5) {
    if (!isReady()) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1047, c.currentTime);
      const g = c.createGain();
      g.gain.setValueAtTime(clamp(volume * 0.3, 0.001, 1), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      osc.connect(g);
      g.connect(getMaster());
      osc.start();
      osc.stop(c.currentTime + 0.27);
    } catch {}
  },

  megaCoinCollect(volume = 0.6) {
    SFX.coinCollect(volume);
    setTimeout(() => SFX.powerUp(volume * 0.5), 120);
  },

  gameOver(volume = 0.7) {
    [784, 659, 523, 392].forEach((freq, i) => {
      tone(freq, 0.4, volume * 0.35, "triangle", undefined, i * 400);
    });
    noiseBurst(0.6, volume * 0.2, 80, 1, "lowpass", 1600);
  },

  heroHit(volume = 0.5) {
    tone(150, 0.2, volume * 0.6, "sawtooth");
    setTimeout(() => tone(100, 0.15, volume * 0.4, "sawtooth"), 50);
    noiseBurst(0.1, volume * 0.3, 300, 3, "bandpass", 0);
  },

  enemyDie(volume = 0.5) {
    noiseBurst(0.2, volume * 0.5, 400, 1);
    noiseBurst(0.15, volume * 0.35, 200, 1.5, "bandpass", 30);
    noiseBurst(0.12, volume * 0.25, 600, 2, "bandpass", 60);
  },

  houndBite(volume = 0.5) {
    SFX.enemyHit(volume * 0.8);
  },

  demonShoot(volume = 0.4) {
    tone(800, 0.15, volume * 0.3, "triangle", 200);
    noiseBurst(0.06, volume * 0.15, 1200, 2);
  },

  projectileHit(volume = 0.4) {
    noiseBurst(0.08, volume * 0.4, 400, 2);
  },

  storePurchase(volume = 0.5) {
    tone(200, 0.4, volume * 0.2, "sine", 600);
    setTimeout(() => tone(300, 0.3, volume * 0.15, "sine", 800), 100);
  },

  combatPulse(volume = 0.3) {
    tone(55, 0.15, volume * 0.5, "sawtooth");
    setTimeout(() => tone(55, 0.1, volume * 0.3, "sawtooth"), 200);
  },

  /** @deprecated kept for legacy callers */
  startAmbient(volume = 0.2): () => void {
    GameAudio.playTheme();
    GameAudio.setMasterVolume(volume + 0.4);
    return () => GameAudio.stopTheme();
  },
};

// ─── Main GameAudio singleton ─────────────────────────────────────────────────

export const GameAudio = {
  get isMuted() {
    return _muted;
  },

  /** FIX 4: startTheme exposed for window click listener pattern */
  startTheme() {
    GameAudio.playTheme();
  },

  init() {
    // Do NOT call resumeAudio() here — must be triggered by user gesture
  },

  playTheme() {
    if (themeRunning) return;
    themeRunning = true;
    try {
      resumeAudio();
      startThemeOscillators();
    } catch (e) {
      console.warn("[AudioEngine] playTheme failed:", e);
      themeRunning = false;
    }
  },

  stopTheme() {
    if (!themeRunning) return;
    themeRunning = false;
    try {
      // Fade out before stopping to avoid click/pop
      if (themeGain && ctx) {
        themeGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      }
      if (themeGain2 && ctx) {
        themeGain2.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      }
      setTimeout(() => stopThemeOscillators(), 500);
    } catch {
      stopThemeOscillators();
    }
  },

  play(sfxName: string, vol = 0.5) {
    if (_muted) return;
    const v = clamp(vol, 0, 1);
    switch (sfxName) {
      case "attack":
        SFX.heroAttack(v);
        break;
      case "hit":
        SFX.enemyDie(v);
        break;
      case "coin":
        SFX.coinCollect(v);
        break;
      case "heal":
        SFX.storePurchase(v);
        break;
      case "spawn":
        noiseBurst(0.3, v * 0.4, 600, 0.8);
        tone(800, 0.3, v * 0.2, "sine", 100);
        break;
      case "wave":
        SFX.waveStart(v);
        break;
      case "damage":
        SFX.heroHit(v);
        break;
      default:
        break;
    }
  },

  setMasterVolume(v: number) {
    _masterVolume = clamp(v, 0, 1);
    try {
      const m = getMaster();
      m.gain.setTargetAtTime(_masterVolume, getCtx().currentTime, 0.05);
    } catch {}
  },

  toggleMute() {
    _muted = !_muted;
    try {
      const m = getMaster();
      const c = getCtx();
      m.gain.setTargetAtTime(_muted ? 0 : _masterVolume, c.currentTime, 0.05);
    } catch {}
    return _muted;
  },
};
