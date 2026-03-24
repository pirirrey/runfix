import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type RunnerAlert = {
  id: string;
  type: "error" | "warning" | "info";
  category: "cert" | "payment";
  title: string;
  message: string;
  href: string;
};

/** Devuelve el Nth día hábil (lun–vie) del mes dado */
function getNthBusinessDay(year: number, month: number, n: number): Date {
  let count = 0;
  let day = 1;
  while (true) {
    const d = new Date(year, month, day);
    const dow = d.getDay(); // 0=dom 6=sab
    if (dow !== 0 && dow !== 6) {
      count++;
      if (count === n) return d;
    }
    day++;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const alerts: RunnerAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 1. CERTIFICADOS MÉDICOS ─────────────────────────────────────────────
  const { data: certs } = await supabase
    .from("medical_certificates")
    .select("id, expires_at")
    .eq("runner_id", user.id)
    .order("expires_at", { ascending: false });

  if (!certs || certs.length === 0) {
    alerts.push({
      id: "cert-missing",
      type: "info",
      category: "cert",
      title: "Sin certificado médico",
      message: "No tenés ningún apto médico cargado. Tu entrenador puede necesitarlo.",
      href: "/runner/profile",
    });
  } else {
    // Tomar el más reciente
    const latest = certs[0];
    const exp = new Date(latest.expires_at + "T00:00:00");
    const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      alerts.push({
        id: "cert-expired",
        type: "error",
        category: "cert",
        title: "Apto médico vencido",
        message: `Venció el ${exp.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}. Cargá uno nuevo.`,
        href: "/runner/profile",
      });
    } else if (diffDays <= 30) {
      alerts.push({
        id: "cert-expiring",
        type: "warning",
        category: "cert",
        title: "Apto médico por vencer",
        message: diffDays === 0
          ? "Vence hoy. Renovalo cuanto antes."
          : `Vence en ${diffDays} día${diffDays !== 1 ? "s" : ""}. Acordate de renovarlo.`,
        href: "/runner/profile",
      });
    }
  }

  // ── 2. PAGOS ────────────────────────────────────────────────────────────
  // Traer coaches con plan mensual y su due_day configurado
  const { data: crRows } = await supabase
    .from("coach_runners")
    .select("coach_id, joined_at")
    .eq("runner_id", user.id)
    .eq("suspended", false);

  if (crRows && crRows.length > 0) {
    const coachIds = crRows.map(r => r.coach_id);

    // Planes de pago del runner por coach
    const { data: paymentPlans } = await supabase
      .from("runner_payment_plans")
      .select("coach_id, plan_type")
      .eq("runner_id", user.id)
      .in("coach_id", coachIds);

    // Perfiles de coaches para obtener due_day
    const { data: coachProfiles } = await supabase
      .from("profiles")
      .select("id, team_name, full_name, plan_monthly_due_day")
      .in("id", coachIds);

    // Recibos del mes actual
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: receipts } = await supabase
      .from("payment_receipts")
      .select("coach_id, payment_month")
      .eq("runner_id", user.id)
      .eq("payment_month", currentMonthStr)
      .in("coach_id", coachIds);

    const paidCoachIds = new Set((receipts ?? []).map(r => r.coach_id));

    for (const cr of crRows) {
      // Solo alerta si el plan es mensual (o no tiene plan asignado = por defecto mensual)
      const plan = paymentPlans?.find(p => p.coach_id === cr.coach_id);
      if (plan?.plan_type === "annual" || plan?.plan_type === "exempt") continue;

      // Ya tiene recibo este mes → sin alerta
      if (paidCoachIds.has(cr.coach_id)) continue;

      const coach = coachProfiles?.find(c => c.id === cr.coach_id);
      const dueDay = (coach as { plan_monthly_due_day?: number | null } | undefined)?.plan_monthly_due_day ?? 5;
      const teamName = (coach as { team_name?: string | null; full_name?: string | null } | undefined)?.team_name
        || (coach as { full_name?: string | null } | undefined)?.full_name
        || "tu entrenador";

      // Calcular Nth día hábil del mes actual
      const dueDate = getNthBusinessDay(today.getFullYear(), today.getMonth(), dueDay);
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);

      if (diffDays < 0) {
        // Vencido
        alerts.push({
          id: `payment-overdue-${cr.coach_id}`,
          type: "error",
          category: "payment",
          title: "Pago vencido",
          message: `El pago de ${teamName} venció el ${dueDate.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}. Regularizá con tu entrenador.`,
          href: "/runner/payments",
        });
      } else if (diffDays <= 2) {
        // Vence en 0–2 días
        alerts.push({
          id: `payment-due-${cr.coach_id}`,
          type: "warning",
          category: "payment",
          title: diffDays === 0 ? "El pago vence hoy" : `El pago vence en ${diffDays} día${diffDays !== 1 ? "s" : ""}`,
          message: `Cuota mensual de ${teamName}. Vencimiento: ${dueDate.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}.`,
          href: "/runner/payments",
        });
      }
    }
  }

  return NextResponse.json({ alerts });
}
