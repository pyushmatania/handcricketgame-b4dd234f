import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BadgeNotif from "@/components/shared/Badge";
import { cn } from "@/lib/utils";
import { SFX, Haptics } from "@/lib/sounds";

const NAV_ITEMS = [
  { path: "/shop", label: "Shop", icon: "🎁", accent: "hsl(291,47%,51%)" },
  { path: "/friends", label: "Friends", icon: "👥", accent: "hsl(207,90%,54%)" },
  { path: "/play", label: "Battle", icon: "⚔️", accent: "hsl(122,39%,49%)", center: true },
  { path: "/leaderboard", label: "League", icon: "🏆", accent: "hsl(51,100%,50%)" },
  { path: "/profile", label: "Profile", icon: "👤", accent: "hsl(43,96%,56%)" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/game/")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        {/* Fade-out gradient above nav */}
        <div className="h-8 bg-gradient-to-t from-[hsl(240_30%_8%)] to-transparent pointer-events-none" />

        <div className="relative border-t-[2px]"
          style={{
            background: "linear-gradient(to top, hsl(240 30% 7%), hsl(222 40% 11%))",
            borderColor: "hsl(222 25% 20% / 0.5)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
          
          {/* Top highlight line */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px" style={{ background: "linear-gradient(to right, transparent, hsl(222 40% 30% / 0.3), transparent)" }} />

          <div className="flex items-end justify-around px-1 pb-[env(safe-area-inset-bottom,4px)]">
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/play" && location.pathname === "/");
              const isCenter = item.center;

              return (
                <motion.button
                  key={item.path}
                  onClick={() => { SFX.navTap(); Haptics.navTap(); navigate(item.path); }}
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 pt-2 pb-1",
                    isCenter ? "px-3 -mt-3" : "px-4"
                  )}
                >
                  {/* Center raised 3D button */}
                  {isCenter && (
                    <motion.div
                      animate={isActive ? { y: -2 } : { y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="absolute -top-5 w-[60px] h-[60px] rounded-full flex items-center justify-center"
                      style={{
                        background: isActive
                          ? "linear-gradient(to bottom, hsl(122,50%,55%), hsl(122,39%,35%))"
                          : "linear-gradient(to bottom, hsl(122,39%,49%), hsl(122,39%,30%))",
                        border: "3px solid hsl(240 30% 9%)",
                        boxShadow: isActive
                          ? "0 4px 20px hsl(122 39% 49% / 0.5), 0 0 30px hsl(122 39% 49% / 0.2), inset 0 2px 4px rgba(255,255,255,0.25), 0 6px 0 hsl(122,39%,25%)"
                          : "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.15), 0 4px 0 hsl(122,39%,22%)",
                      }}
                    >
                      <motion.span
                        animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ repeat: isActive ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                        className="text-2xl drop-shadow-lg"
                      >
                        {item.icon}
                      </motion.span>
                    </motion.div>
                  )}

                  {/* Regular icon with 3D container */}
                  {!isCenter && (
                    <div className="relative">
                      <motion.div
                        animate={isActive ? { y: -2 } : { y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                        style={{
                          background: isActive
                            ? `linear-gradient(135deg, ${item.accent}25, ${item.accent}10)`
                            : "transparent",
                          boxShadow: isActive
                            ? `0 2px 10px ${item.accent}30`
                            : "none",
                        }}
                      >
                        <span className={cn(
                          "text-xl transition-all duration-200",
                          isActive ? "drop-shadow-lg" : "opacity-35 grayscale"
                        )}>
                          {item.icon}
                        </span>
                      </motion.div>
                      <BadgeNotif count={0} />

                      {/* Active glow dot */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-glow"
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full"
                          style={{
                            background: item.accent,
                            boxShadow: `0 0 8px ${item.accent}, 0 0 16px ${item.accent}60`,
                          }}
                          transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        />
                      )}
                    </div>
                  )}

                  <span
                    className={cn(
                      "text-[8px] font-game-display tracking-wider transition-colors duration-200",
                      isCenter ? "mt-7" : "mt-0",
                    )}
                    style={{
                      color: isActive ? item.accent : "hsl(var(--muted-foreground) / 0.35)",
                    }}
                  >
                    {item.label.toUpperCase()}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
