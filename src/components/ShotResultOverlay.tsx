import { motion, AnimatePresence } from "framer-motion";
import type { BallResult } from "@/hooks/useHandCricket";

interface ShotResultOverlayProps {
  lastResult: BallResult | null;
  triggerKey: number;
}

export default function ShotResultOverlay({ lastResult, triggerKey }: ShotResultOverlayProps) {
  if (!lastResult) return null;

  const isOut = lastResult.runs === "OUT";
  const absRuns = typeof lastResult.runs === "number" ? Math.abs(lastResult.runs) : 0;
  const isSix = !isOut && absRuns >= 6;
  const isFour = !isOut && absRuns >= 4;

  if (!isOut && !isSix && !isFour) return null;

  const config = isOut
    ? { text: "OUT!", emoji: "🔴", bg: "from-game-red/40 to-transparent", textColor: "text-game-red", glow: "hsl(4 90% 58% / 0.6)" }
    : isSix
    ? { text: "SIX!", emoji: "🔥", bg: "from-purple-500/40 to-transparent", textColor: "text-purple-300", glow: "hsl(280 80% 60% / 0.6)" }
    : { text: "FOUR!", emoji: "💥", bg: "from-game-gold/40 to-transparent", textColor: "text-game-gold", glow: "hsl(43 96% 56% / 0.6)" };

  return (
    <AnimatePresence>
      <motion.div
        key={triggerKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
      >
        {/* Radial flash */}
        <motion.div
          initial={{ opacity: 0.8, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`absolute inset-0 bg-radial-gradient ${config.bg}`}
          style={{ background: `radial-gradient(circle, ${config.glow} 0%, transparent 60%)` }}
        />

        {/* Big text */}
        <motion.div
          initial={{ scale: 0, rotateZ: -10 }}
          animate={{ scale: [0, 1.4, 1.1], rotateZ: [-10, 3, 0] }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
          className="text-center relative z-10"
        >
          <motion.span
            initial={{ y: 0 }}
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl block mb-1"
          >
            {config.emoji}
          </motion.span>
          <p
            className={`font-game-display text-5xl font-black ${config.textColor} tracking-[0.2em]`}
            style={{ textShadow: `0 0 40px ${config.glow}, 0 4px 8px rgba(0,0,0,0.5)` }}
          >
            {config.text}
          </p>
        </motion.div>

        {/* Auto-hide */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 1.2 }}
          className="absolute inset-0"
          onAnimationComplete={() => {}}
        />
      </motion.div>
    </AnimatePresence>
  );
}
