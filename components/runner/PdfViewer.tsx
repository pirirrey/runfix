"use client";

interface PdfViewerProps {
  signedUrl: string;
  fileName: string;
}

export function PdfViewer({ signedUrl, fileName }: PdfViewerProps) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground truncate">{fileName}</p>
        <a
          href={signedUrl}
          download={fileName}
          className="text-sm text-primary hover:underline shrink-0"
        >
          Descargar PDF
        </a>
      </div>
      <iframe
        src={signedUrl}
        className="w-full flex-1 rounded-lg border"
        style={{ minHeight: "75vh" }}
        title={fileName}
      />
    </div>
  );
}
