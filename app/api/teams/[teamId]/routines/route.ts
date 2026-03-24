import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ teamId: string }> };

// GET — listar rutinas de un equipo
export async function GET(_req: NextRequest, { params }: Params) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("daily_routines")
    .select("id, training_date, routine, created_at, updated_at")
    .eq("team_id", teamId)
    .order("training_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — crear una rutina (solo coach del equipo)
export async function POST(req: NextRequest, { params }: Params) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verificar que el usuario es coach de este equipo
  const { data: team } = await supabase
    .from("teams")
    .select("coach_id")
    .eq("id", teamId)
    .single<{ coach_id: string }>();

  if (!team || team.coach_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { training_date, routine } = body as { training_date?: string; routine?: string };

  if (!training_date || !routine?.trim()) {
    return NextResponse.json({ error: "Fecha y rutina son obligatorias" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("daily_routines")
    .insert({ coach_id: user.id, team_id: teamId, training_date, routine: routine.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
