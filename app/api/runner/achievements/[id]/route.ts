import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: achievement } = await supabase
    .from("race_achievements")
    .select("photo_path, certificate_path")
    .eq("id", id)
    .eq("runner_id", user.id)
    .single();

  if (!achievement) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Borrar archivos del storage
  const toRemove = [achievement.photo_path, achievement.certificate_path].filter(Boolean) as string[];
  if (toRemove.length > 0) {
    await supabase.storage.from("training-plans").remove(toRemove);
  }

  // Deslinkar el objetivo si estaba vinculado
  await supabase
    .from("runner_event_goals")
    .update({ achievement_id: null })
    .eq("achievement_id", id);

  const { error } = await supabase
    .from("race_achievements")
    .delete()
    .eq("id", id)
    .eq("runner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
