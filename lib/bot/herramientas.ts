import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPreciosConfig } from "@/lib/precios";
import { getSlotsEstado, rangoDeFechasAhora } from "@/lib/slots-privada";

/**
 * Herramientas del asistente. TODAS son de solo lectura, y esa es la
 * decisión de seguridad central del diseño: el bot no puede anotar, cobrar
 * ni modificar nada porque no existe la herramienta. El peor error posible
 * es decir algo impreciso, nunca ejecutar algo.
 *
 * Los datos se consultan en cada uso en vez de vivir en el prompt: así un
 * cambio en /admin/precios aplica en el mensaje siguiente.
 */

type Cliente = SupabaseClient;

export type ResultadoHerramienta =
  | { ok: true; datos: unknown }
  | { ok: false; error: string };

export const ESQUEMAS_HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "proximas_partidas",
    description:
      "Devuelve las próximas partidas abiertas con fecha, hora, modalidad y cuántos lugares quedan. Usala siempre que pregunten cuándo se juega o si queda lugar. No inventes fechas ni disponibilidad.",
    input_schema: {
      type: "object",
      properties: {
        limite: {
          type: "integer",
          description: "Cuántas partidas traer. Por defecto 5.",
        },
      },
      required: [],
    },
  },
  {
    name: "precios",
    description:
      "Devuelve la lista de precios vigente: entrada con equipo propio, entrada de socio, alquiler, chaleco, recargas y cuota. Cada ítem tiene precio en efectivo y por transferencia. Usala siempre que pregunten cuánto sale algo; nunca digas un precio de memoria.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "agenda_privadas",
    description:
      "Devuelve los horarios libres para partidas privadas (cumpleaños, corporativos) en los próximos días. Sirve para decir qué días hay lugar, no para reservar.",
    input_schema: {
      type: "object",
      properties: {
        dias: {
          type: "integer",
          description: "Cuántos días hacia adelante mirar. Por defecto 21.",
        },
      },
      required: [],
    },
  },
];

export async function ejecutarHerramienta(
  supabase: Cliente,
  nombre: string,
  input: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<ResultadoHerramienta> {
  try {
    switch (nombre) {
      case "proximas_partidas":
        return await proximasPartidas(supabase, input, ahora);
      case "precios":
        return await precios(supabase);
      case "agenda_privadas":
        return await agendaPrivadas(supabase, input, ahora);
      default:
        return { ok: false, error: `La herramienta "${nombre}" no existe.` };
    }
  } catch (err) {
    // Nunca se filtra el error crudo al modelo: podría repetirlo al cliente.
    console.error("[bot] herramienta falló:", nombre, err);
    return { ok: false, error: "No se pudo consultar ese dato ahora." };
  }
}

function isoDeFecha(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

async function proximasPartidas(
  supabase: Cliente,
  input: Record<string, unknown>,
  ahora: Date,
): Promise<ResultadoHerramienta> {
  const limite = Math.min(Math.max(Number(input.limite) || 5, 1), 10);

  const { data, error } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, modalidad, cupo_max")
    .gte("fecha", isoDeFecha(ahora))
    // Valores reales de la tabla: 'abierta' | 'cancelada'.
    .eq("estado", "abierta")
    // CRÍTICO: solo las públicas. Una partida privada es el cumpleaños de
    // alguien, con su private_token; listarla acá se lo cuenta a cualquiera
    // que escriba por Instagram.
    .eq("visibilidad", "publica")
    .order("fecha", { ascending: true })
    .limit(limite);

  if (error || !data) return { ok: false, error: "No pude ver la agenda." };

  const ids = (data as { id: string }[]).map((p) => p.id);
  const ocupacion = new Map<string, number>();
  if (ids.length) {
    const { data: inscs, error: errorInscs } = await supabase
      .from("inscripciones")
      .select("partida_id")
      .in("partida_id", ids)
      // Solo confirmados: los de lista de espera no ocupan lugar.
      .eq("estado", "confirmado");

    // Si esta consulta falla no sabemos la ocupación real: devolver la
    // partida igual sería inventar "lugares_disponibles" (p.ej. decir que
    // hay 20 lugares en una partida llena). Mejor escalar que mentir.
    if (errorInscs || !inscs) {
      return { ok: false, error: "No pude ver la ocupación de las partidas." };
    }

    for (const i of inscs as { partida_id: string }[]) {
      ocupacion.set(i.partida_id, (ocupacion.get(i.partida_id) ?? 0) + 1);
    }
  }

  const partidas = (data as Record<string, unknown>[]).map((p) => {
    const cupo = Number(p.cupo_max) || 0;
    const tomados = ocupacion.get(p.id as string) ?? 0;
    return {
      fecha: p.fecha,
      hora: String(p.hora_inicio).slice(0, 5),
      // Valores reales: 'dinamica' | 'tacsim'.
      modalidad: p.modalidad ?? null,
      lugares_disponibles: Math.max(cupo - tomados, 0),
    };
  });

  return { ok: true, datos: { partidas } };
}

async function precios(supabase: Cliente): Promise<ResultadoHerramienta> {
  const cfg = await getPreciosConfig(supabase as never);
  return {
    ok: true,
    datos: {
      moneda: "ARS",
      nota: "Cada ítem tiene dos precios: efectivo y transferencia.",
      items: cfg,
    },
  };
}

async function agendaPrivadas(
  supabase: Cliente,
  input: Record<string, unknown>,
  ahora: Date,
): Promise<ResultadoHerramienta> {
  const dias = Math.min(Math.max(Number(input.dias) || 21, 1), 60);
  const fechas = rangoDeFechasAhora(dias, ahora);
  const estados = await getSlotsEstado(supabase as never, fechas);

  const libres: { fecha: string; hora: string }[] = [];
  for (const [clave, estado] of estados) {
    if (estado !== "disponible") continue;
    const [fecha, hora] = clave.split("|");
    libres.push({ fecha, hora: hora.slice(0, 5) });
  }
  libres.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  return { ok: true, datos: { slots_libres: libres.slice(0, 20) } };
}
