"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

const pagoSchema = z.object({
  user_id: z.uuid(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  monto: z.number().int().min(0),
  metodo: z.enum(["efectivo", "transferencia"]),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function registrarPagoAction(input: z.infer<typeof pagoSchema>) {
  const parsed = pagoSchema.safeParse(input);
  if (!parsed.success) return ERR("Datos inválidos");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { error } = await supabase.from("socio_pagos").upsert(
    { ...parsed.data, registrado_por: user.id },
    { onConflict: "user_id,periodo" },
  );
  if (error) return ERR(error);

  revalidatePath("/admin/socios");
  return { ok: true };
}

export async function borrarPagoAction(userId: string, periodo: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("socio_pagos")
    .delete()
    .eq("user_id", userId)
    .eq("periodo", periodo);
  if (error) return ERR(error);
  revalidatePath("/admin/socios");
  return { ok: true };
}
