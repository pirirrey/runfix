import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  const { certId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: cert } = await supabase
    .from("medical_certificates")
    .select("storage_path")
    .eq("id", certId)
    .eq("runner_id", user.id)
    .single();
  if (!cert) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await supabase.storage.from("training-plans").remove([cert.storage_path]);
  const { error } = await supabase.from("medical_certificates").delete().eq("id", certId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
