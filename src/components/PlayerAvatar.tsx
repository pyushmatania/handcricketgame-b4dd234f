import { getAvatarPreset } from "@/lib/avatars";

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  avatarIndex?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-9 h-9 rounded-xl text-lg",
  md: "w-12 h-12 rounded-xl text-2xl",
  lg: "w-16 h-16 rounded-2xl text-3xl",
};

export default function PlayerAvatar({ avatarUrl, avatarIndex = 0, size = "md", className = "" }: PlayerAvatarProps) {
  const preset = getAvatarPreset(avatarIndex);

  if (avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden border-2 border-primary/30 ${className}`}>
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${preset.gradient} border-2 border-primary/20 flex items-center justify-center ${className}`}>
      <span>{preset.emoji}</span>
    </div>
  );
}
