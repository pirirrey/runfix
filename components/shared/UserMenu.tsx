"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
      padding: "0.75rem",
      borderRadius: "0.625rem",
      background: "#161616",
      border: "1px solid #222",
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fullName ?? email}
        </p>
        <p style={{ fontSize: "0.7rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {email}
        </p>
      </div>
      <button
        onClick={signOut}
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "1px solid #333",
          borderRadius: "0.375rem",
          padding: "0.3rem 0.6rem",
          fontSize: "0.75rem",
          color: "#888",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        Salir
      </button>
    </div>
  );
}
