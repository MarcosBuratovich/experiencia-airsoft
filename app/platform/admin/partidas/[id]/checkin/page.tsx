import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo } from "@/lib/partidas";
import { getPreciosConfig } from "@/lib/precios";
import { getClanesPorProfileIds } from "@/lib/clanes";
import { CheckinList } from "./checkin-list";
import { InscriptosPreview } from "./inscriptos-preview";
import { ResumenPartida } from "./resumen-partida";
import { PartidaActionsButtons } from "./partida-actions-buttons";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  // Columnas que dependen de migraciones nuevas. Si la migración 5b aún
  // no se aplicó en este Supabase, el select extendido falla y todo el
  // query devuelve null. Por eso intentamos el extendido y si falla
  // caemos al base (las recargas quedan en 0 y se ven después de la
  // migración).
  const SELECT_BASE =
    "id, estado, user_id, guest_nombre, tipo_jugador, alquila_marcadora, alquila_premium, alquila_chaleco, precio_entrada, precio_alquiler, precio_total, profiles!inscripciones_user_id_fkey(nombre, apellido, dni, celular, socio, flair), checkins(presente, pago_estado, pago_monto, nota)";
  const SELECT_EXTENDED =
    SELECT_BASE.replace(
      "precio_total",
      "recarga_tracer_100, recarga_conv_200, recarga_conv_400, precio_recargas, precio_total",
    );

  const tryQuery = async (selectStr: string) =>
    supabase
      .from("inscripciones")
      .select(selectStr)
      .eq("partida_id", id)
      .in("estado", ["confirmado", "waitlist"])
      .order("created_at");

  let inscripcionesRes = await tryQuery(SELECT_EXTENDED);
  let migracionRecargasPendiente = false;
  if (inscripcionesRes.error) {
    console.error(
      "[checkin] query extendido falló, fallback al base:",
      inscripcionesRes.error.message,
    );
    migracionRecargasPendiente = true;
    inscripcionesRes = await tryQuery(SELECT_BASE);
    if (inscripcionesRes.error) {
      console.error(
        "[checkin] query base también falló:",
        inscripcionesRes.error.message,
      );
    }
  }

  const inscripciones = inscripcionesRes.data;
  const precios = await getPreciosConfig(supabase);

  const userIds = ((inscripciones ?? []) as unknown as { user_id: string }[]).map(
    (i) => i.user_id,
  );
  const clanesPorUser = await getClanesPorProfileIds(supabase, userIds);

  type RowAny = Record<string, unknown> & {
    id: string;
    estado: string;
    user_id: string;
    tipo_jugador?: string | null;
    alquila_marcadora?: boolean | null;
    alquila_premium?: boolean | null;
    alquila_chaleco?: boolean | null;
    recarga_tracer_100?: number | null;
    recarga_conv_200?: number | null;
    recarga_conv_400?: number | null;
    precio_entrada?: number | null;
    precio_alquiler?: number | null;
    precio_recargas?: number | null;
    precio_total?: number | null;
    guest_nombre?: string | null;
    profiles:
      | { nombre: string; apellido: string; dni: string; celular: string; socio: boolean; flair?: string | null }
      | { nombre: string; apellido: string; dni: string; celular: string; socio: boolean; flair?: string | null }[]
      | null;
    checkins:
      | { presente: boolean; pago_estado: string | null; pago_monto: number | null; nota: string | null }
      | { presente: boolean; pago_estado: string | null; pago_monto: number | null; nota: string | null }[]
      | null;
  };

  const filas = ((inscripciones ?? []) as unknown as RowAny[]).map((i) => {
    const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
    const c = Array.isArray(i.checkins) ? i.checkins[0] : i.checkins;
    const precio_entrada = i.precio_entrada ?? 0;
    const precio_alquiler = i.precio_alquiler ?? 0;
    const precio_recargas = i.precio_recargas ?? 0;
    const isGuest = !p;
    const nombre = isGuest
      ? `${i.guest_nombre ?? "Guest"}`
      : `${p?.nombre ?? ""} ${p?.apellido ?? ""}`.trim();
    return {
      id: i.id,
      nombre,
      isGuest,
      clanes: i.user_id ? (clanesPorUser.get(i.user_id) ?? []) : [],
      flair: p?.flair ?? null,
      dni: p?.dni ?? "—",
      celular: p?.celular ?? "—",
      socio: p?.socio ?? false,
      tipo_jugador: i.tipo_jugador ?? "byop",
      estado: i.estado,
      alquila_marcadora: !!i.alquila_marcadora,
      alquila_premium: !!i.alquila_premium,
      alquila_chaleco: !!i.alquila_chaleco,
      recarga_tracer_100: i.recarga_tracer_100 ?? 0,
      recarga_conv_200: i.recarga_conv_200 ?? 0,
      recarga_conv_400: i.recarga_conv_400 ?? 0,
      precio_entrada,
      precio_alquiler,
      precio_recargas,
      precio_total: i.precio_total ?? precio_entrada + precio_alquiler + precio_recargas,
      checkin: c
        ? {
            presente: c.presente,
            pago_estado: c.pago_estado,
            pago_monto: c.pago_monto,
            nota: c.nota,
          }
        : null,
    };
  });

  const estadoFx = estadoEfectivo({
    fecha: partida.fecha,
    hora_inicio: partida.hora_inicio,
    duracion_min: partida.duracion_min,
    estado: partida.estado,
  });

  const titulo =
    estadoFx === "pasada"
      ? "Resumen"
      : estadoFx === "en_curso"
        ? "Check-in"
        : estadoFx === "cancelada"
          ? "Cancelada"
          : "Inscriptos";

  return (
    <div>
      <Link
        href="/admin/partidas"
        className="font-mono fluid-xs text-smoke hover:text-orange uppercase tracking-[.25em]"
      >
        ← Partidas
      </Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="mil-tag">{modalidadLabel(partida.modalidad)}</span>
          <h1 className="sect-title fluid-3xl mt-3">
            {titulo} · {modalidadLabel(partida.modalidad)}
          </h1>
          <p className="mt-2 font-mono fluid-sm text-ash uppercase tracking-[.2em]">
            {formatFechaLarga(partida.fecha)} · {formatHora(partida.hora_inicio)} ·{" "}
            {filas.length} anotados
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {(estadoFx === "en_curso" || estadoFx === "pasada") && (
            <Link
              href={`/partidas/${partida.id}/scoreboard`}
              className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold"
            >
              Scoreboard →
            </Link>
          )}
          <PartidaActionsButtons
            partidaId={partida.id}
            estado={partida.estado}
            estadoFx={estadoFx}
          />
        </div>
      </div>

      {migracionRecargasPendiente && (
        <div className="mb-6 border border-orange-300/40 bg-orange-300/5 clip-notch p-4">
          <p className="sect-label mb-1 text-orange-300">// Migración pendiente</p>
          <p className="font-sans fluid-sm text-ash">
            Falta correr <span className="text-orange">db/schema-phase-5b.sql</span>{" "}
            en Supabase SQL Editor. Mientras tanto las recargas no se pueden
            cargar, pero el check-in funciona normal.
          </p>
        </div>
      )}

      {estadoFx === "futura" && <InscriptosPreview filas={filas} />}
      {estadoFx === "en_curso" && (
        <CheckinList
          partidaId={partida.id}
          inscripciones={filas}
          preciosRecargas={{
            tracer100: precios.recarga_tracer_100,
            conv200: precios.recarga_conv_200,
            conv400: precios.recarga_conv_400,
          }}
        />
      )}
      {estadoFx === "pasada" && (
        <ResumenPartida partidaId={partida.id} filas={filas} />
      )}
      {estadoFx === "cancelada" && (
        <div className="border border-orange-300/40 bg-orange-300/5 clip-notch p-5">
          <p className="font-mono fluid-xs uppercase tracking-[.25em] text-orange-300 mb-2">
            // Partida cancelada
          </p>
          <p className="text-ash fluid-sm">
            Esta partida fue cancelada. No se realiza check-in. Quedan abajo los
            inscriptos para referencia.
          </p>
          <div className="mt-5">
            <InscriptosPreview filas={filas} />
          </div>
        </div>
      )}
    </div>
  );
}
