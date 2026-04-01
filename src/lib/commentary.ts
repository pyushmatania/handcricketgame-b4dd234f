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
    "Played and missed! No damage done.",
    "Stone-cold defence — dot ball.",
    "Dead bat. Zero runs. Smart play.",
    "Left alone beautifully — nothing scored.",
    "Tight line, tighter defence. Dot.",
    "That's going nowhere. Zero runs.",
    "Blocked it right back. No run.",
    "Solid wall of defence! Dot ball.",
    "Nothing doing there. Good leave.",
    "Rock solid! No runs off that.",
    "Watchful batting. Dot ball.",
    "The bowler wins that battle. Zero.",
    "Shouldered arms. Nothing scored.",
    "Defence like a fortress! Dot.",
    "Can't find the gap. No run.",
    "Textbook block. Zero runs added.",
    "Playing it safe — dot ball on the board.",
  ],
  "1": [
    "Nudged away for a single.",
    "Quick single taken!",
    "One run added to the total.",
    "Rotates the strike with a single.",
    "Cheeky single — smart cricket.",
    "Tucked off the pads for one.",
    "Worked it away — one run.",
    "Pushes to mid-on, easy single.",
    "Just the one, but it ticks along.",
    "Milking the bowling — one more.",
    "Dabbed to third man for one.",
    "Flicked off the hip — single!",
    "Turned the face, picks up one.",
    "Soft hands, single to fine leg.",
    "Good running! One to the total.",
    "Nurdles it behind square for one.",
    "Just a single, but keeps the board moving.",
    "Smart placement for a quick single.",
    "Works it square for one run.",
    "Gentle push — one run scored.",
  ],
  "2": [
    "Nicely placed for two!",
    "Great running between the wickets — two runs.",
    "Pushed into the gap, two taken!",
    "Lovely placement! Two runs scored.",
    "Quick between the stumps — two!",
    "Splits the fielders for a brace.",
    "Driven down the ground — two more!",
    "Two runs! Expert gap-finding.",
    "Gorgeous timing, and that's two.",
    "Athletic running gets them two!",
    "Cuts hard, fielder chases — two runs.",
    "Pulls it to deep square — two!",
    "Clips it fine — two runs taken.",
    "Threads the needle for two!",
    "Sharp running converts one to two!",
    "Glanced off the pads — two runs.",
    "Swept fine — comfortable two.",
    "Cover drive! They'll come back for two.",
    "Punched through extra cover — two!",
    "Great call for two! Smart running.",
  ],
  "3": [
    "Three runs! Excellent placement.",
    "They've run three! Good athleticism.",
    "Three to the total — smart cricket!",
    "Cracked into the gap — three taken!",
    "Outstanding running! Three runs.",
    "Finds the deep and runs three!",
    "Three! Superb work between the wickets.",
    "Driven hard — three runs!",
    "Misfield helps — three to the batter.",
    "Lofted over mid-off — three runs!",
    "Pulled to deep midwicket — three!",
    "Three all the way! Good acceleration.",
    "Quick feet, quick runs — three!",
    "The fielder slips! Three runs taken.",
    "Hammered through the gap — three!",
    "Great power! They come back for three.",
    "Three more to the tally — lovely shot!",
    "Cuts it late — three runs! Beautiful.",
    "Electric between the wickets — three runs!",
    "Diving stop can't prevent three!",
  ],
  "4": [
    "FOUR! Cracked to the boundary! 🔥",
    "BOUNDARY! That's racing away!",
    "Smashed for FOUR! What a shot!",
    "Four runs! The crowd goes wild!",
    "That's a classic FOUR! Textbook timing.",
    "FOUR! Through the covers like a bullet!",
    "Boundary! Pulled with authority!",
    "FOUR MORE! Unstoppable today!",
    "Sweetly timed — races to the fence!",
    "FOUR! Carved over the slips! Brave!",
    "That's raced away! FOUR! 🔥",
    "Dispatched to the boundary! Four!",
    "Crashing FOUR! What timing!",
    "FOUR! Swept with disdain!",
    "Glorious cover drive for FOUR!",
    "Cut shot! FOUR! Brutal hitting!",
    "Late cut — FOUR to third man!",
    "FOUR! Straight down the ground!",
    "Flicked off the pads — FOUR! Class!",
    "BOUNDARY! That was absolutely creamed! 🔥",
  ],
  "6": [
    "SIX! Massive hit! That's out of the ground! 🚀",
    "MAXIMUM! What a strike!",
    "SIX! Into the stands! Unbelievable power!",
    "That's a SIX! Absolutely dispatched!",
    "HUGE SIX! The ball has disappeared!",
    "SIX! Monster hit! Into orbit! 🚀",
    "That's gone all the way! MAXIMUM!",
    "SIX! What a majestic strike!",
    "Into the crowd! SIX! Sensational!",
    "Launched over long-on — SIX! 🚀",
    "SIX! Demolished that bowling!",
    "Out of the stadium! MAXIMUM!",
    "SIX! Scooped over the keeper! Audacious!",
    "Flat batted for SIX! Incredible power!",
    "That's in the upper tier! MAXIMUM! 🚀",
    "SIX! Reverse swept into next week!",
    "Helicoptered for SIX! Vintage!",
    "SIX! Clean as you like! Pure muscle!",
    "Deposited into Row Z! MAXIMUM! 🚀",
    "SIX! Standing ovation time! What a hit!",
  ],
};

const BOWLING_RUNS: Record<string, string[]> = {
  "0": [
    "Dot ball! Tight bowling.",
    "No runs conceded — well bowled!",
    "Defence from the AI. No damage.",
    "AI can't score off that! Dot ball.",
    "Brilliant line and length — zero!",
    "Strangled for runs! Dot ball.",
    "AI beaten! No run scored.",
    "Misses completely — dot ball!",
    "You've tied them down! Zero runs.",
    "Pressure bowling! Another dot.",
    "AI blocked it dead. No run.",
    "Right on target — dot ball!",
    "That's an unplayable delivery! Zero.",
    "Maiden territory! Another dot.",
    "Suffocating spell — dot ball!",
    "AI plays and misses! No run.",
    "Line and length perfection — dot!",
    "Defensive prod — zero runs conceded.",
    "Building pressure! Another dot ball.",
    "AI has no answer! Dot ball.",
  ],
  "1": [
    "AI takes a single.",
    "One run to the opposition.",
    "AI nudges one — stay focused!",
    "Single conceded. Keep it tight.",
    "AI rotates strike — just one.",
    "One run leaked. Not much damage.",
    "AI works it for a single.",
    "Quick single to the AI. Stay sharp.",
    "Just the one conceded there.",
    "AI steals a single off the pads.",
    "Pushed for one by the AI.",
    "One run — the AI ticks along.",
    "Dabbed away for a single. Minor.",
    "AI picks up one off that delivery.",
    "Single taken — no big deal.",
    "AI finds a gap for one.",
    "One off the edge — lucky single.",
    "AI clips it away for a single.",
    "Soft single to the AI.",
    "One run conceded off the pads.",
  ],
  "2": [
    "AI finds two. Pressure building.",
    "Two runs conceded.",
    "AI pushes through for two!",
    "Two to the AI — tighten up!",
    "AI splits the field — two runs.",
    "Two more to the AI's total.",
    "Gap found by AI — two taken.",
    "AI runs hard — two scored.",
    "Driven for two by the AI.",
    "Two runs leak away there.",
    "AI threads it through — two!",
    "Quick two to the AI. Careful!",
    "AI gets two — scoring accelerating.",
    "Two runs! AI finding rhythm.",
    "Placed well by AI — two taken.",
    "AI steals two with quick running.",
    "Two conceded through the covers.",
    "AI works it square for two.",
    "Two more — AI looks comfortable.",
    "AI punches it for a brace.",
  ],
  "3": [
    "Three to the AI. Stay focused!",
    "Three runs — AI finding gaps.",
    "AI races through for three!",
    "Three conceded! Boundary saved at least.",
    "AI hammers it — three runs!",
    "Three to the AI — getting expensive.",
    "Good shot by AI — three taken.",
    "AI threads three through the field!",
    "Three more to the AI. Pressure!",
    "AI drives for three — ouch!",
    "Fielder can't cut it off — three!",
    "Three runs by the AI. Need a wicket!",
    "AI picks three — scoring rate up.",
    "Expensive delivery! Three to the AI.",
    "AI cracks it for three runs.",
    "Three! AI looking dangerous now.",
    "Run hard by the AI — three scored.",
    "Three more leaked. Bowl tighter!",
    "AI places it expertly — three!",
    "Three runs — AI in control.",
  ],
  "4": [
    "FOUR conceded! AI finding boundaries.",
    "Boundary! AI hits four. Tighten up!",
    "FOUR! AI cracks it to the fence!",
    "Boundary off the AI bat — four runs!",
    "AI smashes four! Getting tough.",
    "FOUR! AI punishes the loose ball!",
    "Racing to the boundary — four to AI!",
    "AI drives it for FOUR! Costly!",
    "Boundary again! AI on the attack.",
    "FOUR! AI is in the zone now!",
    "Dispatched for four by the AI!",
    "AI carves it away — FOUR!",
    "Four more! AI piling on runs.",
    "FOUR! AI finds the gap perfectly.",
    "AI pulls it for FOUR! Need answers.",
    "Crashed through covers — FOUR to AI!",
    "AI cuts for FOUR! Change it up!",
    "Four conceded — AI accelerating.",
    "FOUR! AI is batting beautifully.",
    "Swept for four! AI dominant.",
  ],
  "6": [
    "SIX to the AI! Big hit from the opposition!",
    "MAXIMUM by AI! Need to bowl tighter!",
    "SIX! AI launches it into orbit!",
    "AI smashes a massive SIX! Trouble!",
    "Gone for SIX! AI is on fire!",
    "MAXIMUM! AI takes it downtown!",
    "SIX conceded! That hurt!",
    "AI deposits it for SIX! Ouch!",
    "Out of the ground! SIX to the AI!",
    "AI muscles it for MAXIMUM!",
    "SIX! AI clearing the boundaries easily!",
    "Hammered for SIX by the AI!",
    "AI goes aerial — SIX! Need a plan.",
    "MAXIMUM! AI is unstoppable right now!",
    "SIX! AI doesn't hold back!",
    "Into the stands! SIX by the AI!",
    "Monster SIX from the AI. Regroup!",
    "AI launches for SIX — devastating!",
    "SIX! The AI means business!",
    "MAXIMUM from AI! Total carnage!",
  ],
};

const OUT_BATTING = [
  "OUT! Caught matching moves! 💀",
  "WICKET! Identical moves — that's OUT!",
  "Gone! Both played the same — dismissed!",
  "OUT! The innings comes to an end!",
  "Matching moves — OUT! Heartbreak! 💀",
  "Can you believe it? OUT!",
  "Same choice! That's the end — OUT!",
  "DISMISSED! What a cruel way to go!",
  "OUT! Lightning strikes! Both picked the same!",
  "Gone! Trapped by the AI — OUT! 💀",
  "WICKET! Mirror image — you're out!",
  "OUT! The AI read your mind!",
  "Disaster! Same move — OUT!",
  "OUT! That's a painful dismissal!",
  "GONE! AI matches perfectly — wicket! 💀",
  "OUT! The stumps are shattered!",
  "Edged and caught — same move! OUT!",
  "OUT! Walk back to the pavilion!",
  "BOWLED! Matching moves — OUT! 💀",
  "That's the killer blow — OUT!",
];

const OUT_BOWLING = [
  "WICKET! AI is OUT! Great bowling! 🎯",
  "Got 'em! AI dismissed with matching moves!",
  "BOWLED! AI plays the same — OUT!",
  "What a delivery! AI is gone!",
  "WICKET! AI falls! Brilliant! 🎯",
  "AI is OUT! Same move — beautiful!",
  "Trapped! AI dismissed — celebration time! 🎯",
  "OUT! AI walks back. What a moment!",
  "WICKET! You've outsmarted the AI!",
  "AI is GONE! Matching moves — dismissed!",
  "YOU GOT THE WICKET! AI out! 🎯",
  "What a catch! AI out on matching!",
  "CLEANED UP! AI dismissed — OUT!",
  "AI departs! Same move — wicket!",
  "OUT! AI has no answer for that! 🎯",
  "Stumps flying! AI is OUT!",
  "BRILLIANT bowling! AI dismissed!",
  "The AI crumbles — OUT! 🎯",
  "WICKET! Mirror move — AI is done!",
  "AI gone for good! What a spell! 🎯",
];

const WIN_COMMENTS = [
  "🏆 CHAMPION! What a performance!",
  "🏆 VICTORY! You've conquered the AI!",
  "🏆 MATCH WON! A masterclass!",
  "🏆 INCREDIBLE WIN! Standing ovation!",
  "🏆 Glory! You've won the match!",
  "🏆 What a triumph! Victory is yours!",
  "🏆 Unbeatable! You've done it!",
  "🏆 CHAMPION performance! Take a bow!",
  "🏆 Sensational win! Cricket genius!",
  "🏆 The trophy is yours! What a match!",
  "🏆 WINNER! The crowd erupts!",
  "🏆 Dominated! Complete victory!",
  "🏆 Historic win! One for the ages!",
  "🏆 MATCH WON! Pure brilliance!",
  "🏆 Unstoppable! A famous victory!",
  "🏆 Conquered the AI! You're legendary!",
  "🏆 Total domination! Champion!",
  "🏆 The stadium goes wild! YOU WIN!",
  "🏆 Clinical victory! Absolute perfection!",
  "🏆 EPIC WIN! You've made history!",
];

const LOSS_COMMENTS = [
  "AI takes the match. Better luck next time!",
  "Defeated by the AI. Regroup and try again!",
  "Close match, but AI edges it.",
  "AI prevails. Don't give up!",
  "Tough loss. AI was too strong today.",
  "AI clinches the win. Try a rematch!",
  "Not this time. AI takes the honors.",
  "AI wins! Shake it off and come back!",
  "Heartbreak! AI steals the match.",
  "AI triumphs. The fight continues!",
  "Narrow defeat. You'll get 'em next time!",
  "AI claims victory. Stay resilient!",
  "Lost this battle, not the war!",
  "AI wins the day. Regroup, champion!",
  "So close! AI just edges past you.",
  "AI takes the spoils today.",
  "Defeated, but you fought well!",
  "AI wins — time for a revenge match!",
  "Tough result. Learn and come back stronger!",
  "AI stands victorious. Next time is yours!",
];

const DRAW_COMMENTS = [
  "🤝 A TIE! What a closely fought contest!",
  "🤝 Honors even! Neither side could separate.",
  "🤝 Dead heat! Incredible match!",
  "🤝 A draw! Both teams gave everything!",
  "🤝 Level pegging! What a game!",
  "🤝 Tied up! Neither budges — epic!",
  "🤝 Both sides equal! A fair result.",
  "🤝 Mirror finish! It's a tie!",
  "🤝 Deadlock! What drama!",
  "🤝 All square! A match for the ages!",
  "🤝 Locked together! Perfect balance.",
  "🤝 Neither can separate — it's a draw!",
  "🤝 Even-steven! Remarkable contest!",
  "🤝 A tie! Both deserve to win!",
  "🤝 Stalemate! Incredible sportsmanship!",
  "🤝 Shared honors! What a battle!",
  "🤝 It's level! A thrilling draw!",
  "🤝 Deadlocked! This game had everything!",
  "🤝 Perfectly matched — a tie!",
  "🤝 Split down the middle! Epic draw!",
];

const CHASE_COMMENTS = [
  "Getting closer to the target!",
  "The chase is on! Keep going!",
  "Closing in on the target!",
  "Almost there! Keep the focus!",
  "Every run counts in this chase!",
  "The target is within sight!",
  "Chipping away at the target!",
  "Pressure chase — you've got this!",
  "Inching closer with every ball!",
  "Target in range! Keep swinging!",
  "The finish line approaches!",
  "Stay calm, chase it down!",
  "You can smell victory!",
  "Home stretch! Keep going!",
  "The target beckons — push on!",
  "Almost home! Brilliant chase!",
  "One step at a time — closing in!",
  "The run rate is under control!",
  "Target locked! Keep scoring!",
  "The chase heats up! Exciting cricket!",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCommentary({ game, result }: CommentaryContext): string {
  if (game.phase === "finished") {
    if (game.result === "win") return pick(WIN_COMMENTS);
    if (game.result === "loss") return pick(LOSS_COMMENTS);
    return pick(DRAW_COMMENTS);
  }

  if (result.runs === "OUT") {
    return game.isBatting ? pick(OUT_BATTING) : pick(OUT_BOWLING);
  }

  const runs = typeof result.runs === "number" ? result.runs : 0;
  const runsKey = String(Math.abs(runs));

  if (game.isBatting) {
    const base = pick(BATTING_RUNS[runsKey] || BATTING_RUNS["0"]);
    if (game.target && game.userScore < game.target) {
      const need = game.target - game.userScore;
      if (need <= 10) return `${base} Need ${need} more to win!`;
      if (Math.random() > 0.6) return `${base} ${pick(CHASE_COMMENTS)}`;
    }
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
