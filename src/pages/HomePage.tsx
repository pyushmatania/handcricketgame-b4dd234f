import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import ParticleField from "@/components/ParticleField";
import OnboardingTutorial from "@/components/OnboardingTutorial";

interface QuickStat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

const MODES = [
  { icon: "📸", label: "AR Mode", desc: "Hand gesture tracking", mode: "ar", gradient: "from-primary/20 to-primary/5", border: "border-primary/20" },
  { icon: "👆", label: "Tap Mode", desc: "Quick tap gameplay", mode: "tap", gradient: "from-accent/20 to-accent/5", border: "border-accent/20" },
  { icon: "📅", label: "Daily", desc: "Daily target challenge", mode: "daily", gradient: "from-score-gold/20 to-score-gold/5", border: "border-score-gold/20" },
  { icon: "⚔️", label: "Multiplayer", desc: "Real-time PvP", mode: "multiplayer", gradient: "from-secondary/20 to-secondary/5", border: "border-secondary/20" },
  { icon: "🏆", label: "Tournament", desc: "5-round bracket", mode: "tournament", gradient: "from-score-gold/20 to-score-gold/5", border: "border-score-gold/20" },
  { icon: "🎯", label: "Practice", desc: "Learn gestures", mode: "practice", gradient: "from-neon-green/20 to-neon-green/5", border: "border-neon-green/20" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([
    { label: "MATCHES", value: "0", icon: "🏏", color: "text-primary" },
    { label: "WINS", value: "0", icon: "🏆", color: "text-secondary" },
    { label: "HIGH SCORE", value: "—", icon: "⭐", color: "text-score-gold" },
  ]);

  useEffect(() => {
    const seen = localStorage.getItem("hc_onboarding_done");
    if (!seen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("total_matches, wins, high_score")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setQuickStats([
            { label: "MATCHES", value: String(data.total_matches), icon: "🏏", color: "text-primary" },
            { label: "WINS", value: String(data.wins), icon: "🏆", color: "text-secondary" },
            { label: "HIGH SCORE", value: data.high_score > 0 ? String(data.high_score) : "—", icon: "⭐", color: "text-score-gold" },
          ]);
        }
      });
  }, [user]);

  const completeOnboarding = () => {
    localStorage.setItem("hc_onboarding_done", "1");
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingTutorial onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      {/* Background layers */}
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <ParticleField />

      {/* Radial glow */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(4 85% 58% / 0.08) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary/30 to-accent/10 border border-primary/30 flex items-center justify-center glow-primary mb-5"
          >
            <span className="text-5xl">🏏</span>
          </motion.div>

          <h1 className="font-display text-3xl font-black text-foreground tracking-wider leading-tight">
            HAND CRICKET
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display text-[10px] tracking-[0.35em] text-primary font-bold mt-2"
          >
            AUGMENTED REALITY • LIVE
          </motion.p>
        </motion.div>

        {/* Play CTA */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/play")}
          className="w-full py-4 bg-gradient-to-r from-primary via-primary/90 to-out-red/80 text-primary-foreground font-display font-black text-base rounded-2xl glow-primary transition-all tracking-wider mb-6 relative overflow-hidden group"
        >
          <span className="relative z-10">⚡ PLAY NOW</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.button>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-2 mb-6"
        >
          {quickStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="glass-score p-3 text-center group hover:border-primary/20 transition-colors"
            >
              <span className="text-xl block mb-1">{s.icon}</span>
              <span className={`font-display text-lg font-black block leading-none ${s.color}`}>
                {s.value}
              </span>
              <span className="text-[7px] text-muted-foreground font-display font-bold tracking-wider mt-1 block">
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Game Modes */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
              GAME MODES
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/10" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m, i) => (
              <motion.button
                key={m.mode}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/game/${m.mode}`)}
                className={`relative bg-gradient-to-br ${m.gradient} border ${m.border} rounded-2xl p-4 text-left transition-all active:scale-95`}
              >
                <span className="text-2xl block mb-2">{m.icon}</span>
                <span className="font-display text-[11px] font-bold text-foreground block tracking-wider">
                  {m.label}
                </span>
                <span className="text-[9px] text-muted-foreground">{m.desc}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Tutorial shortcut */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => setShowOnboarding(true)}
          className="w-full mt-5 glass-premium px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <span className="text-lg">📖</span>
          </div>
          <div className="text-left flex-1">
            <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">
              GESTURE TUTORIAL
            </span>
            <span className="text-[9px] text-muted-foreground">Learn all 6 hand cricket gestures</span>
          </div>
          <span className="text-[10px] text-muted-foreground">→</span>
        </motion.button>

        {/* Gesture strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-5 flex items-center justify-center gap-4"
        >
          {["✊", "☝️", "✌️", "🤟", "🖖", "👍"].map((e, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
              className="text-base opacity-20"
            >
              {e}
            </motion.span>
          ))}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
