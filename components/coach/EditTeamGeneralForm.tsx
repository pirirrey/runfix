"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface EditTeamGeneralFormProps {
  teamId: string;
  initialNotes: string | null;
  initialPdfPath: string | null;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export function EditTeamGeneralForm({ teamId, initialNotes, initialPdfPath }: EditTeamGeneralFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const hasPdf = !!initialPdfPath;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    let pdfPath = initialPdfPath;

    // Subir PDF si se seleccionó uno nuevo
    if (file) {
      if (file.size > MAX_SIZE) {
        toast.error("El archivo no puede superar los 20 MB");
        setLoading(false);
        return;
      }
      const storagePath = `${teamId}/general/plan-general.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("training-plans")
        .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) {
        toast.error(`Error al subir el archivo: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      pdfPath = storagePath;
    }

    // Actualizar notas y path en DB
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ general_notes: notes, team_pdf_path: pdfPath }),
    });

    if (res.ok) {
      toast.success("Información del equipo actualizada");
      setFile(null);
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Notas generales */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ color: "#aaa", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Indicaciones generales
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Recordad hidratarse antes de cada sesión. El foco de este mes es la resistencia aeróbica..."
            rows={5}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "0.625rem",
              padding: "0.875rem",
              color: "white",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* PDF general */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ color: "#aaa", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            PDF del equipo {hasPdf && <span style={{ color: "#a3e635", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>✓ Ya tiene un PDF cargado</span>}
          </label>
          <div style={{
            background: "#1a1a1a",
            border: "2px dashed #2a2a2a",
            borderRadius: "0.625rem",
            padding: "1.25rem",
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
          }}>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
            />
            {file ? (
              <div>
                <p style={{ color: "#a3e635", fontSize: "0.875rem", fontWeight: 600 }}>📄 {file.name}</p>
                <p style={{ color: "#666", fontSize: "0.75rem", marginTop: "0.25rem" }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p style={{ color: "#666", fontSize: "0.875rem" }}>
                  {hasPdf ? "Hacé click para reemplazar el PDF" : "Hacé click para subir un PDF"}
                </p>
                <p style={{ color: "#444", fontSize: "0.75rem", marginTop: "0.25rem" }}>Máximo 20 MB</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#1a2a0a" : "#a3e635",
            color: loading ? "#666" : "#000",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.7rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            alignSelf: "flex-start",
          }}
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
