import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RunnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<{ id: string; role: string }>();

  if (profile?.role !== "runner") redirect("/coach/teams");

  return <>{children}</>;
}
