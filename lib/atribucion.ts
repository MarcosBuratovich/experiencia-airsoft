import { cookies } from "next/headers";

/**
 * Atribución de origen — de dónde vino la persona la PRIMERA vez.
 *
 * La escribe `CapturaAtribucion` en el navegador y la leen las server
 * actions al momento de convertir. Es first-touch: si la cookie ya existe
 * no se toca nunca más.
 *
 * La cookie usa claves de una letra a propósito. Viaja en CADA request al
 * dominio (incluidos los assets estáticos), así que cada byte se paga
 * muchas veces por visita.
 */
export const COOKIE_ATRIBUCION = "ea_attr";

/** 400 días: el techo que respeta Chrome para cookies. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export type Atribucion = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  /** ISO-8601. Cuándo se vio a esta persona por primera vez. */
  first_seen_at: string;
};

/** Clave corta en la cookie → nombre del campo. */
const CLAVES = {
  s: "utm_source",
  m: "utm_medium",
  c: "utm_campaign",
  f: "fbclid",
  r: "referrer_host",
  l: "landing_path",
} as const;

/**
 * Caracteres permitidos. Alcanza para un utm real (`reels-agosto`), un
 * host (`instagram.com`), un path (`/blog/que-es-airsoft`) y un fbclid
 * (alfanumérico con `-` y `_`). Todo lo demás se descarta: el contenido
 * viene del cliente y es manipulable.
 */
const LIMPIO = /^[\w./-]+$/;

const MAX_LARGO = 100;
/** Los fbclid son largos de verdad. */
const MAX_LARGO_FBCLID = 255;

function sanitizar(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (!v) return null;
  if (!LIMPIO.test(v)) return null;
  return v.slice(0, max);
}

/**
 * Parsea el contenido crudo de la cookie. Función pura: no toca
 * `next/headers`, así que se testea sin mocks.
 *
 * Devuelve `null` si no hay cookie, si está corrupta o si no trae un
 * `first_seen_at` válido — sin ese dato la fila no sirve para nada.
 * Un campo suelto inválido NO invalida el resto: se descarta solo ese.
 */
export function parsearAtribucion(
  raw: string | undefined | null,
): Atribucion | null {
  if (!raw) return null;

  // El cliente escribe con encodeURIComponent. Del lado del server, según
  // quién lea la cookie, puede llegar ya decodificada o no. En vez de
  // depender de eso, probamos las dos formas: primero tal cual, y si no
  // parsea, decodificada.
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    try {
      obj = JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null;

  const src = obj as Record<string, unknown>;

  // Sin timestamp válido no hay atribución que valga.
  const t = src.t;
  if (typeof t !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(t)) return null;
  if (Number.isNaN(Date.parse(t))) return null;

  const out = { first_seen_at: t } as Atribucion;
  for (const [clave, campo] of Object.entries(CLAVES)) {
    const max = campo === "fbclid" ? MAX_LARGO_FBCLID : MAX_LARGO;
    out[campo] = sanitizar(src[clave], max);
  }
  return out;
}

/**
 * Lee la cookie del request. Wrapper delgado sobre `parsearAtribucion`:
 * toda la lógica que puede fallar está en la función pura.
 */
export async function leerAtribucion(): Promise<Atribucion | null> {
  try {
    const c = await cookies();
    return parsearAtribucion(c.get(COOKIE_ATRIBUCION)?.value);
  } catch {
    return null;
  }
}

/** Las columnas tal como se llaman en Postgres. */
export type ColumnasAtribucion = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  atribucion_first_seen_at: string;
};

/**
 * Mapea al nombre de las columnas. Existe porque `first_seen_at` se llama
 * `atribucion_first_seen_at` en la base: un spread directo de `Atribucion`
 * mandaría una columna inexistente y el insert fallaría SIEMPRE.
 * No reemplazar esto por `{ ...attr }`.
 */
export function aColumnas(attr: Atribucion): ColumnasAtribucion {
  return {
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    fbclid: attr.fbclid,
    referrer_host: attr.referrer_host,
    landing_path: attr.landing_path,
    atribucion_first_seen_at: attr.first_seen_at,
  };
}
