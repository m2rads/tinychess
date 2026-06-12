import { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from "cm-chessboard";
import "cm-chessboard/assets/chessboard.css";

const chess = new Chess();

async function fetchEngineMove(fen) {
  const res = await fetch("/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen }),
  });
  const data = await res.json();
  return data.move; // expects UCI string e.g. "e7e5"
}

export default function App() {
  const boardRef = useRef(null);
  const chessboardRef = useRef(null);

  useEffect(() => {
    const board = new Chessboard(boardRef.current, {
      position: chess.fen(),
      orientation: COLOR.white,
      assetsUrl: "/node_modules/cm-chessboard/assets/",
    });

    board.enableMoveInput((event) => {
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        return (
          chess.moves({ square: event.squareFrom, verbose: true }).length > 0
        );
      }

      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        try {
          chess.move({
            from: event.squareFrom,
            to: event.squareTo,
            promotion: "q",
          });
        } catch {
          return false;
        }

        board.setPosition(chess.fen(), true);

        if (!chess.isGameOver()) {
          fetchEngineMove(chess.fen()).then((botMove) => {
            chess.move({
              from: botMove.slice(0, 2),
              to: botMove.slice(2, 4),
              promotion: botMove[4] || "q",
            });
            board.setPosition(chess.fen(), true);
          });
        }

        return true;
      }
    }, COLOR.white);

    chessboardRef.current = board;
    return () => board.destroy();
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <div ref={boardRef} style={{ width: "480px", height: "480px" }} />
    </div>
  );
}
