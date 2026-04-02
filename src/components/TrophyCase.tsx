import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { RANK_TIERS, calculateRankPoints, getRankTier, getNextTier } from "@/lib/rankTiers";
import RankBadge from "./RankBadge";

interface ChallengeCompletion {
  id: string;
  challenge_id: string;
  completed_at: string;
  title?: string;
  description?: string;
  reward_label?: string;
}

interface RankHistoryEntry {
  id: string;
  old_tier: string;
  new_tier: string;
  points: number;
  created_at: string;
}

interface ProfileStats {
  wins: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  xp: number;
  coins: number;
  rank_tier: string;
}

export default function TrophyCase() {
  const { user } = useAuth();
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeCompletion[]>([]);
  const [rankHistory, setRankHistory] = useState<RankHistoryEntry[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activeSection, setActiveSection] = useState<"trophies" | "rank" | "rewards">("trophies");

  useEffect(() => {
    if (!user) return;

    // Fetch completed challenges with challenge details
    supabase
      .from("challenge_progress")
      .select("id, challenge_id, completed_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data || !data.length) return;
        const challengeIds = data.map((d: any) => d.challenge_id);
        const { data: challenges } = await supabase
          .from("weekly_challenges")
          .select("id, title, description, reward_label")
          .in("id", challengeIds);
        const mapped = data.map((d: any) => {
          const ch = challenges?.find((c: any) => c.id === d.challenge_id);
          return { ...d, title: ch?.title, description: ch?.description, reward_label: ch?.reward_label };
        });
        setCompletedChallenges(mapped);
      });

    // Fetch rank history
    supabase
      .from("rank_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setRankHistory(data as unknown as RankHistoryEntry[]);
      });

    // Fetch profile stats
    supabase
      .from("profiles")
      .select("wins, total_matches, high_score, best_streak, xp, coins, rank_tier")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setStats(data as unknown as ProfileStats);
      });
  }, [user]);

  if (!stats) return null;

  const currentTier = getRankTier(stats);
  const nextTierInfo = getNextTier(stats);
  const points = calculateRankPoints(stats);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const sections = [
    { key: "trophies" as const, label: "🏆 TROPHIES", count: completedChallenges.length },
    { key: "rank" as const, label: "💎 RANK", count: rankHistory.length },
    { key: "rewards" as const, label: "🪙 REWARDS", count: null },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Current Rank Card */}
      <div className={`glass-premium rounded-2xl p-4 relative overflow-hidden border ${currentTier.borderColor}`}>
        <div className={`absolute inset-0 ${currentTier.bgColor}`} />
        <div className="relative z-10 flex items-center gap-4">
          <RankBadge stats={stats} size="lg" />
          <div className="flex-1">
            <span className="text-[7px] text-muted-foreground font-display tracking-widest block">CURRENT RANK</span>
            <span className={`font-display text-lg font-black ${currentTier.color} tracking-wider`}>{currentTier.name}</span>
            <span className="font-display text-[10px] text-muted-foreground block">{points} RP</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] text-muted-foreground font-display">✨ {stats.xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-secondary font-display font-bold">🪙 {stats.coins}</span>
            </div>
          </div>
        </div>
        {/* Progress to next tier */}
        {nextTierInfo.next && (
          <div className="relative z-10 mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] text-muted-foreground font-display tracking-wider">
                → {nextTierInfo.next.emoji} {nextTierInfo.next.name}
              </span>
              <span className="text-[8px] text-primary font-display font-bold">{nextTierInfo.pointsNeeded} pts away</span>
            </div>
            <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${nextTierInfo.progress}%` }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 glass-card rounded-xl p-1">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 rounded-lg font-display text-[8px] font-bold tracking-widest transition-all ${
              activeSection === s.key ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground"
            }`}>
            {s.label}{s.count !== null ? ` (${s.count})` : ""}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Completed Challenges */}
        {activeSection === "trophies" && (
          <motion.div key="trophies" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {completedChallenges.length === 0 ? (
              <div className="glass-premium rounded-xl p-8 text-center">
                <span className="text-3xl block mb-2">🏆</span>
                <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO TROPHIES YET</span>
                <p className="text-[9px] text-muted-foreground/60 mt-1">Complete weekly challenges to earn trophies</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {completedChallenges.map((c, i) => (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-premium rounded-xl p-3 border border-score-gold/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-score-gold/15 to-transparent rounded-bl-full" />
                    <span className="text-xl block mb-1">🏆</span>
                    <span className="font-display text-[10px] font-bold text-foreground block truncate">{c.title || "Challenge"}</span>
                    <span className="text-[7px] text-muted-foreground block mt-0.5 line-clamp-2">{c.description || ""}</span>
                    {c.reward_label && (
                      <span className="text-[7px] text-score-gold font-display font-bold tracking-wider mt-1 block">🎖️ {c.reward_label}</span>
                    )}
                    <span className="text-[6px] text-muted-foreground/50 mt-1 block">{c.completed_at ? formatDate(c.completed_at) : ""}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Rank History */}
        {activeSection === "rank" && (
          <motion.div key="rank" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            {/* Rank tier progression display */}
            <div className="glass-premium rounded-xl p-3 mb-3">
              <span className="font-display text-[8px] font-bold text-muted-foreground tracking-widest block mb-2">TIER PROGRESSION</span>
              <div className="flex items-center justify-between">
                {RANK_TIERS.map((tier, idx) => {
                  const isActive = currentTier.name === tier.name;
                  const isPast = points >= tier.minPoints;
                  return (
                    <div key={tier.name} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        isActive ? `${tier.bgColor} border-2 ${tier.borderColor} ${tier.glowColor}` :
                        isPast ? `${tier.bgColor} border ${tier.borderColor}` :
                        "bg-muted/20 border border-muted/10 opacity-40"
                      }`}>
                        {tier.emoji}
                      </div>
                      <span className={`text-[6px] font-display font-bold tracking-wider ${isActive ? tier.color : "text-muted-foreground/50"}`}>
                        {tier.name.slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {rankHistory.length === 0 ? (
              <div className="glass-premium rounded-xl p-6 text-center">
                <span className="text-2xl block mb-2">📈</span>
                <span className="font-display text-[10px] font-bold text-muted-foreground tracking-wider">NO RANK CHANGES YET</span>
                <p className="text-[8px] text-muted-foreground/60 mt-1">Keep playing to rank up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rankHistory.map((r, i) => {
                  const isPromotion = RANK_TIERS.findIndex(t => t.name === r.new_tier) > RANK_TIERS.findIndex(t => t.name === r.old_tier);
                  return (
                    <motion.div key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`glass-premium rounded-xl p-3 flex items-center gap-3 border ${isPromotion ? "border-neon-green/20" : "border-out-red/20"}`}
                    >
                      <span className="text-xl">{isPromotion ? "⬆️" : "⬇️"}</span>
                      <div className="flex-1">
                        <span className="font-display text-[10px] font-bold text-foreground tracking-wider">
                          {r.old_tier} → {r.new_tier}
                        </span>
                        <span className="text-[7px] text-muted-foreground block">{r.points} RP • {formatDate(r.created_at)}</span>
                      </div>
                      <span className={`font-display text-[9px] font-bold ${isPromotion ? "text-neon-green" : "text-out-red"}`}>
                        {isPromotion ? "PROMOTED" : "DEMOTED"}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Rewards (XP/Coins) */}
        {activeSection === "rewards" && (
          <motion.div key="rewards" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass-premium rounded-xl p-4 text-center border border-primary/20">
                <span className="text-2xl block mb-1">✨</span>
                <span className="font-display text-2xl font-black text-primary">{stats.xp}</span>
                <span className="text-[7px] text-muted-foreground font-display tracking-widest block mt-1">TOTAL XP</span>
              </div>
              <div className="glass-premium rounded-xl p-4 text-center border border-secondary/20">
                <span className="text-2xl block mb-1">🪙</span>
                <span className="font-display text-2xl font-black text-secondary">{stats.coins}</span>
                <span className="text-[7px] text-muted-foreground font-display tracking-widest block mt-1">COINS</span>
              </div>
            </div>

            {/* Earning rates */}
            <div className="glass-premium rounded-xl p-3">
              <span className="font-display text-[8px] font-bold text-muted-foreground tracking-widest block mb-2">EARNINGS PER MATCH</span>
              <div className="space-y-2">
                {[
                  { label: "Win", xp: "+30 XP", coins: "+50 🪙", color: "text-neon-green" },
                  { label: "Loss", xp: "+10 XP", coins: "+10 🪙", color: "text-out-red" },
                  { label: "Draw", xp: "+15 XP", coins: "+20 🪙", color: "text-secondary" },
                  { label: "Challenge Complete", xp: "+50 XP", coins: "+100 🪙", color: "text-primary" },
                  { label: "Rank Up", xp: "+100 XP", coins: "+200 🪙", color: "text-score-gold" },
                ].map(e => (
                  <div key={e.label} className="flex items-center justify-between py-1 border-b border-muted/10 last:border-0">
                    <span className={`text-[9px] font-display font-bold ${e.color}`}>{e.label}</span>
                    <div className="flex gap-3">
                      <span className="text-[8px] text-primary font-display">{e.xp}</span>
                      <span className="text-[8px] text-secondary font-display">{e.coins}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
