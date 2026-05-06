import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateEventDialog } from "@/components/coach/CreateEventDialog";

type EventRow = {
  id: string;
  name: string;
  location: string | null;
  race_type: "street" | "trail";
  start_date: string;
  end_date: string;
  discount_code: string | null;
  race_event_distances: { id: string }[];
};

export default async function CoachEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("race_events")
    .select("id, name, location, race_type, start_date, end_date, discount_code, race_event_distances(id)")
    .eq("coach_id", user.id)
    .order("start_date", { ascending: true })
    .returns<EventRow[]>();

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="page-wrap" style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>

      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", gap: "1rem" }}>
        <div>
          <p style={{ color: "#a3e635", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
            Panel de entrenador
          </p>
          <h1 className="page-title" style={{ fontSize: "2rem", fontWeight: 900, color: "white", letterSpacing: "-0.03em", margin: 0 }}>Eventos</h1>
          <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>
            Carreras publicadas para tus runners
          </p>
        </div>
        <div className="page-header-actions" style={{ display: "flex", flexShrink: 0 }}>
          <CreateEventDialog />
        </div>
      </div>

      {/* Lista */}
      {!events || events.length === 0 ? (
        <div style={{
          background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem",
          padding: "4rem 2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏁</div>
          <p style={{ color: "#666", fontSize: "0.95rem" }}>No hay eventos cargados todavía.</p>
          <p style={{ color: "#444", fontSize: "0.82rem", marginTop: "0.35rem" }}>
            Creá el primer evento con el botón de arriba.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {events.map((ev) => {
            const sameDay = ev.start_date === ev.end_date;
            const dateLabel = sameDay
              ? formatDate(ev.start_date)
              : `${formatDate(ev.start_date)} → ${formatDate(ev.end_date)}`;

            return (
              <Link
                key={ev.id}
                href={`/coach/events/${ev.id}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem",
                  padding: "1.25rem 1.5rem", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "1rem", cursor: "pointer",
                  transition: "border-color 0.15s",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                      <span style={{
                        background: ev.race_type === "trail" ? "rgba(163,230,53,0.12)" : "rgba(96,165,250,0.12)",
                        border: `1px solid ${ev.race_type === "trail" ? "rgba(163,230,53,0.3)" : "rgba(96,165,250,0.3)"}`,
                        color: ev.race_type === "trail" ? "#a3e635" : "#60a5fa",
                        borderRadius: "2rem", padding: "0.15rem 0.6rem",
                        fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                      }}>
                        {ev.race_type === "trail" ? "🏔 Trail" : "🏙 Calle"}
                      </span>
                      <h2 style={{ color: "white", fontSize: "1rem", fontWeight: 700, margin: 0 }}>{ev.name}</h2>
                    </div>
                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                      <span style={{ color: "#888", fontSize: "0.8rem" }}>📅 {dateLabel}</span>
                      {ev.location && <span style={{ color: "#888", fontSize: "0.8rem" }}>📍 {ev.location}</span>}
                      <span style={{ color: "#888", fontSize: "0.8rem" }}>
                        🏃 {ev.race_event_distances.length} distancia{ev.race_event_distances.length !== 1 ? "s" : ""}
                      </span>
                      {ev.discount_code && (
                        <span style={{ color: "#a3e635", fontSize: "0.8rem" }}>🏷 {ev.discount_code}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: "#555", fontSize: "1.25rem" }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
