import type { BallResult, GameState } from "@/hooks/useHandCricket";

interface CommentaryContext {
  game: GameState;
  result: BallResult;
}

const BATTING_RUNS: Record<string, string[]> = {
  "0": [
    "Dot ball! No run scored.",
    "Defence holds — zero off that ball.",
    "Good bowling! Nothing from that delivery.",
  ],
  "1": [
    "Nudged away for a single.",
    "Quick single taken!",
    "One run added to the total.",
    "Rotates the strike with a single.",
  ],
  "2": [
    "Nicely placed for two!",
    "Great running between the wickets — two runs.",
    "Pushed into the gap, two taken!",
  ],
  "3": [
    "Three runs! Excellent placement.",
    "They've run three! Good athleticism.",
    "Three to the total — smart cricket!",
  ],
  "4": [
    "FOUR! Cracked to the boundary! 🔥",
    "BOUNDARY! That's racing away!",
    "Smashed for FOUR! What a shot!",
    "Four runs! The crowd goes wild!",
  ],
  "6": [
    "SIX! Massive hit! That's out of the ground! 🚀",
    "MAXIMUM! What a strike!",
    "SIX! Into the stands! Unbelievable power!",
    "That's a SIX! Absolutely dispatched!",
    "HUGE SIX! The ball has disappeared!",
  ],
};

const BOWLING_RUNS: Record<string, string[]> = {
  "0": [
    "Dot ball! Tight bowling.",
    "No runs conceded — well bowled!",
    "Defence from the AI. No damage.",
  ],
  "1": [
    "AI takes a single.",
    "One run to the opposition.",
  ],
  "2": [
    "AI finds two. Pressure building.",
    "Two runs conceded.",
  ],
  "3": [
    "Three to the AI. Stay focused!",
    "Three runs — AI finding gaps.",
  ],
  "4": [
    "FOUR conceded! AI finding boundaries.",
    "Boundary! AI hits four. Tighten up!",
  ],
  "6": [
    "SIX to the AI! Big hit from the opposition!",
    "MAXIMUM by AI! Need to bowl tighter!",
  ],
};

const OUT_BATTING = [
  "OUT! Caught matching moves! 💀",
  "WICKET! Identical moves — that's OUT!",
  "Gone! Both played the same — dismissed!",
  "OUT! The innings comes to an end!",
];

const OUT_BOWLING = [
  "WICKET! AI is OUT! Great bowling! 🎯",
  "Got 'em! AI dismissed with matching moves!",
  "BOWLED! AI plays the same — OUT!",
  "What a delivery! AI is gone!",
];

const WIN_COMMENTS = [
  "🏆 CHAMPION! What a performance!",
  "🏆 VICTORY! You've conquered the AI!",
  "🏆 MATCH WON! A masterclass!",
  "🏆 INCREDIBLE WIN! Standing ovation!",
];

const LOSS_COMMENTS = [
  "AI takes the match. Better luck next time!",
  "Defeated by the AI. Regroup and try again!",
  "Close match, but AI edges it.",
];

const DRAW_COMMENTS = [
  "🤝 A TIE! What a closely fought contest!",
  "🤝 Honors even! Neither side could separate.",
];

const CHASE_COMMENTS = [
  "Getting closer to the target!",
  "The chase is on! Keep going!",
  "Closing in on the target!",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCommentary({ game, result }: CommentaryContext): string {
  // Game over
  if (game.phase === "finished") {
    if (game.result === "win") return pick(WIN_COMMENTS);
    if (game.result === "loss") return pick(LOSS_COMMENTS);
    return pick(DRAW_COMMENTS);
  }

  // OUT
  if (result.runs === "OUT") {
    return game.isBatting ? pick(OUT_BATTING) : pick(OUT_BOWLING);
  }

  // Runs
  const runs = typeof result.runs === "number" ? result.runs : 0;
  const runsKey = String(Math.abs(runs));

  if (game.isBatting) {
    const base = pick(BATTING_RUNS[runsKey] || BATTING_RUNS["0"]);
    // Chase context
    if (game.target && game.userScore < game.target) {
      const need = game.target - game.userScore;
      if (need <= 10) return `${base} Need ${need} more to win!`;
      if (Math.random() > 0.6) return `${base} ${pick(CHASE_COMMENTS)}`;
    }
    // Milestone
    if (game.userScore > 0 && game.userScore % 50 === 0) {
      return `${base} FIFTY UP! 🎉 ${game.userScore} runs!`;
    }
    return base;
  } else {
    const base = pick(BOWLING_RUNS[runsKey] || BOWLING_RUNS["0"]);
    if (game.target && game.aiScore < game.target) {
      const need = game.target - game.aiScore;
      if (need <= 5) return `${base} AI needs just ${need} more!`;
    }
    return base;
  }
}

export function getInningsChangeCommentary(game: GameState): string {
  if (game.currentInnings === 2 && game.target) {
    if (game.isBatting) {
      return `🏏 Second innings! Chase ${game.target} to win!`;
    } else {
      return `🎯 Your turn to bowl! Defend ${game.target} runs!`;
    }
  }
  return game.isBatting ? "🏏 You're batting! Score big!" : "🎯 You're bowling! Get 'em out!";
}
