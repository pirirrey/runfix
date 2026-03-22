"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

type Profile = {
  first_name: string | null; last_name: string | null;
  gender: string | null; birth_date: string | null; phone: string | null;
  address_street: string | null; address_number: string | null;
  address_floor: string | null; address_apt: string | null;
  address_postal: string | null; address_city: string | null;
};

type Cert = {
  id: string; file_name: string; storage_path: string;
  expires_at: string; uploaded_at: string; signedUrl?: string;
};

function certStatus(expiresAt: string): "ok" | "warning" | "expired" {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(expiresAt + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "warning";
  return "ok";
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: "0.5rem", padding: "0.6rem 0.875rem", color: "white",
  fontSize: "0.875rem", outline: "none", boxSizing: "border-box", colorScheme: "dark" as React.CSSProperties["colorScheme"],
};
const labelStyle: React.CSSProperties = {
  display: "block", color: "#888", fontSize: "0.72rem", fontWeight: 700,
  marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em",
};
const sectionTitle: React.CSSProperties = {
  color: "white", fontSize: "1rem", fontWeight: 800, marginBottom: "1.25rem",
  paddingBottom: "0.75rem", borderBottom: "1px solid #1e1e1e",
};

export default function RunnerProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<Profile>({
    first_name: "", last_name: "", gender: "", birth_date: "", phone: "",
    address_street: "", address_number: "", address_floor: "", address_apt: "",
    address_postal: "", address_city: "",
  });
  const [saving, setSaving] = useState(false);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certExpiry, setCertExpiry] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const [deletingCert, setDeletingCert] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("first_name,last_name,gender,birth_date,phone,address_street,address_number,address_floor,address_apt,address_postal,address_city")
      .eq("id", user.id)
      .single();
    if (prof) setProfile(prof as Profile);

    const { data: certData } = await supabase
      .from("medical_certificates")
      .select("id,file_name,storage_path,expires_at,uploaded_at")
      .eq("runner_id", user.id)
      .order("expires_at", { ascending: true });

    if (certData) {
      const withUrls = await Promise.all(certData.map(async (c) => {
        const { data } = await supabase.storage.from("training-plans").createSignedUrl(c.storage_path, 3600);
        return { ...c, signedUrl: data?.signedUrl ?? undefined };
      }));
      setCerts(withUrls);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/runner/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (res.ok) toast.success("Perfil guardado ✓");
    else toast.error("Error al guardar");
    setSaving(false);
  }

  async function handleUploadCert(e: React.FormEvent) {
    e.preventDefault();
    if (!certFile || !certExpiry) { toast.error("Seleccioná un archivo y la fecha de vencimiento"); return; }
    setUploadingCert(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const timestamp = Date.now();
    const storagePath = `runner-certs/${user.id}/${timestamp}_${certFile.name.replace(/\s+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("training-plans")
      .upload(storagePath, certFile, { upsert: false });
    if (upErr) { toast.error("Error al subir el archivo"); setUploadingCert(false); return; }

    const res = await fetch("/api/runner/certificates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: certFile.name, storage_path: storagePath, expires_at: certExpiry }),
    });
    if (res.ok) {
      toast.success("Certificado cargado ✓");
      setCertFile(null); setCertExpiry("");
      (document.getElementById("cert-file-input") as HTMLInputElement).value = "";
      await load();
    } else {
      toast.error("Error al registrar el certificado");
    }
    setUploadingCert(false);
  }

  async function handleDeleteCert(certId: string) {
    if (!confirm("¿Eliminar este certificado?")) return;
    setDeletingCert(certId);
    const res = await fetch(`/api/runner/certificates/${certId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Certificado eliminado"); await load(); }
    else toast.error("Error al eliminar");
    setDeletingCert(null);
  }

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile((p) => ({ ...p, [key]: e.target.value }));

  if (loading) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>Cargando...</div>
  );

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "white", margin: 0 }}>👤 Mi Perfil</h1>
        <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.35rem" }}>Tus datos personales y documentación médica.</p>
      </div>

      {/* ── DATOS PERSONALES ── */}
      <form onSubmit={handleSaveProfile} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "1.75rem", marginBottom: "1.5rem" }}>
        <p style={sectionTitle}>Datos personales</p>

        {/* Nombre y apellido */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input value={profile.first_name ?? ""} onChange={set("first_name")} placeholder="Juan" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Apellido</label>
            <input value={profile.last_name ?? ""} onChange={set("last_name")} placeholder="Pérez" style={inputStyle} />
          </div>
        </div>

        {/* Sexo y fecha de nac */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Sexo</label>
            <select value={profile.gender ?? ""} onChange={set("gender")} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Seleccionar —</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fecha de nacimiento</label>
            <input type="date" value={profile.birth_date ?? ""} onChange={set("birth_date")} style={inputStyle} />
          </div>
        </div>

        {/* Teléfono */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Teléfono celular</label>
          <input value={profile.phone ?? ""} onChange={set("phone")} placeholder="+54 9 11 1234 5678" style={inputStyle} />
        </div>

        {/* Dirección */}
        <p style={{ color: "#555", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "1.25rem 0 0.75rem 0" }}>Dirección</p>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Calle</label>
            <input value={profile.address_street ?? ""} onChange={set("address_street")} placeholder="Av. Corrientes" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Número</label>
            <input value={profile.address_number ?? ""} onChange={set("address_number")} placeholder="1234" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Piso</label>
            <input value={profile.address_floor ?? ""} onChange={set("address_floor")} placeholder="3" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Departamento</label>
            <input value={profile.address_apt ?? ""} onChange={set("address_apt")} placeholder="B" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Código postal</label>
            <input value={profile.address_postal ?? ""} onChange={set("address_postal")} placeholder="1043" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Localidad</label>
          <input value={profile.address_city ?? ""} onChange={set("address_city")} placeholder="Ciudad Autónoma de Buenos Aires" style={inputStyle} />
        </div>

        <button type="submit" disabled={saving} style={{ background: saving ? "#1a1a1a" : "#a3e635", color: saving ? "#444" : "#000", border: "none", borderRadius: "0.5rem", padding: "0.7rem 1.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Guardando..." : "Guardar datos"}
        </button>
      </form>

      {/* ── CERTIFICADOS MÉDICOS ── */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "1.75rem" }}>
        <p style={sectionTitle}>Certificados médicos</p>

        {/* Lista de certificados */}
        {certs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#555", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            No tenés certificados cargados todavía.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
            {certs.map((cert) => {
              const status = certStatus(cert.expires_at);
              const colors = {
                ok:      { bg: "rgba(163,230,53,0.05)", border: "rgba(163,230,53,0.2)", badge: "#a3e635", badgeBg: "rgba(163,230,53,0.1)", text: "Vigente" },
                warning: { bg: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.3)", badge: "#fbbf24", badgeBg: "rgba(251,191,36,0.1)", text: "Vence pronto" },
                expired: { bg: "rgba(248,113,113,0.05)", border: "rgba(248,113,113,0.3)", badge: "#f87171", badgeBg: "rgba(248,113,113,0.1)", text: "Vencido" },
              }[status];

              return (
                <div key={cert.id} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "0.625rem", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ background: colors.badgeBg, color: colors.badge, fontSize: "0.65rem", fontWeight: 800, padding: "0.1rem 0.5rem", borderRadius: "2rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {status === "expired" ? "⚠ " : status === "warning" ? "⏰ " : "✓ "}{colors.text}
                      </span>
                    </div>
                    <p style={{ color: "white", fontWeight: 600, fontSize: "0.875rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📄 {cert.file_name}
                    </p>
                    <p style={{ color: colors.badge, fontSize: "0.78rem", margin: "0.2rem 0 0 0", fontWeight: 600 }}>
                      Vence: {formatDate(cert.expires_at)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    {cert.signedUrl && (
                      <a href={cert.signedUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.35rem", color: "#aaa", padding: "0.3rem 0.65rem", fontSize: "0.75rem", textDecoration: "none", fontWeight: 600 }}>
                        Ver
                      </a>
                    )}
                    <button onClick={() => handleDeleteCert(cert.id)} disabled={deletingCert === cert.id} style={{ background: "transparent", border: "1px solid #2a1a1a", borderRadius: "0.35rem", color: "#c05050", padding: "0.3rem 0.65rem", cursor: "pointer", fontSize: "0.75rem" }}>
                      {deletingCert === cert.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario nuevo certificado */}
        <form onSubmit={handleUploadCert} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "0.625rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ color: "#aaa", fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>Cargar nuevo certificado</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Archivo */}
            <div>
              <label style={labelStyle}>Archivo (PDF o imagen) *</label>
              <div style={{ border: `2px dashed ${certFile ? "rgba(163,230,53,0.4)" : "#222"}`, borderRadius: "0.5rem", padding: "0.875rem", textAlign: "center", background: certFile ? "rgba(163,230,53,0.04)" : "transparent", position: "relative", cursor: "pointer" }}>
                <input id="cert-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                {certFile ? (
                  <p style={{ color: "#a3e635", fontSize: "0.8rem", fontWeight: 700, margin: 0 }}>📄 {certFile.name}</p>
                ) : (
                  <p style={{ color: "#444", fontSize: "0.8rem", margin: 0 }}>Click para seleccionar</p>
                )}
              </div>
            </div>

            {/* Vencimiento */}
            <div>
              <label style={labelStyle}>Fecha de vencimiento *</label>
              <input type="date" value={certExpiry} onChange={(e) => setCertExpiry(e.target.value)} required style={inputStyle} />
              <p style={{ color: "#444", fontSize: "0.72rem", marginTop: "0.35rem" }}>
                Se alertará 30 días antes del vencimiento.
              </p>
            </div>
          </div>

          <button type="submit" disabled={uploadingCert || !certFile || !certExpiry}
            style={{ background: uploadingCert || !certFile || !certExpiry ? "#1a1a1a" : "#a3e635", color: uploadingCert || !certFile || !certExpiry ? "#444" : "#000", border: "none", borderRadius: "0.5rem", padding: "0.65rem", fontWeight: 700, fontSize: "0.875rem", cursor: uploadingCert || !certFile || !certExpiry ? "not-allowed" : "pointer" }}>
            {uploadingCert ? "Subiendo..." : "Cargar certificado"}
          </button>
        </form>
      </div>
    </main>
  );
}
