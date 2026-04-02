/**
 * Multi-Commentator System — 5 personas, 2 randomly assigned per match.
 * Indian cricket culture mix with natural conversations.
 * Key moments get TTS, regular balls get text-only.
 */

export interface Commentator {
  id: string;
  name: string;
  voiceId: string; // ElevenLabs voice ID
  gender: "male" | "female";
  style: "analytical" | "hype" | "savage" | "storyteller" | "witty";
  avatar: string;
}

export const COMMENTATOR_PANEL: Commentator[] = [
  {
    id: "ravi",
    name: "Ravi",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian — deep authoritative
    gender: "male",
    style: "analytical",
    avatar: "🎙️",
  },
  {
    id: "priya",
    name: "Priya",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah — warm female
    gender: "female",
    style: "hype",
    avatar: "🌟",
  },
  {
    id: "vikram",
    name: "Vikram",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam — energetic male
    gender: "male",
    style: "savage",
    avatar: "🔥",
  },
  {
    id: "ananya",
    name: "Ananya",
    voiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily — bright female
    gender: "female",
    style: "storyteller",
    avatar: "📖",
  },
  {
    id: "arjun",
    name: "Arjun",
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel — smooth male
    gender: "male",
    style: "witty",
    avatar: "😎",
  },
];

export interface CommentaryLine {
  commentatorId: string;
  text: string;
  isKeyMoment: boolean; // determines if TTS plays
}

export function pickMatchCommentators(): [Commentator, Commentator] {
  const shuffled = [...COMMENTATOR_PANEL].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

// ─── Duo Conversation Templates ─────────────────────────────────

type DuoGen = (c1: string, c2: string, playerName: string, opponentName: string, extra?: any) => CommentaryLine[];

// Ball-by-ball conversations (text-only for normal balls)
const SIX_CONVERSATIONS: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `WHAT A HIT! ${p} has absolutely creamed that!`, isKeyMoment: true },
    { commentatorId: c2, text: `That's gone into the stands, ${c1 === "Ravi" ? "Ravi bhai" : c1}! Reminded me of Yuvraj's 6 sixes!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `SIX! ${p} is in beast mode today!`, isKeyMoment: true },
    { commentatorId: c2, text: `Thala energy! When ${p} decides to hit, the ball just disappears!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `OUT OF THE GROUND! ${p} has launched that into orbit!`, isKeyMoment: true },
    { commentatorId: c1, text: `Ab yahi dekhne aate hain log! This is what the crowd came for!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `MAXIMUM! The bowler wants to hide after that one!`, isKeyMoment: true },
    { commentatorId: c2, text: `${p} said 'mere pitch pe mera raj'! My pitch, my rules!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `SIX! ${p} channeling prime Gayle right now!`, isKeyMoment: true },
    { commentatorId: c1, text: `Universe Boss vibes! Even the hotdog seller stopped to watch that one!`, isKeyMoment: true },
  ],
];

const FOUR_CONVERSATIONS: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `FOUR! Beautiful shot by ${p}! Timing is everything!`, isKeyMoment: true },
    { commentatorId: c2, text: `Textbook cover drive! Sachin would approve!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `Races to the boundary! ${p} finding gaps like a GPS!`, isKeyMoment: true },
    { commentatorId: c1, text: `The fielder didn't even move — that was too fast!`, isKeyMoment: false },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `FOUR! ${p} is timing the ball sweetly today!`, isKeyMoment: true },
    { commentatorId: c2, text: `Class is permanent, form is temporary. And ${p} has both right now!`, isKeyMoment: false },
  ],
];

const WICKET_CONVERSATIONS: DuoGen[] = [
  (c1, c2, _p, o) => [
    { commentatorId: c1, text: `OUT! That's a huge wicket! Same number, same result — OUT!`, isKeyMoment: true },
    { commentatorId: c2, text: `Dinda Academy graduate moment! That was coming, wasn't it ${c1}?`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c2, text: `WICKET! Bowled 'em! The stumps are doing cartwheels!`, isKeyMoment: true },
    { commentatorId: c1, text: `Bumrah would be proud of that delivery! Clean bowled!`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c1, text: `OUT! Same move, same timing — that's the end!`, isKeyMoment: true },
    { commentatorId: c2, text: `Arrey! Kya hua? Both played the same thing! Drama!`, isKeyMoment: true },
  ],
];

const DOT_BALL_CONVERSATIONS: DuoGen[] = [
  (c1, c2) => [
    { commentatorId: c1, text: `Dot ball! Good tight bowling there.`, isKeyMoment: false },
    { commentatorId: c2, text: `Building pressure! Every dot is gold in limited overs.`, isKeyMoment: false },
  ],
  (c1, _c2) => [
    { commentatorId: c1, text: `Nothing doing! Maiden territory this.`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Dot ball. The pressure is mounting.`, isKeyMoment: false },
  ],
];

const SINGLE_CONVERSATIONS: DuoGen[] = [
  (c1) => [
    { commentatorId: c1, text: `Quick single taken. Smart cricket.`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Rotates the strike. Good awareness.`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Nurdles it away for one. Ticking along.`, isKeyMoment: false },
  ],
];

const MULTI_RUN_CONVERSATIONS: DuoGen[] = [
  (c1, _c2, _p, _o, runs) => [
    { commentatorId: c1, text: `${runs} runs! Good placement and running between the wickets.`, isKeyMoment: false },
  ],
  (_c1, c2, _p, _o, runs) => [
    { commentatorId: c2, text: `They take ${runs}! Athletic running there.`, isKeyMoment: false },
  ],
];

// Over break conversations
const OVER_BREAK_BATTING: DuoGen[] = [
  (c1, c2, p, _o, stats) => [
    { commentatorId: c1, text: `End of the over! ${p} has scored ${stats.overRuns} runs off that over.`, isKeyMoment: true },
    { commentatorId: c2, text: `Current rate is ${stats.crr}. ${stats.target ? `Need ${stats.remaining} more from ${stats.remainingBalls} balls` : `Good tempo so far`}.`, isKeyMoment: true },
    { commentatorId: c1, text: `${stats.crr > 8 ? `This is aggressive cricket! Intent™ is through the roof!` : stats.crr > 5 ? `Steady scoring. Not too fast, not too slow.` : `Needs to pick up the pace a bit, don't you think?`}`, isKeyMoment: false },
    { commentatorId: c2, text: `${stats.target ? (stats.rrr > stats.crr ? `Required rate of ${stats.rrr} is climbing. Time for some big shots!` : `Well ahead of the asking rate. ${p} is cruising!`) : `Let's see what the next over brings!`}`, isKeyMoment: false },
  ],
  (c1, c2, p, _o, stats) => [
    { commentatorId: c2, text: `Over done! ${stats.overRuns} off that one. Score is ${stats.score}/${stats.wickets}.`, isKeyMoment: true },
    { commentatorId: c1, text: `${stats.overRuns >= 10 ? `Kya over tha! ${p} ne toh tod diya!` : stats.overRuns === 0 ? `Maiden! The bowler is on fire!` : `Decent over. ${p} needs to keep the momentum going.`}`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.target ? `${stats.remaining} needed off ${stats.remainingBalls}. ${stats.remaining <= 20 ? `Almost there!` : `Still a long way to go.`}` : `Let's build a big total here!`}`, isKeyMoment: false },
  ],
];

const OVER_BREAK_BOWLING: DuoGen[] = [
  (c1, c2, _p, o, stats) => [
    { commentatorId: c1, text: `Over complete! ${o} scored ${stats.overRuns} that over. ${o} at ${stats.opponentScore}/${stats.opponentWickets}.`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.overRuns >= 10 ? `Yikes! That was expensive. Need to tighten up!` : stats.overRuns <= 3 ? `Brilliant tight bowling! Keep this up!` : `Acceptable. But we need wickets!`}`, isKeyMoment: true },
    { commentatorId: c1, text: `${stats.target ? `${o} needs ${stats.remaining} more. ${stats.rrr > 12 ? `Nearly impossible now!` : stats.rrr > 8 ? `Still gettable but tough!` : `Very much in the game.`}` : `Need to restrict them here. Every run matters!`}`, isKeyMoment: false },
  ],
];

// Defending/chasing conversation
const CHASE_TENSION: DuoGen[] = [
  (c1, c2, p, _o, stats) => [
    { commentatorId: c1, text: `${p} needs ${stats.remaining} off ${stats.remainingBalls}. The equation is ${stats.remaining <= 15 ? `very gettable` : stats.remaining <= 30 ? `challenging` : `daunting`}!`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.rrr <= 6 ? `Just singles will do it!` : stats.rrr <= 10 ? `Need a boundary every other ball!` : `Only Yuvraj-style hitting can save this!`} Come on ${p}!`, isKeyMoment: true },
  ],
];

const DEFENDING_TENSION: DuoGen[] = [
  (c1, c2, _p, o, stats) => [
    { commentatorId: c1, text: `${o} still needs ${stats.remaining} off ${stats.remainingBalls}. We're in the driver's seat!`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.remaining > stats.remainingBalls * 2 ? `This is like defending a fortress! Easy peasy!` : `Don't get complacent — one big over can change everything!`}`, isKeyMoment: true },
  ],
];

export function getDuoCommentary(
  c1Name: string,
  c2Name: string,
  runs: number | "OUT",
  isBatting: boolean,
  playerName: string,
  opponentName: string,
  extra?: any
): CommentaryLine[] {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  if (runs === "OUT") {
    return pick(WICKET_CONVERSATIONS)(c1Name, c2Name, playerName, opponentName, extra);
  }
  
  const absRuns = Math.abs(runs);
  if (absRuns === 6) return pick(SIX_CONVERSATIONS)(c1Name, c2Name, isBatting ? playerName : opponentName, isBatting ? opponentName : playerName, extra);
  if (absRuns === 4) return pick(FOUR_CONVERSATIONS)(c1Name, c2Name, isBatting ? playerName : opponentName, isBatting ? opponentName : playerName, extra);
  if (absRuns === 0) return pick(DOT_BALL_CONVERSATIONS)(c1Name, c2Name, playerName, opponentName, extra);
  if (absRuns === 1) return pick(SINGLE_CONVERSATIONS)(c1Name, c2Name, playerName, opponentName, extra);
  return pick(MULTI_RUN_CONVERSATIONS)(c1Name, c2Name, playerName, opponentName, absRuns);
}

export function getOverBreakCommentary(
  c1Name: string,
  c2Name: string,
  isBatting: boolean,
  playerName: string,
  opponentName: string,
  stats: {
    overRuns: number;
    score: number;
    wickets: number;
    opponentScore: number;
    opponentWickets: number;
    crr: string;
    rrr: string;
    target: number | null;
    remaining: number;
    remainingBalls: number;
    oversCompleted: number;
    totalOvers: number | null;
  }
): CommentaryLine[] {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  if (isBatting) {
    return pick(OVER_BREAK_BATTING)(c1Name, c2Name, playerName, opponentName, stats);
  } else {
    return pick(OVER_BREAK_BOWLING)(c1Name, c2Name, playerName, opponentName, stats);
  }
}

export function getChaseTensionCommentary(
  c1Name: string,
  c2Name: string,
  isBatting: boolean,
  playerName: string,
  opponentName: string,
  stats: { remaining: number; remainingBalls: number; rrr: number }
): CommentaryLine[] {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  if (isBatting) {
    return pick(CHASE_TENSION)(c1Name, c2Name, playerName, opponentName, stats);
  } else {
    return pick(DEFENDING_TENSION)(c1Name, c2Name, playerName, opponentName, stats);
  }
}

// Pre-match intro conversations
export function getPreMatchDuoIntro(
  c1Name: string,
  c2Name: string,
  playerName: string,
  opponentName: string
): CommentaryLine[] {
  const intros: DuoGen[] = [
    (c1, c2, p, o) => [
      { commentatorId: c1, text: `Welcome everyone! I'm ${c1} and joining me is the wonderful ${c2}!`, isKeyMoment: true },
      { commentatorId: c2, text: `Thanks ${c1}! What a match we have today — ${p} takes on ${o}!`, isKeyMoment: true },
      { commentatorId: c1, text: `The stadium is packed, the crowd is buzzing! Let's get this started!`, isKeyMoment: false },
    ],
    (c1, c2, p, o) => [
      { commentatorId: c2, text: `Namaste and welcome! ${c2} here with ${c1} for this blockbuster!`, isKeyMoment: true },
      { commentatorId: c1, text: `${p} versus ${o}! The IPL couldn't write a better script!`, isKeyMoment: true },
      { commentatorId: c2, text: `Aaj ka match toh zabardast hone wala hai! Let's GO!`, isKeyMoment: false },
    ],
    (c1, c2, p, o) => [
      { commentatorId: c1, text: `Good evening cricket fans! It's ${p} versus ${o} and what a lineup!`, isKeyMoment: true },
      { commentatorId: c2, text: `${c1}, I've been waiting for this all day! Both players are fired up!`, isKeyMoment: true },
    ],
  ];
  
  const pick = intros[Math.floor(Math.random() * intros.length)];
  return pick(c1Name, c2Name, playerName, opponentName);
}
