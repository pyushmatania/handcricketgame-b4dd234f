import { cn } from "@/lib/utils";

interface CurrencyPillProps {
  icon: string;
  value: number | string;
  showPlus?: boolean;
  onPlusClick?: () => void;
  className?: string;
}

export default function CurrencyPill({
  icon,
  value,
  showPlus = true,
  onPlusClick,
  className,
}: CurrencyPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 bg-game-dark/80 rounded-full pl-1.5 pr-1 py-0.5 border border-[hsl(222_25%_25%/0.6)] shadow-inner",
        className
      )}
    >
      <span className="text-base">{icon}</span>
      <span className="text-xs font-game-display text-foreground min-w-[28px] text-right">
        {typeof value === "number"
          ? value >= 1000
            ? `${(value / 1000).toFixed(1)}K`
            : value
          : value}
      </span>
      {showPlus && (
        <button
          onClick={onPlusClick}
          className="w-5 h-5 rounded-full bg-game-green flex items-center justify-center text-white text-xs font-bold active:scale-90 transition-transform"
        >
          +
        </button>
      )}
    </div>
  );
}
