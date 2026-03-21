import { SignupForm } from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex" }}>

      {/* Panel izquierdo — imagen */}
      <div style={{ flex: 1, position: "relative" }} className="hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/marathon.jpg"
          alt="Maratón running"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "3rem", color: "white" }}>
          <img src="/images/runfix-dark.svg" alt="Runfix" style={{ height: "2.25rem", width: "auto" }} />
          <p style={{ fontSize: "1.05rem", opacity: 0.85, maxWidth: "22rem", lineHeight: 1.5 }}>
            Gestioná tu equipo de running desde un solo lugar.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#0f0f0f", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "22rem" }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>🏃</span>
            <h1 style={{ color: "white", fontSize: "1.6rem", fontWeight: 700, marginTop: "0.5rem" }}>Crear cuenta</h1>
            <p style={{ color: "#888", fontSize: "0.9rem", marginTop: "0.3rem" }}>Empezá a gestionar tus planes hoy</p>
          </div>
          <SignupForm />
          <p style={{ color: "#666", fontSize: "0.85rem", textAlign: "center", marginTop: "1.5rem" }}>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" style={{ color: "#a3e635", textDecoration: "none", fontWeight: 600 }}>
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>

    </main>
  );
}
