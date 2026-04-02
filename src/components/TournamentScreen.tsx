import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useHandCricket, type Move, type MatchConfig } from "@/hooks/useHandCricket";
import { useMatchSaver } from "@/hooks/useMatchSaver";
import { SFX, Haptics } from "@/lib/sounds";
import { useSettings } from "@/contexts/SettingsContext";
import RulesSheet from "./RulesSheet";
import EnhancedPreMatch from "./EnhancedPreMatch";
import EnhancedPostMatch from "./EnhancedPostMatch";
import OddEvenToss from "./OddEvenToss";
import TapPlayingUI from "./TapPlayingUI";
import OverSelector from "./OverSelector";

type Round = {
  round: number;
  opponent: string;
  result: "win" | "loss" | "pending";
  userScore?: number;
  oppScore?: number;
};

const AI_OPPONENTS = [
  { name: "Rookie Bot", difficulty: 0.3, emoji: "🤖" },
  { name: "Club Player", difficulty: 0.5, emoji: "🏏" },
  { name: "State Champ", difficulty: 0.7, emoji: "⭐" },
  { name: "National Star", difficulty: 0.85, emoji: "🌟" },
  { name: "World Legend", difficulty: 0.95, emoji: "👑" },
];

interface Props { onHome: () => void; }

export default function TournamentScreen({ onHome }: Props) {
  const { soundEnabled, hapticsEnabled } = useSettings();
  const { user } = useAuth();
  const { game, startGame, playBall, resetGame } = useHandCricket();
  const { saveMatch } = useMatchSaver();
  const [phase, setPhase] = useState<"bracket" | "config" | "toss" | "playing" | "result">("bracket");
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [eliminated, setEliminated] = useState(false);
  const savedRef = useRef(false);
  const postMatchShownRef = useRef(false);

  const [showPreMatch, setShowPreMatch] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [playerName, setPlayerName] = useState("You");
  const [playerXP, setPlayerXP] = useState(0);
  const [matchConfig, setMatchConfig] = useState<MatchConfig>({ overs: 5, wickets: 3 });
  const [tossInfo, setTossInfo] = useState<{ winner: string; battingFirst: string } | null>(null);
  const [pendingBatFirst, setPendingBatFirst] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, xp").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setPlayerName(data.display_name);
        if (data?.xp) setPlayerXP(data.xp);
      });
  }, [user]);

  const startTournament = () => {
    const r: Round[] = AI_OPPONENTS.map((opp, i) => ({ round: i + 1, opponent: opp.name, result: "pending" }));
    setRounds(r);
    setCurrentRound(0);
    setEliminated(false);
    setPhase("bracket");
  };

  useEffect(() => { startTournament(); }, []);

  const startRound = () => {
    setPhase("config");
  };

  const handleOverSelect = (config: MatchConfig) => {
    setMatchConfig(config);
    setPhase("toss");
  };

  const handleTossComplete = useCallback((tossWinner: string, battingFirst: string) => {
    setTossInfo({ winner: tossWinner, battingFirst });
  }, []);

  const handleTossResult = (batFirst: boolean) => {
    setPendingBatFirst(batFirst);
    setTimeout(() => setShowPreMatch(true), 500);
  };

  const handlePreMatchComplete = () => {
    setShowPreMatch(false);
    resetGame();
    savedRef.current = false;
    postMatchShownRef.current = false;
    if (soundEnabled) SFX.gameStart();
    if (hapticsEnabled) Haptics.medium();
    if (pendingBatFirst !== null) {
      startGame(pendingBatFirst, matchConfig);
    } else {
      startGame(true, matchConfig);
    }
    setPhase("playing");
  };

  useEffect(() => {
    if (game.phase === "finished" && !savedRef.current) {
      savedRef.current = true;
      saveMatch(game, "tournament");
      if (game.result === "win") { if (soundEnabled) SFX.win(); if (hapticsEnabled) Haptics.success(); }
      else { if (soundEnabled) SFX.loss(); if (hapticsEnabled) Haptics.error(); }
      const newRounds = [...rounds];
      newRounds[currentRound] = { ...newRounds[currentRound], result: game.result === "win" ? "win" : "loss", userScore: game.userScore, oppScore: game.aiScore };
      setRounds(newRounds);
      if (!postMatchShownRef.current) {
        postMatchShownRef.current = true;
        setTimeout(() => setShowPostMatch(true), 1000);
      }
    }
  }, [game.phase]);

  const advanceRound = () => {
    if (currentRound < AI_OPPONENTS.length - 1) { setCurrentRound(currentRound + 1); setPhase("bracket"); }
  };

  const handleReset = () => {
    resetGame();
    savedRef.current = false;
    postMatchShownRef.current = false;
    setPendingBatFirst(null);
    setTossInfo(null);
    setShowPreMatch(false);
    setShowPostMatch(false);
    setPhase("config");
  };

  const opp = AI_OPPONENTS[currentRound];
  const winsCount = rounds.filter(r => r.result === "win").length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_at_center,hsl(142_71%_45%/0.12),hsl(142_71%_45%/0.04)_55%,transparent_70%)] pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onHome} className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-secondary font-bold">TOURNAMENT</span>
          <span className="text-[7px] font-display text-muted-foreground">R{currentRound + 1}/5</span>
        </div>
        <RulesSheet />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-2 px-4 pb-3 max-w-lg mx-auto w-full overflow-hidden">
        {/* BRACKET VIEW */}
        {phase === "bracket" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-2">
            <div className="text-center">
              <motion.span
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl block mb-1"
              >🏆</motion.span>
              <h2 className="font-display text-lg font-black text-foreground tracking-wider">TOURNAMENT</h2>
              <p className="text-[10px] text-muted-foreground font-display">Win 5 rounds to become champion</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {AI_OPPONENTS.map((_, i) => {
                  const r = rounds[i];
                  return (
                    <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${
                      r?.result === "win" ? "bg-neon-green shadow-[0_0_6px_hsl(142_71%_45%/0.3)]"
                      : r?.result === "loss" ? "bg-out-red"
                      : i === currentRound ? "bg-secondary/50 animate-pulse"
                      : "bg-muted/30"
                    }`} />
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              {AI_OPPONENTS.map((ai, i) => {
                const r = rounds[i];
                const isCurrent = i === currentRound;
                const isPast = r && r.result !== "pending";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-premium rounded-xl p-2.5 flex items-center gap-3 transition-all ${
                      isCurrent ? "border border-secondary/30 shadow-[0_0_15px_hsl(45_93%_58%/0.1)]" : isPast ? "" : "opacity-35"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                      isCurrent ? "bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25" : isPast && r?.result === "win" ? "bg-neon-green/10 border border-neon-green/20" : "bg-muted/30"
                    }`}>{ai.emoji}</div>
                    <div className="flex-1">
                      <span className="font-display text-[10px] font-bold text-foreground block tracking-wider">R{i + 1}: {ai.name}</span>
                      <span className="text-[8px] text-muted-foreground">
                        {isPast && r ? `${r.userScore} - ${r.oppScore}` : isCurrent ? "Next match" : "Locked"}
                      </span>
                    </div>
                    {isPast && r && (
                      <span className={`font-display text-[9px] font-bold px-2 py-1 rounded-lg ${r.result === "win" ? "text-neon-green bg-neon-green/10" : "text-out-red bg-out-red/10"}`}>
                        {r.result === "win" ? "✅ WON" : "❌ LOST"}
                      </span>
                    )}
                    {isCurrent && !isPast && (
                      <span className="text-secondary font-display font-bold text-xs animate-pulse">▶</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {!eliminated && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={startRound}
                className="w-full py-3.5 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-black text-sm rounded-2xl tracking-wider shadow-[0_0_25px_hsl(45_93%_58%/0.2)] border border-secondary/30">
                ⚔️ FIGHT {opp.name.toUpperCase()}
              </motion.button>
            )}

            {eliminated && (
              <div className="text-center space-y-2">
                <p className="font-display text-sm text-out-red font-bold">ELIMINATED — {winsCount}/5 rounds won</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={startTournament}
                  className="w-full py-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl shadow-[0_0_20px_hsl(217_91%_60%/0.2)] border border-primary/30">
                  🔄 RESTART TOURNAMENT
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* CONFIG: Over selector */}
        {phase === "config" && (
          <div className="mt-4">
            <div className="glass-premium rounded-xl p-2.5 flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25 flex items-center justify-center text-lg">{opp.emoji}</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">vs {opp.name}</span>
                <span className="text-[8px] text-muted-foreground block">Round {currentRound + 1}/5</span>
              </div>
            </div>
            <OverSelector playerXP={playerXP} onSelect={handleOverSelect} />
          </div>
        )}

        {/* TOSS */}
        {phase === "toss" && (
          <div className="mt-4">
            <OddEvenToss
              onResult={handleTossResult}
              onTossComplete={handleTossComplete}
              playerName={playerName}
              opponentName={opp.name}
            />
          </div>
        )}

        {/* PLAYING — uses TapPlayingUI */}
        {phase === "playing" && (
          <>
            {/* Opponent banner */}
            <div className="glass-premium rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/25 flex items-center justify-center text-lg">{opp.emoji}</div>
              <div className="flex-1">
                <span className="font-display text-[10px] font-bold text-foreground tracking-wider">vs {opp.name}</span>
                <span className="text-[8px] text-muted-foreground block">Round {currentRound + 1}/5</span>
              </div>
            </div>

            <TapPlayingUI
              phase={game.phase}
              userScore={game.userScore}
              aiScore={game.aiScore}
              userWickets={game.userWickets}
              aiWickets={game.aiWickets}
              target={game.target}
              currentInnings={game.currentInnings}
              isBatting={game.isBatting}
              lastResult={game.lastResult}
              result={game.result}
              ballHistory={game.ballHistory}
              playerName={playerName}
              opponentName={opp.name}
              opponentEmoji={opp.emoji}
              onMove={playBall}
              onReset={handleReset}
              onHome={onHome}
              modeLabel="TOURNAMENT"
              matchConfig={matchConfig}
              innings1Balls={game.innings1Balls}
            />
          </>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5 }}
              className="text-6xl"
            >{game.result === "win" ? "✅" : "❌"}</motion.span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {game.result === "win" ? `BEAT ${opp.name.toUpperCase()}!` : `${opp.name.toUpperCase()} WINS`}
            </h2>
            <div className="glass-premium rounded-2xl p-4 w-full max-w-xs text-center">
              <span className="font-display text-lg text-secondary font-black">{game.userScore}/{game.userWickets}</span>
              <span className="text-muted-foreground mx-2">vs</span>
              <span className="font-display text-lg text-accent font-black">{game.aiScore}/{game.aiWickets}</span>
            </div>

            {game.result === "win" && currentRound === AI_OPPONENTS.length - 1 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-3">
                <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-6xl block">🏆</motion.span>
                <h3 className="font-display text-xl font-black text-secondary" style={{ textShadow: "0 0 20px hsl(45 93% 58% / 0.3)" }}>TOURNAMENT CHAMPION!</h3>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startTournament()}
                  className="w-full py-3 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-bold rounded-2xl shadow-[0_0_20px_hsl(45_93%_58%/0.2)]">
                  🔄 PLAY AGAIN
                </motion.button>
              </motion.div>
            ) : game.result === "win" ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={advanceRound}
                className="w-full max-w-xs py-3.5 bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground font-display font-black rounded-2xl tracking-wider shadow-[0_0_20px_hsl(45_93%_58%/0.2)] border border-secondary/30">
                ⚔️ NEXT ROUND →
              </motion.button>
            ) : (
              <div className="flex gap-3 w-full max-w-xs">
                <motion.button whileTap={{ scale: 0.95 }} onClick={startTournament}
                  className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-display font-bold rounded-2xl shadow-[0_0_15px_hsl(217_91%_60%/0.2)]">
                  🔄 RETRY
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                  className="flex-1 py-3.5 glass-premium text-foreground font-display font-bold rounded-2xl border border-primary/10">HOME</motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Pre-match ceremony */}
      {showPreMatch && tossInfo && (
        <EnhancedPreMatch
          playerName={playerName}
          opponentName={opp.name}
          tossWinner={tossInfo.winner}
          battingFirst={tossInfo.battingFirst}
          onComplete={handlePreMatchComplete}
        />
      )}

      {/* Post-match ceremony */}
      {showPostMatch && game.result && (
        <EnhancedPostMatch
          playerName={playerName}
          opponentName={opp.name}
          result={game.result}
          playerScore={game.userScore}
          opponentScore={game.aiScore}
          playerWickets={game.userWickets}
          opponentWickets={game.aiWickets}
          ballHistory={game.ballHistory}
          onComplete={() => {
            setShowPostMatch(false);
            if (game.result !== "win") setEliminated(true);
            setPhase("result");
          }}
        />
      )}
    </div>
  );
}
