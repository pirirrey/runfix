import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Usar la RPC security definer — no requiere admin key
  const { data: coaches, error } = await supabase
    .rpc("get_coach_by_invite_code", { p_code: code.trim().toUpperCase() });

  if (error || !coaches || coaches.length === 0) {
    return NextResponse.json({ valid: false });
  }

  const coach = coaches[0];

  let logo_url: string | null = null;
  if (coach.team_logo_path) {
    const { data: signed } = await supabase.storage
      .from("training-plans")
      .createSignedUrl(coach.team_logo_path, 3600);
    logo_url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    valid: true,
    coach_name: coach.team_name || coach.full_name,
    logo_url,
  });
}
