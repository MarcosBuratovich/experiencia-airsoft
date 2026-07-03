import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type TipoJugador = "alquiler" | "byop";

/** Medio de pago que determina qué precio se cobra. */
export type MetodoPago = "efectivo" | "transferencia";

/** Precio de un ítem según el medio de pago (dos valores independientes). */
export type PrecioDual = { efectivo: number; transferencia: number };

// NOTA sobre nombres legacy de recargas: las columnas/keys `recarga_tracer_100`
// y `recarga_conv_200` hoy representan packs de 200 unidades (tracer y común).
// El "_100" del tracer es un nombre viejo (antes era pack de 100); se mantiene
// para no migrar columnas ni perder el histórico. La vieja `recarga_conv_400`
// quedó fuera de uso (la columna sigue en la DB para datos históricos).
export type PreciosKey =
  | "entrada_byop"
  | "entrada_socio"
  | "alquiler_marcadora"   // Alquiler básico (marcadora simple)
  | "alquiler_premium"     // Alquiler avanzado (marcadora avanzada + tracer)
  | "alquiler_chaleco"
  | "recarga_tracer_100"   // Recarga 200 bbs tracer (nombre legacy)
  | "recarga_conv_200"     // Recarga 200 bbs común
  | "cuota_socio";

export type PreciosConfig = Record<PreciosKey, PrecioDual>;

/** Defaults: efectivo = transferencia hasta que el dueño los diferencie. */
export const PRECIOS_DEFAULT: PreciosConfig = {
  entrada_byop: { efectivo: 25000, transferencia: 25000 },
  entrada_socio: { efectivo: 0, transferencia: 0 },
  // El alquiler ya incluye la entrada — es el precio total del alquiler.
  alquiler_marcadora: { efectivo: 60000, transferencia: 60000 },
  alquiler_premium: { efectivo: 80000, transferencia: 80000 },
  alquiler_chaleco: { efectivo: 0, transferencia: 0 },
  recarga_tracer_100: { efectivo: 0, transferencia: 0 },
  recarga_conv_200: { efectivo: 0, transferencia: 0 },
  cuota_socio: { efectivo: 0, transferencia: 0 },
};

export const PRECIOS_LABELS: Record<PreciosKey, { titulo: string; descripcion: string }> = {
  entrada_byop: {
    titulo: "Entrada base",
    descripcion: "Lo que paga un jugador BYOP (trae su equipo). Socios al día no pagan entrada.",
  },
  entrada_socio: {
    titulo: "Entrada · Socio",
    descripcion: "Lo que paga un socio al día (normalmente 0).",
  },
  alquiler_marcadora: {
    titulo: "Alquiler básico",
    descripcion: "Precio TOTAL del alquiler básico (marcadora simple + protección + entrada incluida).",
  },
  alquiler_premium: {
    titulo: "Alquiler avanzado",
    descripcion: "Precio TOTAL del alquiler avanzado (marcadora avanzada + tracer + protección + entrada incluida).",
  },
  alquiler_chaleco: {
    titulo: "Chaleco táctico",
    descripcion: "Protección extra para el torso. Opcional, suma al alquiler.",
  },
  recarga_tracer_100: {
    titulo: "Recarga · 200 bbs tracer",
    descripcion: "Munición fluorescente (tracer), 200 unidades.",
  },
  recarga_conv_200: {
    titulo: "Recarga · 200 bbs común",
    descripcion: "Munición común (no tracer), 200 unidades.",
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
  /** Alquiler básico (marcadora simple). */
  marcadora: boolean;
  /** Alquiler avanzado (marcadora avanzada + tracer). Excluyente con marcadora. */
  premium: boolean;
  /** Chaleco táctico extra. */
  chaleco: boolean;
};

/** Cantidades de recargas pedidas (las marca el admin durante el check-in). */
export type RecargasCount = {
  /** Packs de 200 bbs tracer (columna legacy recarga_tracer_100). */
  tracer100: number;
  /** Packs de 200 bbs común (columna recarga_conv_200). */
  conv200: number;
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
 *   - ALQUILER: el precio de alquiler YA incluye la entrada, así que NO se
 *     suma la entrada aparte. Total = alquiler elegido (básico o avanzado) +
 *     chaleco opcional. El beneficio de socio no aplica (entrada incluida).
 *   - BYOP: paga solo la entrada (entrada_socio si socio al día, sino
 *     entrada_byop).
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

  if (tipo_jugador === "alquiler") {
    let alquiler = 0;
    if (alquila.marcadora) alquiler += precios.alquiler_marcadora[metodo];
    if (alquila.premium) alquiler += precios.alquiler_premium[metodo];
    if (alquila.chaleco) alquiler += precios.alquiler_chaleco[metodo];
    return { entrada: 0, alquiler, total: alquiler };
  }

  const entrada = socio
    ? precios.entrada_socio[metodo]
    : precios.entrada_byop[metodo];
  return { entrada, alquiler: 0, total: entrada };
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
    recargas.conv200 * precios.recarga_conv_200[metodo]
  );
}
