"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Runner = {
  id: string;
  full_name: string | null;
  email: string;
};

type CoachRunner = {
  id: string;
  joined_at: string;
  runner: Runner;
};

type Team = {
  id: string;
  name: string;
};

type RunnerWithTeams = CoachRunner & {
  assignedTeams: string[]; // team_ids asignados
  assigning: boolean;
};

const card: React.CSSProperties = {
  background: "#161616",
  border: "1px solid #222",
  borderRadius: "0.75rem",
  padding: "1.25rem 1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

export default function CoachRunnersPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [runners, setRunners] = useState<RunnerWithTeams[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Invite code del coach
    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_code")
      .eq("id", user.id)
      .single();
    if (profile?.invite_code) setInviteCode(profile.invite_code);

    // Equipos del coach
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name");
    setTeams(teamsData ?? []);

    // Runners del coach
    const { data: coachRunners } = await supabase
      .from("coach_runners")
      .select(`id, joined_at, runner:profiles!coach_runners_runner_id_fkey(id, full_name, email)`)
      .eq("coach_id", user.id)
      .order("joined_at", { ascending: false }) as { data: CoachRunner[] | null };

    if (!coachRunners) { setLoading(false); return; }

    // Membresías actuales
    const runnerIds = coachRunners.map((cr) => cr.runner.id);
    let memberships: { team_id: string; runner_id: string }[] = [];
    if (runnerIds.length > 0) {
      const { data: mem } = await supabase
        .from("team_memberships")
        .select("team_id, runner_id")
        .in("runner_id", runnerIds);
      memberships = mem ?? [];
    }

    const withTeams: RunnerWithTeams[] = coachRunners.map((cr) => ({
      ...cr,
      assignedTeams: memberships
        .filter((m) => m.runner_id === cr.runner.id)
        .map((m) => m.team_id),
      assigning: false,
    }));

    setRunners(withTeams);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggleTeam = async (runnerId: string, teamId: string, isAssigned: boolean) => {
    setRunners((prev) =>
      prev.map((r) => r.runner.id === runnerId ? { ...r, assigning: true } : r)
    );

    if (isAssigned) {
      await fetch(`/api/coach/runners/${runnerId}/teams?team_id=${teamId}`, {
        method: "DELETE",
      });
    } else {
      await fetch(`/api/coach/runners/${runnerId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
    }

    await load();
  };

  const removeRunner = async (runnerId: string) => {
    if (!confirm("¿Eliminar a este runner de tu pool? Perderá acceso a todos tus equipos.")) return;

    // Primero desasignar de todos los equipos
    const runner = runners.find((r) => r.runner.id === runnerId);
    if (runner) {
      for (const teamId of runner.assignedTeams) {
        await fetch(`/api/coach/runners/${runnerId}/teams?team_id=${teamId}`, { method: "DELETE" });
      }
    }

    // Eliminar de coach_runners
    await supabase.from("coach_runners").delete()
      .eq("runner_id", runnerId);
    await load();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateCode = async () => {
    if (!confirm("¿Regenerar el código? El código anterior dejará de funcionar y los runners que aún no se registraron necesitarán el nuevo.")) return;
    setRegenerating(true);
    const res = await fetch("/api/coach/invite-code", { method: "POST" });
    const data = await res.json();
    if (res.ok && data.invite_code) {
      setInviteCode(data.invite_code);
    }
    setRegenerating(false);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", marginBottom: "0.25rem" }}>
          🏃 Mis Runners
        </h1>
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          Runners asociados a vos. Asignales equipos desde acá.
        </p>
      </div>

      {/* Tu código de invitación */}
      <div style={{
        background: "#111",
        border: "1px solid #2a2a2a",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <p style={{ color: "#666", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>
            Tu código de entrenador
          </p>
          {/* Código en caja propia con alto contraste */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#0a0a0a",
            border: "2px solid #a3e635",
            borderRadius: "0.5rem",
            padding: "0.5rem 1.25rem",
            marginBottom: "0.5rem",
          }}>
            <span style={{
              color: "#a3e635",
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.25em",
              fontFamily: "monospace",
              lineHeight: 1,
            }}>
              {inviteCode || "—"}
            </span>
          </div>
          <p style={{ color: "#555", fontSize: "0.78rem", marginTop: "0.25rem" }}>
            Compartí este código con tus runners para que se asocien a vos
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={copyCode}
            style={{
              background: copied ? "rgba(163,230,53,0.15)" : "#1a1a1a",
              border: copied ? "1px solid #a3e635" : "1px solid #333",
              borderRadius: "0.5rem",
              color: copied ? "#a3e635" : "#ccc",
              padding: "0.6rem 1.25rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copiado" : "📋 Copiar"}
          </button>
          <button
            onClick={regenerateCode}
            disabled={regenerating}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: "0.5rem",
              color: regenerating ? "#444" : "#666",
              padding: "0.5rem 1.25rem",
              cursor: regenerating ? "not-allowed" : "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {regenerating ? "Regenerando…" : "🔄 Regenerar"}
          </button>
        </div>
      </div>

      {/* Lista de runners */}
      {loading ? (
        <div style={{ color: "#666", textAlign: "center", padding: "3rem" }}>Cargando...</div>
      ) : runners.length === 0 ? (
        <div style={{ ...card, alignItems: "center", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>🏃</div>
          <p style={{ color: "#888", fontSize: "0.95rem" }}>
            Todavía no tenés runners asociados.
          </p>
          <p style={{ color: "#555", fontSize: "0.82rem" }}>
            Compartí tu código de entrenador para que puedan unirse.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {runners.map((cr) => (
            <div key={cr.id} style={card}>
              {/* Runner info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>
                    {cr.runner.full_name || "Sin nombre"}
                  </p>
                  <p style={{ color: "#888", fontSize: "0.82rem" }}>{cr.runner.email}</p>
                  <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    Se unió el {new Date(cr.joined_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <button
                  onClick={() => removeRunner(cr.runner.id)}
                  style={{
                    background: "transparent",
                    border: "1px solid #3a1a1a",
                    borderRadius: "0.4rem",
                    color: "#e05252",
                    padding: "0.35rem 0.75rem",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                  }}
                >
                  Quitar del pool
                </button>
              </div>

              {/* Asignación de equipos */}
              {teams.length === 0 ? (
                <p style={{ color: "#555", fontSize: "0.8rem" }}>
                  No tenés equipos creados aún.
                </p>
              ) : (
                <div>
                  <p style={{ color: "#666", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                    Equipos asignados
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {teams.map((team) => {
                      const isAssigned = cr.assignedTeams.includes(team.id);
                      return (
                        <button
                          key={team.id}
                          onClick={() => toggleTeam(cr.runner.id, team.id, isAssigned)}
                          disabled={cr.assigning}
                          style={{
                            padding: "0.3rem 0.85rem",
                            borderRadius: "2rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: cr.assigning ? "not-allowed" : "pointer",
                            opacity: cr.assigning ? 0.6 : 1,
                            transition: "all 0.15s",
                            background: isAssigned ? "rgba(163,230,53,0.15)" : "#1e1e1e",
                            border: isAssigned ? "1px solid #a3e635" : "1px solid #333",
                            color: isAssigned ? "#a3e635" : "#777",
                          }}
                        >
                          {isAssigned ? "✓ " : "+ "}{team.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
