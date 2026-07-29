"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return ERR("No autorizado");
  }
  return { supabase };
}

/** Fija el monto real cobrado de una privada (pisa el estimado). */
export async function guardarValorCerradoAction(
  solicitudId: string,
  valor: number | null,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;

  if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 100_000_000)) {
    return ERR("Monto inválido");
  }

  const { error } = await ctx.supabase
    .from("solicitudes_privada")
    .update({ valor_cerrado: valor === null ? null : Math.round(valor) })
    .eq("id", solicitudId);
  if (error) return ERR(error);

  revalidatePath("/admin/conversiones");
  return { ok: true };
}

/**
 * Marca conversiones como exportadas, para no volver a subirlas.
 * Se llama después de descargar el CSV.
 */
export async function marcarExportadasAction(ids: string[]) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  if (!ids.length) return { ok: true };

  const { error } = await ctx.supabase
    .from("solicitudes_privada")
    .update({ conversion_exportada_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return ERR(error);

  revalidatePath("/admin/conversiones");
  return { ok: true };
}

/** Deshace la marca de exportada (por si hubo que rehacer la subida). */
export async function desmarcarExportadaAction(solicitudId: string) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("solicitudes_privada")
    .update({ conversion_exportada_at: null })
    .eq("id", solicitudId);
  if (error) return ERR(error);

  revalidatePath("/admin/conversiones");
  return { ok: true };
}
