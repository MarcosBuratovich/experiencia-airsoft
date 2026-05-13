import type { createServiceRoleClient } from "./supabase/admin";
import { inicioPartida } from "./partidas";

type AdminSupabase = ReturnType<typeof createServiceRoleClient>;

export const TIPOS_EVENTO = ["muerte", "captura", "reanimacion", "planto"] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/** Margen pasado el fin de la partida en que aún aceptamos eventos. */
export const POST_FIN_MARGIN_MIN = 30;

/**
 * Crudo que viene del sistema local en el body. Validar con Zod afuera.
 */
export type EventoCrudo = {
  local_event_id: string;
  player_number: string;
  tipo: TipoEvento;
  occurred_at: string; // ISO con timezone
};

/**
 * Resultado del procesamiento de un evento individual.
 */
export type ResultadoEvento = {
  local_event_id: string;
  status: "aceptado" | "huerfano" | "duplicado" | "error";
  partida_id?: string | null;
  user_id?: string | null;
  reason?: string;
};

type PartidaActiva = {
  id: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
};

/**
 * Encuentra la partida activa para un usuario dado en un instante.
 *
 * "Activa" = está en curso o terminó hace menos de POST_FIN_MARGIN_MIN
 * minutos, y el usuario tiene check-in `presente: true` para esa partida.
 *
 * Si hay múltiples (caso muy raro: dos partidas que se solapan), elige la
 * que tiene su `inicio` más cercano al `occurredAt` (la más probable).
 */
export async function findPartidaActivaParaUser(
  supabase: AdminSupabase,
  userId: string,
  occurredAt: Date,
): Promise<PartidaActiva | null> {
  const fecha = formatFechaLocal(occurredAt);

  // Traemos todas las partidas del día donde el user hizo check-in presente.
  const { data: rows } = await supabase
    .from("inscripciones")
    .select(
      `
      partidas!inner (id, fecha, hora_inicio, duracion_min, estado),
      checkins!inner (presente)
    `,
    )
    .eq("user_id", userId)
    .eq("partidas.fecha", fecha)
    .neq("partidas.estado", "cancelada")
    .eq("checkins.presente", true);

  if (!rows || rows.length === 0) return null;

  // Filtrar las que están en ventana [inicio, inicio + duracion + margin]
  type Row = {
    partidas:
      | { id: string; fecha: string; hora_inicio: string; duracion_min: number; estado: string }
      | { id: string; fecha: string; hora_inicio: string; duracion_min: number; estado: string }[];
  };
  const candidatas: PartidaActiva[] = [];
  for (const row of rows as Row[]) {
    const p = Array.isArray(row.partidas) ? row.partidas[0] : row.partidas;
    if (!p) continue;
    const inicio = inicioPartida(p.fecha, p.hora_inicio);
    const fin = new Date(
      inicio.getTime() + (p.duracion_min + POST_FIN_MARGIN_MIN) * 60_000,
    );
    if (occurredAt >= inicio && occurredAt <= fin) {
      candidatas.push({
        id: p.id,
        fecha: p.fecha,
        hora_inicio: p.hora_inicio,
        duracion_min: p.duracion_min,
      });
    }
  }

  if (candidatas.length === 0) return null;
  if (candidatas.length === 1) return candidatas[0];

  // Múltiples → la más cercana al occurred_at por inicio
  candidatas.sort((a, b) => {
    const da = Math.abs(
      inicioPartida(a.fecha, a.hora_inicio).getTime() - occurredAt.getTime(),
    );
    const db = Math.abs(
      inicioPartida(b.fecha, b.hora_inicio).getTime() - occurredAt.getTime(),
    );
    return da - db;
  });
  return candidatas[0];
}

/**
 * Procesa un evento crudo:
 *  1. Resuelve player_number → user_id (si no existe → huerfano).
 *  2. Encuentra la partida activa (si no hay → huerfano).
 *  3. Insertá la fila en match_events con onConflict ignoreDuplicates.
 *
 * Idempotencia: si `local_event_id` ya existe, devuelve `duplicado` sin
 * fallar.
 */
export async function procesarEvento(
  supabase: AdminSupabase,
  evento: EventoCrudo,
): Promise<ResultadoEvento> {
  const occurredAt = new Date(evento.occurred_at);
  if (isNaN(occurredAt.getTime())) {
    return {
      local_event_id: evento.local_event_id,
      status: "error",
      reason: "occurred_at no es una fecha válida",
    };
  }

  // 1) Resolver player_number
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("player_number", evento.player_number)
    .maybeSingle();

  let userId: string | null = profile?.id ?? null;
  let partidaId: string | null = null;
  let status: "aceptado" | "huerfano" = "aceptado";
  let reason: string | undefined;

  if (!userId) {
    status = "huerfano";
    reason = "player_number desconocido";
  } else {
    // 2) Buscar partida activa
    const partida = await findPartidaActivaParaUser(supabase, userId, occurredAt);
    if (!partida) {
      status = "huerfano";
      reason = "no hay partida activa con check-in presente para este jugador";
    } else {
      partidaId = partida.id;
    }
  }

  // 3) Insert con onConflict: si local_event_id ya existe → no inserta,
  //    devolvemos duplicado.
  const { data, error } = await supabase
    .from("match_events")
    .insert({
      partida_id: partidaId,
      user_id: userId,
      player_number: evento.player_number,
      tipo: evento.tipo,
      local_event_id: evento.local_event_id,
      occurred_at: evento.occurred_at,
      status,
      reason: reason ?? null,
      raw: evento,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation → es duplicado, no error
    if (error.code === "23505") {
      return {
        local_event_id: evento.local_event_id,
        status: "duplicado",
      };
    }
    return {
      local_event_id: evento.local_event_id,
      status: "error",
      reason: error.message,
    };
  }

  if (!data) {
    return {
      local_event_id: evento.local_event_id,
      status: "duplicado",
    };
  }

  return {
    local_event_id: evento.local_event_id,
    status: status === "aceptado" ? "aceptado" : "huerfano",
    partida_id: partidaId,
    user_id: userId,
    reason,
  };
}

/** Formatea una fecha como 'YYYY-MM-DD' usando hora local (no UTC). */
function formatFechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
