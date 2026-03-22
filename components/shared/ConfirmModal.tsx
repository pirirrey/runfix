"use client";

export type ConfirmVariant = "danger" | "warning" | "success";

interface ConfirmModalProps {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles: Record<ConfirmVariant, { border: string; confirmBg: string; confirmColor: string; icon: string }> = {
  danger:  { border: "rgba(200,50,50,0.3)",   confirmBg: "#c03030", confirmColor: "#fff",     icon: "⚠" },
  warning: { border: "rgba(220,130,0,0.3)",   confirmBg: "#d47a00", confirmColor: "#fff",     icon: "⏸" },
  success: { border: "rgba(163,230,53,0.3)",  confirmBg: "#a3e635", confirmColor: "#000",     icon: "▶" },
};

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const v = variantStyles[variant];

  return (
    /* Backdrop */
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(2px)",
      }}
    >
      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414",
          border: `1px solid ${v.border}`,
          borderRadius: "0.875rem",
          padding: "1.75rem",
          maxWidth: "28rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Título */}
        <h3 style={{ color: "white", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
          {v.icon}&nbsp; {title}
        </h3>

        {/* Cuerpo */}
        <p style={{
          color: "#999", fontSize: "0.875rem", lineHeight: 1.65,
          margin: 0, whiteSpace: "pre-wrap",
        }}>
          {body}
        </p>

        {/* Botones */}
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent", border: "1px solid #2a2a2a",
              borderRadius: "0.45rem", color: "#666",
              padding: "0.5rem 1.1rem", fontSize: "0.85rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: v.confirmBg, border: "none",
              borderRadius: "0.45rem", color: v.confirmColor,
              padding: "0.5rem 1.25rem", fontSize: "0.85rem",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
