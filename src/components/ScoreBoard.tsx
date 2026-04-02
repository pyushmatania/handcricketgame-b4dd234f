import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/hooks/useHandCricket";

interface ScoreBoardProps {
  game: GameState;
  playerName?: string;
  aiName?: string;
  aiEmoji?: string;
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

export default function ScoreBoard({ game, playerName = "You", aiName = "Rohit AI", aiEmoji = "🏏" }: ScoreBoardProps) {
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

  const maxScore = Math.max(game.userScore, game.aiScore, game.target || 0, 10);
  const userPct = Math.min((game.userScore / maxScore) * 100, 100);
  const aiPct = Math.min((game.aiScore / maxScore) * 100, 100);
  const chasePct = game.target ? Math.min((game.userScore / game.target) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      {/* Broadcast header strip */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
        <div className="glass-premium rounded-xl px-3 py-2 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
            <span className="text-[9px] font-display tracking-[0.2em] text-primary font-bold">{phaseLabel()}</span>
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            <span className="text-[9px] font-display tracking-wider text-secondary font-bold">{statusLabel()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-out-red/10 border border-out-red/20">
            <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
            <span className="text-[7px] text-out-red font-display font-bold tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* Main score card — cricket pitch themed */}
      <div className="glass-premium rounded-2xl p-4 relative overflow-hidden">
        {/* Cricket pitch background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Pitch strip */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(120_30%_18%/0.12)] via-[hsl(100_35%_22%/0.08)] to-[hsl(120_30%_18%/0.12)]" />
            {/* Crease lines */}
            <div className="absolute top-[15%] left-[10%] right-[10%] h-px bg-[hsl(0_0%_100%/0.06)]" />
            <div className="absolute bottom-[15%] left-[10%] right-[10%] h-px bg-[hsl(0_0%_100%/0.06)]" />
            {/* Good length area */}
            <div className="absolute top-[30%] left-[20%] right-[20%] bottom-[40%] border border-[hsl(120_30%_40%/0.06)] rounded-sm" />
          </div>
          {/* Stumps */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[2px] h-3 bg-gradient-to-b from-secondary/20 to-secondary/5 rounded-full" />
            ))}
          </div>
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[2px] h-3 bg-gradient-to-t from-secondary/20 to-secondary/5 rounded-full" />
            ))}
          </div>
          {/* Outfield radial */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, hsl(120 25% 12% / 0.06) 70%, transparent 100%)",
            }}
          />
          {/* Boundary rope hint */}
          <div className="absolute inset-2 rounded-[50%] border border-[hsl(0_0%_100%/0.03)]" />
        </div>

        {/* Background shimmer */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent skew-x-[-20deg] pointer-events-none"
        />

        {/* Score display */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center relative z-10">
          {/* User score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center">
                <span className="text-[10px]">🏏</span>
              </div>
              <p className="text-[8px] text-muted-foreground font-display font-bold uppercase tracking-[0.2em]">{playerName.toUpperCase().slice(0, 12)}</p>
            </div>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`u-${game.userScore}`}
                initial={{ scale: 1.5, color: "hsl(145 70% 55%)" }}
                animate={{ scale: 1, color: "hsl(45 95% 58%)" }}
                transition={{ duration: 0.4, type: "spring" }}
                className="font-display text-4xl font-black text-secondary leading-none"
                style={{ textShadow: "0 0 20px hsl(45 95% 58% / 0.3)" }}
              >
                {game.userScore}
              </motion.p>
              {game.userWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.userWickets}</p>
              )}
            </div>
            {/* Score bar */}
            <div className="mt-2 h-1 bg-muted/30 rounded-full overflow-hidden mx-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-secondary to-secondary/60"
                initial={{ width: 0 }}
                animate={{ width: `${userPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[7px] text-muted-foreground/50 mt-1.5 font-display tracking-widest">
              {game.isBatting ? "⚡ BATTING" : "🎯 BOWLING"}
            </p>
          </div>

          {/* VS divider with cricket ball */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-3 bg-gradient-to-b from-transparent to-primary/20" />
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full relative"
            >
              {/* Spinning seam effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-out-red/30 via-out-red/10 to-out-red/30 border border-out-red/20" />
              <div className="absolute inset-[1px] rounded-full overflow-hidden">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-out-red/30 -translate-y-1/2" />
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "conic-gradient(from 0deg, transparent 0%, hsl(0 72% 51% / 0.15) 25%, transparent 50%, hsl(0 72% 51% / 0.15) 75%, transparent 100%)",
                  }}
                />
              </div>
              <div className="absolute inset-[3px] rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
                <span className="text-[8px] font-display font-black text-muted-foreground tracking-wider">VS</span>
              </div>
            </motion.div>
            <div className="w-px h-3 bg-gradient-to-t from-transparent to-accent/20" />
          </div>

          {/* AI score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                <span className="text-[10px]">{aiEmoji}</span>
              </div>
              <p className="text-[8px] text-muted-foreground font-display font-bold uppercase tracking-[0.2em]">{aiName.toUpperCase().slice(0, 12)}</p>
            </div>
            <div className="flex items-baseline justify-center gap-0.5">
              <motion.p
                key={`a-${game.aiScore}`}
                initial={{ scale: 1.5, color: "hsl(210 90% 65%)" }}
                animate={{ scale: 1, color: "hsl(168 80% 50%)" }}
                transition={{ duration: 0.4, type: "spring" }}
                className="font-display text-4xl font-black text-accent leading-none"
                style={{ textShadow: "0 0 20px hsl(168 80% 50% / 0.3)" }}
              >
                {game.aiScore}
              </motion.p>
              {game.aiWickets > 0 && (
                <p className="text-sm text-out-red font-display font-bold">/{game.aiWickets}</p>
              )}
            </div>
            {/* Score bar */}
            <div className="mt-2 h-1 bg-muted/30 rounded-full overflow-hidden mx-2">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60"
                initial={{ width: 0 }}
                animate={{ width: `${aiPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[7px] text-muted-foreground/50 mt-1.5 font-display tracking-widest">
              {game.isBatting ? "🎯 BOWLING" : "⚡ BATTING"}
            </p>
          </div>
        </div>

        {/* Chase progress */}
        {game.target && game.phase !== "finished" && (
          <div className="mt-3 pt-3 border-t border-primary/10 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary/20 flex items-center justify-center">
                  <span className="text-[8px]">🎯</span>
                </div>
                <span className="text-[9px] font-display font-bold text-secondary tracking-wider">
                  TARGET: {game.target}
                </span>
              </div>
              {needRuns !== null && (
                <motion.div
                  key={needRuns}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20"
                >
                  <span className="text-[8px] font-display font-bold text-primary tracking-wider">
                    NEED {needRuns}
                  </span>
                </motion.div>
              )}
            </div>
            {game.isBatting && (
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                  animate={{ width: `${chasePct}%` }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute top-0 right-0 h-full w-0.5 bg-secondary/50" />
              </div>
            )}
          </div>
        )}

        {/* Ball history — styled as pitch map dots */}
        {game.ballHistory.length > 0 && (
          <div className="mt-3 pt-2 border-t border-primary/10 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[7px] text-muted-foreground font-bold tracking-[0.2em] font-display">THIS OVER</p>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/10 to-transparent" />
              <span className="text-[7px] text-muted-foreground/40 font-display">{game.ballHistory.length} BALLS</span>
            </div>
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
                      : typeof b.runs === "number" && Math.abs(b.runs) >= 6
                      ? "ball-chip-run !bg-primary/20 !border-primary/40 !text-primary"
                      : typeof b.runs === "number" && Math.abs(b.runs) >= 4
                      ? "ball-chip-run !bg-secondary/20 !border-secondary/40 !text-secondary"
                      : typeof b.runs === "number" && Math.abs(b.runs) > 0
                      ? "ball-chip-run"
                      : "ball-chip-def"
                  }`}
                >
                  {b.runs === "OUT" ? "W" : typeof b.runs === "number" && Math.abs(b.runs) > 0 ? Math.abs(b.runs) : "•"}
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
          className="glass-card rounded-xl px-3 py-2 text-center flex items-center justify-center gap-2"
        >
          <span className="text-[10px]">📢</span>
          <p className="text-[9px] text-muted-foreground/70 italic font-body">
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
            className="relative overflow-hidden rounded-2xl"
          >
            <div className={`text-center py-6 font-display font-black text-xl relative overflow-hidden ${
              game.result === "win"
                ? "bg-gradient-to-br from-primary/20 via-primary/10 to-neon-green/10 text-primary border border-primary/20"
                : game.result === "loss"
                ? "bg-gradient-to-br from-out-red/15 via-out-red/10 to-out-red/5 text-out-red border border-out-red/20"
                : "bg-gradient-to-br from-secondary/15 via-secondary/10 to-secondary/5 text-secondary border border-secondary/20"
            } rounded-2xl`}
            >
              {/* Celebration particles */}
              {game.result === "win" && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 0, x: 0, opacity: 1 }}
                      animate={{
                        y: [0, -80 - Math.random() * 50],
                        x: [(i - 4) * 15, (i - 4) * 35],
                        opacity: [1, 0],
                        rotate: [0, Math.random() * 360],
                      }}
                      transition={{ duration: 1.8, delay: i * 0.08, repeat: Infinity, repeatDelay: 2.5 }}
                      className="absolute top-1/2 left-1/2 text-lg"
                    >
                      {["🎉", "⭐", "🏆", "✨", "🎊", "🏏", "💫", "🌟"][i]}
                    </motion.div>
                  ))}
                </>
              )}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-4xl block mb-2"
              >
                {game.result === "win" ? "🏆" : game.result === "loss" ? "💔" : "🤝"}
              </motion.span>
              <span className="relative z-10 tracking-widest" style={{ textShadow: "0 0 30px currentColor" }}>
                {game.result === "win" && `${playerName.toUpperCase()} WINS!`}
                {game.result === "loss" && `${aiName.toUpperCase()} WINS!`}
                {game.result === "draw" && "IT'S A DRAW!"}
              </span>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm font-normal text-muted-foreground mt-2 relative z-10"
              >
                <span className="text-secondary font-bold">{playerName} {game.userScore}</span>
                <span className="mx-2">vs</span>
                <span className="text-accent font-bold">{aiName} {game.aiScore}</span>
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
