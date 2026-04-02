import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import RivalryCard from "@/components/RivalryCard";
import FriendStatsModal from "@/components/FriendStatsModal";
import RankBadge from "@/components/RankBadge";
import WeeklyChallengesCard from "@/components/WeeklyChallengesCard";
import AchievementFeed from "@/components/AchievementFeed";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getRankTier } from "@/lib/rankTiers";
import { useWeeklyChallenges } from "@/hooks/useWeeklyChallenges";
import { toast } from "@/components/ui/use-toast";
import {
  createMultiplayerRoom,
  formatPostgrestError,
  logPostgrestError,
  mapCreateRoomError,
  mapInviteInsertError,
} from "@/lib/multiplayerRoom";

interface LeaderEntry {
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  high_score: number;
  total_matches: number;
  best_streak: number;
  abandons: number;
  user_id: string;
  avatar_index?: number;
}

interface FriendProfile {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  high_score: number;
  best_streak: number;
  abandons: number;
}

type MainTab = "friends" | "global" | "challenges" | "rivalry" | "records" | "seasons" | "rage";

interface SeasonEntry {
  user_id: string;
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  total_matches: number;
  high_score: number;
}

interface ArchivedSeason {
  season_label: string;
  season_start: string;
  season_end: string;
}
type GameType = "ar" | "tap" | "tournament";

const getWeekRange = (weeksAgo = 0) => {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

const formatSeasonLabel = (start: Date) => {
  const weekNum = Math.ceil(((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  return `Week ${weekNum} • ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(start.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
};

const SORT_OPTIONS = [
  { label: "WINS", icon: "🏆", key: "wins" as const },
  { label: "HIGH SCORE", icon: "⭐", key: "high_score" as const },
  { label: "MATCHES", icon: "🏏", key: "total_matches" as const },
  { label: "STREAK", icon: "🔥", key: "best_streak" as const },
];

const RAGE_TITLES = [
  { title: "🏆 Comeback King", desc: "Highest best streak", stat: (e: LeaderEntry) => e.best_streak, label: "streak", color: "from-neon-green/10 to-transparent" },
  { title: "🦆 Duck Master", desc: "Most losses", stat: (e: LeaderEntry) => e.losses, label: "losses", color: "from-secondary/10 to-transparent" },
  { title: "🏳️ Rage Quitter", desc: "Most abandoned matches", stat: (e: LeaderEntry) => e.abandons, label: "abandons", color: "from-out-red/10 to-transparent" },
  { title: "🏏 The Grinder", desc: "Most matches played", stat: (e: LeaderEntry) => e.total_matches, label: "matches", color: "from-primary/10 to-transparent" },
  { title: "💯 Big Hitter", desc: "Highest score ever", stat: (e: LeaderEntry) => e.high_score, label: "runs", color: "from-score-gold/10 to-transparent" },
  { title: "🤝 Peacemaker", desc: "Most draws", stat: (e: LeaderEntry) => e.draws, label: "draws", color: "from-accent/10 to-transparent" },
  { title: "🎯 Hitman", desc: "Best win rate (10+ matches)", stat: (e: LeaderEntry) => e.total_matches >= 10 ? Math.round((e.wins / e.total_matches) * 100) : 0, label: "win%", color: "from-neon-green/10 to-transparent" },
  { title: "😵 Bottler", desc: "Worst win rate (10+ matches)", stat: (e: LeaderEntry) => e.total_matches >= 10 ? Math.round((e.losses / e.total_matches) * 100) : 0, label: "loss%", color: "from-out-red/10 to-transparent" },
  { title: "🔥 Run Machine", desc: "Most total wins", stat: (e: LeaderEntry) => e.wins, label: "wins", color: "from-secondary/10 to-transparent" },
  { title: "🪨 The Wall", desc: "Fewest abandons (10+ matches)", stat: (e: LeaderEntry) => e.total_matches >= 10 ? e.total_matches - e.abandons : 0, label: "completed", color: "from-primary/10 to-transparent" },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("friends");
  const [sortBy, setSortBy] = useState(0);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [friendLeaders, setFriendLeaders] = useState<LeaderEntry[]>([]);
  const [rivalFriends, setRivalFriends] = useState<FriendProfile[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myStats, setMyStats] = useState<{ wins: number; total_matches: number; high_score: number; best_streak: number } | null>(null);
  const [seasonEntries, setSeasonEntries] = useState<SeasonEntry[]>([]);
  const [seasonWeeksAgo, setSeasonWeeksAgo] = useState(0);
  const [archivedSeasons, setArchivedSeasons] = useState<ArchivedSeason[]>([]);
  const [viewingArchive, setViewingArchive] = useState<string | null>(null);
  const [archiveEntries, setArchiveEntries] = useState<any[]>([]);
  const [challengeTargetId, setChallengeTargetId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  const { challenges, friendRankings, loading: challengesLoading } = useWeeklyChallenges();

  useEffect(() => {
    if (user) loadMyStats();
  }, [user]);

  useEffect(() => {
    if (mainTab === "global" || mainTab === "rage") loadGlobal();
    if (mainTab === "friends") loadFriends();
    if (mainTab === "rivalry") loadRivalFriends();
    if (mainTab === "seasons") { loadSeasonData(); loadArchivedSeasons(); }
  }, [mainTab, sortBy, seasonWeeksAgo]);

  const loadMyStats = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("wins, total_matches, high_score, best_streak").eq("user_id", user.id).single();
    if (data) setMyStats(data as any);
  };

  const loadGlobal = async () => {
    const col = SORT_OPTIONS[sortBy].key;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, wins, losses, draws, high_score, total_matches, best_streak, abandons, user_id, avatar_index")
      .gt("total_matches", 0)
      .order(col, { ascending: false })
      .limit(50);
    if (data) {
      setLeaders(data as unknown as LeaderEntry[]);
      if (user) {
        const idx = data.findIndex((p: any) => p.user_id === user.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    }
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: friendRows } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!friendRows) { setFriendLeaders([]); return; }
    const ids = [user.id, ...friendRows.map((f: any) => f.friend_id)];
    const col = SORT_OPTIONS[sortBy].key;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, wins, losses, draws, high_score, total_matches, best_streak, abandons, user_id, avatar_index")
      .in("user_id", ids)
      .order(col, { ascending: false });
    if (data) setFriendLeaders(data as unknown as LeaderEntry[]);
  };

  const loadRivalFriends = async () => {
    if (!user) return;
    const { data: friendRows } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!friendRows || !friendRows.length) { setRivalFriends([]); return; }
    const ids = friendRows.map((f: any) => f.friend_id);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, wins, losses, total_matches, high_score, best_streak, abandons")
      .in("user_id", ids);
    if (data) setRivalFriends(data as unknown as FriendProfile[]);
  };

  const challengeFriend = async (friendId: string, gameType: GameType) => {
    if (!user) return;
    const { data: game, error: gameError } = await createMultiplayerRoom(user.id, gameType, friendId);
    if (gameError || !game) {
      if (gameError) logPostgrestError("leaderboard challenge create room failed", gameError, { host_id: user.id, to_user_id: friendId, game_type: gameType });
      toast({ title: "Battle room failed", description: gameError ? `${mapCreateRoomError(gameError)} — ${formatPostgrestError(gameError)}` : "Battle room creation returned no room data." });
      return;
    }
    const invitePayload = { game_id: (game as any).id, from_user_id: user.id, to_user_id: friendId, game_type: gameType, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() } as any;
    const { error: inviteError } = await supabase.from("match_invites").insert(invitePayload);
    if (inviteError) {
      logPostgrestError("leaderboard challenge invite insert failed", inviteError, { payload: invitePayload });
      await supabase.from("multiplayer_games").update({ status: "cancelled" as any, phase: "abandoned" as any }).eq("id", (game as any).id);
      toast({ title: "Battle invite failed", description: `${mapInviteInsertError(inviteError)} — ${formatPostgrestError(inviteError)}` });
      return;
    }
    toast({ title: "Battle invite sent", description: "Waiting room opened. Waiting for opponent..." });
    navigate(`/game/multiplayer?game=${(game as any).id}`);
  };

  const loadSeasonData = async () => {
    const { start, end } = getWeekRange(seasonWeeksAgo);
    const { data: matches } = await supabase.from("matches").select("user_id, result, user_score").gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    if (!matches || !matches.length) { setSeasonEntries([]); return; }
    const statsMap: Record<string, SeasonEntry> = {};
    for (const m of matches) {
      if (!statsMap[m.user_id]) statsMap[m.user_id] = { user_id: m.user_id, display_name: "", wins: 0, losses: 0, draws: 0, total_matches: 0, high_score: 0 };
      const s = statsMap[m.user_id];
      s.total_matches++;
      if (m.result === "win") s.wins++;
      else if (m.result === "loss") s.losses++;
      else s.draws++;
      s.high_score = Math.max(s.high_score, m.user_score);
    }
    const userIds = Object.keys(statsMap);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
    if (profiles) profiles.forEach((p: any) => { if (statsMap[p.user_id]) statsMap[p.user_id].display_name = p.display_name; });
    setSeasonEntries(Object.values(statsMap).sort((a, b) => b.wins - a.wins));
  };

  const loadArchivedSeasons = async () => {
    const { data } = await supabase.from("season_snapshots").select("season_label, season_start, season_end").order("season_start", { ascending: false }).limit(20);
    if (data) {
      const unique = data.filter((d: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.season_label === d.season_label) === i);
      setArchivedSeasons(unique as ArchivedSeason[]);
    }
  };

  const loadArchive = async (seasonLabel: string) => {
    setViewingArchive(seasonLabel);
    const { data } = await supabase.from("season_snapshots").select("*").eq("season_label", seasonLabel).order("rank", { ascending: true });
    setArchiveEntries(data || []);
  };

  const getBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const getScore = (entry: LeaderEntry) => {
    const k = SORT_OPTIONS[sortBy].key;
    return entry[k];
  };

  const activeList = mainTab === "friends" ? friendLeaders : leaders;
  const top3 = activeList.slice(0, 3);
  const rest = activeList.slice(3);
  const currentSeasonLabel = formatSeasonLabel(getWeekRange(seasonWeeksAgo).start);

  const mainTabs: { key: MainTab; label: string; icon: string }[] = [
    { key: "friends", label: "FRIENDS", icon: "👥" },
    { key: "challenges", label: "QUESTS", icon: "🎯" },
    { key: "records", label: "RECORDS", icon: "🏆" },
    { key: "global", label: "GLOBAL", icon: "🌍" },
    { key: "seasons", label: "SEASON", icon: "📅" },
    { key: "rivalry", label: "RIVALRY", icon: "⚔️" },
    { key: "rage", label: "RAGE", icon: "😤" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(45 93% 58% / 0.05) 0%, transparent 70%)" }} />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-secondary to-secondary/40" />
              <h1 className="font-display text-xl font-black text-foreground tracking-wider">LEADERBOARD</h1>
            </div>
            {myStats && <RankBadge stats={myStats} compact />}
          </div>
        </motion.div>

        {/* Scrollable tab bar */}
        <div className="flex gap-1 mb-3 glass-card rounded-xl p-1 overflow-x-auto no-scrollbar">
          {mainTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`shrink-0 px-3 py-2 rounded-lg font-display text-[8px] font-bold tracking-widest transition-all flex items-center gap-1 ${
                mainTab === t.key
                  ? "bg-gradient-to-r from-secondary/20 to-secondary/10 text-secondary border border-secondary/20"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort options (for global & friends) */}
        {(mainTab === "global" || mainTab === "friends") && (
          <div className="flex gap-1 mb-4">
            {SORT_OPTIONS.map((opt, i) => (
              <button key={opt.key} onClick={() => setSortBy(i)}
                className={`flex-1 py-1.5 rounded-lg font-display text-[7px] font-bold tracking-widest transition-all ${
                  sortBy === i ? "bg-primary/10 text-primary border border-primary/15" : "text-muted-foreground/50"
                }`}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* CHALLENGES TAB */}
          {mainTab === "challenges" && (
            <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {myStats && (
                <div className="mb-3">
                  <RankBadge stats={myStats} />
                </div>
              )}
              <WeeklyChallengesCard
                challenges={challenges}
                friendRankings={friendRankings}
                loading={challengesLoading}
              />
            </motion.div>
          )}

          {/* RECORDS / ACHIEVEMENT FEED TAB */}
          {mainTab === "records" && (
            <motion.div key="records" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-3 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-score-gold" />
                <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">RECORD BREAKS & REACTIONS</span>
              </div>
              <AchievementFeed />
            </motion.div>
          )}

          {/* SEASONS TAB */}
          {mainTab === "seasons" && (
            <motion.div key="seasons" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {!viewingArchive ? (
                <>
                  <div className="glass-premium rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setSeasonWeeksAgo(w => w + 1)} className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">◀</button>
                      <div className="text-center">
                        <span className="font-display text-[9px] font-bold text-secondary tracking-widest block">{seasonWeeksAgo === 0 ? "🔴 LIVE SEASON" : "PAST SEASON"}</span>
                        <span className="font-display text-[8px] text-muted-foreground">{currentSeasonLabel}</span>
                      </div>
                      <button onClick={() => setSeasonWeeksAgo(w => Math.max(0, w - 1))} disabled={seasonWeeksAgo === 0} className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">▶</button>
                    </div>
                    {seasonWeeksAgo === 0 && (
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        <span className="text-[7px] text-neon-green font-display tracking-widest">COMPETING NOW</span>
                      </div>
                    )}
                  </div>
                  {seasonEntries.length === 0 ? (
                    <div className="glass-premium rounded-2xl p-8 text-center">
                      <span className="text-4xl block mb-3">📅</span>
                      <p className="font-display text-sm font-bold text-foreground">No matches this week</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Play matches to climb the weekly leaderboard!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {seasonEntries.map((entry, i) => {
                        const isMe = user && entry.user_id === user.id;
                        const winRate = entry.total_matches > 0 ? Math.round((entry.wins / entry.total_matches) * 100) : 0;
                        return (
                          <motion.div key={entry.user_id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            className={`glass-premium rounded-xl p-3 flex items-center gap-3 ${isMe ? "border border-primary/25 shadow-[0_0_15px_hsl(217_91%_60%/0.1)]" : ""}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm ${
                              i === 0 ? "bg-gradient-to-br from-score-gold/20 to-score-gold/5 text-score-gold" :
                              i === 1 ? "bg-gradient-to-br from-accent/20 to-accent/5 text-accent" :
                              i === 2 ? "bg-gradient-to-br from-secondary/20 to-secondary/5 text-secondary" :
                              isMe ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"
                            }`}>{i < 3 ? getBadge(i + 1) : `#${i + 1}`}</div>
                            <div className="flex-1 min-w-0">
                              <span className={`font-display text-[11px] font-bold block ${isMe ? "text-primary" : "text-foreground"}`}>
                                {entry.display_name || "Player"}{isMe && <span className="text-[7px] text-primary/60 ml-1">(YOU)</span>}
                              </span>
                              <span className="text-[8px] text-muted-foreground font-display">{entry.total_matches} matches • {winRate}% WR • HS: {entry.high_score}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-display text-lg font-black text-secondary block leading-none">{entry.wins}</span>
                              <span className="text-[6px] text-muted-foreground font-display tracking-widest">WINS</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                  {archivedSeasons.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-muted-foreground/40 to-transparent" />
                        <span className="font-display text-[9px] font-bold text-muted-foreground tracking-widest">SEASON ARCHIVES</span>
                      </div>
                      <div className="space-y-1.5">
                        {archivedSeasons.map((s) => (
                          <button key={s.season_label} onClick={() => loadArchive(s.season_label)}
                            className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors">
                            <span className="text-lg">🏛️</span>
                            <div className="flex-1"><span className="font-display text-[10px] font-bold text-foreground block">{s.season_label}</span></div>
                            <span className="text-muted-foreground text-xs">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => { setViewingArchive(null); setArchiveEntries([]); }} className="glass-card rounded-xl px-4 py-2 font-display text-[9px] font-bold text-muted-foreground tracking-widest hover:text-foreground transition-colors">← BACK TO SEASONS</button>
                  <div className="glass-premium rounded-xl p-3 text-center">
                    <span className="text-2xl block mb-1">🏛️</span>
                    <span className="font-display text-[10px] font-bold text-secondary tracking-widest">{viewingArchive}</span>
                  </div>
                  <div className="space-y-2">
                    {archiveEntries.map((entry: any, i: number) => {
                      const isMe = user && entry.user_id === user.id;
                      return (
                        <motion.div key={entry.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className={`glass-premium rounded-xl p-3 flex items-center gap-3 ${isMe ? "border border-primary/25" : ""}`}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm bg-muted/40 text-muted-foreground">
                            {entry.rank <= 3 ? getBadge(entry.rank) : `#${entry.rank}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-display text-[11px] font-bold text-foreground block">{isMe ? "YOU" : "Player"}</span>
                            <span className="text-[8px] text-muted-foreground font-display">{entry.total_matches} matches • W{entry.wins} L{entry.losses} D{entry.draws}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display text-lg font-black text-secondary block leading-none">{entry.wins}</span>
                            <span className="text-[6px] text-muted-foreground font-display tracking-widest">WINS</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* RIVALRY TAB */}
          {mainTab === "rivalry" && (
            <motion.div key="rivalry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
              {rivalFriends.length === 0 ? (
                <div className="glass-premium rounded-2xl p-8 text-center">
                  <span className="text-4xl block mb-3">⚔️</span>
                  <p className="font-display text-sm font-bold text-foreground">Add friends to see rivalries!</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Play multiplayer against friends to build H2H stats</p>
                </div>
              ) : (
                rivalFriends.map((f, i) => (
                  <motion.div key={f.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <RivalryCard friend={f} onChallenge={(friendId) => setChallengeTargetId(friendId)} />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* RAGE STATS */}
          {mainTab === "rage" && (
            <motion.div key="rage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {RAGE_TITLES.map((rt, i) => {
                const sorted = [...leaders].sort((a, b) => rt.stat(b) - rt.stat(a));
                const winner = sorted[0];
                if (!winner || rt.stat(winner) === 0) return null;
                const runnerUp = sorted[1];
                const third = sorted[2];
                return (
                  <motion.div key={rt.title} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="glass-premium rounded-xl p-4 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${rt.color} rounded-bl-full`} />
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{rt.title.split(" ")[0]}</span>
                      <div>
                        <span className="font-display text-[11px] font-black text-foreground block">{rt.title.split(" ").slice(1).join(" ")}</span>
                        <span className="text-[8px] text-muted-foreground">{rt.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 glass-card rounded-xl p-2.5 mb-1.5">
                      <span className="text-lg">🥇</span>
                      <div className="flex-1">
                        <span className="font-display text-[10px] font-bold text-foreground">
                          {winner.display_name}{user && winner.user_id === user.id && <span className="text-primary/60 ml-1">(YOU)</span>}
                        </span>
                      </div>
                      <span className="font-display text-lg font-black text-secondary">{rt.stat(winner)}</span>
                      <span className="text-[7px] text-muted-foreground font-display">{rt.label}</span>
                    </div>
                    {runnerUp && rt.stat(runnerUp) > 0 && (
                      <div className="flex items-center gap-3 px-2.5 py-1.5 opacity-60">
                        <span className="text-sm">🥈</span>
                        <span className="font-display text-[9px] text-muted-foreground flex-1">{runnerUp.display_name}{user && runnerUp.user_id === user.id && <span className="text-primary/60 ml-1">(YOU)</span>}</span>
                        <span className="font-display text-sm font-bold text-muted-foreground">{rt.stat(runnerUp)}</span>
                      </div>
                    )}
                    {third && rt.stat(third) > 0 && (
                      <div className="flex items-center gap-3 px-2.5 py-1 opacity-40">
                        <span className="text-xs">🥉</span>
                        <span className="font-display text-[8px] text-muted-foreground flex-1">{third.display_name}{user && third.user_id === user.id && <span className="text-primary/60 ml-1">(YOU)</span>}</span>
                        <span className="font-display text-xs font-bold text-muted-foreground">{rt.stat(third)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* GLOBAL & FRIENDS RANKINGS */}
          {(mainTab === "global" || mainTab === "friends") && (
            <motion.div key={`${mainTab}-${sortBy}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeList.length === 0 ? (
                <div className="glass-premium rounded-2xl p-8 text-center">
                  <span className="text-4xl block mb-3">{mainTab === "friends" ? "👥" : "🏟️"}</span>
                  <p className="font-display text-sm font-bold text-foreground">{mainTab === "friends" ? "Add friends to see rankings!" : "No players yet"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{mainTab === "friends" ? "Go to the Friends tab to add players" : "Be the first to play!"}</p>
                </div>
              ) : (
                <>
                  {/* Top 3 podium */}
                  {top3.length >= 3 && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-end justify-center gap-3 mb-5">
                      {[top3[1], top3[0], top3[2]].map((p, i) => {
                        const heights = ["h-24", "h-32", "h-20"];
                        const sizes = ["text-3xl", "text-4xl", "text-2xl"];
                        const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                        const isMe = user && p.user_id === user.id;
                        const tier = getRankTier(p);
                        const glows = [
                          "shadow-[0_0_15px_hsl(192_91%_70%/0.15)]",
                          "shadow-[0_0_25px_hsl(45_93%_58%/0.2)]",
                          "shadow-[0_0_10px_hsl(30_70%_55%/0.1)]",
                        ];
                        return (
                          <div key={p.user_id} className="flex flex-col items-center">
                            <span className={`${sizes[i]} mb-1`}>{getBadge(rank)}</span>
                            <div className={`mb-1`}>
                              <PlayerAvatar avatarIndex={p.avatar_index ?? 0} size="sm" />
                            </div>
                            <div className={`w-18 ${heights[i]} rounded-t-2xl glass-premium border ${isMe ? "border-primary/30" : "border-primary/10"} flex flex-col items-center justify-end pb-3 px-2 ${glows[i]}`}>
                              <span className="font-display text-xl font-black text-secondary leading-none" style={{ textShadow: "0 0 15px hsl(45 93% 58% / 0.3)" }}>{getScore(p)}</span>
                              <span className="text-[6px] text-muted-foreground font-display tracking-widest mt-0.5">{SORT_OPTIONS[sortBy].label}</span>
                            </div>
                            <div className="w-18 glass-card border-t-0 rounded-b-xl py-1.5 text-center">
                              <span className={`text-[7px] font-display font-bold block truncate px-1 ${isMe ? "text-primary" : "text-foreground"}`}>{p.display_name}{isMe && " ★"}</span>
                              <span className={`text-[6px] ${tier.color} font-display`}>{tier.emoji} {tier.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* List */}
                  <div className="space-y-2">
                    {rest.map((player, i) => {
                      const isMe = user && player.user_id === user.id;
                      const winRate = player.total_matches > 0 ? Math.round((player.wins / player.total_matches) * 100) : 0;
                      const tier = getRankTier(player);
                      return (
                        <motion.div key={player.user_id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                          onClick={() => { if (mainTab === "friends" && !isMe) setSelectedFriendId(player.user_id); }}
                          className={`glass-premium rounded-xl p-3 flex items-center gap-3 ${isMe ? "border border-primary/25 shadow-[0_0_15px_hsl(217_91%_60%/0.1)]" : ""} ${mainTab === "friends" && !isMe ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs ${isMe ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                            #{i + 4}
                          </div>
                          <PlayerAvatar avatarIndex={player.avatar_index ?? 0} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-display text-[11px] font-bold ${isMe ? "text-primary" : "text-foreground"}`}>
                                {player.display_name}{isMe && <span className="text-[7px] text-primary/60 ml-1">(YOU)</span>}
                              </span>
                              <span className={`text-[7px] ${tier.color} font-display`}>{tier.emoji}</span>
                            </div>
                            <span className="text-[8px] text-muted-foreground font-display">{player.total_matches} matches • {winRate}% WR</span>
                          </div>
                          <div className="text-right">
                            <span className="font-display text-lg font-black text-secondary block leading-none">{getScore(player)}</span>
                            <span className="text-[6px] text-muted-foreground font-display tracking-widest">{SORT_OPTIONS[sortBy].label}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your position (global only) */}
        {mainTab === "global" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-5 glass-premium rounded-2xl p-4 flex items-center gap-3 border border-primary/10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center">
              <span className="text-lg">{user ? "🏏" : "👤"}</span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-muted-foreground font-display tracking-[0.2em]">YOUR RANK</p>
              <p className="font-display text-2xl font-black text-foreground" style={{ textShadow: myRank ? "0 0 15px hsl(217 91% 60% / 0.2)" : "none" }}>
                {myRank ? `#${myRank}` : "—"}
              </p>
            </div>
            {!user && <p className="text-[8px] text-muted-foreground font-display tracking-wider">Sign in to track</p>}
          </motion.div>
        )}
      </div>

      <BottomNav />
      {challengeTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm glass-premium rounded-3xl p-4 space-y-3 border border-primary/30 shadow-[0_0_40px_hsl(217_91%_60%/0.2)]">
            <p className="font-display text-xs text-foreground font-black tracking-wider">Which game should we play?</p>
            <p className="text-[9px] text-muted-foreground">Challenge your rival with the mode you want.</p>
            {([
              { key: "ar", icon: "📸", subtitle: "Futuristic AR showdown" },
              { key: "tap", icon: "⚡", subtitle: "Arcade speed challenge" },
              { key: "tournament", icon: "🏆", subtitle: "Championship clash" },
            ] as { key: GameType; icon: string; subtitle: string }[]).map((mode) => (
              <button key={mode.key} onClick={() => { void challengeFriend(challengeTargetId, mode.key); setChallengeTargetId(null); }}
                className="w-full p-3 rounded-2xl text-left bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30 font-display tracking-wider transition-transform active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background/40 border border-primary/30 flex items-center justify-center text-xl">{mode.icon}</div>
                  <div><p className="text-xs font-bold uppercase">{mode.key}</p><p className="text-[10px] text-muted-foreground">{mode.subtitle}</p></div>
                </div>
              </button>
            ))}
            <button onClick={() => setChallengeTargetId(null)} className="w-full py-2 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
      {selectedFriendId && (() => {
        const fl = friendLeaders.find(f => f.user_id === selectedFriendId);
        if (!fl) return null;
        return (
          <FriendStatsModal
            friend={{ ...fl, avatar_index: fl.avatar_index ?? 0 }}
            onClose={() => setSelectedFriendId(null)}
            onChallenge={(friendId) => { setSelectedFriendId(null); setChallengeTargetId(friendId); }}
          />
        );
      })()}
    </div>
  );
}
