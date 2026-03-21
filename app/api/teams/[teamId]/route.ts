import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: team } = await supabase
    .from("teams")
    .select("id, coach_id")
    .eq("id", teamId)
    .single<{ id: string; coach_id: string }>();

  if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  if (team.coach_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { name, description, general_notes, team_pdf_path } = body;

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { general_notes, team_pdf_path };
  if (name !== undefined) updatePayload.name = String(name).trim();
  if (description !== undefined) updatePayload.description = description;

  const { error } = await supabase
    .from("teams")
    .update(updatePayload)
    .eq("id", teamId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from("teams")
    .select("id, coach_id")
    .eq("id", teamId)
    .single<{ id: string; coach_id: string }>();

  if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  if (team.coach_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { error } = await supabase.from("teams").delete().eq("id", teamId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
