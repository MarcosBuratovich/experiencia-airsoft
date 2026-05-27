"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarPagoAction, borrarPagoAction } from "./actions";
import { Select } from "../../components/select";
import { labelPeriodoCorto } from "@/lib/socios";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

const METODO_OPTS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
];

type Pago = { monto: number; metodo: string; fecha_pago: string } | null;

type Socio = {
  id: string;
  nombre: string;
  dni: string;
  socio_desde: string | null;
  cuota_mensual: number;
  pagos: Record<string, Pago>;
  alDia: boolean;
  mesesAdeudados: number;
  montoAdeudado: number;
};

function isPeriodoElegible(socioDesde: string | null, periodo: string): boolean {
  if (!socioDesde) return true;
  return socioDesde.slice(0, 7) <= periodo;
}

export function SociosGrid({
  socios,
  periodos,
}: {
  socios: Socio[];
  periodos: string[];
}) {
  const [target, setTarget] = useState<{ socio: Socio; periodo: string } | null>(
    null,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <div className="border border-rail/60 clip-notch overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-carbon">
            <tr className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
              <th className="text-left px-3 py-3 sticky left-0 bg-carbon z-10 min-w-[200px]">
                Socio
              </th>
              <th className="text-right px-3 py-3 min-w-[80px]">Cuota</th>
              {periodos.map((p) => (
                <th key={p} className="text-center px-2 py-3 min-w-[70px]">
                  {labelPeriodoCorto(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {socios.map((s) => (
              <tr key={s.id} className="border-t border-rail/40 hover:bg-carbon/40">
                <td className="px-3 py-3 sticky left-0 bg-ink z-10">
                  <div className="flex items-center gap-2">
                    {!s.alDia && (
                      <span className="w-2 h-2 rounded-full bg-orange pulse-dot shrink-0" />
                    )}
                    <span className="text-bone">{s.nombre}</span>
                  </div>
                  <div className="font-mono fluid-xs text-smoke mt-0.5">
                    DNI {s.dni}
                    {!s.alDia && (
                      <span className="text-orange">
                        {" "}
                        · debe ${s.montoAdeudado.toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-bone">
                  ${s.cuota_mensual.toLocaleString("es-AR")}
                </td>
                {periodos.map((periodo) => {
                  const pago = s.pagos[periodo];
                  const elegible = isPeriodoElegible(s.socio_desde, periodo);
                  const key = `${s.id}:${periodo}`;
                  const isPending = pendingKey === key;
                  return (
                    <td
                      key={periodo}
                      className={`px-2 py-3 text-center align-middle ${
                        isPending ? "opacity-60" : ""
                      }`}
                    >
                      {!elegible ? (
                        <span className="font-mono fluid-xs text-smoke/40">—</span>
                      ) : pago ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !confirm(
                                `¿Borrar el pago de ${labelPeriodoCorto(periodo)}?`,
                              )
                            )
                              return;
                            setPendingKey(key);
                            startTransition(async () => {
                              await borrarPagoAction(s.id, periodo);
                              setPendingKey(null);
                              router.refresh();
                            });
                          }}
                          className="px-2 py-1 bg-orange/10 border border-orange text-orange font-mono fluid-xs uppercase tracking-[.12em] hover:bg-orange/20 transition cursor-pointer"
                          title={`Pagado ${pago.fecha_pago} · ${pago.metodo} · $${pago.monto.toLocaleString("es-AR")}`}
                        >
                          {pago.metodo === "efectivo" ? "EFE" : "TR"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTarget({ socio: s, periodo })}
                          className="px-2 py-1 border border-rail/60 text-smoke hover:border-orange hover:text-orange font-mono fluid-xs uppercase tracking-[.12em] transition cursor-pointer"
                        >
                          —
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
        EFE = efectivo · TR = transferencia · — sin pago · click para registrar o
        borrar
      </p>

      {target && (
        <RegistrarPagoModal
          socio={target.socio}
          periodo={target.periodo}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RegistrarPagoModal({
  socio,
  periodo,
  onClose,
  onDone,
}: {
  socio: Socio;
  periodo: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<FriendlyError | null>(null);
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia">("efectivo");

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/80 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        className="bg-carbon border border-rail/80 clip-notch-lg w-full max-w-sm p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await registrarPagoAction({
              user_id: socio.id,
              periodo,
              monto: Number(fd.get("monto")) || 0,
              metodo,
              fecha_pago:
                (fd.get("fecha_pago") as string) ||
                new Date().toISOString().slice(0, 10),
            });
            if ("error" in r) setError(r.error);
            else onDone();
          });
        }}
      >
        <p className="sect-label mb-2">Cuota · {labelPeriodoCorto(periodo)}</p>
        <h2 className="sect-title fluid-xl mb-4">{socio.nombre}</h2>

        <label className="block mb-3">
          <span className="sect-label mb-1 block">Monto</span>
          <input
            name="monto"
            type="number"
            min={0}
            defaultValue={socio.cuota_mensual}
            required
            className="w-full bg-ink border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none"
          />
        </label>
        <label className="block mb-3">
          <span className="sect-label mb-1 block">Método</span>
          <Select
            value={metodo}
            onChange={(v) => setMetodo(v as "efectivo" | "transferencia")}
            options={METODO_OPTS}
          />
        </label>
        <label className="block mb-4">
          <span className="sect-label mb-1 block">Fecha</span>
          <input
            name="fecha_pago"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="w-full bg-ink border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none"
          />
        </label>

        <ErrorBanner error={error} variant="inline" className="mb-3" />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-ghost py-2.5 clip-tag uppercase tracking-wider fluid-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 btn-wa py-2.5 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 cursor-pointer"
          >
            {pending ? "..." : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
