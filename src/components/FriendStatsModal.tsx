import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PlayerAvatar from "./PlayerAvatar";

interface FriendProfile {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  draws?: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  abandons?: number;
  current_streak?: number;
  avatar_url?: string | null;
  avatar_index?: number;
}

interface MyProfile {
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  current_streak: number;
  abandons: number;
  display_name: string;
}

interface RecordBreak {
  id: string;
  record_type: string;
  broken_by: string;
  record_holder: string;
  old_value: number;
  new_value: number;
  broken_at: string;
}

interface H2HMatch {
  id: string;
  host_id: string;
  guest_id: string;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  status: string;
  abandoned_by: string | null;
  created_at: string;
  game_type: string;
}

interface H2HStats {
  myWins: number;
  theirWins: number;
  draws: number;
  totalGames: number;
  myHighScore: number;
  theirHighScore: number;
  myTotalRuns: number;
  theirTotalRuns: number;
  currentStreak: number;
  bestStreak: number;
  biggestWinMargin: number;
  firstMatchDate: string | null;
  lastPlayed: string | null;
  matches: H2HMatch[];
}

interface FriendMatchStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  highScore: number;
  totalRuns: number;
  sixes: number;
  fours: number;
  avgScore: number;
  strikeRate: number;
}

type Tab = "overview" | "individual" | "vsai" | "rivalry" | "records";

interface Props {
  friend: FriendProfile | null;
  onClose: () => void;
  onChallenge?: (friendId: string) => void;
}

const RECORD_LABELS: Record<string, { emoji: string; label: string }> = {
  high_score: { emoji: "⭐", label: "High Score" },
  best_streak: { emoji: "🔥", label: "Win Streak" },
  total_wins: { emoji: "🏆", label: "Total Wins" },
  total_matches: { emoji: "🏏", label: "Total Matches" },
  total_sixes: { emoji: "💥", label: "Total Sixes" },
  boundary_pct: { emoji: "🎯", label: "Boundary %" },
  win_rate: { emoji: "📊", label: "Win Rate" },
  fastest_win: { emoji: "⚡", label: "Fastest Win" },
};

function parseBalls(inningsData: any): { sixes: number; fours: number; totalRuns: number } {
  let sixes = 0, fours = 0, totalRuns = 0;
  if (!inningsData) return { sixes, fours, totalRuns };
  const innings = Array.isArray(inningsData) ? inningsData : [inningsData];
  for (const inn of innings) {
    const balls = inn?.balls || inn?.playerBalls || [];
    for (const b of balls) {
      const runs = typeof b === "number" ? b : (b?.runs ?? b?.playerMove ?? 0);
      if (runs === 6) sixes++;
      else if (runs === 4) fours++;
      totalRuns += typeof runs === "number" ? runs : 0;
    }
  }
  return { sixes, fours, totalRuns };
}

export default function FriendStatsModal({ friend, onClose, onChallenge }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [h2h, setH2h] = useState<H2HStats | null>(null);
  const [friendMatchStats, setFriendMatchStats] = useState<FriendMatchStats | null>(null);
  const [myMatchStats, setMyMatchStats] = useState<FriendMatchStats | null>(null);
  const [records, setRecords] = useState<RecordBreak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!friend || !user) return;
    setTab("overview");
    setLoading(true);
    Promise.all([loadMyProfile(), loadH2H(), loadMatchStats(), loadRecords()])
      .finally(() => setLoading(false));
  }, [friend?.user_id, user?.id]);

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles")
      .select("wins, losses, draws, total_matches, high_score, best_streak, current_streak, abandons, display_name")
      .eq("user_id", user.id).single();
    if (data) setMyProfile(data as unknown as MyProfile);
  };

  const loadH2H = async () => {
    if (!user || !friend) return;
    const { data } = await supabase
      .from("multiplayer_games")
      .select("*")
      .or(`and(host_id.eq.${user.id},guest_id.eq.${friend.user_id}),and(host_id.eq.${friend.user_id},guest_id.eq.${user.id})`)
      .in("status", ["finished", "abandoned"])
      .order("created_at", { ascending: false });

    if (!data || !data.length) {
      setH2h({ myWins: 0, theirWins: 0, draws: 0, totalGames: 0, myHighScore: 0, theirHighScore: 0, myTotalRuns: 0, theirTotalRuns: 0, currentStreak: 0, bestStreak: 0, biggestWinMargin: 0, firstMatchDate: null, lastPlayed: null, matches: [] });
      return;
    }

    let myWins = 0, theirWins = 0, draws = 0, myHighScore = 0, theirHighScore = 0;
    let myTotalRuns = 0, theirTotalRuns = 0, currentStreak = 0, bestStreak = 0, biggestWinMargin = 0;

    const chrono = [...data].reverse();
    chrono.forEach((g: any) => {
      const isHost = g.host_id === user.id;
      const myScore = isHost ? g.host_score : g.guest_score;
      const theirScore = isHost ? g.guest_score : g.host_score;
      myTotalRuns += myScore;
      theirTotalRuns += theirScore;
      if (myScore > myHighScore) myHighScore = myScore;
      if (theirScore > theirHighScore) theirHighScore = theirScore;
      const margin = myScore - theirScore;
      if (margin > biggestWinMargin) biggestWinMargin = margin;

      if (g.winner_id === user.id) {
        myWins++;
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
      } else if (g.winner_id === friend.user_id) {
        theirWins++;
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
      } else {
        draws++;
      }
      if (Math.abs(currentStreak) > Math.abs(bestStreak)) bestStreak = currentStreak;
    });

    setH2h({
      myWins, theirWins, draws, totalGames: data.length,
      myHighScore, theirHighScore, myTotalRuns, theirTotalRuns,
      currentStreak, bestStreak, biggestWinMargin,
      firstMatchDate: chrono[0]?.created_at || null,
      lastPlayed: data[0]?.created_at || null,
      matches: data as unknown as H2HMatch[],
    });
  };

  const loadMatchStats = async () => {
    if (!user || !friend) return;
    // Load friend's matches (now accessible via RLS)
    const { data: friendMatches } = await supabase
      .from("matches").select("*").eq("user_id", friend.user_id).order("created_at", { ascending: false }).limit(100);
    
    const { data: myMatches } = await supabase
      .from("matches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);

    setFriendMatchStats(computeMatchStats(friendMatches || []));
    setMyMatchStats(computeMatchStats(myMatches || []));
  };

  const computeMatchStats = (matches: any[]): FriendMatchStats => {
    let wins = 0, losses = 0, draws = 0, totalRuns = 0, sixes = 0, fours = 0;
    let highScore = 0;
    for (const m of matches) {
      if (m.result === "win") wins++;
      else if (m.result === "loss") losses++;
      else draws++;
      if (m.user_score > highScore) highScore = m.user_score;
      const parsed = parseBalls(m.innings_data);
      sixes += parsed.sixes;
      fours += parsed.fours;
      totalRuns += m.user_score;
    }
    const totalBalls = matches.reduce((s, m) => s + (m.balls_played || 0), 0);
    return {
      totalMatches: matches.length, wins, losses, draws, highScore, totalRuns,
      sixes, fours,
      avgScore: matches.length > 0 ? Math.round(totalRuns / matches.length) : 0,
      strikeRate: totalBalls > 0 ? Math.round((totalRuns / totalBalls) * 100) : 0,
    };
  };

  const loadRecords = async () => {
    if (!user || !friend) return;
    const { data } = await supabase
      .from("record_breaks")
      .select("*")
      .or(`and(broken_by.eq.${user.id},record_holder.eq.${friend.user_id}),and(broken_by.eq.${friend.user_id},record_holder.eq.${user.id})`)
      .order("broken_at", { ascending: false })
      .limit(20);
    setRecords((data as unknown as RecordBreak[]) || []);
  };

  if (!friend) return null;

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "overview", label: "OVERVIEW", emoji: "👤" },
    { key: "individual", label: "STATS", emoji: "📊" },
    { key: "vsai", label: "VS AI", emoji: "🆚" },
    { key: "rivalry", label: "H2H", emoji: "⚔️" },
    { key: "records", label: "RECORDS", emoji: "🏅" },
  ];

  const friendWinRate = friend.total_matches > 0 ? Math.round((friend.wins / friend.total_matches) * 100) : 0;
  const myWinRate = myProfile && myProfile.total_matches > 0 ? Math.round((myProfile.wins / myProfile.total_matches) * 100) : 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="w-full max-w-md max-h-[85vh] overflow-y-auto glass-premium rounded-3xl border border-primary/20 shadow-[0_0_60px_hsl(217_91%_60%/0.15)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/20">
            <div className="flex items-center gap-3">
              <PlayerAvatar avatarUrl={friend.avatar_url} avatarIndex={friend.avatar_index ?? 0} size="md" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-black text-foreground tracking-wider truncate">{friend.display_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-display text-muted-foreground">
                    {friend.wins}W {friend.losses}L • {friendWinRate}% WR
                  </span>
                  <span className="text-[8px] font-display text-secondary">🔥 {friend.best_streak} streak</span>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-xl glass-card flex items-center justify-center text-muted-foreground text-sm">✕</motion.button>
            </div>
            {onChallenge && (
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => onChallenge(friend.user_id)}
                className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[10px] font-bold tracking-widest">
                ⚔️ CHALLENGE TO BATTLE
              </motion.button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 p-2 mx-2 mt-2 glass-card rounded-xl">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-1.5 rounded-lg font-display text-[7px] font-bold tracking-widest transition-all flex items-center justify-center gap-0.5 ${
                  tab === t.key ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20" : "text-muted-foreground"
                }`}>
                <span className="text-[9px]">{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-12 text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-3 font-display">Loading stats...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* OVERVIEW TAB */}
                {tab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    {/* Profile stats */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "WINS", value: friend.wins, emoji: "🏆" },
                        { label: "LOSSES", value: friend.losses, emoji: "💔" },
                        { label: "HIGH", value: friend.high_score, emoji: "⭐" },
                        { label: "STREAK", value: friend.best_streak, emoji: "🔥" },
                      ].map((s) => (
                        <div key={s.label} className="glass-card rounded-xl p-2 text-center">
                          <span className="text-sm block">{s.emoji}</span>
                          <span className="font-display text-lg font-black text-foreground block leading-none mt-1">{s.value}</span>
                          <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Quick comparison: You vs Friend */}
                    {myProfile && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-secondary" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">YOU vs {friend.display_name.toUpperCase()}</span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { label: "WIN RATE", mine: `${myWinRate}%`, theirs: `${friendWinRate}%`, mineNum: myWinRate, theirsNum: friendWinRate },
                            { label: "WINS", mine: myProfile.wins, theirs: friend.wins, mineNum: myProfile.wins, theirsNum: friend.wins },
                            { label: "HIGH SCORE", mine: myProfile.high_score, theirs: friend.high_score, mineNum: myProfile.high_score, theirsNum: friend.high_score },
                            { label: "BEST STREAK", mine: myProfile.best_streak, theirs: friend.best_streak, mineNum: myProfile.best_streak, theirsNum: friend.best_streak },
                            { label: "MATCHES", mine: myProfile.total_matches, theirs: friend.total_matches, mineNum: myProfile.total_matches, theirsNum: friend.total_matches },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                              <span className={`font-display text-xs font-black flex-1 text-left ${row.mineNum > row.theirsNum ? "text-neon-green" : row.mineNum < row.theirsNum ? "text-foreground" : "text-foreground"}`}>
                                {row.mine}
                              </span>
                              <span className="text-[6px] font-display text-muted-foreground tracking-widest w-20 text-center">{row.label}</span>
                              <span className={`font-display text-xs font-black flex-1 text-right ${row.theirsNum > row.mineNum ? "text-secondary" : row.theirsNum < row.mineNum ? "text-foreground" : "text-foreground"}`}>
                                {row.theirs}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[6px] font-display text-muted-foreground tracking-widest px-1">
                            <span>YOU</span>
                            <span>{friend.display_name.toUpperCase()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* INDIVIDUAL STATS TAB */}
                {tab === "individual" && (
                  <motion.div key="individual" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 rounded-full bg-secondary" />
                      <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">{friend.display_name.toUpperCase()}'S FULL STATS</span>
                    </div>

                    {/* Overall record */}
                    <div className="glass-card rounded-xl p-3">
                      <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">OVERALL RECORD</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "MATCHES", value: friend.total_matches, emoji: "🏏", color: "text-foreground" },
                          { label: "WINS", value: friend.wins, emoji: "🏆", color: "text-neon-green" },
                          { label: "LOSSES", value: friend.losses, emoji: "💔", color: "text-out-red" },
                          { label: "WIN RATE", value: `${friendWinRate}%`, emoji: "📊", color: friendWinRate >= 50 ? "text-neon-green" : "text-out-red" },
                        ].map((s) => (
                          <div key={s.label} className="text-center">
                            <span className="text-sm block">{s.emoji}</span>
                            <span className={`font-display text-lg font-black ${s.color} block leading-none mt-0.5`}>{s.value}</span>
                            <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance metrics */}
                    {friendMatchStats && (
                      <div className="glass-card rounded-xl p-3">
                        <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">PERFORMANCE</span>
                        <div className="space-y-1.5">
                          {[
                            { label: "HIGH SCORE", value: friend.high_score, emoji: "⭐", color: "text-score-gold" },
                            { label: "BEST STREAK", value: friend.best_streak, emoji: "🔥", color: "text-secondary" },
                            { label: "AVG SCORE", value: friendMatchStats.avgScore, emoji: "📈", color: "text-foreground" },
                            { label: "STRIKE RATE", value: friendMatchStats.strikeRate, emoji: "⚡", color: "text-primary" },
                            { label: "TOTAL RUNS", value: friendMatchStats.totalRuns, emoji: "🏃", color: "text-foreground" },
                            { label: "TOTAL SIXES", value: friendMatchStats.sixes, emoji: "💥", color: "text-primary" },
                            { label: "TOTAL FOURS", value: friendMatchStats.fours, emoji: "🎯", color: "text-neon-green" },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between py-1 border-b border-muted/10 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{row.emoji}</span>
                                <span className="text-[8px] text-muted-foreground font-display tracking-wider">{row.label}</span>
                              </div>
                              <span className={`font-display text-sm font-black ${row.color}`}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Win/Loss ratio visual */}
                    {friend.total_matches > 0 && (
                      <div className="glass-card rounded-xl p-3">
                        <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">WIN/LOSS RATIO</span>
                        <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
                          <div className="bg-gradient-to-r from-neon-green to-neon-green/70 rounded-l-full" style={{ width: `${friendWinRate}%` }} />
                          <div className="bg-gradient-to-l from-out-red to-out-red/70 rounded-r-full flex-1" />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[6px] font-display text-neon-green font-bold">{friendWinRate}% W</span>
                          <span className="text-[6px] font-display text-out-red font-bold">{100 - friendWinRate}% L</span>
                        </div>
                      </div>
                    )}

                    {/* Abandons */}
                    {(friend.abandons ?? 0) > 0 && (
                      <div className="glass-card rounded-xl p-2 flex items-center gap-2">
                        <span className="text-sm">🏳️</span>
                        <span className="text-[8px] text-muted-foreground font-display tracking-wider">ABANDONS</span>
                        <span className="font-display text-sm font-black text-out-red ml-auto">{friend.abandons}</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* VS AI TAB */}
                {tab === "vsai" && (
                  <motion.div key="vsai" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">VS AI COMPARISON</span>
                    </div>

                    {myMatchStats && friendMatchStats ? (
                      <div className="space-y-2">
                        {[
                          { label: "MATCHES", mine: myMatchStats.totalMatches, theirs: friendMatchStats.totalMatches, emoji: "🏏" },
                          { label: "WIN RATE", mine: `${myMatchStats.totalMatches > 0 ? Math.round((myMatchStats.wins / myMatchStats.totalMatches) * 100) : 0}%`, theirs: `${friendMatchStats.totalMatches > 0 ? Math.round((friendMatchStats.wins / friendMatchStats.totalMatches) * 100) : 0}%`, mineNum: myMatchStats.wins, theirsNum: friendMatchStats.wins, emoji: "📊" },
                          { label: "HIGH SCORE", mine: myMatchStats.highScore, theirs: friendMatchStats.highScore, emoji: "⭐" },
                          { label: "AVG SCORE", mine: myMatchStats.avgScore, theirs: friendMatchStats.avgScore, emoji: "📈" },
                          { label: "STRIKE RATE", mine: myMatchStats.strikeRate, theirs: friendMatchStats.strikeRate, emoji: "⚡" },
                          { label: "TOTAL RUNS", mine: myMatchStats.totalRuns, theirs: friendMatchStats.totalRuns, emoji: "🏃" },
                          { label: "SIXES", mine: myMatchStats.sixes, theirs: friendMatchStats.sixes, emoji: "💥" },
                          { label: "FOURS", mine: myMatchStats.fours, theirs: friendMatchStats.fours, emoji: "🎯" },
                        ].map((row) => {
                          const mN = typeof row.mine === "number" ? row.mine : (row as any).mineNum ?? 0;
                          const tN = typeof row.theirs === "number" ? row.theirs : (row as any).theirsNum ?? 0;
                          return (
                            <div key={row.label} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                              <span className={`font-display text-xs font-black flex-1 text-left ${mN > tN ? "text-neon-green" : mN < tN ? "text-foreground" : "text-foreground"}`}>
                                {row.mine}
                              </span>
                              <div className="flex items-center gap-1 w-24 justify-center">
                                <span className="text-[9px]">{row.emoji}</span>
                                <span className="text-[6px] font-display text-muted-foreground tracking-widest">{row.label}</span>
                              </div>
                              <span className={`font-display text-xs font-black flex-1 text-right ${tN > mN ? "text-secondary" : tN < mN ? "text-foreground" : "text-foreground"}`}>
                                {row.theirs}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-[6px] font-display text-muted-foreground tracking-widest px-1">
                          <span>YOU</span>
                          <span>{friend.display_name.toUpperCase()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-xl p-6 text-center">
                        <span className="text-2xl block mb-2">📊</span>
                        <p className="text-[10px] text-muted-foreground font-display">No match data available</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* H2H RIVALRY TAB */}
                {tab === "rivalry" && (
                  <motion.div key="rivalry" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    {h2h && h2h.totalGames > 0 ? (
                      <>
                        {/* W/L record */}
                        <div className="glass-card rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-center">
                              <span className="font-display text-2xl font-black text-neon-green block leading-none">{h2h.myWins}</span>
                              <span className="text-[6px] font-display text-muted-foreground tracking-widest">YOU</span>
                            </div>
                            <div className="text-center px-3">
                              <span className="text-[8px] font-display text-muted-foreground tracking-widest">RIVALRY</span>
                              <span className="font-display text-sm font-bold text-foreground block">{h2h.totalGames} games</span>
                              {h2h.draws > 0 && <span className="text-[7px] text-secondary font-display">{h2h.draws} draws</span>}
                            </div>
                            <div className="text-center">
                              <span className="font-display text-2xl font-black text-out-red block leading-none">{h2h.theirWins}</span>
                              <span className="text-[6px] font-display text-muted-foreground tracking-widest">{friend.display_name.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                          {/* Win bar */}
                          <div className="h-3 rounded-full overflow-hidden flex bg-muted/30">
                            <div className="bg-gradient-to-r from-neon-green to-neon-green/70 rounded-l-full transition-all" style={{ width: `${h2h.totalGames > 0 ? (h2h.myWins / h2h.totalGames) * 100 : 50}%` }} />
                            <div className="bg-gradient-to-l from-out-red to-out-red/70 rounded-r-full flex-1" />
                          </div>
                        </div>

                        {/* Detailed rivalry stats */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "HIGH SCORE", mine: h2h.myHighScore, theirs: h2h.theirHighScore, emoji: "⭐" },
                            { label: "TOTAL RUNS", mine: h2h.myTotalRuns, theirs: h2h.theirTotalRuns, emoji: "🏃" },
                            { label: "AVG SCORE", mine: h2h.totalGames > 0 ? Math.round(h2h.myTotalRuns / h2h.totalGames) : 0, theirs: h2h.totalGames > 0 ? Math.round(h2h.theirTotalRuns / h2h.totalGames) : 0, emoji: "📊" },
                            { label: "BIGGEST WIN", mine: h2h.biggestWinMargin, theirs: "—", emoji: "💪" },
                          ].map((s) => (
                            <div key={s.label} className="glass-card rounded-lg p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-[8px]">{s.emoji}</span>
                                <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`font-display text-xs font-black ${typeof s.mine === "number" && typeof s.theirs === "number" && s.mine > s.theirs ? "text-neon-green" : "text-foreground"}`}>{s.mine}</span>
                                <span className="text-[5px] text-muted-foreground">vs</span>
                                <span className={`font-display text-xs font-black ${typeof s.theirs === "number" && typeof s.mine === "number" && s.theirs > s.mine ? "text-out-red" : "text-foreground"}`}>{s.theirs}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Streaks & milestones */}
                        <div className="flex gap-2">
                          <div className="flex-1 glass-card rounded-lg p-2 text-center">
                            <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">CURRENT STREAK</span>
                            <span className={`font-display text-sm font-black ${h2h.currentStreak > 0 ? "text-neon-green" : h2h.currentStreak < 0 ? "text-out-red" : "text-foreground"}`}>
                              {h2h.currentStreak > 0 ? `🔥 ${h2h.currentStreak}W` : h2h.currentStreak < 0 ? `${Math.abs(h2h.currentStreak)}L` : "—"}
                            </span>
                          </div>
                          <div className="flex-1 glass-card rounded-lg p-2 text-center">
                            <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">BEST STREAK</span>
                            <span className={`font-display text-sm font-black ${h2h.bestStreak > 0 ? "text-neon-green" : "text-out-red"}`}>
                              {h2h.bestStreak > 0 ? `${h2h.bestStreak}W` : h2h.bestStreak < 0 ? `${Math.abs(h2h.bestStreak)}L` : "—"}
                            </span>
                          </div>
                        </div>

                        {h2h.firstMatchDate && (
                          <div className="flex gap-2">
                            <div className="flex-1 glass-card rounded-lg p-2 text-center">
                              <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">FIRST MATCH</span>
                              <span className="font-display text-[9px] font-bold text-foreground">{formatDate(h2h.firstMatchDate)}</span>
                            </div>
                            <div className="flex-1 glass-card rounded-lg p-2 text-center">
                              <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">LAST PLAYED</span>
                              <span className="font-display text-[9px] font-bold text-foreground">{h2h.lastPlayed ? formatDate(h2h.lastPlayed) : "—"}</span>
                            </div>
                          </div>
                        )}

                        {/* Verdict */}
                        <div className={`text-center py-2.5 rounded-xl ${
                          h2h.myWins > h2h.theirWins ? "bg-neon-green/5 border border-neon-green/15" :
                          h2h.theirWins > h2h.myWins ? "bg-out-red/5 border border-out-red/15" :
                          "bg-secondary/5 border border-secondary/15"
                        }`}>
                          <span className="font-display text-[9px] font-bold tracking-wider">
                            {h2h.myWins > h2h.theirWins ? `🔥 YOU DOMINATE THIS RIVALRY` :
                             h2h.theirWins > h2h.myWins ? `😤 ${friend.display_name.toUpperCase()} LEADS` :
                             "🤝 EVENLY MATCHED"}
                          </span>
                        </div>

                        {/* Recent matches */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-accent" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">RECENT MATCHES</span>
                        </div>
                        <div className="space-y-1">
                          {h2h.matches.slice(0, 5).map((m) => {
                            const isHost = m.host_id === user?.id;
                            const myScore = isHost ? m.host_score : m.guest_score;
                            const theirScore = isHost ? m.guest_score : m.host_score;
                            const won = m.winner_id === user?.id;
                            const lost = m.winner_id === friend.user_id;
                            return (
                              <div key={m.id} className={`flex items-center gap-2 p-2 rounded-lg ${
                                won ? "bg-neon-green/5 border border-neon-green/10" : lost ? "bg-out-red/5 border border-out-red/10" : "bg-secondary/5 border border-secondary/10"
                              }`}>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-display font-black ${
                                  won ? "bg-neon-green/20 text-neon-green" : lost ? "bg-out-red/20 text-out-red" : "bg-secondary/20 text-secondary"
                                }`}>{won ? "W" : lost ? "L" : "D"}</div>
                                <span className={`font-display text-xs font-black ${won ? "text-neon-green" : "text-foreground"}`}>{myScore}</span>
                                <span className="text-[5px] text-muted-foreground">-</span>
                                <span className={`font-display text-xs font-black ${lost ? "text-out-red" : "text-foreground"}`}>{theirScore}</span>
                                <span className="flex-1" />
                                <span className="text-[6px] text-muted-foreground font-display">{formatDate(m.created_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="glass-card rounded-xl p-8 text-center">
                        <span className="text-3xl block mb-2">⚔️</span>
                        <p className="font-display text-sm font-bold text-foreground">No rivalry matches yet</p>
                        <p className="text-[9px] text-muted-foreground mt-1">Challenge {friend.display_name} to a multiplayer duel!</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* RECORDS TAB */}
                {tab === "records" && (
                  <motion.div key="records" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-4 rounded-full bg-score-gold" />
                      <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">RECORD-BREAKING MOMENTS</span>
                    </div>

                    {records.length > 0 ? (
                      <div className="space-y-2">
                        {records.map((r) => {
                          const info = RECORD_LABELS[r.record_type] || { emoji: "🏅", label: r.record_type };
                          const isBrokenByMe = r.broken_by === user?.id;
                          return (
                            <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                              className="glass-premium rounded-xl p-3 border border-score-gold/15">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-score-gold/10 border border-score-gold/20 flex items-center justify-center">
                                  <span className="text-xl">{info.emoji}</span>
                                </div>
                                <div className="flex-1">
                                  <span className="font-display text-[10px] font-bold text-foreground block">
                                    {isBrokenByMe ? "You" : friend.display_name} broke the {info.label} record!
                                  </span>
                                  <span className="text-[8px] text-muted-foreground font-display">
                                    {r.old_value} → <span className="text-score-gold font-bold">{r.new_value}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 mt-2 ml-13">
                                <span className="text-[6px] text-muted-foreground/60 font-display">
                                  📅 {formatDate(r.broken_at)} • {formatTime(r.broken_at)}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="glass-card rounded-xl p-8 text-center">
                        <span className="text-3xl block mb-2">🏅</span>
                        <p className="font-display text-sm font-bold text-foreground">No records broken yet</p>
                        <p className="text-[9px] text-muted-foreground mt-1">Keep playing — record breaks will be saved here as mementos!</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
