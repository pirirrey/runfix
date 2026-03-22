import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { file_name, storage_path, expires_at } = await req.json();
  if (!file_name || !storage_path || !expires_at)
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { data, error } = await supabase.from("medical_certificates").insert({
    runner_id: user.id, file_name, storage_path, expires_at,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certificate: data });
}
