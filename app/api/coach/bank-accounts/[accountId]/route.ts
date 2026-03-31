import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH — editar cuenta bancaria
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { accountId } = await params;
  const body = await req.json().catch(() => null);
  const { bank_name, holder, cbu, alias } = body ?? {};

  if (!bank_name?.trim()) {
    return NextResponse.json({ error: "El nombre del banco es requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("coach_bank_accounts")
    .update({
      bank_name: bank_name.trim(),
      holder:    holder?.trim() || null,
      cbu:       cbu?.trim()    || null,
      alias:     alias?.trim()  || null,
    })
    .eq("id", accountId)
    .eq("coach_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — eliminar cuenta bancaria
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { accountId } = await params;

  const { error } = await supabase
    .from("coach_bank_accounts")
    .delete()
    .eq("id", accountId)
    .eq("coach_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
