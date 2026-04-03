import { cn } from "@/lib/utils";

interface BadgeNotifProps {
  count: number;
  className?: string;
}

export default function BadgeNotif({ count, className }: BadgeNotifProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-game-red text-white text-[9px] font-game-display flex items-center justify-center px-1 border border-game-dark",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
