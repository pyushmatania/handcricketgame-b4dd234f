import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RivalData {
  odId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarIndex: number;
  myWins: number;
  theirWins: number;
  draws: number;
  totalGames: number;
  myTotalRuns: number;
  theirTotalRuns: number;
  currentStreak: number; // +ve = my wins, -ve = their wins
  lastPlayed: string | null;
  recentForm: ("W" | "L" | "D")[]; // last 5
  rankTier: string;
}

export function useRivals(minGames = 2) {
  const { user } = useAuth();
  const [rivals, setRivals] = useState<RivalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    detectRivals();
  }, [user]);

  const detectRivals = async () => {
    if (!user) return;
    setLoading(true);

    // Get all finished/abandoned multiplayer games involving the user
    const { data: games } = await supabase
      .from("multiplayer_games")
      .select("host_id, guest_id, host_score, guest_score, winner_id, status, abandoned_by, created_at")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .in("status", ["finished", "abandoned"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (!games || games.length === 0) { setRivals([]); setLoading(false); return; }

    // Group by opponent
    const opponentMap: Record<string, typeof games> = {};
    games.forEach((g: any) => {
      const opId = g.host_id === user.id ? g.guest_id : g.host_id;
      if (!opId) return;
      if (!opponentMap[opId]) opponentMap[opId] = [];
      opponentMap[opId].push(g);
    });

    // Find top 2 opponents by game count (min threshold)
    const sorted = Object.entries(opponentMap)
      .filter(([, gs]) => gs.length >= minGames)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2);

    if (sorted.length === 0) { setRivals([]); setLoading(false); return; }

    // Get opponent profiles
    const opIds = sorted.map(([id]) => id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, avatar_index, rank_tier")
      .in("user_id", opIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    const result: RivalData[] = sorted.map(([opId, gs]) => {
      let myWins = 0, theirWins = 0, draws = 0;
      let myTotalRuns = 0, theirTotalRuns = 0;
      let currentStreak = 0;

      // Process chronologically for streak
      const chronological = [...gs].reverse();
      chronological.forEach((g: any) => {
        const isHost = g.host_id === user.id;
        const myScore = isHost ? g.host_score : g.guest_score;
        const theirScore = isHost ? g.guest_score : g.host_score;
        myTotalRuns += myScore;
        theirTotalRuns += theirScore;

        if (g.winner_id === user.id) {
          myWins++;
          currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        } else if (g.winner_id === opId) {
          theirWins++;
          currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        } else {
          draws++;
        }
      });

      // Recent form (last 5, most recent first)
      const recentForm: ("W" | "L" | "D")[] = gs.slice(0, 5).map((g: any) => {
        if (g.winner_id === user.id) return "W";
        if (g.winner_id === opId) return "L";
        return "D";
      });

      const p = profileMap[opId];
      return {
        odId: opId,
        displayName: p?.display_name || "Unknown",
        avatarUrl: p?.avatar_url || null,
        avatarIndex: p?.avatar_index ?? 0,
        myWins, theirWins, draws,
        totalGames: gs.length,
        myTotalRuns, theirTotalRuns,
        currentStreak,
        lastPlayed: gs[0]?.created_at || null,
        recentForm,
        rankTier: p?.rank_tier || "Bronze",
      };
    });

    setRivals(result);
    setLoading(false);
  };

  return { rivals, loading, refresh: detectRivals };
}
