import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoachSettingsClient } from "@/components/coach/CoachSettingsClient";

export default async function CoachSettingsPage() {
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

  let logoUrl: string | null = null;
  if (profile.team_logo_path) {
    const { data } = await supabase.storage
      .from("training-plans")
      .createSignedUrl(profile.team_logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  return <CoachSettingsClient profile={{ ...profile, logoUrl }} />;
}
