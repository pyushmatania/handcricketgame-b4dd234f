import { supabase } from "@/integrations/supabase/client";

interface ProfileStats {
  high_score: number;
  best_streak: number;
  wins: number;
  total_matches: number;
}

const RECORD_TYPES: { key: keyof ProfileStats; type: string }[] = [
  { key: "high_score", type: "high_score" },
  { key: "best_streak", type: "best_streak" },
  { key: "wins", type: "total_wins" },
  { key: "total_matches", type: "total_matches" },
];

/**
 * After a match is saved and profile updated, check if the current user
 * has broken any friend's records. If so, insert record_breaks entries.
 */
export async function checkAndSaveRecordBreaks(userId: string, updatedProfile: ProfileStats) {
  try {
    // Get all friends
    const { data: friendRows } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", userId);

    if (!friendRows || !friendRows.length) return;

    const friendIds = friendRows.map((f: any) => f.friend_id);

    // Get friend profiles
    const { data: friendProfiles } = await supabase
      .from("profiles")
      .select("user_id, high_score, best_streak, wins, total_matches")
      .in("user_id", friendIds);

    if (!friendProfiles) return;

    const breaks: any[] = [];

    for (const fp of friendProfiles) {
      const friend = fp as unknown as ProfileStats & { user_id: string };
      for (const rt of RECORD_TYPES) {
        const myValue = updatedProfile[rt.key];
        const theirValue = friend[rt.key];
        // Check if I just surpassed their record
        if (myValue > theirValue && theirValue > 0) {
          breaks.push({
            record_type: rt.type,
            broken_by: userId,
            record_holder: friend.user_id,
            old_value: theirValue,
            new_value: myValue,
          });
        }
      }
    }

    if (breaks.length > 0) {
      // Deduplicate - don't insert if the same record break already exists
      for (const b of breaks) {
        const { data: existing } = await supabase
          .from("record_breaks")
          .select("id")
          .eq("record_type", b.record_type)
          .eq("broken_by", b.broken_by)
          .eq("record_holder", b.record_holder)
          .eq("new_value", b.new_value)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("record_breaks").insert(b as any);
        }
      }
    }
  } catch (err) {
    console.error("[RecordBreaks] check failed", err);
  }
}
