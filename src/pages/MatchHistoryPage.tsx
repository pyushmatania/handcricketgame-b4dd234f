import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Virtuoso } from "react-virtuoso";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

interface BallRecord {
  userMove: string | number;
  aiMove: string | number;
  runs: number | "OUT";
  description: string;
}

interface MatchRecord {
  id: string;
  mode: string;
  user_score: number;
  ai_score: number;
  result: string;
  balls_played: number;
  created_at: string;
  innings_data: BallRecord[] | null;
}

type FilterType = "all" | "win" | "loss" | "draw";
type ModeFilter = "all" | "tap" | "ar" | "tournament" | "multiplayer";

function parseMatchBalls(balls: BallRecord[] | null) {
  if (!balls?.length) return null;
  let sixes = 0, fours = 0, threes = 0, twos = 0, singles = 0, dots = 0, wickets = 0;
  balls.forEach((b) => {
    if (b.runs === "OUT") { wickets++; return; }
    const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
    if (r === 6) sixes++;
    else if (r === 4) fours++;
    else if (r === 3) threes++;
    else if (r === 2) twos++;
    else if (r === 1) singles++;
    else dots++;
  });
  return { sixes, fours, threes, twos, singles, dots, wickets, totalBalls: balls.length };
}

const MODE_META: Record<string, { icon: string; label: string; color: string }> = {
  tap: { icon: "👆", label: "TAP", color: "text-primary" },
  ar: { icon: "📸", label: "AR", color: "text-accent" },
  tournament: { icon: "🏆", label: "TOURNEY", color: "text-secondary" },
  multiplayer: { icon: "⚔️", label: "PVP", color: "text-primary" },
};

export default function MatchHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState<FilterType>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [replayingMatch, setReplayingMatch] = useState<string | null>(null);
  const [replayBall, setReplayBall] = useState(0);
  const [playerName, setPlayerName] = useState("You");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from("matches")
        .select("id, mode, user_score, ai_score, result, balls_played, created_at, innings_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
    ]).then(([matchRes, profileRes]) => {
      if (matchRes.data) setMatches(matchRes.data as unknown as MatchRecord[]);
      if (profileRes.data) setPlayerName((profileRes.data as any).display_name || "You");
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (resultFilter !== "all" && m.result !== resultFilter) return false;
      if (modeFilter !== "all" && m.mode !== modeFilter) return false;
      return true;
    });
  }, [matches, resultFilter, modeFilter]);

  const summary = useMemo(() => {
    const wins = matches.filter(m => m.result === "win").length;
    const losses = matches.filter(m => m.result === "loss").length;
    const draws = matches.filter(m => m.result === "draw").length;
    const totalRuns = matches.reduce((s, m) => s + m.user_score, 0);
    const totalBalls = matches.reduce((s, m) => s + m.balls_played, 0);
    const highScore = matches.reduce((max, m) => Math.max(max, m.user_score), 0);
    const avgScore = matches.length ? Math.round(totalRuns / matches.length) : 0;
    const strikeRate = totalBalls ? Math.round((totalRuns / totalBalls) * 100) : 0;
    return { wins, losses, draws, total: matches.length, totalRuns, highScore, avgScore, strikeRate };
  }, [matches]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Replay logic
  const startReplay = useCallback((matchId: string) => {
    setReplayingMatch(matchId);
    setReplayBall(0);
  }, []);

  useEffect(() => {
    if (!replayingMatch) return;
    const match = matches.find(m => m.id === replayingMatch);
    if (!match?.innings_data || !Array.isArray(match.innings_data)) return;
    const total = (match.innings_data as BallRecord[]).length;
    if (replayBall >= total) return;
    const timer = setTimeout(() => setReplayBall(prev => prev + 1), 800);
    return () => clearTimeout(timer);
  }, [replayingMatch, replayBall, matches]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl block mb-3">🔒</span>
          <p className="font-display text-sm text-muted-foreground tracking-wider">Sign in to view match history</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/auth")}
            className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-xs font-bold tracking-wider">
            SIGN IN
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-sm">
            ←
          </motion.button>
          <div className="flex-1">
            <h1 className="font-display text-base font-black text-foreground tracking-wider">MATCH HISTORY</h1>
            <p className="text-[8px] text-muted-foreground font-display tracking-widest">{matches.length} MATCHES PLAYED</p>
          </div>
          <div className="text-right">
            <span className="font-display text-lg font-black text-secondary">{summary.highScore}</span>
            <span className="text-[6px] text-muted-foreground font-display tracking-widest block">BEST</span>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-premium rounded-2xl p-4 mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { val: summary.wins, label: "WON", color: "text-neon-green" },
              { val: summary.losses, label: "LOST", color: "text-out-red" },
              { val: summary.draws, label: "DRAW", color: "text-secondary" },
              { val: summary.total, label: "TOTAL", color: "text-foreground" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <span className={`font-display text-lg font-black ${s.color} block leading-none`}>{s.val}</span>
                <span className="text-[6px] text-muted-foreground font-display tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-muted/30 to-transparent mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: summary.avgScore, label: "AVG SCORE", icon: "📊" },
              { val: `${summary.strikeRate}`, label: "STRIKE RATE", icon: "⚡" },
              { val: summary.totalRuns, label: "TOTAL RUNS", icon: "🏏" },
            ].map(s => (
              <div key={s.label} className="text-center glass-card rounded-xl p-2">
                <span className="text-xs block mb-0.5">{s.icon}</span>
                <span className="font-display text-sm font-black text-foreground block leading-none">{s.val}</span>
                <span className="text-[5px] text-muted-foreground font-display tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-4 space-y-2">
          {/* Result filter */}
          <div className="flex gap-1.5">
            {(["all", "win", "loss", "draw"] as FilterType[]).map(f => (
              <button key={f} onClick={() => setResultFilter(f)}
                className={`flex-1 py-1.5 rounded-xl font-display text-[8px] font-bold tracking-widest transition-all ${
                  resultFilter === f
                    ? f === "win" ? "bg-neon-green/15 text-neon-green border border-neon-green/20"
                    : f === "loss" ? "bg-out-red/15 text-out-red border border-out-red/20"
                    : f === "draw" ? "bg-secondary/15 text-secondary border border-secondary/20"
                    : "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground/40 glass-card"
                }`}>
                {f === "all" ? "ALL" : f.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Mode filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(["all", "tap", "ar", "tournament", "multiplayer"] as ModeFilter[]).map(f => {
              const meta = f === "all" ? { icon: "🎮", label: "ALL", color: "text-foreground" } : MODE_META[f];
              return (
                <button key={f} onClick={() => setModeFilter(f)}
                  className={`px-3 py-1.5 rounded-xl font-display text-[7px] font-bold tracking-widest whitespace-nowrap transition-all flex items-center gap-1 ${
                    modeFilter === f ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground/40 glass-card"
                  }`}>
                  <span className="text-xs">{meta.icon}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Match List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="glass-premium rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-premium rounded-xl p-10 text-center">
            <span className="text-4xl block mb-3">📭</span>
            <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO MATCHES FOUND</span>
            <p className="text-[9px] text-muted-foreground/60 mt-1">
              {matches.length === 0 ? "Play your first match!" : "Try different filters"}
            </p>
            {matches.length === 0 && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/play")}
                className="mt-4 px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[9px] font-bold tracking-wider">
                🏏 PLAY NOW
              </motion.button>
            )}
          </div>
        ) : (
          <div style={{ height: "calc(100vh - 340px)", minHeight: 300 }}>
            <Virtuoso
              data={filtered}
              overscan={200}
              itemContent={(i, m) => {
              const resultBg = m.result === "win" ? "from-neon-green/8" : m.result === "loss" ? "from-out-red/8" : "from-secondary/8";
              const isExpanded = expandedMatch === m.id;
              const isReplaying = replayingMatch === m.id;
              const margin = Math.abs(m.user_score - m.ai_score);
              const runRate = m.balls_played > 0 ? (m.user_score / m.balls_played * 6).toFixed(1) : "0.0";
              const aiRunRate = m.balls_played > 0 ? (m.ai_score / m.balls_played * 6).toFixed(1) : "0.0";
              const ballStats = parseMatchBalls(m.innings_data);
              const balls = (m.innings_data && Array.isArray(m.innings_data)) ? m.innings_data as BallRecord[] : [];

              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-premium rounded-xl relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${resultBg} to-transparent opacity-40`} />

                  {/* Main row */}
                  <button className="w-full p-3 flex items-center gap-3 relative z-10 text-left"
                    onClick={() => { setExpandedMatch(isExpanded ? null : m.id); if (isReplaying) setReplayingMatch(null); }}>
                    {/* Mode icon with result ring */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg relative ${
                      m.result === "win" ? "bg-neon-green/10 ring-1 ring-neon-green/20"
                      : m.result === "loss" ? "bg-out-red/10 ring-1 ring-out-red/20"
                      : "bg-secondary/10 ring-1 ring-secondary/20"
                    }`}>
                      {modeMeta.icon}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-display font-black ${
                        m.result === "win" ? "bg-neon-green text-background" : m.result === "loss" ? "bg-out-red text-background" : "bg-secondary text-background"
                      }`}>
                        {m.result === "win" ? "W" : m.result === "loss" ? "L" : "D"}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-display text-[10px] font-black ${resultColor} tracking-wider`}>
                          {m.result === "win" ? `${playerName} WON` : m.result === "loss" ? "ROHIT AI WON" : "MATCH DRAWN"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[7px] font-display px-1.5 py-0.5 rounded-md ${modeMeta.color} bg-muted/30 font-bold tracking-wider`}>
                          {modeMeta.label}
                        </span>
                        {m.result !== "draw" && (
                          <span className="text-[7px] text-muted-foreground font-display">by {margin} runs</span>
                        )}
                        <span className="text-[7px] text-muted-foreground">•</span>
                        <span className="text-[7px] text-muted-foreground">{getTimeAgo(m.created_at)}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-baseline gap-1.5">
                        <div className="text-center">
                          <span className="font-display text-base font-black text-secondary leading-none">{m.user_score}</span>
                          <span className="text-[5px] text-muted-foreground font-display tracking-widest block">YOU</span>
                        </div>
                        <span className="text-[7px] text-muted-foreground/50 font-display">vs</span>
                        <div className="text-center">
                          <span className="font-display text-base font-black text-accent leading-none">{m.ai_score}</span>
                          <span className="text-[5px] text-muted-foreground font-display tracking-widest block">AI</span>
                        </div>
                      </div>
                      <span className="text-[6px] text-muted-foreground/40 mt-0.5">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1 border-t border-muted/10 relative z-10 space-y-3">

                          {/* Score comparison cards */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="glass-card rounded-xl p-3 text-center relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-secondary to-secondary/30" />
                              <span className="text-[7px] text-muted-foreground font-display tracking-widest block mb-1">{playerName.toUpperCase()}</span>
                              <span className="font-display text-2xl font-black text-secondary block leading-none">{m.user_score}</span>
                              <span className="text-[8px] text-muted-foreground mt-1 block">RR {runRate}</span>
                            </div>
                            <div className="glass-card rounded-xl p-3 text-center relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent/30" />
                              <span className="text-[7px] text-muted-foreground font-display tracking-widest block mb-1">ROHIT AI 🏏</span>
                              <span className="font-display text-2xl font-black text-accent block leading-none">{m.ai_score}</span>
                              <span className="text-[8px] text-muted-foreground mt-1 block">RR {aiRunRate}</span>
                            </div>
                          </div>

                          {/* Shot breakdown */}
                          {ballStats && (
                            <div className="glass-card rounded-xl p-3">
                              <span className="text-[7px] text-muted-foreground font-display tracking-widest block mb-2">SHOT BREAKDOWN</span>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[
                                  { label: "6s", val: ballStats.sixes, color: "text-primary", bg: "bg-primary/10" },
                                  { label: "4s", val: ballStats.fours, color: "text-neon-green", bg: "bg-neon-green/10" },
                                  { label: "3s", val: ballStats.threes, color: "text-secondary", bg: "bg-secondary/10" },
                                  { label: "2s", val: ballStats.twos, color: "text-accent", bg: "bg-accent/10" },
                                  { label: "1s", val: ballStats.singles, color: "text-foreground", bg: "bg-muted/20" },
                                  { label: "Dots", val: ballStats.dots, color: "text-muted-foreground", bg: "bg-muted/10" },
                                  { label: "Outs", val: ballStats.wickets, color: "text-out-red", bg: "bg-out-red/10" },
                                  { label: "Balls", val: ballStats.totalBalls, color: "text-foreground", bg: "bg-muted/20" },
                                ].map(s => (
                                  <div key={s.label} className={`text-center py-1.5 rounded-lg ${s.bg}`}>
                                    <span className={`font-display text-sm font-black ${s.color} block leading-none`}>{s.val}</span>
                                    <span className="text-[6px] text-muted-foreground font-display tracking-widest">{s.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ball-by-ball replay */}
                          {balls.length > 0 && (
                            <div className="glass-card rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[7px] text-muted-foreground font-display tracking-widest">BALL-BY-BALL</span>
                                <motion.button whileTap={{ scale: 0.9 }}
                                  onClick={(e) => { e.stopPropagation(); isReplaying ? setReplayingMatch(null) : startReplay(m.id); }}
                                  className={`px-2.5 py-1 rounded-lg font-display text-[7px] font-bold tracking-wider flex items-center gap-1 ${
                                    isReplaying ? "bg-out-red/15 text-out-red border border-out-red/20" : "bg-primary/15 text-primary border border-primary/20"
                                  }`}>
                                  {isReplaying ? "⏸ STOP" : "▶ REPLAY"}
                                </motion.button>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {balls.map((b, bi) => {
                                  const isOut = b.runs === "OUT";
                                  const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
                                  const isVisible = !isReplaying || bi <= replayBall;
                                  const isCurrentReplay = isReplaying && bi === replayBall;
                                  let bg = "bg-muted/20 text-muted-foreground";
                                  if (isOut) bg = "bg-out-red/20 text-out-red";
                                  else if (r === 6) bg = "bg-primary/20 text-primary";
                                  else if (r === 4) bg = "bg-neon-green/20 text-neon-green";
                                  else if (r >= 2) bg = "bg-secondary/20 text-secondary";
                                  else if (r === 1) bg = "bg-accent/20 text-accent";

                                  return (
                                    <motion.div key={bi}
                                      initial={isReplaying ? { scale: 0 } : false}
                                      animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-display font-black ${bg} ${
                                        isCurrentReplay ? "ring-2 ring-primary shadow-[0_0_10px_hsl(217_91%_60%/0.4)]" : ""
                                      }`}>
                                      {isOut ? "W" : r}
                                    </motion.div>
                                  );
                                })}
                              </div>

                              {/* Replay commentary */}
                              {isReplaying && balls[replayBall] && (
                                <motion.div key={replayBall} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 glass-card rounded-lg p-2 text-center">
                                  <span className="text-[9px] text-foreground font-display font-bold">
                                    Ball {replayBall + 1}: {balls[replayBall].description || (balls[replayBall].runs === "OUT" ? "OUT! 🔴" : `${Math.abs(typeof balls[replayBall].runs === "number" ? balls[replayBall].runs as number : 0)} runs`)}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          )}

                          {/* Match details */}
                          <div className="glass-card rounded-xl p-3 space-y-2">
                            {[
                              { label: "Result", value: m.result === "draw" ? "Match Tied" : `${m.result === "win" ? "Won" : "Lost"} by ${margin} runs`, color: resultColor },
                              { label: "Balls Played", value: m.balls_played, color: "text-foreground" },
                              { label: "Game Mode", value: modeMeta.label, color: modeMeta.color },
                              { label: "Played On", value: new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), color: "text-foreground" },
                            ].map(d => (
                              <div key={d.label} className="flex justify-between items-center">
                                <span className="text-[8px] text-muted-foreground font-display tracking-wider">{d.label}</span>
                                <span className={`text-[9px] font-display font-bold ${d.color}`}>{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
