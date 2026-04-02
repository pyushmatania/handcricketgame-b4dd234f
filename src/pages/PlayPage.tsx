import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { SFX, Haptics } from "@/lib/sounds";

const MODES = [
  {
    id: "ar",
    icon: "📸",
    title: "AR MODE",
    subtitle: "Camera + Hand Gestures",
    description: "Use your real hand in front of the camera. AI detects your gesture automatically.",
    gradient: "from-primary to-accent",
    glowColor: "hsl(217 91% 60% / 0.3)",
    accent: "text-primary",
    borderColor: "border-primary/30",
    bgFrom: "from-primary/8",
    bgTo: "to-primary/3",
    particle: "bg-primary/40",
  },
  {
    id: "tap",
    icon: "⚡",
    title: "TAP MODE",
    subtitle: "Arcade Speed Play",
    description: "Quick gameplay with on-screen buttons. No camera needed. Pure reflexes.",
    gradient: "from-accent to-secondary",
    glowColor: "hsl(280 85% 65% / 0.3)",
    accent: "text-accent",
    borderColor: "border-accent/30",
    bgFrom: "from-accent/8",
    bgTo: "to-accent/3",
    particle: "bg-accent/40",
  },
  {
    id: "daily",
    icon: "📅",
    title: "DAILY CHALLENGE",
    subtitle: "New Target Every Day",
    description: "Beat today's target score. One shot per day — share your result!",
    gradient: "from-score-gold to-secondary",
    glowColor: "hsl(45 93% 47% / 0.3)",
    accent: "text-score-gold",
    borderColor: "border-score-gold/30",
    bgFrom: "from-score-gold/8",
    bgTo: "to-score-gold/3",
    particle: "bg-score-gold/40",
  },
  {
    id: "multiplayer",
    icon: "⚔️",
    title: "MULTIPLAYER",
    subtitle: "Real-Time PvP",
    description: "Challenge friends in real-time hand cricket matches online.",
    gradient: "from-secondary to-out-red",
    glowColor: "hsl(0 84% 60% / 0.2)",
    accent: "text-secondary",
    borderColor: "border-secondary/30",
    bgFrom: "from-secondary/8",
    bgTo: "to-secondary/3",
    particle: "bg-secondary/40",
  },
  {
    id: "tournament",
    icon: "🏆",
    title: "TOURNAMENT",
    subtitle: "5-Round Bracket",
    description: "Battle through 5 AI opponents of increasing difficulty to become champion.",
    gradient: "from-score-gold to-primary",
    glowColor: "hsl(45 93% 47% / 0.25)",
    accent: "text-score-gold",
    borderColor: "border-score-gold/30",
    bgFrom: "from-score-gold/8",
    bgTo: "to-score-gold/3",
    particle: "bg-score-gold/40",
  },
  {
    id: "practice",
    icon: "🎯",
    title: "PRACTICE",
    subtitle: "Learn & Improve",
    description: "Practice your gestures without scoring. See what the AI detects in real time.",
    gradient: "from-neon-green to-primary",
    glowColor: "hsl(142 71% 45% / 0.25)",
    accent: "text-neon-green",
    borderColor: "border-neon-green/30",
    bgFrom: "from-neon-green/8",
    bgTo: "to-neon-green/3",
    particle: "bg-neon-green/40",
  },
];

function ModeCard({ mode, index, onSelect }: { mode: typeof MODES[0]; index: number; onSelect: () => void }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setTilt({ x: y, y: x });
  };

  const handlePointerLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", damping: 20 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onClick={() => {
        try { SFX.tap(); Haptics.medium(); } catch {}
        onSelect();
      }}
      className="relative cursor-pointer group"
      style={{
        perspective: "800px",
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: isPressed ? 0.97 : 1,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative overflow-hidden rounded-2xl border ${mode.borderColor} p-4 flex items-start gap-4`}
        style={{
          background: `linear-gradient(135deg, hsl(222 47% 11% / 0.8), hsl(217 33% 17% / 0.6))`,
          boxShadow: isPressed ? `0 0 30px ${mode.glowColor}` : `0 4px 20px rgba(0,0,0,0.2)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Animated shine */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: index * 0.5 }}
          className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
        />

        {/* Floating particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -15, 0],
              x: [0, (i - 1) * 5, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.7 }}
            className={`absolute w-1 h-1 rounded-full ${mode.particle} pointer-events-none`}
            style={{ right: 20 + i * 15, top: 15 + i * 10 }}
          />
        ))}

        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden`}
          style={{ boxShadow: `0 4px 20px ${mode.glowColor}` }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
          />
          <span className="text-2xl relative z-10">{mode.icon}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0" style={{ transform: "translateZ(10px)" }}>
          <span className="font-display text-sm font-black text-foreground tracking-wider block">
            {mode.title}
          </span>
          <span className={`text-[10px] ${mode.accent} font-display font-bold block mt-0.5`}>
            {mode.subtitle}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1 leading-relaxed">
            {mode.description}
          </span>
        </div>

        {/* Arrow */}
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={`${mode.accent} mt-3 text-sm font-bold`}
        >
          →
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

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
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-accent" />
            <h1 className="font-display text-xl font-black text-foreground tracking-wider">
              SELECT MODE
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-3">Choose your arena</p>
        </motion.div>

        <div className="space-y-3">
          {MODES.map((mode, i) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={i}
              onSelect={() => navigate(`/game/${mode.id}`)}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
