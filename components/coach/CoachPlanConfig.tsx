"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type PlanConfig = {
  plan_monthly_price:   number | null;
  plan_monthly_due_day: number | null;
  plan_annual_price:    number | null;
};

const sectionLabel: React.CSSProperties = {
  color: "#666", fontSize: "0.67rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.1em", margin: 0,
};

const fieldLabel: React.CSSProperties = {
  display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem",
};

const inputBase: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.6rem 0.875rem", color: "white", fontSize: "0.9rem",
  outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};

const hint: React.CSSProperties = {
  color: "#444", fontSize: "0.7rem", marginTop: "0.3rem",
};

export function CoachPlanConfig() {
  const [config, setConfig] = useState<PlanConfig>({
    plan_monthly_price:   null,
    plan_monthly_due_day: null,
    plan_annual_price:    null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/coach/profile/plans")
      .then((r) => r.json())
      .then((d: PlanConfig) => { setConfig(d); setLoading(false); });
  }, []);

  function setField(key: keyof PlanConfig, raw: string) {
    const val = raw === "" ? null : parseFloat(raw);
    setConfig((c) => ({ ...c, [key]: isNaN(val as number) ? null : val }));
    setDirty(true);
  }

  function setDayField(raw: string) {
    const val = raw === "" ? null : parseInt(raw, 10);
    setConfig((c) => ({ ...c, plan_monthly_due_day: isNaN(val as number) ? null : val }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/coach/profile/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      toast.success("Configuración de planes guardada");
      setDirty(false);
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  if (loading) return (
    <div style={{ padding: "1.5rem", textAlign: "center" }}>
      <span style={{ color: "#444", fontSize: "0.85rem" }}>Cargando...</span>
    </div>
  );

  const monthlyPrice   = config.plan_monthly_price   !== null ? String(config.plan_monthly_price)   : "";
  const monthlyDueDay  = config.plan_monthly_due_day !== null ? String(config.plan_monthly_due_day)  : "";
  const annualPrice    = config.plan_annual_price    !== null ? String(config.plan_annual_price)    : "";

  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: "1rem", overflow: "hidden", marginTop: "1.5rem",
    }}>

      {/* Header */}
      <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #1a1a1a" }}>
        <p style={{ color: "white", fontWeight: 700, fontSize: "0.975rem", margin: 0 }}>
          Planes de pago
        </p>
        <p style={{ color: "#555", fontSize: "0.78rem", margin: "0.25rem 0 0 0" }}>
          Configurá las tarifas que aplican a tus runners. Podés actualizarlas cuando tengas ajuste de precios.
        </p>
      </div>

      {/* Plan mensual */}
      <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.1rem" }}>
          <span style={{ fontSize: "1rem" }}>📅</span>
          <p style={sectionLabel}>Plan mensual</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Precio mensual */}
          <div>
            <label style={fieldLabel}>Precio mensual</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: "0.9rem", pointerEvents: "none" }}>$</span>
              <input
                type="number" min="0" step="0.01"
                value={monthlyPrice}
                onChange={(e) => setField("plan_monthly_price", e.target.value)}
                placeholder="0.00"
                style={{ ...inputBase, paddingLeft: "1.75rem" }}
              />
            </div>
          </div>

          {/* Día de vencimiento */}
          <div>
            <label style={fieldLabel}>Día de vencimiento</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <select
                value={monthlyDueDay}
                onChange={(e) => setDayField(e.target.value)}
                style={{ ...inputBase, width: "5rem", cursor: "pointer", flexShrink: 0 }}
              >
                <option value="">—</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <span style={{ color: "#555", fontSize: "0.85rem", whiteSpace: "nowrap" }}>de cada mes</span>
            </div>
            <p style={hint}>Ej: día 5 → vence el 5 de cada mes</p>
          </div>

        </div>
      </div>

      {/* Plan anual */}
      <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.1rem" }}>
          <span style={{ fontSize: "1rem" }}>🗓</span>
          <p style={sectionLabel}>Plan anual</p>
        </div>

        <div style={{ maxWidth: "13rem" }}>
          <label style={fieldLabel}>Precio anual</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: "0.9rem", pointerEvents: "none" }}>$</span>
            <input
              type="number" min="0" step="0.01"
              value={annualPrice}
              onChange={(e) => setField("plan_annual_price", e.target.value)}
              placeholder="0.00"
              style={{ ...inputBase, paddingLeft: "1.75rem" }}
            />
          </div>
          {config.plan_monthly_price && config.plan_annual_price && config.plan_annual_price < config.plan_monthly_price * 12 && (
            <p style={{ color: "#a3e635", fontSize: "0.7rem", marginTop: "0.4rem", fontWeight: 600 }}>
              🎁 {Math.round((1 - config.plan_annual_price / (config.plan_monthly_price * 12)) * 100)}% de descuento respecto al mensual
            </p>
          )}
        </div>
      </div>

      {/* Plan exento */}
      <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1rem" }}>✅</span>
          <p style={sectionLabel}>Exento de pago</p>
        </div>
        <p style={{ color: "#444", fontSize: "0.82rem", margin: 0 }}>
          Runners exentos no generan obligación de pago. No requiere configuración adicional.
        </p>
      </div>

      {/* Guardar */}
      <div style={{ padding: "1.25rem 1.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            background: (saving || !dirty) ? "#1a1a1a" : "#a3e635",
            border: "none", borderRadius: "0.5rem",
            color: (saving || !dirty) ? "#444" : "#000",
            padding: "0.65rem 1.75rem", fontSize: "0.875rem",
            fontWeight: 700, cursor: (saving || !dirty) ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {!dirty && !saving && (
          <span style={{ color: "#333", fontSize: "0.78rem" }}>Sin cambios pendientes</span>
        )}
        {dirty && !saving && (
          <span style={{ color: "#fbbf24", fontSize: "0.78rem" }}>● Tenés cambios sin guardar</span>
        )}
      </div>

    </div>
  );
}
