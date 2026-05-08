import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo } from "@/lib/partidas";

export default async function CargarEventosPage() {
  const supabase = await createClient();

  // Mostramos partidas pasadas y en curso (las futuras no tiene sentido cargar)
  const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: partidas } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, duracion_min, modalidad, estado")
    .gte("fecha", desde)
    .neq("estado", "cancelada")
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(60);

  const elegibles = (partidas ?? []).filter((p) => {
    const fx = estadoEfectivo({
      fecha: p.fecha,
      hora_inicio: p.hora_inicio,
      duracion_min: p.duracion_min,
      estado: p.estado,
    });
    return fx === "en_curso" || fx === "pasada";
  });

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/admin/eventos"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Eventos
      </Link>

      <div className="mt-4 mb-6">
        <p className="sect-label mb-2">Admin · carga manual</p>
        <h1 className="sect-title fluid-3xl">Cargar eventos</h1>
        <p className="mt-3 text-ash fluid-sm">
          Elegí una partida en curso o pasada para cargar contadores de eventos
          por jugador. Sólo afecta el ranking — no impacta el check-in ni el
          cobro.
        </p>
      </div>

      {!elegibles.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            No hay partidas elegibles. Las partidas tienen que estar en curso o
            ya haber terminado.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {elegibles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/eventos/cargar/${p.id}`}
                className="border border-rail/60 hover:border-orange bg-carbon transition clip-notch p-4 flex items-center gap-4"
              >
                <div className="shrink-0 min-w-[110px]">
                  <p className="font-display fluid-lg text-bone uppercase leading-none">
                    {formatFechaLarga(p.fecha)}
                  </p>
                  <p className="mt-1 font-mono fluid-xs text-ash uppercase tracking-[.2em]">
                    {formatHora(p.hora_inicio)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="mil-tag">{modalidadLabel(p.modalidad)}</span>
                </div>
                <span className="font-mono fluid-xs text-orange uppercase tracking-[.2em]">
                  Cargar →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
