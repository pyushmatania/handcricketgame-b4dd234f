import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useHandCricket, type Move, type MatchConfig } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { useSettings } from "@/contexts/SettingsContext";
import { playCrowdForResult } from "@/lib/voiceCommentary";
import { pickConfiguredMatchCommentators, type Commentator } from "@/lib/commentaryDuo";
import OddEvenToss from "./OddEvenToss";
import EnhancedPreMatch from "./EnhancedPreMatch";
import EnhancedPostMatch from "./EnhancedPostMatch";
import TapPlayingUI from "./TapPlayingUI";
import ScoreBoard from "./ScoreBoard";
import RulesSheet from "./RulesSheet";

interface Props { onHome: () => void; }

function getDailyTarget(): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return 25 + (seed % 51);
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const DAILY_CONFIG: MatchConfig = { overs: 5, wickets: 3 };

export default function DailyChallengeScreen({ onHome }: Props) {
  const { soundEnabled, hapticsEnabled, crowdEnabled, commentaryVoice } = useSettings();
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const [phase, setPhase] = useState<"intro" | "toss" | "playing" | "done">("intro");
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [bestToday, setBestToday] = useState<number | null>(null);
  const savedRef = useRef(false);
  const postMatchShownRef = useRef(false);

  // Ceremony states
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [tossInfo, setTossInfo] = useState<{ winner: string; battingFirst: string } | null>(null);
  const [pendingBatFirst, setPendingBatFirst] = useState<boolean | null>(null);
  const [matchCommentators] = useState<[Commentator, Commentator]>(() => pickConfiguredMatchCommentators(commentaryVoice));

  const dailyTarget = getDailyTarget();
  const todayKey = getTodayKey();

  useEffect(() => {
    const stored = localStorage.getItem(`hc_daily_${todayKey}`);
    if (stored) { setAlreadyPlayed(true); setBestToday(parseInt(stored)); }
  }, [todayKey]);

  const startChallenge = () => {
    setPhase("toss");
  };

  const handleTossComplete = (tossWinner: string, battingFirst: string) => {
    setTossInfo({ winner: tossWinner, battingFirst });
  };

  const handleTossResult = (batFirst: boolean) => {
    setPendingBatFirst(batFirst);
    setTimeout(() => setShowPreMatch(true), 500);
  };

  const handlePreMatchComplete = () => {
    setShowPreMatch(false);
    resetGame();
    savedRef.current = false;
    postMatchShownRef.current = false;
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    startGame(pendingBatFirst ?? true, DAILY_CONFIG);
    setPhase("playing");
  };

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "daily");
      localStorage.setItem(`hc_daily_${todayKey}`, String(game.userScore));
      setBestToday(game.userScore);
      setAlreadyPlayed(true);
      if (game.result === "win") {
        if (soundEnabled) SFX.win();
        if (hapticsEnabled) Haptics.success();
        if (crowdEnabled) playCrowdForResult(0, true, true, "win");
      } else if (game.result === "loss") {
        if (soundEnabled) SFX.loss();
        if (hapticsEnabled) Haptics.error();
        if (crowdEnabled) playCrowdForResult(0, true, true, "loss");
      }
      if (!postMatchShownRef.current) {
        postMatchShownRef.current = true;
        setTimeout(() => setShowPostMatch(true), game.result === "win" ? 2500 : 1000);
      }
    }
  }, [game.phase]);

  const handleStartNew = () => {
    resetGame();
    savedRef.current = false;
    postMatchShownRef.current = false;
    setPendingBatFirst(null);
    setTossInfo(null);
    setShowPreMatch(false);
    setShowPostMatch(false);
    setPhase("toss");
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

      {/* Pre-match ceremony */}
      {showPreMatch && tossInfo && (
        <EnhancedPreMatch
          playerName="You"
          opponentName="Daily AI"
          tossWinner={tossInfo.winner}
          battingFirst={tossInfo.battingFirst}
          commentators={matchCommentators}
          onComplete={handlePreMatchComplete}
        />
      )}

      {/* Post-match ceremony */}
      {showPostMatch && game.result && (
        <EnhancedPostMatch
          playerName="You"
          opponentName="Daily AI"
          result={game.result}
          playerScore={game.userScore}
          opponentScore={game.aiScore}
          playerWickets={game.userWickets}
          opponentWickets={game.aiWickets}
          ballHistory={game.ballHistory}
          commentators={matchCommentators}
          onComplete={() => setShowPostMatch(false)}
        />
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onHome} className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-secondary font-bold">DAILY CHALLENGE</span>
          <span className="text-[7px] font-display text-muted-foreground">5ov • 3w</span>
        </div>
        <RulesSheet />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full overflow-hidden">
        {/* INTRO */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.span animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl">📅</motion.span>
            <h2 className="font-display text-xl font-black text-foreground tracking-wider">TODAY'S CHALLENGE</h2>
            <div className="glass-premium rounded-2xl p-5 text-center w-full max-w-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-secondary/10 to-transparent rounded-bl-full" />
              <span className="text-[9px] text-muted-foreground font-display tracking-[0.2em] block mb-1">TARGET SCORE</span>
              <span className="font-display text-4xl font-black text-secondary" style={{ textShadow: "0 0 20px hsl(45 93% 58% / 0.3)" }}>{dailyTarget}</span>
              <p className="text-[9px] text-muted-foreground mt-2">5 overs • 3 wickets • Score {dailyTarget}+ to win</p>
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

        {/* TOSS */}
        {phase === "toss" && !showPreMatch && (
          <div className="mt-4">
            <div className="glass-premium rounded-xl p-3 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25 flex items-center justify-center text-xl">📅</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">Daily Challenge</span>
                <span className="text-[8px] text-muted-foreground block">Target: {dailyTarget} runs • 5 overs • 3 wickets</span>
              </div>
            </div>
            <OddEvenToss
              onResult={handleTossResult}
              onTossComplete={handleTossComplete}
              playerName="You"
              opponentName="Daily AI"
            />
          </div>
        )}

        {/* PLAYING — shared TapPlayingUI with all features */}
        {phase === "playing" && (
          <>
            {/* Target banner */}
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

            <TapPlayingUI
              phase={game.phase}
              userScore={game.userScore}
              aiScore={game.aiScore}
              userWickets={game.userWickets}
              aiWickets={game.aiWickets}
              target={game.target}
              currentInnings={game.currentInnings}
              isBatting={game.isBatting}
              lastResult={game.lastResult}
              result={game.result}
              ballHistory={game.ballHistory}
              playerName="You"
              opponentName="Daily AI"
              opponentEmoji="📅"
              onMove={playBall}
              onReset={handleStartNew}
              onHome={onHome}
              modeLabel="DAILY CHALLENGE"
              matchConfig={DAILY_CONFIG}
              innings1Balls={game.innings1Balls}
              commentators={matchCommentators}
            />
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
              <span className="font-display text-lg text-secondary font-black">{game.userScore}/{game.userWickets}</span>
              <span className="text-muted-foreground mx-2">vs</span>
              <span className="font-display text-lg text-accent font-black">{game.aiScore}/{game.aiWickets}</span>
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
