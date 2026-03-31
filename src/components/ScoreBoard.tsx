import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/hooks/useHandCricket";

interface ScoreBoardProps {
  game: GameState;
}

const commentary = [
  "Tension in the stadium...",
  "Big delivery coming up!",
  "Crowd is on edge!",
  "Can you chase this?",
  "The pressure is mounting…",
  "What a match this is!",
  "Every run counts now!",
  "The crowd roars!",
];

export default function ScoreBoard({ game }: ScoreBoardProps) {
  const phaseLabel = () => {
    switch (game.phase) {
      case "first_batting": return "1ST INNINGS";
      case "first_bowling": return "1ST INNINGS";
      case "second_batting": return "2ND INNINGS";
      case "second_bowling": return "2ND INNINGS";
      case "finished": return "MATCH OVER";
      default: return "READY";
    }
  };

  const statusLabel = () => {
    if (game.phase === "finished") return "";
    if (game.isBatting) {
      if (game.target) return "YOU ARE CHASING";
      return "YOU ARE BATTING";
    } else {
      if (game.target) return "DEFENDING";
      return "YOU ARE BOWLING";
    }
  };

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const commentaryText = commentary[game.ballHistory.length % commentary.length];

  return (
    <div className="space-y-1.5">
      {/* Broadcast top bar */}
      <div className="broadcast-bar rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-display tracking-widest text-primary font-bold">
            {phaseLabel()}
          </span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span className="text-[9px] font-display tracking-wider text-secondary font-bold">
            {statusLabel()}
          </span>
        </div>
        <span className="text-[8px] text-muted-foreground font-display tracking-wider">
          HAND CRICKET AR
        </span>
      </div>

      {/* Main scoreboard */}
      <div className="glass-premium p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* User score */}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">YOU</p>
            <motion.p
              key={`u-${game.userScore}`}
              initial={{ scale: 1.4, color: "hsl(145 70% 55%)" }}
              animate={{ scale: 1, color: "hsl(45 90% 55%)" }}
              transition={{ duration: 0.4 }}
              className="font-display text-3xl font-black text-score-gold text-glow-gold leading-none"
            >
              {game.userScore}
            </motion.p>
            {game.userWickets > 0 && (
              <p className="text-[10px] text-out-red font-bold mt-0.5">
                {game.userWickets}W
              </p>
            )}
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-display font-bold text-muted-foreground">VS</span>
            <div className="w-px h-6 bg-glass" />
          </div>

          {/* AI score */}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">AI</p>
            <motion.p
              key={`a-${game.aiScore}`}
              initial={{ scale: 1.4, color: "hsl(200 80% 65%)" }}
              animate={{ scale: 1, color: "hsl(200 80% 55%)" }}
              transition={{ duration: 0.4 }}
              className="font-display text-3xl font-black text-accent leading-none"
            >
              {game.aiScore}
            </motion.p>
            {game.aiWickets > 0 && (
              <p className="text-[10px] text-out-red font-bold mt-0.5">
                {game.aiWickets}W
              </p>
            )}
          </div>
        </div>

        {/* Target / Chase info */}
        {game.target && game.phase !== "finished" && (
          <div className="mt-2 pt-2 border-t border-glass text-center">
            <span className="text-[10px] font-display font-bold text-secondary tracking-wider">
              TARGET: {game.target}
            </span>
            {needRuns !== null && (
              <motion.span
                key={needRuns}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="ml-2 text-[10px] font-display font-bold text-primary tracking-wider"
              >
                • NEED {needRuns} TO WIN
              </motion.span>
            )}
          </div>
        )}
      </div>

      {/* Commentary */}
      {game.phase !== "finished" && game.ballHistory.length > 0 && (
        <motion.p
          key={commentaryText}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[10px] text-muted-foreground/70 italic text-center font-body"
        >
          "{commentaryText}"
        </motion.p>
      )}

      {/* Result banner */}
      <AnimatePresence>
        {game.phase === "finished" && game.result && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className={`text-center py-3 rounded-xl font-display font-black text-xl ${
              game.result === "win"
                ? "bg-primary/20 text-primary text-glow glow-primary"
                : game.result === "loss"
                ? "bg-out-red/15 text-out-red text-glow-red glow-out"
                : "bg-secondary/15 text-secondary text-glow-gold"
            }`}
          >
            {game.result === "win" && "🏆 YOU WIN!"}
            {game.result === "loss" && "💔 YOU LOSE"}
            {game.result === "draw" && "🤝 DRAW"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
