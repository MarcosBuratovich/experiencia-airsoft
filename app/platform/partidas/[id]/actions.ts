"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calcularPrecioInscripcion,
  getPreciosConfig,
  type AlquilerItems,
  type TipoJugador,
} from "@/lib/precios";
import { inscripcionAbierta } from "@/lib/partidas";
import { computarEstadoCuota } from "@/lib/socios";

export type AnotarmeInput = {
  tipo_jugador: TipoJugador;
  alquila_chaleco?: boolean;
};

export async function anotarmeAction(partidaId: string, input: AnotarmeInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (input.tipo_jugador !== "alquiler" && input.tipo_jugador !== "byop") {
    return { error: "Elegí alquiler o BYOP" };
  }

  const { data: partida } = await supabase
    .from("partidas")
    .select("cupo_max, estado, fecha, hora_inicio, duracion_min")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return { error: "Partida no encontrada" };

  if (
    !inscripcionAbierta({
      fecha: partida.fecha,
      hora_inicio: partida.hora_inicio,
      duracion_min: partida.duracion_min,
      estado: partida.estado,
    })
  ) {
    return { error: "La inscripción ya está cerrada" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("socio, socio_desde, cuota_mensual")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Perfil no encontrado" };

  const tipo_jugador = input.tipo_jugador;

  // Calcular estado de cuota: socio con deuda pierde el beneficio de
  // entrada gratis (paga como cualquier no-socio).
  const { data: pagos } = await supabase
    .from("socio_pagos")
    .select("periodo")
    .eq("user_id", user.id);
  const cuota = computarEstadoCuota(
    {
      socio: !!profile.socio,
      socio_desde: profile.socio_desde,
      cuota_mensual: profile.cuota_mensual ?? 0,
    },
    pagos ?? [],
  );
  const aplicaBeneficioSocio = cuota.esSocio && cuota.alDia;

  // Alquiler tiene un único tier de equipo: si tipo=alquiler, marcadora=true.
  const alquila: AlquilerItems = {
    marcadora: tipo_jugador === "alquiler",
    chaleco: tipo_jugador === "alquiler" && !!input.alquila_chaleco,
  };

  const precios = await getPreciosConfig(supabase);
  const { entrada, alquiler } = calcularPrecioInscripcion({
    tipo_jugador,
    socio: aplicaBeneficioSocio,
    alquila,
    precios,
  });

  const { count } = await supabase
    .from("inscripciones")
    .select("*", { count: "exact", head: true })
    .eq("partida_id", partidaId)
    .eq("estado", "confirmado");

  const estado = (count ?? 0) >= partida.cupo_max ? "waitlist" : "confirmado";

  let posicion_waitlist: number | null = null;
  if (estado === "waitlist") {
    const { count: wlCount } = await supabase
      .from("inscripciones")
      .select("*", { count: "exact", head: true })
      .eq("partida_id", partidaId)
      .eq("estado", "waitlist");
    posicion_waitlist = (wlCount ?? 0) + 1;
  }

  const { error } = await supabase.from("inscripciones").insert({
    partida_id: partidaId,
    user_id: user.id,
    estado,
    posicion_waitlist,
    tipo_jugador,
    alquila_marcadora: alquila.marcadora,
    alquila_chaleco: alquila.chaleco,
    precio_entrada: entrada,
    precio_alquiler: alquiler,
    // recargas se asignan despues por el admin durante el check-in
  });
  if (error) return { error: error.message };

  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/partidas");
  return { ok: true, estado };
}

export async function desanotarmeAction(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("inscripciones")
    .delete()
    .eq("partida_id", partidaId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/partidas");
  return { ok: true };
}
