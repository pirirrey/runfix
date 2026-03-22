"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { ConfirmModal, ConfirmVariant } from "@/components/shared/ConfirmModal";

type Runner = { id: string; full_name: string | null; email: string };
type Team = { id: string; name: string };
type Membership = { id: string; team_id: string; runner_id: string; coach_notes: string | null };
type CertStatus = "ok" | "warning" | "expired" | "missing";
type PaymentStatus = "ok" | "pending" | "exempt" | "annual";

type RunnerWithTeams = {
  id: string;
  joined_at: string;
  runner: Runner;
  assignedTeams: string[];
  assigning: boolean;
  suspended: boolean;
};

function getCertStatus(certs: { expires_at: string }[]): CertStatus {
  if (!certs || certs.length === 0) return "missing";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Tomar el que vence más tarde
  const latest = certs.reduce((a, b) => a.expires_at > b.expires_at ? a : b);
  const exp = new Date(latest.expires_at + "T00:00:00");
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "warning";
  return "ok";
}

const certBadge: Record<CertStatus, { icon: string; label: string; color: string; bg: string }> = {
  ok:      { icon: "✓", label: "Apto médico vigente",          color: "#a3e635", bg: "rgba(163,230,53,0.12)" },
  warning: { icon: "⏰", label: "Apto médico vence pronto",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  expired: { icon: "⚠", label: "Apto médico vencido",          color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  missing: { icon: "⚠", label: "Sin apto médico cargado",      color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

type NoteState = { text: string; open: boolean; saving: boolean };

export default function CoachRunnersPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [runners, setRunners] = useState<RunnerWithTeams[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [notes, setNotes] = useState<Record<string, NoteState>>({});
  const [certStatuses, setCertStatuses] = useState<Record<string, CertStatus>>({});
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});
  const [suspending, setSuspending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showInviteText, setShowInviteText] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null); // runner id expandido

  type ModalConfig = { title: string; body: string; confirmLabel: string; variant: ConfirmVariant; onConfirm: () => void };
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles").select("invite_code, team_name, full_name").eq("id", user.id).single();
    if (profile?.invite_code) setInviteCode(profile.invite_code);
    if (profile?.team_name || profile?.full_name) setTeamName(profile.team_name || profile.full_name || "");

    const { data: teamsData } = await supabase
      .from("teams").select("id, name").eq("coach_id", user.id).order("name");
    setTeams(teamsData ?? []);

    const { data: coachRunners } = await supabase
      .from("coach_runners")
      .select(`id, joined_at, suspended, runner:profiles!coach_runners_runner_id_fkey(id, full_name, email)`)
      .eq("coach_id", user.id)
      .order("joined_at", { ascending: false }) as { data: { id: string; joined_at: string; suspended: boolean; runner: Runner }[] | null };

    if (!coachRunners) { setLoading(false); return; }

    const runnerIds = coachRunners.map((cr) => cr.runner.id);
    let mem: Membership[] = [];
    if (runnerIds.length > 0) {
      const { data } = await supabase
        .from("team_memberships")
        .select("id, team_id, runner_id, coach_notes")
        .in("runner_id", runnerIds);
      mem = (data ?? []) as Membership[];
    }
    setMemberships(mem);

    const notesInit: Record<string, NoteState> = {};
    for (const m of mem) {
      notesInit[m.id] = { text: m.coach_notes ?? "", open: false, saving: false };
    }
    setNotes(notesInit);

    const withTeams: RunnerWithTeams[] = coachRunners.map((cr) => ({
      ...cr,
      assignedTeams: mem.filter((m) => m.runner_id === cr.runner.id).map((m) => m.team_id),
      assigning: false,
      suspended: cr.suspended ?? false,
    }));
    setRunners(withTeams);

    // Certificados médicos de todos los runners
    if (runnerIds.length > 0) {
      const { data: certs } = await supabase
        .from("medical_certificates")
        .select("runner_id, expires_at")
        .in("runner_id", runnerIds);
      const statuses: Record<string, CertStatus> = {};
      for (const cr of coachRunners) {
        const runnerCerts = (certs ?? []).filter((c) => c.runner_id === cr.runner.id);
        statuses[cr.runner.id] = getCertStatus(runnerCerts);
      }
      setCertStatuses(statuses);
    }

    // Planes de pago y comprobantes del mes en curso
    if (runnerIds.length > 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: payPlans } = await supabase
        .from("runner_payment_plans")
        .select("runner_id, plan_type")
        .eq("coach_id", user.id)
        .in("runner_id", runnerIds);

      const { data: currentReceipts } = await supabase
        .from("payment_receipts")
        .select("runner_id")
        .eq("coach_id", user.id)
        .eq("payment_month", currentMonth)
        .in("runner_id", runnerIds);

      const pStatuses: Record<string, PaymentStatus> = {};
      for (const cr of coachRunners) {
        const plan = payPlans?.find((p) => p.runner_id === cr.runner.id);
        const planType = plan?.plan_type ?? "monthly";
        if (planType === "exempt") {
          pStatuses[cr.runner.id] = "exempt";
        } else if (planType === "annual") {
          pStatuses[cr.runner.id] = "annual";
        } else {
          const hasPaid = currentReceipts?.some((r) => r.runner_id === cr.runner.id);
          pStatuses[cr.runner.id] = hasPaid ? "ok" : "pending";
        }
      }
      setPaymentStatuses(pStatuses);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggleTeam = async (runnerId: string, teamId: string, isAssigned: boolean) => {
    setRunners((prev) => prev.map((r) => r.runner.id === runnerId ? { ...r, assigning: true } : r));
    if (isAssigned) {
      await fetch(`/api/coach/runners/${runnerId}/teams?team_id=${teamId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/coach/runners/${runnerId}/teams`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
    }
    await load();
  };

  const removeRunner = (runnerId: string) => {
    const runner = runners.find((r) => r.runner.id === runnerId);
    const name = runner?.runner.full_name || runner?.runner.email || "este runner";
    setModal({
      title: `Eliminar a ${name}`,
      body:
        `Esta acción quitará al runner de todos tus equipos y bloqueará su acceso a todos tus planes.\n\n` +
        `Solo podrá volver a asociarse mediante una nueva invitación con tu código.`,
      confirmLabel: "Eliminar definitivamente",
      variant: "danger",
      onConfirm: async () => {
        setModal(null);
        if (runner) {
          for (const teamId of runner.assignedTeams) {
            await fetch(`/api/coach/runners/${runnerId}/teams?team_id=${teamId}`, { method: "DELETE" });
          }
        }
        await supabase.from("coach_runners").delete().eq("runner_id", runnerId);
        if (expanded === runnerId) setExpanded(null);
        await load();
      },
    });
  };

  const toggleSuspend = (runnerId: string) => {
    const runner = runners.find((r) => r.runner.id === runnerId);
    if (!runner) return;
    const name = runner.runner.full_name || runner.runner.email || "este runner";
    const isSuspended = runner.suspended;
    setModal({
      title: isSuspended ? `Reactivar a ${name}` : `Suspender a ${name}`,
      body: isSuspended
        ? `Al reactivarlo podrá ver nuevamente los planes de todos tus equipos.`
        : `No podrá ver los planes de ninguno de tus equipos hasta que lo reactives.\n\nPodés reactivarlo en cualquier momento.`,
      confirmLabel: isSuspended ? "Reactivar" : "Suspender",
      variant: isSuspended ? "success" : "warning",
      onConfirm: async () => {
        setModal(null);
        setSuspending(runnerId);
        const res = await fetch(`/api/coach/runners/${runnerId}/suspend`, { method: "PATCH" });
        if (res.ok) {
          const data = await res.json();
          setRunners((prev) => prev.map((r) =>
            r.runner.id === runnerId ? { ...r, suspended: data.suspended } : r
          ));
        }
        setSuspending(null);
      },
    });
  };

  const getMembershipForTeam = (runnerId: string, teamId: string) =>
    memberships.find((m) => m.runner_id === runnerId && m.team_id === teamId);

  const toggleNote = (membershipId: string) => {
    setNotes((prev) => ({ ...prev, [membershipId]: { ...prev[membershipId], open: !prev[membershipId]?.open } }));
  };

  const saveNote = async (membershipId: string, teamId: string) => {
    setNotes((prev) => ({ ...prev, [membershipId]: { ...prev[membershipId], saving: true } }));
    await fetch(`/api/teams/${teamId}/members/${membershipId}/notes`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_notes: notes[membershipId]?.text ?? "" }),
    });
    setNotes((prev) => ({ ...prev, [membershipId]: { ...prev[membershipId], saving: false, open: false } }));
    setMemberships((prev) => prev.map((m) =>
      m.id === membershipId ? { ...m, coach_notes: notes[membershipId]?.text ?? "" } : m
    ));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const APP_URL = "https://trainplan.netlify.app";

  const inviteMessage = `🏃 ¡Hola! Te invito a unirte a *${teamName || "mi Running Team"}* en *Runfix*, la plataforma donde vas a poder ver tus planes de entrenamiento.

👉 Registrate en: ${APP_URL}
🔑 Usá el código: *${inviteCode}*

Una vez registrado, ingresá a "Unirse a un Running Team" y pegá el código para quedar asociado al equipo. ¡Nos vemos en carrera! 💪`;

  const copyInviteMessage = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const regenerateCode = () => {
    setModal({
      title: "Regenerar código de invitación",
      body: "El código actual dejará de funcionar y los runners que aún no se unieron necesitarán el nuevo código.\n\n¿Confirmás la regeneración?",
      confirmLabel: "Regenerar código",
      variant: "warning",
      onConfirm: async () => {
        setModal(null);
        setRegenerating(true);
        const res = await fetch("/api/coach/invite-code", { method: "POST" });
        const data = await res.json();
        if (res.ok && data.invite_code) setInviteCode(data.invite_code);
        setRegenerating(false);
      },
    });
  };

  const filtered = runners.filter((cr) => {
    const q = search.toLowerCase();
    return (
      (cr.runner.full_name ?? "").toLowerCase().includes(q) ||
      cr.runner.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", marginBottom: "0.25rem" }}>🏃 Mis Runners</h1>
        <p style={{ color: "#888", fontSize: "0.9rem" }}>Runners asociados a vos. Asignales equipos e indicaciones.</p>
      </div>

      {/* Código de invitación */}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: "0.75rem", padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Tu código de entrenador</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "#a3e635", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "0.2em", fontFamily: "monospace" }}>
              {inviteCode || "—"}
            </span>
            <button onClick={copyCode} style={{ background: copied ? "rgba(163,230,53,0.15)" : "#1a1a1a", border: copied ? "1px solid #a3e635" : "1px solid #2a2a2a", borderRadius: "0.4rem", color: copied ? "#a3e635" : "#888", padding: "0.3rem 0.75rem", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button onClick={regenerateCode} disabled={regenerating} style={{ background: "transparent", border: "1px solid #222", borderRadius: "0.4rem", color: "#555", padding: "0.3rem 0.75rem", cursor: regenerating ? "not-allowed" : "pointer", fontSize: "0.75rem" }}>
              {regenerating ? "…" : "🔄 Regenerar"}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <span style={{ color: "#444", fontSize: "0.78rem" }}>
            {runners.length} runner{runners.length !== 1 ? "s" : ""} en tu pool
          </span>
          <button
            onClick={() => setShowInviteText((v) => !v)}
            style={{ background: showInviteText ? "rgba(163,230,53,0.1)" : "#1a1a1a", border: showInviteText ? "1px solid rgba(163,230,53,0.35)" : "1px solid #2a2a2a", borderRadius: "0.5rem", color: showInviteText ? "#a3e635" : "#aaa", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            💬 Generar invitación
          </button>
        </div>
      </div>

      {/* Panel de mensaje de invitación */}
      {showInviteText && (
        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.875rem" }}>
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>Mensaje de invitación</p>
              <p style={{ color: "#555", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>Copiá el texto y pegalo en WhatsApp, Telegram o donde prefieras.</p>
            </div>
            <button
              onClick={copyInviteMessage}
              style={{ flexShrink: 0, background: copiedInvite ? "rgba(163,230,53,0.15)" : "#a3e635", border: copiedInvite ? "1px solid #a3e635" : "none", borderRadius: "0.5rem", color: copiedInvite ? "#a3e635" : "#000", padding: "0.5rem 1.25rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, transition: "all 0.2s" }}
            >
              {copiedInvite ? "✓ Copiado" : "📋 Copiar mensaje"}
            </button>
          </div>
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "0.5rem", padding: "1rem 1.25rem" }}>
            <pre style={{ color: "#ccc", fontSize: "0.82rem", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {inviteMessage}
            </pre>
          </div>
        </div>
      )}

      {/* Buscador */}
      {runners.length > 0 && (
        <div style={{ marginBottom: "1rem", position: "relative" }}>
          <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem", pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: "0.5rem", padding: "0.65rem 0.875rem 0.65rem 2.25rem", color: "white", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          )}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ color: "#555", textAlign: "center", padding: "3rem" }}>Cargando...</div>
      ) : runners.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏃</div>
          <p style={{ color: "#888", fontSize: "0.95rem", marginBottom: "0.35rem" }}>Todavía no tenés runners asociados.</p>
          <p style={{ color: "#555", fontSize: "0.82rem" }}>Compartí tu código de entrenador para que puedan unirse.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>No hay runners que coincidan con &quot;{search}&quot;</p>
        </div>
      ) : (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.75rem", overflow: "hidden" }}>
          {/* Encabezado tabla */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 180px", gap: "0", borderBottom: "1px solid #1e1e1e", padding: "0.65rem 1.5rem", background: "#0d0d0d" }}>
            {["Runner", "Equipos", "Indicaciones", "Acciones"].map((h) => (
              <span key={h} style={{ color: "#3a3a3a", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</span>
            ))}
          </div>

          {/* Filas */}
          {filtered.map((cr, idx) => {
            const isExpanded = expanded === cr.runner.id;
            const runnerMems = memberships.filter((m) => m.runner_id === cr.runner.id && cr.assignedTeams.includes(m.team_id));
            const hasAnyNote = runnerMems.some((m) => (m.coach_notes ?? "").trim().length > 0);
            const noteCount = runnerMems.filter((m) => (m.coach_notes ?? "").trim().length > 0).length;
            const certStatus = certStatuses[cr.runner.id];
            const payStatus = paymentStatuses[cr.runner.id];

            return (
              <div key={cr.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #161616" : "none" }}>
                {/* Fila principal */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 130px 180px",
                  gap: "0", padding: "0.875rem 1.5rem", alignItems: "center",
                  background: cr.suspended ? "rgba(180,30,30,0.03)" : isExpanded ? "#141414" : "transparent",
                  transition: "background 0.15s",
                }}>

                  {/* Nombre + email + badges */}
                  <div style={{ minWidth: 0, opacity: cr.suspended ? 0.55 : 1 }}>
                    {/* Nombre como link principal */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <Link
                        href={`/coach/runners/${cr.runner.id}`}
                        style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}
                      >
                        {cr.runner.full_name || "Sin nombre"}
                      </Link>
                      {cr.suspended && (
                        <span style={{ flexShrink: 0, background: "rgba(180,30,30,0.18)", border: "1px solid rgba(180,30,30,0.35)", color: "#c05050", fontSize: "0.57rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "2rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Suspendido
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <p style={{ color: "#444", fontSize: "0.72rem", margin: "0.15rem 0 0.3rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cr.runner.email}
                    </p>

                    {/* Alertas compactas */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                      {certStatus && certStatus !== "ok" && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: certBadge[certStatus].color, fontSize: "0.65rem", fontWeight: 600 }}>
                          <span style={{ fontSize: "0.55rem" }}>{certBadge[certStatus].icon}</span>
                          {certBadge[certStatus].label}
                        </span>
                      )}
                      {payStatus === "pending" && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#fbbf24", fontSize: "0.65rem", fontWeight: 600 }}>
                          <span>💳</span> Sin pago del mes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Equipos (chips toggleables) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", paddingRight: "0.75rem" }}>
                    {teams.length === 0 ? (
                      <span style={{ color: "#333", fontSize: "0.75rem" }}>Sin equipos creados</span>
                    ) : teams.map((team) => {
                      const isAssigned = cr.assignedTeams.includes(team.id);
                      return (
                        <button key={team.id} onClick={() => toggleTeam(cr.runner.id, team.id, isAssigned)} disabled={cr.assigning}
                          style={{ padding: "0.2rem 0.65rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 600, cursor: cr.assigning ? "not-allowed" : "pointer", transition: "all 0.15s", background: isAssigned ? "rgba(163,230,53,0.1)" : "#181818", border: isAssigned ? "1px solid rgba(163,230,53,0.35)" : "1px solid #252525", color: isAssigned ? "#a3e635" : "#444" }}>
                          {isAssigned ? "✓ " : "+ "}{team.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Indicaciones personales */}
                  <div>
                    {cr.assignedTeams.length > 0 ? (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : cr.runner.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.35rem",
                          background: isExpanded ? "rgba(163,230,53,0.1)" : hasAnyNote ? "rgba(163,230,53,0.06)" : "#181818",
                          border: isExpanded ? "1px solid rgba(163,230,53,0.4)" : hasAnyNote ? "1px solid rgba(163,230,53,0.22)" : "1px solid #252525",
                          borderRadius: "0.4rem",
                          color: isExpanded ? "#a3e635" : hasAnyNote ? "#a3e635" : "#444",
                          padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                        }}
                      >
                        <span>📝</span>
                        <span>
                          {isExpanded ? "Cerrar" : hasAnyNote ? `Ver (${noteCount})` : "Agregar"}
                        </span>
                      </button>
                    ) : (
                      <span style={{ color: "#2a2a2a", fontSize: "0.75rem" }}>Sin equipos</span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => toggleSuspend(cr.runner.id)}
                      disabled={suspending === cr.runner.id}
                      title={cr.suspended ? "Reactivar acceso" : "Suspender acceso"}
                      style={{
                        background: cr.suspended ? "rgba(163,230,53,0.07)" : "rgba(220,100,0,0.07)",
                        border: cr.suspended ? "1px solid rgba(163,230,53,0.2)" : "1px solid rgba(200,90,0,0.22)",
                        borderRadius: "0.35rem",
                        color: cr.suspended ? "#a3e635" : "#d97706",
                        padding: "0.3rem 0.65rem",
                        cursor: suspending === cr.runner.id ? "not-allowed" : "pointer",
                        fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap",
                        opacity: suspending === cr.runner.id ? 0.4 : 1,
                      }}
                    >
                      {suspending === cr.runner.id ? "…" : cr.suspended ? "▶ Reactivar" : "⏸ Suspender"}
                    </button>
                    <button
                      onClick={() => removeRunner(cr.runner.id)}
                      style={{ background: "transparent", border: "1px solid #2a1a1a", borderRadius: "0.35rem", color: "#7a3030", padding: "0.3rem 0.65rem", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                {/* Panel expandido de indicaciones */}
                {isExpanded && (
                  <div style={{ background: "#0d0d0d", borderTop: "1px solid #1a1a1a", padding: "1rem 1.25rem" }}>
                    <p style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                      Indicaciones por equipo
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                      {cr.assignedTeams.map((teamId) => {
                        const team = teams.find((t) => t.id === teamId);
                        const mem = getMembershipForTeam(cr.runner.id, teamId);
                        if (!team || !mem) return null;
                        const noteState = notes[mem.id];
                        const hasNote = (mem.coach_notes ?? "").trim().length > 0;

                        return (
                          <div key={teamId} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: hasNote && !noteState?.open ? "0.5rem" : "0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ color: "#666", fontSize: "0.8rem" }}>👥</span>
                                <span style={{ color: "#aaa", fontSize: "0.82rem", fontWeight: 600 }}>{team.name}</span>
                                {hasNote && !noteState?.open && (
                                  <span style={{ background: "rgba(163,230,53,0.1)", color: "#a3e635", fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "2rem" }}>Con indicaciones</span>
                                )}
                              </div>
                              <button onClick={() => toggleNote(mem.id)}
                                style={{ background: noteState?.open ? "rgba(163,230,53,0.1)" : "transparent", border: noteState?.open ? "1px solid rgba(163,230,53,0.3)" : "1px solid #2a2a2a", borderRadius: "0.35rem", color: noteState?.open ? "#a3e635" : "#666", padding: "0.2rem 0.6rem", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                                {noteState?.open ? "Cancelar" : "✏️ Editar indicaciones"}
                              </button>
                            </div>

                            {hasNote && !noteState?.open && (
                              <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{mem.coach_notes}</p>
                            )}

                            {noteState?.open && (
                              <div style={{ marginTop: "0.625rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <textarea
                                  value={noteState.text}
                                  onChange={(e) => setNotes((prev) => ({ ...prev, [mem.id]: { ...prev[mem.id], text: e.target.value } }))}
                                  placeholder={`Indicaciones para ${cr.runner.full_name ?? "este runner"} en ${team.name}…`}
                                  rows={3}
                                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "white", fontSize: "0.85rem", padding: "0.6rem 0.75rem", resize: "vertical", outline: "none", width: "100%", boxSizing: "border-box", lineHeight: 1.5 }}
                                />
                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                  <button onClick={() => toggleNote(mem.id)} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: "0.4rem", color: "#666", padding: "0.3rem 0.75rem", cursor: "pointer", fontSize: "0.78rem" }}>
                                    Cancelar
                                  </button>
                                  <button onClick={() => saveNote(mem.id, teamId)} disabled={noteState.saving}
                                    style={{ background: "#a3e635", border: "none", borderRadius: "0.4rem", color: "#000", padding: "0.3rem 0.75rem", cursor: noteState.saving ? "not-allowed" : "pointer", fontSize: "0.78rem", fontWeight: 700, opacity: noteState.saving ? 0.7 : 1 }}>
                                    {noteState.saving ? "Guardando…" : "Guardar"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>

    {modal && (
      <ConfirmModal
        title={modal.title}
        body={modal.body}
        confirmLabel={modal.confirmLabel}
        variant={modal.variant}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(null)}
      />
    )}
    </>
  );
}
