"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularPrecioRecargas, getPreciosConfig } from "@/lib/precios";

import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

type Checkin = {
  presente: boolean;
  pago_estado: string | null;
  pago_monto: number | null;
  nota: string | null;
};

export async function upsertCheckinAction(inscripcionId: string, payload: Checkin) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { error } = await supabase.from("checkins").upsert(
    {
      inscripcion_id: inscripcionId,
      admin_id: user.id,
      presente: payload.presente,
      pago_estado: payload.pago_estado,
      pago_monto: payload.pago_monto,
      nota: payload.nota,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "inscripcion_id" },
  );

  if (error) return ERR(error);

  revalidatePath(`/admin/partidas`);
  return { ok: true };
}

/**
 * Actualiza las recargas de munición asignadas a una inscripción y
 * recalcula `precio_recargas` con los precios actuales de precios_config.
 *
 * Solo aplica a inscripciones con tipo_jugador='alquiler'.
 */
export async function actualizarRecargasInscripcionAction(
  inscripcionId: string,
  recargas: { tracer100: number; conv200: number; conv400: number },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  // Validar admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return ERR("No autorizado");
  }

  // Validar y normalizar (0..20)
  const clamp = (n: number) => {
    const v = Math.floor(n);
    if (Number.isNaN(v) || v < 0) return 0;
    if (v > 20) return 20;
    return v;
  };
  const tracer100 = clamp(recargas.tracer100);
  const conv200 = clamp(recargas.conv200);
  const conv400 = clamp(recargas.conv400);

  // Validar que la inscripción es de un alquiler
  const { data: insc } = await supabase
    .from("inscripciones")
    .select("id, tipo_jugador")
    .eq("id", inscripcionId)
    .maybeSingle();
  if (!insc) return ERR("Inscripción no encontrada");
  if (insc.tipo_jugador !== "alquiler") {
    return ERR("Solo se pueden cargar recargas a alquileres");
  }

  // Calcular precio_recargas con los precios vigentes
  const precios = await getPreciosConfig(supabase);
  const precio_recargas = calcularPrecioRecargas(
    { tracer100, conv200, conv400 },
    precios,
  );

  const { error } = await supabase
    .from("inscripciones")
    .update({
      recarga_tracer_100: tracer100,
      recarga_conv_200: conv200,
      recarga_conv_400: conv400,
      precio_recargas,
    })
    .eq("id", inscripcionId);
  if (error) return ERR(error);

  revalidatePath(`/admin/partidas`);
  return { ok: true, precio_recargas };
}
