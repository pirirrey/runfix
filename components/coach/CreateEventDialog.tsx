"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.65rem 0.875rem", color: "white", fontSize: "0.875rem",
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: "0.75rem", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.07em",
};

// Distancias comunes como accesos rápidos
const QUICK_DISTANCES = ["5k", "10k", "21k", "42k", "50k", "70k", "100k", "100mi"];

export function CreateEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", location: "", race_type: "trail" as "street" | "trail",
    start_date: "", end_date: "", discount_code: "", notes: "",
  });
  const [distances, setDistances] = useState<string[]>([]);
  const [distInput, setDistInput] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addDistance = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed || distances.includes(trimmed)) return;
    setDistances((d) => [...d, trimmed]);
    setDistInput("");
  };

  const removeDistance = (label: string) =>
    setDistances((d) => d.filter((x) => x !== label));

  const handleDistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDistance(distInput);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ name: "", location: "", race_type: "trail", start_date: "", end_date: "", discount_code: "", notes: "" });
    setDistances([]);
    setDistInput("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error("Completá nombre y fechas"); return;
    }
    if (form.end_date < form.start_date) {
      toast.error("La fecha de fin no puede ser anterior a la de inicio"); return;
    }
    setLoading(true);

    // 1. Crear evento
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        location: form.location || null,
        race_type: form.race_type,
        start_date: form.start_date,
        end_date: form.end_date,
        discount_code: form.discount_code || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Error al crear"); setLoading(false); return; }

    const eventId = data.event.id;

    // 2. Agregar distancias
    await Promise.all(
      distances.map((label) =>
        fetch(`/api/events/${eventId}/distances`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        })
      )
    );

    toast.success("Evento creado");
    handleClose();
    router.push(`/coach/events/${eventId}`);
    router.refresh();
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "#a3e635", color: "#000", border: "none", borderRadius: "0.625rem",
          padding: "0.65rem 1.25rem", fontWeight: 700, fontSize: "0.875rem",
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <span>+</span> Nuevo evento
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }} onClick={handleClose}>
          <div style={{
            background: "#141414", border: "1px solid #222", borderRadius: "1rem",
            padding: "2rem", width: "100%", maxWidth: "32rem", maxHeight: "92vh", overflowY: "auto",
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "white", fontWeight: 800, fontSize: "1.2rem", margin: "0 0 1.5rem 0" }}>
              🏁 Nuevo evento
            </h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Nombre */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={labelStyle}>Nombre del evento *</label>
                <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Ultra Trail Mendoza 2026" required />
              </div>

              {/* Localidad */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={labelStyle}>Localidad</label>
                <input style={inputStyle} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Mendoza, Argentina" />
              </div>

              {/* Tipo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={labelStyle}>Tipo de carrera *</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {(["trail", "street"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => set("race_type", t)} style={{
                      flex: 1, padding: "0.6rem", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                      border: form.race_type === t ? "2px solid #a3e635" : "1px solid #333",
                      background: form.race_type === t ? "rgba(163,230,53,0.1)" : "#1a1a1a",
                      color: form.race_type === t ? "#a3e635" : "#888",
                    }}>
                      {t === "trail" ? "🏔 Trail" : "🏙 Calle"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas */}
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

              {/* ── Distancias ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <label style={labelStyle}>Distancias del evento</label>

                {/* Accesos rápidos */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {QUICK_DISTANCES.map((d) => {
                    const added = distances.includes(d);
                    return (
                      <button
                        key={d} type="button"
                        onClick={() => added ? removeDistance(d) : addDistance(d)}
                        style={{
                          padding: "0.25rem 0.7rem", borderRadius: "2rem", fontSize: "0.78rem", fontWeight: 700,
                          cursor: "pointer", transition: "all 0.12s",
                          border: added ? "1px solid #a3e635" : "1px solid #333",
                          background: added ? "rgba(163,230,53,0.15)" : "#1a1a1a",
                          color: added ? "#a3e635" : "#777",
                        }}
                      >
                        {added ? "✓ " : ""}{d}
                      </button>
                    );
                  })}
                </div>

                {/* Input personalizado */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={distInput}
                    onChange={e => setDistInput(e.target.value)}
                    onKeyDown={handleDistKeyDown}
                    placeholder="Otra distancia… ej: 75k, 160k"
                  />
                  <button
                    type="button"
                    onClick={() => addDistance(distInput)}
                    disabled={!distInput.trim()}
                    style={{
                      background: "#222", border: "1px solid #333", borderRadius: "0.5rem",
                      color: "#aaa", padding: "0 0.875rem", cursor: "pointer", fontWeight: 700,
                      fontSize: "0.85rem", flexShrink: 0, opacity: !distInput.trim() ? 0.4 : 1,
                    }}
                  >
                    + Agregar
                  </button>
                </div>

                {/* Tags de distancias agregadas */}
                {distances.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
                    {distances.map((d) => (
                      <span key={d} style={{
                        display: "inline-flex", alignItems: "center", gap: "0.3rem",
                        background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.3)",
                        borderRadius: "2rem", padding: "0.25rem 0.6rem 0.25rem 0.75rem",
                        color: "#a3e635", fontSize: "0.8rem", fontWeight: 700,
                      }}>
                        {d}
                        <button
                          type="button" onClick={() => removeDistance(d)}
                          style={{ background: "none", border: "none", color: "#a3e635", cursor: "pointer", padding: "0", lineHeight: 1, fontSize: "0.85rem" }}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Código descuento */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={labelStyle}>Código descuento del team</label>
                <input style={inputStyle} value={form.discount_code} onChange={e => set("discount_code", e.target.value)} placeholder="Ej: WEPLAN20" />
              </div>

              {/* Notas */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={labelStyle}>Notas / descripción</label>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Info adicional sobre el evento..." />
              </div>

              {/* Botones */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={handleClose} style={{
                  flex: 1, padding: "0.65rem", background: "#1e1e1e", border: "1px solid #333",
                  borderRadius: "0.5rem", color: "#888", cursor: "pointer", fontWeight: 600,
                }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{
                  flex: 1, padding: "0.65rem", background: loading ? "#1a2a0a" : "#a3e635",
                  border: "none", borderRadius: "0.5rem", color: loading ? "#666" : "#000",
                  cursor: loading ? "not-allowed" : "pointer", fontWeight: 700,
                }}>
                  {loading ? "Creando..." : `Crear evento${distances.length > 0 ? ` · ${distances.length} distancia${distances.length > 1 ? "s" : ""}` : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
