"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { RunnerAlert } from "@/app/api/runner/alerts/route";

const alertConfig = {
  error:   { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", icon: "🔴" },
  warning: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  icon: "🟡" },
  info:    { color: "#60a5fa", bg: "rgba(96,165,250,0.08)",   border: "rgba(96,165,250,0.2)",   icon: "🔵" },
};

const categoryIcon: Record<string, string> = {
  cert:    "🏥",
  payment: "💳",
};

export function RunnerAlertBell() {
  const [alerts, setAlerts]     = useState<RunnerAlert[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const [panelTop, setPanelTop]   = useState(0);
  const [panelLeft, setPanelLeft] = useState(0);
  const ref    = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/runner/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const errors   = alerts.filter(a => a.type === "error");
  const warnings = alerts.filter(a => a.type === "warning");
  const infos    = alerts.filter(a => a.type === "info");

  // Color del badge: rojo si hay errores, amarillo si hay warnings, azul si hay info
  const badgeColor = errors.length > 0 ? "#f87171" : warnings.length > 0 ? "#fbbf24" : "#60a5fa";

  if (loading) return null;
  if (alerts.length === 0) return null;

  return (
    <div ref={ref}>
      <style>{`
        @keyframes bell-ring {
          0%   { transform: rotate(0deg); }
          10%  { transform: rotate(-22deg); }
          20%  { transform: rotate(22deg); }
          30%  { transform: rotate(-18deg); }
          40%  { transform: rotate(18deg); }
          50%  { transform: rotate(-10deg); }
          60%  { transform: rotate(10deg); }
          70%  { transform: rotate(-5deg); }
          80%  { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-icon {
          display: inline-block;
          transform-origin: top center;
          animation: bell-ring 1.4s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: open ? "rgba(248,113,113,0.06)" : "transparent",
          border: `1px solid ${open ? "rgba(248,113,113,0.2)" : "#1e1e1e"}`,
          borderRadius: "0.5rem",
          padding: "0.55rem 0.75rem",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span className="bell-icon" style={{ fontSize: "1rem" }}>
            🔔
          </span>
          <span style={{ color: "#aaa", fontSize: "0.875rem", fontWeight: 500 }}>
            Alertas
          </span>
        </div>
        {/* Badge */}
        <span style={{
          background: badgeColor,
          color: "#000",
          borderRadius: "99px",
          fontSize: "0.65rem",
          fontWeight: 800,
          padding: "0.1rem 0.45rem",
          minWidth: "1.2rem",
          textAlign: "center",
        }}>
          {alerts.length}
        </span>
      </button>

      {/* Panel dropdown — fixed para no quedar detrás de stacking contexts */}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <span style={{ color: "white", fontWeight: 800, fontSize: "0.9rem" }}>
                🔔 Mis alertas
              </span>
              <span style={{ color: "#555", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                {alerts.length} activa{alerts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "0.9rem", padding: "0.1rem 0.3rem" }}
            >
              ✕
            </button>
          </div>

          {/* Lista de alertas */}
          <div style={{ maxHeight: "24rem", overflowY: "auto", padding: "0.75rem" }}>
            {/* Errores primero */}
            {[...errors, ...warnings, ...infos].map((alert) => {
              const cfg = alertConfig[alert.type];
              return (
                <Link
                  key={alert.id}
                  href={alert.href}
                  onClick={() => setOpen(false)}
                  style={{ textDecoration: "none", display: "block", marginBottom: "0.5rem" }}
                >
                  <div style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: "0.625rem",
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                      <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>
                        {categoryIcon[alert.category]}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                          <span style={{ color: cfg.color, fontWeight: 700, fontSize: "0.82rem" }}>
                            {alert.title}
                          </span>
                        </div>
                        <p style={{
                          color: "#777",
                          fontSize: "0.75rem",
                          margin: 0,
                          lineHeight: 1.5,
                        }}>
                          {alert.message}
                        </p>
                      </div>
                      <span style={{ color: "#333", fontSize: "0.7rem", flexShrink: 0, marginTop: "0.1rem" }}>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            justifyContent: "center",
          }}>
            <p style={{ color: "#444", fontSize: "0.7rem", margin: 0 }}>
              Las alertas se actualizan al recargar la página
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
