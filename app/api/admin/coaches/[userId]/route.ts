import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["approved", "rejected", "pending", "suspended"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();

  // Verificar que quien llama es superadmin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (adminProfile?.role !== "superadmin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Validar body
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { userId } = await params;

  // Verificar que el target es un coach
  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single<{ role: string }>();

  if (coachProfile?.role !== "coach") {
    return NextResponse.json({ error: "El usuario no es un entrenador" }, { status: 400 });
  }

  // Actualizar status
  const { error } = await supabase
    .from("profiles")
    .update({ status: parsed.data.status })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
