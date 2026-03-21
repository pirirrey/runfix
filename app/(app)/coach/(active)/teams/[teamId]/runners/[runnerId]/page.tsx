import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PlanUploadForm } from "@/components/coach/PlanUploadForm";

function formatPlanMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export default async function RunnerPlansPage({
  params,
}: {
  params: Promise<{ teamId: string; runnerId: string }>;
}) {
  const { teamId, runnerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, coach_id")
    .eq("id", teamId)
    .single<{ id: string; name: string; coach_id: string }>();

  if (!team || team.coach_id !== user.id) notFound();

  // Verificar que el runner pertenece al pool del coach (más permisivo que solo team_memberships)
  const { data: poolRel } = await supabase
    .from("coach_runners")
    .select("id")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .maybeSingle();

  // También aceptar si tiene membresía directa en el equipo
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("runner_id")
    .eq("team_id", teamId)
    .eq("runner_id", runnerId)
    .maybeSingle();

  if (!poolRel && !membership) notFound();

  // Perfil del runner
  const { data: runner } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", runnerId)
    .single<{ full_name: string | null; email: string }>();

  type Plan = {
    id: string;
    plan_month: string;
    file_name: string;
    file_size: number | null;
    notes: string | null;
    uploaded_at: string;
  };

  const { data: plans } = await supabase
    .from("training_plans")
    .select("id, plan_month, file_name, file_size, notes, uploaded_at")
    .eq("team_id", teamId)
    .eq("runner_id", runnerId)
    .order("plan_month", { ascending: false })
    .returns<Plan[]>();

  const runnerName = runner?.full_name ?? runner?.email ?? "Runner";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem 2rem" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>

        {/* Header */}
        <div>
          <Link
            href={`/coach/teams/${teamId}`}
            style={{ color: "#555", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.75rem" }}
          >
            ← {team.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "0.75rem",
              background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0,
            }}>
              🏃
            </div>
            <div>
              <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>
                {runnerName}
              </h1>
              <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>{runner?.email}</p>
            </div>
          </div>
        </div>

        {/* Grid: subir plan + historial */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

          {/* Card: Subir plan */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e1e1e" }}>
              <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                Plan de entrenamiento
              </p>
              <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: "0.25rem 0 0 0" }}>
                Subir plan
              </p>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <PlanUploadForm teamId={teamId} runnerId={runnerId} />
            </div>
          </div>

          {/* Card: Historial */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  Historial
                </p>
                <p style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: "0.25rem 0 0 0" }}>
                  Planes subidos
                </p>
              </div>
              <span style={{
                background: "#1e1e1e", color: "#666", fontSize: "0.75rem",
                fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "2rem",
              }}>
                {plans?.length ?? 0}
              </span>
            </div>

            <div style={{ padding: "1rem" }}>
              {!plans || plans.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
                  <p style={{ color: "#555", fontSize: "0.85rem" }}>
                    Todavía no hay planes para este runner.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {plans.map((plan) => (
                    <div key={plan.id} style={{
                      background: "#0f0f0f", border: "1px solid #1a1a1a",
                      borderRadius: "0.625rem", padding: "1rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                        <p style={{ color: "white", fontWeight: 700, fontSize: "0.875rem", textTransform: "capitalize", margin: 0 }}>
                          {formatPlanMonth(plan.plan_month)}
                        </p>
                        {plan.file_size && (
                          <span style={{ color: "#555", fontSize: "0.72rem", flexShrink: 0 }}>
                            {(plan.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                      <p style={{ color: "#666", fontSize: "0.78rem", margin: "0.3rem 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {plan.file_name}
                      </p>
                      {plan.notes && (
                        <p style={{ color: "#555", fontSize: "0.75rem", margin: "0.3rem 0 0 0", fontStyle: "italic" }}>
                          {plan.notes}
                        </p>
                      )}
                      <p style={{ color: "#444", fontSize: "0.72rem", margin: "0.5rem 0 0 0" }}>
                        Subido: {new Date(plan.uploaded_at).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
