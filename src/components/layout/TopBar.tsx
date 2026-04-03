import { useNavigate } from "react-router-dom";
import CurrencyPill from "@/components/shared/CurrencyPill";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  coins?: number;
  gems?: number;
  runs?: number;
}

export default function TopBar({ coins = 1250, gems = 45, runs = 3800 }: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between px-3 pt-[env(safe-area-inset-top,8px)] pb-2 bg-gradient-to-b from-[hsl(222_47%_6%/0.95)] to-transparent backdrop-blur-md">
          {/* Player avatar + level */}
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-game-blue to-game-purple border-2 border-game-gold flex items-center justify-center text-sm">
              🏏
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-game-display text-foreground leading-tight">
                {user?.email?.split("@")[0]?.slice(0, 8) || "Player"}
              </span>
              <span className="text-[8px] font-game-body text-game-gold">Lvl 12</span>
            </div>
          </button>

          {/* Currency pills */}
          <div className="flex items-center gap-1.5">
            <CurrencyPill icon="🏏" value={runs} showPlus={false} />
            <CurrencyPill icon="🪙" value={coins} />
            <CurrencyPill icon="💎" value={gems} />
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate("/settings")}
            className="w-8 h-8 rounded-full bg-game-dark/60 border border-[hsl(222_25%_25%/0.5)] flex items-center justify-center active:scale-90 transition-transform"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
