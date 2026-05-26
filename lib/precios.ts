import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type TipoJugador = "alquiler" | "byop";

export type PreciosKey =
  | "entrada_byop"
  | "entrada_socio"
  | "alquiler_marcadora"   // Alquiler de equipo (unico tier)
  | "alquiler_chaleco"
  | "recarga_tracer_100"
  | "recarga_conv_200"
  | "recarga_conv_400"
  | "cuota_socio";

export type PreciosConfig = Record<PreciosKey, number>;

export const PRECIOS_DEFAULT: PreciosConfig = {
  entrada_byop: 25000,
  entrada_socio: 0,
  alquiler_marcadora: 35000, // total para alquiler = entrada 25k + alquiler 35k = 60k
  alquiler_chaleco: 0,
  recarga_tracer_100: 0,
  recarga_conv_200: 0,
  recarga_conv_400: 0,
  cuota_socio: 0,
};

export const PRECIOS_LABELS: Record<PreciosKey, { titulo: string; descripcion: string }> = {
  entrada_byop: {
    titulo: "Entrada base",
    descripcion: "Lo que paga cualquier jugador (BYOP o alquiler). Socios al día no pagan entrada.",
  },
  entrada_socio: {
    titulo: "Entrada · Socio",
    descripcion: "Lo que paga un socio al día (normalmente 0).",
  },
  alquiler_marcadora: {
    titulo: "Alquiler equipo",
    descripcion: "Marcadora + tracer + protección. Se suma a la entrada para el total de alquiler.",
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
  /** Alquiler de equipo (marcadora + tracer + protección). */
  marcadora: boolean;
  /** Chaleco táctico extra. */
  chaleco: boolean;
};

/** Cantidades de recargas pedidas (las marca el admin durante el check-in). */
export type RecargasCount = {
  tracer100: number;
  conv200: number;
  conv400: number;
};

export type DesglosePrecio = {
  entrada: number;
  alquiler: number;
  total: number;
};

/**
 * Calcula el precio de una inscripción al momento de anotarse.
 *
 * Modelo:
 *   - Entrada: 0 si socio al día, sino entrada_byop.
 *   - Alquiler equipo: solo si tipo=alquiler (un único tier).
 *   - Chaleco: opcional, suma al alquiler.
 *
 * Las recargas NO se incluyen acá — las asigna el admin durante el check-in
 * con los precios vigentes en ese momento (ver `calcularPrecioRecargas`).
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
    if (alquila.chaleco) alquiler += precios.alquiler_chaleco;
  }

  return { entrada, alquiler, total: entrada + alquiler };
}

/**
 * Calcula el precio total de las recargas asignadas a una inscripción.
 * Usa los precios `precios` actuales (no snapshot) — el admin las cobra al
 * precio del día.
 */
export function calcularPrecioRecargas(
  recargas: RecargasCount,
  precios: PreciosConfig,
): number {
  return (
    recargas.tracer100 * precios.recarga_tracer_100 +
    recargas.conv200 * precios.recarga_conv_200 +
    recargas.conv400 * precios.recarga_conv_400
  );
}
