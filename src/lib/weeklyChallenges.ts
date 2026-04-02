// Weekly challenge definitions and auto-generation

export interface WeeklyChallenge {
  challenge_type: string;
  title: string;
  description: string;
  target_value: number;
  reward_label: string;
}

const CHALLENGE_TEMPLATES: WeeklyChallenge[] = [
  { challenge_type: "score_50_3x", title: "Half Century Club", description: "Score 50+ in 3 matches", target_value: 3, reward_label: "🏅 Centurion" },
  { challenge_type: "win_5", title: "Winning Streak", description: "Win 5 matches this week", target_value: 5, reward_label: "🔥 Hot Streak" },
  { challenge_type: "play_10", title: "The Grinder", description: "Play 10 matches this week", target_value: 10, reward_label: "🏏 Iron Will" },
  { challenge_type: "score_100", title: "Century!", description: "Score 100+ in a single match", target_value: 1, reward_label: "💯 Century Maker" },
  { challenge_type: "win_3_streak", title: "Hat-trick Hero", description: "Win 3 matches in a row", target_value: 3, reward_label: "🎩 Hat-trick" },
  { challenge_type: "six_10x", title: "Maximum Master", description: "Hit 10 sixes in total this week", target_value: 10, reward_label: "💥 Big Hitter" },
  { challenge_type: "defend_5x", title: "The Wall", description: "Play 5 defensive shots successfully", target_value: 5, reward_label: "🪨 Fortress" },
  { challenge_type: "play_all_modes", title: "All-Rounder", description: "Play AR, Tap, and Daily modes", target_value: 3, reward_label: "🌟 Versatile" },
];

/**
 * Get challenges for the current week (deterministic based on week number)
 */
export function getWeeklyChallenges(): WeeklyChallenge[] {
  const now = new Date();
  const weekNum = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  
  // Pick 3 challenges based on week number (deterministic)
  const shuffled = [...CHALLENGE_TEMPLATES];
  // Simple seed-based shuffle
  const seed = weekNum * 7919;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1)) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, 3);
}

export function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export const TRASH_TALK_LINES = [
  "Easy work 😏",
  "Is that all you got? 🤷",
  "Better luck next time! 🍀",
  "Send that to your museum 🏛️",
  "Rent free in your head 🧠",
  "That record was asking to be broken 💅",
  "GG no re 🎮",
  "Built different 💪",
];

export const REACTION_EMOJIS = ["🔥", "💀", "😤", "👑", "💪", "🏏", "😂", "🫡"];
