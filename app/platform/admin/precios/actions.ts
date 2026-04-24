"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PRECIOS_KEYS_ORDER, type PreciosKey } from "@/lib/precios";

const updateSchema = z.object({
  key: z.enum(PRECIOS_KEYS_ORDER as [PreciosKey, ...PreciosKey[]]),
  valor: z.number().int().min(0, "El precio debe ser >= 0"),
});

export type UpdatePrecioResult = { ok: true } | { error: string };

export async function updatePrecioAction(
  input: { key: string; valor: number },
): Promise<UpdatePrecioResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // defensa en profundidad: solo super_admin puede escribir (RLS lo valida también)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    return { error: "Solo super_admin puede editar precios" };
  }

  const { error } = await supabase
    .from("precios_config")
    .update({
      valor: parsed.data.valor,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", parsed.data.key);

  if (error) return { error: error.message };

  revalidatePath("/admin/precios");
  return { ok: true };
}
