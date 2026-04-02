import { useState, useCallback } from "react";

export type Move = "DEF" | 1 | 2 | 3 | 4 | 6;
export type AiMove = Move;
export type InningsPhase = "not_started" | "first_batting" | "first_bowling" | "second_batting" | "second_bowling" | "finished";
export type GameResult = "win" | "loss" | "draw" | null;

export interface BallResult {
  userMove: Move;
  aiMove: AiMove;
  runs: number | "OUT";
  description: string;
}

export interface MatchConfig {
  overs: number | null; // null = unlimited
  wickets: number; // default 1 (current), 3 for limited overs
}

export interface GameState {
  phase: InningsPhase;
  userScore: number;
  aiScore: number;
  userWickets: number;
  aiWickets: number;
  target: number | null;
  currentInnings: 1 | 2;
  isBatting: boolean;
  lastResult: BallResult | null;
  result: GameResult;
  ballHistory: BallResult[];
  config: MatchConfig;
  // Ball counts per innings for over tracking
  innings1Balls: number;
  innings2Balls: number;
}

const defaultConfig: MatchConfig = { overs: null, wickets: 1 };

const initialState: GameState = {
  phase: "not_started",
  userScore: 0,
  aiScore: 0,
  userWickets: 0,
  aiWickets: 0,
  target: null,
  currentInnings: 1,
  isBatting: true,
  lastResult: null,
  result: null,
  ballHistory: [],
  config: defaultConfig,
  innings1Balls: 0,
  innings2Balls: 0,
};

function getMoveValue(move: Move | AiMove): number {
  return move === "DEF" ? 0 : move;
}

function getAiMove(): AiMove {
  const moves: AiMove[] = ["DEF", 1, 2, 3, 4, 6];
  return moves[Math.floor(Math.random() * moves.length)];
}

function resolveResult(userMove: Move, aiMove: AiMove, isBatting: boolean): { runs: number | "OUT"; desc: string } {
  // DEF + DEF = OUT (both defended)
  if (userMove === "DEF" && aiMove === "DEF") {
    return { runs: "OUT", desc: "Both played DEF — OUT!" };
  }

  if (isBatting) {
    // Same number = OUT
    if (userMove === aiMove) {
      return { runs: "OUT", desc: `Both played ${userMove} — OUT!` };
    }
    // DEF + any run = runs go to batsman (you)
    if (userMove === "DEF") {
      const runs = getMoveValue(aiMove);
      return { runs, desc: `You defended, AI played ${aiMove} — +${runs} runs to you!` };
    }
    // Any run + DEF = your runs score
    if (aiMove === "DEF") {
      const runs = getMoveValue(userMove);
      return { runs, desc: `You played ${userMove}, AI defended — +${runs} runs!` };
    }
    // Both played different numbers = batsman's runs score
    const battingRuns = getMoveValue(userMove);
    return { runs: battingRuns, desc: `You played ${userMove}, AI played ${aiMove} — +${battingRuns} runs` };
  } else {
    // Bowling — AI is batting
    // Same number = OUT
    if (userMove === aiMove) {
      return { runs: "OUT", desc: `Both played ${userMove} — AI is OUT!` };
    }
    // DEF + any run = runs go to batsman (AI)
    if (aiMove === "DEF") {
      const runs = getMoveValue(userMove);
      return { runs: -runs, desc: `AI defended, you played ${userMove} — AI scores ${runs}` };
    }
    if (userMove === "DEF") {
      const aiRuns = getMoveValue(aiMove);
      return { runs: -aiRuns, desc: `You defended, AI played ${aiMove} — AI scores ${aiRuns}` };
    }
    // Both different numbers = batsman (AI) runs score
    const aiRuns = getMoveValue(aiMove);
    return { runs: -aiRuns, desc: `You played ${userMove}, AI played ${aiMove} — AI scores ${aiRuns}` };
  }
}

/** Check if overs are exhausted for the current innings */
function isOversExhausted(ballsInInnings: number, config: MatchConfig): boolean {
  if (!config.overs) return false;
  return ballsInInnings >= config.overs * 6;
}

/** Check if wickets are exhausted */
function isWicketsExhausted(wickets: number, config: MatchConfig): boolean {
  return wickets >= config.wickets;
}

export function useHandCricket() {
  const [game, setGame] = useState<GameState>(initialState);

  const startGame = useCallback((batFirst: boolean, config?: MatchConfig) => {
    const c = config || defaultConfig;
    setGame({
      ...initialState,
      phase: batFirst ? "first_batting" : "first_bowling",
      isBatting: batFirst,
      config: c,
    });
  }, []);

  const playBall = useCallback((userMove: Move) => {
    setGame((prev) => {
      if (prev.phase === "not_started" || prev.phase === "finished") return prev;

      const aiMove = getAiMove();
      const { runs, desc } = resolveResult(userMove, aiMove, prev.isBatting);

      const ballResult: BallResult = { userMove, aiMove, runs, description: desc };
      const newHistory = [...prev.ballHistory, ballResult];

      let newState = { ...prev, lastResult: ballResult, ballHistory: newHistory };

      // Track balls per innings
      if (prev.currentInnings === 1) {
        newState.innings1Balls = prev.innings1Balls + 1;
      } else {
        newState.innings2Balls = prev.innings2Balls + 1;
      }

      const currentBalls = prev.currentInnings === 1 ? newState.innings1Balls : newState.innings2Balls;

      if (prev.isBatting) {
        if (runs === "OUT") {
          const newWickets = prev.userWickets + 1;
          newState.userWickets = newWickets;

          if (isWicketsExhausted(newWickets, prev.config)) {
            // All wickets gone
            if (prev.currentInnings === 1) {
              newState = {
                ...newState,
                phase: "second_bowling",
                target: prev.userScore + 1,
                currentInnings: 2,
                isBatting: false,
              };
            } else {
              const aiTotal = prev.aiScore;
              const userTotal = prev.userScore;
              newState = {
                ...newState,
                phase: "finished",
                result: userTotal > aiTotal ? "win" : userTotal < aiTotal ? "loss" : "draw",
              };
            }
          }
          // If wickets not exhausted, batting continues
        } else {
          const newScore = prev.userScore + (runs as number);
          newState.userScore = newScore;
          // Check if chasing and reached target
          if (prev.target && newScore >= prev.target) {
            newState.phase = "finished";
            newState.result = "win";
          }
        }
      } else {
        // Bowling
        if (runs === "OUT") {
          const newAiWickets = prev.aiWickets + 1;
          newState.aiWickets = newAiWickets;

          if (isWicketsExhausted(newAiWickets, prev.config)) {
            if (prev.currentInnings === 1) {
              newState = {
                ...newState,
                phase: "second_batting",
                target: prev.aiScore + 1,
                currentInnings: 2,
                isBatting: true,
              };
            } else {
              const aiTotal = prev.aiScore;
              const userTotal = prev.userScore;
              newState = {
                ...newState,
                phase: "finished",
                result: userTotal > aiTotal ? "win" : userTotal < aiTotal ? "loss" : "draw",
              };
            }
          }
          // If wickets not exhausted, AI continues batting
        } else {
          const aiRuns = Math.abs(runs as number);
          const newAiScore = prev.aiScore + aiRuns;
          newState.aiScore = newAiScore;
          // Check if AI chasing and reached target
          if (prev.target && newAiScore >= prev.target) {
            newState.phase = "finished";
            newState.result = "loss";
          }
        }
      }

      // Check overs exhausted (only if not already finished by wicket/chase)
      if (newState.phase !== "finished" && newState.phase !== "not_started") {
        if (isOversExhausted(currentBalls, prev.config)) {
          if (prev.currentInnings === 1) {
            if (prev.isBatting) {
              newState = {
                ...newState,
                phase: "second_bowling",
                target: newState.userScore + 1,
                currentInnings: 2,
                isBatting: false,
              };
            } else {
              newState = {
                ...newState,
                phase: "second_batting",
                target: newState.aiScore + 1,
                currentInnings: 2,
                isBatting: true,
              };
            }
          } else {
            // 2nd innings overs done
            const userTotal = newState.userScore;
            const aiTotal = newState.aiScore;
            newState = {
              ...newState,
              phase: "finished",
              result: userTotal > aiTotal ? "win" : userTotal < aiTotal ? "loss" : "draw",
            };
          }
        }
      }

      return newState;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGame(initialState);
  }, []);

  return { game, startGame, playBall, resetGame };
}
