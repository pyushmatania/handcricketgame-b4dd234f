import { motion } from "framer-motion";
import { getRankTier, getNextTier, calculateRankPoints, RANK_TIERS } from "@/lib/rankTiers";

interface Props {
  stats: { wins: number; total_matches: number; high_score: number; best_streak: number };
  compact?: boolean;
}

export default function RankBadge({ stats, compact = false }: Props) {
  const tier = getRankTier(stats);
  const { next, progress, pointsNeeded } = getNextTier(stats);
  const points = calculateRankPoints(stats);

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${tier.bgColor} border ${tier.borderColor} ${tier.glowColor}`}>
        <span className="text-xs">{tier.emoji}</span>
        <span className={`font-display text-[8px] font-black ${tier.color} tracking-wider`}>{tier.name.toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div className={`glass-premium rounded-xl p-3 border ${tier.borderColor} ${tier.glowColor} relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute inset-0 ${tier.bgColor} pointer-events-none`} />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-3xl"
          >
            {tier.emoji}
          </motion.div>
          <div>
            <span className={`font-display text-sm font-black ${tier.color} tracking-wider block`}>
              {tier.name.toUpperCase()}
            </span>
            <span className="text-[8px] text-muted-foreground font-display tracking-widest">
              {points} RP
            </span>
          </div>
        </div>

        {next && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-muted-foreground font-display tracking-wider">
                Next: {next.emoji} {next.name}
              </span>
              <span className="text-[8px] text-muted-foreground font-mono">{pointsNeeded} RP needed</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r ${
                  tier.name === "Bronze" ? "from-amber-700 to-amber-500" :
                  tier.name === "Silver" ? "from-gray-400 to-gray-300" :
                  tier.name === "Gold" ? "from-score-gold to-yellow-400" :
                  tier.name === "Diamond" ? "from-cyan-500 to-cyan-300" :
                  "from-primary to-accent"
                }`}
              />
            </div>
          </div>
        )}

        {!next && (
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <span className="text-[8px] text-primary font-display font-bold tracking-widest">MAX RANK ACHIEVED</span>
          </div>
        )}
      </div>
    </div>
  );
}
