import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  invite_code: z.string().min(1),
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
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  // Buscar equipo por código (función security definer para bypasear RLS)
  const { data: teams, error: teamError } = await supabase
    .rpc("get_team_by_invite_code", {
      p_invite_code: parsed.data.invite_code,
    });

  const team = teams?.[0] ?? null;

  if (teamError || !team) {
    return NextResponse.json(
      { error: "Código de invitación inválido" },
      { status: 404 }
    );
  }

  // Unirse al equipo
  const { error } = await supabase.from("team_memberships").insert({
    team_id: team.id,
    runner_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya sos miembro de este equipo" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ team }, { status: 201 });
}
