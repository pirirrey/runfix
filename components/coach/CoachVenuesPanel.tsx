"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

export type VenueSession = {
  id: string;
  venue_id: string;
  location: string;
  days: number[];
  start_time: string;
  notes: string | null;
  sort_order: number;
};

export type Venue = {
  id: string;
  name: string;
  notes: string | null;
  sort_order: number;
  is_default: boolean;
  runner_selectable: boolean;
  venue_sessions: VenueSession[];
};

const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_FULL  = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${suffix}`;
}

const EMPTY_SESSION = { location: "", days: [] as number[], start_time: "08:00", notes: "" };

/* ── Sub-componente: formulario de horario ─────────────────── */
function SessionForm({
  venueName,
  onSave,
  onCancel,
  saving,
}: {
  venueName: string;
  onSave: (form: typeof EMPTY_SESSION) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...EMPTY_SESSION, location: venueName });

  const toggleDay = (d: number) =>
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
    }));

  return (
    <div style={{
      background: "#0a0a0a", border: "1px solid #252525",
      borderRadius: "0.625rem", padding: "1rem 1.125rem", marginTop: "0.25rem",
    }}>
      <p style={{ color: "#a3e635", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.875rem 0" }}>
        Nuevo horario
      </p>

      {/* Días */}
      <div style={{ marginBottom: "0.75rem" }}>
        <p style={{ color: "#555", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 0.4rem 0" }}>
          Días *
        </p>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {DAY_SHORT.map((label, d) => {
            const active = form.days.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                style={{
                  background: active ? "rgba(163,230,53,0.12)" : "#1a1a1a",
                  border: `1px solid ${active ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
                  borderRadius: "0.35rem",
                  color: active ? "#a3e635" : "#555",
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem", fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {form.days.length > 0 && (
          <p style={{ color: "#555", fontSize: "0.7rem", margin: "0.3rem 0 0 0" }}>
            {[...form.days].sort((a, b) => a - b).map(d => DAY_FULL[d]).join(" · ")}
          </p>
        )}
      </div>

      {/* Horario + Lugar */}
      <div style={{ display: "grid", gridTemplateColumns: "9rem 1fr", gap: "0.65rem", marginBottom: "0.75rem" }}>
        <div>
          <p style={{ color: "#555", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.3rem 0" }}>Horario *</p>
          <input
            type="time"
            value={form.start_time}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.45rem 0.6rem", color: "white", fontSize: "0.85rem", outline: "none", colorScheme: "dark", width: "100%", boxSizing: "border-box" as const }}
          />
        </div>
        <div>
          <p style={{ color: "#555", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.3rem 0" }}>Lugar de encuentro *</p>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Ej: Entrada del parque, Catedral…"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.45rem 0.6rem", color: "white", fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box" as const }}
          />
        </div>
      </div>

      {/* Notas opcionales */}
      <div style={{ marginBottom: "0.875rem" }}>
        <p style={{ color: "#555", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", margin: "0 0 0.3rem 0" }}>Notas (opcional)</p>
        <input
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Ej: Punto de encuentro en el arco de entrada"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.45rem 0.6rem", color: "white", fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box" as const }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: saving ? "#444" : "#000", padding: "0.4rem 1.1rem", fontSize: "0.78rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Guardando…" : "Agregar horario"}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-componente: card de sede ──────────────────────────── */
function VenueCard({
  venue,
  onDeleteVenue,
  onAddSession,
  onDeleteSession,
  onUpdateSession,
  onToggleDefault,
  onToggleSelectable,
}: {
  venue: Venue;
  onDeleteVenue: (id: string) => void;
  onAddSession:  (venueId: string, form: typeof EMPTY_SESSION) => Promise<void>;
  onDeleteSession: (venueId: string, sessionId: string) => void;
  onUpdateSession: (venueId: string, sessionId: string, form: typeof EMPTY_SESSION) => Promise<void>;
  onToggleDefault: (id: string, isDefault: boolean) => void;
  onToggleSelectable: (id: string, current: boolean) => void;
}) {
  const [showForm, setShowForm]               = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [togglingDefault, setTogglingDefault] = useState(false);
  const [togglingSelectable, setTogglingSelectable] = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editForm, setEditForm]               = useState<typeof EMPTY_SESSION>({ ...EMPTY_SESSION });
  const [editSaving, setEditSaving]           = useState(false);

  const sessions = [...venue.venue_sessions].sort((a, b) => {
    const minA = Math.min(...a.days);
    const minB = Math.min(...b.days);
    return minA !== minB ? minA - minB : a.start_time.localeCompare(b.start_time);
  });

  async function handleAdd(form: typeof EMPTY_SESSION) {
    if (!form.location.trim()) { toast.error("Ingresá el lugar de encuentro"); return; }
    if (form.days.length === 0) { toast.error("Seleccioná al menos un día"); return; }
    setSaving(true);
    await onAddSession(venue.id, form);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDeleteVenue() {
    setShowDeleteModal(true);
  }

  async function confirmDeleteVenue() {
    setDeleting(true);
    await onDeleteVenue(venue.id);
    setShowDeleteModal(false);
    setDeleting(false);
  }

  async function handleToggleDefault() {
    setTogglingDefault(true);
    await onToggleDefault(venue.id, venue.is_default);
    setTogglingDefault(false);
  }

  async function handleToggleSelectable() {
    setTogglingSelectable(true);
    await onToggleSelectable(venue.id, venue.runner_selectable);
    setTogglingSelectable(false);
  }

  function startEdit(s: VenueSession) {
    setEditingId(s.id);
    setEditForm({ location: s.location, days: [...s.days], start_time: s.start_time, notes: s.notes ?? "" });
    setShowForm(false); // cerrar el form de nuevo horario si estaba abierto
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ ...EMPTY_SESSION });
  }

  async function saveEdit(sessionId: string) {
    if (!editForm.location.trim()) { toast.error("Ingresá el lugar de encuentro"); return; }
    if (editForm.days.length === 0) { toast.error("Seleccioná al menos un día"); return; }
    setEditSaving(true);
    await onUpdateSession(venue.id, sessionId, editForm);
    setEditingId(null);
    setEditSaving(false);
  }

  function toggleEditDay(d: number) {
    setEditForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
    }));
  }

  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: "0.875rem", overflow: "hidden",
    }}>
      {/* Header de sede */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.25rem",
        borderBottom: sessions.length > 0 || showForm ? "1px solid #1a1a1a" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>📍</span>
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.92rem" }}>
            {venue.name}
          </span>
          {venue.is_default && (
            <span style={{
              background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.3)",
              borderRadius: "2rem", padding: "0.1rem 0.55rem",
              color: "#a3e635", fontSize: "0.6rem", fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
            }}>
              ⭐ Por defecto
            </span>
          )}
          {sessions.length > 0 && (
            <span style={{
              background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.14)",
              borderRadius: "2rem", padding: "0.1rem 0.5rem",
              color: "#7aad1f", fontSize: "0.63rem", fontWeight: 700, flexShrink: 0,
            }}>
              {sessions.length} {sessions.length === 1 ? "horario" : "horarios"}
            </span>
          )}
          {/* Badge visible/privada */}
          <span style={{
            background: venue.runner_selectable ? "rgba(96,165,250,0.08)" : "rgba(100,100,100,0.1)",
            border: `1px solid ${venue.runner_selectable ? "rgba(96,165,250,0.25)" : "#2a2a2a"}`,
            borderRadius: "2rem", padding: "0.1rem 0.55rem",
            color: venue.runner_selectable ? "#60a5fa" : "#444",
            fontSize: "0.6rem", fontWeight: 700, flexShrink: 0,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {venue.runner_selectable ? "👁 Visible" : "🔒 Privada"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {/* Toggle seleccionable por runner */}
          <button
            onClick={handleToggleSelectable}
            disabled={togglingSelectable}
            title={venue.runner_selectable ? "Hacer privada (solo el coach asigna)" : "Permitir que el runner la elija"}
            style={{
              background: venue.runner_selectable ? "rgba(96,165,250,0.08)" : "transparent",
              border: venue.runner_selectable ? "1px solid rgba(96,165,250,0.25)" : "1px solid #252525",
              borderRadius: "0.375rem",
              color: venue.runner_selectable ? "#60a5fa" : "#444",
              padding: "0.2rem 0.6rem",
              cursor: togglingSelectable ? "not-allowed" : "pointer",
              fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap",
            }}
          >
            {togglingSelectable ? "…" : venue.runner_selectable ? "👁 Visible" : "🔒 Privada"}
          </button>
          <button
            onClick={handleToggleDefault}
            disabled={togglingDefault}
            title={venue.is_default ? "Quitar sede por defecto" : "Marcar como sede por defecto"}
            style={{
              background: venue.is_default ? "rgba(163,230,53,0.08)" : "transparent",
              border: venue.is_default ? "1px solid rgba(163,230,53,0.25)" : "1px solid #252525",
              borderRadius: "0.375rem",
              color: venue.is_default ? "#a3e635" : "#444",
              padding: "0.2rem 0.6rem",
              cursor: togglingDefault ? "not-allowed" : "pointer",
              fontSize: "0.7rem", fontWeight: 600,
            }}
          >
            {togglingDefault ? "…" : venue.is_default ? "⭐ Default" : "Hacer default"}
          </button>
          <button
            onClick={handleDeleteVenue}
            disabled={deleting}
            title="Eliminar sede"
            style={{
              background: "transparent", border: "1px solid #2a1a1a",
              borderRadius: "0.375rem", color: deleting ? "#444" : "#664",
              padding: "0.2rem 0.6rem", cursor: deleting ? "not-allowed" : "pointer",
              fontSize: "0.7rem", fontWeight: 600,
            }}
          >
            {deleting ? "…" : "Borrar"}
          </button>
        </div>
      </div>

      {/* Horarios */}
      {(sessions.length > 0 || showForm) && (
        <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>

          {sessions.map(s => (
            editingId === s.id ? (
              /* ── Fila en modo edición ── */
              <div key={s.id} style={{
                background: "#0a0a0a", border: "1px solid #2a2a2a",
                borderRadius: "0.5rem", padding: "0.875rem 1rem",
              }}>
                <p style={{ color: "#a3e635", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem 0" }}>
                  Editar horario
                </p>

                {/* Días */}
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                  {DAY_SHORT.map((label, d) => {
                    const active = editForm.days.includes(d);
                    return (
                      <button key={d} type="button" onClick={() => toggleEditDay(d)} style={{
                        background: active ? "rgba(163,230,53,0.12)" : "#1a1a1a",
                        border: `1px solid ${active ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
                        borderRadius: "0.35rem", color: active ? "#a3e635" : "#555",
                        padding: "0.25rem 0.55rem", fontSize: "0.72rem", fontWeight: active ? 700 : 500, cursor: "pointer",
                      }}>
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Hora + Lugar */}
                <div style={{ display: "grid", gridTemplateColumns: "9rem 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", color: "white", fontSize: "0.82rem", outline: "none", colorScheme: "dark", width: "100%", boxSizing: "border-box" as const }}
                  />
                  <input
                    value={editForm.location}
                    onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Lugar de encuentro"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", color: "white", fontSize: "0.82rem", outline: "none", width: "100%", boxSizing: "border-box" as const }}
                  />
                </div>

                {/* Notas */}
                <input
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas (opcional)"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", color: "white", fontSize: "0.82rem", outline: "none", width: "100%", boxSizing: "border-box" as const, marginBottom: "0.65rem" }}
                />

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button onClick={cancelEdit} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={() => saveEdit(s.id)} disabled={editSaving} style={{ background: editSaving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: editSaving ? "#444" : "#000", padding: "0.35rem 0.875rem", fontSize: "0.75rem", fontWeight: 700, cursor: editSaving ? "not-allowed" : "pointer" }}>
                    {editSaving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Fila normal ── */
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: "#161616", border: "1px solid #1e1e1e",
                borderRadius: "0.5rem", padding: "0.5rem 0.875rem",
              }}>
                {/* Días */}
                <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                  {[...s.days].sort((a, b) => a - b).map(d => (
                    <span key={d} style={{
                      background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.2)",
                      borderRadius: "0.25rem", padding: "0.05rem 0.4rem",
                      color: "#a3e635", fontSize: "0.65rem", fontWeight: 700,
                    }}>
                      {DAY_SHORT[d]}
                    </span>
                  ))}
                </div>

                <span style={{ color: "#2a2a2a", fontSize: "0.8rem", flexShrink: 0 }}>·</span>

                <span style={{ color: "white", fontSize: "0.82rem", fontWeight: 700, flexShrink: 0, minWidth: "5rem" }}>
                  🕐 {formatTime(s.start_time)}
                </span>

                <span style={{ color: "#666", fontSize: "0.82rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.location}
                </span>

                {s.notes && (
                  <span style={{ color: "#444", fontSize: "0.72rem", fontStyle: "italic", flexShrink: 0, maxWidth: "8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.notes}
                  </span>
                )}

                {/* Editar */}
                <button
                  onClick={() => startEdit(s)}
                  title="Editar horario"
                  style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.78rem", padding: "0.15rem 0.3rem", flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a3e635")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#444")}
                >
                  ✏️
                </button>

                {/* Eliminar */}
                <button
                  onClick={() => onDeleteSession(venue.id, s.id)}
                  title="Eliminar horario"
                  style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.8rem", padding: "0.15rem 0.3rem", flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#774")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                >
                  ✕
                </button>
              </div>
            )
          ))}

          {/* Formulario agregar horario */}
          {showForm ? (
            <SessionForm
              venueName={venue.name}
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "transparent", border: "1px dashed #252525",
                borderRadius: "0.45rem", color: "#444",
                padding: "0.45rem", fontSize: "0.76rem",
                cursor: "pointer", width: "100%", textAlign: "center" as const,
                marginTop: "0.1rem",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#a3e635"; e.currentTarget.style.color = "#a3e635"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#444"; }}
            >
              + Agregar horario
            </button>
          )}
        </div>
      )}

      {/* Si no hay sesiones y no se está mostrando el form */}
      {sessions.length === 0 && !showForm && (
        <div style={{ padding: "0.75rem 1.25rem" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: "transparent", border: "1px dashed #252525",
              borderRadius: "0.45rem", color: "#444",
              padding: "0.45rem", fontSize: "0.76rem",
              cursor: "pointer", width: "100%", textAlign: "center" as const,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#a3e635"; e.currentTarget.style.color = "#a3e635"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#444"; }}
          >
            + Agregar horario
          </button>
        </div>
      )}

      {/* Modal confirmación borrado */}
      {showDeleteModal && (
        <ConfirmModal
          title="Eliminar sede"
          body={`¿Eliminar "${venue.name}" y todos sus horarios?\nEsta acción no se puede deshacer.`}
          confirmLabel={deleting ? "Eliminando…" : "Sí, eliminar"}
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={confirmDeleteVenue}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

export type CoachVenuesPanelHandle = { openNew: () => void };

/* ── Componente principal ──────────────────────────────────── */
export const CoachVenuesPanel = forwardRef<CoachVenuesPanelHandle, { initialVenues: Venue[] }>(
function CoachVenuesPanel({ initialVenues }, ref) {
  const [venues, setVenues]         = useState<Venue[]>(initialVenues);
  const [addingVenue, setAddingVenue] = useState(false);
  const [newName, setNewName]       = useState("");
  const [creatingVenue, setCreatingVenue] = useState(false);

  useImperativeHandle(ref, () => ({
    openNew: () => {
      setAddingVenue(true);
      setTimeout(() => document.getElementById("new-venue-input")?.focus(), 50);
    },
  }));

  /* Crear sede */
  async function createVenue() {
    if (!newName.trim()) return;
    setCreatingVenue(true);
    const res = await fetch("/api/coach/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const venue = await res.json();
      setVenues(v => [...v, { ...venue, venue_sessions: [] }]);
      setNewName("");
      setAddingVenue(false);
      toast.success("Sede creada");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al crear sede");
    }
    setCreatingVenue(false);
  }

  /* Eliminar sede */
  async function deleteVenue(venueId: string) {
    const res = await fetch(`/api/coach/venues/${venueId}`, { method: "DELETE" });
    if (res.ok) {
      setVenues(v => v.filter(x => x.id !== venueId));
      toast.success("Sede eliminada");
    } else {
      toast.error("Error al eliminar sede");
    }
  }

  /* Agregar horario a sede */
  async function addSession(venueId: string, form: typeof EMPTY_SESSION) {
    const res = await fetch(`/api/coach/venues/${venueId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const session = await res.json();
      setVenues(v => v.map(venue =>
        venue.id === venueId
          ? { ...venue, venue_sessions: [...venue.venue_sessions, session] }
          : venue
      ));
      toast.success("Horario agregado");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al agregar horario");
    }
  }

  /* Actualizar horario */
  async function updateSession(venueId: string, sessionId: string, form: typeof EMPTY_SESSION) {
    const res = await fetch(`/api/coach/venues/${venueId}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setVenues(v => v.map(venue =>
        venue.id === venueId
          ? { ...venue, venue_sessions: venue.venue_sessions.map(s => s.id === sessionId ? updated : s) }
          : venue
      ));
      toast.success("Horario actualizado");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error ?? "Error al actualizar horario");
    }
  }

  /* Toggle seleccionable por runner */
  async function toggleSelectable(venueId: string, isCurrentlySelectable: boolean) {
    const res = await fetch(`/api/coach/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runner_selectable: !isCurrentlySelectable }),
    });
    if (res.ok) {
      setVenues(v => v.map(venue =>
        venue.id === venueId ? { ...venue, runner_selectable: !isCurrentlySelectable } : venue
      ));
      toast.success(!isCurrentlySelectable ? "Sede visible para runners" : "Sede privada — solo el coach puede asignarla");
    } else {
      toast.error("Error al actualizar visibilidad");
    }
  }

  /* Toggle sede por defecto */
  async function toggleDefault(venueId: string, isCurrentlyDefault: boolean) {
    const url = `/api/coach/venues/${venueId}/set-default`;
    const method = isCurrentlyDefault ? "DELETE" : "POST";
    const res = await fetch(url, { method });
    if (res.ok) {
      setVenues(v => v.map(venue => ({
        ...venue,
        is_default: isCurrentlyDefault
          ? (venue.id === venueId ? false : venue.is_default)
          : (venue.id === venueId ? true : false),
      })));
      toast.success(isCurrentlyDefault ? "Sede por defecto removida" : "Sede marcada como por defecto");
    } else {
      toast.error("Error al actualizar sede por defecto");
    }
  }

  /* Eliminar horario */
  async function deleteSession(venueId: string, sessionId: string) {
    const res = await fetch(`/api/coach/venues/${venueId}/sessions/${sessionId}`, { method: "DELETE" });
    if (res.ok) {
      setVenues(v => v.map(venue =>
        venue.id === venueId
          ? { ...venue, venue_sessions: venue.venue_sessions.filter(s => s.id !== sessionId) }
          : venue
      ));
      toast.success("Horario eliminado");
    } else {
      toast.error("Error al eliminar horario");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {venues.length === 0 && !addingVenue && (
        <p style={{ color: "#444", fontSize: "0.82rem", fontStyle: "italic", margin: 0 }}>
          Todavía no hay sedes configuradas.
        </p>
      )}

      {venues.map(venue => (
        <VenueCard
          key={venue.id}
          venue={venue}
          onDeleteVenue={deleteVenue}
          onAddSession={addSession}
          onDeleteSession={deleteSession}
          onUpdateSession={updateSession}
          onToggleDefault={toggleDefault}
          onToggleSelectable={toggleSelectable}
        />
      ))}

      {/* Formulario nueva sede */}
      {addingVenue && (
        <div style={{
          background: "#111", border: "1px solid #1e1e1e",
          borderRadius: "0.875rem", padding: "1rem 1.25rem",
        }}>
          <p style={{ color: "#a3e635", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.75rem 0" }}>
            Nueva sede
          </p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createVenue()}
            id="new-venue-input"
            placeholder="Ej: Parque San Martín, El Bosque, República de los Niños…"
            autoFocus
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: "0.4rem", padding: "0.55rem 0.75rem",
              color: "white", fontSize: "0.875rem", outline: "none",
              width: "100%", boxSizing: "border-box" as const, marginBottom: "0.75rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => { setAddingVenue(false); setNewName(""); }}
              style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={createVenue}
              disabled={creatingVenue || !newName.trim()}
              style={{
                background: (!newName.trim() || creatingVenue) ? "#1a1a1a" : "#a3e635",
                border: "none", borderRadius: "0.4rem",
                color: (!newName.trim() || creatingVenue) ? "#444" : "#000",
                padding: "0.4rem 1.1rem", fontSize: "0.78rem", fontWeight: 700,
                cursor: (!newName.trim() || creatingVenue) ? "not-allowed" : "pointer",
              }}
            >
              {creatingVenue ? "Creando…" : "Crear sede"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
