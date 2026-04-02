import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BallResult } from "@/hooks/useHandCricket";

interface WagonWheelProps {
  ballHistory: BallResult[];
  isBatting: boolean;
  compact?: boolean;
}

// Map runs to shot directions (simulated — hand cricket doesn't have real directions)
function getShotAngle(ball: BallResult, index: number): number {
  const r = ball.runs === "OUT" ? 0 : typeof ball.runs === "number" ? Math.abs(ball.runs) : 0;
  // Use a deterministic pseudo-random based on index + runs for consistent display
  const seed = (index * 137 + r * 53) % 360;
  // Cluster shots by type: sixes go over the top, fours through covers, singles leg-side
  if (r === 6) return 340 + (seed % 40); // Over the bowler
  if (r === 4) return 30 + (seed % 120); // Off-side arc
  if (r === 3) return 200 + (seed % 60); // Leg-side deep
  if (r === 2) return 150 + (seed % 80); // Square
  if (r === 1) return 100 + (seed % 120); // All around
  return 0; // dots don't show
}

function getShotLength(runs: number | "OUT"): number {
  if (runs === "OUT") return 0;
  const r = typeof runs === "number" ? Math.abs(runs) : 0;
  if (r === 6) return 0.95;
  if (r === 4) return 0.82;
  if (r === 3) return 0.65;
  if (r === 2) return 0.5;
  if (r === 1) return 0.35;
  return 0;
}

function getShotColor(runs: number | "OUT"): string {
  if (runs === "OUT") return "hsl(var(--out-red))";
  const r = typeof runs === "number" ? Math.abs(runs) : 0;
  if (r === 6) return "hsl(var(--primary))";
  if (r === 4) return "hsl(var(--neon-green))";
  if (r === 3) return "hsl(var(--secondary))";
  if (r === 2) return "hsl(var(--accent))";
  if (r === 1) return "hsl(var(--muted-foreground))";
  return "transparent";
}

// Stats for radial chart
function getZoneStats(balls: BallResult[]) {
  const zones = [
    { label: "Off", range: [0, 90], runs: 0, shots: 0 },
    { label: "Cover", range: [90, 150], runs: 0, shots: 0 },
    { label: "Mid", range: [150, 210], runs: 0, shots: 0 },
    { label: "Leg", range: [210, 270], runs: 0, shots: 0 },
    { label: "Fine", range: [270, 330], runs: 0, shots: 0 },
    { label: "Straight", range: [330, 360], runs: 0, shots: 0 },
  ];
  balls.forEach((b, i) => {
    if (b.runs === "OUT" || b.runs === 0) return;
    const angle = getShotAngle(b, i);
    const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
    for (const z of zones) {
      if (angle >= z.range[0] && angle < z.range[1]) {
        z.runs += r;
        z.shots++;
        break;
      }
    }
  });
  return zones;
}

export default function WagonWheel({ ballHistory, isBatting, compact = false }: WagonWheelProps) {
  const [view, setView] = useState<"oval" | "radial">("oval");

  const scoringBalls = useMemo(() =>
    ballHistory.filter(b => {
      if (b.runs === "OUT") return false;
      const r = typeof b.runs === "number" ? (isBatting ? b.runs : -b.runs) : 0;
      return r > 0;
    }), [ballHistory, isBatting]);

  const zones = useMemo(() => getZoneStats(scoringBalls), [scoringBalls]);
  const maxZoneRuns = Math.max(...zones.map(z => z.runs), 1);

  const size = compact ? 140 : 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 12;

  if (scoringBalls.length === 0) return null;

  return (
    <div className="glass-premium rounded-xl p-2 space-y-1">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-2.5 rounded-full bg-gradient-to-b from-primary to-accent" />
          <span className="text-[7px] font-display font-bold tracking-[0.2em] text-muted-foreground">WAGON WHEEL</span>
        </div>
        <div className="flex gap-0.5">
          {(["oval", "radial"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[6px] font-display font-bold px-1.5 py-0.5 rounded-full transition-all tracking-wider ${
                view === v
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {v === "oval" ? "OVAL" : "RADIAL"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "oval" ? (
          <motion.div
            key="oval"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Ground oval */}
              <ellipse cx={cx} cy={cy} rx={radius} ry={radius * 0.85} fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
              {/* Inner circle (30-yard) */}
              <ellipse cx={cx} cy={cy} rx={radius * 0.45} ry={radius * 0.38} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3" />
              {/* Pitch */}
              <rect x={cx - 2} y={cy - 12} width="4" height="24" rx="1" fill="hsl(var(--secondary) / 0.15)" stroke="hsl(var(--secondary) / 0.3)" strokeWidth="0.5" />
              {/* Shot lines */}
              {scoringBalls.map((b, i) => {
                const angle = (getShotAngle(b, i) - 90) * (Math.PI / 180);
                const length = getShotLength(b.runs) * radius;
                const endX = cx + Math.cos(angle) * length;
                const endY = cy + Math.sin(angle) * length * 0.85;
                const color = getShotColor(b.runs);
                const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
                return (
                  <motion.line
                    key={i}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: r >= 4 ? 0.9 : 0.5 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    x1={cx} y1={cy} x2={endX} y2={endY}
                    stroke={color}
                    strokeWidth={r >= 6 ? 2 : r >= 4 ? 1.5 : 1}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Shot endpoints */}
              {scoringBalls.map((b, i) => {
                const angle = (getShotAngle(b, i) - 90) * (Math.PI / 180);
                const length = getShotLength(b.runs) * radius;
                const endX = cx + Math.cos(angle) * length;
                const endY = cy + Math.sin(angle) * length * 0.85;
                const color = getShotColor(b.runs);
                const r = typeof b.runs === "number" ? Math.abs(b.runs) : 0;
                return (
                  <motion.circle
                    key={`dot-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.03 + 0.2 }}
                    cx={endX} cy={endY}
                    r={r >= 6 ? 3 : r >= 4 ? 2.5 : 1.5}
                    fill={color}
                    opacity={0.8}
                  />
                );
              })}
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="radial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Radial grid circles */}
              {[0.33, 0.66, 1].map((r, i) => (
                <circle key={i} cx={cx} cy={cy} r={radius * r} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
              ))}
              {/* Zone sectors */}
              {zones.map((zone, i) => {
                const startAngle = (zone.range[0] - 90) * (Math.PI / 180);
                const endAngle = (zone.range[1] - 90) * (Math.PI / 180);
                const midAngle = ((zone.range[0] + zone.range[1]) / 2 - 90) * (Math.PI / 180);
                const fillRadius = (zone.runs / maxZoneRuns) * radius * 0.9;
                
                const x1 = cx + Math.cos(startAngle) * fillRadius;
                const y1 = cy + Math.sin(startAngle) * fillRadius;
                const x2 = cx + Math.cos(endAngle) * fillRadius;
                const y2 = cy + Math.sin(endAngle) * fillRadius;
                const largeArc = (zone.range[1] - zone.range[0]) > 180 ? 1 : 0;

                const labelX = cx + Math.cos(midAngle) * (radius + 8);
                const labelY = cy + Math.sin(midAngle) * (radius + 8);

                return (
                  <g key={i}>
                    {zone.runs > 0 && (
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ delay: i * 0.1 }}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${fillRadius} ${fillRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={`hsl(${120 + i * 40} 60% 50%)`}
                      />
                    )}
                    {/* Zone divider */}
                    <line
                      x1={cx} y1={cy}
                      x2={cx + Math.cos(startAngle) * radius}
                      y2={cy + Math.sin(startAngle) * radius}
                      stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.15"
                    />
                    {/* Label */}
                    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                      fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="var(--font-display)" opacity="0.6">
                      {zone.label}
                    </text>
                    {zone.runs > 0 && (
                      <text
                        x={cx + Math.cos(midAngle) * (fillRadius * 0.6)}
                        y={cy + Math.sin(midAngle) * (fillRadius * 0.6)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="8" fontWeight="bold" fill="hsl(var(--foreground))"
                      >
                        {zone.runs}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex justify-center gap-2 flex-wrap">
        {[
          { label: "6", color: "bg-primary" },
          { label: "4", color: "bg-neon-green" },
          { label: "3", color: "bg-secondary" },
          { label: "2", color: "bg-accent" },
          { label: "1", color: "bg-muted-foreground" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${l.color}`} />
            <span className="text-[5px] text-muted-foreground/60 font-display">{l.label}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
