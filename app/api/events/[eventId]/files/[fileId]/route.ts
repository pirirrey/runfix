import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ eventId: string; fileId: string }> }) {
  const { eventId, fileId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: ev } = await supabase.from("race_events").select("coach_id").eq("id", eventId).single();
  if (!ev || ev.coach_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Obtener el path para borrar del storage también
  const { data: fileRecord } = await supabase
    .from("race_event_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (fileRecord?.storage_path) {
    await supabase.storage.from("training-plans").remove([fileRecord.storage_path]);
  }

  const { error } = await supabase.from("race_event_files").delete().eq("id", fileId).eq("event_id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
