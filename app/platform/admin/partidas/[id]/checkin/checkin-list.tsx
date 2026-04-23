"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertCheckinAction } from "./actions";

type Checkin = {
  presente: boolean;
  pago_estado: string | null;
  pago_monto: number | null;
  nota: string | null;
};

type Inscripcion = {
  id: string;
  nombre: string;
  dni: string;
  celular: string;
  socio: boolean;
  estado: string;
  checkin: Checkin | null;
};

const PAGO_OPTS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transfer." },
  { value: "debe", label: "Debe" },
  { value: "socio_presente", label: "Socio" },
];

export function CheckinList({
  partidaId,
  precio,
  inscripciones,
}: {
  partidaId: string;
  precio: number;
  inscripciones: Inscripcion[];
}) {
  const [rows, setRows] = useState(inscripciones);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_, startTransition] = useTransition();
  const router = useRouter();

  const totals = useMemo(() => {
    let efectivo = 0, transferencia = 0, debe = 0, presentes = 0;
    for (const r of rows) {
      if (!r.checkin?.presente) continue;
      presentes++;
      const monto = r.checkin?.pago_monto ?? precio;
      if (r.checkin?.pago_estado === "efectivo") efectivo += monto;
      else if (r.checkin?.pago_estado === "transferencia") transferencia += monto;
      else if (r.checkin?.pago_estado === "debe") debe += monto;
    }
    return { efectivo, transferencia, debe, presentes };
  }, [rows, precio]);

  const update = (id: string, patch: Partial<Checkin>) => {
    setPendingId(id);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, checkin: { presente: false, pago_estado: null, pago_monto: null, nota: null, ...r.checkin, ...patch } }
          : r,
      ),
    );
    startTransition(async () => {
      const row = rows.find((r) => r.id === id);
      const merged: Checkin = {
        presente: patch.presente ?? row?.checkin?.presente ?? false,
        pago_estado: patch.pago_estado !== undefined ? patch.pago_estado : row?.checkin?.pago_estado ?? null,
        pago_monto: patch.pago_monto !== undefined ? patch.pago_monto : row?.checkin?.pago_monto ?? precio,
        nota: patch.nota !== undefined ? patch.nota : row?.checkin?.nota ?? null,
      };
      await upsertCheckinAction(id, merged);
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Presentes" value={`${totals.presentes}/${rows.length}`} />
        <Stat label="Efectivo" value={`$${totals.efectivo.toLocaleString("es-AR")}`} />
        <Stat label="Transferencia" value={`$${totals.transferencia.toLocaleString("es-AR")}`} />
        <Stat label="Debe" value={`$${totals.debe.toLocaleString("es-AR")}`} tone="warn" />
      </div>

      <div className="border border-rail/60 clip-notch overflow-hidden">
        <table className="w-full">
          <thead className="bg-carbon">
            <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
              <th className="text-left px-3 py-3">Jugador</th>
              <th className="text-center px-3 py-3">Presente</th>
              <th className="text-left px-3 py-3">Pago</th>
              <th className="text-left px-3 py-3">Monto</th>
              <th className="text-left px-3 py-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const c = r.checkin;
              const isPending = pendingId === r.id;
              return (
                <tr key={r.id} className={`border-t border-rail/40 ${isPending ? "opacity-60" : ""}`}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-bone">{r.nombre}</span>
                      {r.socio && <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">Socio</span>}
                    </div>
                    <div className="font-mono fluid-xs text-smoke">DNI {r.dni} · {r.celular}</div>
                    {r.estado === "waitlist" && <span className="mil-tag bone mt-1 inline-block">Waitlist</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!c?.presente}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const patch: Partial<Checkin> = { presente: checked };
                        if (checked && r.socio && !c?.pago_estado) {
                          patch.pago_estado = "socio_presente";
                          patch.pago_monto = 0;
                        }
                        update(r.id, patch);
                      }}
                      className="w-5 h-5 accent-orange cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PAGO_OPTS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => update(r.id, { pago_estado: o.value })}
                          className={`px-2 py-1 font-mono fluid-xs uppercase tracking-[.15em] border transition cursor-pointer ${
                            c?.pago_estado === o.value
                              ? "bg-orange text-ink border-orange"
                              : "border-rail/60 text-ash hover:border-orange"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      defaultValue={c?.pago_monto ?? precio}
                      onBlur={(e) => update(r.id, { pago_monto: Number(e.target.value) || 0 })}
                      className="w-24 bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      defaultValue={c?.nota ?? ""}
                      onBlur={(e) => update(r.id, { nota: e.target.value || null })}
                      placeholder="—"
                      className="w-full bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none"
                    />
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-smoke font-mono fluid-xs">Sin inscriptos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`border border-rail/60 clip-notch p-4 ${tone === "warn" ? "bg-orange/5" : "bg-carbon"}`}>
      <div className="sect-label mb-1">{label}</div>
      <div className="font-display fluid-2xl text-bone">{value}</div>
    </div>
  );
}
