import { motion } from "framer-motion";
import cricketBallIcon from "@/assets/cricket-ball-icon.webp";

interface SpinningCricketBallProps {
  size?: number;
  className?: string;
}

export default function SpinningCricketBall({ size = 80, className = "" }: SpinningCricketBallProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, perspective: 600 }}>
      {/* 3D shadow beneath */}
      <motion.div
        animate={{ scale: [0.8, 1, 0.8], opacity: [0.3, 0.15, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] left-[10%] w-[80%] h-[20%] rounded-full bg-primary/30 blur-md"
      />
      {/* Spinning ball */}
      <motion.img
        src={cricketBallIcon}
        alt="Cricket Ball"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-full h-full object-contain drop-shadow-[0_8px_24px_rgba(224,64,64,0.4)]"
        style={{ transformStyle: "preserve-3d" }}
      />
      {/* Glow ring */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-[-8%] rounded-full border border-primary/20"
      />
    </div>
  );
}
