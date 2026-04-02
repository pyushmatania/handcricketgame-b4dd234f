import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakCommentary, CrowdSFX } from "@/lib/voiceCommentary";
import { SFX } from "@/lib/sounds";
import { playElevenLabsMusic, stopMusic, isElevenLabsAvailable } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import {
  PRE_MATCH_INTROS, PRE_MATCH_RIVALRY, PRE_MATCH_TOSS, PRE_MATCH_GO,
} from "@/lib/commentary";

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

interface RivalryStats {
  myWins: number;
  theirWins: number;
  totalGames: number;
  myHighScore: number;
  theirHighScore: number;
  myAvgScore?: number;
  theirAvgScore?: number;
  lastResult?: "win" | "loss" | "draw";
  winStreak?: number;
  loseStreak?: number;
}

interface EnhancedPreMatchProps {
  playerName: string;
  opponentName: string;
  tossWinner: string;
  battingFirst: string;
  rivalryStats?: RivalryStats | null;
  isPvP?: boolean;
  onComplete: () => void;
}

type Stage = "intro" | "stadium" | "rivalry" | "rage" | "toss" | "strategy" | "go";

// PvP Rivalry Rage Lines
const RIVALRY_RAGE_LINES = {
  dominating: [
    (p: string, o: string, w: number) => `${p} has ${w} wins! ${o} is basically a punching bag at this point! 🥊`,
    (p: string, o: string) => `${o} keeps coming back for more punishment from ${p}! Glutton for defeat! 😤`,
    (p: string, o: string) => `${p}'s dominance index is OFF THE CHARTS against ${o}!`,
    (p: string, o: string) => `${o} needs to bring an army to compete with ${p}! One player isn't enough!`,
  ],
  getting_dominated: [
    (p: string, o: string, l: number) => `${p} has lost ${l} times! Is this a rivalry or a comedy show?! 🎪`,
    (p: string, o: string) => `${o} owns ${p}! Time for some REVENGE cricket! 🔥`,
    (p: string, o: string) => `${p} is the underdog today! But underdogs bite! Watch out ${o}!`,
    (p: string, o: string) => `${o} has been farming ${p}! Time to break the cycle!`,
  ],
  revenge_mode: [
    (p: string, o: string) => `${p} lost last time! The REVENGE meter is MAXED OUT! ⚡`,
    (p: string, o: string) => `Last match went to ${o}! ${p} has been practicing in the shadows! 👤`,
    (p: string, o: string) => `${p} still tastes the bitterness of defeat! ${o} better watch out! 😈`,
  ],
};

// Dominance calculation
function getDominanceIndex(stats: RivalryStats): { pct: number; label: string; color: string } {
  if (stats.totalGames === 0) return { pct: 50, label: "EVEN", color: "text-muted-foreground" };
  const pct = Math.round((stats.myWins / stats.totalGames) * 100);
  if (pct >= 75) return { pct, label: "DOMINANT", color: "text-neon-green" };
  if (pct >= 55) return { pct, label: "LEADING", color: "text-primary" };
  if (pct >= 45) return { pct, label: "CONTESTED", color: "text-secondary" };
  if (pct >= 25) return { pct, label: "TRAILING", color: "text-out-red" };
  return { pct, label: "DOMINATED", color: "text-out-red" };
}

// Rage meter: fills based on losing streak or dominance gap
function getRageMeter(stats: RivalryStats): number {
  if (!stats.totalGames) return 0;
  let rage = 0;
  if (stats.loseStreak && stats.loseStreak >= 2) rage += stats.loseStreak * 15;
  if (stats.lastResult === "loss") rage += 20;
  const domGap = stats.theirWins - stats.myWins;
  if (domGap > 0) rage += domGap * 10;
  return Math.min(rage, 100);
}

export default function EnhancedPreMatch({
  playerName, opponentName, tossWinner, battingFirst,
  rivalryStats, isPvP = false, onComplete,
}: EnhancedPreMatchProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [commentary, setCommentary] = useState("");
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled } = useSettings();

  const hasRivalry = isPvP && rivalryStats && rivalryStats.totalGames > 0;
  const dominance = hasRivalry ? getDominanceIndex(rivalryStats!) : null;
  const rageMeter = hasRivalry ? getRageMeter(rivalryStats!) : 0;

  const stableOnComplete = useCallback(onComplete, []);

  useEffect(() => {
    // Start background music
    if (isElevenLabsAvailable()) {
      playElevenLabsMusic("Epic dramatic cricket tournament intro music, cinematic brass and drums, building excitement", 20, false);
    }
    if (soundEnabled) SFX.ceremonyHorn();
    if (crowdEnabled) CrowdSFX.ambientMurmur(8);

    const timers: NodeJS.Timeout[] = [];
    let t = 0;

    // Stage 1: Intro (0s)
    const introLine = pick(PRE_MATCH_INTROS)(playerName, opponentName);
    setCommentary(introLine);
    if (voiceEnabled) speakCommentary(introLine, true);
    t += 4000;

    // Stage 2: Stadium atmosphere (4s)
    timers.push(setTimeout(() => {
      setStage("stadium");
      const stadiumLine = `The stadium is PACKED! The floodlights are on! ${playerName} and ${opponentName} walk out to a roaring crowd!`;
      setCommentary(stadiumLine);
      if (voiceEnabled) speakCommentary(stadiumLine, true);
      if (crowdEnabled) CrowdSFX.cheer();
    }, t));
    t += 5000;

    // Stage 3: Rivalry (9s) — only for PvP with history
    if (hasRivalry) {
      timers.push(setTimeout(() => {
        setStage("rivalry");
        const pool = rivalryStats!.myWins > rivalryStats!.theirWins
          ? PRE_MATCH_RIVALRY.leading
          : rivalryStats!.theirWins > rivalryStats!.myWins
          ? PRE_MATCH_RIVALRY.trailing
          : PRE_MATCH_RIVALRY.even;
        const rivalryLine = pick(pool)(playerName, opponentName, rivalryStats!.myWins, rivalryStats!.theirWins);
        setCommentary(rivalryLine);
        if (voiceEnabled) speakCommentary(rivalryLine, true);
      }, t));
      t += 6000;

      // Stage 3b: Rage mode (15s)
      if (rageMeter > 30) {
        timers.push(setTimeout(() => {
          setStage("rage");
          const ragePool = rivalryStats!.myWins < rivalryStats!.theirWins
            ? RIVALRY_RAGE_LINES.getting_dominated
            : RIVALRY_RAGE_LINES.dominating;
          const rageLine = rivalryStats!.lastResult === "loss"
            ? pick(RIVALRY_RAGE_LINES.revenge_mode)(playerName, opponentName)
            : pick(ragePool)(playerName, opponentName, Math.max(rivalryStats!.myWins, rivalryStats!.theirWins));
          setCommentary(rageLine);
          if (voiceEnabled) speakCommentary(rageLine, true);
          if (crowdEnabled) CrowdSFX.roar();
        }, t));
        t += 5000;
      }
    }

    // Stage 4: Toss
    timers.push(setTimeout(() => {
      setStage("toss");
      const tossChoice = battingFirst === tossWinner ? "bat" : "bowl";
      const tossLine = pick(PRE_MATCH_TOSS)(tossWinner, tossChoice);
      setCommentary(tossLine);
      if (voiceEnabled) speakCommentary(tossLine, true);
      if (soundEnabled) SFX.tossReveal();
    }, t));
    t += 5000;

    // Stage 5: Strategy
    timers.push(setTimeout(() => {
      setStage("strategy");
      const stratLine = battingFirst === playerName
        ? `${playerName} will bat first! The plan: set a big target and put pressure on ${opponentName}!`
        : `${playerName} bowls first! The strategy: restrict ${opponentName} and chase it down!`;
      setCommentary(stratLine);
      if (voiceEnabled) speakCommentary(stratLine, true);
    }, t));
    t += 4500;

    // Stage 6: GO!
    timers.push(setTimeout(() => {
      setStage("go");
      const goLine = pick(PRE_MATCH_GO)(battingFirst);
      setCommentary(goLine);
      if (voiceEnabled) speakCommentary(goLine, true);
      if (soundEnabled) SFX.gameStart();
      if (crowdEnabled) CrowdSFX.roar();
    }, t));
    t += 3500;

    // Complete
    timers.push(setTimeout(() => {
      stopMusic();
      setVisible(false);
      setTimeout(stableOnComplete, 400);
    }, t));

    return () => { timers.forEach(clearTimeout); stopMusic(); };
  }, []);

  const stages: Stage[] = hasRivalry
    ? (rageMeter > 30 ? ["intro", "stadium", "rivalry", "rage", "toss", "strategy", "go"] : ["intro", "stadium", "rivalry", "toss", "strategy", "go"])
    : ["intro", "stadium", "toss", "strategy", "go"];
  const stageIdx = stages.indexOf(stage);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(222 47% 4%), hsl(222 47% 10%))" }}
        >
          {/* Animated stadium lights */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.05, 0.3, 0.05], scale: [1, 1.5, 1] }}
                transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: i * 0.2 }}
                className="absolute rounded-full"
                style={{
                  width: 6 + Math.random() * 4,
                  height: 6 + Math.random() * 4,
                  top: `${5 + Math.random() * 25}%`,
                  left: `${5 + i * 8}%`,
                  background: i % 3 === 0
                    ? "hsl(var(--primary))"
                    : i % 3 === 1
                    ? "hsl(var(--secondary))"
                    : "hsl(var(--accent))",
                  filter: "blur(2px)",
                }}
              />
            ))}
            {/* Sweeping light */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 w-32 h-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.03), transparent)" }}
            />
          </div>

          <motion.div className="max-w-sm mx-4 w-full text-center space-y-4 relative z-10">
            {/* Stage content */}
            <AnimatePresence mode="wait">
              {stage === "intro" && (
                <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">🏟️</motion.div>
                  <h2 className="font-display text-xl font-black tracking-wider text-foreground">MATCH DAY</h2>
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-display text-lg font-black text-primary">{playerName}</span>
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-secondary text-sm font-display font-bold">VS</motion.span>
                    <span className="font-display text-lg font-black text-accent">{opponentName}</span>
                  </div>
                </motion.div>
              )}

              {stage === "stadium" && (
                <motion.div key="stadium" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex justify-center gap-2">
                    {["🔦", "🏟️", "🔦"].map((e, i) => (
                      <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="text-3xl">{e}</motion.span>
                    ))}
                  </div>
                  <h2 className="font-display text-sm font-black tracking-[0.3em] text-secondary">FLOODLIGHTS ON</h2>
                  <p className="text-[9px] text-muted-foreground font-display">The crowd roars as the players take the field!</p>
                </motion.div>
              )}

              {stage === "rivalry" && hasRivalry && (
                <motion.div key="rivalry" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <span className="text-[8px] font-display font-bold text-out-red tracking-[0.3em]">⚔️ HEAD TO HEAD</span>
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <span className="text-[7px] text-muted-foreground font-display tracking-widest block">{playerName.toUpperCase()}</span>
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="font-display text-4xl font-black text-neon-green block">{rivalryStats!.myWins}</motion.span>
                    </div>
                    <span className="text-muted-foreground/30 font-display text-2xl">–</span>
                    <div className="text-center">
                      <span className="text-[7px] text-muted-foreground font-display tracking-widest block">{opponentName.toUpperCase()}</span>
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }} className="font-display text-4xl font-black text-out-red block">{rivalryStats!.theirWins}</motion.span>
                    </div>
                  </div>
                  {/* Dominance bar */}
                  <div className="px-6">
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/20">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${dominance!.pct}%` }} transition={{ delay: 0.5, duration: 1 }} className="bg-gradient-to-r from-neon-green to-neon-green/60 rounded-l-full" />
                      <div className="bg-gradient-to-l from-out-red to-out-red/60 rounded-r-full flex-1" />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[6px] text-neon-green font-display font-bold">{dominance!.pct}%</span>
                      <span className={`text-[6px] font-display font-bold ${dominance!.color}`}>{dominance!.label}</span>
                      <span className="text-[6px] text-out-red font-display font-bold">{100 - dominance!.pct}%</span>
                    </div>
                  </div>
                  {/* High scores */}
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <span className="text-[6px] text-muted-foreground/50 font-display tracking-wider">BEST SCORE</span>
                      <span className="font-display text-sm font-black text-primary block">{rivalryStats!.myHighScore}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[6px] text-muted-foreground/50 font-display tracking-wider">BEST SCORE</span>
                      <span className="font-display text-sm font-black text-accent block">{rivalryStats!.theirHighScore}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {stage === "rage" && (
                <motion.div key="rage" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-5xl">😈</motion.div>
                  <h2 className="font-display text-sm font-black tracking-[0.2em] text-out-red">RAGE MODE</h2>
                  {/* Rage meter bar */}
                  <div className="px-8">
                    <div className="h-3 rounded-full overflow-hidden bg-muted/20 border border-out-red/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${rageMeter}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, hsl(45 93% 58%), hsl(0 72% 51%))` }}
                      />
                    </div>
                    <span className="text-[7px] font-display font-bold text-out-red/80 mt-0.5 block text-center">
                      REVENGE METER: {rageMeter}%
                    </span>
                  </div>
                </motion.div>
              )}

              {stage === "toss" && (
                <motion.div key="toss" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <motion.div animate={{ rotateY: [0, 720] }} transition={{ duration: 1.2 }} className="text-5xl inline-block">🪙</motion.div>
                  <h2 className="font-display text-lg font-black text-secondary tracking-wider">{tossWinner.toUpperCase()} WINS THE TOSS!</h2>
                  <p className="text-[10px] text-muted-foreground font-display">
                    Elects to <span className="text-primary font-bold">{battingFirst === tossWinner ? "BAT" : "BOWL"}</span> first
                  </p>
                </motion.div>
              )}

              {stage === "strategy" && (
                <motion.div key="strategy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="text-4xl">📋</div>
                  <h2 className="font-display text-sm font-black tracking-[0.2em] text-accent">MATCH STRATEGY</h2>
                  <div className="glass-premium rounded-xl p-3 mx-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏏</span>
                        <span className="text-[9px] font-display font-bold text-primary">{battingFirst.toUpperCase()}</span>
                        <span className="text-[8px] text-muted-foreground font-display">bats first</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🎯</span>
                        <span className="text-[9px] font-display font-bold text-accent">{battingFirst === playerName ? opponentName.toUpperCase() : playerName.toUpperCase()}</span>
                        <span className="text-[8px] text-muted-foreground font-display">bowls first</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {stage === "go" && (
                <motion.div key="go" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-6xl block">🏏</motion.span>
                  <motion.h2
                    initial={{ letterSpacing: "0.1em" }}
                    animate={{ letterSpacing: "0.5em" }}
                    transition={{ duration: 1 }}
                    className="font-display text-2xl font-black text-foreground"
                  >
                    GAME ON!
                  </motion.h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commentary text */}
            <AnimatePresence mode="wait">
              <motion.p key={commentary} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[9px] text-muted-foreground/80 font-display leading-relaxed px-4 min-h-[32px]">
                🎙️ {commentary}
              </motion.p>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5">
              {stages.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scale: stageIdx === i ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 1, repeat: stageIdx === i ? Infinity : 0 }}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${stageIdx >= i ? "bg-primary" : "bg-muted/30"}`}
                />
              ))}
            </div>

            {/* Skip */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { stopMusic(); setVisible(false); setTimeout(stableOnComplete, 300); }}
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
