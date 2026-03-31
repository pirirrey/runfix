import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RunnerPlanCard, RunnerMonthData } from "@/components/runner/RunnerPlanCard";

/* ── Helpers ──────────────────────────────────────────────── */

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* ── Page ─────────────────────────────────────────────────── */

export default async function RunnerPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const curKey = currentMonthKey();

  // Equipos del runner
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

  const rawTeams = (memberships ?? []).map((m) => ({ ...m.teams, coachNotes: m.coach_notes }));

  // Obtener status de cada coach
  const coachIds = [...new Set(rawTeams.map((t) => t.coach_id))];
  type CoachStatusRow = { id: string; status: string };
  let coachStatusMap: Record<string, string> = {};
  if (coachIds.length > 0) {
    const { data: coachProfiles } = await supabase
      .from("profiles")
      .select("id, status")
      .in("id", coachIds)
      .returns<CoachStatusRow[]>();
    coachStatusMap = Object.fromEntries((coachProfiles ?? []).map((c) => [c.id, c.status]));
  }

  const teams = rawTeams.map((t) => ({ ...t, coachStatus: coachStatusMap[t.coach_id] ?? "approved" }));
  const teamIds = teams.map((t) => t.id);

  // Planes de los equipos (todos, no solo activos)
  type PlanRow = {
    id: string;
    team_id: string;
    valid_from: string;
    valid_until: string | null;
    file_name: string;
    storage_path: string | null;
    notes: string | null;
  };
  let plans: PlanRow[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("training_plans")
      .select("id, team_id, valid_from, valid_until, file_name, storage_path, notes")
      .in("team_id", teamIds)
      .is("runner_id", null)
      .order("valid_from", { ascending: false })
      .returns<PlanRow[]>();
    plans = data ?? [];
  }

  // Rutinas de los equipos (todas, para agrupar por mes)
  type RoutineRow = { id: string; team_id: string; training_date: string; routine: string; km_estimated?: number | null };
  let allRoutines: RoutineRow[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("daily_routines")
      .select("id, team_id, training_date, routine, km_estimated")
      .in("team_id", teamIds)
      .order("training_date", { ascending: true })
      .returns<RoutineRow[]>();
    allRoutines = data ?? [];
  }

  // Agrupar por equipo → meses → generar signed URLs
  const grouped = await Promise.all(teams.map(async (team) => {
    const teamPlans    = plans.filter((p) => p.team_id === team.id);
    const teamRoutines = allRoutines.filter((r) => r.team_id === team.id);

    // Todos los mes-keys con contenido + el mes actual siempre
    const keys = new Set<string>([curKey]);
    teamPlans.forEach((p)    => keys.add(p.valid_from.slice(0, 7)));
    teamRoutines.forEach((r) => keys.add(r.training_date.slice(0, 7)));

    // Construir month data con signed URLs
    const months: RunnerMonthData[] = await Promise.all(
      Array.from(keys).map(async (key) => {
        const plan    = teamPlans.find((p) => p.valid_from.startsWith(key)) ?? null;
        const ruts    = teamRoutines
          .filter((r) => r.training_date.startsWith(key))
          .sort((a, b) => a.training_date.localeCompare(b.training_date));
        const status  = key === curKey ? "current" : key > curKey ? "upcoming" : "past";

        let signedUrl: string | null = null;
        if (plan?.storage_path) {
          const { data } = await supabase.storage
            .from("training-plans")
            .createSignedUrl(plan.storage_path, 3600);
          signedUrl = data?.signedUrl ?? null;
        }

        return {
          key,
          label: monthLabel(key),
          plan: plan ? { id: plan.id, file_name: plan.file_name, valid_from: plan.valid_from, valid_until: plan.valid_until, notes: plan.notes, signedUrl } : null,
          routines: ruts,
          status,
          vigente: false,
        };
      })
    );

    // Determinar vigente
    const cur = months.find((m) => m.status === "current");
    if (cur && (cur.plan || cur.routines.length > 0)) {
      cur.vigente = true;
    } else {
      const lastPast = months
        .filter((m) => m.status === "past" && (m.plan || m.routines.length > 0))
        .sort((a, b) => b.key.localeCompare(a.key))[0];
      if (lastPast) lastPast.vigente = true;
    }

    // Ordenar: current → upcoming (asc) → past (desc)
    months.sort((a, b) => {
      const o = { current: 0, upcoming: 1, past: 2 };
      if (a.status !== b.status) return o[a.status] - o[b.status];
      if (a.status === "upcoming") return a.key.localeCompare(b.key);
      return b.key.localeCompare(a.key);
    });

    return { team, months, coachNotes: team.coachNotes, coachSuspended: team.coachStatus === "suspended" };
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ padding: "2.5rem 2rem", maxWidth: "56rem", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.75rem" }}>📋</span>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>Mis Planes</h1>
          </div>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>Planes y rutinas de entrenamiento de tus equipos</p>
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

        {/* Por equipo */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {grouped.map(({ team, months, coachNotes, coachSuspended }) => (
            <div key={team.id}>
              {/* Cabecera equipo */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{
                  display: "inline-block", width: "0.625rem", height: "0.625rem",
                  borderRadius: "50%", flexShrink: 0,
                  background: coachSuspended ? "#fb923c" : "#a3e635",
                }} />
                <h2 style={{ color: coachSuspended ? "#888" : "white", fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  {team.name}
                </h2>
                {coachSuspended && (
                  <span style={{
                    background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)",
                    borderRadius: "2rem", padding: "0.1rem 0.6rem",
                    color: "#fb923c", fontSize: "0.68rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    Inactivo
                  </span>
                )}
              </div>

              {/* Warning coach suspendido */}
              {coachSuspended && (
                <div style={{
                  background: "rgba(251,146,60,0.05)",
                  border: "1px solid rgba(251,146,60,0.2)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.875rem",
                  marginBottom: "1rem",
                }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.05rem" }}>⚠️</span>
                  <div>
                    <p style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.2rem 0" }}>
                      Running team temporalmente inaccesible
                    </p>
                    <p style={{ color: "#6b5a48", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>
                      Este equipo no está disponible en este momento. Consultá con tu entrenador para más información.
                    </p>
                  </div>
                </div>
              )}

              {/* Cards mensuales — solo si el coach está activo */}
              {!coachSuspended && (
                <RunnerPlanCard
                  months={months}
                  coachNotes={coachNotes}
                  teamId={team.id}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
