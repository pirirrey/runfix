import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RunnerTeamPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type TeamInfo = {
    team_id: string;
    teams: {
      id: string;
      name: string;
      description: string | null;
      general_notes: string | null;
      team_pdf_path: string | null;
    };
  };

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id, teams:team_id (id, name, description, general_notes, team_pdf_path)")
    .eq("runner_id", user.id)
    .returns<TeamInfo[]>();

  // Generar URLs firmadas para PDFs de equipo
  const teamsWithUrls = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const team = m.teams;
      let pdfUrl: string | null = null;
      if (team.team_pdf_path) {
        const { data } = await supabase.storage
          .from("training-plans")
          .createSignedUrl(team.team_pdf_path, 3600);
        pdfUrl = data?.signedUrl ?? null;
      }
      return { ...team, pdfUrl };
    })
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem" }}>
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ color: "#60a5fa", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
            Runner
          </p>
          <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
            Mi equipo
          </h1>
          <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>
            Indicaciones generales de tus entrenadores
          </p>
        </div>

        {/* Sin equipos */}
        {!teamsWithUrls.length ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", background: "#111", borderRadius: "1rem", border: "1px solid #1e1e1e" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</p>
            <p style={{ color: "white", fontWeight: 600, fontSize: "1.1rem" }}>Todavía no pertenecés a ningún equipo</p>
            <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.4rem", marginBottom: "1.5rem" }}>
              Usá el código de invitación de tu entrenador para unirte
            </p>
            <Link href="/runner/join" style={{
              background: "#60a5fa",
              color: "#000",
              borderRadius: "0.5rem",
              padding: "0.6rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              textDecoration: "none",
            }}>
              Unirme a un equipo
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {teamsWithUrls.map((team) => (
              <div key={team.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>

                {/* Team header */}
                <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>👥</span>
                    <div>
                      <h2 style={{ color: "white", fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>{team.name}</h2>
                      {team.description && (
                        <p style={{ color: "#666", fontSize: "0.85rem", marginTop: "0.2rem" }}>{team.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                  {/* Indicaciones generales */}
                  <div>
                    <p style={{ color: "#aaa", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                      📋 Indicaciones generales
                    </p>
                    {team.general_notes ? (
                      <div style={{
                        background: "#161616",
                        border: "1px solid #2a2a2a",
                        borderRadius: "0.625rem",
                        padding: "1rem 1.25rem",
                        color: "#ccc",
                        fontSize: "0.9rem",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}>
                        {team.general_notes}
                      </div>
                    ) : (
                      <p style={{ color: "#444", fontSize: "0.875rem", fontStyle: "italic" }}>
                        Tu entrenador todavía no cargó indicaciones generales.
                      </p>
                    )}
                  </div>

                  {/* PDF del equipo */}
                  <div>
                    <p style={{ color: "#aaa", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                      📄 Plan general del equipo
                    </p>
                    {team.pdfUrl ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <iframe
                          src={team.pdfUrl}
                          style={{ width: "100%", height: "500px", border: "none", borderRadius: "0.625rem", background: "#000" }}
                          title={`Plan general - ${team.name}`}
                        />
                        <a
                          href={team.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            color: "#60a5fa",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          ↗ Abrir en nueva pestaña
                        </a>
                      </div>
                    ) : (
                      <p style={{ color: "#444", fontSize: "0.875rem", fontStyle: "italic" }}>
                        Tu entrenador todavía no cargó un plan general.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
