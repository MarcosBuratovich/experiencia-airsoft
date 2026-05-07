/**
 * Lógica de cuotas de socios.
 *
 * Un socio paga una cuota mensual a partir de su `socio_desde`. Cada mes
 * adeudado suma `cuota_mensual` a la deuda. Mientras tenga deuda > 0 NO
 * accede al beneficio de "entrada gratis" — paga la entrada como un
 * jugador común (alquiler o byop según su elección al anotarse).
 */

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
  alDia: boolean;
  periodosAdeudados: string[];
  montoAdeudado: number;
  cuotaMensual: number;
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
  if (!profile.socio) {
    return {
      esSocio: false,
      alDia: true,
      periodosAdeudados: [],
      montoAdeudado: 0,
      cuotaMensual: profile.cuota_mensual,
    };
  }
  if (!profile.socio_desde || profile.cuota_mensual <= 0) {
    return {
      esSocio: true,
      alDia: true,
      periodosAdeudados: [],
      montoAdeudado: 0,
      cuotaMensual: profile.cuota_mensual,
    };
  }

  const desde = profile.socio_desde.slice(0, 7);
  const hasta = periodoActual(now);
  // Si la fecha de alta es del futuro, no hay nada adeudado
  if (desde > hasta) {
    return {
      esSocio: true,
      alDia: true,
      periodosAdeudados: [],
      montoAdeudado: 0,
      cuotaMensual: profile.cuota_mensual,
    };
  }

  const requeridos = periodosEntre(desde, hasta);
  const pagados = new Set(pagos.map((p) => p.periodo));
  const adeudados = requeridos.filter((p) => !pagados.has(p));
  return {
    esSocio: true,
    alDia: adeudados.length === 0,
    periodosAdeudados: adeudados,
    montoAdeudado: adeudados.length * profile.cuota_mensual,
    cuotaMensual: profile.cuota_mensual,
  };
}

/** Etiqueta corta de un periodo: 'Ene 25' / 'Feb 25'. */
export function labelPeriodoCorto(periodo: string): string {
  const [y, m] = periodo.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = Number(m) - 1;
  return `${meses[idx]} ${y.slice(2)}`;
}
