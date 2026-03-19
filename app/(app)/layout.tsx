import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function AppLayout({
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
    .select("role, full_name, email")
    .eq("id", user.id)
    .single<{ role: "coach" | "runner" | "superadmin"; full_name: string | null; email: string }>();

  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={profile.role}
        fullName={profile.full_name}
        email={profile.email}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
