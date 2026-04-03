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
  draws?: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  current_streak?: number;
  abandons?: number;
  invite_code: string;
  avatar_url?: string | null;
  avatar_index?: number;
  xp?: number;
  coins?: number;
  rank_tier?: string;
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
      .select("user_id, display_name, wins, losses, draws, total_matches, high_score, best_streak, current_streak, abandons, invite_code, avatar_url, avatar_index, xp, coins, rank_tier")
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
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222_55%_10%)] to-background pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-game-blue to-[hsl(207_90%_44%)] border-b-3 border-[hsl(207_90%_35%)] flex items-center justify-center text-lg shadow-[0_4px_12px_hsl(207_90%_54%/0.3)]">
              👥
            </div>
            <div>
              <h1 className="font-game-title text-lg text-foreground">Friends</h1>
              <span className="text-[8px] text-muted-foreground font-game-display tracking-[0.2em]">PLAY TOGETHER</span>
            </div>
          </div>
        </motion.div>

        {/* My invite code — game card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-game-gold/30 bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-3.5 mb-4 flex items-center justify-between shadow-[0_0_16px_hsl(51_100%_50%/0.1)]"
        >
          <div>
            <span className="text-[8px] text-muted-foreground font-game-display tracking-widest block">YOUR INVITE CODE</span>
            <span className="font-game-display text-lg text-game-gold tracking-[0.2em]">{myCode}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={copyCode}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-game-gold to-[hsl(43_96%_42%)] border-b-2 border-[hsl(43_96%_32%)] text-game-dark font-game-display text-[8px] tracking-wider shadow-[0_2px_8px_hsl(51_100%_50%/0.3)] active:translate-y-[1px] active:border-b-0"
          >
            📋 COPY
          </motion.button>
        </motion.div>

        {/* Tabs — game-styled */}
        <div className="flex gap-1 mb-4 bg-game-dark/80 rounded-2xl p-1 border border-[hsl(222_25%_22%/0.5)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-xl font-game-display text-[8px] tracking-widest transition-all flex items-center justify-center gap-1 relative ${
                tab === t.key
                  ? "bg-gradient-to-b from-game-blue to-[hsl(207_90%_44%)] text-white border-b-2 border-[hsl(207_90%_35%)] shadow-[0_2px_8px_hsl(207_90%_54%/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
              {t.badge && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-game-red border-2 border-game-dark text-white text-[7px] font-game-display flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border-2 border-game-green/30 bg-game-green/10 p-2.5 mb-3 text-center"
            >
              <span className="text-[10px] font-game-card text-foreground">{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* FRIENDS LIST */}
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {friends.length === 0 ? (
                <div className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.5)] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-8 text-center">
                  <span className="text-4xl block mb-3">👥</span>
                  <span className="font-game-title text-sm text-foreground">No Friends Yet</span>
                  <p className="text-[9px] text-muted-foreground font-game-body mt-1">Add friends to play together!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {friends.map((f, i) => {
                    const winRate = f.total_matches > 0 ? Math.round((f.wins / f.total_matches) * 100) : 0;
                    const isHotStreak = (f.current_streak ?? 0) >= 3;
                    return (
                      <motion.div
                        key={f.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
                        className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.5)] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-3 flex items-center gap-3 cursor-pointer active:scale-[0.97] transition-transform"
                        onClick={() => setSelectedFriend(f)}
                      >
                        {/* Avatar with streak indicator */}
                        <div className="relative">
                          <div className={`rounded-full border-2 ${isHotStreak ? "border-game-red shadow-[0_0_10px_hsl(4_90%_58%/0.3)]" : "border-[hsl(222_25%_22%)]"}`}>
                            <PlayerAvatar avatarUrl={f.avatar_url} avatarIndex={f.avatar_index ?? 0} size="sm" />
                          </div>
                          {isHotStreak && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-game-red border-2 border-game-dark flex items-center justify-center">
                              <span className="text-[7px]">🔥</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-game-card text-xs font-bold text-foreground truncate">{f.display_name}</span>
                            {f.rank_tier && (
                              <span className="text-[7px] font-game-display text-game-gold">{f.rank_tier === "Diamond" ? "💎" : f.rank_tier === "Gold" ? "🥇" : f.rank_tier === "Silver" ? "🥈" : "🏅"}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-muted-foreground font-game-body">{f.wins}W {f.losses}L</span>
                            <span className="text-[8px] text-game-green font-game-display">{winRate}%</span>
                          </div>
                        </div>

                        {/* Battle button */}
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); setChallengeTargetId(f.user_id); }}
                          className="px-3 py-2 rounded-xl bg-gradient-to-b from-game-red to-[hsl(4_90%_45%)] border-b-2 border-[hsl(4_90%_35%)] text-white font-game-display text-[7px] tracking-wider shadow-[0_2px_8px_hsl(4_90%_58%/0.3)] active:translate-y-[1px] active:border-b-0"
                        >
                          ⚔️ BATTLE
                        </motion.button>

                        {/* High score */}
                        <div className="text-right min-w-[40px]">
                          <span className="font-game-display text-sm text-game-gold block leading-none">{f.high_score}</span>
                          <span className="text-[6px] text-muted-foreground font-game-display tracking-widest">HIGH</span>
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
                    <div className="w-8 h-8 rounded-lg bg-game-green/15 border border-game-green/25 flex items-center justify-center text-sm">📥</div>
                    <span className="font-game-display text-[8px] text-muted-foreground tracking-[0.25em]">INCOMING</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {incoming.map((r, i) => (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="rounded-2xl border-2 border-game-green/20 bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-game-green/10 border border-game-green/20 flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="flex-1">
                          <span className="font-game-card text-xs font-bold text-foreground block">{r.from_name}</span>
                          <span className="text-[8px] text-muted-foreground font-game-body">wants to be friends</span>
                        </div>
                        <div className="flex gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => acceptRequest(r.id)}
                            className="px-3 py-2 rounded-xl bg-gradient-to-b from-game-green to-[hsl(122_39%_38%)] border-b-2 border-[hsl(122_39%_30%)] text-white font-game-display text-[7px] tracking-wider active:translate-y-[1px]"
                          >
                            ✓ ACCEPT
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => rejectRequest(r.id)}
                            className="px-2.5 py-2 rounded-xl bg-game-dark border-2 border-game-red/30 text-game-red font-game-display text-[7px] tracking-wider"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}

              {outgoing.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-game-gold/15 border border-game-gold/25 flex items-center justify-center text-sm">📤</div>
                    <span className="font-game-display text-[8px] text-muted-foreground tracking-[0.25em]">SENT</span>
                  </div>
                  <div className="space-y-2">
                    {outgoing.map((r) => (
                      <div key={r.id} className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.3)] bg-gradient-to-b from-[hsl(222_40%_13%/0.6)] to-[hsl(222_40%_8%/0.7)] p-3 flex items-center gap-3 opacity-60">
                        <div className="w-10 h-10 rounded-xl bg-game-gold/10 border border-game-gold/15 flex items-center justify-center">
                          <span className="text-lg">📤</span>
                        </div>
                        <div className="flex-1">
                          <span className="font-game-card text-xs font-bold text-foreground block">{r.to_name}</span>
                          <span className="text-[8px] text-muted-foreground font-game-body">pending...</span>
                        </div>
                        <span className="text-[9px] text-game-gold font-game-display">⏳</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {incoming.length === 0 && outgoing.length === 0 && (
                <div className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.5)] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-8 text-center">
                  <span className="text-4xl block mb-3">📩</span>
                  <span className="font-game-title text-sm text-foreground">No Requests</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ADD FRIEND */}
          {tab === "add" && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* By invite code */}
              <div className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.5)] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-4">
                <span className="text-[8px] font-game-display text-muted-foreground tracking-widest block mb-3">ADD BY INVITE CODE</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={8}
                    className="flex-1 bg-game-dark border-2 border-[hsl(222_25%_22%)] rounded-xl px-3 py-2.5 text-sm text-foreground font-game-display tracking-widest placeholder:text-muted-foreground/30 focus:outline-none focus:border-game-blue/50 transition-all text-center"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={addByCode}
                    disabled={loading || inviteCode.length < 4}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-game-green to-[hsl(122_39%_38%)] border-b-2 border-[hsl(122_39%_30%)] text-white font-game-display text-[8px] tracking-wider disabled:opacity-40 active:translate-y-[1px]"
                  >
                    ADD
                  </motion.button>
                </div>
              </div>

              {/* By search */}
              <div className="rounded-2xl border-2 border-[hsl(222_25%_22%/0.5)] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-4">
                <span className="text-[8px] font-game-display text-muted-foreground tracking-widest block mb-3">SEARCH BY NAME</span>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Player name..."
                    className="flex-1 bg-game-dark border-2 border-[hsl(222_25%_22%)] rounded-xl px-3 py-2.5 text-sm text-foreground font-game-body placeholder:text-muted-foreground/30 focus:outline-none focus:border-game-blue/50 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && searchPlayers()}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={searchPlayers}
                    disabled={loading || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-game-dark border-2 border-game-blue/30 text-game-blue font-game-display text-[9px] disabled:opacity-40"
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
                        <div key={p.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-game-dark/60 border border-[hsl(222_25%_22%/0.4)]">
                          <PlayerAvatar avatarUrl={p.avatar_url} avatarIndex={p.avatar_index ?? 0} size="sm" />
                          <div className="flex-1">
                            <span className="font-game-card text-[10px] font-bold text-foreground block">{p.display_name}</span>
                            <span className="text-[7px] text-muted-foreground font-game-body">{p.wins}W • {p.total_matches} matches</span>
                          </div>
                          {alreadyFriend ? (
                            <span className="text-[8px] text-game-green font-game-display">✓ FRIENDS</span>
                          ) : alreadySent ? (
                            <span className="text-[8px] text-game-gold font-game-display">⏳ SENT</span>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => sendRequest(p.user_id)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-game-green to-[hsl(122_39%_38%)] border-b-2 border-[hsl(122_39%_30%)] text-white font-game-display text-[7px] tracking-wider"
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
        <div className="fixed inset-0 z-50 bg-[hsl(222_47%_4%/0.85)] backdrop-blur-md flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border-2 border-game-red/30 bg-gradient-to-b from-[hsl(222_40%_13%)] to-[hsl(222_40%_8%)] p-5 space-y-3 shadow-[0_0_30px_hsl(4_90%_58%/0.15)]"
          >
            <p className="font-game-title text-base text-foreground">Choose Battle Mode</p>
            <p className="text-[9px] text-muted-foreground font-game-body">Send a battle invite with your chosen format.</p>
            {([
              { key: "ar", icon: "📸", label: "AR Mode", subtitle: "Futuristic AR showdown", color: "from-game-purple to-[hsl(291_47%_40%)]" },
              { key: "tap", icon: "⚡", label: "Tap Mode", subtitle: "Arcade speed challenge", color: "from-game-blue to-[hsl(207_90%_44%)]" },
              { key: "tournament", icon: "🏆", label: "Tournament", subtitle: "Championship clash", color: "from-game-gold to-[hsl(43_96%_42%)]" },
            ] as { key: GameType; icon: string; label: string; subtitle: string; color: string }[]).map((mode) => (
              <motion.button
                key={mode.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  void challengeFriend(challengeTargetId, mode.key);
                  setChallengeTargetId(null);
                }}
                className={`w-full p-3.5 rounded-2xl text-left bg-gradient-to-r ${mode.color} border-b-3 border-[hsl(222_25%_15%)] active:translate-y-[1px] transition-transform`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[hsl(222_47%_6%/0.4)] border border-white/10 flex items-center justify-center text-xl">{mode.icon}</div>
                  <div>
                    <p className="text-sm font-game-display text-white tracking-wider">{mode.label}</p>
                    <p className="text-[9px] text-white/60 font-game-body">{mode.subtitle}</p>
                  </div>
                </div>
              </motion.button>
            ))}
            <button onClick={() => setChallengeTargetId(null)} className="w-full py-2.5 text-xs text-muted-foreground font-game-body hover:text-foreground transition-colors">Cancel</button>
          </motion.div>
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
