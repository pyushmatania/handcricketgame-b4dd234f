import { useEffect, useRef, useCallback } from "react";

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: { x: number; y: number }[];
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  exploded: boolean;
  color: string;
}

const COLORS = {
  win: ["#FFD700", "#FF6B35", "#FF1493", "#00BFFF", "#7FFF00", "#FF4500", "#DA70D6"],
  wicket: ["#FF0000", "#FF4500", "#FF6347", "#DC143C", "#FF2400", "#B22222"],
  four: ["#00BFFF", "#1E90FF", "#4169E1", "#87CEEB", "#FFD700"],
  six: ["#FFD700", "#FFA500", "#FF6B35", "#FF1493", "#7FFF00", "#00FF7F", "#FF4500"],
};

export type FireworkType = "win" | "wicket" | "four" | "six";

interface CanvasFireworksProps {
  type: FireworkType | null;
  duration?: number;
}

export default function CanvasFireworks({ type, duration = 3000 }: CanvasFireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const activeRef = useRef(false);

  const spawnRocket = useCallback((colors: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rocketsRef.current.push({
      x: Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
      y: canvas.height,
      vy: -(8 + Math.random() * 4),
      targetY: canvas.height * (0.15 + Math.random() * 0.35),
      exploded: false,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }, []);

  const explode = useCallback((x: number, y: number, color: string, count: number) => {
    const colors = COLORS[type || "win"];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4;
      const c = Math.random() > 0.3 ? color : colors[Math.floor(Math.random() * colors.length)];
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        color: c,
        size: 2 + Math.random() * 2,
        trail: [],
      });
    }
  }, [type]);

  useEffect(() => {
    if (!type) {
      activeRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    particlesRef.current = [];
    rocketsRef.current = [];
    activeRef.current = true;
    startTimeRef.current = performance.now();

    const colors = COLORS[type];
    const rocketCount = type === "win" ? 8 : type === "six" ? 5 : type === "wicket" ? 4 : 3;
    const waves = type === "win" ? 4 : type === "six" ? 3 : 2;

    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        if (!activeRef.current) return;
        for (let i = 0; i < rocketCount; i++) {
          setTimeout(() => spawnRocket(colors), i * 120);
        }
      }, w * 600);
    }

    const animate = () => {
      if (!activeRef.current) return;
      const elapsed = performance.now() - startTimeRef.current;
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      ctx.clearRect(0, 0, w, h);

      // Update rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const r = rocketsRef.current[i];
        if (!r.exploded) {
          r.y += r.vy;
          // Draw rocket trail
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.fill();
          // Sparkle trail
          ctx.beginPath();
          ctx.arc(r.x + (Math.random() - 0.5) * 4, r.y + 8, 1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,200,0.6)";
          ctx.fill();

          if (r.y <= r.targetY) {
            r.exploded = true;
            const particleCount = type === "win" ? 80 : type === "six" ? 60 : 40;
            explode(r.x, r.y, r.color, particleCount);
          }
        }
      }
      rocketsRef.current = rocketsRef.current.filter(r => !r.exploded);

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.985;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const alpha = p.life;
        
        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = p.color + Math.floor(alpha * 80).toString(16).padStart(2, "0");
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      if (elapsed < duration || particlesRef.current.length > 0 || rocketsRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        activeRef.current = false;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [type, duration, spawnRocket, explode]);

  if (!type) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
