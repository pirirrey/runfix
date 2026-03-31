import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — devuelve todos los coaches con su plan + comprobantes del runner autenticado
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Coaches asociados
  const { data: coachRows } = await supabase
    .from("coach_runners")
    .select("coach_id, joined_at")
    .eq("runner_id", user.id)
    .eq("suspended", false);

  if (!coachRows || coachRows.length === 0) return NextResponse.json([]);

  const coachIds = coachRows.map((r) => r.coach_id);

  // Perfiles de coaches (incluye configuración de precios)
  const { data: coachProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, team_name, plan_monthly_price, plan_monthly_due_day, plan_annual_price")
    .in("id", coachIds);

  // Cuentas bancarias de cada coach
  const { data: bankAccounts } = await supabase
    .from("coach_bank_accounts")
    .select("id, coach_id, bank_name, holder, cbu, alias")
    .in("coach_id", coachIds)
    .order("sort_order", { ascending: true });

  // Planes de pago
  const { data: plans } = await supabase
    .from("runner_payment_plans")
    .select("coach_id, plan_type, amount, notes, discount_pct")
    .eq("runner_id", user.id)
    .in("coach_id", coachIds);

  // Comprobantes
  const { data: receipts } = await supabase
    .from("payment_receipts")
    .select("id, coach_id, payment_month, payment_date, method, storage_path, file_name, notes, created_at")
    .eq("runner_id", user.id)
    .in("coach_id", coachIds)
    .order("payment_month", { ascending: false });

  const result = coachIds.map((coachId) => {
    const profile = coachProfiles?.find((p) => p.id === coachId);
    const row = coachRows?.find((r) => r.coach_id === coachId);
    const plan = plans?.find((p) => p.coach_id === coachId) ?? { plan_type: "monthly", amount: null, notes: null, discount_pct: 0 };
    const coachReceipts = receipts?.filter((r) => r.coach_id === coachId) ?? [];
    return {
      coach: {
        id: coachId,
        full_name: profile?.full_name ?? null,
        team_name: profile?.team_name ?? null,
        joined_at: row?.joined_at ?? null,
      },
      plan,
      pricing: {
        monthly_price:   (profile as { plan_monthly_price?: number | null } | undefined)?.plan_monthly_price   ?? null,
        monthly_due_day: (profile as { plan_monthly_due_day?: number | null } | undefined)?.plan_monthly_due_day ?? null,
        annual_price:    (profile as { plan_annual_price?: number | null } | undefined)?.plan_annual_price    ?? null,
      },
      bank: (bankAccounts ?? []).filter(b => b.coach_id === coachId),
      receipts: coachReceipts,
    };
  });

  return NextResponse.json(result);
}

// POST — registrar un nuevo comprobante (el archivo ya fue subido al storage por el cliente)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { coach_id, payment_month, payment_date, method, storage_path, file_name, notes } = body;

  if (!coach_id || !payment_month || !payment_date || !method) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Verificar que el runner está asociado a este coach
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("coach_id")
    .eq("runner_id", user.id)
    .eq("coach_id", coach_id)
    .single();

  if (!cr) return NextResponse.json({ error: "Coach no encontrado" }, { status: 404 });

  const { data, error } = await supabase
    .from("payment_receipts")
    .upsert({
      runner_id: user.id,
      coach_id,
      payment_month,
      payment_date,
      method,
      storage_path: storage_path ?? null,
      file_name: file_name ?? null,
      notes: notes ?? null,
    }, { onConflict: "runner_id,coach_id,payment_month" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
