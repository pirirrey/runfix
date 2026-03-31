"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

type Member = {
  membershipId: string;
  runnerId: string;
  name: string;
  email: string;
  joinedAt: string;
  coachNotes: string | null;
};

interface Props {
  teamId: string;
  members: Member[];
}

export function RunnerNotesList({ teamId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);

  async function doRemoveFromTeam(m: Member) {
    setConfirmRemove(null);
    setRemoving(m.membershipId);
    const res = await fetch(`/api/coach/runners/${m.runnerId}/teams?team_id=${teamId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((x) => x.membershipId !== m.membershipId));
      toast.success(`${m.name} fue removido del equipo`);
    } else {
      toast.error("Error al quitar al runner");
    }
    setRemoving(null);
  }

  function startEdit(m: Member) {
    setEditing(m.membershipId);
    setDraftNote(m.coachNotes ?? "");
  }

  function cancelEdit() {
    setEditing(null);
    setDraftNote("");
  }

  async function saveNote(membershipId: string) {
    setSaving(true);
    const res = await fetch(`/api/teams/${teamId}/members/${membershipId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_notes: draftNote.trim() || null }),
    });

    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) =>
          m.membershipId === membershipId
            ? { ...m, coachNotes: draftNote.trim() || null }
            : m
        )
      );
      setEditing(null);
      toast.success("Indicaciones guardadas");
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {members.map((m, idx) => {
        const isEditing = editing === m.membershipId;
        return (
          <div
            key={m.membershipId}
            style={{
              padding: "1rem 1.75rem",
              borderTop: idx === 0 ? "none" : "1px solid #1a1a1a",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {/* Fila principal */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Avatar */}
              <div style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "50%", flexShrink: 0,
                background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem", color: "#a3e635", fontWeight: 800,
              }}>
                {m.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>{m.name}</p>
                <p style={{ color: "#555", fontSize: "0.75rem", margin: 0 }}>{m.email}</p>
              </div>

              {/* Fecha + botones */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <span style={{ color: "#444", fontSize: "0.72rem" }}>
                  {new Date(m.joinedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </span>
                <button
                  onClick={() => setConfirmRemove(m)}
                  disabled={removing === m.membershipId}
                  title="Quitar del equipo"
                  style={{
                    background: "transparent",
                    border: "1px solid #3a1a1a",
                    borderRadius: "0.4rem",
                    padding: "0.3rem 0.6rem",
                    color: removing === m.membershipId ? "#555" : "#c05050",
                    fontSize: "0.75rem", fontWeight: 600,
                    cursor: removing === m.membershipId ? "not-allowed" : "pointer",
                  }}
                >
                  {removing === m.membershipId ? "..." : "Quitar"}
                </button>
              </div>
            </div>

            {/* Nota actual (solo lectura, cuando no se está editando) */}
            {m.coachNotes && !isEditing && (
              <div style={{
                marginLeft: "3.25rem",
                background: "rgba(163,230,53,0.04)",
                border: "1px solid rgba(163,230,53,0.1)",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.875rem",
              }}>
                <p style={{ color: "#888", fontSize: "0.8rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                  {m.coachNotes}
                </p>
              </div>
            )}

            {/* Editor inline */}
            {isEditing && (
              <div style={{ marginLeft: "3.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="Ej: Reducir intensidad en cuestas. Foco en cadencia. Descanso extra el jueves..."
                  rows={4}
                  autoFocus
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid rgba(163,230,53,0.3)",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    color: "white",
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={cancelEdit}
                    style={{
                      background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem",
                      padding: "0.4rem 0.875rem", color: "#666", fontSize: "0.8rem",
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveNote(m.membershipId)}
                    disabled={saving}
                    style={{
                      background: saving ? "#1a1a1a" : "#a3e635",
                      color: saving ? "#444" : "#000",
                      border: "none", borderRadius: "0.4rem",
                      padding: "0.4rem 1rem", fontSize: "0.8rem",
                      fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {confirmRemove && (
        <ConfirmModal
          title={`Quitar a ${confirmRemove.name}`}
          body={`Dejará de ver los planes de este equipo.\n\nPodés volver a agregarlo desde la página del equipo en cualquier momento.`}
          confirmLabel="Quitar del equipo"
          variant="danger"
          onConfirm={() => doRemoveFromTeam(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
