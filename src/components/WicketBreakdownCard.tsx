import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import stadiumNight from "@/assets/stadium-night.jpg";

export interface WicketBreakdownData {
  type: "wicket" | "innings_change";
  // Batsman info
  batsmanName: string;
  batsmanRuns: number;
  batsmanBalls: number;
  batsmanFours: number;
  batsmanSixes: number;
  // Partnership
  partnershipRuns: number;
  partnershipBalls: number;
  // Bowling spell (who took the wicket / bowler stats)
  bowlerName: string;
  bowlerWickets: number;
  bowlerRunsConceded: number;
  bowlerOvers: string;
  // Match context
  totalScore: number;
  totalWickets: number;
  currentOver: string;
  target: number | null;
  isInningsChange: boolean;
  // Innings summary (for innings change)
  inningsScore?: number;
  inningsWickets?: number;
  inningsOvers?: string;
  inningsRR?: string;
  newTarget?: number;
  dismissalType?: string;
  // Over break merged data (when wicket falls on end of over)
  overBreakStats?: {
    overRuns: number;
    thisOverBalls: { runs: number | "OUT" }[];
    crr: string;
    rrr: string;
    oversCompleted: number;
    totalOvers: number | null;
  };
}

interface WicketBreakdownCardProps {
  data: WicketBreakdownData;
  onContinue: () => void;
}

export default function WicketBreakdownCard({ data, onContinue }: WicketBreakdownCardProps) {
  const [autoTimer, setAutoTimer] = useState(data.isInningsChange ? 8 : 5);

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoTimer(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoTimer <= 0) {
      onContinue();
    }
  }, [autoTimer, onContinue]);

  const strikeRate = data.batsmanBalls > 0
    ? ((data.batsmanRuns / data.batsmanBalls) * 100).toFixed(1)
    : "0.0";

  const partnershipRR = data.partnershipBalls > 0
    ? ((data.partnershipRuns / data.partnershipBalls) * 6).toFixed(1)
    : "0.0";

  const bowlerEconomy = data.bowlerOvers && parseFloat(data.bowlerOvers) > 0
    ? (data.bowlerRunsConceded / parseFloat(data.bowlerOvers)).toFixed(1)
    : "-";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* Night stadium background */}
      <img src={stadiumNight} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85" />

      {/* Floodlight flicker */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.05, 0.35, 0.05, 0.2, 0.05] }}
            transition={{ duration: 0.6, repeat: 2, delay: i * 0.15 }}
            className="absolute rounded-full"
            style={{
              width: 20, height: 20,
              top: `${3 + i * 4}%`,
              left: `${20 + i * 25}%`,
              background: "hsl(var(--secondary))",
              filter: "blur(8px)",
              boxShadow: "0 0 40px 15px hsl(45 93% 58% / 0.2)",
            }}
          />
        ))}
      </div>

      {/* Header badge */}
      <div className="relative z-10 pt-12 pb-3 px-4 text-center space-y-2">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border ${
            data.isInningsChange
              ? "glass-premium border-secondary/30 shadow-[0_0_20px_hsl(45_93%_58%/0.15)]"
              : "glass-premium border-destructive/30 shadow-[0_0_20px_hsl(0_84%_60%/0.15)]"
          }`}
        >
          <span className="text-sm">{data.isInningsChange ? "🏟️" : "🔴"}</span>
          <span className="font-display text-[10px] font-black tracking-[0.3em] text-foreground">
            {data.isInningsChange ? "INNINGS BREAK" : "WICKET!"}
          </span>
        </motion.div>

        {/* Clear role announcement for innings change */}
        {data.isInningsChange && data.newTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-1.5"
          >
            <p className="font-display text-xs font-black text-secondary tracking-wider">
              🎯 TARGET: {data.newTarget} RUNS
            </p>
            <p className="font-display text-[10px] font-bold text-foreground tracking-wider">
              {data.batsmanName} scored {data.totalScore} — now it's your turn!
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/25">
                <span className="text-[9px] font-display font-bold text-primary">
                  🏏 {data.bowlerName} BATS NOW
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-accent/15 border border-accent/25">
                <span className="text-[9px] font-display font-bold text-accent">
                  🎯 {data.batsmanName} BOWLS NOW
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 overflow-y-auto no-scrollbar space-y-3">
        {/* Batsman Scorecard */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-3.5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🏏</span>
              <span className="font-display text-[8px] font-bold text-destructive tracking-[0.2em]">
                BATSMAN SCORECARD
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-black text-foreground">{data.batsmanName}</p>
                <p className="text-[8px] text-muted-foreground font-display mt-0.5">
                  {data.dismissalType || "out"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-black text-foreground">
                  {data.batsmanRuns}
                  <span className="text-xs text-muted-foreground ml-0.5">({data.batsmanBalls})</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <StatPill label="SR" value={strikeRate} color="primary" />
              <StatPill label="4s" value={String(data.batsmanFours)} color="accent" />
              <StatPill label="6s" value={String(data.batsmanSixes)} color="secondary" />
            </div>
          </div>
        </motion.div>

        {/* Partnership Stats */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-3.5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🤝</span>
              <span className="font-display text-[8px] font-bold text-accent tracking-[0.2em]">
                PARTNERSHIP
              </span>
            </div>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="font-display text-xl font-black text-foreground">{data.partnershipRuns}</p>
                <p className="text-[7px] text-muted-foreground font-display tracking-wider">RUNS</p>
              </div>
              <div className="w-px h-8 bg-border/20" />
              <div className="text-center">
                <p className="font-display text-xl font-black text-foreground">{data.partnershipBalls}</p>
                <p className="text-[7px] text-muted-foreground font-display tracking-wider">BALLS</p>
              </div>
              <div className="w-px h-8 bg-border/20" />
              <div className="text-center">
                <p className="font-display text-xl font-black text-accent">{partnershipRR}</p>
                <p className="text-[7px] text-muted-foreground font-display tracking-wider">RUN RATE</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bowling Spell */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-2xl p-3.5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">⚾</span>
              <span className="font-display text-[8px] font-bold text-primary tracking-[0.2em]">
                BOWLING SPELL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-black text-foreground">{data.bowlerName}</p>
              <div className="flex items-center gap-3">
                <StatPill label="W" value={String(data.bowlerWickets)} color="destructive" />
                <StatPill label="R" value={String(data.bowlerRunsConceded)} color="muted-foreground" />
                <StatPill label="OV" value={data.bowlerOvers} color="primary" />
                <StatPill label="ECON" value={bowlerEconomy} color="secondary" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Over Summary (when wicket fell on end of over) */}
        {data.overBreakStats && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="glass-card rounded-2xl p-3.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs">🏏</span>
                <span className="font-display text-[8px] font-bold text-secondary tracking-[0.2em]">
                  OVER {data.overBreakStats.oversCompleted} SUMMARY
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                {data.overBreakStats.thisOverBalls.map((ball, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-display font-bold ${
                      ball.runs === "OUT" ? "bg-destructive/20 text-destructive border border-destructive/30" :
                      typeof ball.runs === "number" && ball.runs >= 4 ? "bg-secondary/20 text-secondary border border-secondary/30" :
                      "bg-muted/15 text-muted-foreground border border-border/20"
                    }`}
                  >
                    {ball.runs === "OUT" ? "W" : ball.runs}
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4">
                <StatPill label="RUNS" value={String(data.overBreakStats.overRuns)} color="secondary" />
                <StatPill label="CRR" value={data.overBreakStats.crr} color="primary" />
                {data.target && <StatPill label="RRR" value={data.overBreakStats.rrr} color="accent" />}
              </div>
            </div>
          </motion.div>
        )}

        {/* Match Situation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: data.overBreakStats ? 0.75 : 0.6 }}
          className="glass-card rounded-2xl p-3 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
          <div className="relative z-10 flex items-center justify-around">
            <div className="text-center">
              <p className="font-display text-lg font-black text-foreground">
                {data.totalScore}<span className="text-xs text-muted-foreground">/{data.totalWickets}</span>
              </p>
              <p className="text-[7px] text-muted-foreground font-display tracking-wider">SCORE</p>
            </div>
            <div className="w-px h-8 bg-border/20" />
            <div className="text-center">
              <p className="font-display text-lg font-black text-foreground">{data.currentOver}</p>
              <p className="text-[7px] text-muted-foreground font-display tracking-wider">OVERS</p>
            </div>
            {data.target && !data.isInningsChange && (
              <>
                <div className="w-px h-8 bg-border/20" />
                <div className="text-center">
                  <p className="font-display text-lg font-black text-secondary">
                    {Math.max(0, data.target - data.totalScore)}
                  </p>
                  <p className="text-[7px] text-muted-foreground font-display tracking-wider">NEED</p>
                </div>
              </>
            )}
            {data.isInningsChange && data.newTarget && (
              <>
                <div className="w-px h-8 bg-border/20" />
                <div className="text-center">
                  <p className="font-display text-lg font-black text-secondary animate-pulse">{data.newTarget}</p>
                  <p className="text-[7px] text-muted-foreground font-display tracking-wider">TARGET</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Continue button */}
      <div className="relative z-10 p-4 pb-8">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className={`w-full py-3.5 text-primary-foreground font-display font-black text-sm rounded-2xl tracking-wider border relative overflow-hidden ${
            data.isInningsChange
              ? "bg-gradient-to-r from-secondary/80 to-secondary/50 border-secondary/30 shadow-[0_0_25px_hsl(45_93%_58%/0.15)]"
              : "bg-gradient-to-r from-primary to-primary/70 border-primary/30 shadow-[0_0_25px_hsl(217_91%_60%/0.2)]"
          }`}
        >
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: data.isInningsChange ? 8 : 5, ease: "linear" }}
            className="absolute inset-0 bg-white/10 origin-left"
          />
          <span className="relative z-10">
            {data.isInningsChange
              ? `⚡ ${data.bowlerName.toUpperCase()} BATS NOW • ${autoTimer}s`
              : `⚡ CONTINUE • ${autoTimer}s`}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-${color}/10 border border-${color}/15`}>
      <span className={`text-[6px] font-display font-bold text-${color} tracking-wider`}>{label}</span>
      <span className={`text-[9px] font-display font-bold text-${color}`}>{value}</span>
    </div>
  );
}
