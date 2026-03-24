import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachPendingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, status, created_at")
    .eq("id", user.id)
    .single<{ full_name: string | null; email: string; status: string; created_at: string }>();

  // Si ya fue aprobado, redirigir al dashboard
  if (profile?.status === "approved") redirect("/coach/teams");
  if (profile?.status === "rejected") redirect("/coach/rejected");

  const registrationDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-AR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

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

        {/* Ícono animado */}
        <div style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "50%",
          background: "rgba(245,158,11,0.1)",
          border: "2px solid rgba(245,158,11,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.25rem",
        }}>
          ⏳
        </div>

        {/* Texto principal */}
        <div>
          <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Cuenta en revisión
          </h1>
          <p style={{ color: "#888", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Tu solicitud como entrenador está siendo revisada por el equipo de Runfix. Te notificaremos cuando tu cuenta sea aprobada.
          </p>
        </div>

        {/* Card de info */}
        <div style={{
          width: "100%",
          background: "#161616",
          border: "1px solid #2a2a2a",
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
          textAlign: "left",
        }}>
          <div>
            <p style={{ color: "#555", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "0.2rem" }}>
              Cuenta
            </p>
            <p style={{ color: "white", fontSize: "0.9rem", fontWeight: 600 }}>
              {profile?.full_name ?? "—"}
            </p>
            <p style={{ color: "#666", fontSize: "0.8rem" }}>{profile?.email}</p>
          </div>

          <div style={{ borderTop: "1px solid #222", paddingTop: "0.875rem" }}>
            <p style={{ color: "#555", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "0.2rem" }}>
              Solicitud enviada
            </p>
            <p style={{ color: "#aaa", fontSize: "0.875rem" }}>{registrationDate}</p>
          </div>

          <div style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span>🔔</span>
            <p style={{ color: "#f59e0b", fontSize: "0.8rem", lineHeight: 1.4 }}>
              Estado: <strong>Pendiente de activación inicial</strong>
            </p>
          </div>
        </div>

        {/* Cerrar sesión */}
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
              transition: "all 0.15s",
            }}
          >
            Cerrar sesión
          </button>
        </form>

      </div>
    </div>
  );
}
