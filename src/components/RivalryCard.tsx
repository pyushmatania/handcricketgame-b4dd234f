import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FriendProfile {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  abandons: number;
}

interface MatchRecord {
  id: string;
  host_id: string;
  guest_id: string;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  status: string;
  abandoned_by: string | null;
  created_at: string;
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
  myAbandons: number;
  theirAbandons: number;
  currentStreak: number; // positive = my streak, negative = their streak
  bestStreak: number;
  lastPlayed: string | null;
  matches: MatchRecord[];
}

interface Props {
  friend: FriendProfile;
  onChallenge: (friendId: string) => void;
}

export default function RivalryCard({ friend, onChallenge }: Props) {
  const { user } = useAuth();
  const [h2h, setH2h] = useState<H2HStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadH2H();
  }, [user, friend.user_id]);

  const loadH2H = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("multiplayer_games")
      .select("*")
      .or(`and(host_id.eq.${user.id},guest_id.eq.${friend.user_id}),and(host_id.eq.${friend.user_id},guest_id.eq.${user.id})`)
      .in("status", ["finished", "abandoned"])
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setH2h({ myWins: 0, theirWins: 0, draws: 0, totalGames: 0, myHighScore: 0, theirHighScore: 0, myTotalRuns: 0, theirTotalRuns: 0, myAbandons: 0, theirAbandons: 0, currentStreak: 0, bestStreak: 0, lastPlayed: null, matches: [] });
      return;
    }

    let myWins = 0, theirWins = 0, draws = 0, myHighScore = 0, theirHighScore = 0;
    let myTotalRuns = 0, theirTotalRuns = 0, myAbandons = 0, theirAbandons = 0;
    let currentStreak = 0, bestStreak = 0, streakCounted = false;

    // Process in chronological order for streaks
    const chronological = [...data].reverse();
    chronological.forEach((g: any) => {
      const isHost = g.host_id === user.id;
      const myScore = isHost ? g.host_score : g.guest_score;
      const theirScore = isHost ? g.guest_score : g.host_score;
      myTotalRuns += myScore;
      theirTotalRuns += theirScore;
      if (myScore > myHighScore) myHighScore = myScore;
      if (theirScore > theirHighScore) theirHighScore = theirScore;
      if (g.abandoned_by === user.id) myAbandons++;
      if (g.abandoned_by === friend.user_id) theirAbandons++;

      if (g.winner_id === user.id) {
        myWins++;
        if (currentStreak >= 0) currentStreak++;
        else currentStreak = 1;
      } else if (g.winner_id === friend.user_id) {
        theirWins++;
        if (currentStreak <= 0) currentStreak--;
        else currentStreak = -1;
      } else {
        draws++;
      }
      if (Math.abs(currentStreak) > Math.abs(bestStreak)) bestStreak = currentStreak;
    });

    setH2h({
      myWins, theirWins, draws, totalGames: data.length,
      myHighScore, theirHighScore, myTotalRuns, theirTotalRuns,
      myAbandons, theirAbandons, currentStreak, bestStreak,
      lastPlayed: data[0]?.created_at || null,
      matches: data as unknown as MatchRecord[],
    });
  };

  if (!h2h) return null;

  const total = h2h.myWins + h2h.theirWins + h2h.draws;
  const myPct = total > 0 ? Math.round((h2h.myWins / total) * 100) : 50;
  const isBetter = h2h.myWins > h2h.theirWins;
  const isWorse = h2h.theirWins > h2h.myWins;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Recent form: last 5 matches as W/L/D indicators
  const recentForm = h2h.matches.slice(0, 5).map((m) => {
    if (m.winner_id === user?.id) return "W";
    if (m.winner_id === friend.user_id) return "L";
    return "D";
  });

  return (
    <motion.div layout className="glass-premium rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
          isBetter ? "bg-neon-green/10 border-neon-green/20" : isWorse ? "bg-out-red/10 border-out-red/20" : "bg-secondary/10 border-secondary/20"
        }`}>
          <span className="text-lg">{isBetter ? "👑" : isWorse ? "😤" : "⚔️"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-display text-[11px] font-bold text-foreground block truncate">{friend.display_name}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-muted-foreground font-display">
              {total > 0 ? `${total} matches` : "No matches yet"}
            </span>
            {total > 0 && (
              <div className="flex gap-0.5">
                {recentForm.map((r, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${r === "W" ? "bg-neon-green" : r === "L" ? "bg-out-red" : "bg-secondary"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-black text-neon-green">{h2h.myWins}</span>
            <span className="text-[8px] text-muted-foreground">-</span>
            <span className="font-display text-sm font-black text-out-red">{h2h.theirWins}</span>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onChallenge(friend.user_id); }}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[8px] font-bold tracking-wider"
        >
          ⚔️
        </motion.button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {total > 0 ? (
                <>
                  {/* W/L bar */}
                  <div>
                    <div className="flex justify-between text-[7px] font-display font-bold mb-1">
                      <span className="text-neon-green">YOU {myPct}%</span>
                      {h2h.draws > 0 && <span className="text-secondary">{h2h.draws}D</span>}
                      <span className="text-out-red">{friend.display_name.toUpperCase()} {100 - myPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/30">
                      <div className="bg-gradient-to-r from-neon-green to-neon-green/70 rounded-l-full" style={{ width: `${myPct}%` }} />
                      <div className="bg-gradient-to-l from-out-red to-out-red/70 rounded-r-full flex-1" />
                    </div>
                  </div>

                  {/* Detailed stat comparison */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "HIGH SCORE", mine: h2h.myHighScore, theirs: h2h.theirHighScore, icon: "⭐" },
                      { label: "TOTAL RUNS", mine: h2h.myTotalRuns, theirs: h2h.theirTotalRuns, icon: "🏏" },
                      { label: "AVG SCORE", mine: total > 0 ? Math.round(h2h.myTotalRuns / total) : 0, theirs: total > 0 ? Math.round(h2h.theirTotalRuns / total) : 0, icon: "📊" },
                      { label: "ABANDONS", mine: h2h.myAbandons, theirs: h2h.theirAbandons, icon: "🏳️" },
                    ].map((s) => (
                      <div key={s.label} className="glass-card rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-[8px]">{s.icon}</span>
                          <span className="text-[6px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-display text-xs font-black ${s.mine > s.theirs ? "text-neon-green" : s.mine < s.theirs ? "text-foreground" : "text-foreground"}`}>
                            {s.mine}
                          </span>
                          <span className="text-[6px] text-muted-foreground">vs</span>
                          <span className={`font-display text-xs font-black ${s.theirs > s.mine ? "text-out-red" : s.theirs < s.mine ? "text-foreground" : "text-foreground"}`}>
                            {s.theirs}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Streak info */}
                  <div className="flex gap-2">
                    <div className="flex-1 glass-card rounded-lg p-2 text-center">
                      <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">CURRENT STREAK</span>
                      <span className={`font-display text-sm font-black ${h2h.currentStreak > 0 ? "text-neon-green" : h2h.currentStreak < 0 ? "text-out-red" : "text-foreground"}`}>
                        {h2h.currentStreak > 0 ? `🔥 ${h2h.currentStreak}W` : h2h.currentStreak < 0 ? `${Math.abs(h2h.currentStreak)}L` : "—"}
                      </span>
                    </div>
                    <div className="flex-1 glass-card rounded-lg p-2 text-center">
                      <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">BEST STREAK</span>
                      <span className={`font-display text-sm font-black ${h2h.bestStreak > 0 ? "text-neon-green" : "text-out-red"}`}>
                        {h2h.bestStreak > 0 ? `${h2h.bestStreak}W` : h2h.bestStreak < 0 ? `${Math.abs(h2h.bestStreak)}L` : "—"}
                      </span>
                    </div>
                    <div className="flex-1 glass-card rounded-lg p-2 text-center">
                      <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">LAST PLAYED</span>
                      <span className="font-display text-[9px] font-bold text-foreground">
                        {h2h.lastPlayed ? formatDate(h2h.lastPlayed) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Verdict */}
                  <div className={`text-center py-2 rounded-lg ${isBetter ? "bg-neon-green/5 border border-neon-green/10" : isWorse ? "bg-out-red/5 border border-out-red/10" : "bg-secondary/5 border border-secondary/10"}`}>
                    <span className="font-display text-[9px] font-bold tracking-wider">
                      {isBetter ? `🔥 YOU DOMINATE ${friend.display_name.toUpperCase()}` :
                       isWorse ? `😤 ${friend.display_name.toUpperCase()} HAS YOUR NUMBER` :
                       "🤝 EVENLY MATCHED"}
                    </span>
                  </div>

                  {/* Match timeline toggle */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); setShowTimeline(!showTimeline); }}
                    className="w-full py-2 rounded-lg glass-card text-[8px] font-display font-bold text-muted-foreground tracking-widest"
                  >
                    {showTimeline ? "▲ HIDE MATCH HISTORY" : "▼ SHOW MATCH HISTORY"}
                  </motion.button>

                  {/* Match timeline */}
                  <AnimatePresence>
                    {showTimeline && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        {h2h.matches.map((m, i) => {
                          const isHost = m.host_id === user?.id;
                          const myScore = isHost ? m.host_score : m.guest_score;
                          const theirScore = isHost ? m.guest_score : m.host_score;
                          const won = m.winner_id === user?.id;
                          const lost = m.winner_id === friend.user_id;
                          const abandoned = m.status === "abandoned";
                          const iAbandon = m.abandoned_by === user?.id;

                          return (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                won ? "bg-neon-green/5 border border-neon-green/10" :
                                lost ? "bg-out-red/5 border border-out-red/10" :
                                "bg-secondary/5 border border-secondary/10"
                              }`}
                            >
                              {/* Result indicator */}
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-display font-black ${
                                won ? "bg-neon-green/20 text-neon-green" : lost ? "bg-out-red/20 text-out-red" : "bg-secondary/20 text-secondary"
                              }`}>
                                {abandoned ? (iAbandon ? "🏳️" : "💀") : won ? "W" : lost ? "L" : "D"}
                              </div>

                              {/* Scores */}
                              <div className="flex items-center gap-1.5 flex-1">
                                <span className={`font-display text-xs font-black ${won ? "text-neon-green" : "text-foreground"}`}>{myScore}</span>
                                <span className="text-[6px] text-muted-foreground">-</span>
                                <span className={`font-display text-xs font-black ${lost ? "text-out-red" : "text-foreground"}`}>{theirScore}</span>
                                {abandoned && (
                                  <span className="text-[6px] font-display text-out-red/60 ml-1">
                                    {iAbandon ? "YOU QUIT" : "THEY QUIT"}
                                  </span>
                                )}
                              </div>

                              {/* Date */}
                              <div className="text-right">
                                <span className="text-[7px] text-muted-foreground font-display block">{formatDate(m.created_at)}</span>
                                <span className="text-[6px] text-muted-foreground/50 font-display">{formatTime(m.created_at)}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="text-2xl block mb-1">🏏</span>
                  <span className="text-[9px] font-display text-muted-foreground">No matches yet — challenge them!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
