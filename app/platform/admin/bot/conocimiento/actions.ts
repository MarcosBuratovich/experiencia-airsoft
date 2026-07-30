"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

const idSchema = z.uuid("ID inválido");
const activoSchema = z.boolean("El estado tiene que ser verdadero o falso");

const entradaSchema = z.object({
  id: z.uuid("ID inválido").nullable(),
  titulo: z
    .string("El título tiene que ser texto")
    .trim()
    .min(3, "El título es muy corto")
    .max(120, "El título es muy largo (máximo 120 caracteres)"),
  contenido: z
    .string("La respuesta tiene que ser texto")
    .trim()
    .min(5, "La respuesta es muy corta")
    .max(4000, "La respuesta es muy larga (máximo 4000 caracteres)"),
  orden: z
    .number("El orden tiene que ser un número")
    .int("El orden tiene que ser un número entero")
    .min(0, "El orden no puede ser negativo")
    .max(999, "El orden es demasiado alto"),
});

export type ResultadoAccion = { ok: true } | { error: FriendlyError };

/** Solo admins tocan la base: es lo que el bot le dice a los clientes. */
async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.role !== "admin" && perfil?.role !== "super_admin") {
    return ERR("Solo un admin puede editar la base");
  }
  return { supabase };
}

export async function guardarEntradaAction(input: {
  id: string | null;
  titulo: string;
  contenido: string;
  orden: number;
}): Promise<ResultadoAccion> {
  const parsed = entradaSchema.safeParse(input);
  if (!parsed.success) return ERR(parsed.error.issues[0]?.message);

  const ctx = await exigirAdmin();
  if ("error" in ctx) return ctx;

  const { id, ...campos } = parsed.data;
  const { error } = id
    ? await ctx.supabase
        .from("bot_conocimiento")
        .update({ ...campos, updated_at: new Date().toISOString() })
        .eq("id", id)
    : await ctx.supabase.from("bot_conocimiento").insert(campos);

  if (error) return ERR(error);
  // Path con prefijo /platform: es el destino real del rewrite de host que
  // hace proxy.ts (ver revalidatePath.md — bajo rewrites hay que pasar el
  // path destino, no el que ve el navegador). Hoy es un no-op: esta ruta lee
  // cookies (createClient) así que no hay nada cacheado que invalidar, y lo
  // que refresca la pantalla es el router.refresh() del client component. Se
  // deja bien apuntado para no dejar una trampa latente si el día de mañana
  // se agrega caching real acá.
  revalidatePath("/platform/admin/bot/conocimiento");
  return { ok: true };
}

export async function alternarActivaAction(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  if (!idSchema.safeParse(id).success) return ERR("ID inválido");
  const activoCheck = activoSchema.safeParse(activo);
  if (!activoCheck.success) return ERR(activoCheck.error.issues[0]?.message);

  const ctx = await exigirAdmin();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("bot_conocimiento")
    .update({ activo: activoCheck.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return ERR(error);
  revalidatePath("/platform/admin/bot/conocimiento");
  return { ok: true };
}

export async function borrarEntradaAction(id: string): Promise<ResultadoAccion> {
  if (!idSchema.safeParse(id).success) return ERR("ID inválido");

  const ctx = await exigirAdmin();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase.from("bot_conocimiento").delete().eq("id", id);
  if (error) return ERR(error);
  revalidatePath("/platform/admin/bot/conocimiento");
  return { ok: true };
}
