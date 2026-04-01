// Synthesized sound effects using Web Audio API — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

function playNoise(duration: number, volume = 0.08) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Audio not supported
  }
}

function playChord(freqs: number[], duration: number, type: OscillatorType = "sine", volume = 0.08) {
  freqs.forEach(f => playTone(f, duration, type, volume / freqs.length));
}

export const SFX = {
  /** Quick tap / UI click */
  tap() {
    playTone(800, 0.06, "square", 0.08);
  },

  /** Ball played — bat hitting ball */
  batHit() {
    playNoise(0.08, 0.12);
    playTone(400, 0.12, "triangle", 0.1);
  },

  /** Runs scored — ascending chirp */
  runs(count: number) {
    const base = 500;
    for (let i = 0; i < Math.min(count, 6); i++) {
      setTimeout(() => playTone(base + i * 80, 0.1, "sine", 0.1), i * 60);
    }
  },

  /** OUT! — dramatic descending */
  out() {
    playTone(600, 0.15, "sawtooth", 0.12);
    setTimeout(() => playTone(400, 0.15, "sawtooth", 0.1), 100);
    setTimeout(() => playTone(250, 0.3, "sawtooth", 0.08), 200);
    setTimeout(() => playNoise(0.2, 0.1), 150);
  },

  /** Six — triumphant fanfare */
  six() {
    playTone(523, 0.1, "square", 0.1);
    setTimeout(() => playTone(659, 0.1, "square", 0.1), 100);
    setTimeout(() => playTone(784, 0.15, "square", 0.12), 200);
    setTimeout(() => playTone(1047, 0.3, "square", 0.15), 300);
    // Extra flourish
    setTimeout(() => playChord([1047, 1318, 1568], 0.4, "sine", 0.1), 450);
  },

  /** Four — quick double chirp */
  four() {
    playTone(600, 0.1, "triangle", 0.12);
    setTimeout(() => playTone(800, 0.15, "triangle", 0.12), 120);
    setTimeout(() => playTone(1000, 0.1, "triangle", 0.08), 220);
  },

  /** Win — celebratory melody */
  win() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1318];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.18, "sine", 0.12), i * 130));
    // Victory chord
    setTimeout(() => playChord([523, 659, 784, 1047], 0.6, "sine", 0.15), notes.length * 130);
  },

  /** Loss — sad descending */
  loss() {
    playTone(400, 0.2, "sine", 0.1);
    setTimeout(() => playTone(350, 0.2, "sine", 0.08), 200);
    setTimeout(() => playTone(300, 0.4, "sine", 0.06), 400);
  },

  /** Defence — shield sound */
  defence() {
    playTone(300, 0.08, "triangle", 0.06);
    playTone(600, 0.08, "triangle", 0.06);
  },

  /** New innings / game start */
  gameStart() {
    playTone(440, 0.1, "sine", 0.1);
    setTimeout(() => playTone(554, 0.1, "sine", 0.1), 150);
    setTimeout(() => playTone(659, 0.2, "sine", 0.12), 300);
  },

  /** Countdown tick */
  tick() {
    playTone(1000, 0.04, "square", 0.06);
  },

  /** Toss — odd/even selection click */
  tossSelect() {
    playTone(660, 0.08, "square", 0.1);
    setTimeout(() => playTone(880, 0.06, "square", 0.08), 60);
  },

  /** Toss — hand number pick */
  tossHandPick() {
    playTone(500, 0.06, "triangle", 0.1);
    playNoise(0.04, 0.06);
  },

  /** Toss — dramatic reveal build-up */
  tossRevealBuild() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => playTone(400 + i * 100, 0.08, "square", 0.06 + i * 0.01), i * 80);
    }
  },

  /** Toss — reveal result */
  tossReveal() {
    playTone(523, 0.1, "square", 0.12);
    setTimeout(() => playTone(784, 0.1, "square", 0.12), 100);
    setTimeout(() => playTone(1047, 0.2, "square", 0.15), 200);
    setTimeout(() => playNoise(0.15, 0.06), 250);
  },

  /** Toss won — triumphant */
  tossWon() {
    playChord([523, 659, 784], 0.15, "sine", 0.12);
    setTimeout(() => playChord([659, 784, 1047], 0.2, "sine", 0.15), 200);
    setTimeout(() => playChord([784, 1047, 1318], 0.3, "sine", 0.12), 400);
  },

  /** Toss lost — descending */
  tossLost() {
    playTone(500, 0.15, "sine", 0.1);
    setTimeout(() => playTone(400, 0.2, "sine", 0.08), 150);
  },

  /** Firework whoosh */
  fireworkWhoosh() {
    try {
      const ctx = getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);
      filter.Q.value = 2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  },

  /** Firework explosion pop */
  fireworkPop() {
    playNoise(0.15, 0.15);
    playTone(200 + Math.random() * 300, 0.1, "sine", 0.08);
  },

  /** Pre-match ceremony horn */
  ceremonyHorn() {
    try {
      const ctx = getCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      osc1.frequency.value = 220;
      osc2.frequency.value = 330;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.8);
      osc2.stop(ctx.currentTime + 1.8);
    } catch {}
  },

  /** Post-match victory anthem */
  victoryAnthem() {
    const melody = [523, 659, 784, 880, 1047, 880, 1047, 1318, 1047];
    melody.forEach((n, i) => {
      setTimeout(() => {
        playTone(n, 0.2, "sine", 0.1);
        if (i % 2 === 0) playTone(n / 2, 0.25, "triangle", 0.05);
      }, i * 180);
    });
    setTimeout(() => playChord([523, 659, 784, 1047], 0.8, "sine", 0.12), melody.length * 180);
  },
};

/** Haptic feedback using Vibration API */
export const Haptics = {
  light() { navigator?.vibrate?.(10); },
  medium() { navigator?.vibrate?.(25); },
  heavy() { navigator?.vibrate?.(50); },
  success() { navigator?.vibrate?.([15, 50, 15]); },
  error() { navigator?.vibrate?.([40, 30, 40]); },
  out() { navigator?.vibrate?.([50, 30, 80]); },
  firework() { navigator?.vibrate?.([10, 20, 10, 20, 30]); },
};
