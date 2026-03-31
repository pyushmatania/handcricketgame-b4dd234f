import { useState, useCallback, useRef, useEffect } from "react";
import type { Move } from "./useHandCricket";

export type GestureStatus =
  | "idle"
  | "loading_model"
  | "camera_started"
  | "tracking_active"
  | "tracking_unavailable"
  | "no_hand"
  | "detecting"
  | "stable"
  | "captured"
  | "cooldown";

export interface HandDetectionState {
  status: GestureStatus;
  detectedMove: Move | null;
  confidence: number;
  capturedMove: Move | null;
  hint: string;
  handDetected: boolean;
  rawGesture: string;
  debugInfo: string;
}

declare global {
  interface Window {
    Hands?: any;
  }
}

const MEDIAPIPE_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
];

const scriptLoadCache = new Map<string, Promise<void>>();

function loadScriptOnce(src: string): Promise<void> {
  const cached = scriptLoadCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const isHandsScript = src.includes("@mediapipe/hands/hands.js");

    if (existing?.dataset.loaded === "1") { resolve(); return; }
    if (isHandsScript && window.Hands) { script.dataset.loaded = "1"; resolve(); return; }

    const cleanup = () => { script.removeEventListener("load", onLoad); script.removeEventListener("error", onError); };
    const onLoad = () => { script.dataset.loaded = "1"; cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error(`Failed to load: ${src}`)); };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existing) {
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });

  scriptLoadCache.set(src, promise);
  return promise;
}

async function ensureMediaPipeReady() {
  await Promise.all(MEDIAPIPE_SCRIPTS.map(loadScriptOnce));
  if (!window.Hands) throw new Error("MediaPipe Hands global failed to initialize");
}

async function ensureVideoPlayable(video: HTMLVideoElement) {
  if (!video.srcObject) throw new Error("Camera stream not attached");
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve) => {
      const onReady = () => { video.removeEventListener("loadeddata", onReady); video.removeEventListener("canplay", onReady); resolve(); };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("canplay", onReady, { once: true });
      setTimeout(() => { resolve(); }, 1500);
    });
  }
  if (video.paused) await video.play();
}

// Vector math
const sub = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.x + a.y * b.y;
const mag = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
const norm = (v: { x: number; y: number }) => { const m = mag(v) || 1; return { x: v.x / m, y: v.y / m }; };

type RawGesture = "no_hand" | "unclear" | "def" | "1" | "2" | "3" | "4" | "5";
const VALID_GESTURES: RawGesture[] = ["def", "1", "2", "3", "4", "5"];

function classifyGesture(landmarks: Array<{ x: number; y: number; z: number }> | undefined): RawGesture {
  if (!landmarks || landmarks.length < 21) return "no_hand";

  const fingers: [number, number, number][] = [
    [5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20],
  ];

  let extendedCount = 0;
  for (const [mcp, pip, tip] of fingers) {
    const axis = norm(sub(landmarks[pip], landmarks[mcp]));
    const tipProjection = dot(sub(landmarks[tip], landmarks[pip]), axis);
    const baseLen = dot(sub(landmarks[pip], landmarks[mcp]), axis);
    if (tipProjection > 0.035 && tipProjection > baseLen * 0.5) extendedCount++;
  }

  const thumbTipToIP = mag(sub(landmarks[4], landmarks[3]));
  const thumbTipToIndexMCP = mag(sub(landmarks[4], landmarks[5]));
  const thumbOpen = thumbTipToIP > 0.05 && thumbTipToIndexMCP > 0.08;

  if (extendedCount === 0 && !thumbOpen) return "def";
  if (extendedCount === 4 && thumbOpen) return "5";
  if (extendedCount >= 1 && extendedCount <= 4) return String(extendedCount) as RawGesture;
  return "unclear";
}

function rawGestureToMove(g: RawGesture): Move | null {
  if (g === "def") return "DEF";
  if (["1", "2", "3", "4", "5"].includes(g)) return Number(g) as Move;
  return null;
}

const BUFFER_SIZE = 8;
const STABILITY_THRESHOLD = 5;
const AUTO_CAPTURE_FRAMES = 6; // frames of stability before auto-capture
const COOLDOWN_MS = 1200;

export function useHandDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<HandDetectionState>({
    status: "idle",
    detectedMove: null,
    confidence: 0,
    capturedMove: null,
    hint: "Waiting for camera",
    handDetected: false,
    rawGesture: "no_hand",
    debugInfo: "stage:idle",
  });

  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const buffer = useRef<RawGesture[]>([]);
  const isRunning = useRef(false);
  const isStarting = useRef(false);
  const sendingRef = useRef(false);
  const consecutiveSendErrors = useRef(0);
  const stableFrameCount = useRef(0);
  const lastStableGesture = useRef<RawGesture | null>(null);
  const cooldownRef = useRef(false);
  const onAutoCaptureRef = useRef<((move: Move) => void) | null>(null);

  const setOnAutoCapture = useCallback((cb: ((move: Move) => void) | null) => {
    onAutoCaptureRef.current = cb;
  }, []);

  const stopDetection = useCallback(() => {
    isRunning.current = false;
    isStarting.current = false;
    sendingRef.current = false;
    consecutiveSendErrors.current = 0;
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    if (handsRef.current) { handsRef.current.close?.(); handsRef.current = null; }
  }, []);

  const clearCaptured = useCallback(() => {
    setState((s) => ({ ...s, capturedMove: null, status: s.handDetected ? "detecting" : "no_hand" }));
  }, []);

  const onResults = useCallback((results: any) => {
    if (cooldownRef.current) return;

    const lm = results.multiHandLandmarks?.[0] as Array<{ x: number; y: number; z: number }> | undefined;
    const raw = classifyGesture(lm);

    buffer.current = [...buffer.current.slice(-(BUFFER_SIZE - 1)), raw];

    const counts: Record<string, number> = {};
    for (const g of buffer.current) counts[g] = (counts[g] || 0) + 1;

    let majority: RawGesture = "no_hand";
    let majorityVotes = 0;
    for (const [gesture, votes] of Object.entries(counts)) {
      if (gesture !== "no_hand" && gesture !== "unclear" && votes > majorityVotes) {
        majority = gesture as RawGesture;
        majorityVotes = votes;
      }
    }

    const hasHand = Boolean(lm);
    const bufferLen = Math.max(buffer.current.length, 1);
    const confidence = hasHand ? Math.round((majorityVotes / bufferLen) * 100) / 100 : 0;
    const isStable = VALID_GESTURES.includes(majority) && majorityVotes >= STABILITY_THRESHOLD;

    const leadingGesture = majority !== "no_hand" && majority !== "unclear" ? majority : raw;
    const liveMove = rawGestureToMove(leadingGesture);

    // Track stable frames for auto-capture
    if (isStable && majority === lastStableGesture.current) {
      stableFrameCount.current++;
    } else if (isStable) {
      lastStableGesture.current = majority;
      stableFrameCount.current = 1;
    } else {
      stableFrameCount.current = 0;
      lastStableGesture.current = null;
    }

    // Auto-capture
    if (isStable && stableFrameCount.current >= AUTO_CAPTURE_FRAMES) {
      const move = rawGestureToMove(majority);
      if (move !== null && onAutoCaptureRef.current) {
        cooldownRef.current = true;
        stableFrameCount.current = 0;
        lastStableGesture.current = null;

        setState((s) => ({
          ...s,
          status: "captured",
          detectedMove: move,
          capturedMove: move,
          confidence: 1,
          handDetected: hasHand,
          rawGesture: raw,
          hint: "Move captured!",
          debugInfo: `captured:${move}`,
        }));

        onAutoCaptureRef.current(move);

        setTimeout(() => {
          cooldownRef.current = false;
          buffer.current = [];
          setState((s) => ({ ...s, status: "cooldown", capturedMove: null, hint: "Get ready…" }));
        }, COOLDOWN_MS);

        return;
      }
    }

    let status: GestureStatus;
    let hint: string;

    if (!hasHand) {
      status = "no_hand";
      hint = "Show your hand";
    } else if (isStable) {
      status = "stable";
      hint = `${majority.toUpperCase()} detected`;
    } else {
      status = "detecting";
      hint = leadingGesture !== "unclear" && leadingGesture !== "no_hand"
        ? `Detecting ${leadingGesture.toUpperCase()}…`
        : "Hold steady";
    }

    setState((s) => ({
      ...s,
      status,
      detectedMove: liveMove,
      confidence,
      handDetected: hasHand,
      rawGesture: raw,
      hint,
      debugInfo: `hand:${hasHand} | raw:${raw} | maj:${majority}(${majorityVotes}) | stableFrames:${stableFrameCount.current}`,
    }));
  }, []);

  const startDetection = useCallback(async () => {
    const video = videoRef.current;
    if (isRunning.current || isStarting.current || !video) return;

    isStarting.current = true;
    buffer.current = [];
    stableFrameCount.current = 0;
    lastStableGesture.current = null;
    consecutiveSendErrors.current = 0;
    cooldownRef.current = false;

    setState((s) => ({ ...s, status: "loading_model", detectedMove: null, confidence: 0, capturedMove: null, handDetected: false, rawGesture: "no_hand", hint: "Loading model…", debugInfo: "stage:loading_model" }));

    try {
      await ensureMediaPipeReady();
      const HandsCtor = window.Hands;
      if (!HandsCtor) throw new Error("Hands constructor unavailable");

      const hands = new HandsCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.5, minTrackingConfidence: 0.4 });
      hands.onResults(onResults);
      handsRef.current = hands;

      setState((s) => ({ ...s, status: "camera_started", hint: "Camera started", debugInfo: "stage:camera_started" }));
      await ensureVideoPlayable(video);

      isRunning.current = true;
      setState((s) => ({ ...s, status: "tracking_active", hint: "Show your hand", debugInfo: "stage:tracking_active" }));

      const processFrame = async () => {
        if (!isRunning.current) return;
        animFrameRef.current = requestAnimationFrame(processFrame);

        const activeVideo = videoRef.current;
        if (!activeVideo || !handsRef.current || sendingRef.current) return;
        if (activeVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || activeVideo.videoWidth === 0) return;

        try {
          sendingRef.current = true;
          await handsRef.current.send({ image: activeVideo });
          consecutiveSendErrors.current = 0;
        } catch (error) {
          consecutiveSendErrors.current++;
          if (consecutiveSendErrors.current >= 20) {
            isRunning.current = false;
            setState((s) => ({ ...s, status: "tracking_unavailable", hint: "Tracking unavailable", debugInfo: `send_errors:${consecutiveSendErrors.current}` }));
          }
        } finally {
          sendingRef.current = false;
        }
      };

      processFrame();
    } catch (err) {
      console.error("Hand detection init failed:", err);
      stopDetection();
      setState((s) => ({ ...s, status: "tracking_unavailable", hint: "Tracking unavailable", debugInfo: `error:${err instanceof Error ? err.message : "unknown"}` }));
    } finally {
      isStarting.current = false;
    }
  }, [onResults, stopDetection, videoRef]);

  useEffect(() => { return () => { stopDetection(); }; }, [stopDetection]);

  return { ...state, startDetection, stopDetection, clearCaptured, setOnAutoCapture };
}
