import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ runnerId: string }> };

// GET — devuelve las sedes asignadas al runner
export async function GET(_req: Request, { params }: Params) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("runner_venues")
    .select("venue_id, venue:coach_venues(id, name)")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH — toggle: agrega si no existe, quita si ya existe
export async function PATCH(req: Request, { params }: Params) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verificar que el runner pertenece a este coach
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("coach_id")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single();
  if (!cr) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { venue_id } = await req.json();
  if (!venue_id) return NextResponse.json({ error: "venue_id requerido" }, { status: 400 });

  // Verificar que la sede pertenece a este coach
  const { data: venue } = await supabase
    .from("coach_venues")
    .select("id")
    .eq("id", venue_id)
    .eq("coach_id", user.id)
    .single();
  if (!venue) return NextResponse.json({ error: "Sede inválida" }, { status: 400 });

  // Ver si ya existe la asignación
  const { data: existing } = await supabase
    .from("runner_venues")
    .select("venue_id")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .eq("venue_id", venue_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("runner_venues")
      .delete()
      .eq("coach_id", user.id)
      .eq("runner_id", runnerId)
      .eq("venue_id", venue_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "removed", venue_id });
  } else {
    const { error } = await supabase
      .from("runner_venues")
      .insert({ coach_id: user.id, runner_id: runnerId, venue_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "added", venue_id });
  }
}
