import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@/assets/splash-stadium.jpg";
import logo3d from "@/assets/logo-3d.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [loadPct, setLoadPct] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 4200),
      setTimeout(() => onComplete(), 4800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Animate loading percentage
  useEffect(() => {
    if (phase < 2) return;
    const interval = setInterval(() => {
      setLoadPct((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return Math.min(p + 2, 100);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] overflow-hidden"
        >
          {/* Stadium Background */}
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={splashBg}
              alt=""
              className="w-full h-full object-cover"
              width={1080}
              height={1920}
            />
            {/* Dark overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_30%_6%)] via-[hsl(240_30%_6%/0.5)] to-[hsl(240_30%_6%/0.3)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240_30%_6%/0.6)] via-transparent to-transparent" />
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-game-gold/40"
                initial={{
                  x: Math.random() * 400,
                  y: Math.random() * 800 + 200,
                  opacity: 0,
                }}
                animate={{
                  y: [null, Math.random() * -400],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* 3D Logo */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.3, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  type: "spring",
                  damping: 12,
                  stiffness: 120,
                }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ top: "-10%" }}
              >
                <img
                  src={logo3d}
                  alt="Hand Cricket"
                  className="w-72 h-auto drop-shadow-[0_8px_30px_rgba(255,215,0,0.4)]"
                  width={1024}
                  height={512}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cricket Pitch Loading Bar */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-28 left-1/2 -translate-x-1/2 w-56"
              >
                {/* Pitch-shaped track */}
                <div className="relative h-4 bg-[hsl(122_30%_20%/0.6)] rounded-lg border border-[hsl(122_30%_30%/0.4)] overflow-hidden">
                  {/* Crease lines */}
                  <div className="absolute left-[15%] top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute right-[15%] top-0 bottom-0 w-px bg-white/20" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

                  {/* Fill */}
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${loadPct}%` }}
                    className="h-full bg-gradient-to-r from-game-green via-[hsl(90_60%_50%)] to-game-gold rounded-lg relative"
                  >
                    {/* Shine effect on fill */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-lg" />
                  </motion.div>
                </div>

                {/* Percentage text */}
                <motion.div
                  className="text-center mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="font-game-display text-xs text-game-gold/80 tracking-widest">
                    {loadPct}%
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 0.5 : 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 left-0 right-0 text-center"
          >
            <span className="font-game-body text-[10px] text-white/40 tracking-[0.3em] uppercase">
              Clash of Cricket
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
