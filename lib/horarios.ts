/**
 * Horarios recurrentes oficiales de Experiencia Airsoft.
 * Dentro de estos slots se organizan las partidas publicas regulares;
 * las solicitudes de privada tienen que caer FUERA de esta ventana para
 * no pisar el calendario.
 */

export type RecurringSlot = {
  diaSemana: number; // 0 = domingo, 1 = lunes, ..., 6 = sabado
  desde: string; // 'HH:MM'
  hasta: string; // 'HH:MM'
  label: string;
};

export const HORARIOS_RECURRENTES: RecurringSlot[] = [
  { diaSemana: 3, desde: "19:00", hasta: "23:00", label: "Miércoles 19-23" },
  { diaSemana: 4, desde: "19:00", hasta: "23:00", label: "Jueves 19-23" },
  { diaSemana: 6, desde: "09:00", hasta: "13:00", label: "Sábado 9-13" },
  { diaSemana: 0, desde: "09:00", hasta: "13:00", label: "Domingo 9-13" },
];

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function parseFecha(fecha: string): Date {
  // 'YYYY-MM-DD' interpretado como fecha local (no UTC shift)
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Devuelve el slot recurrente que pisaria esta propuesta, o null si cae libre.
 * Consideramos que pisa si la hora inicio cae dentro del slot (desde, hasta).
 */
export function slotRecurrentePisado(
  fecha: string,
  hora_inicio: string,
): RecurringSlot | null {
  const d = parseFecha(fecha);
  const dia = d.getDay();
  const min = hhmmToMinutes(hora_inicio);
  for (const slot of HORARIOS_RECURRENTES) {
    if (slot.diaSemana !== dia) continue;
    if (min >= hhmmToMinutes(slot.desde) && min < hhmmToMinutes(slot.hasta)) {
      return slot;
    }
  }
  return null;
}

export function labelDiaSemana(d: number): string {
  return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d] ?? "";
}
