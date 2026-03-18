import Link from "next/link";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  role: "coach" | "runner";
  fullName: string | null;
  email: string;
}

const coachLinks = [{ href: "/coach/teams", label: "Mis equipos", icon: "👥" }];

const runnerLinks = [
  { href: "/runner/plans", label: "Mis planes", icon: "📋" },
  { href: "/runner/join", label: "Unirse a equipo", icon: "➕" },
];

export function Sidebar({ role, fullName, email }: SidebarProps) {
  const links = role === "coach" ? coachLinks : runnerLinks;

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen border-r bg-background p-4 gap-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="text-xl">🏃</span>
        <span className="font-bold text-lg">WePlan</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <UserMenu fullName={fullName} email={email} />
    </aside>
  );
}
