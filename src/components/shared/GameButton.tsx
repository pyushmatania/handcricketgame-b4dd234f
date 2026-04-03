import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes } from "react";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  icon?: ReactNode;
  bounce?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-gradient-to-b from-game-green to-[hsl(122_39%_38%)] text-white border-b-4 border-[hsl(122_39%_30%)] active:border-b-2 active:translate-y-[2px] shadow-game-button active:shadow-game-button-pressed",
  secondary:
    "bg-gradient-to-b from-[hsl(210_10%_55%)] to-[hsl(210_10%_40%)] text-white border-b-4 border-[hsl(210_10%_30%)] active:border-b-2 active:translate-y-[2px] shadow-game-button active:shadow-game-button-pressed",
  danger:
    "bg-gradient-to-b from-game-red to-[hsl(4_90%_45%)] text-white border-b-4 border-[hsl(4_90%_35%)] active:border-b-2 active:translate-y-[2px] shadow-game-button active:shadow-game-button-pressed",
  gold:
    "bg-gradient-to-b from-game-gold to-[hsl(43_96%_42%)] text-game-dark border-b-4 border-[hsl(43_96%_32%)] active:border-b-2 active:translate-y-[2px] shadow-game-button active:shadow-game-button-pressed",
};

const sizeStyles: Record<string, string> = {
  sm: "px-4 py-2 text-sm rounded-xl min-h-[40px]",
  md: "px-6 py-3 text-base rounded-2xl min-h-[48px]",
  lg: "px-8 py-4 text-lg rounded-2xl min-h-[56px]",
};

export default function GameButton({
  variant = "primary",
  size = "md",
  children,
  icon,
  bounce = false,
  className,
  ...props
}: GameButtonProps) {
  const Wrapper = bounce ? motion.button : "button";
  const motionProps = bounce
    ? { whileTap: { scale: 0.95 }, whileHover: { scale: 1.02 } }
    : {};

  return (
    <Wrapper
      className={cn(
        "font-game-display tracking-wide uppercase transition-all duration-100 flex items-center justify-center gap-2",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...(motionProps as any)}
      {...props}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </Wrapper>
  );
}
