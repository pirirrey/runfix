import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ venueId: string; sessionId: string }> };

async function verifyOwner(supabase: Awaited<ReturnType<typeof createClient>>, venueId: string, userId: string) {
  const { data } = await supabase
    .from("coach_venues")
    .select("coach_id")
    .eq("id", venueId)
    .single();
  return data?.coach_id === userId;
}

// PATCH — actualiza un horario
export async function PATCH(req: Request, { params }: Params) {
  const { venueId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!await verifyOwner(supabase, venueId, user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { location, days, start_time, notes } = body;

  const { data, error } = await supabase
    .from("venue_sessions")
    .update({
      location:   location?.trim(),
      days,
      start_time,
      notes:      notes?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("venue_id", venueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — elimina un horario
export async function DELETE(_req: Request, { params }: Params) {
  const { venueId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!await verifyOwner(supabase, venueId, user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("venue_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("venue_id", venueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
