import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/lib/sounds";
import { CrowdSFX } from "@/lib/voiceCommentary";
import { playElevenLabsMusic, stopMusic, isElevenLabsAvailable, speakDuoLines } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import {
  pickMatchCommentators, type Commentator, type CommentaryLine,
  getPreMatchDuoIntro, getPreMatchStadiumLines, getPreMatchTossLines,
  getPreMatchStrategyLines, getPreMatchGameOnLines,
} from "@/lib/commentaryDuo";
import prematchBg from "@/assets/prematch-bg.jpg";

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

// Page definitions
type PageId = "intro" | "stadium" | "rivalry" | "toss" | "strategy" | "gameon";

interface CeremonyPage {
  id: PageId;
  lines: CommentaryLine[];
  voiceEnabled: boolean; // whether TTS plays on this page
}

function getDominance(stats: RivalryStats) {
  if (!stats.totalGames) return { pct: 50, label: "EVEN" };
  const pct = Math.round((stats.myWins / stats.totalGames) * 100);
  if (pct >= 75) return { pct, label: "DOMINANT" };
  if (pct >= 55) return { pct, label: "LEADING" };
  if (pct >= 45) return { pct, label: "CONTESTED" };
  return { pct, label: "TRAILING" };
}

export default function EnhancedPreMatch({
  playerName, opponentName, tossWinner, battingFirst,
  rivalryStats, isPvP = false, commentators, onComplete,
}: EnhancedPreMatchProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled, crowdEnabled, commentaryEnabled } = useSettings();
  const stableOnComplete = useCallback(onComplete, []);

  const duo = commentators || pickMatchCommentators();
  const c1 = duo[0].name;
  const c2 = duo[1].name;
  const hasRivalry = isPvP && rivalryStats && rivalryStats.totalGames > 0;

  // Build pages
  const pages: CeremonyPage[] = [];
  pages.push({ id: "intro", lines: getPreMatchDuoIntro(c1, c2, playerName, opponentName), voiceEnabled: true });
  pages.push({ id: "stadium", lines: getPreMatchStadiumLines(c1, c2, playerName), voiceEnabled: false });
  if (hasRivalry) {
    pages.push({ id: "rivalry", lines: [
      { commentatorId: c1, text: `Head-to-head: ${playerName} ${rivalryStats!.myWins} - ${rivalryStats!.theirWins} ${opponentName}!`, isKeyMoment: false },
      { commentatorId: c2, text: `${rivalryStats!.myWins > rivalryStats!.theirWins ? `${playerName} ka raaj chal raha hai!` : rivalryStats!.theirWins > rivalryStats!.myWins ? `${opponentName} is the boss right now!` : "Barabari! All square!"}`, isKeyMoment: false },
    ], voiceEnabled: false });
  }
  pages.push({ id: "toss", lines: getPreMatchTossLines(c1, c2, tossWinner, battingFirst, tossWinner), voiceEnabled: true });
  pages.push({ id: "strategy", lines: getPreMatchStrategyLines(c1, c2, playerName, opponentName, battingFirst === playerName), voiceEnabled: false });
  pages.push({ id: "gameon", lines: getPreMatchGameOnLines(c1, c2, battingFirst), voiceEnabled: true });

  const page = pages[currentPage];
  const dominance = hasRivalry ? getDominance(rivalryStats!) : null;

  // Start music & SFX on mount
  useEffect(() => {
    if (isElevenLabsAvailable()) {
      playElevenLabsMusic("Epic dramatic cricket tournament intro music, cinematic brass and drums, building excitement", 20, false);
    }
    if (soundEnabled) SFX.ceremonyHorn();
    if (crowdEnabled) CrowdSFX.ambientMurmur(8);
    return () => { stopMusic(); };
  }, []);

  // Play TTS when page changes (only for voiced pages)
  useEffect(() => {
    if (!page || !voiceEnabled || !commentaryEnabled || !page.voiceEnabled) return;
    const keyLines = page.lines.filter(l => l.isKeyMoment);
    if (keyLines.length === 0) return;
    const ttsLines = keyLines.map(l => ({
      text: l.text,
      voiceId: (duo.find(c => c.name === l.commentatorId) || duo[0]).voiceId,
    }));
    speakDuoLines(ttsLines);
  }, [currentPage]);

  // SFX per page
  useEffect(() => {
    if (page?.id === "toss" && soundEnabled) SFX.tossReveal();
    if (page?.id === "gameon") {
      if (soundEnabled) SFX.gameStart();
      if (crowdEnabled) CrowdSFX.roar();
    }
    if (page?.id === "stadium" && crowdEnabled) CrowdSFX.cheer();
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
          {/* Background */}
          <img src={prematchBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

          {/* Animated floodlights */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i}
                animate={{ opacity: [0.08, 0.35, 0.08] }}
                transition={{ duration: 2.5 + Math.random(), repeat: Infinity, delay: i * 0.4 }}
                className="absolute rounded-full"
                style={{
                  width: 12, height: 12,
                  top: `${3 + Math.random() * 15}%`,
                  left: `${8 + i * 16}%`,
                  background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                  filter: "blur(4px)",
                  boxShadow: `0 0 20px 8px ${i % 2 === 0 ? "hsl(217 91% 60% / 0.3)" : "hsl(45 93% 58% / 0.2)"}`,
                }}
              />
            ))}
          </div>

          {/* Commentator badges - top */}
          <div className="relative z-10 flex items-center justify-center gap-2 pt-14 pb-2">
            {duo.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-display font-bold tracking-wider backdrop-blur-md ${
                i === 0 ? "bg-primary/20 text-primary border border-primary/25" : "bg-accent/20 text-accent border border-accent/25"
              }`}>
                <span className="text-sm">{c.avatar}</span> {c.name}
              </div>
            ))}
          </div>

          {/* Full-screen card content */}
          <div className="relative z-10 flex-1 flex flex-col mx-3 mb-3 rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

            {/* Page content area - fills card */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full space-y-5 text-center"
                >
                  {/* Page-specific visuals */}
                  {page.id === "intro" && (
                    <div className="space-y-4">
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl">🏟️</motion.div>
                      <h2 className="font-display text-2xl font-black tracking-wider text-foreground drop-shadow-lg">MATCH DAY</h2>
                      <div className="flex items-center justify-center gap-5">
                        <span className="font-display text-xl font-black text-primary drop-shadow-lg">{playerName}</span>
                        <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-secondary text-base font-display font-bold">VS</motion.span>
                        <span className="font-display text-xl font-black text-accent drop-shadow-lg">{opponentName}</span>
                      </div>
                    </div>
                  )}

                  {page.id === "stadium" && (
                    <div className="space-y-4">
                      <div className="flex justify-center gap-3">
                        {["🔦", "🏟️", "🔦"].map((e, i) => (
                          <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} className="text-4xl">{e}</motion.span>
                        ))}
                      </div>
                      <h2 className="font-display text-base font-black tracking-[0.3em] text-secondary drop-shadow-lg">FLOODLIGHTS ON</h2>
                      <p className="text-xs text-foreground/70 font-display">The crowd roars as the players take the field!</p>
                    </div>
                  )}

                  {page.id === "rivalry" && hasRivalry && dominance && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-display font-bold text-out-red tracking-[0.3em]">⚔️ HEAD TO HEAD</span>
                      <div className="flex items-center justify-center gap-10">
                        <div className="text-center">
                          <span className="text-[9px] text-foreground/60 font-display tracking-widest block">{playerName.toUpperCase()}</span>
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="font-display text-5xl font-black text-neon-green block drop-shadow-lg">{rivalryStats!.myWins}</motion.span>
                        </div>
                        <span className="text-foreground/30 font-display text-3xl">–</span>
                        <div className="text-center">
                          <span className="text-[9px] text-foreground/60 font-display tracking-widest block">{opponentName.toUpperCase()}</span>
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }} className="font-display text-5xl font-black text-out-red block drop-shadow-lg">{rivalryStats!.theirWins}</motion.span>
                        </div>
                      </div>
                      <div className="px-4">
                        <div className="h-3 rounded-full overflow-hidden flex bg-white/10">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${dominance.pct}%` }} transition={{ delay: 0.5, duration: 1 }} className="bg-gradient-to-r from-neon-green to-neon-green/60 rounded-l-full" />
                          <div className="bg-gradient-to-l from-out-red to-out-red/60 rounded-r-full flex-1" />
                        </div>
                        <span className="text-[8px] font-display font-bold text-foreground/60 mt-1.5 block">{dominance.label}</span>
                      </div>
                    </div>
                  )}

                  {page.id === "toss" && (
                    <div className="space-y-4">
                      <motion.div animate={{ rotateY: [0, 720] }} transition={{ duration: 1.2 }} className="text-6xl inline-block">🪙</motion.div>
                      <h2 className="font-display text-xl font-black text-secondary tracking-wider drop-shadow-lg">{tossWinner.toUpperCase()} WINS THE TOSS!</h2>
                      <p className="text-sm text-foreground/80 font-display">
                        Elects to <span className="text-primary font-bold">{battingFirst === tossWinner ? "BAT" : "BOWL"}</span> first
                      </p>
                    </div>
                  )}

                  {page.id === "strategy" && (
                    <div className="space-y-4">
                      <div className="text-5xl">📋</div>
                      <h2 className="font-display text-base font-black tracking-[0.2em] text-accent drop-shadow-lg">MATCH STRATEGY</h2>
                      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 mx-2">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🏏</span>
                            <span className="text-sm font-display font-bold text-primary">{battingFirst.toUpperCase()}</span>
                            <span className="text-xs text-foreground/60 font-display">bats first</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎯</span>
                            <span className="text-sm font-display font-bold text-accent">{battingFirst === playerName ? opponentName.toUpperCase() : playerName.toUpperCase()}</span>
                            <span className="text-xs text-foreground/60 font-display">bowls first</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {page.id === "gameon" && (
                    <div className="space-y-3">
                      <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-7xl block">🏏</motion.span>
                      <motion.h2
                        initial={{ letterSpacing: "0.1em" }}
                        animate={{ letterSpacing: "0.5em" }}
                        transition={{ duration: 1 }}
                        className="font-display text-3xl font-black text-foreground drop-shadow-lg"
                      >
                        GAME ON!
                      </motion.h2>
                    </div>
                  )}

                  {/* Commentary bubbles */}
                  <div className="space-y-2 px-1">
                    {page.lines.map((line, i) => {
                      const comm = duo.find(c => c.name === line.commentatorId) || duo[0];
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: comm === duo[0] ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.4 }}
                          className={`flex items-start gap-2 backdrop-blur-md rounded-xl px-3 py-2 ${
                            comm === duo[0] ? "bg-primary/10 border border-primary/15" : "bg-accent/10 border border-accent/15"
                          }`}
                        >
                          <span className="text-sm flex-shrink-0">{comm.avatar}</span>
                          <div className="text-left">
                            <span className={`text-[7px] font-display font-bold tracking-wider ${comm === duo[0] ? "text-primary" : "text-accent"}`}>{comm.name}</span>
                            <p className="font-display text-[10px] font-bold text-foreground/90 leading-snug">{line.text}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom bar: dots + controls */}
            <div className="relative z-10 px-4 pb-4 pt-2">
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-3">
                {pages.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: currentPage === i ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 1, repeat: currentPage === i ? Infinity : 0 }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${currentPage >= i ? "bg-primary" : "bg-white/20"}`}
                  />
                ))}
              </div>

              {/* Tap hint + skip */}
              <div className="flex items-center justify-between">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                  className="text-[11px] text-foreground/40 font-display tracking-wider underline"
                >
                  SKIP
                </motion.button>
                <motion.span
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[10px] text-foreground/50 font-display tracking-wider"
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
