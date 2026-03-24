"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  coachId: string;
  currentStatus: string;
}

/* ── Modal de confirmación ── */
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#111", border: "1px solid #2a2a2a",
        borderRadius: "1rem", padding: "2rem",
        maxWidth: "22rem", width: "90%",
        boxShadow: "0 0 40px rgba(0,0,0,0.6)",
      }}>
        <p style={{ color: "white", fontSize: "0.95rem", fontWeight: 600, margin: "0 0 1.5rem 0", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "transparent", border: "1px solid #333",
              borderRadius: "0.5rem", padding: "0.5rem 1.25rem",
              color: "#888", fontSize: "0.85rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: loading ? "#1e1e1e" : "rgba(251,146,60,0.15)",
              border: "1px solid rgba(251,146,60,0.4)",
              borderRadius: "0.5rem", padding: "0.5rem 1.25rem",
              color: loading ? "#555" : "#fb923c",
              fontSize: "0.85rem", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CoachActionButtons({ coachId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"suspended" | "rejected" | null>(null);

  async function updateStatus(newStatus: "approved" | "rejected" | "suspended") {
    setConfirm(null);
    setLoading(newStatus);

    const res = await fetch(`/api/admin/coaches/${coachId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Error al actualizar");
      setLoading(null);
      return;
    }

    const messages: Record<string, string> = {
      approved:  "Entrenador activado ✓",
      rejected:  "Solicitud rechazada",
      suspended: "Entrenador suspendido",
    };
    toast.success(messages[newStatus] ?? "Estado actualizado");
    router.refresh();
    setLoading(null);
  }

  // Pending: Aprobar + Rechazar
  if (currentStatus === "pending") {
    return (
      <>
        {confirm === "rejected" && (
          <ConfirmModal
            message="¿Rechazar esta solicitud? Esta acción no se puede deshacer."
            onConfirm={() => updateStatus("rejected")}
            onCancel={() => setConfirm(null)}
            loading={loading === "rejected"}
          />
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <button
            onClick={() => updateStatus("approved")}
            disabled={loading !== null}
            style={{
              background: loading === "approved" ? "#1e1e1e" : "rgba(163,230,53,0.1)",
              border: "1px solid rgba(163,230,53,0.35)",
              borderRadius: "0.5rem",
              padding: "0.45rem 1rem",
              color: loading === "approved" ? "#555" : "#a3e635",
              fontSize: "0.8rem", fontWeight: 700,
              cursor: loading !== null ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading === "approved" ? "…" : "✓ Aprobar"}
          </button>
          <button
            onClick={() => setConfirm("rejected")}
            disabled={loading !== null}
            style={{
              background: loading === "rejected" ? "#1e1e1e" : "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "0.5rem",
              padding: "0.45rem 1rem",
              color: loading === "rejected" ? "#555" : "#f87171",
              fontSize: "0.8rem", fontWeight: 700,
              cursor: loading !== null ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading === "rejected" ? "…" : "✕ Rechazar"}
          </button>
        </div>
      </>
    );
  }

  // Approved: solo Suspender
  if (currentStatus === "approved") {
    return (
      <>
        {confirm === "suspended" && (
          <ConfirmModal
            message="¿Suspender este entrenador? No podrá acceder a la plataforma hasta que sea reactivado."
            onConfirm={() => updateStatus("suspended")}
            onCancel={() => setConfirm(null)}
            loading={loading === "suspended"}
          />
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <button
            onClick={() => setConfirm("suspended")}
            disabled={loading !== null}
            style={{
              background: loading === "suspended" ? "#1e1e1e" : "rgba(251,146,60,0.08)",
              border: "1px solid rgba(251,146,60,0.25)",
              borderRadius: "0.5rem",
              padding: "0.45rem 1rem",
              color: loading === "suspended" ? "#555" : "#fb923c",
              fontSize: "0.8rem", fontWeight: 700,
              cursor: loading !== null ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading === "suspended" ? "…" : "⏸ Suspender"}
          </button>
        </div>
      </>
    );
  }

  // Suspended: solo Reactivar
  if (currentStatus === "suspended") {
    return (
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          onClick={() => updateStatus("approved")}
          disabled={loading !== null}
          style={{
            background: loading === "approved" ? "#1e1e1e" : "rgba(163,230,53,0.08)",
            border: "1px solid rgba(163,230,53,0.25)",
            borderRadius: "0.5rem",
            padding: "0.45rem 1rem",
            color: loading === "approved" ? "#555" : "#a3e635",
            fontSize: "0.8rem", fontWeight: 700,
            cursor: loading !== null ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading === "approved" ? "…" : "▶ Reactivar"}
        </button>
      </div>
    );
  }

  // Rejected: sin acciones
  return null;
}
