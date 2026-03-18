import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PdfViewer } from "@/components/runner/PdfViewer";

function formatPlanMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export default async function PlanViewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  type PlanRow = {
    id: string;
    plan_month: string;
    storage_path: string;
    file_name: string;
    notes: string | null;
    teams: { name: string };
  };

  // Cargar el plan (RLS garantiza que solo el runner dueño puede verlo)
  const { data: plan } = await supabase
    .from("training_plans")
    .select(`
      id, plan_month, storage_path, file_name, notes,
      teams:team_id (name)
    `)
    .eq("id", planId)
    .eq("runner_id", user.id)
    .single<PlanRow>();

  if (!plan) notFound();

  // Generar URL firmada (1 hora)
  const { data: urlData, error: urlError } = await supabase.storage
    .from("training-plans")
    .createSignedUrl(plan.storage_path, 3600);

  if (urlError || !urlData?.signedUrl) {
    return (
      <div className="p-8 text-center text-destructive">
        Error al cargar el plan. Intentá nuevamente.
      </div>
    );
  }

  const team = plan.teams;

  return (
    <div className="p-8 h-screen flex flex-col max-w-5xl mx-auto">
      <div className="mb-4">
        <Link
          href="/runner/plans"
          className="text-sm text-muted-foreground hover:underline mb-1 block"
        >
          ← Mis planes
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold capitalize">
              {formatPlanMonth(plan.plan_month)}
            </h1>
            <p className="text-muted-foreground">{team?.name}</p>
          </div>
        </div>
        {plan.notes && (
          <p className="text-sm text-muted-foreground mt-1 italic">
            {plan.notes}
          </p>
        )}
      </div>

      <div className="flex-1">
        <PdfViewer signedUrl={urlData.signedUrl} fileName={plan.file_name} />
      </div>
    </div>
  );
}
