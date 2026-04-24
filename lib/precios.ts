import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type TipoJugador = "alquiler" | "byop";

export type PreciosKey =
  | "entrada_alquiler"
  | "entrada_byop"
  | "entrada_socio"
  | "alquiler_marcadora"
  | "alquiler_premium"
  | "alquiler_chaleco"
  | "cuota_socio";

export type PreciosConfig = Record<PreciosKey, number>;

export const PRECIOS_DEFAULT: PreciosConfig = {
  entrada_alquiler: 0,
  entrada_byop: 0,
  entrada_socio: 0,
  alquiler_marcadora: 0,
  alquiler_premium: 0,
  alquiler_chaleco: 0,
  cuota_socio: 0,
};

export const PRECIOS_LABELS: Record<PreciosKey, { titulo: string; descripcion: string }> = {
  entrada_alquiler: {
    titulo: "Entrada · Alquiler",
    descripcion: "Precio de entrada para un jugador que alquila equipo.",
  },
  entrada_byop: {
    titulo: "Entrada · BYOP",
    descripcion: "Precio de entrada para un jugador que trae su propio equipo.",
  },
  entrada_socio: {
    titulo: "Entrada · Socio",
    descripcion: "Precio que paga un socio por jugar (normalmente 0).",
  },
  alquiler_marcadora: {
    titulo: "Alquiler · Marcadora común",
    descripcion: "Costo de alquilar una marcadora estándar por partida.",
  },
  alquiler_premium: {
    titulo: "Alquiler · Marcadora premium",
    descripcion: "Costo de alquilar marcadora premium con tracer.",
  },
  alquiler_chaleco: {
    titulo: "Alquiler · Chaleco",
    descripcion: "Costo de alquilar un chaleco por partida.",
  },
  cuota_socio: {
    titulo: "Cuota mensual socio",
    descripcion: "Monto base de la cuota mensual de socios.",
  },
};

export const PRECIOS_KEYS_ORDER: PreciosKey[] = [
  "entrada_alquiler",
  "entrada_byop",
  "entrada_socio",
  "alquiler_marcadora",
  "alquiler_premium",
  "alquiler_chaleco",
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
  marcadora: boolean;
  premium: boolean;
  chaleco: boolean;
};

export type DesglosePrecio = {
  entrada: number;
  alquiler: number;
  total: number;
};

export function calcularPrecioInscripcion(opts: {
  tipo_jugador: TipoJugador;
  socio: boolean;
  alquila: AlquilerItems;
  precios: PreciosConfig;
}): DesglosePrecio {
  const { tipo_jugador, socio, alquila, precios } = opts;

  const entrada = socio
    ? precios.entrada_socio
    : tipo_jugador === "alquiler"
      ? precios.entrada_alquiler
      : precios.entrada_byop;

  // Solo los "alquiler" pueden alquilar equipo. Si un byop manda items, se ignoran.
  let alquiler = 0;
  if (tipo_jugador === "alquiler") {
    if (alquila.marcadora) alquiler += precios.alquiler_marcadora;
    if (alquila.premium) alquiler += precios.alquiler_premium;
    if (alquila.chaleco) alquiler += precios.alquiler_chaleco;
  }

  return { entrada, alquiler, total: entrada + alquiler };
}
