"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { CoachPlanConfig } from "@/components/coach/CoachPlanConfig";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  team_name: string | null;
  team_logo_path: string | null;
  team_description: string | null;
  team_location: string | null;
  logoUrl: string | null;
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.65rem 0.875rem", color: "white", fontSize: "0.875rem",
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: "0.75rem", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.07em",
};

export function CoachSettingsClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [form, setForm] = useState({
    team_name:        profile.team_name ?? "",
    team_description: profile.team_description ?? "",
    team_location:    profile.team_location ?? "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(profile.logoUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() ?? "png";
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
    <div style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link
          href="/coach/home"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "2rem", height: "2rem", borderRadius: "0.5rem",
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            color: "#aaa", fontSize: "1rem", textDecoration: "none",
            flexShrink: 0,
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

      {/* Form card */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "1rem", overflow: "hidden" }}>

        {/* Logo section */}
        <div style={{ padding: "1.75rem", borderBottom: "1px solid #1e1e1e" }}>
          <p style={{ color: "#aaa", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem 0" }}>
            Logo del team
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Logo preview */}
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
              type="file"
              accept="image/*"
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

        {/* Text fields */}
        <form onSubmit={save} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" }}>
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
            <Link
              href="/coach/home"
              style={{
                color: "#555", fontSize: "0.85rem", textDecoration: "none",
              }}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>

      {/* Planes de pago */}
      <CoachPlanConfig />

    </div>
  );
}
