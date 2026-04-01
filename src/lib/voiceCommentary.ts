/**
 * Voice Commentary Engine — uses Web Speech API (SpeechSynthesis)
 * and synthesized crowd/audience sounds via Web Audio API.
 * No external assets or API keys needed.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ─── Voice Commentary via SpeechSynthesis ────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakCommentary(text: string, enabled: boolean) {
  if (!enabled || !("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean emoji for speech
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.15;
  utterance.pitch = 1.05;
  utterance.volume = 0.85;

  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Daniel") || v.name.includes("Samantha"))
  ) || voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopVoice() {
  window.speechSynthesis?.cancel();
  currentUtterance = null;
}

// ─── Crowd / Audience Sounds ─────────────────────────────────────

function createFilteredNoise(duration: number, freq: number, Q: number, volume: number) {
  try {
    const ctx = getCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = Q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

function playCheerTone(freq: number, duration: number, delay: number, volume: number) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.frequency.linearRampToValueAtTime(freq * 1.2, ctx.currentTime + delay + duration * 0.3);
    osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + delay + duration);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Audio not supported
  }
}

export const CrowdSFX = {
  /** Roaring crowd cheer — for sixes and big moments */
  roar() {
    createFilteredNoise(1.8, 800, 0.5, 0.12);
    createFilteredNoise(1.8, 1200, 0.8, 0.08);
    // Layered cheer tones
    for (let i = 0; i < 5; i++) {
      const f = 300 + Math.random() * 400;
      playCheerTone(f, 0.6, Math.random() * 0.3, 0.03);
    }
  },

  /** Medium crowd excitement — for fours */
  cheer() {
    createFilteredNoise(1.2, 900, 0.6, 0.08);
    createFilteredNoise(1.0, 600, 0.4, 0.06);
    for (let i = 0; i < 3; i++) {
      playCheerTone(400 + Math.random() * 300, 0.4, Math.random() * 0.2, 0.025);
    }
  },

  /** Soft applause — for singles and doubles */
  applause() {
    createFilteredNoise(0.8, 3000, 1.5, 0.04);
    createFilteredNoise(0.6, 5000, 2, 0.03);
  },

  /** Crowd gasp — for wickets */
  gasp() {
    createFilteredNoise(0.5, 400, 0.3, 0.1);
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio not supported
    }
    // Stunned silence then murmur
    setTimeout(() => createFilteredNoise(1.0, 300, 0.3, 0.04), 400);
  },

  /** Dot ball tension — quiet crowd */
  tension() {
    createFilteredNoise(0.4, 200, 0.2, 0.02);
  },

  /** Victory celebration */
  victory() {
    createFilteredNoise(2.5, 800, 0.4, 0.15);
    createFilteredNoise(2.5, 1500, 0.6, 0.1);
    for (let i = 0; i < 8; i++) {
      const f = 250 + Math.random() * 500;
      playCheerTone(f, 0.8, i * 0.15, 0.04);
    }
  },

  /** Stadium horn / air horn */
  horn() {
    try {
      const ctx = getCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      osc1.frequency.value = 220;
      osc2.frequency.value = 277;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio not supported
    }
  },

  /** Ambient stadium murmur — looping background */
  ambientMurmur(durationSec = 3) {
    createFilteredNoise(durationSec, 350, 0.15, 0.015);
    createFilteredNoise(durationSec, 600, 0.2, 0.01);
  },
};

/**
 * Play appropriate crowd sound based on game event
 */
export function playCrowdForResult(runs: number | "OUT", isBatting: boolean, isGameOver: boolean, result?: string | null) {
  if (isGameOver) {
    if (result === "win") {
      CrowdSFX.victory();
      setTimeout(() => CrowdSFX.horn(), 500);
    } else {
      CrowdSFX.tension();
    }
    return;
  }

  if (runs === "OUT") {
    if (isBatting) {
      CrowdSFX.gasp();
    } else {
      CrowdSFX.cheer();
    }
    return;
  }

  const absRuns = Math.abs(runs);
  if (absRuns === 6) {
    if (isBatting) {
      CrowdSFX.roar();
      setTimeout(() => CrowdSFX.horn(), 300);
    } else {
      CrowdSFX.gasp();
    }
  } else if (absRuns === 4) {
    if (isBatting) CrowdSFX.cheer();
    else CrowdSFX.tension();
  } else if (absRuns >= 1) {
    CrowdSFX.applause();
  } else {
    CrowdSFX.tension();
  }
}
