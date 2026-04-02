/**
 * Hindi / Hinglish Commentary — 120+ lines organized by event type.
 * Includes Bollywood refs, IPL memes, Indian slangs, gaslighting, savage roasts.
 * Works with both solo commentary and duo system.
 */

import type { CommentaryLine } from "@/lib/commentaryDuo";

type DuoGen = (c1: string, c2: string, playerName: string, opponentName: string, extra?: any) => CommentaryLine[];

// ─── Solo Hindi Commentary (for commentary.ts integration) ──────

export const HINDI_BATTING_RUNS: Record<string, string[]> = {
  "0": [
    "Dot ball! Bhai kuch toh maar, statue mat ban! 🗿",
    "Zero runs! Ye toh Dinda Academy ka bowler bhi nahi deta!",
    "Arre yaar, dot ball! Itna defensive toh Rahul Dravid bhi nahi khelta!",
    "Kuch nahi! Ye batting hai ya meditation class? 🧘",
    "Dot ball! Boundary kidhar hai bhai? GPS lagao!",
    "Zero! Camera man bhi bore ho gaya tujhe dekhke!",
    "Dot ball! Ye bat hai ya decoration piece?",
    "Arre bhai runs bana, statue bankne ka koi award nahi milega!",
    "Dot ball! Bowler tera thank you bol raha hai 😂",
    "Kuch nahi! Match dekh ke socha tha thriller hoga, ye toh documentary ban gayi!",
    "Dot! Itni patience toh meri mummy ki bhi nahi hai!",
    "Zero runs! Ye toh bigger flop hai Bombay Velvet se bhi!",
    "Dot ball! Bowler apna bio update kar raha hai — 'dominated today'!",
    "Kuch nahi hua! Bat swing kar, selfie stick nahi hai wo!",
    "Dot ball bhai! Boundary rope rota hai tere bina! 😭",
  ],
  "1": [
    "Ek run! Chalo kuch toh kiya, Salman Khan ki acting jaisi — kam hai but hai!",
    "Single! Thoda toh score badhaya, aata majhi satakli nahi abhi!",
    "Ek run mila! Baby steps, baby steps... 👶",
    "Single! Arre bhai ek hi? Ye toh Sharma ji ka beta bhi zyada laata!",
    "One run! Bas ek? Isse accha toh rickshaw wala kamata hai!",
    "Ek run! At least scoreboard hila toh diya! Moral victory! 😤",
    "Single le liya! Ye toh trailer hai, picture abhi baaki hai mere dost!",
    "One run! Slow and steady wins the race... ya phir harta hai!",
    "Single! Abey chal boundary maar, tera baap nahi khel raha saamne!",
    "Ek run! IPL auction mein ye price mein toh chai bhi nahi milti! ☕",
  ],
  "2": [
    "Do run! Arre waah, aaj dil khush kar diya! Almost! 😂",
    "Two runs! Running between wickets aisi hai jaise JIO ka network — kabhi aata hai kabhi nahi!",
    "Do run! Placement accha hai, Zomato delivery boy jaisa — sahi jagah pe!",
    "Two! Arre Usain Bolt banne ki zarurat nahi, do run kafi hai! 🏃",
    "Do run mili! Bhai thoda aur push kar, promotion chahiye toh!",
    "Two runs! Smart cricket! Ye toh MBA wali batting hai!",
    "Do run! Running dekh ke lagta hai gym membership kaam aa rahi hai!",
  ],
  "3": [
    "Teen run! Bhai ne aaj sprint mode on kiya! 🏃‍♂️",
    "Three! Itna bhaaga toh kabhi school mein bhi nahi bhaaga hoga!",
    "Teen run! Ye toh Bahubali wali running hai — unstoppable!",
    "Three runs! Fielder abhi bhi dhundh raha hai ball! 😂",
    "Teen run le liye! Cardio workout + cricket = yahi toh hai!",
  ],
  "4": [
    "CHAUKAA! 🔥 Ye shot toh Bollywood blockbuster hai — ekdum FDFS material!",
    "FOUR! Arre baap re! Ye toh Amitabh Bachchan level ka dialogue delivery hai — IMPACTFUL!",
    "BOUNDARY! Bowler ko itna maara jaise ghar ki safai mein kachre ko jhadu! 🧹",
    "CHAUKAA! Ye shot dekh ke Sachin bhi khade hoke clap karega!",
    "FOUR! Arre bhai kya shot hai! Ye toh 'Sholay' ka climax moment hai!",
    "CHAUKAA! Fielder ne try kiya but ye toh 'Gabbar' level shot tha — koi rok nahi sakta!",
    "FOUR! Ye toh Virat Kohli ki tarah chase kar raha hai — with ATTITUDE! 😤",
    "BOUNDARY! Bowler ki shakal dekho — 'Baburao' jaisi ho gayi! 😂",
    "CHAUKAA! Shot itna clean hai jaise Surf Excel se dhoya ho!",
    "FOUR! Paisa wasool shot! Interval snack ke baad wali energy! 🍿",
    "CHAUKAA! Ye boundary nahi hai, ye toh love letter hai — straight dil pe lagi!",
    "FOUR! Bowler ab ghar jaake pillow pe muh daalkle royega! 😭",
    "BOUNDARY! Instagram reels pe ye shot viral hona chahiye!",
    "CHAUKAA! Bhai tu cricketer hai ya magician? Ball disappear ho gayi!",
    "FOUR! Thanos snap jaise — bowler ka confidence disappeared! 💥",
  ],
  "6": [
    "CHHAKKAA! 🚀 Ye toh 'Pushpa' hai — flower nahi, FIRE hai!",
    "SIX! Arre Gabbar! Ball toh parking lot mein jaake ruki! Stadium chhod diya!",
    "MAXIMUM! Ye shot dekh ke bowler ki aatma nikal gayi! 👻",
    "CHHAKKAA! Bhai ne Rajinikanth style mein maara — slow motion mein bhi shandar!",
    "SIX! Ye toh 'KGF' wala Rocky bhai moment hai — unstoppable!",
    "CHHAKKAA! Ball itni door gayi jaise ex ka message — never coming back! 💔😂",
    "SIX! IPL mein ye shot hota toh DJ wale babu gaana baja deta!",
    "MAXIMUM! Ye toh Dhoni ka helicopter shot hai — Ranchi Express choo choo! 🚂",
    "CHHAKKAA! Bowler ab therapy lega — PTSD ho gaya bechare ko!",
    "SIX! Ye shot dekh ke commentator bhi nachne laga! 💃",
    "CHHAKKAA! 'Ek tha Tiger' nahi bhai — 'Ek tha SIXER KING!'",
    "SIX! Ball ko passport chahiye — international travel kar rahi hai! ✈️",
    "MAXIMUM! Bowler ka career graph dekho — all-time low! 📉",
    "CHHAKKAA! Thala for a reason! MSD school of hitting!",
    "SIX! Ye toh Gayle storm hai — Universe Boss zindabad! 🌪️",
    "CHHAKKAA! Bhai tujhe IPL mein 25 crore milna chahiye! 💰",
    "SIX! Arre baap re! Ye shot record books mein jayega! History!",
    "MAXIMUM! Bowler ki bowling figures dikhaana mat — BP badh jayega uska! 🩺",
    "CHHAKKAA! 'Ye dil maange more!' shot! Pepsi ki ad jaisi refreshing! 🥤",
    "SIX! Bhai ne bowler ko itna maara, ab wo toh fast bowling chhod dega!",
  ],
};

export const HINDI_BOWLING_RUNS: Record<string, string[]> = {
  "0": [
    "Dot ball! Tera bowling dekh ke AI ka processor hang ho gaya! 🔥",
    "Zero! AI ko itna confuse kiya jaise Monday morning alarm! ⏰",
    "Dot ball! Arre kya bowling hai — AI ka batting crash ho gaya!",
    "Kuch nahi! AI ne try kiya but tera ball toh missile tha!",
    "Dot! AI abhi rota hai corner mein! Savage bowling! 😈",
  ],
  "1": [
    "Ek run de diya! Koi baat nahi, Sharma ji bhi kabhi kabhi generous hote hain!",
    "Single! AI ne chura liya ek run — chor ki tarah! 🕵️",
    "Ek run gaya! Don't worry, ye toh change hai — asli paisa abhi aayega!",
  ],
  "2": [
    "Do run gaye! AI ne placement seekh liya kya YouTube se?",
    "Two! AI thoda improve ho raha hai — tutorial dekh ke aaya lagta hai!",
  ],
  "3": [
    "Teen run! AI ne accha running kiya — Fitbit pe steps badh gaye!",
    "Three! AI abhi bhi batting seekh raha hai — beta version hai!",
  ],
  "4": [
    "CHAUKA khaya! AI ne boundary maari! Tera bowling toh TikTok pe funny compilation mein jayega! 😂",
    "FOUR conceded! AI ne tera bowling ko treat kiya — free ki biryani jaisi!",
    "Boundary gaya! AI bol raha hai — 'Apna time aayega!' aur aa gaya!",
    "CHAUKA! AI ne tera bowling ki pitai ki — Holi pe rang jaisa!",
    "FOUR! AI tera bowling mein gap dhundh liya — GPS se bhi zyada accurate!",
  ],
  "6": [
    "CHHAKKA khaya bhai! AI ne tera bowling ko space mein bhej diya! 🚀",
    "SIX! AI bol raha hai 'bowler kaun hai? Main toh batsman hoon!'",
    "MAXIMUM gaya! AI ne teri bowling ki izzat nikaal di! 😱",
    "CHHAKKA! AI ne bowler ko gaslight kiya — 'Tera bowling accha nahi hai, bro!' 💀",
    "SIX! AI tera ball itna maara jaise Diwali ka patakha — skyshot! 🎆",
  ],
};

export const HINDI_WICKET_BATTING = [
  "OUT! Abbe! Same number? Ye toh 'Karma is a boomerang' hai! 🪃",
  "WICKET gira! Bhai tu match khelne aaya tha ya darshan karne?",
  "OUT! 'Kabhi kabhi lagta hai apun hi bhagwaan hai' — bowler ne bola!",
  "Gaya! Pack up! Ye toh Bollywood flop ki tarah tha — sabko pata tha!",
  "OUT! Bhai batting nahi aa rahi toh commentary kar le! 🎙️😂",
  "WICKET! Ye toh 'Tujhe mirchi lagi toh main kya karoon?' moment hai!",
  "OUT! Tera innings tha ya cameo? Guest appearance de ke chala gaya!",
  "Gaya bhai gaya! Ye toh 'Entry maarke, seedha Exit!' wala scene tha!",
  "OUT! Bowler ne tujhe wicket leke gaslight kiya — 'You played well... NOT!' 😈",
  "WICKET! Same number daal diya! Ye toh tandem hai ya telepathy? 📡",
];

export const HINDI_WICKET_BOWLING = [
  "OUT liya! Arre kya bowling hai! AI ko toh therapy chahiye ab! 🧠",
  "WICKET! Bowler bola — 'Tera baap aaya!' AI ki wicket udaadi!",
  "OUT! AI ka batting crash ho gaya — Blue Screen of Death! 💀",
  "Gaya AI! Tu ne toh usko uninstall kar diya! Delete kiya!",
  "WICKET le liya! AI ab Windows Update mein jaake rota hai!",
];

// ─── Duo Hindi Conversations ─────────────────────────────────────

export const HINDI_SIX_CONVERSATIONS: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `CHHAKKAA! ${p} ne toh 'Pushpa' ban ke maara — Jhukega nahi saala!`, isKeyMoment: true },
    { commentatorId: c2, text: `Arre ${c1} bhai, ye toh KGF ka Rocky hai! Ball parking lot mein!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `SIX! ${p} ne bowler ko itna maara — uski CV mein gap aa jayega!`, isKeyMoment: true },
    { commentatorId: c1, text: `Hahahaha! Bowler ka confidence aasman se zameen pe! Thanos snap! 💥`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `MAXIMUM! ${p} ka shot dekh ke lagta hai — 'Main hoon Don, Don ko pakadna mushkil hi nahi, namumkin hai!'`, isKeyMoment: true },
    { commentatorId: c2, text: `SRK energy! Ball ne toh visa bhi nahi liya aur country chhod diya! ✈️`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `CHHAKKAA! Dhoni ka helicopter! Ranchi Express full speed pe hai! 🚂`, isKeyMoment: true },
    { commentatorId: c1, text: `Thala for a reason! ${p} ne wahi shot maara jo Dhoni ne WC 2011 mein!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `SIX! ${p} ne toh 'Bahubali' wala katappa moment create kar diya!`, isKeyMoment: true },
    { commentatorId: c2, text: `Bowler soch raha hai — 'Katappa ne Bahubali ko kyun maara?' Kyunki SHOT! 😂`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `MAXIMUM! Ball itni door gayi jaise Monday ko weekend! Never coming back!`, isKeyMoment: true },
    { commentatorId: c1, text: `Haha! ${p} bol raha hai — 'Ye toh sirf trailer tha!' Full movie abhi baaki!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `CHHAKKAA! Bowler ki halat dekho — 'Ek villain' ban gaya bechara!`, isKeyMoment: true },
    { commentatorId: c2, text: `${p} ne villain ko hero bana diya! Ye toh redemption arc hai!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `SIX! Yuvraj Singh wali energy! Remember 6 sixes? Ye toh usi school ka student hai!`, isKeyMoment: true },
    { commentatorId: c1, text: `Stuart Broad abhi bhi recover nahi hua aur ${p} phir se chalu! 🔥`, isKeyMoment: true },
  ],
];

export const HINDI_FOUR_CONVERSATIONS: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `CHAUKAA! ${p} ne toh shot maara jaise 'Dabbang' ka entry scene!`, isKeyMoment: true },
    { commentatorId: c2, text: `Salman Khan wali swag! Boundary hit karke muh nahi hilaya! 😎`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `FOUR! ${p} ke shot mein itna class hai jaise 5-star hotel ka buffet!`, isKeyMoment: true },
    { commentatorId: c1, text: `Premium batting! Ye shot free mein nahi milta — IPL ticket khareedna padta! 🎟️`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `BOUNDARY! Sachin ke cover drive ki yaad aa gayi! Nostalgia hit!`, isKeyMoment: true },
    { commentatorId: c2, text: `Master Blaster School of Cricket! ${p} pass out with distinction! 🎓`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `CHAUKAA! Bowler ki shakal dekho — 'Sad Life' meme ban gaya! 😂`, isKeyMoment: true },
    { commentatorId: c1, text: `${p} ne toh bowling ki vaat laga di! IPL auction mein price UP! 📈`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c1, text: `FOUR! Ye toh Kohli ka anger-powered shot hai — frustration se boundary! 🔥`, isKeyMoment: true },
    { commentatorId: c2, text: `King Kohli energy! BC kya shot tha! (Beautiful Cricket of course!) 😇`, isKeyMoment: true },
  ],
];

export const HINDI_WICKET_CONVERSATIONS: DuoGen[] = [
  (c1, c2) => [
    { commentatorId: c1, text: `OUT! Same number! Ye toh 'Karma ka kaanda' hai!`, isKeyMoment: true },
    { commentatorId: c2, text: `Bhai 'Picture abhi baaki hai' bolne ka chance bhi nahi mila! Seedha OUT! 💀`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c2, text: `WICKET! Stumps udh gaye! Ye toh Diwali aa gayi early! 🎆`, isKeyMoment: true },
    { commentatorId: c1, text: `Bowler ne toh 'Pushpa' wala dialogue maara — 'Main jhukega nahi!' And OUT!`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c1, text: `OUT! Arre bhai, batting nahi aa rahi toh ghar jaake 'Chhota Bheem' dekh!`, isKeyMoment: true },
    { commentatorId: c2, text: `Savage ${c1}! But sach toh yahi hai — ye out hona toh likha tha! Destiny! 🔮`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c2, text: `WICKET gira! 'Ye dosti hum nahi todenge' — but ye batting toh tod di! 😂`, isKeyMoment: true },
    { commentatorId: c1, text: `Bechara batter! Ab dugout mein jaake Maggi khayega! 🍜`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c1, text: `OUT! Bhai ye toh 'Flop Show' ka naya episode tha!`, isKeyMoment: true },
    { commentatorId: c2, text: `Twitter pe trend hoga — '#BattingDisaster'! RIP batting! 🪦`, isKeyMoment: true },
  ],
  (c1, c2) => [
    { commentatorId: c2, text: `WICKET! 'Jab tak hai jaan' — but jaan nikal gayi! 😱`, isKeyMoment: true },
    { commentatorId: c1, text: `Shah Rukh bhi itna dramatic nahi hota! Pack up bhai! 🎬`, isKeyMoment: true },
  ],
];

export const HINDI_DOT_BALL_CONVERSATIONS: DuoGen[] = [
  (c1, c2) => [
    { commentatorId: c1, text: `Dot ball! Batter ko koi GPS do — boundary ka rasta bhool gaya!`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Zero! Ye batting hai ya hunger strike? Kuch khao na bhai! 🍕`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Dot! Pressure cooker jaisa — seeti bajne wali hai! 🫕`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Ek aur dot! Bowler ka ego boost ho raha hai! Sochta hai main god hoon!`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Dot ball! Scoreboard bhool gaya ki update karna hai! 😂`, isKeyMoment: false },
  ],
];

export const HINDI_SINGLE_CONVERSATIONS: DuoGen[] = [
  (c1) => [
    { commentatorId: c1, text: `Single! Ek run! Sharma ji ke portfolio jaisa — slowly growing! 📈`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Ek run! Baby steps re baba! Pehle chalna seekh phir daudna!`, isKeyMoment: false },
  ],
  (c1) => [
    { commentatorId: c1, text: `Single le liya! Auto rickshaw wali speed se running! 🛺`, isKeyMoment: false },
  ],
  (_c1, c2) => [
    { commentatorId: c2, text: `Ek run! 'Zindagi mein patience rakhna chahiye' — Sharma ji`, isKeyMoment: false },
  ],
];

// ─── Hindi Over Break Commentary ──────────────────────────────────

export const HINDI_OVER_BREAK_BATTING: DuoGen[] = [
  (c1, c2, p, _o, stats) => [
    { commentatorId: c1, text: `Over khatam! ${p} ne ${stats.overRuns} runs banaye is over mein! Score hai ${stats.score}/${stats.wickets}!`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.overRuns >= 10 ? `Arre Waah! Ye toh IPL jaisa over tha! Paisa vasool!` : stats.overRuns === 0 ? `Maiden! Bowler ki Diwali ho gayi!` : `Theek thaak over tha. Aur push karo!`}`, isKeyMoment: true },
    { commentatorId: c1, text: `${stats.target ? `Abhi ${stats.remaining} chahiye ${stats.remainingBalls} balls mein. ${stats.remaining <= 15 ? `Ye toh chhota target hai!` : `Mehnat karni padegi!`}` : `Achha total ban raha hai! Keep going!`}`, isKeyMoment: false },
  ],
  (c1, c2, p, _o, stats) => [
    { commentatorId: c2, text: `Over done! ${stats.overRuns} is over se! ${p} ${stats.crr} ki run rate pe chal raha hai!`, isKeyMoment: true },
    { commentatorId: c1, text: `${stats.crr > 8 ? `Ye toh T20 mode hai bhai! Jet speed! ✈️` : stats.crr > 5 ? `Steady hai. Test match toh nahi khel raha na?` : `Bhai rate badhao! Zomato delivery bhi isse fast hai!`}`, isKeyMoment: true },
  ],
];

export const HINDI_OVER_BREAK_BOWLING: DuoGen[] = [
  (c1, c2, _p, o, stats) => [
    { commentatorId: c1, text: `Over khatam! ${o} ne ${stats.overRuns} runs banaye. Score: ${stats.opponentScore}/${stats.opponentWickets}!`, isKeyMoment: true },
    { commentatorId: c2, text: `${stats.overRuns >= 10 ? `Arre! Ye toh bahut expensive tha! Budget over ho gaya!` : stats.overRuns <= 3 ? `Kya tight bowling hai! Miser bowling! 💰` : `Chalega! Par wicket chahiye ab!`}`, isKeyMoment: true },
  ],
];

// ─── Hindi Post-Match Lines ───────────────────────────────────────

export const HINDI_POST_MATCH_WIN: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `JEET GAYE! ${p} ne toh 'Lagaan' wali jeet dilaai! What a match!`, isKeyMoment: true },
    { commentatorId: c2, text: `Aamir Khan proud hoga! 'All izz well' aur 'All is WIN!' 🏆`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `${p} CHAMPION! 'Apna time aayega' aur aa gaya! Gully Boy energy! 🎤`, isKeyMoment: true },
    { commentatorId: c1, text: `Ranveer Singh nachega is jeet pe! Ye toh 'Ram Leela' ka climax tha!`, isKeyMoment: true },
  ],
];

export const HINDI_POST_MATCH_LOSS: DuoGen[] = [
  (c1, c2, p) => [
    { commentatorId: c1, text: `Haar gaye! ${p} ke liye 'Kabhi Khushi Kabhie Gham' ka 'Gham' wala part! 😢`, isKeyMoment: true },
    { commentatorId: c2, text: `Koi nahi bhai! 'Haar ke jeetne wale ko baazigar kehte hain!' Next time!`, isKeyMoment: true },
  ],
  (c1, c2, p) => [
    { commentatorId: c2, text: `L liya! ${p} bhai aaj toh 'Devdas' ban gaya! Sharab pee aur so ja! 😂`, isKeyMoment: true },
    { commentatorId: c1, text: `Savage ${c2}! But comeback king ban ke aana next time! 💪`, isKeyMoment: true },
  ],
];

export const HINDI_POST_MATCH_DRAW: DuoGen[] = [
  (c1, c2) => [
    { commentatorId: c1, text: `TIE! Ye toh 'Sholay' ka ending hai — dono barabar! Koi nahi haara!`, isKeyMoment: true },
    { commentatorId: c2, text: `Jai aur Veeru dono jeet gaye! Ab rematch karo!`, isKeyMoment: true },
  ],
];

// ─── Hindi Pre-Match Lines ────────────────────────────────────────

export const HINDI_PRE_MATCH_INTRO: DuoGen[] = [
  (c1, c2, p, o) => [
    { commentatorId: c1, text: `Namaste aur swaagat hai! Main ${c1} aur mere saath hai ${c2}! Aaj ka muqabla — ${p} vs ${o}!`, isKeyMoment: true },
    { commentatorId: c2, text: `Kya match hone wala hai! Popcorn ready? 🍿 IPL se bhi bada! Let's go!`, isKeyMoment: true },
  ],
  (c1, c2, p, o) => [
    { commentatorId: c2, text: `Aaj ka dangal! ${p} versus ${o}! Ye toh 'Mahabharata' hai cricket ka! ⚔️`, isKeyMoment: true },
    { commentatorId: c1, text: `${c2} sahi keh raha hai! Ye match history books mein jayega! Shauru karte hain!`, isKeyMoment: true },
  ],
];

// ─── Hindi Gaslighting / Savage Lines (random interjections) ─────

export const HINDI_GASLIGHT_PLAYER = [
  "Bhai tune last match mein bhi aisa hi khela tha... oh wait, worse! 😂",
  "Ye batter toh aise khel raha hai jaise Wi-Fi buffering ho rahi hai! 🔄",
  "Isko batting aata hai ya ye 'DDLJ' ka Raj hai — sirf khade rehna aata hai?",
  "Bhai tu cricketer hai ya mannequin? Move toh kar! 🗿",
  "Is batter ne aaj nashta nahi kiya lagta hai — energy zero hai!",
  "Ye toh aise batting kar raha hai jaise exam hall mein — kuch nahi aata but baitha hai!",
  "GPS chahiye isko — boundary ka rasta bhool gaya! 🗺️",
  "Ye toh vahi banda hai jo group project mein kuch nahi karta but credit leta hai!",
  "Arre bat uthao! Selfie stick nahi hai wo!",
  "Bhai tera batting average dekh ke ATM bhi deny kar dega!",
];

export const HINDI_GASLIGHT_BOWLER = [
  "Bowler ki bowling dekh ke lagta hai inhone YouTube tutorial dekha hai — 'How to bowl: FAIL compilation'! 😂",
  "Ye bowling hai ya charity? Boundaries free mein de raha hai!",
  "Bowler bol raha hai 'Mera kaam hai bowling karna, run dena mera kaam nahi' — but de raha hai!",
  "Ye bowler toh aise bowl kar raha hai jaise batting practice de raha hai — free coaching! 🎓",
  "Bowler ka confidence 404 Not Found! Error ho gaya!",
  "Isko bowling nahi, career counseling chahiye — galat field choose kiya!",
  "Ye bowler toh vahi hai jo traffic mein horn bajata hai — annoying but useless!",
  "Bowler ne aaj 'Munna Bhai MBBS' ki tarah — jaadu ki jhappi di batsman ko!",
];

// ─── Hindi Milestone Commentary ───────────────────────────────────

export const HINDI_MILESTONES: Record<string, string[]> = {
  fifty: [
    "FIFTY! 🎉 Bhai ne half century maari! Sharma ji ke bete ko bolo — ye dekho!",
    "50 runs! Ye toh 'Zindagi Na Milegi Dobara' moment hai — life lived fully!",
    "Half century! DJ bajao! 'Badtameez Dil' wala gaana lagao! 💃",
    "FIFTY! IPL mein teri price abhi double ho gayi! 💰💰",
    "50! Arre waah! Ye toh 'Lagaan' ki jeet jaisi khushi hai!",
  ],
  hundred: [
    "CENTURY! 💯 Bhai ne toh 'Don' ban ke aaya — 'Don ko pakadna mushkil hi nahi, namumkin hai!'",
    "100 RUNS! Stadium mein 'Chak De India' ka music bajao! 🏑🏏",
    "CENTURY! Ye toh Sachin ka 100th hundred wali feeling hai! Legendary!",
    "💯! Bhai tere liye Bollywood mein biopic banne wali hai! Title: 'Century King!'",
    "HUNDRED! Bowler ab retirement plan dekh raha hai! Barbad kar diya!",
  ],
};

// ─── Export helper to get random Hindi commentary ─────────────────

export function getRandomHindiLine(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomHindiDuoConversation(pool: DuoGen[], c1: string, c2: string, p: string, o: string, extra?: any): CommentaryLine[] {
  return pool[Math.floor(Math.random() * pool.length)](c1, c2, p, o, extra);
}
