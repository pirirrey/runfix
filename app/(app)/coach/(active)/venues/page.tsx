import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Venue } from "@/components/coach/CoachVenuesPanel";
import { CoachVenuesPageClient } from "@/components/coach/CoachVenuesPageClient";
import { type PlanId } from "@/lib/plans";

export default async function CoachVenuesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: venues }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single<{ subscription_plan: string }>(),
    supabase
      .from("coach_venues")
      .select(`
        id, name, notes, sort_order, runner_selectable, created_at,
        venue_sessions ( id, location, days, start_time, notes, sort_order, created_at )
      `)
      .eq("coach_id", user.id)
      .order("sort_order")
      .order("created_at")
      .returns<Venue[]>(),
  ]);

  const planId = (profileData?.subscription_plan ?? "starter") as PlanId;

  return <CoachVenuesPageClient initialVenues={venues ?? []} planId={planId} />;
}
