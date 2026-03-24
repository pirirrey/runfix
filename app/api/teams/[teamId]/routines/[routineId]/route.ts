import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ teamId: string; routineId: string }> };

// PATCH — editar una rutina
export async function PATCH(req: NextRequest, { params }: Params) {
  const { teamId, routineId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { training_date, routine } = body as { training_date?: string; routine?: string };

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (training_date) updates.training_date = training_date;
  if (routine?.trim()) updates.routine = routine.trim();

  const { data, error } = await supabase
    .from("daily_routines")
    .update(updates)
    .eq("id", routineId)
    .eq("team_id", teamId)
    .eq("coach_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — eliminar una rutina
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { teamId, routineId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { error } = await supabase
    .from("daily_routines")
    .delete()
    .eq("id", routineId)
    .eq("team_id", teamId)
    .eq("coach_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
