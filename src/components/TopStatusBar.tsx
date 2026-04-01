import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStats {
  total_matches: number;
  wins: number;
  current_streak: number;
  display_name: string;
}

export default function TopStatusBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("total_matches, wins, current_streak, display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setStats(data);
      });
  }, [user]);

  const level = stats ? Math.floor(stats.total_matches / 5) + 1 : 1;
  const xpProgress = stats ? ((stats.total_matches % 5) / 5) * 100 : 0;
  const coins = stats ? stats.wins * 50 : 0;

  return (
    <div className="relative z-20 px-3 pt-3">
      <div className="flex items-center gap-2">
        {/* Player avatar + level */}
        <button
          onClick={() => navigate(user ? "/profile" : "/auth")}
          className="relative flex items-center gap-2 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/20 border-2 border-primary/40 flex items-center justify-center">
              <span className="text-lg">{user ? "🏏" : "👤"}</span>
            </div>
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-secondary to-secondary/70 border border-secondary/50 flex items-center justify-center">
              <span className="font-display text-[7px] font-black text-secondary-foreground">{level}</span>
            </div>
          </div>
          {/* XP bar */}
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[9px] font-bold text-foreground tracking-wider leading-none">
              {stats?.display_name || "PLAYER"}
            </span>
            <div className="w-16 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              />
            </div>
          </div>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Streak badge */}
        {stats && stats.current_streak > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-out-red/15 border border-out-red/25"
          >
            <span className="text-xs">🔥</span>
            <span className="font-display text-[9px] font-bold text-out-red">{stats.current_streak}</span>
          </motion.div>
        )}

        {/* Coins */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full glass-card">
          <span className="text-xs">💰</span>
          <span className="font-display text-[10px] font-bold text-secondary tracking-wider">
            {coins >= 1000 ? `${(coins / 1000).toFixed(1)}K` : coins}
          </span>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-full glass-card flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="text-sm opacity-70">⚙️</span>
        </button>
      </div>
    </div>
  );
}
