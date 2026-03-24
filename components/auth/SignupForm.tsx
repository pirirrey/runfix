"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PLANS, PLAN_CONFIG, type PlanId } from "@/lib/plans";

const schema = z.object({
  full_name: z.string().min(2, "Ingresá tu nombre"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["coach", "runner"]),
});

type FormValues = z.infer<typeof schema>;

const roles = [
  {
    value: "runner" as const,
    label: "Runner",
    icon: "🏃",
    description: "Quiero ver mis planes de entrenamiento",
    accent: "#60a5fa",
    accentBg: "rgba(96,165,250,0.08)",
    accentBorder: "rgba(96,165,250,0.5)",
  },
  {
    value: "coach" as const,
    label: "Entrenador",
    icon: "🎯",
    description: "Quiero gestionar equipos y subir planes",
    accent: "#a3e635",
    accentBg: "rgba(163,230,53,0.08)",
    accentBorder: "rgba(163,230,53,0.5)",
  },
];

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("starter");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", role: "runner" },
  });

  const selectedRole = form.watch("role");
  const errors = form.formState.errors;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
        full_name: values.full_name,
        role: values.role,
        subscription_plan: values.role === "coach" ? selectedPlan : undefined,
      },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("¡Cuenta creada! Revisá tu email para confirmar.");
    router.push("/login");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "0.5rem",
    padding: "0.65rem 0.875rem",
    color: "white",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#aaa",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "0.4rem",
    letterSpacing: "0.02em",
  };

  const errorStyle: React.CSSProperties = {
    color: "#f87171",
    fontSize: "0.78rem",
    marginTop: "0.3rem",
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

      {/* Nombre */}
      <div>
        <label style={labelStyle}>Nombre completo</label>
        <input
          {...form.register("full_name")}
          placeholder="Juan Pérez"
          style={inputStyle}
        />
        {errors.full_name && <p style={errorStyle}>{errors.full_name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Email</label>
        <input
          {...form.register("email")}
          type="email"
          placeholder="tu@email.com"
          style={inputStyle}
        />
        {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
      </div>

      {/* Contraseña */}
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input
          {...form.register("password")}
          type="password"
          placeholder="••••••••"
          style={inputStyle}
        />
        {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
      </div>

      {/* Selector de rol */}
      <div>
        <label style={labelStyle}>Soy...</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.25rem" }}>
          {roles.map((role) => {
            const isSelected = selectedRole === role.value;
            return (
              <button
                key={role.value}
                type="button"
                onClick={() => form.setValue("role", role.value, { shouldValidate: true })}
                style={{
                  background: isSelected ? role.accentBg : "#1a1a1a",
                  border: `2px solid ${isSelected ? role.accentBorder : "#2a2a2a"}`,
                  borderRadius: "0.75rem",
                  padding: "1rem 0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{role.icon}</span>
                <span style={{ color: isSelected ? role.accent : "white", fontWeight: 700, fontSize: "0.9rem" }}>
                  {role.label}
                </span>
                <span style={{ color: isSelected ? role.accent : "#555", fontSize: "0.72rem", lineHeight: 1.4, fontWeight: 400 }}>
                  {role.description}
                </span>
                {isSelected && (
                  <span style={{ marginTop: "0.25rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", color: role.accent, fontWeight: 700 }}>
                    ✓ Seleccionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {errors.role && <p style={errorStyle}>{errors.role.message}</p>}
      </div>

      {/* Hint para runners */}
      {selectedRole === "runner" && (
        <div style={{
          background: "rgba(96,165,250,0.06)",
          border: "1px solid rgba(96,165,250,0.2)",
          borderRadius: "0.5rem",
          padding: "0.75rem 1rem",
          fontSize: "0.78rem",
          color: "#60a5fa",
          lineHeight: 1.5,
        }}>
          💡 Una vez registrado, podés asociarte a uno o más entrenadores desde el panel principal.
        </div>
      )}

      {/* Selector de plan — solo para coaches */}
      {selectedRole === "coach" && (
        <div>
          <label style={{ ...labelStyle, marginBottom: "0.6rem", display: "block" }}>
            Plan de suscripción
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {PLANS.map((plan) => {
              const cfg = PLAN_CONFIG[plan.id];
              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    background: isSelected ? cfg.bg : "#1a1a1a",
                    border: `1.5px solid ${isSelected ? cfg.color : "#2a2a2a"}`,
                    borderRadius: "0.625rem",
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Radio visual */}
                  <span style={{
                    width: "1rem", height: "1rem", borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? cfg.color : "#333"}`,
                    background: isSelected ? cfg.color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <span style={{ width: "0.35rem", height: "0.35rem", borderRadius: "50%", background: "#000", display: "block" }} />}
                  </span>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: isSelected ? cfg.color : "white", fontWeight: 700, fontSize: "0.88rem" }}>
                        {plan.name}
                      </span>
                      {plan.badge && (
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
                    <span style={{ color: "#555", fontSize: "0.72rem" }}>{plan.limits}</span>
                  </div>
                  {/* Precio */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ color: isSelected ? cfg.color : "#666", fontWeight: 800, fontSize: "0.9rem" }}>
                      {plan.price}
                    </span>
                    {plan.priceNote !== "sin límite de tiempo" && (
                      <p style={{ color: "#444", fontSize: "0.62rem", margin: 0 }}>{plan.priceNote}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <p style={{ color: "#444", fontSize: "0.72rem", marginTop: "0.5rem" }}>
            Podés cambiar el plan en cualquier momento desde tu perfil.
          </p>
        </div>
      )}

      {/* Botón submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "0.25rem",
          width: "100%",
          background: loading ? "#333" : "#a3e635",
          color: loading ? "#666" : "#000",
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          letterSpacing: "0.01em",
        }}
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
