import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PlayerAvatar from "./PlayerAvatar";
import { usePvpStats } from "@/hooks/usePvpStats";
import RankBadge from "./RankBadge";
import { getRankTier, calculateRankPoints } from "@/lib/rankTiers";

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
  xp?: number;
  coins?: number;
  rank_tier?: string;
  login_streak?: number;
  best_login_streak?: number;
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
  xp: number;
  coins: number;
  rank_tier: string;
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
  const items = Array.isArray(inningsData) ? inningsData : [inningsData];

  // Handle both flat BallResult[] format and nested innings format
  for (const item of items) {
    // If item has 'runs' and 'userMove'/'aiMove', it's a direct BallResult
    if (item && (item.userMove !== undefined || item.aiMove !== undefined || item.runs !== undefined)) {
      const runs = item.runs;
      // Only count positive runs (user scoring), skip "OUT" and negative (AI scoring)
      if (typeof runs === "number" && runs > 0) {
        if (runs === 6) sixes++;
        else if (runs === 4) fours++;
        totalRuns += runs;
      }
    } else {
      // Nested innings format: { balls: [...] } or { playerBalls: [...] }
      const balls = item?.balls || item?.playerBalls || [];
      for (const b of balls) {
        const runs = typeof b === "number" ? b : (b?.runs ?? b?.playerMove ?? 0);
        if (typeof runs === "number" && runs > 0) {
          if (runs === 6) sixes++;
          else if (runs === 4) fours++;
          totalRuns += runs;
        }
      }
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
  const [fullFriendProfile, setFullFriendProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { pvpRecord: friendPvp } = usePvpStats(friend?.user_id);

  useEffect(() => {
    if (!friend || !user) return;
    setTab("overview");
    setLoading(true);
    Promise.all([loadMyProfile(), loadH2H(), loadMatchStats(), loadRecords(), loadFullFriendProfile()])
      .finally(() => setLoading(false));
  }, [friend?.user_id, user?.id]);

  const loadFullFriendProfile = async () => {
    if (!friend) return;
    const { data } = await supabase.from("profiles")
      .select("user_id, display_name, wins, losses, draws, total_matches, high_score, best_streak, current_streak, abandons, avatar_url, avatar_index, xp, coins, rank_tier, login_streak, best_login_streak")
      .eq("user_id", friend.user_id).single();
    if (data) setFullFriendProfile(data as unknown as FriendProfile);
  };

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles")
      .select("wins, losses, draws, total_matches, high_score, best_streak, current_streak, abandons, display_name, xp, coins, rank_tier")
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
    const { data: friendMatches } = await supabase
      .from("matches").select("*").eq("user_id", friend.user_id).order("created_at", { ascending: false }).limit(1000);
    
    const { data: myMatches } = await supabase
      .from("matches").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000);

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
    const totalBalls = matches.reduce((s: number, m: any) => s + (m.balls_played || 0), 0);
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

  // Use fullFriendProfile for accurate data, fallback to friend prop
  const fp = fullFriendProfile || friend;

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "overview", label: "OVERVIEW", emoji: "👤" },
    { key: "individual", label: "STATS", emoji: "📊" },
    { key: "vsai", label: "VS AI", emoji: "🆚" },
    { key: "rivalry", label: "H2H", emoji: "⚔️" },
    { key: "records", label: "RECORDS", emoji: "🏅" },
  ];

  const friendWinRate = fp.total_matches > 0 ? Math.round((fp.wins / fp.total_matches) * 100) : 0;
  const myWinRate = myProfile && myProfile.total_matches > 0 ? Math.round((myProfile.wins / myProfile.total_matches) * 100) : 0;

  const friendRankStats = { wins: fp.wins, total_matches: fp.total_matches, high_score: fp.high_score, best_streak: fp.best_streak };
  const friendTier = getRankTier(friendRankStats);
  const friendRP = calculateRankPoints(friendRankStats);

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
          {/* Header with rank */}
          <div className="p-4 border-b border-border/20">
            <div className="flex items-center gap-3">
              <PlayerAvatar avatarUrl={fp.avatar_url} avatarIndex={fp.avatar_index ?? 0} size="md" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-black text-foreground tracking-wider truncate">{fp.display_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] font-display font-bold ${friendTier.color}`}>{friendTier.emoji} {friendTier.name}</span>
                  <span className="text-[7px] text-muted-foreground font-display">• {friendRP} RP</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] text-muted-foreground font-display">
                    {fp.wins}W {fp.losses}L {(fp.draws ?? 0) > 0 ? `${fp.draws}D` : ""} • {friendWinRate}% WR
                  </span>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-xl glass-card flex items-center justify-center text-muted-foreground text-sm">✕</motion.button>
            </div>

            {/* XP / Coins / Rank strip */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 glass-card rounded-lg py-1.5 px-2 text-center">
                <span className="text-[6px] text-muted-foreground font-display tracking-widest block">XP</span>
                <span className="font-display text-sm font-black text-primary">{fp.xp ?? 0}</span>
              </div>
              <div className="flex-1 glass-card rounded-lg py-1.5 px-2 text-center">
                <span className="text-[6px] text-muted-foreground font-display tracking-widest block">COINS</span>
                <span className="font-display text-sm font-black text-secondary">{fp.coins ?? 0}</span>
              </div>
              <div className="flex-1 glass-card rounded-lg py-1.5 px-2 text-center">
                <span className="text-[6px] text-muted-foreground font-display tracking-widest block">STREAK</span>
                <span className="font-display text-sm font-black text-score-gold">🔥 {fp.current_streak ?? 0}</span>
              </div>
              <div className="flex-1">
                <RankBadge stats={friendRankStats} compact />
              </div>
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
                    {/* Profile stats grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "WINS", value: fp.wins, emoji: "🏆", color: "text-neon-green" },
                        { label: "LOSSES", value: fp.losses, emoji: "💔", color: "text-out-red" },
                        { label: "HIGH", value: fp.high_score, emoji: "⭐", color: "text-score-gold" },
                        { label: "STREAK", value: fp.best_streak, emoji: "🔥", color: "text-secondary" },
                      ].map((s) => (
                        <div key={s.label} className="glass-card rounded-xl p-2 text-center">
                          <span className="text-sm block">{s.emoji}</span>
                          <span className={`font-display text-lg font-black ${s.color} block leading-none mt-1`}>{s.value}</span>
                          <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Extra stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "MATCHES", value: fp.total_matches, emoji: "🏏" },
                        { label: "DRAWS", value: fp.draws ?? 0, emoji: "🤝" },
                        { label: "ABANDONS", value: fp.abandons ?? 0, emoji: "🏳️" },
                      ].map((s) => (
                        <div key={s.label} className="glass-card rounded-lg p-2 text-center">
                          <span className="text-xs block">{s.emoji}</span>
                          <span className="font-display text-sm font-black text-foreground block leading-none mt-0.5">{s.value}</span>
                          <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* PvP Record */}
                    {friendPvp && friendPvp.totalGames > 0 && (
                      <div className="glass-card rounded-xl p-2.5 border border-primary/15">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs">⚔️</span>
                          <span className="text-[6px] font-display text-muted-foreground tracking-widest">PvP RECORD</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: "GAMES", value: friendPvp.totalGames, color: "text-foreground" },
                            { label: "WINS", value: friendPvp.wins, color: "text-neon-green" },
                            { label: "LOSSES", value: friendPvp.losses, color: "text-out-red" },
                            { label: "WIN%", value: `${friendPvp.totalGames > 0 ? Math.round((friendPvp.wins / friendPvp.totalGames) * 100) : 0}%`, color: "text-primary" },
                          ].map((s) => (
                            <div key={s.label} className="text-center">
                              <span className={`font-display text-sm font-black ${s.color} block leading-none`}>{s.value}</span>
                              <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Login streak */}
                    {(fp.login_streak ?? 0) > 0 && (
                      <div className="glass-card rounded-xl p-2.5 flex items-center gap-3">
                        <span className="text-lg">📅</span>
                        <div className="flex-1">
                          <span className="text-[7px] text-muted-foreground font-display tracking-widest block">LOGIN STREAK</span>
                          <span className="font-display text-sm font-black text-primary">{fp.login_streak} days</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[6px] text-muted-foreground font-display tracking-widest block">BEST</span>
                          <span className="font-display text-xs font-bold text-score-gold">{fp.best_login_streak ?? 0}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick comparison: You vs Friend */}
                    {myProfile && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-secondary" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">YOU vs {fp.display_name.toUpperCase()}</span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { label: "WIN RATE", mine: `${myWinRate}%`, theirs: `${friendWinRate}%`, mineNum: myWinRate ?? 0, theirsNum: friendWinRate },
                            { label: "WINS", mine: myProfile.wins, theirs: fp.wins, mineNum: myProfile.wins, theirsNum: fp.wins },
                            { label: "HIGH SCORE", mine: myProfile.high_score, theirs: fp.high_score, mineNum: myProfile.high_score, theirsNum: fp.high_score },
                            { label: "BEST STREAK", mine: myProfile.best_streak, theirs: fp.best_streak, mineNum: myProfile.best_streak, theirsNum: fp.best_streak },
                            { label: "MATCHES", mine: myProfile.total_matches, theirs: fp.total_matches, mineNum: myProfile.total_matches, theirsNum: fp.total_matches },
                            { label: "XP", mine: myProfile.xp, theirs: fp.xp ?? 0, mineNum: myProfile.xp, theirsNum: fp.xp ?? 0 },
                            { label: "COINS", mine: myProfile.coins, theirs: fp.coins ?? 0, mineNum: myProfile.coins, theirsNum: fp.coins ?? 0 },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                              <span className={`font-display text-xs font-black flex-1 text-left ${row.mineNum > row.theirsNum ? "text-neon-green" : row.mineNum < row.theirsNum ? "text-out-red" : "text-foreground"}`}>
                                {row.mine}
                              </span>
                              <span className="text-[6px] font-display text-muted-foreground tracking-widest w-20 text-center">{row.label}</span>
                              <span className={`font-display text-xs font-black flex-1 text-right ${row.theirsNum > row.mineNum ? "text-neon-green" : row.theirsNum < row.mineNum ? "text-out-red" : "text-foreground"}`}>
                                {row.theirs}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-[6px] font-display text-muted-foreground tracking-widest px-1">
                            <span>YOU</span>
                            <span>{fp.display_name.toUpperCase()}</span>
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
                      <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">{fp.display_name.toUpperCase()}'S FULL STATS</span>
                    </div>

                    {/* Overall record */}
                    <div className="glass-card rounded-xl p-3">
                      <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">OVERALL RECORD</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "MATCHES", value: fp.total_matches, emoji: "🏏", color: "text-foreground" },
                          { label: "WINS", value: fp.wins, emoji: "🏆", color: "text-neon-green" },
                          { label: "LOSSES", value: fp.losses, emoji: "💔", color: "text-out-red" },
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

                    {/* Draws & Abandons */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="glass-card rounded-lg p-2 text-center">
                        <span className="text-xs block">🤝</span>
                        <span className="font-display text-sm font-black text-foreground">{fp.draws ?? 0}</span>
                        <span className="text-[5px] font-display text-muted-foreground tracking-widest block">DRAWS</span>
                      </div>
                      <div className="glass-card rounded-lg p-2 text-center">
                        <span className="text-xs block">🔥</span>
                        <span className="font-display text-sm font-black text-secondary">{fp.current_streak ?? 0}</span>
                        <span className="text-[5px] font-display text-muted-foreground tracking-widest block">CUR STREAK</span>
                      </div>
                      <div className="glass-card rounded-lg p-2 text-center">
                        <span className="text-xs block">🏳️</span>
                        <span className="font-display text-sm font-black text-out-red">{fp.abandons ?? 0}</span>
                        <span className="text-[5px] font-display text-muted-foreground tracking-widest block">ABANDONS</span>
                      </div>
                    </div>

                    {/* Performance metrics */}
                    {friendMatchStats && (
                      <div className="glass-card rounded-xl p-3">
                        <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">PERFORMANCE</span>
                        <div className="space-y-1.5">
                          {[
                            { label: "HIGH SCORE", value: fp.high_score, emoji: "⭐", color: "text-score-gold" },
                            { label: "BEST STREAK", value: fp.best_streak, emoji: "🔥", color: "text-secondary" },
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

                    {/* Rank & Progression */}
                    <div className={`glass-card rounded-xl p-3 border ${friendTier.borderColor}`}>
                      <div className={`absolute inset-0 ${friendTier.bgColor} rounded-xl`} />
                      <div className="relative z-10">
                        <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-2">RANK & PROGRESSION</span>
                        <div className="flex items-center gap-3">
                          <RankBadge stats={friendRankStats} />
                          <div>
                            <span className={`font-display text-sm font-black ${friendTier.color}`}>{friendTier.name}</span>
                            <span className="text-[8px] text-muted-foreground font-display block">{friendRP} RP</span>
                          </div>
                          <div className="ml-auto text-right">
                            <span className="text-[8px] text-primary font-display block">✨ {fp.xp ?? 0} XP</span>
                            <span className="text-[8px] text-secondary font-display block">🪙 {fp.coins ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Win/Loss ratio visual */}
                    {fp.total_matches > 0 && (
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
                              <span className={`font-display text-xs font-black flex-1 text-left ${mN > tN ? "text-neon-green" : mN < tN ? "text-out-red" : "text-foreground"}`}>
                                {row.mine}
                              </span>
                              <div className="flex items-center gap-1 w-24 justify-center">
                                <span className="text-[9px]">{row.emoji}</span>
                                <span className="text-[6px] font-display text-muted-foreground tracking-widest">{row.label}</span>
                              </div>
                              <span className={`font-display text-xs font-black flex-1 text-right ${tN > mN ? "text-neon-green" : tN < mN ? "text-out-red" : "text-foreground"}`}>
                                {row.theirs}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-[6px] font-display text-muted-foreground tracking-widest px-1">
                          <span>YOU</span>
                          <span>{fp.display_name.toUpperCase()}</span>
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

                {/* H2H RIVALRY TAB — REDESIGNED */}
                {tab === "rivalry" && (
                  <motion.div key="rivalry" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                    {h2h && h2h.totalGames > 0 ? (
                      <>
                        {/* Hero W/L record */}
                        <div className="glass-premium rounded-xl p-4 border border-primary/15">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-center flex-1">
                              <span className="font-display text-3xl font-black text-neon-green block leading-none">{h2h.myWins}</span>
                              <span className="text-[7px] font-display text-muted-foreground tracking-widest">YOU</span>
                            </div>
                            <div className="text-center px-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center mx-auto mb-1">
                                <span className="text-sm">⚔️</span>
                              </div>
                              <span className="font-display text-sm font-bold text-foreground block">{h2h.totalGames}</span>
                              <span className="text-[6px] font-display text-muted-foreground tracking-widest">BATTLES</span>
                            </div>
                            <div className="text-center flex-1">
                              <span className="font-display text-3xl font-black text-out-red block leading-none">{h2h.theirWins}</span>
                              <span className="text-[7px] font-display text-muted-foreground tracking-widest">{fp.display_name.slice(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                          {/* Win bar */}
                          <div className="h-3 rounded-full overflow-hidden flex bg-muted/30 mb-1">
                            {h2h.totalGames > 0 && (
                              <>
                                <div className="bg-gradient-to-r from-neon-green to-neon-green/70 rounded-l-full transition-all" style={{ width: `${(h2h.myWins / h2h.totalGames) * 100}%` }} />
                                {h2h.draws > 0 && <div className="bg-secondary/40" style={{ width: `${(h2h.draws / h2h.totalGames) * 100}%` }} />}
                                <div className="bg-gradient-to-l from-out-red to-out-red/70 rounded-r-full flex-1" />
                              </>
                            )}
                          </div>
                          <div className="flex justify-between text-[6px] font-display text-muted-foreground">
                            <span>{h2h.totalGames > 0 ? Math.round((h2h.myWins / h2h.totalGames) * 100) : 0}%</span>
                            {h2h.draws > 0 && <span>{h2h.draws} draws</span>}
                            <span>{h2h.totalGames > 0 ? Math.round((h2h.theirWins / h2h.totalGames) * 100) : 0}%</span>
                          </div>
                        </div>

                        {/* Scoring Comparison */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-secondary" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">SCORING COMPARISON</span>
                        </div>
                        <div className="space-y-1.5">
                          {[
                            { label: "HIGH SCORE", mine: h2h.myHighScore, theirs: h2h.theirHighScore, emoji: "⭐" },
                            { label: "TOTAL RUNS", mine: h2h.myTotalRuns, theirs: h2h.theirTotalRuns, emoji: "🏃" },
                            { label: "AVG SCORE", mine: h2h.totalGames > 0 ? Math.round(h2h.myTotalRuns / h2h.totalGames) : 0, theirs: h2h.totalGames > 0 ? Math.round(h2h.theirTotalRuns / h2h.totalGames) : 0, emoji: "📊" },
                            { label: "BIGGEST WIN", mine: h2h.biggestWinMargin, theirs: "—", emoji: "💪" },
                          ].map((s) => {
                            const mN = typeof s.mine === "number" ? s.mine : 0;
                            const tN = typeof s.theirs === "number" ? s.theirs : 0;
                            return (
                              <div key={s.label} className="flex items-center gap-2 glass-card rounded-lg px-3 py-2">
                                <span className={`font-display text-xs font-black flex-1 text-left ${mN > tN ? "text-neon-green" : mN < tN ? "text-out-red" : "text-foreground"}`}>{s.mine}</span>
                                <div className="flex items-center gap-1 w-24 justify-center">
                                  <span className="text-[9px]">{s.emoji}</span>
                                  <span className="text-[6px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                                </div>
                                <span className={`font-display text-xs font-black flex-1 text-right ${tN > mN ? "text-neon-green" : tN < mN ? "text-out-red" : "text-foreground"}`}>{s.theirs}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-between text-[6px] font-display text-muted-foreground tracking-widest px-1">
                            <span>YOU</span>
                            <span>{fp.display_name.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* Streaks & Milestones */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-score-gold" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">STREAKS & MILESTONES</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="glass-card rounded-lg p-2.5 text-center">
                            <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">CURRENT STREAK</span>
                            <span className={`font-display text-lg font-black ${h2h.currentStreak > 0 ? "text-neon-green" : h2h.currentStreak < 0 ? "text-out-red" : "text-foreground"}`}>
                              {h2h.currentStreak > 0 ? `🔥 ${h2h.currentStreak}W` : h2h.currentStreak < 0 ? `${Math.abs(h2h.currentStreak)}L` : "—"}
                            </span>
                          </div>
                          <div className="glass-card rounded-lg p-2.5 text-center">
                            <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">BEST STREAK</span>
                            <span className={`font-display text-lg font-black ${h2h.bestStreak > 0 ? "text-neon-green" : "text-out-red"}`}>
                              {h2h.bestStreak > 0 ? `${h2h.bestStreak}W` : h2h.bestStreak < 0 ? `${Math.abs(h2h.bestStreak)}L` : "—"}
                            </span>
                          </div>
                        </div>
                        
                        {h2h.firstMatchDate && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="glass-card rounded-lg p-2 text-center">
                              <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">FIRST MATCH</span>
                              <span className="font-display text-[9px] font-bold text-foreground">{formatDate(h2h.firstMatchDate)}</span>
                            </div>
                            <div className="glass-card rounded-lg p-2 text-center">
                              <span className="text-[5px] font-display text-muted-foreground tracking-widest block mb-1">LAST PLAYED</span>
                              <span className="font-display text-[9px] font-bold text-foreground">{h2h.lastPlayed ? formatDate(h2h.lastPlayed) : "—"}</span>
                            </div>
                          </div>
                        )}

                        {/* Match Timeline Graph */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-primary" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">MATCH TIMELINE</span>
                        </div>
                        <div className="glass-premium rounded-xl p-3 border border-primary/10">
                          {(() => {
                            const chronoMatches = [...h2h.matches].reverse();
                            const maxScore = Math.max(...chronoMatches.map(m => {
                              const isHost = m.host_id === user?.id;
                              return Math.max(isHost ? m.host_score : m.guest_score, isHost ? m.guest_score : m.host_score);
                            }), 1);
                            const graphH = 80;
                            const graphW = 100;
                            const step = chronoMatches.length > 1 ? graphW / (chronoMatches.length - 1) : graphW / 2;

                            const myPoints = chronoMatches.map((m, i) => {
                              const isHost = m.host_id === user?.id;
                              const score = isHost ? m.host_score : m.guest_score;
                              return { x: chronoMatches.length > 1 ? i * step : graphW / 2, y: graphH - (score / maxScore) * graphH };
                            });
                            const theirPoints = chronoMatches.map((m, i) => {
                              const isHost = m.host_id === user?.id;
                              const score = isHost ? m.guest_score : m.host_score;
                              return { x: chronoMatches.length > 1 ? i * step : graphW / 2, y: graphH - (score / maxScore) * graphH };
                            });

                            const toPath = (pts: { x: number; y: number }[]) =>
                              pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                            return (
                              <>
                                <svg viewBox={`-2 -5 ${graphW + 4} ${graphH + 15}`} className="w-full h-20">
                                  {/* Grid lines */}
                                  {[0, 0.25, 0.5, 0.75, 1].map(f => (
                                    <line key={f} x1="0" y1={graphH - f * graphH} x2={graphW} y2={graphH - f * graphH} stroke="hsl(217 91% 60% / 0.08)" strokeWidth="0.3" />
                                  ))}
                                  {/* Their line */}
                                  <path d={toPath(theirPoints)} fill="none" stroke="hsl(0 72% 51% / 0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                  {/* My line */}
                                  <path d={toPath(myPoints)} fill="none" stroke="hsl(142 71% 45% / 0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  {/* My dots */}
                                  {myPoints.map((p, i) => (
                                    <circle key={`m${i}`} cx={p.x} cy={p.y} r="2" fill="hsl(142 71% 45%)" />
                                  ))}
                                  {/* Their dots */}
                                  {theirPoints.map((p, i) => (
                                    <circle key={`t${i}`} cx={p.x} cy={p.y} r="1.5" fill="hsl(0 72% 51%)" opacity="0.7" />
                                  ))}
                                  {/* Win/loss indicators at bottom */}
                                  {chronoMatches.map((m, i) => {
                                    const won = m.winner_id === user?.id;
                                    const lost = m.winner_id === friend?.user_id;
                                    return (
                                      <rect key={`r${i}`} x={myPoints[i].x - 2} y={graphH + 4} width="4" height="4" rx="1"
                                        fill={won ? "hsl(142 71% 45% / 0.6)" : lost ? "hsl(0 72% 51% / 0.6)" : "hsl(45 93% 58% / 0.4)"} />
                                    );
                                  })}
                                </svg>
                                <div className="flex justify-between mt-1">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-0.5 rounded-full bg-neon-green" />
                                    <span className="text-[6px] font-display text-muted-foreground">You</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-0.5 rounded-full bg-out-red" />
                                    <span className="text-[6px] font-display text-muted-foreground">{fp.display_name}</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Scoring Trends */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-accent" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">SCORING TRENDS</span>
                        </div>
                        <div className="glass-card rounded-xl p-3">
                          {(() => {
                            const recent5 = h2h.matches.slice(0, 5);
                            const myRecent5Avg = recent5.length > 0 ? Math.round(recent5.reduce((s, m) => s + (m.host_id === user?.id ? m.host_score : m.guest_score), 0) / recent5.length) : 0;
                            const theirRecent5Avg = recent5.length > 0 ? Math.round(recent5.reduce((s, m) => s + (m.host_id === user?.id ? m.guest_score : m.host_score), 0) / recent5.length) : 0;
                            const myOverallAvg = h2h.totalGames > 0 ? Math.round(h2h.myTotalRuns / h2h.totalGames) : 0;
                            const theirOverallAvg = h2h.totalGames > 0 ? Math.round(h2h.theirTotalRuns / h2h.totalGames) : 0;
                            const myTrend = myRecent5Avg - myOverallAvg;
                            const theirTrend = theirRecent5Avg - theirOverallAvg;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[7px] font-display text-muted-foreground tracking-wider">YOUR LAST 5 AVG</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-display text-sm font-black text-foreground">{myRecent5Avg}</span>
                                    <span className={`text-[8px] font-display font-bold ${myTrend > 0 ? "text-neon-green" : myTrend < 0 ? "text-out-red" : "text-muted-foreground"}`}>
                                      {myTrend > 0 ? `↑${myTrend}` : myTrend < 0 ? `↓${Math.abs(myTrend)}` : "→"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[7px] font-display text-muted-foreground tracking-wider">{fp.display_name.toUpperCase()} LAST 5 AVG</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-display text-sm font-black text-foreground">{theirRecent5Avg}</span>
                                    <span className={`text-[8px] font-display font-bold ${theirTrend > 0 ? "text-neon-green" : theirTrend < 0 ? "text-out-red" : "text-muted-foreground"}`}>
                                      {theirTrend > 0 ? `↑${theirTrend}` : theirTrend < 0 ? `↓${Math.abs(theirTrend)}` : "→"}
                                    </span>
                                  </div>
                                </div>
                                <div className="h-px bg-muted/20" />
                                <div className="flex items-center justify-between">
                                  <span className="text-[7px] font-display text-muted-foreground tracking-wider">RUNS PER GAME (YOU)</span>
                                  <span className="font-display text-xs font-black text-primary">{myOverallAvg}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[7px] font-display text-muted-foreground tracking-wider">RUNS PER GAME ({fp.display_name.slice(0, 6).toUpperCase()})</span>
                                  <span className="font-display text-xs font-black text-out-red">{theirOverallAvg}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Verdict */}
                        <div className={`text-center py-2.5 rounded-xl ${
                          h2h.myWins > h2h.theirWins ? "bg-neon-green/5 border border-neon-green/15" :
                          h2h.theirWins > h2h.myWins ? "bg-out-red/5 border border-out-red/15" :
                          "bg-secondary/5 border border-secondary/15"
                        }`}>
                          <span className="font-display text-[9px] font-bold tracking-wider">
                            {h2h.myWins > h2h.theirWins ? `🔥 YOU DOMINATE THIS RIVALRY` :
                             h2h.theirWins > h2h.myWins ? `😤 ${fp.display_name.toUpperCase()} LEADS` :
                             "🤝 EVENLY MATCHED"}
                          </span>
                        </div>

                        {/* Recent matches with expandable details */}
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-accent" />
                          <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">MATCH HISTORY ({h2h.matches.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {h2h.matches.slice(0, 10).map((m) => {
                            const isHost = m.host_id === user?.id;
                            const myScore = isHost ? m.host_score : m.guest_score;
                            const theirScore = isHost ? m.guest_score : m.host_score;
                            const won = m.winner_id === user?.id;
                            const lost = m.winner_id === friend?.user_id;
                            const margin = Math.abs(myScore - theirScore);
                            return (
                              <div key={m.id} className={`p-2.5 rounded-xl ${
                                won ? "bg-neon-green/5 border border-neon-green/10" : lost ? "bg-out-red/5 border border-out-red/10" : "bg-secondary/5 border border-secondary/10"
                              }`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-display font-black ${
                                    won ? "bg-neon-green/20 text-neon-green" : lost ? "bg-out-red/20 text-out-red" : "bg-secondary/20 text-secondary"
                                  }`}>{won ? "W" : lost ? "L" : "D"}</div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-display text-sm font-black ${won ? "text-neon-green" : "text-foreground"}`}>{myScore}</span>
                                    <span className="text-[6px] text-muted-foreground font-display">vs</span>
                                    <span className={`font-display text-sm font-black ${lost ? "text-out-red" : "text-foreground"}`}>{theirScore}</span>
                                  </div>
                                  <span className="flex-1" />
                                  {margin > 0 && (
                                    <span className={`text-[7px] font-display font-bold ${won ? "text-neon-green/70" : "text-out-red/70"}`}>
                                      {won ? "+" : "-"}{margin} runs
                                    </span>
                                  )}
                                  <span className="text-[6px] text-muted-foreground font-display">{formatDate(m.created_at)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="glass-card rounded-xl p-8 text-center">
                        <span className="text-3xl block mb-2">⚔️</span>
                        <p className="font-display text-sm font-bold text-foreground">No rivalry matches yet</p>
                        <p className="text-[9px] text-muted-foreground mt-1">Challenge {fp.display_name} to a multiplayer duel!</p>
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
                                    {isBrokenByMe ? "You" : fp.display_name} broke the {info.label} record!
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
