import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo } from "@/lib/partidas";
import { getScoreboardPartida } from "@/lib/ranking";

type Fila = {
  user_id: string;
  player_number: string | null;
  nombre: string;
  apellido: string;
  socio: boolean;
  eliminaciones: number;
  capturas: number;
  reanimaciones: number;
  plantos: number;
  score: number;
};

function calcScore(s: { capturas: number; reanimaciones: number; plantos: number; eliminaciones: number }) {
  return s.capturas * 3 + s.reanimaciones * 2 + s.plantos * 5 - s.eliminaciones;
}

export default async function ScoreboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  // Inscriptos confirmados (incluyendo los que no tienen eventos)
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select(
      "user_id, profiles!inner(id, nombre, apellido, socio, player_number)",
    )
    .eq("partida_id", id)
    .eq("estado", "confirmado");

  // Stats por jugador desde la vista
  const statsRows = await getScoreboardPartida(supabase, id);
  const statsByUser = new Map<string, (typeof statsRows)[number]>();
  for (const s of statsRows) statsByUser.set(s.user_id, s);

  // Armar filas
  const filas: Fila[] = (inscripciones ?? []).map((i) => {
    const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
    const s = statsByUser.get(i.user_id);
    const eliminaciones = s?.eliminaciones ?? 0;
    const capturas = s?.capturas ?? 0;
    const reanimaciones = s?.reanimaciones ?? 0;
    const plantos = s?.plantos ?? 0;
    return {
      user_id: i.user_id,
      player_number: p?.player_number ?? null,
      nombre: p?.nombre ?? "",
      apellido: p?.apellido ?? "",
      socio: !!p?.socio,
      eliminaciones,
      capturas,
      reanimaciones,
      plantos,
      score: calcScore({ eliminaciones, capturas, reanimaciones, plantos }),
    };
  });

  // Sort: score descendente, eliminaciones ascendente como tiebreaker
  filas.sort((a, b) => b.score - a.score || a.eliminaciones - b.eliminaciones);

  const totales = filas.reduce(
    (acc, f) => ({
      eliminaciones: acc.eliminaciones + f.eliminaciones,
      capturas: acc.capturas + f.capturas,
      reanimaciones: acc.reanimaciones + f.reanimaciones,
      plantos: acc.plantos + f.plantos,
    }),
    { eliminaciones: 0, capturas: 0, reanimaciones: 0, plantos: 0 },
  );

  const estadoFx = estadoEfectivo({
    fecha: partida.fecha,
    hora_inicio: partida.hora_inicio,
    duracion_min: partida.duracion_min,
    estado: partida.estado,
  });

  const sinEventos =
    totales.eliminaciones + totales.capturas + totales.reanimaciones + totales.plantos === 0;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/partidas/${id}`}
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Partida
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
          <h1 className="sect-title fluid-3xl mt-3">
            Scoreboard · {modalidadLabel(partida.modalidad)}
          </h1>
          <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
            {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)}
          </p>
        </div>
        {estadoFx === "en_curso" && (
          <span className="px-2 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.18em] inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ink pulse-dot" />
            En curso
          </span>
        )}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Capturas" value={totales.capturas} />
        <Stat label="Reanim." value={totales.reanimaciones} />
        <Stat label="Plantos" value={totales.plantos} />
        <Stat label="Elim." value={totales.eliminaciones} muted />
      </div>

      {sinEventos && (
        <div className="mb-6 border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            {estadoFx === "futura"
              ? "La partida no empezó. Cuando arranque, el sistema local va a ir cargando eventos."
              : estadoFx === "en_curso"
                ? "Sin eventos todavía. El sistema local los carga en vivo."
                : "Esta partida no recibió eventos del sistema local."}
          </p>
        </div>
      )}

      {/* Mobile cards */}
      <ul className="md:hidden space-y-2">
        {filas.map((f, i) => (
          <FilaCard key={f.user_id} fila={f} pos={i + 1} />
        ))}
      </ul>

      {/* Desktop table */}
      {!!filas.length && (
        <div className="hidden md:block border border-rail/60 clip-notch overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-carbon">
              <tr className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
                <th className="text-left px-3 py-3 w-12">#</th>
                <th className="text-left px-3 py-3">Jugador</th>
                <th className="text-right px-3 py-3">Score</th>
                <th className="text-right px-3 py-3">Capt.</th>
                <th className="text-right px-3 py-3">Reanim.</th>
                <th className="text-right px-3 py-3">Plant.</th>
                <th className="text-right px-3 py-3">Elim.</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr
                  key={f.user_id}
                  className={`border-t border-rail/40 ${
                    i < 3 && f.score > 0 ? "bg-orange/5" : "hover:bg-carbon/40"
                  }`}
                >
                  <td className="px-3 py-3 font-display fluid-lg text-smoke">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-bone">
                        {f.nombre} {f.apellido}
                      </span>
                      {f.socio && (
                        <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                          Socio
                        </span>
                      )}
                    </div>
                    {f.player_number && (
                      <p className="font-mono fluid-xs text-smoke tracking-[.18em]">
                        #{f.player_number}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-display fluid-lg text-orange">
                    {f.score}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ash">{f.capturas}</td>
                  <td className="px-3 py-3 text-right font-mono text-ash">
                    {f.reanimaciones}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ash">{f.plantos}</td>
                  <td className="px-3 py-3 text-right font-mono text-smoke">
                    {f.eliminaciones}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 font-mono fluid-xs text-smoke uppercase tracking-[.22em]">
        // Score = capturas×3 + reanimaciones×2 + plantos×5 − eliminaciones
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="border border-rail/60 bg-carbon clip-notch p-3 sm:p-4">
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display fluid-xl sm:fluid-2xl ${
          muted ? "text-smoke" : "text-bone"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function FilaCard({ fila: f, pos }: { fila: Fila; pos: number }) {
  return (
    <li
      className={`border ${
        pos <= 3 && f.score > 0 ? "border-orange/60 bg-orange/5" : "border-rail/60 bg-carbon"
      } clip-notch p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display fluid-xl text-smoke shrink-0">#{pos}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-bone truncate">
                {f.nombre} {f.apellido}
              </span>
              {f.socio && (
                <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                  Socio
                </span>
              )}
            </div>
            {f.player_number && (
              <p className="font-mono fluid-xs text-smoke tracking-[.18em]">
                #{f.player_number}
              </p>
            )}
          </div>
        </div>
        <span className="font-display fluid-2xl text-orange shrink-0">{f.score}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-rail/40 text-center">
        <Mini label="Capt." value={f.capturas} />
        <Mini label="Reanim." value={f.reanimaciones} />
        <Mini label="Plant." value={f.plantos} />
        <Mini label="Elim." value={f.eliminaciones} muted />
      </div>
    </li>
  );
}

function Mini({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="sect-label mb-0.5">{label}</p>
      <p className={`font-display fluid-lg ${muted ? "text-smoke" : "text-bone"}`}>
        {value}
      </p>
    </div>
  );
}
