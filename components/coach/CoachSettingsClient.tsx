"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { CoachPlanConfig } from "@/components/coach/CoachPlanConfig";
import { PLANS, PLAN_CONFIG, PLAN_LIMITS, type PlanId } from "@/lib/plans";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  subscription_plan: string;
  team_name: string | null;
  team_logo_path: string | null;
  team_description: string | null;
  team_location: string | null;
  logoUrl: string | null;
};

interface Props {
  profile: Profile;
}

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.65rem 0.875rem", color: "white", fontSize: "0.875rem",
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: "0.75rem", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.07em",
};

/* ── Acordeón ────────────────────────────────────────────── */
function AccordionSection({
  id, title, subtitle, icon, open, onToggle, children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: "1rem", overflow: "hidden",
    }}>
      {/* Header clickeable */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`accordion-${id}`}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "1rem",
          padding: "1.25rem 1.75rem",
          background: "transparent", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.15rem", flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>
              {title}
            </p>
            {subtitle && (
              <p style={{ color: "#555", fontSize: "0.78rem", margin: "0.15rem 0 0 0" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {/* Chevron */}
        <span style={{
          color: open ? "#a3e635" : "#444",
          fontSize: "1rem",
          transition: "transform 0.25s ease, color 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
          flexShrink: 0,
        }}>
          ▾
        </span>
      </button>

      {/* Contenido expandible */}
      <div
        id={`accordion-${id}`}
        style={{
          maxHeight: open ? "3000px" : "0",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div style={{ borderTop: "1px solid #1e1e1e" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────── */
export function CoachSettingsClient({ profile }: Props) {
  const router  = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Acordeón — sección abierta por defecto: "general"
  const [open, setOpen] = useState<Record<string, boolean>>({
    general: false,
    plans: false,
    subscription: false,
  });
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  // Plan de suscripción
  const [currentPlan, setCurrentPlan] = useState<PlanId>((profile.subscription_plan as PlanId) ?? "starter");
  const [savingPlan, setSavingPlan] = useState(false);
  const [usage, setUsage] = useState<{ runnerCount: number; teamCount: number; venueCount: number } | null>(null);
  const [upgradePending, setUpgradePending] = useState<PlanId | null>(null);

  useEffect(() => {
    fetch("/api/coach/usage")
      .then(r => r.json())
      .then(d => setUsage(d));
  }, []);

  /** Devuelve el motivo por el que NO se puede bajar a ese plan, o null si está ok */
  function downgradeBlockReason(planId: PlanId): string | null {
    if (!usage) return null;
    const planOrder: PlanId[] = ["starter", "pro", "elite"];
    const currentIdx = planOrder.indexOf(currentPlan);
    const targetIdx  = planOrder.indexOf(planId);
    if (targetIdx >= currentIdx) return null; // upgrade o mismo plan: siempre ok

    const limits = PLAN_LIMITS[planId];
    const reasons: string[] = [];
    if (limits.maxRunners !== null && usage.runnerCount > limits.maxRunners) {
      reasons.push(`tenés ${usage.runnerCount} runners (el plan permite hasta ${limits.maxRunners})`);
    }
    if (limits.maxTeams !== null && usage.teamCount > limits.maxTeams) {
      reasons.push(`tenés ${usage.teamCount} equipos (el plan permite hasta ${limits.maxTeams})`);
    }
    if (limits.maxVenues !== null && usage.venueCount > limits.maxVenues) {
      reasons.push(`tenés ${usage.venueCount} sedes (el plan permite hasta ${limits.maxVenues})`);
    }
    return reasons.length > 0 ? reasons.join(" y ") : null;
  }

  /** Abre el modal de confirmación de upgrade */
  function requestPlanChange(planId: PlanId) {
    if (planId === currentPlan) return;
    const blockReason = downgradeBlockReason(planId);
    if (blockReason) return;
    setUpgradePending(planId);
  }

  /** Ejecuta el cambio de plan (llamado al confirmar el modal) */
  async function confirmPlanChange() {
    if (!upgradePending) return;
    setSavingPlan(true);
    const res = await fetch("/api/coach/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_plan: upgradePending }),
    });
    if (res.ok) {
      setCurrentPlan(upgradePending);
      toast.success("Plan actualizado");
      router.refresh();
    } else {
      toast.error("Error al cambiar el plan");
    }
    setUpgradePending(null);
    setSavingPlan(false);
  }

  // Formulario datos del team
  const [form, setForm] = useState({
    team_name:        profile.team_name ?? "",
    team_description: profile.team_description ?? "",
    team_location:    profile.team_location ?? "",
  });
  const [logoUrl, setLogoUrl]             = useState<string | null>(profile.logoUrl);
  const [saving, setSaving]               = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const ext  = file.name.split(".").pop() ?? "png";
    const path = `team-logos/${profile.id}/logo.${ext}`;
    const { error } = await supabase.storage
      .from("training-plans")
      .upload(path, file, { upsert: true });

    if (error) { toast.error("Error al subir logo"); setUploadingLogo(false); return; }

    await fetch("/api/coach/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_logo_path: path }),
    });

    const { data: signed } = await supabase.storage
      .from("training-plans")
      .createSignedUrl(path, 3600);
    setLogoUrl(signed?.signedUrl ?? null);
    toast.success("Logo actualizado");
    setUploadingLogo(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/coach/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_name:        form.team_name || null,
        team_description: form.team_description || null,
        team_location:    form.team_location || null,
      }),
    });
    if (res.ok) {
      toast.success("Perfil del team actualizado");
      router.refresh();
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  return (
    <>
    <div style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>

      {/* Header de página */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link
          href="/coach/home"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "2rem", height: "2rem", borderRadius: "0.5rem",
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            color: "#aaa", fontSize: "1rem", textDecoration: "none", flexShrink: 0,
          }}
          title="Volver al inicio"
        >
          ←
        </Link>
        <div>
          <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
            Perfil del Running Team
          </h1>
          <p style={{ color: "#555", fontSize: "0.8rem", margin: "0.2rem 0 0 0" }}>
            Esta información es visible para tus runners
          </p>
        </div>
      </div>

      {/* Acordeón */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

        {/* ── 1. Datos generales ── */}
        <AccordionSection
          id="general"
          icon="🏃"
          title="Datos del team"
          subtitle="Nombre, logo, localidad y descripción"
          open={open.general}
          onToggle={() => toggle("general")}
        >
          {/* Logo */}
          <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid #1a1a1a" }}>
            <p style={{ color: "#aaa", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem 0" }}>
              Logo del team
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div
                onClick={() => logoInputRef.current?.click()}
                style={{
                  width: "5rem", height: "5rem", borderRadius: "0.75rem", flexShrink: 0,
                  border: logoUrl ? "2px solid rgba(163,230,53,0.3)" : "2px dashed #333",
                  background: logoUrl ? "transparent" : "#1a1a1a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", position: "relative",
                }}
                title="Clic para cambiar el logo"
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.2rem" }}>🏃</div>
                    <span style={{ color: "#555", fontSize: "0.6rem" }}>
                      {uploadingLogo ? "Subiendo…" : "Subir logo"}
                    </span>
                  </div>
                )}
                {uploadingLogo && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#a3e635", fontSize: "0.75rem", fontWeight: 700 }}>…</span>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file" accept="image/*"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
              <div>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  background: "#1e1e1e", border: "1px dashed #333", borderRadius: "0.5rem",
                  padding: "0.6rem 1rem", cursor: "pointer",
                  color: "#888", fontSize: "0.82rem", fontWeight: 600, position: "relative",
                }}>
                  {uploadingLogo ? "Subiendo…" : logoUrl ? "🖼 Cambiar logo" : "🖼 Subir logo"}
                  <input
                    type="file" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                    disabled={uploadingLogo}
                  />
                </label>
                <p style={{ color: "#555", fontSize: "0.73rem", margin: "0.5rem 0 0 0" }}>
                  PNG, JPG, SVG — recomendado cuadrado
                </p>
              </div>
            </div>
          </div>

          {/* Campos de texto */}
          <form onSubmit={save} style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Nombre del team</label>
              <input
                style={inputStyle}
                value={form.team_name}
                onChange={e => set("team_name", e.target.value)}
                placeholder="Ej: Patagonia Running Club"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Localidad / Sede</label>
              <input
                style={inputStyle}
                value={form.team_location}
                onChange={e => set("team_location", e.target.value)}
                placeholder="Ej: Bariloche, Río Negro"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={labelStyle}>Descripción del team</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }}
                rows={4}
                value={form.team_description}
                onChange={e => set("team_description", e.target.value)}
                placeholder="Contá quiénes son, su filosofía de entrenamiento, logros…"
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? "#1a2a0a" : "#a3e635",
                  color: saving ? "#666" : "#000",
                  border: "none", borderRadius: "0.5rem",
                  padding: "0.7rem 1.75rem",
                  fontWeight: 700, fontSize: "0.9rem",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </AccordionSection>

        {/* ── 2. Planes de pago ── */}
        <AccordionSection
          id="plans"
          icon="💳"
          title="Planes de pago"
          subtitle="Tarifas mensuales, anuales y runners exentos"
          open={open.plans}
          onToggle={() => toggle("plans")}
        >
          <CoachPlanConfig noCard />
        </AccordionSection>

        {/* ── 4. Suscripción Runfix ── */}
        <AccordionSection
          id="subscription"
          icon="⭐"
          title="Plan Runfix"
          subtitle={`Plan actual: ${PLANS.find(p => p.id === currentPlan)?.name ?? "Starter"}`}
          open={open.subscription}
          onToggle={() => toggle("subscription")}
        >
          <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {PLANS.map((plan) => {
              const cfg        = PLAN_CONFIG[plan.id];
              const isSelected = currentPlan === plan.id;
              const blockReason = downgradeBlockReason(plan.id);
              const isBlocked  = !!blockReason;
              const isDisabled = savingPlan || isBlocked;

              return (
                <div key={plan.id} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isBlocked && requestPlanChange(plan.id)}
                    style={{
                      background: isBlocked ? "#111" : isSelected ? cfg.bg : "#1a1a1a",
                      border: `1.5px solid ${isBlocked ? "#1e1e1e" : isSelected ? cfg.color : "#2a2a2a"}`,
                      borderRadius: blockReason ? "0.75rem 0.75rem 0.35rem 0.35rem" : "0.75rem",
                      padding: "1rem 1.25rem",
                      cursor: isBlocked ? "not-allowed" : savingPlan ? "not-allowed" : "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                      transition: "all 0.15s",
                      opacity: isBlocked ? 0.45 : (savingPlan && !isSelected ? 0.5 : 1),
                      width: "100%",
                    }}
                  >
                    {/* Radio o candado */}
                    {isBlocked ? (
                      <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "0.05rem" }}>🔒</span>
                    ) : (
                      <span style={{
                        width: "1rem", height: "1rem", borderRadius: "50%", flexShrink: 0, marginTop: "0.1rem",
                        border: `2px solid ${isSelected ? cfg.color : "#333"}`,
                        background: isSelected ? cfg.color : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <span style={{ width: "0.35rem", height: "0.35rem", borderRadius: "50%", background: "#000", display: "block" }} />}
                      </span>
                    )}
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ color: isBlocked ? "#444" : isSelected ? cfg.color : "white", fontWeight: 700, fontSize: "0.9rem" }}>
                          {plan.name}
                        </span>
                        {plan.badge && !isBlocked && (
                          <span style={{
                            background: cfg.bg, border: `1px solid ${cfg.color}`,
                            color: cfg.color, borderRadius: "2rem",
                            fontSize: "0.6rem", fontWeight: 700,
                            padding: "0.05rem 0.45rem",
                            textTransform: "uppercase" as const,
                          }}>
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p style={{ color: isBlocked ? "#333" : "#555", fontSize: "0.75rem", margin: 0 }}>{plan.limits}</p>
                      <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap" as const, gap: "0.3rem" }}>
                        {plan.features.filter(f => !f.disabled).map(f => (
                          <span key={f.label} style={{
                            background: isBlocked ? "#1a1a1a" : isSelected ? cfg.bg : "#222",
                            border: `1px solid ${isBlocked ? "#222" : isSelected ? cfg.border : "#2a2a2a"}`,
                            color: isBlocked ? "#333" : isSelected ? cfg.color : "#555",
                            borderRadius: "2rem", fontSize: "0.65rem",
                            padding: "0.1rem 0.5rem",
                          }}>
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Precio */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ color: isBlocked ? "#333" : isSelected ? cfg.color : "#888", fontWeight: 800, fontSize: "1rem" }}>
                        {plan.price}
                      </span>
                      {plan.priceNote !== "sin límite de tiempo" && (
                        <p style={{ color: isBlocked ? "#2a2a2a" : "#444", fontSize: "0.65rem", margin: 0 }}>{plan.priceNote}</p>
                      )}
                    </div>
                  </button>

                  {/* Mensaje amigable de bloqueo */}
                  {isBlocked && (
                    <div style={{
                      background: "rgba(251,191,36,0.04)",
                      border: "1px solid rgba(251,191,36,0.15)",
                      borderTop: "none",
                      borderRadius: "0 0 0.75rem 0.75rem",
                      padding: "0.6rem 1rem",
                      display: "flex", alignItems: "flex-start", gap: "0.5rem",
                    }}>
                      <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>💡</span>
                      <p style={{ color: "#7a6a3a", fontSize: "0.73rem", margin: 0, lineHeight: 1.5 }}>
                        Para cambiar a este plan, {blockReason}. Podés archivar runners o equipos desde sus respectivas secciones.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            <p style={{ color: "#444", fontSize: "0.73rem", marginTop: "0.25rem" }}>
              Los cambios de plan se aplican de inmediato.{usage && (
                <span style={{ color: "#333" }}> · Uso actual: {usage.venueCount} sede{usage.venueCount !== 1 ? "s" : ""}, {usage.teamCount} equipo{usage.teamCount !== 1 ? "s" : ""}, {usage.runnerCount} runner{usage.runnerCount !== 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
        </AccordionSection>

      </div>
    </div>

    {/* ── Modal de confirmación de cambio de plan ── */}
    {upgradePending && (() => {
      const plan    = PLANS.find(p => p.id === upgradePending)!;
      const cfg     = PLAN_CONFIG[upgradePending];
      const limits  = PLAN_LIMITS[upgradePending];
      const planOrder: PlanId[] = ["starter", "pro", "elite"];
      const isUpgrade = planOrder.indexOf(upgradePending) > planOrder.indexOf(currentPlan);

      const limitLines = [
        limits.maxVenues   !== null ? `${limits.maxVenues} sede${limits.maxVenues !== 1 ? "s" : ""}` : "Sedes ilimitadas",
        limits.maxTeams    !== null ? `${limits.maxTeams} equipo${limits.maxTeams !== 1 ? "s" : ""}` : "Equipos ilimitados",
        limits.maxRunners  !== null ? `Hasta ${limits.maxRunners} runners` : "Runners ilimitados",
      ];

      return (
        <div
          onClick={() => !savingPlan && setUpgradePending(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#141414",
              border: `1px solid ${cfg.border}`,
              borderRadius: "1rem",
              padding: "1.75rem 2rem",
              width: "100%", maxWidth: "26rem",
              display: "flex", flexDirection: "column", gap: "1.25rem",
              boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
            }}
          >
            {/* Header */}
            <div>
              <p style={{ color: cfg.color, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.4rem 0" }}>
                {isUpgrade ? "Confirmar upgrade de plan" : "Confirmar cambio de plan"}
              </p>
              <h3 style={{ color: "white", fontSize: "1.2rem", fontWeight: 800, margin: 0 }}>
                ⭐ Plan {plan.name}
              </h3>
            </div>

            {/* Límites */}
            <div style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              display: "flex", flexDirection: "column", gap: "0.5rem",
            }}>
              <p style={{ color: "#888", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Nuevos límites incluidos
              </p>
              {limitLines.map(line => (
                <div key={line} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: cfg.color, fontSize: "0.75rem", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#ccc", fontSize: "0.85rem" }}>{line}</span>
                </div>
              ))}
              {plan.features.filter(f => !f.disabled).slice(3).map(f => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: cfg.color, fontSize: "0.75rem", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#ccc", fontSize: "0.85rem" }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Precio */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ color: cfg.color, fontSize: "1.6rem", fontWeight: 900 }}>{plan.price}</span>
              {plan.priceNote !== "sin límite de tiempo" && (
                <span style={{ color: "#555", fontSize: "0.8rem" }}>{plan.priceNote}</span>
              )}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={() => setUpgradePending(null)}
                disabled={savingPlan}
                style={{
                  flex: 1, background: "transparent", border: "1px solid #2a2a2a",
                  borderRadius: "0.5rem", color: "#666",
                  padding: "0.65rem", fontSize: "0.85rem", fontWeight: 600,
                  cursor: savingPlan ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={savingPlan}
                style={{
                  flex: 1, background: cfg.color,
                  border: "none", borderRadius: "0.5rem",
                  color: upgradePending === "starter" ? "#fff" : "#000",
                  padding: "0.65rem", fontSize: "0.85rem", fontWeight: 700,
                  cursor: savingPlan ? "not-allowed" : "pointer",
                  opacity: savingPlan ? 0.6 : 1,
                }}
              >
                {savingPlan ? "Cambiando…" : `Cambiar a ${plan.name}`}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
