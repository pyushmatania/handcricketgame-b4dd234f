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

const TYPE_ICONS: Record<string, string> = {
  rank_up: "🏆",
  challenge_complete: "🎯",
  record_broken: "🔥",
  friend_achievement: "⭐",
  xp_earned: "✨",
  coins_earned: "🪙",
  nudge: "💡",
  welcome: "👋",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
            <div>
              <h1 className="font-display text-base font-black text-foreground tracking-wider">NOTIFICATIONS</h1>
              {unreadCount > 0 && (
                <span className="text-[8px] text-primary font-display tracking-wider">{unreadCount} unread</span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={markAllRead}
              className="px-3 py-1.5 rounded-lg glass-card text-[8px] font-display font-bold text-primary tracking-wider">
              ✓ READ ALL
            </motion.button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-4 glass-card rounded-xl p-1">
          {(["all", "unread"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all ${
                filter === f ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground"
              }`}>
              {f === "all" ? "ALL" : `UNREAD (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-premium rounded-xl p-8 text-center">
            <span className="text-3xl block mb-2">🔔</span>
            <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">
              {filter === "unread" ? "ALL CAUGHT UP!" : "NO NOTIFICATIONS YET"}
            </span>
            <p className="text-[9px] text-muted-foreground/60 mt-1">Play matches and complete challenges</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`glass-premium rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-all ${
                    !n.read ? "border border-primary/20" : "opacity-70"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg shrink-0">
                    {TYPE_ICONS[n.type] || "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[10px] font-bold text-foreground tracking-wider truncate">{n.title}</span>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[7px] text-muted-foreground/50 font-display tracking-wider mt-1 block">{getTimeAgo(n.created_at)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
