/**
 * ElevenLabs Audio Engine
 * Primary audio system with automatic fallback to Web Speech/Audio API
 * Uses Brian voice (nPczCjzI2devNBz1zQrb) — deep, authoritative sports broadcaster
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BRIAN_VOICE_ID = "nPczCjzI2devNBz1zQrb";

// ─── Audio Cache ─────────────────────────────────────────────────
const audioCache = new Map<string, string>(); // text → blobURL
let elevenLabsAvailable = true; // flips false on 402 (tokens exhausted)
let currentAudio: HTMLAudioElement | null = null;

function getCacheKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 200);
}

// ─── TTS ─────────────────────────────────────────────────────────

export async function speakElevenLabs(text: string): Promise<boolean> {
  if (!elevenLabsAvailable) return false;

  const key = getCacheKey(text);
  
  // Check cache first
  if (audioCache.has(key)) {
    return playAudioUrl(audioCache.get(key)!);
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text, voiceId: BRIAN_VOICE_ID }),
      }
    );

    if (!response.ok) {
      if (response.status === 402) {
        console.warn("[ElevenLabs] Tokens exhausted — switching to fallback");
        elevenLabsAvailable = false;
      }
      return false;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(key, url);
    return playAudioUrl(url);
  } catch (err) {
    console.warn("[ElevenLabs] TTS failed, will use fallback:", err);
    return false;
  }
}

function playAudioUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    stopCurrentAudio();
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => { currentAudio = null; resolve(true); };
    audio.onerror = () => { currentAudio = null; resolve(false); };
    audio.play().catch(() => resolve(false));
  });
}

export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// ─── SFX ─────────────────────────────────────────────────────────

const sfxCache = new Map<string, string>();

export async function playElevenLabsSFX(prompt: string, duration = 3): Promise<boolean> {
  if (!elevenLabsAvailable) return false;

  const key = `sfx:${prompt}:${duration}`;
  if (sfxCache.has(key)) {
    return playAudioUrl(sfxCache.get(key)!);
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ prompt, duration, type: "sfx" }),
      }
    );

    if (!response.ok) {
      if (response.status === 402) elevenLabsAvailable = false;
      return false;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    sfxCache.set(key, url);
    return playAudioUrl(url);
  } catch {
    return false;
  }
}

// ─── Music ───────────────────────────────────────────────────────

const musicCache = new Map<string, string>();
let currentMusic: HTMLAudioElement | null = null;

export async function playElevenLabsMusic(prompt: string, duration = 15, loop = true): Promise<boolean> {
  if (!elevenLabsAvailable) return false;

  const key = `music:${prompt}:${duration}`;
  let url = musicCache.get(key);

  if (!url) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ prompt, duration, type: "music" }),
        }
      );

      if (!response.ok) {
        if (response.status === 402) elevenLabsAvailable = false;
        return false;
      }

      const blob = await response.blob();
      url = URL.createObjectURL(blob);
      musicCache.set(key, url);
    } catch {
      return false;
    }
  }

  stopMusic();
  currentMusic = new Audio(url);
  currentMusic.loop = loop;
  currentMusic.volume = 0.15;
  return currentMusic.play().then(() => true).catch(() => false);
}

export function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
    currentMusic = null;
  }
}

// ─── Pre-cache common lines ──────────────────────────────────────

export async function preCacheCommentary(lines: string[]) {
  if (!elevenLabsAvailable) return;
  // Pre-cache up to 10 lines silently in background
  const batch = lines.slice(0, 10);
  for (const line of batch) {
    const key = getCacheKey(line);
    if (audioCache.has(key)) continue;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ text: line, voiceId: BRIAN_VOICE_ID }),
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        audioCache.set(key, URL.createObjectURL(blob));
      } else if (response.status === 402) {
        elevenLabsAvailable = false;
        break;
      }
    } catch {
      break;
    }
  }
}

// ─── Status ──────────────────────────────────────────────────────

export function isElevenLabsAvailable(): boolean {
  return elevenLabsAvailable;
}

export function resetElevenLabsStatus() {
  elevenLabsAvailable = true;
}

// ─── Predefined SFX prompts ─────────────────────────────────────

export const ElevenLabsSFXPrompts = {
  crowdRoar: "Massive stadium crowd roaring and cheering wildly after a cricket six, echo effect",
  crowdCheer: "Cricket stadium crowd cheering moderately after a boundary four",
  crowdApplause: "Polite cricket stadium applause and clapping for a single run",
  crowdGasp: "Stadium crowd gasping in shock at a wicket falling, followed by silence",
  crowdTension: "Quiet tense stadium murmur during a dot ball in cricket",
  victoryFanfare: "Epic victory fanfare with trumpets and stadium crowd celebration, cricket tournament",
  stadiumHorn: "Stadium air horn blast, loud sports arena horn",
  batCrack: "Loud cricket bat hitting ball, clean crack sound, leather on willow",
  stumpsHit: "Cricket stumps being hit and scattered, bails flying off",
  coinToss: "Metal coin being flipped and spinning in the air, then landing",
  drumRoll: "Dramatic drum roll building tension, sports event",
  introMusic: "Epic cinematic cricket tournament intro music, dramatic and exciting, 10 seconds",
};
