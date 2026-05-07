import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo, type EstadoEfectivo } from "@/lib/partidas";

type PartidaCard = {
  id: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  modalidad: string;
  cupo_max: number;
  estado: string;
  inscriptos: number;
  estadoFx: EstadoEfectivo;
};

export default async function PartidasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Traemos las partidas públicas no canceladas de los últimos 14 días + futuras
  const desde = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: partidas } = await supabase
    .from("partidas")
    .select(
      "id, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado, inscripciones(count)",
    )
    .eq("visibilidad", "publica")
    .neq("estado", "cancelada")
    .gte("fecha", desde)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const cards: PartidaCard[] = (partidas ?? []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    hora_inicio: p.hora_inicio,
    duracion_min: p.duracion_min,
    modalidad: p.modalidad,
    cupo_max: p.cupo_max,
    estado: p.estado,
    inscriptos: Array.isArray(p.inscripciones) ? (p.inscripciones[0]?.count ?? 0) : 0,
    estadoFx: estadoEfectivo({
      fecha: p.fecha,
      hora_inicio: p.hora_inicio,
      duracion_min: p.duracion_min,
      estado: p.estado,
    }),
  }));

  const abiertas = cards
    .filter((c) => c.estadoFx === "futura")
    .sort((a, b) => cmpFechaHora(a, b));
  const enCurso = cards
    .filter((c) => c.estadoFx === "en_curso")
    .sort((a, b) => cmpFechaHora(a, b));
  const pasadas = cards
    .filter((c) => c.estadoFx === "pasada")
    .sort((a, b) => cmpFechaHora(b, a)) // más recientes primero
    .slice(0, 6);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Semana · operaciones</p>
        <h1 className="sect-title fluid-3xl">Partidas</h1>
      </div>

      <Section
        title="Abiertas"
        count={abiertas.length}
        empty="Todavía no hay partidas con inscripción abierta. Volvé pronto."
      >
        {abiertas.map((p) => (
          <PartidaRow key={p.id} p={p} variant="abierta" />
        ))}
      </Section>

      {enCurso.length > 0 && (
        <Section title="En curso" count={enCurso.length} accent>
          {enCurso.map((p) => (
            <PartidaRow key={p.id} p={p} variant="en_curso" />
          ))}
        </Section>
      )}

      {pasadas.length > 0 && (
        <Section title="Recientes" count={pasadas.length} muted>
          {pasadas.map((p) => (
            <PartidaRow key={p.id} p={p} variant="pasada" />
          ))}
        </Section>
      )}
    </div>
  );
}

function cmpFechaHora(a: PartidaCard, b: PartidaCard): number {
  if (a.fecha === b.fecha) return a.hora_inicio.localeCompare(b.hora_inicio);
  return a.fecha.localeCompare(b.fecha);
}

function Section({
  title,
  count,
  empty,
  accent,
  muted,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  accent?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
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
      {count === 0 && empty ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            {empty}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </section>
  );
}

function PartidaRow({
  p,
  variant,
}: {
  p: PartidaCard;
  variant: "abierta" | "en_curso" | "pasada";
}) {
  const lleno = p.inscriptos >= p.cupo_max;
  const inscripcionesCerradas = p.estado === "cerrada";

  const borderColor =
    variant === "en_curso"
      ? "border-orange"
      : variant === "pasada"
        ? "border-rail/40"
        : "border-rail/60 hover:border-orange";

  const bg = variant === "pasada" ? "bg-carbon/60" : "bg-carbon";

  return (
    <Link
      href={`/partidas/${p.id}`}
      className={`group border ${borderColor} ${bg} transition clip-notch p-4 sm:p-5 flex items-center gap-4`}
    >
      {/* Leftmost date block */}
      <div className="shrink-0 text-left min-w-[88px] sm:min-w-[120px]">
        <p
          className={`font-display fluid-xl uppercase leading-none ${
            variant === "pasada" ? "text-smoke" : "text-bone"
          } group-hover:text-orange transition`}
        >
          {formatFechaCorta(p.fecha)}
        </p>
        <p className="mt-1 font-mono fluid-xs uppercase tracking-[.2em] text-ash">
          {formatHora(p.hora_inicio)}
        </p>
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="mil-tag">{modalidadLabel(p.modalidad)}</span>
          {variant === "en_curso" && (
            <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.18em] inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ink pulse-dot" />
              En curso
            </span>
          )}
          {variant === "pasada" && (
            <span className="px-1.5 py-0.5 border border-rail/60 text-smoke font-mono fluid-xs uppercase tracking-[.18em]">
              Finalizada
            </span>
          )}
          {variant === "abierta" && inscripcionesCerradas && (
            <span className="px-1.5 py-0.5 border border-orange-300/40 text-orange-300 font-mono fluid-xs uppercase tracking-[.18em]">
              Inscripción cerrada
            </span>
          )}
        </div>
        <p className="font-mono fluid-xs uppercase tracking-[.18em] text-ash hidden sm:block">
          {formatFechaLarga(p.fecha)}
        </p>
      </div>

      {/* Right block */}
      <div className="shrink-0 text-right min-w-[80px]">
        <p
          className={`font-mono fluid-sm ${
            variant === "pasada" ? "text-smoke" : "text-bone"
          }`}
        >
          {p.inscriptos}/{p.cupo_max}
        </p>
        <p className="font-mono fluid-xs uppercase tracking-[.22em] mt-1 text-orange group-hover:underline">
          {variant === "pasada"
            ? "Ver →"
            : variant === "en_curso"
              ? lleno
                ? "Lleno"
                : inscripcionesCerradas
                  ? "Ver →"
                  : "Anotarme →"
              : inscripcionesCerradas
                ? "Ver →"
                : lleno
                  ? "Espera →"
                  : "Anotarme →"}
        </p>
      </div>
    </Link>
  );
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dia = dt.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
  const num = String(d).padStart(2, "0");
  const mes = dt.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  return `${dia} ${num} ${mes}`;
}
