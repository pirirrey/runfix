"use client";

import { useState } from "react";
import { toast } from "sonner";

export type TrainingSession = {
  id: string;
  location: string;
  days: number[];
  start_time: string;
  notes: string | null;
  sort_order: number;
};

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_FULL   = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${suffix}`;
}

function SessionCard({
  session,
  onDelete,
  onEdit,
}: {
  session: TrainingSession;
  onDelete: (id: string) => void;
  onEdit: (session: TrainingSession) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${session.location}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/coach/sessions/${session.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Punto de encuentro eliminado");
      onDelete(session.id);
    } else {
      toast.error("Error al eliminar");
    }
    setDeleting(false);
  };

  return (
    <div style={{
      background: "#161616", border: "1px solid #232323",
      borderRadius: "0.75rem", padding: "1rem 1.25rem",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>📍</span>
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{session.location}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {[...session.days].sort((a, b) => a - b).map((d) => (
              <span key={d} style={{
                background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)",
                borderRadius: "0.35rem", padding: "0.15rem 0.5rem",
                color: "#a3e635", fontSize: "0.72rem", fontWeight: 700,
              }}>
                {DAY_LABELS[d]}
              </span>
            ))}
          </div>
          <span style={{ color: "#444", fontSize: "0.75rem" }}>·</span>
          <span style={{ color: "#ccc", fontSize: "0.82rem", fontWeight: 600 }}>
            🕐 {formatTime(session.start_time)}
          </span>
        </div>
        {session.notes && (
          <p style={{ color: "#555", fontSize: "0.78rem", marginTop: "0.4rem", marginBottom: 0 }}>
            {session.notes}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
        <button
          onClick={() => onEdit(session)}
          style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#888", padding: "0.3rem 0.65rem", cursor: "pointer", fontSize: "0.75rem" }}
        >
          ✏
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ background: "transparent", border: "1px solid #2a1a1a", borderRadius: "0.4rem", color: deleting ? "#444" : "#774", padding: "0.3rem 0.65rem", cursor: deleting ? "not-allowed" : "pointer", fontSize: "0.75rem" }}
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { location: "", days: [] as number[], start_time: "08:00", notes: "" };

interface Props {
  initialSessions: TrainingSession[];
}

export function TeamSessionsPanel({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<TrainingSession[]>(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (session: TrainingSession) => {
    setEditingId(session.id);
    setForm({
      location: session.location,
      days: [...session.days],
      start_time: session.start_time,
      notes: session.notes ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const toggleDay = (d: number) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(d) ? prev.days.filter((x) => x !== d) : [...prev.days, d],
    }));
  };

  const handleSave = async () => {
    if (!form.location.trim()) { toast.error("Completá el nombre del lugar"); return; }
    if (form.days.length === 0)  { toast.error("Seleccioná al menos un día"); return; }
    if (!form.start_time)        { toast.error("Ingresá el horario"); return; }

    setSaving(true);
    const isEdit = editingId !== null;
    const url    = isEdit ? `/api/coach/sessions/${editingId}` : `/api/coach/sessions`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location:   form.location.trim(),
        days:       form.days,
        start_time: form.start_time,
        notes:      form.notes.trim() || null,
      }),
    });

    if (res.ok) {
      const saved = await res.json();
      setSessions((prev) => isEdit ? prev.map((s) => s.id === editingId ? saved : s) : [...prev, saved]);
      toast.success(isEdit ? "Punto de encuentro actualizado" : "Punto de encuentro agregado");
      cancelForm();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {sessions.length === 0 && !showForm && (
        <p style={{ color: "#444", fontSize: "0.82rem", fontStyle: "italic", margin: 0 }}>
          Todavía no hay puntos de encuentro cargados.
        </p>
      )}

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} onDelete={(id) => setSessions((prev) => prev.filter((x) => x.id !== id))} onEdit={openEdit} />
      ))}

      {/* Formulario inline */}
      {showForm && (
        <div style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: "0.75rem", padding: "1.25rem" }}>
          <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 1rem 0" }}>
            {editingId ? "Editar punto de encuentro" : "Nuevo punto de encuentro"}
          </p>

          {/* Lugar */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>
              Nombre del lugar *
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Ej: El Bosque, La Cantera, Parque Saavedra…"
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.55rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Días */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
              Días de entrenamiento *
            </label>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {DAY_LABELS.map((label, i) => {
                const active = form.days.includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleDay(i)} style={{
                    background: active ? "rgba(163,230,53,0.15)" : "#1a1a1a",
                    border: `1px solid ${active ? "rgba(163,230,53,0.45)" : "#2a2a2a"}`,
                    borderRadius: "0.4rem", color: active ? "#a3e635" : "#555",
                    padding: "0.35rem 0.65rem", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: active ? 700 : 500,
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {form.days.length > 0 && (
              <p style={{ color: "#666", fontSize: "0.72rem", marginTop: "0.35rem", marginBottom: 0 }}>
                {[...form.days].sort((a, b) => a - b).map((d) => DAY_FULL[d]).join(" · ")}
              </p>
            )}
          </div>

          {/* Horario + Notas */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", marginBottom: "1rem", alignItems: "start" }}>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>
                Horario *
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.55rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", colorScheme: "dark" }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>
                Notas (opcional)
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Ej: Punto de encuentro en el arco de entrada"
                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.55rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={cancelForm} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", padding: "0.45rem 1rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: saving ? "#444" : "#000", padding: "0.45rem 1.25rem", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={openAdd}
          style={{ alignSelf: "flex-start", background: "transparent", border: "1px dashed #2a2a2a", borderRadius: "0.5rem", color: "#555", padding: "0.45rem 1rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#a3e635"; (e.currentTarget as HTMLButtonElement).style.color = "#a3e635"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLButtonElement).style.color = "#555"; }}
        >
          + Agregar punto de encuentro
        </button>
      )}
    </div>
  );
}
