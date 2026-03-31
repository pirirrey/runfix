import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { DeleteTeamButton } from "@/components/coach/DeleteTeamButton";
import { EditTeamGeneralForm } from "@/components/coach/EditTeamGeneralForm";
import { AddRunnerToTeamPanel } from "@/components/coach/AddRunnerToTeamPanel";
import { TeamPlansSection } from "@/components/coach/TeamPlansSection";
import { RunnerNotesList } from "@/components/coach/RunnerNotesList";
import { TeamAccordionSection } from "@/components/coach/TeamAccordionSection";

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

        {/* Secciones acordeón */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          <TeamAccordionSection icon="✏️" title="Perfil del equipo">
            <EditTeamGeneralForm
              teamId={team.id}
              initialName={team.name}
              initialDescription={team.description}
              initialNotes={team.general_notes}
              initialPdfPath={team.team_pdf_path}
              teamPdfUrl={teamPdfUrl}
            />
          </TeamAccordionSection>

          <TeamAccordionSection icon="📋" title="Planificación">
            <TeamPlansSection teamId={team.id} initialPlans={teamPlans ?? []} initialRoutines={routines ?? []} />
          </TeamAccordionSection>

          <TeamAccordionSection icon="🏃" title="Runners en este equipo" badge={memberships?.length ?? 0}>
            {memberships?.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
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
          </TeamAccordionSection>

          <TeamAccordionSection icon="➕" title="Agregar runners al equipo" badge={poolRunners.length}>
            <AddRunnerToTeamPanel teamId={team.id} poolRunners={poolRunners} />
          </TeamAccordionSection>

        </div>
      </div>
    </div>
  );
}
