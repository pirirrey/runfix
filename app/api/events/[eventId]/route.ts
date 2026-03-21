import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const updateSchema = z.object({
  name:          z.string().min(1).optional(),
  location:      z.string().nullable().optional(),
  race_type:     z.enum(["street", "trail"]).optional(),
  start_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  discount_code: z.string().nullable().optional(),
  notes:         z.string().nullable().optional(),
});

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function verifyOwner(supabase: Awaited<ReturnType<typeof getSupabase>>, eventId: string, userId: string) {
  const { data } = await supabase.from("race_events").select("id, coach_id").eq("id", eventId).single();
  return data?.coach_id === userId ? data : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!await verifyOwner(supabase, eventId, user.id))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { data, error } = await supabase.from("race_events").update(parsed.data).eq("id", eventId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!await verifyOwner(supabase, eventId, user.id))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { error } = await supabase.from("race_events").delete().eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
