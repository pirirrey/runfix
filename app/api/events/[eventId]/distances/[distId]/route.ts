import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ eventId: string; distId: string }> }) {
  const { eventId, distId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: ev } = await supabase.from("race_events").select("coach_id").eq("id", eventId).single();
  if (!ev || ev.coach_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { error } = await supabase.from("race_event_distances").delete().eq("id", distId).eq("event_id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH para actualizar altimetry_path
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string; distId: string }> }) {
  const { eventId, distId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: ev } = await supabase.from("race_events").select("coach_id").eq("id", eventId).single();
  if (!ev || ev.coach_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { altimetry_path } = await req.json();
  const { error } = await supabase.from("race_event_distances").update({ altimetry_path }).eq("id", distId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
