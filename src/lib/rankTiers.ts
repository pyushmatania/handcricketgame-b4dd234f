// Rank tier system based on player performance

export interface RankTier {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  minPoints: number;
}

export const RANK_TIERS: RankTier[] = [
  { name: "Bronze", emoji: "🥉", color: "text-amber-600", bgColor: "bg-amber-900/20", borderColor: "border-amber-700/30", glowColor: "shadow-[0_0_12px_hsl(30_60%_40%/0.2)]", minPoints: 0 },
  { name: "Silver", emoji: "🥈", color: "text-gray-300", bgColor: "bg-gray-500/15", borderColor: "border-gray-400/30", glowColor: "shadow-[0_0_12px_hsl(0_0%_70%/0.2)]", minPoints: 50 },
  { name: "Gold", emoji: "🏅", color: "text-score-gold", bgColor: "bg-score-gold/10", borderColor: "border-score-gold/30", glowColor: "shadow-[0_0_15px_hsl(45_93%_47%/0.25)]", minPoints: 150 },
  { name: "Diamond", emoji: "💎", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-400/30", glowColor: "shadow-[0_0_20px_hsl(192_91%_60%/0.3)]", minPoints: 400 },
  { name: "Champion", emoji: "👑", color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30", glowColor: "shadow-[0_0_25px_hsl(217_91%_60%/0.3)]", minPoints: 800 },
];

export function calculateRankPoints(stats: { wins: number; total_matches: number; high_score: number; best_streak: number }): number {
  const winRate = stats.total_matches > 0 ? stats.wins / stats.total_matches : 0;
  return Math.floor(
    stats.wins * 3 +
    stats.total_matches * 0.5 +
    stats.high_score * 0.2 +
    stats.best_streak * 5 +
    winRate * 100
  );
}

export function getRankTier(stats: { wins: number; total_matches: number; high_score: number; best_streak: number }): RankTier {
  const points = calculateRankPoints(stats);
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return tier;
}

export function getNextTier(stats: { wins: number; total_matches: number; high_score: number; best_streak: number }): { next: RankTier | null; progress: number; pointsNeeded: number } {
  const points = calculateRankPoints(stats);
  const currentIdx = RANK_TIERS.findIndex((t, i) => {
    const next = RANK_TIERS[i + 1];
    return !next || points < next.minPoints;
  });

  if (currentIdx >= RANK_TIERS.length - 1) {
    return { next: null, progress: 100, pointsNeeded: 0 };
  }

  const current = RANK_TIERS[currentIdx];
  const next = RANK_TIERS[currentIdx + 1];
  const range = next.minPoints - current.minPoints;
  const progress = Math.min(100, Math.floor(((points - current.minPoints) / range) * 100));
  return { next, progress, pointsNeeded: next.minPoints - points };
}
