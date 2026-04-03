import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState, BallResult } from "@/hooks/useHandCricket";

interface ScoreBoardProps {
  game: GameState;
  playerName?: string;
  aiName?: string;
  aiEmoji?: string;
  isPvP?: boolean;
}

function getCurrentInningsBalls(ballHistory: BallResult[], currentInnings: 1 | 2, innings1Balls: number): BallResult[] {
  if (currentInnings === 1) return ballHistory;
  return ballHistory.slice(innings1Balls);
}

function getOvers(balls: number): string {
  const fullOvers = Math.floor(balls / 6);
  const remaining = balls % 6;
  return remaining === 0 && balls > 0 ? `${fullOvers}.0` : `${fullOvers}.${remaining}`;
}

function getRunRate(score: number, balls: number): string {
  if (balls === 0) return "0.00";
  return ((score / balls) * 6).toFixed(2);
}

function getRequiredRate(needed: number, ballsLeft: number): string | null {
  if (needed <= 0 || ballsLeft <= 0) return null;
  return ((needed / ballsLeft) * 6).toFixed(2);
}

export default function ScoreBoard({ game, playerName = "You", aiName = "Rohit AI", aiEmoji = "🏏", isPvP = false }: ScoreBoardProps) {
  const currentInningsBalls = useMemo(
    () => getCurrentInningsBalls(game.ballHistory, game.currentInnings, game.innings1Balls || 0),
    [game.ballHistory, game.currentInnings, game.innings1Balls]
  );

  const inningsBallCount = currentInningsBalls.length;
  const oversStr = getOvers(inningsBallCount);

  const currentOverBalls = useMemo(() => {
    const overStart = Math.floor((inningsBallCount - 1) / 6) * 6;
    return currentInningsBalls.slice(Math.max(0, overStart));
  }, [currentInningsBalls, inningsBallCount]);

  const config = game.config || { overs: null, wickets: 1 };
  const totalOvers = config.overs;
  const totalBallsInInnings = totalOvers ? totalOvers * 6 : null;
  const ballsLeft = totalBallsInInnings ? Math.max(0, totalBallsInInnings - inningsBallCount) : null;

  const battingScore = game.isBatting ? game.userScore : game.aiScore;
  const runRate = getRunRate(battingScore, inningsBallCount);

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const requiredRR = needRuns !== null && ballsLeft !== null
    ? getRequiredRate(needRuns, ballsLeft)
    : null;

  const chasePct = game.target ? Math.min((game.userScore / game.target) * 100, 100) : 0;

  // Innings switch detection
  const prevInningsRef = useRef(game.currentInnings);
  const [showInningsSwitch, setShowInningsSwitch] = useState(false);

  useEffect(() => {
    if (game.currentInnings !== prevInningsRef.current && game.currentInnings === 2) {
      prevInningsRef.current = game.currentInnings;
      setShowInningsSwitch(true);
      setTimeout(() => setShowInningsSwitch(false), 2800);
    }
    prevInningsRef.current = game.currentInnings;
  }, [game.currentInnings]);

  const phaseLabel = () => {
    switch (game.phase) {
      case "first_batting": case "first_bowling": return "1ST INNINGS";
      case "second_batting": case "second_bowling": return "2ND INNINGS";
      case "finished": return "MATCH OVER";
      default: return "READY";
    }
  };

  return (
    <div className="space-y-1.5 relative">
      {/* INNINGS SWITCH overlay */}
      <AnimatePresence>
        {showInningsSwitch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl overflow-hidden pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-game-gold/90 via-game-green/80 to-game-gold/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0, rotateZ: -5 }}
              animate={{ scale: 1, rotateZ: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative z-10 text-center"
            >
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6, repeat: 3 }} className="text-3xl block mb-1">🔄</motion.span>
              <p className="font-game-display text-xl font-black text-white tracking-[0.3em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">INNINGS SWITCH</p>
              <p className="font-game-display text-[10px] font-bold text-white/80 tracking-wider mt-2">
                {game.isBatting ? "🏏 YOU BAT NOW" : "🎯 YOU BOWL NOW"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Scoreboard Card ── */}
      <div className="rounded-2xl overflow-hidden border-2 border-game-gold/30 shadow-game-card bg-gradient-to-b from-[hsl(220_20%_18%)] to-[hsl(220_25%_12%)]">
        {/* Header strip */}
        <div className="flex items-center justify-between px-3 py-1 bg-gradient-to-r from-game-gold/20 via-game-gold/10 to-game-gold/20 border-b border-game-gold/20">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-3 rounded-full bg-game-green shadow-[0_0_6px_hsl(122_39%_49%/0.5)]" />
            <span className="text-[8px] font-game-display tracking-[0.15em] text-game-gold font-bold">{phaseLabel()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {totalOvers && <span className="text-[7px] font-game-body font-bold text-white/40">{totalOvers} OV</span>}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-game-red/15 border border-game-red/25">
              <div className="w-1.5 h-1.5 rounded-full bg-game-red animate-pulse" />
              <span className="text-[7px] text-game-red font-game-display font-bold tracking-widest">LIVE</span>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="px-3 py-2">
          {/* Role banner */}
          <div className="flex justify-center mb-2">
            <motion.div
              key={game.isBatting ? "bat" : "bowl"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-[8px] font-game-display font-black tracking-[0.2em] px-3 py-1 rounded-full border-b-2 ${
                game.isBatting
                  ? "bg-gradient-to-b from-game-gold/25 to-game-gold/10 border-game-gold/40 text-game-gold"
                  : "bg-gradient-to-b from-game-green/25 to-game-green/10 border-game-green/40 text-game-green"
              }`}
            >
              {game.isBatting ? "🏏 YOU'RE BATTING" : "🎯 YOU'RE BOWLING"}
            </motion.div>
          </div>

          {/* Two-side score layout */}
          <div className="flex items-center justify-between">
            {/* Player */}
            <div className="flex-1 text-center">
              <p className="text-[7px] text-white/50 font-game-display font-bold tracking-[0.15em] mb-0.5">
                {playerName.toUpperCase().slice(0, 10)}
              </p>
              <motion.div key={`p-${game.userScore}`} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                className="flex items-baseline justify-center gap-0.5">
                <span className="font-game-display text-3xl font-black text-game-gold leading-none"
                  style={{ textShadow: "0 0 20px hsl(43 96% 56% / 0.3), 0 2px 4px rgba(0,0,0,0.5)" }}>
                  {game.userScore}
                </span>
                <span className="text-sm text-game-red/80 font-game-display font-bold">/{game.userWickets}</span>
              </motion.div>
            </div>

            {/* Center divider */}
            <div className="flex flex-col items-center px-3">
              <span className="text-[8px] font-game-display font-black text-white/30">VS</span>
              <span className="text-[9px] font-game-display font-bold text-game-green tracking-wider">{oversStr}</span>
              {totalOvers && <span className="text-[7px] text-white/30 font-game-body">/{totalOvers} ov</span>}
            </div>

            {/* Opponent */}
            <div className="flex-1 text-center">
              <p className="text-[7px] text-white/50 font-game-display font-bold tracking-[0.15em] mb-0.5">
                {aiName.toUpperCase().slice(0, 10)}
              </p>
              <motion.div key={`a-${game.aiScore}`} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                className="flex items-baseline justify-center gap-0.5">
                <span className="font-game-display text-3xl font-black text-white leading-none"
                  style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  {game.aiScore}
                </span>
                <span className="text-sm text-game-red/80 font-game-display font-bold">/{game.aiWickets}</span>
              </motion.div>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-game-green/10 border border-game-green/20">
              <span className="text-[7px] font-game-display font-bold text-white/50">CRR</span>
              <span className="text-[8px] font-game-display font-bold text-game-green">{runRate}</span>
            </div>
            {requiredRR && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-game-red/10 border border-game-red/20">
                <span className="text-[7px] font-game-display font-bold text-white/50">RRR</span>
                <span className="text-[8px] font-game-display font-bold text-game-red">{requiredRR}</span>
              </div>
            )}
          </div>

          {/* Chase tracker */}
          {game.target && game.phase !== "finished" && game.isBatting && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-game-display font-bold text-game-gold tracking-wider">🎯 TARGET: {game.target}</span>
                {needRuns !== null && (
                  <span className="text-[7px] font-game-display font-bold text-game-green">NEED {needRuns}</span>
                )}
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-game-green via-game-gold to-game-green"
                  animate={{ width: `${chasePct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* This Over strip */}
        <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[6px] text-white/40 font-game-display font-bold tracking-[0.2em]">THIS OVER</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[6px] text-white/30 font-game-body">{inningsBallCount} balls</span>
          </div>
          <div className="flex gap-1">
            {currentOverBalls.map((b, i) => {
              const isOut = b.runs === "OUT";
              const absRuns = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
              const isSix = !isOut && absRuns >= 6;
              const isFour = !isOut && absRuns >= 4;
              return (
                <motion.div
                  key={`${game.currentInnings}-${i}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-game-display font-black border-b-2 ${
                    isOut ? "bg-game-red/30 border-game-red/50 text-game-red shadow-[0_0_8px_hsl(4_90%_58%/0.3)]"
                    : isSix ? "bg-purple-500/30 border-purple-400/50 text-purple-300 shadow-[0_0_8px_hsl(280_80%_60%/0.3)]"
                    : isFour ? "bg-game-gold/30 border-game-gold/50 text-game-gold shadow-[0_0_8px_hsl(43_96%_56%/0.3)]"
                    : absRuns === 0 ? "bg-white/5 border-white/10 text-white/30"
                    : "bg-game-green/20 border-game-green/30 text-game-green"
                  }`}
                >
                  {isOut ? "W" : absRuns > 0 ? absRuns : "•"}
                </motion.div>
              );
            })}
            {currentOverBalls.length < 6 && Array.from({ length: 6 - currentOverBalls.length }).map((_, i) => (
              <div key={`e-${i}`} className="w-7 h-7 rounded-full border border-dashed border-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {game.phase === "finished" && game.result && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 10 }}
            className={`rounded-2xl text-center py-3 font-game-display font-black text-lg border-2 border-b-4 ${
              game.result === "win"
                ? "bg-gradient-to-b from-game-green/30 to-game-green/10 border-game-green/40 text-game-green"
                : game.result === "loss"
                ? "bg-gradient-to-b from-game-red/20 to-game-red/10 border-game-red/30 text-game-red"
                : "bg-gradient-to-b from-game-gold/20 to-game-gold/10 border-game-gold/30 text-game-gold"
            }`}
          >
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} className="text-2xl block mb-0.5">
              {game.result === "win" ? "🏆" : game.result === "loss" ? "💔" : "🤝"}
            </motion.span>
            <span className="tracking-widest text-base" style={{ textShadow: "0 0 20px currentColor" }}>
              {game.result === "win" && `${playerName.toUpperCase()} WINS!`}
              {game.result === "loss" && `${aiName.toUpperCase()} WINS!`}
              {game.result === "draw" && "IT'S A DRAW!"}
            </span>
            <p className="text-[10px] font-normal text-white/60 mt-0.5">
              <span className="text-game-gold font-bold">{playerName} {game.userScore}/{game.userWickets}</span>
              <span className="mx-2">vs</span>
              <span className="text-white font-bold">{aiName} {game.aiScore}/{game.aiWickets}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
