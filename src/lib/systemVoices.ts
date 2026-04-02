/**
 * System Voice Engine — 10 distinct voice personas using Web Speech API.
 * Each persona has unique pitch, rate, and voice selection preferences
 * to create recognizable characters for duo commentary.
 */

export interface SystemVoicePersona {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
  avatar: string;
  pitch: number;      // 0.5 – 2.0
  rate: number;        // 0.7 – 1.3
  volume: number;      // 0.5 – 1.0
  voicePrefs: string[]; // preferred Web Speech voice name fragments
  region: string;      // commentary style region
}

export const SYSTEM_VOICE_PERSONAS: SystemVoicePersona[] = [
  {
    id: "sys_ravi", name: "Ravi", gender: "male", style: "analytical",
    avatar: "🎙️", pitch: 0.9, rate: 0.88, volume: 0.9,
    voicePrefs: ["Google UK English Male", "Daniel", "Google US English"],
    region: "india",
  },
  {
    id: "sys_priya", name: "Priya", gender: "female", style: "hype",
    avatar: "🌟", pitch: 1.25, rate: 0.95, volume: 0.85,
    voicePrefs: ["Google UK English Female", "Samantha", "Karen"],
    region: "india",
  },
  {
    id: "sys_vikram", name: "Vikram", gender: "male", style: "savage",
    avatar: "🔥", pitch: 0.75, rate: 1.0, volume: 0.95,
    voicePrefs: ["Google UK English Male", "Alex", "Thomas"],
    region: "india",
  },
  {
    id: "sys_ananya", name: "Ananya", gender: "female", style: "storyteller",
    avatar: "📖", pitch: 1.15, rate: 0.85, volume: 0.8,
    voicePrefs: ["Samantha", "Google UK English Female", "Victoria"],
    region: "india",
  },
  {
    id: "sys_arjun", name: "Arjun", gender: "male", style: "witty",
    avatar: "😎", pitch: 1.05, rate: 0.92, volume: 0.88,
    voicePrefs: ["Daniel", "Google US English", "Fred"],
    region: "india",
  },
  {
    id: "sys_richie", name: "Richie", gender: "male", style: "legendary",
    avatar: "🇦🇺", pitch: 0.8, rate: 0.82, volume: 0.9,
    voicePrefs: ["Google Australian English", "Lee", "Google UK English Male"],
    region: "australia",
  },
  {
    id: "sys_nasser", name: "Nasser", gender: "male", style: "dramatic",
    avatar: "🇬🇧", pitch: 0.95, rate: 0.9, volume: 0.92,
    voicePrefs: ["Google UK English Male", "Daniel", "Oliver"],
    region: "england",
  },
  {
    id: "sys_mel", name: "Mel", gender: "female", style: "energetic",
    avatar: "🇯🇲", pitch: 1.3, rate: 1.05, volume: 0.95,
    voicePrefs: ["Google US English", "Samantha", "Tessa"],
    region: "caribbean",
  },
  {
    id: "sys_harsha", name: "Harsha", gender: "male", style: "poetic",
    avatar: "🏏", pitch: 1.0, rate: 0.88, volume: 0.85,
    voicePrefs: ["Google UK English Male", "Rishi", "Google US English"],
    region: "india",
  },
  {
    id: "sys_isa", name: "Isa", gender: "female", style: "sharp",
    avatar: "🇿🇦", pitch: 1.1, rate: 0.93, volume: 0.88,
    voicePrefs: ["Karen", "Google UK English Female", "Moira"],
    region: "southafrica",
  },
];

/**
 * Pick 2 random system voice personas for a match — always different genders when possible.
 */
export function pickSystemDuo(): [SystemVoicePersona, SystemVoicePersona] {
  const shuffled = [...SYSTEM_VOICE_PERSONAS].sort(() => Math.random() - 0.5);
  // Try to pair male + female
  const male = shuffled.find(p => p.gender === "male");
  const female = shuffled.find(p => p.gender === "female");
  if (male && female) return [male, female];
  return [shuffled[0], shuffled[1]];
}

/**
 * Find the best matching Web Speech API voice for a persona.
 */
function findVoice(persona: SystemVoicePersona): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const enVoices = voices.filter(v => v.lang.startsWith("en"));

  for (const pref of persona.voicePrefs) {
    const match = enVoices.find(v => v.name.includes(pref));
    if (match) return match;
  }

  // Fallback: pick any English voice, prefer matching gender heuristic
  if (persona.gender === "female") {
    const fem = enVoices.find(v =>
      /female|samantha|karen|victoria|fiona|moira|tessa|kate/i.test(v.name)
    );
    if (fem) return fem;
  } else {
    const mal = enVoices.find(v =>
      /male|daniel|alex|thomas|fred|lee|oliver|rishi|google.*english/i.test(v.name)
    );
    if (mal) return mal;
  }

  return enVoices[0] || voices[0] || null;
}

/**
 * Speak text with a specific system voice persona. Returns a promise that resolves when done.
 */
export function speakWithSystemPersona(text: string, persona: SystemVoicePersona, cancelPrevious = true): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }

    // Ensure voices are loaded
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Some browsers need a moment to load voices
      setTimeout(() => {
        voices = window.speechSynthesis.getVoices();
        doSpeak(text, persona, cancelPrevious, resolve);
      }, 200);
      return;
    }
    doSpeak(text, persona, cancelPrevious, resolve);
  });
}

function doSpeak(text: string, persona: SystemVoicePersona, cancelPrevious: boolean, resolve: () => void) {
  if (cancelPrevious) window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = persona.pitch;
  utterance.rate = persona.rate;
  utterance.volume = persona.volume;

  const voice = findVoice(persona);
  if (voice) utterance.voice = voice;

  // Chrome bug: long utterances get stuck. Set a safety timeout.
  const maxDuration = Math.max(text.length * 80, 5000); // rough estimate
  const timeout = setTimeout(() => {
    window.speechSynthesis.cancel();
    resolve();
  }, maxDuration);

  utterance.onend = () => { clearTimeout(timeout); resolve(); };
  utterance.onerror = () => { clearTimeout(timeout); resolve(); };
  window.speechSynthesis.speak(utterance);
}

/**
 * Speak duo lines sequentially using system voice personas.
 */
export async function speakSystemDuoLines(
  lines: { text: string; personaId: string }[]
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const clean = line.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
    if (!clean) continue;

    const persona = SYSTEM_VOICE_PERSONAS.find(p => p.id === line.personaId || p.name === line.personaId)
      || SYSTEM_VOICE_PERSONAS[0];

    // Only cancel on first line; subsequent lines should queue
    await speakWithSystemPersona(clean, persona, i === 0);
    // Small pause between speakers
    await new Promise(r => setTimeout(r, 300));
  }
}

/**
 * Preload Web Speech voices (some browsers need a nudge).
 */
export function preloadSystemVoices() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      window.speechSynthesis.getVoices();
    });
  }
}
