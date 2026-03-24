import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_CONFIG } from "@/lib/plans";

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
          <img src="/images/runfix-dark.svg" alt="Runfix" style={{ height: "4.5rem", width: "auto" }} />
          <p style={{ fontSize: "1.15rem", maxWidth: "36rem", opacity: 0.85, lineHeight: 1.6 }}>
            Porque entrenar en equipo es más que correr. Gestioná planes, seguí el progreso y mantené a tu equipo motivado desde un solo lugar.
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

      {/* Pricing */}
      <section style={{ padding: "5rem 1.5rem", background: "#111" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>

          {/* Header */}
          <p style={{ color: "#a3e635", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>
            Precios
          </p>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", color: "white", marginBottom: "0.5rem" }}>
            Para todos, desde el primer kilómetro
          </h2>
          <p style={{ color: "#555", fontSize: "0.95rem", textAlign: "center", marginBottom: "3.5rem" }}>
            Runners siempre gratis. Entrenadores eligen su plan.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr 1fr 1fr", gap: "0", alignItems: "start" }}>

            {/* ── Columna Runner ── */}
            <div style={{
              background: "rgba(96,165,250,0.04)",
              border: "1px solid rgba(96,165,250,0.2)",
              borderRadius: "1.25rem",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {/* Badge runner */}
              <div style={{
                background: "rgba(96,165,250,0.12)", borderBottom: "1px solid rgba(96,165,250,0.15)",
                padding: "0.4rem", textAlign: "center",
                fontSize: "0.65rem", fontWeight: 800, color: "#60a5fa",
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                🏃 Para runners
              </div>

              <div style={{ padding: "1.75rem 1.75rem 1.25rem" }}>
                <p style={{ color: "#60a5fa", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                  Runner
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "white", fontSize: "2.25rem", fontWeight: 900, lineHeight: 1 }}>Gratis</span>
                </div>
                <p style={{ color: "#555", fontSize: "0.78rem", marginBottom: "1rem" }}>siempre, sin límite de tiempo</p>
                <div style={{
                  background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
                  borderRadius: "0.5rem", padding: "0.5rem 0.75rem",
                }}>
                  <p style={{ color: "#60a5fa", fontSize: "0.75rem", fontWeight: 600, margin: 0 }}>
                    Acceso completo como atleta
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(96,165,250,0.1)", margin: "0 1.75rem" }} />

              <div style={{ padding: "1.25rem 1.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  "Ver tus planes de entrenamiento",
                  "Objetivos y logros de carrera",
                  "Historial de pagos",
                  "Certificados médicos",
                  "Múltiples entrenadores",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#60a5fa" }}>✓</span>
                    <span style={{ color: "#888", fontSize: "0.82rem" }}>{f}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: "0 1.75rem 1.75rem" }}>
                <Link href="/signup" style={{
                  display: "block", textAlign: "center", padding: "0.75rem",
                  borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.875rem",
                  textDecoration: "none",
                  background: "rgba(96,165,250,0.1)", color: "#60a5fa",
                  border: "1px solid rgba(96,165,250,0.25)",
                }}>
                  Registrarme gratis
                </Link>
              </div>
            </div>

            {/* ── Separador visual ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "6rem", gap: "0.5rem" }}>
              <div style={{ width: "1px", height: "3rem", background: "linear-gradient(to bottom, transparent, #2a2a2a)" }} />
              <span style={{ color: "#333", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>vs</span>
              <div style={{ width: "1px", height: "3rem", background: "linear-gradient(to top, transparent, #2a2a2a)" }} />
            </div>

            {/* ── Columnas Coach ── */}
            <div style={{ gridColumn: "3 / 6", display: "flex", flexDirection: "column", gap: "0" }}>

              {/* Label coaches */}
              <div style={{
                background: "rgba(163,230,53,0.05)", border: "1px solid rgba(163,230,53,0.15)",
                borderRadius: "0.75rem 0.75rem 0 0", borderBottom: "none",
                padding: "0.6rem 1.25rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span style={{ fontSize: "0.8rem" }}>🎯</span>
                <p style={{ color: "#a3e635", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  Para entrenadores / Running Teams
                </p>
              </div>

              {/* Grid de 3 planes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", padding: "0.75rem", background: "rgba(163,230,53,0.03)", border: "1px solid rgba(163,230,53,0.12)", borderRadius: "0 0 1.25rem 1.25rem" }}>
                {PLANS.map((plan) => {
                  const cfg = PLAN_CONFIG[plan.id];
                  return (
                    <div key={plan.id} style={{
                      background: plan.highlight ? "#0f1a00" : "#161616",
                      border: `1px solid ${plan.highlight ? "rgba(163,230,53,0.4)" : "#222"}`,
                      borderRadius: "1rem", overflow: "hidden",
                      display: "flex", flexDirection: "column",
                      boxShadow: plan.highlight ? "0 0 30px rgba(163,230,53,0.07)" : "none",
                    }}>
                      {plan.badge && (
                        <div style={{
                          background: "#a3e635", color: "#000",
                          fontSize: "0.62rem", fontWeight: 800,
                          textAlign: "center", padding: "0.3rem",
                          textTransform: "uppercase", letterSpacing: "0.1em",
                        }}>
                          {plan.badge}
                        </div>
                      )}

                      <div style={{ padding: "1.5rem 1.5rem 1rem" }}>
                        <p style={{ color: cfg.color, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
                          {plan.name}
                        </p>
                        <span style={{ color: "white", fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>
                          {plan.price}
                        </span>
                        <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.25rem", marginBottom: "0.875rem" }}>
                          {plan.priceNote}
                        </p>
                        <div style={{
                          background: plan.highlight ? "rgba(163,230,53,0.06)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${plan.highlight ? "rgba(163,230,53,0.15)" : "#2a2a2a"}`,
                          borderRadius: "0.4rem", padding: "0.4rem 0.625rem",
                        }}>
                          <p style={{ color: plan.highlight ? "#a3e635" : "#555", fontSize: "0.7rem", fontWeight: 600, margin: 0 }}>
                            {plan.limits}
                          </p>
                        </div>
                      </div>

                      <div style={{ borderTop: `1px solid ${plan.highlight ? "rgba(163,230,53,0.1)" : "#1e1e1e"}`, margin: "0 1.5rem" }} />

                      <div style={{ padding: "1rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {plan.features.map((f) => (
                          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.72rem", color: f.disabled ? "#2a2a2a" : cfg.color }}>
                              {f.disabled ? "✕" : "✓"}
                            </span>
                            <span style={{ color: f.disabled ? "#333" : (plan.highlight ? "#ccc" : "#777"), fontSize: "0.78rem", textDecoration: f.disabled ? "line-through" : "none" }}>
                              {f.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: "0 1.5rem 1.5rem" }}>
                        <Link href="/signup" style={{
                          display: "block", textAlign: "center", padding: "0.65rem",
                          borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.82rem",
                          textDecoration: "none",
                          background: plan.highlight ? "#a3e635" : "transparent",
                          color: plan.highlight ? "#000" : "#555",
                          border: plan.highlight ? "none" : "1px solid #2a2a2a",
                        }}>
                          {plan.price === "Gratis" ? "Empezar gratis" : "Comenzar"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <p style={{ color: "#333", fontSize: "0.78rem", textAlign: "center", marginTop: "2rem" }}>
            Podés cambiar tu plan en cualquier momento desde tu perfil.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "1.5rem", textAlign: "center", color: "#444", fontSize: "0.8rem", background: "#0a0a0a", borderTop: "1px solid #1a1a1a" }}>
        © 2026 Runfix — Gestión de equipos de running
      </footer>

    </main>
  );
}
