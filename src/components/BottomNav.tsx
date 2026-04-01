import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: "⚡", activeIcon: "⚡" },
  { path: "/play", label: "Play", icon: "🏏", activeIcon: "🏏" },
  { path: "/leaderboard", label: "Ranks", icon: "🏆", activeIcon: "🏆" },
  { path: "/profile", label: "Profile", icon: "👤", activeIcon: "👤" },
  { path: "/settings", label: "Settings", icon: "⚙️", activeIcon: "⚙️" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav during active game
  if (location.pathname.startsWith("/game/")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        <div className="mx-3 mb-3 rounded-2xl glass-nav overflow-hidden">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 active:scale-90 transition-transform"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-1 w-8 h-1 rounded-full bg-primary glow-primary"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className={`text-lg ${isActive ? "" : "opacity-50"}`}>
                    {isActive ? item.activeIcon : item.icon}
                  </span>
                  <span
                    className={`text-[9px] font-display font-bold tracking-wider ${
                      isActive ? "text-primary" : "text-muted-foreground"
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
