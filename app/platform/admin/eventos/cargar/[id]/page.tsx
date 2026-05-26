import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { CargarForm } from "./cargar-form";

export default async function CargarPartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, modalidad")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  // Inscriptos confirmados con su player_number
  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select(
      "user_id, profiles!inscripciones_user_id_fkey!inner(id, nombre, apellido, socio, player_number)",
    )
    .eq("partida_id", id)
    .eq("estado", "confirmado");

  type Jugador = {
    user_id: string;
    nombre: string;
    apellido: string;
    socio: boolean;
    player_number: string | null;
  };

  const jugadores: Jugador[] = (inscripciones ?? [])
    .map((i) => {
      const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
      return {
        user_id: i.user_id,
        nombre: p?.nombre ?? "",
        apellido: p?.apellido ?? "",
        socio: !!p?.socio,
        player_number: p?.player_number ?? null,
      };
    })
    .sort((a, b) => a.apellido.localeCompare(b.apellido));

  // Eventos manuales ya cargados para esta partida (para no duplicar)
  const { data: eventosExistentes } = await supabase
    .from("match_events")
    .select("user_id, tipo")
    .eq("partida_id", id)
    .eq("status", "aceptado");

  const counts = new Map<string, Record<string, number>>();
  for (const e of eventosExistentes ?? []) {
    if (!e.user_id) continue;
    const k = e.user_id;
    if (!counts.has(k))
      counts.set(k, { eliminacion: 0, captura: 0, reanimacion: 0, planto: 0 });
    counts.get(k)![e.tipo] = (counts.get(k)![e.tipo] ?? 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/admin/eventos/cargar"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Elegir partida
      </Link>

      <div className="mt-4 mb-6">
        <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
        <h1 className="sect-title fluid-3xl mt-3">
          Cargar · {modalidadLabel(partida.modalidad)}
        </h1>
        <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
          {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)}
        </p>
      </div>

      {!jugadores.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Esta partida no tiene inscriptos confirmados.
          </p>
        </div>
      ) : (
        <CargarForm
          partidaId={partida.id}
          jugadores={jugadores}
          countsExistentes={Object.fromEntries(counts)}
        />
      )}
    </div>
  );
}
