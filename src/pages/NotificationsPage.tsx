import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

type TabFilter = "all" | "unread" | "social" | "rewards";

const TYPE_META: Record<string, { icon: string; accent: string; category: "social" | "rewards" | "general" }> = {
  rank_up:              { icon: "🏆", accent: "hsl(51,100%,50%)",  category: "rewards" },
  challenge_complete:   { icon: "🎯", accent: "hsl(122,39%,49%)", category: "rewards" },
  record_broken:        { icon: "🔥", accent: "hsl(4,90%,58%)",   category: "rewards" },
  friend_achievement:   { icon: "⭐", accent: "hsl(51,100%,50%)",  category: "social" },
  xp_earned:            { icon: "✨", accent: "hsl(291,47%,51%)", category: "rewards" },
  coins_earned:         { icon: "🪙", accent: "hsl(43,96%,56%)",  category: "rewards" },
  nudge:                { icon: "💡", accent: "hsl(207,90%,54%)", category: "social" },
  welcome:              { icon: "👋", accent: "hsl(122,39%,49%)", category: "general" },
  match_invite:         { icon: "⚔️", accent: "hsl(207,90%,54%)", category: "social" },
  friend_request:       { icon: "🤝", accent: "hsl(122,39%,49%)", category: "social" },
  rivalry:              { icon: "🔥", accent: "hsl(4,90%,58%)",   category: "social" },
};

const TABS: { id: TabFilter; label: string; icon: string }[] = [
  { id: "all", label: "ALL", icon: "📬" },
  { id: "unread", label: "NEW", icon: "🔴" },
  { id: "social", label: "SOCIAL", icon: "👥" },
  { id: "rewards", label: "REWARDS", icon: "🎁" },
];

const cardBg = "linear-gradient(135deg, hsl(222 40% 13% / 0.9), hsl(222 40% 8% / 0.95))";
const cardShadow = "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<TabFilter>("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setNotifications(data as unknown as Notification[]);
      });
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "social") return (TYPE_META[n.type]?.category === "social");
    if (filter === "rewards") return (TYPE_META[n.type]?.category === "rewards");
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let key = "Earlier";
    if (diffDays === 0) key = "Today";
    else if (diffDays === 1) key = "Yesterday";
    else if (diffDays < 7) key = "This Week";
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});
  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];

  return (
    <div className="min-h-screen bg-game-dark relative overflow-hidden pb-24">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(222 40% 18%) 0%, hsl(222 40% 6%) 70%)" }} />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm border-b-2"
              style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--border) / 0.2)" }}>
              ←
            </motion.button>
            <div>
              <h1 className="font-game-display text-lg tracking-wider text-game-gold">NOTIFICATIONS</h1>
              {unreadCount > 0 && (
                <span className="text-[9px] font-game-body tracking-wide" style={{ color: "hsl(207,90%,60%)" }}>{unreadCount} new alerts</span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={markAllRead}
              className="px-3 py-2 rounded-xl font-game-display text-[8px] tracking-wider border-b-2 active:border-b-0 active:translate-y-[2px]"
              style={{
                background: "linear-gradient(to bottom, hsl(122,39%,49%), hsl(122,39%,38%))",
                borderColor: "hsl(122,39%,30%)",
                color: "white",
              }}>
              ✓ READ ALL
            </motion.button>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-1.5 mb-4">
          {TABS.map(tab => {
            const isActive = filter === tab.id;
            const count = tab.id === "unread" ? unreadCount : undefined;
            return (
              <motion.button key={tab.id} whileTap={{ scale: 0.95 }} onClick={() => setFilter(tab.id)}
                className="flex-1 py-2 rounded-xl font-game-display text-[8px] tracking-widest flex items-center justify-center gap-1 border-b-2 transition-all"
                style={{
                  background: isActive ? "hsl(207 90% 54% / 0.15)" : "hsl(222 40% 12% / 0.8)",
                  borderColor: isActive ? "hsl(207 90% 54% / 0.4)" : "transparent",
                  color: isActive ? "hsl(207,90%,60%)" : "hsl(var(--muted-foreground) / 0.5)",
                }}>
                <span className="text-[10px]">{tab.icon}</span>
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full text-[7px] flex items-center justify-center"
                    style={{ background: "hsl(4,90%,58%)", color: "white" }}>{count > 9 ? "9+" : count}</span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* List */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-10 text-center border-b-[3px]"
            style={{ background: cardBg, boxShadow: cardShadow, borderColor: "hsl(var(--muted) / 0.15)" }}>
            <span className="text-4xl block mb-3">{filter === "unread" ? "✅" : "🔔"}</span>
            <span className="font-game-display text-xs text-muted-foreground tracking-wider">
              {filter === "unread" ? "ALL CAUGHT UP!" : "NO NOTIFICATIONS YET"}
            </span>
            <p className="text-[9px] text-muted-foreground/60 mt-1 font-game-body">
              {filter === "unread" ? "You've read everything!" : "Play matches and complete challenges"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {groupOrder.filter(g => grouped[g]?.length).map(group => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1" style={{ background: "linear-gradient(to right, hsl(var(--game-gold) / 0.2), transparent)" }} />
                  <span className="font-game-display text-[8px] tracking-[0.3em] text-muted-foreground/50">{group.toUpperCase()}</span>
                  <div className="h-px flex-1" style={{ background: "linear-gradient(to left, hsl(var(--game-gold) / 0.2), transparent)" }} />
                </div>
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {grouped[group].map((n, i) => {
                      const meta = TYPE_META[n.type] || { icon: "🔔", accent: "hsl(207,90%,54%)", category: "general" };
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                          onClick={() => !n.read && markRead(n.id)}
                          className="rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all relative overflow-hidden border-b-2"
                          style={{
                            background: cardBg,
                            boxShadow: !n.read ? `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${meta.accent}15` : cardShadow,
                            borderColor: !n.read ? `${meta.accent}35` : "transparent",
                            opacity: n.read ? 0.6 : 1,
                          }}
                        >
                          {/* Unread glow strip */}
                          {!n.read && (
                            <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: meta.accent }} />
                          )}

                          {/* Icon */}
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 border-b-2"
                            style={{
                              background: `linear-gradient(135deg, ${meta.accent}20, ${meta.accent}08)`,
                              borderColor: `${meta.accent}30`,
                            }}>
                            {meta.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-game-display text-[10px] tracking-wider truncate" style={{ color: !n.read ? meta.accent : "hsl(var(--foreground))" }}>
                                {n.title}
                              </span>
                              {!n.read && (
                                <motion.div
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: meta.accent, boxShadow: `0 0 6px ${meta.accent}` }}
                                />
                              )}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2 font-game-body">{n.message}</p>
                            <span className="text-[7px] text-muted-foreground/40 font-game-display tracking-wider mt-1 block">{getTimeAgo(n.created_at)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
