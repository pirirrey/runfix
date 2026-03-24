import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoachActionButtons } from "@/components/superadmin/ApproveRejectButtons";
import { PLANS, PLAN_CONFIG } from "@/lib/plans";

type Coach = {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
  subscription_plan: string;
  created_at: string;
  team_name: string | null;
  team_logo_path: string | null;
  team_logo_url?: string | null;
};

export default async function SuperadminCoachesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawCoaches } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, subscription_plan, created_at, team_name, team_logo_path")
    .eq("role", "coach")
    .order("created_at", { ascending: false })
    .returns<Coach[]>();

  // Generar signed URLs para logos
  const coaches: Coach[] = await Promise.all(
    (rawCoaches ?? []).map(async (c) => {
      if (!c.team_logo_path) return { ...c, team_logo_url: null };
      const { data } = await supabase.storage
        .from("training-plans")
        .createSignedUrl(c.team_logo_path, 3600);
      return { ...c, team_logo_url: data?.signedUrl ?? null };
    })
  );

  const pending   = coaches.filter((c) => c.status === "pending");
  const approved  = coaches.filter((c) => c.status === "approved");
  const suspended = coaches.filter((c) => c.status === "suspended");
  const rejected  = coaches.filter((c) => c.status === "rejected");

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
          Panel de administración
        </p>
        <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Entrenadores / Running Teams
        </h1>
        <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.3rem" }}>
          Gestioná las solicitudes de acceso y el estado de los running teams
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
        {[
          { label: "Pendientes",  value: pending.length,   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)", sublabel: "de activación inicial" },
          { label: "Activos",      value: approved.length,  color: "#a3e635", bg: "rgba(163,230,53,0.08)",  border: "rgba(163,230,53,0.2)"  },
          { label: "Suspendidos", value: suspended.length, color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
          { label: "Rechazados",  value: rejected.length,  color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: stat.bg, border: `1px solid ${stat.border}`,
            borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center",
          }}>
            <p style={{ color: stat.color, fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>{stat.value}</p>
            <p style={{ color: stat.color, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.35rem", opacity: 0.8 }}>
              {stat.label}
            </p>
            {"sublabel" in stat && (
              <p style={{ color: stat.color, fontSize: "0.65rem", fontWeight: 500, marginTop: "0.15rem", opacity: 0.5, textTransform: "lowercase", letterSpacing: "0.02em" }}>
                {(stat as { sublabel: string }).sublabel}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Pendientes */}
      <section style={{ marginBottom: "2.5rem" }}>
        <SectionHeader icon="⏳" title="Pendientes de activación inicial" count={pending.length} countColor="#f59e0b" />
        {pending.length === 0 ? (
          <EmptyState text="No hay solicitudes pendientes ✓" />
        ) : (
          <CardList>
            {pending.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </CardList>
        )}
      </section>

      {/* Aprobados */}
      <section style={{ marginBottom: "2.5rem" }}>
        <SectionHeader icon="✅" title="Activos" count={approved.length} countColor="#a3e635" />
        {approved.length === 0 ? (
          <EmptyState text="Sin entrenadores activos aún" />
        ) : (
          <CardList>
            {approved.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </CardList>
        )}
      </section>

      {/* Suspendidos */}
      {suspended.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionHeader icon="⏸" title="Suspendidos" count={suspended.length} countColor="#fb923c" />
          <CardList>
            {suspended.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </CardList>
        </section>
      )}

      {/* Rechazados */}
      {rejected.length > 0 && (
        <section>
          <SectionHeader icon="🚫" title="Rechazados" />
          <CardList>
            {rejected.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </CardList>
        </section>
      )}
    </div>
  );
}

/* ── Helpers de layout ── */
function SectionHeader({ icon, title, count, countColor }: { icon: string; title: string; count?: number; countColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
      <span style={{ fontSize: "1rem" }}>{icon}</span>
      <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 700 }}>{title}</h2>
      {count !== undefined && count > 0 && (
        <span style={{
          background: `${countColor}22`, color: countColor,
          fontSize: "0.7rem", fontWeight: 700,
          padding: "0.1rem 0.5rem", borderRadius: "2rem",
          border: `1px solid ${countColor}44`,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "2rem", textAlign: "center", color: "#555", fontSize: "0.875rem" }}>
      {text}
    </div>
  );
}

function CardList({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>{children}</div>;
}

/* ── Card de coach ── */
function CoachCard({ coach }: { coach: Coach }) {
  const isApproved  = coach.status === "approved";
  const isSuspended = coach.status === "suspended";
  const isPending   = coach.status === "pending";

  const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Pendiente de activación"  },
    approved:  { color: "#a3e635", bg: "rgba(163,230,53,0.08)",  border: "rgba(163,230,53,0.2)",  label: "Activo"     },
    suspended: { color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)",  label: "Suspendido" },
    rejected:  { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", label: "Rechazado"  },
  };
  const st = statusConfig[coach.status] ?? statusConfig.pending;

  const date = new Date(coach.created_at).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div style={{
      background: isSuspended ? "rgba(251,146,60,0.03)" : "#111",
      border: `1px solid ${isSuspended ? "rgba(251,146,60,0.15)" : "#1e1e1e"}`,
      borderRadius: "0.875rem",
      padding: "1.25rem 1.5rem",
      display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" as const,
    }}>

      {/* Logo del Running Team */}
      <div style={{
        width: "3rem", height: "3rem", borderRadius: "0.625rem", flexShrink: 0,
        background: "#1a1a1a", border: "1px solid #252525",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.3rem",
      }}>
        {coach.team_logo_url
          ? <img src={coach.team_logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span>🏃</span>
        }
      </div>

      {/* Info principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Running Team name — grande y prominente */}
        <p style={{ color: "white", fontWeight: 800, fontSize: isApproved || isSuspended ? "1rem" : "0.95rem", margin: "0 0 0.15rem 0" }}>
          {(isApproved || isSuspended) && coach.team_name
            ? coach.team_name
            : coach.full_name ?? "Sin nombre"}
        </p>

        {/* Coach name + email — más chico debajo */}
        {(isApproved || isSuspended) && (
          <p style={{ color: "#555", fontSize: "0.75rem", margin: "0 0 0.1rem 0" }}>
            {coach.full_name ?? "—"}
          </p>
        )}
        <p style={{ color: isPending ? "#666" : "#444", fontSize: "0.75rem", margin: 0 }}>
          {coach.email}
        </p>
        <p style={{ color: "#333", fontSize: "0.7rem", marginTop: "0.2rem" }}>Registrado el {date}</p>
      </div>

      {/* Plan badge */}
      {(() => {
        const plan = PLANS.find(p => p.id === coach.subscription_plan) ?? PLANS[0];
        const cfg = PLAN_CONFIG[plan.id as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.starter;
        return (
          <span style={{
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            borderRadius: "2rem", padding: "0.2rem 0.65rem",
            fontSize: "0.68rem", fontWeight: 700,
            textTransform: "uppercase" as const, letterSpacing: "0.08em", flexShrink: 0,
          }}>
            {plan.name}
          </span>
        );
      })()}

      {/* Status badge */}
      <span style={{
        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
        borderRadius: "2rem", padding: "0.2rem 0.75rem",
        fontSize: "0.72rem", fontWeight: 700,
        textTransform: "uppercase" as const, letterSpacing: "0.08em", flexShrink: 0,
      }}>
        {st.label}
      </span>

      {/* Acciones */}
      <CoachActionButtons coachId={coach.id} currentStatus={coach.status} />
    </div>
  );
}
