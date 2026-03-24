import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/runner/PrintButton";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default async function PrintRoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; month?: string }>;
}) {
  const { teamId, month } = await searchParams;
  if (!teamId || !month) redirect("/runner/plans");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar membresía
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("coach_notes")
    .eq("team_id", teamId)
    .eq("runner_id", user.id)
    .single<{ coach_notes: string | null }>();

  if (!membership) redirect("/runner/plans");

  // Equipo
  const { data: team } = await supabase
    .from("teams")
    .select("name, coach_id")
    .eq("id", teamId)
    .single<{ name: string; coach_id: string }>();

  if (!team) redirect("/runner/plans");

  // Perfil del coach
  const { data: coach } = await supabase
    .from("profiles")
    .select("team_name, team_logo_path, full_name")
    .eq("id", team.coach_id)
    .single<{ team_name: string | null; team_logo_path: string | null; full_name: string | null }>();

  // Logo del equipo
  let logoUrl: string | null = null;
  if (coach?.team_logo_path) {
    const { data } = await supabase.storage.from("training-plans").createSignedUrl(coach.team_logo_path, 7200);
    logoUrl = data?.signedUrl ?? null;
  }

  // Rutinas del mes
  const { data: routines } = await supabase
    .from("daily_routines")
    .select("id, training_date, routine")
    .eq("team_id", teamId)
    .gte("training_date", `${month}-01`)
    .lte("training_date", `${month}-31`)
    .order("training_date", { ascending: true })
    .returns<{ id: string; training_date: string; routine: string }[]>();

  // Plan del mes (notas al grupo + nombre PDF)
  const { data: plan } = await supabase
    .from("training_plans")
    .select("notes, file_name")
    .eq("team_id", teamId)
    .gte("valid_from", `${month}-01`)
    .lte("valid_from", `${month}-31`)
    .is("runner_id", null)
    .maybeSingle<{ notes: string | null; file_name: string | null }>();

  const teamName  = coach?.team_name || team.name;
  const monthLabel = capitalize(
    new Date(`${month}-01T00:00:00`).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
  );
  const hasRoutines = (routines?.length ?? 0) > 0;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          @page { margin: 1.5cm; size: A4 portrait; }
        }
        * { box-sizing: border-box; }
        body { background: #f5f5f5; font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
      `}</style>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1.5rem", background: "white", minHeight: "100vh" }}>

        {/* ── Cabecera ─────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
          {/* Logo + nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "0.5rem", overflow: "hidden", background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
              {logoUrl
                ? <img src={logoUrl} alt={teamName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : "🏃"}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: "1.25rem", margin: 0, color: "#111", lineHeight: 1.2 }}>{teamName}</p>
              {coach?.full_name && coach.team_name && (
                <p style={{ color: "#888", fontSize: "0.8rem", margin: "0.2rem 0 0 0" }}>{coach.full_name}</p>
              )}
            </div>
          </div>
          {/* Mes */}
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#aaa", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Planificación</p>
            <p style={{ fontWeight: 800, fontSize: "1.15rem", color: "#1e2431", margin: "0.15rem 0 0 0" }}>{monthLabel}</p>
          </div>
        </div>

        {/* Línea con gradiente */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #1e2431 0%, #a3e635 60%, #1e2431 100%)", marginBottom: "2rem", borderRadius: "2px" }} />

        {/* ── Indicaciones al grupo ────────────────────── */}
        {plan?.notes && (
          <div style={{ marginBottom: "1.75rem", padding: "0.875rem 1rem", background: "#f8f9f0", borderRadius: "0.5rem", border: "1px solid #d4e89a" }}>
            <p style={{ color: "#5a7a1a", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.5rem 0" }}>
              👥 Indicaciones al grupo
            </p>
            <p style={{ color: "#333", fontSize: "0.9rem", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{plan.notes}</p>
          </div>
        )}

        {/* ── Indicaciones personales ──────────────────── */}
        {membership.coach_notes && (
          <div style={{ marginBottom: "1.75rem", padding: "0.875rem 1rem", background: "#f0f4ff", borderRadius: "0.5rem", border: "1px solid #c5d3f5" }}>
            <p style={{ color: "#3b5cc5", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.5rem 0" }}>
              📝 Mis indicaciones
            </p>
            <p style={{ color: "#333", fontSize: "0.9rem", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{membership.coach_notes}</p>
          </div>
        )}

        {/* ── Rutinas ──────────────────────────────────── */}
        {hasRoutines ? (
          <div>
            <p style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 1.25rem 0" }}>
              🗓 Rutinas de entrenamiento
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {(routines ?? []).map((r, i) => (
                <div key={r.id}>
                  {/* Fecha */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1e2431", textTransform: "capitalize" }}>
                      {fmtDate(r.training_date)}
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "#e5e5e5" }} />
                  </div>
                  {/* Rutina */}
                  <p style={{ color: "#222", fontSize: "0.925rem", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap", paddingLeft: "1rem", borderLeft: "3px solid #a3e635" }}>
                    {r.routine}
                  </p>
                  {i < (routines?.length ?? 1) - 1 && (
                    <div style={{ height: "1px", background: "#f0f0f0", marginTop: "1.25rem" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: "#aaa", fontSize: "0.9rem", textAlign: "center", padding: "2rem 0" }}>
            No hay rutinas cargadas para este mes.
          </p>
        )}

        {/* ── PDF del plan (referencia) ─────────────────── */}
        {plan?.file_name && (
          <div style={{ marginTop: "2rem", padding: "0.625rem 1rem", background: "#fafafa", borderRadius: "0.4rem", border: "1px solid #eee", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>📄</span>
            <span style={{ color: "#888", fontSize: "0.8rem" }}>Plan: {plan.file_name}</span>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────── */}
        <div style={{ marginTop: "3.5rem", paddingTop: "1rem", borderTop: "1px solid #eeeeee", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
          <span style={{ color: "#bbb", fontSize: "0.7rem", fontStyle: "italic" }}>Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/runfix-light.svg" alt="Runfix" style={{ height: "1rem", opacity: 0.4 }} />
        </div>

        {/* ── Botón imprimir ───────────────────────────── */}
        <div className="no-print" style={{ textAlign: "center", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #f0f0f0" }}>
          <PrintButton />
        </div>

      </div>
    </>
  );
}
