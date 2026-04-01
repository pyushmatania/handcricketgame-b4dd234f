import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HAND_EMOJIS: Record<number, string> = {
  1: "☝️", 2: "✌️", 3: "🤟", 4: "🖖", 5: "🖐️", 6: "👍",
};

interface OddEvenTossProps {
  onResult: (batFirst: boolean) => void;
  playerName?: string;
  opponentName?: string;
  isMultiplayer?: boolean;
}

type OddEven = "odd" | "even";

export default function OddEvenToss({ onResult, playerName = "You", opponentName = "AI", isMultiplayer = false }: OddEvenTossProps) {
  const [step, setStep] = useState<"choose_oe" | "choose_number" | "reveal" | "pick_innings">("choose_oe");
  const [playerChoice, setPlayerChoice] = useState<OddEven | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [aiNumber, setAiNumber] = useState<number | null>(null);
  const [tossWon, setTossWon] = useState<boolean | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  const handleChooseOddEven = (choice: OddEven) => {
    setPlayerChoice(choice);
    setStep("choose_number");
  };

  const handleChooseNumber = (num: number) => {
    setPlayerNumber(num);
    const ai = Math.floor(Math.random() * 6) + 1;
    setAiNumber(ai);

    const total = num + ai;
    const resultIsEven = total % 2 === 0;
    const won = (playerChoice === "even" && resultIsEven) || (playerChoice === "odd" && !resultIsEven);
    setTossWon(won);
    setStep("reveal");
    setRevealStep(0);

    setTimeout(() => setRevealStep(1), 600);
    setTimeout(() => setRevealStep(2), 1200);
    setTimeout(() => setRevealStep(3), 1800);
    if (!won) {
      setTimeout(() => {
        onResult(Math.random() > 0.5);
      }, 3200);
    }
  };

  const winnerName = tossWon ? playerName : opponentName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-premium rounded-2xl p-5 text-center space-y-4 relative overflow-hidden"
    >
      {/* Cricket pitch background lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-48 border border-primary/20 rounded-sm" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-24 border border-primary/15 rounded-sm" />
      </div>

      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-accent/10 to-transparent rounded-tr-full" />

      {/* Step: Choose Odd/Even */}
      <AnimatePresence mode="wait">
        {step === "choose_oe" && (
          <motion.div key="oe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-primary/50" />
              <p className="font-display text-xs font-black text-foreground tracking-wider">ODD OR EVEN?</p>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
            <p className="text-[11px] text-muted-foreground">Pick your call for the toss</p>

            {/* Hand gesture animation instead of coin */}
            <div className="flex items-center justify-center gap-4 py-2">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
              >
                <span className="text-3xl">✌️</span>
              </motion.div>
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-lg font-black text-muted-foreground"
              >
                VS
              </motion.span>
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [5, -5, 5] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center"
              >
                <span className="text-3xl">🖖</span>
              </motion.div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChooseOddEven("odd")}
                className="flex-1 py-3.5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl text-sm shadow-[0_0_25px_hsl(217_91%_60%/0.25)] border border-primary/30"
              >
                <span className="text-lg mr-1">☝️</span> ODD
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChooseOddEven("even")}
                className="flex-1 py-3.5 bg-gradient-to-br from-accent to-accent/70 text-accent-foreground font-display font-bold rounded-2xl text-sm shadow-[0_0_25px_hsl(168_80%_50%/0.2)] border border-accent/30"
              >
                <span className="text-lg mr-1">✌️</span> EVEN
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step: Choose Number */}
        {step === "choose_number" && (
          <motion.div key="num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-primary/50" />
              <p className="font-display text-xs font-black text-foreground tracking-wider">PLAY YOUR HAND</p>
              <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              You chose <span className="text-primary font-bold uppercase">{playerChoice}</span>. Show your hand!
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <motion.button
                  key={n}
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleChooseNumber(n)}
                  className="py-4 rounded-2xl font-display font-black text-lg bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 text-foreground hover:border-primary/40 hover:from-primary/15 hover:to-primary/5 transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-2xl">{HAND_EMOJIS[n]}</span>
                  <span className="text-xs">{n}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step: Reveal */}
        {step === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="font-display text-xs font-black text-foreground tracking-wider">TOSS RESULT</p>

            <div className="flex items-center justify-center gap-4">
              {/* Player hand */}
              <div className="text-center">
                <p className="text-[8px] text-muted-foreground font-display font-bold tracking-widest mb-1">
                  {playerName.toUpperCase().slice(0, 10)}
                </p>
                <motion.div
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex flex-col items-center justify-center"
                >
                  <span className="text-2xl">{playerNumber ? HAND_EMOJIS[playerNumber] : ""}</span>
                  <span className="font-display text-xs font-black text-primary">{playerNumber}</span>
                </motion.div>
              </div>

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-black text-muted-foreground"
              >
                +
              </motion.span>

              {/* Opponent hand */}
              <div className="text-center">
                <p className="text-[8px] text-muted-foreground font-display font-bold tracking-widest mb-1">
                  {opponentName.toUpperCase().slice(0, 10)}
                </p>
                <AnimatePresence>
                  {revealStep >= 1 ? (
                    <motion.div
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex flex-col items-center justify-center"
                    >
                      <span className="text-2xl">{aiNumber ? HAND_EMOJIS[aiNumber] : ""}</span>
                      <span className="font-display text-xs font-black text-accent">{aiNumber}</span>
                    </motion.div>
                  ) : (
                    <motion.div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
                      <motion.span
                        animate={{ rotate: [0, -20, 20, 0], y: [0, -5, 0] }}
                        transition={{ duration: 0.4, repeat: Infinity }}
                        className="text-2xl"
                      >
                        ✊
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Total */}
            <AnimatePresence>
              {revealStep >= 2 && playerNumber !== null && aiNumber !== null && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="w-8 h-0.5 bg-gradient-to-r from-transparent to-secondary/50" />
                  <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30">
                    <span className="font-display text-sm font-black text-secondary tracking-wider">
                      TOTAL: {playerNumber + aiNumber} = {(playerNumber + aiNumber) % 2 === 0 ? "EVEN" : "ODD"}
                    </span>
                  </div>
                  <div className="w-8 h-0.5 bg-gradient-to-l from-transparent to-secondary/50" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Win/Loss result with player name */}
            <AnimatePresence>
              {revealStep >= 3 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className={`py-3 px-4 rounded-2xl font-display font-black text-sm tracking-wider ${
                    tossWon
                      ? "bg-gradient-to-r from-neon-green/15 to-neon-green/5 border border-neon-green/30 text-neon-green"
                      : "bg-gradient-to-r from-out-red/15 to-out-red/5 border border-out-red/30 text-out-red"
                  }`}
                >
                  🏆 {winnerName.toUpperCase()} WON THE TOSS!
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pick innings if won */}
            <AnimatePresence>
              {revealStep >= 3 && tossWon && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <p className="text-[11px] text-muted-foreground">Select your choice</p>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onResult(true)}
                      className="flex-1 py-3.5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl text-sm shadow-[0_0_25px_hsl(217_91%_60%/0.25)] border border-primary/30"
                    >
                      🏏 BAT FIRST
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onResult(false)}
                      className="flex-1 py-3.5 bg-gradient-to-br from-accent to-accent/70 text-accent-foreground font-display font-bold rounded-2xl text-sm shadow-[0_0_25px_hsl(168_80%_50%/0.2)] border border-accent/30"
                    >
                      🎯 BOWL FIRST
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI chose message */}
            <AnimatePresence>
              {revealStep >= 3 && !tossWon && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider">
                    {opponentName} is choosing...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
