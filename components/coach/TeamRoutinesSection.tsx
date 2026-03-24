"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

type Routine = {
  id: string;
  training_date: string;  // "YYYY-MM-DD"
  routine: string;
  created_at: string;
};

interface Props {
  teamId: string;
  initialRoutines: Routine[];
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function parseDate(s: string) {
  const d = new Date(s + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}

function labelDate(s: string): string {
  const d = parseDate(s);
  const diff = Math.round((d.getTime() - TODAY.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function dateColor(s: string): { text: string; bg: string; border: string } {
  const d = parseDate(s);
  const diff = Math.round((d.getTime() - TODAY.getTime()) / 86400000);
  if (diff === 0) return { text: "#a3e635", bg: "rgba(163,230,53,0.1)", border: "rgba(163,230,53,0.3)" };
  if (diff > 0)  return { text: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" };
  return          { text: "#555",     bg: "rgba(255,255,255,0.03)",  border: "#222" };
}

export function TeamRoutinesSection({ teamId, initialRoutines }: Props) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [showPast, setShowPast] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formRoutine, setFormRoutine] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const upcoming = routines.filter((r) => parseDate(r.training_date) >= TODAY)
    .sort((a, b) => a.training_date.localeCompare(b.training_date));
  const past = routines.filter((r) => parseDate(r.training_date) < TODAY)
    .sort((a, b) => b.training_date.localeCompare(a.training_date));

  function openEdit(r: Routine) {
    setEditingId(r.id);
    setFormDate(r.training_date);
    setFormRoutine(r.routine);
    setShowForm(false);
  }

  function openNew() {
    setEditingId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormRoutine("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormRoutine("");
  }

  const reload = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/routines`);
    if (res.ok) setRoutines(await res.json());
  }, [teamId]);

  async function save() {
    if (!formDate || !formRoutine.trim()) {
      toast.error("Completá la fecha y la rutina");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit
        ? `/api/teams/${teamId}/routines/${editingId}`
        : `/api/teams/${teamId}/routines`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ training_date: formDate, routine: formRoutine.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      toast.success(isEdit ? "Rutina actualizada" : "Rutina cargada");
      cancelForm();
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar la rutina");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/teams/${teamId}/routines/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Rutina eliminada");
      await reload();
    } else {
      toast.error("Error al eliminar");
    }
    setDeleting(null);
    if (editingId === id) cancelForm();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "0.45rem", padding: "0.55rem 0.75rem", color: "white",
    fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#666", fontSize: "0.68rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem",
  };

  function RoutineRow({ r }: { r: Routine }) {
    const col = dateColor(r.training_date);
    const isEditing = editingId === r.id;

    return (
      <div style={{ borderBottom: "1px solid #161616" }}>
        {/* Fila principal */}
        <div style={{ display: "flex", gap: "1rem", padding: "0.875rem 1.5rem", alignItems: "flex-start" }}>
          {/* Badge fecha */}
          <div style={{ flexShrink: 0, width: "5.5rem", textAlign: "center" }}>
            <span style={{
              display: "inline-block", background: col.bg, border: `1px solid ${col.border}`,
              color: col.text, fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem",
              borderRadius: "2rem", whiteSpace: "nowrap",
            }}>
              {labelDate(r.training_date)}
            </span>
          </div>

          {/* Texto */}
          <p style={{ flex: 1, color: "#ccc", fontSize: "0.875rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
            {r.routine}
          </p>

          {/* Acciones */}
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <button onClick={() => isEditing ? cancelForm() : openEdit(r)}
              style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.35rem", color: "#666", padding: "0.25rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}>
              {isEditing ? "✕" : "✏"}
            </button>
            <button onClick={() => remove(r.id)} disabled={deleting === r.id}
              style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.35rem", color: "#666", padding: "0.25rem 0.6rem", fontSize: "0.75rem", cursor: "pointer" }}>
              {deleting === r.id ? "..." : "🗑"}
            </button>
          </div>
        </div>

        {/* Formulario de edición inline */}
        {isEditing && (
          <div style={{ padding: "0.875rem 1.5rem 1.25rem", background: "#0d0d0d", borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "10rem 1fr", gap: "0.75rem", alignItems: "start" }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={labelStyle}>Rutina</label>
                <textarea value={formRoutine} onChange={(e) => setFormRoutine(e.target.value)}
                  rows={3} placeholder="Describí la rutina de entrenamiento..."
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button onClick={cancelForm} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#666", padding: "0.4rem 0.9rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: saving ? "#444" : "#000", padding: "0.4rem 1rem", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
        <div>
          <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
            Rutinas
          </p>
          <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: "0.2rem 0 0 0" }}>
            Rutinas de entrenamiento
          </p>
          <p style={{ color: "#555", fontSize: "0.8rem", margin: "0.15rem 0 0 0" }}>
            Cargá la rutina de cada día de entrenamiento del equipo
          </p>
        </div>
        <button onClick={openNew}
          style={{ background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.3)", borderRadius: "0.5rem", color: "#a3e635", fontWeight: 700, fontSize: "0.82rem", padding: "0.5rem 1rem", cursor: "pointer", whiteSpace: "nowrap" }}>
          + Agregar rutina
        </button>
      </div>

      {/* Formulario de nueva rutina */}
      {showForm && (
        <div style={{ padding: "1.25rem 1.75rem", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ color: "#a3e635", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Nueva rutina
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "10rem 1fr", gap: "0.75rem", alignItems: "start" }}>
            <div>
              <label style={labelStyle}>Fecha tentativa</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
            <div>
              <label style={labelStyle}>Rutina</label>
              <textarea value={formRoutine} onChange={(e) => setFormRoutine(e.target.value)}
                rows={4} placeholder={"Ej: 15 min precalentamiento. 3 pasadas x 1000m al 85%. 15 min vuelta a la calma y estiramiento."}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={cancelForm} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#666", padding: "0.45rem 0.9rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: saving ? "#444" : "#000", padding: "0.45rem 1.25rem", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Guardando..." : "Cargar rutina"}
            </button>
          </div>
        </div>
      )}

      {/* Próximas */}
      {upcoming.length === 0 && !showForm ? (
        <div style={{ padding: "2rem 1.75rem", textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>No hay rutinas cargadas. Usá el botón para agregar las próximas sesiones.</p>
        </div>
      ) : upcoming.length > 0 && (
        <div>
          <p style={{ color: "#444", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.75rem 1.75rem 0", margin: 0 }}>
            Próximas
          </p>
          {upcoming.map((r) => <RoutineRow key={r.id} r={r} />)}
        </div>
      )}

      {/* Pasadas */}
      {past.length > 0 && (
        <div style={{ borderTop: upcoming.length > 0 ? "1px solid #1a1a1a" : "none" }}>
          <button onClick={() => setShowPast((p) => !p)}
            style={{ width: "100%", background: "transparent", border: "none", padding: "0.75rem 1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <span style={{ color: "#444", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Pasadas ({past.length})
            </span>
            <span style={{ color: "#444", fontSize: "0.8rem" }}>{showPast ? "▲" : "▼"}</span>
          </button>
          {showPast && past.map((r) => <RoutineRow key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}
