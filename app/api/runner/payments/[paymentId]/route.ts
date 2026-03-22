import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Obtener el registro para borrar el archivo del storage si existe
  const { data: receipt } = await supabase
    .from("payment_receipts")
    .select("storage_path")
    .eq("id", paymentId)
    .eq("runner_id", user.id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });

  if (receipt.storage_path) {
    await supabase.storage.from("training-plans").remove([receipt.storage_path]);
  }

  const { error } = await supabase
    .from("payment_receipts")
    .delete()
    .eq("id", paymentId)
    .eq("runner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
