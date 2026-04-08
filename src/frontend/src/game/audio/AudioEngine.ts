/**
 * AudioEngine — Web Audio API horror ambient sound system.
 * All sounds are procedurally generated — zero audio files, zero copyright.
 * Audio context ONLY starts after first user interaction.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _masterVolume = 0.7;
let themeRunning = false;
let themeNodes: AudioNode[] = [];
let themeIntervalId: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  try {
    if (ctx && ctx.state === "closed") {
      ctx = null;
      masterGain = null;
    }
    if (!ctx) ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function getMaster(): GainNode | null {
  const c = getCtx();
  if (!c) return null;
  if (!masterGain) {
    masterGain = c.createGain();
    masterGain.gain.value = _masterVolume;
    masterGain.connect(c.destination);
  }
  return masterGain;
}

function isReady(): boolean {
  try {
    return !!ctx && ctx.state === "running";
  } catch {
    return false;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function resumeAudio() {
  try {
    const c = getCtx();
    if (c && c.state === "suspended") void c.resume();
  } catch {}
}

// ─── Horror Theme Music ───────────────────────────────────────────────────────

function createHorrorDrone() {
  const c = getCtx();
  const m = getMaster();
  if (!c || !m) return;

  // Sub-bass drone at 55Hz
  const osc1 = c.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;

  // LFO for slow pulse
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.1;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 15;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  const g1 = c.createGain();
  g1.gain.setValueAtTime(0, c.currentTime);
  g1.gain.linearRampToValueAtTime(0.12, c.currentTime + 3);
  osc1.connect(g1);
  g1.connect(m);

  // High-pitched unsettling scrape
  const osc2 = c.createOscillator();
  osc2.type = "sawtooth";
  osc2.frequency.value = 880;
  const filter2 = c.createBiquadFilter();
  filter2.type = "lowpass";
  filter2.frequency.value = 400;

  const lfo2 = c.createOscillator();
  lfo2.type = "sine";
  lfo2.frequency.value = 3.5;
  const lfoGain2 = c.createGain();
  lfoGain2.gain.value = 0.04;
  lfo2.connect(lfoGain2);
  lfoGain2.connect(osc2.frequency);

  const g2 = c.createGain();
  g2.gain.setValueAtTime(0, c.currentTime);
  g2.gain.linearRampToValueAtTime(0.03, c.currentTime + 4);
  osc2.connect(filter2);
  filter2.connect(g2);
  g2.connect(m);

  // Mid-range ominous tone
  const osc3 = c.createOscillator();
  osc3.type = "triangle";
  osc3.frequency.value = 110;
  const g3 = c.createGain();
  g3.gain.setValueAtTime(0, c.currentTime);
  g3.gain.linearRampToValueAtTime(0.06, c.currentTime + 2);
  osc3.connect(g3);
  g3.connect(m);

  for (const o of [osc1, lfo, lfo2, osc2, osc3]) {
    try {
      o.start();
    } catch {}
  }
  themeNodes = [
    osc1,
    lfo,
    lfoGain,
    g1,
    osc2,
    filter2,
    lfoGain2,
    g2,
    osc3,
    g3,
    lfo2,
  ];
}

function playMinorNote() {
  if (!isReady()) return;
  const c = getCtx();
  const m = getMaster();
  if (!c || !m) return;
  const notes = [110, 130.8, 146.8, 155.6, 196]; // A2, C3, D3, Eb3, G3
  const freq = notes[Math.floor(Math.random() * notes.length)];
  try {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.5);
    osc.connect(g);
    g.connect(m);
    osc.start();
    osc.stop(c.currentTime + 2.7);
  } catch {}
}

// ─── SFX ─────────────────────────────────────────────────────────────────────

function tone(
  freq: number,
  dur: number,
  vol: number,
  type: OscillatorType = "sine",
  freqEnd?: number,
  delayMs = 0,
) {
  if (!isReady()) return;
  try {
    const c = getCtx()!;
    const startAt = c.currentTime + delayMs / 1000;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (freqEnd !== undefined)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freqEnd, 10),
        startAt + dur,
      );
    g.gain.setValueAtTime(clamp(vol, 0.001, 1), startAt);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
    osc.connect(g);
    g.connect(getMaster()!);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);
  } catch {}
}

function noiseBurst(
  dur: number,
  vol: number,
  centerFreq: number,
  q = 1.5,
  filterType: BiquadFilterType = "bandpass",
  delayMs = 0,
) {
  if (!isReady()) return;
  try {
    const c = getCtx()!;
    const startAt = c.currentTime + delayMs / 1000;
    const bufSize = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = centerFreq;
    filter.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(clamp(vol, 0.001, 1), startAt);
    g.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(getMaster()!);
    src.start(startAt);
    src.stop(startAt + dur + 0.02);
  } catch {}
}

export const SFX = {
  gunshot(vol = 0.4) {
    noiseBurst(0.08, vol * 0.7, 900, 1, "highpass");
    tone(80, 0.1, vol * 0.5, "sine", 20);
  },
  creatureDie(vol = 0.4) {
    noiseBurst(0.2, vol * 0.6, 400, 1);
    tone(200, 0.15, vol * 0.4, "sawtooth", 50);
  },
  playerDamage(vol = 0.5) {
    tone(180, 0.2, vol * 0.6, "sawtooth");
    tone(160, 0.2, vol * 0.5, "sawtooth", undefined, 30);
  },
  coinCollect(vol = 0.4) {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.12, vol * 0.35, "sine", undefined, i * 60),
    );
  },
  levelComplete(vol = 0.5) {
    [440, 554, 659, 880].forEach((f, i) =>
      tone(f, 0.25, vol * 0.4, "sine", undefined, i * 200),
    );
  },
  bossRoar(vol = 0.6) {
    tone(40, 0.8, vol * 0.7, "sawtooth", 25);
    noiseBurst(0.4, vol * 0.5, 60, 0.5, "lowpass");
  },
  waveStart(vol = 0.5) {
    tone(110, 0.6, vol * 0.4, "sawtooth", 880);
  },
  storePurchase(vol = 0.4) {
    [330, 440, 550].forEach((f, i) =>
      tone(f, 0.2, vol * 0.3, "sine", undefined, i * 80),
    );
  },
  gameOver(vol = 0.6) {
    [784, 659, 523, 392].forEach((f, i) =>
      tone(f, 0.35, vol * 0.35, "triangle", undefined, i * 350),
    );
  },
  heroAttack(vol = 0.4) {
    SFX.gunshot(vol);
  },
  enemyHit(vol = 0.3) {
    noiseBurst(0.05, vol * 0.5, 600, 2);
  },
  enemyDie(vol = 0.4) {
    SFX.creatureDie(vol);
  },
  startAmbient(vol = 0.2): () => void {
    GameAudio.playTheme();
    GameAudio.setMasterVolume(vol + 0.4);
    return () => GameAudio.stopTheme();
  },
};

export const GameAudio = {
  get isMuted() {
    return _masterVolume === 0;
  },

  init() {},

  playTheme() {
    if (themeRunning) return;
    themeRunning = true;
    try {
      resumeAudio();
      createHorrorDrone();
      if (themeIntervalId) clearInterval(themeIntervalId);
      themeIntervalId = setInterval(
        () => {
          if (isReady()) playMinorNote();
        },
        3500 + Math.random() * 2000,
      );
    } catch {
      themeRunning = false;
    }
  },

  stopTheme() {
    if (!themeRunning) return;
    themeRunning = false;
    if (themeIntervalId) {
      clearInterval(themeIntervalId);
      themeIntervalId = null;
    }
    for (const n of themeNodes) {
      try {
        (n as OscillatorNode).stop?.();
        n.disconnect();
      } catch {}
    }
    themeNodes = [];
  },

  startTheme() {
    GameAudio.playTheme();
  },

  play(name: string, vol = 0.5) {
    const v = clamp(vol, 0, 1);
    switch (name) {
      case "attack":
        SFX.gunshot(v);
        break;
      case "hit":
        SFX.creatureDie(v);
        break;
      case "coin":
        SFX.coinCollect(v);
        break;
      case "heal":
        SFX.storePurchase(v);
        break;
      case "wave":
        SFX.waveStart(v);
        break;
      case "damage":
        SFX.playerDamage(v);
        break;
    }
  },

  setMasterVolume(v: number) {
    _masterVolume = clamp(v, 0, 1);
    try {
      const m = getMaster();
      if (m && ctx)
        m.gain.setTargetAtTime(_masterVolume, ctx.currentTime, 0.05);
    } catch {}
  },

  toggleMute() {
    const newVol = _masterVolume > 0 ? 0 : 0.7;
    GameAudio.setMasterVolume(newVol);
    return newVol === 0;
  },
};
