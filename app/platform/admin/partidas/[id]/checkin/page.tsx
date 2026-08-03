import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { checkinAbierto, estadoEfectivo } from "@/lib/partidas";
import { getPreciosConfig } from "@/lib/precios";
import { getClanesPorProfileIds } from "@/lib/clanes";
import { getAutoriaPorPartida } from "@/lib/autoria-partida";
import { CheckinList } from "./checkin-list";
import { InscriptosPreview } from "./inscriptos-preview";
import { ResumenPartida } from "./resumen-partida";
import { PartidaActionsButtons } from "./partida-actions-buttons";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: partida } = await supabase
    .from("partidas")
    .select("id, fecha, hora_inicio, duracion_min, modalidad, cupo_max, estado, visibilidad, creado_por, organizador_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!partida) notFound();

  // Columnas que dependen de migraciones nuevas: recarga_* (fase 5b) y
  // guest_dni (fase 15). Cualquiera de las dos puede no estar aplicada todavía
  // en este Supabase, y si pedimos una columna inexistente el query entero
  // devuelve null. Probamos de la grilla más completa a la más básica y nos
  // quedamos con la primera que funciona, así el check-in nunca se rompe por
  // una migración pendiente.
  const buildSelect = ({
    recargas,
    guestDni,
  }: {
    recargas: boolean;
    guestDni: boolean;
  }) =>
    `id, estado, user_id, guest_nombre, agregado_por, ${guestDni ? "guest_dni, " : ""}tipo_jugador, alquila_marcadora, alquila_premium, alquila_chaleco, precio_entrada, precio_alquiler, ${
      recargas
        ? "recarga_tracer_100, recarga_conv_200, precio_recargas, "
        : ""
    }precio_total, profiles!inscripciones_user_id_fkey(nombre, apellido, dni, celular, socio, flair), checkins(presente, pago_estado, pago_monto, nota)`;

  const tryQuery = async (selectStr: string) =>
    supabase
      .from("inscripciones")
      .select(selectStr)
      .eq("partida_id", id)
      .in("estado", ["confirmado", "waitlist"])
      .order("created_at");

  const candidatos = [
    { recargas: true, guestDni: true },
    { recargas: true, guestDni: false },
    { recargas: false, guestDni: true },
    { recargas: false, guestDni: false },
  ] as const;
  let inscripcionesRes = await tryQuery(buildSelect(candidatos[0]));
  let usado: (typeof candidatos)[number] = candidatos[0];
  for (let k = 1; k < candidatos.length && inscripcionesRes.error; k++) {
    console.error(
      "[checkin] query falló, intento más básico:",
      inscripcionesRes.error.message,
    );
    usado = candidatos[k];
    inscripcionesRes = await tryQuery(buildSelect(usado));
  }
  const migracionRecargasPendiente = !usado.recargas;
  if (inscripcionesRes.error) {
    console.error(
      "[checkin] todos los queries fallaron:",
      inscripcionesRes.error.message,
    );
  }

  const inscripciones = inscripcionesRes.data;
  const precios = await getPreciosConfig(supabase);

  // precio_fijo_efectivo (fase-17) en query aparte para no romper el check-in
  // si la migración todavía no corrió (fallback = precio_entrada + alquiler).
  const fijoEfMap = new Map<string, number>();
  const fijoRes = await supabase
    .from("inscripciones")
    .select("id, precio_fijo_efectivo")
    .eq("partida_id", id)
    .in("estado", ["confirmado", "waitlist"]);
  if (!fijoRes.error) {
    for (const r of (fijoRes.data ?? []) as {
      id: string;
      precio_fijo_efectivo: number | null;
    }[]) {
      if (r.precio_fijo_efectivo != null) fijoEfMap.set(r.id, r.precio_fijo_efectivo);
    }
  }

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
    precio_entrada?: number | null;
    precio_alquiler?: number | null;
    precio_recargas?: number | null;
    precio_total?: number | null;
    guest_nombre?: string | null;
    guest_dni?: string | null;
    agregado_por?: string | null;
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
      dni: isGuest ? (i.guest_dni ?? "—") : (p?.dni ?? "—"),
      celular: p?.celular ?? "—",
      // Para un walk-in guest, "socio" se deriva del medio de pago elegido
      // ('socio_presente'); para inscriptos con cuenta viene del perfil. Un
      // alquiler nunca cuenta como socio (evita badges contradictorios).
      socio: isGuest
        ? c?.pago_estado === "socio_presente" && i.tipo_jugador !== "alquiler"
        : (p?.socio ?? false),
      tipo_jugador: i.tipo_jugador ?? "byop",
      estado: i.estado,
      alquila_marcadora: !!i.alquila_marcadora,
      alquila_premium: !!i.alquila_premium,
      alquila_chaleco: !!i.alquila_chaleco,
      recarga_tracer_100: i.recarga_tracer_100 ?? 0,
      recarga_conv_200: i.recarga_conv_200 ?? 0,
      precio_entrada,
      precio_alquiler,
      precio_recargas,
      precio_fijo_efectivo: fijoEfMap.get(i.id) ?? precio_entrada + precio_alquiler,
      precio_total: i.precio_total ?? precio_entrada + precio_alquiler + precio_recargas,
      // Con valor = lo agregó un admin a mano. Es lo único que se puede
      // borrar desde el check-in; una inscripción propia del jugador no.
      esWalkin: !!i.agregado_por,
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

  const core = {
    fecha: partida.fecha,
    hora_inicio: partida.hora_inicio,
    duracion_min: partida.duracion_min,
    estado: partida.estado,
  };
  const estadoFx = estadoEfectivo(core);
  // El check-in se habilita desde las 00:00 del día de la partida, así que
  // puede estar abierto con la partida todavía 'futura' (por ejemplo, a la
  // mañana para una partida de la noche).
  const puedeCheckin = checkinAbierto(core);

  // Cola del mensaje de WhatsApp que el admin le manda a un jugador desde
  // cualquiera de las listas de abajo.
  const contextoWa = `la partida del ${formatFechaLarga(partida.fecha)} a las ${formatHora(partida.hora_inicio)}`;

  // Privadas: quién está detrás y desde cuándo.
  const autoria = (await getAutoriaPorPartida(supabase, [partida])).get(partida.id);

  const titulo = puedeCheckin
    ? "Check-in"
    : estadoFx === "pasada"
      ? "Resumen"
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
          {autoria && (
            <p className="mt-1 font-mono fluid-xs text-smoke">{autoria.label}</p>
          )}
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
            checkinAbierto={puedeCheckin}
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

      {/* Futura y todavía sin ventana de check-in (partida de otro día). */}
      {estadoFx === "futura" && !puedeCheckin && (
        <InscriptosPreview filas={filas} contextoWa={contextoWa} />
      )}
      {puedeCheckin && (
        <CheckinList
          partidaId={partida.id}
          inscripciones={filas}
          preciosRecargas={{
            tracer100: precios.recarga_tracer_100,
            conv200: precios.recarga_conv_200,
          }}
          precios={{
            entrada_byop: precios.entrada_byop,
            entrada_socio: precios.entrada_socio,
            alquiler_marcadora: precios.alquiler_marcadora,
            alquiler_premium: precios.alquiler_premium,
          }}
          contextoWa={contextoWa}
        />
      )}
      {estadoFx === "pasada" && (
        <ResumenPartida
          partidaId={partida.id}
          filas={filas}
          contextoWa={`${contextoWa} — quedó un saldo pendiente`}
        />
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
            <InscriptosPreview filas={filas} contextoWa={contextoWa} />
          </div>
        </div>
      )}
    </div>
  );
}
