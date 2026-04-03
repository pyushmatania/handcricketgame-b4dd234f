import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDailyLogin } from "@/hooks/useDailyLogin";

export default function DailyStreakWidget() {
  const { streak, todayClaimed, STREAK_REWARDS } = useDailyLogin();
  const navigate = useNavigate();

  if (!todayClaimed) return null;

  const cycleDay = ((streak - 1) % 7) + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="mb-4 cursor-pointer"
      onClick={() => navigate("/daily-rewards")}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 rounded-full bg-secondary" />
        <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.2em]">
          🔥 DAILY STREAK — DAY {streak}
        </h2>
      </div>

      <div className="glass-premium rounded-2xl p-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-secondary/10 to-transparent rounded-bl-full" />

        <div className="flex gap-1 relative z-10">
          {STREAK_REWARDS.map((r, i) => {
            const day = i + 1;
            const isCurrent = day === cycleDay;
            const isPast = day < cycleDay;
            const isFuture = day > cycleDay;

            return (
              <div
                key={day}
                className={`flex-1 rounded-lg p-1.5 text-center transition-all ${
                  isCurrent
                    ? "bg-secondary/20 border border-secondary/30 shadow-[0_0_12px_hsl(45_93%_58%/0.15)]"
                    : isPast
                    ? "bg-neon-green/10 border border-neon-green/20"
                    : "bg-muted/10 border border-muted/10"
                }`}
              >
                <span className="text-[10px] block">
                  {isPast ? "✅" : isCurrent ? "🔥" : "🔒"}
                </span>
                <span
                  className={`text-[6px] font-display font-bold tracking-wider block mt-0.5 ${
                    isCurrent ? "text-secondary" : isPast ? "text-neon-green" : "text-muted-foreground/40"
                  }`}
                >
                  D{day}
                </span>
                <span
                  className={`text-[5px] font-display block ${
                    isFuture ? "text-muted-foreground/30" : "text-muted-foreground/60"
                  }`}
                >
                  +{r.coins}🪙
                </span>
              </div>
            );
          })}
        </div>

        {streak >= 7 && (
          <div className="mt-2 text-center relative z-10">
            <span className="text-[7px] font-display font-bold text-secondary tracking-wider">
              🏆 BEST: {streak} DAYS — REWARDS CYCLE RESET!
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
