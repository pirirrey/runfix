import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoachSuspendedPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, status")
    .eq("id", user.id)
    .single<{ full_name: string | null; email: string; status: string }>();

  if (profile?.status === "approved") redirect("/coach/home");

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
        maxWidth: "30rem",
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.75rem",
      }}>

        {/* Logo */}
        <img src="/images/runfix-dark.svg" alt="Runfix" style={{ height: "1.75rem", width: "auto", opacity: 0.6 }} />

        {/* Ícono */}
        <div style={{
          width: "5rem",
          height: "5rem",
          borderRadius: "50%",
          background: "rgba(251,146,60,0.08)",
          border: "2px solid rgba(251,146,60,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
        }}>
          ⏸
        </div>

        {/* Texto principal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <h1 style={{ color: "white", fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
            Tu cuenta está inactiva
          </h1>
          <p style={{ color: "#777", fontSize: "0.92rem", lineHeight: 1.65, margin: 0 }}>
            Tu acceso como entrenador fue suspendido temporalmente.
            Para retomar la actividad en la plataforma, por favor
            contactate con el equipo de Runfix.
          </p>
        </div>

        {/* Caja de contacto */}
        <div style={{
          width: "100%",
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "0.875rem",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          textAlign: "left",
        }}>
          <p style={{ color: "#555", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Contacto del administrador
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>📧</span>
            <a
              href="mailto:hola@runfix.app"
              style={{ color: "#fb923c", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}
            >
              hola@runfix.app
            </a>
          </div>
          <p style={{ color: "#444", fontSize: "0.8rem", margin: 0, lineHeight: 1.5 }}>
            Incluí en el mensaje tu nombre y el correo de tu cuenta:{" "}
            <span style={{ color: "#666" }}>{profile?.email}</span>
          </p>
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
              color: "#555",
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
