// GET /api/runner/messages → mensajes activos de equipos + mensajes personales

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type RunnerMessage = {
  id: string;
  team_id: string | null;
  team_name: string;
  message: string;
  expires_at: string;
  created_at: string;
  days_left: number;
  is_personal: boolean;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Equipos del runner
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("team_id, teams(id, name)")
    .eq("runner_id", user.id);

  const teamIds = (memberships ?? []).map(m => m.team_id);

  // Armar mapa team_id → name
  const teamNames: Record<string, string> = {};
  for (const m of memberships ?? []) {
    const t = (Array.isArray(m.teams) ? m.teams[0] : m.teams) as { id: string; name: string } | null;
    if (t) teamNames[t.id] = t.name;
  }

  // Mensajes de grupo (no vencidos)
  const groupMsgs = teamIds.length > 0
    ? (await supabase
        .from("team_messages")
        .select("id, team_id, message, expires_at, created_at")
        .in("team_id", teamIds)
        .is("runner_id", null)
        .gte("expires_at", todayStr)
        .order("created_at", { ascending: false })
      ).data ?? []
    : [];

  // Mensajes personales (no vencidos)
  const { data: personalMsgs } = await supabase
    .from("team_messages")
    .select("id, team_id, message, expires_at, created_at, profiles(full_name, team_name)")
    .eq("runner_id", user.id)
    .gte("expires_at", todayStr)
    .order("created_at", { ascending: false });

  const allMsgs: RunnerMessage[] = [
    ...(groupMsgs).map(msg => {
      const exp = new Date(msg.expires_at + "T00:00:00");
      return {
        ...msg,
        team_name: teamNames[msg.team_id] ?? "Equipo",
        days_left: Math.floor((exp.getTime() - today.getTime()) / 86400000),
        is_personal: false,
      };
    }),
    ...(personalMsgs ?? []).map(msg => {
      const exp = new Date(msg.expires_at + "T00:00:00");
      const coach = (Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles) as { full_name?: string; team_name?: string } | null;
      return {
        id: msg.id,
        team_id: null,
        team_name: coach?.team_name ?? coach?.full_name ?? "Tu entrenador",
        message: msg.message,
        expires_at: msg.expires_at,
        created_at: msg.created_at,
        days_left: Math.floor((exp.getTime() - today.getTime()) / 86400000),
        is_personal: true,
      };
    }),
  ];

  // Ordenar por fecha desc
  allMsgs.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return NextResponse.json({ messages: allMsgs });
}
