import { useState } from "react";
import ColorPicker from "./components/ColorPicker";
import Board from "./components/Board";

export default function App() {
  const [playerColor, setPlayerColor] = useState(null);
  const [playerName, setPlayerName] = useState("Player1");

  if (!playerColor) {
    return <ColorPicker onSelect={setPlayerColor} />;
  }

  return (
    <Board
      playerColor={playerColor}
      playerName={playerName}
      onNameChange={setPlayerName}
      onNewGame={() => setPlayerColor(null)}
    />
  );
}
