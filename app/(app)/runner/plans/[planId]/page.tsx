import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PdfViewer } from "@/components/runner/PdfViewer";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function PlanViewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type PlanRow = {
    id: string;
    valid_from: string;
    valid_until: string | null;
    storage_path: string;
    file_name: string;
    notes: string | null;
    teams: { name: string };
  };

  // RLS garantiza que el runner solo puede ver planes de equipos a los que pertenece
  const { data: plan } = await supabase
    .from("training_plans")
    .select("id, valid_from, valid_until, storage_path, file_name, notes, teams:team_id(name)")
    .eq("id", planId)
    .single<PlanRow>();

  if (!plan) notFound();

  const { data: urlData, error: urlError } = await supabase.storage
    .from("training-plans")
    .createSignedUrl(plan.storage_path, 3600);

  if (urlError || !urlData?.signedUrl) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#f87171", fontSize: "0.9rem" }}>Error al cargar el plan. Intentá nuevamente.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #1e1e1e", flexShrink: 0 }}>
        <Link href="/runner/plans" style={{ color: "#555", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.75rem" }}>
          ← Mis planes
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ color: "#a3e635", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              {plan.teams?.name}
            </p>
            <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 900, margin: "0.25rem 0 0 0" }}>
              {plan.file_name}
            </h1>
            <p style={{ color: "#666", fontSize: "0.82rem", margin: "0.25rem 0 0 0" }}>
              {formatDate(plan.valid_from)}
              {plan.valid_until ? ` → ${formatDate(plan.valid_until)}` : " → indefinido"}
            </p>
            {plan.notes && (
              <p style={{ color: "#555", fontSize: "0.82rem", fontStyle: "italic", margin: "0.35rem 0 0 0" }}>{plan.notes}</p>
            )}
          </div>
          <a
            href={urlData.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#a3e635", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}
          >
            ↗ Abrir en nueva pestaña
          </a>
        </div>
      </div>

      {/* Visor PDF */}
      <div style={{ flex: 1, padding: "1.5rem 2rem" }}>
        <PdfViewer signedUrl={urlData.signedUrl} fileName={plan.file_name} />
      </div>
    </div>
  );
}
