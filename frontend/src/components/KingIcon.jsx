import { SPRITE } from "../lib/constants";

export default function KingIcon({ piece, selected, onClick }) {
  const isWhite = piece === "wk";
  const isRandom = piece === "random";
  return (
    <button
      onClick={onClick}
      style={{
        width: "100px",
        height: "100px",
        background: isRandom
          ? "linear-gradient(to bottom right, #c8c8c8 50%, #1a1a1a 50%)"
          : selected
            ? isWhite
              ? "#e8e8e8"
              : "#2a2a2a"
            : isWhite
              ? "#c8c8c8"
              : "#1a1a1a",
        border: selected ? "3px solid #7fa650" : "3px solid #444",
        borderRadius: "10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: "border-color 0.15s",
      }}
    >
      {isRandom ? (
        <span
          style={{
            fontSize: "2.5rem",
            color: "#777",
            lineHeight: 1,
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          ?
        </span>
      ) : (
        <svg
          viewBox="0 0 40 40"
          width="72"
          height="72"
          style={{ display: "block" }}
        >
          <use href={`${SPRITE}#${piece}`} />
        </svg>
      )}
    </button>
  );
}
