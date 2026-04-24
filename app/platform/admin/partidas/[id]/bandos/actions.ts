"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const asignacionSchema = z.array(
  z.object({
    user_id: z.uuid(),
    bando: z.enum(["rojo", "amarillo"]).nullable(),
  }),
);

export type GuardarBandosInput = z.infer<typeof asignacionSchema>;

export async function guardarBandosAction(
  partidaId: string,
  asignaciones: GuardarBandosInput,
) {
  const parsed = asignacionSchema.safeParse(asignaciones);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Aplicamos en batch. Usamos update por user_id + partida_id para evitar
  // crear/borrar inscripciones.
  for (const a of parsed.data) {
    const { error } = await supabase
      .from("inscripciones")
      .update({ bando: a.bando })
      .eq("partida_id", partidaId)
      .eq("user_id", a.user_id);
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/partidas/${partidaId}/bandos`);
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  return { ok: true };
}

export async function limpiarBandosAction(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("inscripciones")
    .update({ bando: null })
    .eq("partida_id", partidaId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/partidas/${partidaId}/bandos`);
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  return { ok: true };
}
