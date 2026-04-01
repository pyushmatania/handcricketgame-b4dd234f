import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

interface LeaderEntry {
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  high_score: number;
  total_matches: number;
  best_streak: number;
  abandons: number;
  user_id: string;
}

type MainTab = "global" | "friends" | "rage";

const SORT_OPTIONS = [
  { label: "WINS", icon: "🏆", key: "wins" as const },
  { label: "HIGH SCORE", icon: "⭐", key: "high_score" as const },
  { label: "MATCHES", icon: "🏏", key: "total_matches" as const },
  { label: "STREAK", icon: "🔥", key: "best_streak" as const },
];

const RAGE_TITLES = [
  { title: "🏆 Comeback King", desc: "Highest best streak", stat: (e: LeaderEntry) => e.best_streak, label: "streak" },
  { title: "🦆 Duck Master", desc: "Most losses", stat: (e: LeaderEntry) => e.losses, label: "losses" },
  { title: "🏳️ Rage Quitter", desc: "Most abandoned matches", stat: (e: LeaderEntry) => e.abandons, label: "abandons" },
  { title: "🏏 Grinder", desc: "Most matches played", stat: (e: LeaderEntry) => e.total_matches, label: "matches" },
  { title: "💯 Big Hitter", desc: "Highest score ever", stat: (e: LeaderEntry) => e.high_score, label: "runs" },
  { title: "🤝 Peacemaker", desc: "Most draws", stat: (e: LeaderEntry) => e.draws, label: "draws" },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>("global");
  const [sortBy, setSortBy] = useState(0);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [friendLeaders, setFriendLeaders] = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (mainTab === "global" || mainTab === "rage") loadGlobal();
    if (mainTab === "friends") loadFriends();
  }, [mainTab, sortBy]);

  const loadGlobal = async () => {
    const col = SORT_OPTIONS[sortBy].key;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, wins, losses, draws, high_score, total_matches, best_streak, abandons, user_id")
      .gt("total_matches", 0)
      .order(col, { ascending: false })
      .limit(50);
    if (data) {
      setLeaders(data as unknown as LeaderEntry[]);
      if (user) {
        const idx = data.findIndex((p: any) => p.user_id === user.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: friendRows } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!friendRows) { setFriendLeaders([]); return; }
    const ids = [user.id, ...friendRows.map((f: any) => f.friend_id)];
    const col = SORT_OPTIONS[sortBy].key;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, wins, losses, draws, high_score, total_matches, best_streak, abandons, user_id")
      .in("user_id", ids)
      .order(col, { ascending: false });
    if (data) setFriendLeaders(data as unknown as LeaderEntry[]);
  };

  const getBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getScore = (entry: LeaderEntry) => {
    const k = SORT_OPTIONS[sortBy].key;
    return entry[k];
  };

  const activeList = mainTab === "friends" ? friendLeaders : leaders;
  const top3 = activeList.slice(0, 3);
  const rest = activeList.slice(3);

  const mainTabs: { key: MainTab; label: string; icon: string }[] = [
    { key: "global", label: "GLOBAL", icon: "🌍" },
    { key: "friends", label: "FRIENDS", icon: "👥" },
    { key: "rage", label: "RAGE", icon: "😤" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(45 93% 58% / 0.05) 0%, transparent 70%)" }} />

      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-secondary to-secondary/40" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">LEADERBOARD</h1>
          </div>
        </motion.div>

        {/* Main tab switcher */}
        <div className="flex gap-1 mb-3 glass-card rounded-xl p-1">
          {mainTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all flex items-center justify-center gap-1 ${
                mainTab === t.key
                  ? "bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary border border-secondary/20"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort options (for global & friends) */}
        {mainTab !== "rage" && (
          <div className="flex gap-1 mb-4">
            {SORT_OPTIONS.map((opt, i) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(i)}
                className={`flex-1 py-1.5 rounded-lg font-display text-[7px] font-bold tracking-widest transition-all ${
                  sortBy === i
                    ? "bg-primary/10 text-primary border border-primary/15"
                    : "text-muted-foreground/50"
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* RAGE STATS */}
          {mainTab === "rage" && (
            <motion.div
              key="rage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {RAGE_TITLES.map((rt, i) => {
                const sorted = [...leaders].sort((a, b) => rt.stat(b) - rt.stat(a));
                const winner = sorted[0];
                if (!winner || rt.stat(winner) === 0) return null;
                const runnerUp = sorted[1];
                return (
                  <motion.div
                    key={rt.title}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="glass-premium rounded-xl p-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-secondary/5 to-transparent rounded-bl-full" />
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{rt.title.split(" ")[0]}</span>
                      <div>
                        <span className="font-display text-[11px] font-black text-foreground block">{rt.title.split(" ").slice(1).join(" ")}</span>
                        <span className="text-[8px] text-muted-foreground">{rt.desc}</span>
                      </div>
                    </div>
                    {/* Winner */}
                    <div className="flex items-center gap-3 glass-card rounded-xl p-2.5 mb-1.5">
                      <span className="text-lg">🥇</span>
                      <div className="flex-1">
                        <span className="font-display text-[10px] font-bold text-foreground">
                          {winner.display_name}
                          {user && winner.user_id === user.id && <span className="text-primary/60 ml-1">(YOU)</span>}
                        </span>
                      </div>
                      <span className="font-display text-lg font-black text-secondary">{rt.stat(winner)}</span>
                      <span className="text-[7px] text-muted-foreground font-display">{rt.label}</span>
                    </div>
                    {/* Runner up */}
                    {runnerUp && rt.stat(runnerUp) > 0 && (
                      <div className="flex items-center gap-3 px-2.5 py-1.5 opacity-60">
                        <span className="text-sm">🥈</span>
                        <span className="font-display text-[9px] text-muted-foreground flex-1">{runnerUp.display_name}</span>
                        <span className="font-display text-sm font-bold text-muted-foreground">{rt.stat(runnerUp)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* GLOBAL & FRIENDS RANKINGS */}
          {mainTab !== "rage" && (
            <motion.div
              key={`${mainTab}-${sortBy}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeList.length === 0 ? (
                <div className="glass-premium rounded-2xl p-8 text-center">
                  <span className="text-4xl block mb-3">{mainTab === "friends" ? "👥" : "🏟️"}</span>
                  <p className="font-display text-sm font-bold text-foreground">
                    {mainTab === "friends" ? "Add friends to see rankings!" : "No players yet"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {mainTab === "friends" ? "Go to the Friends tab to add players" : "Be the first to play!"}
                  </p>
                </div>
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
                        const heights = ["h-24", "h-32", "h-20"];
                        const sizes = ["text-3xl", "text-4xl", "text-2xl"];
                        const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                        const isMe = user && p.user_id === user.id;
                        const glows = [
                          "shadow-[0_0_15px_hsl(192_91%_70%/0.15)]",
                          "shadow-[0_0_25px_hsl(45_93%_58%/0.2)]",
                          "shadow-[0_0_10px_hsl(30_70%_55%/0.1)]",
                        ];
                        return (
                          <div key={p.user_id} className="flex flex-col items-center">
                            <span className={`${sizes[i]} mb-2`}>{getBadge(rank)}</span>
                            <div className={`w-18 ${heights[i]} rounded-t-2xl glass-premium border ${isMe ? "border-primary/30" : "border-primary/10"} flex flex-col items-center justify-end pb-3 px-2 ${glows[i]}`}>
                              <span className="font-display text-xl font-black text-secondary leading-none" style={{ textShadow: "0 0 15px hsl(45 93% 58% / 0.3)" }}>
                                {getScore(p)}
                              </span>
                              <span className="text-[6px] text-muted-foreground font-display tracking-widest mt-0.5">
                                {SORT_OPTIONS[sortBy].label}
                              </span>
                            </div>
                            <div className="w-18 glass-card border-t-0 rounded-b-xl py-2 text-center">
                              <span className={`text-[7px] font-display font-bold block truncate px-1 ${isMe ? "text-primary" : "text-foreground"}`}>
                                {p.display_name}
                                {isMe && " ★"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* List */}
                  <div className="space-y-2">
                    {rest.map((player, i) => {
                      const isMe = user && player.user_id === user.id;
                      const winRate = player.total_matches > 0 ? Math.round((player.wins / player.total_matches) * 100) : 0;
                      return (
                        <motion.div
                          key={player.user_id}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.04 }}
                          className={`glass-premium rounded-xl p-3 flex items-center gap-3 ${isMe ? "border border-primary/25 shadow-[0_0_15px_hsl(217_91%_60%/0.1)]" : ""}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs ${isMe ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                            #{i + 4}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`font-display text-[11px] font-bold block ${isMe ? "text-primary" : "text-foreground"}`}>
                              {player.display_name}
                              {isMe && <span className="text-[7px] text-primary/60 ml-1">(YOU)</span>}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-display">
                              {player.total_matches} matches • {winRate}% WR
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-display text-lg font-black text-secondary block leading-none">
                              {getScore(player)}
                            </span>
                            <span className="text-[6px] text-muted-foreground font-display tracking-widest">
                              {SORT_OPTIONS[sortBy].label}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your position (global only) */}
        {mainTab === "global" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 glass-premium rounded-2xl p-4 flex items-center gap-3 border border-primary/10"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center">
              <span className="text-lg">{user ? "🏏" : "👤"}</span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-muted-foreground font-display tracking-[0.2em]">YOUR RANK</p>
              <p className="font-display text-2xl font-black text-foreground" style={{ textShadow: myRank ? "0 0 15px hsl(217 91% 60% / 0.2)" : "none" }}>
                {myRank ? `#${myRank}` : "—"}
              </p>
            </div>
            {!user && (
              <p className="text-[8px] text-muted-foreground font-display tracking-wider">Sign in to track</p>
            )}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
