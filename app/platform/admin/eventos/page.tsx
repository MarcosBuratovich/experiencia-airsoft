import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { TIPOS_EVENTO } from "@/lib/match-events";
import { EventosTable } from "./eventos-table";

const STATUS_OPTS = [
  { value: "all", label: "Todos" },
  { value: "aceptado", label: "Aceptados" },
  { value: "huerfano", label: "Huérfanos" },
  { value: "rechazado", label: "Rechazados" },
];

const TIPO_OPTS = [
  { value: "all", label: "Todos" },
  ...TIPOS_EVENTO.map((t) => ({ value: t, label: t })),
];

const STATUS_VALID = new Set(STATUS_OPTS.map((s) => s.value));
const TIPO_VALID = new Set(TIPO_OPTS.map((t) => t.value));

export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUS_VALID.has(sp.status ?? "") ? sp.status! : "all";
  const tipo = TIPO_VALID.has(sp.tipo ?? "") ? sp.tipo! : "all";

  const supabase = await createClient();

  let query = supabase
    .from("match_events")
    .select(
      "id, partida_id, user_id, player_number, tipo, local_event_id, occurred_at, ingested_at, status, reason",
    )
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);
  if (tipo !== "all") query = query.eq("tipo", tipo);

  const { data: eventos } = await query;

  const userIds = Array.from(
    new Set((eventos ?? []).map((e) => e.user_id).filter((v): v is string => !!v)),
  );
  const partidaIds = Array.from(
    new Set((eventos ?? []).map((e) => e.partida_id).filter((v): v is string => !!v)),
  );

  const profileMap = new Map<string, { nombre: string; apellido: string }>();
  if (userIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nombre, apellido")
      .in("id", userIds);
    for (const p of data ?? []) {
      profileMap.set(p.id, { nombre: p.nombre, apellido: p.apellido });
    }
  }

  const partidaMap = new Map<
    string,
    { fecha: string; hora_inicio: string; modalidad: string }
  >();
  if (partidaIds.length) {
    const { data } = await supabase
      .from("partidas")
      .select("id, fecha, hora_inicio, modalidad")
      .in("id", partidaIds);
    for (const p of data ?? []) {
      partidaMap.set(p.id, {
        fecha: p.fecha,
        hora_inicio: p.hora_inicio,
        modalidad: p.modalidad,
      });
    }
  }

  // Stats arriba
  const total = eventos?.length ?? 0;
  const huerfanos = (eventos ?? []).filter((e) => e.status === "huerfano").length;
  const aceptados = (eventos ?? []).filter((e) => e.status === "aceptado").length;

  // Partidas elegibles para reasignar (recientes)
  const { data: partidasRecientes } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, modalidad")
    .gte(
      "fecha",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    )
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(40);

  const filas = (eventos ?? []).map((e) => {
    const profile = e.user_id ? profileMap.get(e.user_id) : null;
    const partida = e.partida_id ? partidaMap.get(e.partida_id) : null;
    return {
      id: e.id,
      partida_id: e.partida_id,
      user_id: e.user_id,
      player_number: e.player_number,
      tipo: e.tipo,
      local_event_id: e.local_event_id,
      occurred_at: e.occurred_at,
      ingested_at: e.ingested_at,
      status: e.status,
      reason: e.reason,
      jugador: profile
        ? `${profile.nombre} ${profile.apellido}`
        : null,
      partida_label: partida
        ? `${formatFechaLarga(partida.fecha)} · ${formatHora(partida.hora_inicio)} · ${modalidadLabel(partida.modalidad)}`
        : null,
    };
  });

  const partidasOpts = (partidasRecientes ?? []).map((p) => ({
    value: p.id,
    label: `${formatFechaLarga(p.fecha)} · ${formatHora(p.hora_inicio)} · ${modalidadLabel(p.modalidad)}`,
  }));

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="sect-label mb-2">Admin · diagnóstico</p>
          <h1 className="sect-title fluid-3xl">Eventos</h1>
        </div>
        <Link
          href="/admin/eventos/cargar"
          className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold"
        >
          + Cargar manual
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total" value={String(total)} />
        <Stat label="Aceptados" value={String(aceptados)} accent={aceptados > 0} />
        <Stat
          label="Huérfanos"
          value={String(huerfanos)}
          tone={huerfanos > 0 ? "warn" : undefined}
        />
      </div>

      {/* Filtros */}
      <div className="mb-5 space-y-3">
        <FilterRow
          label="Status"
          options={STATUS_OPTS}
          current={status}
          paramName="status"
          otherParam={tipo === "all" ? null : { name: "tipo", value: tipo }}
        />
        <FilterRow
          label="Tipo"
          options={TIPO_OPTS}
          current={tipo}
          paramName="tipo"
          otherParam={status === "all" ? null : { name: "status", value: status }}
        />
      </div>

      {!filas.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            No hay eventos con esos filtros.
          </p>
        </div>
      ) : (
        <EventosTable filas={filas} partidasOpts={partidasOpts} />
      )}

      <p className="mt-6 font-mono fluid-xs text-smoke uppercase tracking-[.22em]">
        // Mostrando últimos 200 eventos
      </p>
    </div>
  );
}

function FilterRow({
  label,
  options,
  current,
  paramName,
  otherParam,
}: {
  label: string;
  options: { value: string; label: string }[];
  current: string;
  paramName: string;
  otherParam: { name: string; value: string } | null;
}) {
  function buildHref(v: string) {
    const sp = new URLSearchParams();
    if (v !== "all") sp.set(paramName, v);
    if (otherParam) sp.set(otherParam.name, otherParam.value);
    const qs = sp.toString();
    return qs ? `/admin/eventos?${qs}` : "/admin/eventos";
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="sect-label shrink-0">{label}</span>
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref(opt.value)}
          className={`px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.18em] border transition cursor-pointer ${
            current === opt.value
              ? "bg-orange text-ink border-orange"
              : "border-rail/60 text-ash hover:border-orange"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "warn";
}) {
  return (
    <div
      className={`border border-rail/60 clip-notch p-3 sm:p-4 ${
        tone === "warn" ? "bg-orange/5" : accent ? "bg-orange/5" : "bg-carbon"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display fluid-xl sm:fluid-2xl ${
          tone === "warn" ? "text-orange" : accent ? "text-orange" : "text-bone"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
