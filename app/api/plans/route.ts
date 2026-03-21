import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  team_id:      z.string().uuid(),
  valid_from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  valid_until:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  storage_path: z.string().min(1),
  file_name:    z.string().min(1),
  file_size:    z.number().optional(),
  notes:        z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { team_id, valid_from, valid_until, storage_path, file_name, file_size, notes } = parsed.data;

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", team_id)
    .eq("coach_id", user.id)
    .single();

  if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 403 });

  const { data, error } = await supabase
    .from("training_plans")
    .insert({
      team_id,
      coach_id: user.id,
      valid_from,
      valid_until: valid_until ?? null,
      storage_path,
      file_name,
      file_size,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
