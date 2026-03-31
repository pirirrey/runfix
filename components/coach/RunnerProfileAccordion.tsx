"use client";

import { useState } from "react";
import { RunnerVenuePicker } from "@/components/coach/RunnerVenuePicker";
import { RunnerPaymentPanel } from "@/components/coach/RunnerPaymentPanel";

/* ── tipos ── */
interface Cert {
  id: string; file_name: string; storage_path: string;
  expires_at: string; uploaded_at: string; signedUrl: string | null;
}
interface Venue { id: string; name: string; }
interface PaymentReceipt {
  id: string; payment_month: string; payment_date: string;
  method: "transfer" | "cash" | "other"; storage_path: string | null;
  file_name: string | null; notes: string | null; created_at: string;
}
interface Props {
  runnerId: string;
  runnerName: string;
  profile: {
    first_name: string | null; last_name: string | null;
    gender: string | null; birth_date: string | null;
    email: string | null; phone: string | null;
  };
  age: number | null;
  certs: Cert[];
  latestCert: Cert | null;
  venues: Venue[];
  currentVenueIds: string[];
  paymentPlan: { plan_type: "monthly" | "annual" | "exempt"; notes: string | null; discount_pct: number | null } | null;
  paymentReceipts: PaymentReceipt[];
  coachPricing: { monthly_price: number | null; monthly_due_day: number | null; annual_price: number | null };
}

/* ── helpers ── */
const genderLabel: Record<string, string> = { male: "Masculino", female: "Femenino", other: "Otro" };

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function certStatusInfo(expiresAt: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)   return { label: "Vencido",             color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)",  icon: "⚠" };
  if (diffDays <= 30) return { label: `Vence en ${diffDays}d`, color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)",   icon: "⏰" };
  return                     { label: "Vigente",              color: "#a3e635", bg: "rgba(163,230,53,0.1)",  border: "rgba(163,230,53,0.25)",   icon: "✓" };
}

const fieldLabel: React.CSSProperties = {
  color: "#555", fontSize: "0.7rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem",
};
const fieldValue: React.CSSProperties = { color: "white", fontSize: "0.9rem", fontWeight: 500 };

/* ── Acordeón genérico ── */
function Accordion({ icon, title, badge, children }: {
  icon: string; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden", marginBottom: "0.75rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: open ? "#0d0d0d" : "transparent",
          border: "none", cursor: "pointer",
          padding: "1rem 1.25rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1rem" }}>{icon}</span>
          <span style={{ color: "#aaa", fontSize: "0.82rem", fontWeight: 700 }}>{title}</span>
          {badge}
        </div>
        <span style={{
          color: "#333", fontSize: "0.7rem",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block",
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ paddingTop: "1rem" }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ── */
export function RunnerProfileAccordion({
  runnerId, runnerName, profile, age, certs, latestCert,
  venues, currentVenueIds, paymentPlan, paymentReceipts, coachPricing,
}: Props) {

  // Badge certificado
  const certBadge = latestCert ? (() => {
    const s = certStatusInfo(latestCert.expires_at);
    return (
      <span style={{
        background: `${s.bg}`, border: `1px solid ${s.border}`,
        color: s.color, borderRadius: "2rem",
        fontSize: "0.62rem", fontWeight: 800, padding: "0.05rem 0.45rem",
      }}>{s.icon} {s.label}</span>
    );
  })() : (
    <span style={{
      background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
      color: "#f87171", borderRadius: "2rem",
      fontSize: "0.62rem", fontWeight: 800, padding: "0.05rem 0.45rem",
    }}>⚠ Sin certificado</span>
  );

  return (
    <div style={{ marginTop: "0.5rem" }}>

      {/* 1 — Datos personales */}
      <Accordion icon="👤" title="Datos personales">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          <div><p style={fieldLabel}>Nombre</p><p style={fieldValue}>{profile.first_name || "—"}</p></div>
          <div><p style={fieldLabel}>Apellido</p><p style={fieldValue}>{profile.last_name || "—"}</p></div>
          <div><p style={fieldLabel}>Sexo</p><p style={fieldValue}>{profile.gender ? (genderLabel[profile.gender] ?? profile.gender) : "—"}</p></div>
          <div>
            <p style={fieldLabel}>Edad</p>
            <p style={fieldValue}>
              {age !== null ? `${age} años` : "—"}
              {profile.birth_date && <span style={{ color: "#444", fontSize: "0.78rem", marginLeft: "0.4rem" }}>({formatDate(profile.birth_date)})</span>}
            </p>
          </div>
          {profile.phone && <div><p style={fieldLabel}>Teléfono</p><p style={fieldValue}>{profile.phone}</p></div>}
          {profile.email && <div><p style={fieldLabel}>Email</p><p style={{ ...fieldValue, fontSize: "0.82rem" }}>{profile.email}</p></div>}
        </div>
      </Accordion>

      {/* 2 — Sede */}
      <Accordion icon="📍" title="Sede de entrenamiento">
        <RunnerVenuePicker runnerId={runnerId} venues={venues} currentVenueIds={currentVenueIds} />
      </Accordion>

      {/* 3 — Certificado médico */}
      <Accordion icon="📋" title="Certificado médico" badge={certBadge}>
        {!latestCert ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.625rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚠</span>
            <div>
              <p style={{ color: "#f87171", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>Sin certificado cargado</p>
              <p style={{ color: "#666", fontSize: "0.78rem", margin: "0.2rem 0 0 0" }}>El runner aún no subió su apto médico.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {certs.map((cert, idx) => {
              const status = certStatusInfo(cert.expires_at);
              return (
                <div key={cert.id} style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.875rem 1rem",
                  background: idx === 0 ? status.bg : "transparent",
                  border: `1px solid ${idx === 0 ? status.border : "#1e1e1e"}`,
                  borderRadius: "0.625rem", opacity: idx === 0 ? 1 : 0.5,
                }}>
                  <span style={{
                    width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0,
                    background: idx === 0 ? status.bg : "rgba(255,255,255,0.04)",
                    border: `1px solid ${idx === 0 ? status.border : "#222"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", color: idx === 0 ? status.color : "#444",
                  }}>{status.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: idx === 0 ? "white" : "#555", fontSize: "0.875rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cert.file_name}</p>
                    <p style={{ color: idx === 0 ? status.color : "#444", fontSize: "0.78rem", margin: "0.2rem 0 0 0", fontWeight: 600 }}>{status.label} — vence el {formatDate(cert.expires_at)}</p>
                  </div>
                  {cert.signedUrl && idx === 0 && (
                    <a href={cert.signedUrl} target="_blank" rel="noopener noreferrer" style={{
                      background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)",
                      borderRadius: "0.4rem", color: "#a3e635",
                      padding: "0.35rem 0.875rem", fontSize: "0.78rem",
                      fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                    }}>Ver PDF</a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Accordion>

      {/* 4 — Plan de pago */}
      <Accordion icon="💳" title="Plan de pago">
        <RunnerPaymentPanel
          runnerId={runnerId}
          initialPlanType={paymentPlan?.plan_type ?? "monthly"}
          initialNotes={paymentPlan?.notes ?? null}
          initialDiscountPct={paymentPlan?.discount_pct ?? 0}
          receipts={paymentReceipts}
          coachPricing={coachPricing}
        />
      </Accordion>

    </div>
  );
}
