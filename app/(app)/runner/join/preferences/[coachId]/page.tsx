"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Session = {
  id: string;
  location: string;
  days: number[];
  start_time: string;
  notes: string | null;
  sort_order?: number;
};

type Venue = {
  id: string;
  name: string;
  notes: string | null;
  sessions: Session[];
};

export default function RunnerVenuePreferencesPage() {
  const { coachId } = useParams<{ coachId: string }>();
  const [venues, setVenues]       = useState<Venue[]>([]);
  const [assigned, setAssigned]   = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [coachName, setCoachName] = useState<string>("");
  const [openVenues, setOpenVenues] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Cargar venues + asignaciones
    const res = await fetch(`/api/runner/venues/${coachId}`);
    if (res.ok) {
      const data = await res.json();
      setVenues(data.venues ?? []);
      setAssigned(new Set(data.assignedIds ?? []));
    }
    // Cargar nombre del coach desde la lista de coaches asociados
    const coachRes = await fetch("/api/runner/coaches");
    if (coachRes.ok) {
      const coachData = await coachRes.json();
      const match = (coachData.coaches ?? []).find((c: { id: string; coach: { id: string; team_name: string | null; full_name: string | null } }) => c.id === coachId || c.coach?.id === coachId);
      if (match) {
        setCoachName(match.coach?.team_name || match.coach?.full_name || "Running Team");
      }
    }
    setLoading(false);
  }, [coachId]);

  useEffect(() => { load(); }, [load]);

  async function toggleVenue(venueId: string) {
    if (saving) return;
    setSaving(venueId);
    const res = await fetch(`/api/runner/venues/${coachId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: venueId }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setAssigned(prev => {
        const next = new Set(prev);
        if (action === "added")   next.add(venueId);
        if (action === "removed") next.delete(venueId);
        return next;
      });
      toast.success(action === "added" ? "Sede seleccionada" : "Sede deseleccionada");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al actualizar");
    }
    setSaving(null);
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "36rem", margin: "0 auto" }}>

      {/* Back */}
      <Link href="/runner/join" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#555", fontSize: "0.8rem", textDecoration: "none", marginBottom: "1.75rem" }}>
        ← Mis Running Teams
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", margin: 0 }}>
          ⚙️ Preferencias
        </h1>
        {coachName && (
          <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.35rem" }}>
            {coachName}
          </p>
        )}
      </div>

      {/* ── ACORDEÓN: SEDES ── */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden" }}>

        {/* Header clickeable */}
        <button
          onClick={() => setOpenVenues(o => !o)}
          style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: "1.1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1rem" }}>📍</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: "0.925rem" }}>Mis sedes de entrenamiento</span>
            {!openVenues && assigned.size > 0 && (
              <span style={{ background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)", borderRadius: "2rem", padding: "0.1rem 0.55rem", color: "#a3e635", fontSize: "0.68rem", fontWeight: 700 }}>
                {assigned.size} seleccionada{assigned.size !== 1 ? "s" : ""}
              </span>
            )}
            {!openVenues && assigned.size === 0 && !loading && venues.length > 0 && (
              <span style={{ color: "#555", fontSize: "0.72rem" }}>Sin selección</span>
            )}
          </div>
          <span style={{ color: "#444", fontSize: "0.8rem", display: "inline-block", transform: openVenues ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>

        {/* Contenido */}
        {openVenues && (
          <div style={{ borderTop: "1px solid #1a1a1a", padding: "1.25rem 1.5rem" }}>
            <p style={{ color: "#444", fontSize: "0.78rem", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
              Seleccioná las sedes donde entrenás. Podés elegir más de una.
            </p>

            {loading ? (
              <div style={{ color: "#555", textAlign: "center", padding: "2rem 0" }}>Cargando...</div>
            ) : venues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <p style={{ color: "#555", fontSize: "0.875rem", margin: 0 }}>
                  Tu entrenador todavía no configuró sedes de entrenamiento.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {venues.map(venue => {
                  const isActive  = assigned.has(venue.id);
                  const isLoading = saving === venue.id;
                  return (
                    <div
                      key={venue.id}
                      onClick={() => !isLoading && toggleVenue(venue.id)}
                      style={{
                        background: isActive ? "rgba(163,230,53,0.06)" : "#0d0d0d",
                        border: `1px solid ${isActive ? "rgba(163,230,53,0.3)" : "#222"}`,
                        borderRadius: "0.75rem",
                        overflow: "hidden",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {/* Header de la sede */}
                      <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>📍</span>
                          <span style={{ color: isActive ? "#a3e635" : "white", fontWeight: 700, fontSize: "0.875rem" }}>
                            {venue.name}
                          </span>
                        </div>
                        <div style={{
                          width: "1.2rem", height: "1.2rem", borderRadius: "0.3rem", flexShrink: 0,
                          border: `2px solid ${isActive ? "#a3e635" : "#333"}`,
                          background: isActive ? "#a3e635" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {isActive && <span style={{ color: "#000", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                        </div>
                      </div>

                      {/* Sesiones */}
                      {venue.sessions && venue.sessions.length > 0 && (
                        <div style={{ borderTop: `1px solid ${isActive ? "rgba(163,230,53,0.15)" : "#1a1a1a"}`, padding: "0.5rem 1rem 0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                          {[...venue.sessions]
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            .map(s => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                                  {s.days.map(d => (
                                    <span key={d} style={{
                                      background: isActive ? "rgba(163,230,53,0.12)" : "#1a1a1a",
                                      border: `1px solid ${isActive ? "rgba(163,230,53,0.25)" : "#2a2a2a"}`,
                                      borderRadius: "0.25rem", padding: "0.05rem 0.35rem",
                                      color: isActive ? "#a3e635" : "#555",
                                      fontSize: "0.62rem", fontWeight: 700,
                                    }}>
                                      {DAYS[d]}
                                    </span>
                                  ))}
                                </div>
                                <span style={{ color: isActive ? "#ccc" : "#666", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                                  {s.start_time}
                                </span>
                                <span style={{ color: "#444", fontSize: "0.75rem", flex: 1 }}>
                                  {s.location}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
