import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Move, BallResult, GameResult, InningsPhase, MatchConfig } from "@/hooks/useHandCricket";
import { SFX, Haptics } from "@/lib/sounds";
import { getCommentary, getInningsChangeCommentary } from "@/lib/commentary";
import { speakCommentary, playCrowdForResult, CrowdSFX } from "@/lib/voiceCommentary";
import { speakDuoLines, isElevenLabsAvailable } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import { pickMatchCommentators, getDuoCommentary, getOverBreakCommentary, type Commentator, type CommentaryLine } from "@/lib/commentaryDuo";
import ScoreBoard from "./ScoreBoard";
import CelebrationEffects from "./CelebrationEffects";
import OverBreakScreen from "./OverBreakScreen";
import cricketGround from "@/assets/cricket-ground.jpg";

const MOVES_CONFIG: { move: Move; emoji: string; label: string; color: string; glow: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "from-accent/20 to-accent/5 border-accent/25", glow: "shadow-[0_0_15px_hsl(168_80%_50%/0.15)]" },
  { move: 1, emoji: "☝️", label: "1", color: "from-primary/20 to-primary/5 border-primary/25", glow: "shadow-[0_0_15px_hsl(217_91%_60%/0.15)]" },
  { move: 2, emoji: "✌️", label: "2", color: "from-neon-green/20 to-neon-green/5 border-neon-green/25", glow: "shadow-[0_0_15px_hsl(142_71%_45%/0.15)]" },
  { move: 3, emoji: "🤟", label: "3", color: "from-secondary/20 to-secondary/5 border-secondary/25", glow: "shadow-[0_0_15px_hsl(45_93%_58%/0.15)]" },
  { move: 4, emoji: "🖖", label: "4", color: "from-secondary/25 to-secondary/10 border-secondary/30", glow: "shadow-[0_0_20px_hsl(45_93%_58%/0.2)]" },
  { move: 6, emoji: "👍", label: "6", color: "from-primary/25 to-primary/10 border-primary/30", glow: "shadow-[0_0_20px_hsl(217_91%_60%/0.25)]" },
];

export interface TapPlayingUIProps {
  phase: InningsPhase;
  userScore: number;
  aiScore: number;
  userWickets: number;
  aiWickets: number;
  target: number | null;
  currentInnings: 1 | 2;
  isBatting: boolean;
  lastResult: BallResult | null;
  result: GameResult;
  ballHistory: BallResult[];
  playerName: string;
  opponentName: string;
  opponentEmoji?: string;
  onMove: (move: Move) => void;
  onReset: () => void;
  onHome: () => void;
  isPvP?: boolean;
  waitingForOpponent?: boolean;
  cooldownOverride?: boolean;
  extraContent?: React.ReactNode;
  modeLabel?: string;
  matchConfig?: MatchConfig;
  innings1Balls?: number;
}

export default function TapPlayingUI({
  phase, userScore, aiScore, userWickets, aiWickets, target,
  currentInnings, isBatting, lastResult, result, ballHistory,
  playerName, opponentName, opponentEmoji = "🏏",
  onMove, onReset, onHome,
  isPvP = false, waitingForOpponent = false, cooldownOverride,
  extraContent, modeLabel = "TAP MODE", matchConfig, innings1Balls,
}: TapPlayingUIProps) {
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled } = useSettings();
  const [lastPlayed, setLastPlayed] = useState<Move | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [showExplosion, setShowExplosion] = useState<{ emoji: string; key: number } | null>(null);
  const [commentary, setCommentary] = useState<CommentaryLine[] | null>(null);
  const [showOverBreak, setShowOverBreak] = useState(false);
  const [overBreakData, setOverBreakData] = useState<any>(null);
  const prevPhaseRef = useRef(phase);
  const prevBallCountRef = useRef(0);

  // Pick 2 commentators for this match session
  const [matchCommentators] = useState<[Commentator, Commentator]>(() => pickMatchCommentators());

  const effectiveCooldown = cooldownOverride !== undefined ? cooldownOverride : cooldown;

  const config = matchConfig || { overs: null, wickets: 1 };
  const currentBalls = currentInnings === 1 ? (innings1Balls ?? ballHistory.length) : 
    ballHistory.length - (innings1Balls ?? 0);

  const gameStateForScoreboard = {
    phase, userScore, aiScore, userWickets, aiWickets,
    target, currentInnings, isBatting, lastResult, result, ballHistory,
    config,
    innings1Balls: innings1Balls || ballHistory.length,
    innings2Balls: 0,
  };

  // Check for over completion (every 6 balls) — only for limited overs
  useEffect(() => {
    if (!config.overs || phase === "not_started" || phase === "finished") return;
    const totalBalls = currentBalls;
    const prevBalls = prevBallCountRef.current;
    prevBallCountRef.current = totalBalls;

    if (totalBalls > 0 && totalBalls % 6 === 0 && totalBalls !== prevBalls && totalBalls > prevBalls) {
      const oversCompleted = Math.floor(totalBalls / 6);
      // Don't show break on last over (game ends)
      if (config.overs && oversCompleted >= config.overs) return;

      // Calculate over stats
      const recentBalls = ballHistory.slice(-6);
      let overRuns = 0;
      const thisOverBalls: { runs: number | "OUT" }[] = [];
      for (const b of recentBalls) {
        thisOverBalls.push({ runs: b.runs });
        if (typeof b.runs === "number" && b.runs > 0) overRuns += b.runs;
      }

      const score = isBatting ? userScore : aiScore;
      const wickets = isBatting ? userWickets : aiWickets;
      const opponentScore = isBatting ? aiScore : userScore;
      const opponentWickets = isBatting ? aiWickets : userWickets;
      const crr = totalBalls > 0 ? (score / (totalBalls / 6)).toFixed(1) : "0.0";
      const remainingBalls = config.overs ? (config.overs * 6 - totalBalls) : 999;
      const remaining = target ? Math.max(0, target - score) : 0;
      const rrr = remainingBalls > 0 && target ? (remaining / (remainingBalls / 6)).toFixed(1) : "0.0";

      const stats = {
        overRuns, score, wickets, opponentScore, opponentWickets,
        crr, rrr, target, remaining, remainingBalls,
        oversCompleted, totalOvers: config.overs,
        isBatting, playerName, opponentName,
        thisOverBalls,
      };

      const lines = getOverBreakCommentary(
        matchCommentators[0].name, matchCommentators[1].name,
        isBatting, playerName, opponentName, stats
      );

      setOverBreakData({ stats, lines });
      setShowOverBreak(true);

      // Speak key moment lines
      if (voiceEnabled && commentaryEnabled) {
        const keyLines = lines.filter(l => l.isKeyMoment).map(l => ({
          text: l.text,
          voiceId: (matchCommentators.find(c => c.name === l.commentatorId || c.id === l.commentatorId) || matchCommentators[0]).voiceId,
        }));
        speakDuoLines(keyLines);
      }
    }
  }, [ballHistory.length]);

  // Innings change commentary
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev !== phase && phase !== "not_started" && phase !== "finished") {
      if (commentaryEnabled) {
        const text = getInningsChangeCommentary(gameStateForScoreboard as any);
        const lines: CommentaryLine[] = [
          { commentatorId: matchCommentators[0].name, text, isKeyMoment: true },
        ];
        setCommentary(lines);
        if (voiceEnabled) speakCommentary(text, true);
        setTimeout(() => setCommentary(null), 3000);
      }
      if (crowdEnabled) CrowdSFX.ambientMurmur(2);
      if (soundEnabled) SFX.gameStart();
    }
  }, [phase]);

  // Ball result effects with duo commentary
  useEffect(() => {
    if (!lastResult) return;
    const r = lastResult;
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") {
      setTimeout(() => { if (soundEnabled) SFX.out(); if (hapticsEnabled) Haptics.out(); }, 150);
    } else if (typeof r.runs === "number") {
      const absRuns = Math.abs(r.runs);
      if (absRuns === 6) { setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); }, 100); }
      else if (absRuns === 4) { setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); }, 100); }
      else if (absRuns === 0) { if (soundEnabled) SFX.defence(); if (hapticsEnabled) Haptics.light(); }
      else { if (soundEnabled) SFX.runs(absRuns); if (hapticsEnabled) Haptics.light(); }
    }
    if (crowdEnabled) playCrowdForResult(r.runs, isBatting, false);

    if (commentaryEnabled) {
      const duoLines = getDuoCommentary(
        matchCommentators[0].name, matchCommentators[1].name,
        r.runs, isBatting, playerName, opponentName
      );
      setCommentary(duoLines);

      // Only speak key moments via TTS (sixes, fours, wickets)
      const keyLines = duoLines.filter(l => l.isKeyMoment);
      if (voiceEnabled && keyLines.length > 0) {
        const ttsLines = keyLines.map(l => ({
          text: l.text,
          voiceId: (matchCommentators.find(c => c.name === l.commentatorId || c.id === l.commentatorId) || matchCommentators[0]).voiceId,
        }));
        speakDuoLines(ttsLines);
      }

      setTimeout(() => setCommentary(null), 3500);
    }
  }, [lastResult]);

  const handleMove = (move: Move) => {
    if (effectiveCooldown || phase === "not_started" || phase === "finished") return;
    if (waitingForOpponent) return;
    if (soundEnabled) SFX.tap();
    if (hapticsEnabled) Haptics.light();
    setLastPlayed(move);
    onMove(move);
    if (cooldownOverride === undefined) {
      setCooldown(true);
      setTimeout(() => setCooldown(false), 800);
    }
    const moveData = MOVES_CONFIG.find(m => m.move === move);
    if (moveData) {
      setShowExplosion({ emoji: moveData.emoji, key: Date.now() });
      setTimeout(() => setShowExplosion(null), 800);
    }
  };

  const handleOverBreakContinue = useCallback(() => {
    setShowOverBreak(false);
    setOverBreakData(null);
  }, []);

  return (
    <>
      <CelebrationEffects lastResult={lastResult} gameResult={result} phase={phase} />

      {/* Cricket ground background */}
      {phase !== "not_started" && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img src={cricketGround} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 stadium-ground-overlay" />
          <div className="absolute inset-0 floodlight-glow" />
          <div className="absolute inset-0 boundary-glow" />
        </div>
      )}

      {/* Over break screen */}
      <AnimatePresence>
        {showOverBreak && overBreakData && (
          <OverBreakScreen
            stats={overBreakData.stats}
            commentaryLines={overBreakData.lines}
            commentators={matchCommentators}
            onContinue={handleOverBreakContinue}
          />
        )}
      </AnimatePresence>

      {/* Commentator badges */}
      {phase !== "not_started" && phase !== "finished" && (
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
      )}

      {/* Scoreboard */}
      {phase !== "not_started" && (
        <ScoreBoard
          game={gameStateForScoreboard as any}
          playerName={playerName}
          aiName={opponentName}
          aiEmoji={opponentEmoji}
          isPvP={isPvP}
        />
      )}

      {/* Duo Commentary bar */}
      <AnimatePresence>
        {commentary && commentary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="glass-card rounded-lg px-2 py-1.5 space-y-1"
          >
            {commentary.map((line, i) => {
              const comm = matchCommentators.find(c => c.name === line.commentatorId || c.id === line.commentatorId) || matchCommentators[0];
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[8px] flex-shrink-0">{comm.avatar}</span>
                  <div>
                    <span className={`text-[6px] font-display font-bold tracking-wider ${
                      comm.id === matchCommentators[0].id ? "text-primary" : "text-accent"
                    }`}>{comm.name}</span>
                    <p className="font-display text-[8px] font-bold text-foreground tracking-wider line-clamp-2">
                      {line.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last result — compact inline with both moves shown */}
      <AnimatePresence mode="wait">
        {lastResult && phase !== "not_started" && phase !== "finished" && !waitingForOpponent && (
          <motion.div
            key={lastResult.description}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-premium rounded-lg p-2 relative overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className={`absolute inset-0 ${lastResult.runs === "OUT" ? "bg-out-red/15" : "bg-primary/10"}`}
            />
            <div className="flex items-center justify-center gap-4 relative z-10">
              <div className="text-center">
                <p className="text-[6px] text-muted-foreground font-bold tracking-[0.2em] mb-0.5">{playerName.toUpperCase().slice(0, 8)}</p>
                <motion.div
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto"
                >
                  <span className="text-lg">{MOVES_CONFIG.find((m) => m.move === lastResult?.userMove)?.emoji || "❓"}</span>
                </motion.div>
                <p className="text-[8px] font-display font-bold text-primary mt-0.5 tracking-wider">
                  {lastResult.userMove === "DEF" ? "DEF" : lastResult.userMove}
                </p>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.15 }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-black text-[10px] ${
                  lastResult.runs === "OUT"
                    ? "bg-gradient-to-br from-out-red/20 to-out-red/10 border-2 border-out-red/30 text-out-red"
                    : "bg-gradient-to-br from-neon-green/20 to-neon-green/10 border-2 border-neon-green/30 text-neon-green"
                }`}
                style={{ textShadow: "0 0 15px currentColor" }}
              >
                {lastResult.runs === "OUT" ? "OUT" : `+${lastResult.runs}`}
              </motion.div>
              <div className="text-center">
                <p className="text-[6px] text-muted-foreground font-bold tracking-[0.2em] mb-0.5">{opponentName.toUpperCase()}</p>
                <motion.div
                  initial={{ rotateY: -90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto"
                >
                  <span className="text-lg">{MOVES_CONFIG.find((m) => m.move === lastResult?.aiMove)?.emoji || opponentEmoji}</span>
                </motion.div>
                <p className="text-[8px] font-display font-bold text-accent mt-0.5 tracking-wider">
                  {lastResult.aiMove === "DEF" ? "DEF" : lastResult.aiMove}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PvP extra content slot */}
      {extraContent}

      {/* Spacer */}
      <div className="flex-1 min-h-0" />

      {/* Tap buttons grid */}
      {phase !== "not_started" && phase !== "finished" && !waitingForOpponent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <AnimatePresence>
            {showExplosion && (
              <motion.div
                key={showExplosion.key}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <span className="text-5xl">{showExplosion.emoji}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-[7px] text-muted-foreground font-display mb-1 tracking-[0.2em]">
            {isBatting ? "⚡ TAP YOUR SHOT" : "🎯 TAP YOUR BOWL"}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {MOVES_CONFIG.map((m) => (
              <motion.button
                key={m.label}
                whileTap={{ scale: 0.8 }}
                onClick={() => handleMove(m.move)}
                disabled={effectiveCooldown}
                className={`relative py-2.5 rounded-xl font-display font-bold text-sm flex flex-col items-center gap-0.5 transition-all border backdrop-blur-sm ${
                  effectiveCooldown
                    ? "opacity-30 cursor-not-allowed border-transparent bg-muted/20"
                    : lastPlayed === m.move
                    ? `bg-gradient-to-br ${m.color} text-foreground ${m.glow} border-primary/40`
                    : `bg-gradient-to-br ${m.color} text-foreground ${m.glow}`
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[7px] tracking-wider">{m.label}</span>
                {effectiveCooldown && lastPlayed === m.move && (
                  <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 0.8, ease: "linear" }}
                    className="absolute bottom-0.5 left-2 right-2 h-0.5 bg-primary rounded-full origin-left"
                  />
                )}
              </motion.button>
            ))}
          </div>
          {!isPvP && (
            <button onClick={onReset}
              className="text-[8px] text-muted-foreground/40 underline self-center mt-1 active:scale-95 font-display tracking-wider w-full text-center">
              Reset Match
            </button>
          )}
        </motion.div>
      )}

      {/* Waiting for opponent (PvP) */}
      {isPvP && waitingForOpponent && phase !== "finished" && phase !== "not_started" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-score p-3 text-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <span className="text-2xl block mb-1">⏳</span>
          </motion.div>
          <p className="font-display text-[10px] font-bold text-muted-foreground tracking-wider">
            WAITING FOR {opponentName.toUpperCase()}...
          </p>
        </motion.div>
      )}

      {/* Game over */}
      {phase === "finished" && (
        <div className="mt-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="glass-card rounded-xl px-3 py-2 text-center">
              <p className="font-display text-[10px] font-bold text-foreground tracking-wider">
                {result === "win" ? `🏆 ${playerName.toUpperCase()} WINS!` : result === "loss" ? `${opponentName} wins!` : "🤝 A TIE!"}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={onReset}
                className="flex-1 py-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl tracking-wider shadow-[0_0_20px_hsl(217_91%_60%/0.2)] border border-primary/30 text-sm">
                {isPvP ? "🔄 REMATCH" : "⚡ NEW MATCH"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                className="flex-1 py-3 glass-premium text-foreground font-display font-bold rounded-2xl tracking-wider border border-primary/10 text-sm">
                HOME
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
