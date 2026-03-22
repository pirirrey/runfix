import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ runnerId: string }> };

// GET — obtener el plan asignado a este runner
export async function GET(_req: NextRequest, { params }: Params) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data } = await supabase
    .from("runner_payment_plans")
    .select("plan_type, amount, notes, updated_at")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single();

  // Si no hay plan seteado, devolver el default
  if (!data) return NextResponse.json({ plan_type: "monthly", amount: null, notes: null });
  return NextResponse.json(data);
}

// PUT — crear o actualizar el plan
export async function PUT(req: NextRequest, { params }: Params) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const plan_type: string = body.plan_type ?? "monthly";
  const amount: number | null = body.amount ?? null;
  const notes: string | null = body.notes ?? null;

  if (!["monthly", "annual", "exempt"].includes(plan_type)) {
    return NextResponse.json({ error: "Tipo de plan inválido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("runner_payment_plans")
    .upsert({
      coach_id: user.id,
      runner_id: runnerId,
      plan_type,
      amount,
      notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "coach_id,runner_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan_type, amount, notes });
}
