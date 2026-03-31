import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RunnerProfileAccordion } from "@/components/coach/RunnerProfileAccordion";

type Params = { runnerId: string };

function calcAge(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate + "T00:00:00");
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function certStatusInfo(expiresAt: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)   return { label: "Vencido",        color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)",  icon: "⚠" };
  if (diffDays <= 30) return { label: `Vence en ${diffDays}d`, color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)",   icon: "⏰" };
  return               { label: "Vigente",        color: "#a3e635", bg: "rgba(163,230,53,0.1)",  border: "rgba(163,230,53,0.25)",  icon: "✓" };
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const genderLabel: Record<string, string> = {
  male: "Masculino", female: "Femenino", other: "Otro",
};

const fieldLabel: React.CSSProperties = {
  color: "#555", fontSize: "0.7rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem",
};
const fieldValue: React.CSSProperties = {
  color: "white", fontSize: "0.9rem", fontWeight: 500,
};

export default async function RunnerProfileCoachView({
  params,
}: {
  params: Promise<Params>;
}) {
  const { runnerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar que el runner está asociado a este coach
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("suspended, joined_at")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single<{ suspended: boolean; joined_at: string }>();

  if (!cr) notFound();

  // Perfil del runner
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, last_name, gender, birth_date, email, phone")
    .eq("id", runnerId)
    .single<{
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
      gender: string | null;
      birth_date: string | null;
      email: string | null;
      phone: string | null;
    }>();

  if (!profile) notFound();

  // Certificados médicos
  const { data: certs } = await supabase
    .from("medical_certificates")
    .select("id, file_name, storage_path, expires_at, uploaded_at")
    .eq("runner_id", runnerId)
    .order("expires_at", { ascending: false })
    .returns<{ id: string; file_name: string; storage_path: string; expires_at: string; uploaded_at: string }[]>();

  // Configuración de precios del coach (para mostrar en el panel)
  const { data: coachPricing } = await supabase
    .from("profiles")
    .select("plan_monthly_price, plan_monthly_due_day, plan_annual_price")
    .eq("id", user.id)
    .single<{ plan_monthly_price: number | null; plan_monthly_due_day: number | null; plan_annual_price: number | null }>();

  // Plan de pago y comprobantes
  const { data: paymentPlan } = await supabase
    .from("runner_payment_plans")
    .select("plan_type, notes, discount_pct")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single<{ plan_type: "monthly" | "annual" | "exempt"; notes: string | null; discount_pct: number | null }>();

  const { data: paymentReceipts } = await supabase
    .from("payment_receipts")
    .select("id, payment_month, payment_date, method, storage_path, file_name, notes, created_at")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .order("payment_month", { ascending: false })
    .returns<{
      id: string; payment_month: string; payment_date: string;
      method: "transfer" | "cash" | "other"; storage_path: string | null;
      file_name: string | null; notes: string | null; created_at: string;
    }[]>();

  // Generar signed URLs
  const certsWithUrls = await Promise.all(
    (certs ?? []).map(async (c) => {
      const { data } = await supabase.storage
        .from("training-plans")
        .createSignedUrl(c.storage_path, 3600);
      return { ...c, signedUrl: data?.signedUrl ?? null };
    })
  );

  const displayName = profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email || "Runner";

  const age = profile.birth_date ? calcAge(profile.birth_date) : null;

  // Sedes del coach + sedes asignadas al runner
  const { data: venues } = await supabase
    .from("coach_venues")
    .select("id, name")
    .eq("coach_id", user.id)
    .order("sort_order")
    .order("created_at")
    .returns<{ id: string; name: string }[]>();

  const { data: runnerVenues } = await supabase
    .from("runner_venues")
    .select("venue_id")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .returns<{ venue_id: string }[]>();

  const currentVenueIds = (runnerVenues ?? []).map(rv => rv.venue_id);

  // Certificado más reciente
  const latestCert = certsWithUrls[0] ?? null;

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>

      {/* Back */}
      <Link
        href="/coach/runners"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          color: "#555", fontSize: "0.82rem", textDecoration: "none",
          marginBottom: "1.75rem",
          transition: "color 0.15s",
        }}
      >
        ← Mis runners
      </Link>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "1.25rem",
        marginBottom: "2rem",
      }}>
        {/* Avatar */}
        <div style={{
          width: "3.5rem", height: "3.5rem", borderRadius: "50%", flexShrink: 0,
          background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.35rem", color: "#a3e635", fontWeight: 800,
        }}>
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              {displayName}
            </h1>
            {cr.suspended && (
              <span style={{
                background: "rgba(180,30,30,0.15)", border: "1px solid rgba(180,30,30,0.3)",
                color: "#c05050", fontSize: "0.65rem", fontWeight: 700,
                padding: "0.15rem 0.5rem", borderRadius: "2rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Suspendido
              </span>
            )}
          </div>
          <p style={{ color: "#555", fontSize: "0.82rem", margin: "0.2rem 0 0 0" }}>
            {profile.email}
          </p>
        </div>
      </div>

      <RunnerProfileAccordion
        runnerId={runnerId}
        runnerName={profile.first_name ?? profile.full_name?.split(" ")[0] ?? "el runner"}
        profile={profile}
        age={age}
        certs={certsWithUrls}
        latestCert={latestCert}
        venues={venues ?? []}
        currentVenueIds={currentVenueIds}
        paymentPlan={paymentPlan ?? null}
        paymentReceipts={paymentReceipts ?? []}
        coachPricing={{
          monthly_price:   coachPricing?.plan_monthly_price   ?? null,
          monthly_due_day: coachPricing?.plan_monthly_due_day ?? null,
          annual_price:    coachPricing?.plan_annual_price    ?? null,
        }}
      />

    </main>
  );
}
