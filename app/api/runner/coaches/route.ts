import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // 1. Traer las filas de coach_runners para este runner
  const { data: crRows, error: crError } = await supabase
    .from("coach_runners")
    .select("id, coach_id, joined_at")
    .eq("runner_id", user.id)
    .order("joined_at", { ascending: false });

  if (crError) return NextResponse.json({ error: crError.message }, { status: 500 });
  if (!crRows || crRows.length === 0) return NextResponse.json({ coaches: [] });

  const coachIds = crRows.map((r) => r.coach_id);

  // 2. Traer los perfiles de esos coaches
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, team_name, team_location, team_logo_path")
    .in("id", coachIds);

  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

  // 3. Generar signed URLs para los logos
  const coaches = await Promise.all(crRows.map(async (cr) => {
    const profile = profiles?.find((p) => p.id === cr.coach_id);
    const logoPath = (profile as { team_logo_path?: string | null } | undefined)?.team_logo_path ?? null;

    let logo_url: string | null = null;
    if (logoPath) {
      const { data: signed } = await supabase.storage
        .from("training-plans")
        .createSignedUrl(logoPath, 3600);
      logo_url = signed?.signedUrl ?? null;
    }

    return {
      id: cr.id,
      joined_at: cr.joined_at,
      coach: {
        id: cr.coach_id,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? "",
        status: (profile as { status?: string } | undefined)?.status ?? "approved",
        team_name: profile?.team_name ?? null,
        team_location: profile?.team_location ?? null,
        logo_url,
      },
    };
  }));

  return NextResponse.json({ coaches });
}
