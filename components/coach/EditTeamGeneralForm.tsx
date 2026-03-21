"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface EditTeamGeneralFormProps {
  teamId: string;
  initialName: string;
  initialDescription: string | null;
  initialNotes: string | null;
  initialPdfPath: string | null;
  teamPdfUrl: string | null;
}

const MAX_SIZE = 20 * 1024 * 1024;

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "0.5rem",
  padding: "0.6rem 0.875rem",
  color: "white",
  fontSize: "0.875rem",
  lineHeight: 1.5,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  display: "block",
  marginBottom: "0.3rem",
};

export function EditTeamGeneralForm({
  teamId,
  initialName,
  initialDescription,
  initialNotes,
  initialPdfPath,
  teamPdfUrl,
}: EditTeamGeneralFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Cerrar popover de notas al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notesRef.current && !notesRef.current.contains(e.target as Node)) {
        setShowNotes(false);
      }
    }
    if (showNotes) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotes]);

  function handleCancel() {
    setName(initialName);
    setDescription(initialDescription ?? "");
    setNotes(initialNotes ?? "");
    setFile(null);
    setEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    setLoading(true);

    const supabase = createClient();
    let pdfPath = initialPdfPath;

    if (file) {
      if (file.size > MAX_SIZE) { toast.error("El archivo no puede superar los 20 MB"); setLoading(false); return; }
      const storagePath = `${teamId}/general/plan-general.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("training-plans")
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) { toast.error(`Error al subir: ${uploadError.message}`); setLoading(false); return; }
      pdfPath = storagePath;
    }

    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, general_notes: notes, team_pdf_path: pdfPath }),
    });

    if (res.ok) {
      toast.success("Equipo actualizado");
      setFile(null);
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  // ─── MODO VISTA ─────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

        {/* Fila de datos compacta */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>

          {/* Nombre + descripción */}
          <div style={{ flex: 1, minWidth: "12rem" }}>
            <span style={fieldLabelStyle}>Nombre</span>
            <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0 }}>{initialName}</p>
            {initialDescription && (
              <p style={{ color: "#666", fontSize: "0.82rem", margin: "0.2rem 0 0 0" }}>{initialDescription}</p>
            )}
          </div>

          {/* Acciones rápidas: notas + pdf */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.25rem" }}>

            {/* Indicaciones generales — popover */}
            {initialNotes ? (
              <div style={{ position: "relative" }} ref={notesRef}>
                <button
                  onClick={() => setShowNotes((v) => !v)}
                  title="Ver indicaciones generales"
                  style={{
                    background: showNotes ? "rgba(163,230,53,0.12)" : "#1a1a1a",
                    border: `1px solid ${showNotes ? "rgba(163,230,53,0.3)" : "#2a2a2a"}`,
                    borderRadius: "0.5rem",
                    padding: "0.45rem 0.75rem",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    fontSize: "0.8rem", color: showNotes ? "#a3e635" : "#888",
                    transition: "all 0.15s",
                  }}
                >
                  <span>📝</span>
                  <span style={{ fontWeight: 600 }}>Indicaciones</span>
                </button>

                {/* Popover */}
                {showNotes && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 0.5rem)", right: 0, zIndex: 50,
                    background: "#161616", border: "1px solid #2a2a2a", borderRadius: "0.75rem",
                    padding: "1.25rem", width: "22rem", maxWidth: "90vw",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}>
                    <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.75rem 0" }}>
                      Indicaciones generales
                    </p>
                    <p style={{ color: "#ccc", fontSize: "0.85rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                      {initialNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* PDF — icono para abrir */}
            {teamPdfUrl && (
              <a
                href={teamPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver PDF del equipo"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "0.5rem",
                  padding: "0.45rem 0.75rem",
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  fontSize: "0.8rem", color: "#888", textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <span>📄</span>
                <span style={{ fontWeight: 600 }}>PDF</span>
              </a>
            )}

            {/* Editar */}
            <button
              onClick={() => setEditing(true)}
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "0.5rem",
                padding: "0.45rem 0.875rem",
                color: "#aaa",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.4rem",
                transition: "all 0.15s",
              }}
            >
              ✏️ Editar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MODO EDICIÓN ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

        {/* Nombre */}
        <div>
          <label style={fieldLabelStyle}>Nombre del equipo *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Equipo Montaña A" required style={inputStyle} />
        </div>

        {/* Descripción */}
        <div>
          <label style={fieldLabelStyle}>Descripción <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Grupo de trail avanzado" style={inputStyle} />
        </div>

        {/* Indicaciones generales */}
        <div>
          <label style={fieldLabelStyle}>Indicaciones generales</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Recordad hidratarse antes de cada sesión..."
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* PDF */}
        <div>
          <label style={fieldLabelStyle}>
            PDF del equipo{" "}
            {initialPdfPath && !file && (
              <span style={{ color: "#a3e635", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>✓ Ya cargado</span>
            )}
          </label>
          <div style={{
            border: `2px dashed ${file ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
            borderRadius: "0.5rem", padding: "1rem", textAlign: "center",
            background: file ? "rgba(163,230,53,0.04)" : "transparent",
            position: "relative", cursor: "pointer",
          }}>
            <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
            {file ? (
              <>
                <p style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>📄 {file.name}</p>
                <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>{(file.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <p style={{ color: "#555", fontSize: "0.82rem", margin: 0 }}>
                {initialPdfPath ? "Click para reemplazar el PDF" : "Click para subir un PDF"} · máx. 20 MB
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" onClick={handleCancel}
            style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem", padding: "0.6rem", color: "#666", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ flex: 2, background: loading ? "#1a1a1a" : "#a3e635", color: loading ? "#444" : "#000", border: "none", borderRadius: "0.5rem", padding: "0.6rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem" }}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
