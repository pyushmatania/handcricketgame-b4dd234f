import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PlayerAvatar from "@/components/PlayerAvatar";
import SpinningCricketBall from "@/components/SpinningCricketBall";

interface Props {
  roomCode: string;
  playerName: string;
  playerAvatarIndex?: number;
  gameType?: string;
  onCancel: () => void;
}

const TIPS = [
  "Tip: DEF blocks but scores 0 runs",
  "Tip: 6 is risky but rewarding",
  "Tip: Watch your opponent's patterns",
  "Tip: Reserve time is precious — play fast!",
  "Tip: A good defence wins matches",
];

export default function WaitingRoom({ roomCode, playerName, playerAvatarIndex = 0, gameType = "ar", onCancel }: Props) {
  const [tip, setTip] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTip(t => (t + 1) % TIPS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeLabel = gameType === "tap" ? "TAP DUEL" : gameType === "tournament" ? "TOURNAMENT" : "AR DUEL";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center gap-5 relative"
    >
      {/* Stadium ambiance bg */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floodlight glow */}
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
        {/* Pitch lines */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-60 border border-neon-green/5 rounded-sm" />
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-16 h-1 bg-neon-green/10 rounded-full" />
        <div className="absolute bottom-56 left-1/2 -translate-x-1/2 w-16 h-1 bg-neon-green/10 rounded-full" />
      </div>

      {/* Match type badge */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-5 py-1.5 rounded-full glass-premium border border-primary/20"
      >
        <span className="font-display text-[9px] font-bold text-primary tracking-[0.25em]">{typeLabel}</span>
      </motion.div>

      {/* Player card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-premium rounded-2xl p-5 w-full max-w-xs text-center border border-primary/15 relative overflow-hidden"
      >
        <motion.div
          animate={{ opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"
        />
        <div className="relative z-10">
          <div className="flex justify-center mb-3">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <PlayerAvatar avatarIndex={playerAvatarIndex} size="lg" />
            </motion.div>
          </div>
          <span className="font-display text-sm font-black text-foreground tracking-wider block">{playerName}</span>
          <span className="text-[8px] text-muted-foreground font-display tracking-widest">HOST</span>
        </div>
      </motion.div>

      {/* VS separator with waiting animation */}
      <div className="flex items-center gap-4 w-full max-w-xs">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/30" />
        <div className="relative">
          <SpinningCricketBall size={48} />
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/30" />
      </div>

      {/* Opponent placeholder */}
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="glass-premium rounded-2xl p-5 w-full max-w-xs text-center border border-dashed border-muted-foreground/20"
      >
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/20 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
            <span className="text-2xl">❓</span>
          </div>
        </div>
        <span className="font-display text-xs font-bold text-muted-foreground tracking-wider">WAITING FOR OPPONENT...</span>
        <div className="flex gap-1.5 justify-center mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
              className="w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>
      </motion.div>

      {/* Match code card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-premium rounded-xl p-3 w-full max-w-xs border border-primary/15"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-display text-[7px] text-muted-foreground tracking-[0.3em] block">ROOM CODE</span>
            <span className="font-mono text-lg font-bold text-primary tracking-[0.2em]">{roomCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[8px] text-neon-green font-display font-bold">LIVE</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyCode}
              className="px-3 py-1.5 rounded-lg glass-card text-[8px] font-display font-bold text-primary tracking-wider border border-primary/20"
            >
              {copied ? "✓ COPIED" : "📋 COPY"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Tips carousel */}
      <motion.p
        key={tip}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 0.6, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-[9px] text-muted-foreground font-display text-center max-w-xs"
      >
        💡 {TIPS[tip]}
      </motion.p>

      {/* Cancel */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onCancel}
        className="px-6 py-2.5 rounded-xl bg-out-red/10 border border-out-red/20 text-[9px] font-display font-bold text-out-red tracking-wider"
      >
        ✕ CANCEL MATCH
      </motion.button>
    </motion.div>
  );
}
