"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import Link from "next/link";

function DiscountCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: "0.625rem", display: "inline-flex", alignItems: "center", gap: "0.625rem", background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.5rem", padding: "0.4rem 0.75rem" }}>
      <span style={{ color: "#888", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>🏷 Descuento</span>
      <span style={{ color: "#a3e635", fontSize: "0.95rem", fontWeight: 900, letterSpacing: "0.15em", fontFamily: "monospace" }}>{code}</span>
      <button
        onClick={copy}
        style={{ background: copied ? "rgba(163,230,53,0.2)" : "#1a1a1a", border: `1px solid ${copied ? "#a3e635" : "#333"}`, borderRadius: "0.3rem", padding: "0.15rem 0.5rem", color: copied ? "#a3e635" : "#666", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
      >
        {copied ? "✓" : "Copiar"}
      </button>
    </div>
  );
}

type GoalRow = {
  id: string;
  distance_id: string;
  created_at: string;
  distance: {
    id: string;
    label: string;
    altimetry_path: string | null;
    altimetryUrl?: string | null;
    event: {
      id: string; name: string; location: string | null;
      race_type: "street" | "trail"; start_date: string; end_date: string;
      discount_code: string | null;
    };
  };
};

export default function RunnerGoalsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("runner_event_goals")
      .select(`
        id, distance_id, created_at,
        distance:race_event_distances!runner_event_goals_distance_id_fkey(
          id, label, altimetry_path,
          event:race_events!race_event_distances_event_id_fkey(
            id, name, location, race_type, start_date, end_date, discount_code
          )
        )
      `)
      .eq("runner_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Signed URLs para altimetrías
    const withUrls = await Promise.all(data.map(async (g: GoalRow) => {
      if (!g.distance?.altimetry_path) return g;
      const { data: su } = await supabase.storage.from("training-plans").createSignedUrl(g.distance.altimetry_path, 3600);
      return { ...g, distance: { ...g.distance, altimetryUrl: su?.signedUrl ?? null } };
    }));

    setGoals(withUrls as GoalRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const removeGoal = async (distanceId: string) => {
    setRemoving(distanceId);
    const res = await fetch(`/api/runner/goals/${distanceId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Objetivo removido"); await load(); }
    else toast.error("Error al remover");
    setRemoving(null);
  };

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <div style={{ padding: "3rem", color: "#666", textAlign: "center" }}>Cargando...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", margin: 0 }}>🎯 Mis Objetivos</h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Las distancias que marcaste como tus metas de carrera
        </p>
      </div>

      {goals.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", padding: "4rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <p style={{ color: "#666" }}>Todavía no marcaste ningún objetivo.</p>
          <p style={{ color: "#444", fontSize: "0.82rem", marginTop: "0.3rem", marginBottom: "1.25rem" }}>
            Explorá los eventos y marcá las distancias que quieras correr.
          </p>
          <Link href="/runner/events" style={{
            background: "#a3e635", color: "#000", fontWeight: 700, fontSize: "0.875rem",
            borderRadius: "0.5rem", padding: "0.6rem 1.25rem", textDecoration: "none", display: "inline-block",
          }}>
            Ver eventos →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {goals.map((g) => {
            const ev = g.distance?.event;
            if (!ev) return null;
            const sameDay = ev.start_date === ev.end_date;
            const dateLabel = sameDay ? formatDate(ev.start_date) : `${formatDate(ev.start_date)} → ${formatDate(ev.end_date)}`;
            const typeColor = ev.race_type === "trail" ? "#a3e635" : "#60a5fa";

            return (
              <div key={g.id} style={{
                background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem",
                padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <span style={{ color: typeColor, fontSize: "0.68rem", fontWeight: 700, background: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}44`, borderRadius: "2rem", padding: "0.1rem 0.5rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {ev.race_type === "trail" ? "🏔 Trail" : "🏙 Calle"}
                    </span>
                    <span style={{ color: "#a3e635", fontWeight: 800, fontSize: "1.05rem" }}>
                      {g.distance?.label}
                    </span>
                  </div>
                  <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", margin: "0 0 0.25rem 0" }}>{ev.name}</p>
                  <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#777", fontSize: "0.78rem" }}>📅 {dateLabel}</span>
                    {ev.location && <span style={{ color: "#777", fontSize: "0.78rem" }}>📍 {ev.location}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {g.distance?.altimetryUrl && (
                      <a href={g.distance.altimetryUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#a3e635", fontSize: "0.75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        📈 Ver altimetría
                      </a>
                    )}
                  </div>
                  {ev.discount_code
                    ? <DiscountCode code={ev.discount_code} />
                    : (
                      <div style={{ marginTop: "0.625rem", display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(163,230,53,0.04)", border: "1px solid rgba(163,230,53,0.15)", borderRadius: "0.5rem", padding: "0.35rem 0.75rem" }}>
                        <span style={{ fontSize: "0.72rem" }}>🏷</span>
                        <span style={{ color: "#6b8f2a", fontSize: "0.75rem", fontWeight: 600 }}>Sin código de descuento disponible</span>
                      </div>
                    )
                  }
                </div>
                <button
                  onClick={() => removeGoal(g.distance_id)}
                  disabled={removing === g.distance_id}
                  style={{
                    background: "transparent", border: "1px solid #2a1a1a", borderRadius: "0.4rem",
                    color: "#774", padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.75rem",
                    opacity: removing === g.distance_id ? 0.5 : 1, flexShrink: 0,
                  }}
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
