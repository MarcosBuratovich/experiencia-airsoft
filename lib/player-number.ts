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
 */
export async function numeroDisponible(
  supabase: ServerSupabase,
  numero: string,
  exceptUserId?: string,
): Promise<boolean> {
  const query = supabase
    .from("profiles")
    .select("id")
    .eq("player_number", numero)
    .limit(1);
  if (exceptUserId) query.neq("id", exceptUserId);
  const { data } = await query.maybeSingle();
  return !data;
}
