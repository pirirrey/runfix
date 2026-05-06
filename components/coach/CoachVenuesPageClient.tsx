"use client";

import { useRef } from "react";
import { CoachVenuesPanel, CoachVenuesPanelHandle, Venue } from "@/components/coach/CoachVenuesPanel";
import { PLAN_LIMITS, PLANS, type PlanId } from "@/lib/plans";
import Link from "next/link";

interface Props {
  initialVenues: Venue[];
  planId: PlanId;
}

export function CoachVenuesPageClient({ initialVenues, planId }: Props) {
  const panelRef  = useRef<CoachVenuesPanelHandle>(null);
  const limits    = PLAN_LIMITS[planId];
  const planMeta  = PLANS.find(p => p.id === planId) ?? PLANS[0];
  const venueCount = initialVenues.length;
  const atLimit   = limits.maxVenues !== null && venueCount >= limits.maxVenues;

  return (
    <div className="page-wrap" style={{ minHeight: "100vh", background: "#0a0a0a", padding: "2.5rem" }}>
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

        {/* Header */}
        <div className="page-header" style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", marginBottom: "2.5rem",
          gap: "1rem",
        }}>
          <div>
            <p style={{
              color: "#a3e635", fontSize: "0.75rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem",
            }}>
              Panel de entrenador
            </p>
            <h1 className="page-title" style={{ color: "white", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>
              Mis Sedes
            </h1>
            <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              Gestioná tus puntos de encuentro, días y horarios de entrenamiento
            </p>
          </div>

          {/* Botón Nueva Sede */}
          <div className="page-header-actions" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
            <button
              onClick={() => !atLimit && panelRef.current?.openNew()}
              disabled={atLimit}
              title={atLimit ? `Límite del plan ${planMeta.name} alcanzado` : "Agregar nueva sede"}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: atLimit ? "#1a1a1a" : "#a3e635",
                color: atLimit ? "#444" : "#000",
                border: atLimit ? "1px solid #2a2a2a" : "none",
                borderRadius: "0.625rem",
                padding: "0.65rem 1.25rem",
                fontSize: "0.875rem", fontWeight: 700,
                cursor: atLimit ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>+</span>
              Nueva Sede
            </button>

            {/* Contador de uso */}
            {limits.maxVenues !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{
                  color: atLimit ? "#f59e0b" : "#555",
                  fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {venueCount} / {limits.maxVenues} sedes
                </span>
                {atLimit && (
                  <Link href="/coach/settings" style={{
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: "2rem", padding: "0.1rem 0.55rem",
                    color: "#f59e0b", fontSize: "0.65rem", fontWeight: 700,
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}>
                    Mejorar plan →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Aviso de límite alcanzado */}
        {atLimit && (
          <div style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: "0.75rem",
            padding: "0.875rem 1.25rem",
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.82rem", margin: "0 0 0.15rem 0" }}>
                Límite de sedes alcanzado
              </p>
              <p style={{ color: "#7a6a3a", fontSize: "0.77rem", margin: 0, lineHeight: 1.5 }}>
                Tu plan <strong style={{ color: "#aaa" }}>{planMeta.name}</strong> incluye hasta {limits.maxVenues} sede{limits.maxVenues !== 1 ? "s" : ""}.
                Para agregar más,{" "}
                <Link href="/coach/settings" style={{ color: "#f59e0b", textDecoration: "underline" }}>
                  cambiá tu plan
                </Link>.
              </p>
            </div>
          </div>
        )}

        {/* Panel de sedes */}
        <CoachVenuesPanel ref={panelRef} initialVenues={initialVenues} />

      </div>
    </div>
  );
}
