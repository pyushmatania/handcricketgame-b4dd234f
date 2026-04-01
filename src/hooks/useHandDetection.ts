import { useState, useCallback, useRef, useEffect } from "react";
import type { Move } from "./useHandCricket";

export type GamePhase =
  | "idle"
  | "loading_model"
  | "camera_started"
  | "tracking_active"
  | "tracking_unavailable"
  | "wait_for_fist"
  | "countdown"
  | "wait_for_motion"
  | "detecting"
  | "captured"
  | "result"
  | "cooldown";

// Keep old GestureStatus as alias for compatibility
export type GestureStatus = GamePhase;

export interface HandDetectionState {
  status: GamePhase;
  detectedMove: Move | null;
  confidence: number;
  capturedMove: Move | null;
  hint: string;
  handDetected: boolean;
  rawGesture: string;
  debugInfo: string;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  phase: GamePhase;
  countdownValue: number | null;
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
    if (!existing) { script.src = src; script.async = true; script.crossOrigin = "anonymous"; document.head.appendChild(script); }
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
      setTimeout(() => resolve(), 1500);
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

function isFingerExtended(lm: V3[], mcp: number, pip: number, dip: number, tip: number, wrist = 0): boolean {
  const a1 = angle(lm[mcp], lm[pip], lm[dip]);
  const a2 = angle(lm[pip], lm[dip], lm[tip]);
  const straight = a1 > 2.45 && a2 > 2.35;
  const reach = D(lm[tip], lm[wrist]) > D(lm[pip], lm[wrist]) * 1.16;
  return straight && reach;
}

function isThumbExtended(lm: V3[], _handedness: "Left" | "Right" = "Right"): boolean {
  const palmCenter: V3 = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    z: ((lm[0].z ?? 0) + (lm[5].z ?? 0) + (lm[9].z ?? 0) + (lm[13].z ?? 0) + (lm[17].z ?? 0)) / 5,
  };
  const palmNormal = norm3(cross(V(lm[0], lm[5]), V(lm[0], lm[17])));
  const thumbDir = norm3(V(lm[2], lm[4]));
  const splay = Math.abs(dot3(thumbDir, palmNormal)) < 0.72;
  const open = D(lm[4], palmCenter) > D(lm[3], palmCenter) * 1.12 && D(lm[4], lm[5]) > D(lm[3], lm[5]) * 1.1;
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
  const palmCenter: V3 = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
    z: ((lm[0].z ?? 0) + (lm[5].z ?? 0) + (lm[9].z ?? 0) + (lm[13].z ?? 0) + (lm[17].z ?? 0)) / 5,
  };
  const fistish = [4, 8, 12, 16, 20].every((i) => D(lm[i], palmCenter) < 0.19);
  const extended = [thumb, index, middle, ring, pinky].filter(Boolean).length;
  if (index && middle && ring && pinky && !thumb) return "4";
  if (thumb && index && middle && ring && pinky) return "5";
  if (fistish || extended === 0) return "def";
  if (index && !middle && !ring && !pinky) return "1";
  if (index && middle && !ring && !pinky) return "2";
  if (index && middle && ring && !pinky) return "3";
  if (extended >= 1 && extended <= 5) return String(extended) as RawGesture;
  return "unclear";
}

function rawGestureToMove(g: RawGesture): Move | null {
  if (g === "def") return "DEF";
  if (["1", "2", "3", "4", "5"].includes(g)) return Number(g) as Move;
  return null;
}

// === Timing constants ===
const FIST_STABLE_FRAMES = 8;
const MOTION_THRESHOLD = 0.035;
const DETECT_WINDOW_MS = 1500;
const STABLE_FRAMES_NEEDED = 6;
const CAPTURE_DISPLAY_MS = 500;
const RESULT_DISPLAY_MS = 1200;
const COOLDOWN_MS = 2000;
const COUNTDOWN_MS = 3000;

// Motion detection: compare key landmarks between frames
function computeMotion(prev: V3[] | null, curr: V3[] | null): number {
  if (!prev || !curr || prev.length < 21 || curr.length < 21) return 1;
  // Check wrist(0), index_mcp(5), middle_mcp(9), ring_mcp(13)
  const keys = [0, 5, 9, 13];
  let total = 0;
  for (const k of keys) {
    total += Math.hypot(curr[k].x - prev[k].x, curr[k].y - prev[k].y);
  }
  return total;
}

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
    landmarks: null,
    phase: "idle",
    countdownValue: null,
  });

  const handsRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const isRunning = useRef(false);
  const isStarting = useRef(false);
  const sendingRef = useRef(false);
  const consecutiveSendErrors = useRef(0);

  // State machine refs
  const phaseRef = useRef<GamePhase>("idle");
  const prevLandmarksRef = useRef<V3[] | null>(null);
  const fistFrameCount = useRef(0);
  const detectUntilRef = useRef(0);
  const stableCount = useRef(0);
  const lastStableGesture = useRef<RawGesture | "">("");
  const unlockAtRef = useRef(0);
  const onAutoCaptureRef = useRef<((move: Move) => void) | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPhase = useCallback((phase: GamePhase, hint: string, extra?: Partial<HandDetectionState>) => {
    phaseRef.current = phase;
    setState((s) => ({ ...s, status: phase, phase, hint, ...extra }));
  }, []);

  const setOnAutoCapture = useCallback((cb: ((move: Move) => void) | null) => {
    onAutoCaptureRef.current = cb;
  }, []);

  const stopDetection = useCallback(() => {
    isRunning.current = false;
    isStarting.current = false;
    sendingRef.current = false;
    consecutiveSendErrors.current = 0;
    if (countdownTimerRef.current) { clearTimeout(countdownTimerRef.current); countdownTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    if (handsRef.current) { handsRef.current.close?.(); handsRef.current = null; }
  }, []);

  const clearCaptured = useCallback(() => {
    setState((s) => ({ ...s, capturedMove: null }));
  }, []);

  // Reset phase machine for a new game
  const resetToFist = useCallback(() => {
    fistFrameCount.current = 0;
    stableCount.current = 0;
    lastStableGesture.current = "";
    prevLandmarksRef.current = null;
    unlockAtRef.current = 0;
    detectUntilRef.current = 0;
    setPhase("wait_for_fist", "Show FIST ✊ to start", { 
      detectedMove: null, capturedMove: null, confidence: 0, countdownValue: null 
    });
  }, [setPhase]);

  // Start the countdown sequence
  const startCountdown = useCallback(() => {
    setPhase("countdown", "3…", { countdownValue: 3 });
    
    countdownTimerRef.current = setTimeout(() => {
      setPhase("countdown", "2…", { countdownValue: 2 });
      countdownTimerRef.current = setTimeout(() => {
        setPhase("countdown", "1…", { countdownValue: 1 });
        countdownTimerRef.current = setTimeout(() => {
          // Transition to wait_for_motion
          stableCount.current = 0;
          lastStableGesture.current = "";
          prevLandmarksRef.current = null;
          setPhase("wait_for_motion", "Move your hand ✋", { countdownValue: null });
        }, 1000);
      }, 1000);
    }, 1000);
  }, [setPhase]);

  // Called after result is shown, starts cooldown then goes back to wait_for_motion
  const startCooldown = useCallback(() => {
    setPhase("cooldown", "Next ball…", { countdownValue: null });
    countdownTimerRef.current = setTimeout(() => {
      stableCount.current = 0;
      lastStableGesture.current = "";
      prevLandmarksRef.current = null;
      setPhase("wait_for_motion", "Move your hand ✋", { detectedMove: null, capturedMove: null, confidence: 0 });
    }, COOLDOWN_MS);
  }, [setPhase]);

  const onResults = useCallback((results: any) => {
    const now = performance.now();
    const phase = phaseRef.current;
    const lm = results.multiHandLandmarks?.[0] as V3[] | undefined;
    const hasHand = Boolean(lm);
    const raw = classifyGesture(lm);
    const motion = computeMotion(prevLandmarksRef.current, lm ?? null);
    if (lm) prevLandmarksRef.current = [...lm];

    // Always update hand presence and landmarks for overlay
    setState((s) => ({
      ...s,
      handDetected: hasHand,
      rawGesture: raw,
      landmarks: lm ? [...lm] : null,
      debugInfo: `phase:${phase} | raw:${raw} | motion:${motion.toFixed(3)} | fist:${fistFrameCount.current} | stable:${stableCount.current}`,
    }));

    // If locked (post-capture/result/cooldown timers running), ignore classification
    if (now < unlockAtRef.current) return;

    // === WAIT_FOR_FIST: detect stable fist ===
    if (phase === "wait_for_fist") {
      if (raw === "def" && hasHand && motion < MOTION_THRESHOLD * 3) {
        fistFrameCount.current++;
      } else {
        fistFrameCount.current = 0;
      }
      if (fistFrameCount.current >= FIST_STABLE_FRAMES) {
        fistFrameCount.current = 0;
        startCountdown();
      }
      return;
    }

    // === COUNTDOWN: ignore all input ===
    if (phase === "countdown") return;

    // === WAIT_FOR_MOTION: wait for significant hand movement ===
    if (phase === "wait_for_motion") {
      if (hasHand && motion > MOTION_THRESHOLD) {
        // Motion detected! Open detection window
        detectUntilRef.current = now + DETECT_WINDOW_MS;
        stableCount.current = 0;
        lastStableGesture.current = "";
        setPhase("detecting", "Detecting…");
      }
      return;
    }

    // === DETECTING: classify within time window ===
    if (phase === "detecting") {
      if (now > detectUntilRef.current) {
        // Detection window expired without stable gesture
        stableCount.current = 0;
        lastStableGesture.current = "";
        setPhase("wait_for_motion", "Move your hand ✋", { detectedMove: null, confidence: 0 });
        return;
      }

      if (!hasHand || raw === "no_hand" || raw === "unclear") {
        stableCount.current = 0;
        lastStableGesture.current = "";
        setState((s) => ({ ...s, detectedMove: null, confidence: 0 }));
        return;
      }

      // Track stability
      if (raw === lastStableGesture.current) {
        stableCount.current++;
      } else {
        lastStableGesture.current = raw;
        stableCount.current = 1;
      }

      const confidence = Math.min(stableCount.current / STABLE_FRAMES_NEEDED, 1);
      const liveMove = rawGestureToMove(raw);
      setState((s) => ({ ...s, detectedMove: liveMove, confidence }));

      // Check if stable enough to capture
      if (stableCount.current >= STABLE_FRAMES_NEEDED && VALID_GESTURES.includes(raw)) {
        const move = rawGestureToMove(raw);
        if (move !== null) {
          // === CAPTURE! ===
          unlockAtRef.current = now + CAPTURE_DISPLAY_MS + RESULT_DISPLAY_MS + COOLDOWN_MS + 500;
          
          setPhase("captured", "Move captured!", {
            capturedMove: move,
            detectedMove: move,
            confidence: 1,
          });

          // After short display, fire callback and show result
          countdownTimerRef.current = setTimeout(() => {
            if (onAutoCaptureRef.current) {
              onAutoCaptureRef.current(move);
            }
            setPhase("result", "Result…");
            
            // After result display, start cooldown
            countdownTimerRef.current = setTimeout(() => {
              startCooldown();
            }, RESULT_DISPLAY_MS);
          }, CAPTURE_DISPLAY_MS);
        }
      }
      return;
    }

    // In captured/result/cooldown phases, do nothing (timers handle transitions)
  }, [setPhase, startCountdown, startCooldown]);

  const startDetection = useCallback(async () => {
    const video = videoRef.current;
    if (isRunning.current || isStarting.current || !video) return;

    isStarting.current = true;
    consecutiveSendErrors.current = 0;
    fistFrameCount.current = 0;

    setPhase("loading_model", "Loading model…");

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

      setPhase("camera_started", "Camera started");
      await ensureVideoPlayable(video);
      isRunning.current = true;

      // Go to wait_for_fist as initial game state
      resetToFist();

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
        } catch {
          consecutiveSendErrors.current++;
          if (consecutiveSendErrors.current >= 20) {
            isRunning.current = false;
            setPhase("tracking_unavailable", "Tracking unavailable");
          }
        } finally {
          sendingRef.current = false;
        }
      };
      processFrame();
    } catch (err) {
      console.error("Hand detection init failed:", err);
      stopDetection();
      setPhase("tracking_unavailable", "Tracking unavailable");
    } finally {
      isStarting.current = false;
    }
  }, [onResults, stopDetection, videoRef, setPhase, resetToFist]);

  useEffect(() => () => stopDetection(), [stopDetection]);

  return { ...state, startDetection, stopDetection, clearCaptured, setOnAutoCapture, resetToFist };
}
