"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Types ────────────────────────────────────────────────── */

export type RunnerMonthData = {
  key: string;    // "2026-03"
  label: string;  // "Marzo 2026"
  plan: {
    id: string;
    file_name: string;
    valid_from: string;
    valid_until: string | null;
    notes: string | null;
    signedUrl: string | null;
  } | null;
  routines: { id: string; training_date: string; routine: string; km_estimated?: number | null }[];
  status: "current" | "upcoming" | "past";
  vigente: boolean;
};

interface Props {
  months: RunnerMonthData[];
  coachNotes: string | null;
  teamId: string;
}

/* ── Helpers ──────────────────────────────────────────────── */

const todayStr = new Date().toISOString().slice(0, 10);

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtRange(from: string, until: string | null) {
  const f = new Date(from + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  if (!until) return `Desde ${f}`;
  const u = new Date(until + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  return `${f} → ${u}`;
}

/* ── Main component ───────────────────────────────────────── */

export function RunnerPlanCard({ months, coachNotes, teamId }: Props) {
  const [pdfOpenFor, setPdfOpenFor] = useState<string | null>(null); // monthKey
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expandir vigente + current + upcoming por defecto
    const s = new Set<string>();
    months.forEach(m => { if (m.vigente || m.status !== "past") s.add(m.key); });
    return s;
  });

  function toggleExpand(key: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  if (months.length === 0) {
    return (
      <div style={{ border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden", marginBottom: "0.75rem" }}>
        <div style={{ background: "#111", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>Tu entrenador aún no subió contenido para este equipo.</p>
        </div>
        {coachNotes && <NoteBlock color="blue" label="📝 Indicaciones personales" text={coachNotes} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
      {months.map((m) => {
        const isExp = expanded.has(m.key);
        const pdfOpen = pdfOpenFor === m.key;

        const border = m.vigente
          ? "1px solid rgba(163,230,53,0.35)"
          : m.status === "upcoming"
            ? "1px solid rgba(96,165,250,0.25)"
            : "1px solid #1e1e1e";

        const headerBg = m.vigente
          ? "rgba(163,230,53,0.06)"
          : m.status === "upcoming"
            ? "rgba(96,165,250,0.04)"
            : "#0d0d0d";

        const isFirst = months.indexOf(m) === 0;

        return (
          <div key={m.key} style={{ border, borderRadius: "0.875rem", overflow: "hidden" }}>

            {/* ── Header (siempre visible) ─────────────── */}
            <div
              onClick={() => toggleExpand(m.key)}
              style={{ background: headerBg, padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "0.75rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{m.label}</span>

                {m.vigente && (
                  <span style={{ background: "#a3e635", color: "#000", fontSize: "0.6rem", fontWeight: 800, padding: "0.1rem 0.5rem", borderRadius: "2rem", textTransform: "uppercase" as const }}>
                    Vigente
                  </span>
                )}
                {m.status === "upcoming" && (
                  <span style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: "2rem", textTransform: "uppercase" as const, border: "1px solid rgba(96,165,250,0.3)" }}>
                    Próximo
                  </span>
                )}

                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  {m.plan?.file_name && <span style={{ color: "#555", fontSize: "0.7rem" }}>📄</span>}
                  {m.routines.length > 0 && <span style={{ color: "#555", fontSize: "0.7rem" }}>🗓 {m.routines.length}</span>}
                  {(() => { const km = m.routines.reduce((a, r) => a + (r.km_estimated ?? 0), 0); return km > 0 ? <span style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700 }}>· 🏃 {km % 1 === 0 ? km : km.toFixed(1)} km</span> : null; })()}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#444", fontSize: "0.72rem" }}>{isExp ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* ── Cuerpo expandible ───────────────────── */}
            {isExp && (
              <div style={{ background: "#080808", borderTop: `1px solid ${m.vigente ? "rgba(163,230,53,0.12)" : "#161616"}` }}>

                {/* Plan PDF */}
                {m.plan && (
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #111" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "white", fontWeight: 700, fontSize: "0.875rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                          📄 Plan de entrenamiento — {m.label}
                        </p>
                        <p style={{ color: "#555", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
                          {fmtRange(m.plan.valid_from, m.plan.valid_until)}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                        {m.plan.signedUrl && (
                          <button
                            onClick={() => setPdfOpenFor(pdfOpen ? null : m.key)}
                            style={{ background: pdfOpen ? "rgba(163,230,53,0.15)" : "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "0.4rem", color: "#a3e635", fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", cursor: "pointer" }}
                          >
                            {pdfOpen ? "▲ Cerrar" : "▼ Ver PDF"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PDF inline */}
                    {pdfOpen && m.plan.signedUrl && (
                      <div style={{ marginTop: "0.875rem", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #1a1a1a" }}>
                        <iframe src={m.plan.signedUrl} style={{ width: "100%", height: "520px", border: "none", display: "block" }} title="Plan" />
                      </div>
                    )}
                  </div>
                )}

                {/* Indicaciones al grupo (del plan) — solo en vigente/current */}
                {m.plan?.notes && (
                  <NoteBlock color="green" label="👥 Indicaciones al grupo" text={m.plan.notes} />
                )}

                {/* Indicaciones personales — solo en el primero (vigente/current) */}
                {isFirst && coachNotes && (
                  <NoteBlock color="blue" label="📝 Indicaciones personales" text={coachNotes} />
                )}

                {/* Rutinas */}
                {m.routines.length > 0 && (
                  <div style={{ borderTop: "1px solid #111" }}>
                    <div style={{ padding: "0.75rem 1.25rem 0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ color: "#444", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.09em", margin: 0 }}>
                        🗓 Rutinas
                      </p>
                      {(m.routines.length > 0 || m.plan?.notes) && (
                        <Link
                          href={`/runner/plans/print?teamId=${teamId}&month=${m.key}`}
                          target="_blank"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a", borderRadius: "0.35rem", color: "#555", fontSize: "0.68rem", fontWeight: 600, padding: "0.2rem 0.55rem", textDecoration: "none", flexShrink: 0 }}
                          title="Descargar PDF del mes"
                        >
                          ⬇ Descargar PDF
                        </Link>
                      )}
                    </div>
                    {m.routines.map((r, i) => {
                      const isToday = r.training_date === todayStr;
                      return (
                        <div key={r.id} style={{ display: "flex", gap: "0.875rem", padding: "0.7rem 1.25rem", alignItems: "flex-start", borderTop: i > 0 ? "1px solid #0f0f0f" : "1px solid rgba(255,255,255,0.03)", background: isToday ? "rgba(163,230,53,0.02)" : "transparent" }}>
                          <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "2rem", whiteSpace: "nowrap" as const, background: isToday ? "rgba(163,230,53,0.12)" : "rgba(96,165,250,0.07)", border: `1px solid ${isToday ? "rgba(163,230,53,0.3)" : "rgba(96,165,250,0.18)"}`, color: isToday ? "#a3e635" : "#60a5fa" }}>
                            {isToday ? "Hoy" : fmtDate(r.training_date)}
                          </span>
                          <p style={{ flex: 1, color: "#bbb", fontSize: "0.83rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" as const }}>{r.routine}</p>
                          {r.km_estimated != null && r.km_estimated > 0 && (
                            <span style={{ flexShrink: 0, fontSize: "0.68rem", fontWeight: 700, color: "#a3e635", background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "2rem", padding: "0.1rem 0.45rem", whiteSpace: "nowrap" as const }}>
                              {r.km_estimated % 1 === 0 ? r.km_estimated : r.km_estimated.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sin contenido en este mes */}
                {!m.plan && m.routines.length === 0 && (
                  <p style={{ color: "#333", fontSize: "0.82rem", fontStyle: "italic", padding: "1.25rem", margin: 0 }}>
                    Sin contenido cargado para este mes.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Sub-componente de notas ──────────────────────────────── */
function NoteBlock({ color, label, text }: { color: "green" | "blue"; label: string; text: string }) {
  const green = color === "green";
  return (
    <div style={{ background: green ? "rgba(163,230,53,0.03)" : "rgba(96,165,250,0.04)", borderTop: `1px solid ${green ? "rgba(163,230,53,0.12)" : "rgba(96,165,250,0.15)"}`, padding: "0.875rem 1.25rem" }}>
      <p style={{ color: green ? "#6b9e2a" : "#60a5fa", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.09em", margin: "0 0 0.35rem 0" }}>{label}</p>
      <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" as const }}>{text}</p>
    </div>
  );
}
