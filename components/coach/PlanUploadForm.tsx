"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface PlanUploadFormProps {
  teamId: string;
  runnerId: string;
}

const MAX_SIZE = 10 * 1024 * 1024;

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#888",
  fontSize: "0.78rem",
  fontWeight: 600,
  marginBottom: "0.4rem",
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
};

export function PlanUploadForm({ teamId, runnerId }: PlanUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [planMonth, setPlanMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Seleccioná un archivo PDF"); return; }
    if (!planMonth) { toast.error("Seleccioná el mes del plan"); return; }
    if (file.size > MAX_SIZE) { toast.error("El archivo no puede superar los 10 MB"); return; }

    setLoading(true);

    const [year, month] = planMonth.split("-");
    const storagePath = `${teamId}/${runnerId}/${year}-${month}.pdf`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from("training-plans")
      .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

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
        runner_id: runnerId,
        plan_month: `${year}-${month}-01`,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        notes: notes.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Error al guardar el plan");
      setLoading(false);
      return;
    }

    toast.success("Plan subido correctamente ✓");
    setPlanMonth("");
    setNotes("");
    setFile(null);
    (document.getElementById("plan-file-input") as HTMLInputElement).value = "";
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Mes del plan */}
      <div>
        <label style={labelStyle}>Mes del plan</label>
        <input
          type="month"
          value={planMonth}
          onChange={(e) => setPlanMonth(e.target.value)}
          required
          style={{
            ...inputStyle,
            colorScheme: "dark",
          }}
        />
      </div>

      {/* Archivo PDF */}
      <div>
        <label style={labelStyle}>Archivo PDF</label>
        <div style={{
          border: `2px dashed ${file ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
          borderRadius: "0.625rem",
          padding: "1.25rem",
          textAlign: "center",
          cursor: "pointer",
          background: file ? "rgba(163,230,53,0.04)" : "transparent",
          transition: "all 0.15s",
          position: "relative",
        }}>
          <input
            id="plan-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
          />
          {file ? (
            <div>
              <p style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>📄 {file.name}</p>
              <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.25rem 0 0 0" }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>Arrastrá o hacé click para seleccionar</p>
              <p style={{ color: "#444", fontSize: "0.75rem", margin: "0.25rem 0 0 0" }}>PDF · máx. 10 MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label style={labelStyle}>Notas <span style={{ color: "#555", fontWeight: 400, textTransform: "none" }}>(opcional)</span></label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones del plan..."
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !file || !planMonth}
        style={{
          background: loading || !file || !planMonth ? "#1a1a1a" : "#a3e635",
          color: loading || !file || !planMonth ? "#444" : "#000",
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          fontSize: "0.875rem",
          fontWeight: 700,
          cursor: loading || !file || !planMonth ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          marginTop: "0.25rem",
        }}
      >
        {loading ? "Subiendo..." : "Subir plan"}
      </button>
    </form>
  );
}
