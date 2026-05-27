import { createClient } from "@/lib/supabase/server";
import {
  computarEstadoCuota,
  labelPeriodoCorto,
  periodoActual,
  restarMeses,
} from "@/lib/socios";
import { SociosGrid } from "./socios-grid";

const MESES_VISIBLES = 12;

export default async function SociosPage() {
  const supabase = await createClient();

  const { data: socios } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, dni, socio_desde, cuota_mensual")
    .eq("socio", true)
    .order("apellido");

  const ahora = periodoActual();
  // últimos N meses, ordenados de nuevo a viejo (mes actual a la izquierda)
  const periodos: string[] = [];
  for (let i = 0; i < MESES_VISIBLES; i++) {
    periodos.push(restarMeses(ahora, i));
  }

  type PagoRow = {
    user_id: string;
    periodo: string;
    monto: number;
    metodo: string;
    fecha_pago: string;
  };
  const ids = (socios ?? []).map((s) => s.id);
  let pagosTodos: PagoRow[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("socio_pagos")
      .select("user_id, periodo, monto, metodo, fecha_pago")
      .in("user_id", ids);
    pagosTodos = (data ?? []) as PagoRow[];
  }

  const pagosByUser = new Map<string, PagoRow[]>();
  for (const p of pagosTodos) {
    const arr = pagosByUser.get(p.user_id);
    if (arr) arr.push(p);
    else pagosByUser.set(p.user_id, [p]);
  }

  // Pre-compute estado de cuota y arma rows
  const rows = (socios ?? []).map((s) => {
    const cuota = computarEstadoCuota(
      {
        socio: true,
        socio_desde: s.socio_desde,
        cuota_mensual: s.cuota_mensual ?? 0,
      },
      pagosByUser.get(s.id) ?? [],
    );
    const pagosByPeriodo = new Map<string, PagoRow>();
    for (const p of pagosByUser.get(s.id) ?? []) {
      pagosByPeriodo.set(p.periodo, p);
    }
    const pagos: Record<
      string,
      { monto: number; metodo: string; fecha_pago: string } | null
    > = {};
    for (const periodo of periodos) {
      const p = pagosByPeriodo.get(periodo);
      pagos[periodo] = p
        ? { monto: p.monto, metodo: p.metodo, fecha_pago: p.fecha_pago }
        : null;
    }
    return {
      id: s.id,
      nombre: `${s.apellido}, ${s.nombre}`,
      dni: s.dni,
      socio_desde: s.socio_desde,
      cuota_mensual: s.cuota_mensual ?? 0,
      pagos,
      alDia: cuota.alDia,
      mesesAdeudados: cuota.periodosAdeudados.length,
      montoAdeudado: cuota.montoAdeudado,
    };
  });

  const totalSocios = rows.length;
  const alDia = rows.filter((r) => r.alDia).length;
  const conDeuda = rows.filter((r) => !r.alDia).length;
  const totalAdeudado = rows.reduce((acc, r) => acc + r.montoAdeudado, 0);
  const cobradoMesActual = rows.reduce(
    (acc, r) => acc + (r.pagos[ahora]?.monto ?? 0),
    0,
  );

  const deudores = rows
    .filter((r) => !r.alDia)
    .sort((a, b) => b.montoAdeudado - a.montoAdeudado);

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · cuotas</p>
        <h1 className="sect-title fluid-3xl">Socios</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Total socios" value={String(totalSocios)} />
        <Stat label="Al día" value={String(alDia)} accent={alDia > 0} />
        <Stat
          label="Con deuda"
          value={String(conDeuda)}
          tone={conDeuda > 0 ? "warn" : undefined}
        />
        <Stat
          label={`${labelPeriodoCorto(ahora)} cobrado`}
          value={`$${cobradoMesActual.toLocaleString("es-AR")}`}
        />
      </div>

      {/* Deudores destacados */}
      {deudores.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="sect-title fluid-xl text-orange">Deudores</h2>
            <span className="font-mono fluid-xs uppercase tracking-[.25em] text-orange">
              ${totalAdeudado.toLocaleString("es-AR")} pendiente
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {deudores.map((d) => (
              <li
                key={d.id}
                className="border border-orange/40 bg-orange/5 clip-notch p-3 sm:p-4 flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full bg-orange pulse-dot shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-bone truncate">{d.nombre}</p>
                  <p className="font-mono fluid-xs text-smoke">
                    DNI {d.dni} · {d.mesesAdeudados}{" "}
                    {d.mesesAdeudados === 1 ? "mes" : "meses"}
                  </p>
                </div>
                <p className="font-display fluid-lg text-orange shrink-0">
                  ${d.montoAdeudado.toLocaleString("es-AR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Grilla mensual */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="sect-title fluid-xl">Historial · 12 meses</h2>
          <span className="font-mono fluid-xs uppercase tracking-[.25em] text-smoke hidden sm:inline">
            Tap en una celda para registrar pago
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
            <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
              Todavía no hay socios. Andá a{" "}
              <span className="text-orange">Usuarios</span> y marcá a alguien
              como socio.
            </p>
          </div>
        ) : (
          <SociosGrid socios={rows} periodos={periodos} />
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "warn";
}) {
  return (
    <div
      className={`border border-rail/60 clip-notch p-3 sm:p-4 ${
        tone === "warn" ? "bg-orange/5" : accent ? "bg-orange/5" : "bg-carbon"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display fluid-xl sm:fluid-2xl ${
          tone === "warn" ? "text-orange" : accent ? "text-orange" : "text-bone"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
