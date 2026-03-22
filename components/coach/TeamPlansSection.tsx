"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Plan = {
  id: string;
  valid_from: string;
  valid_until: string | null;
  file_name: string;
  file_size: number | null;
  notes: string | null;
  uploaded_at: string;
};

interface Props {
  teamId: string;
  plans: Plan[];
}

const MAX_SIZE = 10 * 1024 * 1024;

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#888",
  fontSize: "0.75rem",
  fontWeight: 600,
  marginBottom: "0.35rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "0.5rem",
  padding: "0.6rem 0.875rem",
  color: "white",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
  colorScheme: "dark" as React.CSSProperties["colorScheme"],
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function isActive(plan: Plan): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(plan.valid_from + "T00:00:00");
  const until = plan.valid_until ? new Date(plan.valid_until + "T00:00:00") : null;
  return from <= today && (!until || until >= today);
}

function isPast(plan: Plan): boolean {
  if (!plan.valid_until) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(plan.valid_until + "T00:00:00");
  return until < today;
}

export function TeamPlansSection({ teamId, plans: initialPlans }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);

  useEffect(() => { setPlans(initialPlans); }, [initialPlans]);

  // Estado formulario nuevo plan
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estado edición plan existente
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrom, setEditFrom] = useState("");
  const [editUntil, setEditUntil] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  function openEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditFrom(plan.valid_from);
    setEditUntil(plan.valid_until ?? "");
    setEditNotes(plan.notes ?? "");
    setEditFile(null);
  }

  function closeEdit() {
    setEditingId(null);
    setEditFile(null);
  }

  async function handleEdit(e: React.FormEvent, plan: Plan) {
    e.preventDefault();
    if (!editFrom) { return; }
    setEditLoading(true);
    const supabase = createClient();

    let storagePath = plan.file_name; // mantener referencia vieja si no hay nuevo archivo
    // Si hay nuevo archivo, subir primero
    if (editFile) {
      if (editFile.size > MAX_SIZE) {
        toast.error("El archivo no puede superar los 10 MB");
        setEditLoading(false);
        return;
      }
      const timestamp = Date.now();
      storagePath = `teams/${teamId}/plans/${timestamp}_${editFile.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("training-plans")
        .upload(storagePath, editFile, { upsert: false, contentType: "application/pdf" });
      if (uploadError) {
        toast.error(`Error al subir: ${uploadError.message}`);
        setEditLoading(false);
        return;
      }
    }

    const body: Record<string, unknown> = {
      valid_from: editFrom,
      valid_until: editUntil || null,
      notes: editNotes.trim() || null,
    };
    if (editFile) {
      body.storage_path = storagePath;
      body.file_name = editFile.name;
      body.file_size = editFile.size;
    }

    const res = await fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Error al actualizar el plan");
      setEditLoading(false);
      return;
    }

    toast.success("Plan actualizado ✓");
    closeEdit();
    setEditLoading(false);
    setTimeout(() => router.refresh(), 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Seleccioná un archivo PDF"); return; }
    if (!validFrom) { toast.error("Ingresá la fecha de inicio de vigencia"); return; }
    if (file.size > MAX_SIZE) { toast.error("El archivo no puede superar los 10 MB"); return; }

    setLoading(true);
    const supabase = createClient();
    const timestamp = Date.now();
    const storagePath = `teams/${teamId}/plans/${timestamp}_${file.name.replace(/\s+/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("training-plans")
      .upload(storagePath, file, { upsert: false, contentType: "application/pdf" });

    if (uploadError) {
      toast.error(`Error al subir: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: teamId,
        valid_from: validFrom,
        valid_until: validUntil || null,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        notes: notes.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Error al guardar el plan");
      setLoading(false);
      return;
    }

    toast.success("Plan subido correctamente ✓");
    setShowForm(false);
    setFile(null);
    setValidFrom("");
    setValidUntil("");
    setNotes("");
    setLoading(false);
    // Forzar recarga completa para mostrar el nuevo plan
    setTimeout(() => router.refresh(), 300);
  }

  async function handleDelete(planId: string) {
    if (!confirm("¿Eliminar este plan? Los runners dejarán de verlo.")) return;
    setDeletingId(planId);
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan eliminado");
    } else {
      toast.error("Error al eliminar");
    }
    setDeletingId(null);
  }

  const activePlan = plans.find(isActive);
  const futurePlans = plans.filter((p) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const from = new Date(p.valid_from + "T00:00:00");
    return from > today;
  });
  const pastPlans = plans.filter(isPast);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Plan activo */}
      {activePlan ? (
        <div style={{ border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.75rem", overflow: "hidden" }}>
          {/* Info del plan */}
          <div style={{ background: "rgba(163,230,53,0.05)", padding: "1.25rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ background: "#a3e635", color: "#000", fontSize: "0.65rem", fontWeight: 800, padding: "0.15rem 0.5rem", borderRadius: "2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ✓ Vigente
                  </span>
                </div>
                <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📄 {activePlan.file_name}
                </p>
                <p style={{ color: "#a3e635", fontSize: "0.78rem", margin: "0.35rem 0 0 0" }}>
                  {formatDate(activePlan.valid_from)}{activePlan.valid_until ? ` → ${formatDate(activePlan.valid_until)}` : " → indefinido"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => editingId === activePlan.id ? closeEdit() : openEdit(activePlan)}
                  style={{ background: editingId === activePlan.id ? "rgba(163,230,53,0.1)" : "#1a1a1a", border: editingId === activePlan.id ? "1px solid rgba(163,230,53,0.35)" : "1px solid #2a2a2a", borderRadius: "0.4rem", color: editingId === activePlan.id ? "#a3e635" : "#aaa", padding: "0.3rem 0.75rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                >
                  {editingId === activePlan.id ? "Cancelar" : "✏️ Editar"}
                </button>
                <button
                  onClick={() => handleDelete(activePlan.id)}
                  disabled={deletingId === activePlan.id}
                  style={{ background: "transparent", border: "1px solid #3a1a1a", borderRadius: "0.4rem", color: "#e05252", padding: "0.3rem 0.65rem", cursor: "pointer", fontSize: "0.75rem" }}
                >
                  {deletingId === activePlan.id ? "..." : "Eliminar"}
                </button>
              </div>
            </div>

            {/* Indicaciones al grupo (solo si no está editando) */}
            {activePlan.notes && editingId !== activePlan.id && (
              <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(163,230,53,0.1)", paddingTop: "0.6rem" }}>
                <p style={{ color: "#6b9e2a", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.3rem 0" }}>
                  👥 Indicaciones al grupo
                </p>
                <p style={{ color: "#888", fontSize: "0.82rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                  {activePlan.notes}
                </p>
              </div>
            )}
          </div>

          {/* Form de edición inline */}
          {editingId === activePlan.id && (
            <form onSubmit={(e) => handleEdit(e, activePlan)} style={{ background: "#0d0d0d", borderTop: "1px solid #1a1a1a", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "#aaa", fontSize: "0.8rem", fontWeight: 600, margin: 0 }}>Editar plan vigente</p>

              {/* Fechas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>Vigente desde *</label>
                  <input type="date" value={editFrom} onChange={(e) => setEditFrom(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vigente hasta <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
                  <input type="date" value={editUntil} onChange={(e) => setEditUntil(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {/* Indicaciones al grupo */}
              <div>
                <label style={labelStyle}>Indicaciones al grupo <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej: Esta semana enfocamos en volumen. Respetar las zonas de FC..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                />
              </div>

              {/* Reemplazar PDF */}
              <div>
                <label style={labelStyle}>Reemplazar PDF <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional — mantiene el actual si no seleccionás)</span></label>
                <div style={{ border: `2px dashed ${editFile ? "rgba(163,230,53,0.4)" : "#222"}`, borderRadius: "0.5rem", padding: "1rem", textAlign: "center", background: editFile ? "rgba(163,230,53,0.04)" : "transparent", position: "relative", cursor: "pointer" }}>
                  <input type="file" accept=".pdf,application/pdf" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                  {editFile ? (
                    <p style={{ color: "#a3e635", fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>📄 {editFile.name}</p>
                  ) : (
                    <p style={{ color: "#444", fontSize: "0.82rem", margin: 0 }}>Arrastrá o hacé click para cambiar el PDF</p>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" onClick={closeEdit} style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem", padding: "0.6rem", color: "#666", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={editLoading || !editFrom} style={{ flex: 2, background: editLoading || !editFrom ? "#1a1a1a" : "#a3e635", color: editLoading || !editFrom ? "#444" : "#000", border: "none", borderRadius: "0.5rem", padding: "0.6rem", fontWeight: 700, cursor: editLoading || !editFrom ? "not-allowed" : "pointer", fontSize: "0.875rem" }}>
                  {editLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#555", fontSize: "0.85rem" }}>
          No hay ningún plan vigente para este equipo.
        </div>
      )}

      {/* Planes futuros */}
      {futurePlans.length > 0 && (
        <div>
          <p style={{ color: "#666", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.625rem" }}>
            Próximos
          </p>
          {futurePlans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} accent="#60a5fa" label="Próximo" onDelete={handleDelete} deletingId={deletingId} />
          ))}
        </div>
      )}

      {/* Historial */}
      {pastPlans.length > 0 && (
        <div>
          <p style={{ color: "#666", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.625rem" }}>
            Historial
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pastPlans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} accent="#555" label="Vencido" onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {/* Botón subir nuevo plan */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "rgba(163,230,53,0.08)", border: "1px dashed rgba(163,230,53,0.3)",
            borderRadius: "0.625rem", padding: "0.875rem",
            color: "#a3e635", fontSize: "0.875rem", fontWeight: 700,
            cursor: "pointer", width: "100%",
          }}
        >
          + Subir nuevo plan
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: "#0f0f0f", border: "1px solid #2a2a2a",
          borderRadius: "0.75rem", padding: "1.5rem",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>Nuevo plan</p>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "1.2rem" }}>
              ×
            </button>
          </div>

          {/* Fechas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Vigente desde *</label>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vigente hasta <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Archivo */}
          <div>
            <label style={labelStyle}>Archivo PDF *</label>
            <div style={{
              border: `2px dashed ${file ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
              borderRadius: "0.5rem", padding: "1.25rem", textAlign: "center",
              background: file ? "rgba(163,230,53,0.04)" : "transparent",
              position: "relative", cursor: "pointer",
            }}>
              <input
                type="file" accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
              {file ? (
                <>
                  <p style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>📄 {file.name}</p>
                  <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>{(file.size / 1024).toFixed(0)} KB</p>
                </>
              ) : (
                <>
                  <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>Arrastrá o hacé click para seleccionar</p>
                  <p style={{ color: "#444", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>PDF · máx. 10 MB</p>
                </>
              )}
            </div>
          </div>

          {/* Indicaciones al grupo */}
          <div>
            <label style={labelStyle}>Indicaciones al grupo <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Esta semana enfocamos en volumen. Respetar las zonas de frecuencia cardíaca..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem", padding: "0.65rem", color: "#666", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !file || !validFrom}
              style={{
                flex: 2, background: loading || !file || !validFrom ? "#1a1a1a" : "#a3e635",
                color: loading || !file || !validFrom ? "#444" : "#000",
                border: "none", borderRadius: "0.5rem", padding: "0.65rem",
                fontWeight: 700, cursor: loading || !file || !validFrom ? "not-allowed" : "pointer", fontSize: "0.875rem",
              }}>
              {loading ? "Subiendo..." : "Subir plan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PlanRow({ plan, accent, label, onDelete, deletingId }: {
  plan: Plan; accent: string; label: string;
  onDelete: (id: string) => void; deletingId: string | null;
}) {
  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.625rem",
      padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem",
      marginBottom: "0.5rem",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ color: accent, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </span>
        </div>
        <p style={{ color: "#ccc", fontSize: "0.85rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {plan.file_name}
        </p>
        <p style={{ color: "#555", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
          {formatDate(plan.valid_from)}{plan.valid_until ? ` → ${formatDate(plan.valid_until)}` : " → indefinido"}
        </p>
      </div>
      <button
        onClick={() => onDelete(plan.id)}
        disabled={deletingId === plan.id}
        style={{
          background: "transparent", border: "1px solid #2a2a2a",
          borderRadius: "0.4rem", color: "#555", padding: "0.3rem 0.65rem",
          cursor: "pointer", fontSize: "0.75rem", flexShrink: 0,
        }}
      >
        {deletingId === plan.id ? "..." : "Eliminar"}
      </button>
    </div>
  );
}
