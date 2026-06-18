import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyEnArgentina } from "@/lib/semana";
import { estadoEfectivo } from "@/lib/partidas";
import { restarMeses, nombreMes } from "@/lib/socios";
import {
  agregarAnalytics,
  periodoValido,
  rangoMes,
  type InscMes,
  type PartidaMes,
  type SocioInput,
} from "@/lib/analytics";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

type ProfileEmbed = { socio: boolean } | { socio: boolean }[] | null;
type CheckinEmbed =
  | { presente: boolean; pago_estado: string | null; pago_monto: number | null }
  | { presente: boolean; pago_estado: string | null; pago_monto: number | null }[]
  | null;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const hoyAR = hoyEnArgentina();
  const mesActual = hoyAR.slice(0, 7);
  const periodo = periodoValido(mesParam, mesActual);
  const { desde, hasta } = rangoMes(periodo);
  // `now` anclado a hora Argentina (mediodía UTC) para que el cálculo de
  // cuotas (día/mes vía computarEstadoCuota) coincida con el mes mostrado en AR
  // y no se corra en la franja nocturna en un server UTC.
  const [ny, nm, nd] = hoyAR.split("-").map(Number);
  const now = new Date(Date.UTC(ny, nm - 1, nd, 12, 0, 0));

  const supabase = await createClient();

  const [partidasRes, sociosRes] = await Promise.all([
    supabase
      .from("partidas")
      .select(
        "id, fecha, hora_inicio, duracion_min, modalidad, estado, inscripciones(id, estado, tipo_jugador, user_id, precio_entrada, precio_alquiler, precio_recargas, precio_total, profiles!inscripciones_user_id_fkey(socio), checkins(presente, pago_estado, pago_monto))",
      )
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha")
      .order("hora_inicio"),
    supabase
      .from("profiles")
      .select("id, nombre, apellido, socio, socio_desde, cuota_mensual")
      .eq("socio", true)
      .order("apellido"),
  ]);

  if (partidasRes.error) {
    console.error("[analytics] query partidas falló:", partidasRes.error.message);
  }

  const socios: SocioInput[] = (sociosRes.data ?? []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    apellido: s.apellido,
    socio: s.socio,
    socio_desde: s.socio_desde,
    cuota_mensual: s.cuota_mensual ?? 0,
  }));

  // Pagos de cuota de todos los socios (todos los periodos, para deuda acumulada).
  const socioIds = socios.map((s) => s.id);
  const { data: pagosData } = socioIds.length
    ? await supabase
        .from("socio_pagos")
        .select("user_id, periodo, monto")
        .in("user_id", socioIds)
    : { data: [] as { user_id: string; periodo: string; monto: number }[] };

  const partidas: PartidaMes[] = ((partidasRes.data ?? []) as unknown as RawPartida[]).map(
    (p) => {
      const inscripciones: InscMes[] = (p.inscripciones ?? []).map((i) => {
        const perfil = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
        const chk = Array.isArray(i.checkins) ? i.checkins[0] : i.checkins;
        return {
          estado: i.estado,
          tipoJugador: i.tipo_jugador ?? "byop",
          esSocio: !!perfil?.socio,
          userId: i.user_id,
          precioEntrada: i.precio_entrada ?? 0,
          precioAlquiler: i.precio_alquiler ?? 0,
          precioRecargas: i.precio_recargas ?? 0,
          precioTotal:
            i.precio_total ??
            (i.precio_entrada ?? 0) +
              (i.precio_alquiler ?? 0) +
              (i.precio_recargas ?? 0),
          presente: !!chk?.presente,
          pagoEstado: chk?.pago_estado ?? null,
          pagoMonto: chk?.pago_monto ?? null,
        };
      });
      return {
        id: p.id,
        fecha: p.fecha,
        hora: p.hora_inicio,
        modalidad: p.modalidad,
        estadoFx: estadoEfectivo({
          fecha: p.fecha,
          hora_inicio: p.hora_inicio,
          duracion_min: p.duracion_min,
          estado: p.estado,
        }),
        cancelada: p.estado === "cancelada",
        inscripciones,
      };
    },
  );

  const data = agregarAnalytics(partidas, socios, pagosData ?? [], periodo, now);

  const mesPrev = restarMeses(periodo, 1);
  const mesNext = restarMeses(periodo, -1);
  const hayNext = mesNext <= mesActual;
  const anio = periodo.split("-")[0];

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · métricas</p>
        <h1 className="sect-title fluid-3xl">Analytics del mes</h1>
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/admin/analytics?mes=${mesPrev}`}
          className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold"
        >
          ← {nombreMes(mesPrev)}
        </Link>
        <h2 className="sect-title fluid-xl text-center capitalize">
          {nombreMes(periodo)} {anio}
        </h2>
        {hayNext ? (
          <Link
            href={`/admin/analytics?mes=${mesNext}`}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold"
          >
            {nombreMes(mesNext)} →
          </Link>
        ) : (
          <span className="px-3 py-2 font-mono fluid-xs uppercase tracking-wider text-smoke/40 select-none">
            {nombreMes(mesNext)} →
          </span>
        )}
      </div>

      <AnalyticsClient data={data} />
    </div>
  );
}

type RawPartida = {
  id: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  modalidad: string;
  estado: string;
  inscripciones:
    | {
        id: string;
        estado: string;
        tipo_jugador: string | null;
        user_id: string | null;
        precio_entrada: number | null;
        precio_alquiler: number | null;
        precio_recargas: number | null;
        precio_total: number | null;
        profiles: ProfileEmbed;
        checkins: CheckinEmbed;
      }[]
    | null;
};
