import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachRejectedPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, status")
    .eq("id", user.id)
    .single<{ full_name: string | null; email: string; status: string }>();

  if (profile?.status === "approved") redirect("/coach/teams");

  async function handleSignOut() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: "28rem",
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
      }}>

        <div style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "50%",
          background: "rgba(248,113,113,0.1)",
          border: "2px solid rgba(248,113,113,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.25rem",
        }}>
          ✕
        </div>

        <div>
          <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Solicitud rechazada
          </h1>
          <p style={{ color: "#888", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Tu solicitud como entrenador no fue aprobada. Si creés que es un error, contactá al administrador de la plataforma.
          </p>
        </div>

        <div style={{
          width: "100%",
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "left",
        }}>
          <span style={{ fontSize: "1.25rem" }}>📧</span>
          <p style={{ color: "#f87171", fontSize: "0.85rem", lineHeight: 1.5 }}>
            {profile?.email}
          </p>
        </div>

        <form action={handleSignOut}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: "0.5rem",
              padding: "0.6rem 1.5rem",
              color: "#666",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </form>

      </div>
    </div>
  );
}
