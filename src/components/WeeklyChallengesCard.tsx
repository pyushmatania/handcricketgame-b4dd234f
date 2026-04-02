import { motion } from "framer-motion";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankBadge from "@/components/RankBadge";
import { useAuth } from "@/contexts/AuthContext";

interface ChallengeDisplay {
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  completed: boolean;
  reward_label: string;
}

interface FriendRanking {
  user_id: string;
  display_name: string;
  avatar_index: number;
  completed_count: number;
  total_progress: number;
}

interface Props {
  challenges: ChallengeDisplay[];
  friendRankings: FriendRanking[];
  loading: boolean;
}

export default function WeeklyChallengesCard({ challenges, friendRankings, loading }: Props) {
  const { user } = useAuth();
  const completedCount = challenges.filter(c => c.completed).length;
  const daysLeft = (() => {
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 0 : 7 - day;
  })();

  if (loading) {
    return (
      <div className="glass-premium rounded-xl p-6 text-center animate-pulse">
        <span className="text-2xl block mb-2">⏳</span>
        <span className="text-[10px] text-muted-foreground font-display">Loading challenges...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass-premium rounded-xl p-3 border border-secondary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="font-display text-[10px] font-black text-foreground tracking-wider">WEEKLY CHALLENGES</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20 border border-border/30">
            <span className="text-[8px] text-muted-foreground font-display">{daysLeft}d left</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / challenges.length) * 100}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-green/60"
            />
          </div>
          <span className="text-[9px] font-display font-bold text-neon-green">{completedCount}/{challenges.length}</span>
        </div>
      </div>

      {/* Challenge cards */}
      {challenges.map((c, i) => {
        const pct = Math.min(100, Math.round((c.current_value / c.target_value) * 100));
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass-premium rounded-xl p-3 border ${c.completed ? "border-neon-green/30" : "border-border/20"} relative overflow-hidden`}
          >
            {c.completed && (
              <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-neon-green/20">
                <span className="text-[7px] font-display font-bold text-neon-green tracking-wider">✓ DONE</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                c.completed ? "bg-neon-green/15 border border-neon-green/30" : "bg-secondary/10 border border-secondary/20"
              }`}>
                {c.completed ? "✅" : "🎯"}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-display text-[10px] font-bold text-foreground block">{c.title}</span>
                <span className="text-[8px] text-muted-foreground block">{c.description}</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${c.completed ? "bg-neon-green" : "bg-secondary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground">{c.current_value}/{c.target_value}</span>
                </div>
              </div>
            </div>
            {c.reward_label && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[7px] text-muted-foreground/60 font-display">REWARD:</span>
                <span className="text-[8px] font-display font-bold text-score-gold">{c.reward_label}</span>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Friend rankings */}
      {friendRankings.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-secondary" />
            <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">FRIEND CHALLENGE RANKINGS</span>
          </div>
          <div className="space-y-1.5">
            {friendRankings.map((f, i) => {
              const isMe = user?.id === f.user_id;
              return (
                <motion.div
                  key={f.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-premium rounded-xl p-2.5 flex items-center gap-2.5 ${isMe ? "border border-primary/20" : ""}`}
                >
                  <span className="font-display text-[10px] font-black text-muted-foreground w-6 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <PlayerAvatar avatarIndex={f.avatar_index} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className={`font-display text-[10px] font-bold block truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                      {f.display_name}
                      {isMe && <span className="text-[7px] text-primary/60 ml-1">(YOU)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-display font-bold text-neon-green">{f.completed_count}</span>
                    <span className="text-[7px] text-muted-foreground">/3 done</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
