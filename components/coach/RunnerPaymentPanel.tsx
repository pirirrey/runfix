"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";

type PlanType = "monthly" | "annual" | "exempt";
type Method = "transfer" | "cash" | "other";

type Receipt = {
  id: string;
  payment_month: string;
  payment_date: string;
  method: Method;
  storage_path: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
};

interface Props {
  runnerId: string;
  initialPlanType: PlanType;
  initialAmount: number | null;
  initialNotes: string | null;
  receipts: Receipt[];
}

const planOptions: { value: PlanType; label: string; icon: string }[] = [
  { value: "monthly", label: "Mensual",  icon: "📅" },
  { value: "annual",  label: "Anual",    icon: "🗓" },
  { value: "exempt",  label: "Exento",   icon: "✅" },
];

const methodLabel: Record<Method, string> = {
  transfer: "Transferencia",
  cash:     "Efectivo",
  other:    "Otro",
};
const methodIcon: Record<Method, string> = {
  transfer: "🏦",
  cash:     "💵",
  other:    "📄",
};

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function RunnerPaymentPanel({ runnerId, initialPlanType, initialAmount, initialNotes, receipts }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [planType, setPlanType] = useState<PlanType>(initialPlanType);
  const [amount, setAmount] = useState(initialAmount?.toString() ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function savePlan() {
    setSaving(true);
    const res = await fetch(`/api/coach/runners/${runnerId}/payment-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_type: planType,
        amount: amount ? parseFloat(amount) : null,
        notes: notes.trim() || null,
      }),
    });
    if (res.ok) {
      toast.success("Plan de pago actualizado");
      setDirty(false);
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  async function getSignedUrl(path: string) {
    const { data } = await supabase.storage.from("training-plans").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <section style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: "0.875rem", padding: "1.5rem", marginTop: "1.25rem",
    }}>
      <p style={{ color: "#444", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>
        Plan de pago
      </p>

      {/* Selector de tipo */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {planOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setPlanType(opt.value); setDirty(true); }}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
              cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
              background: planType === opt.value ? "rgba(163,230,53,0.1)" : "#1a1a1a",
              border: `1px solid ${planType === opt.value ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
              color: planType === opt.value ? "#a3e635" : "#555",
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "block", fontSize: "1.1rem", marginBottom: "0.2rem" }}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Monto (no aplica para exento) */}
      {planType !== "exempt" && (
        <div style={{ marginBottom: "0.875rem" }}>
          <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
            Monto (opcional)
          </label>
          <div style={{ position: "relative", maxWidth: "12rem" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: "0.9rem" }}>$</span>
            <input
              type="number" min="0" step="0.01" value={amount}
              onChange={(e) => { setAmount(e.target.value); setDirty(true); }}
              placeholder="0"
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.5rem 0.75rem 0.5rem 1.75rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
      )}

      {/* Notas */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
          Notas (opcional)
        </label>
        <input
          type="text" value={notes} placeholder="Ej: Pago el 1er día hábil de cada mes"
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.5rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Guardar */}
      {dirty && (
        <button
          onClick={savePlan} disabled={saving}
          style={{ background: saving ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.45rem", color: saving ? "#444" : "#000", padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", marginBottom: "1.25rem" }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      )}

      {/* Comprobantes */}
      <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "1.25rem", marginTop: dirty ? 0 : "0.25rem" }}>
        <p style={{ color: "#444", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>
          Comprobantes recibidos
        </p>

        {receipts.length === 0 ? (
          <p style={{ color: "#444", fontSize: "0.82rem" }}>
            {planType === "exempt" ? "Exento de pago, no requiere comprobantes." : "Aún no hay comprobantes registrados."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {receipts.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "0.5rem" }}>
                {/* Estado */}
                <span style={{ width: "1.75rem", height: "1.75rem", borderRadius: "50%", background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)", color: "#a3e635", fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
                    {formatMonth(r.payment_month)}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#666", fontSize: "0.72rem" }}>Pagado el {formatDate(r.payment_date)}</span>
                    <span style={{ color: "#444", fontSize: "0.72rem" }}>·</span>
                    <span style={{ color: "#666", fontSize: "0.72rem" }}>{methodIcon[r.method]} {methodLabel[r.method]}</span>
                    {r.notes && <><span style={{ color: "#444", fontSize: "0.72rem" }}>·</span><span style={{ color: "#555", fontSize: "0.72rem" }}>{r.notes}</span></>}
                  </div>
                </div>

                {/* Ver archivo */}
                {r.storage_path && (
                  <button
                    onClick={() => getSignedUrl(r.storage_path!)}
                    style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.4rem", color: "#a3e635", fontSize: "0.75rem", fontWeight: 600, padding: "0.3rem 0.75rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Ver PDF
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
