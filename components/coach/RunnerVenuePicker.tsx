"use client";

import { useState } from "react";
import { toast } from "sonner";

type VenueOption = { id: string; name: string };

interface Props {
  runnerId: string;
  venues: VenueOption[];
  currentVenueIds: string[];
}

export function RunnerVenuePicker({ runnerId, venues, currentVenueIds }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentVenueIds));
  const [saving, setSaving] = useState<string | null>(null); // venue_id en proceso

  async function toggle(venueId: string) {
    if (saving) return;
    setSaving(venueId);
    const res = await fetch(`/api/coach/runners/${runnerId}/venue`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venue_id: venueId }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setSelected(prev => {
        const next = new Set(prev);
        if (action === "added")   next.add(venueId);
        if (action === "removed") next.delete(venueId);
        return next;
      });
      toast.success(action === "added" ? "Sede agregada" : "Sede removida");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al actualizar sede");
    }
    setSaving(null);
  }

  if (venues.length === 0) {
    return (
      <p style={{ color: "#444", fontSize: "0.8rem", fontStyle: "italic", margin: 0 }}>
        No hay sedes configuradas en tu perfil de team.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {venues.map(venue => {
          const active  = selected.has(venue.id);
          const loading = saving === venue.id;
          return (
            <button
              key={venue.id}
              onClick={() => toggle(venue.id)}
              disabled={!!saving}
              style={{
                background: active ? "rgba(163,230,53,0.12)" : "#1a1a1a",
                border: `1px solid ${active ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
                borderRadius: "0.5rem",
                color: loading ? "#555" : active ? "#a3e635" : "#666",
                padding: "0.4rem 0.875rem",
                fontSize: "0.8rem", fontWeight: active ? 700 : 500,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "0.35rem",
                transition: "all 0.15s",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "…" : active ? <span style={{ fontSize: "0.75rem" }}>✓</span> : null}
              📍 {venue.name}
            </button>
          );
        })}
      </div>
      {selected.size === 0 && (
        <p style={{ color: "#444", fontSize: "0.72rem", margin: 0, fontStyle: "italic" }}>
          Sin sede asignada — seleccioná una o más sedes para este runner.
        </p>
      )}
    </div>
  );
}
