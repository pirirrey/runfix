import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function isActive(validFrom: string, validUntil: string | null): boolean {
  const today = new Date(); today.setHours(0,0,0,0);
  const from = new Date(validFrom + "T00:00:00");
  const until = validUntil ? new Date(validUntil + "T00:00:00") : null;
  return from <= today && (!until || until >= today);
}

export default async function RunnerPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Equipos del runner (vía membresías, incluyendo notas del coach)
  type MembershipRow = {
    team_id: string;
    coach_notes: string | null;
    teams: { id: string; name: string; coach_id: string };
  };
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id, coach_notes, teams:team_id(id, name, coach_id)")
    .eq("runner_id", user.id)
    .returns<MembershipRow[]>();

  const teams = (memberships ?? []).map((m) => ({ ...m.teams, coachNotes: m.coach_notes }));
  const teamIds = teams.map((t) => t.id);

  // Planes de esos equipos (sin runner_id = planes de equipo)
  type PlanRow = {
    id: string;
    team_id: string;
    valid_from: string;
    valid_until: string | null;
    file_name: string;
    notes: string | null;
    uploaded_at: string;
  };

  let plans: PlanRow[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("training_plans")
      .select("id, team_id, valid_from, valid_until, file_name, notes, uploaded_at")
      .in("team_id", teamIds)
      .is("runner_id", null)
      .order("valid_from", { ascending: false })
      .returns<PlanRow[]>();
    plans = data ?? [];
  }

  // Agrupar planes por equipo
  const grouped = teams.map((team) => {
    const teamPlans = plans.filter((p) => p.team_id === team.id);
    const active = teamPlans.find((p) => isActive(p.valid_from, p.valid_until));
    const history = teamPlans.filter((p) => p.id !== active?.id);
    return { team, active, history, coachNotes: team.coachNotes };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", position: "relative", overflow: "hidden" }}>

      {/* Fondo grilla */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(163,230,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.03) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "18rem", zIndex: 0, pointerEvents: "none", background: "linear-gradient(160deg, rgba(163,230,53,0.06) 0%, transparent 60%)" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "2.5rem 2rem", maxWidth: "56rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.75rem" }}>📋</span>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>Mis Planes</h1>
          </div>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>Planes de entrenamiento de tus equipos</p>
        </div>

        {/* Sin equipos */}
        {grouped.length === 0 && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📋</div>
            <p style={{ color: "#888", fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No estás en ningún equipo todavía</p>
            <p style={{ color: "#555", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Asociate a un running team para ver tus planes.</p>
            <Link href="/runner/join" style={{ display: "inline-block", background: "#a3e635", color: "#000", borderRadius: "0.5rem", padding: "0.65rem 1.5rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
              Asociarse a un Running Team
            </Link>
          </div>
        )}

        {/* Grupos por equipo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {grouped.map(({ team, active, history, coachNotes }) => (
            <div key={team.id}>
              {/* Cabecera equipo */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ display: "inline-block", width: "0.625rem", height: "0.625rem", borderRadius: "50%", background: "#a3e635", flexShrink: 0 }} />
                <h2 style={{ color: "white", fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{team.name}</h2>
              </div>

              {/* Plan vigente */}
              {active ? (
                <div style={{ marginBottom: "0.75rem", border: "1px solid rgba(163,230,53,0.25)", borderRadius: "0.875rem", overflow: "hidden" }}>

                  {/* Parte superior: info del plan + link */}
                  <Link href={`/runner/plans/${active.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: "rgba(163,230,53,0.06)", padding: "1.25rem 1.5rem", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                            <span style={{ background: "#a3e635", color: "#000", fontSize: "0.65rem", fontWeight: 800, padding: "0.15rem 0.6rem", borderRadius: "2rem", textTransform: "uppercase" }}>
                              ✓ Vigente
                            </span>
                          </div>
                          <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            📄 {active.file_name}
                          </p>
                          <p style={{ color: "#a3e635", fontSize: "0.8rem", margin: "0.35rem 0 0 0" }}>
                            {formatDate(active.valid_from)}{active.valid_until ? ` → ${formatDate(active.valid_until)}` : " → indefinido"}
                          </p>
                        </div>
                        <div style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>Ver →</div>
                      </div>
                    </div>
                  </Link>

                  {/* Indicaciones al grupo */}
                  {active.notes && (
                    <div style={{ background: "rgba(163,230,53,0.03)", borderTop: "1px solid rgba(163,230,53,0.12)", padding: "0.875rem 1.5rem" }}>
                      <p style={{ color: "#6b9e2a", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.35rem 0" }}>
                        👥 Indicaciones al grupo
                      </p>
                      <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                        {active.notes}
                      </p>
                    </div>
                  )}

                  {/* Indicaciones personales */}
                  {coachNotes && (
                    <div style={{ background: "rgba(96,165,250,0.04)", borderTop: "1px solid rgba(96,165,250,0.15)", padding: "0.875rem 1.5rem" }}>
                      <p style={{ color: "#60a5fa", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.35rem 0" }}>
                        📝 Indicaciones personales
                      </p>
                      <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                        {coachNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ border: "1px solid #1e1e1e", borderRadius: "0.875rem", marginBottom: "0.75rem", overflow: "hidden" }}>
                  <div style={{ background: "#111", padding: "1.5rem", textAlign: "center" }}>
                    <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>Tu entrenador aún no subió un plan vigente para este equipo.</p>
                  </div>
                  {coachNotes && (
                    <div style={{ background: "rgba(96,165,250,0.04)", borderTop: "1px solid rgba(96,165,250,0.15)", padding: "0.875rem 1.5rem" }}>
                      <p style={{ color: "#60a5fa", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 0.35rem 0" }}>
                        📝 Indicaciones personales
                      </p>
                      <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                        {coachNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Historial */}
              {history.length > 0 && (
                <div>
                  <p style={{ color: "#444", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
                    Historial
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {history.map((plan) => (
                      <Link key={plan.id} href={`/runner/plans/${plan.id}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "0.625rem",
                          padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: "#aaa", fontSize: "0.85rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {plan.file_name}
                            </p>
                            <p style={{ color: "#444", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
                              {formatDate(plan.valid_from)}{plan.valid_until ? ` → ${formatDate(plan.valid_until)}` : ""}
                            </p>
                          </div>
                          <span style={{ color: "#555", fontSize: "0.78rem", flexShrink: 0 }}>Ver →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
