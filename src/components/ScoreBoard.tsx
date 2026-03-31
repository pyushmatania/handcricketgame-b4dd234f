import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/hooks/useHandCricket";

interface ScoreBoardProps {
  game: GameState;
}

const commentary = [
  "Tension in the stadium…",
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
    if (game.isBatting) {
      return game.target ? "CHASING" : "BATTING";
    }
    return game.target ? "DEFENDING" : "BOWLING";
  };

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const commentaryText = commentary[game.ballHistory.length % commentary.length];

  return (
    <div className="space-y-2">
      {/* Broadcast top strip */}
      <div className="broadcast-bar rounded-lg px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-display tracking-widest text-primary font-bold">{phaseLabel()}</span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span className="text-[9px] font-display tracking-wider text-secondary font-bold">{statusLabel()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
          <span className="text-[8px] text-muted-foreground font-display tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Main score card */}
      <div className="glass-score p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* User score */}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">YOU</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`u-${game.userScore}`}
                initial={{ scale: 1.4, color: "hsl(145 70% 55%)" }}
                animate={{ scale: 1, color: "hsl(45 95% 58%)" }}
                transition={{ duration: 0.4 }}
                className="font-display text-4xl font-black text-score-gold text-glow-gold leading-none"
              >
                {game.userScore}
              </motion.p>
              {game.userWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.userWickets}</p>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-1 font-display">
              {game.isBatting ? "BATTING" : "BOWLING"}
            </p>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-px h-4 bg-gradient-to-b from-transparent to-glass" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-glass flex items-center justify-center">
              <span className="text-[9px] font-display font-black text-muted-foreground">VS</span>
            </div>
            <div className="w-px h-4 bg-gradient-to-t from-transparent to-glass" />
          </div>

          {/* AI score */}
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">AI</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`a-${game.aiScore}`}
                initial={{ scale: 1.4, color: "hsl(210 90% 65%)" }}
                animate={{ scale: 1, color: "hsl(210 90% 56%)" }}
                transition={{ duration: 0.4 }}
                className="font-display text-4xl font-black text-accent leading-none"
              >
                {game.aiScore}
              </motion.p>
              {game.aiWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.aiWickets}</p>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground/60 mt-1 font-display">
              {game.isBatting ? "BOWLING" : "BATTING"}
            </p>
          </div>
        </div>

        {/* Target / Chase */}
        {game.target && game.phase !== "finished" && (
          <div className="mt-3 pt-3 border-t border-glass flex items-center justify-center gap-3">
            <span className="text-[10px] font-display font-bold text-secondary tracking-wider">
              TARGET: {game.target}
            </span>
            {needRuns !== null && (
              <motion.span
                key={needRuns}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-[10px] font-display font-bold text-primary tracking-wider"
              >
                • NEED {needRuns}
              </motion.span>
            )}
          </div>
        )}

        {/* Ball history chips */}
        {game.ballHistory.length > 0 && (
          <div className="mt-3 pt-2 border-t border-glass">
            <p className="text-[8px] text-muted-foreground font-bold mb-1.5 tracking-wider">RECENT BALLS</p>
            <div className="flex gap-1 flex-wrap">
              {game.ballHistory.slice(-10).map((b, i) => (
                <span
                  key={i}
                  className={`ball-chip ${
                    b.runs === "OUT" ? "ball-chip-wicket" : typeof b.runs === "number" && b.runs > 0 ? "ball-chip-run" : "ball-chip-def"
                  }`}
                >
                  {b.runs === "OUT" ? "W" : typeof b.runs === "number" && b.runs > 0 ? b.runs : "•"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commentary */}
      {game.phase !== "finished" && game.ballHistory.length > 0 && (
        <motion.p
          key={commentaryText}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[10px] text-muted-foreground/60 italic text-center font-body"
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
            className={`text-center py-4 rounded-2xl font-display font-black text-xl ${
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
