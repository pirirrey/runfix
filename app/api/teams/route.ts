import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verificar límite de equipos según plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single<{ subscription_plan: string }>();

  const plan = (profile?.subscription_plan ?? "starter") as PlanId;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

  if (limits.maxTeams !== null) {
    const { count } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id);

    if ((count ?? 0) >= limits.maxTeams) {
      return NextResponse.json({
        error: "PLAN_LIMIT",
        limitType: "teams",
        current: count,
        max: limits.maxTeams,
        plan,
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({ ...parsed.data, coach_id: user.id })
    .select("id, invite_code")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
