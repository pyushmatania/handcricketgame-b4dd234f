import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchConfig } from "@/hooks/useHandCricket";

interface OverSelectorProps {
  playerXP: number;
  onSelect: (config: MatchConfig) => void;
}

const OVER_OPTIONS = [
  { overs: null, label: "∞", desc: "UNLIMITED", unlockXP: 0 },
  { overs: 1, label: "1", desc: "1 OVER", unlockXP: 0 },
  { overs: 3, label: "3", desc: "3 OVERS", unlockXP: 0 },
  { overs: 5, label: "5", desc: "5 OVERS", unlockXP: 0 },
  { overs: 10, label: "10", desc: "10 OVERS", unlockXP: 100 },
  { overs: 20, label: "20", desc: "20 OVERS", unlockXP: 300 },
];

const WICKET_OPTIONS = [
  { wickets: 1, label: "1W", desc: "1 WICKET", unlockXP: 0 },
  { wickets: 3, label: "3W", desc: "3 WICKETS", unlockXP: 0 },
  { wickets: 5, label: "5W", desc: "5 WICKETS", unlockXP: 200 },
  { wickets: 10, label: "10W", desc: "10 WICKETS", unlockXP: 500 },
];

export default function OverSelector({ playerXP, onSelect }: OverSelectorProps) {
  const [selectedOvers, setSelectedOvers] = useState<number | null>(null);
  const [selectedWickets, setSelectedWickets] = useState(3);

  const handleConfirm = () => {
    onSelect({ overs: selectedOvers, wickets: selectedOvers === null ? 1 : selectedWickets });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-display font-bold text-foreground tracking-[0.2em]">⚾ SELECT OVERS</span>
          <div className="flex-1 h-px bg-primary/10" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {OVER_OPTIONS.map((opt) => {
            const locked = playerXP < opt.unlockXP;
            const active = selectedOvers === opt.overs;
            return (
              <motion.button
                key={opt.label}
                whileTap={locked ? {} : { scale: 0.9 }}
                onClick={() => !locked && setSelectedOvers(opt.overs)}
                disabled={locked}
                className={`relative py-3 rounded-xl font-display font-bold text-sm flex flex-col items-center gap-0.5 transition-all border backdrop-blur-sm ${
                  locked
                    ? "opacity-30 cursor-not-allowed bg-muted/10 border-muted/20"
                    : active
                    ? "bg-gradient-to-br from-primary/25 to-primary/10 border-primary/40 text-primary shadow-[0_0_15px_hsl(217_91%_60%/0.2)]"
                    : "bg-gradient-to-br from-muted/20 to-muted/5 border-border/30 text-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-lg font-black">{opt.label}</span>
                <span className="text-[7px] tracking-wider text-muted-foreground">{opt.desc}</span>
                {locked && (
                  <span className="absolute top-1 right-1 text-[6px] px-1 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-secondary font-bold">
                    🔒 {opt.unlockXP} XP
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Wickets - only show for limited overs */}
      {selectedOvers !== null && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-display font-bold text-foreground tracking-[0.2em]">🏏 WICKETS</span>
            <div className="flex-1 h-px bg-accent/10" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {WICKET_OPTIONS.map((opt) => {
              const locked = playerXP < opt.unlockXP;
              const active = selectedWickets === opt.wickets;
              return (
                <motion.button
                  key={opt.label}
                  whileTap={locked ? {} : { scale: 0.9 }}
                  onClick={() => !locked && setSelectedWickets(opt.wickets)}
                  disabled={locked}
                  className={`relative py-2.5 rounded-xl font-display font-bold text-xs flex flex-col items-center gap-0.5 transition-all border backdrop-blur-sm ${
                    locked
                      ? "opacity-30 cursor-not-allowed bg-muted/10 border-muted/20"
                      : active
                      ? "bg-gradient-to-br from-accent/25 to-accent/10 border-accent/40 text-accent shadow-[0_0_12px_hsl(168_80%_50%/0.15)]"
                      : "bg-gradient-to-br from-muted/20 to-muted/5 border-border/30 text-foreground hover:border-accent/30"
                  }`}
                >
                  <span className="text-sm font-black">{opt.label}</span>
                  <span className="text-[6px] tracking-wider text-muted-foreground">{opt.desc}</span>
                  {locked && (
                    <span className="absolute top-0.5 right-0.5 text-[5px] px-1 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-secondary font-bold">
                      🔒{opt.unlockXP}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Confirm */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleConfirm}
        className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-black text-sm rounded-2xl tracking-wider shadow-[0_0_25px_hsl(217_91%_60%/0.2)] border border-primary/30"
      >
        ⚡ START TOSS →
      </motion.button>

      <p className="text-center text-[7px] text-muted-foreground/50 font-display tracking-wider">
        {selectedOvers === null ? "Unlimited overs • 1 wicket" : `${selectedOvers} overs • ${selectedWickets} wickets`}
      </p>
    </motion.div>
  );
}
