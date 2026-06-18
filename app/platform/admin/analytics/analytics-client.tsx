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
    <div className="space-y-8">
      {sinPartidas ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin partidas este mes. Abajo seguís viendo el estado de cuotas y socios.
          </p>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Partidas" value={String(data.nPartidas)} />
        <Stat label="Asistentes" value={String(data.asistentes)} />
        <Stat label="Cobrado" value={ars(data.cobradoTotal)} />
        <Stat
          label="Por cobrar"
          value={ars(data.debe)}
          tone={data.debe > 0 ? "warn" : undefined}
        />
      </div>

      <Section title="Asistencia por tipo">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Socios" value={String(data.asistenciaPorTipo.socio)} />
          <Stat label="BYOP" value={String(data.asistenciaPorTipo.byop)} />
          <Stat label="Alquiler" value={String(data.asistenciaPorTipo.alquiler)} />
        </div>
      </Section>

      <Section title="Cobrado por método">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Efectivo" value={ars(data.cobradoPorMetodo.efectivo)} />
          <Stat
            label="Transferencia"
            value={ars(data.cobradoPorMetodo.transferencia)}
          />
          <Stat
            label="Debe"
            value={ars(data.debe)}
            tone={data.debe > 0 ? "warn" : undefined}
          />
        </div>
      </Section>

      <Section title="Facturado por concepto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Entrada" value={ars(data.facturado.entrada)} />
          <Stat label="Alquiler" value={ars(data.facturado.alquiler)} />
          <Stat label="Recargas" value={ars(data.facturado.recargas)} />
          <Stat label="Total" value={ars(data.facturado.total)} />
        </div>
        <p className="mt-2 font-mono fluid-xs text-smoke">
          &ldquo;Cobrado&rdquo; sale del monto registrado en el check-in;
          &ldquo;facturado&rdquo; del precio de cada inscripción. Pueden diferir
          por ajustes manuales.
        </p>
      </Section>
        </>
      )}

      <Section title="Cuotas de socios">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Cobrado (mes)" value={ars(data.cuotas.cobrado)} />
          <Stat
            label="Adeudado (a hoy)"
            value={ars(data.cuotas.adeudado)}
            tone={data.cuotas.adeudado > 0 ? "warn" : undefined}
          />
          <Stat
            label="Al día"
            value={`${data.cuotas.alDia}/${data.cuotas.total}`}
          />
        </div>
        <p className="mt-2 font-mono fluid-xs text-smoke">
          &ldquo;Adeudado&rdquo; refleja la deuda acumulada al día de hoy, no
          solo del mes seleccionado.
        </p>
      </Section>

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
                className="flex items-center justify-between gap-3 py-2 border-b border-rail/30 font-mono fluid-xs uppercase tracking-[.15em]"
              >
                <span className="text-ash truncate">{s.nombre}</span>
                <span
                  className={
                    s.asistencias > 0 ? "text-bone" : "text-smoke/50"
                  }
                >
                  {s.asistencias}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      {!sinPartidas && (
      <Collapsible
        title={`Desglose por partida (${data.desglosePartidas.length})`}
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
                    {modalidadLabel(p.modalidad)} · {p.estadoFx} ·{" "}
                    {p.presentes}/{p.confirmados} presentes
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="sect-label mb-3">{title}</h2>
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
        className="w-full flex items-center justify-between gap-3 px-4 py-3 cursor-pointer bg-carbon"
      >
        <span className="sect-label">{title}</span>
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
