import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const MODES = [
  {
    id: "ar",
    icon: "📸",
    title: "AR MODE",
    subtitle: "Camera + Hand Gestures",
    description: "Use your real hand in front of the camera. AI detects your gesture automatically.",
    gradient: "from-primary to-primary/60",
    glow: "glow-primary",
    accent: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
  {
    id: "tap",
    icon: "👆",
    title: "TAP MODE",
    subtitle: "Tap to Play",
    description: "Quick gameplay with on-screen buttons. No camera needed.",
    gradient: "from-accent to-accent/60",
    glow: "glow-accent",
    accent: "text-accent",
    bg: "bg-accent/5",
    border: "border-accent/20",
  },
  {
    id: "daily",
    icon: "📅",
    title: "DAILY CHALLENGE",
    subtitle: "New Target Every Day",
    description: "Beat today's target score. One shot per day — share your result!",
    gradient: "from-score-gold to-score-gold/60",
    glow: "",
    accent: "text-score-gold",
    bg: "bg-score-gold/5",
    border: "border-score-gold/20",
  },
  {
    id: "multiplayer",
    icon: "⚔️",
    title: "MULTIPLAYER",
    subtitle: "Real-Time PvP",
    description: "Challenge friends in real-time hand cricket matches online.",
    gradient: "from-secondary to-secondary/60",
    glow: "glow-secondary",
    accent: "text-secondary",
    bg: "bg-secondary/5",
    border: "border-secondary/20",
  },
  {
    id: "tournament",
    icon: "🏆",
    title: "TOURNAMENT",
    subtitle: "5-Round Bracket",
    description: "Battle through 5 AI opponents of increasing difficulty to become champion.",
    gradient: "from-score-gold to-secondary/60",
    glow: "",
    accent: "text-score-gold",
    bg: "bg-score-gold/5",
    border: "border-score-gold/20",
  },
  {
    id: "practice",
    icon: "🎯",
    title: "PRACTICE",
    subtitle: "Learn & Improve",
    description: "Practice your gestures without scoring. See what the AI detects in real time.",
    gradient: "from-neon-green to-neon-green/60",
    glow: "",
    accent: "text-neon-green",
    bg: "bg-neon-green/5",
    border: "border-neon-green/20",
  },
];

export default function PlayPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">
              SELECT MODE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-3">Choose your play style</p>
        </motion.div>

        <div className="space-y-3">
          {MODES.map((mode, i) => (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/game/${mode.id}`)}
              className={`w-full ${mode.bg} border ${mode.border} rounded-2xl p-4 flex items-start gap-4 text-left transition-all active:scale-[0.98]`}
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shrink-0 ${mode.glow}`}
              >
                <span className="text-2xl">{mode.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-display text-sm font-black text-foreground tracking-wider">
                  {mode.title}
                </span>
                <span className={`text-[10px] ${mode.accent} font-display font-bold block mt-0.5`}>
                  {mode.subtitle}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-1 leading-relaxed">
                  {mode.description}
                </span>
              </div>
              <span className="text-muted-foreground/40 mt-3">→</span>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
