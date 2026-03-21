import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const assignSchema = z.object({
  team_id: z.string().uuid(),
});

// POST /api/coach/runners/[runnerId]/teams — asignar runner a equipo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runnerId: string }> }
) {
  const { runnerId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "team_id inválido" }, { status: 400 });
  }

  const { team_id } = parsed.data;

  // Verificar que el runner está en el pool del coach
  const { data: rel } = await supabase
    .from("coach_runners")
    .select("id")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single();

  if (!rel) {
    return NextResponse.json(
      { error: "El runner no pertenece a tu pool" },
      { status: 403 }
    );
  }

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", team_id)
    .eq("coach_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json(
      { error: "El equipo no te pertenece" },
      { status: 403 }
    );
  }

  // Insertar en team_memberships
  const { error: insertError } = await supabase
    .from("team_memberships")
    .insert({ team_id, runner_id: runnerId });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { message: "El runner ya está en este equipo" },
        { status: 200 }
      );
    }
    console.error("Error asignando runner a equipo:", insertError);
    return NextResponse.json({ error: "Error al asignar" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/coach/runners/[runnerId]/teams — desasignar runner de equipo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ runnerId: string }> }
) {
  const { runnerId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const team_id = searchParams.get("team_id");

  if (!team_id) {
    return NextResponse.json({ error: "team_id requerido" }, { status: 400 });
  }

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", team_id)
    .eq("coach_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "El equipo no te pertenece" }, { status: 403 });
  }

  const { error } = await supabase
    .from("team_memberships")
    .delete()
    .eq("team_id", team_id)
    .eq("runner_id", runnerId);

  if (error) {
    console.error("Error desasignando runner:", error);
    return NextResponse.json({ error: "Error al desasignar" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
