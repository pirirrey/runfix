import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — devuelve cuántos runners, equipos y sedes activos tiene el coach
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [runnersRes, teamsRes, venuesRes] = await Promise.all([
    supabase
      .from("coach_runners")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .eq("suspended", false),
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id),
    supabase
      .from("coach_venues")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id),
  ]);

  return NextResponse.json({
    runnerCount: runnersRes.count ?? 0,
    teamCount:   teamsRes.count   ?? 0,
    venueCount:  venuesRes.count  ?? 0,
  });
}
