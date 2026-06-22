export interface Character {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  emissiveColor: string;
  trailColor: string;
  ability: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "speeder",
    name: "Speeder",
    description: "Lightning-fast with unmatched agility",
    primaryColor: "#00d4ff",
    secondaryColor: "#0055ff",
    emissiveColor: "#00aaff",
    trailColor: "#00d4ff",
    ability: "Speed Burst",
  },
  {
    id: "titan",
    name: "Titan",
    description: "Unstoppable force of raw power",
    primaryColor: "#ff4500",
    secondaryColor: "#ff0000",
    emissiveColor: "#ff2200",
    trailColor: "#ff4500",
    ability: "Shield Bash",
  },
  {
    id: "phantom",
    name: "Phantom",
    description: "Ethereal runner from another dimension",
    primaryColor: "#cc00ff",
    secondaryColor: "#7700cc",
    emissiveColor: "#aa00ff",
    trailColor: "#cc00ff",
    ability: "Phase Shift",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Born from a supernova, leaves fire in her wake",
    primaryColor: "#ffcc00",
    secondaryColor: "#ff8800",
    emissiveColor: "#ffaa00",
    trailColor: "#ffcc00",
    ability: "Solar Flare",
  },
];

export interface GameState {
  phase: "home" | "character" | "name" | "qr" | "countdown" | "playing" | "gameover";
  characterId: string;
  playerName: string;
  sessionId: string;
  score: number;
  highScore: number;
  phoneConnected: boolean;
}

export type PhoneAction = "left" | "right" | "jump" | "slide";
