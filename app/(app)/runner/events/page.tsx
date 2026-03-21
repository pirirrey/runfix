"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

function DiscountCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.75rem", background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.625rem", padding: "0.5rem 1rem" }}>
      <span style={{ color: "#888", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>🏷 Código de descuento</span>
      <span style={{ color: "#a3e635", fontSize: "1rem", fontWeight: 900, letterSpacing: "0.15em", fontFamily: "monospace" }}>{code}</span>
      <button
        onClick={copy}
        style={{ background: copied ? "rgba(163,230,53,0.2)" : "#1a1a1a", border: `1px solid ${copied ? "#a3e635" : "#333"}`, borderRadius: "0.35rem", padding: "0.2rem 0.6rem", color: copied ? "#a3e635" : "#666", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
      >
        {copied ? "✓ Copiado" : "Copiar"}
      </button>
    </div>
  );
}

type Distance = { id: string; label: string; altimetry_path: string | null; altimetryUrl?: string | null };
type EventRow = {
  id: string; name: string; location: string | null;
  race_type: "street" | "trail"; start_date: string; end_date: string;
  discount_code: string | null; notes: string | null;
  coach: { full_name: string | null; email: string };
  race_event_distances: Distance[];
  race_event_files: { id: string; file_name: string; storage_path: string; signedUrl?: string | null }[];
};

export default function RunnerEventsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [events, setEvents] = useState<EventRow[]>([]);
  const [goals, setGoals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Eventos de los coaches del runner
    const { data: evData } = await supabase
      .from("race_events")
      .select(`
        id, name, location, race_type, start_date, end_date, discount_code, notes,
        coach:profiles!race_events_coach_id_fkey(full_name, email),
        race_event_distances(id, label, altimetry_path),
        race_event_files(id, file_name, storage_path)
      `)
      .order("start_date", { ascending: true });

    if (!evData) { setLoading(false); return; }

    // Generar signed URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withUrls = await Promise.all(evData.map(async (ev: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const distancesWithUrls = await Promise.all(ev.race_event_distances.map(async (d: any) => {
        if (!d.altimetry_path) return { ...d, altimetryUrl: null };
        const { data } = await supabase.storage.from("training-plans").createSignedUrl(d.altimetry_path, 3600);
        return { ...d, altimetryUrl: data?.signedUrl ?? null };
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filesWithUrls = await Promise.all(ev.race_event_files.map(async (f: any) => {
        const { data } = await supabase.storage.from("training-plans").createSignedUrl(f.storage_path, 3600);
        return { ...f, signedUrl: data?.signedUrl ?? null };
      }));
      return { ...ev, race_event_distances: distancesWithUrls, race_event_files: filesWithUrls };
    }));

    setEvents(withUrls as EventRow[]);

    // Objetivos actuales del runner
    const { data: goalsData } = await supabase
      .from("runner_event_goals")
      .select("distance_id")
      .eq("runner_id", user.id);
    setGoals(new Set((goalsData ?? []).map((g: { distance_id: string }) => g.distance_id)));

    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggleGoal = async (distanceId: string) => {
    setToggling(distanceId);
    const isGoal = goals.has(distanceId);
    const res = await fetch(`/api/runner/goals/${distanceId}`, {
      method: isGoal ? "DELETE" : "POST",
    });
    if (res.ok) {
      const next = new Set(goals);
      isGoal ? next.delete(distanceId) : next.add(distanceId);
      setGoals(next);
      toast.success(isGoal ? "Objetivo removido" : "🎯 ¡Marcado como objetivo!");
    } else {
      toast.error("Error al actualizar objetivo");
    }
    setToggling(null);
  };

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <div style={{ padding: "3rem", color: "#666", textAlign: "center" }}>Cargando eventos...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", margin: 0 }}>🏁 Eventos</h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Carreras publicadas por tus entrenadores. Marcá tus objetivos.
        </p>
      </div>

      {events.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏁</div>
          <p style={{ color: "#666" }}>No hay eventos cargados todavía.</p>
          <p style={{ color: "#444", fontSize: "0.82rem", marginTop: "0.3rem" }}>Tu entrenador los publicará acá cuando estén disponibles.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {events.map((ev) => {
            const sameDay = ev.start_date === ev.end_date;
            const dateLabel = sameDay ? formatDate(ev.start_date) : `${formatDate(ev.start_date)} → ${formatDate(ev.end_date)}`;
            const typeColor = ev.race_type === "trail" ? "#a3e635" : "#60a5fa";

            return (
              <div key={ev.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
                {/* Header del evento */}
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e1e1e" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                        <span style={{ color: typeColor, fontSize: "0.68rem", fontWeight: 700, background: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}44`, borderRadius: "2rem", padding: "0.15rem 0.6rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                          {ev.race_type === "trail" ? "🏔 Trail" : "🏙 Calle"}
                        </span>
                        <span style={{ color: "#555", fontSize: "0.75rem" }}>por {ev.coach?.full_name || ev.coach?.email}</span>
                      </div>
                      <h2 style={{ color: "white", fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.4rem 0" }}>{ev.name}</h2>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        <span style={{ color: "#888", fontSize: "0.8rem" }}>📅 {dateLabel}</span>
                        {ev.location && <span style={{ color: "#888", fontSize: "0.8rem" }}>📍 {ev.location}</span>}
                      </div>
                    </div>
                  </div>
                  {ev.notes && (
                    <p style={{ color: "#777", fontSize: "0.85rem", lineHeight: 1.6, marginTop: "0.75rem", marginBottom: 0 }}>{ev.notes}</p>
                  )}
                  {ev.discount_code
                    ? <DiscountCode code={ev.discount_code} />
                    : (
                      <div style={{ marginTop: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(163,230,53,0.04)", border: "1px solid rgba(163,230,53,0.15)", borderRadius: "0.625rem", padding: "0.5rem 1rem" }}>
                        <span style={{ fontSize: "0.75rem" }}>🏷</span>
                        <span style={{ color: "#6b8f2a", fontSize: "0.78rem", fontWeight: 600 }}>Sin código de descuento disponible</span>
                      </div>
                    )
                  }
                </div>

                {/* Distancias */}
                {ev.race_event_distances.length > 0 && (
                  <div style={{ padding: "1rem 1.5rem", borderBottom: ev.race_event_files.length > 0 ? "1px solid #1e1e1e" : "none" }}>
                    <p style={{ color: "#666", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem 0" }}>
                      Distancias
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {ev.race_event_distances.map((d) => {
                        const isGoal = goals.has(d.id);
                        return (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <button
                              onClick={() => toggleGoal(d.id)}
                              disabled={toggling === d.id}
                              style={{
                                padding: "0.35rem 0.9rem", borderRadius: "2rem", fontWeight: 700, fontSize: "0.85rem",
                                cursor: toggling === d.id ? "not-allowed" : "pointer",
                                border: isGoal ? "2px solid #a3e635" : "1px solid #333",
                                background: isGoal ? "rgba(163,230,53,0.15)" : "#1a1a1a",
                                color: isGoal ? "#a3e635" : "#999",
                                transition: "all 0.15s",
                                opacity: toggling === d.id ? 0.6 : 1,
                              }}
                            >
                              {isGoal ? "🎯 " : ""}{d.label}
                            </button>
                            {d.altimetryUrl && (
                              <a href={d.altimetryUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: "#555", fontSize: "0.75rem", textDecoration: "none" }} title="Ver altimetría">
                                📈
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ color: "#444", fontSize: "0.75rem", marginTop: "0.6rem" }}>
                      Tocá una distancia para marcarla como objetivo
                    </p>
                  </div>
                )}

                {/* Archivos */}
                {ev.race_event_files.length > 0 && (
                  <div style={{ padding: "0.875rem 1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {ev.race_event_files.map((f) => (
                      f.signedUrl ? (
                        <a key={f.id} href={f.signedUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.3rem 0.7rem", color: "#bbb", fontSize: "0.78rem", textDecoration: "none" }}>
                          📎 {f.file_name}
                        </a>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
