import { esHostProduccion } from "./ga";

/**
 * Constantes y lógica pura de la cookie de atribución.
 *
 * La escribe `proxy.ts` con `Set-Cookie` (no un componente cliente: Safari
 * ITP y Firefox limitan a 7 días —24hs si el aterrizaje trae link
 * decoration de un dominio tracker, como un `?fbclid=` desde Instagram—
 * las cookies escritas por `document.cookie`; una cookie de servidor no
 * tiene ese tope). La lee `lib/atribucion.ts` en las server actions al
 * momento de convertir.
 *
 * Vive en su propio módulo, separado de `lib/atribucion.ts`, porque ese
 * archivo importa `next/headers` y con eso el bundler lo marca entero
 * server-only. `proxy.ts` no puede usar `next/headers` (no corre en el
 * contexto de una request de React Server Components) pero sí necesita
 * estas constantes y `armarDatosAtribucion`, así que quedan separadas de
 * cualquier cosa que dependa de `next/headers`.
 */

/** Nombre de la cookie first-party de atribución. */
export const COOKIE_ATRIBUCION = "ea_attr";

/** 400 días: el techo que respeta Chrome para cookies. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Largo máximo de un campo de la cookie. Comparten este número la lectura
 * (`parsearAtribucion` en `lib/atribucion.ts`, que trunca al parsear) y la
 * escritura (`armarDatosAtribucion`, más abajo, que trunca antes de armar
 * el JSON) — que vivan acá evita que se desincronicen.
 */
export const MAX_LARGO = 100;

/** Los fbclid son largos de verdad. */
export const MAX_LARGO_FBCLID = 255;

/**
 * Caracteres permitidos en un campo de la cookie. Acepta letras Unicode
 * (además de dígitos, `_`, espacio, `.`, `:`, `/` y `-`) porque las
 * campañas de este negocio se nombran en español: "Black Friday",
 * "Promoción Agosto". Un regex solo-ASCII (`\w`) las descartaba enteras,
 * dejando la fila con `utm_source` lleno y `utm_campaign` en NULL —
 * parecía completa y no lo estaba. Sigue rechazando cualquier intento de
 * inyección (`<script>...`, `a;b=c`): el contenido viene del cliente y es
 * manipulable.
 *
 * Vive acá (no en `lib/atribucion.ts`) para que `armarDatosAtribucion`
 * pueda aplicar, al escribir, exactamente el mismo criterio que el server
 * aplica al leer.
 */
export const LIMPIO = /^[\p{L}\p{N}_ .:/-]+$/u;

/**
 * Tope de bytes para el valor final de la cookie, ya serializado y
 * encodeado — lo que realmente termina en el header `Set-Cookie`.
 *
 * `MAX_LARGO`/`MAX_LARGO_FBCLID` truncan por CANTIDAD DE CARACTERES, pero
 * `LIMPIO` acepta `\p{L}` (letras Unicode), que incluye alfabetos
 * multi-byte (chino, japonés, coreano...). `response.cookies.set()`
 * serializa el valor con `encodeURIComponent` (así arma el header
 * `Set-Cookie` el paquete `@edge-runtime/cookies` que usa Next por
 * debajo), y ese encoding expande cada byte UTF-8 no-ASCII a 3
 * caracteres (`%XX`). Medido: varios campos truncados a 100 caracteres
 * CJK cada uno superan los 5000 bytes ya encodeados, aun respetando el
 * tope por campo.
 *
 * La mayoría de los browsers descartan el `Set-Cookie` COMPLETO en
 * silencio si supera unos ~4096 bytes (el límite exacto varía por
 * browser y no se reporta como error visible en ningún lado). 3500 deja
 * margen para el nombre de la cookie y sus atributos (`Domain`, `Path`,
 * `Max-Age`, etc.), que también cuentan contra ese límite.
 */
export const MAX_LARGO_COOKIE = 3500;

/**
 * `true` si el valor ya serializado (el JSON crudo que arma
 * `armarDatosAtribucion`, todavía sin encodear) va a superar
 * `MAX_LARGO_COOKIE` bytes una vez que `response.cookies.set()` lo pase
 * por `encodeURIComponent` para armar el `Set-Cookie`.
 *
 * Mide sobre la versión YA encodeada (no sobre `valorSerializado.length`)
 * porque es la que realmente viaja por la red y la que el browser puede
 * llegar a descartar entera y en silencio. Preferible no atribuir a
 * escribir una cookie que el browser va a tirar igual.
 */
export function superaTopeCookie(valorSerializado: string): boolean {
  return encodeURIComponent(valorSerializado).length > MAX_LARGO_COOKIE;
}

function limpiar(valor: string | null | undefined, max: number): string | null {
  if (!valor) return null;
  const v = valor.trim();
  if (!v || !LIMPIO.test(v)) return null;
  return v.slice(0, max);
}

/**
 * Arma el objeto (sin encodear) que va en la cookie `ea_attr`, a partir de
 * los query params, el header `Referer` y el path de un request.
 *
 * Función pura: no toca `NextRequest`/`NextResponse`, cookies ni
 * `next/headers` — recibe todo lo que necesita ya extraído, así se testea
 * sin mocks del runtime de Next. `proxy.ts` es el único llamador real;
 * pasa `request.nextUrl.searchParams`, `request.headers.get("referer")` y
 * `request.nextUrl.pathname` tal cual.
 *
 * Aplica las mismas reglas que aplicaba `CapturaAtribucion` (componente
 * eliminado; esta función lo reemplaza desde `proxy.ts`): mismo regex
 * `LIMPIO`, mismos límites de largo, y descarta el referrer si su host es
 * de producción — un referrer propio es navegación interna, no un origen
 * de tráfico.
 *
 * `ahora` es inyectable para poder testear con una fecha fija; en
 * producción se usa siempre `new Date()`.
 */
export function armarDatosAtribucion(input: {
  searchParams: URLSearchParams;
  refererHeader: string | null;
  pathname: string;
  ahora?: Date;
}): Record<string, string> {
  let refHost: string | null = null;
  if (input.refererHeader) {
    try {
      const h = new URL(input.refererHeader).hostname;
      if (!esHostProduccion(h)) refHost = h;
    } catch {
      // Referer con forma inválida: refHost ya arrancó en null.
    }
  }

  const datos: Record<string, string> = {
    t: (input.ahora ?? new Date()).toISOString(),
  };
  const s = limpiar(input.searchParams.get("utm_source"), MAX_LARGO);
  const m = limpiar(input.searchParams.get("utm_medium"), MAX_LARGO);
  const c = limpiar(input.searchParams.get("utm_campaign"), MAX_LARGO);
  const f = limpiar(input.searchParams.get("fbclid"), MAX_LARGO_FBCLID);
  const r = limpiar(refHost, MAX_LARGO);
  const l = limpiar(input.pathname, MAX_LARGO);
  if (s) datos.s = s;
  if (m) datos.m = m;
  if (c) datos.c = c;
  if (f) datos.f = f;
  if (r) datos.r = r;
  if (l) datos.l = l;
  return datos;
}
