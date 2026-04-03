import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/lib/sounds";
import { CrowdSFX, speakDuoCommentary } from "@/lib/voiceCommentary";
import { playElevenLabsMusic, stopMusic, isElevenLabsAvailable } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import {
  pickMatchCommentators, type Commentator, type CommentaryLine,
  getPreMatchDuoIntro, getPreMatchStadiumLines, getPreMatchTossLines,
  getPreMatchStrategyLines, getPreMatchGameOnLines,
} from "@/lib/commentaryDuo";
import charBatsman from "@/assets/char-batsman.png";
import charBowler from "@/assets/char-bowler.png";
import GameButton from "./shared/GameButton";

interface RivalryStats {
  myWins: number; theirWins: number; totalGames: number;
  myHighScore: number; theirHighScore: number;
  myAvgScore?: number; theirAvgScore?: number;
  lastResult?: "win" | "loss" | "draw";
  winStreak?: number; loseStreak?: number;
}

interface EnhancedPreMatchProps {
  playerName: string;
  opponentName: string;
  tossWinner: string;
  battingFirst: string;
  rivalryStats?: RivalryStats | null;
  isPvP?: boolean;
  commentators?: [Commentator, Commentator];
  onComplete: () => void;
}

type PageId = "vs" | "toss" | "gameon";

interface CeremonyPage {
  id: PageId;
  lines: CommentaryLine[];
  voiceEnabled: boolean;
}

export default function EnhancedPreMatch({
  playerName, opponentName, tossWinner, battingFirst,
  rivalryStats, isPvP = false, commentators, onComplete,
}: EnhancedPreMatchProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled, commentaryEnabled, voiceEngine } = useSettings();
  const stableOnComplete = useCallback(onComplete, []);

  const duo = commentators || pickMatchCommentators();
  const c1 = duo[0].name;
  const c2 = duo[1].name;

  const pages: CeremonyPage[] = [
    { id: "vs", lines: getPreMatchDuoIntro(c1, c2, playerName, opponentName), voiceEnabled: true },
    { id: "toss", lines: getPreMatchTossLines(c1, c2, tossWinner, battingFirst, tossWinner), voiceEnabled: true },
    { id: "gameon", lines: getPreMatchGameOnLines(c1, c2, battingFirst), voiceEnabled: true },
  ];

  const page = pages[currentPage];

  useEffect(() => {
    if (isElevenLabsAvailable()) {
      playElevenLabsMusic("Epic dramatic cricket tournament intro music, cinematic brass and drums, building excitement", 20, false);
    }
    if (soundEnabled) SFX.ceremonyHorn();
    if (crowdEnabled) CrowdSFX.ambientMurmur(8);
    return () => { stopMusic(); };
  }, []);

  useEffect(() => {
    if (!page || !voiceEnabled || !commentaryEnabled || !page.voiceEnabled) return;
    speakDuoCommentary(page.lines, duo, voiceEngine);
  }, [currentPage]);

  useEffect(() => {
    if (page?.id === "toss" && soundEnabled) SFX.tossReveal();
    if (page?.id === "gameon") {
      if (soundEnabled) SFX.gameStart();
      if (crowdEnabled) CrowdSFX.roar();
    }
  }, [currentPage]);

  const handleTap = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      stopMusic();
      setVisible(false);
      setTimeout(stableOnComplete, 400);
    }
  };

  const handleSkip = () => {
    stopMusic();
    setVisible(false);
    setTimeout(stableOnComplete, 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden cursor-pointer"
          onClick={handleTap}
        >
          {/* Dark gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_30%_8%)] via-[hsl(220_25%_12%)] to-[hsl(220_20%_6%)]" />

          {/* Animated light beams */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
              style={{
                background: "conic-gradient(from 0deg, transparent, hsl(43 96% 56% / 0.04), transparent, hsl(122 39% 49% / 0.03), transparent, transparent, transparent, transparent)",
              }}
            />
            {/* Gold sparkles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0, 1, 0], y: [0, -40, -80] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
                className="absolute w-1 h-1 rounded-full bg-game-gold"
                style={{ left: `${10 + Math.random() * 80}%`, top: `${30 + Math.random() * 50}%`, filter: "blur(0.5px)" }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {/* ── VS SPLIT SCREEN ── */}
              {page.id === "vs" && (
                <motion.div
                  key="vs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center px-4"
                >
                  {/* Diagonal split */}
                  <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden border-2 border-game-gold/30 shadow-game-card">
                    {/* Left side — Player (blue) */}
                    <div className="absolute inset-0 w-1/2 bg-gradient-to-br from-[hsl(200_70%_25%)] to-[hsl(200_60%_15%)]" />
                    {/* Right side — Opponent (red) */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-bl from-[hsl(4_60%_25%)] to-[hsl(4_50%_15%)]" />
                    {/* Diagonal slash */}
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(155deg, transparent 48%, hsl(43 96% 56% / 0.8) 48%, hsl(43 96% 56% / 0.8) 52%, transparent 52%)",
                    }} />

                    {/* Player character */}
                    <motion.div
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ type: "spring", damping: 12, delay: 0.3 }}
                      className="absolute left-0 bottom-0 w-[55%]"
                    >
                      <img src={charBatsman} alt="Player" className="w-full h-auto drop-shadow-[0_0_20px_hsl(200_70%_50%/0.4)]" />
                    </motion.div>

                    {/* Opponent character */}
                    <motion.div
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ type: "spring", damping: 12, delay: 0.5 }}
                      className="absolute right-0 bottom-0 w-[55%]"
                    >
                      <img src={charBowler} alt="Opponent" className="w-full h-auto drop-shadow-[0_0_20px_hsl(4_70%_50%/0.4)]" />
                    </motion.div>

                    {/* VS badge center */}
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 8, delay: 0.7 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-b from-game-gold to-[hsl(43_96%_40%)] border-4 border-game-gold/60 flex items-center justify-center shadow-[0_0_30px_hsl(43_96%_56%/0.5)]">
                        <span className="font-game-display text-2xl font-black text-[hsl(220_25%_12%)]">VS</span>
                      </div>
                    </motion.div>

                    {/* Player name (bottom left) */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="absolute bottom-4 left-3 z-10"
                    >
                      <p className="font-game-display text-lg font-black text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {playerName.toUpperCase()}
                      </p>
                      <p className="font-game-body text-[8px] text-white/60 tracking-widest">PLAYER</p>
                    </motion.div>

                    {/* Opponent name (bottom right) */}
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.0 }}
                      className="absolute bottom-4 right-3 z-10 text-right"
                    >
                      <p className="font-game-display text-lg font-black text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {opponentName.toUpperCase()}
                      </p>
                      <p className="font-game-body text-[8px] text-white/60 tracking-widest">OPPONENT</p>
                    </motion.div>
                  </div>

                  {/* Title */}
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="font-game-display text-xl font-black text-game-gold tracking-[0.2em] mt-4"
                    style={{ textShadow: "0 0 30px hsl(43 96% 56% / 0.4)" }}
                  >
                    MATCH DAY
                  </motion.h2>
                </motion.div>
              )}

              {/* ── TOSS ── */}
              {page.id === "toss" && (
                <motion.div
                  key="toss"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center px-6"
                >
                  <motion.div
                    animate={{ rotateY: [0, 720] }}
                    transition={{ duration: 1.2 }}
                    className="text-7xl mb-4"
                  >
                    🪙
                  </motion.div>
                  <h2 className="font-game-display text-2xl font-black text-game-gold tracking-wider mb-2"
                    style={{ textShadow: "0 0 30px hsl(43 96% 56% / 0.4)" }}>
                    {tossWinner.toUpperCase()}
                  </h2>
                  <p className="font-game-display text-sm text-white/60 tracking-wider mb-1">WINS THE TOSS!</p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-4 px-5 py-2 rounded-full bg-gradient-to-b from-game-green/20 to-game-green/10 border border-game-green/30"
                  >
                    <span className="font-game-display text-sm font-bold text-game-green tracking-wider">
                      Elects to {battingFirst === tossWinner ? "🏏 BAT" : "🎯 BOWL"} first
                    </span>
                  </motion.div>
                </motion.div>
              )}

              {/* ── GAME ON ── */}
              {page.id === "gameon" && (
                <motion.div
                  key="gameon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center px-6"
                >
                  <motion.span
                    animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-7xl block mb-4"
                  >
                    🏏
                  </motion.span>
                  <motion.h2
                    initial={{ letterSpacing: "0.1em", scale: 0.5 }}
                    animate={{ letterSpacing: "0.5em", scale: 1 }}
                    transition={{ duration: 0.8, type: "spring" }}
                    className="font-game-display text-4xl font-black text-white"
                    style={{ textShadow: "0 0 40px hsl(43 96% 56% / 0.5), 0 4px 8px rgba(0,0,0,0.5)" }}
                  >
                    GAME ON!
                  </motion.h2>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="h-1 bg-gradient-to-r from-transparent via-game-gold to-transparent mt-3 rounded-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commentary bubbles — always visible at bottom */}
            <div className="px-4 pb-2 space-y-1.5">
              {page.lines.map((line, i) => {
                const comm = duo.find(c => c.name === line.commentatorId) || duo[0];
                return (
                  <motion.div
                    key={`${currentPage}-${i}`}
                    initial={{ opacity: 0, x: comm === duo[0] ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.4 }}
                    className={`flex items-start gap-2 rounded-xl px-3 py-2 ${
                      comm === duo[0]
                        ? "bg-game-green/10 border border-game-green/15"
                        : "bg-game-gold/10 border border-game-gold/15"
                    }`}
                  >
                    <span className="text-sm flex-shrink-0">{comm.avatar}</span>
                    <div className="text-left">
                      <span className={`text-[7px] font-game-display font-bold tracking-wider ${
                        comm === duo[0] ? "text-game-green" : "text-game-gold"
                      }`}>{comm.name}</span>
                      <p className="font-game-body text-[10px] font-bold text-white/80 leading-snug">{line.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom controls */}
            <div className="px-4 pb-6 pt-2">
              <div className="flex justify-center gap-2 mb-3">
                {pages.map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${currentPage >= i ? "bg-game-gold" : "bg-white/15"}`} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                  className="text-[11px] text-white/30 font-game-display tracking-wider underline"
                >
                  SKIP
                </motion.button>
                <motion.span
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[10px] text-white/40 font-game-display tracking-wider"
                >
                  TAP TO CONTINUE →
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
