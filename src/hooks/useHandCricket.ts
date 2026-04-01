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
}

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
};

function getMoveValue(move: Move | AiMove): number {
  return move === "DEF" ? 0 : move;
}

function getAiMove(): AiMove {
  const moves: AiMove[] = ["DEF", 1, 2, 3, 4, 6];
  return moves[Math.floor(Math.random() * moves.length)];
}

function resolveResult(userMove: Move, aiMove: AiMove, isBatting: boolean): { runs: number | "OUT"; desc: string } {
  if (userMove === "DEF" && aiMove === "DEF") {
    return { runs: "OUT", desc: "Both played DEF — OUT!" };
  }

  if (isBatting) {
    if (userMove === "DEF") {
      const defendedRuns = getMoveValue(aiMove);
      return { runs: defendedRuns, desc: `You defended. AI played ${aiMove} — +${defendedRuns} runs` };
    }
    if (userMove === aiMove) {
      return { runs: "OUT", desc: `Both played ${userMove} — OUT!` };
    }
    const battingRuns = getMoveValue(userMove);
    return { runs: battingRuns, desc: `You played ${userMove}, AI played ${aiMove} — +${battingRuns} runs` };
  } else {
    if (aiMove === "DEF") {
      const defendedRuns = getMoveValue(userMove);
      return { runs: -defendedRuns, desc: `AI defended against ${userMove} — AI scores ${defendedRuns}` };
    }
    if (userMove === "DEF") {
      const aiRuns = getMoveValue(aiMove);
      return { runs: -aiRuns, desc: `You defended, AI played ${aiMove} — AI scores ${aiRuns}` };
    }
    if (userMove === aiMove) {
      return { runs: "OUT", desc: `Both played ${userMove} — AI is OUT!` };
    }
    const aiRuns = getMoveValue(aiMove);
    return { runs: -aiRuns, desc: `You played ${userMove}, AI played ${aiMove} — AI scores ${aiRuns}` };
  }
}

export function useHandCricket() {
  const [game, setGame] = useState<GameState>(initialState);

  const startGame = useCallback((batFirst: boolean) => {
    setGame({
      ...initialState,
      phase: batFirst ? "first_batting" : "first_bowling",
      isBatting: batFirst,
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

      if (prev.isBatting) {
        if (runs === "OUT") {
          // End batting innings
          if (prev.currentInnings === 1) {
            newState = {
              ...newState,
              phase: "second_bowling",
              target: prev.userScore + 1,
              currentInnings: 2,
              isBatting: false,
              userWickets: prev.userWickets + 1,
            };
          } else {
            // Second innings batting out
            const aiTotal = prev.aiScore;
            const userTotal = prev.userScore;
            newState = {
              ...newState,
              phase: "finished",
              userWickets: prev.userWickets + 1,
              result: userTotal > aiTotal ? "win" : userTotal < aiTotal ? "loss" : "draw",
            };
          }
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
          if (prev.currentInnings === 1) {
            newState = {
              ...newState,
              phase: "second_batting",
              target: prev.aiScore + 1,
              currentInnings: 2,
              isBatting: true,
              aiWickets: prev.aiWickets + 1,
            };
          } else {
            const aiTotal = prev.aiScore;
            const userTotal = prev.userScore;
            newState = {
              ...newState,
              phase: "finished",
              aiWickets: prev.aiWickets + 1,
              result: userTotal > aiTotal ? "win" : userTotal < aiTotal ? "loss" : "draw",
            };
          }
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

      return newState;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGame(initialState);
  }, []);

  return { game, startGame, playBall, resetGame };
}
