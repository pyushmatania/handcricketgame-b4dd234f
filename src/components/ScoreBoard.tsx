import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState, BallResult } from "@/hooks/useHandCricket";
import pitchStrips from "@/assets/pitch-strips.jpg";

interface ScoreBoardProps {
  game: GameState;
  playerName?: string;
  aiName?: string;
  aiEmoji?: string;
  isPvP?: boolean;
}

/** Split ball history into innings based on when the phase changed */
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

  // Current over balls (last 6 or fewer)
  const currentOverBalls = useMemo(() => {
    const overStart = Math.floor((inningsBallCount - 1) / 6) * 6;
    return currentInningsBalls.slice(Math.max(0, overStart));
  }, [currentInningsBalls, inningsBallCount]);

  const overNumber = Math.floor(inningsBallCount / 6) + (inningsBallCount % 6 > 0 ? 1 : 0);

  // Batting side score & RR
  const battingScore = game.isBatting ? game.userScore : game.aiScore;
  const battingWickets = game.isBatting ? game.userWickets : game.aiWickets;
  const bowlingScore = game.isBatting ? game.aiScore : game.userScore;
  const battingName = game.isBatting ? playerName : aiName;
  const bowlingName = game.isBatting ? aiName : playerName;
  const runRate = getRunRate(battingScore, inningsBallCount);
  const strikeRate = getStrikeRate(battingScore, inningsBallCount);
  const partnership = getPartnershipRuns(currentInningsBalls, game.isBatting);

  const config = game.config || { overs: null, wickets: 1 };
  const totalOvers = config.overs;
  const totalBallsInInnings = totalOvers ? totalOvers * 6 : null;
  const ballsLeft = totalBallsInInnings ? Math.max(0, totalBallsInInnings - inningsBallCount) : null;
  const oversLeft = ballsLeft !== null ? getOvers(ballsLeft) : null;

  // Bowling change indicator
  const ballsInCurrentOver = inningsBallCount % 6;
  const isNewOver = inningsBallCount > 0 && ballsInCurrentOver === 0;

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const requiredRR = needRuns !== null && ballsLeft !== null
    ? getRequiredRate(needRuns, ballsLeft)
    : null;

  // For PvP: swap sides so "you" is always on left
  const leftName = isPvP ? playerName : battingName;
  const leftScore = isPvP ? game.userScore : battingScore;
  const leftWickets = isPvP ? game.userWickets : battingWickets;
  const leftLabel = isPvP ? (game.isBatting ? "BAT" : "BOWL") : "BAT";
  
  const rightName = isPvP ? aiName : bowlingName;
  const rightScore = isPvP ? game.aiScore : bowlingScore;
  const rightWickets = isPvP ? game.aiWickets : (game.isBatting ? game.aiWickets : game.userWickets);
  const rightLabel = isPvP ? (!game.isBatting ? "BAT" : "BOWL") : "BOWL";

  const phaseLabel = () => {
    switch (game.phase) {
      case "first_batting": case "first_bowling": return "1ST INNINGS";
      case "second_batting": case "second_bowling": return "2ND INNINGS";
      case "finished": return "MATCH OVER";
      default: return "READY";
    }
  };

  const statusLabel = () => {
    if (game.phase === "finished") return "";
    return game.isBatting
      ? game.target ? "CHASING" : "BATTING"
      : game.target ? "DEFENDING" : "BOWLING";
  };

  const chasePct = game.target ? Math.min((game.userScore / game.target) * 100, 100) : 0;

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
        <div className="flex items-center gap-1.5">
          {totalOvers && (
            <span className="text-[7px] font-display font-bold text-muted-foreground/60 tracking-wider">
              {totalOvers} OV
            </span>
          )}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-out-red/10 border border-out-red/20">
            <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
            <span className="text-[7px] text-out-red font-display font-bold tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main scorecard — cricket pitch style */}
      <div className="glass-premium rounded-xl p-2.5 relative overflow-hidden">
        {/* Cricket pitch photo background */}
        <div className="absolute inset-0 pointer-events-none">
          <img src={pitchStrips} alt="" className="w-full h-full object-cover opacity-[0.12]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />
          {/* Green strip overlays */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute h-full pointer-events-none" style={{
              left: `${10 + i * 18}%`, width: '14%',
              background: i % 2 === 0 ? 'hsl(120 35% 22% / 0.08)' : 'hsl(120 25% 15% / 0.04)',
            }} />
          ))}
          {/* Crease lines */}
          <div className="absolute top-[18%] left-[15%] right-[15%] h-px bg-[hsl(45_50%_50%/0.1)]" />
          <div className="absolute bottom-[18%] left-[15%] right-[15%] h-px bg-[hsl(45_50%_50%/0.1)]" />
        </div>

        <div className="relative z-10">
          {/* Batting indicator — prominent role banner */}
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <motion.span
              key={game.isBatting ? "bat" : "bowl"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-[8px] font-display font-black tracking-[0.25em] px-2.5 py-1 rounded-full ${
                game.isBatting 
                  ? "bg-secondary/15 border border-secondary/25 text-secondary" 
                  : "bg-primary/15 border border-primary/25 text-primary"
              }`}
            >
              {game.isBatting ? "🏏 YOU'RE BATTING" : "🎯 YOU'RE BOWLING"}
            </motion.span>
          </div>

          {/* Score layout — two sides */}
          <div className="flex items-center justify-between mb-1.5">
            {/* Left side */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className={`text-[7px] ${leftLabel === "BAT" ? "text-secondary" : "text-primary"}`}>
                  {leftLabel === "BAT" ? "🏏" : "🎯"}
                </span>
                <p className="text-[7px] text-muted-foreground font-display font-bold tracking-[0.2em]">
                  {leftName.toUpperCase().slice(0, 10)}
                </p>
              </div>
              <motion.div
                key={`left-${leftScore}`}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="flex items-baseline justify-center gap-0.5"
              >
                <span className="font-display text-3xl font-black text-secondary leading-none"
                  style={{ textShadow: "0 0 15px hsl(45 95% 58% / 0.2)" }}>
                  {leftScore}
                </span>
                <span className="text-sm text-out-red/70 font-display font-bold">/{leftWickets}</span>
              </motion.div>
              <span className={`text-[6px] px-1.5 py-0.5 rounded-full font-display font-bold tracking-wider mt-0.5 inline-block ${
                leftLabel === "BAT" ? "bg-secondary/10 border border-secondary/20 text-secondary" : "bg-primary/10 border border-primary/20 text-primary"
              }`}>{leftLabel === "BAT" ? "🏏 BATTING" : "🎯 BOWLING"}</span>
            </div>

            {/* VS / overs center */}
            <div className="flex flex-col items-center px-2">
              <span className="text-[8px] font-display font-black text-muted-foreground/40">VS</span>
              <span className="text-[9px] font-display font-bold text-accent tracking-wider">
                {oversStr} ov
              </span>
              {totalOvers && (
                <span className="text-[7px] font-display text-muted-foreground/40">
                  /{totalOvers}
                </span>
              )}
            </div>

            {/* Right side */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className={`text-[7px] ${rightLabel === "BAT" ? "text-secondary" : "text-primary"}`}>
                  {rightLabel === "BAT" ? "🏏" : "🎯"}
                </span>
                <p className="text-[7px] text-muted-foreground font-display font-bold tracking-[0.2em]">
                  {rightName.toUpperCase().slice(0, 10)}
                </p>
              </div>
              <motion.div
                key={`right-${rightScore}`}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="flex items-baseline justify-center gap-0.5"
              >
                <span className="font-display text-3xl font-black text-accent leading-none"
                  style={{ textShadow: "0 0 15px hsl(168 80% 50% / 0.15)" }}>
                  {rightScore}
                </span>
                <span className="text-sm text-out-red/70 font-display font-bold">/{rightWickets}</span>
              </motion.div>
              <span className={`text-[6px] px-1.5 py-0.5 rounded-full font-display font-bold tracking-wider mt-0.5 inline-block ${
                rightLabel === "BAT" ? "bg-secondary/10 border border-secondary/20 text-secondary" : "bg-primary/10 border border-primary/20 text-primary"
              }`}>{rightLabel === "BAT" ? "🏏 BATTING" : "🎯 BOWLING"}</span>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neon-green/8 border border-neon-green/15">
              <span className="text-[6px]">🏏</span>
              <span className="text-[7px] font-display font-bold text-neon-green">{oversStr} OV</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/8 border border-primary/15">
              <span className="text-[6px]">📊</span>
              <span className="text-[7px] font-display font-bold text-muted-foreground">SR</span>
              <span className="text-[7px] font-display font-bold text-primary">{strikeRate}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/8 border border-accent/15">
              <span className="text-[6px]">{game.isBatting ? "🏏" : "🎯"}</span>
              <span className="text-[7px] font-display font-bold text-muted-foreground">CRR</span>
              <span className="text-[7px] font-display font-bold text-accent">{runRate}</span>
            </div>
            {requiredRR && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-out-red/8 border border-out-red/15">
                <span className="text-[6px]">🎯</span>
                <span className="text-[7px] font-display font-bold text-muted-foreground">RRR</span>
                <span className="text-[7px] font-display font-bold text-out-red">{requiredRR}</span>
              </div>
            )}
          </div>

          {/* Partnership */}
          {partnership > 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
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
                  <motion.span key={needRuns} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                    className="text-[7px] font-display font-bold text-primary tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    NEED {needRuns} RUNS
                    {ballsLeft !== null && ` IN ${getOvers(ballsLeft)} OV`}
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

          {/* Overs remaining */}
          {totalOvers && game.phase !== "finished" && ballsLeft !== null && ballsLeft > 0 && (
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span className="text-[7px] font-display text-muted-foreground/50 tracking-wider">OVERS LEFT</span>
              <span className="text-[8px] font-display font-bold text-secondary">{oversLeft}</span>
            </div>
          )}

          {/* Current over - ball by ball */}
          <div className="pt-1.5 border-t border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[6px] text-muted-foreground font-bold tracking-[0.2em] font-display">
                OVER {overNumber || 1}
              </span>
              {isNewOver && inningsBallCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[6px] font-display font-bold text-secondary px-1 py-0.5 rounded bg-secondary/10 border border-secondary/20"
                >
                  🔄 BOWLING CHANGE
                </motion.span>
              )}
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
                      isOut ? "bg-out-red/20 border-out-red/40 text-out-red"
                      : isSix ? "bg-primary/20 border-primary/40 text-primary"
                      : isFour ? "bg-secondary/20 border-secondary/40 text-secondary"
                      : isDot ? "bg-muted/15 border-muted/30 text-muted-foreground/50"
                      : "bg-accent/15 border-accent/30 text-accent"
                    }`}
                  >
                    {isOut ? "W" : absRuns > 0 ? absRuns : "•"}
                  </motion.div>
                );
              })}
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

      {/* Last ball highlight banner */}
      <AnimatePresence>
        {lastBallHighlight && game.phase !== "finished" && (
          <motion.div
            key={`flash-${game.ballHistory.length}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className={`text-center py-1 rounded-lg text-[10px] font-display font-black tracking-wider ${
              lastBallHighlight === "wicket"
                ? "bg-out-red/15 border border-out-red/25 text-out-red"
                : lastBallHighlight === "six"
                ? "bg-primary/15 border border-primary/25 text-primary"
                : "bg-secondary/15 border border-secondary/25 text-secondary"
            }`}
          >
            {lastBallHighlight === "wicket" ? "🔴 WICKET!" : lastBallHighlight === "six" ? "🔥 SIX!" : "💥 FOUR!"}
          </motion.div>
        )}
      </AnimatePresence>

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
                    <motion.div key={i}
                      initial={{ y: 0, x: 0, opacity: 1 }}
                      animate={{ y: [0, -60 - Math.random() * 40], x: [(i - 3) * 15, (i - 3) * 30], opacity: [1, 0], rotate: [0, Math.random() * 360] }}
                      transition={{ duration: 1.8, delay: i * 0.08, repeat: Infinity, repeatDelay: 2.5 }}
                      className="absolute top-1/2 left-1/2 text-sm"
                    >{["🎉", "⭐", "🏆", "✨", "🎊", "🏏"][i]}</motion.div>
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
