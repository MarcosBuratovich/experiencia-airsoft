import type { createClient } from "./supabase/server";
import { HORARIOS_RECURRENTES } from "./horarios";
import { hoyEnArgentina, sumarDias } from "./semana";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Duración por defecto (fallback) cuando una partida/solicitud no tiene
 * duracion_min. Las privadas se ofrecen en 4 turnos por día (Lun a Dom) y
 * cada turno tiene su propia duración — no son todos de 4 hs (ver SLOTS_PRIVADA).
 */
export const SLOT_DURACION_MIN = 240;

/**
 * Turnos fijos que se ofrecen para reserva de privada, de Lunes a Domingo.
 * Cada turno arranca a `hora` y dura `duracionMin` minutos (algunos de 3 hs,
 * otros de 4 hs).
 */
export const SLOTS_PRIVADA: ReadonlyArray<{
  hora: string; // 'HH:MM:SS'
  label: string;
  duracionMin: number;
}> = [
  { hora: "09:00:00", label: "9 — 13 hs", duracionMin: 240 }, // Turno Mañana
  { hora: "13:00:00", label: "13 — 16 hs", duracionMin: 180 }, // Turno Tarde
  { hora: "16:00:00", label: "16 — 19 hs", duracionMin: 180 }, // Tarde Noche
  { hora: "19:00:00", label: "19 — 23 hs", duracionMin: 240 }, // Turno Noche
];

/** Duración (min) del turno que arranca a `hora`. Fallback a SLOT_DURACION_MIN. */
export function duracionDeSlot(hora: string): number {
  return (
    SLOTS_PRIVADA.find((s) => s.hora === hora)?.duracionMin ?? SLOT_DURACION_MIN
  );
}

export type SlotEstado =
  | "disponible"
  | "publica"     // ya hay partida pública creada en ese rango
  | "reservada"   // slot fijo reservado para públicas (Wed/Thu 19, Sat/Sun 9)
  | "pendiente"   // solicitud de privada esperando admin
  | "aprobada"    // privada ya creada en ese slot
  | "pasada";     // fecha en el pasado

export type Slot = {
  fecha: string;       // 'YYYY-MM-DD'
  hora: string;        // 'HH:MM:SS'
  estado: SlotEstado;
};

function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** True si (fecha, hora) cae en un slot reservado a las públicas regulares. */
export function slotEsReservado(fecha: string, hora: string): boolean {
  const dia = diaSemanaDe(fecha);
  const min = hhmmToMin(hora);
  return HORARIOS_RECURRENTES.some(
    (s) => s.diaSemana === dia && min >= hhmmToMin(s.desde) && min < hhmmToMin(s.hasta),
  );
}

/**
 * Calcula el estado de cada slot (fecha, hora) en un rango de fechas.
 * Retorna un Map con clave `${fecha}|${hora}` para lookup O(1).
 *
 * Reglas de prioridad (de mayor a menor):
 *   1. pasada
 *   2. publica  — hay partida pública en ese rango
 *   3. aprobada — ya hay privada confirmada en ese slot
 *   4. pendiente — solicitud esperando admin
 *   5. reservada — slot que solo admin puede liberar para privada
 *   6. disponible
 */
export async function getSlotsEstado(
  supabase: ServerSupabase,
  fechas: string[],
): Promise<Map<string, SlotEstado>> {
  const map = new Map<string, SlotEstado>();
  if (!fechas.length) return map;

  const fechasOrdenadas = [...fechas].sort();
  const min = fechasOrdenadas[0];
  const max = fechasOrdenadas[fechasOrdenadas.length - 1];
  const hoy = hoyEnArgentina();

  // 1) Partidas existentes (públicas o privadas, no canceladas) en el rango.
  const { data: partidas } = await supabase
    .from("partidas")
    .select("fecha, hora_inicio, duracion_min, visibilidad")
    .gte("fecha", min)
    .lte("fecha", max)
    .neq("estado", "cancelada");

  // 2) Solicitudes pendientes en el rango.
  const { data: pendientes } = await supabase
    .from("solicitudes_privada")
    .select("fecha_propuesta, hora_inicio, duracion_min")
    .gte("fecha_propuesta", min)
    .lte("fecha_propuesta", max)
    .eq("estado", "pendiente");

  // 3) Overrides de admin (slots reservados habilitados puntualmente).
  const { data: overrides } = await supabase
    .from("slots_privada_overrides")
    .select("fecha, hora_inicio, habilitado")
    .gte("fecha", min)
    .lte("fecha", max);
  const overridesSet = new Set<string>();
  for (const o of overrides ?? []) {
    if (o.habilitado) overridesSet.add(`${o.fecha}|${o.hora_inicio}`);
  }

  // Indexar por fecha → conjuntos de horas ocupadas
  type Ocupacion = { startMin: number; endMin: number; visibilidad: string };
  const partidasPorFecha = new Map<string, Ocupacion[]>();
  for (const p of partidas ?? []) {
    const start = hhmmToMin(p.hora_inicio);
    const end = start + (p.duracion_min ?? SLOT_DURACION_MIN);
    const arr = partidasPorFecha.get(p.fecha) ?? [];
    arr.push({ startMin: start, endMin: end, visibilidad: p.visibilidad });
    partidasPorFecha.set(p.fecha, arr);
  }
  // Pendientes como rangos [start, end) para detectar solapamiento — no
  // comparamos por hora exacta para que una solicitud vieja (hecha con otra
  // grilla de horarios, p.ej. 14:00) siga bloqueando los slots nuevos que pisa.
  const pendientesPorFecha = new Map<string, Ocupacion[]>();
  for (const r of pendientes ?? []) {
    const start = hhmmToMin(r.hora_inicio);
    const end = start + (r.duracion_min ?? SLOT_DURACION_MIN);
    const arr = pendientesPorFecha.get(r.fecha_propuesta) ?? [];
    arr.push({ startMin: start, endMin: end, visibilidad: "privada" });
    pendientesPorFecha.set(r.fecha_propuesta, arr);
  }

  for (const fecha of fechasOrdenadas) {
    for (const { hora, duracionMin } of SLOTS_PRIVADA) {
      const key = `${fecha}|${hora}`;
      const slotStart = hhmmToMin(hora);
      const slotEnd = slotStart + duracionMin;

      // 1. Pasada
      if (fecha < hoy) {
        map.set(key, "pasada");
        continue;
      }

      // 2/3. Partida existente que se solapa con el slot
      const ocupaciones = partidasPorFecha.get(fecha) ?? [];
      const conflicto = ocupaciones.find(
        (o) => o.startMin < slotEnd && o.endMin > slotStart,
      );
      if (conflicto) {
        map.set(key, conflicto.visibilidad === "privada" ? "aprobada" : "publica");
        continue;
      }

      // 4. Solicitud pendiente que se solapa con el slot (por rango, no hora exacta)
      const pendiente = (pendientesPorFecha.get(fecha) ?? []).find(
        (o) => o.startMin < slotEnd && o.endMin > slotStart,
      );
      if (pendiente) {
        map.set(key, "pendiente");
        continue;
      }

      // 5. Slot reservado para públicas (a menos que admin lo haya liberado)
      if (slotEsReservado(fecha, hora) && !overridesSet.has(key)) {
        map.set(key, "reservada");
        continue;
      }

      // 6. Libre
      map.set(key, "disponible");
    }
  }

  return map;
}

/** Devuelve N fechas consecutivas a partir de hoy AR. */
export function rangoDeFechasAhora(dias: number, now: Date = new Date()): string[] {
  const hoy = hoyEnArgentina(now);
  return Array.from({ length: dias }, (_, i) => sumarDias(hoy, i));
}
