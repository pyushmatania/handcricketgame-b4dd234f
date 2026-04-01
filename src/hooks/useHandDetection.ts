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

// === 3D Vector math ===
type V3 = { x: number; y: number; z: number };
const V = (a: V3, b: V3): V3 => ({ x: b.x - a.x, y: b.y - a.y, z: (b.z ?? 0) - (a.z ?? 0) });
const D = (a: V3, b: V3) => Math.hypot(b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0));
const dot3 = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const mag3 = (a: V3) => Math.hypot(a.x, a.y, a.z);
const norm3 = (a: V3): V3 => { const m = mag3(a) || 1; return { x: a.x / m, y: a.y / m, z: a.z / m }; };
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

function angle(a: V3, b: V3, c: V3): number {
  const ab = norm3(V(b, a));
  const cb = norm3(V(b, c));
  return Math.acos(Math.max(-1, Math.min(1, dot3(ab, cb))));
}

// Per-finger extension using joint angles + reach heuristic
function isFingerExtended(
  lm: V3[], mcp: number, pip: number, dip: number, tip: number, wrist = 0
): boolean {
  const a1 = angle(lm[mcp], lm[pip], lm[dip]);
  const a2 = angle(lm[pip], lm[dip], lm[tip]);
  // Angles > ~140° mean roughly straight joints
  const straight = a1 > 2.45 && a2 > 2.35;
  // Tip must be farther from wrist than PIP
  const reach = D(lm[tip], lm[wrist]) > D(lm[pip], lm[wrist]) * 1.16;
  return straight && reach;
}

// Thumb uses splay from palm plane + distance heuristics
function isThumbExtended(lm: V3[], _handedness: "Left" | "Right" = "Right"): boolean {
  const palmCenter: V3 = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    z: ((lm[0].z ?? 0) + (lm[5].z ?? 0) + (lm[9].z ?? 0) + (lm[13].z ?? 0) + (lm[17].z ?? 0)) / 5,
  };
  const palmNormal = norm3(cross(V(lm[0], lm[5]), V(lm[0], lm[17])));
  const thumbDir = norm3(V(lm[2], lm[4]));

  // Splay: thumb direction should NOT be purely along palm normal (i.e. it's sticking out sideways)
  const splay = Math.abs(dot3(thumbDir, palmNormal)) < 0.72;
  // Open: thumb tip is farther from palm center than thumb IP
  const open = D(lm[4], palmCenter) > D(lm[3], palmCenter) * 1.12
    && D(lm[4], lm[5]) > D(lm[3], lm[5]) * 1.1;
  // Lateral check: thumb tip should be laterally away from thumb MCP
  const side = (_handedness === "Right" ? 1 : -1) * (lm[4].x - lm[2].x) > -0.01;

  return splay && open && side;
}

type RawGesture = "no_hand" | "unclear" | "def" | "1" | "2" | "3" | "4" | "5";
const VALID_GESTURES: RawGesture[] = ["def", "1", "2", "3", "4", "5"];

function classifyGesture(landmarks: V3[] | undefined): RawGesture {
  if (!landmarks || landmarks.length < 21) return "no_hand";

  const lm = landmarks;
  const index = isFingerExtended(lm, 5, 6, 7, 8);
  const middle = isFingerExtended(lm, 9, 10, 11, 12);
  const ring = isFingerExtended(lm, 13, 14, 15, 16);
  const pinky = isFingerExtended(lm, 17, 18, 19, 20);
  const thumb = isThumbExtended(lm);

  // Fist detection: all fingertips close to palm center
  const palmCenter: V3 = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    z: ((lm[0].z ?? 0) + (lm[5].z ?? 0) + (lm[9].z ?? 0) + (lm[13].z ?? 0) + (lm[17].z ?? 0)) / 5,
  };
  const fistish = [4, 8, 12, 16, 20].every((i) => D(lm[i], palmCenter) < 0.19);

  const extended = [thumb, index, middle, ring, pinky].filter(Boolean).length;

  // Priority mapping: 4 (thumb folded) before 5
  if (index && middle && ring && pinky && !thumb) return "4";
  if (thumb && index && middle && ring && pinky) return "5";
  if (fistish || extended === 0) return "def";
  if (index && !middle && !ring && !pinky) return "1";
  if (index && middle && !ring && !pinky) return "2";
  if (index && middle && ring && !pinky) return "3";

  // Fallback: use count but be cautious
  if (extended >= 1 && extended <= 5) return String(extended) as RawGesture;
  return "unclear";
}

function rawGestureToMove(g: RawGesture): Move | null {
  if (g === "def") return "DEF";
  if (["1", "2", "3", "4", "5"].includes(g)) return Number(g) as Move;
  return null;
}

// Tuning constants — increased for better stability and pacing
const BUFFER_SIZE = 10;
const STABILITY_THRESHOLD = 7;
const AUTO_CAPTURE_FRAMES = 8;
const COOLDOWN_MS = 1800;

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
