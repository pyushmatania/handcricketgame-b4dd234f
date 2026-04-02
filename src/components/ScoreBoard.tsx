import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState, BallResult } from "@/hooks/useHandCricket";

interface ScoreBoardProps {
  game: GameState;
  playerName?: string;
  aiName?: string;
  aiEmoji?: string;
}

/** Split ball history into innings based on when the phase changed */
function getCurrentInningsBalls(ballHistory: BallResult[], currentInnings: 1 | 2): BallResult[] {
  if (currentInnings === 1) return ballHistory;
  // Find the last OUT in innings 1 — everything after is innings 2
  const lastOutIdx = ballHistory.findIndex((b, i) => {
    // The ball that caused innings change is the last OUT in first innings
    if (b.runs !== "OUT") return false;
    // Check if subsequent balls exist (meaning innings changed)
    const remaining = ballHistory.slice(i + 1);
    return remaining.length > 0 || i === ballHistory.length - 1;
  });
  if (lastOutIdx === -1) return ballHistory;
  return ballHistory.slice(lastOutIdx + 1);
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

function getStrikeRate(score: number, balls: number): string {
  if (balls === 0) return "0.0";
  return ((score / balls) * 100).toFixed(1);
}

function getPartnershipRuns(balls: BallResult[], isBatting: boolean): number {
  let partnership = 0;
  for (let i = balls.length - 1; i >= 0; i--) {
    if (balls[i].runs === "OUT") break;
    const r = typeof balls[i].runs === "number" ? (balls[i].runs as number) : 0;
    if (isBatting ? r > 0 : r < 0) partnership += Math.abs(r);
    else if (r === 0) continue;
  }
  return partnership;
}

function getRequiredRate(needed: number, ballsBowled: number): string | null {
  // Assume unlimited overs in hand cricket, so RRR isn't super meaningful
  // but show it for fun
  if (needed <= 0) return null;
  const estBallsLeft = Math.max(6, 30 - ballsBowled); // rough estimate
  return ((needed / estBallsLeft) * 6).toFixed(2);
}

export default function ScoreBoard({ game, playerName = "You", aiName = "Rohit AI", aiEmoji = "🏏" }: ScoreBoardProps) {
  const currentInningsBalls = useMemo(
    () => getCurrentInningsBalls(game.ballHistory, game.currentInnings),
    [game.ballHistory, game.currentInnings]
  );

  // Balls in this innings for the batting side
  const inningsBallCount = currentInningsBalls.length;
  const oversStr = getOvers(inningsBallCount);

  // Current over balls (last 6 or fewer)
  const currentOverBalls = useMemo(() => {
    const overStart = Math.floor((inningsBallCount - 1) / 6) * 6;
    return currentInningsBalls.slice(Math.max(0, overStart));
  }, [currentInningsBalls, inningsBallCount]);

  const overNumber = Math.floor(inningsBallCount / 6) + (inningsBallCount % 6 > 0 ? 1 : 0);

  // Batting side score & RR
  const battingScore = game.isBatting ? game.userScore : game.aiScore;
  const battingWickets = game.isBatting ? game.userWickets : game.aiWickets;
  const battingName = game.isBatting ? playerName : aiName;
  const bowlingName = game.isBatting ? aiName : playerName;
  const runRate = getRunRate(battingScore, inningsBallCount);
  const strikeRate = getStrikeRate(battingScore, inningsBallCount);
  const partnership = getPartnershipRuns(currentInningsBalls, game.isBatting);

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const phaseLabel = () => {
    switch (game.phase) {
      case "first_batting":
      case "first_bowling":
        return "1ST INNINGS";
      case "second_batting":
      case "second_bowling":
        return "2ND INNINGS";
      case "finished":
        return "MATCH OVER";
      default:
        return "READY";
    }
  };

  const statusLabel = () => {
    if (game.phase === "finished") return "";
    return game.isBatting
      ? game.target ? "CHASING" : "BATTING"
      : game.target ? "DEFENDING" : "BOWLING";
  };

  const chasePct = game.target ? Math.min((game.userScore / game.target) * 100, 100) : 0;

  // Last ball result for flash
  const lastBall = currentInningsBalls.length > 0 ? currentInningsBalls[currentInningsBalls.length - 1] : null;
  const lastBallHighlight = lastBall
    ? lastBall.runs === "OUT" ? "wicket"
    : typeof lastBall.runs === "number" && Math.abs(lastBall.runs) >= 6 ? "six"
    : typeof lastBall.runs === "number" && Math.abs(lastBall.runs) >= 4 ? "four"
    : null
    : null;

  return (
    <div className="space-y-1">
      {/* Broadcast header */}
      <div className="glass-premium rounded-lg px-3 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
          <span className="text-[8px] font-display tracking-[0.2em] text-primary font-bold">{phaseLabel()}</span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span className="text-[8px] font-display tracking-wider text-secondary font-bold">{statusLabel()}</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-out-red/10 border border-out-red/20">
          <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
          <span className="text-[7px] text-out-red font-display font-bold tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Main scorecard */}
      <div className="glass-premium rounded-xl p-2.5 relative overflow-hidden">
        {/* Pitch background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(120_30%_18%/0.06)] via-transparent to-[hsl(120_30%_18%/0.06)]" />
          </div>
        </div>

        {/* Score layout — cricket style: batting team prominent */}
        <div className="relative z-10">
          {/* Batting team main score */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">{game.isBatting ? "🏏" : aiEmoji}</span>
              <span className="text-[9px] font-display font-bold text-foreground tracking-wider uppercase">
                {battingName.slice(0, 12)}
              </span>
              <span className="text-[7px] px-1 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-secondary font-display font-bold">
                BAT
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-muted-foreground/60 font-display">SR</span>
              <span className="text-[8px] font-display font-bold text-primary tracking-wider">{strikeRate}</span>
              <span className="text-[5px] text-muted-foreground/30">|</span>
              <span className="text-[7px] text-muted-foreground/60 font-display">RR</span>
              <span className="text-[8px] font-display font-bold text-accent tracking-wider">{runRate}</span>
            </div>
          </div>

          {/* Big score line */}
          <div className="flex items-baseline gap-1 mb-0.5">
            <motion.span
              key={`bat-${battingScore}`}
              initial={{ scale: 1.2, color: "hsl(145 70% 55%)" }}
              animate={{ scale: 1, color: "hsl(45 95% 58%)" }}
              className="font-display text-4xl font-black text-secondary leading-none"
              style={{ textShadow: "0 0 20px hsl(45 95% 58% / 0.25)" }}
            >
              {battingScore}
            </motion.span>
            <span className="text-lg text-out-red/80 font-display font-bold">/{battingWickets}</span>
            <span className="text-[10px] text-muted-foreground/60 font-display ml-1">
              ({oversStr} ov)
            </span>

            {/* Last ball flash */}
            <AnimatePresence>
              {lastBallHighlight && (
                <motion.span
                  key={`flash-${game.ballHistory.length}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 12 }}
                  className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-display font-black tracking-wider ${
                    lastBallHighlight === "wicket"
                      ? "bg-out-red/20 border border-out-red/30 text-out-red"
                      : lastBallHighlight === "six"
                      ? "bg-primary/20 border border-primary/30 text-primary"
                      : "bg-secondary/20 border border-secondary/30 text-secondary"
                  }`}
                >
                  {lastBallHighlight === "wicket" ? "WICKET!" : lastBallHighlight === "six" ? "SIX! 🔥" : "FOUR! 💥"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Bowling team line */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px]">{game.isBatting ? aiEmoji : "🏏"}</span>
            <span className="text-[8px] font-display font-bold text-muted-foreground/70 tracking-wider uppercase">
              {bowlingName.slice(0, 12)}
            </span>
            <span className="text-[7px] px-1 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-display font-bold">
              BOWL
            </span>
          </div>

          {/* Partnership */}
          {partnership > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[7px] text-muted-foreground/50 font-display tracking-wider">🤝 P'SHIP</span>
              <span className="text-[9px] font-display font-bold text-neon-green">{partnership}</span>
            </div>
          )}

          {/* 1st innings score if in 2nd innings */}
          {game.currentInnings === 2 && (
            <div className="flex items-center gap-2 mb-1.5 px-2 py-1 rounded-lg bg-muted/10 border border-muted/15">
              <span className="text-[7px] text-muted-foreground/50 font-display tracking-wider">1ST INNINGS</span>
              <span className="text-[9px] font-display font-bold text-muted-foreground">
                {game.isBatting ? aiName : playerName}: {game.isBatting ? game.aiScore : game.userScore}
              </span>
            </div>
          )}

          {/* Chase tracker */}
          {game.target && game.phase !== "finished" && game.isBatting && (
            <div className="mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[7px]">🎯</span>
                  <span className="text-[7px] font-display font-bold text-secondary tracking-wider">TARGET: {game.target}</span>
                </div>
                {needRuns !== null && (
                  <motion.span
                    key={needRuns}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-[7px] font-display font-bold text-primary tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20"
                  >
                    NEED {needRuns} RUNS
                  </motion.span>
                )}
              </div>
              <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                  animate={{ width: `${chasePct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          )}

          {/* Current over - ball by ball */}
          <div className="pt-1.5 border-t border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[6px] text-muted-foreground font-bold tracking-[0.2em] font-display">
                OVER {overNumber || 1}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/10 to-transparent" />
              <span className="text-[6px] text-muted-foreground/40 font-display">{inningsBallCount} BALLS</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {currentOverBalls.length === 0 && (
                <span className="text-[7px] text-muted-foreground/30 font-display italic">No balls bowled yet</span>
              )}
              {currentOverBalls.map((b, i) => {
                const isOut = b.runs === "OUT";
                const absRuns = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
                const isSix = !isOut && absRuns >= 6;
                const isFour = !isOut && absRuns >= 4;
                const isDot = !isOut && absRuns === 0;
                return (
                  <motion.div
                    key={`${game.currentInnings}-${i}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-display font-bold border shrink-0 ${
                      isOut
                        ? "bg-out-red/20 border-out-red/40 text-out-red"
                        : isSix
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : isFour
                        ? "bg-secondary/20 border-secondary/40 text-secondary"
                        : isDot
                        ? "bg-muted/15 border-muted/30 text-muted-foreground/50"
                        : "bg-accent/15 border-accent/30 text-accent"
                    }`}
                  >
                    {isOut ? "W" : absRuns > 0 ? absRuns : "•"}
                  </motion.div>
                );
              })}
              {/* Remaining balls in over indicator */}
              {currentOverBalls.length > 0 && currentOverBalls.length < 6 && (
                <>
                  {Array.from({ length: 6 - currentOverBalls.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-6 h-6 rounded-full border border-dashed border-muted/15 shrink-0" />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {game.phase === "finished" && game.result && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateX: 90 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 150 }}
            className="relative overflow-hidden rounded-xl"
          >
            <div className={`text-center py-3 font-display font-black text-lg relative overflow-hidden ${
              game.result === "win"
                ? "bg-gradient-to-br from-primary/20 via-primary/10 to-neon-green/10 text-primary border border-primary/20"
                : game.result === "loss"
                ? "bg-gradient-to-br from-out-red/15 via-out-red/10 to-out-red/5 text-out-red border border-out-red/20"
                : "bg-gradient-to-br from-secondary/15 via-secondary/10 to-secondary/5 text-secondary border border-secondary/20"
            } rounded-xl`}>
              {game.result === "win" && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 0, x: 0, opacity: 1 }}
                      animate={{ y: [0, -60 - Math.random() * 40], x: [(i - 3) * 15, (i - 3) * 30], opacity: [1, 0], rotate: [0, Math.random() * 360] }}
                      transition={{ duration: 1.8, delay: i * 0.08, repeat: Infinity, repeatDelay: 2.5 }}
                      className="absolute top-1/2 left-1/2 text-sm"
                    >
                      {["🎉", "⭐", "🏆", "✨", "🎊", "🏏"][i]}
                    </motion.div>
                  ))}
                </>
              )}
              <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.2, duration: 0.5 }} className="text-2xl block mb-0.5">
                {game.result === "win" ? "🏆" : game.result === "loss" ? "💔" : "🤝"}
              </motion.span>
              <span className="relative z-10 tracking-widest text-base" style={{ textShadow: "0 0 30px currentColor" }}>
                {game.result === "win" && `${playerName.toUpperCase()} WINS!`}
                {game.result === "loss" && `${aiName.toUpperCase()} WINS!`}
                {game.result === "draw" && "IT'S A DRAW!"}
              </span>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[10px] font-normal text-muted-foreground mt-0.5 relative z-10">
                <span className="text-secondary font-bold">{playerName} {game.userScore}/{game.userWickets}</span>
                <span className="mx-2">vs</span>
                <span className="text-accent font-bold">{aiName} {game.aiScore}/{game.aiWickets}</span>
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
