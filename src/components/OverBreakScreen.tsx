import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Commentator, CommentaryLine } from "@/lib/commentaryDuo";
import stadiumNight from "@/assets/stadium-night.jpg";

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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* Night stadium photo background */}
      <img src={stadiumNight} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      {/* Crowd silhouette overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      {/* Floodlight glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
            className="absolute rounded-full"
            style={{
              width: 16, height: 16,
              top: `${4 + i * 3}%`,
              left: `${15 + i * 22}%`,
              background: "hsl(var(--secondary))",
              filter: "blur(6px)",
              boxShadow: "0 0 30px 12px hsl(45 93% 58% / 0.15)",
            }}
          />
        ))}
      </div>
      {/* Header */}
      <div className="relative z-10 pt-12 pb-4 px-4 text-center">
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
      <div className="relative z-10 px-4 mb-4">
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
      <div className="relative z-10 flex-1 px-4 overflow-y-auto no-scrollbar">
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
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm backdrop-blur-md ${
                  isLeft ? "bg-primary/15 border border-primary/25 shadow-[0_0_12px_hsl(217_91%_60%/0.15)]" : "bg-accent/15 border border-accent/25 shadow-[0_0_12px_hsl(168_80%_50%/0.15)]"
                }`}>
                  {comm.avatar}
                </div>
                <div className={`max-w-[75%] ${isLeft ? "" : "text-right"}`}>
                  <p className={`text-[7px] font-display font-bold tracking-wider mb-0.5 ${isLeft ? "text-primary" : "text-accent"}`}>
                    {comm.name.toUpperCase()}
                  </p>
                  <div className={`px-3 py-2.5 rounded-2xl backdrop-blur-lg ${
                    isLeft 
                      ? "bg-white/[0.06] border border-white/[0.12] rounded-tl-sm shadow-[inset_0_1px_0_hsl(217_91%_60%/0.1),0_2px_8px_rgba(0,0,0,0.3)]" 
                      : "bg-white/[0.06] border border-white/[0.12] rounded-tr-sm shadow-[inset_0_1px_0_hsl(168_80%_50%/0.1),0_2px_8px_rgba(0,0,0,0.3)]"
                  }`}>
                    <p className="text-[10px] font-body text-foreground/90 leading-relaxed">{line.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="relative z-10 p-4 pb-8">
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
