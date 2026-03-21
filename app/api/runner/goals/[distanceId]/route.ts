import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

// POST — marcar como objetivo
export async function POST(_req: NextRequest, { params }: { params: Promise<{ distanceId: string }> }) {
  const { distanceId } = await params;
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("runner_event_goals")
    .insert({ runner_id: user.id, distance_id: distanceId });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true }); // ya marcado
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE — desmarcar objetivo
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ distanceId: string }> }) {
  const { distanceId } = await params;
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("runner_event_goals")
    .delete()
    .eq("runner_id", user.id)
    .eq("distance_id", distanceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
