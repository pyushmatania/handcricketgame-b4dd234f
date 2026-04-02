import { getAvatarPreset } from "@/lib/avatars";

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  avatarIndex?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  frame?: string | null;
}

const sizeClasses = {
  sm: "w-9 h-9 rounded-xl text-lg",
  md: "w-12 h-12 rounded-xl text-2xl",
  lg: "w-16 h-16 rounded-2xl text-3xl",
};

const FRAME_STYLES: Record<string, string> = {
  "Bronze Ring": "ring-2 ring-amber-600/60",
  "Silver Glow": "ring-2 ring-gray-300/60 shadow-[0_0_8px_hsl(0_0%_70%/0.3)]",
  "Gold Crown": "ring-2 ring-yellow-400/70 shadow-[0_0_12px_hsl(45_93%_58%/0.3)]",
  "Diamond Edge": "ring-2 ring-cyan-400/70 shadow-[0_0_16px_hsl(192_91%_60%/0.4)]",
  "Fire Ring": "ring-2 ring-orange-500/70 shadow-[0_0_12px_hsl(25_95%_53%/0.4)]",
  "Neon Pulse": "ring-2 ring-purple-400/70 shadow-[0_0_12px_hsl(280_70%_60%/0.4)]",
  "Champion Aura": "ring-[3px] ring-yellow-400/80 shadow-[0_0_20px_hsl(45_93%_58%/0.5)]",
};

export default function PlayerAvatar({ avatarUrl, avatarIndex = 0, size = "md", className = "", frame }: PlayerAvatarProps) {
  const preset = getAvatarPreset(avatarIndex);
  const frameStyle = frame ? FRAME_STYLES[frame] || "" : "";

  if (avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden border-2 border-primary/30 ${frameStyle} ${className}`}>
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${preset.gradient} border-2 border-primary/20 flex items-center justify-center ${frameStyle} ${className}`}>
      <span>{preset.emoji}</span>
    </div>
  );
}
