import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateTeamDialog } from "@/components/coach/CreateTeamDialog";
import { TeamMessagePanel } from "@/components/coach/TeamMessagePanel";
import { PLAN_LIMITS, PLANS, type PlanId } from "@/lib/plans";

export default async function CoachTeamsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type TeamRow = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    team_memberships: { count: number }[];
  };

  type PlanRow = {
    id: string;
    team_id: string;
    valid_from: string;
    valid_until: string | null;
    file_name: string | null;
    notes: string | null;
  };

  const { data: profileData } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single<{ subscription_plan: string }>();

  const planId = (profileData?.subscription_plan ?? "starter") as PlanId;
  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.starter;
  const planMeta = PLANS.find(p => p.id === planId) ?? PLANS[0];

  const [{ data: teams }, { data: plans }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, description, created_at, team_memberships(count)")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .returns<TeamRow[]>(),
    supabase
      .from("training_plans")
      .select("id, team_id, valid_from, valid_until, file_name, notes")
      .eq("coach_id", user.id)
      .is("runner_id", null)
      .order("valid_from", { ascending: false })
      .returns<PlanRow[]>(),
  ]);

  // Determina el plan vigente de un equipo
  function getVigentePlan(teamId: string): PlanRow | null {
    const today = new Date();
    const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const teamPlans = (plans ?? []).filter((p) => p.team_id === teamId);

    // Plan del mes en curso
    const current = teamPlans.find((p) => p.valid_from.slice(0, 7) === curKey);
    if (current) return current;

    // Último plan pasado
    const past = teamPlans.filter((p) => p.valid_from.slice(0, 7) < curKey);
    return past.length > 0 ? past[0] : null;
  }

  function formatMonth(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const totalRunners = (teams ?? []).reduce(
    (acc, t) => acc + (t.team_memberships?.[0]?.count ?? 0), 0
  );

  const teamCount = (teams ?? []).length;
  const atTeamLimit = limits.maxTeams !== null && teamCount >= limits.maxTeams;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", marginBottom: "2.5rem",
          gap: "1rem",
        }}>
          <div>
            <p style={{ color: "#a3e635", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
              Panel de entrenador
            </p>
            <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
              Mis equipos
            </h1>
            <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              Gestioná tus equipos y planes de entrenamiento
            </p>
          </div>

          {/* Botón + contador */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
            <CreateTeamDialog
              atLimit={atTeamLimit}
              maxTeams={limits.maxTeams ?? undefined}
              planName={planMeta.name}
            />
            {limits.maxTeams !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: atTeamLimit ? "#f59e0b" : "#555", fontSize: "0.75rem", fontWeight: 600 }}>
                  {teamCount} / {limits.maxTeams} equipo{limits.maxTeams !== 1 ? "s" : ""}
                </span>
                {atTeamLimit && (
                  <Link href="/coach/settings" style={{
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: "2rem", padding: "0.1rem 0.55rem",
                    color: "#f59e0b", fontSize: "0.65rem", fontWeight: 700,
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}>
                    Mejorar plan →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Banner límite alcanzado */}
        {atTeamLimit && (
          <div style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: "0.75rem",
            padding: "0.875rem 1.25rem",
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.82rem", margin: "0 0 0.15rem 0" }}>
                Límite de equipos alcanzado
              </p>
              <p style={{ color: "#7a6a3a", fontSize: "0.77rem", margin: 0, lineHeight: 1.5 }}>
                Tu plan <strong style={{ color: "#aaa" }}>{planMeta.name}</strong> incluye hasta {limits.maxTeams} equipo{(limits.maxTeams ?? 0) !== 1 ? "s" : ""}.
                Para agregar más,{" "}
                <Link href="/coach/settings" style={{ color: "#f59e0b", textDecoration: "underline" }}>
                  cambiá tu plan
                </Link>.
              </p>
            </div>
          </div>
        )}

        {/* Teams list */}
        {!(teams ?? []).length ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", background: "#111", borderRadius: "1rem", border: "1px solid #1e1e1e" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</p>
            <p style={{ color: "white", fontWeight: 600, fontSize: "1.1rem" }}>Todavía no tenés equipos</p>
            <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.4rem" }}>Creá uno para empezar a gestionar runners</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(teams ?? []).map((team) => {
              const memberCount = team.team_memberships?.[0]?.count ?? 0;
              const vigente = getVigentePlan(team.id);

              return (
                <div key={team.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden" }}>

                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.875rem 1.25rem",
                    borderBottom: "1px solid #1a1a1a",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "1rem", flexShrink: 0 }}>👥</span>
                      <h2 style={{ color: "white", fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        {team.name}
                      </h2>
                      {/* Badge runners */}
                      <span style={{
                        background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.14)",
                        borderRadius: "2rem", padding: "0.1rem 0.5rem",
                        color: "#7aad1f", fontSize: "0.63rem", fontWeight: 700, flexShrink: 0,
                      }}>
                        🏃 {memberCount} runner{memberCount !== 1 ? "s" : ""}
                      </span>
                      {/* Badge plan vigente */}
                      {vigente && (
                        <span style={{
                          background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
                          borderRadius: "2rem", padding: "0.1rem 0.5rem",
                          color: "#a3e635", fontSize: "0.63rem", fontWeight: 700, flexShrink: 0,
                        }}>
                          📋 {formatMonth(vigente.valid_from)}
                        </span>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <Link
                        href={`/coach/teams/${team.id}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
                          borderRadius: "0.375rem", color: "#a3e635",
                          padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 700,
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >
                        Ver equipo →
                      </Link>
                    </div>
                  </div>

                  {/* Info secundaria: descripción + plan */}
                  {(team.description || vigente) && (
                    <div style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "1.5rem", borderBottom: "1px solid #141414" }}>
                      {team.description && (
                        <p style={{
                          color: "#555", fontSize: "0.78rem", lineHeight: 1.5, margin: 0, flex: 1,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const,
                        }}>
                          {team.description}
                        </p>
                      )}
                      {vigente?.file_name && (
                        <p style={{ color: "#444", fontSize: "0.75rem", margin: 0, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          📄 {vigente.file_name}
                        </p>
                      )}
                      {!vigente && (
                        <p style={{ color: "#333", fontSize: "0.75rem", margin: 0, fontStyle: "italic" }}>
                          Sin plan cargado aún
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mensajes al grupo */}
                  <TeamMessagePanel teamId={team.id} />

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
