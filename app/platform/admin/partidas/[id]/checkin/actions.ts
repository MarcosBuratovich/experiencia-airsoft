"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  calcularPrecioInscripcion,
  calcularPrecioRecargas,
  getPreciosConfig,
  getPreciosConfigResultado,
  type TipoJugador,
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
 * Aplica a cualquier inscripción, no solo a los alquileres: un BYOP trae su
 * marcadora pero igual puede comprar munición. Además, sin esto una
 * inscripción que el admin pasa de alquiler a BYOP quedaría con recargas
 * cobradas e imposibles de corregir.
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

  const { data: insc, error: inscErr } = await supabase
    .from("inscripciones")
    .select("id")
    .eq("id", inscripcionId)
    .maybeSingle();
  if (inscErr) return ERR(inscErr);
  if (!insc) return ERR("Inscripción no encontrada");

  // Calcular precio_recargas con los precios vigentes
  const precios = await getPreciosConfig(supabase);
  // Referencia en transferencia (lista); el monto method-exacto lo arma el
  // check-in según el medio elegido.
  const precio_recargas = calcularPrecioRecargas(
    { tracer100, conv200 },
    precios,
    "transferencia",
  );

  // `.select()` para distinguir "no se pudo escribir" de "se escribió": un
  // UPDATE que la RLS filtra devuelve éxito con cero filas, no un error.
  const { data: tocadas, error } = await supabase
    .from("inscripciones")
    .update({
      recarga_tracer_100: tracer100,
      recarga_conv_200: conv200,
      precio_recargas,
    })
    .eq("id", inscripcionId)
    .select("id");
  if (error) return ERR(error);
  if (!tocadas?.length) return ERR("No se pudieron guardar las recargas");

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
 * El chaleco es un extra opcional que suma en cualquiera de los tipos.
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
  chaleco: z.boolean().optional(),
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
      chaleco: !!v.chaleco,
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
      alquila_chaleco: !!v.chaleco,
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
 * Borra a un jugador de la partida desde el check-in.
 *
 * Existe para arreglar errores: un nombre mal tipeado, alguien cargado dos
 * veces, o una inscripción que quedó de más. Se borra y se vuelve a cargar
 * bien. El check-in asociado se va solo por la foreign key
 * (`on delete cascade`).
 *
 * Aplica a cualquier inscripción, la haya cargado el admin o el propio
 * jugador. Al principio solo permitía borrar walk-ins, para que nadie perdiera
 * su lugar sin enterarse; en la práctica el que está parado en la puerta
 * también necesita corregir al que se anotó solo (se anotó como alquiler pero
 * vino BYOP, se anotó dos veces, se equivocó de partida). La confirmación del
 * cliente avisa cuando el jugador se anotó por su cuenta.
 *
 * La restricción que sí queda: **solo mientras el check-in esté abierto**.
 * Una vez cerrada la ventana de corrección, los números de la partida quedan
 * firmes.
 */
export async function eliminarInscripcionCheckinAction(inscripcionId: string) {
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
    .select("id, partida_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (inscErr) return ERR(inscErr);
  if (!insc) return ERR("Esa inscripción ya no existe");

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

  // Service role: rol y ventana ya se validaron acá arriba, y así el borrado
  // no depende de que la policy de delete cubra este caso exacto.
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

const equipoSchema = z.object({
  inscripcionId: z.uuid("Identificador inválido"),
  tipo: z.enum(["socio", "byop", "alquiler_basico", "alquiler_avanzado"]),
  chaleco: z.boolean(),
});

export type EquipoInput = z.infer<typeof equipoSchema>;

/**
 * Cambia el equipo de una inscripción ya existente durante el check-in: el
 * tipo de jugador (socio / BYOP / alquiler básico / alquiler avanzado) y el
 * chaleco. Recalcula y regraba el snapshot de precios.
 *
 * Por qué existe: lo que la gente elige al anotarse no siempre es lo que pasa
 * en la puerta. Se anotan de alquiler y vienen con equipo propio, eligen el
 * básico y se llevan el avanzado, o piden el chaleco recién al cambiarse.
 * Antes eso solo se podía arreglar borrando y volviendo a cargar, y solo si al
 * jugador lo había cargado un admin.
 *
 * `socio` NO se toma del tipo cuando la inscripción tiene cuenta: se recalcula
 * del perfil y de la cuota, igual que al anotarse. Un socio con la cuota
 * vencida paga como no-socio, y el admin no puede saltear eso desde acá.
 */
export async function actualizarEquipoInscripcionAction(input: EquipoInput) {
  const parsed = equipoSchema.safeParse(input);
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

  const { data: insc, error: inscErr } = await supabase
    .from("inscripciones")
    .select("id, partida_id, user_id")
    .eq("id", v.inscripcionId)
    .maybeSingle();
  if (inscErr) return ERR(inscErr);
  if (!insc) return ERR("Esa inscripción ya no existe");

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

  // Con cuenta: el beneficio de socio sale del perfil + estado de cuota.
  // Sin cuenta (guest cargado a mano): lo elige el admin con el tipo 'socio',
  // que es el mismo criterio con el que se lo dio de alta.
  let esSocio = v.tipo === "socio";
  if (insc.user_id) {
    const { data: persona, error: persErr } = await supabase
      .from("profiles")
      .select("id, socio, socio_desde, cuota_mensual")
      .eq("id", insc.user_id)
      .maybeSingle();
    if (persErr) return ERR(persErr);
    if (!persona) return ERR("No se encontró el perfil de ese jugador");
    if (!persona.socio) {
      esSocio = false;
    } else {
      const { data: pagos, error: pagosErr } = await supabase
        .from("socio_pagos")
        .select("periodo")
        .eq("user_id", persona.id);
      // Sin los pagos no se puede saber si la cuota está al día, y asumir que
      // sí regala la entrada. Mejor cortar que cobrar de menos.
      if (pagosErr) return ERR(pagosErr);
      const cuota = computarEstadoCuota(
        {
          socio: true,
          socio_desde: persona.socio_desde,
          cuota_mensual: persona.cuota_mensual ?? 0,
        },
        pagos ?? [],
      );
      esSocio = cuota.esSocio && cuota.alDia;
    }
  }

  // Acá SÍ importa la variante estricta: esto pisa un snapshot de precios que
  // ya era correcto. Si `precios_config` no se puede leer, caer a los defaults
  // reescribiría la inscripción con un precio inventado.
  const preciosRes = await getPreciosConfigResultado(supabase);
  if (!preciosRes.ok) {
    return ERR(
      "No se pudieron leer los precios, así que no se cambió nada. Probá de nuevo.",
    );
  }

  const esAvanzado = v.tipo === "alquiler_avanzado";
  const esAlquiler = v.tipo === "alquiler_basico" || esAvanzado;
  const opts = {
    tipo_jugador: (esAlquiler ? "alquiler" : "byop") as TipoJugador,
    socio: esSocio,
    alquila: {
      marcadora: esAlquiler && !esAvanzado,
      premium: esAvanzado,
      chaleco: v.chaleco,
    },
    precios: preciosRes.config,
  };
  const transf = calcularPrecioInscripcion(opts, "transferencia");
  const efec = calcularPrecioInscripcion(opts, "efectivo");

  // `.select()` para no confundir "la RLS lo filtró" con "se guardó": un
  // UPDATE filtrado devuelve éxito con cero filas. `precio_total` es columna
  // generada (entrada + alquiler + recargas), no se escribe.
  const { data: tocadas, error: updErr } = await supabase
    .from("inscripciones")
    .update({
      tipo_jugador: opts.tipo_jugador,
      alquila_marcadora: opts.alquila.marcadora,
      alquila_premium: opts.alquila.premium,
      alquila_chaleco: opts.alquila.chaleco,
      precio_entrada: transf.entrada,
      precio_alquiler: transf.alquiler,
      precio_fijo_efectivo: efec.total,
    })
    .eq("id", v.inscripcionId)
    .select("id");
  if (updErr) return ERR(updErr);
  if (!tocadas?.length) return ERR("No se pudo guardar el cambio de equipo");

  revalidatePath(`/platform/admin/partidas/${insc.partida_id}/checkin`);
  revalidatePath(`/platform/admin/partidas`);
  return {
    ok: true as const,
    socio: esSocio,
    precio_entrada: transf.entrada,
    precio_alquiler: transf.alquiler,
    precio_fijo_efectivo: efec.total,
  };
}
