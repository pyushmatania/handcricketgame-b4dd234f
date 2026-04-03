import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDailyLogin } from "@/hooks/useDailyLogin";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

/* ──── Reward Calendar Data (28-day cycle) ──── */
interface DayReward {
  day: number;
  coins: number;
  xp: number;
  type: "coins" | "chest" | "gems" | "mega_chest";
  icon: string;
  premium?: { coins: number; xp: number; icon: string };
}

function buildCalendar(): DayReward[] {
  const days: DayReward[] = [];
  for (let d = 1; d <= 28; d++) {
    const isWeekEnd = d % 7 === 0;
    const isMilestone = d === 14 || d === 28;
    const isMidWeek = d % 7 === 4;

    let type: DayReward["type"] = "coins";
    let icon = "🪙";
    let coins = 20 + Math.floor(d / 7) * 10;
    let xp = 10 + Math.floor(d / 7) * 5;

    if (isMilestone) {
      type = "mega_chest"; icon = "👑"; coins = 500; xp = 200;
    } else if (isWeekEnd) {
      type = "chest"; icon = "🎁"; coins = 200; xp = 100;
    } else if (isMidWeek) {
      type = "gems"; icon = "💎"; coins = 100; xp = 50;
    }

    days.push({
      day: d, coins, xp, type, icon,
      premium: { coins: coins * 2, xp: xp * 2, icon: type === "mega_chest" ? "🏆" : type === "chest" ? "✨" : "💰" },
    });
  }
  return days;
}

const CALENDAR = buildCalendar();

const cardBg = "linear-gradient(135deg, hsl(222 40% 13% / 0.9), hsl(222 40% 8% / 0.95))";
const cardShadow = "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

const TYPE_COLORS: Record<string, string> = {
  coins: "hsl(51,100%,50%)",
  chest: "hsl(122,39%,49%)",
  gems: "hsl(291,47%,51%)",
  mega_chest: "hsl(43,96%,56%)",
};

/* ──── Chest Opening Animation ──── */
function ChestOpenOverlay({ reward, onClose }: { reward: DayReward; onClose: () => void }) {
  const color = TYPE_COLORS[reward.type];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="rounded-3xl p-8 text-center max-w-[280px] w-full border-b-[4px]"
        style={{ background: cardBg, boxShadow: `0 8px 40px ${color}40, ${cardShadow}`, borderColor: `${color}50` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 60px ${color}15, 0 0 40px ${color}20` }}
        />

        <motion.span
          initial={{ y: -20, scale: 0 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 10 }}
          className="text-6xl block mb-4"
        >
          {reward.icon}
        </motion.span>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <span className="font-game-display text-lg tracking-wider block mb-1" style={{ color }}>
            DAY {reward.day} REWARD!
          </span>
          <span className="text-[10px] text-muted-foreground font-game-body block mb-4">
            {reward.type === "mega_chest" ? "MEGA CHEST UNLOCKED!" : reward.type === "chest" ? "CHEST UNLOCKED!" : "DAILY BONUS"}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-6 mb-6"
        >
          <div className="text-center">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: 2, duration: 0.3, delay: 0.8 }}
              className="font-game-display text-2xl block leading-none" style={{ color: "hsl(51,100%,60%)" }}>
              +{reward.coins}
            </motion.span>
            <span className="text-[8px] text-muted-foreground font-game-display tracking-widest">COINS</span>
          </div>
          <div className="w-px h-8" style={{ background: `${color}30` }} />
          <div className="text-center">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: 2, duration: 0.3, delay: 0.9 }}
              className="font-game-display text-2xl block leading-none" style={{ color: "hsl(207,90%,60%)" }}>
              +{reward.xp}
            </motion.span>
            <span className="text-[8px] text-muted-foreground font-game-display tracking-widest">XP</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-8 py-3 rounded-2xl font-game-display text-sm tracking-wider border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
          style={{
            background: `linear-gradient(to bottom, ${color}, ${color}cc)`,
            borderColor: `${color}80`,
            color: "white",
            boxShadow: `0 4px 16px ${color}40`,
          }}
        >
          COLLECT
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ──── Main Page ──── */
export default function DailyRewardsPage() {
  const navigate = useNavigate();
  const { streak, todayClaimed, STREAK_REWARDS } = useDailyLogin();
  const [showPremium, setShowPremium] = useState(false);
  const [openingReward, setOpeningReward] = useState<DayReward | null>(null);

  const cycleDay = ((streak - 1) % 28) + 1;
  const currentWeek = Math.ceil(cycleDay / 7);

  const weeks = useMemo(() => {
    const w: DayReward[][] = [];
    for (let i = 0; i < 4; i++) {
      w.push(CALENDAR.slice(i * 7, (i + 1) * 7));
    }
    return w;
  }, []);

  const handleDayClaim = (day: DayReward) => {
    if (day.day === cycleDay && todayClaimed) {
      setOpeningReward(day);
    }
  };

  return (
    <div className="min-h-screen bg-game-dark relative overflow-hidden pb-24">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(222 40% 18%) 0%, hsl(222 40% 6%) 70%)" }} />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <AnimatePresence>
        {openingReward && <ChestOpenOverlay reward={openingReward} onClose={() => setOpeningReward(null)} />}
      </AnimatePresence>

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm border-b-2"
            style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--border) / 0.2)" }}>
            ←
          </motion.button>
          <div className="flex-1">
            <h1 className="font-game-display text-lg tracking-wider text-game-gold">DAILY REWARDS</h1>
            <p className="text-[9px] text-muted-foreground font-game-body tracking-wide">Day {cycleDay} of 28 • Week {currentWeek}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-b-2"
            style={{ background: "hsl(4 90% 58% / 0.15)", borderColor: "hsl(4 90% 58% / 0.3)" }}>
            <span className="text-sm">🔥</span>
            <span className="font-game-display text-sm leading-none" style={{ color: "hsl(4,90%,65%)" }}>{streak}</span>
          </div>
        </motion.div>

        {/* Streak Progress Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl p-4 mb-4 border-b-[3px]"
          style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--game-gold) / 0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-game-display text-[10px] tracking-wider text-foreground">MONTHLY PROGRESS</span>
            <span className="font-game-display text-[9px]" style={{ color: "hsl(51,100%,60%)" }}>
              {Math.round((cycleDay / 28) * 100)}%
            </span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "hsl(222 40% 10%)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(cycleDay / 28) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(to right, hsl(122,39%,49%), hsl(51,100%,50%), hsl(43,96%,56%))",
                boxShadow: "0 0 8px hsl(51 100% 50% / 0.4)",
              }}
            />
            {/* Milestone markers */}
            {[7, 14, 21, 28].map(m => (
              <div key={m} className="absolute top-0 bottom-0 w-[2px]" style={{
                left: `${(m / 28) * 100}%`,
                background: cycleDay >= m ? "hsl(51,100%,70%)" : "hsl(var(--muted-foreground) / 0.2)",
              }} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {[7, 14, 21, 28].map(m => (
              <span key={m} className="text-[7px] font-game-display tracking-wider"
                style={{ color: cycleDay >= m ? "hsl(51,100%,60%)" : "hsl(var(--muted-foreground) / 0.3)" }}>
                {m === 7 ? "🎁" : m === 14 ? "👑" : m === 21 ? "🎁" : "🏆"} D{m}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Pass Toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex gap-2 mb-4">
          {[
            { id: false, label: "FREE PASS", icon: "🎟️", accent: "hsl(207,90%,54%)" },
            { id: true, label: "PREMIUM PASS", icon: "👑", accent: "hsl(43,96%,56%)" },
          ].map(p => (
            <motion.button key={String(p.id)} whileTap={{ scale: 0.95 }} onClick={() => setShowPremium(p.id as boolean)}
              className="flex-1 py-2.5 rounded-xl font-game-display text-[9px] tracking-widest flex items-center justify-center gap-1.5 border-b-2 transition-all"
              style={{
                background: showPremium === p.id ? `${p.accent}15` : "hsl(222 40% 12% / 0.8)",
                borderColor: showPremium === p.id ? `${p.accent}50` : "transparent",
                color: showPremium === p.id ? p.accent : "hsl(var(--muted-foreground) / 0.4)",
                boxShadow: showPremium === p.id ? `0 2px 12px ${p.accent}20` : "none",
              }}>
              <span className="text-sm">{p.icon}</span> {p.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Calendar Grid */}
        {weeks.map((week, wi) => (
          <motion.div key={wi} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + wi * 0.06 }} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-game-display text-[8px] tracking-[0.2em]"
                style={{ color: currentWeek === wi + 1 ? "hsl(51,100%,60%)" : "hsl(var(--muted-foreground) / 0.4)" }}>
                WEEK {wi + 1}
              </span>
              <div className="flex-1 h-px" style={{ background: "hsl(var(--border) / 0.1)" }} />
              {wi + 1 < currentWeek && <span className="text-[8px]">✅</span>}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {week.map((day) => {
                const isPast = day.day < cycleDay;
                const isCurrent = day.day === cycleDay;
                const isFuture = day.day > cycleDay;
                const isLocked = isFuture;
                const color = TYPE_COLORS[day.type];
                const reward = showPremium && day.premium ? day.premium : day;

                return (
                  <motion.button
                    key={day.day}
                    whileTap={!isLocked ? { scale: 0.9 } : {}}
                    onClick={() => handleDayClaim(day)}
                    className="relative rounded-xl p-1.5 text-center border-b-2 transition-all"
                    style={{
                      background: isCurrent
                        ? `linear-gradient(135deg, ${color}25, ${color}08)`
                        : isPast
                        ? "hsl(122 39% 49% / 0.08)"
                        : "hsl(222 40% 12% / 0.6)",
                      borderColor: isCurrent ? `${color}50` : isPast ? "hsl(122 39% 49% / 0.2)" : "transparent",
                      boxShadow: isCurrent ? `0 2px 12px ${color}25` : "none",
                      opacity: isLocked ? 0.4 : 1,
                    }}
                  >
                    {/* Current day pulse */}
                    {isCurrent && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: `inset 0 0 15px ${color}20` }}
                      />
                    )}

                    <span className="text-[7px] font-game-display tracking-wider block mb-0.5"
                      style={{ color: isCurrent ? color : isPast ? "hsl(122,70%,55%)" : "hsl(var(--muted-foreground) / 0.3)" }}>
                      D{day.day}
                    </span>

                    <motion.span
                      animate={isCurrent ? { y: [0, -3, 0] } : {}}
                      transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
                      className="text-lg block leading-none"
                    >
                      {isPast ? "✅" : isLocked ? "🔒" : (showPremium ? reward.icon : day.icon)}
                    </motion.span>

                    <span className="text-[6px] font-game-display block mt-0.5"
                      style={{ color: isCurrent ? "hsl(51,100%,60%)" : "hsl(var(--muted-foreground) / 0.3)" }}>
                      +{reward.coins}
                    </span>

                    {/* Premium sparkle */}
                    {showPremium && !isLocked && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[6px]"
                        style={{ background: "hsl(43,96%,56%)", boxShadow: "0 0 4px hsl(43 96% 56% / 0.5)" }}>
                        ✦
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Premium Upsell */}
        {!showPremium && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl p-4 text-center border-b-[3px] mb-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(43 96% 56% / 0.08), hsl(51 100% 50% / 0.03))", boxShadow: cardShadow, borderColor: "hsl(43 96% 56% / 0.3)" }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(to right, transparent, hsl(43 96% 56% / 0.5), transparent)" }} />
            <span className="text-3xl block mb-2">👑</span>
            <span className="font-game-display text-sm tracking-wider block mb-1" style={{ color: "hsl(43,96%,60%)" }}>PREMIUM PASS</span>
            <span className="text-[9px] text-muted-foreground font-game-body block mb-3">2× rewards on every day • Exclusive cosmetics • Mega chests</span>
            <motion.button whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 rounded-xl font-game-display text-[10px] tracking-wider border-b-[3px] active:border-b-[1px] active:translate-y-[2px]"
              style={{
                background: "linear-gradient(to bottom, hsl(43,96%,56%), hsl(43,96%,42%))",
                borderColor: "hsl(43,96%,32%)",
                color: "hsl(222 40% 10%)",
                boxShadow: "0 4px 16px hsl(43 96% 56% / 0.3)",
              }}>
              UNLOCK — 500 🪙
            </motion.button>
          </motion.div>
        )}

        {/* Weekly Streak Bonus */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl p-4 border-b-[3px] mb-4"
          style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(4 90% 58% / 0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔥</span>
            <span className="font-game-display text-[10px] tracking-wider text-foreground">STREAK BONUSES</span>
          </div>
          <div className="flex gap-1.5">
            {STREAK_REWARDS.map((r, i) => {
              const day = i + 1;
              const cycleDayInWeek = ((streak - 1) % 7) + 1;
              const isPast = day < cycleDayInWeek;
              const isCurrent = day === cycleDayInWeek;

              return (
                <div key={day} className="flex-1 rounded-lg p-1.5 text-center border-b-2"
                  style={{
                    background: isCurrent ? "hsl(4 90% 58% / 0.15)" : isPast ? "hsl(122 39% 49% / 0.08)" : "hsl(222 40% 12% / 0.6)",
                    borderColor: isCurrent ? "hsl(4 90% 58% / 0.3)" : "transparent",
                  }}>
                  <span className="text-[10px] block">{isPast ? "✅" : isCurrent ? "🔥" : "🔒"}</span>
                  <span className="text-[6px] font-game-display tracking-wider block mt-0.5"
                    style={{ color: isCurrent ? "hsl(4,90%,65%)" : isPast ? "hsl(122,70%,55%)" : "hsl(var(--muted-foreground) / 0.3)" }}>
                    D{day}
                  </span>
                  <span className="text-[5px] font-game-display block" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                    +{r.coins}🪙
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
