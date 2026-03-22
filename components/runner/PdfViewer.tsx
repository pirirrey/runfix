"use client";

import { useState } from "react";

interface PdfViewerProps {
  signedUrl: string;
  fileName: string;
}

export function PdfViewer({ signedUrl, fileName }: PdfViewerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Acciones */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "#a3e635", color: "#000",
            borderRadius: "0.5rem", padding: "0.6rem 1.25rem",
            fontWeight: 700, fontSize: "0.875rem", textDecoration: "none",
          }}
        >
          ↗ Abrir PDF
        </a>
        <a
          href={signedUrl}
          download={fileName}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa",
            borderRadius: "0.5rem", padding: "0.6rem 1.25rem",
            fontWeight: 600, fontSize: "0.875rem", textDecoration: "none",
          }}
        >
          ⬇ Descargar
        </a>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: expanded ? "rgba(163,230,53,0.08)" : "transparent",
            border: expanded ? "1px solid rgba(163,230,53,0.3)" : "1px solid #2a2a2a",
            color: expanded ? "#a3e635" : "#666",
            borderRadius: "0.5rem", padding: "0.6rem 1.25rem",
            fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
          }}
        >
          {expanded ? "▲ Ocultar vista previa" : "▼ Ver vista previa"}
        </button>
      </div>

      {/* Preview compacta */}
      {expanded && (
        <div style={{
          border: "1px solid #1e1e1e", borderRadius: "0.75rem",
          overflow: "hidden", background: "#111",
        }}>
          <iframe
            src={signedUrl}
            style={{ width: "100%", height: "500px", display: "block", border: "none" }}
            title={fileName}
          />
        </div>
      )}
    </div>
  );
}
