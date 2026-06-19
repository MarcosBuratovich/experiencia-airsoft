"use client";

import { useState } from "react";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import type { AnalyticsMes } from "@/lib/analytics";

function ars(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

export function AnalyticsClient({ data }: { data: AnalyticsMes }) {
  const sinPartidas = data.nPartidas === 0 && data.nCanceladas === 0;

  return (
    <div className="space-y-6">
      {/* Resumen / hero */}
      {sinPartidas ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin partidas este mes. Abajo seguís viendo socios y cuotas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Partidas" value={String(data.nPartidas)} />
          <Stat label="Asistentes" value={String(data.asistentes)} />
          <Stat label="Cobrado" value={ars(data.cobradoTotal)} />
          <Stat
            label="Por cobrar"
            value={ars(data.debe)}
            tone={data.debe > 0 ? "warn" : undefined}
          />
        </div>
      )}

      {/* Dinero + Asistencia, lado a lado en desktop */}
      {!sinPartidas && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Panel title="Dinero del mes" className="lg:col-span-2">
            <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke mb-2">
              Cobrado por método
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Stat compact label="Efectivo" value={ars(data.cobradoPorMetodo.efectivo)} />
              <Stat
                compact
                label="Transfer."
                value={ars(data.cobradoPorMetodo.transferencia)}
              />
              <Stat
                compact
                label="Debe"
                value={ars(data.debe)}
                tone={data.debe > 0 ? "warn" : undefined}
              />
            </div>

            <div className="my-4 h-px bg-rail/40" />

            <p className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke mb-2">
              Facturado por concepto
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat compact label="Entrada" value={ars(data.facturado.entrada)} />
              <Stat compact label="Alquiler" value={ars(data.facturado.alquiler)} />
              <Stat compact label="Recargas" value={ars(data.facturado.recargas)} />
              <Stat compact label="Total" value={ars(data.facturado.total)} />
            </div>
            <p className="mt-3 font-mono fluid-xs text-smoke leading-relaxed">
              &ldquo;Cobrado&rdquo; = lo registrado en el check-in;
              &ldquo;facturado&rdquo; = el precio de cada inscripción. Pueden
              diferir por ajustes manuales.
            </p>
          </Panel>

          <Panel title="Asistencia por tipo">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <Stat compact label="Socios" value={String(data.asistenciaPorTipo.socio)} />
              <Stat compact label="BYOP" value={String(data.asistenciaPorTipo.byop)} />
              <Stat
                compact
                label="Alquiler"
                value={String(data.asistenciaPorTipo.alquiler)}
              />
            </div>
          </Panel>
        </div>
      )}

      {/* Socios — siempre visible (no depende de partidas) */}
      <Panel title="Cuotas de socios">
        <div className="grid grid-cols-3 gap-3">
          <Stat compact label="Cobrado (mes)" value={ars(data.cuotas.cobrado)} />
          <Stat
            compact
            label="Adeudado"
            value={ars(data.cuotas.adeudado)}
            tone={data.cuotas.adeudado > 0 ? "warn" : undefined}
          />
          <Stat
            compact
            label="Al día"
            value={`${data.cuotas.alDia}/${data.cuotas.total}`}
          />
        </div>
        <p className="mt-3 font-mono fluid-xs text-smoke leading-relaxed">
          &ldquo;Adeudado&rdquo; es la deuda acumulada al día de hoy, no solo del
          mes elegido.
        </p>
      </Panel>

      <Collapsible
        title={`Presentismo de socios (${data.presentismoSocios.length})`}
        defaultOpen={false}
      >
        {!data.presentismoSocios.length ? (
          <Empty>Sin socios registrados.</Empty>
        ) : (
          <ul className="flex flex-col">
            {data.presentismoSocios.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-rail/30 last:border-0 font-mono fluid-xs uppercase tracking-[.15em]"
              >
                <span className="text-ash truncate">{s.nombre}</span>
                <span className={s.asistencias > 0 ? "text-bone" : "text-smoke/50"}>
                  {s.asistencias}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {!sinPartidas && (
        <Collapsible
          title={`Por partida (${data.desglosePartidas.length})`}
          defaultOpen
        >
          {!data.desglosePartidas.length ? (
            <Empty>Sin partidas.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.desglosePartidas.map((p) => (
                <li
                  key={p.id}
                  className="border border-rail/60 bg-carbon clip-notch p-3 flex items-start justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="font-mono fluid-xs uppercase tracking-[.18em] text-bone">
                      {formatFechaLarga(p.fecha)} · {formatHora(p.hora)}
                    </p>
                    <p className="font-mono fluid-xs text-smoke mt-0.5">
                      {modalidadLabel(p.modalidad)} · {p.estadoFx} · {p.presentes}/
                      {p.confirmados} presentes
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono fluid-xs text-bone">{ars(p.recaudado)}</p>
                    {p.debe > 0 && (
                      <p className="font-mono fluid-xs text-orange-300">
                        debe {ars(p.debe)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>
      )}

      {data.nCanceladas > 0 && (
        <p className="font-mono fluid-xs text-smoke">
          {data.nCanceladas} partida{data.nCanceladas === 1 ? "" : "s"} cancelada
          {data.nCanceladas === 1 ? "" : "s"} este mes (no se cuentan arriba).
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone?: "warn";
  compact?: boolean;
}) {
  const bg = tone === "warn" ? "bg-orange/5" : compact ? "bg-ink/40" : "bg-carbon";
  return (
    <div
      className={`border border-rail/60 clip-notch ${bg} ${
        compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display ${
          compact ? "fluid-lg" : "fluid-xl sm:fluid-2xl"
        } ${tone === "warn" ? "text-orange" : "text-bone"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border border-rail/60 bg-carbon/30 clip-notch p-4 sm:p-5 ${
        className ?? ""
      }`}
    >
      <h2 className="font-mono fluid-xs uppercase tracking-[.25em] text-orange/90 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="border border-rail/60 clip-notch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 cursor-pointer bg-carbon/30 hover:bg-carbon/60 transition"
      >
        <span className="font-mono fluid-xs uppercase tracking-[.25em] text-orange/90">
          {title}
        </span>
        <span
          className={`font-mono text-smoke transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="p-4 border-t border-rail/40">{children}</div>}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono fluid-xs text-smoke uppercase tracking-[.18em]">
      {children}
    </p>
  );
}
