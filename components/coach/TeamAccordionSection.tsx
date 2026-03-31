"use client";

import { useState } from "react";

interface Props {
  icon: string;
  title: string;
  badge?: number;
  children: React.ReactNode;
}

export function TeamAccordionSection({ icon, title, badge, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: "#111",
      border: "1px solid #1e1e1e",
      borderRadius: "1rem",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.75rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? "1px solid #1e1e1e" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{icon}</span>
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{title}</span>
          {badge !== undefined && (
            <span style={{
              background: "#1e1e1e",
              color: "#888",
              fontSize: "0.7rem",
              fontWeight: 700,
              borderRadius: "2rem",
              padding: "0.1rem 0.55rem",
            }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{
          color: "#555",
          fontSize: "0.75rem",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
          display: "inline-block",
        }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: "1.5rem 1.75rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}
