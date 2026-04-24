import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { getPreciosConfig } from "@/lib/precios";
import { dentroDeVentana } from "@/lib/partidas";
import { AnotarmeButton } from "./anotarme-button";

export default async function PartidaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: partida }, { data: profile }, precios] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, titulo, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado, notas, visibilidad")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("socio")
      .eq("id", user.id)
      .maybeSingle(),
    getPreciosConfig(supabase),
  ]);
  if (!partida) notFound();

  const { data: inscriptos } = await supabase
    .from("inscripciones")
    .select("id, user_id, estado, posicion_waitlist, profiles!inner(nombre, apellido)")
    .eq("partida_id", id)
    .in("estado", ["confirmado", "waitlist"])
    .order("created_at");

  const mine = inscriptos?.find((i) => i.user_id === user.id) ?? null;
  const confirmados = inscriptos?.filter((i) => i.estado === "confirmado") ?? [];
  const waitlist = inscriptos?.filter((i) => i.estado === "waitlist") ?? [];
  const lleno = confirmados.length >= partida.cupo_max;
  const fueraDeVentana = !dentroDeVentana(partida.fecha, partida.hora_inicio);
  const socio = !!profile?.socio;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/partidas" className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]">
        ← Volver
      </Link>

      <div className="mt-4 mb-6">
        <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
        <h1 className="sect-title fluid-3xl mt-3">{modalidadLabel(partida.modalidad)}</h1>
        <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
          {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)} · {partida.duracion_min} min
        </p>
      </div>

      <div className="border border-rail/60 bg-carbon clip-notch p-5 mb-6">
        <dl className="space-y-1">
          <div className="spec-row"><span className="k">Cupo</span><span className="v">{confirmados.length}/{partida.cupo_max}</span></div>
          <div className="spec-row"><span className="k">Estado</span><span className="v">{partida.estado}</span></div>
        </dl>
        {partida.notas && <p className="mt-4 font-sans fluid-sm text-ash">{partida.notas}</p>}
      </div>

      <div className="mb-8">
        <AnotarmeButton
          partidaId={partida.id}
          inscripcion={mine ? { id: mine.id, estado: mine.estado } : null}
          estado={partida.estado}
          lleno={lleno}
          fueraDeVentana={fueraDeVentana}
          socio={socio}
          precios={{
            entrada_alquiler: precios.entrada_alquiler,
            entrada_byop: precios.entrada_byop,
            entrada_socio: precios.entrada_socio,
            alquiler_marcadora: precios.alquiler_marcadora,
            alquiler_premium: precios.alquiler_premium,
            alquiler_chaleco: precios.alquiler_chaleco,
          }}
        />
      </div>

      <div>
        <h2 className="sect-label mb-3">Confirmados ({confirmados.length})</h2>
        <ul className="space-y-1 font-mono fluid-xs uppercase tracking-[.18em] text-ash mb-6">
          {confirmados.map((i) => {
            const perfil = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
            return (
              <li key={i.id} className="border-b border-rail/40 py-1.5">
                {perfil?.nombre} {perfil?.apellido}
              </li>
            );
          })}
          {!confirmados.length && <li className="text-smoke">Nadie anotado todavía.</li>}
        </ul>
        {!!waitlist.length && (
          <>
            <h3 className="sect-label mb-3">Lista de espera ({waitlist.length})</h3>
            <ul className="space-y-1 font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
              {waitlist.map((i) => {
                const perfil = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
                return (
                  <li key={i.id} className="border-b border-rail/40 py-1.5">
                    {perfil?.nombre} {perfil?.apellido}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
