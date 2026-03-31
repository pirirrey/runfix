"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RunnerMessage } from "@/app/api/runner/messages/route";

function expiryLabel(daysLeft: number): { text: string; color: string } {
  if (daysLeft <= 0)  return { text: "Vence hoy",    color: "#fbbf24" };
  if (daysLeft === 1) return { text: "Vence mañana", color: "#fbbf24" };
  if (daysLeft <= 3)  return { text: `${daysLeft} días`, color: "#fb923c" };
  return                     { text: `${daysLeft} días`, color: "#555"   };
}

export function RunnerMessageBell() {
  const [messages, setMessages] = useState<RunnerMessage[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const [panelTop, setPanelTop] = useState(0);
  const [panelLeft, setPanelLeft] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/runner/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const maxPanelHeight = 440;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < maxPanelHeight
        ? Math.max(8, rect.bottom - maxPanelHeight)  // abre hacia arriba
        : rect.top;                                   // abre hacia abajo
      setPanelTop(top);
      setPanelLeft(rect.right + 12);
    }
    setOpen(o => !o);
  }

  if (loading || messages.length === 0) return null;

  return (
    <div ref={ref}>
      <style>{`
        @keyframes megaphone-shake {
          0%   { transform: rotate(0deg) scale(1); }
          15%  { transform: rotate(-12deg) scale(1.15); }
          30%  { transform: rotate(10deg) scale(1.1); }
          45%  { transform: rotate(-8deg) scale(1.05); }
          60%  { transform: rotate(6deg) scale(1.05); }
          75%  { transform: rotate(-3deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .megaphone-icon {
          display: inline-block;
          transform-origin: center center;
          animation: megaphone-shake 1.6s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
      {/* Botón campana */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: open ? "rgba(96,165,250,0.06)" : "transparent",
          border: `1px solid ${open ? "rgba(96,165,250,0.2)" : "#1e1e1e"}`,
          borderRadius: "0.5rem",
          padding: "0.55rem 0.75rem",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span className="megaphone-icon" style={{ fontSize: "1rem" }}>📣</span>
          <span style={{ color: "#aaa", fontSize: "0.875rem", fontWeight: 500 }}>
            Comunicados
          </span>
        </div>
        <span style={{
          background: "#60a5fa",
          color: "#000",
          borderRadius: "99px",
          fontSize: "0.65rem",
          fontWeight: 800,
          padding: "0.1rem 0.45rem",
          minWidth: "1.2rem",
          textAlign: "center",
        }}>
          {messages.length}
        </span>
      </button>

      {/* Panel desplegable — fixed para evitar quedar detrás de stacking contexts */}
      {open && (
        <div style={{
          position: "fixed",
          top: panelTop,
          left: panelLeft,
          width: "22rem",
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "0.875rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          zIndex: 9999,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <span style={{ color: "white", fontWeight: 800, fontSize: "0.9rem" }}>
                📣 Comunicados
              </span>
              <span style={{ color: "#555", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                {messages.length} activo{messages.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "0.9rem", padding: "0.1rem 0.3rem" }}
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ maxHeight: "26rem", overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {messages.map(msg => {
              const exp = expiryLabel(msg.days_left);
              const almostExpiring = msg.days_left <= 3;
              const isPersonal = msg.is_personal;
              return (
                <div key={msg.id} style={{
                  background: isPersonal
                    ? "rgba(163,230,53,0.04)"
                    : almostExpiring ? "rgba(251,191,36,0.04)" : "rgba(96,165,250,0.04)",
                  border: `1px solid ${isPersonal
                    ? "rgba(163,230,53,0.2)"
                    : almostExpiring ? "rgba(251,191,36,0.15)" : "rgba(96,165,250,0.12)"}`,
                  borderRadius: "0.625rem",
                  padding: "0.875rem 1rem",
                }}>
                  {/* Badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    {isPersonal ? (
                      <span style={{
                        background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)",
                        color: "#a3e635", borderRadius: "2rem",
                        fontSize: "0.65rem", fontWeight: 700,
                        padding: "0.05rem 0.5rem",
                      }}>
                        💌 Solo para vos · {msg.team_name}
                      </span>
                    ) : (
                      <span style={{
                        background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
                        color: "#60a5fa", borderRadius: "2rem",
                        fontSize: "0.65rem", fontWeight: 700,
                        padding: "0.05rem 0.5rem",
                      }}>
                        👥 {msg.team_name}
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "#333", fontSize: "0.65rem" }}>
                        📅 {new Date(msg.expires_at + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                      <span style={{ color: exp.color, fontSize: "0.65rem", fontWeight: 700 }}>
                        · {exp.text}
                      </span>
                    </div>
                  </div>
                  {/* Texto */}
                  <p style={{
                    color: "#ccc", fontSize: "0.82rem",
                    lineHeight: 1.6, margin: 0,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #1a1a1a" }}>
            <p style={{ color: "#444", fontSize: "0.7rem", margin: 0, textAlign: "center" }}>
              Los mensajes desaparecen al vencer su fecha
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
