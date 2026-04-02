import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayerAvatar from "@/components/PlayerAvatar";
import { SFX } from "@/lib/sounds";

interface Props {
  playerName: string;
  opponentName: string;
  playerAvatarIndex?: number;
  opponentAvatarIndex?: number;
  gameType?: string;
  onComplete: () => void;
}

export default function VSIntroScreen({
  playerName,
  opponentName,
  playerAvatarIndex = 0,
  opponentAvatarIndex = 1,
  gameType = "ar",
  onComplete,
}: Props) {
  const [stage, setStage] = useState<"enter" | "vs" | "flash" | "done">("enter");

  useEffect(() => {
    try { SFX.ceremonyHorn(); } catch {}

    const t1 = setTimeout(() => setStage("vs"), 800);
    const t2 = setTimeout(() => {
      try { SFX.gameStart(); } catch {}
      setStage("flash");
    }, 2200);
    const t3 = setTimeout(() => {
      setStage("done");
      onComplete();
    }, 3200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const gameLabel = gameType === "tap" ? "TAP DUEL" : gameType === "tournament" ? "TOURNAMENT DUEL" : "AR DUEL";

  return (
    <AnimatePresence>
      {stage !== "done" && (
        <motion.div
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(222 47% 6%), hsl(222 47% 11%))" }}
        >
          {/* Animated background lines */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: i % 2 === 0 ? "-100%" : "100%", opacity: 0 }}
                animate={{ x: "0%", opacity: 0.03 }}
                transition={{ delay: i * 0.1, duration: 1 }}
                className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{ top: `${12 + i * 10}%` }}
              />
            ))}
          </div>

          {/* Stadium light burst */}
          <motion.div
            animate={stage === "flash" ? { opacity: [0, 0.8, 0], scale: [1, 2, 3] } : { opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-white pointer-events-none"
          />

          {/* Game type banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-16 left-1/2 -translate-x-1/2"
          >
            <div className="px-6 py-2 rounded-full glass-premium border border-primary/20">
              <span className="font-display text-[10px] font-bold text-primary tracking-[0.3em]">{gameLabel}</span>
            </div>
          </motion.div>

          <div className="relative flex items-center justify-center gap-4 w-full px-6">
            {/* Player 1 - Left */}
            <motion.div
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
              className="flex-1 flex flex-col items-center gap-3"
            >
              <motion.div
                animate={stage === "vs" ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative"
              >
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
                <PlayerAvatar avatarIndex={playerAvatarIndex} size="lg" className="border-primary/40" />
              </motion.div>
              <div className="text-center">
                <span className="font-display text-sm font-black text-foreground tracking-wider block">
                  {playerName.toUpperCase()}
                </span>
                <span className="text-[8px] text-primary font-display font-bold tracking-widest">YOU</span>
              </div>
            </motion.div>

            {/* VS Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={stage !== "enter" ? { scale: 1, rotate: 0 } : { scale: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 150 }}
              className="relative z-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-6 rounded-full border border-dashed border-primary/20"
              />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-[0_0_40px_hsl(217_91%_60%/0.4)]">
                <span className="font-display text-xl font-black text-white">VS</span>
              </div>
              {/* Fire-like particles */}
              {stage === "vs" && [...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -30 - Math.random() * 20],
                    x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
                    opacity: [1, 0],
                    scale: [1, 0.3],
                  }}
                  transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.2 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                  style={{
                    background: `hsl(${20 + Math.random() * 30} 90% 55%)`,
                    filter: "blur(1px)",
                  }}
                />
              ))}
            </motion.div>

            {/* Player 2 - Right */}
            <motion.div
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
              className="flex-1 flex flex-col items-center gap-3"
            >
              <motion.div
                animate={stage === "vs" ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="relative"
              >
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-out-red/20 to-out-red/5 blur-xl" />
                <PlayerAvatar avatarIndex={opponentAvatarIndex} size="lg" className="border-out-red/40" />
              </motion.div>
              <div className="text-center">
                <span className="font-display text-sm font-black text-foreground tracking-wider block">
                  {opponentName.toUpperCase()}
                </span>
                <span className="text-[8px] text-out-red font-display font-bold tracking-widest">RIVAL</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === "vs" ? 1 : 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="font-display text-[10px] font-bold text-muted-foreground tracking-[0.3em]"
            >
              MATCH STARTING...
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
