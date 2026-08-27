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
import { friendlyError, type FriendlyError } from "@/lib/errors";
import { enviarEventoMeta } from "@/lib/meta-capi";
import { aColumnas, leerAtribucion } from "@/lib/atribucion";
import { leerGclid } from "@/lib/gclid";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

export type AnotarmeInput = {
  tipo_jugador: TipoJugador;
  /** Si tipo=alquiler, elige el tier avanzado (marcadora avanzada) en vez del básico. */
  alquiler_avanzado?: boolean;
  alquila_chaleco?: boolean;
  /**
   * Id del evento de analytics, generado por el cliente ANTES de llamar acá.
   * El mismo id se manda al Pixel del navegador y a la API de Conversiones,
   * para que Meta cuente una sola conversión. Opcional: sin él, solo mide el
   * navegador.
   */
  eventId?: string;
};

export async function anotarmeAction(partidaId: string, input: AnotarmeInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  if (input.tipo_jugador !== "alquiler" && input.tipo_jugador !== "byop") {
    return ERR("Elegí alquiler o BYOP");
  }

  const { data: partida } = await supabase
    .from("partidas")
    .select("cupo_max, estado, fecha, hora_inicio, duracion_min")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return ERR("Partida no encontrada");

  if (
    !inscripcionAbierta({
      fecha: partida.fecha,
      hora_inicio: partida.hora_inicio,
      duracion_min: partida.duracion_min,
      estado: partida.estado,
    })
  ) {
    return ERR("La inscripción ya está cerrada");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("socio, socio_desde, cuota_mensual")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return ERR("Perfil no encontrado");

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

  // Alquiler tiene dos tiers excluyentes: básico (marcadora) o avanzado (premium).
  const esAvanzado = tipo_jugador === "alquiler" && !!input.alquiler_avanzado;
  const alquila: AlquilerItems = {
    marcadora: tipo_jugador === "alquiler" && !esAvanzado,
    premium: esAvanzado,
    chaleco: tipo_jugador === "alquiler" && !!input.alquila_chaleco,
  };

  const precios = await getPreciosConfig(supabase);
  // Snapshot: precio_entrada/alquiler = transferencia (lista/referencia);
  // precio_fijo_efectivo = total en efectivo, para que el check-in cobre el
  // medio elegido sin recalcular el beneficio de socio.
  const opts = {
    tipo_jugador,
    socio: aplicaBeneficioSocio,
    alquila,
    precios,
  };
  const transf = calcularPrecioInscripcion(opts, "transferencia");
  const efec = calcularPrecioInscripcion(opts, "efectivo");

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

  const base = {
    partida_id: partidaId,
    user_id: user.id,
    estado,
    posicion_waitlist,
    tipo_jugador,
    alquila_marcadora: alquila.marcadora,
    alquila_premium: alquila.premium,
    alquila_chaleco: alquila.chaleco,
    precio_entrada: transf.entrada,
    precio_alquiler: transf.alquiler,
    precio_fijo_efectivo: efec.total,
    // recargas se asignan despues por el admin durante el check-in
  };

  // De dónde vino esta persona la primera vez (cookie ea_attr), y si llegó
  // por un anuncio de Google Ads (cookie _gcl_aw, independiente: gclid no
  // vive en Atribucion). Si la migración fase 20 todavía no corrió, o
  // alguna cookie está corrupta, la inscripción se crea igual: una reserva
  // jamás se pierde por un tema de analytics.
  const attr = await leerAtribucion();
  const gclid = await leerGclid();
  const extra = { ...(attr ? aColumnas(attr) : {}), ...(gclid ? { gclid } : {}) };
  // Guard por contenido, no por identidad de referencia: `conAttr !== base`
  // se vuelve siempre verdadero si alguien simplifica la línea de abajo a
  // un spread incondicional, y dispararía el reintento ante cualquier
  // error, tenga o no que ver con analytics.
  const hayExtra = Object.keys(extra).length > 0;
  const conAttr = hayExtra ? { ...base, ...extra } : base;

  let { error } = await supabase.from("inscripciones").insert(conAttr);
  if (error && hayExtra) {
    // La causa puede ser cupo lleno o un unique constraint, nada que ver
    // con la atribución; reintentamos sin ella por si acaso lo fuera, sin
    // afirmar que lo es.
    console.error(
      "[anotarmeAction] insert falló, reintento sin atribución por si esa fuera la causa:",
      error.message,
    );
    ({ error } = await supabase.from("inscripciones").insert(base));
  }
  if (error) {
    console.error("[partidas actions] supabase falló:", error);
    return ERR(error);
  }

  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/partidas");

  // Espejo server-side hacia Meta (recupera lo que pierden los bloqueadores
  // y iOS). Solo cuenta como conversión el lugar confirmado: en lista de
  // espera todavía no hay reserva, igual que el value que manda el cliente.
  if (input.eventId && estado === "confirmado") {
    await enviarEventoMeta({
      eventName: "Schedule",
      eventId: input.eventId,
      customData: {
        currency: "ARS",
        value: transf.total,
        content_type: "product",
        content_ids: [partidaId],
      },
    });
  }

  return { ok: true, estado };
}

export async function desanotarmeAction(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { error } = await supabase
    .from("inscripciones")
    .delete()
    .eq("partida_id", partidaId)
    .eq("user_id", user.id);
  if (error) {
    console.error("[partidas actions] supabase falló:", error);
    return ERR(error);
  }

  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/partidas");
  return { ok: true };
}
