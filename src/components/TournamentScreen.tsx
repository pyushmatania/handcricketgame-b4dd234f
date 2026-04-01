import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { getCommentary, getInningsChangeCommentary } from "@/lib/commentary";
import { useSettings } from "@/contexts/SettingsContext";
import ScoreBoard from "./ScoreBoard";
import RulesSheet from "./RulesSheet";

type Round = {
  round: number;
  opponent: string;
  result: "win" | "loss" | "pending";
  userScore?: number;
  oppScore?: number;
};

const MOVES: { move: Move; emoji: string; label: string; color: string; glow: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "from-accent/20 to-accent/5 border-accent/25", glow: "shadow-[0_0_15px_hsl(168_80%_50%/0.15)]" },
  { move: 1, emoji: "☝️", label: "1", color: "from-primary/20 to-primary/5 border-primary/25", glow: "shadow-[0_0_15px_hsl(217_91%_60%/0.15)]" },
  { move: 2, emoji: "✌️", label: "2", color: "from-neon-green/20 to-neon-green/5 border-neon-green/25", glow: "shadow-[0_0_15px_hsl(142_71%_45%/0.15)]" },
  { move: 3, emoji: "🤟", label: "3", color: "from-secondary/20 to-secondary/5 border-secondary/25", glow: "shadow-[0_0_15px_hsl(45_93%_58%/0.15)]" },
  { move: 4, emoji: "🖖", label: "4", color: "from-secondary/25 to-secondary/10 border-secondary/30", glow: "shadow-[0_0_20px_hsl(45_93%_58%/0.2)]" },
  { move: 6, emoji: "👍", label: "6", color: "from-primary/25 to-primary/10 border-primary/30", glow: "shadow-[0_0_20px_hsl(217_91%_60%/0.25)]" },
];

const AI_OPPONENTS = [
  { name: "Rookie Bot", difficulty: 0.3, emoji: "🤖" },
  { name: "Club Player", difficulty: 0.5, emoji: "🏏" },
  { name: "State Champ", difficulty: 0.7, emoji: "⭐" },
  { name: "National Star", difficulty: 0.85, emoji: "🌟" },
  { name: "World Legend", difficulty: 0.95, emoji: "👑" },
];

interface Props { onHome: () => void; }

export default function TournamentScreen({ onHome }: Props) {
  const { soundEnabled, hapticsEnabled, commentaryEnabled } = useSettings();
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const [phase, setPhase] = useState<"bracket" | "playing" | "result">("bracket");
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [eliminated, setEliminated] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);
  const savedRef = useRef(false);
  const prevPhaseRef = useRef(game.phase);

  const startTournament = () => {
    const r: Round[] = AI_OPPONENTS.map((opp, i) => ({ round: i + 1, opponent: opp.name, result: "pending" }));
    setRounds(r);
    setCurrentRound(0);
    setEliminated(false);
    setPhase("bracket");
  };

  useEffect(() => { startTournament(); }, []);

  const startRound = () => {
    resetGame();
    savedRef.current = false;
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    startGame(true);
    setPhase("playing");
  };

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "tournament");
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); }
      else { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); }
      const newRounds = [...rounds];
      newRounds[currentRound] = { ...newRounds[currentRound], result: game.result === "win" ? "win" : "loss", userScore: game.userScore, oppScore: game.aiScore };
      setRounds(newRounds);
      setTimeout(() => { if (game.result !== "win") setEliminated(true); setPhase("result"); }, 1500);
    }
  }, [game.phase]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;
    if (prev !== game.phase && game.phase !== "not_started" && game.phase !== "finished") {
      if (commentaryEnabled) { setCommentary(getInningsChangeCommentary(game)); setTimeout(() => setCommentary(null), 3000); }
      if (soundEnabled) SFX.gameStart();
    }
  }, [game.phase]);

  useEffect(() => {
    if (!game.lastResult) return;
    const r = game.lastResult;
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") { setTimeout(() => { if (soundEnabled) SFX.out(); if (hapticsEnabled) Haptics.out(); }, 150); }
    else if (typeof r.runs === "number") {
      const abs = Math.abs(r.runs);
      if (abs === 6) setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); }, 100);
      else if (abs === 4) setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); }, 100);
      else { if (soundEnabled) SFX.runs(abs); if (hapticsEnabled) Haptics.light(); }
    }
    if (commentaryEnabled) { setCommentary(getCommentary({ game, result: r })); setTimeout(() => setCommentary(null), 2500); }
  }, [game.lastResult]);

  const handleMove = (move: Move) => {
    if (cooldown || game.phase === "not_started" || game.phase === "finished") return;
    if (soundEnabled) SFX.tap();
    if (hapticsEnabled) Haptics.light();
    playBall(move);
    setCooldown(true);
    const md = MOVES.find(m => m.move === move);
    if (md) { setShowExplosion({ emoji: md.emoji, key: Date.now() }); setTimeout(() => setShowExplosion(null), 800); }
    setTimeout(() => setCooldown(false), 800);
  };

  const advanceRound = () => {
    if (currentRound < AI_OPPONENTS.length - 1) { setCurrentRound(currentRound + 1); setPhase("bracket"); }
  };

  const opp = AI_OPPONENTS[currentRound];
  const winsCount = rounds.filter(r => r.result === "win").length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(45 93% 58% / 0.05) 0%, transparent 70%)" }} />

      {/* Premium top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onHome} className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-secondary font-bold">TOURNAMENT</span>
        </div>
        <RulesSheet />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* BRACKET VIEW */}
        {phase === "bracket" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">
            <div className="text-center">
              <motion.span
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl block mb-2"
              >🏆</motion.span>
              <h2 className="font-display text-lg font-black text-foreground tracking-wider">TOURNAMENT</h2>
              <p className="text-[10px] text-muted-foreground font-display">Win 5 rounds to become champion</p>
              {/* Progress */}
              <div className="flex items-center justify-center gap-1 mt-3">
                {AI_OPPONENTS.map((_, i) => {
                  const r = rounds[i];
                  return (
                    <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${
                      r?.result === "win" ? "bg-neon-green shadow-[0_0_6px_hsl(142_71%_45%/0.3)]"
                      : r?.result === "loss" ? "bg-out-red"
                      : i === currentRound ? "bg-secondary/50 animate-pulse"
                      : "bg-muted/30"
                    }`} />
                  );
                })}
              </div>
            </div>

            {/* Bracket */}
            <div className="space-y-2">
              {AI_OPPONENTS.map((ai, i) => {
                const r = rounds[i];
                const isCurrent = i === currentRound;
                const isPast = r && r.result !== "pending";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`glass-premium rounded-xl p-3 flex items-center gap-3 transition-all ${
                      isCurrent ? "border border-secondary/30 shadow-[0_0_15px_hsl(45_93%_58%/0.1)]" : isPast ? "" : "opacity-35"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      isCurrent ? "bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25" : isPast && r?.result === "win" ? "bg-neon-green/10 border border-neon-green/20" : "bg-muted/30"
                    }`}>{ai.emoji}</div>
                    <div className="flex-1">
                      <span className="font-display text-[10px] font-bold text-foreground block tracking-wider">R{i + 1}: {ai.name}</span>
                      <span className="text-[8px] text-muted-foreground">
                        {isPast && r ? `${r.userScore} - ${r.oppScore}` : isCurrent ? "Next match" : "Locked"}
                      </span>
                    </div>
                    {isPast && r && (
                      <span className={`font-display text-[9px] font-bold px-2 py-1 rounded-lg ${r.result === "win" ? "text-neon-green bg-neon-green/10" : "text-out-red bg-out-red/10"}`}>
                        {r.result === "win" ? "✅ WON" : "❌ LOST"}
                      </span>
                    )}
                    {isCurrent && !isPast && (
                      <span className="text-secondary font-display font-bold text-xs animate-pulse">▶</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {!eliminated && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={startRound}
                className="w-full py-4 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-black text-sm rounded-2xl tracking-wider shadow-[0_0_25px_hsl(45_93%_58%/0.2)] border border-secondary/30">
                ⚔️ FIGHT {opp.name.toUpperCase()}
              </motion.button>
            )}

            {eliminated && (
              <div className="text-center space-y-3">
                <p className="font-display text-sm text-out-red font-bold">ELIMINATED — {winsCount}/5 rounds won</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={startTournament}
                  className="w-full py-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl shadow-[0_0_20px_hsl(217_91%_60%/0.2)] border border-primary/30">
                  🔄 RESTART TOURNAMENT
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <>
            {/* Opponent banner */}
            <div className="glass-premium rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25 flex items-center justify-center text-xl">{opp.emoji}</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">vs {opp.name}</span>
                <span className="text-[8px] text-muted-foreground block">Round {currentRound + 1}/5</span>
              </div>
              <span className={`text-[9px] font-display font-bold ${game.isBatting ? "text-secondary" : "text-primary"}`}>
                {game.isBatting ? "🏏 BATTING" : "🎯 BOWLING"}
              </span>
            </div>

            <ScoreBoard game={game} />

            <AnimatePresence>
              {commentary && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="glass-card rounded-xl px-4 py-2.5 text-center flex items-center justify-center gap-2">
                  <span className="text-xs">📢</span>
                  <p className="font-display text-[10px] font-bold text-foreground tracking-wider">{commentary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {game.phase !== "finished" && game.phase !== "not_started" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-auto relative">
                <AnimatePresence>
                  {showExplosion && (
                    <motion.div key={showExplosion.key} initial={{ scale: 1, opacity: 1 }} animate={{ scale: 3, opacity: 0 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <span className="text-6xl">{showExplosion.emoji}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="grid grid-cols-3 gap-2">
                  {MOVES.map((m) => (
                    <motion.button key={m.label} whileTap={{ scale: 0.8 }} onClick={() => handleMove(m.move)} disabled={cooldown}
                      className={`py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border backdrop-blur-sm ${
                        cooldown ? "opacity-30 cursor-not-allowed border-transparent bg-muted/20" : `bg-gradient-to-br ${m.color} text-foreground ${m.glow}`
                      }`}>
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-[10px] tracking-wider">{m.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5 }}
              className="text-6xl"
            >{game.result === "win" ? "✅" : "❌"}</motion.span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {game.result === "win" ? `BEAT ${opp.name.toUpperCase()}!` : `${opp.name.toUpperCase()} WINS`}
            </h2>
            <div className="glass-premium rounded-2xl p-4 w-full max-w-xs text-center">
              <span className="font-display text-lg text-secondary font-black">{game.userScore}</span>
              <span className="text-muted-foreground mx-2">vs</span>
              <span className="font-display text-lg text-accent font-black">{game.aiScore}</span>
            </div>

            {game.result === "win" && currentRound === AI_OPPONENTS.length - 1 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-3">
                <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-6xl block">🏆</motion.span>
                <h3 className="font-display text-xl font-black text-secondary" style={{ textShadow: "0 0 20px hsl(45 93% 58% / 0.3)" }}>TOURNAMENT CHAMPION!</h3>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startTournament()}
                  className="w-full py-3 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-bold rounded-2xl shadow-[0_0_20px_hsl(45_93%_58%/0.2)]">
                  🔄 PLAY AGAIN
                </motion.button>
              </motion.div>
            ) : game.result === "win" ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={advanceRound}
                className="w-full max-w-xs py-3.5 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-black rounded-2xl tracking-wider shadow-[0_0_20px_hsl(45_93%_58%/0.2)] border border-secondary/30">
                ⚔️ NEXT ROUND →
              </motion.button>
            ) : (
              <div className="flex gap-3 w-full max-w-xs">
                <motion.button whileTap={{ scale: 0.95 }} onClick={startTournament}
                  className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl shadow-[0_0_15px_hsl(217_91%_60%/0.2)]">
                  🔄 RETRY
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                  className="flex-1 py-3.5 glass-premium text-foreground font-display font-bold rounded-2xl border border-primary/10">HOME</motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
