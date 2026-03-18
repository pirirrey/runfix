"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InviteCodeDisplayProps {
  code: string;
}

export function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado al portapapeles");
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Código de invitación</p>
        <Badge variant="secondary" className="text-base font-mono tracking-widest px-3 py-1">
          {code}
        </Badge>
      </div>
      <Button variant="outline" size="sm" onClick={copyCode} className="ml-auto">
        Copiar
      </Button>
    </div>
  );
}
