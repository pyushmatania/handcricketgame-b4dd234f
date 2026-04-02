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

        // Count sixes and fours from this match's ball history
        let matchSixes = 0, matchFours = 0, matchRuns = 0;
        for (const ball of game.ballHistory) {
          if (typeof ball.runs === "number" && ball.runs > 0) {
            if (ball.runs === 6) matchSixes++;
            else if (ball.runs === 4) matchFours++;
            matchRuns += ball.runs;
          }
        }

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
          total_sixes: ((profile as any).total_sixes || 0) + matchSixes,
          total_fours: ((profile as any).total_fours || 0) + matchFours,
          total_runs: ((profile as any).total_runs || 0) + matchRuns,
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

        // ── SMART NUDGE NOTIFICATIONS ──

        // 1. Challenge proximity nudge
        try {
          const { getWeekBounds } = await import("@/lib/weeklyChallenges");
          const { start, end } = getWeekBounds();
          const { data: activeChallenges } = await supabase
            .from("weekly_challenges")
            .select("id, challenge_type, target_value, title")
            .gte("week_start", start.toISOString().split("T")[0])
            .lte("week_end", end.toISOString().split("T")[0]) as any;

          if (activeChallenges) {
            for (const c of activeChallenges as any[]) {
              const { data: prog } = await supabase
                .from("challenge_progress")
                .select("current_value, completed")
                .eq("user_id", user.id)
                .eq("challenge_id", c.id)
                .maybeSingle() as any;

              if (prog?.completed) continue;
              const current = prog?.current_value || 0;
              const remaining = c.target_value - current;

              if (remaining > 0 && remaining <= 3) {
                await supabase.from("notifications").insert({
                  user_id: user.id,
                  type: "nudge",
                  title: `Almost there! 🔥`,
                  message: remaining === 1
                    ? `Just 1 more to complete "${c.title}"! Go for it! 🎯`
                    : `${remaining} more to complete "${c.title}"! Keep pushing! 💪`,
                  data: { challenge_id: c.id },
                } as any);
              }
            }
          }
        } catch (e) { console.error("[Nudge] challenge proximity failed", e); }

        // 2. Rank tier proximity nudge
        try {
          const { getNextTier } = await import("@/lib/rankTiers");
          const nextTierInfo = getNextTier({
            wins: updatedStats.wins,
            total_matches: updatedStats.total_matches,
            high_score: updatedStats.high_score,
            best_streak: Math.max(profile.best_streak, updatedStats.current_streak),
          });

          if (nextTierInfo.next && nextTierInfo.progress >= 80) {
            const tierEmoji = nextTierInfo.next.emoji;
            const ptsLeft = nextTierInfo.pointsNeeded;
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "nudge",
              title: `${tierEmoji} ${nextTierInfo.next.name} is close!`,
              message: ptsLeft <= 10
                ? `You're just ${ptsLeft} points from ${nextTierInfo.next.name}! One more win could do it! 🚀`
                : `${ptsLeft} points to ${nextTierInfo.next.name}! Keep winning! 🔥`,
              data: { target_tier: nextTierInfo.next.name },
            } as any);
          }
        } catch (e) { console.error("[Nudge] rank proximity failed", e); }

        // Rivalry notifications after multiplayer matches
        if (mode === "multiplayer" || mode === "tap") {
          try {
            // Find if this opponent is a frequent rival
            const { data: gamesWithOp } = await supabase
              .from("multiplayer_games")
              .select("winner_id, host_id, guest_id")
              .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
              .in("status", ["finished"])
              .limit(200);

            if (gamesWithOp) {
              const opCount: Record<string, { wins: number; losses: number }> = {};
              gamesWithOp.forEach((g: any) => {
                const opId = g.host_id === user.id ? g.guest_id : g.host_id;
                if (!opId) return;
                if (!opCount[opId]) opCount[opId] = { wins: 0, losses: 0 };
                if (g.winner_id === user.id) opCount[opId].wins++;
                else if (g.winner_id === opId) opCount[opId].losses++;
              });

              // Find rivals with 3+ games
              const topRivals = Object.entries(opCount)
                .filter(([, s]) => (s.wins + s.losses) >= 3)
                .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
                .slice(0, 2);

              for (const [rivalId, stats] of topRivals) {
                const totalH2H = stats.wins + stats.losses;
                // Only nudge every 3 games or on milestone
                if (totalH2H % 3 !== 0) continue;

                const { data: rivalProfile } = await supabase
                  .from("profiles")
                  .select("display_name")
                  .eq("user_id", rivalId)
                  .single();
                const rivalName = (rivalProfile as any)?.display_name || "Rival";

                let nudgeMsg = "";
                if (stats.losses > stats.wins) {
                  nudgeMsg = `😤 You're losing ${stats.wins}-${stats.losses} to ${rivalName}… time to respond!`;
                } else if (stats.wins > stats.losses) {
                  nudgeMsg = `👑 You lead ${stats.wins}-${stats.losses} vs ${rivalName} — keep it up!`;
                } else {
                  nudgeMsg = `⚔️ Tied ${stats.wins}-${stats.losses} with ${rivalName} — who breaks it?`;
                }

                await supabase.from("notifications").insert({
                  user_id: user.id,
                  type: "rivalry_nudge",
                  title: `🔥 Rivalry Update`,
                  message: nudgeMsg,
                  data: { rival_id: rivalId },
                } as any);
              }
            }
          } catch (e) { console.error("[Rivalry] notification failed", e); }
        }
      }
    },
    [user]
  );

  return { saveMatch, isAuthenticated: !!user };
}
