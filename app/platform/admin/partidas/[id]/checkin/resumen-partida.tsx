"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertCheckinAction } from "./actions";
import { NombreConClanes } from "../../../../components/nombre-con-clanes";
import { ContactoWa } from "../../../../components/contacto-wa";
import { ErrorBanner } from "@/app/_components/error-banner";
import type { ClanChip } from "@/lib/clanes";
import type { FriendlyError } from "@/lib/errors";

type Checkin = {
  presente: boolean;
  pago_estado: string | null;
  pago_monto: number | null;
  nota: string | null;
};

type Fila = {
  id: string;
  nombre: string;
  clanes: ClanChip[];
  flair?: string | null;
  dni: string;
  celular: string;
  socio: boolean;
  tipo_jugador: string;
  estado: string;
  alquila_marcadora: boolean;
  alquila_premium: boolean;
  alquila_chaleco: boolean;
  recarga_tracer_100: number;
  recarga_conv_200: number;
  precio_entrada: number;
  precio_alquiler: number;
  precio_recargas: number;
  precio_total: number;
  checkin: Checkin | null;
};

const PAGO_OPTS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transfer." },
  { value: "debe", label: "Debe" },
  { value: "socio_presente", label: "Socio" },
];

function ars(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function equipoLabel(f: Fila): string | null {
  const bits: string[] = [];
  if (f.tipo_jugador === "alquiler") {
    if (f.alquila_marcadora) bits.push("Marcadora simple");
    if (f.alquila_premium) bits.push("Marcadora avanzada");
    if (f.alquila_chaleco) bits.push("Chaleco");
  }
  if (f.recarga_tracer_100 > 0)
    bits.push(`${f.recarga_tracer_100}× tracer 200`);
  if (f.recarga_conv_200 > 0) bits.push(`${f.recarga_conv_200}× común 200`);
  if (!bits.length) return null;
  return bits.join(" · ");
}

export function ResumenPartida({
  partidaId: _partidaId,
  filas,
  contextoWa,
}: {
  partidaId: string;
  filas: Fila[];
  /** Cola del mensaje de WhatsApp al deudor (fecha/hora de la partida). */
  contextoWa?: string;
}) {
  const [rows, setRows] = useState(filas);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const totales = useMemo(() => {
    let efectivo = 0,
      transferencia = 0,
      debe = 0,
      presentes = 0,
      ausentes = 0;
    const deudores: Fila[] = [];
    for (const r of rows) {
      const presente = r.checkin?.presente;
      if (presente) presentes++;
      else ausentes++;
      const monto = r.checkin?.pago_monto ?? r.precio_total;
      if (r.checkin?.pago_estado === "efectivo") efectivo += monto;
      else if (r.checkin?.pago_estado === "transferencia") transferencia += monto;
      else if (r.checkin?.pago_estado === "debe") {
        debe += monto;
        deudores.push(r);
      }
    }
    return { efectivo, transferencia, debe, presentes, ausentes, deudores };
  }, [rows]);

  const cambiarPago = (id: string, pago_estado: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setPendingId(id);
    setError(null);
    const snapshot = row;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              checkin: {
                presente: r.checkin?.presente ?? true,
                pago_estado,
                pago_monto: r.checkin?.pago_monto ?? r.precio_total,
                nota: r.checkin?.nota ?? null,
              },
            }
          : r,
      ),
    );

    startTransition(async () => {
      const res = await upsertCheckinAction(id, {
        presente: row.checkin?.presente ?? true,
        pago_estado,
        pago_monto: row.checkin?.pago_monto ?? row.precio_total,
        nota: row.checkin?.nota ?? null,
      });
      setPendingId(null);
      if (res && "error" in res && res.error) {
        setRows((prev) => prev.map((r) => (r.id === id ? snapshot : r)));
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Asistencia" value={`${totales.presentes}/${rows.length}`} />
        <Stat label="Efectivo" value={ars(totales.efectivo)} />
        <Stat label="Transfer." value={ars(totales.transferencia)} />
        <Stat label="Pendiente" value={ars(totales.debe)} tone={totales.debe > 0 ? "warn" : undefined} />
      </div>

      <ErrorBanner error={error} variant="inline" className="mb-6" />

      {/* Deudas */}
      <section className="mb-8">
        <h2 className="sect-label mb-3">
          Deudas pendientes ({totales.deudores.length})
        </h2>
        {totales.deudores.length === 0 ? (
          <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
            <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
              Caja al día. Cero deudores.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {totales.deudores.map((d) => {
              const monto = d.checkin?.pago_monto ?? d.precio_total;
              const isPending = pendingId === d.id;
              return (
                <li
                  key={d.id}
                  className={`border border-orange/40 bg-orange/5 clip-notch p-4 ${
                    isPending ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <NombreConClanes nombre={d.nombre} clanes={d.clanes} flair={d.flair} />
                        {d.socio && (
                          <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                            Socio
                          </span>
                        )}
                      </div>
                      <p className="font-mono fluid-xs text-smoke mt-1">
                        DNI {d.dni} ·{" "}
                        <ContactoWa
                          celular={d.celular}
                          nombre={d.nombre}
                          contexto={contextoWa}
                          variant="inline"
                        />
                      </p>
                    </div>
                    <p className="font-display fluid-lg text-orange">{ars(monto)}</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange/20 flex items-center gap-2 flex-wrap">
                    <span className="font-mono fluid-xs uppercase tracking-[.2em] text-ash">
                      Marcar pagado
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiarPago(d.id, "efectivo")}
                      disabled={isPending}
                      className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarPago(d.id, "transferencia")}
                      disabled={isPending}
                      className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
                    >
                      Transferencia
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Asistencia completa */}
      <section>
        <h2 className="sect-label mb-3">Asistencia completa ({rows.length})</h2>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const equipo = equipoLabel(r);
            const presente = r.checkin?.presente;
            const pago = r.checkin?.pago_estado;
            const monto = r.checkin?.pago_monto ?? r.precio_total;
            return (
              <li
                key={r.id}
                className={`border border-rail/60 bg-carbon clip-notch p-4 flex items-start gap-3 flex-wrap ${
                  !presente ? "opacity-60" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <NombreConClanes nombre={r.nombre} clanes={r.clanes} flair={r.flair} />
                    {presente ? (
                      <span className="px-1.5 py-0.5 bg-orange/15 border border-orange/40 text-orange font-mono fluid-xs uppercase tracking-[.15em]">
                        Presente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 border border-rail/60 text-smoke font-mono fluid-xs uppercase tracking-[.15em]">
                        Ausente
                      </span>
                    )}
                    {r.socio && (
                      <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                        Socio
                      </span>
                    )}
                  </div>
                  <p className="font-mono fluid-xs text-smoke mt-1">
                    DNI {r.dni}
                  </p>
                  {equipo && (
                    <p className="font-mono fluid-xs text-ash mt-0.5">
                      Equipo: {equipo}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono fluid-xs uppercase tracking-[.18em] text-ash">
                    {pago ? PAGO_OPTS.find((o) => o.value === pago)?.label ?? pago : "—"}
                  </p>
                  {presente && (
                    <p className="font-mono fluid-xs text-bone mt-0.5">{ars(monto)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`border border-rail/60 clip-notch p-3 sm:p-4 ${
        tone === "warn" ? "bg-orange/5" : "bg-carbon"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display fluid-xl sm:fluid-2xl ${
          tone === "warn" ? "text-orange" : "text-bone"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
