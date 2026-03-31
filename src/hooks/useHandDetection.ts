import { useState, useCallback, useRef, useEffect } from "react";
import type { Move } from "./useHandCricket";

export type GestureStatus = "loading" | "ready" | "no_hand" | "detecting" | "stable";

export interface HandDetectionState {
  status: GestureStatus;
  detectedMove: Move | null;
  confidence: number;
  lockedMove: Move | null;
  hint: string;
  handDetected: boolean;
  rawGesture: string;
  debugInfo: string;
}

// ── Vector math helpers ──
const sub = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
const dot = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x * b.x + a.y * b.y;
const mag = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
const norm = (v: { x: number; y: number }) => {
  const m = mag(v) || 1;
  return { x: v.x / m, y: v.y / m };
};

type RawGesture = "no_hand" | "unclear" | "def" | "1" | "2" | "3" | "4" | "5";
const VALID_GESTURES: RawGesture[] = ["def", "1", "2", "3", "4", "5"];

// ── Orientation-aware finger classifier ──
// Uses MCP→PIP axis projection so it works even when hand is rotated/tilted.
function classifyGesture(
  landmarks: Array<{ x: number; y: number; z: number }> | undefined
): RawGesture {
  if (!landmarks || landmarks.length < 21) return "no_hand";

  // Finger definitions: [MCP, PIP, TIP]
  const fingers: [number, number, number][] = [
    [5, 6, 8],   // index
    [9, 10, 12], // middle
    [13, 14, 16],// ring
    [17, 18, 20],// pinky
  ];

  let extendedCount = 0;

  for (const [mcp, pip, tip] of fingers) {
    const axis = norm(sub(landmarks[pip], landmarks[mcp]));
    const tipProjection = dot(sub(landmarks[tip], landmarks[pip]), axis);
    const baseLen = dot(sub(landmarks[pip], landmarks[mcp]), axis);

    // Finger is extended if tip projects beyond PIP along the MCP→PIP axis
    // and the extension is significant relative to the base segment
    if (tipProjection > 0.035 && tipProjection > baseLen * 0.5) {
      extendedCount++;
    }
  }

  // Thumb: check distance from tip(4) to IP(3) vs distance from tip(4) to index MCP(5)
  const thumbTipToIP = mag(sub(landmarks[4], landmarks[3]));
  const thumbTipToIndexMCP = mag(sub(landmarks[4], landmarks[5]));
  const thumbOpen = thumbTipToIP > 0.05 && thumbTipToIndexMCP > 0.08;

  // Classification
  if (extendedCount === 0 && !thumbOpen) return "def";
  if (extendedCount === 4 && thumbOpen) return "5";
  if (extendedCount >= 1 && extendedCount <= 4) return String(extendedCount) as RawGesture;

  return "unclear";
}

function rawGestureToMove(g: RawGesture): Move | null {
  if (g === "def") return "DEF";
  if (g === "1") return 1;
  if (g === "2") return 2;
  if (g === "3") return 3;
  if (g === "4") return 4;
  if (g === "5") return 5;
  return null;
}

const BUFFER_SIZE = 8;
const STABILITY_THRESHOLD = 4; // need 4 of 8 frames agreeing

const HINTS: Record<string, string> = {
  no_hand: "Center your hand in the camera",
  detecting: "Hold still — detecting gesture…",
  stable: "Stable — ready to lock!",
  unclear: "Show palm/fingers clearly",
};

export function useHandDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<HandDetectionState>({
    status: "loading",
    detectedMove: null,
    confidence: 0,
    lockedMove: null,
    hint: "",
    handDetected: false,
    rawGesture: "no_hand",
    debugInfo: "",
  });

  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const buffer = useRef<RawGesture[]>([]);
  const isRunning = useRef(false);
  const frameSkip = useRef(0);

  const onResults = useCallback((results: any) => {
    const lm = results.multiHandLandmarks?.[0];
    const raw = classifyGesture(lm);

    // Update rolling buffer
    buffer.current = [...buffer.current.slice(-(BUFFER_SIZE - 1)), raw];

    const hasHand = buffer.current.some((v) => v !== "no_hand");

    // Count votes
    const counts: Record<string, number> = {};
    for (const g of buffer.current) {
      counts[g] = (counts[g] || 0) + 1;
    }

    // Find majority (excluding no_hand and unclear)
    let majority: RawGesture = "no_hand";
    let majorityVotes = 0;
    for (const [gesture, votes] of Object.entries(counts)) {
      if (gesture !== "no_hand" && gesture !== "unclear" && votes > majorityVotes) {
        majority = gesture as RawGesture;
        majorityVotes = votes;
      }
    }

    const confidence = majorityVotes / BUFFER_SIZE;
    const isStable = VALID_GESTURES.includes(majority) && majorityVotes >= STABILITY_THRESHOLD;
    const move = isStable ? rawGestureToMove(majority) : null;

    let status: GestureStatus;
    let hint: string;

    if (!hasHand) {
      status = "no_hand";
      hint = HINTS.no_hand;
    } else if (isStable) {
      status = "stable";
      hint = HINTS.stable;
    } else {
      status = "detecting";
      hint = majority !== "no_hand" && majority !== "unclear"
        ? `Detecting ${majority.toUpperCase()}… hold steady`
        : HINTS.unclear;
    }

    const debugInfo = `raw:${raw} maj:${majority}(${majorityVotes}/${BUFFER_SIZE}) buf:[${buffer.current.join(",")}]`;

    setState((s) => ({
      ...s,
      status,
      detectedMove: move,
      confidence,
      handDetected: hasHand,
      rawGesture: raw,
      hint,
      debugInfo,
    }));
  }, []);

  const startDetection = useCallback(async () => {
    if (isRunning.current || !videoRef.current) return;

    try {
      const { Hands } = await import("@mediapipe/hands");

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.4,
      });

      hands.onResults(onResults);
      handsRef.current = hands;
      isRunning.current = true;
      buffer.current = [];

      setState((s) => ({ ...s, status: "ready", hint: "Show your hand to start" }));

      const processFrame = async () => {
        if (!isRunning.current || !videoRef.current) return;

        // Process every other frame on mobile for perf
        frameSkip.current++;
        if (frameSkip.current % 2 === 0 && videoRef.current.readyState >= 2) {
          try {
            await handsRef.current?.send({ image: videoRef.current });
          } catch {
            // frame skip
          }
        }
        animFrameRef.current = requestAnimationFrame(processFrame);
      };

      setTimeout(() => processFrame(), 500);
    } catch (err) {
      console.error("Hand detection init failed:", err);
      setState((s) => ({ ...s, status: "ready", hint: "Hand tracking unavailable" }));
    }
  }, [videoRef, onResults]);

  const lockMove = useCallback(() => {
    setState((s) => ({
      ...s,
      lockedMove: s.detectedMove,
    }));
    return state.detectedMove;
  }, [state.detectedMove]);

  const unlockMove = useCallback(() => {
    setState((s) => ({ ...s, lockedMove: null }));
  }, []);

  const stopDetection = useCallback(() => {
    isRunning.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return { ...state, startDetection, stopDetection, lockMove, unlockMove };
}
