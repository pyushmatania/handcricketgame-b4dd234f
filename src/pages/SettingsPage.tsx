import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import type { CommentaryLanguage } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import { SYSTEM_VOICE_PERSONAS, speakWithSystemPersona } from "@/lib/systemVoices";
import { speakElevenLabs } from "@/lib/elevenLabsAudio";

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

const LANGUAGE_OPTIONS: { id: CommentaryLanguage; name: string; desc: string; emoji: string }[] = [
  { id: "english", name: "ENGLISH", desc: "Classic cricket commentary", emoji: "🇬🇧" },
  { id: "hindi", name: "HINDI", desc: "Full Hinglish & Bollywood vibes", emoji: "🇮🇳" },
  { id: "both", name: "MIXED", desc: "Best of both — random mix", emoji: "🌍" },
];

const PREVIEW_LINES_EN = [
  "What a shot! That's gone straight into the stands!",
  "Brilliant bowling! The batsman has no answer!",
  "And the crowd goes absolutely wild! Six runs!",
  "Dot ball! Building pressure here!",
  "That's a classic cover drive — textbook!",
];

const PREVIEW_LINES_HI = [
  "Kya shot hai! Ball toh parking lot mein gayi!",
  "Arre baap re! Bowler ki halat kharab ho gayi!",
  "Chhakkaa! Stadium mein earthquake aa gaya!",
  "Dot ball! Batter statue ban gaya!",
  "Sachin wali cover drive! Master class!",
];

/* ──── 3D Game Toggle ──── */
function GameToggle({ enabled, onToggle, color = "green" }: { enabled: boolean; onToggle: () => void; color?: "green" | "blue" | "gold" | "red" }) {
  const colorMap = {
    green: { bg: "hsl(122,39%,49%)", glow: "hsl(122,39%,49%,0.4)" },
    blue: { bg: "hsl(207,90%,54%)", glow: "hsl(207,90%,54%,0.4)" },
    gold: { bg: "hsl(51,100%,50%)", glow: "hsl(51,100%,50%,0.4)" },
    red: { bg: "hsl(4,90%,58%)", glow: "hsl(4,90%,58%,0.4)" },
  };
  const c = colorMap[color];
  return (
    <button onClick={onToggle} className="relative w-[52px] h-[30px] rounded-full transition-all duration-200 border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
      style={{
        background: enabled ? `linear-gradient(to bottom, ${c.bg}, hsl(from ${c.bg} h s calc(l - 15)))` : "linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.3))",
        borderColor: enabled ? `hsl(from ${c.bg} h s calc(l - 20))` : "hsl(var(--muted-foreground) / 0.15)",
        boxShadow: enabled ? `0 2px 12px ${c.glow}` : "none",
      }}>
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 600, damping: 28 }}
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full shadow-md"
        style={{
          background: "linear-gradient(to bottom, hsl(0 0% 100%), hsl(0 0% 90%))",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      />
    </button>
  );
}

/* ──── Section Header ──── */
function SectionHeader({ icon, title, expanded, onToggle, accentColor }: {
  icon: string; title: string; expanded: boolean; onToggle: () => void; accentColor: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className="w-full flex items-center gap-3 rounded-2xl p-3 border-b-[3px] transition-all"
      style={{
        background: `linear-gradient(135deg, hsl(222 40% 14% / 0.95), hsl(222 40% 10% / 0.98))`,
        borderColor: `${accentColor}33`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border-b-2"
        style={{
          background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
          borderColor: `${accentColor}40`,
        }}>
        <span className="text-xl">{icon}</span>
      </div>
      <span className="flex-1 text-left font-game-display text-xs tracking-[0.2em]" style={{ color: accentColor }}>{title}</span>
      <motion.span
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-sm opacity-50"
        style={{ color: accentColor }}
      >▼</motion.span>
    </motion.button>
  );
}

interface SettingGroup {
  title: string;
  icon: string;
  accent: string;
  toggleColor: "green" | "blue" | "gold" | "red";
  items: { key: string; icon: string; label: string; desc: string; toggle: string }[];
}

export default function SettingsPage() {
  const settings = useSettings();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [expandedGroup, setExpandedGroup] = useState<string | null>("AUDIO & SOUND");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const previewSystemVoice = useCallback(async (personaId: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(personaId);
    const persona = SYSTEM_VOICE_PERSONAS.find(p => p.id === personaId);
    if (!persona) { setPreviewingVoice(null); return; }
    const isHindi = settings.commentaryLanguage === "hindi";
    const lines = isHindi ? PREVIEW_LINES_HI : PREVIEW_LINES_EN;
    const line = lines[Math.floor(Math.random() * lines.length)];
    await speakWithSystemPersona(line, persona);
    setPreviewingVoice(null);
  }, [previewingVoice, settings.commentaryLanguage]);

  const previewElevenLabsVoice = useCallback(async (voiceId: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voiceId);
    const isHindi = settings.commentaryLanguage === "hindi";
    const lines = isHindi ? PREVIEW_LINES_HI : PREVIEW_LINES_EN;
    const line = lines[Math.floor(Math.random() * lines.length)];
    await speakElevenLabs(line, voiceId);
    setPreviewingVoice(null);
  }, [previewingVoice, settings.commentaryLanguage]);

  const clearData = () => {
    localStorage.removeItem("hc_onboarding_done");
    localStorage.removeItem("hc_settings");
    window.location.reload();
  };

  const settingGroups: SettingGroup[] = [
    {
      title: "AUDIO & SOUND",
      icon: "🔊",
      accent: "hsl(122,39%,49%)",
      toggleColor: "green",
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
      accent: "hsl(207,90%,54%)",
      toggleColor: "blue",
      items: [
        { key: "commentaryEnabled", icon: "📢", label: "LIVE COMMENTARY", desc: "Play-by-play text overlays", toggle: "toggleCommentary" },
        { key: "voiceEnabled", icon: "🎙️", label: "VOICE NARRATION", desc: "Spoken play-by-play audio", toggle: "toggleVoice" },
      ],
    },
    {
      title: "ATMOSPHERE",
      icon: "🏟️",
      accent: "hsl(51,100%,50%)",
      toggleColor: "gold",
      items: [
        { key: "crowdEnabled", icon: "🏟️", label: "CROWD SOUNDS", desc: "Cheers, gasps & applause", toggle: "toggleCrowd" },
        { key: "hapticsEnabled", icon: "📳", label: "HAPTIC FEEDBACK", desc: "Vibrations on actions", toggle: "toggleHaptics" },
        { key: "tapCeremoniesEnabled", icon: "🎬", label: "TAP CEREMONIES", desc: "Pre/post match for Tap mode", toggle: "toggleTapCeremonies" },
        { key: "arCeremoniesEnabled", icon: "📹", label: "AR CEREMONIES", desc: "Pre/post match for AR mode", toggle: "toggleArCeremonies" },
        { key: "tournamentCeremoniesEnabled", icon: "🏆", label: "TOURNAMENT CEREMONIES", desc: "Pre/post match for Tournaments", toggle: "toggleTournamentCeremonies" },
        { key: "dailyCeremoniesEnabled", icon: "📅", label: "DAILY CEREMONIES", desc: "Pre/post match for Daily", toggle: "toggleDailyCeremonies" },
        { key: "multiplayerCeremoniesEnabled", icon: "🤝", label: "PVP CEREMONIES", desc: "Pre/post match for PvP", toggle: "toggleMultiplayerCeremonies" },
      ],
    },
  ];

  const cardStyle = {
    background: "linear-gradient(135deg, hsl(222 40% 13% / 0.9), hsl(222 40% 8% / 0.95))",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
  };

  return (
    <div className="min-h-screen bg-game-dark relative overflow-hidden pb-24">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(222 40% 18%) 0%, hsl(222 40% 6%) 70%)" }} />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-b-[3px]" style={{
            background: "linear-gradient(135deg, hsl(var(--game-gold) / 0.3), hsl(var(--game-gold) / 0.1))",
            borderColor: "hsl(var(--game-gold) / 0.4)",
          }}>
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h1 className="font-game-display text-xl tracking-wider text-game-gold">SETTINGS</h1>
            <p className="text-[10px] text-muted-foreground font-game-body tracking-wide">Customize your experience</p>
          </div>
        </motion.div>

        {/* Setting groups */}
        {settingGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + gi * 0.08 }}>
            <SectionHeader
              icon={group.icon}
              title={group.title}
              expanded={expandedGroup === group.title}
              onToggle={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
              accentColor={group.accent}
            />

            <AnimatePresence>
              {expandedGroup === group.title && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2 pb-1">
                    {group.items.map((item, i) => {
                      const isEnabled = (settings as any)[item.key];
                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="rounded-xl p-3 flex items-center gap-3 border border-[hsl(var(--border)/0.3)]"
                          style={cardStyle}
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: `${group.accent}18`, border: `1px solid ${group.accent}30` }}>
                            <span className="text-base">{item.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-game-display text-[10px] tracking-wider text-foreground block">{item.label}</span>
                            <span className="text-[8px] text-muted-foreground font-game-body">{item.desc}</span>
                          </div>
                          <GameToggle enabled={isEnabled} onToggle={(settings as any)[item.toggle]} color={group.toggleColor} />
                        </motion.div>
                      );
                    })}

                    {/* Ambient Volume slider */}
                    {group.title === "AUDIO & SOUND" && settings.musicEnabled && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-3.5 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🏟️</span>
                          <span className="font-game-display text-[10px] tracking-wider text-foreground">STADIUM AMBIENCE</span>
                          <span className="text-[10px] text-game-gold font-game-display ml-auto">{Math.round(settings.ambientVolume * 100)}%</span>
                        </div>
                        <Slider value={[settings.ambientVolume * 100]} onValueChange={([v]) => settings.setAmbientVolume(v / 100)} max={100} min={0} step={5} className="w-full" />
                      </motion.div>
                    )}

                    {/* Voice Engine selector */}
                    {group.title === "COMMENTARY" && settings.voiceEnabled && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-3.5 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🔊</span>
                          <span className="font-game-display text-[10px] tracking-wider text-foreground">VOICE ENGINE</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {VOICE_ENGINES.map((engine) => {
                            const isActive = settings.voiceEngine === engine.id;
                            return (
                              <motion.button
                                key={engine.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => settings.setVoiceEngine(engine.id)}
                                className="p-2.5 rounded-xl text-center transition-all border-b-2"
                                style={{
                                  background: isActive
                                    ? `linear-gradient(135deg, ${group.accent}25, ${group.accent}10)`
                                    : "hsl(222 40% 12% / 0.8)",
                                  borderColor: isActive ? `${group.accent}60` : "transparent",
                                  boxShadow: isActive ? `0 0 12px ${group.accent}20` : "none",
                                }}
                              >
                                <span className="text-lg block mb-1">{engine.emoji}</span>
                                <span className="font-game-display text-[8px] block" style={{ color: isActive ? group.accent : "hsl(var(--foreground))" }}>{engine.name}</span>
                                <span className="text-[6px] text-muted-foreground block mt-0.5 font-game-body">{engine.desc}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Commentary Language */}
                    {group.title === "COMMENTARY" && settings.commentaryEnabled && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-3.5 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🌐</span>
                          <span className="font-game-display text-[10px] tracking-wider text-foreground">LANGUAGE</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {LANGUAGE_OPTIONS.map((lang) => {
                            const isActive = settings.commentaryLanguage === lang.id;
                            return (
                              <motion.button
                                key={lang.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => settings.setCommentaryLanguage(lang.id)}
                                className="p-2.5 rounded-xl text-center transition-all border-b-2"
                                style={{
                                  background: isActive ? `${group.accent}20` : "hsl(222 40% 12% / 0.8)",
                                  borderColor: isActive ? `${group.accent}60` : "transparent",
                                }}
                              >
                                <span className="text-lg block mb-1">{lang.emoji}</span>
                                <span className="font-game-display text-[8px] block" style={{ color: isActive ? group.accent : "hsl(var(--foreground))" }}>{lang.name}</span>
                                <span className="text-[6px] text-muted-foreground block mt-0.5 font-game-body">{lang.desc}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* ElevenLabs Voices */}
                    {group.title === "COMMENTARY" && settings.voiceEnabled && settings.voiceEngine !== "system" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-3.5 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🗣️</span>
                          <span className="font-game-display text-[10px] tracking-wider text-foreground">ELEVENLABS VOICE</span>
                          <span className="text-[7px] text-muted-foreground ml-auto font-game-body">tap to preview</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {COMMENTARY_VOICES.map((voice) => {
                            const isActive = settings.commentaryVoice === voice.id;
                            const isPreviewing = previewingVoice === voice.id;
                            return (
                              <motion.button
                                key={voice.id}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => settings.setCommentaryVoice(voice.id)}
                                className="p-2.5 rounded-xl text-left transition-all border-b-2"
                                style={{
                                  background: isActive ? "hsl(51 100% 50% / 0.1)" : "hsl(222 40% 12% / 0.8)",
                                  borderColor: isActive ? "hsl(51 100% 50% / 0.4)" : "transparent",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{voice.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-game-display text-[9px] block" style={{ color: isActive ? "hsl(51,100%,50%)" : "hsl(var(--foreground))" }}>{voice.name}</span>
                                    <span className="text-[7px] text-muted-foreground truncate block font-game-body">{voice.desc}</span>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); previewElevenLabsVoice(voice.id); }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                                    style={{
                                      background: isPreviewing ? "hsl(207 90% 54% / 0.3)" : "hsl(var(--muted) / 0.3)",
                                    }}
                                  >
                                    <span className="text-[10px]">{isPreviewing ? "⏳" : "▶"}</span>
                                  </button>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* System Voices */}
                    {group.title === "COMMENTARY" && settings.voiceEnabled && settings.voiceEngine !== "elevenlabs" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-3.5 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">🎭</span>
                          <span className="font-game-display text-[10px] tracking-wider text-foreground">SYSTEM VOICES</span>
                          <span className="text-[7px] text-muted-foreground ml-auto font-game-body">tap ▶ to preview</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SYSTEM_VOICE_PERSONAS.map((persona) => {
                            const isPreviewing = previewingVoice === persona.id;
                            return (
                              <div key={persona.id} className="p-2 rounded-xl flex items-center gap-2 border-b-2 border-transparent"
                                style={{ background: "hsl(222 40% 12% / 0.8)" }}>
                                <span className="text-sm">{persona.avatar}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-game-display text-[9px] text-foreground block">{persona.name}</span>
                                  <span className="text-[7px] text-muted-foreground block capitalize font-game-body">{persona.style} • {persona.region}</span>
                                </div>
                                <button
                                  onClick={() => previewSystemVoice(persona.id)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                                  style={{ background: isPreviewing ? "hsl(122 39% 49% / 0.3)" : "hsl(var(--muted) / 0.3)" }}
                                >
                                  <span className="text-[10px]">{isPreviewing ? "⏳" : "▶"}</span>
                                </button>
                              </div>
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

        {/* Account Section */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionHeader icon="👤" title="ACCOUNT" expanded={expandedGroup === "ACCOUNT"} onToggle={() => setExpandedGroup(expandedGroup === "ACCOUNT" ? null : "ACCOUNT")} accentColor="hsl(4,90%,58%)" />
          <AnimatePresence>
            {expandedGroup === "ACCOUNT" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-1.5 pt-2 pb-1">
                  {user ? (
                    <>
                      <div className="rounded-xl p-3.5 flex items-center gap-3 border border-[hsl(var(--border)/0.3)]" style={cardStyle}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(207 90% 54% / 0.15)", border: "1px solid hsl(207 90% 54% / 0.3)" }}>
                          <span className="text-lg">📧</span>
                        </div>
                        <div className="flex-1">
                          <span className="font-game-display text-[10px] tracking-wider text-foreground block">EMAIL</span>
                          <span className="text-[9px] text-muted-foreground font-game-body">{user.email}</span>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => { await signOut(); navigate("/"); }}
                        className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
                        style={{
                          background: "linear-gradient(135deg, hsl(4 90% 58% / 0.15), hsl(4 90% 58% / 0.05))",
                          borderColor: "hsl(4 90% 58% / 0.3)",
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(4 90% 58% / 0.2)" }}>
                          <span className="text-lg">🚪</span>
                        </div>
                        <span className="font-game-display text-[10px] tracking-wider text-game-red">SIGN OUT</span>
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/auth")}
                      className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
                      style={{
                        background: "linear-gradient(135deg, hsl(122 39% 49% / 0.15), hsl(122 39% 49% / 0.05))",
                        borderColor: "hsl(122 39% 49% / 0.3)",
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(122 39% 49% / 0.2)" }}>
                        <span className="text-lg">🔐</span>
                      </div>
                      <div className="flex-1">
                        <span className="font-game-display text-[10px] tracking-wider text-game-green block">SIGN IN</span>
                        <span className="text-[8px] text-muted-foreground font-game-body">Save progress & compete</span>
                      </div>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={clearData}
                    className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left border border-[hsl(var(--border)/0.3)]"
                    style={cardStyle}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--muted-foreground) / 0.1)" }}>
                      <span className="text-lg">🗑️</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-game-display text-[10px] tracking-wider text-foreground block">RESET LOCAL DATA</span>
                      <span className="text-[8px] text-muted-foreground font-game-body">Clear onboarding & settings</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 text-center border-b-[3px] mb-4"
          style={{
            ...cardStyle,
            borderColor: "hsl(var(--game-gold) / 0.2)",
          }}
        >
          <span className="text-3xl block mb-2">🏏</span>
          <p className="font-game-display text-sm tracking-wider text-game-gold">HAND CRICKET AR</p>
          <p className="text-[9px] text-muted-foreground/50 font-game-display mt-1 tracking-widest">v3.0 • PREMIUM EDITION</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-10 h-[2px]" style={{ background: "linear-gradient(to right, transparent, hsl(var(--game-gold) / 0.3))" }} />
            <span className="text-[7px] text-muted-foreground/40 font-game-display tracking-[0.3em]">POWERED BY AI</span>
            <div className="w-10 h-[2px]" style={{ background: "linear-gradient(to left, transparent, hsl(var(--game-gold) / 0.3))" }} />
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
