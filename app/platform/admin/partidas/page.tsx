import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";

export default async function AdminPartidas() {
  const supabase = await createClient();
  const { data: partidas } = await supabase
    .from("partidas")
    .select("id, titulo, fecha, hora_inicio, modalidad, cupo_max, visibilidad, estado, inscripciones(count)")
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="sect-label mb-2">Admin · listas</p>
          <h1 className="sect-title fluid-3xl">Partidas</h1>
        </div>
        <Link href="/admin/partidas/nueva" className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold">
          + Nueva
        </Link>
      </div>

      <div className="border border-rail/60 clip-notch overflow-hidden">
        <table className="w-full">
          <thead className="bg-carbon">
            <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Partida</th>
              <th className="text-left px-4 py-3">Modalidad</th>
              <th className="text-left px-4 py-3">Anotados</th>
              <th className="text-left px-4 py-3">Visibilidad</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {partidas?.map((p) => {
              const inscriptos = Array.isArray(p.inscripciones) ? (p.inscripciones[0]?.count ?? 0) : 0;
              return (
                <tr key={p.id} className="border-t border-rail/40 hover:bg-carbon/60">
                  <td className="px-4 py-3 font-mono fluid-xs text-ash">
                    {formatFechaLarga(p.fecha)} · {formatHora(p.hora_inicio)}
                  </td>
                  <td className="px-4 py-3 text-bone">{p.titulo}</td>
                  <td className="px-4 py-3 text-ash">{modalidadLabel(p.modalidad)}</td>
                  <td className="px-4 py-3 font-mono text-bone">{inscriptos}/{p.cupo_max}</td>
                  <td className="px-4 py-3 font-mono fluid-xs text-smoke uppercase">{p.visibilidad}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/partidas/${p.id}/checkin`} className="text-orange hover:underline font-mono fluid-xs uppercase tracking-[.2em]">
                      Check-in →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!partidas?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-smoke font-mono fluid-xs">Sin partidas. Creá la primera.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
