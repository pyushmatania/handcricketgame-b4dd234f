import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PvpRecord {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  highScore: number;
  totalRuns: number;
  avgScore: number;
  abandons: number;
  currentStreak: number;
  bestStreak: number;
  biggestWin: number;
}

export interface PvpGame {
  id: string;
  host_id: string;
  guest_id: string | null;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  status: string;
  abandoned_by: string | null;
  created_at: string;
  game_type: string;
}

export function computePvpRecord(games: PvpGame[], userId: string): PvpRecord {
  let wins = 0, losses = 0, draws = 0, totalRuns = 0, highScore = 0, abandons = 0;
  let currentStreak = 0, bestStreak = 0, biggestWin = 0;

  const chrono = [...games].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const g of chrono) {
    const isHost = g.host_id === userId;
    const myScore = isHost ? g.host_score : g.guest_score;
    const theirScore = isHost ? g.guest_score : g.host_score;
    totalRuns += myScore;
    if (myScore > highScore) highScore = myScore;

    if (g.abandoned_by === userId) abandons++;

    if (g.winner_id === userId) {
      wins++;
      const margin = myScore - theirScore;
      if (margin > biggestWin) biggestWin = margin;
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
    } else if (g.winner_id && g.winner_id !== userId) {
      losses++;
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    } else {
      draws++;
      currentStreak = 0;
    }
    if (Math.abs(currentStreak) > Math.abs(bestStreak)) bestStreak = currentStreak;
  }

  const totalGames = wins + losses + draws;
  return {
    wins, losses, draws, totalGames, highScore, totalRuns,
    avgScore: totalGames > 0 ? Math.round(totalRuns / totalGames) : 0,
    abandons, currentStreak, bestStreak, biggestWin,
  };
}

export async function fetchPvpGamesForUser(userId: string): Promise<PvpGame[]> {
  const { data } = await supabase
    .from("multiplayer_games")
    .select("id, host_id, guest_id, host_score, guest_score, winner_id, status, abandoned_by, created_at, game_type")
    .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
    .in("status", ["finished", "abandoned"])
    .order("created_at", { ascending: false })
    .limit(500);
  return (data as unknown as PvpGame[]) || [];
}

export function usePvpStats(userId: string | undefined) {
  const [pvpGames, setPvpGames] = useState<PvpGame[]>([]);
  const [pvpRecord, setPvpRecord] = useState<PvpRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchPvpGamesForUser(userId).then(games => {
      setPvpGames(games);
      setPvpRecord(computePvpRecord(games, userId));
      setLoading(false);
    });
  }, [userId]);

  return { pvpGames, pvpRecord, loading };
}

/** Fetch all PvP games between a set of user IDs (for network graph) */
export async function fetchPvpGamesBetweenUsers(userIds: string[]): Promise<PvpGame[]> {
  if (userIds.length < 2) return [];
  const { data } = await supabase
    .from("multiplayer_games")
    .select("id, host_id, guest_id, host_score, guest_score, winner_id, status, abandoned_by, created_at, game_type")
    .in("host_id", userIds)
    .in("guest_id", userIds)
    .in("status", ["finished", "abandoned"])
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data as unknown as PvpGame[]) || [];
}
