/**
 * Voice Commentary Engine — Supports 3 modes: auto, elevenlabs, system.
 * Auto tries ElevenLabs first, falls back to system duo voices.
 * System mode uses 10 distinct Web Speech personas with duo commentary.
 */

import { speakElevenLabs, stopCurrentAudio, isElevenLabsAvailable, playElevenLabsSFX, ElevenLabsSFXPrompts, speakDuoLines } from "@/lib/elevenLabsAudio";
import { speakSystemDuoLines, speakWithSystemPersona, SYSTEM_VOICE_PERSONAS, preloadSystemVoices, type SystemVoicePersona } from "@/lib/systemVoices";
import type { VoiceEngine } from "@/contexts/SettingsContext";
import type { Commentator, CommentaryLine } from "@/lib/commentaryDuo";

// Preload system voices on import
preloadSystemVoices();

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ─── Commentator-to-System-Voice mapping ─────────────────────────
// Maps ElevenLabs commentator IDs to system voice personas for fallback
const COMMENTATOR_TO_SYSTEM: Record<string, string> = {
  "ravi": "sys_ravi",
  "priya": "sys_priya",
  "vikram": "sys_vikram",
  "ananya": "sys_ananya",
  "arjun": "sys_arjun",
  "Ravi": "sys_ravi",
  "Priya": "sys_priya",
  "Vikram": "sys_vikram",
  "Ananya": "sys_ananya",
  "Arjun": "sys_arjun",
};

function getSystemPersonaForCommentator(commentatorId: string): SystemVoicePersona {
  const sysId = COMMENTATOR_TO_SYSTEM[commentatorId];
  return SYSTEM_VOICE_PERSONAS.find(p => p.id === sysId) || SYSTEM_VOICE_PERSONAS[0];
}

// ─── Voice Commentary (with engine support) ──────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null;

export async function speakCommentary(text: string, enabled: boolean, engine: VoiceEngine = "auto") {
  if (!enabled) return;

  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  if (!clean) return;

  const useElevenLabs = engine === "elevenlabs" || (engine === "auto" && isElevenLabsAvailable());

  if (useElevenLabs) {
    stopVoice();
    const success = await speakElevenLabs(clean);
    if (success) return;
    // If auto mode and EL failed, fall through to system
    if (engine === "elevenlabs") return;
  }

  // System voice fallback — use a random persona for single lines
  const persona = SYSTEM_VOICE_PERSONAS[Math.floor(Math.random() * SYSTEM_VOICE_PERSONAS.length)];
  await speakWithSystemPersona(clean, persona);
}

/**
 * Speak duo commentary lines with proper voice engine routing.
 * Maps commentary lines to either ElevenLabs voices or system voice personas.
 */
export async function speakDuoCommentary(
  lines: CommentaryLine[],
  commentators: [Commentator, Commentator],
  engine: VoiceEngine = "auto"
) {
  const keyLines = lines.filter(l => l.isKeyMoment);
  if (keyLines.length === 0) return;

  const useElevenLabs = engine === "elevenlabs" || (engine === "auto" && isElevenLabsAvailable());

  if (useElevenLabs) {
    const ttsLines = keyLines.map(l => ({
      text: l.text,
      voiceId: (commentators.find(c => c.name === l.commentatorId || c.id === l.commentatorId) || commentators[0]).voiceId,
    }));
    await speakDuoLines(ttsLines);
    // If ElevenLabs didn't fail midway, we're done
    if (isElevenLabsAvailable() || engine === "elevenlabs") return;
  }

  // System duo voices
  const systemLines = keyLines.map(l => ({
    text: l.text,
    personaId: getSystemPersonaForCommentator(l.commentatorId).id,
  }));
  await speakSystemDuoLines(systemLines);
}

export function stopVoice() {
  stopCurrentAudio();
  window.speechSynthesis?.cancel();
  currentUtterance = null;
}

// ─── Crowd / Audience Sounds (Web Audio + ElevenLabs overlay) ────

function createFilteredNoise(duration: number, freq: number, Q: number, volume: number) {
  try {
    const ctx = getCtx();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
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
  } catch { /* Audio not supported */ }
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
  } catch { /* Audio not supported */ }
}

export const CrowdSFX = {
  roar() {
    // Try ElevenLabs SFX first
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.crowdRoar, 4);
    createFilteredNoise(1.8, 800, 0.5, 0.12);
    createFilteredNoise(1.8, 1200, 0.8, 0.08);
    for (let i = 0; i < 5; i++) {
      playCheerTone(300 + Math.random() * 400, 0.6, Math.random() * 0.3, 0.03);
    }
  },
  cheer() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.crowdCheer, 3);
    createFilteredNoise(1.2, 900, 0.6, 0.08);
    createFilteredNoise(1.0, 600, 0.4, 0.06);
    for (let i = 0; i < 3; i++) {
      playCheerTone(400 + Math.random() * 300, 0.4, Math.random() * 0.2, 0.025);
    }
  },
  applause() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.crowdApplause, 2);
    createFilteredNoise(0.8, 3000, 1.5, 0.04);
    createFilteredNoise(0.6, 5000, 2, 0.03);
  },
  gasp() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.crowdGasp, 2);
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
    } catch { /* Audio not supported */ }
    setTimeout(() => createFilteredNoise(1.0, 300, 0.3, 0.04), 400);
  },
  tension() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.crowdTension, 1);
    createFilteredNoise(0.4, 200, 0.2, 0.02);
  },
  victory() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.victoryFanfare, 5);
    createFilteredNoise(2.5, 800, 0.4, 0.15);
    createFilteredNoise(2.5, 1500, 0.6, 0.1);
    for (let i = 0; i < 8; i++) {
      playCheerTone(250 + Math.random() * 500, 0.8, i * 0.15, 0.04);
    }
  },
  horn() {
    if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.stadiumHorn, 2);
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
    } catch { /* Audio not supported */ }
  },
  ambientMurmur(durationSec = 3) {
    createFilteredNoise(durationSec, 350, 0.15, 0.015);
    createFilteredNoise(durationSec, 600, 0.2, 0.01);
  },
};

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
    if (isBatting) CrowdSFX.gasp(); else CrowdSFX.cheer();
    return;
  }
  const absRuns = Math.abs(runs);
  if (absRuns === 6) {
    if (isBatting) { CrowdSFX.roar(); setTimeout(() => CrowdSFX.horn(), 300); } else CrowdSFX.gasp();
  } else if (absRuns === 4) {
    if (isBatting) CrowdSFX.cheer(); else CrowdSFX.tension();
  } else if (absRuns >= 1) {
    CrowdSFX.applause();
  } else {
    CrowdSFX.tension();
  }
}
