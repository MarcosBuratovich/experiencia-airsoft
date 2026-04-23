"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarPagoAction, borrarPagoAction } from "./actions";

type Pago = { monto: number; metodo: string; fecha_pago: string } | null;

type Socio = {
  id: string;
  nombre: string;
  dni: string;
  socio_desde: string | null;
  cuota_mensual: number;
  pagos: Record<string, Pago>;
};

function labelPeriodo(p: string) {
  const [y, m] = p.split("-");
  const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${nombres[Number(m) - 1]} ${y.slice(2)}`;
}

export function SociosGrid({ socios, periodos }: { socios: Socio[]; periodos: string[] }) {
  const [target, setTarget] = useState<{ socio: Socio; periodo: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const pendientes = socios.filter((s) => s.pagos[periodos[0]] === null).length;

  return (
    <div>
      <div className="mb-5 flex gap-3 flex-wrap">
        <span className="mil-tag">{socios.length} socios</span>
        {pendientes > 0 && <span className="mil-tag bone">{pendientes} con cuota {labelPeriodo(periodos[0])} pendiente</span>}
      </div>

      <div className="border border-rail/60 clip-notch overflow-hidden">
        <table className="w-full">
          <thead className="bg-carbon">
            <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
              <th className="text-left px-3 py-3">Socio</th>
              <th className="text-left px-3 py-3">Cuota</th>
              {periodos.map((p) => (
                <th key={p} className="text-center px-3 py-3">{labelPeriodo(p)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {socios.map((s) => {
              const atrasado = s.pagos[periodos[0]] === null && s.pagos[periodos[1]] === null;
              return (
                <tr key={s.id} className="border-t border-rail/40">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {atrasado && <span className="w-2 h-2 rounded-full bg-orange pulse-dot" />}
                      <span className="text-bone">{s.nombre}</span>
                    </div>
                    <div className="font-mono fluid-xs text-smoke">DNI {s.dni}{s.socio_desde ? ` · desde ${s.socio_desde}` : ""}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-bone">
                    ${s.cuota_mensual.toLocaleString("es-AR")}
                  </td>
                  {periodos.map((periodo) => {
                    const pago = s.pagos[periodo];
                    const key = `${s.id}:${periodo}`;
                    const isPending = pendingKey === key;
                    return (
                      <td key={periodo} className={`px-3 py-3 text-center ${isPending ? "opacity-60" : ""}`}>
                        {pago ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm(`¿Borrar el pago de ${labelPeriodo(periodo)}?`)) return;
                              setPendingKey(key);
                              startTransition(async () => {
                                await borrarPagoAction(s.id, periodo);
                                setPendingKey(null);
                                router.refresh();
                              });
                            }}
                            className="px-2 py-1 bg-orange/10 border border-orange text-orange font-mono fluid-xs uppercase tracking-[.15em] hover:bg-orange/20 transition cursor-pointer"
                            title={`Pagado ${pago.fecha_pago} · ${pago.metodo} · $${pago.monto.toLocaleString("es-AR")}`}
                          >
                            ✓ {pago.metodo === "efectivo" ? "Efec." : "Tr."}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setTarget({ socio: s, periodo })}
                            className="px-2 py-1 border border-rail/60 text-smoke hover:border-orange hover:text-orange font-mono fluid-xs uppercase tracking-[.15em] transition cursor-pointer"
                          >
                            Marcar
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
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
              metodo: ((fd.get("metodo") as string) || "efectivo") as "efectivo" | "transferencia",
              fecha_pago: (fd.get("fecha_pago") as string) || new Date().toISOString().slice(0, 10),
            });
            if (r.error) setError(r.error);
            else onDone();
          });
        }}
      >
        <p className="sect-label mb-2">Cuota · {labelPeriodo(periodo)}</p>
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
          <select
            name="metodo"
            defaultValue="efectivo"
            className="w-full bg-ink border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
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

        {error && <p className="mb-3 font-mono fluid-xs text-orange-300">{error}</p>}

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
