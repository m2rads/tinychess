import { Chess } from "chess.js";
import { MARKER_TYPE } from "cm-chessboard/src/extensions/markers/Markers.js";

// single shared game instance
export const chess = new Chess();

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const STARTING_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 };

export function getCapturedPieces(chessInstance) {
  const current = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  for (const piece of chessInstance.board().flat().filter(Boolean)) {
    if (piece.type !== "k") current[piece.color][piece.type]++;
  }
  const capturedByWhite = [];
  const capturedByBlack = [];
  for (const type of ["q", "r", "b", "n", "p"]) {
    for (let i = 0; i < STARTING_COUNTS[type] - current.b[type]; i++) capturedByWhite.push(type);
    for (let i = 0; i < STARTING_COUNTS[type] - current.w[type]; i++) capturedByBlack.push(type);
  }
  const whiteScore = capturedByWhite.reduce((s, t) => s + PIECE_VALUES[t], 0);
  const blackScore = capturedByBlack.reduce((s, t) => s + PIECE_VALUES[t], 0);
  return { capturedByWhite, capturedByBlack, advantage: whiteScore - blackScore };
}

// applies a UCI move string (e.g. "e7e5", "a7a8q") to the game
export function applyUciMove(uci) {
  chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4] || "q",
  });
}

export function highlightCheckmatedKing(board) {
  if (!chess.isCheckmate()) return;
  const kingColor = chess.turn();
  const kingSquare = chess
    .board()
    .flat()
    .find((p) => p && p.type === "k" && p.color === kingColor).square;
  board.addMarker(MARKER_TYPE.frameDanger, kingSquare);
}
