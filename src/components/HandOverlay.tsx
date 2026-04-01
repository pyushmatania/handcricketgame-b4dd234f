import { useRef, useEffect, useCallback } from "react";
import type { GestureStatus } from "@/hooks/useHandDetection";

interface HandOverlayProps {
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  videoWidth: number;
  videoHeight: number;
  status: GestureStatus;
  gloveStyle: "cricket" | "neon" | "outline" | "off";
  mirrored?: boolean;
}

// Finger connections for drawing
const FINGER_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],     // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17],                              // palm base
];

const PALM_INDICES = [0, 1, 5, 9, 13, 17];
const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

const GLOVE_COLORS = {
  cricket: {
    palm: "hsla(45, 95%, 58%, 0.18)",
    palmStroke: "hsla(45, 95%, 58%, 0.5)",
    bone: "hsla(45, 80%, 65%, 0.6)",
    joint: "hsla(45, 95%, 58%, 0.8)",
    tip: "hsla(4, 85%, 58%, 0.9)",
    aura: "hsla(45, 95%, 58%, 0.12)",
  },
  neon: {
    palm: "hsla(145, 80%, 50%, 0.15)",
    palmStroke: "hsla(145, 80%, 50%, 0.6)",
    bone: "hsla(180, 100%, 60%, 0.7)",
    joint: "hsla(145, 80%, 50%, 0.9)",
    tip: "hsla(280, 100%, 70%, 0.9)",
    aura: "hsla(145, 80%, 50%, 0.1)",
  },
  outline: {
    palm: "hsla(210, 90%, 56%, 0.08)",
    palmStroke: "hsla(210, 90%, 56%, 0.5)",
    bone: "hsla(210, 90%, 70%, 0.5)",
    joint: "hsla(210, 90%, 56%, 0.7)",
    tip: "hsla(210, 90%, 80%, 0.8)",
    aura: "hsla(210, 90%, 56%, 0.08)",
  },
};

export default function HandOverlay({
  landmarks,
  videoWidth,
  videoHeight,
  status,
  gloveStyle,
  mirrored = false,
}: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevLandmarks = useRef<Array<{ x: number; y: number }> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || gloveStyle === "off") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 21) {
      prevLandmarks.current = null;
      return;
    }

    const colors = GLOVE_COLORS[gloveStyle];
    const isStable = status === "captured" || status === "result";
    const isCaptured = status === "captured";

    // Convert normalized landmarks to pixel coords with smoothing
    const pts = landmarks.map((lm, i) => {
      let px = lm.x * videoWidth;
      let py = lm.y * videoHeight;
      if (mirrored) px = videoWidth - px;

      // Smooth with previous frame
      if (prevLandmarks.current && prevLandmarks.current[i]) {
        const prev = prevLandmarks.current[i];
        px = prev.x * 0.3 + px * 0.7;
        py = prev.y * 0.3 + py * 0.7;
      }
      return { x: px, y: py };
    });
    prevLandmarks.current = pts;

    // Palm size for scaling
    const palmSize = Math.hypot(pts[0].x - pts[9].x, pts[0].y - pts[9].y);
    const jointRadius = Math.max(3, palmSize * 0.04);
    const tipRadius = Math.max(4, palmSize * 0.055);
    const boneWidth = Math.max(2, palmSize * 0.025);

    // Aura glow around entire hand
    const centerX = (pts[0].x + pts[5].x + pts[9].x + pts[13].x + pts[17].x) / 5;
    const centerY = (pts[0].y + pts[5].y + pts[9].y + pts[13].y + pts[17].y) / 5;
    const auraRadius = palmSize * (isCaptured ? 1.8 : 1.4);

    const auraGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, auraRadius);
    auraGrad.addColorStop(0, isCaptured ? colors.tip.replace(/[\d.]+\)$/, "0.25)") : colors.aura);
    auraGrad.addColorStop(1, "transparent");
    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Palm polygon fill
    ctx.beginPath();
    const palmPts = PALM_INDICES.map((i) => pts[i]);
    ctx.moveTo(palmPts[0].x, palmPts[0].y);
    palmPts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = colors.palm;
    ctx.fill();
    ctx.strokeStyle = colors.palmStroke;
    ctx.lineWidth = boneWidth * 0.8;
    ctx.stroke();

    // Bone connections
    ctx.lineWidth = boneWidth;
    ctx.lineCap = "round";
    for (const [a, b] of FINGER_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);

      if (gloveStyle === "neon") {
        ctx.shadowColor = colors.bone;
        ctx.shadowBlur = 8;
      }
      ctx.strokeStyle = colors.bone;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Joint dots
    for (let i = 0; i < 21; i++) {
      const isTip = FINGERTIP_INDICES.includes(i);
      const r = isTip ? tipRadius : jointRadius;
      const color = isTip ? colors.tip : colors.joint;

      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;

      if (gloveStyle === "neon") {
        ctx.shadowColor = color;
        ctx.shadowBlur = isTip ? 12 : 6;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Stable ring pulse on palm center
    if (isStable) {
      const pulsePhase = (Date.now() % 1500) / 1500;
      const pulseR = palmSize * (0.3 + pulsePhase * 0.4);
      const pulseAlpha = 0.5 * (1 - pulsePhase);
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = isCaptured
        ? `hsla(4, 85%, 58%, ${pulseAlpha})`
        : `hsla(145, 80%, 50%, ${pulseAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Capture flash burst
    if (isCaptured) {
      for (const ti of FINGERTIP_INDICES) {
        const sparkR = tipRadius * 2.5;
        const grad = ctx.createRadialGradient(pts[ti].x, pts[ti].y, 0, pts[ti].x, pts[ti].y, sparkR);
        grad.addColorStop(0, "hsla(45, 95%, 70%, 0.6)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(pts[ti].x - sparkR, pts[ti].y - sparkR, sparkR * 2, sparkR * 2);
      }
    }
  }, [landmarks, videoWidth, videoHeight, status, gloveStyle, mirrored]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (gloveStyle === "off" || !landmarks) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[4]"
      style={{ objectFit: "cover" }}
    />
  );
}
