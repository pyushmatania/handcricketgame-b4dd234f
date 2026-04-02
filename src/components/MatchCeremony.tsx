import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakCommentary } from "@/lib/voiceCommentary";
import { SFX } from "@/lib/sounds";
import { useSettings } from "@/contexts/SettingsContext";
import type { BallResult } from "@/hooks/useHandCricket";

// ──────────────────────────────────────────────
// POST MATCH CEREMONY WITH STATS BREAKDOWN
// ──────────────────────────────────────────────

interface PostMatchProps {
  playerName: string;
  opponentName: string;
  result: "win" | "loss" | "draw";
  playerScore: number;
  opponentScore: number;
  ballHistory: BallResult[];
  onComplete: () => void;
}

type Stage = "result" | "commentary" | "stats" | "done";

function computeStats(ballHistory: BallResult[], isBatting: boolean) {
  let sixes = 0, fours = 0, threes = 0, twos = 0, singles = 0, dots = 0;
  let biggestShot = 0;
  let battingBalls = 0;

  ballHistory.forEach(b => {
    if (b.runs === "OUT") return;
    const r = typeof b.runs === "number" ? b.runs : 0;
    const abs = Math.abs(r);
    // Positive runs = user batting
    if (r > 0) {
      battingBalls++;
      if (abs === 6) sixes++;
      else if (abs === 4) fours++;
      else if (abs === 3) threes++;
      else if (abs === 2) twos++;
      else if (abs === 1) singles++;
      else dots++;
      if (abs > biggestShot) biggestShot = abs;
    } else {
      dots++;
    }
  });

  const totalBalls = ballHistory.length;
  const strikeRate = battingBalls > 0 ? Math.round(((sixes * 6 + fours * 4 + threes * 3 + twos * 2 + singles) / battingBalls) * 100) : 0;
  const boundaryPct = battingBalls > 0 ? Math.round(((sixes + fours) / battingBalls) * 100) : 0;

  return { sixes, fours, threes, twos, singles, dots, biggestShot, totalBalls, strikeRate, boundaryPct, battingBalls };
}

const POST_WIN = [
  (p: string, ps: number, os: number) => `What a magnificent victory by ${p}! Scoring ${ps} against ${os}!`,
  (p: string) => `${p} takes the match! The crowd is on their feet! Absolutely sensational!`,
];

const POST_LOSS = [
  (_p: string, o: string, ps: number, os: number) => `${o} wins the match with ${os} runs against ${ps}! What a performance!`,
  (p: string) => `${p} fought hard but couldn't pull it off. Head held high, though!`,
];

const POST_DRAW = [
  (p: string, o: string) => `It's a tie! ${p} and ${o} couldn't be separated! What drama!`,
  (_p: string, _o: string) => `Incredible! Neither side gives in! A match for the ages!`,
];

export function PostMatchCeremony({ playerName, opponentName, result, playerScore, opponentScore, ballHistory, onComplete }: PostMatchProps) {
  const [stage, setStage] = useState<Stage>("result");
  const [lineIndex, setLineIndex] = useState(0);
  const { voiceEnabled, soundEnabled } = useSettings();

  const stats = useMemo(() => computeStats(ballHistory, true), [ballHistory]);

  const lines = useMemo(() => {
    const set = result === "win" ? POST_WIN : result === "loss" ? POST_LOSS : POST_DRAW;
    return set.map(fn => fn(playerName, opponentName, playerScore, opponentScore));
  }, [result, playerName, opponentName, playerScore, opponentScore]);

  // Generate stats commentary
  const statsLines = useMemo(() => {
    const l: string[] = [];
    if (stats.sixes > 0) l.push(`${playerName} smashed ${stats.sixes} massive sixes! 💥`);
    if (stats.fours > 0) l.push(`${stats.fours} boundaries found the fence! 🏏`);
    l.push(`Strike rate of ${stats.strikeRate} off ${stats.battingBalls} balls faced!`);
    if (stats.biggestShot === 6) l.push(`The biggest shot of the innings — a towering SIX! ☄️`);
    return l;
  }, [stats, playerName]);

  useEffect(() => {
    if (soundEnabled) {
      if (result === "win") SFX.victoryAnthem();
      else SFX.loss();
    }
    if (voiceEnabled) speakCommentary(lines[0], true);

    // Stage progression: result (2s) → commentary (4s) → stats (5s) → done
    const t1 = setTimeout(() => {
      setStage("commentary");
      if (voiceEnabled && lines[1]) speakCommentary(lines[1], true);
      setLineIndex(1);
    }, 2500);

    const t2 = setTimeout(() => {
      setStage("stats");
      if (voiceEnabled && statsLines[0]) speakCommentary(statsLines[0], true);
    }, 5000);

    // Auto-advance stats lines
    const statsTimers = statsLines.map((line, i) => {
      if (i === 0) return null;
      return setTimeout(() => {
        setLineIndex(i);
        if (voiceEnabled) speakCommentary(line, true);
      }, 5000 + i * 2000);
    });

    const tEnd = setTimeout(() => {
      setStage("done");
      setTimeout(onComplete, 400);
    }, 5000 + statsLines.length * 2000 + 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tEnd);
      statsTimers.forEach(t => t && clearTimeout(t));
    };
  }, []);

  const resultEmoji = result === "win" ? "🏆" : result === "loss" ? "😔" : "🤝";
  const resultText = result === "win" ? "VICTORY!" : result === "loss" ? "DEFEAT" : "TIE!";
  const resultColor = result === "win" ? "text-score-gold" : result === "loss" ? "text-out-red" : "text-accent";

  return (
    <AnimatePresence>
      {stage !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="max-w-sm mx-4 w-full text-center space-y-4"
          >
            {/* Result header - always visible */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              {resultEmoji}
            </motion.div>

            <motion.h2
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`font-display text-2xl font-black ${resultColor} tracking-wider`}
              style={{ textShadow: result === "win" ? "0 0 30px rgba(255,215,0,0.4)" : undefined }}
            >
              {resultText}
            </motion.h2>

            {/* Score summary */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-6"
            >
              <div className="text-center">
                <p className="font-display text-[8px] text-muted-foreground font-bold tracking-widest">{playerName.toUpperCase()}</p>
                <p className="font-display text-3xl font-black text-primary">{playerScore}</p>
              </div>
              <span className="text-muted-foreground font-display font-bold">—</span>
              <div className="text-center">
                <p className="font-display text-[8px] text-muted-foreground font-bold tracking-widest">{opponentName.toUpperCase()}</p>
                <p className="font-display text-3xl font-black text-accent">{opponentScore}</p>
              </div>
            </motion.div>

            {/* Commentary text */}
            <AnimatePresence mode="wait">
              {stage === "result" && (
                <motion.p
                  key="line0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-muted-foreground leading-relaxed px-2"
                >
                  🎙️ {lines[0]}
                </motion.p>
              )}
              {stage === "commentary" && (
                <motion.p
                  key="line1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-muted-foreground leading-relaxed px-2"
                >
                  🎙️ {lines[1] || lines[0]}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Stats breakdown panel */}
            <AnimatePresence>
              {stage === "stats" && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-premium rounded-2xl p-4 space-y-3 text-left"
                >
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-1 h-3 rounded-full bg-primary" />
                    <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">
                      MATCH STATS
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: "⚾", label: "BALLS", value: stats.totalBalls, color: "text-foreground" },
                      { icon: "⚡", label: "SR", value: stats.strikeRate, color: "text-primary" },
                      { icon: "💥", label: "BDRY %", value: `${stats.boundaryPct}%`, color: "text-secondary" },
                    ].map((s, i) => (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="glass-card rounded-xl p-2 text-center"
                      >
                        <span className="text-sm block">{s.icon}</span>
                        <span className={`font-display text-lg font-black ${s.color} block leading-none mt-0.5`}>{s.value}</span>
                        <span className="text-[5px] text-muted-foreground font-display tracking-widest mt-0.5 block">{s.label}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Shot distribution */}
                  <div className="flex gap-1.5 justify-center">
                    {[
                      { label: "6s", val: stats.sixes, color: "text-primary" },
                      { label: "4s", val: stats.fours, color: "text-neon-green" },
                      { label: "3s", val: stats.threes, color: "text-secondary" },
                      { label: "2s", val: stats.twos, color: "text-foreground" },
                      { label: "1s", val: stats.singles, color: "text-foreground" },
                      { label: "0s", val: stats.dots, color: "text-muted-foreground" },
                    ].map((s, i) => (
                      <motion.div
                        key={s.label}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05, type: "spring" }}
                        className="flex flex-col items-center"
                      >
                        <span className={`font-display text-sm font-black ${s.color}`}>{s.val}</span>
                        <span className="text-[6px] text-muted-foreground font-display tracking-wider">{s.label}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Stats commentary line */}
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={lineIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-[9px] text-muted-foreground text-center font-display"
                    >
                      🎙️ {statsLines[Math.min(lineIndex, statsLines.length - 1)]}
                    </motion.p>
                  </AnimatePresence>

                  {stats.biggestShot >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center py-1"
                    >
                      <span className="text-[7px] font-display font-bold text-secondary tracking-wider bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
                        ⭐ BIGGEST SHOT: {stats.biggestShot} RUNS
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setStage("done"); setTimeout(onComplete, 300); }}
              className="text-xs text-muted-foreground/60 font-display tracking-wider underline"
            >
              SKIP
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────
// PRE MATCH CEREMONY WITH RIVALRY STATS
// ──────────────────────────────────────────────

interface PreMatchProps {
  playerName: string;
  opponentName: string;
  tossWinner: string;
  battingFirst: string;
  rivalryStats?: {
    myWins: number;
    theirWins: number;
    totalGames: number;
    myHighScore: number;
    theirHighScore: number;
  } | null;
  onComplete: () => void;
}

type PreStage = "players" | "rivalry" | "toss" | "go";

export function PreMatchCeremony({ playerName, opponentName, tossWinner, battingFirst, rivalryStats, onComplete }: PreMatchProps) {
  const [stage, setStage] = useState<PreStage>("players");
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled } = useSettings();

  const hasRivalry = rivalryStats && rivalryStats.totalGames > 0;

  useEffect(() => {
    if (soundEnabled) SFX.ceremonyHorn();

    const commentaryLines: { text: string; delay: number }[] = [];
    let t = 0;

    // Stage 1: Players intro
    commentaryLines.push({
      text: `Welcome to this exciting match! ${playerName} versus ${opponentName}!`,
      delay: t,
    });
    t += 2200;

    // Stage 2: Rivalry (if exists)
    if (hasRivalry) {
      commentaryLines.push({
        text: rivalryStats.myWins > rivalryStats.theirWins
          ? `${playerName} leads the head-to-head ${rivalryStats.myWins}-${rivalryStats.theirWins}! Can they extend the dominance?`
          : rivalryStats.theirWins > rivalryStats.myWins
          ? `${opponentName} leads ${rivalryStats.theirWins}-${rivalryStats.myWins}! ${playerName} is desperate for revenge!`
          : `These two are locked at ${rivalryStats.myWins}-${rivalryStats.theirWins}! Who breaks the deadlock?`,
        delay: t,
      });
      t += 2800;
    }

    // Stage 3: Toss
    commentaryLines.push({
      text: `${tossWinner} wins the toss and elects to ${battingFirst === tossWinner ? "bat" : "bowl"} first!`,
      delay: t,
    });
    t += 2200;

    // Stage 4: Go
    commentaryLines.push({
      text: `${battingFirst} faces the first ball. Let the battle begin!`,
      delay: t,
    });
    t += 2000;

    // Schedule voice and stage transitions
    const timers: NodeJS.Timeout[] = [];

    if (voiceEnabled) speakCommentary(commentaryLines[0].text, true);

    let stageIdx = 0;
    const stages: PreStage[] = hasRivalry ? ["players", "rivalry", "toss", "go"] : ["players", "toss", "go"];

    commentaryLines.forEach((line, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => {
          stageIdx++;
          setStage(stages[Math.min(stageIdx, stages.length - 1)]);
          if (voiceEnabled) speakCommentary(line.text, true);
        }, line.delay));
      }
    });

    timers.push(setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, t));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-sm mx-4 w-full text-center space-y-5"
          >
            {/* Stadium lights */}
            <div className="relative h-8">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
                  className="absolute rounded-full"
                  style={{
                    width: 5, height: 5,
                    top: `${20 + Math.sin(i) * 30}%`,
                    left: `${10 + i * 15}%`,
                    background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))",
                  }}
                />
              ))}
            </div>

            {/* Players intro */}
            <AnimatePresence mode="wait">
              {stage === "players" && (
                <motion.div
                  key="players"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-3"
                >
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">🏟️</motion.div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-display text-lg font-black text-primary">{playerName}</span>
                    <span className="font-display text-sm text-muted-foreground">VS</span>
                    <span className="font-display text-lg font-black text-accent">{opponentName}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-display">🎙️ Welcome to this exciting match!</p>
                </motion.div>
              )}

              {/* Rivalry stats cinematic */}
              {stage === "rivalry" && hasRivalry && (
                <motion.div
                  key="rivalry"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-3"
                >
                  <span className="text-[8px] font-display font-bold text-out-red/80 tracking-[0.3em]">⚔️ RIVALRY RECORD</span>

                  {/* H2H big numbers */}
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <span className="font-display text-[8px] text-muted-foreground tracking-widest">{playerName.toUpperCase()}</span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="font-display text-4xl font-black text-neon-green block"
                      >
                        {rivalryStats.myWins}
                      </motion.span>
                    </div>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-muted-foreground/40 font-display text-xl"
                    >
                      –
                    </motion.span>
                    <div className="text-center">
                      <span className="font-display text-[8px] text-muted-foreground tracking-widest">{opponentName.toUpperCase()}</span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                        className="font-display text-4xl font-black text-out-red block"
                      >
                        {rivalryStats.theirWins}
                      </motion.span>
                    </div>
                  </div>

                  {/* W/L bar */}
                  <div className="px-8">
                    <div className="h-2 rounded-full overflow-hidden flex bg-muted/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rivalryStats.totalGames > 0 ? Math.round((rivalryStats.myWins / rivalryStats.totalGames) * 100) : 50}%` }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="bg-gradient-to-r from-neon-green to-neon-green/60 rounded-l-full"
                      />
                      <div className="bg-gradient-to-l from-out-red to-out-red/60 rounded-r-full flex-1" />
                    </div>
                  </div>

                  {/* High scores comparison */}
                  <div className="flex justify-center gap-6">
                    <div className="text-center">
                      <span className="text-[7px] text-muted-foreground font-display tracking-wider">BEST</span>
                      <span className="font-display text-sm font-black text-primary block">{rivalryStats.myHighScore}</span>
                    </div>
                    <span className="text-[7px] text-muted-foreground/30 font-display self-end mb-1">vs</span>
                    <div className="text-center">
                      <span className="text-[7px] text-muted-foreground font-display tracking-wider">BEST</span>
                      <span className="font-display text-sm font-black text-accent block">{rivalryStats.theirHighScore}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-muted-foreground font-display">
                    🎙️ {rivalryStats.myWins > rivalryStats.theirWins
                      ? `${playerName} leads the head-to-head! Can they extend it?`
                      : rivalryStats.theirWins > rivalryStats.myWins
                      ? `${opponentName} leads! ${playerName} wants revenge!`
                      : `All square! Who takes the lead today?`}
                  </p>
                </motion.div>
              )}

              {/* Toss result */}
              {stage === "toss" && (
                <motion.div
                  key="toss"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-3"
                >
                  <motion.div
                    animate={{ rotateY: [0, 360] }}
                    transition={{ duration: 0.8 }}
                    className="text-4xl"
                  >
                    🪙
                  </motion.div>
                  <div>
                    <span className="font-display text-sm font-black text-secondary block">{tossWinner} WINS THE TOSS!</span>
                    <span className="text-[9px] text-muted-foreground font-display mt-1 block">
                      Elects to {battingFirst === tossWinner ? "BAT" : "BOWL"} first
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Let's go */}
              {stage === "go" && (
                <motion.div
                  key="go"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-5xl block"
                  >
                    🏏
                  </motion.span>
                  <span className="font-display text-xl font-black text-foreground tracking-wider">LET'S GO!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5">
              {(hasRivalry ? ["players", "rivalry", "toss", "go"] : ["players", "toss", "go"]).map((s, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    (hasRivalry ? ["players", "rivalry", "toss", "go"] : ["players", "toss", "go"]).indexOf(stage) >= i
                      ? "bg-primary"
                      : "bg-muted/30"
                  }`}
                />
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setVisible(false); setTimeout(onComplete, 300); }}
              className="text-xs text-muted-foreground/60 font-display tracking-wider underline"
            >
              SKIP
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
