"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

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

type Pricing = {
  monthly_price:   number | null;
  monthly_due_day: number | null;
  annual_price:    number | null;
};

type BankAccount = {
  id: string;
  bank_name: string;
  holder: string | null;
  cbu: string | null;
  alias: string | null;
};

type CoachData = {
  coach:   { id: string; full_name: string | null; team_name: string | null; joined_at: string | null };
  plan:    { plan_type: PlanType; amount: number | null; notes: string | null; discount_pct: number | null };
  pricing: Pricing;
  bank:    BankAccount[];
  receipts: Receipt[];
};

const planLabel: Record<PlanType, string> = {
  monthly: "Pago mensual",
  annual:  "Pago anual",
  exempt:  "Exento de pago",
};
const planColor: Record<PlanType, string> = {
  monthly: "#60a5fa",
  annual:  "#a78bfa",
  exempt:  "#a3e635",
};
const planBg: Record<PlanType, string> = {
  monthly: "rgba(96,165,250,0.1)",
  annual:  "rgba(167,139,250,0.1)",
  exempt:  "rgba(163,230,53,0.1)",
};
const planBorder: Record<PlanType, string> = {
  monthly: "rgba(96,165,250,0.25)",
  annual:  "rgba(167,139,250,0.25)",
  exempt:  "rgba(163,230,53,0.25)",
};
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

// Genera meses desde joinedAt hasta el mes actual (inclusive), más reciente primero
function getMonthsFrom(joinedAt: string | null): { label: string; value: string }[] {
  const months = [];
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Si no hay fecha de alta, mostrar últimos 12 meses como fallback
  const startDate = joinedAt
    ? new Date(joinedAt.slice(0, 10) + "T00:00:00")
    : new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  let d = new Date(currentMonth);
  while (d >= startMonth) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    months.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return months;
}

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

// Devuelve el N-ésimo día hábil (lunes a viernes) del mes indicado
function getNthBusinessDay(n: number, year: number, month: number): Date {
  let count = 0;
  let day = 1;
  while (true) {
    const date = new Date(year, month, day);
    const dow = date.getDay(); // 0=Dom, 6=Sáb
    if (dow !== 0 && dow !== 6) {
      count++;
      if (count === n) return date;
    }
    day++;
  }
}

// Formatea la fecha de vencimiento del mes en curso: "lun 5 may"
function formatDueDate(nthBusinessDay: number): string {
  const today = new Date();
  const due = getNthBusinessDay(nthBusinessDay, today.getFullYear(), today.getMonth());
  return due.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export default function RunnerPaymentsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [data, setData] = useState<CoachData[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [uploading, setUploading] = useState(false);
  const [activeUpload, setActiveUpload] = useState<{ coachId: string; month: string } | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState<Method>("transfer");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formNotes, setFormNotes] = useState("");

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/runner/payments");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openUpload(coachId: string, month: string) {
    setActiveUpload({ coachId, month });
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMethod("transfer");
    setFormFile(null);
    setFormNotes("");
  }

  function closeUpload() {
    setActiveUpload(null);
    setFormFile(null);
  }

  async function submitReceipt() {
    if (!activeUpload) return;
    if (formMethod !== "cash" && !formFile) {
      toast.error("Adjuntá el comprobante o seleccioná 'Efectivo'");
      return;
    }

    setUploading(true);
    try {
      let storage_path: string | null = null;
      let file_name: string | null = null;

      if (formFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");
        const ext = formFile.name.split(".").pop() ?? "pdf";
        const monthKey = activeUpload.month.slice(0, 7); // "2025-01"
        storage_path = `payments/${activeUpload.coachId}/${user.id}/${monthKey}.${ext}`;
        file_name = formFile.name;
        const { error: upErr } = await supabase.storage
          .from("training-plans")
          .upload(storage_path, formFile, { upsert: true });
        if (upErr) throw new Error(upErr.message);
      }

      const res = await fetch("/api/runner/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: activeUpload.coachId,
          payment_month: activeUpload.month,
          payment_date: formDate,
          method: formMethod,
          storage_path,
          file_name,
          notes: formNotes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Comprobante registrado");
      closeUpload();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function deleteReceipt(receiptId: string) {
    setDeleting(receiptId);
    const res = await fetch(`/api/runner/payments/${receiptId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Comprobante eliminado");
      await load();
    } else {
      toast.error("Error al eliminar");
    }
    setDeleting(null);
  }

  const bgStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: `
      radial-gradient(ellipse at 50% 0%, rgba(163, 230, 53, 0.08) 0%, transparent 55%),
      radial-gradient(circle at 90% 90%, rgba(96, 165, 250, 0.06) 0%, transparent 45%),
      radial-gradient(circle 1px at center,rgba(255,255,255,0.07) 1px, transparent 0) 0 0 / 24px 24px,
      #0a0a0a
    `,
  };

  if (loading) {
    return <div style={bgStyle}>
      <main style={{ padding: "2rem", maxWidth: "52rem", margin: "0 auto" }}>
        <p style={{ color: "#555", textAlign: "center", marginTop: "4rem" }}>Cargando...</p>
      </main>
    </div>;
  }

  return (
    <div style={bgStyle}>
    <main style={{ padding: "2rem", maxWidth: "52rem", margin: "0 auto" }}>

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Mis Pagos</h1>
        <p style={{ color: "#555", fontSize: "0.875rem", margin: "0.4rem 0 0 0" }}>
          Registrá tus comprobantes de pago por entrenamiento.
        </p>
      </div>

      {data.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💳</div>
          <p style={{ color: "#888", fontSize: "0.95rem" }}>No tenés coaches asociados actualmente.</p>
        </div>
      ) : data.map((item) => {
        const pt = item.plan.plan_type;
        const coachName = item.coach.team_name || item.coach.full_name || "Coach";

        return (
          <div key={item.coach.id} style={{ marginBottom: "1.5rem", background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.875rem", overflow: "hidden" }}>

            {/* Header del coach */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <p style={{ color: "white", fontWeight: 700, fontSize: "0.975rem", margin: 0 }}>{coachName}</p>
                {item.coach.team_name && item.coach.full_name && (
                  <p style={{ color: "#555", fontSize: "0.78rem", margin: "0.2rem 0 0 0" }}>{item.coach.full_name}</p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                {/* Badge plan */}
                <span style={{
                  background: planBg[pt], border: `1px solid ${planBorder[pt]}`,
                  color: planColor[pt], fontSize: "0.75rem", fontWeight: 700,
                  padding: "0.25rem 0.75rem", borderRadius: "2rem",
                }}>
                  {planLabel[pt]}
                </span>

                {/* Precio con descuento opcional */}
                {pt === "monthly" && item.pricing.monthly_price != null && (() => {
                  const base = item.pricing.monthly_price;
                  const disc = item.plan.discount_pct ?? 0;
                  const final = Math.round(base * (1 - disc / 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                      {disc > 0 ? (
                        <>
                          {/* Original tachado */}
                          <span style={{ color: "#444", fontSize: "0.72rem", textDecoration: "line-through" }}>
                            ${base.toLocaleString("es-AR")} / mes
                          </span>
                          {/* Descuento badge + precio final */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", fontSize: "0.68rem", fontWeight: 800, padding: "0.1rem 0.45rem", borderRadius: "2rem" }}>
                              {disc}% off
                            </span>
                            <span style={{ color: "#a3e635", fontSize: "0.88rem", fontWeight: 800 }}>
                              ${final.toLocaleString("es-AR")} / mes
                            </span>
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#888", fontSize: "0.78rem", fontWeight: 600 }}>
                          ${base.toLocaleString("es-AR")} / mes
                        </span>
                      )}
                      {/* Fecha de vencimiento */}
                      {item.pricing.monthly_due_day != null && (
                        <span style={{ color: "#555", fontSize: "0.72rem" }}>
                          vence el{" "}
                          <span style={{ color: "#a3e635", fontWeight: 700 }}>
                            {formatDueDate(item.pricing.monthly_due_day)}
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })()}

                {pt === "annual" && item.pricing.annual_price != null && (() => {
                  const base = item.pricing.annual_price;
                  const disc = item.plan.discount_pct ?? 0;
                  const final = Math.round(base * (1 - disc / 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                      {disc > 0 ? (
                        <>
                          <span style={{ color: "#444", fontSize: "0.72rem", textDecoration: "line-through" }}>
                            ${base.toLocaleString("es-AR")} / año
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", fontSize: "0.68rem", fontWeight: 800, padding: "0.1rem 0.45rem", borderRadius: "2rem" }}>
                              {disc}% off
                            </span>
                            <span style={{ color: "#a3e635", fontSize: "0.88rem", fontWeight: 800 }}>
                              ${final.toLocaleString("es-AR")} / año
                            </span>
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#888", fontSize: "0.78rem", fontWeight: 600 }}>
                          ${base.toLocaleString("es-AR")} / año
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Datos bancarios — múltiples cuentas */}
            {item.bank.length > 0 && (
              <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <span style={{ color: "#555", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>🏦 Datos para transferir</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {item.bank.map(acc => (
                    <div key={acc.id} style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center", background: "#111", border: "1px solid #1a1a1a", borderRadius: "0.5rem", padding: "0.65rem 0.875rem" }}>
                      <div>
                        <p style={{ color: "#444", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Banco</p>
                        <p style={{ color: "white", fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>{acc.bank_name}</p>
                      </div>
                      {acc.holder && (
                        <div>
                          <p style={{ color: "#444", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Titular</p>
                          <p style={{ color: "#ccc", fontSize: "0.82rem", fontWeight: 500, margin: 0 }}>{acc.holder}</p>
                        </div>
                      )}
                      {acc.cbu && (
                        <div>
                          <p style={{ color: "#444", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>CBU / CVU</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <p style={{ color: "#a3e635", fontSize: "0.82rem", fontWeight: 700, margin: 0, fontFamily: "monospace", letterSpacing: "0.03em" }}>{acc.cbu}</p>
                            <CopyButton value={acc.cbu} />
                          </div>
                        </div>
                      )}
                      {acc.alias && (
                        <div>
                          <p style={{ color: "#444", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alias</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <p style={{ color: "#a3e635", fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>{acc.alias}</p>
                            <CopyButton value={acc.alias} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cuerpo */}
            {pt === "exempt" ? (
              <div style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>✅</span>
                <p style={{ color: "#a3e635", fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>
                  Estás exento de pago. No necesitás subir comprobantes.
                </p>
              </div>
            ) : (
              <div style={{ padding: "0.75rem 0" }}>
                {getMonthsFrom(item.coach.joined_at).map((month) => {
                  const receipt = item.receipts.find((r) => r.payment_month.slice(0, 7) === month.value.slice(0, 7));
                  const isActiveUploadMonth = activeUpload?.coachId === item.coach.id && activeUpload?.month === month.value;

                  return (
                    <div key={month.value} style={{ borderBottom: "1px solid #161616" }}>
                      {/* Fila del mes */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1.5rem" }}>
                        {/* Estado */}
                        <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, background: receipt ? "rgba(163,230,53,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${receipt ? "rgba(163,230,53,0.3)" : "#222"}`, color: receipt ? "#a3e635" : "#444" }}>
                          {receipt ? "✓" : "·"}
                        </div>

                        {/* Mes */}
                        <span style={{ color: receipt ? "white" : "#666", fontSize: "0.875rem", fontWeight: receipt ? 600 : 400, flex: 1 }}>
                          {month.label}
                        </span>

                        {/* Info del comprobante */}
                        {receipt && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "2rem", color: "#888", fontSize: "0.72rem", padding: "0.15rem 0.6rem" }}>
                              {methodIcon[receipt.method]} {methodLabel[receipt.method]}
                            </span>
                            <span style={{ color: "#555", fontSize: "0.75rem" }}>
                              {formatDate(receipt.payment_date)}
                            </span>
                            {receipt.storage_path && <SignedLink path={receipt.storage_path} supabase={supabase} />}
                            <button
                              onClick={() => deleteReceipt(receipt.id)}
                              disabled={deleting === receipt.id}
                              style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.8rem", padding: "0.1rem 0.3rem" }}
                              title="Eliminar comprobante"
                            >
                              {deleting === receipt.id ? "..." : "✕"}
                            </button>
                          </div>
                        )}

                        {/* Botón subir */}
                        {!receipt && !isActiveUploadMonth && (
                          <button
                            onClick={() => openUpload(item.coach.id, month.value)}
                            style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.75rem", fontWeight: 600, padding: "0.3rem 0.75rem", cursor: "pointer" }}
                          >
                            + Subir comprobante
                          </button>
                        )}

                        {/* Cerrar form */}
                        {isActiveUploadMonth && (
                          <button onClick={closeUpload} style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
                        )}
                      </div>

                      {/* Formulario inline */}
                      {isActiveUploadMonth && (
                        <div style={{ padding: "1rem 1.5rem 1.25rem", background: "#0d0d0d", borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                          <p style={{ color: "#a3e635", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
                            Comprobante — {month.label}
                          </p>

                          {/* Fecha + Método */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div>
                              <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                                Fecha de pago
                              </label>
                              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                                style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.5rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", colorScheme: "dark", boxSizing: "border-box" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                                Forma de pago
                              </label>
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                {(["transfer", "cash", "other"] as Method[]).map((m) => (
                                  <button key={m} onClick={() => setFormMethod(m)}
                                    style={{ flex: 1, padding: "0.45rem 0.4rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: formMethod === m ? "rgba(163,230,53,0.12)" : "#1a1a1a", border: `1px solid ${formMethod === m ? "rgba(163,230,53,0.35)" : "#2a2a2a"}`, color: formMethod === m ? "#a3e635" : "#555" }}>
                                    {methodIcon[m]}
                                  </button>
                                ))}
                              </div>
                              <p style={{ color: "#555", fontSize: "0.68rem", margin: "0.25rem 0 0 0" }}>{methodLabel[formMethod]}</p>
                            </div>
                          </div>

                          {/* Archivo */}
                          {formMethod !== "cash" && (
                            <div>
                              <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                                Adjuntar comprobante
                              </label>
                              <label
                                style={{
                                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                  gap: "0.4rem", padding: "1rem", borderRadius: "0.5rem", cursor: "pointer",
                                  border: `1.5px dashed ${formFile ? "rgba(163,230,53,0.4)" : "#2a2a2a"}`,
                                  background: formFile ? "rgba(163,230,53,0.05)" : "#1a1a1a",
                                  transition: "all 0.15s",
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFormFile(f); }}
                              >
                                <input
                                  type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                                  style={{ display: "none" }}
                                />
                                {formFile ? (
                                  <>
                                    <span style={{ fontSize: "1.4rem" }}>📄</span>
                                    <span style={{ color: "#a3e635", fontSize: "0.82rem", fontWeight: 700, textAlign: "center" }}>
                                      {formFile.name}
                                    </span>
                                    <span style={{ color: "#555", fontSize: "0.72rem" }}>
                                      {(formFile.size / 1024).toFixed(0)} KB · click para cambiar
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: "1.4rem" }}>⬆️</span>
                                    <span style={{ color: "#666", fontSize: "0.82rem", fontWeight: 600 }}>
                                      Arrastrá o hacé click para adjuntar
                                    </span>
                                    <span style={{ color: "#444", fontSize: "0.72rem" }}>
                                      PDF, PNG, JPG — máx. 10 MB
                                    </span>
                                  </>
                                )}
                              </label>
                            </div>
                          )}

                          {/* Notas */}
                          <div>
                            <label style={{ display: "block", color: "#666", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                              Notas (opcional)
                            </label>
                            <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                              placeholder="Ej: Pago julio — transferencia Mercado Pago"
                              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.5rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>

                          {/* Acciones */}
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button onClick={closeUpload} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#666", padding: "0.45rem 1rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                              Cancelar
                            </button>
                            <button onClick={submitReceipt} disabled={uploading}
                              style={{ background: uploading ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: uploading ? "#444" : "#000", padding: "0.45rem 1.25rem", fontSize: "0.82rem", fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
                              {uploading ? "Subiendo..." : "Confirmar pago"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </main>
    </div>
  );
}

// Botón copiar al portapapeles
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copiar"
      style={{
        background: copied ? "rgba(163,230,53,0.15)" : "transparent",
        border: "none", borderRadius: "0.3rem",
        color: copied ? "#a3e635" : "#555",
        cursor: "pointer", padding: "0.1rem 0.3rem",
        fontSize: "0.75rem", lineHeight: 1,
        transition: "all 0.15s",
      }}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

// Componente auxiliar para generar y mostrar el link del archivo
function SignedLink({ path, supabase }: { path: string; supabase: ReturnType<typeof createBrowserClient> }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from("training-plans").createSignedUrl(path, 3600)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => setUrl(data?.signedUrl ?? null));
  }, [path, supabase]);

  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", borderRadius: "0.35rem", color: "#a3e635", fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.6rem", textDecoration: "none" }}>
      Ver
    </a>
  );
}
