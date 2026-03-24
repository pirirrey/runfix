import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

// GET — lista todas las sedes del coach con sus horarios anidados
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("coach_venues")
    .select(`
      id, name, notes, sort_order, created_at,
      venue_sessions ( id, location, days, start_time, notes, sort_order, created_at )
    `)
    .eq("coach_id", user.id)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — crea una nueva sede
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, notes } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "El nombre de la sede es obligatorio" }, { status: 400 });

  // Verificar límite de sedes según plan
  const { data: profileData } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", user.id)
    .single<{ subscription_plan: string }>();

  const planId = (profileData?.subscription_plan ?? "starter") as PlanId;
  const limits = PLAN_LIMITS[planId];

  if (limits.maxVenues !== null) {
    const { count } = await supabase
      .from("coach_venues")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id);

    if ((count ?? 0) >= limits.maxVenues) {
      return NextResponse.json({
        error: `Tu plan ${planId === "starter" ? "Starter" : "Pro"} permite hasta ${limits.maxVenues} sede${limits.maxVenues !== 1 ? "s" : ""}. Cambiá de plan para agregar más.`,
        limitReached: true,
      }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("coach_venues")
    .insert({ coach_id: user.id, name: name.trim(), notes: notes?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
