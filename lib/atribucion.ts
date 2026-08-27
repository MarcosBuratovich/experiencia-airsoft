import { cookies } from "next/headers";
import {
  COOKIE_ATRIBUCION,
  LIMPIO,
  MAX_LARGO,
  MAX_LARGO_FBCLID,
} from "./atribucion-cookie";

/**
 * Atribución de origen — de dónde vino la persona la PRIMERA vez.
 *
 * La escribe `proxy.ts` con `Set-Cookie` (ver `armarDatosAtribucion` en
 * `lib/atribucion-cookie.ts`) y la leen las server actions al momento de
 * convertir. Es first-touch: si la cookie ya existe no se toca nunca más.
 *
 * La cookie usa claves de una letra a propósito. Viaja en CADA request al
 * dominio (incluidos los assets estáticos), así que cada byte se paga
 * muchas veces por visita.
 */

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

  // Date.parse NO rechaza dias que no existen: "2026-02-30" rueda al 2 de
  // marzo en vez de fallar. Postgres si valida el calendario y tirar
  // date/time field value out of range abortaria el insert. Guardamos el
  // valor ya normalizado por Date, que siempre es una fecha real, en vez
  // del string crudo que vino en la cookie.
  const fecha = new Date(t);
  if (Number.isNaN(fecha.getTime())) return null;

  const out = { first_seen_at: fecha.toISOString() } as Atribucion;
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

/**
 * Mapea a las 7 claves que `signupAction` manda en `options.data` del
 * `signUp`, y que `handle_new_user()` (`db/schema-phase-20.sql`) lee de
 * `raw_user_meta_data->>'...'`. Existe para que un rename futuro de una
 * columna rompa en un test en vez de en silencio: antes de esta función,
 * `auth.ts` armaba este mismo objeto a mano y nada verificaba que las
 * claves coincidieran con los strings del lado de PL/pgSQL.
 *
 * `?? ""` en los 6 strings (no en `first_seen_at`): el metadata serializa
 * a JSON y el trigger usa `nullif(..., '')`, que convierte el string
 * vacío en NULL. `first_seen_at` siempre viene con valor porque
 * `Atribucion.first_seen_at` no es nullable.
 */
export function aMetadata(attr: Atribucion): Record<string, string> {
  return {
    utm_source: attr.utm_source ?? "",
    utm_medium: attr.utm_medium ?? "",
    utm_campaign: attr.utm_campaign ?? "",
    fbclid: attr.fbclid ?? "",
    referrer_host: attr.referrer_host ?? "",
    landing_path: attr.landing_path ?? "",
    first_seen_at: attr.first_seen_at,
  };
}
