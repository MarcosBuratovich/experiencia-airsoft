import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type TipoJugador = "alquiler" | "byop";

/** Medio de pago que determina qué precio se cobra. */
export type MetodoPago = "efectivo" | "transferencia";

/** Precio de un ítem según el medio de pago (dos valores independientes). */
export type PrecioDual = { efectivo: number; transferencia: number };

export type PreciosKey =
  | "entrada_byop"
  | "entrada_socio"
  | "alquiler_marcadora"   // Alquiler de equipo (unico tier)
  | "alquiler_chaleco"
  | "recarga_tracer_100"
  | "recarga_conv_200"
  | "recarga_conv_400"
  | "cuota_socio";

export type PreciosConfig = Record<PreciosKey, PrecioDual>;

/** Defaults: efectivo = transferencia hasta que el dueño los diferencie. */
export const PRECIOS_DEFAULT: PreciosConfig = {
  entrada_byop: { efectivo: 25000, transferencia: 25000 },
  entrada_socio: { efectivo: 0, transferencia: 0 },
  // total para alquiler = entrada 25k + alquiler 35k = 60k
  alquiler_marcadora: { efectivo: 35000, transferencia: 35000 },
  alquiler_chaleco: { efectivo: 0, transferencia: 0 },
  recarga_tracer_100: { efectivo: 0, transferencia: 0 },
  recarga_conv_200: { efectivo: 0, transferencia: 0 },
  recarga_conv_400: { efectivo: 0, transferencia: 0 },
  cuota_socio: { efectivo: 0, transferencia: 0 },
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

/** Copia profunda de los defaults (para no mutar el objeto compartido). */
function clonarDefaults(): PreciosConfig {
  return Object.fromEntries(
    PRECIOS_KEYS_ORDER.map((k) => [k, { ...PRECIOS_DEFAULT[k] }]),
  ) as PreciosConfig;
}

type PrecioRow = {
  key: string;
  valor: number | null;
  valor_efectivo: number | null;
  valor_transferencia: number | null;
};

export async function getPreciosConfig(
  supabase: ServerSupabase,
): Promise<PreciosConfig> {
  const out = clonarDefaults();

  // Intento con las columnas nuevas; si no existen (pre-migración fase-17),
  // caigo a `valor` para ambos medios.
  const dual = await supabase
    .from("precios_config")
    .select("key, valor, valor_efectivo, valor_transferencia");

  if (!dual.error) {
    for (const row of (dual.data ?? []) as PrecioRow[]) {
      if (row.key in out) {
        const k = row.key as PreciosKey;
        out[k] = {
          efectivo: row.valor_efectivo ?? row.valor ?? out[k].efectivo,
          transferencia: row.valor_transferencia ?? row.valor ?? out[k].transferencia,
        };
      }
    }
    return out;
  }

  const legacy = await supabase.from("precios_config").select("key, valor");
  for (const row of (legacy.data ?? []) as { key: string; valor: number }[]) {
    if (row.key in out) {
      out[row.key as PreciosKey] = { efectivo: row.valor, transferencia: row.valor };
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
 * Calcula el precio de una inscripción para un medio de pago dado.
 *
 * Modelo:
 *   - Entrada: entrada_socio si socio al día, sino entrada_byop.
 *   - Alquiler equipo: solo si tipo=alquiler (un único tier).
 *   - Chaleco: opcional, suma al alquiler.
 *
 * Las recargas NO se incluyen acá — las asigna el admin durante el check-in
 * (ver `calcularPrecioRecargas`).
 */
export function calcularPrecioInscripcion(
  opts: {
    tipo_jugador: TipoJugador;
    socio: boolean;
    alquila: AlquilerItems;
    precios: PreciosConfig;
  },
  metodo: MetodoPago,
): DesglosePrecio {
  const { tipo_jugador, socio, alquila, precios } = opts;

  const entrada = socio
    ? precios.entrada_socio[metodo]
    : precios.entrada_byop[metodo];

  let alquiler = 0;
  if (tipo_jugador === "alquiler") {
    if (alquila.marcadora) alquiler += precios.alquiler_marcadora[metodo];
    if (alquila.chaleco) alquiler += precios.alquiler_chaleco[metodo];
  }

  return { entrada, alquiler, total: entrada + alquiler };
}

/**
 * Calcula el precio total de las recargas asignadas a una inscripción para un
 * medio de pago dado, con los precios `precios` actuales.
 */
export function calcularPrecioRecargas(
  recargas: RecargasCount,
  precios: PreciosConfig,
  metodo: MetodoPago,
): number {
  return (
    recargas.tracer100 * precios.recarga_tracer_100[metodo] +
    recargas.conv200 * precios.recarga_conv_200[metodo] +
    recargas.conv400 * precios.recarga_conv_400[metodo]
  );
}
