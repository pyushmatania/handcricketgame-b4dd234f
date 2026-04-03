import { motion } from "framer-motion";
import { SFX, Haptics } from "@/lib/sounds";

interface ShopItemCardProps {
  name: string;
  rarity: string;
  previewEmoji: string;
  description: string;
  price: number;
  owned: boolean;
  equipped: boolean;
  index: number;
  onClick: () => void;
}

const RARITY_CONFIG: Record<string, {
  border: string; bg: string; glow: string; label: string; color: string; stripe: string;
}> = {
  common: {
    border: "border-[hsl(var(--rarity-common))]",
    bg: "from-[hsl(210_15%_60%/0.08)] to-transparent",
    glow: "",
    label: "COMMON",
    color: "text-muted-foreground",
    stripe: "bg-[hsl(var(--rarity-common))]",
  },
  rare: {
    border: "border-game-blue",
    bg: "from-[hsl(207_90%_54%/0.1)] to-transparent",
    glow: "shadow-[0_0_14px_hsl(207_90%_54%/0.2)]",
    label: "RARE",
    color: "text-game-blue",
    stripe: "bg-game-blue",
  },
  epic: {
    border: "border-game-purple",
    bg: "from-[hsl(291_47%_51%/0.12)] to-transparent",
    glow: "shadow-[0_0_18px_hsl(291_47%_51%/0.25)]",
    label: "EPIC",
    color: "text-game-purple",
    stripe: "bg-game-purple",
  },
  legendary: {
    border: "border-game-gold",
    bg: "from-[hsl(51_100%_50%/0.15)] to-transparent",
    glow: "shadow-[0_0_22px_hsl(51_100%_50%/0.3)]",
    label: "LEGENDARY",
    color: "text-game-gold",
    stripe: "bg-game-gold",
  },
};

export default function ShopItemCard({
  name, rarity, previewEmoji, description, price, owned, equipped, index, onClick,
}: ShopItemCardProps) {
  const r = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => { SFX.tap(); Haptics.light(); onClick(); }}
      className={`relative rounded-2xl border-2 overflow-hidden cursor-pointer active:scale-[0.96] transition-transform ${r.border} ${equipped ? r.glow : ""}`}
    >
      {/* Rarity stripe */}
      <div className={`h-1 ${r.stripe}`} />

      {/* Card body */}
      <div className={`bg-gradient-to-b from-[hsl(222_40%_13%/0.9)] to-[hsl(222_40%_8%/0.95)] p-3`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${r.bg} pointer-events-none`} />

        <div className="relative z-10">
          {/* Top badges */}
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[7px] font-game-display tracking-wider ${r.color}`}>{r.label}</span>
            {equipped && (
              <span className="text-[7px] font-game-display text-game-green tracking-wider bg-game-green/10 px-1.5 py-0.5 rounded-full border border-game-green/20">
                ✓ ON
              </span>
            )}
            {owned && !equipped && (
              <span className="text-[7px] font-game-display text-game-blue tracking-wider bg-game-blue/10 px-1.5 py-0.5 rounded-full border border-game-blue/20">
                OWNED
              </span>
            )}
          </div>

          {/* Preview */}
          <div className="text-center py-4">
            <motion.span
              className="text-5xl block"
              whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.4 }}
            >
              {previewEmoji}
            </motion.span>
          </div>

          {/* Name */}
          <p className="font-game-card text-xs font-bold text-foreground truncate">{name}</p>

          {/* Price / status */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-muted-foreground line-clamp-1 flex-1">{description.slice(0, 22)}</span>
            {!owned && (
              <span className="font-game-display text-[10px] text-game-gold flex items-center gap-0.5 shrink-0">
                🪙 {price}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
