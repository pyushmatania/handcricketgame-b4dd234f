import { useState, useEffect, useCallback, useRef } from "react";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OddEvenToss from "./OddEvenToss";
import SpinningCricketBall from "./SpinningCricketBall";
import WaitingRoom from "./WaitingRoom";
import VSIntroScreen from "./VSIntroScreen";
import TapPlayingUI from "./TapPlayingUI";
import EnhancedPreMatch from "./EnhancedPreMatch";
import EnhancedPostMatch from "./EnhancedPostMatch";
import { pickConfiguredMatchCommentators, type Commentator } from "@/lib/commentaryDuo";
import { useSettings } from "@/contexts/SettingsContext";
import type { Move, BallResult } from "@/hooks/useHandCricket";
import {
  claimMultiplayerGame,
  createMultiplayerRoom,
  formatPostgrestError,
  logPostgrestError,
  mapCreateRoomError,
  mapJoinRoomError,
} from "@/lib/multiplayerRoom";

const MOVES: { move: Move; emoji: string; label: string; color: string }[] = [
  { move: "DEF", emoji: "✊", label: "DEF", color: "border-accent/30 bg-accent/5" },
  { move: 1, emoji: "☝️", label: "1", color: "border-primary/30 bg-primary/5" },
  { move: 2, emoji: "✌️", label: "2", color: "border-neon-green/30 bg-neon-green/5" },
  { move: 3, emoji: "🤟", label: "3", color: "border-secondary/30 bg-secondary/5" },
  { move: 4, emoji: "🖖", label: "4", color: "border-score-gold/30 bg-score-gold/5" },
  { move: 6, emoji: "👍", label: "6", color: "border-primary/40 bg-primary/10" },
];

const TURN_TIMER_MS = 5000; // 5s per turn
const GAME_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_MISSES = 3; // 3 missed turns = forfeit
const MOVE_SETS: Record<GameType, { move: Move; emoji: string; label: string; color: string }[]> = {
  ar: MOVES,
  tap: MOVES.filter((m) => m.move !== "DEF"),
  tournament: MOVES,
};

type GameStatus = "waiting" | "toss" | "playing" | "finished" | "abandoned" | "cancelled";
type Phase = "lobby" | "waiting" | "toss" | "playing" | "finished";
type GameType = "ar" | "tap" | "tournament";
type MatchPhase = "waiting_for_guest" | "pre_match_intro" | "toss" | "pre_round_countdown" | "action_window" | "resolving_turn" | "round_result" | "innings_break" | "match_finished" | "abandoned";

interface MultiplayerGame {
  id: string;
  host_id: string;
  guest_id: string | null;
  target_guest_id: string | null;
  status: GameStatus;
  host_score: number;
  guest_score: number;
  host_move: string | null;
  guest_move: string | null;
  current_turn: number;
  innings: number;
  host_batting: boolean;
  winner_id: string | null;
  game_type: GameType;
  room_code: string;
  started_at?: string | null;
  phase?: MatchPhase;
  phase_started_at?: string | null;
  turn_deadline_at?: string | null;
  turn_number?: number;
  host_reserve_ms: number;
  guest_reserve_ms: number;
  abandoned_by: string | null;
  created_at?: string;
}

interface LobbyGame extends MultiplayerGame {
  host_name: string;
  host_avatar_index: number;
  host_wins: number;
  host_total_matches: number;
  time_left_ms: number;
}

interface Props {
  onHome: () => void;
}

function statusToPhase(status: GameStatus): Phase {
  if (status === "waiting") return "waiting";
  if (status === "toss") return "toss";
  if (status === "playing") return "playing";
  return "finished";
}
function gameTypeLabel(gameType: GameType): string {
  if (gameType === "tap") return "TAP DUEL";
  if (gameType === "tournament") return "TOURNAMENT DUEL";
  return "AR DUEL";
}

export default function MultiplayerScreen({ onHome }: Props) {
  const { user } = useAuth();
  const { commentaryVoice } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [games, setGames] = useState<LobbyGame[]>([]);
  const [lobbyTab, setLobbyTab] = useState<"join" | "create">("join");
  const [currentGame, setCurrentGame] = useState<MultiplayerGame | null>(null);
  const [ownHostedGame, setOwnHostedGame] = useState<LobbyGame | null>(null);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [opponentAvatarIndex, setOpponentAvatarIndex] = useState(1);
  const [myAvatarIndex, setMyAvatarIndex] = useState(0);
  const [myName, setMyName] = useState("You");
  const [showVSIntro, setShowVSIntro] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastBallResult, setLastBallResult] = useState<BallResult | null>(null);
  const [joinState, setJoinState] = useState<"idle" | "joining" | "failed" | "full" | "expired">("idle");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType>("ar");
  const [createModePickerOpen, setCreateModePickerOpen] = useState(false);
  const [lobbyMessage, setLobbyMessage] = useState<string | null>(null);

  // Timer state — 5s per turn countdown
  const [turnCountdownMs, setTurnCountdownMs] = useState(TURN_TIMER_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnStartRef = useRef<number>(Date.now());
  const [myConsecutiveMisses, setMyConsecutiveMisses] = useState(0);
  const [oppConsecutiveMisses, setOppConsecutiveMisses] = useState(0);
  
  // Tease messages
  const TEASE_MESSAGES = [
    { text: "Bro sleeping or playing? 😴💤", unlocked: true },
    { text: "My grandma plays faster than you 👵🏏", unlocked: true },
    { text: "Even the pitch is getting bored 🥱", unlocked: true },
    { text: "Scared to lose? Just quit already 🏳️😂", unlocked: false, cost: 50 },
    { text: "Your batting is as useful as a chocolate bat 🍫", unlocked: false, cost: 75 },
    { text: "I've seen better shots from a broken TV 📺", unlocked: false, cost: 100 },
    { text: "Are you playing cricket or sleeping cricket? 💤🏏", unlocked: false, cost: 150 },
    { text: "Even Dinda would beat you today 😭", unlocked: false, cost: 200 },
  ];
  const [sentTease, setSentTease] = useState<string | null>(null);
  const [receivedTease, setReceivedTease] = useState<string | null>(null);
  const [showTeasePanel, setShowTeasePanel] = useState(false);
  const [showPvPPostMatch, setShowPvPPostMatch] = useState(false);
  const [showPvPPreMatch, setShowPvPPreMatch] = useState(false);
  const [pvpBallHistory, setPvpBallHistory] = useState<BallResult[]>([]);
  const [matchCommentators] = useState<[Commentator, Commentator]>(() => pickConfiguredMatchCommentators(commentaryVoice));
  const pvpPostMatchShownRef = useRef(false);
  const pvpPreMatchShownRef = useRef(false);
  const [rivalryStats, setRivalryStats] = useState<{
    myWins: number; theirWins: number; totalGames: number;
    myHighScore: number; theirHighScore: number;
    myAvgScore?: number; theirAvgScore?: number;
    lastResult?: "win" | "loss" | "draw";
    winStreak?: number; loseStreak?: number;
  } | null>(null);

  // Rematch invite state
  const [rematchSent, setRematchSent] = useState(false);
  const [rematchCountdown, setRematchCountdown] = useState<number | null>(null);
  const [rematchExpiredMsg, setRematchExpiredMsg] = useState<string | null>(null);
  const [incomingRematch, setIncomingRematch] = useState<{
    inviteId: string;
    gameId: string;
    fromName: string;
  } | null>(null);
  const [incomingRematchCountdown, setIncomingRematchCountdown] = useState<number | null>(null);

  const resolvedTurnRef = useRef<string | null>(null);
  const gameIdFromQuery = searchParams.get("game");

  useEffect(() => {
    if (!user) navigate("/auth");
    if (user) {
      supabase.from("profiles").select("display_name, avatar_index").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) { setMyName(data.display_name); setMyAvatarIndex((data as any).avatar_index ?? 0); } });
    }
  }, [user, navigate]);

  const joinExistingGame = useCallback(async (gameId: string) => {
    if (!user) return null;

    const { data: existingGame } = await supabase
      .from("multiplayer_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (!existingGame) {
      setJoinState("expired");
      setLobbyMessage("Match expired or removed.");
      return null;
    }

    const game = existingGame as unknown as MultiplayerGame;

    if (["finished", "abandoned", "cancelled"].includes(game.status)) {
      setJoinState("expired");
      setLobbyMessage("Match expired or already ended.");
      return null;
    }

    if (game.host_id === user.id || game.guest_id === user.id) {
      setJoinState("idle");
      setRoomCodeError(null);
      setLobbyMessage(null);
      return game;
    }

    const { data: claimedGameId, error: claimError } = await claimMultiplayerGame(gameId);

    if (claimError) {
      logPostgrestError("joinExistingGame rpc claim failed", claimError, {
        game_id: gameId,
        user_id: user.id,
      });

      const claimText = `${mapJoinRoomError(claimError)} — ${formatPostgrestError(claimError)}`;
      const lower = `${claimError?.message ?? ""} ${claimError?.details ?? ""}`.toLowerCase();

      if (lower.includes("already full") || lower.includes("another player")) {
        setJoinState("full");
      } else if (lower.includes("expired") || lower.includes("not found") || lower.includes("no longer joinable")) {
        setJoinState("expired");
      } else {
        setJoinState("failed");
      }

      setRoomCodeError(mapJoinRoomError(claimError));
      setLobbyMessage(claimText);
      return null;
    }

    const finalGameId = (claimedGameId as string) || gameId;
    const { data: updatedGame } = await supabase
      .from("multiplayer_games")
      .select("*")
      .eq("id", finalGameId)
      .maybeSingle();

    if (updatedGame && (((updatedGame as any).guest_id === user.id) || ((updatedGame as any).host_id === user.id))) {
      setJoinState("idle");
      setRoomCodeError(null);
      setLobbyMessage(null);
      return updatedGame as any as MultiplayerGame;
    }

    setJoinState("failed");
    setLobbyMessage("Join failed — room claim did not attach you to the match.");
    return null;
  }, [user]);

  useEffect(() => {
    if (!user || !gameIdFromQuery) return;

    const hydrateGame = async () => {
      console.log("[MP] hydrateGame", { gameIdFromQuery, currentGameId: currentGame?.id, phase });

      // If already viewing this game, just refresh its state
      if (currentGame?.id === gameIdFromQuery && phase !== "lobby") {
        const { data: refreshed } = await supabase
          .from("multiplayer_games")
          .select("*")
          .eq("id", gameIdFromQuery)
          .maybeSingle();
        if (refreshed) {
          const g = refreshed as unknown as MultiplayerGame;
          setCurrentGame(g);
          setPhase(statusToPhase(g.status));
          if (g.guest_id) loadOpponentName(g);
        }
        return;
      }

      setJoinState("joining");
      const game = await joinExistingGame(gameIdFromQuery);
      console.log("[MP] hydrateGame joinExistingGame result", { game: game?.id, status: game?.status });
      if (!game) return;

      const isParticipant =
        game.host_id === user.id ||
        game.guest_id === user.id;

      if (!isParticipant) return;

      setCurrentGame(game);
      setPhase(statusToPhase(game.status));
      // Timer resets happen in useEffect
      if (game.guest_id) {
        loadOpponentName(game);
      }
    };

    void hydrateGame();
  }, [user, gameIdFromQuery]);

  useEffect(() => {
    if (!user || gameIdFromQuery || phase !== "lobby") return;

    const restoreExistingGame = async () => {
      const { data } = await supabase
        .from("multiplayer_games")
        .select("*")
        .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
        .in("status", ["waiting", "toss", "playing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;
      if (Date.now() - new Date((data as any).updated_at).getTime() > GAME_EXPIRY_MS) return;
      navigate(`/game/multiplayer?game=${(data as any).id}`, { replace: true });
    };

    void restoreExistingGame();
  }, [user, gameIdFromQuery, phase, navigate]);

  // Load lobby & tick timers
  useEffect(() => {
    if (phase !== "lobby") return;
    loadGames();
    const loadInterval = setInterval(loadGames, 5000);
    // Tick lobby game timers every second
    const tickInterval = setInterval(() => {
      setGames(prev => prev
        .map(g => ({ ...g, time_left_ms: Math.max(0, GAME_EXPIRY_MS - (Date.now() - new Date(g.created_at || "").getTime())) }))
        .filter(g => g.time_left_ms > 0)
      );
    }, 1000);
    return () => { clearInterval(loadInterval); clearInterval(tickInterval); };
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
          const prevPhase = phase;
          const nextPhase = statusToPhase(updated.status);
          
          setCurrentGame(updated);

          if (updated.guest_id) {
            loadOpponentName(updated);
          }

          // Show VS intro + pre-match when transitioning from waiting to toss
          if (prevPhase === "waiting" && nextPhase === "toss" && !showVSIntro) {
            setShowVSIntro(true);
            if (!pvpPreMatchShownRef.current) {
              pvpPreMatchShownRef.current = true;
            }
            // Phase will be set after VS intro completes
          } else {
            setPhase(nextPhase);
          }

          if (updated.host_move && updated.guest_move) {
            resolveTurn(updated);
          }

          // Check for incoming tease
          const payload_data = (updated as any).round_result_payload;
          if (payload_data?.tease && payload_data?.from !== user?.id) {
            setReceivedTease(payload_data.tease);
            setTimeout(() => setReceivedTease(null), 4000);
          }

          if (nextPhase === "finished") {
            stopTimer();
            // Trigger PvP post-match ceremony
            if (!pvpPostMatchShownRef.current) {
              pvpPostMatchShownRef.current = true;
              setTimeout(() => setShowPvPPostMatch(true), 1000);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentGame?.id]);

  // Subscribe to rematch invites when game is finished
  useEffect(() => {
    if (!user || !currentGame || currentGame.status !== "finished") return;

    // Poll for incoming rematch invites from opponent
    const opponentId = user.id === currentGame.host_id ? currentGame.guest_id : currentGame.host_id;
    if (!opponentId) return;

    const checkRematch = async () => {
      const { data } = await supabase
        .from("match_invites")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("from_user_id", opponentId)
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data && !incomingRematch) {
        setIncomingRematch({
          inviteId: data.id,
          gameId: data.game_id,
          fromName: opponentName,
        });
      }
    };

    checkRematch();
    const interval = setInterval(checkRematch, 3000);

    // Also subscribe to realtime for faster response
    const channel = supabase
      .channel(`rematch-invites-${currentGame.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_invites", filter: `to_user_id=eq.${user.id}` },
        (payload) => {
          const invite = payload.new as any;
          if (invite.from_user_id === opponentId && invite.status === "pending") {
            setIncomingRematch({
              inviteId: invite.id,
              gameId: invite.game_id,
              fromName: opponentName,
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentGame?.id, currentGame?.status, opponentName]);

  // ─── Gaslighting messages when rematch expires ──────────────────
  const GASLIGHT_WINNER = [
    `${opponentName} ghosted you... guess one beating was enough 💀`,
    `They saw your score and chose peace. Smart move honestly 😏`,
    `${opponentName} is probably still crying. Give them time 🥲`,
    `No response. Your dominance broke their spirit 👑`,
    `${opponentName} left the chat. Championship mentality can't be matched 🏆`,
    `Radio silence. They know they can't handle the heat 🔥`,
    `${opponentName} chose self-care over self-destruction. Wise 🧘`,
    `Timeout! ${opponentName} is still recovering from that last over 😂`,
  ];
  const GASLIGHT_LOSER = [
    `${opponentName} didn't even bother... you're not worth their time apparently 💅`,
    `Ghosted. Even ${opponentName} thinks you need more practice 📚`,
    `No response. Maybe they felt bad about destroying you again 🤷`,
    `${opponentName} said "too easy, next" without even clicking 😬`,
    `Timeout! ${opponentName} probably forgot you exist already 👻`,
    `They're celebrating their win, not thinking about you 🎉`,
    `${opponentName} moved on faster than your batting collapse 📉`,
    `No rematch needed when the outcome is already decided 🗑️`,
  ];

  // Rematch countdown — 45s timer for sent rematch invites
  useEffect(() => {
    if (!rematchSent) { setRematchCountdown(null); return; }
    setRematchCountdown(45);
    const interval = setInterval(() => {
      setRematchCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setRematchSent(false);
          setRematchCountdown(null);
          const didWin = currentGame?.winner_id === user?.id;
          const pool = didWin ? GASLIGHT_WINNER : GASLIGHT_LOSER;
          setRematchExpiredMsg(pool[Math.floor(Math.random() * pool.length)]);
          setTimeout(() => setRematchExpiredMsg(null), 6000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rematchSent]);

  // Incoming rematch countdown — 45s for the receiver
  useEffect(() => {
    if (!incomingRematch) { setIncomingRematchCountdown(null); return; }
    // Notification chime
    try {
      const ctx = new AudioContext();
      if (ctx.state === "suspended") ctx.resume();
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
      navigator.vibrate?.([100, 50, 150]);
    } catch {}
    setIncomingRematchCountdown(45);
    const interval = setInterval(() => {
      setIncomingRematchCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (incomingRematch) {
            supabase.from("match_invites").update({
              status: "expired", declined_at: new Date().toISOString(),
            }).eq("id", incomingRematch.inviteId).then(() => {});
          }
          setIncomingRematch(null);
          setIncomingRematchCountdown(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingRematch?.inviteId]);

  // Timer management — 5s synced countdown per turn
  const myMove = currentGame ? (user?.id === currentGame.host_id ? currentGame.host_move : currentGame.guest_move) : null;
  const waitingForOpponent = myMove !== null;
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (phase !== "playing" || !currentGame) return;
    if (waitingForOpponent) { stopTimer(); return; }
    // Reset countdown for new turn
    autoSubmitRef.current = false;
    turnStartRef.current = Date.now();
    setTurnCountdownMs(TURN_TIMER_MS);
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - turnStartRef.current;
      const remaining = Math.max(0, TURN_TIMER_MS - elapsed);
      setTurnCountdownMs(remaining);
      if (remaining <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        // Auto-submit random move
        const randomMoves: Move[] = [1, 2, 3, 4, 6];
        const randomMove = randomMoves[Math.floor(Math.random() * randomMoves.length)];
        setMyConsecutiveMisses(prev => {
          const newMisses = prev + 1;
          if (newMisses >= MAX_CONSECUTIVE_MISSES) {
            // Forfeit after 3 consecutive misses
            handleAbandon();
          }
          return newMisses;
        });
        submitMove(randomMove);
        stopTimer();
      }
    }, 50);
    return () => stopTimer();
  }, [currentGame?.current_turn, waitingForOpponent, phase]);

  // Host-side phase transition (pre_round_countdown -> action_window)
  useEffect(() => {
    if (!currentGame || !user) return;
    if (user.id !== currentGame.host_id) return;
    if (currentGame.phase === "pre_round_countdown" && currentGame.phase_started_at) {
      const ms = Date.now() - new Date(currentGame.phase_started_at).getTime();
      if (ms >= 1500) {
        (supabase.from("multiplayer_games") as any).update({
          phase: "action_window",
          phase_started_at: new Date().toISOString(),
          turn_deadline_at: new Date(Date.now() + TURN_TIMER_MS).toISOString(),
          status: "playing",
        }).eq("id", currentGame.id).eq("phase", "pre_round_countdown");
      }
    }
    if (currentGame.phase === "action_window" && currentGame.turn_deadline_at && Date.now() >= new Date(currentGame.turn_deadline_at).getTime()) {
      const isHostMoveMissing = !currentGame.host_move;
      const isGuestMoveMissing = !currentGame.guest_move;
      if (isHostMoveMissing || isGuestMoveMissing) {
        const randomMoves: Move[] = [1, 2, 3, 4, 6];
        const rndHost = randomMoves[Math.floor(Math.random() * randomMoves.length)];
        const rndGuest = randomMoves[Math.floor(Math.random() * randomMoves.length)];
        (supabase.from("multiplayer_games") as any).update({
          ...(isHostMoveMissing ? { host_move: String(rndHost), host_move_submitted_at: new Date().toISOString() } : {}),
          ...(isGuestMoveMissing ? { guest_move: String(rndGuest), guest_move_submitted_at: new Date().toISOString() } : {}),
          phase: "resolving_turn",
        }).eq("id", currentGame.id).eq("phase", "action_window");
      }
    }
  }, [currentGame?.id, currentGame?.phase, currentGame?.phase_started_at, currentGame?.turn_deadline_at, currentGame?.host_move, currentGame?.guest_move, user?.id]);

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
    if (!user) {
      setGames([]);
      return;
    }

    const { data } = await supabase
      .from("multiplayer_games")
      .select("*")
      .eq("status", "waiting")
      .or(`target_guest_id.is.null,target_guest_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20);
    const { data: ownData } = await supabase
      .from("multiplayer_games")
      .select("*")
      .eq("host_id", user.id)
      .in("status", ["waiting", "toss", "playing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data || !data.length) { setGames([]); if (ownData) setOwnHostedGame(ownData as unknown as LobbyGame); return; }
    // Filter expired games
    const now = Date.now();
    const validGames = (data as any[]).filter(g => {
      const age = now - new Date(g.created_at).getTime();
      return age < GAME_EXPIRY_MS;
    });
    if (!validGames.length) { setGames([]); return; }
    // Fetch host profiles
    const hostIds = [...new Set(validGames.map(g => g.host_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_index, wins, total_matches").in("user_id", hostIds);
    const profileMap: Record<string, any> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.user_id] = p; });
    const lobbyGames: LobbyGame[] = validGames.map(g => ({
      ...g,
      host_name: profileMap[g.host_id]?.display_name || "Player",
      host_avatar_index: profileMap[g.host_id]?.avatar_index || 0,
      host_wins: profileMap[g.host_id]?.wins || 0,
      host_total_matches: profileMap[g.host_id]?.total_matches || 0,
      time_left_ms: Math.max(0, GAME_EXPIRY_MS - (now - new Date(g.created_at).getTime())),
    }));
    setGames(lobbyGames);
    if (ownData) {
      const g = ownData as any;
      setOwnHostedGame({
        ...g,
        host_name: myName,
        host_avatar_index: 0,
        host_wins: 0,
        host_total_matches: 0,
        time_left_ms: Math.max(0, GAME_EXPIRY_MS - (now - new Date(g.created_at).getTime())),
      } as LobbyGame);
    } else {
      setOwnHostedGame(null);
    }
  };

  const loadOpponentName = async (game: MultiplayerGame) => {
    const oppId = user?.id === game.host_id ? game.guest_id : game.host_id;
    if (!oppId) return;
    const { data } = await supabase.from("profiles").select("display_name, avatar_index").eq("user_id", oppId).single();
    if (data) {
      setOpponentName(data.display_name);
      setOpponentAvatarIndex((data as any).avatar_index ?? 1);
    }
    // Load rivalry stats
    if (user) {
      const { data: games } = await supabase
        .from("multiplayer_games")
        .select("host_id, guest_id, host_score, guest_score, winner_id, status")
        .or(`and(host_id.eq.${user.id},guest_id.eq.${oppId}),and(host_id.eq.${oppId},guest_id.eq.${user.id})`)
        .in("status", ["finished", "abandoned"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (games && games.length > 0) {
        let myWins = 0, theirWins = 0, myHighScore = 0, theirHighScore = 0;
        let myTotalScore = 0, theirTotalScore = 0;
        let winStreak = 0, loseStreak = 0, lastResult: "win" | "loss" | "draw" = "draw";
        games.forEach((g: any, i: number) => {
          const isHost = g.host_id === user.id;
          const myS = isHost ? g.host_score : g.guest_score;
          const theirS = isHost ? g.guest_score : g.host_score;
          myTotalScore += myS; theirTotalScore += theirS;
          if (myS > myHighScore) myHighScore = myS;
          if (theirS > theirHighScore) theirHighScore = theirS;
          if (g.winner_id === user.id) { myWins++; if (i === 0) lastResult = "win"; }
          else if (g.winner_id) { theirWins++; if (i === 0) lastResult = "loss"; }
          else if (i === 0) lastResult = "draw";
        });
        // Calculate streaks from most recent
        for (const g of games) {
          if ((g as any).winner_id === user.id) { if (loseStreak === 0) winStreak++; else break; }
          else if ((g as any).winner_id) { if (winStreak === 0) loseStreak++; else break; }
          else break;
        }
        setRivalryStats({
          myWins, theirWins, totalGames: games.length,
          myHighScore, theirHighScore,
          myAvgScore: Math.round(myTotalScore / games.length),
          theirAvgScore: Math.round(theirTotalScore / games.length),
          lastResult, winStreak, loseStreak,
        });
      } else {
        setRivalryStats(null);
      }
    }
  };

  const createGame = async (gameType: GameType = selectedGameType) => {
    if (!user) return;
    const { data, error } = await createMultiplayerRoom(user.id, gameType);
    if (data) {
      const g = data as unknown as MultiplayerGame;
      setCurrentGame(g);
      setPhase(statusToPhase(g.status));
      // Timer resets happen automatically via useEffect
      navigate(`/game/multiplayer?game=${g.id}`, { replace: true });
      setLobbyMessage("Room created. Waiting for opponent...");
    } else {
      console.error("createGame failed", error);
      setLobbyMessage(mapCreateRoomError(error));
    }
  };

  const cancelOwnRoom = async () => {
    if (!ownHostedGame || !user || ownHostedGame.host_id !== user.id) return;
    await supabase.from("multiplayer_games").update({ status: "cancelled" as any, phase: "abandoned" as any }).eq("id", ownHostedGame.id).eq("host_id", user.id);
    setOwnHostedGame(null);
    setLobbyMessage("Your room was cancelled.");
    loadGames();
  };

  const joinGame = async (gameId: string) => {
    if (!user) return;
    setJoinState("joining");
    const game = await joinExistingGame(gameId);
    if (game) {
      const g = game as MultiplayerGame;
      setCurrentGame(g);
      setPhase(statusToPhase(g.status));
      // Timer resets happen automatically
      loadOpponentName(g);
      navigate(`/game/multiplayer?game=${g.id}`, { replace: true });
    }
  };

  const joinByRoomCode = async () => {
    if (!user) return;
    const normalizedCode = roomCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setRoomCodeError("Enter a room code.");
      return;
    }

    setRoomCodeError(null);
    setJoinState("joining");

    const { data } = await (supabase
      .from("multiplayer_games") as any)
      .select("*")
      .in("status", ["waiting", "toss", "playing"])
      .eq("room_code", normalizedCode)
      .or(`target_guest_id.is.null,target_guest_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();
    const matched = data as any;
    if (!matched) {
      setJoinState("idle");
      setRoomCodeError("Invalid code or room expired.");
      return;
    }

    if (matched.host_id === user.id) {
      navigate(`/game/multiplayer?game=${matched.id}`, { replace: true });
      setJoinState("idle");
      return;
    }

    const joined = await joinExistingGame(matched.id);
    if (!joined) {
      return;
    }

    setRoomCodeInput("");
    setRoomCodeError(null);
    navigate(`/game/multiplayer?game=${joined.id}`, { replace: true });
  };

  const handleTossResult = async (batFirst: boolean) => {
    if (!currentGame || !user) return;
    const isHost = user.id === currentGame.host_id;
    // Host batting = batFirst if host did toss, or !batFirst if guest did toss
    // For simplicity: host always does the toss, so host_batting = batFirst
    const hostBatting = isHost ? batFirst : !batFirst;
    await supabase.from("multiplayer_games").update({
      status: "playing" as any, host_batting: hostBatting,
      phase: "pre_round_countdown" as any,
      phase_started_at: new Date().toISOString(),
      turn_deadline_at: null,
    }).eq("id", currentGame.id);
    setPhase("playing");
  };

  const submitMove = async (move: Move) => {
    if (!currentGame || !user || cooldown) return;
    setCooldown(true);
    stopTimer();
    // Reset consecutive misses on manual move (auto-submit sets misses before calling this)
    if (!autoSubmitRef.current) {
      setMyConsecutiveMisses(0);
    }
    const moveStr = String(move);
    const isHost = user.id === currentGame.host_id;
    const updateData: any = isHost
      ? { host_move: moveStr, host_move_submitted_at: new Date().toISOString() }
      : { guest_move: moveStr, guest_move_submitted_at: new Date().toISOString() };
    await supabase.from("multiplayer_games").update(updateData).eq("id", currentGame.id);
    setTimeout(() => setCooldown(false), 1500);
  };

  const resolveTurn = async (game: MultiplayerGame) => {
    if (!user || user.id !== game.host_id) return;
    const turnKey = `${game.id}-${game.current_turn}-${game.host_move}-${game.guest_move}`;
    if (resolvedTurnRef.current === turnKey) return;
    resolvedTurnRef.current = turnKey;
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

    // DEF + DEF = OUT
    const isBothDef = hostMove === "DEF" && guestMove === "DEF";
    // Same move = OUT (including DEF+DEF)
    const isOut = hostMove === guestMove || isBothDef;

    if (isOut) {
      result = isBothDef ? "Both played DEF — OUT!" : `Both played ${hostMove} — OUT!`;
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
      // DEF + number = runs go to the BATSMAN (not 0)
      const battingMove = battingIsHost ? hostMove : guestMove;
      const bowlingMove = battingIsHost ? guestMove : hostMove;
      let runs: number;
      if (battingMove === "DEF") {
        // Batsman defended, bowler played a number — runs go to batsman
        runs = bowlingMove === "DEF" ? 0 : parseInt(bowlingMove);
      } else {
        runs = parseInt(battingMove);
      }
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

    // Build ball result for shared UI
    const isHostLocal = user.id === game.host_id;
    const userMoveVal = (isHostLocal ? hostMove : guestMove) as Move;
    const aiMoveVal = (isHostLocal ? guestMove : hostMove) as Move;
    const isBattingLocal = isHostLocal ? battingIsHost : !battingIsHost;
    let ballRuns: number | "OUT";
    if (isOut) {
      ballRuns = "OUT";
    } else {
      const battingMove = battingIsHost ? hostMove : guestMove;
      const bowlingMove = battingIsHost ? guestMove : hostMove;
      let r: number;
      if (battingMove === "DEF") {
        r = bowlingMove === "DEF" ? 0 : parseInt(bowlingMove);
      } else {
        r = parseInt(battingMove);
      }
      ballRuns = isBattingLocal ? r : -r;
    }

    const ballResult: BallResult = {
      userMove: userMoveVal,
      aiMove: aiMoveVal,
      runs: ballRuns,
      description: result,
    };

    setLastBallResult(ballResult);
    setPvpBallHistory(prev => [...prev, ballResult]);

    setLastResult(result);
    setTimeout(() => { setLastResult(null); setLastBallResult(null); }, 2000);

    await supabase.from("multiplayer_games").update({
      host_score: newHostScore, guest_score: newGuestScore, host_move: null, guest_move: null,
      current_turn: game.current_turn + 1, turn_number: (game.turn_number ?? game.current_turn) + 1, innings: newInnings, innings_number: newInnings, host_batting: newHostBatting,
      status: newStatus as any, winner_id: newWinner, phase: newStatus === "finished" ? "match_finished" : "pre_round_countdown",
      phase_started_at: new Date().toISOString(), turn_deadline_at: null,
      round_result_payload: { text: result, turn: game.current_turn },
    }).eq("id", game.id).eq("current_turn", game.current_turn).eq("host_move", hostMove).eq("guest_move", guestMove);
  };

  const isHost = currentGame && user?.id === currentGame.host_id;
  const isBatting = currentGame ? (isHost ? currentGame.host_batting : !currentGame.host_batting) : false;
  const myScore = currentGame ? (isHost ? currentGame.host_score : currentGame.guest_score) : 0;
  const oppScore = currentGame ? (isHost ? currentGame.guest_score : currentGame.host_score) : 0;
  const countdownSec = Math.ceil(turnCountdownMs / 1000);
  const countdownPct = (turnCountdownMs / TURN_TIMER_MS) * 100;
  const isAbandoned = currentGame?.status === "abandoned";
  const abandonedByMe = currentGame?.abandoned_by === user?.id;
  const modeLabel = currentGame ? gameTypeLabel(currentGame.game_type) : "DUEL";
  const currentMoves = currentGame ? MOVE_SETS[currentGame.game_type] : MOVES;

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-2">
            <div className="text-center">
              <span className="text-4xl block mb-2">⚔️</span>
              <h2 className="font-display text-lg font-black text-foreground tracking-wider">MULTIPLAYER LOBBY</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 glass-premium rounded-xl">
              <button onClick={() => setLobbyTab("join")}
                className={`flex-1 py-2.5 rounded-lg font-display text-[10px] font-bold tracking-widest transition-all ${
                  lobbyTab === "join" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}>
                🎮 JOIN MATCH
              </button>
              <button onClick={() => setLobbyTab("create")}
                className={`flex-1 py-2.5 rounded-lg font-display text-[10px] font-bold tracking-widest transition-all ${
                  lobbyTab === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}>
                🏏 CREATE
              </button>
            </div>

            {/* CREATE TAB */}
            {lobbyTab === "create" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="glass-premium rounded-xl p-3 space-y-1.5">
                  <span className="font-display text-[9px] font-bold text-muted-foreground tracking-widest">⏱️ TIMER RULES</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-neon-green/20 flex items-center justify-center"><span className="text-[8px]">⚡</span></div>
                    <span className="text-[9px] text-muted-foreground"><span className="text-neon-green font-bold">5s</span> per turn — pick fast!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-secondary/20 flex items-center justify-center"><span className="text-[8px]">🎲</span></div>
                    <span className="text-[9px] text-muted-foreground">Miss a turn = <span className="text-secondary font-bold">random move</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-out-red/20 flex items-center justify-center"><span className="text-[8px]">⚠️</span></div>
                    <span className="text-[9px] text-muted-foreground"><span className="text-out-red font-bold">3 misses</span> in a row = auto-forfeit</span>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCreateModePickerOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-black text-sm rounded-2xl glow-primary tracking-wider">
                  🏏 CREATE MATCH
                </motion.button>
              </motion.div>
            )}

            {/* JOIN TAB */}
            {lobbyTab === "join" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="glass-premium rounded-xl p-3 space-y-2">
                  <p className="text-[9px] text-muted-foreground font-display tracking-wider">JOIN BY ROOM CODE</p>
                  <div className="flex gap-2">
                    <input
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");
                        setRoomCodeInput(pasted.trim().toUpperCase());
                        e.preventDefault();
                      }}
                      placeholder="ENTER CODE"
                      className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono tracking-widest uppercase"
                      maxLength={8}
                    />
                    <button
                      onClick={joinByRoomCode}
                      disabled={joinState === "joining"}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-display font-bold tracking-wider disabled:opacity-50"
                    >
                      JOIN
                    </button>
                  </div>
                  {roomCodeError && <p className="text-[9px] text-out-red">{roomCodeError}</p>}
                </div>
                {ownHostedGame && (
                  <div className="glass-premium rounded-2xl p-3 border border-primary/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-display font-bold tracking-widest text-primary">YOUR MATCH</span>
                      <span className="text-[8px] text-muted-foreground uppercase">{ownHostedGame.status}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Code: <span className="font-mono text-primary">{ownHostedGame.room_code}</span> • {ownHostedGame.game_type.toUpperCase()}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => navigate(`/game/multiplayer?game=${ownHostedGame.id}`, { replace: true })}
                        className="flex-1 py-2 rounded-lg bg-primary/15 border border-primary/30 text-[9px] font-display font-bold text-primary">OPEN</button>
                      <button onClick={cancelOwnRoom}
                        className="py-2 px-3 rounded-lg bg-out-red/10 border border-out-red/30 text-[9px] font-display font-bold text-out-red">CANCEL</button>
                    </div>
                  </div>
                )}
                {(() => {
                  const joinable = games.filter(g => g.host_id !== user.id);
                  const joinFeedback =
                    joinState === "joining" ? "Joining..." :
                    joinState === "failed" ? "Failed to join this match" :
                    joinState === "full" ? "Game already full" :
                    joinState === "expired" ? "Invite/match expired" : "";
                  if (joinable.length === 0) return (
                    <div className="glass-score p-6 text-center">
                      <span className="text-3xl block mb-2">🏟️</span>
                      <p className="text-xs text-muted-foreground">No open matches right now</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Switch to Create tab to start one!</p>
                      {joinFeedback && <p className="text-[9px] text-out-red mt-2">{joinFeedback}</p>}
                    </div>
                  );
                  return joinable.map((g) => {
                    const avatar = AVATAR_PRESETS[g.host_avatar_index % AVATAR_PRESETS.length];
                    const winRate = g.host_total_matches > 0 ? Math.round((g.host_wins / g.host_total_matches) * 100) : 0;
                    const timeLeftSec = Math.ceil(g.time_left_ms / 1000);
                    const timeMin = Math.floor(timeLeftSec / 60);
                    const timeSec = timeLeftSec % 60;
                    const urgent = g.time_left_ms < 60000;
                    return (
                      <motion.button key={g.id} whileTap={{ scale: 0.97 }} onClick={() => joinGame(g.id)}
                        disabled={joinState === "joining"}
                        className="w-full glass-score p-3 flex items-center gap-3 text-left rounded-2xl border border-border/30">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatar.gradient} flex items-center justify-center shadow-lg`}>
                          <span className="text-lg">{avatar.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-display text-xs font-bold text-foreground block truncate">{g.host_name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-muted-foreground">{g.host_total_matches} matches</span>
                            <span className="text-[8px] text-neon-green font-bold">{winRate}% WR</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-primary font-display text-[10px] font-bold">JOIN →</span>
                          <span className={`font-mono text-[8px] font-bold ${urgent ? "text-out-red" : "text-muted-foreground"}`}>
                            {timeMin}:{timeSec.toString().padStart(2, "0")}
                          </span>
                        </div>
                      </motion.button>
                    );
                  });
                })()}
                {joinState !== "idle" && joinState !== "joining" && games.length > 0 && (
                  <p className="text-[9px] text-out-red text-center pt-1">
                    {joinState === "failed" ? "Failed to join this match." : joinState === "full" ? "Game already full." : "Invite/match expired."}
                  </p>
                )}
                {lobbyMessage && <p className="text-[9px] text-center text-muted-foreground">{lobbyMessage}</p>}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* WAITING FOR OPPONENT */}
        {phase === "waiting" && currentGame && (
          <WaitingRoom
            roomCode={currentGame.room_code}
            playerName={myName}
            playerAvatarIndex={myAvatarIndex}
            gameType={currentGame.game_type}
            onCancel={() => { setPhase("lobby"); setCurrentGame(null); navigate("/game/multiplayer", { replace: true }); }}
          />
        )}

        {/* TOSS PHASE */}
        {phase === "toss" && currentGame && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center">
            <p className="text-center text-[10px] text-muted-foreground font-display mb-3 tracking-widest">
              PRE-MATCH COMMENTARY • {modeLabel}
            </p>
            <OddEvenToss
              onResult={handleTossResult}
              playerName={myName}
              opponentName={opponentName}
              isMultiplayer={true}
            />
          </motion.div>
        )}

        {/* PLAYING — uses shared TapPlayingUI */}
        {phase === "playing" && currentGame && (
          <TapPlayingUI
            phase={isBatting ? (currentGame.innings === 1 ? "first_batting" : "second_batting") : (currentGame.innings === 1 ? "first_bowling" : "second_bowling")}
            userScore={myScore}
            aiScore={oppScore}
            userWickets={0}
            aiWickets={0}
            target={currentGame.innings === 2 ? (isBatting ? oppScore + 1 : myScore + 1) : null}
            currentInnings={currentGame.innings as 1 | 2}
            isBatting={isBatting}
            lastResult={lastBallResult}
            result={null}
            ballHistory={pvpBallHistory}
            playerName={myName}
            opponentName={opponentName}
            onMove={submitMove}
            onReset={() => {}}
            onHome={onHome}
            isPvP={true}
            waitingForOpponent={waitingForOpponent}
            cooldownOverride={cooldown}
            modeLabel={modeLabel}
            extraContent={
              <>
                {/* 5s Synced Countdown Timer — always visible during action */}
                <AnimatePresence>
                  {!waitingForOpponent && phase === "playing" && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                      className={`glass-premium rounded-xl p-3 border ${countdownSec <= 2 ? "border-out-red/50 shadow-[0_0_20px_hsl(var(--out-red)/0.3)]" : "border-secondary/30"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <motion.span animate={countdownSec <= 2 ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4, repeat: Infinity }} className="text-sm">
                            {countdownSec <= 2 ? "🔥" : "⏱️"}
                          </motion.span>
                          <span className={`font-display text-[8px] font-bold tracking-widest ${countdownSec <= 2 ? "text-out-red" : "text-secondary"}`}>
                            {countdownSec <= 2 ? "HURRY!" : "PICK YOUR MOVE"}
                          </span>
                        </div>
                        <motion.span 
                          key={countdownSec}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`font-display text-xl font-black tabular-nums ${
                            countdownSec <= 1 ? "text-out-red animate-pulse" : countdownSec <= 2 ? "text-out-red" : countdownSec <= 3 ? "text-secondary" : "text-neon-green"
                          }`}
                        >
                          {countdownSec}
                        </motion.span>
                      </div>
                      <div className="w-full h-2.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full transition-colors ${
                            countdownSec <= 2 ? "bg-gradient-to-r from-out-red to-out-red/60" : countdownSec <= 3 ? "bg-gradient-to-r from-secondary to-secondary/60" : "bg-gradient-to-r from-neon-green to-neon-green/60"
                          }`}
                          style={{ width: `${countdownPct}%` }}
                        />
                      </div>
                      {myConsecutiveMisses > 0 && (
                        <p className="text-[7px] text-out-red/80 font-display tracking-wider mt-1 text-center">
                          ⚠️ {myConsecutiveMisses}/{MAX_CONSECUTIVE_MISSES} missed — {MAX_CONSECUTIVE_MISSES - myConsecutiveMisses} more = FORFEIT
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Received tease */}
                <AnimatePresence>
                  {receivedTease && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="glass-card rounded-xl p-2.5 border border-out-red/20">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">😈</span>
                        <div className="flex-1">
                          <span className="text-[7px] text-out-red font-display tracking-widest block">OPPONENT SAYS:</span>
                          <span className="text-[10px] text-foreground font-display font-bold">{receivedTease}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tease button */}
                {waitingForOpponent && (
                  <div className="flex justify-center">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowTeasePanel(!showTeasePanel)}
                      className="px-4 py-2 rounded-xl glass-card border border-secondary/20 text-[9px] font-display font-bold text-secondary tracking-wider">
                      😈 SEND TEASE
                    </motion.button>
                  </div>
                )}

                {/* Tease panel */}
                <AnimatePresence>
                  {showTeasePanel && waitingForOpponent && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="glass-premium rounded-xl p-3 space-y-1.5 overflow-hidden">
                      <span className="text-[7px] font-display text-muted-foreground tracking-widest">TEASE MESSAGES</span>
                      {TEASE_MESSAGES.map((t, i) => (
                        <motion.button key={i} whileTap={t.unlocked ? { scale: 0.95 } : undefined}
                          onClick={() => {
                            if (!t.unlocked || !currentGame) return;
                            setSentTease(t.text);
                            setShowTeasePanel(false);
                            supabase.from("multiplayer_games").update({
                              round_result_payload: { tease: t.text, from: user?.id, turn: currentGame.current_turn },
                            }).eq("id", currentGame.id);
                            setTimeout(() => setSentTease(null), 3000);
                          }}
                          className={`w-full text-left p-2 rounded-lg transition-all ${
                            t.unlocked
                              ? "glass-card border border-secondary/15 active:bg-secondary/10"
                              : "bg-muted/20 border border-muted/10 relative overflow-hidden"
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-display ${t.unlocked ? "text-foreground" : "text-muted-foreground/30 blur-[3px] select-none"}`}>
                              {t.text}
                            </span>
                            {!t.unlocked && (
                              <span className="text-[7px] font-display text-secondary/60 tracking-wider whitespace-nowrap ml-auto">
                                🔒 {t.cost} 🪙
                              </span>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {sentTease && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="glass-card rounded-lg p-2 text-center text-[9px] text-secondary font-display">
                    ✅ Sent: "{sentTease}"
                  </motion.div>
                )}
              </>
            }
          />
        )}

        {/* PvP Post-match ceremony overlay */}
        {showPvPPostMatch && currentGame && (
          <EnhancedPostMatch
            playerName={myName}
            opponentName={opponentName}
            result={currentGame.winner_id === user?.id ? "win" : currentGame.winner_id ? "loss" : "draw"}
            playerScore={myScore}
            opponentScore={oppScore}
            ballHistory={pvpBallHistory}
            onComplete={() => setShowPvPPostMatch(false)}
            isPvP={true}
            rivalryStats={rivalryStats}
            commentators={matchCommentators}
          />
        )}

        {/* FINISHED */}
        {phase === "finished" && currentGame && !showPvPPostMatch && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="text-6xl">
              {isAbandoned ? (abandonedByMe ? "🏳️" : "🏆") : currentGame.winner_id === user?.id ? "🏆" : currentGame.winner_id ? "😞" : "🤝"}
            </span>
            <h2 className="font-display text-2xl font-black text-foreground tracking-wider">
              {isAbandoned ? (abandonedByMe ? "ABANDONED" : "OPPONENT ABANDONED") : currentGame.winner_id === user?.id ? "YOU WIN!" : currentGame.winner_id ? "YOU LOST" : "DRAW!"}
            </h2>
            {isAbandoned && (
              <p className="text-[10px] text-out-red/70 font-display tracking-wider">
                {abandonedByMe ? "You ran out of time" : "Your opponent ran out of time"}
              </p>
            )}
            <div className="glass-score p-4 w-full max-w-xs">
              <div className="flex justify-between">
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">{myName.toUpperCase()}</span>
                  <span className="font-display text-2xl font-black text-score-gold">{myScore}</span>
                </div>
                <div className="text-center flex-1">
                  <span className="text-[8px] text-muted-foreground font-display block">{opponentName.toUpperCase()}</span>
                  <span className="font-display text-2xl font-black text-accent">{oppScore}</span>
                </div>
              </div>
            </div>
            {/* Incoming rematch notification */}
            <AnimatePresence>
              {incomingRematch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="w-full max-w-xs glass-premium rounded-2xl p-4 border border-secondary/40 shadow-[0_0_30px_hsl(45_93%_58%/0.2)]"
                >
                  <div className="text-center space-y-2">
                    <span className="text-3xl block">🔥</span>
                    <p className="font-display text-xs font-black text-foreground tracking-wider">
                      {incomingRematch.fromName.toUpperCase()} WANTS A REMATCH!
                    </p>
                    {incomingRematchCountdown !== null && (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-full max-w-[160px] h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: incomingRematchCountdown <= 10
                                ? "hsl(var(--out-red))"
                                : incomingRematchCountdown <= 20
                                  ? "hsl(var(--secondary))"
                                  : "hsl(var(--neon-green))",
                            }}
                            initial={{ width: "100%" }}
                            animate={{ width: `${(incomingRematchCountdown / 45) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className={`font-display text-[10px] font-black tabular-nums ${
                          incomingRematchCountdown <= 10 ? "text-out-red" : "text-muted-foreground"
                        }`}>
                          {incomingRematchCountdown}s
                        </span>
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground font-display">
                      {incomingRematchCountdown !== null && incomingRematchCountdown <= 10
                        ? "⚡ Hurry up! Invite expiring soon!"
                        : "Ready for another round?"}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          if (!user) return;
                          const { data: joinedGameId, error } = await supabase.rpc("accept_match_invite", { p_invite_id: incomingRematch.inviteId });
                          if (!error && joinedGameId) {
                            setIncomingRematch(null);
                            setIncomingRematchCountdown(null);
                            setRematchSent(false);
                            const { data: gameData } = await supabase.from("multiplayer_games").select("*").eq("id", joinedGameId).maybeSingle();
                            if (gameData) {
                              const g = gameData as unknown as MultiplayerGame;
                              setCurrentGame(g);
                              setPhase(statusToPhase(g.status));
                              setTurnCountdownMs(TURN_TIMER_MS);
                              setCooldown(false);
                              setLastResult(null);
                              setLastBallResult(null);
                              setPvpBallHistory([]);
                    setMyConsecutiveMisses(0);
                              pvpPostMatchShownRef.current = false;
                              pvpPreMatchShownRef.current = false;
                              setShowPvPPreMatch(false);
                              loadOpponentName(g);
                              navigate(`/game/multiplayer?game=${g.id}`, { replace: true });
                            }
                          }
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-neon-green to-neon-green/70 text-background font-display font-black text-sm rounded-xl tracking-wider"
                      >
                        HELL YES! 🔥
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          if (incomingRematch) {
                            await supabase.from("match_invites").update({
                              status: "declined",
                              declined_at: new Date().toISOString(),
                            }).eq("id", incomingRematch.inviteId);
                          }
                          setIncomingRematch(null);
                          setIncomingRematchCountdown(null);
                        }}
                        className="py-3 px-4 bg-muted/50 border border-border text-foreground font-display font-bold text-xs rounded-xl tracking-wider"
                      >
                        NAH
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rematch expired gaslighting message */}
            <AnimatePresence>
              {rematchExpiredMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-xs glass-premium rounded-xl p-3 border border-out-red/20"
                >
                  <p className="text-[10px] text-center font-display text-muted-foreground leading-relaxed">
                    {rematchExpiredMsg}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 w-full max-w-xs">
              <motion.button whileTap={{ scale: 0.95 }}
                disabled={rematchSent}
                onClick={async () => {
                  if (!user || !currentGame || rematchSent) return;
                  const opponentId = isHost ? currentGame.guest_id : currentGame.host_id;
                  if (!opponentId) return;
                  const gameType = (currentGame.game_type || "tap") as GameType;
                  const { data: newGame, error } = await createMultiplayerRoom(user.id, gameType, opponentId);
                  if (newGame && !error) {
                    await supabase.from("match_invites").insert({
                      game_id: (newGame as any).id,
                      from_user_id: user.id,
                      to_user_id: opponentId,
                      game_type: gameType,
                    });
                    setRematchSent(true);
                    setRematchExpiredMsg(null);
                    setCurrentGame(newGame as unknown as MultiplayerGame);
                    setPhase("waiting");
                    setTurnCountdownMs(TURN_TIMER_MS);
                    setCooldown(false);
                    setLastResult(null);
                    setLastBallResult(null);
                    setPvpBallHistory([]);
                    setMyConsecutiveMisses(0);
                    pvpPostMatchShownRef.current = false;
                    pvpPreMatchShownRef.current = false;
                    setShowPvPPreMatch(false);
                    setRivalryStats(null);
                    navigate(`/game/multiplayer?game=${(newGame as any).id}`, { replace: true });
                  }
                }}
                className={`flex-1 py-3.5 font-display font-bold rounded-2xl tracking-wider border relative overflow-hidden ${
                  rematchSent
                    ? "bg-muted/50 text-muted-foreground border-border"
                    : "bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground shadow-[0_0_20px_hsl(45_93%_58%/0.3)] border-secondary/40"
                }`}>
                {rematchSent ? (
                  <span className="flex items-center justify-center gap-2">
                    ⏳ WAITING
                    {rematchCountdown !== null && (
                      <span className="text-[10px] font-mono tabular-nums">{rematchCountdown}s</span>
                    )}
                  </span>
                ) : "🔄 REMATCH"}
                {rematchSent && rematchCountdown !== null && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 bg-secondary/50"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(rematchCountdown / 45) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setPhase("lobby");
                  setCurrentGame(null);
                  setTurnCountdownMs(TURN_TIMER_MS);
                  setPvpBallHistory([]);
                    setMyConsecutiveMisses(0);
                  pvpPostMatchShownRef.current = false;
                  pvpPreMatchShownRef.current = false;
                  setRivalryStats(null);
                  setRematchSent(false);
                  setIncomingRematch(null);
                  navigate("/game/multiplayer", { replace: true });
                }}
                className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl glow-primary tracking-wider">
                ⚡ NEW
              </motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onHome}
              className="py-2.5 px-8 bg-muted text-foreground font-display font-bold rounded-2xl tracking-wider text-xs">
              HOME
            </motion.button>
          </motion.div>
        )}
      </div>
      {createModePickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm glass-premium rounded-3xl p-4 space-y-3 border border-primary/30 shadow-[0_0_40px_hsl(217_91%_60%/0.2)]">
            <p className="font-display text-xs text-foreground font-black tracking-wider">Which game do you want to play?</p>
            <p className="text-[9px] text-muted-foreground">Choose your arena and start a live duel.</p>
            {([
              { key: "ar", icon: "📸", subtitle: "Camera + futuristic duel energy" },
              { key: "tap", icon: "⚡", subtitle: "Fast arcade reflex battle" },
              { key: "tournament", icon: "🏆", subtitle: "Championship style showdown" },
            ] as { key: GameType; icon: string; subtitle: string }[]).map((mode) => (
              <button
                key={mode.key}
                onClick={() => {
                  setSelectedGameType(mode.key);
                  setCreateModePickerOpen(false);
                  void createGame(mode.key);
                }}
                className="w-full p-3 rounded-2xl text-left bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30 font-display tracking-wider transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background/40 border border-primary/30 flex items-center justify-center text-xl">{mode.icon}</div>
                  <div>
                    <p className="text-xs font-bold uppercase">{mode.key}</p>
                    <p className="text-[10px] text-muted-foreground">{mode.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
            <button onClick={() => setCreateModePickerOpen(false)} className="w-full py-2 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* VS Intro Overlay */}
      {showVSIntro && (
        <VSIntroScreen
          playerName={myName}
          opponentName={opponentName}
          playerAvatarIndex={myAvatarIndex}
          opponentAvatarIndex={opponentAvatarIndex}
          gameType={currentGame?.game_type}
          onComplete={() => {
            setShowVSIntro(false);
            // Show enhanced pre-match ceremony for PvP
            if (pvpPreMatchShownRef.current) {
              setShowPvPPreMatch(true);
            } else if (currentGame) {
              setPhase(statusToPhase(currentGame.status));
            }
          }}
        />
      )}

      {/* Enhanced Pre-Match Ceremony */}
      {showPvPPreMatch && currentGame && (
        <EnhancedPreMatch
          playerName={myName}
          opponentName={opponentName}
          tossWinner={myName}
          battingFirst={currentGame.host_batting ? (isHost ? myName : opponentName) : (isHost ? opponentName : myName)}
          rivalryStats={rivalryStats}
          isPvP={true}
          commentators={matchCommentators}
          onComplete={() => {
            setShowPvPPreMatch(false);
            if (currentGame) {
              setPhase(statusToPhase(currentGame.status));
            }
          }}
        />
      )}
    </div>
  );
}
