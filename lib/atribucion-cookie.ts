/**
 * Constantes de la cookie de atribución, compartidas entre el navegador y
 * el server.
 *
 * Viven en su propio módulo a propósito: `lib/atribucion.ts` importa
 * `next/headers`, y con eso el bundler marca el archivo entero como
 * server-only. Un Client Component que quisiera leer estas dos constantes
 * desde ahí rompe el build. Separarlas es lo que hace que el componente de
 * captura pueda importarlas sin arrastrar nada de servidor.
 */

/** Nombre de la cookie first-party de atribución. */
export const COOKIE_ATRIBUCION = "ea_attr";

/** 400 días: el techo que respeta Chrome para cookies. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * Largo máximo de un campo de la cookie. Comparten este número la lectura
 * (`parsearAtribucion` en `lib/atribucion.ts`, que trunca al parsear) y la
 * escritura (`CapturaAtribucion`, que trunca antes de armar el JSON) — que
 * vivan acá evita que se desincronicen.
 */
export const MAX_LARGO = 100;

/** Los fbclid son largos de verdad. */
export const MAX_LARGO_FBCLID = 255;
