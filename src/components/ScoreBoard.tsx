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
    return game.isBatting
      ? game.target ? "CHASING" : "BATTING"
      : game.target ? "DEFENDING" : "BOWLING";
  };

  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  const commentaryText = commentary[game.ballHistory.length % commentary.length];

  // Health bar calculations
  const maxScore = Math.max(game.userScore, game.aiScore, game.target || 0, 10);
  const userPct = Math.min((game.userScore / maxScore) * 100, 100);
  const aiPct = Math.min((game.aiScore / maxScore) * 100, 100);
  const chasePct = game.target ? Math.min((game.userScore / game.target) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      {/* Broadcast top strip */}
      <div className="broadcast-bar rounded-xl px-3 py-2 flex items-center justify-between">
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

      {/* Main score card with health bars */}
      <div className="glass-score p-4">
        {/* Score display */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          {/* User score */}
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">YOU</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`u-${game.userScore}`}
                initial={{ scale: 1.5, color: "hsl(145 70% 55%)" }}
                animate={{ scale: 1, color: "hsl(45 95% 58%)" }}
                transition={{ duration: 0.4, type: "spring" }}
                className="font-display text-4xl font-black text-score-gold text-glow-gold leading-none"
              >
                {game.userScore}
              </motion.p>
              {game.userWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.userWickets}</p>
              )}
            </div>
            {/* User health bar */}
            <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-score-gold to-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${userPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[8px] text-muted-foreground/60 mt-1 font-display">
              {game.isBatting ? "BATTING" : "BOWLING"}
            </p>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-px h-4 bg-gradient-to-b from-transparent to-glass" />
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-glass flex items-center justify-center"
            >
              <span className="text-[9px] font-display font-black text-muted-foreground">VS</span>
            </motion.div>
            <div className="w-px h-4 bg-gradient-to-t from-transparent to-glass" />
          </div>

          {/* AI score */}
          <div className="text-center">
            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mb-1">AI</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`a-${game.aiScore}`}
                initial={{ scale: 1.5, color: "hsl(210 90% 65%)" }}
                animate={{ scale: 1, color: "hsl(210 90% 56%)" }}
                transition={{ duration: 0.4, type: "spring" }}
                className="font-display text-4xl font-black text-accent leading-none"
              >
                {game.aiScore}
              </motion.p>
              {game.aiWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.aiWickets}</p>
              )}
            </div>
            {/* AI health bar */}
            <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60"
                initial={{ width: 0 }}
                animate={{ width: `${aiPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[8px] text-muted-foreground/60 mt-1 font-display">
              {game.isBatting ? "BOWLING" : "BATTING"}
            </p>
          </div>
        </div>

        {/* Chase progress bar */}
        {game.target && game.phase !== "finished" && (
          <div className="mt-3 pt-3 border-t border-glass">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-display font-bold text-secondary tracking-wider">
                TARGET: {game.target}
              </span>
              {needRuns !== null && (
                <motion.span
                  key={needRuns}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-[9px] font-display font-bold text-primary tracking-wider"
                >
                  NEED {needRuns}
                </motion.span>
              )}
            </div>
            {/* Chase progress */}
            {game.isBatting && (
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                  animate={{ width: `${chasePct}%` }}
                  transition={{ duration: 0.5 }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/30"
                  style={{ left: "100%" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Ball history ticker */}
        {game.ballHistory.length > 0 && (
          <div className="mt-3 pt-2 border-t border-glass">
            <p className="text-[7px] text-muted-foreground font-bold mb-1.5 tracking-widest font-display">THIS OVER</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {game.ballHistory.slice(-10).map((b, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`ball-chip shrink-0 ${
                    b.runs === "OUT"
                      ? "ball-chip-wicket"
                      : typeof b.runs === "number" && b.runs > 0
                      ? "ball-chip-run"
                      : "ball-chip-def"
                  }`}
                >
                  {b.runs === "OUT" ? "W" : typeof b.runs === "number" && b.runs > 0 ? b.runs : "•"}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commentary ticker */}
      {game.phase !== "finished" && game.ballHistory.length > 0 && (
        <motion.div
          key={commentaryText}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="broadcast-bar rounded-lg px-3 py-1.5 text-center"
        >
          <p className="text-[10px] text-muted-foreground/60 italic font-body">
            "{commentaryText}"
          </p>
        </motion.div>
      )}

      {/* Result banner */}
      <AnimatePresence>
        {game.phase === "finished" && game.result && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateX: 90 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 150 }}
            className={`text-center py-5 rounded-2xl font-display font-black text-xl relative overflow-hidden ${
              game.result === "win"
                ? "bg-primary/20 text-primary text-glow glow-primary"
                : game.result === "loss"
                ? "bg-out-red/15 text-out-red text-glow-red glow-out"
                : "bg-secondary/15 text-secondary text-glow-gold"
            }`}
          >
            {/* Celebration particles */}
            {game.result === "win" && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 0, x: 0, opacity: 1 }}
                    animate={{
                      y: [0, -60 - Math.random() * 40],
                      x: [(i - 3) * 20, (i - 3) * 40],
                      opacity: [1, 0],
                    }}
                    transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2 }}
                    className="absolute top-1/2 left-1/2 text-lg"
                  >
                    {["🎉", "⭐", "🏆", "✨", "🎊", "🏏"][i]}
                  </motion.div>
                ))}
              </>
            )}
            <span className="relative z-10">
              {game.result === "win" && "🏆 YOU WIN!"}
              {game.result === "loss" && "💔 YOU LOSE"}
              {game.result === "draw" && "🤝 DRAW"}
            </span>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs font-normal text-muted-foreground mt-2 relative z-10"
            >
              {game.userScore} - {game.aiScore}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
