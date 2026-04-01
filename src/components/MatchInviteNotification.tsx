import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Invite {
  id: string;
  game_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  from_name?: string;
}

export default function MatchInviteNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (!user) return;
    loadPendingInvites();

    const channel = supabase
      .channel("my-invites")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_invites", filter: `to_user_id=eq.${user.id}` },
        () => loadPendingInvites()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadPendingInvites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("match_invites")
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!data || !data.length) { setInvites([]); return; }

    const fromIds = [...new Set((data as any[]).map((d) => d.from_user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", fromIds);

    const nameMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { nameMap[p.user_id] = p.display_name; });

    setInvites((data as any[]).map((d) => ({ ...d, from_name: nameMap[d.from_user_id] || "Player" })));
  };

  const acceptInvite = async (invite: Invite) => {
    if (!user) return;
    // Update invite status
    await supabase.from("match_invites").update({ status: "accepted" } as any).eq("id", invite.id);
    // Join the game
    await supabase
      .from("multiplayer_games")
      .update({ guest_id: user.id, status: "playing" } as any)
      .eq("id", invite.game_id);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    navigate("/game/multiplayer");
  };

  const declineInvite = async (invite: Invite) => {
    await supabase.from("match_invites").update({ status: "declined" } as any).eq("id", invite.id);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md space-y-2">
      <AnimatePresence>
        {invites.map((inv) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="glass-premium rounded-2xl p-4 border border-primary/20 shadow-[0_0_30px_hsl(217_91%_60%/0.15)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xl">⚔️</span>
              </div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground block">MATCH CHALLENGE!</span>
                <span className="text-[9px] text-muted-foreground font-display">
                  <span className="text-primary font-bold">{inv.from_name}</span> wants to play
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => acceptInvite(inv)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-green/20 to-neon-green/10 border border-neon-green/30 font-display text-[9px] font-bold text-neon-green tracking-wider"
              >
                ✓ ACCEPT
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => declineInvite(inv)}
                className="py-2.5 px-4 rounded-xl bg-out-red/10 border border-out-red/20 font-display text-[9px] font-bold text-out-red tracking-wider"
              >
                ✕
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
