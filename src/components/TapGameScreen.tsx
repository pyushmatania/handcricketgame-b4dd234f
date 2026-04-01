import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import ScoreBoard from "./ScoreBoard";
import RulesSheet from "./RulesSheet";

interface TapGameScreenProps {
  onHome: () => void;
}

const MOVES: { move: Move; emoji: string; label: string; color: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "border-accent/30 bg-accent/5" },
  { move: 1, emoji: "☝️", label: "1", color: "border-primary/30 bg-primary/5" },
  { move: 2, emoji: "✌️", label: "2", color: "border-neon-green/30 bg-neon-green/5" },
  { move: 3, emoji: "🤟", label: "3", color: "border-secondary/30 bg-secondary/5" },
  { move: 4, emoji: "🖖", label: "4", color: "border-score-gold/30 bg-score-gold/5" },
  { move: 6, emoji: "👍", label: "6", color: "border-primary/40 bg-primary/10" },
];

export default function TapGameScreen({ onHome }: TapGameScreenProps) {
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const [lastPlayed, setLastPlayed] = useState<Move | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);

  const handleMove = (move: Move) => {
    if (cooldown || game.phase === "not_started" || game.phase === "finished") return;
    setLastPlayed(move);
    playBall(move);
    setCooldown(true);

    // Show explosion effect
    const moveData = MOVES.find(m => m.move === move);
    if (moveData) {
      setShowExplosion({ emoji: moveData.emoji, key: Date.now() });
      setTimeout(() => setShowExplosion(null), 800);
    }

    setTimeout(() => setCooldown(false), 800);
  };

  const handleStartNew = () => {
    resetGame();
    setLastPlayed(null);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onHome}
          className="text-muted-foreground hover:text-foreground text-sm font-bold active:scale-95 transition-transform"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.15em] text-accent font-bold">
            TAP MODE
          </span>
        </div>
        <RulesSheet />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* Toss */}
        {game.phase === "not_started" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-score p-6 text-center space-y-5 mt-8"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/30 flex items-center justify-center"
            >
              <span className="text-4xl">👆</span>
            </motion.div>
            <div>
              <p className="font-display text-sm font-black text-foreground tracking-wider">
                CHOOSE YOUR INNINGS
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Tap to play — no camera needed</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => startGame(true)}
                className="flex-1 py-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl text-sm glow-primary"
              >
                🏏 BAT FIRST
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => startGame(false)}
                className="flex-1 py-4 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-display font-bold rounded-2xl text-sm glow-accent"
              >
                🎯 BOWL FIRST
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Scoreboard */}
        {game.phase !== "not_started" && <ScoreBoard game={game} />}

        {/* Last result display */}
        <AnimatePresence mode="wait">
          {game.lastResult && game.phase !== "not_started" && game.phase !== "finished" && (
            <motion.div
              key={game.lastResult.description}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-score p-4 text-center relative overflow-hidden"
            >
              {/* Result flash */}
              <motion.div
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className={`absolute inset-0 ${
                  game.lastResult.runs === "OUT" ? "bg-out-red/20" : "bg-primary/10"
                }`}
              />

              <div className="flex items-center justify-center gap-8 relative z-10">
                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground font-bold tracking-widest mb-1">YOU</p>
                  <motion.p
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    className="text-4xl"
                  >
                    {MOVES.find((m) => m.move === game.lastResult?.userMove)?.emoji || "❓"}
                  </motion.p>
                  <p className="text-xs font-display font-bold text-primary mt-1">
                    {game.lastResult.userMove === "DEF" ? "DEF" : game.lastResult.userMove}
                  </p>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.15 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-sm ${
                    game.lastResult.runs === "OUT"
                      ? "bg-out-red/20 border-2 border-out-red/40 text-out-red"
                      : "bg-primary/20 border-2 border-primary/40 text-primary"
                  }`}
                >
                  {game.lastResult.runs === "OUT" ? "OUT" : `+${game.lastResult.runs}`}
                </motion.div>

                <div className="text-center">
                  <p className="text-[7px] text-muted-foreground font-bold tracking-widest mb-1">AI</p>
                  <motion.p
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl"
                  >
                    {MOVES.find((m) => m.move === game.lastResult?.aiMove)?.emoji || "🤖"}
                  </motion.p>
                  <p className="text-xs font-display font-bold text-accent mt-1">
                    {game.lastResult.aiMove === "DEF" ? "DEF" : game.lastResult.aiMove}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap buttons grid */}
        {game.phase !== "not_started" && game.phase !== "finished" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-auto relative"
          >
            {/* Explosion effect */}
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

            <p className="text-center text-[8px] text-muted-foreground font-display mb-2 tracking-widest">
              {game.isBatting ? "⚡ TAP YOUR SHOT" : "🎯 TAP YOUR BOWL"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MOVES.map((m) => (
                <motion.button
                  key={m.label}
                  whileTap={{ scale: 0.8 }}
                  onClick={() => handleMove(m.move)}
                  disabled={cooldown}
                  className={`relative py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border ${
                    cooldown
                      ? "opacity-30 cursor-not-allowed border-transparent bg-muted/30"
                      : lastPlayed === m.move
                      ? "border-primary/50 bg-primary/15 text-primary glow-primary"
                      : `${m.color} text-foreground`
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 mt-4"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartNew}
              className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl glow-primary tracking-wider"
            >
              ⚡ NEW MATCH
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onHome}
              className="flex-1 py-3.5 bg-muted text-foreground font-display font-bold rounded-2xl tracking-wider"
            >
              HOME
            </motion.button>
          </motion.div>
        )}

        {/* Reset during game */}
        {game.phase !== "not_started" && game.phase !== "finished" && (
          <button
            onClick={handleStartNew}
            className="text-[10px] text-muted-foreground/50 underline self-center mt-1 active:scale-95 font-display tracking-wider"
          >
            Reset Match
          </button>
        )}
      </div>
    </div>
  );
}
