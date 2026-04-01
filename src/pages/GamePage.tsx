import { useParams, useNavigate } from "react-router-dom";
import GameScreen from "@/components/GameScreen";
import TapGameScreen from "@/components/TapGameScreen";
import PracticeScreen from "@/components/PracticeScreen";
import MultiplayerScreen from "@/components/MultiplayerScreen";
import TournamentScreen from "@/components/TournamentScreen";

export default function GamePage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const goHome = () => navigate("/play");

  if (mode === "tap") return <TapGameScreen onHome={goHome} />;
  if (mode === "practice") return <PracticeScreen onHome={goHome} />;
  if (mode === "multiplayer") return <MultiplayerScreen onHome={goHome} />;
  if (mode === "tournament") return <TournamentScreen onHome={goHome} />;

  return <GameScreen onHome={goHome} />;
}
