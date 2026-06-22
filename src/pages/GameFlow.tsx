import { useGame } from "@/lib/gameContext";
import { Home } from "./Home";
import { CharacterSelect } from "./CharacterSelect";
import { NameEntry } from "./NameEntry";
import { QRConnect } from "./QRConnect";
import { Countdown } from "./Countdown";
import { Game } from "./Game";
import { GameOver } from "./GameOver";

export function GameFlow() {
  const { state } = useGame();

  switch (state.phase) {
    case "home":      return <Home />;
    case "character": return <CharacterSelect />;
    case "name":      return <NameEntry />;
    case "qr":        return <QRConnect />;
    case "countdown": return <Countdown />;
    case "playing":   return <Game />;
    case "gameover":  return <GameOver />;
    default:          return <Home />;
  }
}
