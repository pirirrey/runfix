import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoachHomeClient } from "@/components/coach/CoachHomeClient";

export default async function CoachHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  type CoachProfile = {
    id: string;
    full_name: string | null;
    email: string;
    team_name: string | null;
    team_logo_path: string | null;
    team_description: string | null;
    team_location: string | null;
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, team_name, team_logo_path, team_description, team_location")
    .eq("id", user.id)
    .single<CoachProfile>();

  if (!profile) redirect("/login");

  // Signed URL del logo si existe
  let logoUrl: string | null = null;
  if (profile.team_logo_path) {
    const { data } = await supabase.storage
      .from("training-plans")
      .createSignedUrl(profile.team_logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  // Stats rápidas
  const [{ count: teamsCount }, { count: runnersCount }, { count: eventsCount }] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    supabase.from("coach_runners").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    supabase.from("race_events").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
  ]);

  return (
    <CoachHomeClient
      profile={{ ...profile, logoUrl }}
      stats={{ teams: teamsCount ?? 0, runners: runnersCount ?? 0, events: eventsCount ?? 0 }}
    />
  );
}
