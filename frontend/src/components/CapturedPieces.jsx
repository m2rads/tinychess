import { SPRITE } from "../lib/constants";

export default function CapturedPieces({ pieces, pieceColor, advantage }) {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "1px", minHeight: "22px", flexWrap: "wrap" }}>
      {pieces.map((type, i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 45 45" style={{ flexShrink: 0 }}>
          <use href={`${SPRITE}#${pieceColor}${type}`} />
        </svg>
      ))}
      {advantage > 0 && (
        <span style={{ color: "#bbb", fontSize: "0.8rem", marginLeft: "4px", fontWeight: "600" }}>
          +{advantage}
        </span>
      )}
    </div>
  );
}
