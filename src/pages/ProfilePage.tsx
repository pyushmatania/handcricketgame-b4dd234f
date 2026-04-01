import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface MatchRecord {
  id: string;
  mode: string;
  user_score: number;
  ai_score: number;
  result: string;
  balls_played: number;
  created_at: string;
}

const ACHIEVEMENTS = [
  { icon: "🏏", title: "First Match", desc: "Play your first match", key: "first_match", check: (p: any) => p.total_matches >= 1 },
  { icon: "🏆", title: "First Win", desc: "Win your first match", key: "first_win", check: (p: any) => p.wins >= 1 },
  { icon: "🔥", title: "On Fire", desc: "Win 3 in a row", key: "on_fire", check: (p: any) => p.best_streak >= 3 },
  { icon: "💯", title: "Century", desc: "Score 100+ in a match", key: "century", check: (p: any) => p.high_score >= 100 },
  { icon: "🎯", title: "10 Wins", desc: "Win 10 matches", key: "ten_wins", check: (p: any) => p.wins >= 10 },
  { icon: "⚡", title: "Veteran", desc: "Play 50 matches", key: "veteran", check: (p: any) => p.total_matches >= 50 },
];

interface ProfileData {
  display_name: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  high_score: number;
  current_streak: number;
  best_streak: number;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, total_matches, wins, losses, draws, high_score, current_streak, best_streak")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });

    supabase
      .from("matches")
      .select("id, mode, user_score, ai_score, result, balls_played, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setMatches(data);
      });
  }, [user]);

  const winRate = profile && profile.total_matches > 0
    ? Math.round((profile.wins / profile.total_matches) * 100) + "%"
    : "—";

  const stats = profile
    ? [
        { label: "Matches", value: String(profile.total_matches), icon: "🏏" },
        { label: "Wins", value: String(profile.wins), icon: "🏆" },
        { label: "Losses", value: String(profile.losses), icon: "💔" },
        { label: "Win Rate", value: winRate, icon: "📊" },
        { label: "High Score", value: String(profile.high_score), icon: "⭐" },
        { label: "Streak", value: String(profile.best_streak), icon: "🔥" },
      ]
    : [
        { label: "Matches", value: "0", icon: "🏏" },
        { label: "Wins", value: "0", icon: "🏆" },
        { label: "Losses", value: "0", icon: "💔" },
        { label: "Win Rate", value: "—", icon: "📊" },
        { label: "High Score", value: "—", icon: "⭐" },
        { label: "Streak", value: "0", icon: "🔥" },
      ];

  const unlockedCount = profile
    ? ACHIEVEMENTS.filter((a) => a.check(profile)).length
    : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/40 flex items-center justify-center">
              <span className="text-3xl">{user ? "🏏" : "👤"}</span>
            </div>
            {user && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-green border border-neon-green/50 flex items-center justify-center">
                <span className="text-[8px]">✓</span>
              </div>
            )}
          </div>
          <h1 className="font-display text-lg font-black text-foreground tracking-wider mt-3">
            {profile?.display_name || "PLAYER"}
          </h1>
          {user ? (
            <div className="mt-2 space-y-1">
              <p className="text-[9px] text-muted-foreground font-display">{user.email}</p>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="text-[9px] text-out-red/70 font-display tracking-wider"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground font-display mt-1">
                Sign in to save your progress
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/auth")}
                className="mt-3 px-6 py-2.5 bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-display font-bold text-xs rounded-xl border border-primary/30 tracking-wider"
              >
                🔐 SIGN IN
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-secondary" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
              CAREER STATS
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="glass-score p-3 text-center"
              >
                <span className="text-sm block mb-0.5">{s.icon}</span>
                <span className="font-display text-xl font-black text-foreground block leading-none">
                  {s.value}
                </span>
                <span className="text-[7px] text-muted-foreground font-display font-bold tracking-wider mt-1 block">
                  {s.label.toUpperCase()}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
              ACHIEVEMENTS
            </h2>
            <span className="text-[8px] text-muted-foreground/50 font-display">
              {unlockedCount} / {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a, i) => {
              const unlocked = profile ? a.check(profile) : false;
              return (
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className={`glass-score p-3 relative overflow-hidden ${!unlocked ? "opacity-40" : ""}`}
                >
                  <span className="text-xl block mb-1">{a.icon}</span>
                  <span className="font-display text-[10px] font-bold text-foreground block">
                    {a.title}
                  </span>
                  <span className="text-[8px] text-muted-foreground">{a.desc}</span>
                  {!unlocked && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[7px] text-muted-foreground/50 font-display">🔒</span>
                    </div>
                  )}
                  {unlocked && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[7px] text-neon-green font-display">✅</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Match History */}
        {matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-score-gold" />
              <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
                MATCH HISTORY
              </h2>
              <span className="text-[8px] text-muted-foreground/50 font-display">
                {matches.length} matches
              </span>
            </div>
            <div className="space-y-2">
              {(showAllMatches ? matches : matches.slice(0, 5)).map((m, i) => {
                const modeIcon = m.mode === "ar" ? "📸" : m.mode === "tournament" ? "🏆" : m.mode === "multiplayer" ? "⚔️" : "👆";
                const resultColor = m.result === "win" ? "text-neon-green" : m.result === "loss" ? "text-out-red" : "text-score-gold";
                const timeAgo = getTimeAgo(m.created_at);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.04 }}
                    className="glass-score p-3 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg">
                      {modeIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-display text-[10px] font-bold ${resultColor} tracking-wider`}>
                          {m.result.toUpperCase()}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-display">
                          {m.mode.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[8px] text-muted-foreground">
                        {m.balls_played} balls • {timeAgo}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-display text-sm font-black text-score-gold">{m.user_score}</span>
                      <span className="text-[9px] text-muted-foreground mx-1">-</span>
                      <span className="font-display text-sm font-black text-accent">{m.ai_score}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {matches.length > 5 && (
              <button
                onClick={() => setShowAllMatches(!showAllMatches)}
                className="w-full mt-2 py-2 text-[9px] font-display font-bold text-primary tracking-wider"
              >
                {showAllMatches ? "SHOW LESS ▲" : `VIEW ALL ${matches.length} MATCHES ▼`}
              </button>
            )}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
