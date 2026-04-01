import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

const TOGGLE_ITEMS = [
  { key: "soundEnabled" as const, icon: "🔊", label: "SOUND EFFECTS", desc: "Bat hits, runs, wickets", toggle: "toggleSound" as const },
  { key: "hapticsEnabled" as const, icon: "📳", label: "HAPTIC FEEDBACK", desc: "Vibrations on actions", toggle: "toggleHaptics" as const },
  { key: "commentaryEnabled" as const, icon: "📢", label: "LIVE COMMENTARY", desc: "Play-by-play text", toggle: "toggleCommentary" as const },
  { key: "voiceEnabled" as const, icon: "🎙️", label: "VOICE COMMENTARY", desc: "Spoken play-by-play narration", toggle: "toggleVoice" as const },
  { key: "crowdEnabled" as const, icon: "🏟️", label: "CROWD SOUNDS", desc: "Audience cheers & reactions", toggle: "toggleCrowd" as const },
];

export default function SettingsPage() {
  const settings = useSettings();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const clearData = () => {
    localStorage.removeItem("hc_onboarding_done");
    localStorage.removeItem("hc_settings");
    window.location.reload();
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

        {/* Gameplay toggles */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-secondary" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">GAMEPLAY</h2>
          </div>
          <div className="space-y-2">
            {TOGGLE_ITEMS.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="glass-premium rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center">
                  <span className="text-lg">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">{item.label}</span>
                  <span className="text-[8px] text-muted-foreground">{item.desc}</span>
                </div>
                <button
                  onClick={settings[item.toggle]}
                  className={`w-12 h-7 rounded-full relative transition-all ${
                    settings[item.key]
                      ? "bg-primary/20 border border-primary/40 shadow-[0_0_10px_hsl(217_91%_60%/0.15)]"
                      : "bg-muted/40 border border-muted-foreground/10"
                  }`}
                >
                  <motion.div
                    animate={{ x: settings[item.key] ? 20 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-5 h-5 rounded-full absolute top-[3px] transition-colors ${
                      settings[item.key]
                        ? "bg-gradient-to-br from-primary to-primary/80 shadow-[0_0_8px_hsl(217_91%_60%/0.4)]"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
