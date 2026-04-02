import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PlayerAvatar from "@/components/PlayerAvatar";
import { RivalData } from "@/hooks/useRivals";
import {
  createMultiplayerRoom,
  logPostgrestError,
} from "@/lib/multiplayerRoom";
import { toast } from "sonner";

interface Props {
  rivals: RivalData[];
  loading: boolean;
}

export default function RivalrySection({ rivals, loading }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (rivals.length === 0) return null;

  const challengeRival = async (rivalId: string) => {
    if (!user) return;
    const { data: game, error } = await createMultiplayerRoom(user.id, "tap", rivalId);
    if (error || !game) {
      if (error) logPostgrestError("rivalry challenge failed", error, {});
      toast.error("Couldn't create match. Try again!");
      return;
    }
    const invitePayload = {
      game_id: (game as any).id,
      from_user_id: user.id,
      to_user_id: rivalId,
      game_type: "tap",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    } as any;
    await supabase.from("match_invites").insert(invitePayload);
    toast.success("⚔️ Challenge sent to your rival!");
    navigate(`/game/multiplayer?game=${(game as any).id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-out-red" />
        <h2 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.2em]">
          🔥 YOUR RIVALS
        </h2>
      </div>

      <div className="space-y-2">
        {rivals.map((r, i) => {
          const isBetter = r.myWins > r.theirWins;
          const isWorse = r.theirWins > r.myWins;
          const total = r.myWins + r.theirWins + r.draws;
          const myPct = total > 0 ? Math.round((r.myWins / total) * 100) : 50;

          const nudgeText = isWorse
            ? `😤 ${r.displayName} leads ${r.theirWins}-${r.myWins}… time to respond!`
            : isBetter
            ? `👑 You lead ${r.myWins}-${r.theirWins} — keep dominating!`
            : `⚔️ Tied ${r.myWins}-${r.theirWins} — who breaks the deadlock?`;

          const streakText =
            r.currentStreak > 0
              ? `🔥 ${r.currentStreak}W streak`
              : r.currentStreak < 0
              ? `💀 ${Math.abs(r.currentStreak)}L streak`
              : "";

          return (
            <motion.div
              key={r.odId}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className={`glass-premium rounded-2xl p-3 relative overflow-hidden border transition-all ${
                isWorse
                  ? "border-out-red/20 shadow-[0_0_20px_hsl(0_72%_51%/0.08)]"
                  : isBetter
                  ? "border-neon-green/20 shadow-[0_0_20px_hsl(142_71%_45%/0.08)]"
                  : "border-secondary/20"
              }`}
            >
              {/* Ambient glow */}
              <div
                className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${
                  isWorse ? "bg-out-red/5" : isBetter ? "bg-neon-green/5" : "bg-secondary/5"
                }`}
              />

              {/* Top row: avatar, name, H2H score, challenge */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <PlayerAvatar
                    avatarUrl={r.avatarUrl}
                    avatarIndex={r.avatarIndex}
                    size="sm"
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[8px] ${
                      isWorse
                        ? "bg-out-red/20 border border-out-red/30"
                        : isBetter
                        ? "bg-neon-green/20 border border-neon-green/30"
                        : "bg-secondary/20 border border-secondary/30"
                    }`}
                  >
                    {isWorse ? "😤" : isBetter ? "👑" : "⚔️"}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[11px] font-bold text-foreground truncate">
                      {r.displayName}
                    </span>
                    <span className="text-[7px] font-display text-muted-foreground/60 tracking-wider">
                      {r.rankTier.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] text-muted-foreground font-display">
                      {total} matches
                    </span>
                    <div className="flex gap-0.5">
                      {r.recentForm.map((f, fi) => (
                        <div
                          key={fi}
                          className={`w-2 h-2 rounded-full ${
                            f === "W"
                              ? "bg-neon-green"
                              : f === "L"
                              ? "bg-out-red"
                              : "bg-secondary"
                          }`}
                        />
                      ))}
                    </div>
                    {streakText && (
                      <span className="text-[7px] font-display font-bold text-muted-foreground">
                        {streakText}
                      </span>
                    )}
                  </div>
                </div>

                {/* H2H Score */}
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="font-display text-base font-black text-neon-green">
                    {r.myWins}
                  </span>
                  <span className="text-[8px] text-muted-foreground font-display">-</span>
                  <span className="font-display text-base font-black text-out-red">
                    {r.theirWins}
                  </span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => challengeRival(r.odId)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-out-red to-out-red/70 text-white font-display text-[8px] font-bold tracking-wider shrink-0"
                >
                  ⚔️
                </motion.button>
              </div>

              {/* W/L Progress Bar */}
              <div className="mt-2.5 relative z-10">
                <div className="h-1.5 rounded-full overflow-hidden flex bg-muted/20">
                  <div
                    className="bg-gradient-to-r from-neon-green to-neon-green/60 rounded-l-full transition-all"
                    style={{ width: `${myPct}%` }}
                  />
                  <div className="bg-gradient-to-l from-out-red to-out-red/60 rounded-r-full flex-1" />
                </div>
              </div>

              {/* Nudge text */}
              <div className="mt-2 relative z-10">
                <span className="text-[8px] font-display font-bold text-muted-foreground tracking-wide">
                  {nudgeText}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
