import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role === "coach") redirect("/coach/teams");
  if (profile?.role === "runner") redirect("/runner/plans");

  // Perfil no encontrado: cerrar sesión y volver al login
  await supabase.auth.signOut();
  redirect("/login");
}
