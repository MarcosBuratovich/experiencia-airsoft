/**
 * Calculo de fechas de la proxima semana (lun-dom) en zona
 * America/Argentina/Buenos_Aires. Vercel corre en UTC, entonces usamos
 * Intl para obtener "hoy" en AR y luego hacemos aritmetica con UTC
 * (Argentina no tiene DST, asi que es seguro).
 */

const AR_TZ = "America/Argentina/Buenos_Aires";

/** Devuelve 'YYYY-MM-DD' del dia actual en Argentina. */
export function hoyEnArgentina(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // 'YYYY-MM-DD'
}

/** Suma n dias a una fecha ISO y devuelve otra fecha ISO. */
export function sumarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Devuelve 0=dom, ..., 6=sab para una fecha ISO. */
export function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Devuelve las 7 fechas (lun a dom) de la SEMANA PROXIMA relativa a hoyAR.
 * Si hoy es lunes, devuelve la semana que viene (lun +7).
 */
export function fechasSemanaProxima(now: Date = new Date()): string[] {
  const hoy = hoyEnArgentina(now);
  const dow = diaSemanaDe(hoy); // 0=dom,...,6=sab
  // dias hasta el LUNES proximo (no el de esta semana).
  // dom(0)→+1, lun(1)→+7, mar(2)→+6, mie(3)→+5, jue(4)→+4, vie(5)→+3, sab(6)→+2
  const offset = ((1 - dow + 7) % 7) || 7;
  const lunes = sumarDias(hoy, offset);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/**
 * Fechas de la SEMANA ACTUAL desde HOY hasta el domingo inclusive.
 * Si hoy es lunes: 7 fechas (lun a dom). Si hoy es domingo: solo hoy.
 */
export function fechasSemanaActualDesdeHoy(now: Date = new Date()): string[] {
  const hoy = hoyEnArgentina(now);
  const dow = diaSemanaDe(hoy); // 0=dom,...,6=sab
  const dias = dow === 0 ? 1 : 8 - dow;
  return Array.from({ length: dias }, (_, i) => sumarDias(hoy, i));
}
