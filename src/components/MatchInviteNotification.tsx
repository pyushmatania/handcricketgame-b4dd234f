import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  acceptMatchInvite,
  formatPostgrestError,
  logPostgrestError,
  mapAcceptInviteError,
} from "@/lib/multiplayerRoom";
import { SFX, Haptics } from "@/lib/sounds";

const INVITE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface Invite {
  id: string;
  game_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  expires_at?: string;
  game_type?: string;
  from_name?: string;
}

function getTimeLeft(createdAt: string): number {
  return Math.max(0, INVITE_EXPIRY_MS - (Date.now() - new Date(createdAt).getTime()));
}
function getTimeLeftFromInvite(invite: Invite): number {
  if (invite.expires_at) {
    return Math.max(0, new Date(invite.expires_at).getTime() - Date.now());
  }
  return getTimeLeft(invite.created_at);
}

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MatchInviteNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [joiningInviteId, setJoiningInviteId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const prevInviteCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    loadPendingInvites();
    const pollInterval = setInterval(() => loadPendingInvites(), 7000);

    const channel = supabase
      .channel("my-invites")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_invites", filter: `to_user_id=eq.${user.id}` },
        () => loadPendingInvites()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "match_invites", filter: `to_user_id=eq.${user.id}` },
        () => loadPendingInvites()
      )
      .subscribe();

    return () => { clearInterval(pollInterval); supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (invites.length > prevInviteCountRef.current && prevInviteCountRef.current >= 0) {
      try { SFX.matchInvite(); } catch {}
      try { Haptics.matchInvite(); } catch {}
    }
    prevInviteCountRef.current = invites.length;
  }, [invites.length]);

  useEffect(() => {
    if (invites.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setInvites((prev) => {
        const alive = prev.filter((inv) => getTimeLeftFromInvite(inv) > 0);
        const expired = prev.filter((inv) => getTimeLeftFromInvite(inv) <= 0);
        expired.forEach((inv) => {
          supabase
            .from("match_invites")
            .update({ status: "expired", cancelled_at: new Date().toISOString() } as any)
            .eq("id", inv.id)
            .eq("status", "pending")
            .then(({ error }) => {
              if (error) {
                logPostgrestError("match invite auto-expire failed", error, { invite_id: inv.id });
              }
            });
        });
        return alive;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [invites.length]);

  const loadPendingInvites = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("match_invites")
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      logPostgrestError("loadPendingInvites failed", error, { user_id: user.id });
      setInvites([]);
      return;
    }

    if (!data || !data.length) { setInvites([]); return; }

    const validInvites = (data as any[]).filter((d) => getTimeLeftFromInvite(d as Invite) > 0);
    if (validInvites.length === 0) { setInvites([]); return; }

    const fromIds = [...new Set(validInvites.map((d) => d.from_user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", fromIds);

    if (profilesError) {
      logPostgrestError("loadPendingInvites profile lookup failed", profilesError, { from_user_ids: fromIds });
    }

    const nameMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { nameMap[p.user_id] = p.display_name; });

    const deduped = [...new Map(validInvites.map((d) => [d.id, d])).values()];
    setInvites(deduped.map((d: any) => ({ ...d, from_name: nameMap[d.from_user_id] || "Player" })));
  };

  const acceptInvite = async (invite: Invite) => {
    if (!user) return;
    setJoiningInviteId(invite.id);

    try {
      const { data: existingGame } = await supabase
        .from("multiplayer_games")
        .select("id, host_id, guest_id, status")
        .eq("id", invite.game_id)
        .maybeSingle();

      const currentGame = existingGame as any;

      if (!currentGame || ["finished", "abandoned", "cancelled"].includes(currentGame.status)) {
        const { error: expireError } = await supabase
          .from("match_invites")
          .update({ status: "expired", cancelled_at: new Date().toISOString() } as any)
          .eq("id", invite.id)
          .eq("status", "pending");

        if (expireError) {
          logPostgrestError("acceptInvite expire stale invite failed", expireError, { invite_id: invite.id, game_id: invite.game_id });
        }

        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        toast({ title: "Invite expired", description: "This battle room is no longer available." });
        return;
      }

      if (currentGame.guest_id && currentGame.guest_id !== user.id && currentGame.host_id !== user.id) {
        const { error: staleError } = await supabase
          .from("match_invites")
          .update({ status: "declined", declined_at: new Date().toISOString() } as any)
          .eq("id", invite.id)
          .eq("status", "pending");

        if (staleError) {
          logPostgrestError("acceptInvite mark full invite failed", staleError, { invite_id: invite.id, game_id: invite.game_id });
        }

        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        toast({ title: "Room already taken", description: "Another player already joined this match." });
        return;
      }

      const { data: acceptedGameId, error: acceptError } = await acceptMatchInvite(invite.id);

      if (acceptError || !acceptedGameId) {
        if (acceptError) {
          logPostgrestError("acceptInvite rpc failed", acceptError, {
            invite_id: invite.id,
            game_id: invite.game_id,
            user_id: user.id,
          });
        }

        toast({
          title: "Unable to join match",
          description: acceptError
            ? `${mapAcceptInviteError(acceptError)} — ${formatPostgrestError(acceptError)}`
            : "No game was returned after accepting the invite.",
        });
        await loadPendingInvites();
        return;
      }

      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      navigate(`/game/multiplayer?game=${acceptedGameId}`, { replace: true });
    } finally {
      setJoiningInviteId(null);
    }
  };

  const declineInvite = async (invite: Invite) => {
    const { error } = await supabase
      .from("match_invites")
      .update({ status: "declined", declined_at: new Date().toISOString() } as any)
      .eq("id", invite.id)
      .eq("status", "pending");

    if (error) {
      logPostgrestError("declineInvite failed", error, { invite_id: invite.id, game_id: invite.game_id });
    }

    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md space-y-2">
      <AnimatePresence>
        {invites.map((inv) => {
          const timeLeft = getTimeLeftFromInvite(inv);
          const urgency = timeLeft < 60000;
          return (
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
                  <span className="text-[8px] text-accent/90 font-display uppercase tracking-wider">
                    Mode: {inv.game_type?.toUpperCase() || "AR"}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded-lg ${urgency ? "bg-out-red/15 border border-out-red/30" : "bg-muted/30 border border-border/30"}`}>
                  <span className={`font-mono text-[10px] font-bold ${urgency ? "text-out-red" : "text-muted-foreground"}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={joiningInviteId === inv.id}
                  onClick={() => acceptInvite(inv)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-neon-green/20 to-neon-green/10 border border-neon-green/30 font-display text-[9px] font-bold text-neon-green tracking-wider disabled:opacity-50"
                >
                  {joiningInviteId === inv.id ? "JOINING..." : "✓ ACCEPT"}
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
          );
        })}
      </AnimatePresence>
    </div>
  );
}
