import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

const COMMENTARY_VOICES = [
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", desc: "Deep authoritative broadcaster", emoji: "🎙️" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", desc: "Classic English commentary", emoji: "🇬🇧" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", desc: "Energetic & exciting", emoji: "⚡" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", desc: "Smooth & professional", emoji: "🎤" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "Warm & engaging", emoji: "🌟" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Crisp & clear delivery", emoji: "👩‍💼" },
];

const VOICE_ENGINES = [
  { id: "auto" as const, name: "AUTO", desc: "ElevenLabs first, system fallback", emoji: "🔄" },
  { id: "elevenlabs" as const, name: "ELEVENLABS", desc: "Premium AI voices only", emoji: "✨" },
  { id: "system" as const, name: "SYSTEM", desc: "10 unique system voices, free", emoji: "🗣️" },
];

interface SettingGroup {
  title: string;
  icon: string;
  color: string;
  items: SettingItem[];
}

interface SettingItem {
  key: string;
  icon: string;
  label: string;
  desc: string;
  toggle: string;
}

export default function SettingsPage() {
  const settings = useSettings();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState<string | null>("audio");

  const clearData = () => {
    localStorage.removeItem("hc_onboarding_done");
    localStorage.removeItem("hc_settings");
    window.location.reload();
  };

  const settingGroups: SettingGroup[] = [
    {
      title: "AUDIO & SOUND",
      icon: "🔊",
      color: "primary",
      items: [
        { key: "soundEnabled", icon: "🔊", label: "MASTER SOUND", desc: "Enable all game audio", toggle: "toggleSound" },
        { key: "batSoundEnabled", icon: "🏏", label: "BAT & BALL SFX", desc: "Bat crack, stumps, coin flip", toggle: "toggleBatSound" },
        { key: "victorySoundEnabled", icon: "🎺", label: "VICTORY SOUNDS", desc: "Fanfare, drum rolls, horns", toggle: "toggleVictorySound" },
        { key: "musicEnabled", icon: "🎵", label: "BACKGROUND MUSIC", desc: "Match intro & ambient music", toggle: "toggleMusic" },
      ],
    },
    {
      title: "COMMENTARY",
      icon: "🎙️",
      color: "secondary",
      items: [
        { key: "commentaryEnabled", icon: "📢", label: "LIVE COMMENTARY", desc: "Play-by-play text overlays", toggle: "toggleCommentary" },
        { key: "voiceEnabled", icon: "🎙️", label: "VOICE NARRATION", desc: "Spoken play-by-play audio", toggle: "toggleVoice" },
      ],
    },
    {
      title: "ATMOSPHERE",
      icon: "🏟️",
      color: "accent",
      items: [
        { key: "crowdEnabled", icon: "🏟️", label: "CROWD SOUNDS", desc: "Cheers, gasps & applause", toggle: "toggleCrowd" },
        { key: "hapticsEnabled", icon: "📳", label: "HAPTIC FEEDBACK", desc: "Vibrations on actions", toggle: "toggleHaptics" },
      ],
    },
  ];

  const groupColorMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 border-primary/15",
    secondary: "from-secondary/15 to-secondary/5 border-secondary/15",
    accent: "from-accent/15 to-accent/5 border-accent/15",
  };

  const groupAccentMap: Record<string, string> = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.06) 0%, transparent 70%)" }}
      />

      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-primary/40" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">SETTINGS</h1>
          </div>
        </motion.div>

        {/* Sound setting groups */}
        {settingGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + gi * 0.08 }} className="mb-4">
            {/* Group header */}
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
              className="w-full flex items-center gap-3 mb-2"
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${groupColorMap[group.color]} border flex items-center justify-center`}>
                <span className="text-base">{group.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">{group.title}</span>
              </div>
              <motion.span
                animate={{ rotate: expandedGroup === group.title ? 180 : 0 }}
                className="text-muted-foreground text-xs"
              >▼</motion.span>
            </button>

            <AnimatePresence>
              {expandedGroup === group.title && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pb-2">
                    {group.items.map((item, i) => {
                      const isEnabled = (settings as any)[item.key];
                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="glass-premium rounded-xl p-3.5 flex items-center gap-3"
                        >
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${groupColorMap[group.color]} border flex items-center justify-center`}>
                            <span className="text-base">{item.icon}</span>
                          </div>
                          <div className="flex-1">
                            <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">{item.label}</span>
                            <span className="text-[8px] text-muted-foreground">{item.desc}</span>
                          </div>
                          <button
                            onClick={(settings as any)[item.toggle]}
                            className={`w-12 h-7 rounded-full relative transition-all ${
                              isEnabled
                                ? `bg-${group.color}/20 border border-${group.color}/40 shadow-[0_0_10px_hsl(217_91%_60%/0.15)]`
                                : "bg-muted/40 border border-muted-foreground/10"
                            }`}
                            style={isEnabled ? { borderColor: `hsl(var(--${group.color}) / 0.4)`, backgroundColor: `hsl(var(--${group.color}) / 0.15)` } : {}}
                          >
                            <motion.div
                              animate={{ x: isEnabled ? 20 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className={`w-5 h-5 rounded-full absolute top-[3px] transition-colors`}
                              style={isEnabled ? { background: `linear-gradient(to bottom right, hsl(var(--${group.color})), hsl(var(--${group.color}) / 0.8))`, boxShadow: `0 0 8px hsl(var(--${group.color}) / 0.4)` } : { backgroundColor: 'hsl(var(--muted-foreground) / 0.3)' }}
                            />
                          </button>
                        </motion.div>
                      );
                    })}

                    {/* Voice Engine selector inside Commentary group */}
                    {group.title === "COMMENTARY" && settings.voiceEnabled && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-premium rounded-xl p-3.5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🔊</span>
                          <span className="font-display text-[10px] font-bold text-foreground tracking-wider">VOICE ENGINE</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {VOICE_ENGINES.map((engine) => {
                            const isActive = settings.voiceEngine === engine.id;
                            return (
                              <button
                                key={engine.id}
                                onClick={() => settings.setVoiceEngine(engine.id)}
                                className={`p-2.5 rounded-xl text-center transition-all ${
                                  isActive
                                    ? "glass-premium border border-primary/30 shadow-[0_0_12px_hsl(217_91%_60%/0.15)]"
                                    : "glass-card border border-transparent hover:border-muted-foreground/10"
                                }`}
                              >
                                <span className="text-lg block mb-1">{engine.emoji}</span>
                                <span className={`font-display text-[8px] font-bold block ${isActive ? "text-primary" : "text-foreground"}`}>{engine.name}</span>
                                <span className="text-[6px] text-muted-foreground block mt-0.5">{engine.desc}</span>
                                {isActive && (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary text-xs block mt-1">✓</motion.span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Voice picker inside Commentary group — only show for ElevenLabs/Auto */}
                    {group.title === "COMMENTARY" && settings.voiceEnabled && settings.voiceEngine !== "system" && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-premium rounded-xl p-3.5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🗣️</span>
                          <span className="font-display text-[10px] font-bold text-foreground tracking-wider">ELEVENLABS VOICE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {COMMENTARY_VOICES.map((voice) => {
                            const isActive = settings.commentaryVoice === voice.id;
                            return (
                              <button
                                key={voice.id}
                                onClick={() => settings.setCommentaryVoice(voice.id)}
                                className={`p-2.5 rounded-xl text-left transition-all ${
                                  isActive
                                    ? "glass-premium border border-secondary/30 shadow-[0_0_12px_hsl(45_93%_47%/0.15)]"
                                    : "glass-card border border-transparent hover:border-muted-foreground/10"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{voice.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className={`font-display text-[9px] font-bold block ${isActive ? "text-secondary" : "text-foreground"}`}>{voice.name}</span>
                                    <span className="text-[7px] text-muted-foreground truncate block">{voice.desc}</span>
                                  </div>
                                  {isActive && (
                                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-secondary text-xs">✓</motion.span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">ACCOUNT</h2>
          </div>
          <div className="space-y-2">
            {user ? (
              <>
                <div className="glass-premium rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/15 flex items-center justify-center">
                    <span className="text-lg">📧</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">EMAIL</span>
                    <span className="text-[9px] text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="w-full glass-premium rounded-xl p-4 flex items-center gap-3 text-left border border-out-red/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-out-red/15 to-out-red/5 border border-out-red/15 flex items-center justify-center">
                    <span className="text-lg">🚪</span>
                  </div>
                  <span className="font-display text-[10px] font-bold text-out-red tracking-wider">SIGN OUT</span>
                </motion.button>
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/auth")}
                className="w-full glass-premium rounded-xl p-4 flex items-center gap-3 text-left border border-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center">
                  <span className="text-lg">🔐</span>
                </div>
                <div className="flex-1">
                  <span className="font-display text-[10px] font-bold text-primary tracking-wider block">SIGN IN</span>
                  <span className="text-[8px] text-muted-foreground">Save progress & compete</span>
                </div>
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={clearData}
              className="w-full glass-premium rounded-xl p-4 flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted-foreground/10 to-muted-foreground/5 border border-muted-foreground/10 flex items-center justify-center">
                <span className="text-lg">🗑️</span>
              </div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">RESET LOCAL DATA</span>
                <span className="text-[8px] text-muted-foreground">Clear onboarding & settings</span>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-muted-foreground/30" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">ABOUT</h2>
          </div>
          <div className="glass-premium rounded-xl p-4 text-center">
            <span className="text-2xl block mb-1">🏏</span>
            <p className="font-display text-xs font-bold text-foreground tracking-wider">HAND CRICKET AR</p>
            <p className="text-[8px] text-muted-foreground/50 font-display mt-1 tracking-widest">v3.0 • PREMIUM EDITION</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-primary/30" />
              <span className="text-[7px] text-muted-foreground/30 font-display tracking-widest">POWERED BY AI</span>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/30" />
            </div>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
