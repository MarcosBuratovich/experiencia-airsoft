import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo, type EstadoEfectivo } from "@/lib/partidas";
import { GenerarSemanaButton } from "./generar-semana-button";

type Row = {
  id: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  modalidad: string;
  cupo_max: number;
  visibilidad: string;
  estado: string;
  inscriptos: number;
  estadoFx: EstadoEfectivo;
};

export default async function AdminPartidas() {
  const supabase = await createClient();
  const { data: partidas } = await supabase
    .from("partidas")
    .select(
      "id, fecha, hora_inicio, duracion_min, modalidad, cupo_max, visibilidad, estado, inscripciones(count)",
    )
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(60);

  const rows: Row[] = (partidas ?? []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    hora_inicio: p.hora_inicio,
    duracion_min: p.duracion_min,
    modalidad: p.modalidad,
    cupo_max: p.cupo_max,
    visibilidad: p.visibilidad,
    estado: p.estado,
    inscriptos: Array.isArray(p.inscripciones) ? (p.inscripciones[0]?.count ?? 0) : 0,
    estadoFx: estadoEfectivo({
      fecha: p.fecha,
      hora_inicio: p.hora_inicio,
      duracion_min: p.duracion_min,
      estado: p.estado,
    }),
  }));

  const futuras = rows.filter((r) => r.estadoFx === "futura");
  const enCurso = rows.filter((r) => r.estadoFx === "en_curso");
  const pasadas = rows.filter((r) => r.estadoFx === "pasada");
  const canceladas = rows.filter((r) => r.estadoFx === "cancelada");

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="sect-label mb-2">Admin · listas</p>
          <h1 className="sect-title fluid-3xl">Partidas</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GenerarSemanaButton />
          <Link
            href="/admin/partidas/nueva"
            className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold"
          >
            + Nueva
          </Link>
        </div>
      </div>

      {!rows.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin partidas. Creá la primera.
          </p>
        </div>
      ) : (
        <>
          <Section title="Futuras" count={futuras.length} rows={futuras} />
          <Section title="En curso" count={enCurso.length} rows={enCurso} accent />
          <Section title="Pasadas" count={pasadas.length} rows={pasadas} muted />
          {canceladas.length > 0 && (
            <Section
              title="Canceladas"
              count={canceladas.length}
              rows={canceladas}
              muted
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  rows,
  accent,
  muted,
}: {
  title: string;
  count: number;
  rows: Row[];
  accent?: boolean;
  muted?: boolean;
}) {
  if (count === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2
          className={`sect-title fluid-xl ${
            accent ? "text-orange" : muted ? "text-smoke" : "text-bone"
          }`}
        >
          {title}
        </h2>
        <span className="font-mono fluid-xs uppercase tracking-[.25em] text-smoke">
          {count}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <PartidaAdminRow key={r.id} r={r} />
        ))}
      </ul>
    </section>
  );
}

function PartidaAdminRow({ r }: { r: Row }) {
  const isFutura = r.estadoFx === "futura";
  const isEnCurso = r.estadoFx === "en_curso";
  const isPasada = r.estadoFx === "pasada";
  const isCancelada = r.estadoFx === "cancelada";
  const inscripcionesCerradas = r.estado === "cerrada";

  const primaryHref = isPasada
    ? `/admin/partidas/${r.id}/checkin?vista=resumen`
    : `/admin/partidas/${r.id}/checkin`;
  const primaryLabel = isFutura
    ? "Ver inscriptos →"
    : isEnCurso
      ? "Check-in →"
      : isPasada
        ? "Resumen →"
        : "Ver →";

  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4 flex items-center gap-4">
      <div className="shrink-0 min-w-[80px] sm:min-w-[110px]">
        <p
          className={`font-display fluid-lg uppercase leading-none ${
            isPasada || isCancelada ? "text-smoke" : "text-bone"
          }`}
        >
          {formatFechaLarga(r.fecha)}
        </p>
        <p className="mt-1 font-mono fluid-xs uppercase tracking-[.2em] text-ash">
          {formatHora(r.hora_inicio)}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mil-tag">{modalidadLabel(r.modalidad)}</span>
          {isCancelada ? (
            <Pill tone="warn">Cancelada</Pill>
          ) : isEnCurso ? (
            <Pill tone="live">En curso</Pill>
          ) : isPasada ? (
            <Pill tone="muted">Pasada</Pill>
          ) : inscripcionesCerradas ? (
            <Pill tone="warn">Inscripción cerrada</Pill>
          ) : (
            <Pill tone="ok">Abierta</Pill>
          )}
          {r.visibilidad === "privada" && (
            <Pill tone="muted">Privada</Pill>
          )}
        </div>
        <p className="mt-1 font-mono fluid-xs uppercase tracking-[.18em] text-smoke hidden sm:block">
          {r.inscriptos}/{r.cupo_max} anotados
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3 flex-wrap justify-end">
        <span className="sm:hidden font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
          {r.inscriptos}/{r.cupo_max}
        </span>
        <Link
          href={primaryHref}
          className="font-mono fluid-xs uppercase tracking-[.2em] text-orange hover:underline"
        >
          {primaryLabel}
        </Link>
      </div>
    </li>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "muted" | "live";
  children: React.ReactNode;
}) {
  const styles =
    tone === "live"
      ? "bg-orange text-ink"
      : tone === "ok"
        ? "bg-orange/10 border border-orange/40 text-orange"
        : tone === "warn"
          ? "bg-orange-300/10 border border-orange-300/40 text-orange-300"
          : "border border-rail/60 text-smoke";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 font-mono fluid-xs uppercase tracking-[.18em] ${styles}`}
    >
      {children}
    </span>
  );
}
