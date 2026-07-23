/**
 * Helpers de fases de una partida.
 *
 * Estados en DB: 'abierta' | 'cerrada' | 'cancelada' (manuales del admin).
 * Estado EFECTIVO calculado: combina el de DB con la fecha/hora actual.
 *
 *   futura     → todavía no arrancó y la inscripción está abierta.
 *   en_curso   → ya arrancó y aún no terminó (inicio + duración).
 *   pasada     → terminó. Sólo se ve el resumen / deudas.
 *   cancelada  → admin la canceló (manual).
 *
 * Inscripción: queda abierta hasta `INSCRIPCION_CIERRE_MIN` minutos después
 * del horario de inicio. El admin también puede cerrarla manualmente
 * (estado = 'cerrada' en DB).
 *
 * Check-in: NO usa el estado efectivo. Se habilita desde las 00:00 del día de
 * la partida (ver `checkinAbierto`), porque la gente llega y se cobra bastante
 * antes del horario de inicio.
 */

export const INSCRIPCION_CIERRE_MIN = 30;

export type EstadoEfectivo = "futura" | "en_curso" | "pasada" | "cancelada";

export type PartidaCore = {
  fecha: string; // 'YYYY-MM-DD'
  hora_inicio: string; // 'HH:MM' o 'HH:MM:SS'
  duracion_min: number;
  estado: string; // 'abierta' | 'cerrada' | 'cancelada'
};

/**
 * Offset fijo de Argentina (UTC-3). Argentina no aplica DST desde 2009,
 * así que es seguro hardcodearlo.
 */
const TZ_ARG_OFFSET = "-03:00";

/**
 * Combina `fecha` ('YYYY-MM-DD') y `hora_inicio` ('HH:MM' o 'HH:MM:SS') como
 * un instante en hora argentina. Sin esto, `new Date('2026-05-13T19:00:00')`
 * se interpreta como UTC en Vercel (server-side), corriendo todos los
 * cálculos 3hs hacia adelante.
 */
export function inicioPartida(fecha: string, hora_inicio: string): Date {
  const h = hora_inicio.length === 5 ? `${hora_inicio}:00` : hora_inicio;
  return new Date(`${fecha}T${h}${TZ_ARG_OFFSET}`);
}

export function finPartida(
  fecha: string,
  hora_inicio: string,
  duracion_min: number,
): Date {
  return new Date(inicioPartida(fecha, hora_inicio).getTime() + duracion_min * 60_000);
}

export function estadoEfectivo(p: PartidaCore, now: Date = new Date()): EstadoEfectivo {
  if (p.estado === "cancelada") return "cancelada";
  const t = now.getTime();
  const inicio = inicioPartida(p.fecha, p.hora_inicio).getTime();
  const fin = inicio + p.duracion_min * 60_000;
  if (t < inicio) return "futura";
  if (t < fin) return "en_curso";
  return "pasada";
}

/**
 * ¿Se puede anotar / desanotar a esta partida?
 * Reglas:
 *  - estado en DB no puede ser 'cerrada' ni 'cancelada'
 *  - now ≤ inicio + INSCRIPCION_CIERRE_MIN
 */
export function inscripcionAbierta(p: PartidaCore, now: Date = new Date()): boolean {
  if (p.estado !== "abierta") return false;
  const limite =
    inicioPartida(p.fecha, p.hora_inicio).getTime() + INSCRIPCION_CIERRE_MIN * 60_000;
  return now.getTime() <= limite;
}

export function yaEmpezo(p: PartidaCore, now: Date = new Date()): boolean {
  return now.getTime() >= inicioPartida(p.fecha, p.hora_inicio).getTime();
}

/** 00:00 (hora argentina) del día de la partida. */
export function inicioDelDia(fecha: string): Date {
  return inicioPartida(fecha, "00:00");
}

/**
 * ¿Se puede hacer el check-in de esta partida?
 *
 * Ventana = [00:00 del día de la partida, fin de la partida], en hora
 * argentina. Arranca a la medianoche —y no a la hora de inicio— porque el
 * admin necesita poder cobrar y marcar presentes a todos los que van llegando
 * durante el día, no recién cuando la partida empieza. Termina junto con la
 * partida: a partir de ahí la pantalla pasa a ser el resumen.
 *
 * Una partida cancelada nunca habilita check-in. El estado 'cerrada' (que solo
 * cierra la inscripción) sí lo habilita.
 */
export function checkinAbierto(p: PartidaCore, now: Date = new Date()): boolean {
  if (p.estado === "cancelada") return false;
  const t = now.getTime();
  const desde = inicioDelDia(p.fecha).getTime();
  const hasta =
    inicioPartida(p.fecha, p.hora_inicio).getTime() + p.duracion_min * 60_000;
  return t >= desde && t < hasta;
}
