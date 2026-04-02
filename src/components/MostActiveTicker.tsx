import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PlayerAvatar from "./PlayerAvatar";

interface ActivePlayer {
  user_id: string;
  display_name: string;
  avatar_index: number;
  avatar_url: string | null;
  current_streak: number;
  todayWins: number;
  todayMatches: number;
}

export default function MostActiveTicker() {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const loadActive = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: matches } = await supabase
      .from("matches")
      .select("user_id, result")
      .gte("created_at", todayStart.toISOString());

    if (!matches || !matches.length) { setPlayers([]); return; }

    const stats: Record<string, { wins: number; matches: number }> = {};
    for (const m of matches) {
      if (!stats[m.user_id]) stats[m.user_id] = { wins: 0, matches: 0 };
      stats[m.user_id].matches++;
      if (m.result === "win") stats[m.user_id].wins++;
    }

    // Filter players with at least 1 win today
    const activeIds = Object.entries(stats)
      .filter(([, s]) => s.wins >= 1)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 10)
      .map(([id]) => id);

    if (!activeIds.length) { setPlayers([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_index, avatar_url, current_streak")
      .in("user_id", activeIds);

    if (!profiles) { setPlayers([]); return; }

    const result: ActivePlayer[] = profiles.map((p: any) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      avatar_index: p.avatar_index,
      avatar_url: p.avatar_url,
      current_streak: p.current_streak || 0,
      todayWins: stats[p.user_id]?.wins || 0,
      todayMatches: stats[p.user_id]?.matches || 0,
    })).sort((a, b) => b.todayWins - a.todayWins);

    setPlayers(result);
  };

  useEffect(() => { loadActive(); }, []);

  // Auto-rotate every 3s
  useEffect(() => {
    if (players.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx(i => (i + 1) % players.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [players.length]);

  // Realtime: refresh on new matches
  useEffect(() => {
    const channel = supabase
      .channel("active-ticker")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => {
        loadActive();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!players.length) return null;

  const p = players[currentIdx];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mb-3 glass-premium rounded-xl overflow-hidden border border-neon-green/10"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Live dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
          </span>
          <span className="font-display text-[7px] font-bold text-neon-green tracking-[0.2em]">LIVE</span>
        </div>

        <div className="w-px h-4 bg-border/30" />

        {/* Rotating player */}
        <AnimatePresence mode="wait">
          <motion.div
            key={p.user_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <PlayerAvatar avatarUrl={p.avatar_url} avatarIndex={p.avatar_index} size="sm" />
            <div className="flex-1 min-w-0">
              <span className="font-display text-[10px] font-bold text-foreground truncate block">
                {p.display_name}
              </span>
              <span className="text-[8px] text-muted-foreground font-display">
                {p.todayWins}W/{p.todayMatches} today
                {p.current_streak > 1 && (
                  <span className="text-score-gold ml-1">🔥 {p.current_streak} streak</span>
                )}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Player count */}
        <div className="shrink-0 flex items-center gap-1">
          {players.slice(0, 3).map((pl, i) => (
            <div
              key={pl.user_id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIdx % 3 ? "bg-neon-green" : "bg-muted-foreground/30"}`}
            />
          ))}
          {players.length > 3 && (
            <span className="text-[7px] text-muted-foreground font-display">+{players.length - 3}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
