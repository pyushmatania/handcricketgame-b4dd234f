import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@/assets/splash-bg.webp";
import CricketBall3D from "./CricketBall3D";
import SpinningCricketBall from "./SpinningCricketBall";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2800),
      setTimeout(() => setPhase(3), 4600),
      setTimeout(() => onComplete(), 5200),
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
          {/* Background */}
          <motion.div
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img src={splashBg} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
          </motion.div>

          {/* 3D Ball */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring", damping: 12 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Suspense fallback={<SpinningCricketBall size={140} />}>
                  <CricketBall3D size={220} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading bar */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48"
              >
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.6, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
