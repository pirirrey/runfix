import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteCodeDisplay } from "@/components/coach/InviteCodeDisplay";
import { DeleteTeamButton } from "@/components/coach/DeleteTeamButton";
import { EditTeamGeneralForm } from "@/components/coach/EditTeamGeneralForm";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, description, invite_code, coach_id, general_notes, team_pdf_path")
    .eq("id", teamId)
    .single<{
      id: string;
      name: string;
      description: string | null;
      invite_code: string;
      coach_id: string;
      general_notes: string | null;
      team_pdf_path: string | null;
    }>();

  if (!team || team.coach_id !== user.id) notFound();

  // Generar URL firmada para el PDF del equipo
  let teamPdfUrl: string | null = null;
  if (team.team_pdf_path) {
    const { data } = await supabase.storage
      .from("training-plans")
      .createSignedUrl(team.team_pdf_path, 3600);
    teamPdfUrl = data?.signedUrl ?? null;
  }

  type Membership = {
    id: string;
    joined_at: string;
    profiles: { id: string; full_name: string | null; email: string };
  };

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("id, joined_at, profiles:runner_id (id, full_name, email)")
    .eq("team_id", teamId)
    .order("joined_at")
    .returns<Membership[]>();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <Link href="/coach/teams" style={{ color: "#555", fontSize: "0.85rem", textDecoration: "none", display: "block", marginBottom: "0.4rem" }}>
              ← Mis equipos
            </Link>
            <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>{team.name}</h1>
            {team.description && (
              <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>{team.description}</p>
            )}
          </div>
          <DeleteTeamButton teamId={team.id} teamName={team.name} runnerCount={memberships?.length ?? 0} />
        </div>

        {/* Código de invitación */}
        <InviteCodeDisplay code={team.invite_code} />

        {/* Indicaciones generales + PDF */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
            <p style={{ color: "#a3e635", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              Información general del equipo
            </p>
            <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              Visible para todos los runners del equipo en la sección &quot;Mi equipo&quot;
            </p>
          </div>
          <div style={{ padding: "1.5rem 1.75rem" }}>
            <EditTeamGeneralForm
              teamId={team.id}
              initialNotes={team.general_notes}
              initialPdfPath={team.team_pdf_path}
            />
          </div>

          {/* Visor PDF */}
          {teamPdfUrl && (
            <div style={{ borderTop: "1px solid #1e1e1e", padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ color: "#aaa", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  📄 Vista previa del PDF
                </p>
                <a
                  href={teamPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#a3e635", fontSize: "0.8rem", textDecoration: "none", fontWeight: 600 }}
                >
                  ↗ Abrir en nueva pestaña
                </a>
              </div>
              <iframe
                src={teamPdfUrl}
                style={{ width: "100%", height: "500px", border: "none", borderRadius: "0.625rem", background: "#000" }}
                title={`Plan general - ${team.name}`}
              />
            </div>
          )}
        </div>

        {/* Runners */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Runners</p>
            <Badge variant="secondary">{memberships?.length ?? 0}</Badge>
          </div>

          {memberships?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏃</p>
              <p style={{ color: "#666", fontSize: "0.875rem" }}>Todavía no hay runners en este equipo.</p>
              <p style={{ color: "#444", fontSize: "0.8rem", marginTop: "0.3rem" }}>Compartí el código de invitación para que se unan.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Runner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Se unió</TableHead>
                  <TableHead className="text-right">Planes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships?.map((m) => {
                  const profile = m.profiles;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium" style={{ color: "white" }}>
                        {profile.full_name ?? profile.email}
                      </TableCell>
                      <TableCell style={{ color: "#888" }}>{profile.email}</TableCell>
                      <TableCell style={{ color: "#666", fontSize: "0.85rem" }}>
                        {new Date(m.joined_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/coach/teams/${teamId}/runners/${profile.id}`}>Ver planes</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
