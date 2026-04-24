/** Ventana de inscripción: hasta 1 hora pasado el horario de inicio. */
export const VENTANA_INSCRIPCION_MS = 60 * 60 * 1000;

export function inicioPartida(fecha: string, hora_inicio: string): Date {
  // fecha = 'YYYY-MM-DD', hora_inicio = 'HH:MM' o 'HH:MM:SS'
  return new Date(`${fecha}T${hora_inicio}`);
}

export function dentroDeVentana(fecha: string, hora_inicio: string, now = new Date()): boolean {
  const inicio = inicioPartida(fecha, hora_inicio).getTime();
  return now.getTime() <= inicio + VENTANA_INSCRIPCION_MS;
}

export function yaEmpezo(fecha: string, hora_inicio: string, now = new Date()): boolean {
  return now.getTime() >= inicioPartida(fecha, hora_inicio).getTime();
}
