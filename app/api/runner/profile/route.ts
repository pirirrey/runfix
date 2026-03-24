import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "first_name","last_name","gender","birth_date","phone",
    "address_street","address_number","address_floor","address_apt",
    "address_postal","address_city",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? null;
  }

  // Sincronizar full_name con first_name + last_name para que la home lo refleje
  const firstName = (updates.first_name as string | null) ?? "";
  const lastName  = (updates.last_name  as string | null) ?? "";
  const fullName  = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) updates.full_name = fullName;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
