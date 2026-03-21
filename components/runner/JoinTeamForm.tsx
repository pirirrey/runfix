"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CoachPreview = {
  valid: boolean;
  coach_name: string | null;
  logo_url: string | null;
};

type AssociatedCoach = {
  id: string;
  joined_at: string;
  coach: {
    id: string;
    full_name: string | null;
    email: string;
    team_name: string | null;
    team_location: string | null;
  };
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "0.5rem",
  padding: "0.75rem 1rem",
  color: "white",
  fontSize: "1.1rem",
  fontFamily: "monospace",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  textAlign: "center",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export function JoinTeamForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<CoachPreview | null>(null);
  const [validating, setValidating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [coaches, setCoaches] = useState<AssociatedCoach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);

  const loadCoaches = useCallback(async () => {
    setLoadingCoaches(true);
    const res = await fetch("/api/runner/coaches");
    if (res.ok) {
      const data = await res.json();
      setCoaches(data.coaches ?? []);
    }
    setLoadingCoaches(false);
  }, []);

  useEffect(() => { loadCoaches(); }, [loadCoaches]);

  useEffect(() => {
    if (code.length < 6) { setPreview(null); return; }
    const timer = setTimeout(async () => {
      setValidating(true);
      const res = await fetch(`/api/coaches/validate-code?code=${encodeURIComponent(code)}`);
      const data = await res.json().catch(() => ({ valid: false }));
      setPreview(data);
      setValidating(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  async function handleJoin() {
    if (!preview?.valid) return;
    setJoining(true);
    const res = await fetch("/api/coaches/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: code.toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Error al asociarse");
      setJoining(false);
      return;
    }
    toast.success(`Te asociaste con ${preview.coach_name ?? "el entrenador"} 🎉`);
    setCode("");
    setPreview(null);
    await loadCoaches();
    router.refresh();
    setJoining(false);
  }

  return (
    <div style={{ width: "100%", maxWidth: "32rem" }}>

      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
          Mis Running Teams
        </h2>
        {loadingCoaches ? (
          <div style={{ color: "#555", fontSize: "0.85rem" }}>Cargando...</div>
        ) : coaches.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏃</div>
            <p style={{ color: "#555", fontSize: "0.85rem" }}>Todavía no estás asociado a ningún running team.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {coaches.map((cr) => (
              <div key={cr.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", flexShrink: 0, background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                  🎯
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>
                    {cr.coach.team_name || cr.coach.full_name || "Entrenador"}
                  </p>
                  {cr.coach.team_location && (
                    <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.1rem 0 0 0" }}>📍 {cr.coach.team_location}</p>
                  )}
                </div>
                <span style={{ color: "#555", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                  Desde {new Date(cr.joined_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #1e1e1e", marginBottom: "2rem" }} />

      <div>
        <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.35rem" }}>
          Asociarse a un Running Team
        </h2>
        <p style={{ color: "#666", fontSize: "0.82rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Pedile el código a tu entrenador. Podés estar en más de un running team.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ position: "relative" }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="A1B2C3D4"
              maxLength={8}
              style={{
                ...inputStyle,
                border: preview ? (preview.valid ? "1px solid rgba(163,230,53,0.5)" : "1px solid rgba(248,113,113,0.5)") : "1px solid #2a2a2a",
              }}
            />
            {validating && (
              <div style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: "0.75rem" }}>…</div>
            )}
          </div>

          {preview && !validating && (
            <div style={{
              borderRadius: "0.75rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem",
              background: preview.valid ? "rgba(163,230,53,0.06)" : "rgba(248,113,113,0.06)",
              border: `1px solid ${preview.valid ? "rgba(163,230,53,0.2)" : "rgba(248,113,113,0.2)"}`,
            }}>
              {preview.valid && preview.logo_url ? (
                <img
                  src={preview.logo_url}
                  alt="Logo"
                  style={{ width: "3rem", height: "3rem", borderRadius: "0.5rem", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{preview.valid ? "🎯" : "❌"}</span>
              )}
              <div>
                <p style={{ color: preview.valid ? "#a3e635" : "#f87171", fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>
                  {preview.valid ? (preview.coach_name ?? "Running Team encontrado") : "Código inválido"}
                </p>
                {preview.valid && (
                  <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
                    Confirmá para asociarte a este running team
                  </p>
                )}
                {!preview.valid && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", margin: "0.2rem 0 0 0", opacity: 0.8 }}>
                    Verificá el código con tu entrenador
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={!preview?.valid || joining}
            style={{
              background: preview?.valid && !joining ? "#a3e635" : "#1a1a1a",
              color: preview?.valid && !joining ? "#000" : "#444",
              border: "none", borderRadius: "0.5rem", padding: "0.75rem",
              fontSize: "0.9rem", fontWeight: 700,
              cursor: preview?.valid && !joining ? "pointer" : "not-allowed",
              transition: "all 0.15s", marginTop: "0.25rem",
            }}
          >
            {joining ? "Asociando..." : "Asociarme a este Running Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
