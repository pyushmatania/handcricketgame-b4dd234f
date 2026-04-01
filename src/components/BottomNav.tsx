import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: "🏠", activeIcon: "🏠" },
  { path: "/play", label: "Play", icon: "🏏", activeIcon: "🏏" },
  { path: "/leaderboard", label: "League", icon: "🏆", activeIcon: "🏆" },
  { path: "/profile", label: "Profile", icon: "👤", activeIcon: "👤" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/game/")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        {/* Fade-out gradient above nav */}
        <div className="h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <div className="mx-3 mb-3 rounded-2xl glass-nav overflow-hidden relative">
          {/* Top highlight line */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="flex items-center justify-around py-1.5 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center gap-0.5 px-5 py-2 active:scale-90 transition-transform"
                >
                  {/* Active glow background */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/15"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}

                  {/* Active top indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-1.5 w-6 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      style={{
                        boxShadow: "0 0 8px hsl(217 91% 60% / 0.6), 0 0 20px hsl(217 91% 60% / 0.3)",
                      }}
                    />
                  )}

                  <span className={`text-lg relative z-10 transition-all ${isActive ? "scale-110" : "opacity-40"}`}>
                    {isActive ? item.activeIcon : item.icon}
                  </span>
                  <span
                    className={`text-[8px] font-display font-bold tracking-wider relative z-10 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground/50"
                    }`}
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
