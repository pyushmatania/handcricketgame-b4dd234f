import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FriendProfile {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  abandons: number;
}

interface H2HStats {
  myWins: number;
  theirWins: number;
  draws: number;
  totalGames: number;
  myHighScore: number;
  theirHighScore: number;
  lastPlayed: string | null;
}

interface Props {
  friend: FriendProfile;
  onChallenge: (friendId: string) => void;
}

export default function RivalryCard({ friend, onChallenge }: Props) {
  const { user } = useAuth();
  const [h2h, setH2h] = useState<H2HStats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadH2H();
  }, [user, friend.user_id]);

  const loadH2H = async () => {
    if (!user) return;
    // Get all multiplayer games between these two players
    const { data } = await supabase
      .from("multiplayer_games")
      .select("*")
      .or(`and(host_id.eq.${user.id},guest_id.eq.${friend.user_id}),and(host_id.eq.${friend.user_id},guest_id.eq.${user.id})`)
      .in("status", ["finished", "abandoned"]);

    if (!data || data.length === 0) {
      setH2h({ myWins: 0, theirWins: 0, draws: 0, totalGames: 0, myHighScore: 0, theirHighScore: 0, lastPlayed: null });
      return;
    }

    let myWins = 0, theirWins = 0, draws = 0, myHighScore = 0, theirHighScore = 0;
    data.forEach((g: any) => {
      const isHost = g.host_id === user.id;
      const myScore = isHost ? g.host_score : g.guest_score;
      const theirScore = isHost ? g.guest_score : g.host_score;
      if (myScore > myHighScore) myHighScore = myScore;
      if (theirScore > theirHighScore) theirHighScore = theirScore;
      if (g.winner_id === user.id) myWins++;
      else if (g.winner_id === friend.user_id) theirWins++;
      else draws++;
    });

    setH2h({
      myWins, theirWins, draws,
      totalGames: data.length,
      myHighScore, theirHighScore,
      lastPlayed: data[0]?.created_at || null,
    });
  };

  const total = h2h ? h2h.myWins + h2h.theirWins + h2h.draws : 0;
  const myPct = total > 0 ? Math.round((h2h!.myWins / total) * 100) : 50;
  const theirPct = total > 0 ? Math.round((h2h!.theirWins / total) * 100) : 50;
  const isBetter = h2h && h2h.myWins > h2h.theirWins;
  const isWorse = h2h && h2h.theirWins > h2h.myWins;

  return (
    <motion.div
      layout
      onClick={() => setExpanded(!expanded)}
      className="glass-premium rounded-xl overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
          isBetter ? "bg-neon-green/10 border-neon-green/20" : isWorse ? "bg-out-red/10 border-out-red/20" : "bg-secondary/10 border-secondary/20"
        }`}>
          <span className="text-lg">{isBetter ? "👑" : isWorse ? "😤" : "⚔️"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-display text-[11px] font-bold text-foreground block truncate">{friend.display_name}</span>
          <span className="text-[8px] text-muted-foreground font-display">
            {total > 0 ? `${total} matches played` : "No matches yet"}
          </span>
        </div>
        {h2h && total > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-black text-neon-green">{h2h.myWins}</span>
            <span className="text-[8px] text-muted-foreground">-</span>
            <span className="font-display text-sm font-black text-out-red">{h2h.theirWins}</span>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); onChallenge(friend.user_id); }}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[8px] font-bold tracking-wider"
        >
          ⚔️ CHALLENGE
        </motion.button>
      </div>

      {/* Expanded details */}
      {expanded && h2h && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3 space-y-3"
        >
          {total > 0 ? (
            <>
              {/* W/L bar */}
              <div>
                <div className="flex justify-between text-[7px] font-display font-bold mb-1">
                  <span className="text-neon-green">YOU {myPct}%</span>
                  {h2h.draws > 0 && <span className="text-secondary">{h2h.draws} DRAWS</span>}
                  <span className="text-out-red">{friend.display_name.toUpperCase()} {theirPct}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/30">
                  <div className="bg-gradient-to-r from-neon-green to-neon-green/70 rounded-l-full" style={{ width: `${myPct}%` }} />
                  <div className="bg-gradient-to-l from-out-red to-out-red/70 rounded-r-full flex-1" />
                </div>
              </div>

              {/* Stat comparison grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "HIGH SCORE", mine: h2h.myHighScore, theirs: h2h.theirHighScore },
                  { label: "WINS", mine: h2h.myWins, theirs: h2h.theirWins },
                  { label: "OVERALL WR", mine: friend.total_matches > 0 ? `${Math.round((friend.wins / friend.total_matches) * 100)}%` : "0%", theirs: null },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-lg p-2 text-center">
                    <span className="text-[6px] font-display text-muted-foreground tracking-widest block mb-1">{s.label}</span>
                    {s.theirs !== null ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-display text-xs font-black ${typeof s.mine === "number" && typeof s.theirs === "number" && s.mine > s.theirs ? "text-neon-green" : "text-foreground"}`}>
                          {s.mine}
                        </span>
                        <span className="text-[6px] text-muted-foreground">vs</span>
                        <span className={`font-display text-xs font-black ${typeof s.mine === "number" && typeof s.theirs === "number" && s.theirs > s.mine ? "text-out-red" : "text-foreground"}`}>
                          {s.theirs}
                        </span>
                      </div>
                    ) : (
                      <span className="font-display text-xs font-black text-foreground">{s.mine}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Verdict */}
              <div className={`text-center py-2 rounded-lg ${isBetter ? "bg-neon-green/5 border border-neon-green/10" : isWorse ? "bg-out-red/5 border border-out-red/10" : "bg-secondary/5 border border-secondary/10"}`}>
                <span className="font-display text-[9px] font-bold tracking-wider">
                  {isBetter ? `🔥 YOU DOMINATE ${friend.display_name.toUpperCase()}` :
                   isWorse ? `😤 ${friend.display_name.toUpperCase()} HAS YOUR NUMBER` :
                   "🤝 EVENLY MATCHED"}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <span className="text-2xl block mb-1">🏏</span>
              <span className="text-[9px] font-display text-muted-foreground">No matches yet — challenge them!</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
