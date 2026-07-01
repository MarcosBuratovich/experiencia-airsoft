import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const PLAYER_NUMBER_REGEX = /^\d{6}$/;

export type ValidacionResult =
  | { ok: true }
  | { ok: false; error: string };

export function validarFormato(numero: string): ValidacionResult {
  if (!numero) return { ok: false, error: "Ingresá tu número de jugador" };
  if (!PLAYER_NUMBER_REGEX.test(numero)) {
    return { ok: false, error: "Tienen que ser exactamente 6 dígitos" };
  }
  return { ok: true };
}

/**
 * Valida que el número no esté en uso por otro usuario.
 * `exceptUserId` permite editar el número del propio usuario sin colisionar
 * consigo mismo (caso típico: admin reasigna o user lo cambia desde su perfil).
 *
 * IMPORTANTE: usa la vista `profiles_publicos` en vez de `profiles`. La RLS
 * de profiles oculta filas ajenas (incluso para usuarios anónimos en signup),
 * lo que haría que esta validación siempre devuelva true y el insert
 * explote con "database error saving new user" al chocar contra el unique
 * index. profiles_publicos es security_invoker=false y expone player_number.
 */
export async function numeroDisponible(
  supabase: ServerSupabase,
  numero: string,
  exceptUserId?: string,
): Promise<boolean> {
  const query = supabase
    .from("profiles_publicos")
    .select("id")
    .eq("player_number", numero)
    .limit(1);
  if (exceptUserId) query.neq("id", exceptUserId);
  const { data } = await query.maybeSingle();
  return !data;
}

/** Devuelve un número de 6 dígitos libre (o null si no encontró en N intentos). */
export async function sugerirNumeroLibre(
  supabase: ServerSupabase,
  intentos = 12,
): Promise<string | null> {
  for (let i = 0; i < intentos; i++) {
    const n = String(Math.floor(100000 + Math.random() * 900000));
    if (await numeroDisponible(supabase, n)) return n;
  }
  return null;
}
