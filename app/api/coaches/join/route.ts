import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

const schema = z.object({
  invite_code: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Verificar que es un runner aprobado
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "runner") {
    return NextResponse.json({ error: "Solo los runners pueden unirse a un coach" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const { invite_code } = parsed.data;

  // Buscar coach por invite_code
  const { data: coaches, error: rpcError } = await supabase
    .rpc("get_coach_by_invite_code", { p_code: invite_code });

  if (rpcError || !coaches || coaches.length === 0) {
    return NextResponse.json(
      { error: "Código incorrecto o el entrenador no está habilitado" },
      { status: 404 }
    );
  }

  const coach = coaches[0];

  // Verificar límite de runners según plan del coach
  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", coach.id)
    .single<{ subscription_plan: string }>();

  const plan = (coachProfile?.subscription_plan ?? "starter") as PlanId;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;

  if (limits.maxRunners !== null) {
    const { count } = await supabase
      .from("coach_runners")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coach.id);

    if ((count ?? 0) >= limits.maxRunners) {
      return NextResponse.json({
        error: "Este equipo alcanzó el límite de runners de su plan actual. Pedile a tu entrenador que actualice su suscripción.",
      }, { status: 403 });
    }
  }

  // Buscar sede por defecto del coach para auto-asignar
  const { data: defaultVenue } = await supabase
    .from("coach_venues")
    .select("id")
    .eq("coach_id", coach.id)
    .eq("is_default", true)
    .single();

  // Insertar en coach_runners (con sede por defecto si existe)
  const { error: insertError } = await supabase
    .from("coach_runners")
    .insert({
      coach_id:  coach.id,
      runner_id: user.id,
      venue_id:  defaultVenue?.id ?? null,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      // Ya está asociado — no es un error crítico
      return NextResponse.json(
        { coach, message: "Ya estás asociado a este entrenador" },
        { status: 200 }
      );
    }
    console.error("Error al asociar runner-coach:", insertError);
    return NextResponse.json({ error: "Error al asociar" }, { status: 500 });
  }

  return NextResponse.json({ coach }, { status: 201 });
}
