// Ambient stadium atmosphere — generative Web Audio loop
// Layers: crowd murmur, distant chanting rhythm, soft pad drone

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let running = false;
let noiseSource: AudioBufferSourceNode | null = null;
let droneOsc1: OscillatorNode | null = null;
let droneOsc2: OscillatorNode | null = null;
let chantInterval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function createCrowdNoise(ac: AudioContext, dest: AudioNode) {
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Brown noise (smoother than white)
      d[i] = (i === 0 ? 0 : d[i - 1]) + (Math.random() * 2 - 1) * 0.04;
      d[i] *= 0.95; // decay
    }
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  // Bandpass to sound like distant crowd murmur
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 400;
  bp.Q.value = 0.6;

  const g = ac.createGain();
  g.gain.value = 0.35;

  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start();
  return src;
}

function createDrone(ac: AudioContext, dest: AudioNode) {
  // Warm pad: two detuned sine oscillators
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  o1.type = "sine";
  o2.type = "sine";
  o1.frequency.value = 110; // A2
  o2.frequency.value = 165; // E3 (fifth)
  o2.detune.value = 5;

  const g = ac.createGain();
  g.gain.value = 0.08;

  o1.connect(g);
  o2.connect(g);
  g.connect(dest);
  o1.start();
  o2.start();
  return { o1, o2 };
}

function startChantPulse(ac: AudioContext, dest: AudioNode) {
  // Periodic soft "crowd swell" every ~3s
  const pulse = () => {
    try {
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = 220 + Math.random() * 60;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 2.5);
    } catch { /* ignore */ }
  };
  const id = setInterval(pulse, 2500 + Math.random() * 1500);
  pulse();
  return id;
}

export function startAmbientStadium(volume = 0.3) {
  if (running) {
    setAmbientVolume(volume);
    return;
  }
  try {
    const ac = getCtx();
    masterGain = ac.createGain();
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
    masterGain.connect(ac.destination);

    noiseSource = createCrowdNoise(ac, masterGain);
    const drone = createDrone(ac, masterGain);
    droneOsc1 = drone.o1;
    droneOsc2 = drone.o2;
    chantInterval = startChantPulse(ac, masterGain);
    running = true;
  } catch { /* Audio not supported */ }
}

export function stopAmbientStadium() {
  if (!running) return;
  try {
    noiseSource?.stop();
    droneOsc1?.stop();
    droneOsc2?.stop();
    if (chantInterval) clearInterval(chantInterval);
  } catch { /* ignore */ }
  noiseSource = null;
  droneOsc1 = null;
  droneOsc2 = null;
  chantInterval = null;
  masterGain = null;
  running = false;
}

export function setAmbientVolume(v: number) {
  if (masterGain) {
    baseVolume = Math.max(0, Math.min(1, v));
    if (!boosting) {
      masterGain.gain.setTargetAtTime(baseVolume, masterGain.context.currentTime, 0.1);
    }
  }
}

let baseVolume = 0.3;
let boosting = false;
let boostTimeout: ReturnType<typeof setTimeout> | null = null;

/** Temporarily boost ambient volume for a crowd roar effect */
export function crowdRoar(intensity: "four" | "six" = "six") {
  if (!masterGain || !running) return;
  const peak = intensity === "six" ? Math.min(baseVolume * 3.5, 1) : Math.min(baseVolume * 2.5, 1);
  const duration = intensity === "six" ? 2.5 : 1.8;
  const ac = masterGain.context;

  boosting = true;
  if (boostTimeout) clearTimeout(boostTimeout);

  // Quick ramp up
  masterGain.gain.cancelScheduledValues(ac.currentTime);
  masterGain.gain.setTargetAtTime(peak, ac.currentTime, 0.08);

  // Also add a burst of extra crowd noise
  try {
    const burstLen = Math.floor(ac.sampleRate * duration);
    const buf = ac.createBuffer(2, burstLen, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < burstLen; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.6;
      }
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 600;
    bp.Q.value = 0.4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.setValueAtTime(0.12, ac.currentTime + duration * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start();
    src.stop(ac.currentTime + duration);
  } catch { /* ignore */ }

  // Fade back down
  boostTimeout = setTimeout(() => {
    if (masterGain) {
      masterGain.gain.setTargetAtTime(baseVolume, masterGain.context.currentTime, 0.3);
    }
    boosting = false;
  }, duration * 1000);
}

export function isAmbientPlaying() {
  return running;
}
