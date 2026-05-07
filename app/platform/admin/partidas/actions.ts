"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function chequearAdminYPartida(partidaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { error: "No autorizado" as const };
  }

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, estado")
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) return { error: "Partida no encontrada" as const };

  return { supabase, partida };
}

export async function cancelarPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, partida } = ctx;

  if (partida.estado === "cancelada") return { error: "Ya estaba cancelada" };

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "cancelada" })
    .eq("id", partidaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function cerrarInscripcionPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, partida } = ctx;

  if (partida.estado !== "abierta") {
    return { error: "La inscripción ya no está abierta" };
  }

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "cerrada" })
    .eq("id", partidaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function reabrirInscripcionPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, partida } = ctx;

  if (partida.estado !== "cerrada") {
    return { error: "Sólo se puede reabrir una inscripción cerrada" };
  }

  const { error } = await supabase
    .from("partidas")
    .update({ estado: "abierta" })
    .eq("id", partidaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${partidaId}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

export async function eliminarPartidaAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, partida } = ctx;

  // Solo se permite eliminar si la partida todavía no empezó
  const inicio = new Date(`${partida.fecha}T${partida.hora_inicio}`);
  if (Date.now() >= inicio.getTime()) {
    return { error: "No se puede eliminar una partida que ya empezó" };
  }

  const { error } = await supabase.from("partidas").delete().eq("id", partidaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  redirect("/admin/partidas");
}
