import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraFeed, { type CameraFeedHandle, type CameraFilter } from "./CameraFeed";
import HandOverlay from "./HandOverlay";
import ScoreBoard from "./ScoreBoard";
import GestureDisplay from "./GestureDisplay";
import RulesSheet from "./RulesSheet";
import OddEvenToss from "./OddEvenToss";
import OverSelector from "./OverSelector";
import CelebrationEffects from "./CelebrationEffects";
import CanvasFireworks, { type FireworkType } from "./CanvasFireworks";
import EnhancedPreMatch from "./EnhancedPreMatch";
import EnhancedPostMatch from "./EnhancedPostMatch";
import { useHandCricket } from "@/hooks/useHandCricket";
import { useHandDetection } from "@/hooks/useHandDetection";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { startAmbientStadium, stopAmbientStadium, setAmbientVolume } from "@/lib/ambientStadium";
import { getInningsChangeCommentary } from "@/lib/commentary";
import { playCrowdForResult, CrowdSFX, speakDuoCommentary, speakCommentary } from "@/lib/voiceCommentary";
import { isElevenLabsAvailable } from "@/lib/elevenLabsAudio";
import { useSettings } from "@/contexts/SettingsContext";
import { pickConfiguredMatchCommentators, getDuoCommentary, type Commentator, type CommentaryLine } from "@/lib/commentaryDuo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const { saveMatch } = useMatchSaver();
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled, voiceEngine, commentaryVoice, commentaryLanguage, musicEnabled, ambientVolume } = useSettings();
  const detection = useHandDetection(videoElementRef);
  const [tossChoice, setTossChoice] = useState<null | boolean>(null);
  const [matchConfig, setMatchConfig] = useState<import("@/hooks/useHandCricket").MatchConfig | null>(null);
  const [showOverSelector, setShowOverSelector] = useState(true);
  const [playerXP, setPlayerXP] = useState(0);
  const [stadiumMode, setStadiumMode] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const [filter, setFilter] = useState<CameraFilter>("broadcast");
  const [gloveStyle, setGloveStyle] = useState<GloveStyle>("cricket");
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryLine[] | null>(null);
  const savedRef = useRef(false);
  const [matchCommentators] = useState<[Commentator, Commentator]>(() => pickConfiguredMatchCommentators(commentaryVoice));
  const prevPhaseRef = useRef(game.phase);

  // Ambient stadium music for AR mode
  useEffect(() => {
    if (soundEnabled && musicEnabled && !game.result) {
      startAmbientStadium(ambientVolume);
    } else {
      stopAmbientStadium();
    }
    return () => { stopAmbientStadium(); };
  }, [soundEnabled, musicEnabled, game.result]);

  useEffect(() => {
    if (soundEnabled && musicEnabled) setAmbientVolume(ambientVolume);
  }, [ambientVolume, soundEnabled, musicEnabled]);

  // Fireworks state
  const [fireworkType, setFireworkType] = useState<FireworkType | null>(null);

  // Ceremony states
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [tossInfo, setTossInfo] = useState<{ winner: string; battingFirst: string } | null>(null);
  const [pendingBatFirst, setPendingBatFirst] = useState<boolean | null>(null);
  const postMatchShownRef = useRef(false);

  const { user } = useAuth();
  const [playerName, setPlayerName] = useState("You");
  const opponentName = "Rohit AI";

  // Fetch display name from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, xp")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setPlayerName(data.display_name);
        if ((data as any)?.xp) setPlayerXP((data as any).xp);
      });
  }, [user]);

  // Handle toss complete -> show pre-match ceremony
  const handleTossComplete = (tossWinner: string, battingFirst: string) => {
    setTossInfo({ winner: tossWinner, battingFirst });
  };

  const handleTossResult = (batFirst: boolean) => {
    setPendingBatFirst(batFirst);
    // Show pre-match ceremony after a short delay
    setTimeout(() => setShowPreMatch(true), 500);
  };

  const handlePreMatchComplete = () => {
    setShowPreMatch(false);
    if (pendingBatFirst !== null && matchConfig) {
      setTossChoice(pendingBatFirst);
      startGame(pendingBatFirst, matchConfig);
    }
  };

  const handleOverSelect = (config: import("@/hooks/useHandCricket").MatchConfig) => {
    setMatchConfig(config);
    setShowOverSelector(false);
  };

  // Auto-save match when game finishes + trigger post-match ceremony
  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "ar");

      if (game.result === "win") {
        if (soundEnabled) SFX.win();
        if (hapticsEnabled) Haptics.success();
        if (crowdEnabled) playCrowdForResult(0, true, true, "win");
        setFireworkType("win");
        if (soundEnabled) {
          setTimeout(() => SFX.fireworkWhoosh(), 200);
          setTimeout(() => SFX.fireworkPop(), 600);
          setTimeout(() => SFX.fireworkWhoosh(), 1000);
          setTimeout(() => SFX.fireworkPop(), 1400);
        }
        if (hapticsEnabled) {
          setTimeout(() => Haptics.firework(), 600);
          setTimeout(() => Haptics.firework(), 1400);
        }
      } else if (game.result === "loss") {
        if (soundEnabled) SFX.loss();
        if (hapticsEnabled) Haptics.error();
        if (crowdEnabled) playCrowdForResult(0, true, true, "loss");
      }

      // Show post-match ceremony
      if (!postMatchShownRef.current) {
        postMatchShownRef.current = true;
        setTimeout(() => setShowPostMatch(true), game.result === "win" ? 2500 : 1000);
      }
    }
  }, [game.phase, game, saveMatch]);

  // Clear fireworks after duration
  useEffect(() => {
    if (fireworkType) {
      const t = setTimeout(() => setFireworkType(null), fireworkType === "win" ? 5000 : 3000);
      return () => clearTimeout(t);
    }
  }, [fireworkType]);

  // Innings change sound
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;
    if (prev !== game.phase && game.phase !== "not_started" && game.phase !== "finished") {
      if (soundEnabled) SFX.gameStart();
      if (commentaryEnabled) {
        const text = getInningsChangeCommentary(game);
        const lines: CommentaryLine[] = [
          { commentatorId: matchCommentators[0].name, text, isKeyMoment: true },
        ];
        setCommentary(lines);
        if (voiceEnabled) {
          speakDuoCommentary(lines, matchCommentators, voiceEngine);
        }
        setTimeout(() => setCommentary(null), 3000);
      }
      if (crowdEnabled) CrowdSFX.ambientMurmur(2);
    }
  }, [game.phase]);

  // Ball result sounds, commentary & fireworks
  useEffect(() => {
    if (!game.lastResult) return;
    const r = game.lastResult;
    if (soundEnabled) SFX.batHit();
    if (r.runs === "OUT") {
      setTimeout(() => { if (soundEnabled) SFX.out(); if (hapticsEnabled) Haptics.out(); }, 150);
      // Wicket fireworks
      setFireworkType("wicket");
      if (soundEnabled) setTimeout(() => SFX.fireworkPop(), 300);
    } else if (typeof r.runs === "number") {
      const abs = Math.abs(r.runs);
      if (abs === 6) {
        setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); }, 100);
        setFireworkType("six");
        if (soundEnabled) {
          setTimeout(() => SFX.fireworkWhoosh(), 400);
          setTimeout(() => SFX.fireworkPop(), 800);
        }
        if (hapticsEnabled) setTimeout(() => Haptics.firework(), 800);
      } else if (abs === 4) {
        setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); }, 100);
        setFireworkType("four");
        if (soundEnabled) setTimeout(() => SFX.fireworkPop(), 400);
      } else {
        if (soundEnabled) SFX.runs(abs);
        if (hapticsEnabled) Haptics.light();
      }
    }
    if (crowdEnabled) playCrowdForResult(r.runs, game.isBatting, false);
    if (commentaryEnabled) {
      const duoLines = getDuoCommentary(
        matchCommentators[0].name, matchCommentators[1].name,
        r.runs, game.isBatting, playerName, opponentName,
        undefined, commentaryLanguage
      );
      setCommentary(duoLines);
      if (voiceEnabled) {
        speakDuoCommentary(duoLines, matchCommentators, voiceEngine);
      }
      setTimeout(() => setCommentary(null), 2500);
    }
  }, [game.lastResult]);

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

  useEffect(() => {
    if (game.phase !== "not_started" && game.phase !== "finished" && detection.resetToFist) {
      detection.resetToFist();
    }
  }, [game.phase === "not_started"]);

  const handleStartNew = () => {
    resetGame();
    setTossChoice(null);
    setPendingBatFirst(null);
    setTossInfo(null);
    setFireworkType(null);
    setShowPreMatch(false);
    setShowPostMatch(false);
    savedRef.current = false;
    postMatchShownRef.current = false;
    setMatchConfig(null);
    setShowOverSelector(true);
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
      {stadiumMode && <div className="absolute inset-0 vignette pointer-events-none" />}
      <CelebrationEffects lastResult={game.lastResult} gameResult={game.result} phase={game.phase} />
      <CanvasFireworks type={fireworkType} duration={fireworkType === "win" ? 5000 : 3000} />

      {/* Pre-match ceremony */}
      {showPreMatch && tossInfo && (
        <EnhancedPreMatch
          playerName={playerName}
          opponentName={opponentName}
          tossWinner={tossInfo.winner}
          battingFirst={tossInfo.battingFirst}
          commentators={matchCommentators}
          onComplete={handlePreMatchComplete}
        />
      )}

      {/* Post-match ceremony */}
      {showPostMatch && game.result && (
        <EnhancedPostMatch
          playerName={playerName}
          opponentName={opponentName}
          result={game.result}
          playerScore={game.userScore}
          opponentScore={game.aiScore}
          ballHistory={game.ballHistory}
          commentators={matchCommentators}
          onComplete={() => setShowPostMatch(false)}
        />
      )}

      {/* Top ambient glow */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.06) 0%, transparent 70%)" }}
      />

      {/* Top bar */}
      {!immersive && (
        <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onHome}
            className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm"
          >
            ←
          </motion.button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-display text-[9px] tracking-[0.2em] text-primary font-bold">HAND CRICKET AR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStadiumMode(!stadiumMode)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] active:scale-90 transition-all ${
                stadiumMode ? "glass-premium border border-primary/20" : "glass-card"
              }`}
            >
              🏟️
            </button>
            <button
              onClick={toggleImmersive}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] active:scale-90 transition-all ${
                immersive ? "glass-premium border border-accent/20" : "glass-card"
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
          <HandOverlay
            landmarks={detection.landmarks}
            videoWidth={videoW}
            videoHeight={videoH}
            status={detection.status}
            gloveStyle={gloveStyle}
            mirrored={isFrontCamera}
          />

          {/* Next Ball overlay */}
          <AnimatePresence>
            {detection.phase === "cooldown" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none"
              >
                <div className="bg-card/80 backdrop-blur-xl rounded-2xl px-6 py-4 border border-primary/30 text-center">
                  <motion.p
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-3xl mb-1"
                  >
                    🏏
                  </motion.p>
                  <p className="font-display text-sm font-black text-primary tracking-wider">NEXT BALL</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Get ready…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter/Glove toggles */}
          <div className="absolute top-2 right-12 flex gap-1 z-[6]">
            <button
              onClick={() => setShowFilterPicker(!showFilterPicker)}
              className="w-7 h-7 rounded-full bg-card/70 backdrop-blur-md border border-glass flex items-center justify-center text-[10px] active:scale-90 transition-transform"
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
            >
              🧤
            </button>
          </div>

          {/* Filter picker */}
          <AnimatePresence>
            {showFilterPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-11 right-10 z-[7] bg-card/90 backdrop-blur-xl border border-glass rounded-xl p-2.5 space-y-2"
              >
                <p className="text-[7px] font-display font-bold text-muted-foreground tracking-widest px-1">FILTER</p>
                <div className="flex gap-1">
                  {FILTER_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setFilter(f.key); setShowFilterPicker(false); }}
                      className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                        filter === f.key ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground border border-transparent"
                      }`}
                    >
                      {f.icon}
                    </button>
                  ))}
                </div>
                <p className="text-[7px] font-display font-bold text-muted-foreground tracking-widest px-1 pt-0.5">GLOVE</p>
                <div className="flex gap-1">
                  {GLOVE_OPTIONS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => { setGloveStyle(g.key); setShowFilterPicker(false); }}
                      className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
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
                  <button onClick={toggleImmersive} className="text-[9px] text-foreground/70 font-display font-bold bg-card/60 backdrop-blur-md rounded-lg px-2 py-1">
                    ✕ EXIT
                  </button>
                  <div className="text-[8px] font-display text-primary font-bold bg-card/60 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
                    LIVE
                  </div>
                </div>
                <ImmersiveScoreStrip game={game} playerName={playerName} aiName={opponentName} />
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

        {/* Over Selector — shown first */}
        {showOverSelector && game.phase === "not_started" && tossChoice === null && !showPreMatch && (
          <OverSelector playerXP={playerXP} onSelect={handleOverSelect} />
        )}

        {/* Odd/Even Toss — after over selection */}
        {!showOverSelector && matchConfig && game.phase === "not_started" && tossChoice === null && !showPreMatch && (
          <OddEvenToss
            onResult={handleTossResult}
            onTossComplete={handleTossComplete}
            playerName={playerName}
            opponentName={opponentName}
          />
        )}

        {/* Phase-based countdown overlay */}
        <AnimatePresence>
          {detection.phase === "countdown" && detection.countdownValue && (
            <motion.div
              key={detection.countdownValue}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="glass-score p-6 text-center"
            >
              <p className="font-display text-5xl font-black text-primary text-glow">{detection.countdownValue}</p>
              <p className="text-xs text-muted-foreground mt-2 font-semibold">Get ready…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fist prompt */}
        {detection.phase === "wait_for_fist" && game.phase !== "not_started" && game.phase !== "finished" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-score p-5 text-center space-y-2">
            <motion.p
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl"
            >
              ✊
            </motion.p>
            <p className="font-display text-sm font-black text-foreground tracking-wider">Show FIST to start</p>
            <p className="text-[10px] text-muted-foreground">Make a fist and hold steady</p>
          </motion.div>
        )}

        {!immersive && game.phase !== "not_started" && <ScoreBoard game={game} playerName={playerName} aiName={opponentName} aiEmoji="🏏" />}

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
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartNew}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl tracking-wider shadow-[0_0_20px_hsl(217_91%_60%/0.2)] border border-primary/30"
            >
              ⚡ NEW MATCH
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onHome}
              className="flex-1 py-3 glass-premium text-foreground font-display font-bold rounded-2xl tracking-wider border border-primary/10"
            >
              HOME
            </motion.button>
          </motion.div>
        )}

        {!immersive && game.phase !== "not_started" && game.phase !== "finished" && (
          <button onClick={handleStartNew} className="text-[10px] text-muted-foreground/50 underline self-center mt-1 active:scale-95 font-display tracking-wider">
            Reset Match
          </button>
        )}
      </div>
    </div>
  );
}

function ImmersiveScoreStrip({ game, playerName = "You", aiName = "Rohit AI" }: { game: import("@/hooks/useHandCricket").GameState; playerName?: string; aiName?: string }) {
  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-xl border border-glass px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-[7px] text-muted-foreground font-bold block tracking-widest">{playerName.toUpperCase().slice(0, 8)}</span>
            <span className="font-display text-xl font-black text-score-gold text-glow-gold leading-none">{game.userScore}</span>
            {game.userWickets > 0 && <span className="text-[9px] text-out-red font-bold">/{game.userWickets}</span>}
          </div>
          <span className="text-[8px] font-display text-muted-foreground font-bold">VS</span>
          <div className="text-center">
            <span className="text-[7px] text-muted-foreground font-bold block tracking-widest">{aiName.toUpperCase().slice(0, 8)}</span>
            <span className="font-display text-xl font-black text-accent leading-none">{game.aiScore}</span>
            {game.aiWickets > 0 && <span className="text-[9px] text-out-red font-bold">/{game.aiWickets}</span>}
          </div>
        </div>
        <div className="text-right">
          {game.target && game.phase !== "finished" && (
            <span className="text-[8px] font-display font-bold text-secondary block tracking-wider">TGT: {game.target}</span>
          )}
          {needRuns !== null && (
            <span className="text-[8px] font-display font-bold text-primary">NEED {needRuns}</span>
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
