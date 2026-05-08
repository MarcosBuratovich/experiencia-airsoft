import type { createClient } from "./supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type LeaderRow = {
  user_id: string;
  player_number: string;
  nombre: string;
  apellido: string;
  clan_id: string | null;
  muertes: number;
  capturas: number;
  reanimaciones: number;
  plantos: number;
  partidas_jugadas: number;
  score: number;
};

export type SortKey =
  | "score"
  | "capturas"
  | "reanimaciones"
  | "plantos"
  | "muertes_asc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "capturas", label: "Capturas" },
  { key: "reanimaciones", label: "Reanimaciones" },
  { key: "plantos", label: "Plantos" },
  { key: "muertes_asc", label: "Menos muertes" },
];

function applySort(rows: LeaderRow[], sort: SortKey): LeaderRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "capturas":
      sorted.sort((a, b) => b.capturas - a.capturas || b.score - a.score);
      break;
    case "reanimaciones":
      sorted.sort((a, b) => b.reanimaciones - a.reanimaciones || b.score - a.score);
      break;
    case "plantos":
      sorted.sort((a, b) => b.plantos - a.plantos || b.score - a.score);
      break;
    case "muertes_asc":
      sorted.sort((a, b) => a.muertes - b.muertes || b.score - a.score);
      break;
    case "score":
    default:
      sorted.sort((a, b) => b.score - a.score || a.muertes - b.muertes);
  }
  return sorted;
}

export async function getLeaderboardGlobal(
  supabase: ServerSupabase,
  opts: { sort?: SortKey; limit?: number } = {},
): Promise<LeaderRow[]> {
  const { data } = await supabase
    .from("match_stats_global")
    .select(
      "user_id, player_number, nombre, apellido, clan_id, muertes, capturas, reanimaciones, plantos, partidas_jugadas, score",
    );
  if (!data) return [];
  const rows = data as LeaderRow[];
  const sorted = applySort(rows, opts.sort ?? "score");
  return sorted.slice(0, opts.limit ?? 50);
}

/**
 * Versión mensual del leaderboard global. Lee la vista
 * `match_stats_mensual` filtrada por periodo 'YYYY-MM'.
 */
export async function getLeaderboardMensual(
  supabase: ServerSupabase,
  periodo: string,
  opts: { sort?: SortKey; limit?: number } = {},
): Promise<LeaderRow[]> {
  const { data } = await supabase
    .from("match_stats_mensual")
    .select(
      "user_id, player_number, nombre, apellido, clan_id, muertes, capturas, reanimaciones, plantos, partidas_jugadas, score",
    )
    .eq("periodo", periodo);
  if (!data) return [];
  const rows = data as LeaderRow[];
  const sorted = applySort(rows, opts.sort ?? "score");
  return sorted.slice(0, opts.limit ?? 50);
}

/**
 * Devuelve los últimos N periodos 'YYYY-MM' (incluyendo el actual)
 * para poblar el selector de meses.
 */
export function periodosUltimos(n: number, now: Date = new Date()): string[] {
  const periodos: string[] = [];
  let y = now.getFullYear();
  let m = now.getMonth() + 1; // 1..12
  for (let i = 0; i < n; i++) {
    periodos.push(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }
  return periodos;
}

export type ClanLeaderRow = {
  clan_id: string;
  slug: string;
  clan_nombre: string;
  color_hex: string | null;
  muertes: number;
  capturas: number;
  reanimaciones: number;
  plantos: number;
  miembros_activos: number;
  partidas_jugadas: number;
  score: number;
};

export async function getClanStats(
  supabase: ServerSupabase,
  clanId: string,
): Promise<ClanLeaderRow | null> {
  const { data } = await supabase
    .from("match_stats_clan")
    .select(
      "clan_id, slug, clan_nombre, color_hex, muertes, capturas, reanimaciones, plantos, miembros_activos, partidas_jugadas, score",
    )
    .eq("clan_id", clanId)
    .maybeSingle();
  return (data as ClanLeaderRow | null) ?? null;
}

export async function getLeaderboardClanes(
  supabase: ServerSupabase,
): Promise<ClanLeaderRow[]> {
  const { data } = await supabase
    .from("match_stats_clan")
    .select(
      "clan_id, slug, clan_nombre, color_hex, muertes, capturas, reanimaciones, plantos, miembros_activos, partidas_jugadas, score",
    )
    .order("score", { ascending: false });
  return (data as ClanLeaderRow[]) ?? [];
}

export type PartidaScoreboardRow = {
  partida_id: string;
  user_id: string;
  player_number: string;
  nombre: string;
  apellido: string;
  muertes: number;
  capturas: number;
  reanimaciones: number;
  plantos: number;
};

export async function getScoreboardPartida(
  supabase: ServerSupabase,
  partidaId: string,
): Promise<PartidaScoreboardRow[]> {
  const { data } = await supabase
    .from("match_stats_by_partida")
    .select(
      "partida_id, user_id, player_number, nombre, apellido, muertes, capturas, reanimaciones, plantos",
    )
    .eq("partida_id", partidaId);
  return (data as PartidaScoreboardRow[]) ?? [];
}
