import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con Service Role Key — bypassa RLS.
 *
 * Usar SOLO en route handlers / server actions donde:
 *   - la request no viene del propio usuario logueado (ej: ingesta del
 *     sistema local, webhooks externos), o
 *   - necesitamos hacer escrituras que las policies no permitirían a un
 *     admin común (poco frecuente).
 *
 * NUNCA usar en componentes de cliente: la SRK queda expuesta. La env
 * var debe ser server-only (sin `NEXT_PUBLIC_`).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, srk, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
