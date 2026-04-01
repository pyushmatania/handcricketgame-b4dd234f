import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraFeed, { type CameraFeedHandle, type CameraFilter } from "./CameraFeed";
import HandOverlay from "./HandOverlay";
import ScoreBoard from "./ScoreBoard";
import GestureDisplay from "./GestureDisplay";
import RulesSheet from "./RulesSheet";
import { useHandCricket } from "@/hooks/useHandCricket";
import { useHandDetection } from "@/hooks/useHandDetection";

interface GameScreenProps {
  onHome: () => void;
}

type GloveStyle = "cricket" | "neon" | "outline" | "off";

const FILTER_OPTIONS: { key: CameraFilter; label: string; icon: string }[] = [
  { key: "broadcast", label: "TV", icon: "📺" },
  { key: "stadium_night", label: "Night", icon: "🌙" },
  { key: "arcade", label: "Arcade", icon: "🕹️" },
  { key: "natural", label: "Raw", icon: "👁️" },
];

const GLOVE_OPTIONS: { key: GloveStyle; label: string }[] = [
  { key: "cricket", label: "🧤" },
  { key: "neon", label: "💚" },
  { key: "outline", label: "💎" },
  { key: "off", label: "✋" },
];

export default function GameScreen({ onHome }: GameScreenProps) {
  const cameraRef = useRef<CameraFeedHandle>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const detection = useHandDetection(videoElementRef);
  const [tossChoice, setTossChoice] = useState<null | boolean>(null);
  const [stadiumMode, setStadiumMode] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const [filter, setFilter] = useState<CameraFilter>("broadcast");
  const [gloveStyle, setGloveStyle] = useState<GloveStyle>("cricket");
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement) => {
      videoElementRef.current = video;
      detection.startDetection();
    },
    [detection]
  );

  useEffect(() => {
    if (game.phase !== "not_started" && game.phase !== "finished") {
      detection.setOnAutoCapture((move) => playBall(move));
    } else {
      detection.setOnAutoCapture(null);
    }
  }, [game.phase, detection.setOnAutoCapture, playBall]);

  const handleStartNew = () => {
    resetGame();
    setTossChoice(null);
  };

  const toggleImmersive = () => setImmersive(!immersive);

  const videoW = videoElementRef.current?.videoWidth || 640;
  const videoH = videoElementRef.current?.videoHeight || 480;
  const isFrontCamera = cameraRef.current?.videoRef?.current
    ? (cameraRef.current.videoRef.current.className || "").includes("scale-x-[-1]")
    : false;

  return (
    <div className={`min-h-screen bg-background flex flex-col relative overflow-hidden ${immersive ? "immersive-mode" : ""}`}>
      {stadiumMode && <div className="absolute inset-0 stadium-gradient pointer-events-none" />}
      {stadiumMode && (
        <>
          <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsla(45, 100%, 85%, 0.06) 0%, transparent 70%)" }} />
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, hsla(45, 100%, 85%, 0.06) 0%, transparent 70%)" }} />
        </>
      )}

      {/* Top bar */}
      {!immersive && (
        <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-1">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground text-sm font-bold active:scale-95 transition-transform">
            ← Back
          </button>
          <h1 className="font-display text-[9px] tracking-[0.15em] text-primary font-bold">HAND CRICKET AR</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStadiumMode(!stadiumMode)}
              className={`px-2 py-1 rounded text-[8px] font-display font-bold tracking-wider transition-all ${
                stadiumMode ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-glass"
              }`}
            >
              🏟️
            </button>
            <button
              onClick={toggleImmersive}
              className={`px-2 py-1 rounded text-[8px] font-display font-bold tracking-wider transition-all ${
                immersive ? "bg-accent/20 text-accent border border-accent/30" : "bg-muted text-muted-foreground border border-glass"
              }`}
            >
              📺
            </button>
            <RulesSheet />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`relative z-10 flex-1 flex flex-col ${immersive ? "px-0 pb-0" : "gap-2 px-3 pb-3"} max-w-lg mx-auto w-full`}>
        {/* Camera + overlay */}
        <div className={immersive ? "flex-1 relative" : "relative"}>
          <CameraFeed ref={cameraRef} onVideoReady={handleVideoReady} stadiumMode={stadiumMode} fullscreen={immersive} filter={filter} />
          {/* Hand overlay canvas */}
          <HandOverlay
            landmarks={detection.landmarks}
            videoWidth={videoW}
            videoHeight={videoH}
            status={detection.status}
            gloveStyle={gloveStyle}
            mirrored={isFrontCamera}
          />

          {/* Filter / Glove controls floating on camera */}
          <div className="absolute top-2 right-12 flex gap-1 z-[6]">
            <button
              onClick={() => setShowFilterPicker(!showFilterPicker)}
              className="w-7 h-7 rounded-full bg-card/70 backdrop-blur-md border border-glass flex items-center justify-center text-[10px] active:scale-90 transition-transform"
              aria-label="Camera filter"
            >
              🎨
            </button>
            <button
              onClick={() => {
                const opts: GloveStyle[] = ["cricket", "neon", "outline", "off"];
                const idx = opts.indexOf(gloveStyle);
                setGloveStyle(opts[(idx + 1) % opts.length]);
              }}
              className={`w-7 h-7 rounded-full backdrop-blur-md border flex items-center justify-center text-[10px] active:scale-90 transition-transform ${
                gloveStyle !== "off" ? "bg-primary/20 border-primary/40" : "bg-card/70 border-glass"
              }`}
              aria-label="Toggle glove"
            >
              🧤
            </button>
          </div>

          {/* Filter picker dropdown */}
          <AnimatePresence>
            {showFilterPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-11 right-10 z-[7] bg-card/90 backdrop-blur-xl border border-glass rounded-lg p-2 space-y-1.5"
              >
                <p className="text-[8px] font-display font-bold text-muted-foreground tracking-wider px-1">FILTER</p>
                <div className="flex gap-1">
                  {FILTER_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key); setShowFilterPicker(false); }}
                      className={`px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                        filter === f.key ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground border border-transparent"
                      }`}
                    >
                      {f.icon}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] font-display font-bold text-muted-foreground tracking-wider px-1 pt-1">GLOVE</p>
                <div className="flex gap-1">
                  {GLOVE_OPTIONS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => { setGloveStyle(g.key); setShowFilterPicker(false); }}
                      className={`px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                        gloveStyle === g.key ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground border border-transparent"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Immersive overlays */}
          {immersive && game.phase !== "not_started" && (
            <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none p-2">
              <div className="pointer-events-auto">
                <div className="flex items-center justify-between mb-1">
                  <button onClick={toggleImmersive} className="text-[9px] text-foreground/70 font-display font-bold bg-card/60 backdrop-blur-md rounded px-2 py-1">
                    ✕ EXIT
                  </button>
                  <div className="text-[8px] font-display text-primary font-bold bg-card/60 backdrop-blur-md rounded px-2 py-1">
                    LIVE • HAND CRICKET AR
                  </div>
                </div>
                <ImmersiveScoreStrip game={game} />
              </div>
              <div className="pointer-events-auto space-y-1">
                <GestureDisplay
                  status={detection.status}
                  detectedMove={detection.detectedMove}
                  capturedMove={detection.capturedMove}
                  confidence={detection.confidence}
                  lastResult={game.lastResult}
                  isBatting={game.isBatting}
                  hint={detection.hint}
                  handDetected={detection.handDetected}
                  compact
                />
              </div>
            </div>
          )}
        </div>

        {/* Toss */}
        {game.phase === "not_started" && tossChoice === null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-score p-5 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-primary/50" />
              <p className="font-display text-xs font-black text-foreground tracking-wider">CHOOSE YOUR INNINGS</p>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
            <p className="text-[11px] text-muted-foreground">Win the toss. Pick your strategy.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setTossChoice(true); startGame(true); }}
                className="flex-1 py-3.5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-xl text-sm glow-primary active:scale-95 transition-transform"
              >
                🏏 BAT FIRST
              </button>
              <button
                onClick={() => { setTossChoice(false); startGame(false); }}
                className="flex-1 py-3.5 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground font-display font-bold rounded-xl text-sm glow-accent active:scale-95 transition-transform"
              >
                🎯 BOWL FIRST
              </button>
            </div>
          </motion.div>
        )}

        {!immersive && game.phase !== "not_started" && <ScoreBoard game={game} />}

        {!immersive && game.phase !== "not_started" && (
          <GestureDisplay
            status={detection.status}
            detectedMove={detection.detectedMove}
            capturedMove={detection.capturedMove}
            confidence={detection.confidence}
            lastResult={game.lastResult}
            isBatting={game.isBatting}
            hint={detection.hint}
            handDetected={detection.handDetected}
          />
        )}

        {game.phase === "finished" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <button onClick={handleStartNew} className="flex-1 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-xl glow-primary active:scale-95 transition-transform">
              NEW MATCH
            </button>
            <button onClick={onHome} className="flex-1 py-3 bg-muted text-foreground font-display font-bold rounded-xl active:scale-95 transition-transform">
              HOME
            </button>
          </motion.div>
        )}

        {!immersive && game.phase !== "not_started" && game.phase !== "finished" && (
          <button onClick={handleStartNew} className="text-xs text-muted-foreground underline self-center mt-1 active:scale-95">
            Reset Match
          </button>
        )}
      </div>
    </div>
  );
}

function ImmersiveScoreStrip({ game }: { game: import("@/hooks/useHandCricket").GameState }) {
  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-lg border border-glass px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-[8px] text-muted-foreground font-bold block">YOU</span>
            <span className="font-display text-xl font-black text-score-gold text-glow-gold leading-none">{game.userScore}</span>
            {game.userWickets > 0 && <span className="text-[9px] text-out-red font-bold">/{game.userWickets}</span>}
          </div>
          <span className="text-[9px] font-display text-muted-foreground font-bold">VS</span>
          <div className="text-center">
            <span className="text-[8px] text-muted-foreground font-bold block">AI</span>
            <span className="font-display text-xl font-black text-accent leading-none">{game.aiScore}</span>
            {game.aiWickets > 0 && <span className="text-[9px] text-out-red font-bold">/{game.aiWickets}</span>}
          </div>
        </div>
        <div className="text-right">
          {game.target && game.phase !== "finished" && (
            <span className="text-[9px] font-display font-bold text-secondary block">TGT: {game.target}</span>
          )}
          {needRuns !== null && (
            <span className="text-[9px] font-display font-bold text-primary">NEED {needRuns}</span>
          )}
        </div>
      </div>
      {game.ballHistory.length > 0 && (
        <div className="flex gap-1 mt-1.5 overflow-x-auto">
          {game.ballHistory.slice(-8).map((b, i) => (
            <span key={i} className={`ball-chip text-[8px] ${b.runs === "OUT" ? "ball-chip-wicket" : "ball-chip-run"}`}>
              {b.runs === "OUT" ? "W" : b.runs > 0 ? b.runs : "•"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
