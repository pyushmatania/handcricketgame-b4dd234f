import { motion } from "framer-motion";

interface HomeScreenProps {
  onStart: () => void;
}

export default function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4 py-8">
      {/* Stadium gradient */}
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />

      {/* Radiant accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(4 85% 58% / 0.08) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-60 h-60 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(210 90% 56% / 0.06) 0%, transparent 70%)" }} />

      {/* Vignette */}
      <div className="absolute inset-0 vignette pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-md w-full"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="mb-6"
        >
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border-2 border-primary/30 flex items-center justify-center glow-primary mb-4">
            <span className="text-6xl">🏏</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-foreground text-glow tracking-wider leading-tight">
            HAND CRICKET
          </h1>
          <p className="font-display text-[10px] tracking-[0.4em] text-primary mt-1 font-bold">
            AUGMENTED REALITY
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-base mb-2 leading-relaxed px-4"
        >
          The stadium is live. The crowd is ready.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground/60 text-sm mb-8 px-4"
        >
          Show your hand. Gestures auto-capture. Score big. Beat the AI.
        </motion.p>

        {/* Start button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="w-full max-w-xs mx-auto py-4 px-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-black text-base rounded-xl glow-primary transition-all hover:brightness-110 tracking-wider"
        >
          ⚡ ENTER THE STADIUM
        </motion.button>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 grid grid-cols-3 gap-2"
        >
          {[
            { icon: "📸", label: "Live Camera", sub: "Auto Detect" },
            { icon: "✋", label: "Auto Capture", sub: "No Buttons" },
            { icon: "🏟️", label: "Stadium AR", sub: "Immersive" },
          ].map((f) => (
            <div key={f.label} className="glass-score p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-[10px] text-foreground font-bold">{f.label}</div>
              <div className="text-[8px] text-muted-foreground/60">{f.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Gesture hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <span className="text-[9px] text-muted-foreground/40 font-display">✊ DEF</span>
          <span className="text-[9px] text-muted-foreground/40 font-display">☝️ 1</span>
          <span className="text-[9px] text-muted-foreground/40 font-display">✌️ 2</span>
          <span className="text-[9px] text-muted-foreground/40 font-display">🤟 3</span>
          <span className="text-[9px] text-muted-foreground/40 font-display">🖖 4</span>
          <span className="text-[9px] text-muted-foreground/40 font-display">👍 6</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
