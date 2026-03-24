import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — devuelve la configuración de planes del coach autenticado
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("plan_monthly_price, plan_monthly_due_day, plan_annual_price, plan_annual_enabled, plan_exempt_enabled")
    .eq("id", user.id)
    .single<{
      plan_monthly_price:   number | null;
      plan_monthly_due_day: number | null;
      plan_annual_price:    number | null;
      plan_annual_enabled:  boolean;
      plan_exempt_enabled:  boolean;
    }>();

  return NextResponse.json({
    plan_monthly_price:   data?.plan_monthly_price   ?? null,
    plan_monthly_due_day: data?.plan_monthly_due_day ?? null,
    plan_annual_price:    data?.plan_annual_price    ?? null,
    plan_annual_enabled:  data?.plan_annual_enabled  ?? false,
    plan_exempt_enabled:  data?.plan_exempt_enabled  ?? false,
  });
}

// PUT — actualiza la configuración de planes
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  const plan_monthly_price:   number | null  = body.plan_monthly_price   ?? null;
  const plan_monthly_due_day: number | null  = body.plan_monthly_due_day ?? null;
  const plan_annual_price:    number | null  = body.plan_annual_price    ?? null;
  const plan_annual_enabled:  boolean        = body.plan_annual_enabled  ?? false;
  const plan_exempt_enabled:  boolean        = body.plan_exempt_enabled  ?? false;

  if (plan_monthly_due_day !== null && (plan_monthly_due_day < 1 || plan_monthly_due_day > 31)) {
    return NextResponse.json({ error: "Día de vencimiento inválido (debe ser entre 1 y 31)" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ plan_monthly_price, plan_monthly_due_day, plan_annual_price, plan_annual_enabled, plan_exempt_enabled })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
