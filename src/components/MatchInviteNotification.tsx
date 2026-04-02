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
import PlayerAvatar from "@/components/PlayerAvatar";

const INVITE_EXPIRY_MS = 5 * 60 * 1000;

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
  from_avatar_index?: number;
  from_wins?: number;
  from_total_matches?: number;
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

const GAME_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  ar: { emoji: "📸", label: "AR DUEL", color: "text-primary" },
  tap: { emoji: "⚡", label: "TAP DUEL", color: "text-accent" },
  tournament: { emoji: "🏆", label: "TOURNAMENT", color: "text-score-gold" },
};

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
              if (error) logPostgrestError("match invite auto-expire failed", error, { invite_id: inv.id });
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
      .select("user_id, display_name, avatar_index, wins, total_matches")
      .in("user_id", fromIds);

    if (profilesError) {
      logPostgrestError("loadPendingInvites profile lookup failed", profilesError, { from_user_ids: fromIds });
    }

    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.user_id] = p; });

    const deduped = [...new Map(validInvites.map((d) => [d.id, d])).values()];
    setInvites(deduped.map((d: any) => ({
      ...d,
      from_name: profileMap[d.from_user_id]?.display_name || "Player",
      from_avatar_index: profileMap[d.from_user_id]?.avatar_index || 0,
      from_wins: profileMap[d.from_user_id]?.wins || 0,
      from_total_matches: profileMap[d.from_user_id]?.total_matches || 0,
    })));
  };

  const acceptInvite = async (invite: Invite) => {
    if (!user) return;
    setJoiningInviteId(invite.id);

    try {
      const { data: acceptedGameId, error: acceptError } = await acceptMatchInvite(invite.id);

      if (acceptError || !acceptedGameId) {
        if (acceptError) {
          logPostgrestError("acceptInvite rpc failed", acceptError, {
            invite_id: invite.id, game_id: invite.game_id, user_id: user.id,
          });
        }
        const errorMsg = acceptError?.message?.toLowerCase() ?? "";
        if (errorMsg.includes("expired") || errorMsg.includes("not found")) {
          toast({ title: "Invite expired", description: "This battle room is no longer available." });
        } else if (errorMsg.includes("already full") || errorMsg.includes("another player")) {
          toast({ title: "Room already taken", description: "Another player already joined this match." });
        } else if (errorMsg.includes("already handled")) {
          toast({ title: "Invite already used", description: "This invite was already accepted or declined." });
        } else {
          toast({
            title: "Unable to join match",
            description: acceptError
              ? `${mapAcceptInviteError(acceptError)} — ${formatPostgrestError(acceptError)}`
              : "No game was returned after accepting the invite.",
          });
        }
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        await loadPendingInvites();
        return;
      }

      setInvites((prev) => prev.filter((i) => i.id !== invite.id));

      // Verify the game is in a joinable state before navigating
      const gameId = acceptedGameId as string;
      const { data: gameData } = await supabase
        .from("multiplayer_games")
        .select("status, guest_id")
        .eq("id", gameId)
        .maybeSingle();

      if (gameData && (gameData as any).guest_id === user.id) {
        // Force a full page navigation to ensure state resets properly for rematch
        window.location.href = `/game/multiplayer?game=${gameId}`;
      } else {
        // Fallback — still navigate but warn
        navigate(`/game/multiplayer?game=${gameId}`, { replace: true });
      }
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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md space-y-3">
      <AnimatePresence>
        {invites.map((inv) => {
          const timeLeft = getTimeLeftFromInvite(inv);
          const urgency = timeLeft < 60000;
          const pct = Math.min(100, (timeLeft / INVITE_EXPIRY_MS) * 100);
          const meta = GAME_TYPE_META[inv.game_type || "ar"] || GAME_TYPE_META.ar;
          const winRate = inv.from_total_matches && inv.from_total_matches > 0
            ? Math.round(((inv.from_wins || 0) / inv.from_total_matches) * 100)
            : 0;

          return (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: -60, scale: 0.8, rotateX: -15 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -40, scale: 0.85 }}
              transition={{ type: "spring", damping: 18, stiffness: 200 }}
              className="relative overflow-hidden rounded-2xl border border-primary/30 shadow-[0_0_40px_hsl(217_91%_60%/0.2),0_8px_32px_rgba(0,0,0,0.4)]"
              style={{ background: "linear-gradient(135deg, hsl(222 47% 11% / 0.97), hsl(217 33% 17% / 0.95))" }}
            >
              {/* Animated glow pulse behind */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 pointer-events-none"
              />

              {/* Timer progress bar at top */}
              <div className="absolute top-0 left-0 right-0 h-1">
                <motion.div
                  className={`h-full ${urgency ? "bg-out-red" : "bg-gradient-to-r from-primary to-accent"}`}
                  style={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="relative z-10 p-4">
                {/* Header: BATTLE CHALLENGE */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-xl"
                    >⚔️</motion.span>
                    <span className="font-display text-[10px] font-black text-foreground tracking-[0.2em]">
                      BATTLE CHALLENGE!
                    </span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg ${urgency ? "bg-out-red/15 border border-out-red/30" : "bg-muted/20 border border-border/30"}`}>
                    <span className={`font-mono text-[10px] font-bold ${urgency ? "text-out-red" : "text-muted-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>

                {/* Player info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <PlayerAvatar avatarIndex={inv.from_avatar_index ?? 0} size="md" />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center"
                    >
                      <div className="w-2 h-2 rounded-full bg-neon-green" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <span className="font-display text-sm font-black text-foreground block">
                      {inv.from_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-display font-bold ${meta.color}`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground">•</span>
                      <span className="text-[8px] text-neon-green font-bold">{winRate}% WR</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.02 }}
                    disabled={joiningInviteId === inv.id}
                    onClick={() => acceptInvite(inv)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-green/25 to-neon-green/10 border border-neon-green/40 font-display text-[10px] font-black text-neon-green tracking-[0.15em] disabled:opacity-50 relative overflow-hidden"
                  >
                    {joiningInviteId === inv.id ? (
                      <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        JOINING...
                      </motion.span>
                    ) : (
                      <>
                        <motion.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-neon-green/10 to-transparent pointer-events-none"
                        />
                        ⚡ ACCEPT
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => declineInvite(inv)}
                    className="py-3 px-5 rounded-xl bg-out-red/10 border border-out-red/20 font-display text-[10px] font-bold text-out-red tracking-wider"
                  >
                    ✕
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
