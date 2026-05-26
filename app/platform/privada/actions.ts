"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slotRecurrentePisado } from "@/lib/horarios";
import { modalidadLabel } from "@/lib/format";
import { inicioPartida } from "@/lib/partidas";
import {
  getSlotsEstado,
  SLOTS_PRIVADA,
  SLOT_DURACION_MIN,
} from "@/lib/slots-privada";

const SLOT_HORAS = SLOTS_PRIVADA.map((s) => s.hora) as readonly string[];

const crearSchema = z.object({
  fecha_propuesta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z
    .string()
    .refine((v) => SLOT_HORAS.includes(v), "Horario inválido"),
  cupo_estimado: z.coerce.number().int().min(2, "Mínimo 2").max(60, "Máximo 60"),
  notas: z.string().trim().max(500).optional(),
});

export type SolicitarPrivadaState =
  | { errors?: Partial<Record<keyof z.infer<typeof crearSchema>, string[]>>; message?: string }
  | undefined;

export async function solicitarPrivadaAction(
  _prev: SolicitarPrivadaState,
  formData: FormData,
): Promise<SolicitarPrivadaState> {
  const parsed = crearSchema.safeParse({
    fecha_propuesta: formData.get("fecha_propuesta"),
    hora_inicio: formData.get("hora_inicio"),
    cupo_estimado: formData.get("cupo_estimado"),
    notas: formData.get("notas") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const v = parsed.data;

  // La fecha no puede ser en el pasado
  const inicio = inicioPartida(v.fecha_propuesta, v.hora_inicio.slice(0, 5));
  if (inicio.getTime() <= Date.now()) {
    return { errors: { fecha_propuesta: ["La fecha/hora tiene que ser futura"] } };
  }

  // No puede caer en un horario recurrente (los slots reservados para públicas)
  const slot = slotRecurrentePisado(v.fecha_propuesta, v.hora_inicio.slice(0, 5));
  if (slot) {
    return {
      message: `Ese slot está reservado para partidas públicas (${slot.label}). Pedile a un admin que lo habilite si lo necesitás.`,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  // Verificar que el slot siga libre (no se haya pisado entre que vimos el calendario y mandamos).
  const estados = await getSlotsEstado(supabase, [v.fecha_propuesta]);
  const estado = estados.get(`${v.fecha_propuesta}|${v.hora_inicio}`);
  if (estado && estado !== "disponible") {
    return {
      message:
        estado === "pendiente"
          ? "Alguien acaba de pedir ese slot. Elegí otro."
          : estado === "publica"
            ? "Ya hay una partida pública en ese rango."
            : estado === "aprobada"
              ? "Ese slot ya tiene una privada confirmada."
              : "Ese slot no está disponible.",
    };
  }

  const { error } = await supabase.from("solicitudes_privada").insert({
    user_id: user.id,
    fecha_propuesta: v.fecha_propuesta,
    hora_inicio: v.hora_inicio,
    duracion_min: SLOT_DURACION_MIN,
    cupo_estimado: v.cupo_estimado,
    modalidad: "dinamica",
    notas: v.notas || null,
  });
  if (error) return { message: error.message };

  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/solicitudes");
  revalidatePath("/privada/solicitar");
  redirect("/mis-solicitudes?ok=1");
}

export async function cancelarPrivadaAction(solicitudId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("solicitudes_privada")
    .update({ estado: "cancelada", resolved_at: new Date().toISOString() })
    .eq("id", solicitudId)
    .eq("user_id", user.id)
    .eq("estado", "pendiente");
  if (error) return { error: error.message };

  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/solicitudes");
  return { ok: true };
}

async function assertAdmin() {
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
  return { supabase, userId: user.id };
}

export async function aprobarPrivadaAction(
  solicitudId: string,
  respuesta?: string,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, userId } = ctx;

  const { data: solicitud } = await supabase
    .from("solicitudes_privada")
    .select(
      "id, user_id, fecha_propuesta, hora_inicio, duracion_min, cupo_estimado, modalidad, notas, estado",
    )
    .eq("id", solicitudId)
    .maybeSingle();
  if (!solicitud) return { error: "Solicitud no encontrada" };
  if (solicitud.estado !== "pendiente") return { error: "Ya fue resuelta" };

  const private_token = randomBytes(16).toString("hex");

  const { data: partida, error: partidaErr } = await supabase
    .from("partidas")
    .insert({
      titulo: `${modalidadLabel(solicitud.modalidad)} privada`,
      fecha: solicitud.fecha_propuesta,
      hora_inicio: solicitud.hora_inicio,
      duracion_min: solicitud.duracion_min,
      modalidad: solicitud.modalidad,
      cupo_max: solicitud.cupo_estimado,
      visibilidad: "privada",
      private_token,
      precio: 0,
      notas: solicitud.notas,
      creado_por: userId,
    })
    .select("id, private_token")
    .single();
  if (partidaErr || !partida) return { error: partidaErr?.message ?? "No se pudo crear la partida" };

  const { error: updErr } = await supabase
    .from("solicitudes_privada")
    .update({
      estado: "aprobada",
      partida_id: partida.id,
      respuesta_admin: respuesta?.trim() || null,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", solicitudId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/admin/solicitudes");
  revalidatePath("/mis-solicitudes");
  return { ok: true, partidaId: partida.id, token: partida.private_token };
}

export async function rechazarPrivadaAction(
  solicitudId: string,
  respuesta?: string,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from("solicitudes_privada")
    .update({
      estado: "rechazada",
      respuesta_admin: respuesta?.trim() || null,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");
  if (error) return { error: error.message };

  revalidatePath("/admin/solicitudes");
  revalidatePath("/mis-solicitudes");
  return { ok: true };
}
