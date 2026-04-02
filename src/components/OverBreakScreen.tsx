import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Commentator, CommentaryLine } from "@/lib/commentaryDuo";

interface OverBreakStats {
  overRuns: number;
  score: number;
  wickets: number;
  opponentScore: number;
  opponentWickets: number;
  crr: string;
  rrr: string;
  target: number | null;
  remaining: number;
  remainingBalls: number;
  oversCompleted: number;
  totalOvers: number | null;
  isBatting: boolean;
  playerName: string;
  opponentName: string;
  thisOverBalls: { runs: number | "OUT" }[];
}

interface OverBreakScreenProps {
  stats: OverBreakStats;
  commentaryLines: CommentaryLine[];
  commentators: [Commentator, Commentator];
  onContinue: () => void;
}

export default function OverBreakScreen({ stats, commentaryLines, commentators, onContinue }: OverBreakScreenProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [autoTimer, setAutoTimer] = useState(12);

  // Reveal lines one by one
  useEffect(() => {
    if (visibleLines < commentaryLines.length) {
      const timer = setTimeout(() => setVisibleLines(v => v + 1), 1800);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, commentaryLines.length]);

  // Auto-continue countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoTimer(t => {
        if (t <= 1) { onContinue(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onContinue]);

  const getCommentator = useCallback((id: string) => {
    return commentators.find(c => c.name === id || c.id === id) || commentators[0];
  }, [commentators]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="pt-12 pb-4 px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-premium border border-primary/20"
        >
          <span className="text-xs">🏏</span>
          <span className="font-display text-[10px] font-bold text-primary tracking-[0.3em]">
            END OF OVER {stats.oversCompleted}
          </span>
        </motion.div>
      </div>

      {/* Score Summary Card */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
          <div className="relative z-10">
            {/* Scores */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-center flex-1">
                <p className="text-[7px] font-display font-bold text-muted-foreground tracking-[0.2em] mb-1">
                  {stats.isBatting ? "YOU" : stats.opponentName.toUpperCase()}
                </p>
                <p className="font-display text-2xl font-black text-foreground">
                  {stats.isBatting ? stats.score : stats.opponentScore}
                  <span className="text-sm text-muted-foreground">/{stats.isBatting ? stats.wickets : stats.opponentWickets}</span>
                </p>
              </div>
              <div className="px-3">
                <div className="w-px h-10 bg-border/30" />
              </div>
              <div className="text-center flex-1">
                <p className="text-[7px] font-display font-bold text-muted-foreground tracking-[0.2em] mb-1">
                  {stats.isBatting ? stats.opponentName.toUpperCase() : "YOU"}
                </p>
                <p className="font-display text-2xl font-black text-foreground">
                  {stats.isBatting ? stats.opponentScore : stats.score}
                  <span className="text-sm text-muted-foreground">/{stats.isBatting ? stats.opponentWickets : stats.wickets}</span>
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-[6px] text-muted-foreground font-display tracking-wider">OVERS</p>
                <p className="font-display text-xs font-bold text-foreground">
                  {stats.oversCompleted}{stats.totalOvers ? `/${stats.totalOvers}` : ""}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[6px] text-muted-foreground font-display tracking-wider">CRR</p>
                <p className="font-display text-xs font-bold text-primary">{stats.crr}</p>
              </div>
              {stats.target && (
                <>
                  <div className="text-center">
                    <p className="text-[6px] text-muted-foreground font-display tracking-wider">RRR</p>
                    <p className="font-display text-xs font-bold text-accent">{stats.rrr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[6px] text-muted-foreground font-display tracking-wider">NEED</p>
                    <p className="font-display text-xs font-bold text-secondary">{stats.remaining}</p>
                  </div>
                </>
              )}
            </div>

            {/* This Over balls */}
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[7px] font-display text-muted-foreground tracking-wider mr-1">THIS OVER</span>
              {stats.thisOverBalls.map((ball, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`ball-chip ${
                    ball.runs === "OUT" ? "ball-chip-wicket" : 
                    typeof ball.runs === "number" && ball.runs >= 4 ? "ball-chip-run" : 
                    "ball-chip-def"
                  }`}
                >
                  {ball.runs === "OUT" ? "W" : ball.runs}
                </motion.div>
              ))}
              {/* Fill remaining */}
              {Array.from({ length: Math.max(0, 6 - stats.thisOverBalls.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="ball-chip bg-muted/10 border border-border/20 text-muted-foreground/30">•</div>
              ))}
            </div>

            {/* Over runs */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 text-center"
            >
              <span className="text-[8px] font-display font-bold text-secondary tracking-wider">
                {stats.overRuns} RUNS OFF THE OVER
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Commentary Conversation */}
      <div className="flex-1 px-4 overflow-y-auto no-scrollbar">
        <div className="space-y-2">
          {commentaryLines.slice(0, visibleLines).map((line, i) => {
            const comm = getCommentator(line.commentatorId);
            const isLeft = comm.id === commentators[0].id;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-2 ${isLeft ? "" : "flex-row-reverse"}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isLeft ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20" : "bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20"
                }`}>
                  {comm.avatar}
                </div>
                <div className={`max-w-[75%] ${isLeft ? "" : "text-right"}`}>
                  <p className={`text-[7px] font-display font-bold tracking-wider mb-0.5 ${isLeft ? "text-primary" : "text-accent"}`}>
                    {comm.name.toUpperCase()}
                  </p>
                  <div className={`px-3 py-2 rounded-2xl ${
                    isLeft 
                      ? "bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-tl-sm" 
                      : "bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/15 rounded-tr-sm"
                  }`}>
                    <p className="text-[10px] font-body text-foreground leading-relaxed">{line.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="p-4 pb-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-black text-sm rounded-2xl tracking-wider shadow-[0_0_25px_hsl(217_91%_60%/0.2)] border border-primary/30 relative overflow-hidden"
        >
          {/* Timer progress */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 12, ease: "linear" }}
            className="absolute inset-0 bg-primary/20 origin-left"
          />
          <span className="relative z-10">
            ⚡ CONTINUE • {autoTimer}s
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
