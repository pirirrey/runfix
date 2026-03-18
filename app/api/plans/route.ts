import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  team_id: z.string().uuid(),
  runner_id: z.string().uuid(),
  plan_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Formato: YYYY-MM-01"),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = { ...parsed.data, coach_id: user.id };

  // Upsert: reemplaza el plan si ya existe para ese runner/mes/equipo
  const { data, error } = await supabase
    .from("training_plans")
    .upsert(payload, { onConflict: "team_id,runner_id,plan_month" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
