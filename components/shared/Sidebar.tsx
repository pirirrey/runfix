import Link from "next/link";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  role: "coach" | "runner" | "superadmin";
  fullName: string | null;
  email: string;
}

const coachLinks = [
  { href: "/coach/teams", label: "Mis equipos", icon: "👥" },
];

const runnerLinks = [
  { href: "/runner/plans", label: "Mis planes", icon: "📋" },
  { href: "/runner/team", label: "Mi equipo", icon: "👥" },
  { href: "/runner/join", label: "Unirse a equipo", icon: "➕" },
];

const superadminLinks = [
  { href: "/superadmin/coaches", label: "Entrenadores", icon: "🎯" },
];

const roleConfig = {
  coach: {
    links: coachLinks,
    accent: "#a3e635",
    accentBg: "rgba(163,230,53,0.1)",
    accentBorder: "rgba(163,230,53,0.25)",
    badge: "🎯 Entrenador",
  },
  runner: {
    links: runnerLinks,
    accent: "#60a5fa",
    accentBg: "rgba(96,165,250,0.1)",
    accentBorder: "rgba(96,165,250,0.25)",
    badge: "🏅 Runner",
  },
  superadmin: {
    links: superadminLinks,
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.25)",
    badge: "⚡ Super Admin",
  },
};

export function Sidebar({ role, fullName, email }: SidebarProps) {
  const config = roleConfig[role];

  return (
    <aside style={{
      width: "15rem",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0f0f0f",
      borderRight: "1px solid #1e1e1e",
      padding: "1.25rem",
      gap: "1.25rem",
      position: "sticky",
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "1.4rem" }}>🏃</span>
        <span style={{ fontWeight: 900, fontSize: "1.15rem", color: "white", letterSpacing: "-0.02em" }}>WePlan</span>
      </div>

      {/* Role badge */}
      <div style={{
        background: config.accentBg,
        border: `1px solid ${config.accentBorder}`,
        borderRadius: "0.5rem",
        padding: "0.4rem 0.75rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        color: config.accent,
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
      }}>
        {config.badge}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <p style={{ fontSize: "0.65rem", color: "#555", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 600, padding: "0 0.5rem", marginBottom: "0.25rem" }}>
          Menú
        </p>
        {config.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "#aaa",
              textDecoration: "none",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
            className="sidebar-link"
          >
            <span style={{ fontSize: "1rem" }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <UserMenu fullName={fullName} email={email} />
    </aside>
  );
}
