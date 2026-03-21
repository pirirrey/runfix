import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST() {
  // Verificar que el usuario está autenticado
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Generar nuevo código: 8 caracteres alfanuméricos en mayúscula
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Usar admin client para actualizar sin restricciones de RLS
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ invite_code: newCode })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invite_code: newCode });
}
