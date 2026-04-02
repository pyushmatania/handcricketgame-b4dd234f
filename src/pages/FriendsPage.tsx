import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import PlayerAvatar from "@/components/PlayerAvatar";
import FriendStatsModal from "@/components/FriendStatsModal";
import {
  createMultiplayerRoom,
  formatPostgrestError,
  logPostgrestError,
  mapCreateRoomError,
  mapInviteInsertError,
} from "@/lib/multiplayerRoom";

interface FriendProfile {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  invite_code: string;
  avatar_url?: string | null;
  avatar_index?: number;
}
type GameType = "ar" | "tap" | "tournament";

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_name?: string;
  to_name?: string;
}

type Tab = "friends" | "requests" | "add";

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [myCode, setMyCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [challengeTargetId, setChallengeTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMyCode();
    loadFriends();
    loadRequests();
  }, [user]);

  const loadMyCode = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("invite_code").eq("user_id", user.id).single();
    if (data) setMyCode((data as any).invite_code || "");
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!data || !data.length) { setFriends([]); return; }
    const friendIds = data.map((f: any) => f.friend_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, wins, losses, total_matches, high_score, best_streak, invite_code, avatar_url, avatar_index")
      .in("user_id", friendIds);
    if (profiles) setFriends(profiles as unknown as FriendProfile[]);
  };

  const loadRequests = async () => {
    if (!user) return;
    // Incoming
    const { data: inc } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("to_user_id", user.id)
      .eq("status", "pending");
    if (inc) {
      const fromIds = inc.map((r: any) => r.from_user_id);
      let names: Record<string, string> = {};
      if (fromIds.length) {
        const { data: p } = await supabase.from("profiles").select("user_id, display_name").in("user_id", fromIds);
        if (p) p.forEach((pr: any) => { names[pr.user_id] = pr.display_name; });
      }
      setIncoming(inc.map((r: any) => ({ ...r, from_name: names[r.from_user_id] || "Unknown" })));
    }
    // Outgoing
    const { data: out } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("from_user_id", user.id)
      .eq("status", "pending");
    if (out) {
      const toIds = out.map((r: any) => r.to_user_id);
      let names: Record<string, string> = {};
      if (toIds.length) {
        const { data: p } = await supabase.from("profiles").select("user_id, display_name").in("user_id", toIds);
        if (p) p.forEach((pr: any) => { names[pr.user_id] = pr.display_name; });
      }
      setOutgoing(out.map((r: any) => ({ ...r, to_name: names[r.to_user_id] || "Unknown" })));
    }
  };

  const searchPlayers = async () => {
    if (!user || !searchQuery.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, wins, losses, total_matches, high_score, best_streak, invite_code, avatar_url, avatar_index")
      .ilike("display_name", `%${searchQuery.trim()}%`)
      .neq("user_id", user.id)
      .limit(10);
    setSearchResults((data as unknown as FriendProfile[]) || []);
    setLoading(false);
  };

  const addByCode = async () => {
    if (!user || !inviteCode.trim()) return;
    setLoading(true);
    setFeedback("");
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .single();
    if (!data) {
      setFeedback("No player found with that code");
      setLoading(false);
      return;
    }
    if ((data as any).user_id === user.id) {
      setFeedback("That's your own code!");
      setLoading(false);
      return;
    }
    await sendRequest((data as any).user_id);
    setFeedback(`Request sent to ${(data as any).display_name}!`);
    setInviteCode("");
    setLoading(false);
    loadRequests();
  };

  const sendRequest = async (toId: string) => {
    if (!user) return;
    const { error } = await supabase.from("friend_requests").insert({
      from_user_id: user.id,
      to_user_id: toId,
    } as any);
    if (error) {
      if (error.code === "23505") setFeedback("Request already sent!");
      else setFeedback(error.message);
    } else {
      setFeedback("Friend request sent! ✅");
      loadRequests();
    }
  };

  const acceptRequest = async (requestId: string) => {
    await supabase.rpc("accept_friend_request", { request_id: requestId });
    loadRequests();
    loadFriends();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" } as any).eq("id", requestId);
    loadRequests();
  };

  const pendingCount = incoming.length;
  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: "friends", label: "FRIENDS", icon: "👥" },
    { key: "requests", label: "REQUESTS", icon: "📩", badge: pendingCount },
    { key: "add", label: "ADD", icon: "➕" },
  ];

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setFeedback("Code copied! 📋");
    setTimeout(() => setFeedback(""), 2000);
  };

  const challengeFriend = async (friendId: string, gameType: GameType) => {
    if (!user) return;
    const { data: game, error: gameError } = await createMultiplayerRoom(user.id, gameType, friendId);
    if (gameError || !game) {
      if (gameError) {
        logPostgrestError("challengeFriend create room failed", gameError, {
          host_id: user.id,
          to_user_id: friendId,
          game_type: gameType,
        });
      }

      setFeedback(
        gameError
          ? `${mapCreateRoomError(gameError)} — ${formatPostgrestError(gameError)}`
          : "Battle room creation returned no room data."
      );
      return;
    }
    const invitePayload = {
      game_id: (game as any).id,
      from_user_id: user.id,
      to_user_id: friendId,
      game_type: gameType,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    } as any;
    const { error: inviteError } = await supabase.from("match_invites").insert(invitePayload);
    if (inviteError) {
      logPostgrestError("challengeFriend invite insert failed", inviteError, {
        payload: invitePayload,
      });

      const { error: cancelError } = await supabase
        .from("multiplayer_games")
        .update({ status: "cancelled" as any, phase: "abandoned" as any })
        .eq("id", (game as any).id);

      if (cancelError) {
        logPostgrestError("challengeFriend cleanup room cancel failed", cancelError, {
          game_id: (game as any).id,
        });
      }

      setFeedback(`${mapInviteInsertError(inviteError)} — ${formatPostgrestError(inviteError)}`);
      return;
    }
    setFeedback("Battle invite sent! Waiting for opponent...");
    navigate(`/game/multiplayer?game=${(game as any).id}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-primary/40" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">FRIENDS</h1>
          </div>
        </motion.div>

        {/* My invite code */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-premium rounded-xl p-3 mb-4 flex items-center justify-between"
        >
          <div>
            <span className="text-[8px] text-muted-foreground font-display tracking-widest block">YOUR INVITE CODE</span>
            <span className="font-display text-lg font-black text-primary tracking-[0.2em]">{myCode}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={copyCode}
            className="px-3 py-2 rounded-xl glass-card text-[9px] font-display font-bold text-primary tracking-wider"
          >
            📋 COPY
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 glass-card rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all flex items-center justify-center gap-1 relative ${
                tab === t.key
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
              {t.badge && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-out-red text-white text-[7px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-premium rounded-xl p-2.5 mb-3 text-center"
            >
              <span className="text-[10px] font-display text-foreground">{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* FRIENDS LIST */}
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {friends.length === 0 ? (
                <div className="glass-premium rounded-xl p-8 text-center">
                  <span className="text-3xl block mb-2">👥</span>
                  <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO FRIENDS YET</span>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Add friends to play together!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f, i) => {
                    const winRate = f.total_matches > 0 ? Math.round((f.wins / f.total_matches) * 100) : 0;
                    return (
                      <motion.div
                        key={f.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-premium rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setSelectedFriend(f)}
                      >
                        <PlayerAvatar avatarUrl={f.avatar_url} avatarIndex={f.avatar_index ?? 0} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="font-display text-[11px] font-bold text-foreground block truncate">{f.display_name}</span>
                          <span className="text-[8px] text-muted-foreground">{f.wins}W {f.losses}L • {winRate}% WR</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); setChallengeTargetId(f.user_id); }}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[8px] font-bold tracking-wider"
                        >
                          LET'S BATTLE
                        </motion.button>
                        <div className="text-right">
                          <span className="font-display text-sm font-black text-secondary block leading-none">{f.high_score}</span>
                          <span className="text-[6px] text-muted-foreground font-display tracking-widest">HIGH</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* REQUESTS */}
          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {incoming.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-neon-green" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">INCOMING</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {incoming.map((r) => (
                      <div key={r.id} className="glass-premium rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                          <span className="text-sm">👤</span>
                        </div>
                        <div className="flex-1">
                          <span className="font-display text-[11px] font-bold text-foreground block">{r.from_name}</span>
                          <span className="text-[8px] text-muted-foreground">wants to be friends</span>
                        </div>
                        <div className="flex gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => acceptRequest(r.id)}
                            className="px-3 py-1.5 rounded-lg bg-neon-green/20 border border-neon-green/30 text-[8px] font-display font-bold text-neon-green tracking-wider"
                          >
                            ✓ ACCEPT
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => rejectRequest(r.id)}
                            className="px-2 py-1.5 rounded-lg bg-out-red/10 border border-out-red/20 text-[8px] font-display font-bold text-out-red tracking-wider"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {outgoing.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-secondary" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">SENT</span>
                  </div>
                  <div className="space-y-2">
                    {outgoing.map((r) => (
                      <div key={r.id} className="glass-premium rounded-xl p-3 flex items-center gap-3 opacity-60">
                        <div className="w-9 h-9 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                          <span className="text-sm">📤</span>
                        </div>
                        <div className="flex-1">
                          <span className="font-display text-[11px] font-bold text-foreground block">{r.to_name}</span>
                          <span className="text-[8px] text-muted-foreground">pending...</span>
                        </div>
                        <span className="text-[8px] text-secondary font-display">⏳</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {incoming.length === 0 && outgoing.length === 0 && (
                <div className="glass-premium rounded-xl p-8 text-center">
                  <span className="text-3xl block mb-2">📩</span>
                  <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO REQUESTS</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ADD FRIEND */}
          {tab === "add" && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* By invite code */}
              <div className="glass-premium rounded-xl p-4">
                <span className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-2">ADD BY INVITE CODE</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={8}
                    className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground font-display tracking-widest placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all text-center"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={addByCode}
                    disabled={loading || inviteCode.length < 4}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold text-[9px] tracking-wider disabled:opacity-40"
                  >
                    ADD
                  </motion.button>
                </div>
              </div>

              {/* By search */}
              <div className="glass-premium rounded-xl p-4">
                <span className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-2">SEARCH BY NAME</span>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Player name..."
                    className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground font-body placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && searchPlayers()}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={searchPlayers}
                    disabled={loading || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl glass-card border border-primary/20 text-primary font-display font-bold text-[9px] tracking-wider disabled:opacity-40"
                  >
                    🔍
                  </motion.button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((p) => {
                      const alreadyFriend = friends.some(f => f.user_id === p.user_id);
                      const alreadySent = outgoing.some(o => o.to_user_id === p.user_id);
                      return (
                        <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-xl glass-card">
                          <PlayerAvatar avatarUrl={p.avatar_url} avatarIndex={p.avatar_index ?? 0} size="sm" />
                          <div className="flex-1">
                            <span className="font-display text-[10px] font-bold text-foreground block">{p.display_name}</span>
                            <span className="text-[7px] text-muted-foreground">{p.wins}W • {p.total_matches} matches</span>
                          </div>
                          {alreadyFriend ? (
                            <span className="text-[8px] text-neon-green font-display">✓ FRIENDS</span>
                          ) : alreadySent ? (
                            <span className="text-[8px] text-secondary font-display">⏳ SENT</span>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => sendRequest(p.user_id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-[8px] font-display font-bold text-primary"
                            >
                              + ADD
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {challengeTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm glass-premium rounded-3xl p-4 space-y-3 border border-primary/30 shadow-[0_0_40px_hsl(217_91%_60%/0.2)]">
            <p className="font-display text-xs text-foreground font-black tracking-wider">Which game should we play?</p>
            <p className="text-[9px] text-muted-foreground">Send a battle invite with your chosen format.</p>
            {([
              { key: "ar", icon: "📸", subtitle: "Futuristic AR showdown" },
              { key: "tap", icon: "⚡", subtitle: "Arcade speed challenge" },
              { key: "tournament", icon: "🏆", subtitle: "Championship clash" },
            ] as { key: GameType; icon: string; subtitle: string }[]).map((mode) => (
              <button
                key={mode.key}
                onClick={() => {
                  void challengeFriend(challengeTargetId, mode.key);
                  setChallengeTargetId(null);
                }}
                className="w-full p-3 rounded-2xl text-left bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30 font-display tracking-wider transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background/40 border border-primary/30 flex items-center justify-center text-xl">{mode.icon}</div>
                  <div>
                    <p className="text-xs font-bold uppercase">{mode.key}</p>
                    <p className="text-[10px] text-muted-foreground">{mode.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
            <button onClick={() => setChallengeTargetId(null)} className="w-full py-2 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {selectedFriend && (
        <FriendStatsModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onChallenge={(friendId) => {
            setSelectedFriend(null);
            setChallengeTargetId(friendId);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
