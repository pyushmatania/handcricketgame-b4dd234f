import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { speakCommentary } from "@/lib/voiceCommentary";
import { SFX } from "@/lib/sounds";
import { useSettings } from "@/contexts/SettingsContext";

interface PreMatchCeremonyProps {
  playerName: string;
  opponentName: string;
  tossWinner: string;
  battingFirst: string;
  onComplete: () => void;
}

const PRE_MATCH_LINES = [
  (p: string, o: string) => `Ladies and gentlemen, welcome to this exciting match between ${p} and ${o}!`,
  (_p: string, _o: string, tw: string, bf: string) => `${tw} has won the toss and elected to ${bf === tw ? "bat" : "bowl"} first!`,
  (p: string, o: string) => `The stadium is buzzing! ${p} versus ${o} — this is going to be a cracker!`,
  (_p: string, _o: string, _tw: string, bf: string) => `${bf} will face the first ball. Let the battle begin!`,
];

export function PreMatchCeremony({ playerName, opponentName, tossWinner, battingFirst, onComplete }: PreMatchCeremonyProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled } = useSettings();

  useEffect(() => {
    if (soundEnabled) SFX.ceremonyHorn();
    
    const lines = [
      PRE_MATCH_LINES[0](playerName, opponentName),
      PRE_MATCH_LINES[1](playerName, opponentName, tossWinner, battingFirst),
      PRE_MATCH_LINES[2](playerName, opponentName),
      PRE_MATCH_LINES[3](playerName, opponentName, tossWinner, battingFirst),
    ];

    if (voiceEnabled) speakCommentary(lines[0], true);

    const timers: NodeJS.Timeout[] = [];
    lines.forEach((line, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => {
          setLineIndex(i);
          if (voiceEnabled) speakCommentary(line, true);
        }, i * 2500));
      }
    });

    timers.push(setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600);
    }, lines.length * 2500));

    return () => timers.forEach(clearTimeout);
  }, []);

  const lines = [
    PRE_MATCH_LINES[0](playerName, opponentName),
    PRE_MATCH_LINES[1](playerName, opponentName, tossWinner, battingFirst),
    PRE_MATCH_LINES[2](playerName, opponentName),
    PRE_MATCH_LINES[3](playerName, opponentName, tossWinner, battingFirst),
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-sm mx-4 text-center space-y-6"
          >
            {/* Stadium lights animation */}
            <div className="relative">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25 }}
                  className="absolute rounded-full"
                  style={{
                    width: 6, height: 6,
                    top: `${20 + Math.sin(i) * 30}%`,
                    left: `${10 + i * 15}%`,
                    background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))",
                  }}
                />
              ))}
            </div>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl"
            >
              🏟️
            </motion.div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="font-display text-lg font-black text-primary">{playerName}</span>
                <span className="font-display text-sm text-muted-foreground">VS</span>
                <span className="font-display text-lg font-black text-accent">{opponentName}</span>
              </div>

              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-8"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1 }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={lineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-sm text-muted-foreground leading-relaxed px-4 min-h-[3rem]"
              >
                🎙️ {lines[lineIndex]}
              </motion.p>
            </AnimatePresence>

            <motion.div
              className="flex justify-center gap-1"
            >
              {lines.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i <= lineIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PostMatchCeremonyProps {
  playerName: string;
  opponentName: string;
  result: "win" | "loss" | "draw";
  playerScore: number;
  opponentScore: number;
  onComplete: () => void;
}

const POST_WIN = [
  (p: string, ps: number, os: number) => `What a magnificent victory by ${p}! Scoring ${ps} against ${os}!`,
  (p: string) => `${p} takes the match! The crowd is on their feet! Absolutely sensational!`,
  (p: string) => `${p} punches the air! What a champion! This one will be remembered!`,
];

const POST_LOSS = [
  (_p: string, o: string, ps: number, os: number) => `${o} wins the match with ${os} runs against ${ps}! What a performance!`,
  (_p: string, o: string) => `${o} celebrates! A well-deserved victory! The opposition was too strong today.`,
  (p: string) => `${p} fought hard but couldn't pull it off. Head held high, though!`,
];

const POST_DRAW = [
  (p: string, o: string) => `It's a tie! ${p} and ${o} couldn't be separated! What drama!`,
  (_p: string, _o: string) => `Neither side gives in! This match ends all square!`,
  (p: string, o: string) => `Incredible! ${p} and ${o} share the spoils! A match for the ages!`,
];

export function PostMatchCeremony({ playerName, opponentName, result, playerScore, opponentScore, onComplete }: PostMatchCeremonyProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const { voiceEnabled, soundEnabled } = useSettings();

  const getLines = useCallback(() => {
    const set = result === "win" ? POST_WIN : result === "loss" ? POST_LOSS : POST_DRAW;
    return set.map(fn => fn(playerName, opponentName, playerScore, opponentScore));
  }, [result, playerName, opponentName, playerScore, opponentScore]);

  useEffect(() => {
    const lines = getLines();
    if (soundEnabled) {
      if (result === "win") SFX.victoryAnthem();
      else SFX.loss();
    }
    if (voiceEnabled) speakCommentary(lines[0], true);

    const timers: NodeJS.Timeout[] = [];
    lines.forEach((line, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => {
          setLineIndex(i);
          if (voiceEnabled) speakCommentary(line, true);
        }, i * 3000));
      }
    });

    timers.push(setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600);
    }, lines.length * 3000 + 500));

    return () => timers.forEach(clearTimeout);
  }, []);

  const lines = getLines();
  const resultEmoji = result === "win" ? "🏆" : result === "loss" ? "😔" : "🤝";
  const resultText = result === "win" ? "VICTORY!" : result === "loss" ? "DEFEAT" : "TIE!";
  const resultColor = result === "win" ? "text-score-gold" : result === "loss" ? "text-out-red" : "text-accent";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="max-w-sm mx-4 text-center space-y-5"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              {resultEmoji}
            </motion.div>

            <motion.h2
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className={`font-display text-3xl font-black ${resultColor} tracking-wider`}
              style={{ textShadow: result === "win" ? "0 0 40px rgba(255,215,0,0.5)" : undefined }}
            >
              {resultText}
            </motion.h2>

            {/* Score summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-6"
            >
              <div className="text-center">
                <p className="font-display text-xs text-muted-foreground font-bold tracking-widest">{playerName.toUpperCase()}</p>
                <p className="font-display text-3xl font-black text-primary">{playerScore}</p>
              </div>
              <span className="text-muted-foreground font-display font-bold">—</span>
              <div className="text-center">
                <p className="font-display text-xs text-muted-foreground font-bold tracking-widest">{opponentName.toUpperCase()}</p>
                <p className="font-display text-3xl font-black text-accent">{opponentScore}</p>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.p
                key={lineIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-sm text-muted-foreground leading-relaxed px-2 min-h-[3rem]"
              >
                🎙️ {lines[lineIndex]}
              </motion.p>
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setVisible(false); setTimeout(onComplete, 300); }}
              className="text-xs text-muted-foreground/60 font-display tracking-wider underline"
            >
              SKIP
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
