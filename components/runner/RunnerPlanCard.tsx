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

function cleanFileName(name: string) {
  return name.replace(/\.[^.]+$/, ""); // quita extensión
}

/* ── Main component ───────────────────────────────────────── */

export function RunnerPlanCard({ months, coachNotes, teamId }: Props) {
  const [pdfOpenFor, setPdfOpenFor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    months.forEach(m => { if (m.vigente || m.status !== "past") s.add(m.key); });
    return s;
  });

  function toggleExpand(key: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  if (months.length === 0) {
    return (
      <div style={{ border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden", marginBottom: "0.75rem" }}>
        <div style={{ background: "#111", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>Tu entrenador aún no subió contenido para este equipo.</p>
        </div>
        {coachNotes && <NoteBlock color="blue" label="📝 Indicaciones personales" text={coachNotes} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "0.75rem" }}>
      {months.map((m) => {
        const isExp = expanded.has(m.key);
        const pdfOpen = pdfOpenFor === m.key;
        const isFirst = months.indexOf(m) === 0;
        const totalKm = m.routines.reduce((a, r) => a + (r.km_estimated ?? 0), 0);

        /* ── Paleta por estado ── */
        const palette = m.vigente
          ? { border: "rgba(163,230,53,0.3)", headerBg: "rgba(163,230,53,0.05)", divider: "rgba(163,230,53,0.1)", accent: "#a3e635", accentDim: "rgba(163,230,53,0.12)" }
          : m.status === "upcoming"
            ? { border: "rgba(96,165,250,0.22)", headerBg: "rgba(96,165,250,0.04)", divider: "rgba(96,165,250,0.1)", accent: "#60a5fa", accentDim: "rgba(96,165,250,0.1)" }
            : { border: "#1e1e1e", headerBg: "#0d0d0d", divider: "#161616", accent: "#555", accentDim: "#1a1a1a" };

        return (
          <div key={m.key} style={{ border: `1px solid ${palette.border}`, borderRadius: "1rem", overflow: "hidden" }}>

            {/* ── Header ───────────────────────────────── */}
            <div
              onClick={() => toggleExpand(m.key)}
              style={{
                background: palette.headerBg,
                padding: "1rem 1.25rem",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", gap: "0.75rem",
              }}
            >
              {/* Izquierda: título + badges + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Fila 1: mes + estado */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em" }}>
                    {m.label}
                  </span>
                  {m.vigente && (
                    <span style={{
                      background: "#a3e635", color: "#000",
                      fontSize: "0.58rem", fontWeight: 900,
                      padding: "0.15rem 0.55rem", borderRadius: "2rem",
                      textTransform: "uppercase" as const, letterSpacing: "0.07em",
                    }}>
                      Vigente
                    </span>
                  )}
                  {m.status === "upcoming" && (
                    <span style={{
                      background: "rgba(96,165,250,0.12)", color: "#60a5fa",
                      fontSize: "0.58rem", fontWeight: 700,
                      padding: "0.15rem 0.55rem", borderRadius: "2rem",
                      textTransform: "uppercase" as const, letterSpacing: "0.07em",
                      border: "1px solid rgba(96,165,250,0.25)",
                    }}>
                      Próximo
                    </span>
                  )}
                </div>

                {/* Fila 2: meta chips */}
                {(m.plan || m.routines.length > 0) && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                    {m.plan && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#666", fontSize: "0.7rem" }}>
                        <span>📄</span>
                        <span>Plan PDF</span>
                      </span>
                    )}
                    {m.routines.length > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#555", fontSize: "0.7rem" }}>
                        <span>·</span>
                        <span>🗓 {m.routines.length} rutina{m.routines.length !== 1 ? "s" : ""}</span>
                      </span>
                    )}
                    {totalKm > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#a3e635", fontSize: "0.7rem", fontWeight: 700 }}>
                        <span>·</span>
                        <span>🏃 {totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)} km</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Derecha: flecha */}
              <div style={{
                width: "1.75rem", height: "1.75rem",
                borderRadius: "50%",
                background: isExp ? palette.accentDim : "rgba(255,255,255,0.04)",
                border: `1px solid ${isExp ? palette.border : "transparent"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.2s",
              }}>
                <span style={{ color: isExp ? palette.accent : "#444", fontSize: "0.6rem", display: "block", transform: isExp ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </div>
            </div>

            {/* ── Cuerpo expandible ───────────────────── */}
            {isExp && (
              <div style={{ background: "#080808", borderTop: `1px solid ${palette.divider}` }}>

                {/* ── Plan PDF ── */}
                {m.plan && (
                  <div style={{ padding: "1.125rem 1.25rem", borderBottom: `1px solid #111` }}>
                    {/* Nombre del archivo */}
                    <p style={{
                      color: "#e0e0e0", fontWeight: 700, fontSize: "0.875rem",
                      margin: "0 0 0.3rem 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                    }}>
                      📄 {cleanFileName(m.plan.file_name)}
                    </p>
                    {/* Rango de fechas */}
                    <p style={{ color: "#555", fontSize: "0.72rem", margin: "0 0 0.875rem 0" }}>
                      {fmtRange(m.plan.valid_from, m.plan.valid_until)}
                    </p>
                    {/* Botones */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {m.plan.signedUrl && (
                        <button
                          onClick={() => setPdfOpenFor(pdfOpen ? null : m.key)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.4rem",
                            background: pdfOpen ? "rgba(163,230,53,0.12)" : "#a3e635",
                            color: pdfOpen ? "#a3e635" : "#000",
                            border: pdfOpen ? "1px solid rgba(163,230,53,0.35)" : "none",
                            borderRadius: "0.5rem",
                            padding: "0.5rem 1rem",
                            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "0.7rem" }}>{pdfOpen ? "▲" : "▼"}</span>
                          {pdfOpen ? "Cerrar PDF" : "Ver PDF"}
                        </button>
                      )}
                      <Link
                        href={`/runner/plans/print?teamId=${teamId}&month=${m.key}`}
                        target="_blank"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.4rem",
                          background: "transparent",
                          border: "1px solid #2a2a2a",
                          borderRadius: "0.5rem",
                          color: "#555", padding: "0.5rem 1rem",
                          fontSize: "0.78rem", fontWeight: 600,
                          textDecoration: "none", transition: "all 0.15s",
                        }}
                        title="Descargar PDF del mes"
                      >
                        <span style={{ fontSize: "0.75rem" }}>⬇</span> Descargar
                      </Link>
                    </div>

                    {/* PDF inline */}
                    {pdfOpen && m.plan.signedUrl && (
                      <div style={{ marginTop: "1rem", borderRadius: "0.625rem", overflow: "hidden", border: "1px solid #1a1a1a" }}>
                        <iframe
                          src={m.plan.signedUrl}
                          style={{ width: "100%", height: "520px", border: "none", display: "block" }}
                          title="Plan de entrenamiento"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Notas del plan (al grupo) ── */}
                {m.plan?.notes && (
                  <NoteBlock color="green" label="👥 Indicaciones al grupo" text={m.plan.notes} />
                )}

                {/* ── Indicaciones personales (solo primer mes) ── */}
                {isFirst && coachNotes && (
                  <NoteBlock color="blue" label="📝 Indicaciones personales" text={coachNotes} />
                )}

                {/* ── Rutinas ── */}
                {m.routines.length > 0 && (
                  <div style={{ borderTop: "1px solid #111" }}>
                    {/* Header rutinas */}
                    <div style={{
                      padding: "0.75rem 1.25rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#0a0a0a",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem" }}>🗓</span>
                        <span style={{ color: "#3a3a3a", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                          Rutinas
                        </span>
                        {totalKm > 0 && (
                          <span style={{
                            background: "rgba(163,230,53,0.07)", color: "#6b9e2a",
                            border: "1px solid rgba(163,230,53,0.15)",
                            borderRadius: "2rem", padding: "0.05rem 0.45rem",
                            fontSize: "0.62rem", fontWeight: 700,
                          }}>
                            {totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)} km totales
                          </span>
                        )}
                      </div>
                      {!m.plan && ( // Descargar solo aquí si no hay plan arriba
                        <Link
                          href={`/runner/plans/print?teamId=${teamId}&month=${m.key}`}
                          target="_blank"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            background: "transparent", border: "1px solid #2a2a2a",
                            borderRadius: "0.4rem", color: "#555",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.68rem", fontWeight: 600,
                            textDecoration: "none",
                          }}
                          title="Descargar PDF del mes"
                        >
                          ⬇ Descargar
                        </Link>
                      )}
                    </div>

                    {/* Filas de rutinas */}
                    {m.routines.map((r, i) => {
                      const isToday = r.training_date === todayStr;
                      return (
                        <div
                          key={r.id}
                          style={{
                            display: "flex", gap: "0.875rem",
                            padding: "0.8rem 1.25rem",
                            alignItems: "flex-start",
                            borderTop: "1px solid #0f0f0f",
                            background: isToday ? "rgba(163,230,53,0.025)" : "transparent",
                          }}
                        >
                          {/* Fecha pill */}
                          <span style={{
                            flexShrink: 0, fontSize: "0.68rem", fontWeight: 700,
                            padding: "0.2rem 0.6rem", borderRadius: "2rem",
                            whiteSpace: "nowrap" as const,
                            background: isToday ? "rgba(163,230,53,0.12)" : "rgba(96,165,250,0.07)",
                            border: `1px solid ${isToday ? "rgba(163,230,53,0.3)" : "rgba(96,165,250,0.18)"}`,
                            color: isToday ? "#a3e635" : "#60a5fa",
                          }}>
                            {isToday ? "🏃 Hoy" : fmtDate(r.training_date)}
                          </span>

                          {/* Texto rutina */}
                          <p style={{
                            flex: 1, color: "#c0c0c0", fontSize: "0.84rem",
                            lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" as const,
                          }}>
                            {r.routine}
                          </p>

                          {/* Km badge */}
                          {r.km_estimated != null && r.km_estimated > 0 && (
                            <span style={{
                              flexShrink: 0, fontSize: "0.68rem", fontWeight: 700,
                              color: "#a3e635",
                              background: "rgba(163,230,53,0.08)",
                              border: "1px solid rgba(163,230,53,0.2)",
                              borderRadius: "2rem", padding: "0.15rem 0.5rem",
                              whiteSpace: "nowrap" as const,
                            }}>
                              {r.km_estimated % 1 === 0 ? r.km_estimated : r.km_estimated.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sin contenido */}
                {!m.plan && m.routines.length === 0 && (
                  <p style={{ color: "#333", fontSize: "0.82rem", fontStyle: "italic", padding: "1.5rem 1.25rem", margin: 0 }}>
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
    <div style={{
      background: green ? "rgba(163,230,53,0.03)" : "rgba(96,165,250,0.04)",
      borderTop: `1px solid ${green ? "rgba(163,230,53,0.12)" : "rgba(96,165,250,0.15)"}`,
      padding: "1rem 1.25rem",
    }}>
      <p style={{
        color: green ? "#6b9e2a" : "#4d87d4",
        fontSize: "0.65rem", fontWeight: 700,
        textTransform: "uppercase" as const, letterSpacing: "0.09em",
        margin: "0 0 0.4rem 0",
      }}>
        {label}
      </p>
      <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" as const }}>
        {text}
      </p>
    </div>
  );
}
