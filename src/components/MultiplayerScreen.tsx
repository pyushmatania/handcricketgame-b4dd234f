import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OddEvenToss from "./OddEvenToss";
import type { Move } from "@/hooks/useHandCricket";

const MOVES: { move: Move; emoji: string; label: string; color: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "border-accent/30 bg-accent/5" },
  { move: 1, emoji: "☝️", label: "1", color: "border-primary/30 bg-primary/5" },
  { move: 2, emoji: "✌️", label: "2", color: "border-neon-green/30 bg-neon-green/5" },
  { move: 3, emoji: "🤟", label: "3", color: "border-secondary/30 bg-secondary/5" },
  { move: 4, emoji: "🖖", label: "4", color: "border-score-gold/30 bg-score-gold/5" },
  { move: 6, emoji: "👍", label: "6", color: "border-primary/40 bg-primary/10" },
];

const BALL_TIMER_MS = 3000;
const RESERVE_TIMER_MS = 10000;

type GameStatus = "waiting" | "toss" | "playing" | "finished" | "abandoned";
type Phase = "lobby" | "waiting" | "toss" | "playing" | "finished";

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
  host_reserve_ms: number;
  guest_reserve_ms: number;
  abandoned_by: string | null;
}

interface Props {
  onHome: () => void;
}

export default function MultiplayerScreen({ onHome }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [games, setGames] = useState<(MultiplayerGame & { host_name?: string })[]>([]);
  const [currentGame, setCurrentGame] = useState<MultiplayerGame | null>(null);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [myName, setMyName] = useState("You");
  const [cooldown, setCooldown] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Timer state
  const [ballTimer, setBallTimer] = useState(BALL_TIMER_MS);
  const [reserveTime, setReserveTime] = useState(RESERVE_TIMER_MS);
  const [usingReserve, setUsingReserve] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ballTimerStartRef = useRef<number | null>(null);
  const reserveUsedRef = useRef(0);

  useEffect(() => {
    if (!user) navigate("/auth");
    // Load my name
    if (user) {
      supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setMyName(data.display_name); });
    }
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

          if (updated.host_move && updated.guest_move) {
            resolveTurn(updated);
          }

          // Guest joined -> go to toss
          if (updated.status === "toss" && phase === "waiting") {
            setPhase("toss");
            loadOpponentName(updated);
          }
          // Game started playing (after toss)
          if (updated.status === "playing" && (phase === "toss" || phase === "waiting")) {
            setPhase("playing");
            loadOpponentName(updated);
          }
          if (updated.status === "finished" || updated.status === "abandoned") {
            setPhase("finished");
            stopTimer();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id, phase]);

  // Timer management
  const myMove = currentGame ? (user?.id === currentGame.host_id ? currentGame.host_move : currentGame.guest_move) : null;
  const waitingForOpponent = myMove !== null;

  useEffect(() => {
    if (phase !== "playing" || !currentGame) return;
    if (waitingForOpponent) { stopTimer(); return; }
    startBallTimer();
    return () => stopTimer();
  }, [currentGame?.current_turn, waitingForOpponent, phase]);

  useEffect(() => {
    if (!currentGame || !user) return;
    const isHost = user.id === currentGame.host_id;
    const myReserve = isHost ? currentGame.host_reserve_ms : currentGame.guest_reserve_ms;
    setReserveTime(myReserve);
  }, [currentGame?.id]);

  const startBallTimer = () => {
    stopTimer();
    setBallTimer(BALL_TIMER_MS);
    setUsingReserve(false);
    reserveUsedRef.current = 0;
    ballTimerStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (ballTimerStartRef.current || Date.now());
      const remaining = BALL_TIMER_MS - elapsed;
      if (remaining > 0) {
        setBallTimer(remaining);
        setUsingReserve(false);
      } else {
        setUsingReserve(true);
        setBallTimer(0);
        const reserveElapsed = elapsed - BALL_TIMER_MS;
        reserveUsedRef.current = reserveElapsed;
        const newReserve = Math.max(0, reserveTime - reserveElapsed);
        setReserveTime(newReserve);
        if (newReserve <= 0) handleAbandon();
      }
    }, 50);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleAbandon = async () => {
    stopTimer();
    if (!currentGame || !user) return;
    const isHost = user.id === currentGame.host_id;
    const winnerId = isHost ? currentGame.guest_id : currentGame.host_id;
    await supabase.from("multiplayer_games").update({
      status: "abandoned" as any, abandoned_by: user.id, winner_id: winnerId,
      ...(isHost ? { host_reserve_ms: 0 } : { guest_reserve_ms: 0 }),
    }).eq("id", currentGame.id);
    const { data: profile } = await supabase.from("profiles").select("abandons, losses, total_matches").eq("user_id", user.id).single();
    if (profile) {
      await supabase.from("profiles").update({
        abandons: (profile.abandons ?? 0) + 1, losses: profile.losses + 1, total_matches: profile.total_matches + 1,
      }).eq("user_id", user.id);
    }
    setPhase("finished");
  };

  const loadGames = async () => {
    const { data } = await supabase.from("multiplayer_games").select("*").eq("status", "waiting").order("created_at", { ascending: false }).limit(10);
    if (data) setGames(data as unknown as MultiplayerGame[]);
  };

  const loadOpponentName = async (game: MultiplayerGame) => {
    const oppId = user?.id === game.host_id ? game.guest_id : game.host_id;
    if (!oppId) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("user_id", oppId).single();
    if (data) setOpponentName(data.display_name);
  };

  const createGame = async () => {
    if (!user) return;
    const { data } = await supabase.from("multiplayer_games")
      .insert({ host_id: user.id, host_reserve_ms: RESERVE_TIMER_MS, guest_reserve_ms: RESERVE_TIMER_MS } as any)
      .select().single();
    if (data) {
      setCurrentGame(data as unknown as MultiplayerGame);
      setPhase("waiting");
      setReserveTime(RESERVE_TIMER_MS);
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) return;
    const { data } = await supabase.from("multiplayer_games")
      .update({ guest_id: user.id, status: "toss" } as any)
      .eq("id", gameId).select().single();
    if (data) {
      const g = data as unknown as MultiplayerGame;
      setCurrentGame(g);
      setPhase("toss");
      setReserveTime(g.guest_reserve_ms);
      loadOpponentName(g);
    }
  };

  const handleTossResult = async (batFirst: boolean) => {
    if (!currentGame || !user) return;
    const isHost = user.id === currentGame.host_id;
    // Host batting = batFirst if host did toss, or !batFirst if guest did toss
    // For simplicity: host always does the toss, so host_batting = batFirst
    const hostBatting = isHost ? batFirst : !batFirst;
    await supabase.from("multiplayer_games").update({
      status: "playing" as any, host_batting: hostBatting,
    }).eq("id", currentGame.id);
    setPhase("playing");
  };

  const submitMove = async (move: Move) => {
    if (!currentGame || !user || cooldown) return;
    setCooldown(true);
    stopTimer();
    const moveStr = String(move);
    const isHost = user.id === currentGame.host_id;
    const reserveUsed = reserveUsedRef.current;
    const newReserve = Math.max(0, reserveTime - reserveUsed);
    setReserveTime(newReserve);
    const updateData: any = isHost
      ? { host_move: moveStr, host_reserve_ms: newReserve }
      : { guest_move: moveStr, guest_reserve_ms: newReserve };
    await supabase.from("multiplayer_games").update(updateData).eq("id", currentGame.id);
    setTimeout(() => setCooldown(false), 1500);
  };

  const resolveTurn = async (game: MultiplayerGame) => {
    if (!user || user.id !== game.host_id) return;
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
      if (battingIsHost) { newHostScore += runs; result = `+${runs} runs to Host`; }
      else { newGuestScore += runs; result = `+${runs} runs to Guest`; }
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

    await supabase.from("multiplayer_games").update({
      host_score: newHostScore, guest_score: newGuestScore, host_move: null, guest_move: null,
      current_turn: game.current_turn + 1, innings: newInnings, host_batting: newHostBatting,
      status: newStatus as any, winner_id: newWinner,
    }).eq("id", game.id);
  };

  const isHost = currentGame && user?.id === currentGame.host_id;
  const isBatting = currentGame ? (isHost ? currentGame.host_batting : !currentGame.host_batting) : false;
  const myScore = currentGame ? (isHost ? currentGame.host_score : currentGame.guest_score) : 0;
  const oppScore = currentGame ? (isHost ? currentGame.guest_score : currentGame.host_score) : 0;
  const ballTimerSec = (ballTimer / 1000).toFixed(1);
  const reserveSec = (reserveTime / 1000).toFixed(1);
  const ballTimerPct = (ballTimer / BALL_TIMER_MS) * 100;
  const reservePct = (reserveTime / RESERVE_TIMER_MS) * 100;
  const isAbandoned = currentGame?.status === "abandoned";
  const abandonedByMe = currentGame?.abandoned_by === user?.id;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(142 71% 45% / 0.05) 0%, transparent 70%)" }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onHome} className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="font-display text-[9px] tracking-[0.2em] text-neon-green font-bold">MULTIPLAYER</span>
        </div>
        <div className="w-9" />
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

            <div className="glass-premium rounded-xl p-3 space-y-1.5">
              <span className="font-display text-[9px] font-bold text-muted-foreground tracking-widest">⏱️ TIMER RULES</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-secondary/20 flex items-center justify-center"><span className="text-[8px]">⏳</span></div>
                <span className="text-[9px] text-muted-foreground"><span className="text-secondary font-bold">3 seconds</span> per ball to pick your shot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-out-red/20 flex items-center justify-center"><span className="text-[8px]">🔋</span></div>
                <span className="text-[9px] text-muted-foreground"><span className="text-out-red font-bold">10 seconds</span> reserve time per match</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center"><span className="text-[8px]">🚫</span></div>
                <span className="text-[9px] text-muted-foreground">Reserve runs out → <span className="text-out-red font-bold">Match Abandoned</span></span>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={createGame}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-black text-sm rounded-2xl glow-primary tracking-wider">
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
                    <motion.button key={g.id} whileTap={{ scale: 0.97 }} onClick={() => joinGame(g.id)}
                      className="w-full glass-score p-4 flex items-center gap-3 text-left">
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

        {/* WAITING FOR OPPONENT */}
        {phase === "waiting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-5">
            {/* Cricket stadium waiting animation */}
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border-2 border-dashed border-primary/30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-4xl"
                >
                  🏏
                </motion.span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="font-display text-lg font-black text-foreground tracking-wider">
                WAITING FOR OPPONENT
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Share the match with a friend or wait for someone to join
              </p>
            </div>

            {/* Match ID card */}
            <div className="glass-premium rounded-2xl p-4 w-full max-w-xs text-center space-y-2">
              <span className="font-display text-[8px] text-muted-foreground tracking-[0.3em]">MATCH CODE</span>
              <p className="font-mono text-lg font-bold text-primary tracking-widest">
                {currentGame?.id.slice(0, 8).toUpperCase()}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-[9px] text-neon-green font-display font-bold">LIVE</span>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                />
              ))}
            </div>

            <button onClick={() => { setPhase("lobby"); setCurrentGame(null); }}
              className="text-[10px] text-out-red/70 font-display mt-4 tracking-wider">
              CANCEL MATCH
            </button>
          </motion.div>
        )}

        {/* TOSS PHASE */}
        {phase === "toss" && currentGame && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center">
            <OddEvenToss
              onResult={handleTossResult}
              playerName={myName}
              opponentName={opponentName}
              isMultiplayer={true}
            />
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === "playing" && currentGame && (
          <>
            <div className="glass-score p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-[7px] text-muted-foreground font-bold tracking-widest block">
                    {isHost ? myName.toUpperCase() : opponentName.toUpperCase()}
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
                    {isHost ? opponentName.toUpperCase() : myName.toUpperCase()}
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

            {/* Timer HUD */}
            {!waitingForOpponent && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-premium rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⏳</span>
                    <span className="font-display text-[8px] font-bold text-muted-foreground tracking-widest">SHOT CLOCK</span>
                  </div>
                  <span className={`font-display text-lg font-black ${ballTimer > 1000 ? "text-neon-green" : ballTimer > 0 ? "text-secondary" : "text-out-red"}`}>
                    {ballTimer > 0 ? ballTimerSec : "0.0"}s
                  </span>
                </div>
                <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={`h-full rounded-full transition-colors ${
                      ballTimer > 1000 ? "bg-gradient-to-r from-neon-green to-neon-green/60" :
                      ballTimer > 0 ? "bg-gradient-to-r from-secondary to-secondary/60" : "bg-out-red"
                    }`}
                    style={{ width: `${ballTimerPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🔋</span>
                    <span className="font-display text-[8px] font-bold text-muted-foreground tracking-widest">RESERVE</span>
                    {usingReserve && (
                      <motion.span animate={{ opacity: [1, 0.3] }} transition={{ duration: 0.5, repeat: Infinity }}
                        className="text-[7px] font-display font-bold text-out-red tracking-wider">DRAINING!</motion.span>
                    )}
                  </div>
                  <span className={`font-display text-sm font-black ${reserveTime > 5000 ? "text-foreground" : reserveTime > 2000 ? "text-secondary" : "text-out-red"}`}>
                    {reserveSec}s
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    reserveTime > 5000 ? "bg-gradient-to-r from-accent to-accent/60" :
                    reserveTime > 2000 ? "bg-gradient-to-r from-secondary to-secondary/60" :
                    "bg-gradient-to-r from-out-red to-out-red/60"
                  }`} style={{ width: `${reservePct}%` }} />
                </div>
              </motion.div>
            )}

            {/* Result flash */}
            <AnimatePresence>
              {lastResult && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass-score p-3 text-center">
                  <span className="font-display text-sm font-bold text-foreground">{lastResult}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waiting for opponent */}
            {waitingForOpponent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-score p-4 text-center">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
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
                    <motion.button key={m.label} whileTap={{ scale: 0.8 }} onClick={() => submitMove(m.move)} disabled={cooldown}
                      className={`py-5 rounded-2xl font-display font-bold text-sm flex flex-col items-center gap-1.5 transition-all border ${
                        cooldown ? "opacity-30 cursor-not-allowed border-transparent bg-muted/30" : `${m.color} text-foreground`
                      }`}>
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
            <span className="text-6xl">
              {isAbandoned ? (abandonedByMe ? "🏳️" : "🏆") : currentGame.winner_id === user.id ? "🏆" : currentGame.winner_id ? "😞" : "🤝"}
            </span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {isAbandoned ? (abandonedByMe ? "ABANDONED" : "OPPONENT ABANDONED") : currentGame.winner_id === user.id ? "YOU WIN!" : currentGame.winner_id ? "YOU LOST" : "DRAW!"}
            </h2>
            {isAbandoned && (
              <p className="text-[10px] text-out-red/70 font-display tracking-wider">
                {abandonedByMe ? "You ran out of time" : "Your opponent ran out of time"}
              </p>
            )}
            <div className="glass-score p-4 w-full max-w-xs">
              <div className="flex justify-between">
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">{isHost ? myName.toUpperCase() : opponentName.toUpperCase()}</span>
                  <span className="font-display text-2xl font-black text-score-gold">{currentGame.host_score}</span>
                </div>
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">{isHost ? opponentName.toUpperCase() : myName.toUpperCase()}</span>
                  <span className="font-display text-2xl font-black text-accent">{currentGame.guest_score}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setPhase("lobby"); setCurrentGame(null); setReserveTime(RESERVE_TIMER_MS); }}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl glow-primary tracking-wider">
                ⚡ PLAY AGAIN
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
                className="flex-1 py-3.5 bg-muted text-foreground font-display font-bold rounded-2xl tracking-wider">
                HOME
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
