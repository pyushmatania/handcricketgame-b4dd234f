import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { getCommentary, getInningsChangeCommentary } from "@/lib/commentary";
import { speakCommentary, playCrowdForResult, CrowdSFX } from "@/lib/voiceCommentary";
import { useSettings } from "@/contexts/SettingsContext";
import ScoreBoard from "./ScoreBoard";
import RulesSheet from "./RulesSheet";
import OddEvenToss from "./OddEvenToss";
import CelebrationEffects from "./CelebrationEffects";

interface TapGameScreenProps {
  onHome: () => void;
}

const MOVES: { move: Move; emoji: string; label: string; color: string; glow: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "from-accent/20 to-accent/5 border-accent/25", glow: "shadow-[0_0_15px_hsl(168_80%_50%/0.15)]" },
  { move: 1, emoji: "☝️", label: "1", color: "from-primary/20 to-primary/5 border-primary/25", glow: "shadow-[0_0_15px_hsl(217_91%_60%/0.15)]" },
  { move: 2, emoji: "✌️", label: "2", color: "from-neon-green/20 to-neon-green/5 border-neon-green/25", glow: "shadow-[0_0_15px_hsl(142_71%_45%/0.15)]" },
  { move: 3, emoji: "🤟", label: "3", color: "from-secondary/20 to-secondary/5 border-secondary/25", glow: "shadow-[0_0_15px_hsl(45_93%_58%/0.15)]" },
  { move: 4, emoji: "🖖", label: "4", color: "from-secondary/25 to-secondary/10 border-secondary/30", glow: "shadow-[0_0_20px_hsl(45_93%_58%/0.2)]" },
  { move: 6, emoji: "👍", label: "6", color: "from-primary/25 to-primary/10 border-primary/30", glow: "shadow-[0_0_20px_hsl(217_91%_60%/0.25)]" },
];

export default function TapGameScreen({ onHome }: TapGameScreenProps) {
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled } = useSettings();
  const [lastPlayed, setLastPlayed] = useState<Move | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const savedRef = useRef(false);
  const prevPhaseRef = useRef(game.phase);

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "tap");
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); if (crowdEnabled) playCrowdForResult(0, true, true, "win"); }
      else if (game.result === "loss") { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); if (crowdEnabled) playCrowdForResult(0, true, true, "loss"); }
    }
  }, [game.phase, game, saveMatch]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;
    if (prev !== game.phase && game.phase !== "not_started" && game.phase !== "finished") {
    if (commentaryEnabled) {
        const text = getInningsChangeCommentary(game);
        setCommentary(text);
        if (voiceEnabled) speakCommentary(text, true);
        setTimeout(() => setCommentary(null), 3000);
      }
      if (crowdEnabled) CrowdSFX.ambientMurmur(2);
      if (soundEnabled) SFX.gameStart();
    }
  }, [game.phase]);

  useEffect(() => {
    if (!game.lastResult) return;
    const r = game.lastResult;
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") {
      setTimeout(() => { if (soundEnabled) SFX.out(); if (hapticsEnabled) Haptics.out(); }, 150);
    } else if (typeof r.runs === "number") {
      const absRuns = Math.abs(r.runs);
      if (absRuns === 6) { setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); }, 100); }
      else if (absRuns === 4) { setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); }, 100); }
      else if (absRuns === 0) { if (soundEnabled) SFX.defence(); if (hapticsEnabled) Haptics.light(); }
      else { if (soundEnabled) SFX.runs(absRuns); if (hapticsEnabled) Haptics.light(); }
    }
    // Crowd sounds
    if (crowdEnabled) {
      playCrowdForResult(r.runs, game.isBatting, false);
    }
    // Text + voice commentary
    if (commentaryEnabled) {
      const text = getCommentary({ game, result: r });
      setCommentary(text);
      if (voiceEnabled) speakCommentary(text, true);
      setTimeout(() => setCommentary(null), 2500);
    }
  }, [game.lastResult]);

  const handleMove = (move: Move) => {
    if (cooldown || game.phase === "not_started" || game.phase === "finished") return;
    if (soundEnabled) SFX.tap();
    if (hapticsEnabled) Haptics.light();
    setLastPlayed(move);
    playBall(move);
    setCooldown(true);

    const moveData = MOVES.find(m => m.move === move);
    if (moveData) {
      setShowExplosion({ emoji: moveData.emoji, key: Date.now() });
      setTimeout(() => setShowExplosion(null), 800);
    }

    setTimeout(() => setCooldown(false), 800);
  };

  const handleStart = (batFirst: boolean) => {
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    startGame(batFirst);
  };

  const handleStartNew = () => {
    resetGame();
    setLastPlayed(null);
    savedRef.current = false;
    setCommentary(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <CelebrationEffects lastResult={game.lastResult} gameResult={game.result} phase={game.phase} />

      {/* Top ambient glow */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.06) 0%, transparent 70%)" }}
      />

      {/* Premium top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onHome}
          className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm active:scale-95 transition-transform"
        >
          ←
        </motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-accent font-bold">TAP MODE</span>
        </div>
        <RulesSheet />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* Odd/Even Toss */}
        {game.phase === "not_started" && (
          <div className="mt-4">
            <OddEvenToss onResult={(batFirst) => handleStart(batFirst)} />
          </div>
        )}

        {/* Scoreboard */}
        {game.phase !== "not_started" && <ScoreBoard game={game} />}

        {/* Commentary bar */}
        <AnimatePresence>
          {commentary && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="glass-card rounded-xl px-4 py-2.5 text-center flex items-center justify-center gap-2"
            >
              <span className="text-xs">📢</span>
              <p className="font-display text-[10px] font-bold text-foreground tracking-wider">
                {commentary}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last result display */}
        <AnimatePresence mode="wait">
          {game.lastResult && game.phase !== "not_started" && game.phase !== "finished" && (
            <motion.div
              key={game.lastResult.description}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-premium rounded-2xl p-4 text-center relative overflow-hidden"
            >
              {/* Flash overlay */}
              <motion.div
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className={`absolute inset-0 ${game.lastResult.runs === "OUT" ? "bg-out-red/15" : "bg-primary/10"}`}
              />
              <div className="flex items-center justify-center gap-8 relative z-10">
                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground font-bold tracking-[0.2em] mb-1">YOU</p>
                  <motion.div
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto"
                  >
                    <span className="text-3xl">{MOVES.find((m) => m.move === game.lastResult?.userMove)?.emoji || "❓"}</span>
                  </motion.div>
                  <p className="text-[10px] font-display font-bold text-primary mt-1.5 tracking-wider">
                    {game.lastResult.userMove === "DEF" ? "DEF" : game.lastResult.userMove}
                  </p>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-sm ${
                    game.lastResult.runs === "OUT"
                      ? "bg-gradient-to-br from-out-red/20 to-out-red/10 border-2 border-out-red/30 text-out-red"
                      : "bg-gradient-to-br from-neon-green/20 to-neon-green/10 border-2 border-neon-green/30 text-neon-green"
                  }`}
                  style={{ textShadow: "0 0 15px currentColor" }}
                >
                  {game.lastResult.runs === "OUT" ? "OUT" : `+${game.lastResult.runs}`}
                </motion.div>
                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground font-bold tracking-[0.2em] mb-1">AI</p>
                  <motion.div
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto"
                  >
                    <span className="text-3xl">{MOVES.find((m) => m.move === game.lastResult?.aiMove)?.emoji || "🤖"}</span>
                  </motion.div>
                  <p className="text-[10px] font-display font-bold text-accent mt-1.5 tracking-wider">
                    {game.lastResult.aiMove === "DEF" ? "DEF" : game.lastResult.aiMove}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap buttons grid */}
        {game.phase !== "not_started" && game.phase !== "finished" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-auto relative">
            <AnimatePresence>
              {showExplosion && (
                <motion.div
                  key={showExplosion.key}
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <span className="text-6xl">{showExplosion.emoji}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-[8px] text-muted-foreground font-display mb-2 tracking-[0.2em]">
              {game.isBatting ? "⚡ TAP YOUR SHOT" : "🎯 TAP YOUR BOWL"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MOVES.map((m) => (
                <motion.button
                  key={m.label}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handleMove(m.move)}
                  disabled={cooldown}
                  className={`relative py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border backdrop-blur-sm ${
                    cooldown
                      ? "opacity-30 cursor-not-allowed border-transparent bg-muted/20"
                      : lastPlayed === m.move
                      ? `bg-gradient-to-br ${m.color} text-foreground ${m.glow} border-primary/40`
                      : `bg-gradient-to-br ${m.color} text-foreground ${m.glow}`
                  }`}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-[10px] tracking-wider">{m.label}</span>
                  {cooldown && lastPlayed === m.move && (
                    <motion.div
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{ duration: 0.8, ease: "linear" }}
                      className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-primary rounded-full origin-left"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Game over */}
        {game.phase === "finished" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-4">
            <div className="glass-card rounded-xl px-4 py-3 text-center">
              <p className="font-display text-xs font-bold text-foreground tracking-wider">
                {game.result === "win" ? "🏆 CHAMPION! What a performance!" : game.result === "loss" ? "Better luck next time!" : "🤝 A TIE! What a match!"}
              </p>
            </div>
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleStartNew}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl tracking-wider shadow-[0_0_20px_hsl(217_91%_60%/0.2)] border border-primary/30">
                ⚡ NEW MATCH
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                className="flex-1 py-3.5 glass-premium text-foreground font-display font-bold rounded-2xl tracking-wider border border-primary/10">
                HOME
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Reset */}
        {game.phase !== "not_started" && game.phase !== "finished" && (
          <button onClick={handleStartNew}
            className="text-[10px] text-muted-foreground/40 underline self-center mt-1 active:scale-95 font-display tracking-wider">
            Reset Match
          </button>
        )}
      </div>
    </div>
  );
}
