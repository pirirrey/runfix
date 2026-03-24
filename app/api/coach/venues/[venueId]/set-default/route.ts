import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ venueId: string }> };

// POST — marca esta sede como por defecto (y desmarca las demás del mismo coach)
export async function POST(_req: Request, { params }: Params) {
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

  // Desmarcar todas las sedes del coach
  await supabase
    .from("coach_venues")
    .update({ is_default: false })
    .eq("coach_id", user.id);

  // Marcar esta como default
  const { data, error } = await supabase
    .from("coach_venues")
    .update({ is_default: true })
    .eq("id", venueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — quita el default de esta sede (queda sin default)
export async function DELETE(_req: Request, { params }: Params) {
  const { venueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: venue } = await supabase
    .from("coach_venues")
    .select("coach_id")
    .eq("id", venueId)
    .single();

  if (!venue || venue.coach_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("coach_venues")
    .update({ is_default: false })
    .eq("id", venueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
