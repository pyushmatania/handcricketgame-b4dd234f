import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/layout/TopBar";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import RivalrySection from "@/components/RivalrySection";
import DailyStreakWidget from "@/components/DailyStreakWidget";
import CardFrame from "@/components/shared/CardFrame";
import GameButton from "@/components/shared/GameButton";
import GameProgressBar from "@/components/shared/GameProgressBar";
import { useRivals } from "@/hooks/useRivals";
import stadiumGully from "@/assets/stadium-gully.jpg";

interface ProfileData {
  total_matches: number;
  wins: number;
  losses: number;
  high_score: number;
  current_streak: number;
  best_streak: number;
  coins: number;
  xp: number;
}

interface RecentMatch {
  id: string;
  mode: string;
  user_score: number;
  ai_score: number;
  result: string;
  created_at: string;
}

const ARENA_LEVELS = [
  { name: "Gully Grounds", trophies: 0 },
  { name: "School Ground", trophies: 100 },
  { name: "Club Pitch", trophies: 300 },
  { name: "IPL Arena", trophies: 600 },
  { name: "World Cup", trophies: 1000 },
];

// Chest slot states
const CHEST_SLOTS = [
  { state: "ready", type: "gold", label: "OPEN!" },
  { state: "locked", type: "silver", timer: "2h 30m" },
  { state: "locked", type: "bronze", timer: "1h 15m" },
  { state: "empty", type: null, label: "" },
];

const CHEST_EMOJIS: Record<string, string> = {
  bronze: "🪙",
  silver: "⬜",
  gold: "👑",
  diamond: "💎",
};

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
      .select("total_matches, wins, losses, high_score, current_streak, best_streak, coins, xp")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as ProfileData); });

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

  const currentTrophies = profile?.wins ?? 0;
  const currentArena = ARENA_LEVELS.reduce((prev, curr) =>
    currentTrophies >= curr.trophies ? curr : prev, ARENA_LEVELS[0]);
  const nextArena = ARENA_LEVELS[ARENA_LEVELS.indexOf(currentArena) + 1] || currentArena;

  return (
    <div className="min-h-screen bg-[hsl(240_30%_6%)] relative overflow-hidden pb-28">
      {/* Background sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_60%_18%)] via-[hsl(240_30%_8%)] to-[hsl(240_30%_6%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[hsl(30_80%_50%/0.08)] to-transparent pointer-events-none" />

      {/* Top Bar */}
      <TopBar coins={profile?.coins ?? 0} runs={profile?.xp ?? 0} />

      <div className="relative z-10 max-w-lg mx-auto px-3 pt-16">

        {/* ── Promo Banners Row ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-3"
        >
          {/* Free Chest Card */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/shop")}
            className="relative bg-gradient-to-br from-game-gold/20 to-game-gold/5 border-2 border-game-gold/30 rounded-2xl p-3 flex flex-col items-center gap-1 overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 border-2 border-game-gold/40 rounded-2xl"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-3xl">🎁</span>
            <span className="font-game-display text-[9px] text-game-gold tracking-wider">
              FREE CHEST
            </span>
            <span className="font-game-body text-[8px] text-game-gold/70">OPEN NOW!</span>
          </motion.button>

          {/* Daily Challenge Card */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/game/daily")}
            className="bg-gradient-to-br from-game-blue/20 to-game-blue/5 border-2 border-game-blue/30 rounded-2xl p-3 flex flex-col items-center gap-1"
          >
            <span className="text-3xl">📅</span>
            <span className="font-game-display text-[9px] text-game-blue tracking-wider">
              DAILY CHALLENGE
            </span>
            <div className="w-full mt-0.5">
              <GameProgressBar value={3} max={10} color="blue" showText={false} />
            </div>
          </motion.button>
        </motion.div>

        {/* ── Central Stadium Stage ────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 20 }}
          className="mb-3"
        >
          <CardFrame rarity="rare" className="overflow-hidden">
            {/* Arena name */}
            <div className="bg-gradient-to-r from-game-dark via-game-medium to-game-dark py-1.5 px-3 text-center border-b border-game-blue/20">
              <span className="font-game-display text-[11px] text-game-gold tracking-[0.15em]">
                ⭐ {currentArena.name.toUpperCase()} ⭐
              </span>
            </div>

            {/* Stadium scene */}
            <div className="relative h-44 overflow-hidden">
              <img
                src={stadiumGully}
                alt="Stadium"
                className="w-full h-full object-cover"
                loading="lazy"
                width={1024}
                height={768}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_30%_6%/0.8)] via-transparent to-[hsl(240_30%_6%/0.3)]" />

              {/* Floating stats overlay */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-around px-4">
                <div className="text-center">
                  <span className="font-game-display text-lg text-white drop-shadow-lg">
                    {profile?.total_matches ?? 0}
                  </span>
                  <span className="block font-game-body text-[7px] text-white/60 uppercase tracking-wider">
                    Matches
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-game-display text-lg text-game-gold drop-shadow-lg">
                    {profile?.wins ?? 0}
                  </span>
                  <span className="block font-game-body text-[7px] text-white/60 uppercase tracking-wider">
                    Wins
                  </span>
                </div>
                <div className="text-center">
                  <span className="font-game-display text-lg text-game-green drop-shadow-lg">
                    {winRate}%
                  </span>
                  <span className="block font-game-body text-[7px] text-white/60 uppercase tracking-wider">
                    Win Rate
                  </span>
                </div>
              </div>
            </div>
          </CardFrame>
        </motion.div>

        {/* ── BIG PLAY BUTTON ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          className="mb-3"
        >
          <GameButton
            variant="primary"
            size="lg"
            bounce
            className="w-full text-xl relative overflow-hidden shadow-game-glow-green"
            onClick={() => navigate("/play")}
            icon={<span>▶</span>}
          >
            PLAY
          </GameButton>
        </motion.div>

        {/* ── Arena Progress Bar ──────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-4 px-1"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-game-body text-[9px] text-muted-foreground font-bold">
              🏟️ {currentArena.name}
            </span>
            <span className="font-game-body text-[9px] text-game-gold font-bold">
              → {nextArena.name}
            </span>
          </div>
          <GameProgressBar
            value={currentTrophies - currentArena.trophies}
            max={Math.max(nextArena.trophies - currentArena.trophies, 1)}
            color="gold"
            showText={false}
          />
          <div className="flex justify-center mt-1">
            <span className="font-game-display text-[9px] text-game-gold">
              🏆 {currentTrophies} / {nextArena.trophies}
            </span>
          </div>
        </motion.div>

        {/* ── Chest Slot Row ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-4 gap-2 mb-4"
        >
          {CHEST_SLOTS.map((slot, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => slot.state === "ready" ? navigate("/shop") : undefined}
              className={`relative rounded-2xl p-2 flex flex-col items-center justify-center min-h-[80px] border-2 transition-all ${
                slot.state === "ready"
                  ? "bg-gradient-to-b from-game-gold/20 to-game-gold/5 border-game-gold/40"
                  : slot.state === "locked"
                  ? "bg-gradient-to-b from-game-medium to-game-dark border-[hsl(222_25%_22%/0.5)]"
                  : "bg-game-dark/40 border-dashed border-[hsl(222_25%_22%/0.3)]"
              }`}
            >
              {slot.state === "ready" && (
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-game-gold/10"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {slot.type ? (
                <>
                  <span className="text-2xl mb-0.5">{CHEST_EMOJIS[slot.type]}</span>
                  {slot.state === "ready" && (
                    <span className="font-game-display text-[7px] text-game-gold animate-pulse">
                      OPEN!
                    </span>
                  )}
                  {slot.state === "locked" && slot.timer && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm">🔒</span>
                      <span className="font-game-display text-[7px] text-muted-foreground">
                        {slot.timer}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground/30 text-lg">+</span>
                  <span className="font-game-body text-[6px] text-muted-foreground/40 uppercase">
                    Chest Slot
                  </span>
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* ── Quick Mode Buttons ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="grid grid-cols-2 gap-2 mb-4"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/game/multiplayer")}
            className="bg-gradient-to-br from-game-orange/20 to-game-red/10 border-2 border-game-orange/30 rounded-2xl p-3 flex items-center gap-3"
          >
            <span className="text-2xl">⚔️</span>
            <div className="text-left">
              <span className="font-game-display text-[10px] text-game-orange block">PvP</span>
              <span className="font-game-body text-[8px] text-muted-foreground">Win Trophies</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/game/tournament")}
            className="bg-gradient-to-br from-game-purple/20 to-game-blue/10 border-2 border-game-purple/30 rounded-2xl p-3 flex items-center gap-3"
          >
            <span className="text-2xl">🏆</span>
            <div className="text-left">
              <span className="font-game-display text-[10px] text-game-purple block">Tournament</span>
              <span className="font-game-body text-[8px] text-muted-foreground">Win Coins</span>
            </div>
          </motion.button>
        </motion.div>

        {/* ── Daily Streak ────────────────────── */}
        <DailyStreakWidget />

        {/* ── Rivalry Section ─────────────────── */}
        <RivalrySection rivals={rivals} loading={rivalsLoading} />

        {/* ── Past Match Widget ───────────────── */}
        {recentMatch && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-4"
          >
            <CardFrame rarity="common" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-game-display text-[8px] text-muted-foreground tracking-[0.2em]">
                  PAST MATCH
                </span>
                <span className={`font-game-display text-[9px] tracking-wider px-2 py-0.5 rounded-full ${
                  recentMatch.result === "win"
                    ? "bg-game-green/15 text-game-green border border-game-green/20"
                    : recentMatch.result === "loss"
                    ? "bg-game-red/15 text-game-red border border-game-red/20"
                    : "bg-game-gold/15 text-game-gold border border-game-gold/20"
                }`}>
                  {recentMatch.result.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-game-blue/15 border border-game-blue/20 flex items-center justify-center">
                    <span className="text-base">🏏</span>
                  </div>
                  <div>
                    <span className="font-game-body text-xs font-bold text-foreground">You</span>
                    <span className="block font-game-display text-[7px] text-muted-foreground tracking-wider">
                      {recentMatch.mode.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-game-display text-xl text-game-gold">{recentMatch.user_score}</span>
                  <span className="text-muted-foreground mx-1 text-xs">:</span>
                  <span className="font-game-display text-xl text-muted-foreground">{recentMatch.ai_score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-game-body text-xs font-bold text-foreground">AI</span>
                    <span className="block font-game-display text-[7px] text-muted-foreground tracking-wider">BOT</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-game-red/15 border border-game-red/20 flex items-center justify-center">
                    <span className="text-base">🤖</span>
                  </div>
                </div>
              </div>
            </CardFrame>
          </motion.div>
        )}

        {/* ── More Modes ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-4 space-y-2"
        >
          {[
            { icon: "📸", label: "AR Camera", desc: "Hand gesture tracking", mode: "ar", color: "game-blue" },
            { icon: "👆", label: "Tap Mode", desc: "Quick tap gameplay", mode: "tap", color: "game-green" },
            { icon: "🎯", label: "Practice", desc: "Learn hand gestures", mode: "practice", color: "game-teal" },
          ].map((m, i) => (
            <motion.button
              key={m.mode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/game/${m.mode}`)}
              className={`w-full bg-gradient-to-r from-${m.color}/10 to-transparent border border-${m.color}/20 rounded-2xl p-3 flex items-center gap-3`}
            >
              <div className={`w-10 h-10 rounded-xl bg-${m.color}/15 border border-${m.color}/20 flex items-center justify-center`}>
                <span className="text-lg">{m.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <span className={`font-game-display text-[10px] text-${m.color} block`}>{m.label}</span>
                <span className="font-game-body text-[8px] text-muted-foreground">{m.desc}</span>
              </div>
              <span className="text-muted-foreground/30 text-sm font-bold">›</span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Gesture Strip Footer ────────────── */}
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
