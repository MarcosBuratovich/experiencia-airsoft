"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calcularPrecioInscripcion,
  getPreciosConfig,
  type AlquilerItems,
  type TipoJugador,
} from "@/lib/precios";

export type AnotarmeInput = {
  alquila_marcadora?: boolean;
  alquila_premium?: boolean;
  alquila_chaleco?: boolean;
};

export async function anotarmeAction(partidaId: string, input: AnotarmeInput = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: partida } = await supabase
    .from("partidas")
    .select("cupo_max, estado")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return { error: "Partida no encontrada" };
  if (partida.estado !== "abierta") return { error: "No se acepta inscripción" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tipo_jugador, socio")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Perfil no encontrado" };

  const tipo_jugador = (profile.tipo_jugador ?? "byop") as TipoJugador;
  const socio = !!profile.socio;

  // Si es alquiler, validar que tenga al menos una marcadora y no ambas.
  const alquila: AlquilerItems = {
    marcadora: tipo_jugador === "alquiler" && !!input.alquila_marcadora,
    premium: tipo_jugador === "alquiler" && !!input.alquila_premium,
    chaleco: tipo_jugador === "alquiler" && !!input.alquila_chaleco,
  };
  if (tipo_jugador === "alquiler") {
    if (alquila.marcadora && alquila.premium) {
      return { error: "Elegí marcadora común O premium, no ambas." };
    }
    if (!alquila.marcadora && !alquila.premium) {
      return { error: "Tenés que alquilar una marcadora." };
    }
  }

  const precios = await getPreciosConfig(supabase);
  const { entrada, alquiler } = calcularPrecioInscripcion({
    tipo_jugador,
    socio,
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
    alquila_marcadora: alquila.marcadora,
    alquila_premium: alquila.premium,
    alquila_chaleco: alquila.chaleco,
    precio_entrada: entrada,
    precio_alquiler: alquiler,
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
