"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  coachId: string;
  currentStatus: string;
}

export function ApproveRejectButtons({ coachId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function updateStatus(newStatus: "approved" | "rejected") {
    setLoading(newStatus === "approved" ? "approve" : "reject");

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

    toast.success(
      newStatus === "approved"
        ? "Entrenador aprobado ✓"
        : "Solicitud rechazada"
    );
    router.refresh();
    setLoading(null);
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
      {currentStatus !== "approved" && (
        <button
          onClick={() => updateStatus("approved")}
          disabled={loading !== null}
          style={{
            background: loading === "approve" ? "#1e1e1e" : "rgba(163,230,53,0.1)",
            border: "1px solid rgba(163,230,53,0.35)",
            borderRadius: "0.5rem",
            padding: "0.45rem 1rem",
            color: loading === "approve" ? "#555" : "#a3e635",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: loading !== null ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading === "approve" ? "..." : "✓ Aprobar"}
        </button>
      )}

      {currentStatus !== "rejected" && (
        <button
          onClick={() => updateStatus("rejected")}
          disabled={loading !== null}
          style={{
            background: loading === "reject" ? "#1e1e1e" : "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "0.5rem",
            padding: "0.45rem 1rem",
            color: loading === "reject" ? "#555" : "#f87171",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: loading !== null ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading === "reject" ? "..." : "✕ Rechazar"}
        </button>
      )}

      {currentStatus !== "pending" && (
        <button
          onClick={() => updateStatus("rejected")}
          disabled
          style={{
            background: "transparent",
            border: "1px solid #222",
            borderRadius: "0.5rem",
            padding: "0.45rem 0.875rem",
            color: "#444",
            fontSize: "0.8rem",
            cursor: "default",
          }}
        >
          —
        </button>
      )}
    </div>
  );
}
