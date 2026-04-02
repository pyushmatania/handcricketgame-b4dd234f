import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GameState } from "./useHandCricket";
import { checkAndSaveRecordBreaks } from "./useRecordBreaks";

export function useMatchSaver() {
  const { user } = useAuth();

  const saveMatch = useCallback(
    async (game: GameState, mode: string) => {
      if (!user || game.phase !== "finished" || !game.result) return;

      const matchData = {
        user_id: user.id,
        mode,
        user_score: game.userScore,
        ai_score: game.aiScore,
        result: game.result,
        balls_played: game.ballHistory.length,
        innings_data: game.ballHistory as any,
      };

      // Insert match
      await supabase.from("matches").insert(matchData);

      // Update profile stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const newStreak =
          game.result === "win" ? profile.current_streak + 1 : 0;

        const updatedStats = {
          total_matches: profile.total_matches + 1,
          wins: profile.wins + (game.result === "win" ? 1 : 0),
          losses: profile.losses + (game.result === "loss" ? 1 : 0),
          draws: profile.draws + (game.result === "draw" ? 1 : 0),
          high_score: Math.max(profile.high_score, game.userScore),
          current_streak: newStreak,
          best_streak: Math.max(profile.best_streak, newStreak),
        };

        await supabase
          .from("profiles")
          .update(updatedStats)
          .eq("user_id", user.id);

        // Check if we broke any friend's records
        checkAndSaveRecordBreaks(user.id, {
          high_score: updatedStats.high_score,
          best_streak: updatedStats.best_streak,
          wins: updatedStats.wins,
          total_matches: updatedStats.total_matches,
        });
      }
    },
    [user]
  );

  return { saveMatch, isAuthenticated: !!user };
}
