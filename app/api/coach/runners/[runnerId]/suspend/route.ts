import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ runnerId: string }> }
) {
  const { runnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Leer estado actual
  const { data: cr } = await supabase
    .from("coach_runners")
    .select("suspended")
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId)
    .single();

  if (!cr) return NextResponse.json({ error: "Runner no encontrado" }, { status: 404 });

  const newSuspended = !cr.suspended;
  const { error } = await supabase
    .from("coach_runners")
    .update({
      suspended: newSuspended,
      suspended_at: newSuspended ? new Date().toISOString() : null,
    })
    .eq("coach_id", user.id)
    .eq("runner_id", runnerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suspended: newSuspended });
}
