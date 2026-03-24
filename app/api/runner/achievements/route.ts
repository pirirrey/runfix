import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("race_achievements")
    .select("*")
    .eq("runner_id", user.id)
    .order("race_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generar signed URLs para foto y certificado
  const withUrls = await Promise.all((data ?? []).map(async (a) => {
    let photo_url: string | null = null;
    let cert_url:  string | null = null;
    if (a.photo_path) {
      const { data: s } = await supabase.storage.from("training-plans").createSignedUrl(a.photo_path, 3600);
      photo_url = s?.signedUrl ?? null;
    }
    if (a.certificate_path) {
      const { data: s } = await supabase.storage.from("training-plans").createSignedUrl(a.certificate_path, 3600);
      cert_url = s?.signedUrl ?? null;
    }
    return { ...a, photo_url, cert_url };
  }));

  return NextResponse.json(withUrls);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    goal_id, event_id, race_name, race_date, distance_label,
    finish_time, position_general, total_general,
    position_category, total_category, category_name,
    certificate_path, photo_path, notes,
  } = body;

  if (!race_name || !race_date) {
    return NextResponse.json({ error: "Nombre y fecha son obligatorios" }, { status: 400 });
  }

  const { data: achievement, error } = await supabase
    .from("race_achievements")
    .insert({
      runner_id: user.id,
      goal_id: goal_id ?? null,
      event_id: event_id ?? null,
      race_name, race_date,
      distance_label: distance_label ?? null,
      finish_time: finish_time ?? null,
      position_general: position_general ? Number(position_general) : null,
      total_general: total_general ? Number(total_general) : null,
      position_category: position_category ? Number(position_category) : null,
      total_category: total_category ? Number(total_category) : null,
      category_name: category_name ?? null,
      certificate_path: certificate_path ?? null,
      photo_path: photo_path ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Vincular el objetivo al logro
  if (goal_id) {
    await supabase
      .from("runner_event_goals")
      .update({ achievement_id: achievement.id })
      .eq("id", goal_id)
      .eq("runner_id", user.id);
  }

  return NextResponse.json(achievement, { status: 201 });
}
