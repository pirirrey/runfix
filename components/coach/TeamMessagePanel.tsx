"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { TeamMessage } from "@/app/api/coach/teams/messages/route";

interface Props { teamId: string; }

function daysLeft(expiresAt: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt + "T00:00:00");
  return Math.floor((exp.getTime() - today.getTime()) / 86400000);
}

function expiryLabel(d: number): { text: string; color: string } {
  if (d < 0)  return { text: "Vencido",         color: "#f87171" };
  if (d === 0) return { text: "Vence hoy",       color: "#fbbf24" };
  if (d === 1) return { text: "Vence mañana",    color: "#fbbf24" };
  return             { text: `${d} días`,        color: "#555"   };
}

export function TeamMessagePanel({ teamId }: Props) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<TeamMessage[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [msgText, setMsgText]     = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // Mínimo: hoy
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/coach/teams/messages?teamId=${teamId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msgText.trim() || !expiresAt) return;
    setSaving(true);
    const res = await fetch("/api/coach/teams/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, message: msgText, expires_at: expiresAt }),
    });
    if (res.ok) {
      toast.success("Mensaje enviado al grupo ✓");
      setMsgText(""); setExpiresAt(""); setShowForm(false);
      await load();
    } else {
      toast.error("Error al enviar el mensaje");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/coach/teams/messages?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Mensaje eliminado"); await load(); }
    else toast.error("Error al eliminar");
    setDeleting(null);
  }

  // Contar mensajes activos (no vencidos)
  const activeCount = messages.filter(m => daysLeft(m.expires_at) >= 0).length;

  return (
    <div style={{ borderTop: "1px solid #1a1a1a" }}>
      {/* Botón acordeón */}
      <button
        onClick={() => { setOpen(o => !o); setShowForm(false); }}
        style={{
          width: "100%", background: open ? "#0d0d0d" : "transparent",
          border: "none", cursor: "pointer",
          padding: "0.75rem 1.25rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "0.75rem",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem" }}>📢</span>
          <span style={{ color: "#888", fontSize: "0.78rem", fontWeight: 600 }}>
            Mensajes al grupo
          </span>
          {activeCount > 0 && (
            <span style={{
              background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.2)",
              color: "#a3e635", borderRadius: "99px",
              fontSize: "0.62rem", fontWeight: 800,
              padding: "0.05rem 0.45rem",
            }}>
              {activeCount} activo{activeCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span style={{
          color: "#333", fontSize: "0.7rem",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block",
        }}>▼</span>
      </button>

      {/* Panel expandido */}
      {open && (
        <div style={{ padding: "0 1.25rem 1.25rem", background: "#0d0d0d" }}>

          {/* Lista de mensajes */}
          {loading ? (
            <p style={{ color: "#444", fontSize: "0.78rem", textAlign: "center", padding: "1rem 0" }}>
              Cargando...
            </p>
          ) : messages.length === 0 ? (
            <p style={{ color: "#333", fontSize: "0.78rem", textAlign: "center", padding: "0.75rem 0" }}>
              Sin mensajes activos
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.875rem", paddingTop: "0.75rem" }}>
              {messages.filter(msg => daysLeft(msg.expires_at) >= 0).map(msg => {
                const dl = daysLeft(msg.expires_at);
                const exp = expiryLabel(dl);
                const isExpired = dl < 0;
                return (
                  <div key={msg.id} style={{
                    background: isExpired ? "#0a0a0a" : "#111",
                    border: `1px solid ${isExpired ? "#1a1a1a" : "#1e1e1e"}`,
                    borderRadius: "0.5rem",
                    padding: "0.7rem 0.875rem",
                    opacity: isExpired ? 0.5 : 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <p style={{
                        color: isExpired ? "#444" : "#ccc",
                        fontSize: "0.8rem",
                        lineHeight: 1.5,
                        margin: 0,
                        flex: 1,
                      }}>
                        {msg.message}
                      </p>
                      <button
                        onClick={() => handleDelete(msg.id)}
                        disabled={deleting === msg.id}
                        style={{
                          background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.2)",
                          borderRadius: "0.375rem",
                          color: "#f87171", cursor: "pointer", fontSize: "0.72rem",
                          padding: "0.25rem 0.5rem", flexShrink: 0,
                          opacity: deleting === msg.id ? 0.4 : 1,
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                        title="Eliminar mensaje"
                      >
                        {deleting === msg.id ? "..." : "🗑 Eliminar"}
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                      <span style={{ color: "#333", fontSize: "0.68rem" }}>
                        📅 Hasta {new Date(msg.expires_at + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ color: exp.color, fontSize: "0.68rem", fontWeight: 700 }}>
                        · {exp.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form nuevo mensaje */}
          {showForm ? (
            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Escribí el mensaje para el grupo..."
                rows={3}
                maxLength={500}
                required
                style={{
                  width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
                  borderRadius: "0.5rem", padding: "0.65rem 0.875rem",
                  color: "white", fontSize: "0.82rem", resize: "vertical",
                  outline: "none", boxSizing: "border-box", lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", color: "#555", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                  Visible hasta
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  min={today}
                  required
                  style={{
                    width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
                    borderRadius: "0.5rem", padding: "0.55rem 0.75rem",
                    color: "white", fontSize: "0.82rem", outline: "none",
                    boxSizing: "border-box", colorScheme: "dark" as React.CSSProperties["colorScheme"],
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setMsgText(""); setExpiresAt(""); }}
                  style={{
                    flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a",
                    borderRadius: "0.5rem", padding: "0.55rem",
                    color: "#555", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !msgText.trim() || !expiresAt}
                  style={{
                    flex: 2,
                    background: saving || !msgText.trim() || !expiresAt ? "#1a1a1a" : "#a3e635",
                    color: saving || !msgText.trim() || !expiresAt ? "#444" : "#000",
                    border: "none", borderRadius: "0.5rem", padding: "0.55rem",
                    fontSize: "0.78rem", fontWeight: 700,
                    cursor: saving || !msgText.trim() || !expiresAt ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Enviando..." : "📢 Enviar al grupo"}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%", background: "transparent",
                border: "1px dashed #2a2a2a", borderRadius: "0.5rem",
                padding: "0.55rem", color: "#555",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                transition: "all 0.15s",
              }}
            >
              + Nuevo mensaje
            </button>
          )}
        </div>
      )}
    </div>
  );
}
