import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface Settings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  commentaryEnabled: boolean;
  voiceEnabled: boolean;
  crowdEnabled: boolean;
  musicEnabled: boolean;
  batSoundEnabled: boolean;
  victorySoundEnabled: boolean;
  commentaryVoice: string;
}

interface SettingsContextType extends Settings {
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleCommentary: () => void;
  toggleVoice: () => void;
  toggleCrowd: () => void;
  toggleMusic: () => void;
  toggleBatSound: () => void;
  toggleVictorySound: () => void;
  setCommentaryVoice: (voice: string) => void;
}

const defaults: Settings = {
  soundEnabled: true, hapticsEnabled: true, commentaryEnabled: true,
  voiceEnabled: true, crowdEnabled: true, musicEnabled: true,
  batSoundEnabled: true, victorySoundEnabled: true,
  commentaryVoice: "nPczCjzI2devNBz1zQrb", // Brian (default)
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaults,
  toggleSound: () => {},
  toggleHaptics: () => {},
  toggleCommentary: () => {},
  toggleVoice: () => {},
  toggleCrowd: () => {},
  toggleMusic: () => {},
  toggleBatSound: () => {},
  toggleVictorySound: () => {},
  setCommentaryVoice: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("hc_settings");
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem("hc_settings", JSON.stringify(settings));
  }, [settings]);

  const toggleSound = () => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }));
  const toggleHaptics = () => setSettings((s) => ({ ...s, hapticsEnabled: !s.hapticsEnabled }));
  const toggleCommentary = () => setSettings((s) => ({ ...s, commentaryEnabled: !s.commentaryEnabled }));
  const toggleVoice = () => setSettings((s) => ({ ...s, voiceEnabled: !s.voiceEnabled }));
  const toggleCrowd = () => setSettings((s) => ({ ...s, crowdEnabled: !s.crowdEnabled }));
  const toggleMusic = () => setSettings((s) => ({ ...s, musicEnabled: !s.musicEnabled }));
  const toggleBatSound = () => setSettings((s) => ({ ...s, batSoundEnabled: !s.batSoundEnabled }));
  const toggleVictorySound = () => setSettings((s) => ({ ...s, victorySoundEnabled: !s.victorySoundEnabled }));
  const setCommentaryVoice = (voice: string) => setSettings((s) => ({ ...s, commentaryVoice: voice }));

  return (
    <SettingsContext.Provider value={{ ...settings, toggleSound, toggleHaptics, toggleCommentary, toggleVoice, toggleCrowd, toggleMusic, toggleBatSound, toggleVictorySound, setCommentaryVoice }}>
      {children}
    </SettingsContext.Provider>
  );
}
