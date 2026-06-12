import { useState } from "react";

export default function NameBar({ name, color, editable, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
  }

  return (
    <div
      style={{
        width: "600px",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "3px",
          background: color === "white" ? "#e8e8e8" : "#2a2a2a",
          border: "1px solid #555",
        }}
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={20}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: "#fff",
            background: "#2a2a2a",
            border: "1px solid #7fa650",
            borderRadius: "4px",
            padding: "0.15rem 0.4rem",
            outline: "none",
            width: "12rem",
          }}
        />
      ) : (
        <span
          onClick={
            editable
              ? () => {
                  setDraft(name);
                  setEditing(true);
                }
              : undefined
          }
          title={editable ? "Click to change your name" : undefined}
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: "#fff",
            cursor: editable ? "pointer" : "default",
          }}
        >
          {name}
          {editable && (
            <span
              style={{
                color: "#777",
                marginLeft: "0.4rem",
                fontSize: "0.85rem",
              }}
            >
              ✎
            </span>
          )}
        </span>
      )}
    </div>
  );
}
