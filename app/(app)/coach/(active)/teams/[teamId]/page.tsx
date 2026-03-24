import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { DeleteTeamButton } from "@/components/coach/DeleteTeamButton";
import { EditTeamGeneralForm } from "@/components/coach/EditTeamGeneralForm";
import { AddRunnerToTeamPanel } from "@/components/coach/AddRunnerToTeamPanel";
import { TeamPlansSection } from "@/components/coach/TeamPlansSection";
import { RunnerNotesList } from "@/components/coach/RunnerNotesList";

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
    .select("id, name, description, coach_id, general_notes, team_pdf_path")
    .eq("id", teamId)
    .single<{
      id: string;
      name: string;
      description: string | null;
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
    coach_notes: string | null;
    profiles: { id: string; full_name: string | null; email: string };
  };

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("id, joined_at, coach_notes, profiles:runner_id (id, full_name, email)")
    .eq("team_id", teamId)
    .order("joined_at")
    .returns<Membership[]>();

  const memberIds = new Set((memberships ?? []).map((m) => m.profiles.id));

  // Pool del coach (runners asociados que aún no están en el equipo)
  type CoachRunnerRow = {
    runner: { id: string; full_name: string | null; email: string };
  };
  const { data: poolRows } = await supabase
    .from("coach_runners")
    .select("runner:profiles!coach_runners_runner_id_fkey(id, full_name, email)")
    .eq("coach_id", user.id)
    .returns<CoachRunnerRow[]>();

  const poolRunnersBase = (poolRows ?? [])
    .map((row) => row.runner)
    .filter((r) => !memberIds.has(r.id));

  // Obtener el equipo actual de cada runner del pool
  type MembershipWithTeam = {
    runner_id: string;
    teams: { name: string } | null;
  };
  const poolIds = poolRunnersBase.map((r) => r.id);
  const { data: poolMemberships } = poolIds.length > 0
    ? await supabase
        .from("team_memberships")
        .select("runner_id, teams:team_id (name)")
        .in("runner_id", poolIds)
        .neq("team_id", teamId)
        .returns<MembershipWithTeam[]>()
    : { data: [] as MembershipWithTeam[] };

  // Mapa: runnerId → team name
  const runnerTeamMap = new Map<string, string>();
  for (const m of poolMemberships ?? []) {
    if (m.teams?.name) runnerTeamMap.set(m.runner_id, m.teams.name);
  }

  const poolRunners = poolRunnersBase.map((r) => ({
    ...r,
    current_team_name: runnerTeamMap.get(r.id) ?? null,
  }));

  // Planes del equipo
  type TeamPlan = {
    id: string;
    valid_from: string;
    valid_until: string | null;
    storage_path: string | null;
    file_name: string | null;
    file_size: number | null;
    notes: string | null;
    uploaded_at: string;
  };
  const { data: teamPlans } = await supabase
    .from("training_plans")
    .select("id, valid_from, valid_until, storage_path, file_name, file_size, notes, uploaded_at")
    .eq("team_id", teamId)
    .is("runner_id", null)
    .order("valid_from", { ascending: false })
    .returns<TeamPlan[]>();

  // Rutinas del equipo
  type RoutineRow = { id: string; training_date: string; routine: string };
  const { data: routines } = await supabase
    .from("daily_routines")
    .select("id, training_date, routine")
    .eq("team_id", teamId)
    .order("training_date", { ascending: true })
    .returns<RoutineRow[]>();

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

        {/* Datos del equipo */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
            <p style={{ color: "#a3e635", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              Perfil del equipo
            </p>
          </div>
          <div style={{ padding: "1.25rem 1.75rem" }}>
            <EditTeamGeneralForm
              teamId={team.id}
              initialName={team.name}
              initialDescription={team.description}
              initialNotes={team.general_notes}
              initialPdfPath={team.team_pdf_path}
              teamPdfUrl={teamPdfUrl}
            />
          </div>
        </div>

        {/* Planes del equipo */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
            <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              Planificación
            </p>
            <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: "0.25rem 0 0 0" }}>
              Planes de entrenamiento del equipo
            </p>
            <p style={{ color: "#555", fontSize: "0.8rem", margin: "0.2rem 0 0 0" }}>
              Todos los runners del equipo ven el plan vigente
            </p>
          </div>
          <div style={{ padding: "1.5rem 1.75rem" }}>
            <TeamPlansSection teamId={team.id} initialPlans={teamPlans ?? []} initialRoutines={routines ?? []} />
          </div>
        </div>

        {/* Runners actuales */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Runners en este equipo</p>
            <Badge variant="secondary">{memberships?.length ?? 0}</Badge>
          </div>

          {memberships?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏃</p>
              <p style={{ color: "#666", fontSize: "0.875rem" }}>No hay runners en este equipo todavía.</p>
              <p style={{ color: "#444", fontSize: "0.8rem", marginTop: "0.3rem" }}>Agregá runners desde el panel de abajo.</p>
            </div>
          ) : (
            <RunnerNotesList
              teamId={teamId}
              members={(memberships ?? []).map((m) => ({
                membershipId: m.id,
                runnerId: m.profiles.id,
                name: m.profiles.full_name ?? m.profiles.email,
                email: m.profiles.email,
                joinedAt: m.joined_at,
                coachNotes: m.coach_notes,
              }))}
            />
          )}
        </div>

        {/* Panel: agregar runners desde pool */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1e1e1e" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Agregar runners al equipo</p>
            <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "0.2rem" }}>Runners de tu pool que aún no están en este equipo</p>
          </div>
          <AddRunnerToTeamPanel teamId={team.id} poolRunners={poolRunners} />
        </div>
      </div>
    </div>
  );
}
