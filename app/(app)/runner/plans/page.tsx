import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlanCard } from "@/components/runner/PlanCard";
import { Button } from "@/components/ui/button";

export default async function RunnerPlansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  type PlanListItem = {
    id: string;
    plan_month: string;
    file_name: string;
    notes: string | null;
    teams: { name: string };
  };

  const { data: plans } = await supabase
    .from("training_plans")
    .select(`
      id, plan_month, file_name, notes,
      teams:team_id (name)
    `)
    .eq("runner_id", user.id)
    .order("plan_month", { ascending: false })
    .returns<PlanListItem[]>();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mis planes</h1>
          <p className="text-muted-foreground">
            Planes de entrenamiento de tu(s) equipo(s)
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/runner/join">Unirme a equipo</Link>
        </Button>
      </div>

      {plans?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📋</p>
          <p>Todavía no tenés planes de entrenamiento.</p>
          <p className="text-sm mt-1">
            Uníte a un equipo o esperá que tu entrenador suba tu plan.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/runner/join">Unirme a un equipo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              id={plan.id}
              planMonth={plan.plan_month}
              teamName={plan.teams?.name ?? ""}
              fileName={plan.file_name}
              notes={plan.notes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
