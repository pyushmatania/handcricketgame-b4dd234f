import { motion } from "framer-motion";
import playerKohli from "@/assets/player-kohli.png";
import playerDhoni from "@/assets/player-dhoni.png";
import playerRohit from "@/assets/player-rohit.png";
import playerBumrah from "@/assets/player-bumrah.png";

export const PLAYER_IMAGES: Record<string, string> = {
  kohli: playerKohli,
  dhoni: playerDhoni,
  rohit: playerRohit,
  bumrah: playerBumrah,
};

export interface PlayerInfo {
  id: string;
  name: string;
  number: string;
  role: string;
  rating: number;
  stats: { label: string; value: string }[];
  accentColor: string;
  glowColor: string;
}

export const INDIAN_LEGENDS: PlayerInfo[] = [
  {
    id: "kohli",
    name: "Virat Kohli",
    number: "18",
    role: "RHB • Captain",
    rating: 97,
    stats: [
      { label: "AVG", value: "53.4" },
      { label: "SR", value: "93.2" },
      { label: "100s", value: "80" },
    ],
    accentColor: "from-primary to-blue-400",
    glowColor: "shadow-[0_0_40px_hsl(217_91%_60%/0.3)]",
  },
  {
    id: "dhoni",
    name: "MS Dhoni",
    number: "7",
    role: "WK • Finisher",
    rating: 95,
    stats: [
      { label: "AVG", value: "50.5" },
      { label: "SR", value: "87.5" },
      { label: "STUMPS", value: "195" },
    ],
    accentColor: "from-secondary to-yellow-400",
    glowColor: "shadow-[0_0_40px_hsl(45_93%_58%/0.3)]",
  },
  {
    id: "rohit",
    name: "Rohit Sharma",
    number: "45",
    role: "RHB • Opener",
    rating: 94,
    stats: [
      { label: "AVG", value: "48.6" },
      { label: "SR", value: "89.0" },
      { label: "200s", value: "3" },
    ],
    accentColor: "from-accent to-teal-300",
    glowColor: "shadow-[0_0_40px_hsl(168_80%_50%/0.3)]",
  },
  {
    id: "bumrah",
    name: "J. Bumrah",
    number: "93",
    role: "RF • Pacer",
    rating: 96,
    stats: [
      { label: "WKTS", value: "352" },
      { label: "ECO", value: "4.6" },
      { label: "AVG", value: "21.3" },
    ],
    accentColor: "from-neon-green to-emerald-300",
    glowColor: "shadow-[0_0_40px_hsl(142_71%_45%/0.3)]",
  },
];

interface PlayerCardProps {
  player: PlayerInfo;
  size?: "sm" | "md" | "lg";
  showStats?: boolean;
  delay?: number;
  onTap?: (player: PlayerInfo) => void;
}

export default function PlayerCard({ player, size = "md", showStats = true, delay = 0, onTap }: PlayerCardProps) {
  const img = PLAYER_IMAGES[player.id];
  const sizeClasses = {
    sm: "h-32 w-24",
    md: "h-48 w-36",
    lg: "h-64 w-48",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={onTap ? { scale: 0.95 } : undefined}
      onClick={() => onTap?.(player)}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
      className={`relative glass-premium rounded-2xl overflow-hidden ${player.glowColor} group ${onTap ? "cursor-pointer active:brightness-110" : ""}`}
    >
      {/* Rating badge */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${player.accentColor} flex items-center justify-center`}>
          <span className="font-display text-sm font-black text-white">{player.rating}</span>
        </div>
      </div>

      {/* Jersey number watermark */}
      <div className="absolute top-0 right-0 z-0 opacity-[0.06]">
        <span className="font-display text-[80px] font-black leading-none">{player.number}</span>
      </div>

      {/* Player image */}
      <div className={`relative ${sizeClasses[size]} mx-auto mt-2 flex items-end justify-center`}>
        <motion.img
          src={img}
          alt={player.name}
          className="h-full w-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          loading="lazy"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
        />
      </div>

      {/* Info bar */}
      <div className="relative z-10 px-3 pb-3 pt-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-xs font-black text-foreground tracking-wide">
            {player.name.toUpperCase()}
          </span>
        </div>
        <span className="text-[8px] text-muted-foreground font-display tracking-widest">
          {player.role}
        </span>

        {/* Stats row */}
        {showStats && (
          <div className="flex gap-2 mt-2">
            {player.stats.map((s) => (
              <div key={s.label} className="flex-1 text-center">
                <span className="font-display text-[10px] font-black text-foreground block leading-none">
                  {s.value}
                </span>
                <span className="text-[6px] text-muted-foreground font-display tracking-widest">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${player.accentColor}`} />
    </motion.div>
  );
}
