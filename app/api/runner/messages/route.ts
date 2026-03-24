// GET /api/runner/messages → mensajes activos de todos los equipos del runner

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type RunnerMessage = {
  id: string;
  team_id: string;
  team_name: string;
  message: string;
  expires_at: string;
  created_at: string;
  days_left: number;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Equipos del runner
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id, teams(id, name)")
    .eq("runner_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ messages: [] });
  }

  const teamIds = memberships.map(m => m.team_id);

  // Mensajes activos (no vencidos)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: msgs, error } = await supabase
    .from("team_messages")
    .select("id, team_id, message, expires_at, created_at")
    .in("team_id", teamIds)
    .gte("expires_at", todayStr)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Armar mapa team_id → name
  const teamNames: Record<string, string> = {};
  for (const m of memberships) {
    const t = (Array.isArray(m.teams) ? m.teams[0] : m.teams) as { id: string; name: string } | null;
    if (t) teamNames[t.id] = t.name;
  }

  const messages: RunnerMessage[] = (msgs ?? []).map(msg => {
    const exp = new Date(msg.expires_at + "T00:00:00");
    const daysLeft = Math.floor((exp.getTime() - today.getTime()) / 86400000);
    return {
      ...msg,
      team_name: teamNames[msg.team_id] ?? "Equipo",
      days_left: daysLeft,
    };
  });

  return NextResponse.json({ messages });
}
