import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ coachId: string }> };

// GET — venues del coach con sus sesiones + cuáles tiene asignadas el runner
export async function GET(_req: Request, { params }: Params) {
  const { coachId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verificar que el runner está asociado a este coach
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("coach_id")
    .eq("coach_id", coachId)
    .eq("runner_id", user.id)
    .maybeSingle();
  if (!cr) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Solo venues marcadas como seleccionables por el runner
  const { data: venues, error } = await supabase
    .from("coach_venues")
    .select(`id, name, notes, sort_order,
      sessions:venue_sessions(id, location, days, start_time, notes, sort_order)`)
    .eq("coach_id", coachId)
    .eq("runner_selectable", true)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Asignaciones actuales del runner para este coach
  const { data: assigned } = await supabase
    .from("runner_venues")
    .select("venue_id")
    .eq("coach_id", coachId)
    .eq("runner_id", user.id);

  const assignedIds = (assigned ?? []).map(a => a.venue_id);

  return NextResponse.json({ venues: venues ?? [], assignedIds });
}

// PATCH — toggle de una sede (agrega si no existe, quita si ya está)
export async function PATCH(req: Request, { params }: Params) {
  const { coachId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verificar asociación
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("coach_id")
    .eq("coach_id", coachId)
    .eq("runner_id", user.id)
    .maybeSingle();
  if (!cr) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { venue_id } = await req.json();
  if (!venue_id) return NextResponse.json({ error: "venue_id requerido" }, { status: 400 });

  // Verificar que la sede pertenece a este coach
  const { data: venue } = await supabase
    .from("coach_venues")
    .select("id")
    .eq("id", venue_id)
    .eq("coach_id", coachId)
    .maybeSingle();
  if (!venue) return NextResponse.json({ error: "Sede inválida" }, { status: 400 });

  // Ver si ya existe
  const { data: existing } = await supabase
    .from("runner_venues")
    .select("venue_id")
    .eq("coach_id", coachId)
    .eq("runner_id", user.id)
    .eq("venue_id", venue_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("runner_venues")
      .delete()
      .eq("coach_id", coachId)
      .eq("runner_id", user.id)
      .eq("venue_id", venue_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "removed", venue_id });
  } else {
    const { error } = await supabase
      .from("runner_venues")
      .insert({ coach_id: coachId, runner_id: user.id, venue_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "added", venue_id });
  }
}
