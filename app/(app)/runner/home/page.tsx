import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type TeamRow = { id: string; name: string };

type CoachRow = {
  id: string;
  joined_at: string;
  logo_url: string | null;
  coach: {
    id: string;
    full_name: string | null;
    team_name: string | null;
    team_logo_path: string | null;
    team_location: string | null;
    team_description: string | null;
  };
  teams: TeamRow[];
};

export default async function RunnerHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single<{ full_name: string | null }>();

  // Coaches a los que pertenece el runner
  const { data: coachRunners } = await supabase
    .from("coach_runners")
    .select(`
      id,
      joined_at,
      coach:profiles!coach_runners_coach_id_fkey(
        id, full_name, team_name, team_logo_path, team_location, team_description
      )
    `)
    .eq("runner_id", user.id)
    .order("joined_at", { ascending: false });

  // Equipos a los que el runner fue asignado
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id, teams(id, name, coach_id)")
    .eq("runner_id", user.id);

  // Construir mapa coach_id → teams asignados
  const teamsByCoach: Record<string, TeamRow[]> = {};
  for (const m of memberships ?? []) {
    const team = m.teams as unknown as { id: string; name: string; coach_id: string } | null;
    if (!team) continue;
    if (!teamsByCoach[team.coach_id]) teamsByCoach[team.coach_id] = [];
    teamsByCoach[team.coach_id].push({ id: team.id, name: team.name });
  }

  // Generar signed URLs para logos
  const rows: CoachRow[] = [];
  for (const cr of coachRunners ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coach = (cr as any).coach as CoachRow["coach"];
    let logo_url: string | null = null;
    if (coach.team_logo_path) {
      const { data } = await supabase.storage
        .from("training-plans")
        .createSignedUrl(coach.team_logo_path, 3600);
      logo_url = data?.signedUrl ?? null;
    }
    rows.push({
      id: cr.id,
      joined_at: cr.joined_at,
      logo_url,
      coach,
      teams: teamsByCoach[coach.id] ?? [],
    });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Runner";

  return (
    <main style={{
      minHeight: "100vh",
      backgroundImage: `
        linear-gradient(to bottom, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.72) 40%, rgba(10,10,10,0.92) 100%),
        url('/images/trail-runner.jpg')
      `,
      backgroundSize: "cover",
      backgroundPosition: "center 30%",
      backgroundAttachment: "fixed",
    }}>
    <div style={{ padding: "2.5rem 2rem", maxWidth: "42rem" }}>

      {/* Saludo */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "white", margin: 0 }}>
          Hola, {firstName} 👋
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.4rem" }}>
          {rows.length === 0
            ? "Todavía no estás asociado a ningún running team."
            : `Formás parte de ${rows.length} running team${rows.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Sin teams */}
      {rows.length === 0 && (
        <div style={{
          background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem",
          padding: "2.5rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏃</div>
          <p style={{ color: "#aaa", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem" }}>
            Aún no te asociaste a ningún entrenador
          </p>
          <p style={{ color: "#555", fontSize: "0.85rem", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            Pedile el código de invitación a tu entrenador y asociate desde la sección "Unirse a coach".
          </p>
          <Link href="/runner/join" style={{
            background: "#60a5fa", color: "#000", fontWeight: 700,
            padding: "0.65rem 1.5rem", borderRadius: "0.5rem",
            textDecoration: "none", fontSize: "0.875rem", display: "inline-block",
          }}>
            Asociarme a un Running Team
          </Link>
        </div>
      )}

      {/* Cards de running teams */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {rows.map((cr) => {
          const displayName = cr.coach.team_name || cr.coach.full_name || "Running Team";
          const hasTeams = cr.teams.length > 0;

          return (
            <div key={cr.id} style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem",
              overflow: "hidden",
            }}>
              {/* Header del team */}
              <div style={{
                padding: "1.25rem 1.5rem",
                display: "flex", alignItems: "center", gap: "1rem",
                borderBottom: "1px solid #1a1a1a",
              }}>
                {cr.logo_url ? (
                  <img
                    src={cr.logo_url}
                    alt={displayName}
                    style={{ width: "3.5rem", height: "3.5rem", borderRadius: "0.625rem", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: "3.5rem", height: "3.5rem", borderRadius: "0.625rem", flexShrink: 0,
                    background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem",
                  }}>
                    🎯
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "white", fontWeight: 800, fontSize: "1rem", margin: 0 }}>
                    {displayName}
                  </p>
                  {cr.coach.team_location && (
                    <p style={{ color: "#666", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
                      📍 {cr.coach.team_location}
                    </p>
                  )}
                </div>
                <span style={{
                  background: "rgba(96,165,250,0.1)", color: "#60a5fa",
                  border: "1px solid rgba(96,165,250,0.2)",
                  borderRadius: "99px", padding: "0.25rem 0.75rem",
                  fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  Miembro
                </span>
              </div>

              {/* Grupos de entrenamiento */}
              <div style={{ padding: "1.25rem 1.5rem" }}>
                <p style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                  Grupos de entrenamiento
                </p>

                {hasTeams ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {cr.teams.map((t) => (
                      <div key={t.id} style={{
                        background: "#0f0f0f", border: "1px solid #1e1e1e",
                        borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
                        display: "flex", alignItems: "center", gap: "0.625rem",
                      }}>
                        <span style={{ fontSize: "0.9rem" }}>👥</span>
                        <span style={{ color: "#ddd", fontSize: "0.875rem", fontWeight: 600 }}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    background: "#0f0f0f", border: "1px dashed #2a2a2a",
                    borderRadius: "0.5rem", padding: "1rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <span style={{ fontSize: "1.25rem" }}>⏳</span>
                    <div>
                      <p style={{ color: "#666", fontSize: "0.82rem", fontWeight: 600, margin: 0 }}>
                        Pendiente de asignación
                      </p>
                      <p style={{ color: "#444", fontSize: "0.75rem", margin: "0.15rem 0 0 0" }}>
                        Tu entrenador todavía no te asignó a ningún grupo
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción si existe */}
              {cr.coach.team_description && (
                <div style={{
                  padding: "0 1.5rem 1.25rem",
                  borderTop: "1px solid #1a1a1a",
                  paddingTop: "1rem",
                }}>
                  <p style={{ color: "#555", fontSize: "0.8rem", lineHeight: 1.6, margin: 0 }}>
                    {cr.coach.team_description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA para unirse a más teams */}
      {rows.length > 0 && (
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link href="/runner/join" style={{
            color: "#60a5fa", fontSize: "0.82rem", fontWeight: 600,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem",
          }}>
            ➕ Asociarme a otro Running Team
          </Link>
        </div>
      )}
    </div>
    </main>
  );
}
