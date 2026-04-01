import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

interface LeaderEntry {
  display_name: string;
  wins: number;
  high_score: number;
  total_matches: number;
  user_id: string;
}

const TABS = ["ALL TIME", "MOST WINS", "HIGH SCORE"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    const orderCol = activeTab === 2 ? "high_score" : "wins";

    const { data } = await supabase
      .from("profiles")
      .select("display_name, wins, high_score, total_matches, user_id")
      .gt("total_matches", 0)
      .order(orderCol, { ascending: false })
      .limit(20);

    if (data) {
      setLeaders(data);
      if (user) {
        const idx = data.findIndex((p) => p.user_id === user.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    }
  };

  const getBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getScore = (entry: LeaderEntry) => {
    return activeTab === 2 ? entry.high_score : entry.wins;
  };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-secondary" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">
              LEADERBOARD
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-3">Top players worldwide</p>
        </motion.div>

        {/* Tab selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-5 bg-muted/30 p-1 rounded-xl"
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 px-3 py-2 rounded-lg font-display text-[9px] font-bold tracking-wider transition-all ${
                activeTab === i
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {leaders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-score p-8 text-center"
          >
            <span className="text-4xl block mb-3">🏟️</span>
            <p className="font-display text-sm font-bold text-foreground">No players yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Be the first to play!</p>
          </motion.div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-end justify-center gap-3 mb-5"
              >
                {[top3[1], top3[0], top3[2]].map((p, i) => {
                  const heights = ["h-20", "h-28", "h-16"];
                  const sizes = ["text-3xl", "text-4xl", "text-2xl"];
                  const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                  return (
                    <div key={p.user_id} className="flex flex-col items-center">
                      <span className={`${sizes[i]} mb-2`}>{getBadge(rank)}</span>
                      <div className={`w-16 ${heights[i]} rounded-t-xl bg-gradient-to-t from-primary/10 to-primary/5 border border-primary/15 border-b-0 flex flex-col items-center justify-end pb-2`}>
                        <span className="font-display text-lg font-black text-score-gold leading-none">
                          {getScore(p)}
                        </span>
                        <span className="text-[7px] text-muted-foreground font-display mt-0.5">
                          {activeTab === 2 ? "RUNS" : "WINS"}
                        </span>
                      </div>
                      <div className="w-16 bg-muted/50 border border-glass border-t-0 rounded-b-lg py-1.5 text-center">
                        <span className="text-[8px] font-display font-bold text-foreground block truncate px-1">
                          {p.display_name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {rest.map((player, i) => (
                <motion.div
                  key={player.user_id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className={`glass-score p-3 flex items-center gap-3 ${
                    user && player.user_id === user.id ? "border border-primary/30" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-display font-black text-xs text-muted-foreground">
                    #{i + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display text-sm font-bold text-foreground block">
                      {player.display_name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {player.total_matches} matches
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-lg font-black text-score-gold block leading-none">
                      {getScore(player)}
                    </span>
                    <span className="text-[7px] text-muted-foreground font-display">
                      {activeTab === 2 ? "RUNS" : "WINS"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Your position */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 glass-premium p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-lg">{user ? "🏏" : "👤"}</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground font-display tracking-wider">YOUR RANK</p>
            <p className="font-display text-xl font-black text-foreground">
              {myRank ? `#${myRank}` : "—"}
            </p>
          </div>
          {!user && (
            <p className="text-[9px] text-muted-foreground">Sign in to track</p>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
