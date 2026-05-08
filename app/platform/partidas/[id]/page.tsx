import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { getPreciosConfig } from "@/lib/precios";
import { estadoEfectivo, inscripcionAbierta } from "@/lib/partidas";
import { computarEstadoCuota } from "@/lib/socios";
import { AnotarmeButton } from "./anotarme-button";

export default async function PartidaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: partida }, { data: profile }, { data: pagosCuota }, precios] =
    await Promise.all([
      supabase
        .from("partidas")
        .select(
          "id, titulo, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado, notas, visibilidad",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("socio, socio_desde, cuota_mensual")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("socio_pagos").select("periodo").eq("user_id", user.id),
      getPreciosConfig(supabase),
    ]);
  if (!partida) notFound();

  const { data: inscriptos } = await supabase
    .from("inscripciones")
    .select(
      "id, user_id, estado, posicion_waitlist, profiles!inner(nombre, apellido, socio)",
    )
    .eq("partida_id", id)
    .in("estado", ["confirmado", "waitlist"])
    .order("created_at");

  const mine = inscriptos?.find((i) => i.user_id === user.id) ?? null;
  const confirmados = inscriptos?.filter((i) => i.estado === "confirmado") ?? [];
  const waitlist = inscriptos?.filter((i) => i.estado === "waitlist") ?? [];
  const lleno = confirmados.length >= partida.cupo_max;
  const fueraDeVentana = !inscripcionAbierta({
    fecha: partida.fecha,
    hora_inicio: partida.hora_inicio,
    duracion_min: partida.duracion_min,
    estado: partida.estado,
  });
  const estadoFx = estadoEfectivo({
    fecha: partida.fecha,
    hora_inicio: partida.hora_inicio,
    duracion_min: partida.duracion_min,
    estado: partida.estado,
  });
  const mostrarScoreboard = estadoFx === "en_curso" || estadoFx === "pasada";

  const cuota = computarEstadoCuota(
    {
      socio: !!profile?.socio,
      socio_desde: profile?.socio_desde ?? null,
      cuota_mensual: profile?.cuota_mensual ?? 0,
    },
    pagosCuota ?? [],
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/partidas"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Volver
      </Link>

      <div className="mt-4 mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
          <h1 className="sect-title fluid-3xl mt-3">{modalidadLabel(partida.modalidad)}</h1>
          <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
            {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)} ·{" "}
            {partida.duracion_min} min
          </p>
        </div>
        {mostrarScoreboard && (
          <Link
            href={`/partidas/${partida.id}/scoreboard`}
            className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold"
          >
            Scoreboard →
          </Link>
        )}
      </div>

      <div className="border border-rail/60 bg-carbon clip-notch p-5 mb-6">
        <dl className="space-y-1">
          <div className="spec-row">
            <span className="k">Cupo</span>
            <span className="v">
              {confirmados.length}/{partida.cupo_max}
            </span>
          </div>
          <div className="spec-row">
            <span className="k">Estado</span>
            <span className="v">{partida.estado}</span>
          </div>
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
          esSocio={cuota.esSocio}
          socioAlDia={cuota.alDia}
          deudaCuota={{
            meses: cuota.periodosAdeudados.length,
            monto: cuota.montoAdeudado,
          }}
          plazoCuota={
            cuota.enPlazo
              ? {
                  mesPeriodo: cuota.periodoActual,
                  diasParaVencer: cuota.diasParaVencer,
                  monto: cuota.cuotaMensual,
                }
              : null
          }
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
        <ul className="space-y-1 mb-6">
          {confirmados.map((i) => {
            const perfil = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
            return (
              <li
                key={i.id}
                className="border-b border-rail/40 py-1.5 flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em] text-ash"
              >
                <span>
                  {perfil?.nombre} {perfil?.apellido}
                </span>
                {perfil?.socio && (
                  <span className="px-1.5 py-0.5 bg-orange text-ink fluid-xs tracking-[.15em]">
                    Socio
                  </span>
                )}
              </li>
            );
          })}
          {!confirmados.length && (
            <li className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
              Nadie anotado todavía.
            </li>
          )}
        </ul>
        {!!waitlist.length && (
          <>
            <h3 className="sect-label mb-3">Lista de espera ({waitlist.length})</h3>
            <ul className="space-y-1">
              {waitlist.map((i) => {
                const perfil = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
                return (
                  <li
                    key={i.id}
                    className="border-b border-rail/40 py-1.5 flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em] text-smoke"
                  >
                    <span>
                      {perfil?.nombre} {perfil?.apellido}
                    </span>
                    {perfil?.socio && (
                      <span className="px-1.5 py-0.5 bg-orange text-ink fluid-xs tracking-[.15em]">
                        Socio
                      </span>
                    )}
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
