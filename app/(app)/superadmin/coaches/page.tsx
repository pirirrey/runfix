import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApproveRejectButtons } from "@/components/superadmin/ApproveRejectButtons";

type Coach = {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
  created_at: string;
};

export default async function SuperadminCoachesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, created_at")
    .eq("role", "coach")
    .order("created_at", { ascending: false })
    .returns<Coach[]>();

  const pending  = coaches?.filter((c) => c.status === "pending")  ?? [];
  const approved = coaches?.filter((c) => c.status === "approved") ?? [];
  const rejected = coaches?.filter((c) => c.status === "rejected") ?? [];

  return (
    <div style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#f59e0b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
          Panel de administración
        </p>
        <h1 style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Entrenadores
        </h1>
        <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.3rem" }}>
          Gestioná las solicitudes de acceso de los entrenadores
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
        {[
          { label: "Pendientes", value: pending.length,  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
          { label: "Aprobados",  value: approved.length, color: "#a3e635", bg: "rgba(163,230,53,0.08)",  border: "rgba(163,230,53,0.2)"  },
          { label: "Rechazados", value: rejected.length, color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: stat.bg,
            border: `1px solid ${stat.border}`,
            borderRadius: "0.75rem",
            padding: "1.25rem",
            textAlign: "center",
          }}>
            <p style={{ color: stat.color, fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>{stat.value}</p>
            <p style={{ color: stat.color, fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.35rem", opacity: 0.8 }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Pendientes — sección principal */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1rem" }}>⏳</span>
          <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 700 }}>
            Pendientes de aprobación
          </h2>
          {pending.length > 0 && (
            <span style={{
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.1rem 0.5rem",
              borderRadius: "2rem",
              border: "1px solid rgba(245,158,11,0.3)",
            }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "0.75rem",
            padding: "2rem",
            textAlign: "center",
            color: "#555",
            fontSize: "0.875rem",
          }}>
            No hay solicitudes pendientes ✓
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pending.map((coach) => (
              <CoachCard key={coach.id} coach={coach} showActions />
            ))}
          </div>
        )}
      </section>

      {/* Aprobados */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1rem" }}>✅</span>
          <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 700 }}>Aprobados</h2>
        </div>
        {approved.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center", color: "#555", fontSize: "0.875rem" }}>
            Sin entrenadores aprobados aún
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {approved.map((coach) => (
              <CoachCard key={coach.id} coach={coach} showActions />
            ))}
          </div>
        )}
      </section>

      {/* Rechazados */}
      {rejected.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1rem" }}>🚫</span>
            <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 700 }}>Rechazados</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {rejected.map((coach) => (
              <CoachCard key={coach.id} coach={coach} showActions />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function CoachCard({ coach, showActions }: { coach: Coach; showActions?: boolean }) {
  const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Pendiente" },
    approved: { color: "#a3e635", bg: "rgba(163,230,53,0.08)",  border: "rgba(163,230,53,0.2)",  label: "Aprobado"  },
    rejected: { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", label: "Rechazado" },
  };
  const st = statusConfig[coach.status] ?? statusConfig.pending;

  const date = new Date(coach.created_at).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div style={{
      background: "#111",
      border: "1px solid #1e1e1e",
      borderRadius: "0.875rem",
      padding: "1.25rem 1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      flexWrap: "wrap" as const,
    }}>
      {/* Avatar */}
      <div style={{
        width: "2.75rem",
        height: "2.75rem",
        borderRadius: "50%",
        background: "#1e1e1e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.25rem",
        flexShrink: 0,
      }}>
        🎯
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.1rem" }}>
          {coach.full_name ?? "Sin nombre"}
        </p>
        <p style={{ color: "#666", fontSize: "0.8rem" }}>{coach.email}</p>
        <p style={{ color: "#444", fontSize: "0.75rem", marginTop: "0.15rem" }}>Registrado el {date}</p>
      </div>

      {/* Status badge */}
      <span style={{
        background: st.bg,
        color: st.color,
        border: `1px solid ${st.border}`,
        borderRadius: "2rem",
        padding: "0.2rem 0.75rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        flexShrink: 0,
      }}>
        {st.label}
      </span>

      {/* Acciones */}
      {showActions && <ApproveRejectButtons coachId={coach.id} currentStatus={coach.status} />}
    </div>
  );
}
