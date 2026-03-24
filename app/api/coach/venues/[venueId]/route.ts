import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ venueId: string }> };

async function verifyOwner(supabase: Awaited<ReturnType<typeof createClient>>, venueId: string, userId: string) {
  const { data } = await supabase
    .from("coach_venues")
    .select("coach_id")
    .eq("id", venueId)
    .single();
  return data?.coach_id === userId;
}

// PATCH — renombrar sede o actualizar notas
export async function PATCH(req: Request, { params }: Params) {
  const { venueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!await verifyOwner(supabase, venueId, user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, notes, runner_selectable } = body;

  const patch: Record<string, unknown> = {};
  if (name !== undefined)               patch.name = name.trim();
  if (notes !== undefined)              patch.notes = notes?.trim() || null;
  if (runner_selectable !== undefined)  patch.runner_selectable = runner_selectable;

  const { data, error } = await supabase
    .from("coach_venues")
    .update(patch)
    .eq("id", venueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — elimina sede y sus horarios en cascada
export async function DELETE(_req: Request, { params }: Params) {
  const { venueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!await verifyOwner(supabase, venueId, user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("coach_venues")
    .delete()
    .eq("id", venueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
