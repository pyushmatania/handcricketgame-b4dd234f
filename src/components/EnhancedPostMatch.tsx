import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/lib/sounds";
import { CrowdSFX } from "@/lib/voiceCommentary";
import { playElevenLabsMusic, playElevenLabsSFX, stopMusic, isElevenLabsAvailable, ElevenLabsSFXPrompts, speakDuoLines } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import {
  pickMatchCommentators, type Commentator, type CommentaryLine,
  getPostMatchResultLines, getPostMatchStatsLines, getPostMatchVerdictLines, getPostMatchRivalryLines,
} from "@/lib/commentaryDuo";
import WagonWheel from "./WagonWheel";
import type { BallResult } from "@/hooks/useHandCricket";
import postmatchBg from "@/assets/postmatch-bg.jpg";

interface RivalryStats {
  myWins: number; theirWins: number; totalGames: number;
  myHighScore: number; theirHighScore: number;
}

interface EnhancedPostMatchProps {
  playerName: string;
  opponentName: string;
  result: "win" | "loss" | "draw";
  playerScore: number;
  opponentScore: number;
  playerWickets?: number;
  opponentWickets?: number;
  ballHistory: BallResult[];
  isPvP?: boolean;
  rivalryStats?: RivalryStats | null;
  commentators?: [Commentator, Commentator];
  onComplete: () => void;
}

function computeStats(ballHistory: BallResult[]) {
  let sixes = 0, fours = 0, threes = 0, twos = 0, singles = 0, dots = 0;
  let biggestShot = 0, battingBalls = 0, currentPartnership = 0, bestPartnership = 0;
  ballHistory.forEach(b => {
    if (b.runs === "OUT") { if (currentPartnership > bestPartnership) bestPartnership = currentPartnership; currentPartnership = 0; return; }
    const r = typeof b.runs === "number" ? b.runs : 0;
    const abs = Math.abs(r);
    if (r > 0) { battingBalls++; currentPartnership += abs; if (abs === 6) sixes++; else if (abs === 4) fours++; else if (abs === 3) threes++; else if (abs === 2) twos++; else if (abs === 1) singles++; else dots++; if (abs > biggestShot) biggestShot = abs; }
    else { dots++; battingBalls++; }
  });
  if (currentPartnership > bestPartnership) bestPartnership = currentPartnership;
  const totalBalls = ballHistory.length;
  const totalRuns = sixes * 6 + fours * 4 + threes * 3 + twos * 2 + singles;
  const strikeRate = battingBalls > 0 ? Math.round((totalRuns / battingBalls) * 100) : 0;
  const boundaryPct = totalRuns > 0 ? Math.round(((sixes * 6 + fours * 4) / totalRuns) * 100) : 0;
  return { sixes, fours, threes, twos, singles, dots, biggestShot, totalBalls, strikeRate, boundaryPct, battingBalls, bestPartnership, totalRuns };
}

type PageId = "result" | "scorecard" | "stats" | "wagon" | "rivalry" | "verdict";

interface CeremonyPage {
  id: PageId;
  lines: CommentaryLine[];
  voiceEnabled: boolean;
}

export default function EnhancedPostMatch({
  playerName, opponentName, result, playerScore, opponentScore,
  playerWickets = 0, opponentWickets = 0,
  ballHistory, isPvP = false, rivalryStats, commentators, onComplete,
}: EnhancedPostMatchProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled, commentaryEnabled } = useSettings();
  const stableOnComplete = useCallback(onComplete, []);

  const duo = commentators || pickMatchCommentators();
  const c1 = duo[0].name;
  const c2 = duo[1].name;
  const stats = useMemo(() => computeStats(ballHistory), [ballHistory]);

  // Build pages
  const pages: CeremonyPage[] = useMemo(() => {
    const p: CeremonyPage[] = [];
    p.push({ id: "result", lines: getPostMatchResultLines(c1, c2, playerName, opponentName, result, playerScore, opponentScore), voiceEnabled: true });
    p.push({ id: "scorecard", lines: [
      { commentatorId: c1, text: `${playerName}: ${playerScore}/${playerWickets} | ${opponentName}: ${opponentScore}/${opponentWickets}`, isKeyMoment: false },
      { commentatorId: c2, text: result === "win" ? `${playerName} won by ${playerScore - opponentScore} runs! Dominant!` : result === "loss" ? `${opponentName} won by ${opponentScore - playerScore} runs.` : "Match tied! What drama!", isKeyMoment: false },
    ], voiceEnabled: false });
    p.push({ id: "stats", lines: getPostMatchStatsLines(c1, c2, playerName, stats), voiceEnabled: false });
    p.push({ id: "wagon", lines: [
      { commentatorId: c1, text: `Shot distribution: ${stats.sixes} sixes, ${stats.fours} fours, ${stats.dots} dots.`, isKeyMoment: false },
      { commentatorId: c2, text: `${stats.boundaryPct}% from boundaries! ${stats.boundaryPct > 60 ? "Pure power game!" : stats.boundaryPct > 30 ? "Good mix of power and placement!" : "Steady accumulator!"}`, isKeyMoment: false },
    ], voiceEnabled: false });
    if (isPvP && rivalryStats) {
      p.push({ id: "rivalry", lines: getPostMatchRivalryLines(c1, c2, playerName, opponentName, result, rivalryStats), voiceEnabled: false });
    }
    p.push({ id: "verdict", lines: getPostMatchVerdictLines(c1, c2, playerName, opponentName, result), voiceEnabled: true });
    return p;
  }, []);

  const page = pages[currentPage];
  const resultEmoji = result === "win" ? "🏆" : result === "loss" ? "😔" : "🤝";
  const resultText = result === "win" ? "VICTORY!" : result === "loss" ? "DEFEAT" : "TIED!";
  const resultColor = result === "win" ? "text-secondary" : result === "loss" ? "text-out-red" : "text-accent";

  // Start music & SFX
  useEffect(() => {
    if (result === "win") {
      if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.victoryFanfare, 5);
      if (soundEnabled) SFX.victoryAnthem();
      if (crowdEnabled) CrowdSFX.victory();
      playElevenLabsMusic("Triumphant cricket victory celebration music, stadium horns, crowd cheering, drums", 25, false);
    } else if (result === "loss") {
      if (soundEnabled) SFX.loss();
      if (crowdEnabled) CrowdSFX.tension();
    } else {
      if (soundEnabled) SFX.gameStart();
    }
    return () => { stopMusic(); };
  }, []);

  // Play TTS on voiced pages
  useEffect(() => {
    if (!page || !voiceEnabled || !commentaryEnabled || !page.voiceEnabled) return;
    const keyLines = page.lines.filter(l => l.isKeyMoment);
    if (keyLines.length === 0) return;
    const ttsLines = keyLines.map(l => ({
      text: l.text,
      voiceId: (duo.find(c => c.name === l.commentatorId) || duo[0]).voiceId,
    }));
    speakDuoLines(ttsLines);
  }, [currentPage]);

  // SFX per page
  useEffect(() => {
    if (page?.id === "verdict" && result === "win" && isElevenLabsAvailable()) {
      playElevenLabsSFX("Stadium crowd roaring with applause and celebration", 3);
    }
  }, [currentPage]);

  const handleTap = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      stopMusic();
      setVisible(false);
      setTimeout(stableOnComplete, 400);
    }
  };

  const handleSkip = () => {
    stopMusic();
    setVisible(false);
    setTimeout(stableOnComplete, 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden cursor-pointer"
          onClick={handleTap}
        >
          {/* Background — podium ceremony style */}
          <img src={postmatchBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 ${result === "win" ? "bg-gradient-to-b from-black/40 via-secondary/10 to-black/60" : "bg-gradient-to-b from-black/60 via-black/40 to-black/70"}`} />

          {/* Confetti particles for win */}
          {result === "win" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: Math.random() * 400, opacity: 1, rotate: 0 }}
                  animate={{ y: 700, rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: [1, 1, 0] }}
                  transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
                  className="absolute w-2.5 h-2.5 rounded-sm"
                  style={{ background: ["hsl(var(--secondary))", "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--neon-green))"][i % 4], left: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          )}

          {/* Commentator badges - top */}
          <div className="relative z-10 flex items-center justify-center gap-2 pt-14 pb-2">
            {duo.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-display font-bold tracking-wider backdrop-blur-md ${
                i === 0 ? "bg-primary/20 text-primary border border-primary/25" : "bg-accent/20 text-accent border border-accent/25"
              }`}>
                <span className="text-sm">{c.avatar}</span> {c.name}
              </div>
            ))}
          </div>

          {/* Full-screen card */}
          <div className="relative z-10 flex-1 flex flex-col mx-3 mb-3 rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">

            {/* Page content with fade+scale */}
            <AnimatePresence mode="wait">
              <motion.div
                key={page.id + currentPage}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-3"
              >
                {/* Page 1: Result */}
                {page.id === "result" && (
                  <div className="space-y-2">
                    <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">{resultEmoji}</motion.div>
                    <motion.h2
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className={`font-display text-3xl font-black ${resultColor} tracking-wider drop-shadow-lg`}
                      style={result === "win" ? { textShadow: "0 0 40px hsl(45 93% 58% / 0.4)" } : undefined}
                    >
                      {resultText}
                    </motion.h2>
                  </div>
                )}

                {/* Page 2: Scorecard */}
                {page.id === "scorecard" && (
                  <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                    <span className="text-[8px] font-display font-bold tracking-[0.2em] text-foreground/60">FULL SCORECARD</span>
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <p className="font-display text-[8px] text-foreground/60 font-bold tracking-widest">{playerName.toUpperCase()}</p>
                        <p className="font-display text-3xl font-black text-primary leading-none drop-shadow-lg">{playerScore}<span className="text-lg text-out-red/70">/{playerWickets}</span></p>
                      </div>
                      <span className="text-foreground/30 font-display text-lg">vs</span>
                      <div className="text-center">
                        <p className="font-display text-[8px] text-foreground/60 font-bold tracking-widest">{opponentName.toUpperCase()}</p>
                        <p className="font-display text-3xl font-black text-accent leading-none drop-shadow-lg">{opponentScore}<span className="text-lg text-out-red/70">/{opponentWickets}</span></p>
                      </div>
                    </div>
                    <p className="text-[9px] text-foreground/50 font-display">
                      {result === "win" ? `${playerName} won by ${playerScore - opponentScore} runs` : result === "loss" ? `${opponentName} won by ${opponentScore - playerScore} runs` : "Match tied!"}
                    </p>
                  </div>
                )}

                {/* Page 3: Stats */}
                {page.id === "stats" && (
                  <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
                    <span className="text-[8px] font-display font-bold tracking-[0.2em] text-foreground/60">📊 MATCH ANALYTICS</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { icon: "⚾", label: "BALLS", value: stats.totalBalls, color: "text-foreground" },
                        { icon: "⚡", label: "SR", value: stats.strikeRate, color: "text-primary" },
                        { icon: "💥", label: "BDRY%", value: `${stats.boundaryPct}%`, color: "text-secondary" },
                        { icon: "🤝", label: "P'SHIP", value: stats.bestPartnership, color: "text-neon-green" },
                      ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.08 }}
                          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-lg p-1.5 text-center">
                          <span className="text-xs block">{s.icon}</span>
                          <span className={`font-display text-base font-black ${s.color} block leading-none drop-shadow-lg`}>{s.value}</span>
                          <span className="text-[5px] text-foreground/50 font-display tracking-widest mt-0.5 block">{s.label}</span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex gap-1.5 justify-center pt-1">
                      {[
                        { label: "6s", val: stats.sixes, color: "text-primary" },
                        { label: "4s", val: stats.fours, color: "text-neon-green" },
                        { label: "3s", val: stats.threes, color: "text-secondary" },
                        { label: "2s", val: stats.twos, color: "text-foreground" },
                        { label: "1s", val: stats.singles, color: "text-foreground" },
                        { label: "•", val: stats.dots, color: "text-muted-foreground" },
                      ].map((s, i) => (
                        <motion.div key={s.label} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.04, type: "spring" }}
                          className="flex flex-col items-center">
                          <span className={`font-display text-sm font-black ${s.color} drop-shadow-lg`}>{s.val}</span>
                          <span className="text-[5px] text-foreground/50 font-display tracking-wider">{s.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page 4: Wagon wheel */}
                {page.id === "wagon" && (
                  <div className="space-y-2">
                    <WagonWheel ballHistory={ballHistory} isBatting={true} compact />
                  </div>
                )}

                {/* Page 4b: Rivalry (PvP only) */}
                {page.id === "rivalry" && isPvP && rivalryStats && (
                  <div className="backdrop-blur-md bg-black/30 border border-out-red/20 rounded-xl p-3 space-y-2">
                    <span className="text-[8px] font-display font-bold tracking-[0.2em] text-out-red">😈 RIVALRY UPDATE</span>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <span className="text-[7px] text-foreground/50 font-display">TOTAL</span>
                        <span className="font-display text-lg font-black text-foreground block">{rivalryStats.totalGames + 1}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] text-foreground/50 font-display">YOUR W</span>
                        <span className="font-display text-lg font-black text-neon-green block">{rivalryStats.myWins + (result === "win" ? 1 : 0)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] text-foreground/50 font-display">THEIR W</span>
                        <span className="font-display text-lg font-black text-out-red block">{rivalryStats.theirWins + (result === "loss" ? 1 : 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Page 5: Verdict + MOTM */}
                {page.id === "verdict" && (
                  <div className="space-y-3">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">🏅</motion.div>
                    <div className="backdrop-blur-md bg-black/30 border border-secondary/20 rounded-xl p-3">
                      <span className="text-[8px] font-display font-bold tracking-[0.2em] text-secondary">MAN OF THE MATCH</span>
                      <p className="font-display text-xl font-black text-foreground mt-1 drop-shadow-lg">
                        {result === "win" ? playerName : result === "loss" ? opponentName : "Shared!"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Commentary bubbles */}
                <div className="space-y-1.5 px-2">
                  {page.lines.map((line, i) => {
                    const comm = duo.find(c => c.name === line.commentatorId) || duo[0];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: comm === duo[0] ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.4 }}
                        className={`flex items-start gap-1.5 backdrop-blur-md rounded-lg px-2.5 py-1.5 ${
                          comm === duo[0] ? "bg-primary/10 border border-primary/15" : "bg-accent/10 border border-accent/15"
                        }`}
                      >
                        <span className="text-xs flex-shrink-0">{comm.avatar}</span>
                        <div className="text-left">
                          <span className={`text-[6px] font-display font-bold tracking-wider ${comm === duo[0] ? "text-primary" : "text-accent"}`}>{comm.name}</span>
                          <p className="font-display text-[9px] font-bold text-foreground/90 leading-snug">{line.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
            </div>

            {/* Bottom bar: dots + controls */}
            <div className="relative z-10 px-4 pb-4 pt-2">
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-3">
                {pages.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: currentPage === i ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 1, repeat: currentPage === i ? Infinity : 0 }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${currentPage >= i ? "bg-primary" : "bg-white/20"}`}
                  />
                ))}
              </div>

              {/* Tap hint + skip */}
              <div className="flex items-center justify-between">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                  className="text-[11px] text-foreground/40 font-display tracking-wider underline"
                >
                  SKIP
                </motion.button>
                <motion.span
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[10px] text-foreground/50 font-display tracking-wider"
                >
                  {currentPage < pages.length - 1 ? "TAP TO CONTINUE →" : "TAP TO CLOSE →"}
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
