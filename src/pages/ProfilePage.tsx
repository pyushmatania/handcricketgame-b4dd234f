import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import PlayerCard, { INDIAN_LEGENDS, type PlayerInfo } from "@/components/PlayerCard";
import PlayerDetailModal from "@/components/PlayerDetailModal";

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

type TabType = "stats" | "matches" | "squad";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);

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
      .then(({ data }) => { if (data) setProfile(data); });

    supabase
      .from("matches")
      .select("id, mode, user_score, ai_score, result, balls_played, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setMatches(data); });
  }, [user]);

  const winRate = profile && profile.total_matches > 0
    ? Math.round((profile.wins / profile.total_matches) * 100)
    : 0;

  const level = profile ? Math.floor(profile.total_matches / 5) + 1 : 1;
  const unlockedCount = profile ? ACHIEVEMENTS.filter((a) => a.check(profile)).length : 0;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "stats", label: "STATS", icon: "📊" },
    { key: "matches", label: "MATCHES", icon: "🏏" },
    { key: "squad", label: "SQUAD", icon: "⭐" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Profile Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-premium rounded-2xl p-4 mb-4 relative overflow-hidden"
        >
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />

          <div className="flex items-center gap-4 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                <span className="text-3xl">{user ? "🏏" : "👤"}</span>
              </div>
              {user && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-gradient-to-br from-neon-green to-neon-green/70 border border-neon-green/50 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">✓</span>
                </div>
              )}
              {/* Level ring */}
              <div className="absolute -top-1 -left-1 w-7 h-7 rounded-lg bg-gradient-to-br from-secondary to-secondary/70 border border-secondary/40 flex items-center justify-center">
                <span className="font-display text-[8px] font-black text-secondary-foreground">{level}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-base font-black text-foreground tracking-wider">
                {profile?.display_name || "PLAYER"}
              </h1>
              {user && (
                <p className="text-[8px] text-muted-foreground font-display tracking-wider mt-0.5">
                  {user.email}
                </p>
              )}
              {/* Quick stats row */}
              <div className="flex gap-3 mt-2">
                <div className="text-center">
                  <span className="font-display text-sm font-black text-primary block leading-none">{profile?.wins || 0}</span>
                  <span className="text-[6px] text-muted-foreground font-display tracking-widest">WINS</span>
                </div>
                <div className="text-center">
                  <span className="font-display text-sm font-black text-out-red block leading-none">{profile?.losses || 0}</span>
                  <span className="text-[6px] text-muted-foreground font-display tracking-widest">LOSSES</span>
                </div>
                <div className="text-center">
                  <span className="font-display text-sm font-black text-secondary block leading-none">{winRate}%</span>
                  <span className="text-[6px] text-muted-foreground font-display tracking-widest">WIN RATE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auth actions */}
          {user ? (
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg glass-card text-[8px] text-out-red/70 font-display font-bold tracking-wider"
            >
              SIGN OUT
            </button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/auth")}
              className="absolute top-3 right-3 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-display font-bold text-[9px] rounded-xl border border-primary/30 tracking-wider"
            >
              🔐 SIGN IN
            </motion.button>
          )}
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-4 glass-card rounded-xl p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { icon: "🏏", value: String(profile?.total_matches || 0), label: "MATCHES" },
                  { icon: "⭐", value: String(profile?.high_score || 0), label: "HIGH SCORE" },
                  { icon: "🔥", value: String(profile?.best_streak || 0), label: "BEST STREAK" },
                  { icon: "🏆", value: String(profile?.wins || 0), label: "WINS" },
                  { icon: "💔", value: String(profile?.losses || 0), label: "LOSSES" },
                  { icon: "🤝", value: String(profile?.draws || 0), label: "DRAWS" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="glass-premium rounded-xl p-3 text-center relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-lg block mb-1">{s.icon}</span>
                    <span className="font-display text-xl font-black text-foreground block leading-none">
                      {s.value}
                    </span>
                    <span className="text-[6px] text-muted-foreground font-display font-bold tracking-[0.2em] mt-1 block">
                      {s.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Win Rate Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-premium rounded-xl p-4 mb-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[9px] font-bold text-muted-foreground tracking-widest">WIN RATE</span>
                  <span className="font-display text-lg font-black text-primary">{winRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${winRate}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  />
                </div>
              </motion.div>

              {/* Achievements */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-primary" />
                <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
                  ACHIEVEMENTS
                </span>
                <span className="text-[8px] text-muted-foreground/50 font-display">
                  {unlockedCount}/{ACHIEVEMENTS.length}
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
                      transition={{ delay: 0.35 + i * 0.04 }}
                      className={`glass-premium rounded-xl p-3 relative overflow-hidden ${!unlocked ? "opacity-35 grayscale" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{a.icon}</span>
                        <div>
                          <span className="font-display text-[10px] font-bold text-foreground block">{a.title}</span>
                          <span className="text-[7px] text-muted-foreground">{a.desc}</span>
                        </div>
                      </div>
                      {unlocked && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center">
                          <span className="text-[8px]">✅</span>
                        </div>
                      )}
                      {!unlocked && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center">
                          <span className="text-[7px]">🔒</span>
                        </div>
                      )}
                      {unlocked && <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-green to-neon-green/30`} />}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {matches.length === 0 ? (
                <div className="glass-premium rounded-xl p-8 text-center">
                  <span className="text-3xl block mb-2">🏏</span>
                  <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO MATCHES YET</span>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Play your first match to see history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m, i) => {
                    const modeIcon = m.mode === "ar" ? "📸" : m.mode === "tournament" ? "🏆" : m.mode === "multiplayer" ? "⚔️" : "👆";
                    const resultColor = m.result === "win" ? "text-neon-green" : m.result === "loss" ? "text-out-red" : "text-secondary";
                    const resultBg = m.result === "win" ? "from-neon-green/10" : m.result === "loss" ? "from-out-red/10" : "from-secondary/10";
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`glass-premium rounded-xl p-3 flex items-center gap-3 relative overflow-hidden`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${resultBg} to-transparent opacity-30`} />
                        <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-lg relative z-10">
                          {modeIcon}
                        </div>
                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className={`font-display text-[10px] font-bold ${resultColor} tracking-wider`}>
                              {m.result.toUpperCase()}
                            </span>
                            <span className="text-[7px] text-muted-foreground font-display px-1.5 py-0.5 rounded bg-muted/30">
                              {m.mode.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[8px] text-muted-foreground">
                            {m.balls_played} balls • {getTimeAgo(m.created_at)}
                          </span>
                        </div>
                        <div className="text-right relative z-10">
                          <div className="flex items-baseline gap-1">
                            <span className="font-display text-base font-black text-secondary">{m.user_score}</span>
                            <span className="text-[8px] text-muted-foreground">vs</span>
                            <span className="font-display text-base font-black text-accent">{m.ai_score}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "squad" && (
            <motion.div
              key="squad"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-secondary" />
                <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">
                  INDIAN LEGENDS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INDIAN_LEGENDS.map((player, i) => (
                  <PlayerCard key={player.id} player={player} size="sm" delay={i * 0.1} onTap={setSelectedPlayer} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
      {selectedPlayer && (
        <PlayerDetailModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
