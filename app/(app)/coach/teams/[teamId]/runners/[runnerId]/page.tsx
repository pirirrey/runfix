import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar que el usuario es coach de este equipo
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, coach_id")
    .eq("id", teamId)
    .single<{ id: string; name: string; coach_id: string }>();

  if (!team || team.coach_id !== user.id) notFound();

  // Verificar que el runner pertenece al equipo
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("runner_id")
    .eq("team_id", teamId)
    .eq("runner_id", runnerId)
    .single<{ runner_id: string }>();

  if (!membership) notFound();

  // Cargar perfil del runner
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

  // Cargar planes del runner en este equipo
  const { data: plans } = await supabase
    .from("training_plans")
    .select("id, plan_month, file_name, file_size, notes, uploaded_at")
    .eq("team_id", teamId)
    .eq("runner_id", runnerId)
    .order("plan_month", { ascending: false })
    .returns<Plan[]>();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/coach/teams/${teamId}`}
          className="text-sm text-muted-foreground hover:underline mb-1 block"
        >
          ← {team.name}
        </Link>
        <h1 className="text-2xl font-bold">
          {runner?.full_name ?? runner?.email}
        </h1>
        <p className="text-muted-foreground">{runner?.email}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Subir plan */}
        <Card>
          <CardHeader>
            <CardTitle>Subir plan</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanUploadForm teamId={teamId} runnerId={runnerId} />
          </CardContent>
        </Card>

        {/* Historial de planes */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Planes subidos ({plans?.length ?? 0})
          </h2>

          {plans?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">
              <p className="text-3xl mb-2">📋</p>
              <p>Todavía no hay planes para este runner.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans?.map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 space-y-1"
                >
                  <p className="font-medium capitalize">
                    {formatPlanMonth(plan.plan_month)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.file_name}
                    {plan.file_size
                      ? ` · ${(plan.file_size / 1024).toFixed(0)} KB`
                      : ""}
                  </p>
                  {plan.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {plan.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Subido:{" "}
                    {new Date(plan.uploaded_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
