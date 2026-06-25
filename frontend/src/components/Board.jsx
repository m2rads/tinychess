import { useEffect, useRef, useCallback, useState } from "react";
import { Chessboard, COLOR, INPUT_EVENT_TYPE } from "cm-chessboard";
import { Markers } from "cm-chessboard/src/extensions/markers/Markers.js";
import "cm-chessboard/assets/chessboard.css";
import "cm-chessboard/assets/extensions/markers/markers.css";

import { chess, applyUciMove, highlightCheckmatedKing, getCapturedPieces } from "../lib/game";
import { fetchEngineMove } from "../lib/api";
import { ASSETS_URL } from "../lib/constants";
import NavButton from "./NavButton";
import NameBar from "./NameBar";
import CapturedPieces from "./CapturedPieces";

export default function Board({ playerColor, playerName, onNameChange, onNewGame }) {
  const boardRef = useRef(null);
  const chessboardRef = useRef(null);
  // history of FEN positions; viewIndex points at the position shown on the board
  const historyRef = useRef([]);
  const viewIndexRef = useRef(0);
  const [nav, setNav] = useState({ index: 0, length: 1 });
  const [captured, setCaptured] = useState({ capturedByWhite: [], capturedByBlack: [], advantage: 0 });
  const orientation = playerColor === "white" ? COLOR.white : COLOR.black;

  const pushPosition = useCallback(() => {
    historyRef.current.push(chess.fen());
    viewIndexRef.current = historyRef.current.length - 1;
    setNav({ index: viewIndexRef.current, length: historyRef.current.length });
    setCaptured(getCapturedPieces(chess));
  }, []);

  const goTo = useCallback((index) => {
    if (index < 0 || index >= historyRef.current.length) return;
    viewIndexRef.current = index;
    setNav({ index, length: historyRef.current.length });
    chessboardRef.current?.removeMarkers();
    chessboardRef.current?.setPosition(historyRef.current[index], true);
  }, []);

  const initBoard = useCallback(() => {
    if (chessboardRef.current) chessboardRef.current.destroy();

    const board = new Chessboard(boardRef.current, {
      position: chess.fen(),
      orientation,
      assetsUrl: ASSETS_URL,
      extensions: [{ class: Markers }],
    });

    const isViewingLatest = () =>
      viewIndexRef.current === historyRef.current.length - 1;

    board.enableMoveInput((event) => {
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        if (!isViewingLatest()) return false;
        return (
          chess.moves({ square: event.squareFrom, verbose: true }).length > 0
        );
      }

      if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        if (!isViewingLatest()) return false;
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
        pushPosition();
        highlightCheckmatedKing(board);

        if (!chess.isGameOver()) {
          fetchEngineMove(chess.fen()).then((botMove) => {
            applyUciMove(botMove);
            board.setPosition(chess.fen(), true);
            pushPosition();
            highlightCheckmatedKing(board);
          });
        }

        return true;
      }
    }, orientation);

    chessboardRef.current = board;
  }, [orientation, pushPosition]);

  useEffect(() => {
    chess.reset();
    historyRef.current = [chess.fen()];
    viewIndexRef.current = 0;
    setNav({ index: 0, length: 1 });
    initBoard();

    // if playing as black, engine goes first
    if (playerColor === "black") {
      fetchEngineMove(chess.fen()).then((botMove) => {
        applyUciMove(botMove);
        chessboardRef.current?.setPosition(chess.fen(), true);
        pushPosition();
      });
    }

    return () => chessboardRef.current?.destroy();
  }, [initBoard, playerColor, pushPosition]);

  const atStart = nav.index === 0;
  const atLatest = nav.index === nav.length - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        background: "#1a1a1a",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <NameBar
          name="TinyChess"
          color={playerColor === "white" ? "black" : "white"}
        />
        <CapturedPieces
          pieces={playerColor === "white" ? captured.capturedByBlack : captured.capturedByWhite}
          pieceColor={playerColor === "white" ? "w" : "b"}
          advantage={playerColor === "white" ? Math.max(0, -captured.advantage) : Math.max(0, captured.advantage)}
        />
        <div ref={boardRef} style={{ width: "600px", height: "600px" }} />
        <CapturedPieces
          pieces={playerColor === "white" ? captured.capturedByWhite : captured.capturedByBlack}
          pieceColor={playerColor === "white" ? "b" : "w"}
          advantage={playerColor === "white" ? Math.max(0, captured.advantage) : Math.max(0, -captured.advantage)}
        />
        <NameBar
          name={playerName}
          color={playerColor}
          editable
          onChange={onNameChange}
        />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <NavButton onClick={() => goTo(0)} disabled={atStart}>
          ⏮
        </NavButton>
        <NavButton onClick={() => goTo(nav.index - 1)} disabled={atStart}>
          ◀
        </NavButton>
        <NavButton onClick={() => goTo(nav.index + 1)} disabled={atLatest}>
          ▶
        </NavButton>
        <NavButton onClick={() => goTo(nav.length - 1)} disabled={atLatest}>
          ⏭
        </NavButton>
        <button
          onClick={onNewGame}
          style={{
            marginLeft: "1rem",
            padding: "0.6rem 2rem",
            fontSize: "1rem",
            fontWeight: "600",
            background: "#fff",
            color: "#1a1a1a",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
