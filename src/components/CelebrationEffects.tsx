import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BallResult, GameResult } from "@/hooks/useHandCricket";

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  angle: number;
  speed: number;
  size: number;
  delay: number;
}

interface CelebrationEffectsProps {
  lastResult: BallResult | null;
  gameResult: GameResult;
  phase: string;
}

const FIREWORK_EMOJIS = ["🎆", "🎇", "✨", "🌟", "⭐", "💫", "🎉", "🎊"];
const WICKET_EMOJIS = ["🔥", "💥", "⚡", "🏏", "❌", "💀"];
const FOUR_EMOJIS = ["4️⃣", "🏏", "💨", "🔵"];
const SIX_EMOJIS = ["6️⃣", "🚀", "🌙", "💥", "⭐", "🔥"];

function generateParticles(emojis: string[], count: number, spread: number = 360): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 50 + (Math.random() - 0.5) * 20,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    angle: (spread / count) * i + Math.random() * 30,
    speed: 80 + Math.random() * 120,
    size: 16 + Math.random() * 20,
    delay: Math.random() * 0.3,
  }));
}

export default function CelebrationEffects({ lastResult, gameResult, phase }: CelebrationEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [effectType, setEffectType] = useState<"none" | "four" | "six" | "wicket" | "win">("none");
  const [showFlash, setShowFlash] = useState(false);
  const [flashColor, setFlashColor] = useState("primary");

  // Handle ball results
  useEffect(() => {
    if (!lastResult) return;
    
    if (lastResult.runs === "OUT") {
      setEffectType("wicket");
      setParticles(generateParticles(WICKET_EMOJIS, 12));
      setFlashColor("out-red");
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 400);
      setTimeout(() => { setParticles([]); setEffectType("none"); }, 2000);
    } else if (typeof lastResult.runs === "number") {
      const absRuns = Math.abs(lastResult.runs);
      if (absRuns === 6) {
        setEffectType("six");
        setParticles(generateParticles(SIX_EMOJIS, 20, 360));
        setFlashColor("primary");
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 500);
        setTimeout(() => { setParticles([]); setEffectType("none"); }, 2500);
      } else if (absRuns === 4) {
        setEffectType("four");
        setParticles(generateParticles(FOUR_EMOJIS, 10, 180));
        setFlashColor("secondary");
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 350);
        setTimeout(() => { setParticles([]); setEffectType("none"); }, 1800);
      }
    }
  }, [lastResult]);

  // Handle win
  useEffect(() => {
    if (phase === "finished" && gameResult === "win") {
      setEffectType("win");
      const fireworks = generateParticles(FIREWORK_EMOJIS, 30, 360);
      setParticles(fireworks);
      setFlashColor("primary");
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 600);
      
      // Multiple waves
      const t1 = setTimeout(() => {
        setParticles(prev => [...prev, ...generateParticles(FIREWORK_EMOJIS, 20, 360)]);
      }, 800);
      const t2 = setTimeout(() => {
        setParticles(prev => [...prev, ...generateParticles(FIREWORK_EMOJIS, 15, 360)]);
      }, 1600);
      const t3 = setTimeout(() => { setParticles([]); setEffectType("none"); }, 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [phase, gameResult]);

  return (
    <>
      {/* Full-screen flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background: flashColor === "out-red"
                ? "radial-gradient(circle at center, hsl(0 72% 51% / 0.3), transparent 70%)"
                : flashColor === "secondary"
                ? "radial-gradient(circle at center, hsl(45 93% 58% / 0.25), transparent 70%)"
                : "radial-gradient(circle at center, hsl(217 91% 60% / 0.3), transparent 70%)"
            }}
          />
        )}
      </AnimatePresence>

      {/* Boundary text flash */}
      <AnimatePresence>
        {effectType === "six" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1.2], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <span
              className="font-display text-7xl font-black text-primary"
              style={{ textShadow: "0 0 60px hsl(217 91% 60% / 0.8), 0 0 120px hsl(217 91% 60% / 0.4)" }}
            >
              SIX!
            </span>
          </motion.div>
        )}
        {effectType === "four" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1.1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <span
              className="font-display text-6xl font-black text-secondary"
              style={{ textShadow: "0 0 50px hsl(45 93% 58% / 0.8), 0 0 100px hsl(45 93% 58% / 0.4)" }}
            >
              FOUR!
            </span>
          </motion.div>
        )}
        {effectType === "wicket" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1.1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.3 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <span
              className="font-display text-6xl font-black text-out-red"
              style={{ textShadow: "0 0 50px hsl(0 72% 51% / 0.8), 0 0 100px hsl(0 72% 51% / 0.4)" }}
            >
              OUT!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles */}
      <div className="fixed inset-0 z-[51] pointer-events-none overflow-hidden">
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const endX = Math.cos(rad) * p.speed;
          const endY = Math.sin(rad) * p.speed - 50; // Gravity bias upward

          return (
            <motion.div
              key={p.id}
              initial={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: [0, endX * 0.5, endX],
                y: [0, endY, endY + 40],
                scale: [0, 1.2, 0.6],
                opacity: [0, 1, 0],
                rotate: [0, Math.random() * 360],
              }}
              transition={{
                duration: 1.2 + Math.random() * 0.8,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute"
              style={{ fontSize: p.size }}
            >
              {p.emoji}
            </motion.div>
          );
        })}
      </div>

      {/* Stadium light sweep for six */}
      <AnimatePresence>
        {effectType === "six" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.5, times: [0, 0.3, 1] }}
            className="fixed inset-0 z-[49] pointer-events-none"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, ease: "linear" }}
              className="absolute inset-0"
              style={{
                background: "conic-gradient(from 0deg, transparent, hsl(217 91% 60% / 0.15), transparent, hsl(45 93% 58% / 0.1), transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win fireworks — continuous sparkle ring */}
      <AnimatePresence>
        {effectType === "win" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[48] pointer-events-none"
          >
            {[...Array(3)].map((_, ring) => (
              <motion.div
                key={ring}
                animate={{
                  scale: [0.5, 2.5],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2,
                  delay: ring * 0.6,
                  repeat: 2,
                  ease: "easeOut",
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-primary/40"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
