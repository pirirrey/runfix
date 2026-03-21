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
    .select("role, status")
    .eq("id", user.id)
    .single<{ role: string; status: string }>();

  if (profile?.role === "superadmin") redirect("/superadmin/coaches");
  if (profile?.role === "coach" && profile?.status === "pending")  redirect("/coach/pending");
  if (profile?.role === "coach" && profile?.status === "rejected") redirect("/coach/rejected");
  if (profile?.role === "coach")  redirect("/coach/home");
  if (profile?.role === "runner") redirect("/runner/home");

  // Perfil no encontrado: cerrar sesión y volver al login
  await supabase.auth.signOut();
  redirect("/login");
}
