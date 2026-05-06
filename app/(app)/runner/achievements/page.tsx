"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

type Achievement = {
  id: string;
  race_name: string;
  race_date: string;
  distance_label: string | null;
  finish_time: string | null;
  position_general: number | null;
  total_general: number | null;
  position_category: number | null;
  total_category: number | null;
  category_name: string | null;
  certificate_path: string | null;
  photo_path: string | null;
  photo_url: string | null;
  cert_url: string | null;
  notes: string | null;
  created_at: string;
};

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function ordinal(n: number) {
  return `${n}°`;
}

const emptyForm = {
  race_name: "", race_date: "", distance_label: "",
  finish_time: "", position_general: "", total_general: "",
  position_category: "", total_category: "", category_name: "",
  notes: "",
};

export default function AchievementsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/runner/achievements");
    if (res.ok) setAchievements(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(k: keyof typeof emptyForm, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function uploadFile(file: File, prefix: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `achievements/${user!.id}/${Date.now()}_${prefix}.${ext}`;
    const { error } = await supabase.storage.from("training-plans").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return path;
  }

  async function handleSubmit() {
    if (!form.race_name.trim() || !form.race_date) {
      toast.error("El nombre y la fecha son obligatorios");
      return;
    }
    setSaving(true);
    try {
      let certificate_path: string | null = null;
      let photo_path: string | null = null;
      if (certFile)  certificate_path = await uploadFile(certFile, "cert");
      if (photoFile) photo_path        = await uploadFile(photoFile, "photo");

      const res = await fetch("/api/runner/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race_name:         form.race_name.trim(),
          race_date:         form.race_date,
          distance_label:    form.distance_label.trim()    || null,
          finish_time:       form.finish_time.trim()       || null,
          position_general:  form.position_general         || null,
          total_general:     form.total_general            || null,
          position_category: form.position_category        || null,
          total_category:    form.total_category           || null,
          category_name:     form.category_name.trim()     || null,
          notes:             form.notes.trim()             || null,
          certificate_path, photo_path,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("¡Logro registrado!");
      setShowForm(false);
      setForm(emptyForm);
      setCertFile(null);
      setPhotoFile(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este logro?")) return;
    setDeleting(id);
    const res = await fetch(`/api/runner/achievements/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Logro eliminado"); await load(); }
    else toast.error("Error al eliminar");
    setDeleting(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "0.45rem", padding: "0.5rem 0.75rem", color: "white",
    fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
    <main style={{ padding: "2rem", maxWidth: "52rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ color: "white", fontSize: "1.6rem", fontWeight: 900, margin: 0 }}>🏆 Mis Logros</h1>
          <p style={{ color: "#555", fontSize: "0.875rem", marginTop: "0.3rem" }}>
            Tus resultados de carrera
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: "#a3e635", border: "none", borderRadius: "0.5rem", color: "#000", fontWeight: 700, fontSize: "0.875rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}
        >
          {showForm ? "Cancelar" : "+ Registrar logro"}
        </button>
      </div>

      {/* Formulario nuevo logro */}
      {showForm && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#a3e635", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>
            Nuevo logro
          </p>

          {/* Nombre + fecha */}
          <div className="grid-2-to-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={labelStyle}>Nombre de la carrera *</label>
              <input value={form.race_name} onChange={e => setField("race_name", e.target.value)} placeholder="Maratón de Buenos Aires" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha *</label>
              <input type="date" value={form.race_date} onChange={e => setField("race_date", e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
          </div>

          {/* Distancia + tiempo */}
          <div className="grid-2-to-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={labelStyle}>Distancia</label>
              <input value={form.distance_label} onChange={e => setField("distance_label", e.target.value)} placeholder="42K, 21K, 10K..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tiempo final</label>
              <input value={form.finish_time} onChange={e => setField("finish_time", e.target.value)} placeholder="3:45:22" style={inputStyle} />
            </div>
          </div>

          {/* Posición general */}
          <p style={{ color: "#444", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Posición general</p>
          <div className="grid-2-to-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={labelStyle}>Posición</label>
              <input type="number" min="1" value={form.position_general} onChange={e => setField("position_general", e.target.value)} placeholder="42" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Total de participantes</label>
              <input type="number" min="1" value={form.total_general} onChange={e => setField("total_general", e.target.value)} placeholder="850" style={inputStyle} />
            </div>
          </div>

          {/* Posición por categoría */}
          <p style={{ color: "#444", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Posición por categoría</p>
          <div className="grid-3-to-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <div>
              <label style={labelStyle}>Categoría</label>
              <input value={form.category_name} onChange={e => setField("category_name", e.target.value)} placeholder="M35-39" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Posición</label>
              <input type="number" min="1" value={form.position_category} onChange={e => setField("position_category", e.target.value)} placeholder="3" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Total en categoría</label>
              <input type="number" min="1" value={form.total_category} onChange={e => setField("total_category", e.target.value)} placeholder="45" style={inputStyle} />
            </div>
          </div>

          {/* Archivos */}
          <div className="grid-2-to-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "0.875rem" }}>
            <FileDropZone label="Certificado (PDF/imagen)" file={certFile} onFile={setCertFile} icon="📄" />
            <FileDropZone label="Foto del evento" file={photoFile} onFile={setPhotoFile} icon="📷" />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2} placeholder="Condiciones del día, sensaciones..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); setCertFile(null); setPhotoFile(null); }}
              style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.45rem", color: "#555", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.45rem", color: saving ? "#444" : "#000", padding: "0.5rem 1.5rem", fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Guardando..." : "Guardar logro"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de logros */}
      {loading ? (
        <p style={{ color: "#555", textAlign: "center", marginTop: "3rem" }}>Cargando...</p>
      ) : achievements.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
          <p style={{ color: "#666", fontSize: "0.95rem" }}>Todavía no registraste ningún logro.</p>
          <p style={{ color: "#444", fontSize: "0.82rem", marginTop: "0.3rem" }}>
            Podés crear uno desde el botón de arriba, o convertir un objetivo desde "Mis Objetivos".
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {achievements.map(a => (
            <AchievementCard key={a.id} achievement={a} onDelete={() => handleDelete(a.id)} deleting={deleting === a.id} />
          ))}
        </div>
      )}

    </main>
    </div>
  );
}

/* ── Subcomponentes ──────────────────────────────────────── */

function FileDropZone({ label, file, onFile, icon }: { label: string; file: File | null; onFile: (f: File) => void; icon: string }) {
  return (
    <div>
      <p style={{ color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>{label}</p>
      <label
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.875rem", borderRadius: "0.5rem", cursor: "pointer", border: `1.5px dashed ${file ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`, background: file ? "rgba(163,230,53,0.05)" : "#1a1a1a", minHeight: "4rem" }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      >
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ display: "none" }} />
        {file ? (
          <>
            <span style={{ fontSize: "1.2rem" }}>{icon}</span>
            <span style={{ color: "#a3e635", fontSize: "0.75rem", fontWeight: 700, textAlign: "center", wordBreak: "break-all" }}>{file.name}</span>
            <span style={{ color: "#555", fontSize: "0.68rem" }}>{(file.size / 1024).toFixed(0)} KB · click para cambiar</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "1.2rem" }}>{icon}</span>
            <span style={{ color: "#555", fontSize: "0.75rem", fontWeight: 600 }}>Arrastrá o click</span>
          </>
        )}
      </label>
    </div>
  );
}

function AchievementCard({ achievement: a, onDelete, deleting }: { achievement: Achievement; onDelete: () => void; deleting: boolean }) {
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden" }}>

      {/* Banner foto */}
      {a.photo_url && showPhoto && (
        <div style={{ width: "100%", maxHeight: "14rem", overflow: "hidden" }}>
          <img src={a.photo_url} alt="Foto del evento" style={{ width: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div style={{ padding: "1.25rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.875rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: "1.05rem" }}>{a.race_name}</span>
              {a.distance_label && (
                <span style={{ background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)", color: "#a3e635", fontSize: "0.72rem", fontWeight: 800, padding: "0.1rem 0.55rem", borderRadius: "2rem" }}>
                  {a.distance_label}
                </span>
              )}
            </div>
            <p style={{ color: "#555", fontSize: "0.78rem", margin: 0 }}>📅 {formatDate(a.race_date)}</p>
          </div>
          <button onClick={onDelete} disabled={deleting}
            style={{ background: "transparent", border: "1px solid #2a1a1a", borderRadius: "0.4rem", color: "#664", padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer", flexShrink: 0, opacity: deleting ? 0.5 : 1 }}>
            {deleting ? "..." : "🗑"}
          </button>
        </div>

        {/* Métricas */}
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
          {a.finish_time && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "#555", fontSize: "0.8rem" }}>⏱</span>
              <span style={{ color: "#a3e635", fontWeight: 800, fontSize: "1.15rem" }}>{a.finish_time}</span>
            </div>
          )}
          {a.position_general && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ color: "#555", fontSize: "0.8rem" }}>📍</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{ordinal(a.position_general)}</span>
              {a.total_general && <span style={{ color: "#555", fontSize: "0.78rem" }}>/ {a.total_general.toLocaleString()} general</span>}
            </div>
          )}
          {a.position_category && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ color: "#555", fontSize: "0.8rem" }}>🏅</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{ordinal(a.position_category)}</span>
              {a.total_category && <span style={{ color: "#555", fontSize: "0.78rem" }}>/ {a.total_category}</span>}
              {a.category_name && <span style={{ color: "#888", fontSize: "0.78rem" }}>{a.category_name}</span>}
            </div>
          )}
        </div>

        {a.notes && (
          <p style={{ color: "#555", fontSize: "0.8rem", margin: "0 0 0.875rem 0", lineHeight: 1.5 }}>{a.notes}</p>
        )}

        {/* Acciones */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {a.cert_url && (
            <a href={a.cert_url} target="_blank" rel="noopener noreferrer"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#aaa", fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              📄 Ver certificado
            </a>
          )}
          {a.photo_url && (
            <button onClick={() => setShowPhoto(v => !v)}
              style={{ background: showPhoto ? "rgba(163,230,53,0.1)" : "#1a1a1a", border: `1px solid ${showPhoto ? "rgba(163,230,53,0.3)" : "#2a2a2a"}`, borderRadius: "0.4rem", color: showPhoto ? "#a3e635" : "#aaa", fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.875rem", cursor: "pointer" }}>
              📷 {showPhoto ? "Ocultar foto" : "Ver foto"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
