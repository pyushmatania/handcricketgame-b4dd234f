import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { getInningsChangeCommentary } from "@/lib/commentary";
import { useSettings } from "@/contexts/SettingsContext";
import { playCrowdForResult, CrowdSFX } from "@/lib/voiceCommentary";
import { speakDuoLines } from "@/lib/elevenLabsAudio";
import { pickConfiguredMatchCommentators, getDuoCommentary, type Commentator, type CommentaryLine } from "@/lib/commentaryDuo";
import ScoreBoard from "./ScoreBoard";
import CelebrationEffects from "./CelebrationEffects";
import RulesSheet from "./RulesSheet";

interface Props { onHome: () => void; }

const MOVES: { move: Move; emoji: string; label: string; color: string; glow: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "from-accent/20 to-accent/5 border-accent/25", glow: "shadow-[0_0_15px_hsl(168_80%_50%/0.15)]" },
  { move: 1, emoji: "☝️", label: "1", color: "from-primary/20 to-primary/5 border-primary/25", glow: "shadow-[0_0_15px_hsl(217_91%_60%/0.15)]" },
  { move: 2, emoji: "✌️", label: "2", color: "from-neon-green/20 to-neon-green/5 border-neon-green/25", glow: "shadow-[0_0_15px_hsl(142_71%_45%/0.15)]" },
  { move: 3, emoji: "🤟", label: "3", color: "from-secondary/20 to-secondary/5 border-secondary/25", glow: "shadow-[0_0_15px_hsl(45_93%_58%/0.15)]" },
  { move: 4, emoji: "🖖", label: "4", color: "from-secondary/25 to-secondary/10 border-secondary/30", glow: "shadow-[0_0_20px_hsl(45_93%_58%/0.2)]" },
  { move: 6, emoji: "👍", label: "6", color: "from-primary/25 to-primary/10 border-primary/30", glow: "shadow-[0_0_20px_hsl(217_91%_60%/0.25)]" },
];

function getDailyTarget(): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return 25 + (seed % 51);
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function DailyChallengeScreen({ onHome }: Props) {
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled, commentaryVoice } = useSettings();
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [cooldown, setCooldown] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryLine[] | null>(null);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [bestToday, setBestToday] = useState<number | null>(null);
  const savedRef = useRef(false);
  const prevPhaseRef = useRef(game.phase);
  const [matchCommentators] = useState<[Commentator, Commentator]>(() => pickConfiguredMatchCommentators(commentaryVoice));

  const dailyTarget = getDailyTarget();
  const todayKey = getTodayKey();

  useEffect(() => {
    const stored = localStorage.getItem(`hc_daily_${todayKey}`);
    if (stored) { setAlreadyPlayed(true); setBestToday(parseInt(stored)); }
  }, [todayKey]);

  const startChallenge = () => {
    resetGame(); savedRef.current = false;
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    startGame(true); setPhase("playing");
  };

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "daily");
      localStorage.setItem(`hc_daily_${todayKey}`, String(game.userScore));
      setBestToday(game.userScore); setAlreadyPlayed(true);
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); }
      else { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); }
      setTimeout(() => setPhase("done"), 1200);
    }
  }, [game.phase]);

  useEffect(() => {
    const prev = prevPhaseRef.current; prevPhaseRef.current = game.phase;
    if (prev !== game.phase && game.phase !== "not_started" && game.phase !== "finished") {
      if (commentaryEnabled) {
        const text = getInningsChangeCommentary(game);
        const lines: CommentaryLine[] = [{ commentatorId: matchCommentators[0].name, text, isKeyMoment: true }];
        setCommentary(lines);
        if (voiceEnabled) speakDuoLines([{ text, voiceId: matchCommentators[0].voiceId }]);
        setTimeout(() => setCommentary(null), 3000);
      }
      if (soundEnabled) SFX.gameStart();
      if (crowdEnabled) CrowdSFX.ambientMurmur(2);
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
    if (crowdEnabled) playCrowdForResult(r.runs, game.isBatting, false);
    if (commentaryEnabled) {
      const duoLines = getDuoCommentary(
        matchCommentators[0].name, matchCommentators[1].name,
        r.runs, game.isBatting, "You", "AI"
      );
      setCommentary(duoLines);
      if (voiceEnabled) {
        const keyLines = duoLines.filter(l => l.isKeyMoment);
        if (keyLines.length > 0) {
          speakDuoLines(keyLines.map(l => ({
            text: l.text,
            voiceId: (matchCommentators.find(c => c.name === l.commentatorId || c.id === l.commentatorId) || matchCommentators[0]).voiceId,
          })));
        }
      }
      setTimeout(() => setCommentary(null), 3500);
    }
  }, [game.lastResult]);

  const handleMove = (move: Move) => {
    if (cooldown || game.phase === "not_started" || game.phase === "finished") return;
    if (soundEnabled) SFX.tap(); if (hapticsEnabled) Haptics.light();
    playBall(move); setCooldown(true);
    const md = MOVES.find(m => m.move === move);
    if (md) { setShowExplosion({ emoji: md.emoji, key: Date.now() }); setTimeout(() => setShowExplosion(null), 800); }
    setTimeout(() => setCooldown(false), 800);
  };

  const hitTarget = bestToday !== null && bestToday >= dailyTarget;

  const shareResult = async () => {
    const text = `🏏 Hand Cricket Daily Challenge\n📅 ${todayKey}\n🎯 Target: ${dailyTarget}\n⭐ My Score: ${bestToday}\n${hitTarget ? "✅ TARGET SMASHED!" : "❌ Missed it"}\n\nPlay at handcricketgame.lovable.app`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await navigator.clipboard.writeText(text); }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(45 93% 58% / 0.06) 0%, transparent 70%)" }} />

      <CelebrationEffects lastResult={game.lastResult} gameResult={game.result} phase={game.phase} />

      {/* Premium top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onHome} className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-secondary font-bold">DAILY CHALLENGE</span>
        </div>
        <RulesSheet />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* INTRO */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.span animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl">📅</motion.span>
            <h2 className="font-display text-xl font-black text-foreground tracking-wider">TODAY'S CHALLENGE</h2>
            <div className="glass-premium rounded-2xl p-5 text-center w-full max-w-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-secondary/10 to-transparent rounded-bl-full" />
              <span className="text-[9px] text-muted-foreground font-display tracking-[0.2em] block mb-1">TARGET SCORE</span>
              <span className="font-display text-4xl font-black text-secondary" style={{ textShadow: "0 0 20px hsl(45 93% 58% / 0.3)" }}>{dailyTarget}</span>
              <p className="text-[9px] text-muted-foreground mt-2">Score {dailyTarget}+ runs batting first</p>
            </div>

            {alreadyPlayed && bestToday !== null ? (
              <div className="text-center space-y-3 w-full max-w-xs">
                <div className={`glass-premium rounded-2xl p-4 border ${hitTarget ? "border-neon-green/20" : "border-out-red/20"}`}>
                  <span className="text-3xl block mb-1">{hitTarget ? "✅" : "❌"}</span>
                  <p className="font-display text-sm font-bold text-foreground">{hitTarget ? "CHALLENGE COMPLETE!" : "CHALLENGE FAILED"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Your score: <span className="text-secondary font-bold">{bestToday}</span></p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={shareResult}
                    className="flex-1 py-3 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-bold text-xs rounded-2xl shadow-[0_0_15px_hsl(45_93%_58%/0.2)]">
                    📤 SHARE
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                    className="flex-1 py-3 glass-premium text-foreground font-display font-bold text-xs rounded-2xl border border-primary/10">HOME</motion.button>
                </div>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={startChallenge}
                className="w-full max-w-xs py-4 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-black text-sm rounded-2xl tracking-wider shadow-[0_0_25px_hsl(45_93%_58%/0.2)] border border-secondary/30">
                🏏 START CHALLENGE
              </motion.button>
            )}
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === "playing" && (
          <>
            {/* Commentator badges */}
            <div className="flex items-center justify-center gap-2 mb-1">
              {matchCommentators.map((c, i) => (
                <div key={c.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-display font-bold tracking-wider ${
                  i === 0 ? "bg-primary/10 text-primary border border-primary/15" : "bg-accent/10 text-accent border border-accent/15"
                }`}>
                  <span className="text-[9px]">{c.avatar}</span>
                  {c.name}
                </div>
              ))}
            </div>

            <div className="glass-premium rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25 flex items-center justify-center text-xl">📅</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">Daily Challenge</span>
                <span className="text-[8px] text-muted-foreground block">Target: {dailyTarget} runs</span>
              </div>
              <span className={`text-[9px] font-display font-bold ${game.isBatting ? "text-secondary" : "text-primary"}`}>
                {game.isBatting ? "🏏 BATTING" : "🎯 BOWLING"}
              </span>
            </div>

            <ScoreBoard game={game} />

            <AnimatePresence>
              {commentary && commentary.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="glass-card rounded-lg px-2 py-1.5 space-y-1">
                  {commentary.map((line, i) => {
                    const comm = matchCommentators.find(c => c.name === line.commentatorId || c.id === line.commentatorId) || matchCommentators[0];
                    return (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[8px] flex-shrink-0">{comm.avatar}</span>
                        <div>
                          <span className={`text-[6px] font-display font-bold tracking-wider ${
                            comm.id === matchCommentators[0].id ? "text-primary" : "text-accent"
                          }`}>{comm.name}</span>
                          <p className="font-display text-[8px] font-bold text-foreground tracking-wider line-clamp-2">{line.text}</p>
                        </div>
                      </div>
                    );
                  })}
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

        {/* DONE */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} className="text-6xl">
              {game.userScore >= dailyTarget ? "🎯" : "💪"}
            </motion.span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {game.result === "win" ? "YOU WIN!" : game.result === "draw" ? "DRAW" : "AI WINS"}
            </h2>
            <div className="glass-premium rounded-2xl p-4 w-full max-w-xs text-center">
              <span className="font-display text-lg text-secondary font-black">{game.userScore}</span>
              <span className="text-muted-foreground mx-2">vs</span>
              <span className="font-display text-lg text-accent font-black">{game.aiScore}</span>
            </div>
            <div className={`glass-premium rounded-2xl p-4 w-full max-w-xs text-center border ${game.userScore >= dailyTarget ? "border-neon-green/20 shadow-[0_0_15px_hsl(142_71%_45%/0.1)]" : "border-out-red/20"}`}>
              <p className="font-display text-xs font-bold text-foreground">
                {game.userScore >= dailyTarget ? "✅ DAILY TARGET SMASHED!" : `❌ Needed ${dailyTarget}, scored ${game.userScore}`}
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button whileTap={{ scale: 0.95 }} onClick={shareResult}
                className="flex-1 py-3.5 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-bold rounded-2xl shadow-[0_0_15px_hsl(45_93%_58%/0.2)]">
                📤 SHARE
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                className="flex-1 py-3.5 glass-premium text-foreground font-display font-bold rounded-2xl border border-primary/10">HOME</motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
