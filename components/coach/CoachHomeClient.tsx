"use client";

import Link from "next/link";
import { PLAN_LIMITS, PLAN_CONFIG, PLANS, type PlanId } from "@/lib/plans";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  subscription_plan: string;
  team_name: string | null;
  team_logo_path: string | null;
  team_description: string | null;
  team_location: string | null;
  logoUrl: string | null;
};

type Stats = { teams: number; runners: number; venues: number; events: number };

export function CoachHomeClient({ profile, stats }: { profile: Profile; stats: Stats }) {
  const displayName = profile.team_name || profile.full_name || "Mi Running Team";
  const planId      = (profile.subscription_plan ?? "starter") as PlanId;
  const limits      = PLAN_LIMITS[planId];
  const planMeta    = PLANS.find(p => p.id === planId) ?? PLANS[0];
  const planCfg     = PLAN_CONFIG[planId];

  // Helpers para stat cards con límite
  function atLimit(count: number, max: number | null) {
    return max !== null && count >= max;
  }

  const statCards = [
    {
      label: "Sedes",
      value: stats.venues,
      max: limits.maxVenues,
      icon: "📍",
      href: "/coach/venues",
    },
    {
      label: "Equipos",
      value: stats.teams,
      max: limits.maxTeams,
      icon: "👥",
      href: "/coach/teams",
    },
    {
      label: "Runners",
      value: stats.runners,
      max: limits.maxRunners,
      icon: "🏃",
      href: "/coach/runners",
    },
    {
      label: "Eventos",
      value: stats.events,
      max: null,
      icon: "🏁",
      href: "/coach/events",
    },
  ];

  return (
    <div className="coach-home-wrap" style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <style>{`
        @media (max-width: 767px) {
          .coach-home-wrap   { padding: 1rem !important; }
          .coach-brand-card  { padding: 1.25rem !important; padding-right: 7rem !important; gap: 1rem !important; }
          .coach-team-logo   { width: 4.5rem !important; height: 4.5rem !important; }
          .coach-team-name   { font-size: 1.4rem !important; }
          .coach-stats-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── BRAND CARD ── */}
      <div className="coach-brand-card" style={{
        background: "linear-gradient(135deg, #111 0%, #161a10 100%)",
        border: "1px solid #2a2a1a",
        borderRadius: "1.25rem",
        padding: "2.5rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "2rem",
        flexWrap: "wrap",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorativo */}
        <div style={{
          position: "absolute", top: "-4rem", right: "-4rem",
          width: "18rem", height: "18rem", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(163,230,53,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div className="coach-team-logo" style={{
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
          <h1 className="coach-team-name" style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 0.35rem 0" }}>
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

        {/* Top-right: plan */}
        <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          {/* Badge plan Runfix */}
          <Link
            href="/coach/settings"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              background: planCfg.bg, border: `1px solid ${planCfg.border}`,
              borderRadius: "2rem", padding: "0.2rem 0.75rem",
              color: planCfg.color, fontSize: "0.7rem", fontWeight: 800,
              textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em",
            }}
          >
            ⭐ Plan {planMeta.name}
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="coach-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
        {statCards.map(s => {
          const limited   = atLimit(s.value, s.max);
          const borderColor = limited ? "rgba(245,158,11,0.3)" : "#1e1e1e";
          const valueColor  = limited ? "#f59e0b" : "white";

          return (
            <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#111",
                border: `1px solid ${borderColor}`,
                borderRadius: "0.875rem",
                padding: "1.1rem 1.25rem",
                display: "flex", alignItems: "center", gap: "0.875rem",
                transition: "border-color 0.15s",
                position: "relative", overflow: "hidden",
              }}>
                <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                    <span style={{ color: valueColor, fontSize: "1.6rem", fontWeight: 900, lineHeight: 1 }}>
                      {s.value}
                    </span>
                    {s.max !== null && (
                      <span style={{ color: "#444", fontSize: "0.8rem", fontWeight: 600 }}>
                        / {s.max}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#666", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    {s.label}
                  </div>
                </div>

                {/* Badge límite */}
                {limited && (
                  <span style={{
                    position: "absolute", top: "0.5rem", right: "0.5rem",
                    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: "2rem", padding: "0.05rem 0.45rem",
                    color: "#f59e0b", fontSize: "0.55rem", fontWeight: 800,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    Límite
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
