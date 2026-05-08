import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getLeaderboardGlobal,
  SORT_OPTIONS,
  type LeaderRow,
  type SortKey,
} from "@/lib/ranking";

const VALID_SORTS = SORT_OPTIONS.map((o) => o.key);

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort: SortKey = (VALID_SORTS as string[]).includes(sortParam ?? "")
    ? (sortParam as SortKey)
    : "score";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = await getLeaderboardGlobal(supabase, { sort, limit: 50 });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="sect-label mb-2">Comunidad · all-time</p>
        <h1 className="sect-title fluid-3xl">Ranking</h1>
      </div>

      {/* Tabs de sort */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={`/ranking?sort=${opt.key}`}
            className={`px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.18em] border transition cursor-pointer ${
              sort === opt.key
                ? "bg-orange text-ink border-orange"
                : "border-rail/60 text-ash hover:border-orange"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {!rows.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Todavía no hay stats. Las primeras partidas con eventos del local
            van a aparecer acá.
          </p>
        </div>
      ) : (
        <>
          {/* Podio top 3 */}
          {rows.length >= 1 && <Podio rows={rows.slice(0, 3)} sort={sort} />}

          {/* Resto */}
          <h2 className="sect-label mt-10 mb-3">Tabla completa</h2>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-2">
            {rows.map((r, i) => (
              <PlayerCard key={r.user_id} row={r} pos={i + 1} sort={sort} />
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block border border-rail/60 clip-notch overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-carbon">
                <tr className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
                  <th className="text-left px-3 py-3 w-12">#</th>
                  <th className="text-left px-3 py-3">Jugador</th>
                  <Th label="Score" col="score" sort={sort} />
                  <Th label="Capt." col="capturas" sort={sort} />
                  <Th label="Reanim." col="reanimaciones" sort={sort} />
                  <Th label="Plant." col="plantos" sort={sort} />
                  <Th label="Muertes" col="muertes" sort={sort} />
                  <th className="text-right px-3 py-3">Partidas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.user_id}
                    className={`border-t border-rail/40 ${
                      i < 3 ? "bg-orange/5" : "hover:bg-carbon/40"
                    }`}
                  >
                    <td className="px-3 py-3 font-display fluid-lg text-smoke">
                      {i + 1}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-bone">
                        {r.nombre} {r.apellido}
                      </p>
                      <p className="font-mono fluid-xs text-smoke tracking-[.18em]">
                        #{r.player_number}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-display fluid-lg text-orange">
                      {r.score}
                    </td>
                    <Td value={r.capturas} highlight={sort === "capturas"} />
                    <Td value={r.reanimaciones} highlight={sort === "reanimaciones"} />
                    <Td value={r.plantos} highlight={sort === "plantos"} />
                    <Td
                      value={r.muertes}
                      highlight={sort === "muertes_asc"}
                      muted
                    />
                    <td className="px-3 py-3 text-right font-mono fluid-xs text-ash">
                      {r.partidas_jugadas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-8 font-mono fluid-xs text-smoke uppercase tracking-[.22em]">
        // Score = capturas×3 + reanimaciones×2 + plantos×5 − muertes
      </p>
    </div>
  );
}

function Podio({ rows, sort }: { rows: LeaderRow[]; sort: SortKey }) {
  // Ordenar visualmente: 2do · 1ro · 3ro
  const podiumOrder =
    rows.length === 3
      ? [rows[1], rows[0], rows[2]]
      : rows.length === 2
        ? [rows[1], rows[0]]
        : rows;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
      {podiumOrder.map((r) => {
        const pos = rows.indexOf(r) + 1;
        const tone =
          pos === 1
            ? "border-orange bg-orange/10"
            : pos === 2
              ? "border-bone/40 bg-bone/5"
              : "border-rail/60 bg-carbon";
        const valor =
          sort === "capturas"
            ? r.capturas
            : sort === "reanimaciones"
              ? r.reanimaciones
              : sort === "plantos"
                ? r.plantos
                : sort === "muertes_asc"
                  ? r.muertes
                  : r.score;
        return (
          <div
            key={r.user_id}
            className={`border-2 ${tone} clip-notch p-4 sm:p-5 flex flex-col gap-2 ${
              pos === 1 ? "sm:scale-105" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display fluid-2xl text-orange leading-none">
                #{pos}
              </span>
              <span className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                #{r.player_number}
              </span>
            </div>
            <p className="font-display fluid-lg text-bone uppercase tracking-wider truncate">
              {r.nombre} {r.apellido}
            </p>
            <div className="flex items-end justify-between mt-auto">
              <span className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
                {SORT_OPTIONS.find((o) => o.key === sort)?.label}
              </span>
              <span className="font-display fluid-3xl text-bone leading-none">
                {valor}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerCard({
  row: r,
  pos,
  sort,
}: {
  row: LeaderRow;
  pos: number;
  sort: SortKey;
}) {
  return (
    <li
      className={`border ${
        pos <= 3 ? "border-orange/60 bg-orange/5" : "border-rail/60 bg-carbon"
      } clip-notch p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display fluid-xl text-smoke shrink-0">
            #{pos}
          </span>
          <div className="min-w-0">
            <p className="text-bone truncate">
              {r.nombre} {r.apellido}
            </p>
            <p className="font-mono fluid-xs text-smoke tracking-[.18em]">
              #{r.player_number}
            </p>
          </div>
        </div>
        <span className="font-display fluid-2xl text-orange shrink-0">
          {r.score}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-rail/40 text-center">
        <Stat
          label="Capt."
          value={r.capturas}
          highlight={sort === "capturas"}
        />
        <Stat
          label="Reanim."
          value={r.reanimaciones}
          highlight={sort === "reanimaciones"}
        />
        <Stat
          label="Plant."
          value={r.plantos}
          highlight={sort === "plantos"}
        />
        <Stat
          label="Muertes"
          value={r.muertes}
          highlight={sort === "muertes_asc"}
          muted
        />
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="sect-label mb-0.5">{label}</p>
      <p
        className={`font-display fluid-lg ${
          highlight ? "text-orange" : muted ? "text-smoke" : "text-bone"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Th({
  label,
  col,
  sort,
}: {
  label: string;
  col: string;
  sort: SortKey;
}) {
  const isActive =
    sort === col ||
    (col === "muertes" && sort === "muertes_asc");
  return (
    <th
      className={`text-right px-3 py-3 ${
        isActive ? "text-orange" : ""
      }`}
    >
      {label}
    </th>
  );
}

function Td({
  value,
  highlight,
  muted,
}: {
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right font-mono ${
        highlight ? "text-orange font-display fluid-lg" : muted ? "text-smoke" : "text-ash"
      }`}
    >
      {value}
    </td>
  );
}
