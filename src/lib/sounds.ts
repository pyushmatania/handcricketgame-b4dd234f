// Redesigned Sound Effects — warm, musical tones using Web Audio API

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ─── Helpers ─────────────────────────────────────────────────────

function playTone(
  freq: number, duration: number, type: OscillatorType = "sine",
  volume = 0.12, delay = 0, detune = 0
) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch { /* Audio not supported */ }
}

function playChord(freqs: number[], duration: number, type: OscillatorType = "sine", volume = 0.06, delay = 0) {
  freqs.forEach(f => playTone(f, duration, type, volume / freqs.length, delay));
}

function playNote(freq: number, dur: number, delay = 0, vol = 0.1) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    // Soft attack + decay envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.setValueAtTime(vol, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch { /* Audio not supported */ }
}

function playPercussion(freq: number, dur: number, vol = 0.08, delay = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch { /* Audio not supported */ }
}

function playSoftNoise(duration: number, volume = 0.04, delay = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // High-pass filter to soften the noise
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
    source.stop(t + duration);
  } catch { /* Audio not supported */ }
}

// ─── SFX ─────────────────────────────────────────────────────────

export const SFX = {
  /** Quick UI tap — soft xylophone click */
  tap() {
    playNote(1200, 0.06, 0, 0.06);
    playNote(1800, 0.04, 0.01, 0.03);
  },

  /** Bat hitting ball — crisp wooden thwack */
  batHit() {
    playPercussion(800, 0.08, 0.1);
    playSoftNoise(0.06, 0.06);
    playNote(300, 0.06, 0.02, 0.04);
  },

  /** Runs scored — cheerful ascending marimba */
  runs(count: number) {
    const scale = [523, 587, 659, 698, 784, 880]; // C5 major scale
    for (let i = 0; i < Math.min(count, 6); i++) {
      playNote(scale[i], 0.12, i * 0.08, 0.08);
    }
  },

  /** OUT! — dramatic low brass + timpani */
  out() {
    // Timpani hit
    playPercussion(120, 0.4, 0.12);
    // Descending brass
    playTone(400, 0.2, "sawtooth", 0.06, 0.05);
    playTone(300, 0.25, "sawtooth", 0.05, 0.2);
    playTone(200, 0.4, "sawtooth", 0.04, 0.35);
    // Cymbal crash (soft noise)
    playSoftNoise(0.3, 0.05, 0.1);
  },

  /** SIX — triumphant stadium horn fanfare */
  six() {
    // Rising fanfare: C-E-G-C
    playNote(523, 0.15, 0, 0.1);
    playNote(659, 0.15, 0.12, 0.1);
    playNote(784, 0.18, 0.24, 0.12);
    playNote(1047, 0.3, 0.38, 0.14);
    // Sparkle chord on top
    playChord([1047, 1318, 1568], 0.5, "sine", 0.08, 0.55);
    // Soft celebration noise
    playSoftNoise(0.2, 0.03, 0.6);
  },

  /** FOUR — quick boundary chirp */
  four() {
    playNote(659, 0.12, 0, 0.1);
    playNote(784, 0.12, 0.1, 0.1);
    playNote(1047, 0.18, 0.2, 0.08);
  },

  /** Win — victory melody + triumph chord */
  win() {
    const melody = [523, 587, 659, 784, 880, 1047, 1175, 1318];
    melody.forEach((n, i) => playNote(n, 0.2, i * 0.12, 0.1));
    // Big triumph chord
    playChord([523, 659, 784, 1047], 0.8, "sine", 0.1, melody.length * 0.12);
  },

  /** Loss — gentle sad descend */
  loss() {
    playNote(440, 0.25, 0, 0.07);
    playNote(392, 0.25, 0.2, 0.06);
    playNote(330, 0.4, 0.4, 0.05);
  },

  /** Defence — soft shield ping */
  defence() {
    playNote(600, 0.06, 0, 0.05);
    playNote(900, 0.05, 0.03, 0.03);
  },

  /** New innings / game start — warm welcome chime */
  gameStart() {
    playNote(440, 0.15, 0, 0.08);
    playNote(554, 0.15, 0.15, 0.08);
    playNote(659, 0.25, 0.3, 0.1);
  },

  /** Countdown tick — subtle clock */
  tick() {
    playNote(1200, 0.03, 0, 0.05);
  },

  /** Toss — selection click */
  tossSelect() {
    playNote(880, 0.06, 0, 0.08);
    playNote(1100, 0.05, 0.05, 0.06);
  },

  /** Toss — hand number pick */
  tossHandPick() {
    playNote(660, 0.06, 0, 0.08);
    playPercussion(400, 0.04, 0.04);
  },

  /** Toss — dramatic build-up */
  tossRevealBuild() {
    for (let i = 0; i < 6; i++) {
      playNote(400 + i * 100, 0.08, i * 0.08, 0.04 + i * 0.01);
    }
  },

  /** Toss — reveal result */
  tossReveal() {
    playNote(523, 0.12, 0, 0.1);
    playNote(784, 0.12, 0.1, 0.1);
    playNote(1047, 0.25, 0.2, 0.12);
  },

  /** Toss won */
  tossWon() {
    playChord([523, 659, 784], 0.2, "sine", 0.1, 0);
    playChord([659, 784, 1047], 0.25, "sine", 0.1, 0.2);
    playChord([784, 1047, 1318], 0.35, "sine", 0.08, 0.4);
  },

  /** Toss lost */
  tossLost() {
    playNote(500, 0.2, 0, 0.07);
    playNote(400, 0.25, 0.15, 0.05);
  },

  /** Match invite notification */
  matchInvite() {
    playNote(880, 0.1, 0, 0.1);
    playNote(1047, 0.1, 0.1, 0.12);
    playNote(1318, 0.12, 0.2, 0.14);
    playNote(1047, 0.08, 0.35, 0.1);
    playNote(1318, 0.15, 0.43, 0.14);
  },

  /** Firework whoosh */
  fireworkWhoosh() {
    try {
      const ctx = getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 0.4);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.25);
      filter.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch { /* Audio not supported */ }
  },

  /** Firework pop */
  fireworkPop() {
    playSoftNoise(0.12, 0.1);
    playNote(300 + Math.random() * 400, 0.08, 0.02, 0.06);
  },

  /** Pre-match ceremony horn — warm brass */
  ceremonyHorn() {
    try {
      const ctx = getCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sine"; // softer than sawtooth
      osc2.type = "triangle";
      osc1.frequency.value = 220;
      osc2.frequency.value = 330;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
    } catch { /* Audio not supported */ }
  },

  /** Post-match victory anthem */
  victoryAnthem() {
    const melody = [523, 659, 784, 880, 1047, 880, 1047, 1318, 1047];
    melody.forEach((n, i) => {
      playNote(n, 0.22, i * 0.16, 0.08);
      if (i % 2 === 0) playNote(n / 2, 0.28, i * 0.16, 0.03);
    });
    playChord([523, 659, 784, 1047], 0.8, "sine", 0.08, melody.length * 0.16);
  },
  /** Navigation tab switch — soft pop */
  navTap() {
    playNote(880, 0.04, 0, 0.05);
    playNote(1320, 0.03, 0.02, 0.03);
  },

  /** Reward claim — sparkle cascade */
  rewardClaim() {
    playNote(784, 0.1, 0, 0.1);
    playNote(988, 0.1, 0.08, 0.1);
    playNote(1175, 0.12, 0.16, 0.12);
    playNote(1568, 0.2, 0.26, 0.1);
    playChord([1175, 1568, 1976], 0.4, "sine", 0.06, 0.4);
  },

  /** Coin spend — metallic clink */
  coinSpend() {
    playNote(1400, 0.06, 0, 0.08);
    playNote(1000, 0.08, 0.04, 0.06);
    playNote(700, 0.1, 0.1, 0.04);
  },

  /** Chest open — dramatic unlock */
  chestOpen() {
    playPercussion(200, 0.15, 0.1);
    playNote(523, 0.15, 0.1, 0.1);
    playNote(659, 0.15, 0.2, 0.1);
    playNote(784, 0.15, 0.3, 0.12);
    playNote(1047, 0.3, 0.4, 0.14);
    playSoftNoise(0.2, 0.04, 0.35);
  },

  /** Toggle switch — light click */
  toggle() {
    playNote(1100, 0.03, 0, 0.06);
  },

  /** Error / denied — descending buzz */
  error() {
    playNote(400, 0.12, 0, 0.08);
    playNote(300, 0.15, 0.1, 0.06);
  },

  /** Level up / tier unlock — ascending fanfare */
  levelUp() {
    const notes = [523, 659, 784, 1047, 1318];
    notes.forEach((n, i) => playNote(n, 0.18, i * 0.1, 0.1));
    playChord([1047, 1318, 1568], 0.6, "sine", 0.08, notes.length * 0.1);
  },

  /** Streak milestone — warm celebration */
  streakMilestone() {
    playNote(659, 0.12, 0, 0.08);
    playNote(784, 0.12, 0.1, 0.08);
    playNote(988, 0.15, 0.2, 0.1);
    playNote(1175, 0.2, 0.32, 0.1);
  },
};

/** Haptic feedback using Vibration API */
export const Haptics = {
  light() { navigator?.vibrate?.(8); },
  medium() { navigator?.vibrate?.(20); },
  heavy() { navigator?.vibrate?.(40); },
  success() { navigator?.vibrate?.([12, 40, 12]); },
  error() { navigator?.vibrate?.([30, 25, 30]); },
  out() { navigator?.vibrate?.([40, 25, 60]); },
  firework() { navigator?.vibrate?.([8, 15, 8, 15, 20]); },
  matchInvite() { navigator?.vibrate?.([25, 40, 25, 40, 50]); },
  rewardClaim() { navigator?.vibrate?.([15, 30, 15, 30, 25]); },
  coinSpend() { navigator?.vibrate?.([10, 20, 10]); },
  chestOpen() { navigator?.vibrate?.([20, 30, 40, 30, 60]); },
  navTap() { navigator?.vibrate?.(6); },
};
