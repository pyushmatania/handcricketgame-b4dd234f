import { cn } from "@/lib/utils";

interface StatDiamondsProps {
  label: string;
  filled: number;
  total?: number;
  color?: string;
  className?: string;
}

export default function StatDiamonds({
  label,
  filled,
  total = 5,
  color = "text-game-gold",
  className,
}: StatDiamondsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[10px] font-game-body font-bold text-muted-foreground uppercase tracking-wider w-12">
        {label}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "text-xs",
              i < filled ? color : "text-muted-foreground/30"
            )}
          >
            ◆
          </span>
        ))}
      </div>
    </div>
  );
}
