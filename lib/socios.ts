/**
 * Lógica de cuotas de socios.
 *
 * Un socio paga una cuota mensual a partir de su `socio_desde`. La ventana
 * de pago para el mes corriente es del día 1 al día DIA_LIMITE_PAGO. Si no
 * pagó pero todavía estamos dentro de esa ventana, el mes actual NO cuenta
 * como deuda — el socio sigue accediendo al beneficio. A partir del día
 * DIA_LIMITE_PAGO + 1, el mes pasa a ser deuda y pierde el beneficio hasta
 * ponerse al día.
 *
 * Mientras tenga deuda real (montoAdeudado > 0) NO accede al beneficio de
 * "entrada gratis" — paga la entrada como un jugador común (alquiler o
 * byop según su elección al anotarse).
 */

export const DIA_LIMITE_PAGO = 8;

export type ProfileSocio = {
  socio: boolean;
  socio_desde: string | null; // 'YYYY-MM-DD'
  cuota_mensual: number;
};

export type PagoCuota = {
  periodo: string; // 'YYYY-MM'
};

export type EstadoCuota = {
  esSocio: boolean;
  /** No tiene deuda real (puede tener el mes actual sin pagar todavía si está en plazo). */
  alDia: boolean;
  /** Periodos vencidos sin pagar (no incluye el mes actual si está dentro del plazo). */
  periodosAdeudados: string[];
  montoAdeudado: number;
  cuotaMensual: number;
  /** Estamos dentro del plazo (día 1-8) y aún no pagó el mes actual. */
  enPlazo: boolean;
  /** Días que faltan hasta DIA_LIMITE_PAGO (0 si ya venció). */
  diasParaVencer: number;
  /** Periodo del mes en curso. */
  periodoActual: string;
};

/** Devuelve 'YYYY-MM' del mes actual. */
export function periodoActual(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Devuelve la lista inclusiva de periodos 'YYYY-MM' entre desde y hasta. */
export function periodosEntre(desde: string, hasta: string): string[] {
  const [yd, md] = desde.split("-").map(Number);
  const [yh, mh] = hasta.split("-").map(Number);
  const out: string[] = [];
  let y = yd;
  let m = md;
  while (y < yh || (y === yh && m <= mh)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Restar N meses a un periodo 'YYYY-MM'. */
export function restarMeses(periodo: string, n: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const total = y * 12 + (m - 1) - n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Calcula el estado de cuota de un usuario según sus pagos. */
export function computarEstadoCuota(
  profile: ProfileSocio,
  pagos: PagoCuota[],
  now: Date = new Date(),
): EstadoCuota {
  const periodoHoy = periodoActual(now);
  const dia = now.getDate();
  const diasParaVencer = Math.max(0, DIA_LIMITE_PAGO - dia);
  const dentroDelPlazo = dia <= DIA_LIMITE_PAGO;

  const empty: EstadoCuota = {
    esSocio: false,
    alDia: true,
    periodosAdeudados: [],
    montoAdeudado: 0,
    cuotaMensual: profile.cuota_mensual,
    enPlazo: false,
    diasParaVencer,
    periodoActual: periodoHoy,
  };

  if (!profile.socio) return empty;
  if (!profile.socio_desde || profile.cuota_mensual <= 0) {
    return { ...empty, esSocio: true };
  }

  const desde = profile.socio_desde.slice(0, 7);
  // Si la fecha de alta es del futuro, no hay nada adeudado
  if (desde > periodoHoy) {
    return { ...empty, esSocio: true };
  }

  const requeridos = periodosEntre(desde, periodoHoy);
  const pagados = new Set(pagos.map((p) => p.periodo));
  const noPagados = requeridos.filter((p) => !pagados.has(p));

  // Si el mes corriente no está pagado pero estamos dentro del plazo (día 1-8),
  // no cuenta como deuda — sigue al día.
  const mesActualPendiente =
    noPagados.includes(periodoHoy) && dentroDelPlazo;
  const adeudados = mesActualPendiente
    ? noPagados.filter((p) => p !== periodoHoy)
    : noPagados;

  return {
    esSocio: true,
    alDia: adeudados.length === 0,
    periodosAdeudados: adeudados,
    montoAdeudado: adeudados.length * profile.cuota_mensual,
    cuotaMensual: profile.cuota_mensual,
    enPlazo: mesActualPendiente,
    diasParaVencer,
    periodoActual: periodoHoy,
  };
}

/** Etiqueta corta de un periodo: 'Ene 25' / 'Feb 25'. */
export function labelPeriodoCorto(periodo: string): string {
  const [y, m] = periodo.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = Number(m) - 1;
  return `${meses[idx]} ${y.slice(2)}`;
}

/** Nombre completo del mes en minúsculas: 'mayo', 'septiembre'. */
export function nombreMes(periodo: string): string {
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const m = Number(periodo.split("-")[1]) - 1;
  return meses[m] ?? "";
}
