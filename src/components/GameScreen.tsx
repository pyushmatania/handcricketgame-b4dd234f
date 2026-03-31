import { useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import CameraFeed, { type CameraFeedHandle } from "./CameraFeed";
import ScoreBoard from "./ScoreBoard";
import GestureDisplay from "./GestureDisplay";
import RulesSheet from "./RulesSheet";
import { useHandCricket } from "@/hooks/useHandCricket";
import { useHandDetection } from "@/hooks/useHandDetection";

interface GameScreenProps {
  onHome: () => void;
}

export default function GameScreen({ onHome }: GameScreenProps) {
  const cameraRef = useRef<CameraFeedHandle>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const detection = useHandDetection(videoElementRef);
  const [tossChoice, setTossChoice] = useState<null | boolean>(null);
  const [stadiumMode, setStadiumMode] = useState(true);

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement) => {
      videoElementRef.current = video;
      detection.startDetection();
    },
    [detection]
  );

  const handleCapture = useCallback(() => {
    if (detection.lockedMove) {
      playBall(detection.lockedMove);
      detection.unlockMove();
    } else {
      detection.lockMove();
    }
  }, [detection, playBall]);

  const canCapture =
    game.phase !== "not_started" &&
    game.phase !== "finished" &&
    (detection.status === "stable" || detection.lockedMove !== null);

  const handleStartNew = () => {
    resetGame();
    detection.unlockMove();
    setTossChoice(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Stadium base gradient */}
      {stadiumMode && (
        <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      )}

      {/* Top floodlight glows */}
      {stadiumMode && (
        <>
          <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(45 100% 85% / 0.07) 0%, transparent 70%)" }} />
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(45 100% 85% / 0.07) 0%, transparent 70%)" }} />
        </>
      )}

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-1">
        <button onClick={onHome} className="text-muted-foreground hover:text-foreground text-sm font-bold active:scale-95 transition-transform">
          ← Back
        </button>
        <h1 className="font-display text-[10px] tracking-[0.2em] text-primary font-bold">HAND CRICKET AR</h1>
        <div className="flex items-center gap-1.5">
          {/* Stadium mode toggle */}
          <button
            onClick={() => setStadiumMode(!stadiumMode)}
            className={`px-2 py-1 rounded text-[8px] font-display font-bold tracking-wider transition-all ${
              stadiumMode
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted text-muted-foreground border border-glass"
            }`}
          >
            🏟️ {stadiumMode ? "ON" : "OFF"}
          </button>
          <RulesSheet />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col gap-2 px-3 pb-3 max-w-lg mx-auto w-full">
        {/* Camera */}
        <CameraFeed ref={cameraRef} onVideoReady={handleVideoReady} stadiumMode={stadiumMode} />

        {/* Toss / Start */}
        {game.phase === "not_started" && tossChoice === null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-premium p-4 text-center space-y-3"
          >
            <p className="font-display text-xs font-bold text-foreground tracking-wider">⚡ CHOOSE YOUR INNINGS</p>
            <p className="text-[10px] text-muted-foreground">Win the toss. Pick your strategy.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setTossChoice(true); startGame(true); }}
                className="flex-1 py-3 bg-primary text-primary-foreground font-display font-bold rounded-xl text-sm glow-primary active:scale-95 transition-transform"
              >
                🏏 BAT FIRST
              </button>
              <button
                onClick={() => { setTossChoice(false); startGame(false); }}
                className="flex-1 py-3 bg-accent text-accent-foreground font-display font-bold rounded-xl text-sm glow-accent active:scale-95 transition-transform"
              >
                🎯 BOWL FIRST
              </button>
            </div>
          </motion.div>
        )}

        {/* Scoreboard HUD */}
        {game.phase !== "not_started" && <ScoreBoard game={game} />}

        {/* Gesture area */}
        {game.phase !== "not_started" && (
          <GestureDisplay
            status={detection.status}
            detectedMove={detection.detectedMove}
            lockedMove={detection.lockedMove}
            confidence={detection.confidence}
            lastResult={game.lastResult}
            onCapture={handleCapture}
            canCapture={canCapture}
            isBatting={game.isBatting}
            hint={detection.hint}
            handDetected={detection.handDetected}
            debugInfo={detection.debugInfo}
          />
        )}

        {/* Game over actions */}
        {game.phase === "finished" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <button
              onClick={handleStartNew}
              className="flex-1 py-3 bg-primary text-primary-foreground font-display font-bold rounded-xl glow-primary active:scale-95 transition-transform"
            >
              NEW MATCH
            </button>
            <button
              onClick={onHome}
              className="flex-1 py-3 bg-muted text-foreground font-display font-bold rounded-xl active:scale-95 transition-transform"
            >
              HOME
            </button>
          </motion.div>
        )}

        {/* Reset mid-game */}
        {game.phase !== "not_started" && game.phase !== "finished" && (
          <button
            onClick={handleStartNew}
            className="text-xs text-muted-foreground underline self-center mt-1 active:scale-95"
          >
            Reset Match
          </button>
        )}
      </div>
    </div>
  );
}
