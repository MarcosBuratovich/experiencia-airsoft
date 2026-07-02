"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PRECIOS_KEYS_ORDER, type PreciosKey } from "@/lib/precios";

import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

const updateSchema = z.object({
  key: z.enum(PRECIOS_KEYS_ORDER as [PreciosKey, ...PreciosKey[]]),
  valor_efectivo: z.number().int().min(0, "El precio debe ser >= 0"),
  valor_transferencia: z.number().int().min(0, "El precio debe ser >= 0"),
});

export type UpdatePrecioResult = { ok: true } | { error: FriendlyError };

export async function updatePrecioAction(
  input: { key: string; valor_efectivo: number; valor_transferencia: number },
): Promise<UpdatePrecioResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return ERR(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  // defensa en profundidad: solo super_admin puede escribir (RLS lo valida también)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return ERR("Solo super_admin puede editar precios");
  }

  const { error } = await supabase
    .from("precios_config")
    .update({
      valor_efectivo: parsed.data.valor_efectivo,
      valor_transferencia: parsed.data.valor_transferencia,
      // `valor` legacy = transferencia (precio de lista) por compatibilidad.
      valor: parsed.data.valor_transferencia,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", parsed.data.key);

  if (error) return ERR(error);

  revalidatePath("/admin/precios");
  return { ok: true };
}
