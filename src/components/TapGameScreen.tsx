import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useHandCricket, type Move } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { playCrowdForResult } from "@/lib/voiceCommentary";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RulesSheet from "./RulesSheet";
import OddEvenToss from "./OddEvenToss";
import { PreMatchCeremony, PostMatchCeremony } from "./MatchCeremony";
import TapPlayingUI from "./TapPlayingUI";

const AI_NAME = "Rohit AI";
const AI_EMOJI = "🏏";

interface TapGameScreenProps {
  onHome: () => void;
}

export default function TapGameScreen({ onHome }: TapGameScreenProps) {
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const { soundEnabled, hapticsEnabled, crowdEnabled } = useSettings();
  const { user } = useAuth();
  const savedRef = useRef(false);

  // Ceremony states
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [tossInfo, setTossInfo] = useState<{ winner: string; battingFirst: string } | null>(null);
  const [pendingBatFirst, setPendingBatFirst] = useState<boolean | null>(null);
  const postMatchShownRef = useRef(false);

  const [playerName, setPlayerName] = useState("You");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setPlayerName(data.display_name); });
  }, [user]);

  const handleTossComplete = useCallback((tossWinner: string, battingFirst: string) => {
    setTossInfo({ winner: tossWinner, battingFirst });
  }, []);

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "tap");
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); if (crowdEnabled) playCrowdForResult(0, true, true, "win"); }
      else if (game.result === "loss") { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); if (crowdEnabled) playCrowdForResult(0, true, true, "loss"); }
      if (!postMatchShownRef.current) {
        postMatchShownRef.current = true;
        setTimeout(() => setShowPostMatch(true), game.result === "win" ? 2500 : 1000);
      }
    }
  }, [game.phase, game, saveMatch]);

  const handleStart = (batFirst: boolean) => {
    setPendingBatFirst(batFirst);
    setTimeout(() => setShowPreMatch(true), 500);
  };

  const handlePreMatchComplete = () => {
    setShowPreMatch(false);
    if (pendingBatFirst !== null) {
      if (soundEnabled) SFX.gameStart();
      if (hapticsEnabled) Haptics.medium();
      startGame(pendingBatFirst);
    }
  };

  const handleStartNew = () => {
    resetGame();
    savedRef.current = false;
    setPendingBatFirst(null);
    setTossInfo(null);
    setShowPreMatch(false);
    setShowPostMatch(false);
    postMatchShownRef.current = false;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 stadium-gradient" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_at_center,hsl(142_71%_45%/0.12),hsl(142_71%_45%/0.04)_55%,transparent_70%)]" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-32 w-16 h-40 bg-[linear-gradient(to_bottom,hsl(45_30%_60%/0.06),hsl(45_30%_60%/0.12),hsl(45_30%_60%/0.06))] rounded-sm" />
        <div className="absolute inset-x-0 bottom-28 h-px bg-white/10 shadow-[0_0_16px_hsl(0_0%_100%/0.15)]" />
        <div className="absolute top-0 left-[15%] w-24 h-32 bg-[radial-gradient(circle,hsl(45_93%_70%/0.04),transparent_70%)]" />
        <div className="absolute top-0 right-[15%] w-24 h-32 bg-[radial-gradient(circle,hsl(45_93%_70%/0.04),transparent_70%)]" />
      </div>

      {/* Pre-match ceremony */}
      {showPreMatch && tossInfo && (
        <PreMatchCeremony
          playerName={playerName}
          opponentName={AI_NAME}
          tossWinner={tossInfo.winner}
          battingFirst={tossInfo.battingFirst}
          onComplete={handlePreMatchComplete}
        />
      )}

      {/* Post-match ceremony */}
      {showPostMatch && game.result && (
        <PostMatchCeremony
          playerName={playerName}
          opponentName={AI_NAME}
          result={game.result}
          playerScore={game.userScore}
          opponentScore={game.aiScore}
          ballHistory={game.ballHistory}
          onComplete={() => setShowPostMatch(false)}
        />
      )}

      {/* Top ambient glow */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.06) 0%, transparent 70%)" }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onHome}
          className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm active:scale-95 transition-transform"
        >
          ←
        </motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-accent font-bold">TAP MODE</span>
        </div>
        <RulesSheet />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col px-4 pb-3 max-w-lg mx-auto w-full overflow-hidden">
        {/* Toss */}
        {game.phase === "not_started" && !showPreMatch && (
          <div className="mt-4">
            <OddEvenToss
              onResult={handleStart}
              onTossComplete={handleTossComplete}
              playerName={playerName}
              opponentName={AI_NAME}
            />
          </div>
        )}

        {/* Shared playing UI */}
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
          playerName={playerName}
          opponentName={AI_NAME}
          opponentEmoji={AI_EMOJI}
          onMove={playBall}
          onReset={handleStartNew}
          onHome={onHome}
          modeLabel="TAP MODE"
        />
      </div>
    </div>
  );
}
