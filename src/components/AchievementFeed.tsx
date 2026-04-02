import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PlayerAvatar from "@/components/PlayerAvatar";
import { REACTION_EMOJIS, TRASH_TALK_LINES } from "@/lib/weeklyChallenges";

interface RecordBreak {
  id: string;
  broken_by: string;
  record_holder: string;
  record_type: string;
  old_value: number;
  new_value: number;
  broken_at: string;
  breaker_name?: string;
  holder_name?: string;
  breaker_avatar_index?: number;
}

interface Reaction {
  id: string;
  record_break_id: string;
  user_id: string;
  emoji: string;
  message?: string;
  display_name?: string;
}

const RECORD_LABELS: Record<string, string> = {
  high_score: "High Score",
  best_streak: "Win Streak",
  total_wins: "Total Wins",
  total_matches: "Total Matches",
};

export default function AchievementFeed() {
  const { user } = useAuth();
  const [records, setRecords] = useState<RecordBreak[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [reacting, setReacting] = useState<string | null>(null);
  const [trashTalk, setTrashTalk] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRecords();
  }, [user]);

  const loadRecords = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("record_breaks")
      .select("*")
      .or(`broken_by.eq.${user.id},record_holder.eq.${user.id}`)
      .order("broken_at", { ascending: false })
      .limit(20);

    if (!data?.length) { setRecords([]); return; }

    const userIds = [...new Set((data as any[]).flatMap(d => [d.broken_by, d.record_holder]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_index")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.user_id] = p; });

    const enriched = (data as any[]).map(d => ({
      ...d,
      breaker_name: profileMap[d.broken_by]?.display_name || "Player",
      holder_name: profileMap[d.record_holder]?.display_name || "Player",
      breaker_avatar_index: profileMap[d.broken_by]?.avatar_index || 0,
    }));

    setRecords(enriched);

    // Load reactions
    const recordIds = enriched.map(r => r.id);
    const { data: rxns } = await supabase
      .from("achievement_reactions")
      .select("*")
      .in("record_break_id", recordIds) as any;

    if (rxns) {
      const rxnUserIds = [...new Set((rxns as any[]).map(r => r.user_id))];
      const { data: rxnProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", rxnUserIds);

      const nameMap: Record<string, string> = {};
      if (rxnProfiles) rxnProfiles.forEach((p: any) => { nameMap[p.user_id] = p.display_name; });

      const grouped: Record<string, Reaction[]> = {};
      (rxns as any[]).forEach(r => {
        if (!grouped[r.record_break_id]) grouped[r.record_break_id] = [];
        grouped[r.record_break_id].push({ ...r, display_name: nameMap[r.user_id] || "Player" });
      });
      setReactions(grouped);
    }
  };

  const addReaction = async (recordId: string, emoji: string, message?: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("achievement_reactions")
      .upsert({
        record_break_id: recordId,
        user_id: user.id,
        emoji,
        message: message || null,
      } as any, { onConflict: "record_break_id,user_id" });

    if (!error) {
      setReacting(null);
      setTrashTalk(null);
      loadRecords();
    }
  };

  const getRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (records.length === 0) {
    return (
      <div className="glass-premium rounded-xl p-6 text-center">
        <span className="text-3xl block mb-2">🏆</span>
        <span className="font-display text-[10px] font-bold text-muted-foreground tracking-wider">NO RECORDS BROKEN YET</span>
        <p className="text-[8px] text-muted-foreground/60 mt-1">Play matches to break your friends' records!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record, i) => {
        const isMeBreaker = user?.id === record.broken_by;
        const rxns = reactions[record.id] || [];
        const myReaction = rxns.find(r => r.user_id === user?.id);

        return (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-premium rounded-xl p-3 relative overflow-hidden"
          >
            {/* Accent stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isMeBreaker ? "bg-neon-green" : "bg-out-red"}`} />

            <div className="flex items-start gap-3 ml-2">
              <PlayerAvatar avatarIndex={record.breaker_avatar_index ?? 0} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-[10px] font-bold text-foreground">
                    {isMeBreaker ? "You" : record.breaker_name}
                  </span>
                  <span className="text-[8px] text-muted-foreground">broke</span>
                  <span className="font-display text-[10px] font-bold text-foreground">
                    {isMeBreaker ? record.holder_name + "'s" : "your"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-display font-bold text-secondary">
                    {RECORD_LABELS[record.record_type] || record.record_type}
                  </span>
                  <span className="text-[8px] text-muted-foreground">
                    {record.old_value} → <span className="text-neon-green font-bold">{record.new_value}</span>
                  </span>
                </div>
                <span className="text-[7px] text-muted-foreground/60 font-display">
                  {getRelativeTime(record.broken_at)}
                </span>

                {/* Reactions */}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {rxns.map(r => (
                    <div key={r.id} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/20 border border-border/30">
                      <span className="text-xs">{r.emoji}</span>
                      {r.message && (
                        <span className="text-[7px] text-muted-foreground max-w-[60px] truncate">{r.message}</span>
                      )}
                    </div>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setReacting(reacting === record.id ? null : record.id)}
                    className={`px-1.5 py-0.5 rounded-full text-[8px] font-display ${
                      myReaction
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "bg-muted/20 border border-border/30 text-muted-foreground"
                    }`}
                  >
                    {myReaction ? myReaction.emoji : "+ React"}
                  </motion.button>
                </div>

                {/* Reaction picker */}
                <AnimatePresence>
                  {reacting === record.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex gap-1 flex-wrap">
                        {REACTION_EMOJIS.map(emoji => (
                          <motion.button
                            key={emoji}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => addReaction(record.id, emoji, trashTalk || undefined)}
                            className="w-8 h-8 rounded-lg bg-muted/20 border border-border/30 flex items-center justify-center text-lg hover:bg-primary/10 hover:border-primary/20 transition-colors"
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {TRASH_TALK_LINES.slice(0, 4).map(line => (
                          <motion.button
                            key={line}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setTrashTalk(trashTalk === line ? null : line)}
                            className={`px-2 py-1 rounded-lg text-[7px] font-display tracking-wider transition-colors ${
                              trashTalk === line
                                ? "bg-secondary/20 border border-secondary/30 text-secondary"
                                : "bg-muted/10 border border-border/20 text-muted-foreground"
                            }`}
                          >
                            {line}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
