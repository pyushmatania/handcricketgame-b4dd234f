import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Move, BallResult, GameResult, InningsPhase, MatchConfig } from "@/hooks/useHandCricket";
import { SFX, Haptics } from "@/lib/sounds";
import { startAmbientStadium, stopAmbientStadium, setAmbientVolume, crowdRoar, crowdGaspMute } from "@/lib/ambientStadium";
import { getCommentary, getInningsChangeCommentary } from "@/lib/commentary";
import { speakCommentary, playCrowdForResult, CrowdSFX, speakDuoCommentary } from "@/lib/voiceCommentary";
import { isElevenLabsAvailable } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import { pickMatchCommentators, getDuoCommentary, getOverBreakCommentary, type Commentator, type CommentaryLine } from "@/lib/commentaryDuo";
import { pickConfiguredMatchCommentators } from "@/lib/commentaryDuo";
import ScoreBoard from "./ScoreBoard";
import CelebrationEffects from "./CelebrationEffects";
import ShotResultOverlay from "./ShotResultOverlay";
import OverBreakScreen from "./OverBreakScreen";
import WicketBreakdownCard, { type WicketBreakdownData } from "./WicketBreakdownCard";
import pitch3d from "@/assets/pitch-3d.jpg";
import GameButton from "./shared/GameButton";

/* ── Move button config ── */
const MOVES: { move: Move; label: string; emoji: string; color: string; border: string; glow: string }[] = [
  { move: "DEF", label: "DEF", emoji: "✊", color: "from-[hsl(210_10%_40%)] to-[hsl(210_10%_30%)]", border: "border-[hsl(210_10%_22%)]", glow: "" },
  { move: 1, label: "1", emoji: "☝️", color: "from-[hsl(200_70%_45%)] to-[hsl(200_70%_35%)]", border: "border-[hsl(200_70%_28%)]", glow: "shadow-[0_0_12px_hsl(200_70%_45%/0.3)]" },
  { move: 2, label: "2", emoji: "✌️", color: "from-game-green to-[hsl(122_39%_38%)]", border: "border-[hsl(122_39%_28%)]", glow: "shadow-[0_0_12px_hsl(122_39%_49%/0.3)]" },
  { move: 3, label: "3", emoji: "🤟", color: "from-game-gold to-[hsl(43_96%_42%)]", border: "border-[hsl(43_96%_32%)]", glow: "shadow-[0_0_12px_hsl(43_96%_56%/0.3)]" },
  { move: 4, label: "4", emoji: "🖖", color: "from-[hsl(25_90%_55%)] to-[hsl(25_90%_42%)]", border: "border-[hsl(25_90%_32%)]", glow: "shadow-[0_0_14px_hsl(25_90%_55%/0.35)]" },
  { move: 6, label: "6", emoji: "👍", color: "from-[hsl(280_70%_55%)] to-[hsl(280_70%_42%)]", border: "border-[hsl(280_70%_32%)]", glow: "shadow-[0_0_16px_hsl(280_70%_55%/0.4)]" },
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
  commentators?: [Commentator, Commentator];
}

export default function TapPlayingUI({
  phase, userScore, aiScore, userWickets, aiWickets, target,
  currentInnings, isBatting, lastResult, result, ballHistory,
  playerName, opponentName, opponentEmoji = "🏏",
  onMove, onReset, onHome,
  isPvP = false, waitingForOpponent = false, cooldownOverride,
  extraContent, modeLabel = "TAP MODE", matchConfig, innings1Balls, commentators,
}: TapPlayingUIProps) {
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled, commentaryVoice, voiceEngine, commentaryLanguage, musicEnabled, ambientVolume } = useSettings();

  // Ambient stadium music
  useEffect(() => {
    if (soundEnabled && musicEnabled && !result) {
      startAmbientStadium(ambientVolume);
    } else {
      stopAmbientStadium();
    }
    return () => { stopAmbientStadium(); };
  }, [soundEnabled, musicEnabled, result]);

  useEffect(() => {
    if (soundEnabled && musicEnabled) setAmbientVolume(ambientVolume);
  }, [ambientVolume, soundEnabled, musicEnabled]);

  const [lastPlayed, setLastPlayed] = useState<Move | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryLine[] | null>(null);
  const [showOverBreak, setShowOverBreak] = useState(false);
  const [overBreakData, setOverBreakData] = useState<any>(null);
  const [showWicketBreakdown, setShowWicketBreakdown] = useState(false);
  const [wicketBreakdownData, setWicketBreakdownData] = useState<WicketBreakdownData | null>(null);
  const [floodlightFlicker, setFloodlightFlicker] = useState(false);
  const [shotOverlayKey, setShotOverlayKey] = useState(0);
  const prevPhaseRef = useRef(phase);
  const prevBallCountRef = useRef(0);
  const prevWicketsRef = useRef({ user: 0, ai: 0 });
  const partnershipStartRef = useRef({ score: 0, balls: 0 });

  const [matchCommentators] = useState<[Commentator, Commentator]>(() =>
    commentators || pickConfiguredMatchCommentators(commentaryVoice)
  );

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

  // Over completion check
  useEffect(() => {
    if (!config.overs || phase === "not_started" || phase === "finished") return;
    const totalBalls = currentBalls;
    const prevBalls = prevBallCountRef.current;
    prevBallCountRef.current = totalBalls;

    if (totalBalls > 0 && totalBalls % 6 === 0 && totalBalls !== prevBalls && totalBalls > prevBalls) {
      const oversCompleted = Math.floor(totalBalls / 6);
      if (config.overs && oversCompleted >= config.overs) return;

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

      const overBreakMerge = { overRuns, thisOverBalls, crr, rrr, oversCompleted, totalOvers: config.overs };

      if (lastResult && lastResult.runs === "OUT") {
        setWicketBreakdownData(prev => prev ? { ...prev, overBreakStats: overBreakMerge } : prev);
        return;
      }

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

      if (voiceEnabled && commentaryEnabled) {
        speakDuoCommentary(lines, matchCommentators, voiceEngine);
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
        if (voiceEnabled) speakCommentary(text, true, voiceEngine);
        setTimeout(() => setCommentary(null), 3000);
      }
      if (crowdEnabled) CrowdSFX.ambientMurmur(2);
      if (soundEnabled) SFX.gameStart();
    }
  }, [phase]);

  // Wicket breakdown card
  useEffect(() => {
    if (!lastResult || lastResult.runs !== "OUT") return;
    if (phase === "not_started") return;

    const currentBallsTotal = ballHistory.length;
    const inningsBalls = currentInnings === 1 ? (innings1Balls ?? currentBallsTotal) : currentBallsTotal - (innings1Balls ?? 0);
    const partStart = partnershipStartRef.current;
    const currentScore = isBatting ? userScore : aiScore;
    const pRuns = currentScore - partStart.score;
    const pBalls = inningsBalls - partStart.balls;

    const recentBalls = ballHistory.slice(partStart.balls);
    let fours = 0, sixes = 0, batsmanRuns = 0;
    for (const b of recentBalls) {
      if (typeof b.runs === "number") {
        const absR = Math.abs(b.runs);
        if (isBatting && b.runs > 0) { batsmanRuns += b.runs; if (absR === 4) fours++; if (absR === 6) sixes++; }
        if (!isBatting && b.runs < 0) { batsmanRuns += absR; if (absR === 4) fours++; if (absR === 6) sixes++; }
      }
    }

    const totalWickets = isBatting ? userWickets : aiWickets;
    const oversStr = `${Math.floor(inningsBalls / 6)}.${inningsBalls % 6}`;
    const isInningsChange = phase === "second_batting" || phase === "second_bowling";

    const breakdownData: WicketBreakdownData = {
      type: isInningsChange ? "innings_change" : "wicket",
      batsmanName: isBatting ? playerName : opponentName,
      batsmanRuns,
      batsmanBalls: pBalls,
      batsmanFours: fours,
      batsmanSixes: sixes,
      partnershipRuns: pRuns,
      partnershipBalls: pBalls,
      bowlerName: isBatting ? opponentName : playerName,
      bowlerWickets: totalWickets,
      bowlerRunsConceded: isBatting ? userScore : (typeof lastResult.runs === "number" ? Math.abs(lastResult.runs) : 0),
      bowlerOvers: oversStr,
      totalScore: isBatting ? userScore : aiScore,
      totalWickets,
      currentOver: oversStr,
      target,
      isInningsChange,
      newTarget: isInningsChange ? target : undefined,
      dismissalType: lastResult.description,
    };

    partnershipStartRef.current = { score: currentScore, balls: inningsBalls };
    setFloodlightFlicker(true);
    setTimeout(() => setFloodlightFlicker(false), 2000);

    if (phase !== "finished") {
      setWicketBreakdownData(breakdownData);
      setShowWicketBreakdown(true);
    }
  }, [lastResult?.runs === "OUT" ? ballHistory.length : null]);

  // Ball result SFX + commentary + shot overlay
  useEffect(() => {
    if (!lastResult) return;
    const r = lastResult;
    setShotOverlayKey(Date.now());
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") {
      setTimeout(() => {
        if (soundEnabled) SFX.out();
        if (hapticsEnabled) Haptics.out();
        crowdGaspMute();
      }, 150);
    } else if (typeof r.runs === "number") {
      const absRuns = Math.abs(r.runs);
      if (absRuns === 6) { setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); crowdRoar("six"); }, 100); }
      else if (absRuns === 4) { setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); crowdRoar("four"); }, 100); }
      else if (absRuns === 0) { if (soundEnabled) SFX.defence(); if (hapticsEnabled) Haptics.light(); }
      else { if (soundEnabled) SFX.runs(absRuns); if (hapticsEnabled) Haptics.light(); }
    }
    if (crowdEnabled) playCrowdForResult(r.runs, isBatting, false);

    if (commentaryEnabled) {
      const duoLines = getDuoCommentary(
        matchCommentators[0].name, matchCommentators[1].name,
        r.runs, isBatting, playerName, opponentName,
        undefined, commentaryLanguage
      );
      setCommentary(duoLines);
      if (voiceEnabled) {
        if (duoLines.some(l => l.isKeyMoment)) {
          speakDuoCommentary(duoLines, matchCommentators, voiceEngine);
        } else if (duoLines[0]) {
          speakCommentary(duoLines[0].text, true, voiceEngine);
        }
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
  };

  const handleOverBreakContinue = useCallback(() => {
    setShowOverBreak(false);
    setOverBreakData(null);
  }, []);

  const handleWicketBreakdownContinue = useCallback(() => {
    setShowWicketBreakdown(false);
    setWicketBreakdownData(null);
  }, []);

  // Filter moves for noDefence mode
  const activeMoves = config.noDefence ? MOVES.filter(m => m.move !== "DEF") : MOVES;

  return (
    <>
      <CelebrationEffects lastResult={lastResult} gameResult={result} phase={phase} />
      <ShotResultOverlay lastResult={lastResult} triggerKey={shotOverlayKey} />

      {/* 3D Cricket pitch background */}
      {phase !== "not_started" && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img src={pitch3d} alt="" className="w-full h-full object-cover opacity-20" style={{ objectPosition: "center 40%" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_25%_8%/0.7)] via-[hsl(220_25%_8%/0.4)] to-[hsl(220_25%_8%/0.85)]" />
        </div>
      )}

      {/* Floodlight flicker */}
      <AnimatePresence>
        {floodlightFlicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.05, 0.25, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8 }}
            className="fixed inset-0 z-[5] pointer-events-none"
          >
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, hsl(43 96% 56% / 0.4) 0%, transparent 70%)", filter: "blur(20px)" }} />
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, hsl(43 96% 56% / 0.35) 0%, transparent 70%)", filter: "blur(20px)" }} />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Wicket breakdown */}
      <AnimatePresence>
        {showWicketBreakdown && wicketBreakdownData && (
          <WicketBreakdownCard
            data={wicketBreakdownData}
            onContinue={handleWicketBreakdownContinue}
          />
        )}
      </AnimatePresence>

      {/* Commentator badges */}
      {phase !== "not_started" && phase !== "finished" && (
        <div className="flex items-center justify-center gap-2 mb-1">
          {matchCommentators.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-game-display font-bold tracking-wider ${
              i === 0 ? "bg-game-green/10 text-game-green border border-game-green/15" : "bg-game-gold/10 text-game-gold border border-game-gold/15"
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

      {/* Commentary strip */}
      <AnimatePresence>
        {commentary && commentary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="rounded-xl px-3 py-2 space-y-1 bg-[hsl(220_20%_14%/0.9)] border border-game-gold/15 backdrop-blur-md"
          >
            {commentary.map((line, i) => {
              const comm = matchCommentators.find(c => c.name === line.commentatorId || c.id === line.commentatorId) || matchCommentators[0];
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[9px] flex-shrink-0">{comm.avatar}</span>
                  <div>
                    <span className={`text-[6px] font-game-display font-bold tracking-wider ${
                      comm.id === matchCommentators[0].id ? "text-game-green" : "text-game-gold"
                    }`}>{comm.name}</span>
                    <p className="font-game-body text-[9px] font-bold text-white/90 tracking-wide line-clamp-2">
                      {line.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last result — moves comparison */}
      <AnimatePresence mode="wait">
        {lastResult && phase !== "not_started" && phase !== "finished" && (
          <motion.div
            key={lastResult.description}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl p-2.5 relative overflow-hidden bg-[hsl(220_20%_14%/0.8)] border border-white/10"
          >
            <div className="flex items-center justify-center gap-4 relative z-10">
              <div className="text-center">
                <p className="text-[6px] text-white/50 font-game-display font-bold tracking-[0.2em] mb-0.5">{playerName.toUpperCase().slice(0, 8)}</p>
                <motion.div initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-green/20 to-game-green/5 border border-game-green/25 flex items-center justify-center mx-auto">
                  <span className="text-xl">{MOVES.find(m => m.move === lastResult?.userMove)?.emoji || "❓"}</span>
                </motion.div>
                <p className="text-[8px] font-game-display font-bold text-game-green mt-0.5">{lastResult.userMove === "DEF" ? "DEF" : lastResult.userMove}</p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.15 }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-game-display font-black text-sm border-b-2 ${
                  lastResult.runs === "OUT"
                    ? "bg-gradient-to-b from-game-red/30 to-game-red/10 border-game-red/40 text-game-red"
                    : "bg-gradient-to-b from-game-green/30 to-game-green/10 border-game-green/40 text-game-green"
                }`}
                style={{ textShadow: "0 0 15px currentColor" }}
              >
                {lastResult.runs === "OUT" ? "OUT" : `+${lastResult.runs}`}
              </motion.div>

              <div className="text-center">
                <p className="text-[6px] text-white/50 font-game-display font-bold tracking-[0.2em] mb-0.5">{opponentName.toUpperCase().slice(0, 8)}</p>
                <motion.div initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ delay: 0.1 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-gold/15 to-game-gold/5 border border-game-gold/20 flex items-center justify-center mx-auto">
                  <span className="text-xl">{MOVES.find(m => m.move === lastResult?.aiMove)?.emoji || opponentEmoji}</span>
                </motion.div>
                <p className="text-[8px] font-game-display font-bold text-game-gold mt-0.5">{lastResult.aiMove === "DEF" ? "DEF" : lastResult.aiMove}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {extraContent}
      <div className="flex-1 min-h-0" />

      {/* ── Color-coded Move Buttons ── */}
      {phase !== "not_started" && phase !== "finished" && !waitingForOpponent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative pb-1">
          <p className="text-center text-[7px] text-white/40 font-game-display mb-1.5 tracking-[0.2em]">
            {isBatting ? "⚡ TAP YOUR SHOT" : "🎯 TAP YOUR BOWL"}
          </p>
          <div className={`grid gap-2 ${activeMoves.length === 5 ? "grid-cols-5" : "grid-cols-3"}`}>
            {activeMoves.map((m) => (
              <motion.button
                key={m.label}
                whileTap={{ scale: 0.85, y: 2 }}
                onClick={() => handleMove(m.move)}
                disabled={effectiveCooldown}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 rounded-2xl font-game-display font-black text-white border-b-4 transition-all active:border-b-2 active:translate-y-[2px] ${
                  effectiveCooldown
                    ? "opacity-30 cursor-not-allowed bg-white/5 border-transparent"
                    : `bg-gradient-to-b ${m.color} ${m.border} ${m.glow}`
                }`}
              >
                <span className="text-xl leading-none">{m.emoji}</span>
                <span className="text-[10px] tracking-wider">{m.label}</span>
                {effectiveCooldown && lastPlayed === m.move && (
                  <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: 0.8, ease: "linear" }}
                    className="absolute bottom-1 left-2 right-2 h-0.5 bg-white/50 rounded-full origin-left"
                  />
                )}
              </motion.button>
            ))}
          </div>
          {!isPvP && (
            <button onClick={onReset}
              className="text-[8px] text-white/25 underline mt-1.5 active:scale-95 font-game-body tracking-wider w-full text-center">
              Reset Match
            </button>
          )}
        </motion.div>
      )}

      {/* Waiting for opponent (PvP) */}
      {isPvP && waitingForOpponent && phase !== "finished" && phase !== "not_started" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 text-center rounded-2xl bg-[hsl(220_20%_14%/0.8)] border border-white/10">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <span className="text-2xl block mb-1">⏳</span>
          </motion.div>
          <p className="font-game-display text-[10px] font-bold text-white/60 tracking-wider">
            WAITING FOR {opponentName.toUpperCase()}...
          </p>
        </motion.div>
      )}

      {/* Game over */}
      {phase === "finished" && (
        <div className="mt-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="rounded-2xl px-3 py-2 text-center bg-[hsl(220_20%_14%/0.8)] border border-white/10">
              <p className="font-game-display text-sm font-bold text-white tracking-wider">
                {result === "win" ? `🏆 ${playerName.toUpperCase()} WINS!` : result === "loss" ? `${opponentName} wins!` : "🤝 A TIE!"}
              </p>
            </div>
            <div className="flex gap-2">
              <GameButton variant="primary" size="lg" bounce onClick={onReset} className="flex-1">
                {isPvP ? "🔄 REMATCH" : "⚡ NEW MATCH"}
              </GameButton>
              <GameButton variant="secondary" size="lg" bounce onClick={onHome} className="flex-1">
                HOME
              </GameButton>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
