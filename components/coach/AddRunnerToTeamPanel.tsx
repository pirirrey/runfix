"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PoolRunner = {
  id: string;
  full_name: string | null;
  email: string;
  current_team_name: string | null;
};

interface Props {
  teamId: string;
  poolRunners: PoolRunner[]; // runners del coach que NO están en el equipo
}

export function AddRunnerToTeamPanel({ teamId, poolRunners }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);

  if (poolRunners.length === 0) {
    return (
      <div style={{ padding: "1rem 1.75rem", color: "#555", fontSize: "0.82rem" }}>
        Todos los runners de tu pool ya están en este equipo, o no tenés runners asociados aún.{" "}
        <a href="/coach/runners" style={{ color: "#a3e635", textDecoration: "none" }}>
          Ir a Mis Runners →
        </a>
      </div>
    );
  }

  const handleAdd = async (runnerId: string) => {
    setAdding(runnerId);
    const res = await fetch(`/api/coach/runners/${runnerId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 200) {
      toast.error(data.error ?? "Error al agregar runner");
    } else {
      toast.success("Runner agregado al equipo");
      router.refresh();
    }
    setAdding(null);
  };

  return (
    <div style={{ padding: "1rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {poolRunners.map((runner) => (
        <div
          key={runner.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.6rem 0.85rem",
            background: "#1a1a1a",
            borderRadius: "0.5rem",
            border: "1px solid #252525",
          }}
        >
          <div>
            <p style={{ color: "#ccc", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
              {runner.full_name || "Sin nombre"}
            </p>
            <p style={{ color: "#666", fontSize: "0.78rem", margin: "0.1rem 0 0 0" }}>{runner.email}</p>
            {runner.current_team_name ? (
              <span style={{
                display: "inline-block", marginTop: "0.3rem",
                background: "rgba(163,230,53,0.07)", border: "1px solid rgba(163,230,53,0.2)",
                borderRadius: "2rem", padding: "0.1rem 0.55rem",
                color: "#7aad28", fontSize: "0.7rem", fontWeight: 600,
              }}>
                📋 {runner.current_team_name}
              </span>
            ) : (
              <span style={{
                display: "inline-block", marginTop: "0.3rem",
                background: "rgba(255,255,255,0.03)", border: "1px solid #2a2a2a",
                borderRadius: "2rem", padding: "0.1rem 0.55rem",
                color: "#444", fontSize: "0.7rem", fontWeight: 600,
              }}>
                Sin equipo
              </span>
            )}
          </div>
          <button
            onClick={() => handleAdd(runner.id)}
            disabled={adding === runner.id}
            style={{
              background: "rgba(163,230,53,0.1)",
              border: "1px solid rgba(163,230,53,0.3)",
              borderRadius: "0.4rem",
              color: "#a3e635",
              padding: "0.35rem 0.85rem",
              cursor: adding === runner.id ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: adding === runner.id ? 0.6 : 1,
            }}
          >
            {adding === runner.id ? "Agregando..." : "+ Agregar"}
          </button>
        </div>
      ))}
    </div>
  );
}
