"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DeleteTeamButtonProps {
  teamId: string;
  teamName: string;
  runnerCount: number;
}

export function DeleteTeamButton({ teamId, teamName, runnerCount }: DeleteTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Equipo eliminado");
      router.push("/coach/teams");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al eliminar el equipo");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botón disparador */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px solid #3a1a1a",
          borderRadius: "0.5rem",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          color: "#f87171",
          cursor: "pointer",
          fontWeight: 600,
          transition: "all 0.15s",
        }}
      >
        🗑 Eliminar equipo
      </button>

      {/* Dialog de confirmación */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
        }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "26rem",
              width: "90%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícono */}
            <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "1rem" }}>⚠️</div>

            <h2 style={{ color: "white", fontSize: "1.15rem", fontWeight: 800, textAlign: "center", marginBottom: "0.75rem" }}>
              ¿Eliminar &quot;{teamName}&quot;?
            </h2>

            {/* Advertencia si tiene runners */}
            {runnerCount > 0 && (
              <div style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: "0.625rem",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "#fbbf24",
                lineHeight: 1.5,
              }}>
                ⚠️ Este equipo tiene <strong>{runnerCount} runner{runnerCount !== 1 ? "s" : ""}</strong> asociado{runnerCount !== 1 ? "s" : ""}. Al eliminarlo, también se borrarán sus membresías y planes de entrenamiento.
              </div>
            )}

            <p style={{ color: "#888", fontSize: "0.875rem", textAlign: "center", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Esta acción es <strong style={{ color: "#f87171" }}>irreversible</strong> y eliminará todos los datos del equipo.
            </p>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "0.5rem",
                  padding: "0.625rem",
                  color: "#aaa",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? "#3a1a1a" : "#dc2626",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.625rem",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {loading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
