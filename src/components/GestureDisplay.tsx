import { motion, AnimatePresence } from "framer-motion";
import type { Move, BallResult } from "@/hooks/useHandCricket";
import type { GestureStatus } from "@/hooks/useHandDetection";
import { useState, useEffect } from "react";

interface GestureDisplayProps {
  status: GestureStatus;
  detectedMove: Move | null;
  capturedMove: Move | null;
  confidence: number;
  lastResult: BallResult | null;
  isBatting: boolean;
  hint: string;
  handDetected: boolean;
  compact?: boolean;
}

const moveEmoji: Record<string, string> = {
  DEF: "✊", "1": "☝️", "2": "✌️", "3": "🤟", "4": "🖖", "6": "👍",
};

function moveLabel(m: Move | null): string {
  if (m === null) return "—";
  return m === "DEF" ? "DEF" : String(m);
}

function StatusDot({ status }: { status: GestureStatus }) {
  const color =
    status === "captured" ? "bg-secondary" :
    status === "tracking_active" ? "bg-primary" :
    status === "cooldown" || status === "result" ? "bg-accent" :
    status === "wait_for_fist" || status === "countdown" ? "bg-primary" :
    status === "tracking_unavailable" ? "bg-out-red" :
    "bg-muted-foreground";

  return <div className={`w-2 h-2 rounded-full ${color} ${status === "tracking_active" ? "animate-pulse" : ""}`} />;
}

export default function GestureDisplay({
  status,
  detectedMove,
  capturedMove,
  confidence,
  lastResult,
  isBatting,
  hint,
  handDetected,
  compact = false,
}: GestureDisplayProps) {
  const displayMove = capturedMove ?? detectedMove;
  const [floatingScore, setFloatingScore] = useState<{ value: string; key: number } | null>(null);

  useEffect(() => {
    if (lastResult) {
      if (lastResult.runs === "OUT") {
        setFloatingScore({ value: "OUT!", key: Date.now() });
      } else if (typeof lastResult.runs === "number" && lastResult.runs > 0) {
        setFloatingScore({ value: `+${lastResult.runs}`, key: Date.now() });
      }
      const timer = setTimeout(() => setFloatingScore(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [lastResult]);

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Last result banner (compact) */}
        <AnimatePresence mode="wait">
          {lastResult && (
            <motion.div
              key={lastResult.description}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-lg px-3 py-2 text-center text-sm font-display font-bold bg-card/80 backdrop-blur-xl ${
                lastResult.runs === "OUT" ? "text-out-red" : "text-foreground"
              }`}
            >
              {lastResult.runs === "OUT" ? "🔴 OUT!" : lastResult.description}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact gesture strip */}
        <div className="flex items-center justify-between bg-card/80 backdrop-blur-xl rounded-lg px-3 py-2 border border-glass">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <span className="text-[10px] text-muted-foreground font-semibold">{hint}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Your move */}
            <div className="flex items-center gap-1">
              <span className="text-lg">{displayMove ? moveEmoji[String(displayMove)] || "—" : "—"}</span>
              <span className="text-xs font-display font-bold text-primary">{moveLabel(displayMove)}</span>
            </div>
            {/* AI move */}
            {lastResult && (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground">vs</span>
                <span className="text-lg">{moveEmoji[String(lastResult.aiMove)] || "🤖"}</span>
                <span className="text-xs font-display font-bold text-accent">{moveLabel(lastResult.aiMove as Move)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status + hint */}
      <div className="glass-premium px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-xs text-muted-foreground font-semibold">{hint}</span>
        </div>
        {/* Confidence bar */}
        {status !== "idle" && status !== "loading_model" && (
          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                status === "captured" ? "bg-primary" : status === "tracking_active" ? "bg-primary/50" : "bg-muted-foreground"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(confidence * 100)}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
      </div>

      {/* Move cards */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 relative">
        {/* Your move */}
        <div className={`glass-score p-3 text-center transition-all ${capturedMove ? "border-primary/40 glow-primary" : ""}`}>
          <p className="text-[8px] text-muted-foreground mb-1 font-bold tracking-widest">
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
              {displayMove ? moveEmoji[String(displayMove)] || "❓" : "✋"}
            </motion.div>
          </AnimatePresence>
          <p className="text-sm font-display font-black text-primary mt-1">{moveLabel(displayMove)}</p>

          {/* Capture flash */}
          <AnimatePresence>
            {status === "captured" && (
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 rounded-2xl bg-primary/20 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Center result indicator */}
        <div className="flex flex-col items-center justify-center gap-1 relative">
          <AnimatePresence mode="wait">
            {status === "captured" ? (
              <motion.div
                key="captured"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
              >
                <span className="text-[9px] font-display font-black text-primary-foreground">GO!</span>
              </motion.div>
            ) : status === "cooldown" || status === "result" ? (
              <motion.div
                key="cooldown"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-12 h-12 rounded-full bg-muted border border-glass flex items-center justify-center"
              >
                <span className="text-[10px] font-display font-bold text-muted-foreground">{status === "result" ? "⚡" : "⏳"}</span>
              </motion.div>
            ) : status === "tracking_active" ? (
              <motion.div
                key="ready"
                className="w-12 h-12 rounded-full border-2 border-primary/40 flex items-center justify-center"
              >
                <span className="text-[8px] font-display font-bold text-primary text-center leading-tight">
                  ✋
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="auto"
                className="w-12 h-12 rounded-full border-2 border-dashed border-glass flex items-center justify-center"
              >
                <span className="text-[8px] font-display font-bold text-muted-foreground text-center leading-tight">
                  AUTO
                </span>
              </motion.div>
            )}
          </AnimatePresence>

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
                  lastResult?.runs === "OUT" ? "text-out-red text-glow-red" : "text-primary text-glow"
                }`}
              >
                {floatingScore.value}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI move */}
        <div className={`glass-score p-3 text-center transition-all ${
          lastResult?.runs === "OUT" ? "border-out-red/30" : ""
        }`}>
          <p className="text-[8px] text-muted-foreground mb-1 font-bold tracking-widest">
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
              lastResult.runs === "OUT" ? "text-out-red animate-shake" : "text-foreground"
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
      <div className="flex items-center justify-center gap-3 py-0.5">
        <span className="text-[8px] text-muted-foreground/30">✊ DEF</span>
        <span className="text-[8px] text-muted-foreground/30">☝️ 1</span>
        <span className="text-[8px] text-muted-foreground/30">✌️ 2</span>
        <span className="text-[8px] text-muted-foreground/30">🤟 3</span>
        <span className="text-[8px] text-muted-foreground/30">🖖 4</span>
        <span className="text-[8px] text-muted-foreground/30">👍 6</span>
      </div>
    </div>
  );
}
