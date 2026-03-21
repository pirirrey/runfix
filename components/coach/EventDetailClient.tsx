"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";

type Distance = { id: string; label: string; altimetry_path: string | null; altimetryUrl: string | null };
type EventFile = { id: string; file_name: string; storage_path: string; signedUrl: string | null };
type EventData = {
  id: string; name: string; location: string | null;
  race_type: "street" | "trail"; start_date: string; end_date: string;
  discount_code: string | null; notes: string | null;
  race_event_distances: Distance[];
  race_event_files: EventFile[];
};
type GoalRow = {
  id: string;
  runner: { id: string; full_name: string | null; email: string };
  distance: { id: string; label: string };
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.65rem 0.875rem", color: "white", fontSize: "0.875rem",
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em",
};
const card: React.CSSProperties = {
  background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden", marginBottom: "1.5rem",
};
const cardHeader: React.CSSProperties = {
  padding: "1rem 1.5rem", borderBottom: "1px solid #1e1e1e",
  display: "flex", justifyContent: "space-between", alignItems: "center",
};

export function EventDetailClient({ event, runnerGoals }: { event: EventData; runnerGoals: GoalRow[] }) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── datos básicos ──
  const [form, setForm] = useState({
    name: event.name, location: event.location ?? "",
    race_type: event.race_type, start_date: event.start_date, end_date: event.end_date,
    discount_code: event.discount_code ?? "", notes: event.notes ?? "",
  });
  const [savingBasic, setSavingBasic] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function saveBasic(e: React.FormEvent) {
    e.preventDefault();
    setSavingBasic(true);
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, location: form.location || null, discount_code: form.discount_code || null, notes: form.notes || null }),
    });
    if (res.ok) { toast.success("Evento actualizado"); router.refresh(); }
    else { const d = await res.json(); toast.error(d.error ?? "Error"); }
    setSavingBasic(false);
  }

  // ── distancias ──
  const [newLabel, setNewLabel] = useState("");
  const [addingDist, setAddingDist] = useState(false);
  const [uploadingAlt, setUploadingAlt] = useState<string | null>(null);

  async function addDistance() {
    if (!newLabel.trim()) return;
    setAddingDist(true);
    const res = await fetch(`/api/events/${event.id}/distances`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    if (res.ok) { toast.success("Distancia agregada"); setNewLabel(""); router.refresh(); }
    else { const d = await res.json(); toast.error(d.error ?? "Error"); }
    setAddingDist(false);
  }

  async function deleteDistance(distId: string) {
    if (!confirm("¿Eliminar esta distancia? Se borrarán los objetivos de los runners.")) return;
    const res = await fetch(`/api/events/${event.id}/distances/${distId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Distancia eliminada"); router.refresh(); }
    else toast.error("Error al eliminar");
  }

  async function uploadAltimetry(distId: string, file: File) {
    setUploadingAlt(distId);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `events/${event.id}/distances/${distId}.${ext}`;
    const { error } = await supabase.storage.from("training-plans").upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir altimetría"); setUploadingAlt(null); return; }
    const res = await fetch(`/api/events/${event.id}/distances/${distId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ altimetry_path: path }),
    });
    if (res.ok) { toast.success("Altimetría cargada"); router.refresh(); }
    else toast.error("Error al guardar");
    setUploadingAlt(null);
  }

  // ── archivos adjuntos ──
  const [uploadingFile, setUploadingFile] = useState(false);

  async function uploadFile(file: File) {
    setUploadingFile(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `events/${event.id}/files/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("training-plans").upload(path, file, { upsert: false });
    if (error) { toast.error("Error al subir archivo"); setUploadingFile(false); return; }
    const res = await fetch(`/api/events/${event.id}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: file.name, storage_path: path }),
    });
    if (res.ok) { toast.success("Archivo adjunto guardado"); router.refresh(); }
    else toast.error("Error al registrar archivo");
    setUploadingFile(false);
  }

  async function deleteFile(fileId: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    const res = await fetch(`/api/events/${event.id}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Archivo eliminado"); router.refresh(); }
    else toast.error("Error al eliminar");
  }

  async function deleteEvent() {
    if (!confirm(`¿Eliminar el evento "${event.name}"? Esta acción es irreversible.`)) return;
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Evento eliminado"); router.push("/coach/events"); }
    else toast.error("Error al eliminar");
  }

  const typeLabel = event.race_type === "trail" ? "🏔 Trail" : "🏙 Calle";
  const typeColor = event.race_type === "trail" ? "#a3e635" : "#60a5fa";

  return (
    <div>
      {/* Título */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <span style={{ color: typeColor, fontSize: "0.75rem", fontWeight: 700, background: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}44`, borderRadius: "2rem", padding: "0.15rem 0.65rem" }}>
              {typeLabel}
            </span>
          </div>
          <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, margin: 0 }}>{event.name}</h1>
        </div>
        <button onClick={deleteEvent} style={{
          background: "transparent", border: "1px solid #3a1010", borderRadius: "0.5rem",
          color: "#e05252", padding: "0.45rem 0.9rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
        }}>Eliminar evento</button>
      </div>

      {/* ── Datos básicos ── */}
      <div style={card}>
        <div style={cardHeader}>
          <p style={{ color: "white", fontWeight: 700, margin: 0 }}>Datos del evento</p>
        </div>
        <form onSubmit={saveBasic} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Localidad</label>
              <input style={inputStyle} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Mendoza" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Código descuento</label>
              <input style={inputStyle} value={form.discount_code} onChange={e => set("discount_code", e.target.value)} placeholder="Ej: WEPLAN20" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={labelStyle}>Tipo de carrera</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["trail", "street"] as const).map(t => (
                <button key={t} type="button" onClick={() => set("race_type", t)} style={{
                  flex: 1, padding: "0.55rem", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                  border: form.race_type === t ? "2px solid #a3e635" : "1px solid #333",
                  background: form.race_type === t ? "rgba(163,230,53,0.1)" : "#1a1a1a",
                  color: form.race_type === t ? "#a3e635" : "#888",
                }}>
                  {t === "trail" ? "🏔 Trail" : "🏙 Calle"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Fecha inicio *</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => set("start_date", e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Fecha fin *</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => set("end_date", e.target.value)} min={form.start_date} required />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={labelStyle}>Notas / descripción</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <button type="submit" disabled={savingBasic} style={{
            background: savingBasic ? "#1a2a0a" : "#a3e635", color: savingBasic ? "#666" : "#000",
            border: "none", borderRadius: "0.5rem", padding: "0.65rem 1.5rem",
            fontWeight: 700, fontSize: "0.875rem", cursor: savingBasic ? "not-allowed" : "pointer", alignSelf: "flex-start",
          }}>
            {savingBasic ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      {/* ── Distancias ── */}
      <div style={card}>
        <div style={cardHeader}>
          <p style={{ color: "white", fontWeight: 700, margin: 0 }}>Distancias</p>
          <span style={{ color: "#555", fontSize: "0.8rem" }}>{event.race_event_distances.length} cargadas</span>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Agregar nueva */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ej: 10k, 21k, 42k, 70k, 100mi…"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDistance())}
            />
            <button onClick={addDistance} disabled={addingDist || !newLabel.trim()} style={{
              background: "#a3e635", color: "#000", border: "none", borderRadius: "0.5rem",
              padding: "0 1rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, opacity: !newLabel.trim() ? 0.4 : 1,
            }}>
              {addingDist ? "…" : "+ Agregar"}
            </button>
          </div>
          {/* Lista */}
          {event.race_event_distances.length === 0 ? (
            <p style={{ color: "#555", fontSize: "0.85rem" }}>No hay distancias todavía.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {event.race_event_distances.map((d) => (
                <div key={d.id} style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: "0.625rem", padding: "0.875rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{d.label}</span>
                    <button onClick={() => deleteDistance(d.id)} style={{
                      background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "1rem", lineHeight: 1,
                    }}>✕</button>
                  </div>
                  {/* Altimetría */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <label style={{
                      background: d.altimetryUrl ? "rgba(163,230,53,0.1)" : "#222",
                      border: `1px solid ${d.altimetryUrl ? "rgba(163,230,53,0.3)" : "#333"}`,
                      borderRadius: "0.4rem", padding: "0.3rem 0.75rem",
                      fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                      color: d.altimetryUrl ? "#a3e635" : "#888", position: "relative",
                    }}>
                      {uploadingAlt === d.id ? "Subiendo..." : d.altimetryUrl ? "✓ Altimetría cargada" : "📈 Subir altimetría"}
                      <input type="file" accept="image/*,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAltimetry(d.id, f); }}
                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                    </label>
                    {d.altimetryUrl && (
                      <a href={d.altimetryUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#a3e635", fontSize: "0.78rem", textDecoration: "none" }}>
                        ↗ Ver
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Runners inscriptos ── */}
      <div style={card}>
        <div style={cardHeader}>
          <p style={{ color: "white", fontWeight: 700, margin: 0 }}>🏅 Runners inscriptos</p>
          <span style={{ color: "#555", fontSize: "0.8rem" }}>
            {runnerGoals.length} {runnerGoals.length === 1 ? "runner" : "runners"}
          </span>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {runnerGoals.length === 0 ? (
            <p style={{ color: "#555", fontSize: "0.85rem" }}>
              Ningún runner marcó una distancia como objetivo todavía.
            </p>
          ) : (
            (() => {
              // Agrupar por distancia
              const byDistance: Record<string, { label: string; runners: GoalRow[] }> = {};
              for (const g of runnerGoals) {
                const did = g.distance.id;
                if (!byDistance[did]) byDistance[did] = { label: g.distance.label, runners: [] };
                byDistance[did].runners.push(g);
              }
              // Ordenar por label de distancia
              const sorted = Object.values(byDistance).sort((a, b) => a.label.localeCompare(b.label));
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {sorted.map((group) => (
                    <div key={group.label}>
                      {/* Badge de distancia */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{
                          background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.3)",
                          borderRadius: "2rem", padding: "0.2rem 0.75rem",
                          color: "#a3e635", fontSize: "0.8rem", fontWeight: 800,
                        }}>
                          {group.label}
                        </span>
                        <span style={{ color: "#555", fontSize: "0.75rem" }}>
                          {group.runners.length} {group.runners.length === 1 ? "runner" : "runners"}
                        </span>
                      </div>
                      {/* Lista de runners */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", paddingLeft: "0.5rem" }}>
                        {group.runners.map((g) => (
                          <div key={g.id} style={{
                            display: "flex", alignItems: "center", gap: "0.6rem",
                            padding: "0.5rem 0.75rem", background: "#1a1a1a",
                            border: "1px solid #252525", borderRadius: "0.5rem",
                          }}>
                            <span style={{ fontSize: "1rem" }}>🏃</span>
                            <div>
                              <p style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
                                {g.runner.full_name || "Sin nombre"}
                              </p>
                              <p style={{ color: "#666", fontSize: "0.75rem", margin: 0 }}>{g.runner.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* ── Archivos adjuntos ── */}
      <div style={card}>
        <div style={cardHeader}>
          <p style={{ color: "white", fontWeight: 700, margin: 0 }}>Archivos del evento</p>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Upload */}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "#1e1e1e", border: "1px dashed #333", borderRadius: "0.5rem",
            padding: "0.6rem 1.1rem", cursor: "pointer", marginBottom: "1rem",
            color: "#888", fontSize: "0.85rem", fontWeight: 600, position: "relative",
          }}>
            {uploadingFile ? "Subiendo..." : "📎 Adjuntar archivo"}
            <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} disabled={uploadingFile} />
          </label>

          {event.race_event_files.length === 0 ? (
            <p style={{ color: "#555", fontSize: "0.85rem" }}>No hay archivos adjuntos.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {event.race_event_files.map((f) => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#1a1a1a", border: "1px solid #252525", borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1rem" }}>📄</span>
                    {f.signedUrl ? (
                      <a href={f.signedUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#ccc", fontSize: "0.85rem", textDecoration: "none" }}>
                        {f.file_name}
                      </a>
                    ) : (
                      <span style={{ color: "#ccc", fontSize: "0.85rem" }}>{f.file_name}</span>
                    )}
                  </div>
                  <button onClick={() => deleteFile(f.id)} style={{
                    background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: "0.9rem",
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
