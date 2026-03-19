import Link from "next/link";
import { Button } from "@/components/ui/button";

const PHOTOS = [
  { src: "/images/marathon.jpg", alt: "Corredores en maratón" },
  { src: "/images/trail.jpg",    alt: "Runner en trail de montaña" },
  { src: "/images/team.jpg",     alt: "Equipo de running" },
];

const FEATURES = [
  { icon: "📋", title: "Planes por runner", desc: "Cada atleta recibe su plan mensual personalizado en PDF." },
  { icon: "👥", title: "Gestión de equipos", desc: "Organizá múltiples equipos y controlá quién pertenece a cada uno." },
  { icon: "🔒", title: "Acceso seguro", desc: "Los runners se unen con código de invitación y ven solo sus propios planes." },
];

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0a" }}>

      {/* Hero */}
      <section style={{ position: "relative", height: "70vh", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="Maratón de running"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(10,10,10,0.85) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "1.5rem", textAlign: "center", color: "white" }}>
          <div style={{ display: "inline-block", background: "rgba(163,230,53,0.15)", border: "1px solid rgba(163,230,53,0.4)", borderRadius: "2rem", padding: "0.3rem 1rem", fontSize: "0.8rem", color: "#a3e635", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
            Para equipos de running
          </div>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            🏃 WePlan
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: "36rem", opacity: 0.85, lineHeight: 1.6 }}>
            Gestioná los planes de entrenamiento de tu equipo. Subí PDFs mensuales para cada atleta y hacé que cada uno vea exactamente lo que necesita.
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <Button size="lg" asChild style={{ background: "#a3e635", color: "#000", fontWeight: 700 }}>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button size="lg" variant="outline" asChild style={{ borderColor: "rgba(255,255,255,0.4)", color: "white", background: "rgba(255,255,255,0.08)" }}>
              <Link href="/signup">Registrarse</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Galería */}
      <section style={{ background: "#111", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
          <p style={{ color: "#a3e635", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>
            Comunidad
          </p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: "2.5rem", color: "white" }}>
            Para corredores que van en serio
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {PHOTOS.map((photo) => (
              <div key={photo.src} style={{ position: "relative", height: "15rem", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "4rem 1.5rem", background: "#0a0a0a" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <p style={{ color: "#a3e635", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>
            Funcionalidades
          </p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: "3rem", color: "white" }}>
            Todo lo que necesitás
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: "#161616", borderRadius: "1rem", padding: "1.75rem", border: "1px solid #222", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "2rem" }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "white" }}>{f.title}</h3>
                <p style={{ color: "#888", fontSize: "0.875rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "1.5rem", textAlign: "center", color: "#444", fontSize: "0.8rem", background: "#0a0a0a", borderTop: "1px solid #1a1a1a" }}>
        © 2026 WePlan — Gestión de equipos de running
      </footer>

    </main>
  );
}
