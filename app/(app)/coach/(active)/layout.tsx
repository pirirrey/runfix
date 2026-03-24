import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachLayout({
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
    .select("id, role, status")
    .eq("id", user.id)
    .single<{ id: string; role: string; status: string }>();

  if (profile?.role !== "coach") redirect("/runner/plans");
  if (profile?.status === "pending")   redirect("/coach/pending");
  if (profile?.status === "rejected")  redirect("/coach/rejected");
  if (profile?.status === "suspended") redirect("/coach/suspended");

  return <>{children}</>;
}
