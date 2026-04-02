import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GameState } from "./useHandCricket";
import { checkAndSaveRecordBreaks } from "./useRecordBreaks";
import { getRankTier, calculateRankPoints } from "@/lib/rankTiers";

const XP_REWARDS = { win: 30, loss: 10, draw: 15 };
const COIN_REWARDS = { win: 50, loss: 10, draw: 20 };
const CHALLENGE_XP = 50;
const CHALLENGE_COINS = 100;
const RANKUP_XP = 100;
const RANKUP_COINS = 200;

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

      await supabase.from("matches").insert(matchData);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const newStreak =
          game.result === "win" ? profile.current_streak + 1 : 0;

        // Calculate XP/coins earned
        const resultKey = game.result as "win" | "loss" | "draw";
        let xpEarned = XP_REWARDS[resultKey] || 10;
        let coinsEarned = COIN_REWARDS[resultKey] || 10;

        // Streak bonus
        if (newStreak >= 3) {
          xpEarned += newStreak * 2;
          coinsEarned += newStreak * 3;
        }

        const oldTier = getRankTier({
          wins: profile.wins,
          total_matches: profile.total_matches,
          high_score: profile.high_score,
          best_streak: profile.best_streak,
        });

        const updatedStats = {
          total_matches: profile.total_matches + 1,
          wins: profile.wins + (game.result === "win" ? 1 : 0),
          losses: profile.losses + (game.result === "loss" ? 1 : 0),
          draws: profile.draws + (game.result === "draw" ? 1 : 0),
          high_score: Math.max(profile.high_score, game.userScore),
          current_streak: newStreak,
          best_streak: Math.max(profile.best_streak, newStreak),
          xp: ((profile as any).xp || 0) + xpEarned,
          coins: ((profile as any).coins || 0) + coinsEarned,
        };

        // Check for rank change
        const newTier = getRankTier({
          wins: updatedStats.wins,
          total_matches: updatedStats.total_matches,
          high_score: updatedStats.high_score,
          best_streak: updatedStats.best_streak,
        });

        if (newTier.name !== oldTier.name) {
          updatedStats.xp += RANKUP_XP;
          updatedStats.coins += RANKUP_COINS;
          (updatedStats as any).rank_tier = newTier.name;

          // Save rank history
          const newPoints = calculateRankPoints({
            wins: updatedStats.wins,
            total_matches: updatedStats.total_matches,
            high_score: updatedStats.high_score,
            best_streak: updatedStats.best_streak,
          });

          await supabase.from("rank_history").insert({
            user_id: user.id,
            old_tier: oldTier.name,
            new_tier: newTier.name,
            points: newPoints,
          } as any);

          // Self-notification for rank change
          await supabase.from("notifications").insert({
            user_id: user.id,
            type: "rank_up",
            title: `Rank ${newTier.name !== oldTier.name && calculateRankPoints({ wins: updatedStats.wins, total_matches: updatedStats.total_matches, high_score: updatedStats.high_score, best_streak: updatedStats.best_streak }) > calculateRankPoints({ wins: profile.wins, total_matches: profile.total_matches, high_score: profile.high_score, best_streak: profile.best_streak }) ? "Up" : "Change"}!`,
            message: `You've reached ${newTier.emoji} ${newTier.name}! +${RANKUP_XP} XP +${RANKUP_COINS} coins`,
          } as any);

          // Notify friends about rank up
          const { data: friends } = await supabase
            .from("friends")
            .select("friend_id")
            .eq("user_id", user.id);

          if (friends?.length) {
            const friendNotifications = friends.map((f: any) => ({
              user_id: f.friend_id,
              type: "friend_achievement",
              title: `${profile.display_name} ranked up!`,
              message: `${profile.display_name} reached ${newTier.emoji} ${newTier.name}!`,
              data: { from_user_id: user.id },
            }));
            await supabase.from("notifications").insert(friendNotifications as any);
          }
        }

        await supabase
          .from("profiles")
          .update(updatedStats as any)
          .eq("user_id", user.id);

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

                // Notify on challenge completion
                if (done) {
                  // XP/coins for challenge
                  await supabase.from("profiles").update({
                    xp: updatedStats.xp + CHALLENGE_XP,
                    coins: updatedStats.coins + CHALLENGE_COINS,
                  } as any).eq("user_id", user.id);

                  await supabase.from("notifications").insert({
                    user_id: user.id,
                    type: "challenge_complete",
                    title: "Challenge Complete! 🎯",
                    message: `You completed a weekly challenge! +${CHALLENGE_XP} XP +${CHALLENGE_COINS} coins`,
                  } as any);

                  // Notify friends
                  const { data: friends2 } = await supabase
                    .from("friends")
                    .select("friend_id")
                    .eq("user_id", user.id);
                  if (friends2?.length) {
                    await supabase.from("notifications").insert(
                      friends2.map((f: any) => ({
                        user_id: f.friend_id,
                        type: "friend_achievement",
                        title: `${profile.display_name} completed a challenge!`,
                        message: `${profile.display_name} just completed a weekly challenge 🎯`,
                        data: { from_user_id: user.id },
                      })) as any
                    );
                  }
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
