import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inscripcionAbierta } from "@/lib/partidas";
import { getPreciosConfigResultado } from "@/lib/precios";

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
  // Sobrepedimos: la partida de HOY puede tener la inscripción ya cerrada
  // (se descarta más abajo con inscripcionAbierta) y no debe robarle el
  // cupo a una futura real que quedaría fuera del límite pedido.
  const limiteConsulta = limite + 10;

  const { data, error } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, duracion_min, modalidad, cupo_max")
    .gte("fecha", isoDeFecha(ahora))
    // Valores reales de la tabla: 'abierta' | 'cancelada'.
    .eq("estado", "abierta")
    // CRÍTICO: solo las públicas. Una partida privada es el cumpleaños de
    // alguien, con su private_token; listarla acá se lo cuenta a cualquiera
    // que escriba por Instagram.
    .eq("visibilidad", "publica")
    .order("fecha", { ascending: true })
    .limit(limiteConsulta);

  if (error || !data) return { ok: false, error: "No pude ver la agenda." };

  // H3: "fecha >= hoy" no alcanza — una partida de hoy puede haber cerrado
  // inscripción (o hasta haber terminado) horas atrás. inscripcionAbierta()
  // de lib/partidas es el criterio real de "todavía se puede anotar"
  // (incluye el margen de INSCRIPCION_CIERRE_MIN tras el inicio); no
  // alcanza con "todavía no empezó".
  const abiertas = (data as Record<string, unknown>[])
    .filter((p) =>
      inscripcionAbierta(
        {
          fecha: String(p.fecha),
          hora_inicio: String(p.hora_inicio),
          duracion_min: Number(p.duracion_min) || 0,
          estado: "abierta", // ya filtrado en la query de arriba.
        },
        ahora,
      ),
    )
    .slice(0, limite);

  const ids = abiertas.map((p) => p.id as string);
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

  const partidas = abiertas.map((p) => {
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
  const resultado = await getPreciosConfigResultado(supabase);

  // Si esto falla no sabemos los precios reales: devolver los defaults acá
  // sería inventar un precio (podría regalar algo que se cobra, o
  // sobrecotizar). Mejor escalar que mentir sobre plata.
  if (!resultado.ok) {
    return { ok: false, error: "No pude ver los precios." };
  }

  return {
    ok: true,
    datos: {
      moneda: "ARS",
      nota: "Cada ítem tiene dos precios: efectivo y transferencia.",
      items: resultado.config,
    },
  };
}
