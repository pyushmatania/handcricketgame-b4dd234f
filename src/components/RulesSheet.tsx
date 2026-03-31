import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RulesSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full glass-premium flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
        aria-label="Rules"
      >
        <span className="text-sm">❓</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 glass-premium rounded-t-2xl max-h-[80vh] overflow-y-auto p-5"
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <h2 className="font-display text-sm font-black text-primary mb-3 tracking-wider">HOW TO PLAY</h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-foreground font-bold mb-1 text-xs">Gestures</h3>
                  <ul className="space-y-1 text-xs">
                    <li>✊ Fist = <strong className="text-primary">DEF</strong> (defend)</li>
                    <li>☝️ 1 finger = <strong className="text-primary">1 run</strong></li>
                    <li>✌️ 2 fingers = <strong className="text-primary">2 runs</strong></li>
                    <li>🤟 3 fingers = <strong className="text-primary">3 runs</strong></li>
                    <li>🖖 4 fingers = <strong className="text-primary">4 runs</strong></li>
                    <li>🖐️ 5 fingers = <strong className="text-primary">5 runs</strong></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-foreground font-bold mb-1 text-xs">Batting</h3>
                  <p className="text-xs">• Your number = AI number → <strong className="text-out-red">OUT!</strong></p>
                  <p className="text-xs">• You DEF, AI plays number → you score AI's number</p>
                  <p className="text-xs">• Both DEF → <strong className="text-out-red">OUT!</strong></p>
                  <p className="text-xs">• Otherwise → you score your number</p>
                </div>
                <div>
                  <h3 className="text-foreground font-bold mb-1 text-xs">Bowling</h3>
                  <p className="text-xs">Same rules reversed — match AI's number to get them OUT!</p>
                </div>
                <div>
                  <h3 className="text-foreground font-bold mb-1 text-xs">Match</h3>
                  <p className="text-xs">2 innings. Set a target, then chase. Highest score wins! 🏆</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-full mt-5 py-3 bg-muted text-foreground font-display font-bold rounded-xl text-sm active:scale-95 transition-transform"
              >
                GOT IT
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
