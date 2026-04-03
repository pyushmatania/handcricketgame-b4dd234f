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
import victoryTrophy from "@/assets/victory-trophy.png";
import GameButton from "./shared/GameButton";

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

  const isWin = result === "win";
  const isLoss = result === "loss";

  useEffect(() => {
    if (isWin) {
      if (isElevenLabsAvailable()) playElevenLabsSFX(ElevenLabsSFXPrompts.victoryFanfare, 5);
      if (soundEnabled) SFX.victoryAnthem();
      if (crowdEnabled) CrowdSFX.victory();
      playElevenLabsMusic("Triumphant cricket victory celebration music, stadium horns, crowd cheering, drums", 25, false);
    } else if (isLoss) {
      if (soundEnabled) SFX.loss();
    } else {
      if (soundEnabled) SFX.gameStart();
    }
    return () => { stopMusic(); };
  }, []);

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
          className="fixed inset-0 z-[70] flex flex-col overflow-y-auto"
          style={{ background: isWin
            ? "linear-gradient(to bottom, hsl(43 50% 10%), hsl(220 25% 8%))"
            : isLoss
            ? "linear-gradient(to bottom, hsl(4 30% 10%), hsl(220 25% 8%))"
            : "linear-gradient(to bottom, hsl(220 20% 14%), hsl(220 25% 8%))"
          }}
        >
          {/* Confetti particles for wins */}
          {isWin && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1, rotate: 0 }}
                  animate={{ y: "110vh", rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
                  transition={{ duration: 3 + Math.random() * 3, delay: Math.random() * 2, repeat: Infinity }}
                  className="absolute w-2 h-3 rounded-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    background: ["hsl(43 96% 56%)", "hsl(122 39% 49%)", "hsl(4 90% 58%)", "hsl(280 70% 55%)", "hsl(200 70% 50%)"][i % 5],
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 flex-1 flex flex-col px-4 py-6">
            {/* Result Header */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center mb-4 pt-8"
            >
              {/* Trophy/emoji */}
              {isWin ? (
                <motion.img
                  src={victoryTrophy}
                  alt="Victory"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 8, delay: 0.3 }}
                  className="w-24 h-24 mx-auto mb-2 drop-shadow-[0_0_30px_hsl(43_96%_56%/0.5)]"
                />
              ) : (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 8, delay: 0.3 }}
                  className="text-6xl block mb-3"
                >
                  {isLoss ? "😔" : "🤝"}
                </motion.span>
              )}

              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className={`font-game-display text-4xl font-black tracking-wider ${
                  isWin ? "text-game-gold" : isLoss ? "text-game-red" : "text-white"
                }`}
                style={{ textShadow: isWin
                  ? "0 0 40px hsl(43 96% 56% / 0.5), 0 4px 8px rgba(0,0,0,0.5)"
                  : "0 4px 8px rgba(0,0,0,0.5)"
                }}
              >
                {isWin ? "VICTORY!" : isLoss ? "DEFEAT" : "TIED!"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="font-game-body text-xs text-white/50 mt-1 tracking-wider"
              >
                {isWin
                  ? `${playerName} won by ${playerScore - opponentScore} runs`
                  : isLoss
                  ? `${opponentName} won by ${opponentScore - playerScore} runs`
                  : "Match Tied!"}
              </motion.p>
            </motion.div>

            {/* Scorecard */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border-2 border-game-gold/20 bg-[hsl(220_20%_14%/0.9)] p-4 mb-4 shadow-game-card"
            >
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-xs">🏏</span>
                <span className="font-game-display text-[9px] font-bold text-game-gold/60 tracking-[0.3em]">SCORECARD</span>
              </div>

              {/* Player row */}
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  {isWin && <span className="text-xs">🏆</span>}
                  <span className="font-game-display text-sm font-black text-white">{playerName}</span>
                </div>
                <div className="text-right">
                  <span className="font-game-display text-2xl font-black text-game-gold">{playerScore}</span>
                  <span className="text-sm text-game-red/60 font-game-display">/{playerWickets}</span>
                  <span className="text-[10px] text-white/30 font-game-body ml-2">({overs} ov)</span>
                </div>
              </div>

              {/* Opponent row */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  {isLoss && <span className="text-xs">🏆</span>}
                  <span className="font-game-display text-sm font-black text-white">{opponentName}</span>
                </div>
                <div className="text-right">
                  <span className="font-game-display text-2xl font-black text-white/80">{opponentScore}</span>
                  <span className="text-sm text-game-red/60 font-game-display">/{opponentWickets}</span>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-4 gap-2 mb-4"
            >
              {[
                { icon: "⚾", label: "BALLS", value: stats.totalBalls, color: "text-white" },
                { icon: "⚡", label: "SR", value: stats.strikeRate, color: "text-game-gold" },
                { icon: "📊", label: "RR", value: runRate, color: "text-game-green" },
                { icon: "🤝", label: "BEST P", value: stats.bestPartnership, color: "text-purple-300" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="rounded-xl bg-white/[0.04] border border-white/10 p-2.5 text-center"
                >
                  <span className="text-sm block">{s.icon}</span>
                  <span className={`font-game-display text-lg font-black ${s.color} block leading-none`}>{s.value}</span>
                  <span className="text-[6px] text-white/30 font-game-display tracking-widest mt-0.5 block">{s.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Shot Distribution */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 mb-4"
            >
              <span className="font-game-display text-[8px] font-bold text-white/30 tracking-[0.2em] block mb-2 text-center">SHOT DISTRIBUTION</span>
              <div className="flex items-end justify-center gap-3">
                {[
                  { label: "6s", val: stats.sixes, color: "bg-purple-500", textColor: "text-purple-300" },
                  { label: "4s", val: stats.fours, color: "bg-game-gold", textColor: "text-game-gold" },
                  { label: "3s", val: stats.threes, color: "bg-game-green", textColor: "text-game-green" },
                  { label: "2s", val: stats.twos, color: "bg-blue-400", textColor: "text-blue-300" },
                  { label: "1s", val: stats.singles, color: "bg-white/30", textColor: "text-white" },
                  { label: "•", val: stats.dots, color: "bg-white/10", textColor: "text-white/50" },
                ].map((s, i) => {
                  const maxVal = Math.max(stats.sixes, stats.fours, stats.threes, stats.twos, stats.singles, stats.dots, 1);
                  const height = Math.max(8, (s.val / maxVal) * 48);
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.45 + i * 0.06, type: "spring" }}
                      className="flex flex-col items-center origin-bottom"
                    >
                      <span className={`font-game-display text-xs font-black ${s.textColor} mb-1`}>{s.val}</span>
                      <div className={`w-6 ${s.color} rounded-t-md opacity-60`} style={{ height }} />
                      <span className="text-[7px] text-white/30 font-game-display mt-1">{s.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Wagon Wheel */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 mb-4"
            >
              <WagonWheel ballHistory={ballHistory} isBatting={true} compact />
            </motion.div>

            {/* Man of the Match */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="rounded-2xl bg-gradient-to-b from-game-gold/10 to-transparent border border-game-gold/20 p-4 mb-6 text-center"
            >
              <span className="text-3xl block mb-1">🏅</span>
              <span className="font-game-display text-[8px] font-bold text-game-gold/60 tracking-[0.2em] block mb-1">MAN OF THE MATCH</span>
              <p className="font-game-display text-xl font-black text-game-gold"
                style={{ textShadow: "0 0 20px hsl(43 96% 56% / 0.3)" }}>
                {isWin ? playerName : isLoss ? opponentName : "Shared!"}
              </p>
            </motion.div>
          </div>

          {/* Fixed bottom button */}
          <div className="sticky bottom-0 p-4 pb-8 bg-gradient-to-t from-[hsl(220_25%_8%)] via-[hsl(220_25%_8%/0.95)] to-transparent">
            <GameButton variant="gold" size="lg" bounce onClick={handleClose} className="w-full">
              ⚡ CONTINUE
            </GameButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
