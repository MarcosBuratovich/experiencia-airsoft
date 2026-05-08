import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type TipoJugador = "alquiler" | "byop";

export type PreciosKey =
  | "entrada_byop"
  | "entrada_socio"
  | "alquiler_marcadora"   // Marcadora simple
  | "alquiler_premium"     // Marcadora avanzada (con tracer)
  | "alquiler_chaleco"
  | "recarga_tracer_100"
  | "recarga_conv_200"
  | "recarga_conv_400"
  | "cuota_socio";

export type PreciosConfig = Record<PreciosKey, number>;

export const PRECIOS_DEFAULT: PreciosConfig = {
  entrada_byop: 0,
  entrada_socio: 0,
  alquiler_marcadora: 0,
  alquiler_premium: 0,
  alquiler_chaleco: 0,
  recarga_tracer_100: 0,
  recarga_conv_200: 0,
  recarga_conv_400: 0,
  cuota_socio: 0,
};

export const PRECIOS_LABELS: Record<PreciosKey, { titulo: string; descripcion: string }> = {
  entrada_byop: {
    titulo: "Entrada base",
    descripcion: "Jugador con equipo propio o que alquila. Socios al día no pagan entrada.",
  },
  entrada_socio: {
    titulo: "Entrada · Socio",
    descripcion: "Lo que paga un socio al día (normalmente 0).",
  },
  alquiler_marcadora: {
    titulo: "Marcadora simple",
    descripcion: "Marcadora estándar + protección básica (anteojos).",
  },
  alquiler_premium: {
    titulo: "Marcadora avanzada",
    descripcion: "Marcadora con trazador + bbs tracer + protección.",
  },
  alquiler_chaleco: {
    titulo: "Chaleco táctico",
    descripcion: "Protección extra para el torso. Opcional, suma al alquiler.",
  },
  recarga_tracer_100: {
    titulo: "Recarga · 100 bbs tracer",
    descripcion: "Munición fluorescente, 100 unidades.",
  },
  recarga_conv_200: {
    titulo: "Recarga · 200 bbs convencional",
    descripcion: "Munición convencional, 200 unidades.",
  },
  recarga_conv_400: {
    titulo: "Recarga · 400 bbs convencional",
    descripcion: "Munición convencional, 400 unidades.",
  },
  cuota_socio: {
    titulo: "Cuota mensual socio",
    descripcion: "Monto base de la cuota mensual de socios.",
  },
};

export const PRECIOS_KEYS_ORDER: PreciosKey[] = [
  "entrada_byop",
  "entrada_socio",
  "alquiler_marcadora",
  "alquiler_premium",
  "alquiler_chaleco",
  "recarga_tracer_100",
  "recarga_conv_200",
  "recarga_conv_400",
  "cuota_socio",
];

export async function getPreciosConfig(
  supabase: ServerSupabase,
): Promise<PreciosConfig> {
  const { data } = await supabase.from("precios_config").select("key, valor");
  const out: PreciosConfig = { ...PRECIOS_DEFAULT };
  for (const row of (data ?? []) as { key: string; valor: number }[]) {
    if (row.key in out) {
      out[row.key as PreciosKey] = row.valor;
    }
  }
  return out;
}

export type AlquilerItems = {
  /** Marcadora simple (incluye protección básica). */
  marcadora: boolean;
  /** Marcadora avanzada con tracer. Excluyente con `marcadora`. */
  premium: boolean;
  /** Chaleco táctico extra. */
  chaleco: boolean;
  /** Recargas de munición (cantidad de unidades de cada tipo). */
  recargaTracer100: number;
  recargaConv200: number;
  recargaConv400: number;
};

export type DesglosePrecio = {
  entrada: number;
  alquiler: number;
  total: number;
};

/**
 * Calcula el precio de una inscripción según tipo de jugador, condición de
 * socio y los items elegidos.
 *
 * Modelo:
 *   - Entrada: 0 si socio al día, sino entrada_byop ($20k).
 *   - Alquiler de marcadora: solo si tipo=alquiler. Simple O avanzada
 *     (excluyentes — la UI lo restringe; acá si llegan ambos suma ambos).
 *   - Chaleco: opcional, suma al alquiler.
 *   - Recargas: opcionales para CUALQUIER tipo de jugador (incluso BYOP que
 *     se compra munición extra). Suma como alquiler.
 */
export function calcularPrecioInscripcion(opts: {
  tipo_jugador: TipoJugador;
  socio: boolean;
  alquila: AlquilerItems;
  precios: PreciosConfig;
}): DesglosePrecio {
  const { tipo_jugador, socio, alquila, precios } = opts;

  const entrada = socio ? precios.entrada_socio : precios.entrada_byop;

  let alquiler = 0;
  if (tipo_jugador === "alquiler") {
    if (alquila.marcadora) alquiler += precios.alquiler_marcadora;
    if (alquila.premium) alquiler += precios.alquiler_premium;
    if (alquila.chaleco) alquiler += precios.alquiler_chaleco;
  }

  // Recargas: válidas tanto para alquiler como BYOP.
  alquiler += alquila.recargaTracer100 * precios.recarga_tracer_100;
  alquiler += alquila.recargaConv200 * precios.recarga_conv_200;
  alquiler += alquila.recargaConv400 * precios.recarga_conv_400;

  return { entrada, alquiler, total: entrada + alquiler };
}
