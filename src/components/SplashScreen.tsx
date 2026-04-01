import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@/assets/splash-bg.webp";
import SpinningCricketBall from "./SpinningCricketBall";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  // 0 = bg reveal, 1 = ball + title, 2 = loading, 3 = done

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => onComplete(), 5600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] bg-background overflow-hidden"
        >
          {/* Full-bleed background image */}
          <motion.div
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={splashBg}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-background/30" />
          </motion.div>

          {/* Phase 1+: Ball and Title */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Dramatic flash */}
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-primary/10"
                />

                {/* Spinning cricket ball */}
                <motion.div
                  initial={{ scale: 0, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.8, type: "spring", damping: 12 }}
                >
                  <SpinningCricketBall size={120} />
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-center mt-6"
                >
                  <h1 className="font-display text-4xl font-black text-foreground tracking-wider leading-tight">
                    <span className="block">AR CRICKET</span>
                    <span className="block text-primary text-5xl">2K26</span>
                  </h1>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent mt-3 mx-auto"
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="font-display text-[9px] tracking-[0.4em] text-primary/60 mt-3 font-bold"
                  >
                    AUGMENTED REALITY
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2+: Loading bar */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48"
              >
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.8, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                  />
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.2 }}
                  className="text-center font-display text-[8px] text-muted-foreground tracking-widest mt-2"
                >
                  LOADING STADIUM...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1 }}
            className="absolute bottom-6 left-0 right-0 text-center"
          >
            <p className="font-display text-[7px] text-muted-foreground tracking-[0.3em]">
              POWERED BY LOVABLE
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
