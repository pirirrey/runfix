"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    full_name: z.string().min(2, "Ingresá tu nombre"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["coach", "runner"]),
    invite_code: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "runner" && !data.invite_code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El código de invitación es obligatorio",
        path: ["invite_code"],
      });
    }
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "", role: "runner", invite_code: "" },
  });

  const selectedRole = form.watch("role");
  const errors = form.formState.errors;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();

    // Si es runner, validar el código ANTES de crear la cuenta
    if (values.role === "runner" && values.invite_code) {
      const res = await fetch(
        `/api/teams/validate-code?code=${encodeURIComponent(values.invite_code.toUpperCase())}`
      );
      const result = await res.json();
      if (!result.valid) {
        form.setError("invite_code", { message: "Código de invitación inválido" });
        setLoading(false);
        return;
      }
    }

    // Crear la cuenta
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          role: values.role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Si es runner y tenemos sesión inmediata (sin confirmación de email), unirse al equipo
    if (values.role === "runner" && values.invite_code && data.session) {
      const joinRes = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: values.invite_code.toUpperCase() }),
      });

      if (joinRes.ok) {
        toast.success("¡Cuenta creada! Ya estás en el equipo 🎉");
        router.push("/dashboard");
        return;
      }
    }

    // Sin sesión inmediata (requiere confirmación de email)
    if (values.role === "runner") {
      toast.success(
        `Revisá tu email para confirmar tu cuenta. Luego ingresá con el código ${values.invite_code?.toUpperCase()} para unirte al equipo.`
      );
    } else {
      toast.success("Revisá tu email para confirmar tu cuenta");
    }
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
                <span style={{
                  color: isSelected ? role.accent : "white",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}>
                  {role.label}
                </span>
                <span style={{
                  color: isSelected ? role.accent : "#555",
                  fontSize: "0.72rem",
                  lineHeight: 1.4,
                  fontWeight: 400,
                }}>
                  {role.description}
                </span>
                {isSelected && (
                  <span style={{
                    marginTop: "0.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.7rem",
                    color: role.accent,
                    fontWeight: 700,
                  }}>
                    ✓ Seleccionado
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {errors.role && <p style={errorStyle}>{errors.role.message}</p>}
      </div>

      {/* Código de invitación — solo para runners */}
      {selectedRole === "runner" && (
        <div>
          <label style={labelStyle}>Código de invitación</label>
          <input
            {...form.register("invite_code")}
            placeholder="Ej: A1B2C3D4"
            maxLength={8}
            style={{
              ...inputStyle,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
              border: errors.invite_code ? "1px solid #f87171" : "1px solid #2a2a2a",
            }}
            onChange={(e) => {
              form.setValue("invite_code", e.target.value.toUpperCase(), { shouldValidate: true });
            }}
          />
          <p style={{ color: "#555", fontSize: "0.75rem", marginTop: "0.35rem" }}>
            Tu entrenador te tiene que compartir este código
          </p>
          {errors.invite_code && <p style={errorStyle}>{errors.invite_code.message}</p>}
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
