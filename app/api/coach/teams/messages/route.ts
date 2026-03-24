// GET  /api/coach/teams/messages?teamId=xxx  → mensajes activos del equipo
// POST /api/coach/teams/messages              → crear mensaje
// DELETE /api/coach/teams/messages?id=xxx    → eliminar mensaje

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type TeamMessage = {
  id: string;
  team_id: string;
  message: string;
  expires_at: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId requerido" }, { status: 400 });

  const { data, error } = await supabase
    .from("team_messages")
    .select("id, team_id, message, expires_at, created_at")
    .eq("team_id", teamId)
    .eq("coach_id", user.id)
    .order("expires_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { team_id, message, expires_at } = await req.json();
  if (!team_id || !message?.trim() || !expires_at) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_messages")
    .insert({ team_id, coach_id: user.id, message: message.trim(), expires_at })
    .select("id, team_id, message, expires_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabase
    .from("team_messages")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
