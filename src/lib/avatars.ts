// 20 predefined avatar designs — gradient backgrounds with cricket-themed icons
export interface AvatarPreset {
  gradient: string;
  emoji: string;
  label: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { gradient: "from-[hsl(217,91%,60%)] to-[hsl(217,91%,40%)]", emoji: "🏏", label: "Classic Bat" },
  { gradient: "from-[hsl(45,93%,58%)] to-[hsl(30,90%,45%)]", emoji: "🏆", label: "Champion" },
  { gradient: "from-[hsl(142,76%,45%)] to-[hsl(142,60%,30%)]", emoji: "🌟", label: "Superstar" },
  { gradient: "from-[hsl(0,84%,60%)] to-[hsl(0,70%,40%)]", emoji: "🔥", label: "Fireball" },
  { gradient: "from-[hsl(270,76%,55%)] to-[hsl(270,60%,35%)]", emoji: "⚡", label: "Thunder" },
  { gradient: "from-[hsl(192,91%,50%)] to-[hsl(192,70%,35%)]", emoji: "🎯", label: "Bullseye" },
  { gradient: "from-[hsl(330,80%,55%)] to-[hsl(330,60%,35%)]", emoji: "💎", label: "Diamond" },
  { gradient: "from-[hsl(15,90%,55%)] to-[hsl(15,70%,35%)]", emoji: "🦁", label: "Lion" },
  { gradient: "from-[hsl(200,80%,50%)] to-[hsl(220,70%,35%)]", emoji: "🦅", label: "Eagle" },
  { gradient: "from-[hsl(160,70%,45%)] to-[hsl(160,55%,30%)]", emoji: "🐍", label: "Cobra" },
  { gradient: "from-[hsl(50,85%,50%)] to-[hsl(35,80%,40%)]", emoji: "👑", label: "Royal" },
  { gradient: "from-[hsl(280,65%,50%)] to-[hsl(300,55%,35%)]", emoji: "🧙", label: "Wizard" },
  { gradient: "from-[hsl(350,75%,55%)] to-[hsl(10,65%,40%)]", emoji: "🥊", label: "Fighter" },
  { gradient: "from-[hsl(180,60%,45%)] to-[hsl(180,50%,30%)]", emoji: "🌊", label: "Wave" },
  { gradient: "from-[hsl(60,70%,50%)] to-[hsl(45,65%,35%)]", emoji: "☀️", label: "Solar" },
  { gradient: "from-[hsl(240,60%,50%)] to-[hsl(240,50%,30%)]", emoji: "🌙", label: "Lunar" },
  { gradient: "from-[hsl(120,50%,45%)] to-[hsl(140,45%,30%)]", emoji: "🍀", label: "Lucky" },
  { gradient: "from-[hsl(310,65%,50%)] to-[hsl(330,55%,35%)]", emoji: "🎸", label: "Rockstar" },
  { gradient: "from-[hsl(25,85%,55%)] to-[hsl(15,75%,38%)]", emoji: "🐅", label: "Tiger" },
  { gradient: "from-[hsl(205,75%,50%)] to-[hsl(225,65%,35%)]", emoji: "🚀", label: "Rocket" },
];

export function getAvatarPreset(index: number): AvatarPreset {
  return AVATAR_PRESETS[Math.abs(index) % AVATAR_PRESETS.length];
}
