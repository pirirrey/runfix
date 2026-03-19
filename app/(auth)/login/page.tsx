import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex" }}>

      {/* Panel izquierdo — imagen */}
      <div style={{ flex: 1, position: "relative" }} className="hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/trail.jpg"
          alt="Trail running"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "3rem", color: "white" }}>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem" }}>🏃 WePlan</p>
          <p style={{ fontSize: "1.05rem", opacity: 0.85, maxWidth: "22rem", lineHeight: 1.5 }}>
            Tu plan de entrenamiento, siempre disponible.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#0f0f0f", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "22rem" }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>🏃</span>
            <h1 style={{ color: "white", fontSize: "1.6rem", fontWeight: 700, marginTop: "0.5rem" }}>Bienvenido de vuelta</h1>
            <p style={{ color: "#888", fontSize: "0.9rem", marginTop: "0.3rem" }}>Iniciá sesión para ver tus planes</p>
          </div>
          <LoginForm />
          <p style={{ color: "#666", fontSize: "0.85rem", textAlign: "center", marginTop: "1.5rem" }}>
            ¿No tenés cuenta?{" "}
            <Link href="/signup" style={{ color: "#a3e635", textDecoration: "none", fontWeight: 600 }}>
              Registrate
            </Link>
          </p>
        </div>
      </div>

    </main>
  );
}
