import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — usa la service role key.
 * Bypasa RLS completamente. Solo usar en rutas de API server-side.
 * NUNCA exponer al cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
