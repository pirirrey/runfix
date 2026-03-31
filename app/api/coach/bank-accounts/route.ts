import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — listar cuentas bancarias del coach
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("coach_bank_accounts")
    .select("*")
    .eq("coach_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

// POST — crear cuenta bancaria
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { bank_name, holder, cbu, alias } = body ?? {};

  if (!bank_name?.trim()) {
    return NextResponse.json({ error: "El nombre del banco es requerido" }, { status: 400 });
  }

  // sort_order = max actual + 1
  const { count } = await supabase
    .from("coach_bank_accounts")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user.id);

  const { data, error } = await supabase
    .from("coach_bank_accounts")
    .insert({
      coach_id:   user.id,
      bank_name:  bank_name.trim(),
      holder:     holder?.trim() || null,
      cbu:        cbu?.trim()    || null,
      alias:      alias?.trim()  || null,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
