import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Move } from "@/hooks/useHandCricket";

const MOVES: { move: Move; emoji: string; label: string; color: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "border-accent/30 bg-accent/5" },
  { move: 1, emoji: "☝️", label: "1", color: "border-primary/30 bg-primary/5" },
  { move: 2, emoji: "✌️", label: "2", color: "border-neon-green/30 bg-neon-green/5" },
  { move: 3, emoji: "🤟", label: "3", color: "border-secondary/30 bg-secondary/5" },
  { move: 4, emoji: "🖖", label: "4", color: "border-score-gold/30 bg-score-gold/5" },
  { move: 6, emoji: "👍", label: "6", color: "border-primary/40 bg-primary/10" },
];

type GameStatus = "waiting" | "playing" | "finished";

interface MultiplayerGame {
  id: string;
  host_id: string;
  guest_id: string | null;
  status: GameStatus;
  host_score: number;
  guest_score: number;
  host_move: string | null;
  guest_move: string | null;
  current_turn: number;
  innings: number;
  host_batting: boolean;
  winner_id: string | null;
}

interface Props {
  onHome: () => void;
}

export default function MultiplayerScreen({ onHome }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"lobby" | "waiting" | "playing" | "finished">("lobby");
  const [games, setGames] = useState<(MultiplayerGame & { host_name?: string })[]>([]);
  const [currentGame, setCurrentGame] = useState<MultiplayerGame | null>(null);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [cooldown, setCooldown] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  // Load lobby
  useEffect(() => {
    if (phase !== "lobby") return;
    loadGames();
    const interval = setInterval(loadGames, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // Subscribe to game changes
  useEffect(() => {
    if (!currentGame) return;

    const channel = supabase
      .channel(`game-${currentGame.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "multiplayer_games", filter: `id=eq.${currentGame.id}` },
        (payload) => {
          const updated = payload.new as MultiplayerGame;
          setCurrentGame(updated);

          // Check if both moves submitted
          if (updated.host_move && updated.guest_move) {
            resolveTurn(updated);
          }

          if (updated.status === "playing" && phase === "waiting") {
            setPhase("playing");
            loadOpponentName(updated);
          }
          if (updated.status === "finished") {
            setPhase("finished");
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id, phase]);

  const loadGames = async () => {
    const { data } = await supabase
      .from("multiplayer_games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setGames(data as MultiplayerGame[]);
  };

  const loadOpponentName = async (game: MultiplayerGame) => {
    const oppId = user?.id === game.host_id ? game.guest_id : game.host_id;
    if (!oppId) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", oppId).single();
    if (data) setOpponentName(data.display_name);
  };

  const createGame = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("multiplayer_games")
      .insert({ host_id: user.id })
      .select()
      .single();
    if (data) {
      setCurrentGame(data as MultiplayerGame);
      setPhase("waiting");
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("multiplayer_games")
      .update({ guest_id: user.id, status: "playing" })
      .eq("id", gameId)
      .select()
      .single();
    if (data) {
      const g = data as MultiplayerGame;
      setCurrentGame(g);
      setPhase("playing");
      loadOpponentName(g);
    }
  };

  const submitMove = async (move: Move) => {
    if (!currentGame || !user || cooldown) return;
    setCooldown(true);

    const moveStr = String(move);
    const isHost = user.id === currentGame.host_id;
    const updateField = isHost ? { host_move: moveStr } : { guest_move: moveStr };

    await supabase
      .from("multiplayer_games")
      .update(updateField)
      .eq("id", currentGame.id);

    setTimeout(() => setCooldown(false), 1500);
  };

  const resolveTurn = async (game: MultiplayerGame) => {
    if (!user || user.id !== game.host_id) return; // Only host resolves

    const hostMove = game.host_move!;
    const guestMove = game.guest_move!;
    const battingIsHost = game.host_batting;

    let newHostScore = game.host_score;
    let newGuestScore = game.guest_score;
    let newInnings = game.innings;
    let newHostBatting = game.host_batting;
    let newStatus: GameStatus = "playing";
    let newWinner: string | null = null;
    let result = "";

    const isOut = hostMove === guestMove;

    if (isOut) {
      result = `Both played ${hostMove} — OUT!`;
      if (game.innings === 1) {
        newInnings = 2;
        newHostBatting = !game.host_batting;
      } else {
        newStatus = "finished";
        if (battingIsHost) {
          newWinner = newHostScore > newGuestScore ? game.host_id : newGuestScore > newHostScore ? game.guest_id! : null;
        } else {
          newWinner = newGuestScore > newHostScore ? game.guest_id! : newHostScore > newGuestScore ? game.host_id : null;
        }
      }
    } else {
      const battingMove = battingIsHost ? hostMove : guestMove;
      const runs = battingMove === "DEF" ? 0 : parseInt(battingMove);

      if (battingIsHost) {
        newHostScore += runs;
        result = `+${runs} runs to Host`;
      } else {
        newGuestScore += runs;
        result = `+${runs} runs to Guest`;
      }

      // Check chase target
      if (game.innings === 2) {
        const target = battingIsHost ? newGuestScore : newHostScore;
        const chaser = battingIsHost ? newHostScore : newGuestScore;
        if (chaser > target) {
          newStatus = "finished";
          newWinner = battingIsHost ? game.host_id : game.guest_id!;
        }
      }
    }

    setLastResult(result);
    setTimeout(() => setLastResult(null), 2000);

    await supabase
      .from("multiplayer_games")
      .update({
        host_score: newHostScore,
        guest_score: newGuestScore,
        host_move: null,
        guest_move: null,
        current_turn: game.current_turn + 1,
        innings: newInnings,
        host_batting: newHostBatting,
        status: newStatus,
        winner_id: newWinner,
      })
      .eq("id", game.id);
  };

  const isHost = currentGame && user?.id === currentGame.host_id;
  const isBatting = currentGame
    ? (isHost ? currentGame.host_batting : !currentGame.host_batting)
    : false;
  const myScore = currentGame ? (isHost ? currentGame.host_score : currentGame.guest_score) : 0;
  const oppScore = currentGame ? (isHost ? currentGame.guest_score : currentGame.host_score) : 0;
  const myMove = currentGame ? (isHost ? currentGame.host_move : currentGame.guest_move) : null;
  const waitingForOpponent = myMove !== null;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onHome} className="text-muted-foreground hover:text-foreground text-sm font-bold active:scale-95 transition-transform">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.15em] text-neon-green font-bold">MULTIPLAYER</span>
        </div>
        <div className="w-12" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col gap-3 px-4 pb-4 max-w-lg mx-auto w-full">
        {/* LOBBY */}
        {phase === "lobby" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-4">
            <div className="text-center">
              <span className="text-5xl block mb-3">⚔️</span>
              <h2 className="font-display text-xl font-black text-foreground tracking-wider">MULTIPLAYER LOBBY</h2>
              <p className="text-[10px] text-muted-foreground mt-1">Challenge another player in real-time</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={createGame}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-black text-sm rounded-2xl glow-primary tracking-wider"
            >
              🏏 CREATE MATCH
            </motion.button>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-accent" />
                <h3 className="font-display text-[9px] font-bold text-muted-foreground tracking-[0.25em]">OPEN MATCHES</h3>
              </div>
              {games.length === 0 ? (
                <div className="glass-score p-6 text-center">
                  <span className="text-3xl block mb-2">🏟️</span>
                  <p className="text-xs text-muted-foreground">No open matches — create one!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {games.filter(g => g.host_id !== user.id).map((g) => (
                    <motion.button
                      key={g.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => joinGame(g.id)}
                      className="w-full glass-score p-4 flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <span className="text-lg">🏏</span>
                      </div>
                      <div className="flex-1">
                        <span className="font-display text-xs font-bold text-foreground block">Waiting for opponent</span>
                        <span className="text-[9px] text-muted-foreground">Tap to join</span>
                      </div>
                      <span className="text-primary font-display text-xs font-bold">JOIN →</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* WAITING */}
        {phase === "waiting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
            />
            <h2 className="font-display text-lg font-black text-foreground tracking-wider">WAITING FOR OPPONENT</h2>
            <p className="text-[10px] text-muted-foreground text-center">Share the lobby with a friend to play!</p>
            <p className="text-[8px] text-muted-foreground/50 font-mono">{currentGame?.id.slice(0, 8)}...</p>
            <button onClick={() => { setPhase("lobby"); setCurrentGame(null); }} className="text-[10px] text-out-red/70 font-display mt-4">
              CANCEL
            </button>
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === "playing" && currentGame && (
          <>
            {/* Score HUD */}
            <div className="glass-score p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-[7px] text-muted-foreground font-bold tracking-widest block">
                    {isHost ? "YOU" : opponentName.toUpperCase()}
                  </span>
                  <span className="font-display text-2xl font-black text-score-gold text-glow-gold leading-none">
                    {currentGame.host_score}
                  </span>
                </div>
                <div className="px-4">
                  <span className="text-[8px] font-display text-muted-foreground font-bold">VS</span>
                  <p className="text-[7px] text-accent font-display mt-1">INN {currentGame.innings}</p>
                </div>
                <div className="text-center flex-1">
                  <span className="text-[7px] text-muted-foreground font-bold tracking-widest block">
                    {isHost ? opponentName.toUpperCase() : "YOU"}
                  </span>
                  <span className="font-display text-2xl font-black text-accent leading-none">
                    {currentGame.guest_score}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className={`text-[9px] font-display font-bold tracking-wider ${isBatting ? "text-secondary" : "text-primary"}`}>
                  {isBatting ? "🏏 YOU'RE BATTING" : "🎯 YOU'RE BOWLING"}
                </span>
              </div>
            </div>

            {/* Result flash */}
            <AnimatePresence>
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-score p-3 text-center"
                >
                  <span className="font-display text-sm font-bold text-foreground">{lastResult}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waiting indicator */}
            {waitingForOpponent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-score p-4 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-3xl block mb-2">⏳</span>
                </motion.div>
                <p className="font-display text-xs font-bold text-muted-foreground tracking-wider">
                  WAITING FOR {opponentName.toUpperCase()}...
                </p>
              </motion.div>
            )}

            {/* Move buttons */}
            {!waitingForOpponent && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-auto">
                <p className="text-center text-[8px] text-muted-foreground font-display mb-2 tracking-widest">
                  {isBatting ? "⚡ CHOOSE YOUR SHOT" : "🎯 CHOOSE YOUR BOWL"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {MOVES.map((m) => (
                    <motion.button
                      key={m.label}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => submitMove(m.move)}
                      disabled={cooldown}
                      className={`py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border ${
                        cooldown ? "opacity-30 cursor-not-allowed border-transparent bg-muted/30" : `${m.color} text-foreground`
                      }`}
                    >
                      <span className="text-3xl">{m.emoji}</span>
                      <span className="text-[10px] tracking-wider">{m.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* FINISHED */}
        {phase === "finished" && currentGame && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl">{currentGame.winner_id === user.id ? "🏆" : currentGame.winner_id ? "😞" : "🤝"}</span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {currentGame.winner_id === user.id ? "YOU WIN!" : currentGame.winner_id ? "YOU LOST" : "DRAW!"}
            </h2>
            <div className="glass-score p-4 w-full max-w-xs">
              <div className="flex justify-between">
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">HOST</span>
                  <span className="font-display text-2xl font-black text-score-gold">{currentGame.host_score}</span>
                </div>
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">GUEST</span>
                  <span className="font-display text-2xl font-black text-accent">{currentGame.guest_score}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setPhase("lobby"); setCurrentGame(null); }}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl glow-primary tracking-wider"
              >
                ⚡ PLAY AGAIN
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onHome}
                className="flex-1 py-3.5 bg-muted text-foreground font-display font-bold rounded-2xl tracking-wider"
              >
                HOME
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
