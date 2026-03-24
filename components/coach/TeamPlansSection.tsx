"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────────── */

type PlanRow = {
  id: string;
  valid_from: string;       // "YYYY-MM-01"
  valid_until: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  notes: string | null;
};

type RoutineRow = {
  id: string;
  training_date: string;   // "YYYY-MM-DD"
  routine: string;
};

type MonthCard = {
  key: string;              // "2026-03"
  firstDay: string;         // "2026-03-01"
  lastDay: string;          // "2026-03-31"
  label: string;            // "Marzo 2026"
  plan: PlanRow | null;
  routines: RoutineRow[];
  status: "current" | "upcoming" | "past";
  vigente: boolean;
};

interface Props {
  teamId: string;
  initialPlans: PlanRow[];
  initialRoutines: RoutineRow[];
}

/* ── Helpers ────────────────────────────────────────────────── */

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastDay(key: string) {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${key}-${String(last).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCards(plans: PlanRow[], routines: RoutineRow[], extra: string[]): MonthCard[] {
  const curKey = currentMonthKey();
  const keys = new Set<string>([curKey, ...extra]);
  plans.forEach(p => keys.add(p.valid_from.slice(0, 7)));
  routines.forEach(r => keys.add(r.training_date.slice(0, 7)));

  const cards: MonthCard[] = Array.from(keys).map(key => {
    const plan   = plans.find(p => p.valid_from.startsWith(key)) ?? null;
    const ruts   = routines.filter(r => r.training_date.startsWith(key))
                           .sort((a, b) => a.training_date.localeCompare(b.training_date));
    const status = key === curKey ? "current" : key > curKey ? "upcoming" : "past";
    return { key, firstDay: `${key}-01`, lastDay: lastDay(key), label: monthLabel(key), plan, routines: ruts, status, vigente: false };
  });

  // Determinar vigente
  const cur = cards.find(c => c.status === "current");
  if (cur && (cur.plan || cur.routines.length > 0)) {
    cur.vigente = true;
  } else {
    const lastPast = cards
      .filter(c => c.status === "past" && (c.plan || c.routines.length > 0))
      .sort((a, b) => b.key.localeCompare(a.key))[0];
    if (lastPast) lastPast.vigente = true;
  }

  return cards.sort((a, b) => {
    const o = { current: 0, upcoming: 1, past: 2 };
    if (a.status !== b.status) return o[a.status] - o[b.status];
    if (a.status === "upcoming") return a.key.localeCompare(b.key);
    return b.key.localeCompare(a.key);
  });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}
function fmtSize(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const todayStr = new Date().toISOString().slice(0, 10);

/* ── Component ──────────────────────────────────────────────── */

export function TeamPlansSection({ teamId, initialPlans, initialRoutines }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [plans,    setPlans]    = useState<PlanRow[]>(initialPlans);
  const [routines, setRoutines] = useState<RoutineRow[]>(initialRoutines);
  const [extra,    setExtra]    = useState<string[]>([]);

  // Which forms are open (only one per type at a time)
  const [uploadOpen,  setUploadOpen]  = useState<string | null>(null); // monthKey
  const [routineOpen, setRoutineOpen] = useState<string | null>(null);

  // Which months are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // "Add future month" picker
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState("");

  // Loading states
  const [uploading,   setUploading]   = useState(false);
  const [savingNotes, setSavingNotes] = useState<string | null>(null); // planId
  const [delRoutine,  setDelRoutine]  = useState<string | null>(null);
  const [savingRut,   setSavingRut]   = useState(false);

  useEffect(() => { setPlans(initialPlans); },    [initialPlans]);
  useEffect(() => { setRoutines(initialRoutines); }, [initialRoutines]);

  const cards = buildCards(plans, routines, extra);

  // Default: expand current + upcoming + vigente past
  useEffect(() => {
    const open = new Set<string>();
    cards.forEach(c => { if (c.status !== "past" || c.vigente) open.add(c.key); });
    setExpanded(open);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  /* ── PDF Upload ─────────────────────────────────────── */
  async function uploadPdf(card: MonthCard, file: File, notes: string) {
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "pdf";
      const path = `teams/${teamId}/${card.key}.${ext}`;
      const { error: upErr } = await supabase.storage.from("training-plans").upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      const body = {
        team_id: teamId, valid_from: card.firstDay, valid_until: card.lastDay,
        storage_path: path, file_name: file.name, file_size: file.size,
        notes: notes.trim() || null,
      };

      const res = card.plan
        ? await fetch(`/api/plans/${card.plan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/plans",                  { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const saved: PlanRow = await res.json();
      setPlans(prev => [...prev.filter(p => !p.valid_from.startsWith(card.key)), saved]);
      toast.success(card.plan ? "PDF actualizado" : "Plan subido correctamente");
      setUploadOpen(null);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error al subir"); }
    finally { setUploading(false); }
  }

  async function deletePlan(planId: string) {
    if (!confirm("¿Eliminar el PDF de este mes?")) return;
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    if (res.ok) { setPlans(prev => prev.filter(p => p.id !== planId)); toast.success("PDF eliminado"); }
    else toast.error("Error al eliminar");
  }

  async function saveNotes(planId: string, notes: string) {
    setSavingNotes(planId);
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || null }),
    });
    if (res.ok) { setPlans(prev => prev.map(p => p.id === planId ? { ...p, notes: notes.trim() || null } : p)); toast.success("Indicaciones guardadas"); }
    else toast.error("Error al guardar");
    setSavingNotes(null);
  }

  async function viewPdf(path: string) {
    const { data } = await supabase.storage.from("training-plans").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("No se pudo generar el link");
  }

  /* ── Routines ───────────────────────────────────────── */
  async function addRoutine(card: MonthCard, date: string, text: string) {
    if (!date || !text.trim()) { toast.error("Completá la fecha y la rutina"); return; }
    setSavingRut(true);
    const res = await fetch(`/api/teams/${teamId}/routines`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ training_date: date, routine: text.trim() }),
    });
    if (res.ok) {
      const r: RoutineRow = await res.json();
      setRoutines(prev => [...prev, r]);
      toast.success("Rutina agregada");
      setRoutineOpen(null);
    } else toast.error("Error al guardar la rutina");
    setSavingRut(false);
  }

  async function deleteRoutine(id: string) {
    setDelRoutine(id);
    const res = await fetch(`/api/teams/${teamId}/routines/${id}`, { method: "DELETE" });
    if (res.ok) { setRoutines(prev => prev.filter(r => r.id !== id)); toast.success("Rutina eliminada"); }
    else toast.error("Error al eliminar");
    setDelRoutine(null);
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div>
      {/* Encabezado + botón agregar mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <p style={{ color: "#555", fontSize: "0.8rem", margin: 0 }}>PDF y rutinas organizados por mes calendario</p>
        <button onClick={() => setShowAddMonth(v => !v)}
          style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.45rem", color: "#666", fontSize: "0.78rem", fontWeight: 600, padding: "0.35rem 0.875rem", cursor: "pointer" }}>
          + Agregar mes
        </button>
      </div>

      {/* Picker de mes futuro */}
      {showAddMonth && (
        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: "0.625rem", padding: "0.875rem 1.25rem", marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="month" value={newMonthInput} onChange={e => setNewMonthInput(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.4rem 0.75rem", color: "white", fontSize: "0.85rem", outline: "none", colorScheme: "dark" as const }} />
          <button onClick={() => {
            if (!newMonthInput) return;
            setExtra(prev => prev.includes(newMonthInput) ? prev : [...prev, newMonthInput]);
            setExpanded(prev => new Set([...prev, newMonthInput]));
            setShowAddMonth(false); setNewMonthInput("");
          }} style={{ background: "#a3e635", border: "none", borderRadius: "0.4rem", color: "#000", fontSize: "0.82rem", fontWeight: 700, padding: "0.4rem 1rem", cursor: "pointer" }}>
            Agregar
          </button>
          <button onClick={() => { setShowAddMonth(false); setNewMonthInput(""); }}
            style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.82rem", padding: "0.4rem 0.75rem", cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      )}

      {cards.length === 0 && (
        <p style={{ color: "#444", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
          Todavía no hay planes ni rutinas para este equipo.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {cards.map(card => (
          <MonthCardView
            key={card.key}
            card={card}
            expanded={expanded.has(card.key)}
            onToggle={() => toggle(card.key)}
            uploadOpen={uploadOpen === card.key}
            routineOpen={routineOpen === card.key}
            onOpenUpload={() => { setUploadOpen(card.key); setRoutineOpen(null); }}
            onCloseUpload={() => setUploadOpen(null)}
            onOpenRoutine={() => { setRoutineOpen(card.key); setUploadOpen(null); }}
            onCloseRoutine={() => setRoutineOpen(null)}
            uploading={uploading}
            savingNotes={savingNotes}
            savingRoutine={savingRut}
            deletingRoutineId={delRoutine}
            onUpload={(f, n) => uploadPdf(card, f, n)}
            onDeletePlan={() => deletePlan(card.plan!.id)}
            onViewPdf={() => viewPdf(card.plan!.storage_path!)}
            onSaveNotes={(notes) => saveNotes(card.plan!.id, notes)}
            onAddRoutine={(d, t) => addRoutine(card, d, t)}
            onDeleteRoutine={deleteRoutine}
          />
        ))}
      </div>
    </div>
  );
}

/* ── MonthCardView ──────────────────────────────────────────── */

interface CardProps {
  card: MonthCard;
  expanded: boolean;
  onToggle: () => void;
  uploadOpen: boolean;
  routineOpen: boolean;
  onOpenUpload: () => void;
  onCloseUpload: () => void;
  onOpenRoutine: () => void;
  onCloseRoutine: () => void;
  uploading: boolean;
  savingNotes: string | null;
  savingRoutine: boolean;
  deletingRoutineId: string | null;
  onUpload: (file: File, notes: string) => Promise<void>;
  onDeletePlan: () => void;
  onViewPdf: () => void;
  onSaveNotes: (notes: string) => Promise<void>;
  onAddRoutine: (date: string, text: string) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
}

function MonthCardView({
  card, expanded, onToggle,
  uploadOpen, routineOpen,
  onOpenUpload, onCloseUpload,
  onOpenRoutine, onCloseRoutine,
  uploading, savingNotes, savingRoutine, deletingRoutineId,
  onUpload, onDeletePlan, onViewPdf, onSaveNotes, onAddRoutine, onDeleteRoutine,
}: CardProps) {

  // Local form state
  const [uploadFile,  setUploadFile]  = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState(card.plan?.notes ?? "");
  const [editNotes,   setEditNotes]   = useState(false);
  const [notesVal,    setNotesVal]    = useState(card.plan?.notes ?? "");
  const [rutDate,     setRutDate]     = useState(todayStr);
  const [rutText,     setRutText]     = useState("");

  useEffect(() => { setUploadNotes(card.plan?.notes ?? ""); setNotesVal(card.plan?.notes ?? ""); }, [card.plan?.notes]);
  useEffect(() => { if (!uploadOpen) { setUploadFile(null); } }, [uploadOpen]);
  useEffect(() => { if (!routineOpen) { setRutText(""); } }, [routineOpen]);

  const border = card.vigente
    ? "1px solid rgba(163,230,53,0.35)"
    : card.status === "upcoming"
      ? "1px solid rgba(96,165,250,0.25)"
      : "1px solid #1e1e1e";

  const headerBg = card.vigente
    ? "rgba(163,230,53,0.05)"
    : card.status === "upcoming"
      ? "rgba(96,165,250,0.04)"
      : "#111";

  return (
    <div style={{ border, borderRadius: "0.875rem", overflow: "hidden" }}>

      {/* Header — siempre visible */}
      <div
        onClick={onToggle}
        style={{ background: headerBg, padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "0.75rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{card.label}</span>

          {card.vigente && (
            <span style={{ background: "#a3e635", color: "#000", fontSize: "0.62rem", fontWeight: 800, padding: "0.1rem 0.55rem", borderRadius: "2rem", textTransform: "uppercase" as const }}>
              Vigente
            </span>
          )}
          {card.status === "upcoming" && (
            <span style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.55rem", borderRadius: "2rem", textTransform: "uppercase" as const, border: "1px solid rgba(96,165,250,0.3)" }}>
              Próximo
            </span>
          )}

          {/* Indicadores de contenido */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {card.plan?.file_name && (
              <span style={{ color: "#555", fontSize: "0.72rem" }}>📄 {card.plan.file_name}</span>
            )}
            {card.routines.length > 0 && (
              <span style={{ color: "#555", fontSize: "0.72rem" }}>· 🗓 {card.routines.length} rutina{card.routines.length > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <span style={{ color: "#444", fontSize: "0.75rem", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Cuerpo expandible */}
      {expanded && (
        <div style={{ background: "#0d0d0d", borderTop: `1px solid ${card.vigente ? "rgba(163,230,53,0.12)" : "#1a1a1a"}` }}>

          {/* ── Sección PDF ─────────────────────────────── */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #161616" }}>
            <p style={{ color: "#444", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              📄 Plan PDF
            </p>

            {card.plan?.file_name ? (
              <div>
                {/* PDF existente */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {card.plan.file_name}
                    </p>
                    {card.plan.file_size && (
                      <p style={{ color: "#555", fontSize: "0.72rem", margin: "0.2rem 0 0 0" }}>{fmtSize(card.plan.file_size)}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={onViewPdf}
                      style={{ background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.25)", borderRadius: "0.4rem", color: "#a3e635", fontSize: "0.75rem", fontWeight: 600, padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                      Ver PDF
                    </button>
                    <button onClick={() => { onOpenUpload(); setUploadNotes(card.plan?.notes ?? ""); }}
                      style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#666", fontSize: "0.75rem", padding: "0.3rem 0.75rem", cursor: "pointer" }}>
                      Reemplazar
                    </button>
                    <button onClick={onDeletePlan}
                      style={{ background: "transparent", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.4rem", color: "#f87171", fontSize: "0.75rem", padding: "0.3rem 0.5rem", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Indicaciones al grupo */}
                {!uploadOpen && (
                  <div style={{ marginTop: "0.875rem" }}>
                    <p style={{ color: "#444", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                      👥 Indicaciones al grupo
                    </p>
                    {editNotes ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea rows={3} value={notesVal} onChange={e => setNotesVal(e.target.value)}
                          placeholder="Indicaciones para todos los runners de este equipo..."
                          style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box" as const }} />
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <button onClick={() => { setEditNotes(false); setNotesVal(card.plan?.notes ?? ""); }}
                            style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.78rem", padding: "0.35rem 0.75rem", cursor: "pointer" }}>
                            Cancelar
                          </button>
                          <button onClick={async () => { await onSaveNotes(notesVal); setEditNotes(false); }}
                            disabled={savingNotes === card.plan?.id}
                            style={{ background: savingNotes === card.plan?.id ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: savingNotes === card.plan?.id ? "#444" : "#000", fontSize: "0.78rem", fontWeight: 700, padding: "0.35rem 0.875rem", cursor: "pointer" }}>
                            {savingNotes === card.plan?.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setEditNotes(true)} style={{ cursor: "pointer" }}>
                        {card.plan.notes
                          ? <p style={{ color: "#aaa", fontSize: "0.84rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" as const }}>{card.plan.notes}</p>
                          : <p style={{ color: "#444", fontSize: "0.82rem", fontStyle: "italic", margin: 0 }}>+ Agregar indicaciones al grupo</p>
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              !uploadOpen && (
                <button onClick={onOpenUpload}
                  style={{ background: "transparent", border: "1px dashed #2a2a2a", borderRadius: "0.5rem", color: "#555", fontSize: "0.82rem", fontWeight: 600, padding: "0.6rem 1.25rem", cursor: "pointer", width: "100%", textAlign: "center" as const }}>
                  + Subir PDF para este mes
                </button>
              )
            )}

            {/* Formulario de upload */}
            {uploadOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: card.plan ? "0.875rem" : 0 }}>
                <div>
                  <label style={{ display: "block", color: "#666", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                    Archivo PDF
                  </label>
                  <input type="file" accept=".pdf"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                    style={{ color: "#aaa", fontSize: "0.82rem", width: "100%" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#666", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                    👥 Indicaciones al grupo (opcional)
                  </label>
                  <textarea rows={3} value={uploadNotes} onChange={e => setUploadNotes(e.target.value)}
                    placeholder="Indicaciones generales para todos los runners..."
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box" as const }} />
                </div>
                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                  <button onClick={onCloseUpload}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.78rem", padding: "0.35rem 0.75rem", cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={() => { if (uploadFile) onUpload(uploadFile, uploadNotes); else toast.error("Seleccioná un PDF"); }}
                    disabled={uploading}
                    style={{ background: uploading ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: uploading ? "#444" : "#000", fontSize: "0.78rem", fontWeight: 700, padding: "0.35rem 1rem", cursor: uploading ? "not-allowed" : "pointer" }}>
                    {uploading ? "Subiendo..." : card.plan ? "Reemplazar PDF" : "Subir PDF"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sección Rutinas ──────────────────────────── */}
          <div style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <p style={{ color: "#444", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: 0 }}>
                🗓 Rutinas de entrenamiento
              </p>
              {!routineOpen && (
                <button onClick={onOpenRoutine}
                  style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.625rem", cursor: "pointer" }}>
                  + Agregar
                </button>
              )}
            </div>

            {/* Lista de rutinas */}
            {card.routines.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: routineOpen ? "0.875rem" : 0 }}>
                {card.routines.map((r) => {
                  const isToday = r.training_date === todayStr;
                  return (
                    <div key={r.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.6rem 0.875rem", background: isToday ? "rgba(163,230,53,0.03)" : "rgba(255,255,255,0.02)", borderRadius: "0.45rem", border: `1px solid ${isToday ? "rgba(163,230,53,0.15)" : "#1e1e1e"}` }}>
                      <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "2rem", whiteSpace: "nowrap" as const, background: isToday ? "rgba(163,230,53,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${isToday ? "rgba(163,230,53,0.3)" : "#2a2a2a"}`, color: isToday ? "#a3e635" : "#666" }}>
                        {isToday ? "Hoy" : fmtDate(r.training_date)}
                      </span>
                      <p style={{ flex: 1, color: "#bbb", fontSize: "0.82rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" as const }}>{r.routine}</p>
                      <button onClick={() => onDeleteRoutine(r.id)} disabled={deletingRoutineId === r.id}
                        style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0, padding: "0.1rem 0.25rem" }}>
                        {deletingRoutineId === r.id ? "…" : "✕"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {card.routines.length === 0 && !routineOpen && (
              <p style={{ color: "#333", fontSize: "0.8rem", fontStyle: "italic" }}>Sin rutinas para este mes.</p>
            )}

            {/* Formulario agregar rutina */}
            {routineOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.875rem", background: "#111", borderRadius: "0.5rem", border: "1px solid #1e1e1e" }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", alignItems: "start" }}>
                  <div>
                    <label style={{ display: "block", color: "#666", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                      Fecha
                    </label>
                    <input type="date" value={rutDate} onChange={e => setRutDate(e.target.value)}
                      min={card.firstDay} max={card.lastDay}
                      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", padding: "0.45rem 0.75rem", color: "white", fontSize: "0.85rem", outline: "none", colorScheme: "dark" as const }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#666", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
                      Rutina
                    </label>
                    <textarea rows={3} value={rutText} onChange={e => setRutText(e.target.value)}
                      placeholder={"Ej: 15 min precalentamiento\n3 × 1000m al 85%\n15 min vuelta a la calma"}
                      style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.45rem", padding: "0.5rem 0.75rem", color: "white", fontSize: "0.82rem", outline: "none", resize: "vertical", boxSizing: "border-box" as const }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                  <button onClick={() => { onCloseRoutine(); setRutText(""); }}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#555", fontSize: "0.78rem", padding: "0.35rem 0.75rem", cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={async () => { await onAddRoutine(rutDate, rutText); setRutText(""); }}
                    disabled={savingRoutine}
                    style={{ background: savingRoutine ? "#1a1a1a" : "#a3e635", border: "none", borderRadius: "0.4rem", color: savingRoutine ? "#444" : "#000", fontSize: "0.78rem", fontWeight: 700, padding: "0.35rem 0.875rem", cursor: savingRoutine ? "not-allowed" : "pointer" }}>
                    {savingRoutine ? "Guardando..." : "Guardar rutina"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
