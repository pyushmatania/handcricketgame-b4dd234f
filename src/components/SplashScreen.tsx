import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLAYER_IMAGES } from "@/components/PlayerCard";

interface SplashScreenProps {
  onComplete: () => void;
}

const PLAYERS = [
  { name: "VIRAT KOHLI", number: "18", role: "BATSMAN", id: "kohli" },
  { name: "MS DHONI", number: "7", role: "CAPTAIN", id: "dhoni" },
  { name: "ROHIT SHARMA", number: "45", role: "OPENER", id: "rohit" },
  { name: "JASPRIT BUMRAH", number: "93", role: "BOWLER", id: "bumrah" },
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  // 0 = stadium flyover, 1 = player silhouettes, 2 = logo reveal, 3 = done

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500),
      setTimeout(() => setPhase(2), 3200),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => onComplete(), 5800),
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
          {/* Animated background — stadium atmosphere */}
          <div className="absolute inset-0">
            {/* Deep radial gradient that shifts */}
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 50% 120%, hsl(217 60% 18% / 0.6) 0%, hsl(222 47% 6%) 60%)",
              }}
            />

            {/* Floodlight beams */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={`light-${i}`}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 0.15, 0.08], scaleY: 1 }}
                transition={{ duration: 1.5, delay: 0.3 + i * 0.2, ease: "easeOut" }}
                className="absolute top-0"
                style={{
                  left: `${15 + i * 22}%`,
                  width: "8%",
                  height: "70%",
                  background: `linear-gradient(180deg, hsl(217 80% 70% / 0.3) 0%, transparent 100%)`,
                  transformOrigin: "top center",
                  filter: "blur(20px)",
                }}
              />
            ))}

            {/* Stadium crowd silhouette */}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 0.3 }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="absolute bottom-0 left-0 right-0 h-32 crowd-silhouette"
            />

            {/* Floating particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`p-${i}`}
                initial={{
                  x: Math.random() * 400,
                  y: 700,
                  opacity: 0,
                }}
                animate={{
                  y: -100,
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute w-1 h-1 rounded-full bg-primary/40"
              />
            ))}
          </div>

          {/* Phase 0: Stadium flyover text */}
          <AnimatePresence>
            {phase === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 1, type: "spring", damping: 15 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-7xl mb-6"
                  >
                    🏟️
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.5em" }}
                    animate={{ opacity: 0.5, letterSpacing: "0.3em" }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="font-display text-[10px] text-primary/60 tracking-widest"
                  >
                    WELCOME TO THE ARENA
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 1: Player silhouettes */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center px-6"
              >
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  {PLAYERS.map((player, i) => (
                    <motion.div
                      key={player.name}
                      initial={{ opacity: 0, y: 40, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.6,
                        delay: i * 0.15,
                        type: "spring",
                        damping: 15,
                      }}
                      className="glass-card p-4 text-center relative overflow-hidden group"
                    >
                      {/* Jersey number background */}
                      <div className="absolute -right-2 -top-2 font-display text-6xl font-black text-primary/5 leading-none">
                        {player.number}
                      </div>

                      {/* Player avatar circle */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.15, type: "spring", damping: 10 }}
                        className="w-14 h-14 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 border-2 border-primary/30 flex items-center justify-center relative overflow-hidden"
                      >
                        <img src={PLAYER_IMAGES[player.id]} alt={player.name} className="w-full h-full object-cover object-top" />
                        {/* Glow ring */}
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          className="absolute inset-0 rounded-full border border-primary/30"
                        />
                      </motion.div>

                      <p className="font-display text-[9px] font-bold text-foreground tracking-wider relative z-10">
                        {player.name}
                      </p>
                      <p className="font-display text-[7px] text-primary/60 tracking-[0.2em] mt-0.5">
                        {player.role}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* "CHOOSE YOUR LEGENDS" text */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute bottom-20 font-display text-[9px] text-primary/50 tracking-[0.3em]"
                >
                  INDIAN LEGENDS
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2: Logo reveal */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                {/* Dramatic flash */}
                <motion.div
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-primary/10"
                />

                {/* Logo */}
                <motion.div
                  initial={{ scale: 0, rotateY: 90 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ duration: 0.8, type: "spring", damping: 12 }}
                  className="relative"
                >
                  {/* Outer glow ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-6 rounded-full border border-primary/10"
                    style={{
                      background: "conic-gradient(from 0deg, transparent, hsl(217 91% 60% / 0.1), transparent, hsl(45 93% 58% / 0.08), transparent)",
                    }}
                  />

                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-accent/10 border-2 border-primary/40 flex items-center justify-center glow-primary relative overflow-hidden">
                    <span className="text-5xl relative z-10">🏏</span>
                    {/* Inner shimmer */}
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                    />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-center mt-8"
                >
                  <h1 className="font-display text-3xl font-black text-foreground tracking-wider">
                    HAND CRICKET
                  </h1>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                    className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-3 mx-auto"
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

                {/* Loading bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-10 w-48"
                >
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 1.1, duration: 1.5, ease: "easeInOut" }}
                      className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                    />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 1.2 }}
                    className="text-center font-display text-[8px] text-muted-foreground tracking-widest mt-2"
                  >
                    LOADING STADIUM...
                  </motion.p>
                </motion.div>
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
