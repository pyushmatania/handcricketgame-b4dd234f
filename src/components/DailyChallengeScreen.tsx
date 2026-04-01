import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { getCommentary, getInningsChangeCommentary } from "@/lib/commentary";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  onHome: () => void;
}

const MOVES: { move: Move; emoji: string; label: string; color: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "border-accent/30 bg-accent/5" },
  { move: 1, emoji: "☝️", label: "1", color: "border-primary/30 bg-primary/5" },
  { move: 2, emoji: "✌️", label: "2", color: "border-neon-green/30 bg-neon-green/5" },
  { move: 3, emoji: "🤟", label: "3", color: "border-secondary/30 bg-secondary/5" },
  { move: 4, emoji: "🖖", label: "4", color: "border-score-gold/30 bg-score-gold/5" },
  { move: 6, emoji: "👍", label: "6", color: "border-primary/40 bg-primary/10" },
];

function getDailyTarget(): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return 25 + (seed % 51); // Target between 25-75
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function DailyChallengeScreen({ onHome }: Props) {
  const { soundEnabled, hapticsEnabled, commentaryEnabled } = useSettings();
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [cooldown, setCooldown] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [bestToday, setBestToday] = useState<number | null>(null);
  const savedRef = useRef(false);
  const prevPhaseRef = useRef(game.phase);

  const dailyTarget = getDailyTarget();
  const todayKey = getTodayKey();

  useEffect(() => {
    const stored = localStorage.getItem(`hc_daily_${todayKey}`);
    if (stored) {
      setAlreadyPlayed(true);
      setBestToday(parseInt(stored));
    }
  }, [todayKey]);

  const startChallenge = () => {
    resetGame();
    savedRef.current = false;
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    startGame(true);
    setPhase("playing");
  };

  // Save on finish
  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "daily");
      localStorage.setItem(`hc_daily_${todayKey}`, String(game.userScore));
      setBestToday(game.userScore);
      setAlreadyPlayed(true);
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); }
      else { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); }
      setTimeout(() => setPhase("done"), 1200);
    }
  }, [game.phase]);

  // Innings change
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;
    if (prev !== game.phase && game.phase !== "not_started" && game.phase !== "finished") {
      if (commentaryEnabled) {
        setCommentary(getInningsChangeCommentary(game));
        setTimeout(() => setCommentary(null), 3000);
      }
      if (soundEnabled) SFX.gameStart();
    }
  }, [game.phase]);

  // Ball sounds
  useEffect(() => {
    if (!game.lastResult) return;
    const r = game.lastResult;
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") {
      setTimeout(() => { if (soundEnabled) SFX.out(); if (hapticsEnabled) Haptics.out(); }, 150);
    } else if (typeof r.runs === "number") {
      const abs = Math.abs(r.runs);
      if (abs === 6) setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); }, 100);
      else if (abs === 4) setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); }, 100);
      else { if (soundEnabled) SFX.runs(abs); if (hapticsEnabled) Haptics.light(); }
    }
    if (commentaryEnabled) {
      setCommentary(getCommentary({ game, result: r }));
      setTimeout(() => setCommentary(null), 2500);
    }
  }, [game.lastResult]);

  const handleMove = (move: Move) => {
    if (cooldown || game.phase === "not_started" || game.phase === "finished") return;
    if (soundEnabled) SFX.tap();
    if (hapticsEnabled) Haptics.light();
    playBall(move);
    setCooldown(true);
    const md = MOVES.find(m => m.move === move);
    if (md) {
      setShowExplosion({ emoji: md.emoji, key: Date.now() });
      setTimeout(() => setShowExplosion(null), 800);
    }
    setTimeout(() => setCooldown(false), 800);
  };

  const hitTarget = bestToday !== null && bestToday >= dailyTarget;

  const shareResult = async () => {
    const text = `🏏 Hand Cricket Daily Challenge\n📅 ${todayKey}\n🎯 Target: ${dailyTarget}\n⭐ My Score: ${bestToday}\n${hitTarget ? "✅ TARGET SMASHED!" : "❌ Missed it"}\n\nPlay at handcricketgame.lovable.app`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      // Could show toast here
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onHome} className="text-muted-foreground hover:text-foreground text-sm font-bold active:scale-95">← Back</button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-score-gold animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.15em] text-score-gold font-bold">DAILY CHALLENGE</span>
        </div>
        <div className="w-12" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* INTRO */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl">📅</span>
            <h2 className="font-display text-xl font-black text-foreground tracking-wider">TODAY'S CHALLENGE</h2>
            <div className="glass-score p-5 text-center w-full max-w-xs">
              <span className="text-[9px] text-muted-foreground font-display tracking-wider block mb-1">TARGET SCORE</span>
              <span className="font-display text-4xl font-black text-score-gold text-glow-gold">{dailyTarget}</span>
              <p className="text-[9px] text-muted-foreground mt-2">Score {dailyTarget}+ runs batting first to complete today's challenge</p>
            </div>

            {alreadyPlayed && bestToday !== null ? (
              <div className="text-center space-y-3 w-full max-w-xs">
                <div className="glass-score p-4">
                  <span className="text-3xl block mb-1">{hitTarget ? "✅" : "❌"}</span>
                  <p className="font-display text-sm font-bold text-foreground">
                    {hitTarget ? "CHALLENGE COMPLETE!" : "CHALLENGE FAILED"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Your score: <span className="text-score-gold font-bold">{bestToday}</span></p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={shareResult}
                    className="flex-1 py-3 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-display font-bold text-xs rounded-2xl">
                    📤 SHARE
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                    className="flex-1 py-3 bg-muted text-foreground font-display font-bold text-xs rounded-2xl">
                    HOME
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={startChallenge}
                className="w-full max-w-xs py-4 bg-gradient-to-r from-score-gold to-score-gold/80 text-background font-display font-black text-sm rounded-2xl tracking-wider">
                🏏 START CHALLENGE
              </motion.button>
            )}
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <>
            <div className="glass-score p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-score-gold/20 border border-score-gold/30 flex items-center justify-center text-xl">📅</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">Daily Challenge</span>
                <span className="text-[8px] text-muted-foreground block">Target: {dailyTarget} runs</span>
              </div>
              <span className={`text-[9px] font-display font-bold ${game.isBatting ? "text-secondary" : "text-primary"}`}>
                {game.isBatting ? "🏏 BATTING" : "🎯 BOWLING"}
              </span>
            </div>

            <div className="glass-score p-3">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-[7px] text-muted-foreground font-bold tracking-widest block">YOU</span>
                  <span className="font-display text-2xl font-black text-score-gold text-glow-gold leading-none">{game.userScore}</span>
                </div>
                <span className="text-[8px] font-display text-muted-foreground font-bold">VS</span>
                <div className="text-center flex-1">
                  <span className="text-[7px] text-muted-foreground font-bold tracking-widest block">AI</span>
                  <span className="font-display text-2xl font-black text-accent leading-none">{game.aiScore}</span>
                </div>
              </div>
              {game.target && (
                <p className="text-center text-[9px] font-display font-bold text-secondary mt-2">CHASE: {game.target}</p>
              )}
            </div>

            <AnimatePresence>
              {commentary && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="broadcast-bar px-4 py-2.5 rounded-xl text-center">
                  <p className="font-display text-[10px] font-bold text-foreground tracking-wider">📢 {commentary}</p>
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
                      className={`py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border ${
                        cooldown ? "opacity-30 cursor-not-allowed border-transparent bg-muted/30" : `${m.color} text-foreground`
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

        {/* DONE */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl">{game.userScore >= dailyTarget ? "🎯" : "💪"}</span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {game.result === "win" ? "YOU WIN!" : game.result === "draw" ? "DRAW" : "AI WINS"}
            </h2>
            <div className="glass-score p-4 w-full max-w-xs text-center">
              <span className="font-display text-lg text-score-gold font-black">{game.userScore}</span>
              <span className="text-muted-foreground mx-2">—</span>
              <span className="font-display text-lg text-accent font-black">{game.aiScore}</span>
            </div>
            <div className={`glass-score p-4 w-full max-w-xs text-center ${game.userScore >= dailyTarget ? "border border-neon-green/30" : "border border-out-red/30"}`}>
              <p className="font-display text-xs font-bold text-foreground">
                {game.userScore >= dailyTarget ? "✅ DAILY TARGET SMASHED!" : `❌ Needed ${dailyTarget}, scored ${game.userScore}`}
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button whileTap={{ scale: 0.95 }} onClick={shareResult}
                className="flex-1 py-3.5 bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground font-display font-bold rounded-2xl">
                📤 SHARE
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                className="flex-1 py-3.5 bg-muted text-foreground font-display font-bold rounded-2xl">HOME</motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
