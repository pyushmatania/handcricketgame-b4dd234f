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

        // Update weekly challenge progress
        try {
          const { getWeekBounds } = await import("@/lib/weeklyChallenges");
          const { start, end } = getWeekBounds();
          const { data: challenges } = await supabase
            .from("weekly_challenges")
            .select("id, challenge_type, target_value")
            .gte("week_start", start.toISOString().split("T")[0])
            .lte("week_end", end.toISOString().split("T")[0]) as any;

          if (challenges) {
            for (const c of challenges as any[]) {
              let shouldIncrement = false;
              if (c.challenge_type === "win_5" && game.result === "win") shouldIncrement = true;
              if (c.challenge_type === "play_10") shouldIncrement = true;
              if (c.challenge_type === "score_50_3x" && game.userScore >= 50) shouldIncrement = true;
              if (c.challenge_type === "score_100" && game.userScore >= 100) shouldIncrement = true;
              if (c.challenge_type === "play_all_modes") shouldIncrement = true;

              if (shouldIncrement) {
                const { data: existing } = await supabase
                  .from("challenge_progress")
                  .select("id, current_value, completed")
                  .eq("user_id", user.id)
                  .eq("challenge_id", c.id)
                  .maybeSingle() as any;

                if (existing?.completed) continue;

                const newVal = Math.min((existing?.current_value || 0) + 1, c.target_value);
                const done = newVal >= c.target_value;

                if (existing) {
                  await supabase.from("challenge_progress").update({
                    current_value: newVal, completed: done,
                    ...(done ? { completed_at: new Date().toISOString() } : {}),
                    updated_at: new Date().toISOString(),
                  } as any).eq("id", existing.id);
                } else {
                  await supabase.from("challenge_progress").insert({
                    user_id: user.id, challenge_id: c.id,
                    current_value: newVal, completed: done,
                    ...(done ? { completed_at: new Date().toISOString() } : {}),
                  } as any);
                }
              }
            }
          }
        } catch (e) { console.error("[Challenges] update failed", e); }
      }
    },
    [user]
  );

  return { saveMatch, isAuthenticated: !!user };
}
