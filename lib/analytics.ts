/**
 * Agregaciones para la pantalla de Analytics del mes (admin).
 * Módulo puro (sin React ni Supabase): recibe filas ya aplanadas y produce
 * todas las métricas. La página server hace los queries y delega acá.
 *
 * Convenciones (alineadas con el check-in):
 *   - "Asistente" = checkin.presente === true.
 *   - "Cobrado" = Σ(checkin.pago_monto ?? precio_total) de presentes, por
 *     método. 'debe' es pendiente (no cobrado); 'socio_presente' es ~0.
 *   - "Facturado por concepto" = Σ precio_entrada / precio_alquiler /
 *     precio_recargas de presentes (snapshot de la inscripción).
 *   - Las partidas canceladas se excluyen de todo (se cuentan aparte).
 */

import { computarEstadoCuota, type PagoCuota, type ProfileSocio } from "./socios";

export const PERIODO_RE = /^\d{4}-\d{2}$/;

/** Valida 'YYYY-MM'; si no, devuelve el fallback. */
export function periodoValido(s: string | undefined, fallback: string): string {
  return s && PERIODO_RE.test(s) ? s : fallback;
}

/** Rango half-open del mes: [primer día, primer día del mes siguiente). */
export function rangoMes(periodo: string): { desde: string; hasta: string } {
  const [y, m] = periodo.split("-").map(Number);
  const desde = `${y}-${String(m).padStart(2, "0")}-01`;
  const sigY = m === 12 ? y + 1 : y;
  const sigM = m === 12 ? 1 : m + 1;
  const hasta = `${sigY}-${String(sigM).padStart(2, "0")}-01`;
  return { desde, hasta };
}

export type InscMes = {
  estado: string; // confirmado | waitlist | cancelado
  tipoJugador: string; // alquiler | byop
  esSocio: boolean; // del perfil (registrado)
  userId: string | null;
  precioEntrada: number;
  precioAlquiler: number;
  precioRecargas: number;
  precioTotal: number;
  presente: boolean;
  pagoEstado: string | null;
  pagoMonto: number | null;
};

export type PartidaMes = {
  id: string;
  fecha: string;
  hora: string;
  modalidad: string;
  estadoFx: string;
  cancelada: boolean;
  inscripciones: InscMes[];
};

export type SocioInput = ProfileSocio & {
  id: string;
  nombre: string;
  apellido: string;
};

export type DesglosePartida = {
  id: string;
  fecha: string;
  hora: string;
  modalidad: string;
  estadoFx: string;
  confirmados: number;
  presentes: number;
  recaudado: number;
  debe: number;
};

export type AnalyticsMes = {
  nPartidas: number;
  nCanceladas: number;
  asistentes: number;
  asistenciaPorTipo: { socio: number; byop: number; alquiler: number };
  cobradoPorMetodo: { efectivo: number; transferencia: number; socio: number };
  cobradoTotal: number;
  debe: number;
  facturado: { entrada: number; alquiler: number; recargas: number; total: number };
  presentismoSocios: { id: string; nombre: string; asistencias: number }[];
  cuotas: { cobrado: number; adeudado: number; total: number; alDia: number };
  desglosePartidas: DesglosePartida[];
};

export function agregarAnalytics(
  partidas: PartidaMes[],
  socios: SocioInput[],
  pagos: { user_id: string; periodo: string; monto: number }[],
  periodo: string,
  now: Date = new Date(),
): AnalyticsMes {
  const out: AnalyticsMes = {
    nPartidas: 0,
    nCanceladas: 0,
    asistentes: 0,
    asistenciaPorTipo: { socio: 0, byop: 0, alquiler: 0 },
    cobradoPorMetodo: { efectivo: 0, transferencia: 0, socio: 0 },
    cobradoTotal: 0,
    debe: 0,
    facturado: { entrada: 0, alquiler: 0, recargas: 0, total: 0 },
    presentismoSocios: [],
    cuotas: { cobrado: 0, adeudado: 0, total: socios.length, alDia: 0 },
    desglosePartidas: [],
  };
  const presentismo = new Map<string, number>();

  for (const p of partidas) {
    if (p.cancelada) {
      out.nCanceladas++;
      continue;
    }
    out.nPartidas++;
    let confirmados = 0;
    let presentes = 0;
    let recaudado = 0;
    let debe = 0;

    for (const i of p.inscripciones) {
      if (i.estado === "confirmado") confirmados++;
      if (!i.presente) continue;

      out.asistentes++;
      presentes++;
      const monto = i.pagoMonto ?? i.precioTotal;
      const esSocioEf = i.esSocio || i.pagoEstado === "socio_presente";

      if (i.tipoJugador === "alquiler") out.asistenciaPorTipo.alquiler++;
      else if (esSocioEf) out.asistenciaPorTipo.socio++;
      else out.asistenciaPorTipo.byop++;

      out.facturado.entrada += i.precioEntrada;
      out.facturado.alquiler += i.precioAlquiler;
      out.facturado.recargas += i.precioRecargas;
      out.facturado.total += i.precioTotal;

      if (i.pagoEstado === "efectivo") {
        out.cobradoPorMetodo.efectivo += monto;
        out.cobradoTotal += monto;
        recaudado += monto;
      } else if (i.pagoEstado === "transferencia") {
        out.cobradoPorMetodo.transferencia += monto;
        out.cobradoTotal += monto;
        recaudado += monto;
      } else if (i.pagoEstado === "socio_presente") {
        out.cobradoPorMetodo.socio += monto;
      } else if (i.pagoEstado === "debe") {
        out.debe += monto;
        debe += monto;
      }

      if (i.userId && i.esSocio) {
        presentismo.set(i.userId, (presentismo.get(i.userId) ?? 0) + 1);
      }
    }

    out.desglosePartidas.push({
      id: p.id,
      fecha: p.fecha,
      hora: p.hora,
      modalidad: p.modalidad,
      estadoFx: p.estadoFx,
      confirmados,
      presentes,
      recaudado,
      debe,
    });
  }

  out.presentismoSocios = socios
    .map((s) => ({
      id: s.id,
      nombre: `${s.nombre ?? ""} ${s.apellido ?? ""}`.trim() || "—",
      asistencias: presentismo.get(s.id) ?? 0,
    }))
    .sort(
      (a, b) => b.asistencias - a.asistencias || a.nombre.localeCompare(b.nombre),
    );

  const pagosPorUser = new Map<string, PagoCuota[]>();
  for (const pg of pagos) {
    const arr = pagosPorUser.get(pg.user_id) ?? [];
    arr.push({ periodo: pg.periodo });
    pagosPorUser.set(pg.user_id, arr);
    if (pg.periodo === periodo) out.cuotas.cobrado += pg.monto;
  }
  for (const s of socios) {
    const estado = computarEstadoCuota(s, pagosPorUser.get(s.id) ?? [], now);
    out.cuotas.adeudado += estado.montoAdeudado;
    if (estado.alDia) out.cuotas.alDia++;
  }

  return out;
}
