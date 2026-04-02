import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import RivalrySection from "@/components/RivalrySection";
import DailyStreakWidget from "@/components/DailyStreakWidget";
import { useRivals } from "@/hooks/useRivals";

interface ProfileData {
  total_matches: number;
  wins: number;
  losses: number;
  high_score: number;
  current_streak: number;
  best_streak: number;
}

interface RecentMatch {
  id: string;
  mode: string;
  user_score: number;
  ai_score: number;
  result: string;
  created_at: string;
}

const QUICK_MODES = [
  { icon: "📸", label: "AR Mode", mode: "ar", color: "from-primary/25 to-primary/5", border: "border-primary/25", glow: "shadow-[0_0_15px_hsl(217_91%_60%/0.15)]" },
  { icon: "👆", label: "Tap", mode: "tap", color: "from-accent/25 to-accent/5", border: "border-accent/25", glow: "shadow-[0_0_15px_hsl(168_80%_50%/0.15)]" },
  { icon: "📅", label: "Daily", mode: "daily", color: "from-secondary/25 to-secondary/5", border: "border-secondary/25", glow: "shadow-[0_0_15px_hsl(45_93%_58%/0.15)]" },
  { icon: "⚔️", label: "PvP", mode: "multiplayer", color: "from-out-red/20 to-out-red/5", border: "border-out-red/20", glow: "shadow-[0_0_15px_hsl(0_72%_51%/0.1)]" },
];

const ALL_MODES = [
  { icon: "🏆", label: "Tournament", desc: "5-round bracket challenge", mode: "tournament", accent: "text-secondary" },
  { icon: "🎯", label: "Practice", desc: "Learn hand gestures", mode: "practice", accent: "text-neon-green" },
  { icon: "📸", label: "AR Camera", desc: "Hand gesture tracking", mode: "ar", accent: "text-primary" },
  { icon: "⚔️", label: "Multiplayer", desc: "Real-time PvP battles", mode: "multiplayer", accent: "text-out-red" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recentMatch, setRecentMatch] = useState<RecentMatch | null>(null);
  const { rivals, loading: rivalsLoading } = useRivals();

  useEffect(() => {
    const seen = localStorage.getItem("hc_onboarding_done");
    if (!seen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("total_matches, wins, losses, high_score, current_streak, best_streak")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });

    supabase
      .from("matches")
      .select("id, mode, user_score, ai_score, result, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setRecentMatch(data[0]); });
  }, [user]);


  const completeOnboarding = () => {
    localStorage.setItem("hc_onboarding_done", "1");
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingTutorial onComplete={completeOnboarding} />;
  }

  const winRate = profile && profile.total_matches > 0
    ? Math.round((profile.wins / profile.total_matches) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-28">
      {/* Background layers */}
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      

      {/* Top ambient glow */}
      <div
        className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.06) 0%, transparent 70%)" }}
      />

      {/* Top Status Bar */}
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">

        {/* ── Quick Play Grid ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.2em]">
              QUICK PLAY
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {QUICK_MODES.map((m, i) => (
              <motion.button
                key={m.mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/game/${m.mode}`)}
                className={`bg-gradient-to-br ${m.color} border ${m.border} rounded-2xl p-3 flex flex-col items-center gap-1.5 ${m.glow} active:scale-95 transition-all`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="font-display text-[8px] font-bold text-foreground tracking-wider">
                  {m.label.toUpperCase()}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Daily Streak ───────────────────────── */}
        <DailyStreakWidget />

        {/* ── Play Now CTA ───────────────────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/play")}
          className="w-full py-4 bg-gradient-to-r from-primary via-primary/90 to-accent/60 text-primary-foreground font-display font-black text-sm rounded-2xl glow-primary transition-all tracking-wider mb-4 relative overflow-hidden"
        >
          <span className="relative z-10">⚡ ALL GAME MODES</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/8 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.button>

        {/* ── Stats Cards Row ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-2 mb-4"
        >
          <div className="glass-card p-3 text-center">
            <span className="text-lg block mb-0.5">🏏</span>
            <span className="font-display text-xl font-black text-foreground block leading-none">
              {profile?.total_matches ?? 0}
            </span>
            <span className="text-[7px] text-muted-foreground font-display font-bold tracking-wider mt-1 block">
              MATCHES
            </span>
          </div>
          <div className="glass-card p-3 text-center">
            <span className="text-lg block mb-0.5">🏆</span>
            <span className="font-display text-xl font-black text-secondary block leading-none">
              {profile?.wins ?? 0}
            </span>
            <span className="text-[7px] text-muted-foreground font-display font-bold tracking-wider mt-1 block">
              WINS
            </span>
          </div>
          <div className="glass-card p-3 text-center">
            <span className="text-lg block mb-0.5">📊</span>
            <span className="font-display text-xl font-black text-primary block leading-none">
              {winRate}%
            </span>
            <span className="text-[7px] text-muted-foreground font-display font-bold tracking-wider mt-1 block">
              WIN RATE
            </span>
          </div>
        </motion.div>


        {/* ── Rivalry Section ────────────────────── */}
        <RivalrySection rivals={rivals} loading={rivalsLoading} />

        {/* ── Past Match Widget ──────────────────── */}
        {recentMatch && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-premium p-4 mb-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.2em]">
                PAST MATCH
              </span>
              <span className={`font-display text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                recentMatch.result === "win"
                  ? "bg-neon-green/15 text-neon-green border border-neon-green/20"
                  : recentMatch.result === "loss"
                  ? "bg-out-red/15 text-out-red border border-out-red/20"
                  : "bg-secondary/15 text-secondary border border-secondary/20"
              }`}>
                {recentMatch.result.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <span className="text-lg">🏏</span>
                </div>
                <div>
                  <span className="font-heading text-sm font-bold text-foreground block">You</span>
                  <span className="font-display text-[8px] text-muted-foreground tracking-wider">
                    {recentMatch.mode.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-center px-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-black text-secondary">{recentMatch.user_score}</span>
                  <span className="text-[10px] text-muted-foreground font-display font-bold">:</span>
                  <span className="font-display text-2xl font-black text-muted-foreground">{recentMatch.ai_score}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-heading text-sm font-bold text-foreground block">AI</span>
                  <span className="font-display text-[8px] text-muted-foreground tracking-wider">BOT</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── More Modes ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-secondary" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.2em]">
              GAME MODES
            </h2>
          </div>

          <div className="space-y-2">
            {ALL_MODES.map((m, i) => (
              <motion.button
                key={m.mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/game/${m.mode}`)}
                className="w-full glass-card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xl">{m.icon}</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-heading text-[12px] font-bold text-foreground block tracking-wide">
                    {m.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{m.desc}</span>
                </div>
                <span className="text-muted-foreground/30 text-sm">›</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Tutorial Banner ────────────────────── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => setShowOnboarding(true)}
          className="w-full glass-card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform mb-4"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center shrink-0">
            <span className="text-lg">📖</span>
          </div>
          <div className="text-left flex-1">
            <span className="font-heading text-[11px] font-bold text-foreground block">
              Gesture Tutorial
            </span>
            <span className="text-[9px] text-muted-foreground">Learn all 6 hand cricket gestures</span>
          </div>
          <span className="text-muted-foreground/30 text-sm">›</span>
        </motion.button>

        {/* ── Gesture Strip ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-5 pb-4"
        >
          {["✊", "☝️", "✌️", "🤟", "🖖", "👍"].map((e, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, delay: i * 0.2, repeat: Infinity }}
              className="text-base opacity-15"
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
