import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { getPreciosConfig } from "@/lib/precios";
import { estadoEfectivo, inscripcionAbierta } from "@/lib/partidas";
import { computarEstadoCuota } from "@/lib/socios";
import { getClanesPorProfileIds } from "@/lib/clanes";
import { NombreConClanes } from "../../components/nombre-con-clanes";
import { ContactoWa } from "../../components/contacto-wa";
import { TrackEvent } from "@/app/_components/track-event";
import { AnotarmeButton } from "./anotarme-button";
import { OrganizadorPanel } from "./organizador-panel";
import { MisAlquileresPanel } from "./mis-alquileres-panel";

export default async function PartidaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/partidas/${id}`);

  const [{ data: partida }, { data: profile }, { data: pagosCuota }, precios] =
    await Promise.all([
      supabase
        .from("partidas")
        .select(
          "id, titulo, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado, notas, visibilidad, organizador_id, private_token",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("role, socio, socio_desde, cuota_mensual")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("socio_pagos").select("periodo").eq("user_id", user.id),
      getPreciosConfig(supabase),
    ]);
  if (!partida) notFound();

  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";
  const soyOrganizador =
    partida.visibilidad === "privada" && partida.organizador_id === user.id;

  const { data: inscriptos } = await supabase
    .from("inscripciones")
    .select(
      "id, user_id, guest_nombre, agregado_por, estado, posicion_waitlist",
    )
    .eq("partida_id", id)
    .in("estado", ["confirmado", "waitlist"])
    .order("created_at");

  const userIds = (inscriptos ?? [])
    .map((i) => i.user_id)
    .filter((id): id is string => !!id);
  // Para mostrar "(Por: nombre)" en cada guest, también necesitamos el
  // perfil de quien lo agregó.
  const agregadoIds = (inscriptos ?? [])
    .map((i) => i.agregado_por)
    .filter((id): id is string => !!id);
  const allProfileIds = [...new Set([...userIds, ...agregadoIds])];

  // Fetch profiles via profiles_publicos (bypassea RLS de profiles, solo
  // expone campos no sensibles: nombre, apellido, alias). Así un jugador
  // ve el roster aunque no sea admin ni dueño de los perfiles.
  const { data: pubProfiles } = allProfileIds.length
    ? await supabase
        .from("profiles_publicos")
        .select("id, nombre, apellido, alias, flair")
        .in("id", allProfileIds)
    : {
        data: [] as {
          id: string;
          nombre: string;
          apellido: string;
          alias: string | null;
          flair: string | null;
        }[],
      };
  const profileById = new Map(
    (pubProfiles ?? []).map((p) => [p.id, p] as const),
  );

  // Celulares SOLO para admin: el roster de arriba sale de `profiles_publicos`
  // (vista sin datos sensibles) para que un jugador vea quién viene sin
  // acceder al contacto de los demás. El admin sí necesita poder escribirle a
  // alguien que se anotó y no conoce, así que para él pedimos el celular
  // aparte contra `profiles` (su RLS ya permite leerlo siendo admin).
  const celularPorUser = new Map<string, string>();
  if (isAdmin && userIds.length) {
    const { data: contactos } = await supabase
      .from("profiles")
      .select("id, celular")
      .in("id", userIds);
    for (const c of (contactos ?? []) as { id: string; celular: string | null }[]) {
      if (c.celular) celularPorUser.set(c.id, c.celular);
    }
  }

  const mine = inscriptos?.find((i) => i.user_id === user.id) ?? null;
  const confirmados = inscriptos?.filter((i) => i.estado === "confirmado") ?? [];
  const waitlist = inscriptos?.filter((i) => i.estado === "waitlist") ?? [];

  const clanesPorUser = await getClanesPorProfileIds(supabase, userIds);
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

  // Cola del mensaje de WhatsApp que el admin le manda a un anotado.
  const contextoPartida = `la partida del ${formatFechaLarga(partida.fecha)} a las ${formatHora(partida.hora_inicio)}`;

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
        href={isAdmin ? "/admin/partidas" : "/partidas"}
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
        {/* Embudo: vio la partida (para audiencias "vio y no se anotó"). */}
        <TrackEvent
          event="view_item"
          params={{
            items: [
              {
                item_id: partida.id,
                item_name: `${modalidadLabel(partida.modalidad)} ${partida.fecha}`,
                item_category: partida.modalidad,
              },
            ],
          }}
        />
        <AnotarmeButton
          partidaId={partida.id}
          inscripcion={
            mine
              ? {
                  id: mine.id,
                  estado: mine.estado,
                  posicion_waitlist: mine.posicion_waitlist,
                }
              : null
          }
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
            entrada_byop: precios.entrada_byop,
            entrada_socio: precios.entrada_socio,
            alquiler_marcadora: precios.alquiler_marcadora,
            alquiler_premium: precios.alquiler_premium,
            alquiler_chaleco: precios.alquiler_chaleco,
          }}
        />
      </div>

      {(soyOrganizador || (isAdmin && partida.visibilidad === "privada")) && (
        <OrganizadorPanel
          partidaId={partida.id}
          shareUrl={await buildShareUrl(partida.id, partida.private_token)}
          inscripciones={(inscriptos ?? []).map((i) => {
            const perfil = i.user_id ? profileById.get(i.user_id) : null;
            return {
              id: i.id,
              nombre:
                i.guest_nombre?.trim() ||
                perfil?.alias?.trim() ||
                `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim() ||
                "Sin nombre",
              esGuest: !i.user_id,
              estado: i.estado,
            };
          })}
        />
      )}

      {/* Mis alquileres: cualquier inscripto puede agregar guests con su nombre */}
      {mine && !soyOrganizador && (
        <MisAlquileresPanel
          partidaId={partida.id}
          alquileres={(inscriptos ?? [])
            .filter((i) => !!i.guest_nombre && i.agregado_por === user.id)
            .map((i) => ({
              id: i.id,
              nombre: i.guest_nombre ?? "",
              estado: i.estado,
            }))}
        />
      )}

      <div>
        <h2 className="sect-label mb-3">Confirmados ({confirmados.length})</h2>
        <ul className="space-y-1 mb-6">
          {confirmados.map((i) => {
            const perfil = i.user_id ? profileById.get(i.user_id) : null;
            const addedBy = i.agregado_por ? profileById.get(i.agregado_por) : null;
            const addedByLabel = addedBy
              ? addedBy.alias?.trim() ||
                `${addedBy.nombre} ${addedBy.apellido}`.trim()
              : null;
            return (
              <li
                key={i.id}
                className="border-b border-rail/40 py-1.5 flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em] text-ash"
              >
                <NombreConClanes
                  nombre={
                    i.guest_nombre?.trim() ||
                    perfil?.alias?.trim() ||
                    `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim()
                  }
                  clanes={clanesPorUser.get(i.user_id) ?? []}
                  size="xs"
                  nameClassName="text-ash"
                  flair={perfil?.flair}
                />
                {i.guest_nombre && addedByLabel && (
                  <span className="text-smoke normal-case tracking-normal font-sans">
                    (Por: {addedByLabel})
                  </span>
                )}
                {/* Contacto directo: solo lo ve un admin (ver celularPorUser). */}
                {isAdmin && i.user_id && (
                  <ContactoWa
                    celular={celularPorUser.get(i.user_id)}
                    nombre={perfil?.nombre}
                    contexto={contextoPartida}
                    className="ml-auto"
                  />
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
                const perfil = i.user_id ? profileById.get(i.user_id) : null;
                const addedBy = i.agregado_por ? profileById.get(i.agregado_por) : null;
                const addedByLabel = addedBy
                  ? addedBy.alias?.trim() ||
                    `${addedBy.nombre} ${addedBy.apellido}`.trim()
                  : null;
                return (
                  <li
                    key={i.id}
                    className="border-b border-rail/40 py-1.5 flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em] text-smoke"
                  >
                    <NombreConClanes
                      nombre={
                    i.guest_nombre?.trim() ||
                    perfil?.alias?.trim() ||
                    `${perfil?.nombre ?? ""} ${perfil?.apellido ?? ""}`.trim()
                  }
                      clanes={clanesPorUser.get(i.user_id) ?? []}
                      size="xs"
                      nameClassName="text-smoke"
                      flair={perfil?.flair}
                    />
                    {i.guest_nombre && addedByLabel && (
                      <span className="text-smoke normal-case tracking-normal font-sans">
                        (Por: {addedByLabel})
                      </span>
                    )}
                    {isAdmin && i.user_id && (
                      <ContactoWa
                        celular={celularPorUser.get(i.user_id)}
                        nombre={perfil?.nombre}
                        contexto={contextoPartida}
                        className="ml-auto"
                      />
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

/**
 * Arma la URL pública para compartir una privada. Construye el origen
 * desde los headers (Vercel respeta host correctamente) y, si hay token,
 * lo agrega como query param para que un futuro middleware pueda gatear
 * acceso. Hoy /partidas/[id] no exige el token, pero ya lo dejamos en
 * el link para no tener que cambiar URLs cuando lo agreguemos.
 */
async function buildShareUrl(
  partidaId: string,
  token: string | null,
): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;
  const path = `/partidas/${partidaId}${token ? `?t=${token}` : ""}`;
  return `${base}${path}`;
}
