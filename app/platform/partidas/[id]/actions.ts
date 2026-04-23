"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function anotarmeAction(partidaId: string) {
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
