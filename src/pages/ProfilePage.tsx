import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import PlayerAvatar from "@/components/PlayerAvatar";
import TrophyCase from "@/components/TrophyCase";
import RankBadge from "@/components/RankBadge";
import FriendStatsModal from "@/components/FriendStatsModal";
import { usePvpStats } from "@/hooks/usePvpStats";
import { getRankTier, getNextTier, calculateRankPoints } from "@/lib/rankTiers";

/* ─── Types ─── */
interface BallRecord {
  userMove: string | number;
  aiMove: string | number;
  runs: number | "OUT";
  description: string;
}

interface MatchRecord {
  id: string;
  mode: string;
  user_score: number;
  ai_score: number;
  result: string;
  balls_played: number;
  created_at: string;
  innings_data: BallRecord[] | null;
}

function parseMatchBalls(balls: BallRecord[] | null, _isBattingFirst: boolean) {
  if (!balls || !balls.length) return null;
  let sixes = 0, fours = 0, threes = 0, twos = 0, singles = 0, dots = 0, wickets = 0;
  let aiSixes = 0, aiFours = 0, aiDots = 0;
  balls.forEach((b) => {
    if (b.runs === "OUT") { wickets++; return; }
    const r = typeof b.runs === "number" ? b.runs : 0;
    const absR = Math.abs(r);
    if (r > 0) {
      if (absR === 6) sixes++;
      else if (absR === 4) fours++;
      else if (absR === 3) threes++;
      else if (absR === 2) twos++;
      else if (absR === 1) singles++;
      else dots++;
    } else if (r < 0) {
      if (absR === 6) aiSixes++;
      else if (absR === 4) aiFours++;
      else if (absR === 0) aiDots++;
    } else { dots++; }
  });
  return { sixes, fours, threes, twos, singles, dots, wickets, aiSixes, aiFours, aiDots, totalBalls: balls.length };
}

/* ─── Achievements ─── */
type AchievementTier = "bronze" | "silver" | "gold" | "legendary";
interface Achievement {
  icon: string; title: string; desc: string; key: string; tier: AchievementTier; category: string;
  check: (p: any, stats?: any) => boolean;
  progress?: (p: any, stats?: any) => { current: number; target: number };
}

const TIER_STYLES: Record<AchievementTier, { bg: string; border: string; glow: string; label: string }> = {
  bronze: { bg: "from-[hsl(25,60%,40%)]/20 to-transparent", border: "border-[hsl(25,60%,40%)]/30", glow: "", label: "BRONZE" },
  silver: { bg: "from-[hsl(210,10%,65%)]/20 to-transparent", border: "border-[hsl(210,10%,65%)]/30", glow: "", label: "SILVER" },
  gold: { bg: "from-score-gold/20 to-transparent", border: "border-score-gold/30", glow: "shadow-[0_0_12px_hsl(45_93%_58%/0.15)]", label: "GOLD" },
  legendary: { bg: "from-primary/20 to-accent/10", border: "border-primary/40", glow: "shadow-[0_0_20px_hsl(217_91%_60%/0.2)]", label: "LEGENDARY" },
};

const ACHIEVEMENTS: Achievement[] = [
  { icon: "🏏", title: "First Steps", desc: "Play your first match", key: "first_match", tier: "bronze", category: "Milestones", check: (p) => (p?.total_matches ?? 0) >= 1, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 1), target: 1 }) },
  { icon: "🏆", title: "First Blood", desc: "Win your first match", key: "first_win", tier: "bronze", category: "Milestones", check: (p) => (p?.wins ?? 0) >= 1, progress: (p) => ({ current: Math.min(p?.wins ?? 0, 1), target: 1 }) },
  { icon: "🎮", title: "Regular", desc: "Play 10 matches", key: "ten_matches", tier: "bronze", category: "Milestones", check: (p) => (p?.total_matches ?? 0) >= 10, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 10), target: 10 }) },
  { icon: "⚡", title: "Veteran", desc: "Play 50 matches", key: "veteran", tier: "silver", category: "Milestones", check: (p) => (p?.total_matches ?? 0) >= 50, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 50), target: 50 }) },
  { icon: "👑", title: "Legend", desc: "Play 100 matches", key: "legend", tier: "gold", category: "Milestones", check: (p) => (p?.total_matches ?? 0) >= 100, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 100), target: 100 }) },
  { icon: "🌟", title: "Immortal", desc: "Play 500 matches", key: "immortal", tier: "legendary", category: "Milestones", check: (p) => (p?.total_matches ?? 0) >= 500, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 500), target: 500 }) },
  { icon: "🎯", title: "Sharpshooter", desc: "Win 10 matches", key: "ten_wins", tier: "bronze", category: "Winning", check: (p) => (p?.wins ?? 0) >= 10, progress: (p) => ({ current: Math.min(p?.wins ?? 0, 10), target: 10 }) },
  { icon: "💪", title: "Dominator", desc: "Win 25 matches", key: "25_wins", tier: "silver", category: "Winning", check: (p) => (p?.wins ?? 0) >= 25, progress: (p) => ({ current: Math.min(p?.wins ?? 0, 25), target: 25 }) },
  { icon: "🦁", title: "Champion", desc: "Win 50 matches", key: "50_wins", tier: "gold", category: "Winning", check: (p) => (p?.wins ?? 0) >= 50, progress: (p) => ({ current: Math.min(p?.wins ?? 0, 50), target: 50 }) },
  { icon: "🐉", title: "Unstoppable", desc: "Win 100 matches", key: "100_wins", tier: "legendary", category: "Winning", check: (p) => (p?.wins ?? 0) >= 100, progress: (p) => ({ current: Math.min(p?.wins ?? 0, 100), target: 100 }) },
  { icon: "🔥", title: "On Fire", desc: "Win 3 in a row", key: "streak_3", tier: "bronze", category: "Streaks", check: (p) => (p?.best_streak ?? 0) >= 3, progress: (p) => ({ current: Math.min(p?.best_streak ?? 0, 3), target: 3 }) },
  { icon: "💥", title: "Rampage", desc: "Win 5 in a row", key: "streak_5", tier: "silver", category: "Streaks", check: (p) => (p?.best_streak ?? 0) >= 5, progress: (p) => ({ current: Math.min(p?.best_streak ?? 0, 5), target: 5 }) },
  { icon: "☄️", title: "Supernova", desc: "Win 10 in a row", key: "streak_10", tier: "gold", category: "Streaks", check: (p) => (p?.best_streak ?? 0) >= 10, progress: (p) => ({ current: Math.min(p?.best_streak ?? 0, 10), target: 10 }) },
  { icon: "🌪️", title: "Godlike", desc: "Win 20 in a row", key: "streak_20", tier: "legendary", category: "Streaks", check: (p) => (p?.best_streak ?? 0) >= 20, progress: (p) => ({ current: Math.min(p?.best_streak ?? 0, 20), target: 20 }) },
  { icon: "5️⃣", title: "Half Century", desc: "Score 50+ in a match", key: "fifty", tier: "bronze", category: "Scoring", check: (p) => (p?.high_score ?? 0) >= 50, progress: (p) => ({ current: Math.min(p?.high_score ?? 0, 50), target: 50 }) },
  { icon: "💯", title: "Centurion", desc: "Score 100+ in a match", key: "century", tier: "silver", category: "Scoring", check: (p) => (p?.high_score ?? 0) >= 100, progress: (p) => ({ current: Math.min(p?.high_score ?? 0, 100), target: 100 }) },
  { icon: "🔱", title: "Double Century", desc: "Score 200+ in a match", key: "double_century", tier: "gold", category: "Scoring", check: (p) => (p?.high_score ?? 0) >= 200, progress: (p) => ({ current: Math.min(p?.high_score ?? 0, 200), target: 200 }) },
  { icon: "🏰", title: "Triple Threat", desc: "Score 300+ in a match", key: "triple_century", tier: "legendary", category: "Scoring", check: (p) => (p?.high_score ?? 0) >= 300, progress: (p) => ({ current: Math.min(p?.high_score ?? 0, 300), target: 300 }) },
  { icon: "6️⃣", title: "Six Machine", desc: "Hit 50 total sixes", key: "50_sixes", tier: "silver", category: "Batting", check: (_p, s) => (s?.totalSixes ?? 0) >= 50, progress: (_p: any, s: any) => ({ current: Math.min(s?.totalSixes ?? 0, 50), target: 50 }) },
  { icon: "4️⃣", title: "Boundary King", desc: "Hit 100 total fours", key: "100_fours", tier: "silver", category: "Batting", check: (_p, s) => (s?.totalFours ?? 0) >= 100, progress: (_p: any, s: any) => ({ current: Math.min(s?.totalFours ?? 0, 100), target: 100 }) },
  { icon: "💎", title: "Boundary Master", desc: "60%+ boundary rate", key: "boundary_master", tier: "gold", category: "Batting", check: (_p, s) => (s?.boundaryPct ?? 0) >= 60, progress: (_p: any, s: any) => ({ current: Math.min(s?.boundaryPct ?? 0, 60), target: 60 }) },
  { icon: "🪨", title: "Iron Will", desc: "Win after 5+ losses", key: "iron_will", tier: "silver", category: "Resilience", check: (p) => (p?.losses ?? 0) >= 5 && (p?.wins ?? 0) >= 1 },
  { icon: "🐢", title: "The Wall", desc: "0 abandons in 20+ matches", key: "the_wall", tier: "gold", category: "Resilience", check: (p) => (p?.total_matches ?? 0) >= 20 && (p?.abandons ?? 1) === 0, progress: (p) => ({ current: (p?.abandons ?? 1) === 0 ? Math.min(p?.total_matches ?? 0, 20) : 0, target: 20 }) },
  { icon: "🦅", title: "Comeback King", desc: "50%+ win rate with 50+ matches", key: "comeback", tier: "legendary", category: "Resilience", check: (p) => (p?.total_matches ?? 0) >= 50 && ((p?.wins ?? 0) / (p?.total_matches || 1)) >= 0.5, progress: (p) => ({ current: Math.min(p?.total_matches ?? 0, 50), target: 50 }) },
];

interface ProfileData {
  display_name: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  high_score: number;
  current_streak: number;
  best_streak: number;
  abandons: number;
  avatar_url: string | null;
  avatar_index: number;
  equipped_avatar_frame: string | null;
  equipped_bat_skin: string | null;
  equipped_vs_effect: string | null;
  xp: number;
  coins: number;
  rank_tier: string;
  total_sixes: number;
  total_fours: number;
  total_runs: number;
}

type TabType = "stats" | "matches" | "friends" | "trophy";

/* ─── Utility ─── */
const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE
   ═══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [myCode, setMyCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const { pvpRecord } = usePvpStats(user?.id);
  const [achieveFilter, setAchieveFilter] = useState<string>("All");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("display_name, total_matches, wins, losses, draws, high_score, current_streak, best_streak, abandons, avatar_url, avatar_index, equipped_avatar_frame, equipped_bat_skin, equipped_vs_effect, xp, coins, rank_tier, total_sixes, total_fours, total_runs")
      .eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data as unknown as ProfileData); });

    supabase.from("profiles").select("invite_code").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setMyCode((data as any).invite_code || ""); });

    supabase.from("matches")
      .select("id, mode, user_score, ai_score, result, balls_played, created_at, innings_data")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setMatches(data as unknown as MatchRecord[]); });

    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    const { data } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!data || !data.length) { setFriends([]); return; }
    const friendIds = data.map((f: any) => f.friend_id);
    const { data: profiles } = await supabase.from("profiles")
      .select("user_id, display_name, wins, losses, total_matches, high_score, best_streak, invite_code, avatar_url, avatar_index")
      .in("user_id", friendIds);
    if (profiles) setFriends(profiles);
  };

  const advancedStats = useMemo(() => {
    if (!matches.length) return null;
    const totalRuns = matches.reduce((s, m) => s + m.user_score, 0);
    const totalBalls = matches.reduce((s, m) => s + m.balls_played, 0);
    const totalAiRuns = matches.reduce((s, m) => s + m.ai_score, 0);
    const avgScore = Math.round(totalRuns / matches.length);
    const strikeRate = totalBalls ? Math.round((totalRuns / totalBalls) * 100) : 0;
    const highestWinMargin = matches.filter(m => m.result === "win").reduce((max, m) => Math.max(max, m.user_score - m.ai_score), 0);
    const biggestLoss = matches.filter(m => m.result === "loss").reduce((max, m) => Math.max(max, m.ai_score - m.user_score), 0);
    const modeCount: Record<string, number> = {};
    matches.forEach(m => { modeCount[m.mode] = (modeCount[m.mode] || 0) + 1; });
    const favMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "tap";
    const duckCount = matches.filter(m => m.user_score === 0).length;
    const fifties = matches.filter(m => m.user_score >= 50 && m.user_score < 100).length;
    const centuries = matches.filter(m => m.user_score >= 100).length;
    const lowestScore = Math.min(...matches.map(m => m.user_score));
    let totalSixes = 0, totalFours = 0, totalThrees = 0, totalTwos = 0, totalSingles = 0, totalDots = 0, totalWickets = 0;
    let totalAiSixes = 0, totalAiFours = 0;
    matches.forEach(m => {
      const parsed = parseMatchBalls(m.innings_data, true);
      if (parsed) {
        totalSixes += parsed.sixes; totalFours += parsed.fours; totalThrees += parsed.threes;
        totalTwos += parsed.twos; totalSingles += parsed.singles; totalDots += parsed.dots;
        totalWickets += parsed.wickets; totalAiSixes += parsed.aiSixes; totalAiFours += parsed.aiFours;
      }
    });
    const boundaryRuns = (totalSixes * 6) + (totalFours * 4);
    const boundaryPct = totalRuns > 0 ? Math.round((boundaryRuns / totalRuns) * 100) : 0;
    return {
      totalRuns, totalBalls, totalAiRuns, avgScore, strikeRate,
      highestWinMargin, biggestLoss, favMode, duckCount,
      fifties, centuries, lowestScore,
      totalSixes, totalFours, totalThrees, totalTwos, totalSingles, totalDots, totalWickets,
      totalAiSixes, totalAiFours, boundaryPct,
    };
  }, [matches]);

  const totalWins = (profile?.wins || 0) + (pvpRecord?.wins || 0);
  const totalMatches = (profile?.total_matches || 0) + (pvpRecord?.totalGames || 0);
  const totalLosses = (profile?.losses || 0) + (pvpRecord?.losses || 0);
  const totalDraws = (profile?.draws || 0) + (pvpRecord?.draws || 0);
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const level = profile ? Math.floor((profile.xp || 0) / 100) + 1 : 1;
  const xpInLevel = profile ? (profile.xp || 0) % 100 : 0;
  const unlockedCount = profile ? ACHIEVEMENTS.filter((a) => a.check(profile, advancedStats)).length : 0;

  const rankStats = {
    wins: totalWins,
    total_matches: totalMatches,
    high_score: Math.max(profile?.high_score || 0, pvpRecord?.highScore || 0),
    best_streak: Math.max(profile?.best_streak || 0, pvpRecord?.bestStreak || 0),
  };
  const tier = getRankTier(rankStats);
  const { next: nextTier, progress: rankProgress, pointsNeeded } = getNextTier(rankStats);
  const rankPoints = calculateRankPoints(rankStats);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "stats", label: "STATS", icon: "📊" },
    { key: "trophy", label: "TROPHY", icon: "🏆" },
    { key: "matches", label: "HISTORY", icon: "🏏" },
    { key: "friends", label: "FRIENDS", icon: "👥" },
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    setUploading(false);
  };

  const StatRow = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-muted/10 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[9px] text-muted-foreground font-display tracking-wider">{label}</span>
      </div>
      <span className={`font-display text-sm font-black ${color || "text-foreground"}`}>{value}</span>
    </div>
  );

  /* ── Equipped cosmetics list ── */
  const equippedItems = [
    profile?.equipped_bat_skin && { label: "BAT", value: profile.equipped_bat_skin, emoji: "🏏" },
    profile?.equipped_avatar_frame && { label: "FRAME", value: profile.equipped_avatar_frame, emoji: "🖼️" },
    profile?.equipped_vs_effect && { label: "VS FX", value: profile.equipped_vs_effect, emoji: "✨" },
  ].filter(Boolean) as { label: string; value: string; emoji: string }[];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-3 pt-3">

        {/* ═══════════════════════════════════════════════
            CLASH ROYALE-STYLE PLAYER CARD
            ═══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-4"
        >
          {/* Card outer border glow based on rank */}
          <div className={`absolute inset-0 rounded-2xl ${tier.glowColor}`} />

          {/* Card background */}
          <div className={`relative rounded-2xl border-2 ${tier.borderColor} bg-gradient-to-b from-[hsl(222_40%_14%)] to-[hsl(222_40%_8%)] overflow-hidden`}>
            {/* Top rank banner */}
            <div className={`relative px-4 py-2.5 ${tier.bgColor} border-b border-muted/10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="text-2xl"
                  >
                    {tier.emoji}
                  </motion.span>
                  <div>
                    <span className={`font-display text-[10px] font-black ${tier.color} tracking-[0.2em] block`}>
                      {tier.name.toUpperCase()} RANK
                    </span>
                    <span className="text-[8px] text-muted-foreground font-mono">{rankPoints} RP</span>
                  </div>
                </div>
                {user ? (
                  <button onClick={async () => { await signOut(); navigate("/"); }}
                    className="px-2.5 py-1 rounded-lg bg-game-red/10 border border-game-red/20 text-[7px] text-game-red/70 font-display font-bold tracking-wider">
                    SIGN OUT
                  </button>
                ) : (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/auth")}
                    className="px-3 py-1.5 bg-gradient-to-r from-primary/20 to-accent/10 text-primary font-display font-bold text-[8px] rounded-lg border border-primary/30 tracking-wider">
                    🔐 SIGN IN
                  </motion.button>
                )}
              </div>
              {/* Rank progress bar */}
              {nextTier && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] text-muted-foreground font-display tracking-wider">
                      Next: {nextTier.emoji} {nextTier.name}
                    </span>
                    <span className="text-[7px] text-muted-foreground font-mono">{pointsNeeded} RP</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${rankProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        tier.name === "Bronze" ? "from-[hsl(25_60%_50%)] to-[hsl(25_80%_60%)]" :
                        tier.name === "Silver" ? "from-[hsl(210_10%_60%)] to-[hsl(210_10%_75%)]" :
                        tier.name === "Gold" ? "from-score-gold to-[hsl(45_100%_65%)]" :
                        tier.name === "Diamond" ? "from-[hsl(192_91%_50%)] to-[hsl(192_91%_65%)]" :
                        "from-primary to-accent"
                      }`}
                    />
                  </div>
                </div>
              )}
              {!nextTier && (
                <div className="flex items-center gap-1 mt-1.5">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[7px] text-primary font-display font-bold tracking-widest">MAX RANK ACHIEVED</span>
                </div>
              )}
            </div>

            {/* Main player info */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Avatar with level badge */}
                <div className="relative">
                  <button onClick={() => user && fileInputRef.current?.click()} className="relative group" disabled={uploading}>
                    <PlayerAvatar avatarUrl={profile?.avatar_url} avatarIndex={profile?.avatar_index ?? 0} size="lg"
                      frame={profile?.equipped_avatar_frame} />
                    {user && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[8px] font-display font-bold text-white tracking-wider">{uploading ? "..." : "EDIT"}</span>
                      </div>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  {/* Level badge */}
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-gradient-to-br from-game-gold to-game-orange border-2 border-[hsl(222_40%_8%)] flex items-center justify-center">
                    <span className="font-display text-[10px] font-black text-[hsl(222_40%_8%)]">{level}</span>
                  </div>
                </div>

                {/* Name + XP + quick stats */}
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-base font-black text-foreground tracking-wider truncate">
                    {profile?.display_name || "PLAYER"}
                  </h1>
                  {/* XP bar */}
                  <div className="mt-1 mb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[7px] text-muted-foreground font-display tracking-wider">LVL {level}</span>
                      <span className="text-[7px] text-muted-foreground font-mono">{xpInLevel}/100 XP</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${xpInLevel}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-game-blue to-game-teal" />
                    </div>
                  </div>
                  {/* Coins */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🪙</span>
                    <span className="font-display text-xs font-black text-game-gold">{profile?.coins || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-column stat ribbon */}
            <div className="grid grid-cols-4 border-t border-muted/10">
              {[
                { value: totalWins, label: "WINS", color: "text-game-green" },
                { value: totalLosses, label: "LOSSES", color: "text-game-red" },
                { value: `${winRate}%`, label: "WIN RATE", color: "text-game-blue" },
                { value: Math.max(profile?.high_score || 0, pvpRecord?.highScore || 0), label: "HIGH", color: "text-game-gold" },
              ].map((s, i) => (
                <div key={s.label} className={`text-center py-2.5 ${i > 0 ? "border-l border-muted/10" : ""}`}>
                  <span className={`font-display text-lg font-black ${s.color} block leading-none`}>{s.value}</span>
                  <span className="text-[6px] text-muted-foreground font-display font-bold tracking-[0.15em]">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Equipped cosmetics strip */}
            {equippedItems.length > 0 && (
              <div className="border-t border-muted/10 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[7px] text-muted-foreground font-display tracking-widest shrink-0">EQUIPPED</span>
                {equippedItems.map(item => (
                  <div key={item.label} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/20 border border-muted/10 shrink-0">
                    <span className="text-xs">{item.emoji}</span>
                    <span className="text-[7px] text-foreground font-display font-bold tracking-wider">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent form strip */}
            {matches.length > 0 && (
              <div className="border-t border-muted/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[7px] text-muted-foreground font-display tracking-widest shrink-0">FORM</span>
                  <div className="flex gap-1">
                    {matches.slice(0, 10).map((m) => (
                      <div key={m.id} className={`w-5 h-5 rounded flex items-center justify-center text-[7px] font-display font-black ${
                        m.result === "win" ? "bg-game-green/20 text-game-green" :
                        m.result === "loss" ? "bg-game-red/20 text-game-red" :
                        "bg-game-gold/20 text-game-gold"
                      }`}>
                        {m.result === "win" ? "W" : m.result === "loss" ? "L" : "D"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ Tab Switcher ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-1 mb-4 rounded-xl p-1 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg font-display text-[8px] font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 shadow-[0_0_8px_hsl(217_91%_60%/0.15)]"
                  : "text-muted-foreground"
              }`}>
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* ═══ Tab Content ═══ */}
        <AnimatePresence mode="wait">
          {/* ═══════ STATS TAB ═══════ */}
          {activeTab === "stats" && (
            <motion.div key="stats" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              {/* Season stats grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { icon: "🏏", value: totalMatches, label: "MATCHES" },
                  { icon: "🔥", value: Math.max(profile?.best_streak || 0, pvpRecord?.bestStreak || 0), label: "STREAK" },
                  { icon: "🤝", value: totalDraws, label: "DRAWS" },
                  { icon: "🏳️", value: (profile?.abandons || 0) + (pvpRecord?.abandons || 0), label: "ABANDONS" },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="rounded-xl p-2.5 text-center bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                    <span className="text-base block mb-0.5">{s.icon}</span>
                    <span className="font-display text-lg font-black text-foreground block leading-none">{s.value}</span>
                    <span className="text-[5px] text-muted-foreground font-display font-bold tracking-[0.2em] mt-0.5 block">{s.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* PvP Record */}
              {pvpRecord && pvpRecord.totalGames > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="rounded-xl p-3 mb-4 bg-[hsl(222_40%_10%/0.8)] border border-primary/15">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">⚔️ PvP RECORD</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { icon: "⚔️", value: pvpRecord.totalGames, label: "GAMES", color: "text-foreground" },
                      { icon: "🏆", value: pvpRecord.wins, label: "WINS", color: "text-game-green" },
                      { icon: "💔", value: pvpRecord.losses, label: "LOSSES", color: "text-game-red" },
                      { icon: "📊", value: `${pvpRecord.totalGames > 0 ? Math.round((pvpRecord.wins / pvpRecord.totalGames) * 100) : 0}%`, label: "WIN%", color: "text-primary" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <span className="text-sm block">{s.icon}</span>
                        <span className={`font-display text-base font-black ${s.color} block leading-none mt-0.5`}>{s.value}</span>
                        <span className="text-[5px] font-display text-muted-foreground tracking-widest">{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "HIGH", value: pvpRecord.highScore, color: "text-game-gold" },
                      { label: "AVG", value: pvpRecord.avgScore, color: "text-foreground" },
                      { label: "BEST WIN", value: `+${pvpRecord.biggestWin}`, color: "text-game-green" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-1.5 text-center bg-muted/10 border border-muted/10">
                        <span className="text-[5px] font-display text-muted-foreground tracking-widest block">{s.label}</span>
                        <span className={`font-display text-sm font-black ${s.color}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Batting & Performance stats */}
              {advancedStats && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full bg-accent" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">BATTING STATS</span>
                  </div>
                  <div className="rounded-xl p-3 mb-4 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                    <StatRow icon="🏃" label="Total Runs" value={advancedStats.totalRuns} />
                    <StatRow icon="⚾" label="Total Balls" value={advancedStats.totalBalls} />
                    <StatRow icon="📈" label="Average" value={advancedStats.avgScore} />
                    <StatRow icon="⚡" label="Strike Rate" value={advancedStats.strikeRate} />
                    <StatRow icon="5️⃣" label="Fifties" value={advancedStats.fifties} />
                    <StatRow icon="💯" label="Centuries" value={advancedStats.centuries} />
                    <StatRow icon="🦆" label="Ducks" value={advancedStats.duckCount} />
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">SHOT DISTRIBUTION</span>
                  </div>
                  <div className="rounded-xl p-3 mb-4 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                    <StatRow icon="6️⃣" label="Sixes" value={advancedStats.totalSixes} color="text-game-purple" />
                    <StatRow icon="4️⃣" label="Fours" value={advancedStats.totalFours} color="text-game-green" />
                    <StatRow icon="3️⃣" label="Threes" value={advancedStats.totalThrees} />
                    <StatRow icon="2️⃣" label="Twos" value={advancedStats.totalTwos} />
                    <StatRow icon="1️⃣" label="Singles" value={advancedStats.totalSingles} />
                    <StatRow icon="⏺️" label="Dots" value={advancedStats.totalDots} />
                    <StatRow icon="💥" label="Boundary %" value={`${advancedStats.boundaryPct}%`} color="text-game-gold" />
                    <StatRow icon="❌" label="Outs" value={advancedStats.totalWickets} color="text-game-red" />
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full bg-game-gold" />
                    <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">PERFORMANCE</span>
                  </div>
                  <div className="rounded-xl p-3 mb-4 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                    <StatRow icon="📊" label="Current Streak" value={`${profile?.current_streak || 0} 🔥`} />
                    <StatRow icon="🏆" label="Biggest Win" value={`${advancedStats.highestWinMargin} runs`} color="text-game-green" />
                    <StatRow icon="💔" label="Biggest Loss" value={`${advancedStats.biggestLoss} runs`} color="text-game-red" />
                    <StatRow icon="🎯" label="Runs Conceded" value={advancedStats.totalAiRuns} />
                    <StatRow icon="🎮" label="Fav Mode" value={advancedStats.favMode.toUpperCase()} />
                  </div>
                </motion.div>
              )}

              {/* Achievements */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-primary" />
                  <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">ACHIEVEMENTS</span>
                  <span className="text-[8px] text-muted-foreground/50 font-display">{unlockedCount}/{ACHIEVEMENTS.length}</span>
                </div>
              </div>

              <div className="rounded-xl p-3 mb-3 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] text-muted-foreground font-display tracking-wider">COMPLETION</span>
                  <span className="font-display text-sm font-black text-primary">{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full" />
                </div>
                <div className="flex justify-between mt-1.5">
                  {(["bronze", "silver", "gold", "legendary"] as AchievementTier[]).map(t => {
                    const count = ACHIEVEMENTS.filter(a => a.tier === t && a.check(profile!, advancedStats)).length;
                    const total = ACHIEVEMENTS.filter(a => a.tier === t).length;
                    return (
                      <div key={t} className="text-center">
                        <span className="font-display text-[10px] font-black text-foreground">{count}/{total}</span>
                        <span className="text-[6px] text-muted-foreground font-display tracking-widest block">{TIER_STYLES[t].label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category filter */}
              <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
                {["All", ...Array.from(new Set(ACHIEVEMENTS.map(a => a.category)))].map(cat => (
                  <button key={cat} onClick={() => setAchieveFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-display text-[7px] font-bold tracking-widest whitespace-nowrap transition-all ${
                      achieveFilter === cat ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground/50"
                    }`}>
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.filter(a => achieveFilter === "All" || a.category === achieveFilter).map((a, i) => {
                  const unlocked = profile ? a.check(profile, advancedStats) : false;
                  const tierStyle = TIER_STYLES[a.tier];
                  const prog = a.progress && profile ? a.progress(profile, advancedStats) : null;
                  const progPct = prog ? Math.min(100, Math.round((prog.current / prog.target) * 100)) : 0;
                  return (
                    <motion.div key={a.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      className={`rounded-xl p-3 relative overflow-hidden ${tierStyle.border} border bg-[hsl(222_40%_10%/0.8)] ${unlocked ? tierStyle.glow : "opacity-50 grayscale"}`}>
                      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${tierStyle.bg} rounded-bl-full`} />
                      <div className="flex items-start gap-2 relative z-10">
                        <span className="text-xl">{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-display text-[10px] font-bold text-foreground block truncate">{a.title}</span>
                          <span className="text-[7px] text-muted-foreground block">{a.desc}</span>
                          <span className={`text-[6px] font-display font-bold tracking-widest mt-0.5 block ${
                            a.tier === "legendary" ? "text-primary" : a.tier === "gold" ? "text-score-gold" : a.tier === "silver" ? "text-muted-foreground" : "text-[hsl(25,60%,50%)]"
                          }`}>{tierStyle.label}</span>
                        </div>
                      </div>
                      {prog && !unlocked && (
                        <div className="mt-2 relative z-10">
                          <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary/60 to-primary/30 rounded-full transition-all" style={{ width: `${progPct}%` }} />
                          </div>
                          <span className="text-[6px] text-muted-foreground font-display mt-0.5 block">{prog.current}/{prog.target}</span>
                        </div>
                      )}
                      {unlocked ? (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-game-green/20 flex items-center justify-center z-10"><span className="text-[8px]">✅</span></div>
                      ) : (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center z-10"><span className="text-[7px]">🔒</span></div>
                      )}
                      {unlocked && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-game-green to-game-green/30" />}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══════ TROPHY CASE TAB ═══════ */}
          {activeTab === "trophy" && (
            <motion.div key="trophy" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <TrophyCase />
            </motion.div>
          )}

          {/* ═══════ MATCHES TAB ═══════ */}
          {activeTab === "matches" && (
            <motion.div key="matches" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/history")}
                className="w-full rounded-xl p-3 mb-4 flex items-center justify-between group bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📜</span>
                  <div>
                    <span className="font-display text-[10px] font-bold text-foreground tracking-wider block">FULL MATCH HISTORY</span>
                    <span className="text-[7px] text-muted-foreground">Filters, replay & detailed stats</span>
                  </div>
                </div>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
              </motion.button>

              {matches.length > 0 && (
                <div className="rounded-xl p-3 mb-4 flex items-center justify-between bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                  {[
                    { val: matches.filter(m => m.result === "win").length, label: "WON", color: "text-game-green" },
                    { val: matches.filter(m => m.result === "loss").length, label: "LOST", color: "text-game-red" },
                    { val: matches.filter(m => m.result === "draw").length, label: "DRAW", color: "text-game-gold" },
                    { val: matches.length, label: "TOTAL", color: "text-foreground" },
                  ].map((s) => (
                    <div key={s.label} className="text-center flex-1">
                      <span className={`font-display text-base font-black ${s.color} block leading-none`}>{s.val}</span>
                      <span className="text-[6px] text-muted-foreground font-display tracking-widest">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {matches.length === 0 ? (
                <div className="rounded-xl p-8 text-center bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                  <span className="text-3xl block mb-2">🏏</span>
                  <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO MATCHES YET</span>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Play your first match to see history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matches.map((m, i) => {
                    const modeIcon = m.mode === "ar" ? "📸" : m.mode === "tournament" ? "🏆" : m.mode === "multiplayer" ? "⚔️" : "👆";
                    const resultColor = m.result === "win" ? "text-game-green" : m.result === "loss" ? "text-game-red" : "text-game-gold";
                    const resultBg = m.result === "win" ? "from-game-green/10" : m.result === "loss" ? "from-game-red/10" : "from-game-gold/10";
                    const isExpanded = expandedMatch === m.id;
                    const margin = Math.abs(m.user_score - m.ai_score);
                    const runRate = m.balls_played > 0 ? (m.user_score / m.balls_played * 6).toFixed(1) : "0.0";
                    const aiRunRate = m.balls_played > 0 ? (m.ai_score / m.balls_played * 6).toFixed(1) : "0.0";
                    const ballStats = parseMatchBalls(m.innings_data, true);

                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl relative overflow-hidden cursor-pointer bg-[hsl(222_40%_10%/0.8)] border border-muted/10"
                        onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                        <div className={`absolute inset-0 bg-gradient-to-r ${resultBg} to-transparent opacity-30`} />
                        <div className="p-3 flex items-center gap-3 relative z-10">
                          <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center text-lg">{modeIcon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-display text-[10px] font-bold ${resultColor} tracking-wider`}>{m.result.toUpperCase()}</span>
                              <span className="text-[7px] text-muted-foreground font-display px-1.5 py-0.5 rounded bg-muted/20">{m.mode.toUpperCase()}</span>
                              {m.result !== "draw" && <span className={`text-[7px] ${resultColor} opacity-70 font-display`}>by {margin}</span>}
                            </div>
                            <span className="text-[8px] text-muted-foreground">{m.balls_played} balls • RR {runRate} • {getTimeAgo(m.created_at)}</span>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-base font-black text-game-gold">{m.user_score}</span>
                              <span className="text-[8px] text-muted-foreground">vs</span>
                              <span className="font-display text-base font-black text-accent">{m.ai_score}</span>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="px-3 pb-3 pt-1 border-t border-muted/10 relative z-10">
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  <div className="rounded-lg p-2 text-center bg-muted/10 border border-muted/10">
                                    <span className="text-[7px] text-muted-foreground font-display tracking-widest block">YOU</span>
                                    <span className="font-display text-lg font-black text-game-gold">{m.user_score}</span>
                                    <span className="text-[7px] text-muted-foreground block">RR {runRate}</span>
                                  </div>
                                  <div className="rounded-lg p-2 text-center bg-muted/10 border border-muted/10">
                                    <span className="text-[7px] text-muted-foreground font-display tracking-widest block">AI</span>
                                    <span className="font-display text-lg font-black text-accent">{m.ai_score}</span>
                                    <span className="text-[7px] text-muted-foreground block">RR {aiRunRate}</span>
                                  </div>
                                </div>
                                {ballStats && (
                                  <div className="rounded-lg p-2 mb-3 bg-muted/10 border border-muted/10">
                                    <span className="text-[7px] text-muted-foreground font-display tracking-widest block mb-2">BATTING BREAKDOWN</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {[
                                        { label: "6s", val: ballStats.sixes, color: "text-game-purple" },
                                        { label: "4s", val: ballStats.fours, color: "text-game-green" },
                                        { label: "3s", val: ballStats.threes, color: "text-game-gold" },
                                        { label: "2s", val: ballStats.twos, color: "text-accent" },
                                        { label: "1s", val: ballStats.singles, color: "text-foreground" },
                                        { label: "Dots", val: ballStats.dots, color: "text-muted-foreground" },
                                        { label: "Outs", val: ballStats.wickets, color: "text-game-red" },
                                        { label: "Balls", val: ballStats.totalBalls, color: "text-foreground" },
                                      ].map(s => (
                                        <div key={s.label} className="text-center py-1">
                                          <span className={`font-display text-sm font-black ${s.color} block leading-none`}>{s.val}</span>
                                          <span className="text-[6px] text-muted-foreground font-display tracking-widest">{s.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {m.innings_data && Array.isArray(m.innings_data) && m.innings_data.length > 0 && (
                                  <div className="rounded-lg p-2 mb-3 bg-muted/10 border border-muted/10">
                                    <span className="text-[7px] text-muted-foreground font-display tracking-widest block mb-2">BALL-BY-BALL</span>
                                    <div className="flex flex-wrap gap-1">
                                      {(m.innings_data as BallRecord[]).map((b, bi) => {
                                        const isOut = b.runs === "OUT";
                                        const r = typeof b.runs === "number" ? b.runs : 0;
                                        const absR = Math.abs(r);
                                        let bg = "bg-muted/30 text-muted-foreground";
                                        if (isOut) bg = "bg-game-red/20 text-game-red";
                                        else if (absR === 6) bg = "bg-game-purple/20 text-game-purple";
                                        else if (absR === 4) bg = "bg-game-green/20 text-game-green";
                                        else if (absR >= 2) bg = "bg-game-gold/20 text-game-gold";
                                        else if (absR === 1) bg = "bg-accent/20 text-accent";
                                        return (
                                          <div key={bi} className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-display font-black ${bg}`}>
                                            {isOut ? "W" : absR}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-1.5 text-[8px]">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Result</span>
                                    <span className={`font-bold ${resultColor}`}>
                                      {m.result === "draw" ? "Match Tied" : `${m.result === "win" ? "Won" : "Lost"} by ${margin} runs`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Played On</span>
                                    <span className="font-bold text-foreground">{formatDate(m.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════ FRIENDS TAB ═══════ */}
          {activeTab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
              <div className="rounded-xl p-3 mb-4 flex items-center justify-between bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                <div>
                  <span className="text-[8px] text-muted-foreground font-display tracking-widest block">YOUR INVITE CODE</span>
                  <span className="font-display text-lg font-black text-primary tracking-[0.2em]">{myCode}</span>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigator.clipboard.writeText(myCode)}
                  className="px-3 py-2 rounded-xl bg-muted/10 border border-muted/10 text-[9px] font-display font-bold text-primary tracking-wider">
                  📋 COPY
                </motion.button>
              </div>

              {user && (
                <div className="rounded-xl p-3 mb-4 bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                  <span className="text-[8px] text-muted-foreground font-display tracking-widest block mb-1">PLAYER ID</span>
                  <span className="font-display text-[11px] font-bold text-foreground">{user.email}</span>
                </div>
              )}

              {friends.length === 0 ? (
                <div className="rounded-xl p-8 text-center bg-[hsl(222_40%_10%/0.8)] border border-muted/10">
                  <span className="text-3xl block mb-2">👥</span>
                  <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">NO FRIENDS YET</span>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Go to the Friends tab to add players</p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/friends")}
                    className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display text-[9px] font-bold tracking-wider">
                    ➕ ADD FRIENDS
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <span className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">FRIENDS ({friends.length})</span>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/friends")}
                      className="px-3 py-1.5 rounded-lg bg-muted/10 border border-muted/10 text-[8px] font-display font-bold text-primary tracking-wider">
                      ➕ ADD
                    </motion.button>
                  </div>
                  {friends.map((f: any, i: number) => {
                    const wr = f.total_matches > 0 ? Math.round((f.wins / f.total_matches) * 100) : 0;
                    return (
                      <motion.div key={f.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform bg-[hsl(222_40%_10%/0.8)] border border-muted/10"
                        onClick={() => setSelectedFriend(f)}>
                        <PlayerAvatar avatarUrl={f.avatar_url} avatarIndex={f.avatar_index ?? 0} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="font-display text-[11px] font-bold text-foreground block truncate">{f.display_name}</span>
                          <span className="text-[8px] text-muted-foreground">{f.wins}W {f.losses}L • {wr}% WR</span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-sm font-black text-game-gold block leading-none">{f.high_score}</span>
                          <span className="text-[6px] text-muted-foreground font-display tracking-widest">HIGH</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
      {selectedFriend && (
        <FriendStatsModal friend={selectedFriend} onClose={() => setSelectedFriend(null)} />
      )}
    </div>
  );
}
