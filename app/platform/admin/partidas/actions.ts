"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inicioPartida } from "@/lib/partidas";

import { friendlyError, type FriendlyError } from "@/lib/errors";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

async function chequearAdminYPartida(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return ERR("No autorizado");
  }

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, estado")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return ERR("Partida no encontrada");

  return { supabase, partida };
}

export async function cancelarPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  if (partida.estado === "cancelada") return ERR("Ya estaba cancelada");

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "cancelada" })
    .eq("id", partidaId);
  if (error) return ERR(error);

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function cerrarInscripcionPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  if (partida.estado !== "abierta") {
    return ERR("La inscripción ya no está abierta");
  }

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "cerrada" })
    .eq("id", partidaId);
  if (error) return ERR(error);

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function reabrirInscripcionPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  if (partida.estado !== "cerrada") {
    return ERR("Sólo se puede reabrir una inscripción cerrada");
  }

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "abierta" })
    .eq("id", partidaId);
  if (error) return ERR(error);

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function eliminarPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  // Solo se permite eliminar si la partida todavía no empezó
  const inicio = inicioPartida(partida.fecha, partida.hora_inicio);
  if (Date.now() >= inicio.getTime()) {
    return ERR("No se puede eliminar una partida que ya empezó");
  }

  const { error } = await supabase.from("partidas").delete().eq("id", partidaId);
  if (error) return ERR(error);

  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  redirect("/admin/partidas");
}
