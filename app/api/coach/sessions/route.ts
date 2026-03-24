import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("coach_training_sessions")
    .select("id, location, days, start_time, notes, sort_order")
    .eq("coach_id", user.id)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { location, days, start_time, notes } = body;

  if (!location?.trim())
    return NextResponse.json({ error: "El nombre del lugar es obligatorio" }, { status: 400 });
  if (!Array.isArray(days) || days.length === 0)
    return NextResponse.json({ error: "Seleccioná al menos un día" }, { status: 400 });
  if (!start_time)
    return NextResponse.json({ error: "El horario es obligatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("coach_training_sessions")
    .insert({
      coach_id: user.id,
      location: location.trim(),
      days,
      start_time,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
