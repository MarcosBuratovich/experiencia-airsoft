"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estadoEfectivo, inicioPartida } from "@/lib/partidas";
import { modalidadLabel } from "@/lib/format";

import {
  actionError,
  actionFieldErrors,
  friendlyError,
  type ActionErrorState,
  type FriendlyError,
} from "@/lib/errors";

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
    .select("id, fecha, hora_inicio, duracion_min, estado, visibilidad, cupo_max")
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

// =========================================================================
// Acciones del calendario admin (sin redirect: el admin se queda en la vista)
// =========================================================================

const editarSchema = z.object({
  id: z.uuid("ID inválido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracion_min: z.coerce
    .number()
    .int()
    .min(60, "Mínimo 60 min")
    .max(480, "Máximo 480 min"),
  cupo_max: z.coerce.number().int().positive("El cupo debe ser mayor a 0"),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  notas: z.string().trim().max(500).optional(),
});

export type EditarPartidaState = ActionErrorState | { ok: true } | undefined;

/** Edita los datos de una partida existente (no toca visibilidad/token/organizador). */
export async function editarPartidaAction(
  _prev: EditarPartidaState,
  formData: FormData,
): Promise<EditarPartidaState> {
  const parsed = editarSchema.safeParse({
    id: formData.get("id"),
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    duracion_min: formData.get("duracion_min"),
    cupo_max: formData.get("cupo_max"),
    modalidad: formData.get("modalidad"),
    notas: formData.get("notas") || undefined,
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const ctx = await chequearAdminYPartida(v.id);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  if (partida.estado === "cancelada") {
    return actionError("No se puede editar una partida cancelada");
  }
  const fx = estadoEfectivo(partida);
  if (fx === "pasada" || fx === "en_curso") {
    return actionError("No se puede editar una partida que ya empezó o terminó");
  }

  const inicio = inicioPartida(v.fecha, v.hora_inicio);
  if (inicio.getTime() <= Date.now()) {
    return actionFieldErrors({ fecha: ["La fecha/hora tiene que ser futura"] });
  }

  // No se puede bajar el cupo por debajo de los ya confirmados.
  const { count } = await supabase
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("partida_id", v.id)
    .eq("estado", "confirmado");
  if ((count ?? 0) > v.cupo_max) {
    return actionFieldErrors({
      cupo_max: [`Ya hay ${count} confirmados; no podés bajar el cupo por debajo`],
    });
  }

  // titulo/visibilidad/private_token/organizador_id NO se tocan (preservan
  // títulos manuales e invariantes de privadas). No hay columna updated_at.
  const { error } = await supabase
    .from("partidas")
    .update({
      fecha: v.fecha,
      hora_inicio: `${v.hora_inicio}:00`,
      duracion_min: v.duracion_min,
      cupo_max: v.cupo_max,
      modalidad: v.modalidad,
      notas: v.notas || null,
    })
    .eq("id", v.id);
  if (error) {
    console.error("[editarPartidaAction] update falló:", error);
    return actionError(error);
  }

  revalidatePath("/admin/calendario");
  revalidatePath("/admin/partidas");
  revalidatePath(`/admin/partidas/${v.id}/checkin`);
  revalidatePath("/partidas");
  return { ok: true };
}

const crearCalendarioSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  visibilidad: z.enum(["publica", "privada"]),
  cupo_max: z.coerce.number().int().positive("El cupo debe ser mayor a 0"),
  duracion_min: z.coerce
    .number()
    .int()
    .min(60, "Mínimo 60 min")
    .max(480, "Máximo 480 min"),
  titulo: z.string().trim().max(80).optional(),
  notas: z.string().trim().max(500).optional(),
});

export type CrearCalendarioState =
  | ActionErrorState
  | { ok: true; partidaId: string }
  | undefined;

/** Crea una partida desde el calendario (hora/duración libres, sin redirect). */
export async function crearPartidaCalendarioAction(
  _prev: CrearCalendarioState,
  formData: FormData,
): Promise<CrearCalendarioState> {
  const parsed = crearCalendarioSchema.safeParse({
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    modalidad: formData.get("modalidad"),
    visibilidad: formData.get("visibilidad"),
    cupo_max: formData.get("cupo_max"),
    duracion_min: formData.get("duracion_min"),
    titulo: formData.get("titulo") || undefined,
    notas: formData.get("notas") || undefined,
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const inicio = inicioPartida(v.fecha, v.hora_inicio);
  if (inicio.getTime() <= Date.now()) {
    return actionFieldErrors({ fecha: ["La fecha/hora tiene que ser futura"] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionError("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return actionError("No autorizado");
  }

  const private_token =
    v.visibilidad === "privada" ? randomBytes(16).toString("hex") : null;

  const { data: partida, error } = await supabase
    .from("partidas")
    .insert({
      titulo: v.titulo || modalidadLabel(v.modalidad),
      fecha: v.fecha,
      hora_inicio: `${v.hora_inicio}:00`,
      modalidad: v.modalidad,
      visibilidad: v.visibilidad,
      cupo_max: v.cupo_max,
      duracion_min: v.duracion_min,
      notas: v.notas || null,
      precio: 0,
      private_token,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !partida) {
    console.error("[crearPartidaCalendarioAction] insert falló:", error);
    return actionError(error ?? "No se pudo crear la partida");
  }

  revalidatePath("/admin/calendario");
  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  return { ok: true, partidaId: partida.id };
}

/** Elimina una partida futura desde el calendario (sin redirect). */
export async function eliminarPartidaCalendarioAction(partidaId: string) {
  const ctx = await chequearAdminYPartida(partidaId);
  if ("error" in ctx) return ctx;
  const { supabase, partida } = ctx;

  const inicio = inicioPartida(partida.fecha, partida.hora_inicio);
  if (Date.now() >= inicio.getTime()) {
    return ERR("No se puede eliminar una partida que ya empezó");
  }

  const { error } = await supabase.from("partidas").delete().eq("id", partidaId);
  if (error) return ERR(error);

  revalidatePath("/admin/calendario");
  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  return { ok: true };
}
