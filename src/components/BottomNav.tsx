import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BadgeNotif from "@/components/shared/Badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/shop", label: "Shop", icon: "🎁", activeIcon: "🎁", badge: 0 },
  { path: "/friends", label: "Friends", icon: "👥", activeIcon: "👥", badge: 0 },
  { path: "/play", label: "Battle", icon: "⚔️", activeIcon: "⚔️", badge: 0, center: true },
  { path: "/leaderboard", label: "League", icon: "🏆", activeIcon: "🏆", badge: 0 },
  { path: "/profile", label: "Profile", icon: "👤", activeIcon: "👤", badge: 0 },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/game/")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        {/* Fade-out gradient above nav */}
        <div className="h-6 bg-gradient-to-t from-game-dark to-transparent pointer-events-none" />

        <div className="bg-gradient-to-t from-[hsl(240_30%_10%)] to-[hsl(222_40%_13%)] border-t border-[hsl(222_25%_22%/0.6)]">
          <div className="flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom,4px)]">
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/play" && location.pathname === "/");
              const isCenter = item.center;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 pt-2 pb-1 transition-all active:scale-90",
                    isCenter ? "px-3 -mt-3" : "px-4"
                  )}
                >
                  {/* Center raised platform */}
                  {isCenter && (
                    <div
                      className={cn(
                        "absolute -top-4 w-14 h-14 rounded-full flex items-center justify-center",
                        "bg-gradient-to-b from-game-green to-[hsl(122_39%_35%)] border-4 border-[hsl(240_30%_12%)]",
                        "shadow-[0_0_20px_hsl(122_39%_49%/0.4)]",
                        isActive && "shadow-game-glow-green"
                      )}
                    >
                      <span className="text-2xl">{isActive ? item.activeIcon : item.icon}</span>
                    </div>
                  )}

                  {/* Regular icon */}
                  {!isCenter && (
                    <div className="relative">
                      <span
                        className={cn(
                          "text-xl transition-all",
                          isActive ? "scale-110" : "opacity-40 grayscale"
                        )}
                      >
                        {isActive ? item.activeIcon : item.icon}
                      </span>
                      <BadgeNotif count={item.badge} />
                    </div>
                  )}

                  {/* Active indicator dot */}
                  {isActive && !isCenter && (
                    <motion.div
                      layoutId="nav-dot"
                      className="w-1 h-1 rounded-full bg-game-green mt-0.5"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}

                  <span
                    className={cn(
                      "text-[8px] font-game-display tracking-wider",
                      isCenter ? "mt-6" : "",
                      isActive ? "text-game-green" : "text-muted-foreground/50"
                    )}
                  >
                    {item.label.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
