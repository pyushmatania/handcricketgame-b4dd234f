import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GameProgressBarProps {
  value: number;
  max: number;
  color?: "green" | "blue" | "gold" | "red";
  label?: string;
  showText?: boolean;
  className?: string;
}

const colorStyles: Record<string, string> = {
  green: "from-game-green to-[hsl(122_50%_55%)]",
  blue: "from-game-blue to-[hsl(207_90%_64%)]",
  gold: "from-game-gold to-[hsl(43_96%_60%)]",
  red: "from-game-red to-[hsl(4_90%_65%)]",
};

export default function GameProgressBar({
  value,
  max,
  color = "green",
  label,
  showText = true,
  className,
}: GameProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-game-body font-bold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {showText && (
            <span className="text-[10px] font-game-display text-foreground">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-3 bg-game-dark rounded-lg border border-[hsl(222_25%_22%/0.5)] overflow-hidden">
        <motion.div
          className={cn("h-full rounded-lg bg-gradient-to-r", colorStyles[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
