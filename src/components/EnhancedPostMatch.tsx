import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakCommentary, CrowdSFX } from "@/lib/voiceCommentary";
import { SFX } from "@/lib/sounds";
import { playElevenLabsMusic, playElevenLabsSFX, stopMusic, isElevenLabsAvailable, ElevenLabsSFXPrompts } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import {
  POST_WIN_EXPANDED, POST_LOSS_EXPANDED, POST_DRAW_EXPANDED,
  PVP_RAGE_WIN, PVP_RAGE_LOSS, PVP_RAGE_DRAW, PVP_CLOSING,
  STATS_SIXES, STATS_FOURS, STATS_SR, STATS_BDRY_PCT, STATS_BIGGEST,
} from "@/lib/commentary";
import WagonWheel from "./WagonWheel";
import type { BallResult } from "@/hooks/useHandCricket";

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

interface RivalryStats {
  myWins: number;
  theirWins: number;
  totalGames: number;
  myHighScore: number;
  theirHighScore: number;
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
  onComplete: () => void;
}

function computeStats(ballHistory: BallResult[]) {
  let sixes = 0, fours = 0, threes = 0, twos = 0, singles = 0, dots = 0;
  let biggestShot = 0, battingBalls = 0;
  // Partnership tracking
  let currentPartnership = 0;
  let bestPartnership = 0;

  ballHistory.forEach(b => {
    if (b.runs === "OUT") {
      if (currentPartnership > bestPartnership) bestPartnership = currentPartnership;
      currentPartnership = 0;
      return;
    }
    const r = typeof b.runs === "number" ? b.runs : 0;
    const abs = Math.abs(r);
    if (r > 0) {
      battingBalls++;
      currentPartnership += abs;
      if (abs === 6) sixes++;
      else if (abs === 4) fours++;
      else if (abs === 3) threes++;
      else if (abs === 2) twos++;
      else if (abs === 1) singles++;
      else dots++;
      if (abs > biggestShot) biggestShot = abs;
    } else {
      dots++;
      battingBalls++;
    }
  });
  if (currentPartnership > bestPartnership) bestPartnership = currentPartnership;

  const totalBalls = ballHistory.length;
  const totalRuns = sixes * 6 + fours * 4 + threes * 3 + twos * 2 + singles;
  const strikeRate = battingBalls > 0 ? Math.round((totalRuns / battingBalls) * 100) : 0;
  const boundaryPct = totalRuns > 0 ? Math.round(((sixes * 6 + fours * 4) / totalRuns) * 100) : 0;

  return { sixes, fours, threes, twos, singles, dots, biggestShot, totalBalls, strikeRate, boundaryPct, battingBalls, bestPartnership, totalRuns };
}

type Stage = "result" | "scorecard" | "stats" | "wagon" | "pvp_rage" | "motm" | "done";

export default function EnhancedPostMatch({
  playerName, opponentName, result, playerScore, opponentScore,
  playerWickets = 0, opponentWickets = 0,
  ballHistory, isPvP = false, rivalryStats, onComplete,
}: EnhancedPostMatchProps) {
  const [stage, setStage] = useState<Stage>("result");
  const [commentary, setCommentary] = useState("");
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled } = useSettings();

  const stats = useMemo(() => computeStats(ballHistory), [ballHistory]);
  const stableOnComplete = useCallback(onComplete, []);

  useEffect(() => {
    // SFX
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

    const timers: NodeJS.Timeout[] = [];
    let t = 0;

    // Result commentary
    const resultPool = result === "win" ? POST_WIN_EXPANDED : result === "loss" ? POST_LOSS_EXPANDED : POST_DRAW_EXPANDED;
    const line1 = (resultPool[0] as any)(playerName, opponentName, playerScore, opponentScore) as string;
    setCommentary(line1);
    if (voiceEnabled) speakCommentary(line1, true);
    t += 5000;

    // Scorecard
    timers.push(setTimeout(() => {
      setStage("scorecard");
      const line = (resultPool[1] as any)(playerName, opponentName, playerScore, opponentScore) as string;
      setCommentary(line);
      if (voiceEnabled) speakCommentary(line, true);
    }, t));
    t += 5000;

    // Stats breakdown
    timers.push(setTimeout(() => {
      setStage("stats");
      const statsLine = stats.sixes > 0
        ? pick(STATS_SIXES)(playerName, stats.sixes)
        : pick(STATS_SR)(playerName, stats.strikeRate, stats.battingBalls);
      setCommentary(statsLine);
      if (voiceEnabled) speakCommentary(statsLine, true);
    }, t));
    t += 5000;

    // Wagon wheel
    timers.push(setTimeout(() => {
      setStage("wagon");
      const wagonLine = stats.boundaryPct > 50
        ? pick(STATS_BDRY_PCT)(playerName, stats.boundaryPct)
        : stats.fours > 0
        ? pick(STATS_FOURS)(playerName, stats.fours)
        : `${playerName} played ${stats.totalBalls} balls with a strike rate of ${stats.strikeRate}!`;
      setCommentary(wagonLine);
      if (voiceEnabled) speakCommentary(wagonLine, true);
    }, t));
    t += 6000;

    // PvP rage analysis
    if (isPvP) {
      timers.push(setTimeout(() => {
        setStage("pvp_rage");
        const ragePool = result === "win" ? PVP_RAGE_WIN : result === "loss" ? PVP_RAGE_LOSS : PVP_RAGE_DRAW;
        const rageLine = pick(ragePool)(playerName, opponentName);
        setCommentary(rageLine);
        if (voiceEnabled) speakCommentary(rageLine, true);
        if (crowdEnabled && result === "win") CrowdSFX.roar();
      }, t));
      t += 5000;

      // More rage lines
      timers.push(setTimeout(() => {
        const ragePool2 = result === "win" ? PVP_RAGE_WIN : result === "loss" ? PVP_RAGE_LOSS : PVP_RAGE_DRAW;
        const shuffled = [...ragePool2].sort(() => Math.random() - 0.5);
        const line = shuffled[1] ? shuffled[1](playerName, opponentName) : pick(PVP_CLOSING);
        setCommentary(line);
        if (voiceEnabled) speakCommentary(line, true);
      }, t));
      t += 4000;

      // Closing
      timers.push(setTimeout(() => {
        setCommentary(pick(PVP_CLOSING));
        if (voiceEnabled) speakCommentary(pick(PVP_CLOSING), true);
      }, t));
      t += 3000;
    }

    // Man of the Match
    timers.push(setTimeout(() => {
      setStage("motm");
      const motmLine = result === "win"
        ? `🏅 Man of the Match: ${playerName}! A performance that will be remembered for generations!`
        : result === "loss"
        ? `🏅 Man of the Match goes to ${opponentName}. Credit where it's due — a fine performance!`
        : `🏅 Both players share the Man of the Match honors! What a contest!`;
      setCommentary(motmLine);
      if (voiceEnabled) speakCommentary(motmLine, true);
      if (result === "win" && isElevenLabsAvailable()) playElevenLabsSFX("Stadium crowd roaring with applause and celebration", 3);
    }, t));
    t += 5000;

    // Done
    timers.push(setTimeout(() => {
      stopMusic();
      setStage("done");
      setVisible(false);
      setTimeout(stableOnComplete, 400);
    }, t));

    return () => { timers.forEach(clearTimeout); stopMusic(); };
  }, []);

  const resultEmoji = result === "win" ? "🏆" : result === "loss" ? "😔" : "🤝";
  const resultText = result === "win" ? "VICTORY!" : result === "loss" ? "DEFEAT" : "TIED!";
  const resultColor = result === "win" ? "text-secondary" : result === "loss" ? "text-out-red" : "text-accent";
  const resultGlow = result === "win" ? "0 0 40px hsl(45 93% 58% / 0.4)" : undefined;

  return (
    <AnimatePresence>
      {visible && stage !== "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/92 backdrop-blur-xl overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="max-w-sm mx-4 w-full text-center space-y-3 py-6"
          >
            {/* Result header */}
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">{resultEmoji}</motion.div>
            <motion.h2
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`font-display text-2xl font-black ${resultColor} tracking-wider`}
              style={{ textShadow: resultGlow }}
            >
              {resultText}
            </motion.h2>

            {/* Scorecard - always visible after first stage */}
            <AnimatePresence>
              {(stage !== "result") && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-premium rounded-xl p-3 space-y-2">
                  <span className="text-[7px] font-display font-bold tracking-[0.2em] text-muted-foreground">FULL SCORECARD</span>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="font-display text-[7px] text-muted-foreground font-bold tracking-widest">{playerName.toUpperCase()}</p>
                      <p className="font-display text-3xl font-black text-primary leading-none">{playerScore}<span className="text-lg text-out-red/70">/{playerWickets}</span></p>
                    </div>
                    <span className="text-muted-foreground/30 font-display text-lg">vs</span>
                    <div className="text-center">
                      <p className="font-display text-[7px] text-muted-foreground font-bold tracking-widest">{opponentName.toUpperCase()}</p>
                      <p className="font-display text-3xl font-black text-accent leading-none">{opponentScore}<span className="text-lg text-out-red/70">/{opponentWickets}</span></p>
                    </div>
                  </div>
                  {/* Summary line */}
                  <p className="text-[8px] text-muted-foreground/70 font-display">
                    {result === "win"
                      ? `${playerName} won by ${playerScore - opponentScore} runs`
                      : result === "loss"
                      ? `${opponentName} won by ${opponentScore - playerScore} runs`
                      : "Match tied!"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats panel */}
            <AnimatePresence>
              {(stage === "stats" || stage === "wagon" || stage === "pvp_rage" || stage === "motm") && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-premium rounded-xl p-3 space-y-2">
                  <span className="text-[7px] font-display font-bold tracking-[0.2em] text-muted-foreground">📊 MATCH ANALYTICS</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { icon: "⚾", label: "BALLS", value: stats.totalBalls, color: "text-foreground" },
                      { icon: "⚡", label: "SR", value: stats.strikeRate, color: "text-primary" },
                      { icon: "💥", label: "BDRY%", value: `${stats.boundaryPct}%`, color: "text-secondary" },
                      { icon: "🤝", label: "BEST P'SHIP", value: stats.bestPartnership, color: "text-neon-green" },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
                        className="glass-card rounded-lg p-1.5 text-center">
                        <span className="text-xs block">{s.icon}</span>
                        <span className={`font-display text-base font-black ${s.color} block leading-none`}>{s.value}</span>
                        <span className="text-[4px] text-muted-foreground font-display tracking-widest mt-0.5 block">{s.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  {/* Shot distribution */}
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
                        <span className={`font-display text-sm font-black ${s.color}`}>{s.val}</span>
                        <span className="text-[5px] text-muted-foreground font-display tracking-wider">{s.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wagon Wheel */}
            <AnimatePresence>
              {(stage === "wagon" || stage === "pvp_rage" || stage === "motm") && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <WagonWheel ballHistory={ballHistory} isBatting={true} compact />
                </motion.div>
              )}
            </AnimatePresence>

            {/* PvP Rage section */}
            <AnimatePresence>
              {stage === "pvp_rage" && isPvP && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="glass-premium rounded-xl p-3 border border-out-red/20">
                  <span className="text-[7px] font-display font-bold tracking-[0.2em] text-out-red">😈 RIVALRY ANALYSIS</span>
                  {rivalryStats && (
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <div className="text-center">
                        <span className="text-[6px] text-muted-foreground font-display">TOTAL GAMES</span>
                        <span className="font-display text-lg font-black text-foreground block">{rivalryStats.totalGames + 1}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[6px] text-muted-foreground font-display">YOUR WINS</span>
                        <span className="font-display text-lg font-black text-neon-green block">{rivalryStats.myWins + (result === "win" ? 1 : 0)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[6px] text-muted-foreground font-display">THEIR WINS</span>
                        <span className="font-display text-lg font-black text-out-red block">{rivalryStats.theirWins + (result === "loss" ? 1 : 0)}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Man of the Match */}
            <AnimatePresence>
              {stage === "motm" && (
                <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  className="glass-premium rounded-xl p-3 border border-secondary/20">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl mb-1">🏅</motion.div>
                  <span className="text-[7px] font-display font-bold tracking-[0.2em] text-secondary">MAN OF THE MATCH</span>
                  <p className="font-display text-lg font-black text-foreground mt-1">
                    {result === "win" ? playerName : result === "loss" ? opponentName : "Shared!"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commentary */}
            <AnimatePresence mode="wait">
              <motion.p key={commentary} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[9px] text-muted-foreground/80 font-display leading-relaxed px-4 min-h-[28px]">
                🎙️ {commentary}
              </motion.p>
            </AnimatePresence>

            {/* Skip */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { stopMusic(); setStage("done"); setVisible(false); setTimeout(stableOnComplete, 300); }}
              className="text-xs text-muted-foreground/50 font-display tracking-wider underline"
            >
              SKIP →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
