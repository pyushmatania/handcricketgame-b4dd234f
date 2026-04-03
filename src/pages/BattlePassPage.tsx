import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Star, Crown, Gift, Zap, Trophy, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SFX, Haptics } from "@/lib/sounds";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/BottomNav";

/* ── Season config ── */
const SEASON_END = new Date("2026-05-01T00:00:00Z");
const SEASON_LABEL = "Season 3 — Thunder Strike";

/* ── Reward types ── */
interface PassReward {
  tier: number;
  xpNeeded: number;
  free: { icon: string; label: string; amount?: number };
  premium: { icon: string; label: string; amount?: number };
  milestone?: boolean;
}

const REWARDS: PassReward[] = [
  { tier: 1, xpNeeded: 100, free: { icon: "🪙", label: "Coins", amount: 50 }, premium: { icon: "🪙", label: "Coins", amount: 150 } },
  { tier: 2, xpNeeded: 250, free: { icon: "⭐", label: "XP Boost" }, premium: { icon: "🎨", label: "Blue Flame Bat" } },
  { tier: 3, xpNeeded: 400, free: { icon: "🪙", label: "Coins", amount: 75 }, premium: { icon: "💎", label: "Gems", amount: 10 } },
  { tier: 4, xpNeeded: 600, free: { icon: "📦", label: "Silver Chest" }, premium: { icon: "📦", label: "Gold Chest" } },
  { tier: 5, xpNeeded: 850, free: { icon: "🪙", label: "Coins", amount: 100 }, premium: { icon: "🖼️", label: "Epic Frame" }, milestone: true },
  { tier: 6, xpNeeded: 1100, free: { icon: "⚡", label: "Power Shot" }, premium: { icon: "🪙", label: "Coins", amount: 300 } },
  { tier: 7, xpNeeded: 1400, free: { icon: "🪙", label: "Coins", amount: 100 }, premium: { icon: "✨", label: "VS Effect" } },
  { tier: 8, xpNeeded: 1700, free: { icon: "📦", label: "Silver Chest" }, premium: { icon: "📦", label: "Mega Chest" } },
  { tier: 9, xpNeeded: 2050, free: { icon: "🪙", label: "Coins", amount: 150 }, premium: { icon: "💎", label: "Gems", amount: 25 } },
  { tier: 10, xpNeeded: 2500, free: { icon: "🏆", label: "Season Badge" }, premium: { icon: "👑", label: "Legendary Bat" }, milestone: true },
  { tier: 11, xpNeeded: 3000, free: { icon: "🪙", label: "Coins", amount: 200 }, premium: { icon: "🎭", label: "Rare Avatar" } },
  { tier: 12, xpNeeded: 3600, free: { icon: "⭐", label: "XP Boost x2" }, premium: { icon: "📦", label: "Legendary Chest" }, milestone: true },
];

/* ── Countdown hook ── */
function useCountdown(target: Date) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

/* ── Claim overlay ── */
function ClaimOverlay({ reward, onClose }: { reward: PassReward["free"]; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 14 }}
      >
        {/* Glow ring */}
        <motion.div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, hsl(45 93% 58% / 0.3), transparent 70%)",
            boxShadow: "0 0 60px hsl(45 93% 58% / 0.4), 0 0 120px hsl(45 93% 58% / 0.2)",
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-6xl">{reward.icon}</span>
        </motion.div>
        <h2 className="font-game-display text-secondary text-xl">REWARD CLAIMED!</h2>
        <p className="font-game-body text-foreground text-sm">
          {reward.label} {reward.amount ? `× ${reward.amount}` : ""}
        </p>
        <motion.button
          className="mt-4 px-8 py-3 rounded-xl font-game-display text-sm tracking-wider"
          style={{
            background: "linear-gradient(to bottom, hsl(45 93% 58%), hsl(36 90% 45%))",
            color: "hsl(222 47% 6%)",
            boxShadow: "0 4px 0 hsl(36 80% 30%), 0 6px 20px hsl(45 93% 58% / 0.3)",
          }}
          whileTap={{ scale: 0.95, y: 2 }}
          onClick={onClose}
        >
          COLLECT
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ── Tier Card ── */
function TierCard({
  reward,
  currentXp,
  isPremium,
  claimed,
  onClaim,
}: {
  reward: PassReward;
  currentXp: number;
  isPremium: boolean;
  claimed: Set<string>;
  onClaim: (key: string, r: PassReward["free"]) => void;
}) {
  const unlocked = currentXp >= reward.xpNeeded;
  const freeKey = `free-${reward.tier}`;
  const premKey = `prem-${reward.tier}`;
  const freeClaimed = claimed.has(freeKey);
  const premClaimed = claimed.has(premKey);

  return (
    <motion.div
      className={cn(
        "relative flex items-stretch gap-0 rounded-2xl overflow-hidden border-2",
        reward.milestone
          ? "border-secondary/60 shadow-[0_0_20px_hsl(45_93%_58%/0.2)]"
          : unlocked
            ? "border-primary/40"
            : "border-border/40"
      )}
      style={{
        background: unlocked
          ? "linear-gradient(135deg, hsl(222 40% 12%), hsl(222 40% 16%))"
          : "hsl(222 40% 8%)",
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: reward.tier * 0.04 }}
    >
      {/* Tier badge */}
      <div
        className={cn(
          "flex flex-col items-center justify-center w-14 shrink-0",
          reward.milestone ? "bg-secondary/20" : "bg-muted/50"
        )}
      >
        <span className={cn(
          "font-game-display text-lg",
          reward.milestone ? "text-secondary" : unlocked ? "text-primary" : "text-muted-foreground"
        )}>
          {reward.tier}
        </span>
        {reward.milestone && <Crown className="w-3.5 h-3.5 text-secondary mt-0.5" />}
      </div>

      {/* Free reward */}
      <div className="flex-1 flex items-center gap-2 px-3 py-3 border-r border-border/30">
        <span className="text-2xl">{reward.free.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-game-body text-[11px] text-foreground truncate">{reward.free.label}</p>
          {reward.free.amount && (
            <p className="font-game-display text-xs text-muted-foreground">×{reward.free.amount}</p>
          )}
        </div>
        {unlocked && !freeClaimed ? (
          <motion.button
            className="px-2 py-1 rounded-lg text-[10px] font-game-display"
            style={{
              background: "linear-gradient(to bottom, hsl(122 39% 49%), hsl(122 39% 38%))",
              color: "white",
              boxShadow: "0 2px 0 hsl(122 39% 28%)",
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onClaim(freeKey, reward.free)}
          >
            CLAIM
          </motion.button>
        ) : freeClaimed ? (
          <span className="text-[10px] text-accent font-game-display">✓</span>
        ) : (
          <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </div>

      {/* Premium reward */}
      <div className={cn(
        "flex-1 flex items-center gap-2 px-3 py-3 relative",
        !isPremium && "opacity-50"
      )}>
        {!isPremium && (
          <div className="absolute inset-0 bg-[hsl(222_40%_8%/0.6)] backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-secondary/60" />
          </div>
        )}
        <span className="text-2xl">{reward.premium.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-game-body text-[11px] text-secondary truncate">{reward.premium.label}</p>
          {reward.premium.amount && (
            <p className="font-game-display text-xs text-muted-foreground">×{reward.premium.amount}</p>
          )}
        </div>
        {isPremium && unlocked && !premClaimed ? (
          <motion.button
            className="px-2 py-1 rounded-lg text-[10px] font-game-display"
            style={{
              background: "linear-gradient(to bottom, hsl(45 93% 58%), hsl(36 90% 45%))",
              color: "hsl(222 47% 6%)",
              boxShadow: "0 2px 0 hsl(36 80% 30%)",
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onClaim(premKey, reward.premium)}
          >
            CLAIM
          </motion.button>
        ) : isPremium && premClaimed ? (
          <span className="text-[10px] text-secondary font-game-display">✓</span>
        ) : null}
      </div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function BattlePassPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const countdown = useCountdown(SEASON_END);
  const [isPremium, setIsPremium] = useState(false);
  const [coins, setCoins] = useState(0);
  const [currentXp, setCurrentXp] = useState(0);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [claimingReward, setClaimingReward] = useState<PassReward["free"] | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("xp, coins, has_premium_pass")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setCurrentXp(data.xp ?? 0);
        setCoins(data.coins ?? 0);
        setIsPremium(!!(data as any).has_premium_pass);
      }
    };
    load();
  }, [user]);

  const handlePurchasePremium = useCallback(async () => {
    if (!user || purchasing) return;
    if (coins < 500) {
      toast({ title: "Not enough coins", description: "You need 500 coins to unlock the Premium Pass.", variant: "destructive" });
      return;
    }
    setPurchasing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ coins: coins - 500, has_premium_pass: true } as any)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
      setPurchasing(false);
      return;
    }
    SFX.coinSpend();
    Haptics.coinSpend();
    setCoins((c) => c - 500);
    setIsPremium(true);
    setPurchasing(false);
    SFX.levelUp();
    Haptics.success();
    toast({ title: "🎉 Premium Pass Unlocked!", description: "You now have access to all premium rewards." });
  }, [user, coins, purchasing, toast]);

  const currentTier = useMemo(() => {
    let t = 0;
    for (const r of REWARDS) {
      if (currentXp >= r.xpNeeded) t = r.tier;
    }
    return t;
  }, [currentXp]);

  const nextReward = REWARDS.find((r) => r.tier === currentTier + 1);
  const progressPct = nextReward
    ? Math.min(
        ((currentXp - (REWARDS[currentTier - 1]?.xpNeeded ?? 0)) /
          (nextReward.xpNeeded - (REWARDS[currentTier - 1]?.xpNeeded ?? 0))) *
          100,
        100
      )
    : 100;

  const handleClaim = (key: string, reward: PassReward["free"]) => {
    SFX.rewardClaim();
    Haptics.rewardClaim();
    setClaimingReward(reward);
    setClaimed((prev) => new Set(prev).add(key));
  };

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      <TopBar />

      {/* Header */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-game-display text-lg text-foreground tracking-wide">BATTLE PASS</h1>
            <p className="font-game-body text-[10px] text-secondary tracking-wider">{SEASON_LABEL}</p>
          </div>
        </div>

        {/* Season countdown */}
        <div
          className="rounded-xl p-3 flex items-center justify-between border"
          style={{
            background: "linear-gradient(135deg, hsl(222 40% 10%), hsl(222 40% 14%))",
            borderColor: "hsl(222 25% 22% / 0.5)",
          }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-game-body text-[11px] text-muted-foreground">Season ends in</span>
          </div>
          <div className="flex gap-1.5">
            {[
              { val: countdown.d, label: "D" },
              { val: countdown.h, label: "H" },
              { val: countdown.m, label: "M" },
              { val: countdown.s, label: "S" },
            ].map((u) => (
              <div
                key={u.label}
                className="flex flex-col items-center rounded-lg px-2 py-1"
                style={{ background: "hsl(222 40% 8%)", border: "1px solid hsl(222 25% 20% / 0.4)" }}
              >
                <span className="font-game-display text-sm text-foreground leading-none">
                  {String(u.val).padStart(2, "0")}
                </span>
                <span className="font-game-body text-[8px] text-muted-foreground">{u.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="font-game-body text-[10px] text-muted-foreground uppercase tracking-wider">
              Tier {currentTier} → {currentTier + 1}
            </span>
            <span className="font-game-display text-[11px] text-primary">
              {currentXp} XP
            </span>
          </div>
          <div className="h-3 bg-muted rounded-lg border border-border/40 overflow-hidden">
            <motion.div
              className="h-full rounded-lg"
              style={{
                background: "linear-gradient(to right, hsl(217 91% 60%), hsl(217 91% 72%))",
                boxShadow: "0 0 8px hsl(217 91% 60% / 0.5)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Premium unlock */}
        {!isPremium && (
          <motion.button
            className="w-full mt-3 py-3 rounded-xl font-game-display text-sm tracking-wider flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, hsl(45 93% 58%), hsl(36 90% 48%))",
              color: "hsl(222 47% 6%)",
              boxShadow: "0 4px 0 hsl(36 80% 30%), 0 6px 20px hsl(45 93% 58% / 0.25)",
            }}
            whileTap={{ scale: 0.97, y: 2 }}
            onClick={handlePurchasePremium}
            disabled={purchasing}
          >
            <Crown className="w-4 h-4" />
            {purchasing ? "PURCHASING..." : `UNLOCK PREMIUM PASS — 500 Coins (${coins} available)`}
          </motion.button>
        )}
        {isPremium && (
          <div className="mt-3 flex items-center gap-2 justify-center">
            <Crown className="w-4 h-4 text-secondary" />
            <span className="font-game-display text-xs text-secondary tracking-wider">PREMIUM ACTIVE</span>
          </div>
        )}
      </div>

      {/* Track header */}
      <div className="px-4 mb-2 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-1">
          <Gift className="w-3.5 h-3.5 text-accent" />
          <span className="font-game-body text-[10px] text-muted-foreground uppercase tracking-wider">Free</span>
        </div>
        <div className="flex-1 flex items-center gap-1 justify-end">
          <Crown className="w-3.5 h-3.5 text-secondary" />
          <span className="font-game-body text-[10px] text-secondary/70 uppercase tracking-wider">Premium</span>
        </div>
      </div>

      {/* Reward tiers */}
      <div className="px-4 space-y-2 pb-4">
        {REWARDS.map((r) => (
          <TierCard
            key={r.tier}
            reward={r}
            currentXp={currentXp}
            isPremium={isPremium}
            claimed={claimed}
            onClaim={handleClaim}
          />
        ))}
      </div>

      {/* Claim overlay */}
      <AnimatePresence>
        {claimingReward && (
          <ClaimOverlay reward={claimingReward} onClose={() => setClaimingReward(null)} />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
