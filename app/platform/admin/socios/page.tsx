import { createClient } from "@/lib/supabase/server";
import { SociosGrid } from "./socios-grid";

function lastThreePeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    periods.push(`${y}-${m}`);
  }
  return periods;
}

export default async function SociosPage() {
  const supabase = await createClient();

  const { data: socios } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, dni, socio_desde, cuota_mensual")
    .eq("socio", true)
    .order("apellido");

  const periodos = lastThreePeriods();
  const ids = (socios ?? []).map((s) => s.id);

  type PagoRow = { user_id: string; periodo: string; monto: number; metodo: string; fecha_pago: string };
  let pagos: PagoRow[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("socio_pagos")
      .select("user_id, periodo, monto, metodo, fecha_pago")
      .in("user_id", ids)
      .in("periodo", periodos);
    pagos = (data ?? []) as PagoRow[];
  }

  const pagosIndex = new Map<string, Map<string, PagoRow>>();
  for (const p of pagos) {
    if (!pagosIndex.has(p.user_id)) pagosIndex.set(p.user_id, new Map());
    pagosIndex.get(p.user_id)!.set(p.periodo, p);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="sect-label mb-2">Admin · cuotas</p>
        <h1 className="sect-title fluid-3xl">Socios</h1>
      </div>

      <SociosGrid
        socios={(socios ?? []).map((s) => ({
          id: s.id,
          nombre: `${s.apellido}, ${s.nombre}`,
          dni: s.dni,
          socio_desde: s.socio_desde,
          cuota_mensual: s.cuota_mensual,
          pagos: Object.fromEntries(
            periodos.map((periodo) => {
              const p = pagosIndex.get(s.id)?.get(periodo) ?? null;
              return [periodo, p ? { monto: p.monto, metodo: p.metodo, fecha_pago: p.fecha_pago } : null];
            }),
          ),
        }))}
        periodos={periodos}
      />

      {!socios?.length && (
        <div className="mt-6 border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Todavía no hay socios. Andá a <span className="text-orange">Usuarios</span> y marcá a alguien como socio.
          </p>
        </div>
      )}
    </div>
  );
}
