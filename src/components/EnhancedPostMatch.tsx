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

export default function EnhancedPostMatch({
  playerName, opponentName, result, playerScore, opponentScore,
  playerWickets = 0, opponentWickets = 0,
  ballHistory, isPvP = false, rivalryStats, commentators, onComplete,
}: EnhancedPostMatchProps) {
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled, commentaryEnabled } = useSettings();
  const stableOnComplete = useCallback(onComplete, []);

  const duo = commentators || pickMatchCommentators();
  const stats = useMemo(() => computeStats(ballHistory), [ballHistory]);

  const resultBanner = result === "win"
    ? { text: `${playerName} won by ${playerScore - opponentScore} runs`, color: "text-secondary", glow: "hsl(45 93% 58% / 0.3)" }
    : result === "loss"
    ? { text: `${opponentName} won by ${opponentScore - playerScore} runs`, color: "text-out-red", glow: "hsl(0 72% 51% / 0.2)" }
    : { text: "Match Tied!", color: "text-accent", glow: "hsl(168 80% 50% / 0.2)" };

  // SFX on mount
  useEffect(() => {
    if (result === "win") {
      if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.victoryFanfare, 5);
      if (soundEnabled) SFX.victoryAnthem();
      if (crowdEnabled) CrowdSFX.victory();
      playElevenLabsMusic("Triumphant cricket victory celebration music, stadium horns, crowd cheering, drums", 25, false);
    } else if (result === "loss") {
      if (soundEnabled) SFX.loss();
    } else {
      if (soundEnabled) SFX.gameStart();
    }
    return () => { stopMusic(); };
  }, []);

  // Play voice on result
  useEffect(() => {
    if (!voiceEnabled || !commentaryEnabled) return;
    const lines = getPostMatchResultLines(duo[0].name, duo[1].name, playerName, opponentName, result, playerScore, opponentScore);
    const keyLines = lines.filter(l => l.isKeyMoment);
    if (keyLines.length === 0) return;
    const ttsLines = keyLines.map(l => ({
      text: l.text,
      voiceId: (duo.find(c => c.name === l.commentatorId) || duo[0]).voiceId,
    }));
    speakDuoLines(ttsLines);
  }, []);

  const handleClose = () => {
    stopMusic();
    setVisible(false);
    setTimeout(stableOnComplete, 300);
  };

  const overs = stats.totalBalls > 0 ? `${Math.floor(stats.totalBalls / 6)}.${stats.totalBalls % 6}` : "0.0";
  const runRate = stats.totalBalls > 0 ? ((stats.totalRuns / stats.totalBalls) * 6).toFixed(1) : "0.0";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col bg-background overflow-y-auto"
        >
          {/* Top gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col px-4 py-6">
            {/* Result Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-6 pt-8"
            >
              <span className="text-5xl block mb-3">
                {result === "win" ? "🏆" : result === "loss" ? "😔" : "🤝"}
              </span>
              <h1
                className={`font-display text-3xl font-black ${resultBanner.color} tracking-wider`}
                style={{ textShadow: `0 0 40px ${resultBanner.glow}` }}
              >
                {result === "win" ? "VICTORY!" : result === "loss" ? "DEFEAT" : "TIED!"}
              </h1>
              <p className="font-display text-xs text-muted-foreground mt-2 tracking-wider">
                {resultBanner.text}
              </p>
            </motion.div>

            {/* Scorecard — Cricket style */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="glass-card rounded-2xl p-4 mb-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-1 mb-3">
                  <span className="text-xs">🏏</span>
                  <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.3em]">
                    FULL SCORECARD
                  </span>
                </div>

                {/* Player 1 row */}
                <div className={`flex items-center justify-between py-2.5 border-b border-border/10 ${result === "win" ? "" : ""}`}>
                  <div className="flex items-center gap-2">
                    {result === "win" && <span className="text-xs">🏆</span>}
                    <span className="font-display text-sm font-black text-foreground">
                      {playerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-2xl font-black text-primary">
                      {playerScore}
                    </span>
                    <span className="text-sm text-out-red/60 font-display">/{playerWickets}</span>
                    <span className="text-[10px] text-muted-foreground font-display ml-2">
                      ({overs} ov)
                    </span>
                  </div>
                </div>

                {/* Player 2 row */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    {result === "loss" && <span className="text-xs">🏆</span>}
                    <span className="font-display text-sm font-black text-foreground">
                      {opponentName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-2xl font-black text-accent">
                      {opponentScore}
                    </span>
                    <span className="text-sm text-out-red/60 font-display">/{opponentWickets}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Match Stats Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-4 gap-2 mb-4"
            >
              {[
                { icon: "⚾", label: "BALLS", value: stats.totalBalls, color: "text-foreground" },
                { icon: "⚡", label: "SR", value: stats.strikeRate, color: "text-primary" },
                { icon: "📊", label: "RR", value: runRate, color: "text-accent" },
                { icon: "🤝", label: "BEST P", value: stats.bestPartnership, color: "text-neon-green" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="glass-card rounded-xl p-2.5 text-center"
                >
                  <span className="text-sm block">{s.icon}</span>
                  <span className={`font-display text-lg font-black ${s.color} block leading-none`}>
                    {s.value}
                  </span>
                  <span className="text-[6px] text-muted-foreground font-display tracking-widest mt-0.5 block">
                    {s.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Shot Distribution */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="glass-card rounded-2xl p-3 mb-4"
            >
              <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.2em] block mb-2 text-center">
                SHOT DISTRIBUTION
              </span>
              <div className="flex items-end justify-center gap-3">
                {[
                  { label: "6s", val: stats.sixes, color: "bg-primary", textColor: "text-primary" },
                  { label: "4s", val: stats.fours, color: "bg-neon-green", textColor: "text-neon-green" },
                  { label: "3s", val: stats.threes, color: "bg-secondary", textColor: "text-secondary" },
                  { label: "2s", val: stats.twos, color: "bg-accent", textColor: "text-accent" },
                  { label: "1s", val: stats.singles, color: "bg-foreground/30", textColor: "text-foreground" },
                  { label: "•", val: stats.dots, color: "bg-muted-foreground/30", textColor: "text-muted-foreground" },
                ].map((s, i) => {
                  const maxVal = Math.max(stats.sixes, stats.fours, stats.threes, stats.twos, stats.singles, stats.dots, 1);
                  const height = Math.max(8, (s.val / maxVal) * 48);
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.4 + i * 0.06, type: "spring" }}
                      className="flex flex-col items-center origin-bottom"
                    >
                      <span className={`font-display text-xs font-black ${s.textColor} mb-1`}>{s.val}</span>
                      <div
                        className={`w-6 ${s.color} rounded-t-md opacity-60`}
                        style={{ height }}
                      />
                      <span className="text-[7px] text-muted-foreground font-display mt-1">{s.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Wagon Wheel (compact) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="glass-card rounded-2xl p-3 mb-4"
            >
              <WagonWheel ballHistory={ballHistory} isBatting={true} compact />
            </motion.div>

            {/* Rivalry Section (PvP only) */}
            {isPvP && rivalryStats && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="glass-card rounded-2xl p-3 mb-4 border-out-red/15"
              >
                <span className="font-display text-[8px] font-bold text-out-red tracking-[0.2em] block mb-2 text-center">
                  RIVALRY HEAD-TO-HEAD
                </span>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <span className="font-display text-lg font-black text-neon-green block">
                      {rivalryStats.myWins + (result === "win" ? 1 : 0)}
                    </span>
                    <span className="text-[7px] text-muted-foreground font-display">YOUR W</span>
                  </div>
                  <div className="text-center">
                    <span className="font-display text-lg font-black text-foreground block">
                      {rivalryStats.totalGames + 1}
                    </span>
                    <span className="text-[7px] text-muted-foreground font-display">TOTAL</span>
                  </div>
                  <div className="text-center">
                    <span className="font-display text-lg font-black text-out-red block">
                      {rivalryStats.theirWins + (result === "loss" ? 1 : 0)}
                    </span>
                    <span className="text-[7px] text-muted-foreground font-display">THEIR W</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Man of the Match */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="glass-card rounded-2xl p-4 mb-6 text-center border-secondary/15"
            >
              <span className="text-3xl block mb-1">🏅</span>
              <span className="font-display text-[8px] font-bold text-secondary tracking-[0.2em] block mb-1">
                MAN OF THE MATCH
              </span>
              <p className="font-display text-xl font-black text-foreground">
                {result === "win" ? playerName : result === "loss" ? opponentName : "Shared!"}
              </p>
            </motion.div>
          </div>

          {/* Fixed bottom button */}
          <div className="sticky bottom-0 p-4 pb-8 bg-gradient-to-t from-background via-background to-transparent">
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-black text-sm rounded-2xl tracking-wider border border-primary/30 shadow-[0_0_25px_hsl(217_91%_60%/0.2)]"
            >
              ⚡ CONTINUE
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
