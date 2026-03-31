"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

type BankAccount = {
  id: string;
  bank_name: string;
  holder: string | null;
  cbu: string | null;
  alias: string | null;
};

type FormState = {
  bank_name: string;
  holder: string;
  cbu: string;
  alias: string;
};

const emptyForm = (): FormState => ({ bank_name: "", holder: "", cbu: "", alias: "" });

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.5rem",
  padding: "0.6rem 0.875rem", color: "white", fontSize: "0.875rem",
  outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: "0.72rem", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.07em",
};

export function CoachBankAccountsPanel() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/coach/bank-accounts");
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setAdding(true);
  }

  function startEdit(acc: BankAccount) {
    setAdding(false);
    setEditingId(acc.id);
    setForm({ bank_name: acc.bank_name, holder: acc.holder ?? "", cbu: acc.cbu ?? "", alias: acc.alias ?? "" });
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function saveAccount() {
    if (!form.bank_name.trim()) { toast.error("El nombre del banco es requerido"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/coach/bank-accounts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Error al guardar");
        toast.success("Cuenta actualizada");
      } else {
        const res = await fetch("/api/coach/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Error al guardar");
        toast.success("Cuenta agregada");
      }
      cancelForm();
      await load();
    } catch {
      toast.error("Error al guardar la cuenta");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/coach/bank-accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cuenta eliminada");
      await load();
    } else {
      toast.error("Error al eliminar");
    }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Lista de cuentas */}
      {loading ? (
        <p style={{ color: "#555", fontSize: "0.85rem" }}>Cargando...</p>
      ) : accounts.length === 0 && !adding ? (
        <p style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}>
          No tenés cuentas bancarias cargadas. Tus runners no verán datos para transferir.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {accounts.map(acc => (
            <div key={acc.id}>
              {/* Modal confirmación eliminar */}
              {confirmDelete === acc.id && (
                <div style={{
                  position: "fixed", inset: 0, zIndex: 1000,
                  background: "rgba(0,0,0,0.75)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    background: "#111", border: "1px solid #2a2a2a",
                    borderRadius: "1rem", padding: "2rem", maxWidth: "380px", width: "90%",
                    display: "flex", flexDirection: "column", gap: "1rem",
                  }}>
                    <div style={{ fontSize: "2rem", textAlign: "center" }}>🏦</div>
                    <h3 style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: 0, textAlign: "center" }}>
                      ¿Eliminar cuenta?
                    </h3>
                    <p style={{ color: "#888", fontSize: "0.85rem", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                      Vas a eliminar <strong style={{ color: "white" }}>{acc.bank_name}</strong>
                      {acc.alias ? ` (${acc.alias})` : ""}. Esta acción no se puede deshacer.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.5rem", color: "#888", padding: "0.6rem 1.25rem", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => deleteAccount(acc.id)}
                        disabled={deletingId === acc.id}
                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#ef4444", padding: "0.6rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        {deletingId === acc.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingId === acc.id ? (
                <BankForm form={form} set={set} saving={saving} onSave={saveAccount} onCancel={cancelForm} isEdit />
              ) : (
                <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.65rem", padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <p style={{ color: "#555", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Banco</p>
                      <p style={{ color: "white", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>{acc.bank_name}</p>
                    </div>
                    {acc.holder && (
                      <div>
                        <p style={{ color: "#555", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Titular</p>
                        <p style={{ color: "#ccc", fontSize: "0.85rem", fontWeight: 500, margin: 0 }}>{acc.holder}</p>
                      </div>
                    )}
                    {acc.cbu && (
                      <div>
                        <p style={{ color: "#555", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>CBU / CVU</p>
                        <p style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, margin: 0, fontFamily: "monospace", letterSpacing: "0.03em" }}>{acc.cbu}</p>
                      </div>
                    )}
                    {acc.alias && (
                      <div>
                        <p style={{ color: "#555", fontSize: "0.65rem", margin: "0 0 0.1rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alias</p>
                        <p style={{ color: "#a3e635", fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>{acc.alias}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button onClick={() => startEdit(acc)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#888", padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" }}>
                      Editar
                    </button>
                    <button onClick={() => setConfirmDelete(acc.id)} style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.4rem", color: "#ef4444", padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer" }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario nueva cuenta */}
      {adding && (
        <BankForm form={form} set={set} saving={saving} onSave={saveAccount} onCancel={cancelForm} isEdit={false} />
      )}

      {/* Botón agregar */}
      {!adding && !editingId && (
        <button
          onClick={startAdd}
          style={{
            background: "transparent", border: "1px dashed #2a2a2a",
            borderRadius: "0.5rem", color: "#a3e635", padding: "0.65rem",
            fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", width: "100%",
          }}
        >
          + Agregar cuenta bancaria
        </button>
      )}
    </div>
  );
}

function BankForm({ form, set, saving, onSave, onCancel, isEdit }: {
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "0.65rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle}>Banco / Billetera virtual *</label>
          <input style={inputStyle} placeholder="Ej: Mercado Pago, Banco Nación…" value={form.bank_name} onChange={e => set("bank_name", e.target.value)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle}>Titular</label>
          <input style={inputStyle} placeholder="Nombre completo o razón social" value={form.holder} onChange={e => set("holder", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle}>CBU / CVU</label>
          <input style={inputStyle} placeholder="22 dígitos" value={form.cbu} onChange={e => set("cbu", e.target.value)} maxLength={22} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle}>Alias</label>
          <input style={inputStyle} placeholder="Ej: martin.runfix.mp" value={form.alias} onChange={e => set("alias", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.45rem", color: "#666", padding: "0.55rem 1.1rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
          Cancelar
        </button>
        <button onClick={onSave} disabled={saving} style={{ background: saving ? "#1a2a0a" : "#a3e635", border: "none", borderRadius: "0.45rem", color: saving ? "#666" : "#000", padding: "0.55rem 1.25rem", fontSize: "0.82rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar cuenta"}
        </button>
      </div>
    </div>
  );
}
