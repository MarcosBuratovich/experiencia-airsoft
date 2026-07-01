"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slotRecurrentePisado } from "@/lib/horarios";
import { formatFechaLarga, modalidadLabel } from "@/lib/format";
import { inicioPartida } from "@/lib/partidas";
import {
  getSlotsEstado,
  SLOTS_PRIVADA,
  duracionDeSlot,
} from "@/lib/slots-privada";
import {
  actionError,
  actionFieldErrors,
  friendlyError,
  type ActionErrorState,
  type FriendlyError,
} from "@/lib/errors";
import { WHATSAPP_URL } from "@/app/_components/site-constants";

const ERR = (input: unknown): { error: FriendlyError } => ({
  error: friendlyError(input),
});

const SLOT_HORAS = SLOTS_PRIVADA.map((s) => s.hora) as readonly string[];

// Cupo mínimo/máximo de la PARTIDA privada (no se exporta porque este
// archivo es "use server" y Next solo permite exportar async functions).
// El form client tiene su propia copia de estas constantes — si las
// cambiás acá, cambialas también en calendario-privada.tsx.
const PRIVADA_CUPO_MIN = 10;
const PRIVADA_CUPO_MAX = 60;

const crearSchema = z.object({
  fecha_propuesta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z
    .string()
    .refine((v) => SLOT_HORAS.includes(v), "Horario inválido"),
  cupo_estimado: z.coerce
    .number()
    .int()
    .min(PRIVADA_CUPO_MIN, `Mínimo ${PRIVADA_CUPO_MIN} personas para armar una privada`)
    .max(PRIVADA_CUPO_MAX, `Máximo ${PRIVADA_CUPO_MAX}`),
  notas: z.string().trim().max(500).optional(),
});

export type SolicitarPrivadaState =
  | ActionErrorState
  | { ok: true; hrefWA: string }
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
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const v = parsed.data;

  // La fecha no puede ser en el pasado
  const inicio = inicioPartida(v.fecha_propuesta, v.hora_inicio.slice(0, 5));
  if (inicio.getTime() <= Date.now()) {
    return actionFieldErrors({ fecha_propuesta: ["La fecha/hora tiene que ser futura"] });
  }

  // No puede caer en un horario recurrente (los slots reservados para públicas)
  const slot = slotRecurrentePisado(v.fecha_propuesta, v.hora_inicio.slice(0, 5));
  if (slot) {
    return actionError(
      `Ese slot está reservado para partidas públicas (${slot.label}). Pedile a un admin que lo habilite si lo necesitás.`,
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionError("No autenticado");

  // Verificar que el slot siga libre (no se haya pisado entre que vimos el calendario y mandamos).
  const estados = await getSlotsEstado(supabase, [v.fecha_propuesta]);
  const estado = estados.get(`${v.fecha_propuesta}|${v.hora_inicio}`);
  if (estado && estado !== "disponible") {
    return actionError(
      estado === "pendiente"
        ? "Alguien acaba de pedir ese slot. Elegí otro."
        : estado === "publica"
          ? "Ya hay una partida pública en ese rango."
          : estado === "aprobada"
            ? "Ese slot ya tiene una privada confirmada."
            : "Ese slot no está disponible.",
    );
  }

  const { error } = await supabase.from("solicitudes_privada").insert({
    user_id: user.id,
    fecha_propuesta: v.fecha_propuesta,
    hora_inicio: v.hora_inicio,
    duracion_min: duracionDeSlot(v.hora_inicio),
    cupo_estimado: v.cupo_estimado,
    modalidad: "dinamica",
    notas: v.notas || null,
  });
  if (error) {
    console.error("[solicitarPrivadaAction] insert falló:", error);
    return actionError(error);
  }

  // Datos del usuario para personalizar el mensaje de WhatsApp.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, apellido")
    .eq("id", user.id)
    .maybeSingle();
  const nombreCompleto =
    `${profile?.nombre ?? ""} ${profile?.apellido ?? ""}`.trim();

  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/solicitudes");
  revalidatePath("/privada/solicitar");

  return {
    ok: true,
    hrefWA: buildWhatsappLink({
      nombre: nombreCompleto,
      fecha: v.fecha_propuesta,
      hora: v.hora_inicio.slice(0, 5),
      cantidad: v.cupo_estimado,
      notas: v.notas,
    }),
  };
}

/**
 * Construye el link wa.me con el mensaje pre-armado para que el usuario
 * arranque la conversación con el dueño. El mensaje incluye el nombre
 * (si lo tenemos), día/hora, cantidad y notas. Sin emojis: el dueño
 * copy-pastea o reenvía sin problemas.
 */
function buildWhatsappLink(args: {
  nombre: string;
  fecha: string;
  hora: string;
  cantidad: number;
  notas: string | null | undefined;
}): string {
  const fechaLarga = formatFechaLarga(args.fecha);
  const saludo = args.nombre
    ? `Hola! Soy ${args.nombre}, quiero reservar una partida privada.`
    : "Hola! Quiero reservar una partida privada.";
  const lineas = [
    saludo,
    "",
    `Día: ${fechaLarga}`,
    `Horario: ${args.hora} hs`,
    `Cantidad: ${args.cantidad} personas`,
  ];
  if (args.notas && args.notas.trim()) {
    lineas.push(`Notas: ${args.notas.trim()}`);
  }
  lineas.push("");
  lineas.push("(Solicitud generada desde la plataforma)");
  const texto = lineas.join("\n");
  return `${WHATSAPP_URL}?text=${encodeURIComponent(texto)}`;
}

export async function cancelarPrivadaAction(solicitudId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return ERR("No autenticado");

  const { error } = await supabase
    .from("solicitudes_privada")
    .update({ estado: "cancelada", resolved_at: new Date().toISOString() })
    .eq("id", solicitudId)
    .eq("user_id", user.id)
    .eq("estado", "pendiente");
  if (error) {
    console.error("[cancelarPrivadaAction] update falló:", error);
    return ERR(error);
  }

  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/solicitudes");
  return { ok: true };
}

async function assertAdmin() {
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
  return { supabase, userId: user.id };
}

export async function aprobarPrivadaAction(
  solicitudId: string,
  respuesta?: string,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase, userId } = ctx;

  const { data: solicitud } = await supabase
    .from("solicitudes_privada")
    .select(
      "id, user_id, fecha_propuesta, hora_inicio, duracion_min, cupo_estimado, modalidad, notas, estado",
    )
    .eq("id", solicitudId)
    .maybeSingle();
  if (!solicitud) return ERR("Solicitud no encontrada");
  if (solicitud.estado !== "pendiente") return ERR("Ya fue resuelta");

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
      organizador_id: solicitud.user_id,
    })
    .select("id, private_token")
    .single();
  if (partidaErr || !partida) {
    console.error("[aprobarPrivadaAction] insert partida falló:", partidaErr);
    return ERR(partidaErr ?? "No se pudo crear la partida");
  }

  const { error: updErr } = await supabase
    .from("solicitudes_privada")
    .update({
      estado: "aprobada",
      partida_id: partida.id,
      respuesta_admin: respuesta?.trim() || null,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resuelto_visto: false,
    })
    .eq("id", solicitudId);
  if (updErr) {
    console.error("[aprobarPrivadaAction] update solicitud falló:", updErr);
    return ERR(updErr);
  }

  revalidatePath("/admin/solicitudes");
  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  return { ok: true, partidaId: partida.id, token: partida.private_token };
}

// =========================================================================
// Admin desde el calendario
// =========================================================================

const SLOT_HORAS_VALIDAS = SLOTS_PRIVADA.map((s) => s.hora) as readonly string[];

/** Libera (o vuelve a bloquear) un slot reservado para públicas. */
export async function toggleSlotOverrideAction(
  fecha: string,
  hora: string,
  habilitado: boolean,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return ERR("Fecha inválida");
  if (!SLOT_HORAS_VALIDAS.includes(hora)) return ERR("Hora inválida");

  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase, userId } = ctx;

  if (habilitado) {
    const { error } = await supabase
      .from("slots_privada_overrides")
      .upsert({
        fecha,
        hora_inicio: hora,
        habilitado: true,
        creado_por: userId,
      });
    if (error) {
      console.error("[toggleSlotOverrideAction] upsert falló:", error);
      return ERR(error);
    }
  } else {
    const { error } = await supabase
      .from("slots_privada_overrides")
      .delete()
      .eq("fecha", fecha)
      .eq("hora_inicio", hora);
    if (error) {
      console.error("[toggleSlotOverrideAction] delete falló:", error);
      return ERR(error);
    }
  }

  revalidatePath("/privada/solicitar");
  return { ok: true };
}

const crearDirectaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z.string().refine(
    (v) => SLOT_HORAS_VALIDAS.includes(v),
    "Horario inválido",
  ),
  visibilidad: z.enum(["privada", "publica"]),
  cupo_max: z.coerce.number().int().min(2, "Mínimo 2").max(60, "Máximo 60"),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  titulo: z.string().trim().max(80).optional(),
  notas: z.string().trim().max(500).optional(),
});

export type CrearDirectaState =
  | ActionErrorState
  | { ok: true; partidaId: string; token: string | null }
  | undefined;

/** Admin crea una partida directamente desde el calendario. */
export async function crearPartidaDirectaAction(
  _prev: CrearDirectaState,
  formData: FormData,
): Promise<CrearDirectaState> {
  const parsed = crearDirectaSchema.safeParse({
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    visibilidad: formData.get("visibilidad"),
    cupo_max: formData.get("cupo_max"),
    modalidad: formData.get("modalidad"),
    titulo: formData.get("titulo") || undefined,
    notas: formData.get("notas") || undefined,
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }
  const v = parsed.data;

  const inicio = inicioPartida(v.fecha, v.hora_inicio.slice(0, 5));
  if (inicio.getTime() <= Date.now()) {
    return actionFieldErrors({ fecha: ["La fecha/hora tiene que ser futura"] });
  }

  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase, userId } = ctx;

  // El slot tiene que estar realmente libre (no pisar partidas ni pendientes).
  const estados = await getSlotsEstado(supabase, [v.fecha]);
  const estado = estados.get(`${v.fecha}|${v.hora_inicio}`);
  if (
    estado === "publica" ||
    estado === "aprobada" ||
    estado === "pendiente" ||
    estado === "pasada"
  ) {
    return actionError(`El slot está ${estado}, no se puede crear acá.`);
  }
  // "reservada" se permite porque el admin puede crear igual; al crear la
  // partida queda bloqueado para el resto.

  const private_token =
    v.visibilidad === "privada" ? randomBytes(16).toString("hex") : null;

  const { data: partida, error: insErr } = await supabase
    .from("partidas")
    .insert({
      titulo:
        v.titulo ||
        `${modalidadLabel(v.modalidad)} ${v.visibilidad === "privada" ? "privada" : ""}`.trim(),
      fecha: v.fecha,
      hora_inicio: v.hora_inicio,
      duracion_min: duracionDeSlot(v.hora_inicio),
      modalidad: v.modalidad,
      cupo_max: v.cupo_max,
      visibilidad: v.visibilidad,
      private_token,
      precio: 0,
      notas: v.notas || null,
      creado_por: userId,
    })
    .select("id, private_token")
    .single();
  if (insErr || !partida) {
    console.error("[crearPartidaDirectaAction] insert falló:", insErr);
    return actionError(insErr ?? "No se pudo crear la partida");
  }

  revalidatePath("/privada/solicitar");
  revalidatePath("/admin/partidas");
  revalidatePath("/partidas");
  return {
    ok: true,
    partidaId: partida.id,
    token: partida.private_token ?? null,
  };
}

export async function rechazarPrivadaAction(
  solicitudId: string,
  respuesta?: string,
) {
  const ctx = await assertAdmin();
  if ("error" in ctx) return ctx;
  const { supabase, userId } = ctx;

  const { error } = await supabase
    .from("solicitudes_privada")
    .update({
      estado: "rechazada",
      respuesta_admin: respuesta?.trim() || null,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resuelto_visto: false,
    })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");
  if (error) {
    console.error("[rechazarPrivadaAction] update falló:", error);
    return ERR(error);
  }

  revalidatePath("/admin/solicitudes");
  revalidatePath("/mis-solicitudes");
  revalidatePath("/admin/calendario");
  return { ok: true };
}
