"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  calcularPrecioInscripcion,
  calcularPrecioRecargas,
  getPreciosConfig,
} from "@/lib/precios";
import { checkinAbierto } from "@/lib/partidas";
import { computarEstadoCuota } from "@/lib/socios";
import { isCleanText } from "@/lib/sanitize-text";

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
  recargas: { tracer100: number; conv200: number },
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
  // Referencia en transferencia (lista); el monto method-exacto lo arma el
  // check-in según el medio elegido.
  const precio_recargas = calcularPrecioRecargas(
    { tracer100, conv200 },
    precios,
    "transferencia",
  );

  const { error } = await supabase
    .from("inscripciones")
    .update({
      recarga_tracer_100: tracer100,
      recarga_conv_200: conv200,
      precio_recargas,
    })
    .eq("id", inscripcionId);
  if (error) return ERR(error);

  revalidatePath(`/admin/partidas`);
  return { ok: true, precio_recargas };
}

/**
 * Walk-in: el admin agrega a mano un jugador el día de la partida durante el
 * check-in (gente que llega sin estar anotada). Crea la inscripción como guest
 * y la marca presente con el medio de pago en un solo paso.
 *
 * Tipo determina el precio (modelo de precios.ts):
 *   - socio    → entrada 0, pago 'socio_presente' (monto 0).
 *   - byop     → entrada base.
 *   - alquiler → precio de alquiler (ya incluye la entrada).
 * El DNI es opcional. Las recargas se cargan después con los controles de la fila.
 */
const walkinSchema = z.object({
  partidaId: z.uuid(),
  // Si viene userId, es una persona con cuenta (se anota con su user_id real y
  // socio se deriva del perfil). Si no, es carga manual (guest con nombre+DNI).
  userId: z.uuid().optional(),
  nombre: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .refine((s) => isCleanText(s), "Nombre con contenido no permitido")
    .optional(),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "DNI inválido (7-8 dígitos)")
    .optional(),
  tipo: z.enum(["socio", "byop", "alquiler_basico", "alquiler_avanzado"]),
  // El cliente solo elige medios "reales"; 'socio_presente' lo decide el
  // server cuando la entrada queda gratis (socio sin cargo).
  pago_estado: z.enum(["efectivo", "transferencia", "debe"]),
});

export async function agregarWalkinAction(input: z.infer<typeof walkinSchema>) {
  const parsed = walkinSchema.safeParse(input);
  if (!parsed.success) {
    return ERR(parsed.error.issues[0]?.message ?? "Datos inválidos");
  }
  const v = parsed.data;

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
    .select("id, estado, fecha, hora_inicio, duracion_min")
    .eq("id", v.partidaId)
    .maybeSingle();
  if (!partida) return ERR("Partida no encontrada");
  // Walk-in solo mientras el check-in está abierto (desde las 00:00 del día de
  // la partida hasta que termina); enforced server-side porque el form solo se
  // monta en ese estado pero la action es invocable.
  if (!checkinAbierto(partida)) {
    return ERR(
      "Solo se pueden agregar jugadores mientras el check-in está abierto (el día de la partida, hasta que termina)",
    );
  }

  const esAvanzado = v.tipo === "alquiler_avanzado";
  const esAlquiler = v.tipo === "alquiler_basico" || esAvanzado;
  const precios = await getPreciosConfig(supabase);

  // Resolver la persona: cuenta existente (userId) o carga manual (guest).
  let userId: string | null = null;
  let guestNombre: string | null = null;
  let guestDni: string | null = null;
  let esSocio = v.tipo === "socio";

  if (v.userId) {
    const { data: persona } = await supabase
      .from("profiles")
      .select("id, socio, socio_desde, cuota_mensual")
      .eq("id", v.userId)
      .maybeSingle();
    if (!persona) return ERR("La persona seleccionada no existe");
    const { data: yaInscripto } = await supabase
      .from("inscripciones")
      .select("id")
      .eq("partida_id", v.partidaId)
      .eq("user_id", v.userId)
      .maybeSingle();
    if (yaInscripto) return ERR("Esa persona ya está anotada en la partida");
    userId = persona.id;
    // El beneficio de socio (entrada gratis) solo aplica si está al día, igual
    // que en anotarme. Un socio con cuota vencida paga como no-socio.
    if (persona.socio) {
      const { data: pagos } = await supabase
        .from("socio_pagos")
        .select("periodo")
        .eq("user_id", persona.id);
      const cuota = computarEstadoCuota(
        {
          socio: true,
          socio_desde: persona.socio_desde,
          cuota_mensual: persona.cuota_mensual ?? 0,
        },
        pagos ?? [],
      );
      esSocio = cuota.esSocio && cuota.alDia;
    } else {
      esSocio = false;
    }
  } else {
    if (!v.nombre) return ERR("Ingresá un nombre o elegí una cuenta");
    guestNombre = v.nombre;
    guestDni = v.dni ?? null;
  }

  // Insertar una inscripción con el user_id de otra persona no lo permite la
  // RLS (solo self-insert o guest); como ya validamos que quien llama es admin,
  // usamos el cliente service-role para ese caso puntual.
  const db = (userId ? createServiceRoleClient() : supabase) as typeof supabase;

  const opts = {
    tipo_jugador: (esAlquiler ? "alquiler" : "byop") as "alquiler" | "byop",
    socio: esSocio,
    alquila: {
      marcadora: esAlquiler && !esAvanzado,
      premium: esAvanzado,
      chaleco: false,
    },
    precios,
  };
  const transf = calcularPrecioInscripcion(opts, "transferencia");
  const efec = calcularPrecioInscripcion(opts, "efectivo");

  // 'socio_presente' solo cuando la entrada quedó gratis (socio sin cargo). Si
  // un socio alquila, paga con el medio elegido. Cobramos el total del medio
  // elegido ('debe' cobra la lista = transferencia).
  const gratis = esSocio && transf.total === 0;
  const pago_estado = gratis ? "socio_presente" : v.pago_estado;
  const pago_monto = gratis
    ? 0
    : v.pago_estado === "efectivo"
      ? efec.total
      : transf.total;

  const { data: insc, error: insErr } = await db
    .from("inscripciones")
    .insert({
      partida_id: v.partidaId,
      user_id: userId,
      guest_nombre: guestNombre,
      guest_dni: guestDni,
      agregado_por: user.id,
      estado: "confirmado",
      tipo_jugador: esAlquiler ? "alquiler" : "byop",
      alquila_marcadora: esAlquiler && !esAvanzado,
      alquila_premium: esAvanzado,
      alquila_chaleco: false,
      precio_entrada: transf.entrada,
      precio_alquiler: transf.alquiler,
      precio_fijo_efectivo: efec.total,
    })
    .select("id")
    .single();
  if (insErr || !insc) {
    return ERR(insErr ?? "No se pudo agregar el jugador");
  }

  // El check-in se inserta aparte (no hay transacción). Si falla —incluido un
  // throw del SDK por red— compensamos borrando la inscripción para no dejarla
  // huérfana, y verificamos que el rollback haya funcionado.
  try {
    const { error: chkErr } = await db.from("checkins").insert({
      inscripcion_id: insc.id,
      admin_id: user.id,
      presente: true,
      pago_estado,
      pago_monto,
    });
    if (chkErr) throw chkErr;
  } catch (chkErr) {
    const { error: rbErr } = await db
      .from("inscripciones")
      .delete()
      .eq("id", insc.id);
    if (rbErr) {
      console.error(
        "[agregarWalkinAction] rollback falló, inscripción huérfana:",
        insc.id,
        rbErr,
      );
    }
    return ERR(chkErr);
  }

  revalidatePath(`/admin/partidas`);
  return { ok: true, inscripcionId: insc.id };
}

export type PersonaBusqueda = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  celular: string;
  socio: boolean;
  player_number: string | null;
};

/** Busca cuentas por nombre/apellido/DNI/nº de jugador para el autocomplete. */
export async function buscarPersonasAction(
  query: string,
): Promise<{ personas: PersonaBusqueda[] }> {
  const q = query.trim();
  if (q.length < 2) return { personas: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { personas: [] };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { personas: [] };
  }

  // Sanitizar el needle para no romper la sintaxis del .or() de PostgREST.
  const needle = q.replace(/[,()%]/g, " ").trim();
  if (!needle) return { personas: [] };

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, nombre, apellido, dni, celular, socio, socio_desde, cuota_mensual, player_number",
    )
    .or(
      `nombre.ilike.%${needle}%,apellido.ilike.%${needle}%,dni.ilike.%${needle}%,player_number.ilike.%${needle}%`,
    )
    .order("apellido")
    .limit(8);

  // `socio` devuelto = beneficio efectivo (socio al día). Un socio con cuota
  // vencida se muestra y se cobra como no-socio, igual que en el server, para
  // que la fila optimista del walk-in coincida con lo cobrado. Pagos batcheados.
  const socios = (data ?? []).filter((p) => p.socio);
  const pagosByUser = new Map<string, { periodo: string }[]>();
  if (socios.length) {
    const { data: pagos } = await supabase
      .from("socio_pagos")
      .select("user_id, periodo")
      .in("user_id", socios.map((p) => p.id));
    for (const pg of (pagos ?? []) as { user_id: string; periodo: string }[]) {
      const arr = pagosByUser.get(pg.user_id) ?? [];
      arr.push({ periodo: pg.periodo });
      pagosByUser.set(pg.user_id, arr);
    }
  }

  return {
    personas: (data ?? []).map((p) => {
      let bonificado = false;
      if (p.socio) {
        const cuota = computarEstadoCuota(
          {
            socio: true,
            socio_desde: p.socio_desde,
            cuota_mensual: p.cuota_mensual ?? 0,
          },
          pagosByUser.get(p.id) ?? [],
        );
        bonificado = cuota.esSocio && cuota.alDia;
      }
      return {
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni,
        celular: p.celular,
        socio: bonificado,
        player_number: p.player_number,
      };
    }),
  };
}

/**
 * Borra un jugador que se agregó a mano en el check-in.
 *
 * Existe para arreglar errores de tipeo: se borra y se vuelve a cargar bien.
 * El check-in asociado se va solo por la foreign key (`on delete cascade`).
 *
 * Dos restricciones que no son negociables:
 *
 * 1. **Solo se puede borrar lo que se agregó a mano** (`agregado_por` con
 *    valor). Una inscripción que el jugador hizo por su cuenta es suya: si el
 *    admin pudiera borrarla desde acá, esa persona perdería su lugar sin
 *    enterarse. Para esos casos existe cancelar la inscripción, que es otro
 *    flujo.
 * 2. **Solo mientras el check-in esté abierto.** Una vez cerrada la ventana de
 *    corrección, los números de la partida quedan firmes.
 */
export async function eliminarWalkinAction(inscripcionId: string) {
  const parsed = z.uuid("Identificador inválido").safeParse(inscripcionId);
  if (!parsed.success) return ERR(parsed.error.issues[0]?.message);

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

  const { data: insc, error: inscErr } = await supabase
    .from("inscripciones")
    .select("id, partida_id, agregado_por, guest_nombre")
    .eq("id", parsed.data)
    .maybeSingle();
  if (inscErr) return ERR(inscErr);
  if (!insc) return ERR("Esa inscripción ya no existe");

  if (!insc.agregado_por) {
    return ERR(
      "Ese jugador se anotó por su cuenta, así que no se puede borrar desde el check-in. Cancelá la inscripción desde la partida.",
    );
  }

  const { data: partida, error: partErr } = await supabase
    .from("partidas")
    .select("id, estado, fecha, hora_inicio, duracion_min")
    .eq("id", insc.partida_id)
    .maybeSingle();
  if (partErr) return ERR(partErr);
  if (!partida) return ERR("Partida no encontrada");

  if (!checkinAbierto(partida)) {
    return ERR(
      "El check-in de esta partida ya cerró (se puede corregir hasta 24 hs después de que termina)",
    );
  }

  // Service role: la policy de borrado de inscripciones es más restrictiva que
  // esta operación, que ya validó rol y ventana acá arriba.
  const db = createServiceRoleClient();
  const { error: delErr } = await db
    .from("inscripciones")
    .delete()
    .eq("id", parsed.data);
  if (delErr) return ERR(delErr);

  revalidatePath(`/platform/admin/partidas/${insc.partida_id}/checkin`);
  revalidatePath(`/platform/admin/partidas`);
  return { ok: true as const };
}
