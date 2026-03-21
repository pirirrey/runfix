import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Obtener runners del coach con sus equipos asignados
  const { data: coachRunners, error } = await supabase
    .from("coach_runners")
    .select(`
      id,
      joined_at,
      runner:profiles!coach_runners_runner_id_fkey (
        id, full_name, email
      )
    `)
    .eq("coach_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Error fetching coach runners:", error);
    return NextResponse.json({ error: "Error al obtener runners" }, { status: 500 });
  }

  return NextResponse.json({ runners: coachRunners });
}
