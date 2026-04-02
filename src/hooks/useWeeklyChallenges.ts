import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getWeeklyChallenges, getWeekBounds, type WeeklyChallenge } from "@/lib/weeklyChallenges";

interface ChallengeWithProgress extends WeeklyChallenge {
  db_id?: string;
  progress_id?: string;
  current_value: number;
  completed: boolean;
  completed_at?: string;
}

interface FriendRanking {
  user_id: string;
  display_name: string;
  avatar_index: number;
  completed_count: number;
  total_progress: number;
}

export function useWeeklyChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [friendRankings, setFriendRankings] = useState<FriendRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChallenges = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { start, end } = getWeekBounds();
    const weekChallenges = getWeeklyChallenges();

    // Check if challenges exist for this week in DB
    const { data: existing } = await supabase
      .from("weekly_challenges")
      .select("*")
      .gte("week_start", start.toISOString().split("T")[0])
      .lte("week_end", end.toISOString().split("T")[0]) as any;

    let dbChallenges = existing || [];

    // If no challenges for this week, insert them
    if (dbChallenges.length === 0) {
      const toInsert = weekChallenges.map(c => ({
        ...c,
        week_start: start.toISOString().split("T")[0],
        week_end: end.toISOString().split("T")[0],
      }));
      
      const { data: inserted } = await supabase
        .from("weekly_challenges")
        .insert(toInsert as any)
        .select() as any;
      
      dbChallenges = inserted || [];
    }

    // Load user's progress
    const challengeIds = dbChallenges.map((c: any) => c.id);
    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("challenge_id", challengeIds) as any;

    const progressMap: Record<string, any> = {};
    if (progress) progress.forEach((p: any) => { progressMap[p.challenge_id] = p; });

    const merged: ChallengeWithProgress[] = dbChallenges.map((c: any) => {
      const p = progressMap[c.id];
      return {
        challenge_type: c.challenge_type,
        title: c.title,
        description: c.description,
        target_value: c.target_value,
        reward_label: c.reward_label,
        db_id: c.id,
        progress_id: p?.id,
        current_value: p?.current_value || 0,
        completed: p?.completed || false,
        completed_at: p?.completed_at,
      };
    });

    setChallenges(merged);
    setLoading(false);

    // Load friend rankings
    loadFriendRankings(challengeIds);
  }, [user]);

  const loadFriendRankings = async (challengeIds: string[]) => {
    if (!user || !challengeIds.length) return;

    const { data: friendRows } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!friendRows?.length) { setFriendRankings([]); return; }

    const allIds = [user.id, ...friendRows.map((f: any) => f.friend_id)];

    const { data: allProgress } = await supabase
      .from("challenge_progress")
      .select("*")
      .in("user_id", allIds)
      .in("challenge_id", challengeIds) as any;

    // Aggregate per user
    const userMap: Record<string, { completed: number; total: number }> = {};
    allIds.forEach(id => { userMap[id] = { completed: 0, total: 0 }; });

    if (allProgress) {
      allProgress.forEach((p: any) => {
        if (!userMap[p.user_id]) userMap[p.user_id] = { completed: 0, total: 0 };
        userMap[p.user_id].total += p.current_value;
        if (p.completed) userMap[p.user_id].completed++;
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_index")
      .in("user_id", allIds);

    const rankings: FriendRanking[] = allIds.map(id => {
      const profile = profiles?.find((p: any) => p.user_id === id) as any;
      return {
        user_id: id,
        display_name: profile?.display_name || "Player",
        avatar_index: profile?.avatar_index || 0,
        completed_count: userMap[id]?.completed || 0,
        total_progress: userMap[id]?.total || 0,
      };
    }).sort((a, b) => b.completed_count - a.completed_count || b.total_progress - a.total_progress);

    setFriendRankings(rankings);
  };

  const updateProgress = useCallback(async (challengeType: string, increment: number = 1) => {
    if (!user) return;

    const challenge = challenges.find(c => c.challenge_type === challengeType);
    if (!challenge?.db_id || challenge.completed) return;

    const newValue = Math.min(challenge.current_value + increment, challenge.target_value);
    const nowCompleted = newValue >= challenge.target_value;

    if (challenge.progress_id) {
      await supabase
        .from("challenge_progress")
        .update({
          current_value: newValue,
          completed: nowCompleted,
          ...(nowCompleted ? { completed_at: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", challenge.progress_id);
    } else {
      await supabase
        .from("challenge_progress")
        .insert({
          user_id: user.id,
          challenge_id: challenge.db_id,
          current_value: newValue,
          completed: nowCompleted,
          ...(nowCompleted ? { completed_at: new Date().toISOString() } : {}),
        } as any);
    }

    await loadChallenges();
  }, [user, challenges, loadChallenges]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  return { challenges, friendRankings, loading, updateProgress, reload: loadChallenges };
}
