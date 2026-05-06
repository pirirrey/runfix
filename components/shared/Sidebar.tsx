"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { RunnerAlertBell } from "@/components/runner/RunnerAlertBell";
import { RunnerMessageBell } from "@/components/runner/RunnerMessageBell";

interface SidebarProps {
  role: "coach" | "runner" | "superadmin";
  fullName: string | null;
  email: string;
}

const coachLinks = [
  { href: "/coach/home",     label: "Inicio",          icon: "🏠" },
  { href: "/coach/venues",   label: "Mis Sedes",       icon: "📍" },
  { href: "/coach/teams",    label: "Mis Equipos",     icon: "👥" },
  { href: "/coach/runners",  label: "Mis Runners",     icon: "🏃" },
  { href: "/coach/events",   label: "Eventos",         icon: "🏁" },
  { href: "/coach/settings", label: "Perfil del team", icon: "⚙️" },
];

const runnerLinks = [
  { href: "/runner/home",         label: "Inicio",           icon: "🏠" },
  { href: "/runner/plans",        label: "Mis planes",       icon: "📋" },
  { href: "/runner/events",       label: "Eventos",          icon: "🏁" },
  { href: "/runner/goals",        label: "Mis Objetivos",    icon: "🎯" },
  { href: "/runner/achievements", label: "Mis Logros",       icon: "🏆" },
  { href: "/runner/payments",     label: "Mis Pagos",        icon: "💳" },
  { href: "/runner/join",         label: "Mis Running Teams",icon: "🏃" },
  { href: "/runner/profile",      label: "Mi Perfil",        icon: "👤" },
];

const superadminLinks = [
  { href: "/superadmin/coaches", label: "Entrenadores / Running Teams", icon: "🎯" },
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el menú está abierto en mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <style>{`
        /* ── Overlay backdrop ── */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          z-index: 999;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        .sidebar-overlay.open {
          display: block;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Sidebar ── */
        .app-sidebar {
          width: 15rem;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0f0f0f;
          border-right: 1px solid #1e1e1e;
          padding: 1.25rem;
          gap: 1.25rem;
          position: sticky;
          top: 0;
          z-index: 1000;
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── Sidebar link hover ── */
        .sidebar-link:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #fff !important;
        }

        /* ── Barra superior mobile (reemplaza el botón flotante) ── */
        .mobile-topbar {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 3.25rem;
          background: #0f0f0f;
          border-bottom: 1px solid #1e1e1e;
          align-items: center;
          padding: 0 0.875rem;
          gap: 0.75rem;
          z-index: 1001;
        }
        .mobile-topbar-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          color: #aaa;
          font-size: 1.15rem;
          cursor: pointer;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
          line-height: 1;
          padding: 0;
        }
        .mobile-topbar-btn:hover { background: #222; color: #ccc; }
        .mobile-topbar-logo {
          font-size: 1rem;
          font-weight: 900;
          color: #a3e635;
          letter-spacing: -0.02em;
          font-family: inherit;
        }

        /* ── Mobile responsive ── */
        @media (max-width: 767px) {
          .mobile-topbar { display: flex; }
          .app-sidebar {
            position: fixed;
            top: 0; left: 0;
            height: 100vh;
            width: 15rem;
            transform: translateX(-100%);
          }
          .app-sidebar.open {
            transform: translateX(0);
          }
          /* El contenido principal cede espacio a la topbar */
          .app-main {
            padding-top: 3.25rem;
          }
        }

        @media (min-width: 768px) {
          .app-sidebar { transform: none !important; }
        }
      `}</style>

      {/* ── Barra superior mobile ── */}
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-btn"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? "✕" : "☰"}
        </button>
        <span className="mobile-topbar-logo">Runfix</span>
      </div>

      {/* ── Overlay backdrop ── */}
      <div
        className={`sidebar-overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar${open ? " open" : ""}`}>

        {/* Logo */}
        <div style={{ padding: "0.25rem 0.5rem", marginBottom: "0.25rem" }}>
          <img src="/images/runfix-dark.svg" alt="Runfix" style={{ height: "1.75rem", width: "auto" }} />
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
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", overflowY: "auto", minHeight: 0 }}>
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

        {/* Campanas del runner */}
        {role === "runner" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.25rem" }}>
            <RunnerMessageBell />
            <RunnerAlertBell />
          </div>
        )}

        <UserMenu fullName={fullName} email={email} />
      </aside>
    </>
  );
}
