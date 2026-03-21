import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EventDetailClient } from "@/components/coach/EventDetailClient";

type Distance = { id: string; label: string; altimetry_path: string | null };
type EventFile = { id: string; file_name: string; storage_path: string };
type EventRow = {
  id: string; name: string; location: string | null;
  race_type: "street" | "trail"; start_date: string; end_date: string;
  discount_code: string | null; notes: string | null; coach_id: string;
  race_event_distances: Distance[];
  race_event_files: EventFile[];
};
type GoalRow = {
  id: string;
  runner: { id: string; full_name: string | null; email: string };
  distance: { id: string; label: string };
};

export default async function CoachEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ev } = await supabase
    .from("race_events")
    .select("*, race_event_distances(id,label,altimetry_path), race_event_files(id,file_name,storage_path)")
    .eq("id", eventId)
    .single<EventRow>();

  if (!ev || ev.coach_id !== user.id) notFound();

  // Signed URLs para altimetrías y archivos
  const distancesWithUrls = await Promise.all(
    ev.race_event_distances.map(async (d) => {
      if (!d.altimetry_path) return { ...d, altimetryUrl: null };
      const { data } = await supabase.storage.from("training-plans").createSignedUrl(d.altimetry_path, 3600);
      return { ...d, altimetryUrl: data?.signedUrl ?? null };
    })
  );

  const filesWithUrls = await Promise.all(
    ev.race_event_files.map(async (f) => {
      const { data } = await supabase.storage.from("training-plans").createSignedUrl(f.storage_path, 3600);
      return { ...f, signedUrl: data?.signedUrl ?? null };
    })
  );

  // Runners que se anotaron a alguna distancia de este evento
  const distanceIds = ev.race_event_distances.map((d) => d.id);
  let runnerGoals: GoalRow[] = [];
  if (distanceIds.length > 0) {
    const { data: goalsData } = await supabase
      .from("runner_event_goals")
      .select(`
        id,
        runner:profiles!runner_event_goals_runner_id_fkey(id, full_name, email),
        distance:race_event_distances!runner_event_goals_distance_id_fkey(id, label)
      `)
      .in("distance_id", distanceIds)
      .returns<GoalRow[]>();
    runnerGoals = goalsData ?? [];
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <Link href="/coach/events" style={{ color: "#555", fontSize: "0.85rem", textDecoration: "none", display: "block", marginBottom: "1.5rem" }}>
        ← Eventos
      </Link>
      <EventDetailClient
        event={{ ...ev, race_event_distances: distancesWithUrls, race_event_files: filesWithUrls }}
        runnerGoals={runnerGoals}
      />
    </div>
  );
}
