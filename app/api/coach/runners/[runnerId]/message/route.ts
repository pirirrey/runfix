// GET/POST/DELETE /api/coach/runners/[runnerId]/message
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { runnerId: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("team_messages")
    .select("id, message, expires_at, created_at")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { message, expires_at } = await req.json();
  if (!message?.trim() || !expires_at) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { error } = await supabase.from("team_messages").insert({
    coach_id: user.id,
    runner_id: runnerId,
    team_id: null,
    message: message.trim(),
    expires_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { error } = await supabase
    .from("team_messages")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
