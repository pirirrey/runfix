import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ venueId: string }> };

// POST — agrega un horario a una sede
export async function POST(req: Request, { params }: Params) {
  const { venueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verificar que la sede pertenece al coach
  const { data: venue } = await supabase
    .from("coach_venues")
    .select("coach_id")
    .eq("id", venueId)
    .single();

  if (!venue || venue.coach_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { location, days, start_time, notes } = body;

  if (!location?.trim())
    return NextResponse.json({ error: "El lugar es obligatorio" }, { status: 400 });
  if (!Array.isArray(days) || days.length === 0)
    return NextResponse.json({ error: "Seleccioná al menos un día" }, { status: 400 });
  if (!start_time)
    return NextResponse.json({ error: "El horario es obligatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("venue_sessions")
    .insert({
      venue_id:   venueId,
      location:   location.trim(),
      days,
      start_time,
      notes:      notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
