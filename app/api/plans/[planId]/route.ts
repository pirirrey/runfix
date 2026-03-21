import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verificar que el plan pertenece al coach
  const { data: plan } = await supabase
    .from("training_plans")
    .select("id, storage_path, coach_id")
    .eq("id", planId)
    .eq("coach_id", user.id)
    .single<{ id: string; storage_path: string; coach_id: string }>();

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  // Eliminar de storage
  await supabase.storage.from("training-plans").remove([plan.storage_path]);

  // Eliminar de DB
  const { error } = await supabase.from("training_plans").delete().eq("id", planId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
