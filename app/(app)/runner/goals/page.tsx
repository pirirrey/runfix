"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import Link from "next/link";

function DiscountCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: "0.625rem", display: "inline-flex", alignItems: "center", gap: "0.625rem", background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.5rem", padding: "0.4rem 0.75rem" }}>
      <span style={{ color: "#888", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>🏷 Descuento</span>
      <span style={{ color: "#a3e635", fontSize: "0.95rem", fontWeight: 900, letterSpacing: "0.15em", fontFamily: "monospace" }}>{code}</span>
      <button
        onClick={copy}
        style={{ background: copied ? "rgba(163,230,53,0.2)" : "#1a1a1a", border: `1px solid ${copied ? "#a3e635" : "#333"}`, borderRadius: "0.3rem", padding: "0.15rem 0.5rem", color: copied ? "#a3e635" : "#666", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
      >
        {copied ? "✓" : "Copiar"}
      </button>
    </div>
  );
}

type GoalRow = {
  id: string;
  distance_id: string;
  created_at: string;
  achievement_id: string | null;
  distance: {
    id: string;
    label: string;
    altimetry_path: string | null;
    altimetryUrl?: string | null;
    event: {
      id: string; name: string; location: string | null;
      race_type: "street" | "trail"; start_date: string; end_date: string;
      discount_code: string | null;
    };
  };
};

export default function RunnerGoalsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [convertingGoalId, setConvertingGoalId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState({ finish_time: "", position_general: "", total_general: "", position_category: "", total_category: "", category_name: "" });
  const [convertSaving, setConvertSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("runner_event_goals")
      .select(`
        id, distance_id, created_at, achievement_id,
        distance:race_event_distances!runner_event_goals_distance_id_fkey(
          id, label, altimetry_path,
          event:race_events!race_event_distances_event_id_fkey(
            id, name, location, race_type, start_date, end_date, discount_code
          )
        )
      `)
      .eq("runner_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Signed URLs para altimetrías
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withUrls = await Promise.all(data.map(async (g: any) => {
      if (!g.distance?.altimetry_path) return g;
      const { data: su } = await supabase.storage.from("training-plans").createSignedUrl(g.distance.altimetry_path, 3600);
      return { ...g, distance: { ...g.distance, altimetryUrl: su?.signedUrl ?? null } };
    }));

    setGoals(withUrls as GoalRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const convertToAchievement = async (g: GoalRow) => {
    if (!g.distance?.event) return;
    setConvertSaving(true);
    const res = await fetch("/api/runner/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_id: g.id,
        event_id: g.distance.event.id,
        race_name: g.distance.event.name,
        race_date: g.distance.event.start_date,
        distance_label: g.distance.label,
        finish_time:       convertForm.finish_time       || null,
        position_general:  convertForm.position_general  || null,
        total_general:     convertForm.total_general     || null,
        position_category: convertForm.position_category || null,
        total_category:    convertForm.total_category    || null,
        category_name:     convertForm.category_name     || null,
      }),
    });
    if (res.ok) {
      toast.success("¡Logro registrado! Lo encontrás en Mis Logros.");
      setConvertingGoalId(null);
      setConvertForm({ finish_time: "", position_general: "", total_general: "", position_category: "", total_category: "", category_name: "" });
      await load();
    } else toast.error("Error al registrar el logro");
    setConvertSaving(false);
  };

  const removeGoal = async (distanceId: string) => {
    setRemoving(distanceId);
    const res = await fetch(`/api/runner/goals/${distanceId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Objetivo removido"); await load(); }
    else toast.error("Error al remover");
    setRemoving(null);
  };

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <div style={{ padding: "3rem", color: "#666", textAlign: "center" }}>Cargando...</div>;

  return (
    <>
    <style>{`
      .goals-bg {
        background-image: linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.84)),
                          url('/images/fondo-objetivos.webp');
        background-size: cover;
        background-position: center top;
        background-attachment: scroll;
      }
      @media (max-width: 767px) {
        .goals-bg { background-position: 35% top !important; }
        .goal-card-footer { flex-wrap: wrap !important; }
        .goal-card-footer .goal-action-btn { flex: 1 !important; justify-content: center !important; }
      }
    `}</style>

    <div className="goals-bg" style={{ minHeight: "100vh" }}>
    <div className="page-wrap" style={{ padding: "2.5rem 2rem", maxWidth: "48rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#a3e635", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
          Mi perfil
        </p>
        <h1 className="page-title" style={{ fontSize: "2rem", fontWeight: 900, color: "white", letterSpacing: "-0.03em", margin: 0 }}>
          Mis Objetivos
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>
          Las distancias que marcaste como tus metas de carrera
        </p>
      </div>

      {goals.length === 0 ? (
        <div style={{ background: "rgba(15,15,15,0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid #222", borderRadius: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <p style={{ color: "#666" }}>Todavía no marcaste ningún objetivo.</p>
          <p style={{ color: "#444", fontSize: "0.82rem", marginTop: "0.3rem", marginBottom: "1.25rem" }}>
            Explorá los eventos y marcá las distancias que quieras correr.
          </p>
          <Link href="/runner/events" style={{
            background: "#a3e635", color: "#000", fontWeight: 700, fontSize: "0.875rem",
            borderRadius: "0.5rem", padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-block",
          }}>
            Ver eventos →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {goals.map((g) => {
            const ev = g.distance?.event;
            if (!ev) return null;
            const sameDay = ev.start_date === ev.end_date;
            const dateLabel = sameDay ? formatDate(ev.start_date) : `${formatDate(ev.start_date)} → ${formatDate(ev.end_date)}`;
            const isTrail = ev.race_type === "trail";
            const typeColor = isTrail ? "#a3e635" : "#60a5fa";
            const typeBg    = isTrail ? "rgba(163,230,53,0.1)" : "rgba(96,165,250,0.1)";
            const typeBorder= isTrail ? "rgba(163,230,53,0.25)" : "rgba(96,165,250,0.25)";
            const hasAchievement = !!g.achievement_id;

            return (
              <div key={g.id} style={{
                display: "flex", flexDirection: "column",
                background: "rgba(12,12,12,0.88)",
                backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                border: `1px solid ${hasAchievement ? "rgba(163,230,53,0.2)" : "#242424"}`,
                borderRadius: "1rem", overflow: "hidden",
              }}>

                {/* ── Cuerpo ── */}
                <div style={{ padding: "1.25rem 1.5rem" }}>

                  {/* Tipo + distancia */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <span style={{
                      color: typeColor, fontSize: "0.65rem", fontWeight: 800,
                      background: typeBg, border: `1px solid ${typeBorder}`,
                      borderRadius: "2rem", padding: "0.15rem 0.55rem",
                      textTransform: "uppercase" as const, letterSpacing: "0.07em",
                    }}>
                      {isTrail ? "🏔 Trail" : "🏙 Calle"}
                    </span>
                    <span style={{ color: "#a3e635", fontWeight: 900, fontSize: "1.3rem", letterSpacing: "-0.01em" }}>
                      {g.distance?.label}
                    </span>
                    {hasAchievement && (
                      <span style={{ fontSize: "0.8rem", marginLeft: "auto" }} title="Resultado registrado">🏆</span>
                    )}
                  </div>

                  {/* Nombre del evento */}
                  <p style={{ color: "white", fontWeight: 700, fontSize: "0.975rem", margin: "0 0 0.5rem 0", lineHeight: 1.35 }}>
                    {ev.name}
                  </p>

                  {/* Fecha + ubicación */}
                  <div style={{ display: "flex", gap: "0.5rem 1.25rem", flexWrap: "wrap", marginBottom: ev.discount_code || g.distance?.altimetryUrl ? "0.75rem" : 0 }}>
                    <span style={{ color: "#666", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <span>📅</span>{dateLabel}
                    </span>
                    {ev.location && (
                      <span style={{ color: "#666", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <span>📍</span>{ev.location}
                      </span>
                    )}
                  </div>

                  {/* Altimetría */}
                  {g.distance?.altimetryUrl && (
                    <a href={g.distance.altimetryUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#a3e635", fontSize: "0.75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.625rem" }}>
                      📈 Ver altimetría
                    </a>
                  )}

                  {/* Código de descuento */}
                  {ev.discount_code && <DiscountCode code={ev.discount_code} />}
                </div>

                {/* ── Footer: acciones ── */}
                <div className="goal-card-footer" style={{
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  padding: "0.75rem 1.5rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "rgba(0,0,0,0.25)",
                }}>
                  {hasAchievement ? (
                    <a href="/runner/achievements" className="goal-action-btn" style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem",
                      background: "#a3e635", border: "none",
                      borderRadius: "0.625rem", color: "#000",
                      padding: "0.65rem 1.25rem", fontSize: "0.875rem", fontWeight: 700,
                      textDecoration: "none", whiteSpace: "nowrap" as const,
                    }}>
                      🏆 Ver logro
                    </a>
                  ) : convertingGoalId === g.id ? (
                    <button
                      className="goal-action-btn"
                      onClick={() => setConvertingGoalId(null)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        background: "transparent", border: "1px solid #2a2a2a",
                        borderRadius: "0.625rem", color: "#555",
                        padding: "0.65rem 1.25rem", fontSize: "0.875rem", fontWeight: 700,
                        cursor: "pointer", whiteSpace: "nowrap" as const,
                      }}
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      className="goal-action-btn"
                      onClick={() => { setConvertingGoalId(g.id); setConvertForm({ finish_time: "", position_general: "", total_general: "", position_category: "", total_category: "", category_name: "" }); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        background: "#a3e635", border: "none",
                        borderRadius: "0.625rem", color: "#000",
                        padding: "0.65rem 1.25rem", fontSize: "0.875rem", fontWeight: 700,
                        cursor: "pointer", whiteSpace: "nowrap" as const,
                      }}
                    >
                      🏆 Registrar resultado
                    </button>
                  )}

                  <button
                    onClick={() => removeGoal(g.distance_id)}
                    disabled={removing === g.distance_id}
                    style={{
                      marginLeft: "auto",
                      background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "0.5rem", color: "#555",
                      padding: "0.5rem 0.875rem", fontSize: "0.75rem", fontWeight: 600,
                      cursor: removing === g.distance_id ? "not-allowed" : "pointer",
                      opacity: removing === g.distance_id ? 0.4 : 1,
                    }}
                  >
                    {removing === g.distance_id ? "…" : "Quitar"}
                  </button>
                </div>

                {/* ── Formulario: registrar resultado ── */}
                {convertingGoalId === g.id && (
                  <div style={{ borderTop: "1px solid #1a1a1a", padding: "1.125rem 1.5rem", background: "rgba(0,0,0,0.4)" }}>
                    <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
                      Resultado — {g.distance?.label} · {ev.name}
                    </p>
                    <div className="grid-3-to-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem", marginBottom: "0.875rem" }}>
                      {[
                        { key: "finish_time",       label: "Tiempo",          placeholder: "3:45:22" },
                        { key: "position_general",  label: "Pos. general",    placeholder: "42" },
                        { key: "total_general",     label: "Total general",   placeholder: "850" },
                        { key: "category_name",     label: "Categoría",       placeholder: "M35-39" },
                        { key: "position_category", label: "Pos. categoría",  placeholder: "3" },
                        { key: "total_category",    label: "Total categoría", placeholder: "45" },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{label}</label>
                          <input
                            value={convertForm[key as keyof typeof convertForm]}
                            onChange={e => setConvertForm(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", color: "white", fontSize: "0.82rem", outline: "none", boxSizing: "border-box" as const }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button onClick={() => setConvertingGoalId(null)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                        Cancelar
                      </button>
                      <button onClick={() => convertToAchievement(g)} disabled={convertSaving}
                        style={{ background: convertSaving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: convertSaving ? "#444" : "#000", padding: "0.4rem 1.1rem", fontSize: "0.78rem", fontWeight: 700, cursor: convertSaving ? "not-allowed" : "pointer" }}>
                        {convertSaving ? "Guardando..." : "Confirmar logro"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </div>
    </>
  );
}
