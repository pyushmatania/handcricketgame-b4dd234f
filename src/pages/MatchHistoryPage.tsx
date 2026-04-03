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

const MODE_META: Record<string, { icon: string; label: string; accent: string }> = {
  tap: { icon: "👆", label: "TAP", accent: "hsl(122,39%,49%)" },
  ar: { icon: "📸", label: "AR", accent: "hsl(291,47%,51%)" },
  tournament: { icon: "🏆", label: "TOURNEY", accent: "hsl(51,100%,50%)" },
  multiplayer: { icon: "⚔️", label: "PVP", accent: "hsl(207,90%,54%)" },
};

const RESULT_THEME = {
  win: { label: "VICTORY", badge: "W", bg: "hsl(122,39%,49%)", glow: "hsl(122,39%,49%,0.3)", border: "hsl(122,39%,49%,0.4)", text: "hsl(122,70%,55%)" },
  loss: { label: "DEFEAT", badge: "L", bg: "hsl(4,90%,58%)", glow: "hsl(4,90%,58%,0.3)", border: "hsl(4,90%,58%,0.4)", text: "hsl(4,90%,65%)" },
  draw: { label: "DRAW", badge: "D", bg: "hsl(51,100%,50%)", glow: "hsl(51,100%,50%,0.25)", border: "hsl(51,100%,50%,0.35)", text: "hsl(51,100%,60%)" },
};

const cardBg = "linear-gradient(135deg, hsl(222 40% 13% / 0.9), hsl(222 40% 8% / 0.95))";
const cardShadow = "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

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
    const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;
    return { wins, losses, draws, total: matches.length, totalRuns, highScore, avgScore, strikeRate, winRate };
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
      <div className="min-h-screen bg-game-dark flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-3">🔒</span>
          <p className="font-game-display text-sm text-muted-foreground tracking-wider">Sign in to view match history</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/auth")}
            className="mt-4 px-6 py-3 rounded-2xl font-game-display text-xs tracking-wider border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
            style={{ background: "linear-gradient(to bottom, hsl(122,39%,49%), hsl(122,39%,38%))", borderColor: "hsl(122,39%,30%)", color: "white" }}>
            SIGN IN
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-dark relative overflow-hidden pb-24">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(222 40% 18%) 0%, hsl(222 40% 6%) 70%)" }} />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm border-b-2"
            style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--border) / 0.2)" }}>
            ←
          </motion.button>
          <div className="flex-1">
            <h1 className="font-game-display text-lg tracking-wider text-game-gold">MATCH HISTORY</h1>
            <p className="text-[9px] text-muted-foreground font-game-body tracking-wide">{matches.length} matches played</p>
          </div>
          <div className="text-right rounded-xl px-3 py-1.5 border-b-2" style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(51 100% 50% / 0.3)" }}>
            <span className="font-game-display text-lg text-game-gold leading-none">{summary.highScore}</span>
            <span className="text-[6px] text-muted-foreground font-game-display tracking-widest block">BEST SCORE</span>
          </div>
        </motion.div>

        {/* Summary Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-2xl p-4 mb-4 border-b-[3px] relative overflow-hidden"
          style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--game-gold) / 0.2)" }}>
          
          {/* Win rate ring */}
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted) / 0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(122,39%,49%)" strokeWidth="3"
                  strokeDasharray={`${summary.winRate * 0.975} 97.5`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-game-display text-sm text-game-green leading-none">{summary.winRate}%</span>
                <span className="text-[5px] text-muted-foreground font-game-display tracking-widest">WIN</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {[
                { val: summary.wins, label: "WON", color: "hsl(122,70%,55%)" },
                { val: summary.losses, label: "LOST", color: "hsl(4,90%,65%)" },
                { val: summary.draws, label: "DRAW", color: "hsl(51,100%,60%)" },
              ].map(s => (
                <div key={s.label} className="text-center rounded-lg p-1.5" style={{ background: `${s.color}10` }}>
                  <span className="font-game-display text-lg block leading-none" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[6px] text-muted-foreground font-game-display tracking-widest">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-muted/20 to-transparent mb-3" />

          <div className="grid grid-cols-3 gap-2">
            {[
              { val: summary.avgScore, label: "AVG SCORE", icon: "📊" },
              { val: `${summary.strikeRate}`, label: "STRIKE RATE", icon: "⚡" },
              { val: summary.totalRuns, label: "TOTAL RUNS", icon: "🏏" },
            ].map(s => (
              <div key={s.label} className="text-center rounded-xl p-2 border-b-2 border-transparent" style={{ background: "hsl(222 40% 12% / 0.8)" }}>
                <span className="text-xs block mb-0.5">{s.icon}</span>
                <span className="font-game-display text-sm text-foreground block leading-none">{s.val}</span>
                <span className="text-[5px] text-muted-foreground font-game-display tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mb-4 space-y-2">
          <div className="flex gap-1.5">
            {(["all", "win", "loss", "draw"] as FilterType[]).map(f => {
              const isActive = resultFilter === f;
              const theme = f === "all" ? null : RESULT_THEME[f];
              return (
                <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setResultFilter(f)}
                  className="flex-1 py-2 rounded-xl font-game-display text-[8px] tracking-widest transition-all border-b-2"
                  style={{
                    background: isActive && theme ? `${theme.bg}15` : isActive ? "hsl(207 90% 54% / 0.15)" : "hsl(222 40% 12% / 0.8)",
                    borderColor: isActive && theme ? theme.border : isActive ? "hsl(207 90% 54% / 0.4)" : "transparent",
                    color: isActive && theme ? theme.text : isActive ? "hsl(207,90%,60%)" : "hsl(var(--muted-foreground) / 0.5)",
                  }}>
                  {f === "all" ? "ALL" : f.toUpperCase()}
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(["all", "tap", "ar", "tournament", "multiplayer"] as ModeFilter[]).map(f => {
              const meta = f === "all" ? { icon: "🎮", label: "ALL", accent: "hsl(207,90%,54%)" } : MODE_META[f];
              const isActive = modeFilter === f;
              return (
                <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setModeFilter(f)}
                  className="px-3 py-1.5 rounded-xl font-game-display text-[7px] tracking-widest whitespace-nowrap flex items-center gap-1 border-b-2"
                  style={{
                    background: isActive ? `${meta.accent}15` : "hsl(222 40% 12% / 0.8)",
                    borderColor: isActive ? `${meta.accent}60` : "transparent",
                    color: isActive ? meta.accent : "hsl(var(--muted-foreground) / 0.5)",
                  }}>
                  <span className="text-xs">{meta.icon}</span> {meta.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Match List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: cardBg }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center border-b-[3px]" style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--muted) / 0.2)" }}>
            <span className="text-4xl block mb-3">📭</span>
            <span className="font-game-display text-xs text-muted-foreground tracking-wider">NO MATCHES FOUND</span>
            <p className="text-[9px] text-muted-foreground/60 mt-1 font-game-body">
              {matches.length === 0 ? "Play your first match!" : "Try different filters"}
            </p>
            {matches.length === 0 && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/play")}
                className="mt-4 px-5 py-2.5 rounded-xl font-game-display text-[9px] tracking-wider border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
                style={{ background: "linear-gradient(to bottom, hsl(122,39%,49%), hsl(122,39%,38%))", borderColor: "hsl(122,39%,30%)", color: "white" }}>
                🏏 PLAY NOW
              </motion.button>
            )}
          </div>
        ) : (
          <div style={{ height: "calc(100vh - 380px)", minHeight: 300 }}>
            <Virtuoso
              data={filtered}
              overscan={200}
              itemContent={(i, m) => {
                const modeMeta = MODE_META[m.mode] || MODE_META.tap;
                const theme = RESULT_THEME[m.result as keyof typeof RESULT_THEME] || RESULT_THEME.draw;
                const isExpanded = expandedMatch === m.id;
                const isReplaying = replayingMatch === m.id;
                const margin = Math.abs(m.user_score - m.ai_score);
                const runRate = m.balls_played > 0 ? (m.user_score / m.balls_played * 6).toFixed(1) : "0.0";
                const aiRunRate = m.balls_played > 0 ? (m.ai_score / m.balls_played * 6).toFixed(1) : "0.0";
                const ballStats = parseMatchBalls(m.innings_data);
                const balls = (m.innings_data && Array.isArray(m.innings_data)) ? m.innings_data as BallRecord[] : [];

                return (
                  <div className="pb-2.5">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="rounded-2xl relative overflow-hidden border-b-[3px]"
                      style={{ background: cardBg, boxShadow: cardShadow, borderColor: `${theme.bg}30` }}
                    >
                      {/* Result accent strip */}
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(to right, ${theme.bg}, transparent)` }} />

                      {/* Main row */}
                      <button className="w-full p-3 flex items-center gap-3 relative z-10 text-left"
                        onClick={() => { setExpandedMatch(isExpanded ? null : m.id); if (isReplaying) setReplayingMatch(null); }}>
                        
                        {/* Result badge */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border-b-2"
                            style={{
                              background: `linear-gradient(135deg, ${theme.bg}20, ${theme.bg}08)`,
                              borderColor: `${theme.bg}40`,
                              boxShadow: `0 2px 8px ${theme.glow}`,
                            }}>
                            <span className="font-game-display text-base leading-none" style={{ color: theme.text }}>{theme.badge}</span>
                            <span className="text-[5px] font-game-display tracking-widest text-muted-foreground mt-0.5">{theme.label}</span>
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                            style={{ background: `${modeMeta.accent}30`, border: `1px solid ${modeMeta.accent}50` }}>
                            {modeMeta.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-game-display text-[10px] tracking-wider" style={{ color: theme.text }}>
                              {m.result === "win" ? `${playerName} WON` : m.result === "loss" ? "ROHIT AI WON" : "MATCH DRAWN"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[7px] font-game-display px-1.5 py-0.5 rounded-md tracking-wider"
                              style={{ background: `${modeMeta.accent}15`, color: modeMeta.accent }}>
                              {modeMeta.label}
                            </span>
                            {m.result !== "draw" && (
                              <span className="text-[7px] text-muted-foreground font-game-body">by {margin} runs</span>
                            )}
                            <span className="text-[7px] text-muted-foreground">•</span>
                            <span className="text-[7px] text-muted-foreground font-game-body">{getTimeAgo(m.created_at)}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right flex items-baseline gap-2">
                          <div className="text-center">
                            <span className="font-game-display text-lg leading-none" style={{ color: m.result === "win" ? theme.text : "hsl(var(--foreground))" }}>{m.user_score}</span>
                            <span className="text-[5px] text-muted-foreground font-game-display tracking-widest block">YOU</span>
                          </div>
                          <span className="text-[8px] text-muted-foreground/40 font-game-display">vs</span>
                          <div className="text-center">
                            <span className="font-game-display text-lg leading-none" style={{ color: m.result === "loss" ? theme.text : "hsl(var(--foreground) / 0.6)" }}>{m.ai_score}</span>
                            <span className="text-[5px] text-muted-foreground font-game-display tracking-widest block">AI</span>
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="px-3 pb-3 pt-1 space-y-2.5" style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}>

                              {/* Score comparison */}
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { name: playerName.toUpperCase(), score: m.user_score, rr: runRate, color: "hsl(122,39%,49%)" },
                                  { name: "ROHIT AI 🏏", score: m.ai_score, rr: aiRunRate, color: "hsl(4,90%,58%)" },
                                ].map(p => (
                                  <div key={p.name} className="rounded-xl p-3 text-center border-b-2" style={{ background: `${p.color}08`, borderColor: `${p.color}25` }}>
                                    <span className="text-[7px] text-muted-foreground font-game-display tracking-widest block mb-1">{p.name}</span>
                                    <span className="font-game-display text-2xl block leading-none" style={{ color: p.color }}>{p.score}</span>
                                    <span className="text-[8px] text-muted-foreground mt-1 block font-game-body">RR {p.rr}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Shot breakdown */}
                              {ballStats && (
                                <div className="rounded-xl p-3 border-b-2 border-transparent" style={{ background: "hsl(222 40% 12% / 0.8)" }}>
                                  <span className="text-[7px] text-muted-foreground font-game-display tracking-widest block mb-2">SHOT BREAKDOWN</span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {[
                                      { label: "6s", val: ballStats.sixes, color: "hsl(207,90%,54%)" },
                                      { label: "4s", val: ballStats.fours, color: "hsl(122,70%,55%)" },
                                      { label: "3s", val: ballStats.threes, color: "hsl(51,100%,50%)" },
                                      { label: "2s", val: ballStats.twos, color: "hsl(291,47%,51%)" },
                                      { label: "1s", val: ballStats.singles, color: "hsl(var(--foreground))" },
                                      { label: "Dots", val: ballStats.dots, color: "hsl(var(--muted-foreground))" },
                                      { label: "Outs", val: ballStats.wickets, color: "hsl(4,90%,58%)" },
                                      { label: "Balls", val: ballStats.totalBalls, color: "hsl(var(--foreground))" },
                                    ].map(s => (
                                      <div key={s.label} className="text-center py-1.5 rounded-lg" style={{ background: `${s.color}10` }}>
                                        <span className="font-game-display text-sm block leading-none" style={{ color: s.color }}>{s.val}</span>
                                        <span className="text-[6px] text-muted-foreground font-game-display tracking-widest">{s.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Ball-by-ball replay */}
                              {balls.length > 0 && (
                                <div className="rounded-xl p-3 border-b-2 border-transparent" style={{ background: "hsl(222 40% 12% / 0.8)" }}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[7px] text-muted-foreground font-game-display tracking-widest">BALL-BY-BALL</span>
                                    <motion.button whileTap={{ scale: 0.9 }}
                                      onClick={(e) => { e.stopPropagation(); isReplaying ? setReplayingMatch(null) : startReplay(m.id); }}
                                      className="px-2.5 py-1 rounded-lg font-game-display text-[7px] tracking-wider flex items-center gap-1 border-b-2 active:border-b-0 active:translate-y-[2px]"
                                      style={{
                                        background: isReplaying ? "hsl(4 90% 58% / 0.15)" : "hsl(122 39% 49% / 0.15)",
                                        borderColor: isReplaying ? "hsl(4 90% 58% / 0.3)" : "hsl(122 39% 49% / 0.3)",
                                        color: isReplaying ? "hsl(4,90%,65%)" : "hsl(122,70%,55%)",
                                      }}>
                                      {isReplaying ? "⏸ STOP" : "▶ REPLAY"}
                                    </motion.button>
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    {balls.map((b, bi) => {
                                      const isOut = b.runs === "OUT";
                                      const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
                                      const isVisible = !isReplaying || bi <= replayBall;
                                      const isCurrentReplay = isReplaying && bi === replayBall;
                                      let color = "hsl(var(--muted-foreground))";
                                      let bg = "hsl(var(--muted) / 0.2)";
                                      if (isOut) { color = "hsl(4,90%,65%)"; bg = "hsl(4,90%,58%,0.2)"; }
                                      else if (r === 6) { color = "hsl(207,90%,60%)"; bg = "hsl(207,90%,54%,0.2)"; }
                                      else if (r === 4) { color = "hsl(122,70%,55%)"; bg = "hsl(122,39%,49%,0.2)"; }
                                      else if (r >= 2) { color = "hsl(51,100%,60%)"; bg = "hsl(51,100%,50%,0.2)"; }
                                      else if (r === 1) { color = "hsl(var(--foreground) / 0.7)"; bg = "hsl(var(--muted) / 0.15)"; }

                                      return (
                                        <motion.div key={bi}
                                          initial={isReplaying ? { scale: 0 } : false}
                                          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-game-display"
                                          style={{
                                            background: bg,
                                            color,
                                            boxShadow: isCurrentReplay ? `0 0 10px ${color}` : "none",
                                            border: isCurrentReplay ? `1px solid ${color}` : "none",
                                          }}>
                                          {isOut ? "W" : r}
                                        </motion.div>
                                      );
                                    })}
                                  </div>

                                  {isReplaying && balls[replayBall] && (
                                    <motion.div key={replayBall} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                      className="mt-2 rounded-lg p-2 text-center" style={{ background: "hsl(222 40% 15% / 0.8)" }}>
                                      <span className="text-[9px] text-foreground font-game-display">
                                        Ball {replayBall + 1}: {balls[replayBall].description || (balls[replayBall].runs === "OUT" ? "OUT! 🔴" : `${Math.abs(typeof balls[replayBall].runs === "number" ? balls[replayBall].runs as number : 0)} runs`)}
                                      </span>
                                    </motion.div>
                                  )}
                                </div>
                              )}

                              {/* Match details */}
                              <div className="rounded-xl p-3 space-y-2 border-b-2 border-transparent" style={{ background: "hsl(222 40% 12% / 0.8)" }}>
                                {[
                                  { label: "Result", value: m.result === "draw" ? "Match Tied" : `${m.result === "win" ? "Won" : "Lost"} by ${margin} runs`, color: theme.text },
                                  { label: "Balls Played", value: m.balls_played, color: "hsl(var(--foreground))" },
                                  { label: "Game Mode", value: modeMeta.label, color: modeMeta.accent },
                                  { label: "Played On", value: new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), color: "hsl(var(--foreground))" },
                                ].map(d => (
                                  <div key={d.label} className="flex justify-between items-center">
                                    <span className="text-[8px] text-muted-foreground font-game-display tracking-wider">{d.label}</span>
                                    <span className="text-[9px] font-game-display" style={{ color: d.color }}>{d.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
