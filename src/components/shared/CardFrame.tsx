import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Rarity = "common" | "rare" | "epic" | "legendary";

interface CardFrameProps {
  rarity?: Rarity;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const rarityStyles: Record<Rarity, string> = {
  common:
    "border-[hsl(var(--rarity-common))] shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]",
  rare:
    "border-game-blue shadow-[0_4px_16px_hsl(207_90%_54%/0.2),inset_0_1px_2px_rgba(255,255,255,0.1)]",
  epic:
    "border-game-purple shadow-[0_4px_16px_hsl(291_47%_51%/0.25),inset_0_1px_2px_rgba(255,255,255,0.1)]",
  legendary:
    "border-game-gold shadow-[0_4px_20px_hsl(51_100%_50%/0.3),inset_0_1px_2px_rgba(255,255,255,0.15)] animate-border-glow",
};

export default function CardFrame({
  rarity = "common",
  children,
  className,
  onClick,
}: CardFrameProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border-[3px] bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] backdrop-blur-md overflow-hidden",
        rarityStyles[rarity],
        onClick && "cursor-pointer active:scale-[0.97] transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
}
