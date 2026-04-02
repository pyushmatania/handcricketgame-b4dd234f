import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BallResult, GameResult } from "@/hooks/useHandCricket";

interface CelebrationEffectsProps {
  lastResult: BallResult | null;
  gameResult: GameResult;
  phase: string;
}

type EffectType = "none" | "four" | "six" | "wicket" | "win";

export default function CelebrationEffects({ lastResult, gameResult, phase }: CelebrationEffectsProps) {
  const [effectType, setEffectType] = useState<EffectType>("none");

  // Handle ball results
  useEffect(() => {
    if (!lastResult) return;

    if (lastResult.runs === "OUT") {
      setEffectType("wicket");
      setTimeout(() => setEffectType("none"), 1800);
    } else if (typeof lastResult.runs === "number") {
      const absRuns = Math.abs(lastResult.runs);
      if (absRuns === 6) {
        setEffectType("six");
        setTimeout(() => setEffectType("none"), 2000);
      } else if (absRuns === 4) {
        setEffectType("four");
        setTimeout(() => setEffectType("none"), 1500);
      }
    }
  }, [lastResult]);

  // Handle win
  useEffect(() => {
    if (phase === "finished" && gameResult === "win") {
      setEffectType("win");
      setTimeout(() => setEffectType("none"), 3500);
    }
  }, [phase, gameResult]);

  return (
    <>
      {/* Clean color flash overlay */}
      <AnimatePresence>
        {effectType !== "none" && (
          <motion.div
            key={effectType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background:
                effectType === "wicket"
                  ? "radial-gradient(circle at center, hsl(0 72% 51% / 0.25), transparent 70%)"
                  : effectType === "six"
                  ? "radial-gradient(circle at center, hsl(217 91% 60% / 0.2), transparent 70%)"
                  : effectType === "four"
                  ? "radial-gradient(circle at center, hsl(45 93% 58% / 0.2), transparent 70%)"
                  : "radial-gradient(circle at center, hsl(45 93% 58% / 0.15), transparent 70%)"
            }}
          />
        )}
      </AnimatePresence>

      {/* Big clean text overlay */}
      <AnimatePresence>
        {effectType === "six" && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.3, 1] }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="text-center">
              <span
                className="font-display text-8xl font-black text-primary block"
                style={{ textShadow: "0 0 60px hsl(217 91% 60% / 0.6)" }}
              >
                6
              </span>
              <span className="font-display text-lg font-bold tracking-[0.4em] text-primary/70">
                MAXIMUM
              </span>
            </div>
          </motion.div>
        )}

        {effectType === "four" && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.3, times: [0, 0.3, 1] }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="text-center">
              <span
                className="font-display text-7xl font-black text-secondary block"
                style={{ textShadow: "0 0 50px hsl(45 93% 58% / 0.6)" }}
              >
                4
              </span>
              <span className="font-display text-sm font-bold tracking-[0.4em] text-secondary/70">
                BOUNDARY
              </span>
            </div>
          </motion.div>
        )}

        {effectType === "wicket" && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.25, 1] }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="text-center">
              <span
                className="font-display text-7xl font-black text-out-red block"
                style={{ textShadow: "0 0 50px hsl(0 72% 51% / 0.6)" }}
              >
                OUT
              </span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="h-0.5 bg-out-red/40 rounded-full mt-2 mx-auto"
                style={{ width: 120 }}
              />
            </div>
          </motion.div>
        )}

        {effectType === "win" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            {/* Subtle expanding rings */}
            {[0, 1, 2].map(ring => (
              <motion.div
                key={ring}
                initial={{ scale: 0.5, opacity: 0.5 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 2, delay: ring * 0.5, repeat: 1, ease: "easeOut" }}
                className="absolute w-24 h-24 rounded-full border border-secondary/30"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
