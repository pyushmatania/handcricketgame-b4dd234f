import { motion, AnimatePresence } from "framer-motion";
import type { Move, BallResult } from "@/hooks/useHandCricket";
import type { GestureStatus } from "@/hooks/useHandDetection";
import { useState, useEffect } from "react";

interface GestureDisplayProps {
  status: GestureStatus;
  detectedMove: Move | null;
  lockedMove: Move | null;
  confidence: number;
  lastResult: BallResult | null;
  onCapture: () => void;
  canCapture: boolean;
  isBatting: boolean;
  hint: string;
  handDetected: boolean;
  debugInfo: string;
}

const moveEmoji: Record<string, string> = {
  DEF: "✊",
  "1": "☝️",
  "2": "✌️",
  "3": "🤟",
  "4": "🖖",
  "5": "🖐️",
  "6": "6️⃣",
};

const moveNames: Record<string, string> = {
  DEF: "DEFENSE",
  "1": "SINGLE",
  "2": "DOUBLE",
  "3": "TRIPLE",
  "4": "FOUR",
  "5": "FIVE",
  "6": "SIX",
};

function moveLabel(m: Move | null): string {
  if (m === null) return "—";
  return m === "DEF" ? "DEF" : String(m);
}

function StatusIndicator({ status, handDetected }: { status: GestureStatus; handDetected: boolean }) {
  const colors: Record<GestureStatus, string> = {
    idle: "bg-muted-foreground",
    loading_model: "bg-secondary animate-pulse",
    camera_started: "bg-accent animate-pulse",
    tracking_active: "bg-primary animate-pulse",
    tracking_unavailable: "bg-out-red",
    no_hand: "bg-out-red",
    detecting: "bg-accent animate-pulse",
    stable: "bg-primary animate-pulse-glow",
  };

  const labels: Record<GestureStatus, string> = {
    idle: "Waiting to start tracking…",
    loading_model: "Loading model…",
    camera_started: "Camera started",
    tracking_active: handDetected ? "Hand detected" : "Hand tracking active",
    tracking_unavailable: "Hand tracking unavailable",
    no_hand: "No hand detected",
    detecting: handDetected ? "Detecting gesture…" : "Looking for hand…",
    stable: "Stable — ready to lock!",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-muted-foreground font-semibold">
        {labels[status]}
      </span>
    </div>
  );
}

function StabilityBar({ confidence, status }: { confidence: number; status: GestureStatus }) {
  if (status === "idle" || status === "loading_model") return null;

  return (
    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${
          status === "stable" ? "bg-primary" : status === "detecting" ? "bg-accent" : "bg-out-red"
        }`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(confidence * 100)}%` }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}

export default function GestureDisplay({
  status,
  detectedMove,
  lockedMove,
  confidence,
  lastResult,
  onCapture,
  canCapture,
  isBatting,
  hint,
  handDetected,
  debugInfo,
}: GestureDisplayProps) {
  const displayMove = lockedMove ?? detectedMove;
  const [floatingScore, setFloatingScore] = useState<{ value: string; key: number } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (lastResult) {
      if (lastResult.runs === "OUT") {
        setFloatingScore({ value: "OUT!", key: Date.now() });
      } else if (lastResult.runs > 0) {
        setFloatingScore({ value: `+${lastResult.runs}`, key: Date.now() });
      }
      const timer = setTimeout(() => setFloatingScore(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [lastResult]);

  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className="glass-premium px-3 py-2 flex items-center justify-between">
        <StatusIndicator status={status} handDetected={handDetected} />
        <StabilityBar confidence={confidence} status={status} />
      </div>

      {/* Guidance hint */}
      {hint && status !== "stable" && !lockedMove && (
        <div className="px-3 py-1.5 text-center">
          <span className="text-[10px] text-accent font-semibold">{hint}</span>
        </div>
      )}

      {/* Locked status */}
      {lockedMove && (
        <div className="px-3 py-1.5 text-center">
          <span className="text-[10px] text-primary font-display font-bold tracking-wider">
            🔒 Shot locked! Tap PLAY to confirm
          </span>
        </div>
      )}

      {/* Move cards + capture button */}
      <div className="grid grid-cols-3 gap-2 relative">
        {/* Your move */}
        <div className={`glass-premium p-3 text-center transition-all ${lockedMove ? "border-primary/40 glow-primary" : ""}`}>
          <p className="text-[9px] text-muted-foreground mb-1 font-bold tracking-widest">
            {isBatting ? "YOUR SHOT" : "YOUR BOWL"}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={String(displayMove)}
              initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              className="text-3xl"
            >
              {displayMove ? moveEmoji[String(displayMove)] || "❓" : "—"}
            </motion.div>
          </AnimatePresence>
          <p className="text-sm font-display font-black text-primary mt-1">
            {moveLabel(displayMove)}
          </p>
          {displayMove && (
            <p className="text-[8px] text-muted-foreground/60 mt-0.5">
              {moveNames[String(displayMove)]}
            </p>
          )}
        </div>

        {/* Capture button */}
        <div className="flex flex-col items-center justify-center gap-1.5 relative">
          <button
            onClick={onCapture}
            disabled={!canCapture}
            className={`w-16 h-16 rounded-full font-display font-black text-[10px] tracking-wider transition-all ${
              canCapture
                ? lockedMove
                  ? "bg-secondary text-secondary-foreground glow-secondary hover:brightness-110 active:scale-90"
                  : "bg-primary text-primary-foreground glow-primary hover:brightness-110 active:scale-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {lockedMove ? "PLAY!" : "LOCK"}
          </button>
          <span className="text-[8px] text-muted-foreground/50 font-semibold">
            {!canCapture && !lockedMove ? "Hold steady to lock" : lockedMove ? "Confirm play" : "Lock gesture"}
          </span>

          {/* Floating score */}
          <AnimatePresence>
            {floatingScore && (
              <motion.div
                key={floatingScore.key}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -40, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className={`absolute top-0 font-display font-black text-lg ${
                  lastResult?.runs === "OUT" ? "text-out-red" : "text-primary"
                }`}
              >
                {floatingScore.value}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI move */}
        <div className={`glass-premium p-3 text-center transition-all ${
          lastResult?.runs === "OUT" ? "border-out-red/40" : ""
        }`}>
          <p className="text-[9px] text-muted-foreground mb-1 font-bold tracking-widest">
            {isBatting ? "AI BOWLS" : "AI BATS"}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={String(lastResult?.aiMove)}
              initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              className="text-3xl"
            >
              {lastResult ? moveEmoji[String(lastResult.aiMove)] || "🤖" : "🤖"}
            </motion.div>
          </AnimatePresence>
          <p className="text-sm font-display font-black text-accent mt-1">
            {lastResult ? moveLabel(lastResult.aiMove as Move) : "—"}
          </p>
          {lastResult?.aiMove && (
            <p className="text-[8px] text-muted-foreground/60 mt-0.5">
              {moveNames[String(lastResult.aiMove)] || "SIX"}
            </p>
          )}
        </div>
      </div>

      {/* Last result banner */}
      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.description}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className={`broadcast-bar rounded-lg px-3 py-2 text-center text-sm font-bold ${
              lastResult.runs === "OUT"
                ? "text-out-red border-out-red/30 animate-shake"
                : "text-foreground"
            }`}
          >
            {lastResult.runs === "OUT" ? (
              <span className="font-display tracking-wider text-glow-red">🔴 OUT!</span>
            ) : (
              <span>{lastResult.description}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture legend */}
      <div className="flex items-center justify-center gap-3 py-1">
        <span className="text-[8px] text-muted-foreground/40">✊ DEF</span>
        <span className="text-[8px] text-muted-foreground/40">☝️ 1</span>
        <span className="text-[8px] text-muted-foreground/40">✌️ 2</span>
        <span className="text-[8px] text-muted-foreground/40">🤟 3</span>
        <span className="text-[8px] text-muted-foreground/40">🖖 4</span>
        <span className="text-[8px] text-muted-foreground/40">🖐️ 5</span>
      </div>

      {/* Debug toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="text-[8px] text-muted-foreground/30 self-center mx-auto block"
      >
        {showDebug ? "Hide debug" : "🔧"}
      </button>
      {showDebug && (
        <div className="px-2 py-1 rounded bg-card/50 text-[8px] text-muted-foreground/50 font-mono break-all">
          {debugInfo}
        </div>
      )}
    </div>
  );
}
