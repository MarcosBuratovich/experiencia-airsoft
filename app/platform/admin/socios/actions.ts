"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const pagoSchema = z.object({
  user_id: z.uuid(),
  periodo: z.string().regex(/^\d{4}-\d{2}$/),
  monto: z.number().int().min(0),
  metodo: z.enum(["efectivo", "transferencia"]),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function registrarPagoAction(input: z.infer<typeof pagoSchema>) {
  const parsed = pagoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("socio_pagos").upsert(
    { ...parsed.data, registrado_por: user.id },
    { onConflict: "user_id,periodo" },
  );
  if (error) return { error: error.message };

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
  if (error) return { error: error.message };
  revalidatePath("/admin/socios");
  return { ok: true };
}
