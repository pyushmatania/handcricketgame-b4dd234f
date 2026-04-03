import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CameraFeed, { type CameraFeedHandle, type CameraFilter } from "./CameraFeed";
import HandOverlay from "./HandOverlay";
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
import { startAmbientStadium, stopAmbientStadium, setAmbientVolume, crowdRoar, crowdGaspMute } from "@/lib/ambientStadium";
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
  const { soundEnabled, hapticsEnabled, commentaryEnabled, voiceEnabled, crowdEnabled, voiceEngine, commentaryVoice, commentaryLanguage, musicEnabled, ambientVolume, arCeremoniesEnabled } = useSettings();
  const detection = useHandDetection(videoElementRef);
  const [tossChoice, setTossChoice] = useState<null | boolean>(null);
  const [matchConfig, setMatchConfig] = useState<import("@/hooks/useHandCricket").MatchConfig | null>(null);
  const [showOverSelector, setShowOverSelector] = useState(true);
  const [playerXP, setPlayerXP] = useState(0);
  const [stadiumMode, setStadiumMode] = useState(true);
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
    if (arCeremoniesEnabled) {
      setTimeout(() => setShowPreMatch(true), 500);
      return;
    }
    if (matchConfig) {
      setTossChoice(batFirst);
      startGame(batFirst, matchConfig);
    }
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

      if (!postMatchShownRef.current) {
        postMatchShownRef.current = true;
        if (arCeremoniesEnabled) {
          setTimeout(() => setShowPostMatch(true), game.result === "win" ? 2500 : 1000);
        }
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
      setTimeout(() => {
        if (soundEnabled) SFX.out();
        if (hapticsEnabled) Haptics.out();
        crowdGaspMute();
      }, 150);
      setFireworkType("wicket");
      if (soundEnabled) setTimeout(() => SFX.fireworkPop(), 300);
    } else if (typeof r.runs === "number") {
      const abs = Math.abs(r.runs);
      if (abs === 6) {
        setTimeout(() => { if (soundEnabled) SFX.six(); if (hapticsEnabled) Haptics.heavy(); crowdRoar("six"); }, 100);
        setFireworkType("six");
        if (soundEnabled) {
          setTimeout(() => SFX.fireworkWhoosh(), 400);
          setTimeout(() => SFX.fireworkPop(), 800);
        }
        if (hapticsEnabled) setTimeout(() => Haptics.firework(), 800);
      } else if (abs === 4) {
        setTimeout(() => { if (soundEnabled) SFX.four(); if (hapticsEnabled) Haptics.medium(); crowdRoar("four"); }, 100);
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
        if (duoLines.some(l => l.isKeyMoment)) {
          speakDuoCommentary(duoLines, matchCommentators, voiceEngine);
        } else if (duoLines[0]) {
          speakCommentary(duoLines[0].text, true, voiceEngine);
        }
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

  const videoW = videoElementRef.current?.videoWidth || 640;
  const videoH = videoElementRef.current?.videoHeight || 480;
  const isFrontCamera = cameraRef.current?.videoRef?.current
    ? (cameraRef.current.videoRef.current.className || "").includes("scale-x-[-1]")
    : false;

  const isPreGame = game.phase === "not_started" && !showPreMatch;
  const isInGame = game.phase !== "not_started" && game.phase !== "finished";

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <CelebrationEffects lastResult={game.lastResult} gameResult={game.result} phase={game.phase} />
      <CanvasFireworks type={fireworkType} duration={fireworkType === "win" ? 5000 : 3000} />

      {/* Camera fills the full screen */}
      <div className="absolute inset-0">
        <CameraFeed ref={cameraRef} onVideoReady={handleVideoReady} stadiumMode={stadiumMode} fullscreen filter={filter} />
        <HandOverlay
          landmarks={detection.landmarks}
          videoWidth={videoW}
          videoHeight={videoH}
          status={detection.status}
          gloveStyle={gloveStyle}
          mirrored={isFrontCamera}
        />
      </div>

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

      {/* ── TOP BAR ── always visible as overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onHome}
          className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-sm text-white"
        >
          ←
        </motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-white font-bold">AR CRICKET</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStadiumMode(!stadiumMode)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] active:scale-90 transition-all ${
              stadiumMode ? "bg-primary/30 border border-primary/40" : "bg-black/50 border border-white/10"
            } backdrop-blur-md`}
          >
            🏟️
          </button>
          <button
            onClick={() => setShowFilterPicker(!showFilterPicker)}
            className="w-8 h-8 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-[10px] active:scale-90 transition-all"
          >
            🎨
          </button>
          <button
            onClick={() => {
              const opts: GloveStyle[] = ["cricket", "neon", "outline", "off"];
              setGloveStyle(opts[(opts.indexOf(gloveStyle) + 1) % opts.length]);
            }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] active:scale-90 transition-all ${
              gloveStyle !== "off" ? "bg-primary/30 border border-primary/40" : "bg-black/50 border border-white/10"
            } backdrop-blur-md`}
          >
            🧤
          </button>
          <RulesSheet />
        </div>
      </div>

      {/* Filter picker dropdown */}
      <AnimatePresence>
        {showFilterPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 right-3 z-40 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 space-y-2"
          >
            <p className="text-[7px] font-display font-bold text-white/60 tracking-widest px-1">FILTER</p>
            <div className="flex gap-1">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); setShowFilterPicker(false); }}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    filter === f.key ? "bg-primary/30 text-primary border border-primary/30" : "bg-white/10 text-white/60 border border-transparent"
                  }`}
                >
                  {f.icon}
                </button>
              ))}
            </div>
            <p className="text-[7px] font-display font-bold text-white/60 tracking-widest px-1 pt-0.5">GLOVE</p>
            <div className="flex gap-1">
              {GLOVE_OPTIONS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => { setGloveStyle(g.key); setShowFilterPicker(false); }}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    gloveStyle === g.key ? "bg-primary/30 text-primary border border-primary/30" : "bg-white/10 text-white/60 border border-transparent"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── IN-GAME OVERLAYS ── */}
      {isInGame && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">
          {/* Score strip at top (below top bar) */}
          <div className="pt-16 px-3 pointer-events-auto">
            <ImmersiveScoreStrip game={game} playerName={playerName} aiName={opponentName} />
          </div>

          {/* Center: countdown / fist prompt / next ball / live gesture preview */}
          <div className="flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              {detection.phase === "countdown" && detection.countdownValue && (
                <motion.div
                  key={`cd-${detection.countdownValue}`}
                  initial={{ scale: 2.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <p className="font-display text-[96px] font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.8)] leading-none">
                    {detection.countdownValue}
                  </p>
                  <p className="font-display text-sm font-bold text-white/70 tracking-[0.2em]">GET READY</p>
                </motion.div>
              )}
              {detection.phase === "wait_for_fist" && (
                <motion.div
                  key="fist"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10"
                >
                  <motion.p
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-5xl mb-2"
                  >
                    ✊
                  </motion.p>
                  <p className="font-display text-sm font-black text-white tracking-wider">SHOW FIST TO START</p>
                  <p className="text-[10px] text-white/60 mt-1">Hold fist steady to begin</p>
                </motion.div>
              )}
              {detection.phase === "tracking_active" && detection.detectedMove && (
                <motion.div
                  key={`live-${detection.detectedMove}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-center"
                >
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="font-display text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                  >
                    {detection.detectedMove === "DEF" ? "✊" : detection.detectedMove === 6 ? "👍" : `${detection.detectedMove}`}
                  </motion.p>
                  <div className="mt-1 h-1 w-24 mx-auto rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(detection.confidence * 100)}%` }}
                    />
                  </div>
                </motion.div>
              )}
              {detection.phase === "cooldown" && (
                <motion.div
                  key="cooldown"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10"
                >
                  <motion.p
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-4xl mb-1"
                  >
                    🏏
                  </motion.p>
                  <p className="font-display text-sm font-black text-white tracking-wider">NEXT BALL</p>
                  <p className="text-[10px] text-white/60 mt-1">Get ready…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: gesture display */}
          <div className="pb-4 px-3 pointer-events-auto space-y-2">
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
            <button onClick={handleStartNew} className="text-[10px] text-white/30 underline self-center block w-full text-center active:scale-95 font-display tracking-wider">
              Reset Match
            </button>
          </div>
        </div>
      )}

      {/* ── PRE-GAME UI (OverSelector / Toss) — bottom sheet overlay ── */}
      {isPreGame && (
        <div className="absolute bottom-0 left-0 right-0 z-30 max-w-lg mx-auto w-full px-3 pb-4">
          <div className="bg-black/70 backdrop-blur-xl rounded-t-3xl border-t border-x border-white/10 px-4 pt-4 pb-6 space-y-3">
            {showOverSelector && (
              <OverSelector playerXP={playerXP} onSelect={handleOverSelect} />
            )}
            {!showOverSelector && matchConfig && tossChoice === null && (
              <OddEvenToss
                onResult={handleTossResult}
                onTossComplete={handleTossComplete}
                playerName={playerName}
                opponentName={opponentName}
              />
            )}
          </div>
        </div>
      )}

      {/* ── FINISHED overlay ── */}
      {game.phase === "finished" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-10 px-6 bg-black/40">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-3">
            <ImmersiveScoreStrip game={game} playerName={playerName} aiName={opponentName} />
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleStartNew}
                className="flex-1 py-3 bg-primary text-primary-foreground font-display font-bold rounded-2xl tracking-wider shadow-[0_0_20px_hsl(217_91%_60%/0.4)] border border-primary/30"
              >
                ⚡ NEW MATCH
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onHome}
                className="flex-1 py-3 bg-black/60 backdrop-blur-md text-white font-display font-bold rounded-2xl tracking-wider border border-white/10"
              >
                HOME
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ImmersiveScoreStrip({ game, playerName = "You", aiName = "Rohit AI" }: { game: import("@/hooks/useHandCricket").GameState; playerName?: string; aiName?: string }) {
  const needRuns = game.target && game.isBatting && game.phase !== "finished"
    ? Math.max(0, game.target - game.userScore)
    : null;

  return (
    <div className="rounded-2xl border-2 border-game-gold/30 shadow-game-card bg-gradient-to-b from-[hsl(220_20%_18%)] to-[hsl(220_25%_12%)] px-3 py-2">
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
