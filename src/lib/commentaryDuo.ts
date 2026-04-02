/**
 * Multi-Commentator System — 5 personas, 2 randomly assigned per match.
 * Indian cricket culture mix with natural conversations.
 * Key moments get TTS, regular balls get text-only.
 * Supports English, Hindi, and Mixed commentary modes.
 */

import type { CommentaryLanguage } from "@/contexts/SettingsContext";
import {
  HINDI_SIX_CONVERSATIONS,
  HINDI_FOUR_CONVERSATIONS,
  HINDI_WICKET_CONVERSATIONS,
  HINDI_DOT_BALL_CONVERSATIONS,
  HINDI_SINGLE_CONVERSATIONS,
  HINDI_OVER_BREAK_BATTING,
  HINDI_OVER_BREAK_BOWLING,
  HINDI_POST_MATCH_WIN,
  HINDI_POST_MATCH_LOSS,
  HINDI_POST_MATCH_DRAW,
  HINDI_PRE_MATCH_INTRO,
  getRandomHindiDuoConversation,
} from "@/lib/commentaryHindi";

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

export function applyPreferredVoiceToCommentators(
  duo: [Commentator, Commentator],
  preferredVoiceId?: string
): [Commentator, Commentator] {
  if (!preferredVoiceId) return duo;

  const lead = { ...duo[0], voiceId: preferredVoiceId };
  if (duo[1].voiceId !== preferredVoiceId) {
    return [lead, duo[1]];
  }

  const alternateVoice = COMMENTATOR_PANEL.find((commentator) => commentator.voiceId !== preferredVoiceId)?.voiceId;

  return [
    lead,
    { ...duo[1], voiceId: alternateVoice || duo[1].voiceId },
  ];
}

export function pickConfiguredMatchCommentators(preferredVoiceId?: string): [Commentator, Commentator] {
  return applyPreferredVoiceToCommentators(pickMatchCommentators(), preferredVoiceId);
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
  // International mix
  (c1, c2, p) => [
    { commentatorId: c1, text: `BANG! That's gone all the way! ${p} with a Pollard-style heave!`, isKeyMoment: true },
    { commentatorId: c2, text: `Caribbean power! That ball won't be coming back anytime soon!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `SIX! Absolute carnage! ${p} just switched to Maxwell mode!`, isKeyMoment: true },
    { commentatorId: c1, text: `The Big Show energy! That went over square leg like a tracer bullet!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `HUGE! ${p} channels AB de Villiers! 360-degree hitting!`, isKeyMoment: true },
    { commentatorId: c2, text: `Mr. 360 would tip his hat! Unorthodox but devastating!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `SIX! That's Gilchrist-esque! ${p} has murderous intent!`, isKeyMoment: true },
    { commentatorId: c1, text: `G'day mate, that ball just landed in the car park! What a wallop!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `MAXIMUM! ${p} does a Dhoni helicopter! Vintage finish!`, isKeyMoment: true },
    { commentatorId: c2, text: `Arey wah! Mahi maar raha hai! Pure MSD school of batting!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `That's deposited into the fifth row! ${p} is absolutely fearless!`, isKeyMoment: true },
    { commentatorId: c1, text: `Reminds me of Flintoff at Edgbaston! Pure English steel and power!`, isKeyMoment: true },
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
  // International additions
  (c1, c2, p) => [
    { commentatorId: c2, text: `FOUR! That cover drive! Kohli-esque! ${p} makes it look so easy!`, isKeyMoment: true },
    { commentatorId: c1, text: `Wrist position, balance, follow-through — perfection!`, isKeyMoment: false },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `BOUNDARY! ${p} channels Lara! Flamboyant and devastating!`, isKeyMoment: true },
    { commentatorId: c2, text: `Prince of Port of Spain energy! That's Caribbean cricket at its finest!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `FOUR! Through point like a hot knife through butter!`, isKeyMoment: true },
    { commentatorId: c1, text: `That's Ponting at his peak! Back foot, bang, boundary!`, isKeyMoment: false },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `Swept for FOUR! ${p} is reading the bowler like a book!`, isKeyMoment: true },
    { commentatorId: c2, text: `Babar Azam would be proud of that placement! Elegant!`, isKeyMoment: false },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `FOUR! Driven straight! That's textbook VVS Laxman!`, isKeyMoment: true },
    { commentatorId: c1, text: `Very Very Special indeed! ${p} caresses it to the fence!`, isKeyMoment: false },
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
  // International additions
  (c1, c2) => [
    { commentatorId: c2, text: `GONE! Timber! Middle stump knocked back! McGrath-like precision!`, isKeyMoment: true },
    { commentatorId: c1, text: `Line and length perfection! That's international-quality bowling!`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c1, text: `WICKET! The death rattle! Stumps shattered!`, isKeyMoment: true },
    { commentatorId: c2, text: `Waqar Younis reverse swing energy! Toe-crushing delivery!`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c2, text: `OUT! Caught behind! The finger goes up immediately!`, isKeyMoment: true },
    { commentatorId: c1, text: `Shane Warne smiling from above! Leg-side trap perfectly executed!`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c1, text: `BOWLED HIM! That's Wasim Akram level devastation!`, isKeyMoment: true },
    { commentatorId: c2, text: `Sultan of Swing! The batter had no clue! Ab kya karoge?`, isKeyMoment: true },
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
  (c1) => [
    { commentatorId: c1, text: `Good length, no room to free the arms. Test match stuff!`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Strangled for space! That's Jimmy Anderson territory!`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Probing line outside off. The batter leaves well.`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Ek aur dot! The scoreboard hasn't moved. Tension building!`, isKeyMoment: false },
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
  (_c1, c2) => [
    { commentatorId: c2, text: `Strike rotation — the Rahul Dravid school of batting.`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Easy single. Keeping the scoreboard moving. Smart.`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Dabbed to third man for one. Classical batting.`, isKeyMoment: false },
  ],
];

const MULTI_RUN_CONVERSATIONS: DuoGen[] = [
  (c1, _c2, _p, _o, runs) => [
    { commentatorId: c1, text: `${runs} runs! Good placement and running between the wickets.`, isKeyMoment: false },
  ],
  (_c1, c2, _p, _o, runs) => [
    { commentatorId: c2, text: `They take ${runs}! Athletic running there.`, isKeyMoment: false },
  ],
  (c1, _c2, _p, _o, runs) => [
    { commentatorId: c1, text: `${runs} more! The outfield is quick today. Good conversion!`, isKeyMoment: false },
  ],
  (_c1, c2, _p, _o, runs) => [
    { commentatorId: c2, text: `Sharp between the wickets! ${runs} taken! Fitness matters!`, isKeyMoment: false },
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

// Helper to pick from English or Hindi pools based on language setting
function pickLangPool<T>(enPool: T[], hiPool: T[], lang: CommentaryLanguage = "english"): T {
  const pick = <U>(arr: U[]): U => arr[Math.floor(Math.random() * arr.length)];
  if (lang === "hindi") return pick(hiPool);
  if (lang === "english") return pick(enPool);
  return Math.random() > 0.5 ? pick(hiPool) : pick(enPool);
}

export function getDuoCommentary(
  c1Name: string,
  c2Name: string,
  runs: number | "OUT",
  isBatting: boolean,
  playerName: string,
  opponentName: string,
  extra?: any,
  lang: CommentaryLanguage = "english"
): CommentaryLine[] {
  if (runs === "OUT") {
    return pickLangPool(WICKET_CONVERSATIONS, HINDI_WICKET_CONVERSATIONS, lang)(c1Name, c2Name, playerName, opponentName, extra);
  }
  
  const absRuns = Math.abs(runs);
  const p = isBatting ? playerName : opponentName;
  const o = isBatting ? opponentName : playerName;
  if (absRuns === 6) return pickLangPool(SIX_CONVERSATIONS, HINDI_SIX_CONVERSATIONS, lang)(c1Name, c2Name, p, o, extra);
  if (absRuns === 4) return pickLangPool(FOUR_CONVERSATIONS, HINDI_FOUR_CONVERSATIONS, lang)(c1Name, c2Name, p, o, extra);
  if (absRuns === 0) return pickLangPool(DOT_BALL_CONVERSATIONS, HINDI_DOT_BALL_CONVERSATIONS, lang)(c1Name, c2Name, playerName, opponentName, extra);
  if (absRuns === 1) return pickLangPool(SINGLE_CONVERSATIONS, HINDI_SINGLE_CONVERSATIONS, lang)(c1Name, c2Name, playerName, opponentName, extra);
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
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
  },
  lang: CommentaryLanguage = "english"
): CommentaryLine[] {
  if (isBatting) {
    return pickLangPool(OVER_BREAK_BATTING, HINDI_OVER_BREAK_BATTING, lang)(c1Name, c2Name, playerName, opponentName, stats);
  } else {
    return pickLangPool(OVER_BREAK_BOWLING, HINDI_OVER_BREAK_BOWLING, lang)(c1Name, c2Name, playerName, opponentName, stats);
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
// ─── Pre-match ceremony pages ─────────────────────────────────

export function getPreMatchDuoIntro(
  c1Name: string, c2Name: string, playerName: string, opponentName: string, lang: CommentaryLanguage = "english"
): CommentaryLine[] {
  const intros: DuoGen[] = [
    (c1, c2, p, o) => [
      { commentatorId: c1, text: `Welcome everyone! I'm ${c1} and joining me is the wonderful ${c2}!`, isKeyMoment: true },
      { commentatorId: c2, text: `Thanks ${c1}! What a match we have today — ${p} takes on ${o}!`, isKeyMoment: true },
    ],
    (c1, c2, p, o) => [
      { commentatorId: c2, text: `Namaste and welcome! ${c2} here with ${c1} for this blockbuster!`, isKeyMoment: true },
      { commentatorId: c1, text: `${p} versus ${o}! The IPL couldn't write a better script!`, isKeyMoment: true },
    ],
    (c1, c2, p, o) => [
      { commentatorId: c1, text: `Good evening cricket fans! It's ${p} versus ${o} and what a lineup!`, isKeyMoment: true },
      { commentatorId: c2, text: `${c1}, I've been waiting for this all day! Both players are fired up!`, isKeyMoment: true },
    ],
  ];
  if (lang === "hindi" || (lang === "both" && Math.random() > 0.5)) {
    return pickLangPool(intros, HINDI_PRE_MATCH_INTRO, lang)(c1Name, c2Name, playerName, opponentName);
  }
  return intros[Math.floor(Math.random() * intros.length)](c1Name, c2Name, playerName, opponentName);
}

export function getPreMatchStadiumLines(c1Name: string, c2Name: string, playerName: string): CommentaryLine[] {
  const pools: DuoGen[] = [
    (c1, c2, p) => [
      { commentatorId: c1, text: `The stadium is absolutely buzzing! Floodlights on, crowd packed to the rafters!`, isKeyMoment: false },
      { commentatorId: c2, text: `Aaj ka mahaul toh alag hi hai! The atmosphere is electric, ${c1}!`, isKeyMoment: false },
    ],
    (c1, c2, p) => [
      { commentatorId: c2, text: `Look at this crowd! Every seat filled! ${p} must be feeling the energy!`, isKeyMoment: false },
      { commentatorId: c1, text: `Goosebumps! This is what cricket dreams are made of!`, isKeyMoment: false },
    ],
  ];
  return pools[Math.floor(Math.random() * pools.length)](c1Name, c2Name, playerName, "");
}

export function getPreMatchTossLines(
  c1Name: string, c2Name: string, tossWinner: string, battingFirst: string, tossWinnerName: string
): CommentaryLine[] {
  const electedTo = battingFirst === tossWinnerName ? "bat" : "bowl";
  const pools: DuoGen[] = [
    (c1, c2) => [
      { commentatorId: c1, text: `${tossWinner} wins the toss and elects to ${electedTo} first!`, isKeyMoment: true },
      { commentatorId: c2, text: `${electedTo === "bat" ? "Aggressive mindset! Set a big target and put pressure!" : "Bowl first mentality! Restrict and chase! Smart!"}`, isKeyMoment: true },
    ],
    (c1, c2) => [
      { commentatorId: c2, text: `Toss goes to ${tossWinner}! They choose to ${electedTo}!`, isKeyMoment: true },
      { commentatorId: c1, text: `${electedTo === "bat" ? "Intent™ from ball one! Love to see it!" : "Chasers mentality! Knowing the target is always an advantage!"}`, isKeyMoment: true },
    ],
  ];
  return pools[Math.floor(Math.random() * pools.length)](c1Name, c2Name, "", "");
}

export function getPreMatchStrategyLines(
  c1Name: string, c2Name: string, playerName: string, opponentName: string, isBattingFirst: boolean
): CommentaryLine[] {
  const pools: DuoGen[] = [
    (c1, c2, p, o) => [
      { commentatorId: c1, text: isBattingFirst
        ? `${p} will bat first! The plan should be — powerplay aggression, then accelerate!`
        : `${p} bowls first! Restrict ${o} early, dot ball pressure!`, isKeyMoment: false },
      { commentatorId: c2, text: isBattingFirst
        ? `Rohit Sharma style — start slow, then EXPLODE! Let's see if ${p} can do it!`
        : `Bowl tight lines, take wickets, and then chase like Kohli! Simple!`, isKeyMoment: false },
    ],
  ];
  return pools[0](c1Name, c2Name, playerName, opponentName);
}

export function getPreMatchGameOnLines(c1Name: string, c2Name: string, battingFirst: string): CommentaryLine[] {
  const pools: DuoGen[] = [
    (c1, c2) => [
      { commentatorId: c1, text: `${battingFirst} takes strike! Here we go! GAME ON!`, isKeyMoment: true },
      { commentatorId: c2, text: `Let the cricket begin! Aaj ka din hai — make it count!`, isKeyMoment: true },
    ],
    (c1, c2) => [
      { commentatorId: c2, text: `GAME ON! The umpire signals play! This is it!`, isKeyMoment: true },
      { commentatorId: c1, text: `Bowler marks his run-up… crowd holds its breath… HERE WE GO!`, isKeyMoment: true },
    ],
  ];
  return pools[Math.floor(Math.random() * pools.length)](c1Name, c2Name, "", "");
}

// ─── Post-match ceremony pages ────────────────────────────────

export function getPostMatchResultLines(
  c1Name: string, c2Name: string, playerName: string, opponentName: string,
  result: "win" | "loss" | "draw", playerScore: number, opponentScore: number
): CommentaryLine[] {
  const pools: Record<string, DuoGen[]> = {
    win: [
      (c1, c2, p, o) => [
        { commentatorId: c1, text: `WHAT A VICTORY! ${p} wins with ${playerScore} against ${opponentScore}!`, isKeyMoment: true },
        { commentatorId: c2, text: `Jeet gaye bhai! ${p} ne kya game khela! Champion performance!`, isKeyMoment: true },
      ],
      (c1, c2, p, o) => [
        { commentatorId: c2, text: `${p} TAKES IT! A stunning win by ${playerScore - opponentScore} runs!`, isKeyMoment: true },
        { commentatorId: c1, text: `That's how legends play! ${p} absolutely dominated today!`, isKeyMoment: true },
      ],
    ],
    loss: [
      (c1, c2, p, o) => [
        { commentatorId: c1, text: `And ${o} takes the victory! ${p} fought hard but it wasn't enough today.`, isKeyMoment: true },
        { commentatorId: c2, text: `Heartbreak for ${p}! But as they say, haar ke jeetne wale ko baazigar kehte hain! Come back stronger!`, isKeyMoment: true },
      ],
    ],
    draw: [
      (c1, c2, p, o) => [
        { commentatorId: c1, text: `IT'S A TIE! Both teams level! What a finish!`, isKeyMoment: true },
        { commentatorId: c2, text: `Cricket ka asli mazaa! Neither side deserved to lose today!`, isKeyMoment: true },
      ],
    ],
  };
  const pool = pools[result];
  return pool[Math.floor(Math.random() * pool.length)](c1Name, c2Name, playerName, opponentName);
}

export function getPostMatchStatsLines(
  c1Name: string, c2Name: string, playerName: string,
  stats: { sixes: number; fours: number; strikeRate: number; boundaryPct: number; bestPartnership: number }
): CommentaryLine[] {
  const lines: CommentaryLine[] = [];
  if (stats.sixes > 0) {
    lines.push({ commentatorId: c1Name, text: `${stats.sixes} sixes! ${playerName} was hitting them out of the park today!`, isKeyMoment: false });
    lines.push({ commentatorId: c2Name, text: `${stats.sixes >= 3 ? "Yuvraj Singh would be proud!" : "Clean hitting!"} Strike rate of ${stats.strikeRate}!`, isKeyMoment: false });
  } else {
    lines.push({ commentatorId: c1Name, text: `Strike rate of ${stats.strikeRate} with ${stats.fours} fours. ${stats.strikeRate > 120 ? "Aggressive!" : "Steady innings."}`, isKeyMoment: false });
    lines.push({ commentatorId: c2Name, text: `${stats.boundaryPct}% runs came from boundaries. ${stats.boundaryPct > 50 ? "Boundary merchant!" : "Good rotation of strike too."}`, isKeyMoment: false });
  }
  return lines;
}

export function getPostMatchVerdictLines(
  c1Name: string, c2Name: string, playerName: string, opponentName: string, result: "win" | "loss" | "draw"
): CommentaryLine[] {
  const motm = result === "win" ? playerName : result === "loss" ? opponentName : "Shared";
  const pools: DuoGen[] = [
    (c1, c2, p, o) => [
      { commentatorId: c1, text: `Man of the Match goes to ${motm}! Well deserved!`, isKeyMoment: true },
      { commentatorId: c2, text: `${result === "win" ? `${p}, take a bow! Kya performance tha!` : result === "loss" ? `Credit to ${o}. ${p} will bounce back, I'm sure!` : `Both players share the honors! Kya contest tha!`}`, isKeyMoment: true },
      { commentatorId: c1, text: `That's it from us! I'm ${c1}, with ${c2}, signing off! See you next match!`, isKeyMoment: false },
    ],
    (c1, c2, p, o) => [
      { commentatorId: c2, text: `Player of the Match: ${motm}! Outstanding!`, isKeyMoment: true },
      { commentatorId: c1, text: `${result === "win" ? `${p} showed champion mentality today!` : result === "loss" ? `${p} will learn from this. The best always do!` : `A tie that both sides will remember!`}`, isKeyMoment: true },
      { commentatorId: c2, text: `Until next time, cricket lovers! ${c2} and ${c1} signing off! Jai Cricket!`, isKeyMoment: false },
    ],
  ];
  return pools[Math.floor(Math.random() * pools.length)](c1Name, c2Name, playerName, opponentName);
}

export function getPostMatchRivalryLines(
  c1Name: string, c2Name: string, playerName: string, opponentName: string,
  result: "win" | "loss" | "draw", rivalryStats: { myWins: number; theirWins: number; totalGames: number }
): CommentaryLine[] {
  const updatedWins = rivalryStats.myWins + (result === "win" ? 1 : 0);
  const updatedLosses = rivalryStats.theirWins + (result === "loss" ? 1 : 0);
  return [
    { commentatorId: c1Name, text: `Head-to-head update: ${playerName} ${updatedWins} - ${updatedLosses} ${opponentName}! ${updatedWins > updatedLosses ? `${playerName} extending the lead!` : updatedLosses > updatedWins ? `${opponentName} still on top!` : "All square now!"}`, isKeyMoment: false },
    { commentatorId: c2Name, text: `${result === "win" ? `${playerName} ka jalwa! Dominance!` : result === "loss" ? `${opponentName} says "main abhi zinda hoon!" Rivalry is ON!` : `This rivalry refuses to die! REMATCH when?!`}`, isKeyMoment: false },
  ];
}
