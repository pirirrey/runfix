"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  fullName: string | null;
  email: string;
}

export function UserMenu({ fullName, email }: UserMenuProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/50">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{fullName ?? email}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
        Salir
      </Button>
    </div>
  );
}
