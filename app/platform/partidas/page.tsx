import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";

export default async function PartidasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partidas } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, modalidad, cupo_max, estado, inscripciones(count)")
    .eq("visibilidad", "publica")
    .in("estado", ["abierta", "cerrada"])
    .gte("fecha", new Date().toISOString().slice(0, 10))
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Semana · próximas</p>
        <h1 className="sect-title fluid-3xl">Partidas abiertas</h1>
      </div>

      {!partidas?.length && (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            No hay partidas publicadas por ahora. Volvé a chequear pronto.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {partidas?.map((p) => {
          const inscriptos = Array.isArray(p.inscripciones) ? (p.inscripciones[0]?.count ?? 0) : 0;
          const lleno = inscriptos >= p.cupo_max;
          return (
            <Link
              key={p.id}
              href={`/partidas/${p.id}`}
              className="group border border-rail/60 hover:border-orange bg-carbon transition clip-notch p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="mil-tag">{modalidadLabel(p.modalidad)}</span>
                <span className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
                  {inscriptos}/{p.cupo_max}
                </span>
              </div>
              <h2 className="font-display fluid-xl uppercase text-bone group-hover:text-orange transition">
                {modalidadLabel(p.modalidad)}
              </h2>
              <p className="mt-2 font-mono fluid-xs text-ash uppercase tracking-[.2em]">
                {formatFechaLarga(p.fecha)} · {formatHora(p.hora_inicio)}
              </p>
              <div className="mt-4 flex items-center justify-end">
                {lleno ? (
                  <span className="font-mono fluid-xs text-orange-300 uppercase tracking-[.25em]">Lista de espera</span>
                ) : p.estado === "cerrada" ? (
                  <span className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">Cerrada</span>
                ) : (
                  <span className="font-mono fluid-xs text-orange uppercase tracking-[.25em]">Anotarme →</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
