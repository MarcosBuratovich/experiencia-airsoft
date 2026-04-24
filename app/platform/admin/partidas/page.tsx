import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { GenerarSemanaButton } from "./generar-semana-button";

export default async function AdminPartidas() {
  const supabase = await createClient();
  const { data: partidas } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, modalidad, cupo_max, visibilidad, estado, inscripciones(count)")
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(50);

  const rows = (partidas ?? []).map((p) => ({
    id: p.id,
    fecha: p.fecha,
    hora_inicio: p.hora_inicio,
    modalidad: p.modalidad,
    cupo_max: p.cupo_max,
    visibilidad: p.visibilidad,
    estado: p.estado,
    inscriptos: Array.isArray(p.inscripciones) ? (p.inscripciones[0]?.count ?? 0) : 0,
  }));

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
          {/* Mobile — card list */}
          <ul className="md:hidden space-y-3">
            {rows.map((p) => (
              <li
                key={p.id}
                className="border border-rail/60 bg-carbon clip-notch p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-display fluid-lg text-bone uppercase tracking-wider truncate">
                      {modalidadLabel(p.modalidad)}
                    </p>
                    <p className="font-mono fluid-xs text-ash mt-0.5">
                      {formatFechaLarga(p.fecha)} · {formatHora(p.hora_inicio)}
                    </p>
                  </div>
                  <EstadoPill estado={p.estado} />
                </div>
                <div className="flex items-center gap-2 flex-wrap font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
                  <span className="text-bone">
                    {p.inscriptos}/{p.cupo_max}
                  </span>
                  <span>·</span>
                  <span>{p.visibilidad}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-rail/40 flex items-center gap-4 font-mono fluid-xs uppercase tracking-[.2em]">
                  <Link
                    href={`/admin/partidas/${p.id}/bandos`}
                    className="text-ash hover:text-orange transition"
                  >
                    Bandos
                  </Link>
                  <Link
                    href={`/admin/partidas/${p.id}/checkin`}
                    className="ml-auto text-orange hover:underline"
                  >
                    Check-in →
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop — tabla */}
          <div className="hidden md:block border border-rail/60 clip-notch overflow-hidden">
            <table className="w-full">
              <thead className="bg-carbon">
                <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Modalidad</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Anotados</th>
                  <th className="text-left px-4 py-3">Visibilidad</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-rail/40 hover:bg-carbon/60">
                    <td className="px-4 py-3 font-mono fluid-xs text-ash">
                      {formatFechaLarga(p.fecha)} · {formatHora(p.hora_inicio)}
                    </td>
                    <td className="px-4 py-3 text-bone">{modalidadLabel(p.modalidad)}</td>
                    <td className="px-4 py-3">
                      <EstadoPill estado={p.estado} />
                    </td>
                    <td className="px-4 py-3 font-mono text-bone">
                      {p.inscriptos}/{p.cupo_max}
                    </td>
                    <td className="px-4 py-3 font-mono fluid-xs text-smoke uppercase">
                      {p.visibilidad}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-3 justify-end font-mono fluid-xs uppercase tracking-[.2em]">
                        <Link
                          href={`/admin/partidas/${p.id}/bandos`}
                          className="text-ash hover:text-orange transition"
                        >
                          Bandos
                        </Link>
                        <Link
                          href={`/admin/partidas/${p.id}/checkin`}
                          className="text-orange hover:underline"
                        >
                          Check-in →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const tone =
    estado === "cancelada"
      ? "bg-orange-300/10 text-orange-300 border-orange-300/40"
      : estado === "cerrada"
        ? "bg-smoke/10 text-smoke border-smoke/40"
        : "bg-orange/10 text-orange border-orange/40";
  return (
    <span
      className={`inline-block px-2 py-0.5 border font-mono fluid-xs uppercase tracking-[.18em] ${tone}`}
    >
      {estado}
    </span>
  );
}
