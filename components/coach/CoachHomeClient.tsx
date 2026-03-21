"use client";

import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  team_name: string | null;
  team_logo_path: string | null;
  team_description: string | null;
  team_location: string | null;
  logoUrl: string | null;
};

type Stats = { teams: number; runners: number; events: number };

export function CoachHomeClient({ profile, stats }: { profile: Profile; stats: Stats }) {
  const displayName = profile.team_name || profile.full_name || "Mi Running Team";

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>

      {/* ── BRAND CARD ── */}
      <div style={{
        background: "linear-gradient(135deg, #111 0%, #161a10 100%)",
        border: "1px solid #2a2a1a",
        borderRadius: "1.25rem",
        padding: "2.5rem",
        marginBottom: "2.5rem",
        display: "flex",
        alignItems: "center",
        gap: "2rem",
        flexWrap: "wrap",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative background */}
        <div style={{
          position: "absolute", top: "-4rem", right: "-4rem",
          width: "18rem", height: "18rem", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{
          width: "7rem", height: "7rem", borderRadius: "1rem", flexShrink: 0,
          border: profile.logoUrl ? "2px solid rgba(163,230,53,0.3)" : "2px dashed #333",
          background: profile.logoUrl ? "transparent" : "#1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {profile.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>🏃</div>
              <span style={{ color: "#555", fontSize: "0.65rem", lineHeight: 1.3 }}>Sin logo</span>
            </div>
          )}
        </div>

        {/* Team info */}
        <div style={{ flex: 1, minWidth: "12rem" }}>
          <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 0.35rem 0" }}>
            {displayName}
          </h1>
          {profile.team_location && (
            <p style={{ color: "#888", fontSize: "0.875rem", margin: "0 0 0.5rem 0" }}>
              📍 {profile.team_location}
            </p>
          )}
          {profile.team_description && (
            <p style={{ color: "#aaa", fontSize: "0.9rem", lineHeight: 1.6, margin: 0, maxWidth: "36rem" }}>
              {profile.team_description}
            </p>
          )}
          {!profile.team_name && !profile.team_description && (
            <p style={{ color: "#555", fontSize: "0.85rem", fontStyle: "italic" }}>
              Todavía no configuraste el perfil de tu running team
            </p>
          )}
        </div>

        {/* Edit button */}
        <Link
          href="/coach/settings"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
            borderRadius: "0.5rem", padding: "0.45rem 0.9rem",
            color: "#a3e635", fontSize: "0.78rem", fontWeight: 700,
            textDecoration: "none", flexShrink: 0,
            position: "absolute", top: "1rem", right: "1rem",
          }}
        >
          ✏️ Editar perfil
        </Link>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.875rem" }}>
        {[
          { label: "Equipos",  value: stats.teams,   icon: "👥", href: "/coach/teams"   },
          { label: "Runners",  value: stats.runners, icon: "🏃", href: "/coach/runners" },
          { label: "Eventos",  value: stats.events,  icon: "🏁", href: "/coach/events"  },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem",
              padding: "1.25rem 1.5rem", textAlign: "center", cursor: "pointer",
              transition: "border-color 0.15s",
            }}>
              <div style={{ fontSize: "1.75rem", marginBottom: "0.3rem" }}>{s.icon}</div>
              <div style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: "#666", fontSize: "0.78rem", marginTop: "0.3rem" }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
