"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "#1e2431",
        border: "none",
        borderRadius: "0.5rem",
        color: "white",
        fontSize: "0.9rem",
        fontWeight: 700,
        padding: "0.75rem 2rem",
        cursor: "pointer",
      }}
    >
      🖨 Imprimir / Guardar como PDF
    </button>
  );
}
