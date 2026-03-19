import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const supabase = await createClient();
  const { data: teams, error } = await supabase.rpc("get_team_by_invite_code", {
    p_invite_code: code.toUpperCase(),
  });

  if (error || !teams || teams.length === 0) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, team_name: teams[0].name });
}
