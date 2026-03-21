import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateTeamDialog } from "@/components/coach/CreateTeamDialog";

export default async function CoachTeamsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type TeamWithCount = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    team_pdf_path: string | null;
    team_memberships: { count: number }[];
  };

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, description, created_at, team_pdf_path, team_memberships(count)")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false })
    .returns<TeamWithCount[]>();

  // Generar URLs firmadas para PDFs
  const teamsWithUrls = await Promise.all(
    (teams ?? []).map(async (team) => {
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

  const totalRunners = teamsWithUrls.reduce((acc, t) => acc + (t.team_memberships?.[0]?.count ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2.5rem" }}>
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
          <CreateTeamDialog />
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Equipos", value: teamsWithUrls.length, icon: "👥" },
            { label: "Runners totales", value: totalRunners, icon: "🏃" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "1.75rem" }}>{stat.icon}</span>
              <div>
                <p style={{ color: "white", fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "0.25rem" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Teams list */}
        {!teamsWithUrls.length ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", background: "#111", borderRadius: "1rem", border: "1px solid #1e1e1e" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</p>
            <p style={{ color: "white", fontWeight: 600, fontSize: "1.1rem" }}>Todavía no tenés equipos</p>
            <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.4rem" }}>Creá uno para empezar a gestionar runners</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            {teamsWithUrls.map((team) => {
              const memberCount = team.team_memberships?.[0]?.count ?? 0;
              return (
                <div key={team.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                  {/* Info */}
                  <Link href={`/coach/teams/${team.id}`} style={{ textDecoration: "none" }}>
                    <h2 style={{ color: "white", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>{team.name}</h2>
                    {team.description && (
                      <p style={{ color: "#777", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>{team.description}</p>
                    )}
                  </Link>

                  {/* Footer: runners + PDF */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", borderTop: "1px solid #1e1e1e", paddingTop: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.85rem" }}>🏃</span>
                      <span style={{ color: "#555", fontSize: "0.8rem" }}>
                        {memberCount} runner{memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {team.pdfUrl ? (
                      <a
                        href={team.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)", borderRadius: "0.375rem", padding: "0.25rem 0.65rem", fontSize: "0.75rem", color: "#a3e635", textDecoration: "none", fontWeight: 600 }}
                      >
                        📄 Ver PDF
                      </a>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#444", fontStyle: "italic" }}>Sin PDF</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
