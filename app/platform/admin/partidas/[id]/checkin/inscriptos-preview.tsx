"use client";

import { useMemo } from "react";
import { NombreConClanes } from "../../../../components/nombre-con-clanes";
import type { ClanChip } from "@/lib/clanes";

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
};

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

export function InscriptosPreview({ filas }: { filas: Fila[] }) {
  const totales = useMemo(() => {
    const confirmados = filas.filter((f) => f.estado === "confirmado");
    const waitlist = filas.filter((f) => f.estado === "waitlist");
    const ingresoEsperado = confirmados.reduce(
      (acc, f) => acc + f.precio_total,
      0,
    );
    const alquileres = confirmados.filter((f) => f.tipo_jugador === "alquiler").length;
    return {
      confirmados: confirmados.length,
      waitlist: waitlist.length,
      ingresoEsperado,
      alquileres,
    };
  }, [filas]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Confirmados" value={String(totales.confirmados)} />
        <Stat label="Espera" value={String(totales.waitlist)} muted />
        <Stat label="Alquileres" value={String(totales.alquileres)} />
        <Stat label="Ingreso esperado" value={ars(totales.ingresoEsperado)} accent />
      </div>

      {!filas.length ? (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin inscriptos todavía.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((f) => {
            const equipo = equipoLabel(f);
            return (
              <li
                key={f.id}
                className="border border-rail/60 bg-carbon clip-notch p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <NombreConClanes nombre={f.nombre} clanes={f.clanes} flair={f.flair} />
                    {f.socio && (
                      <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                        Socio
                      </span>
                    )}
                    {f.tipo_jugador === "alquiler" && (
                      <span className="px-1.5 py-0.5 bg-ink border border-rail/60 text-ash font-mono fluid-xs uppercase tracking-[.15em]">
                        Alquiler
                      </span>
                    )}
                    {f.estado === "waitlist" && (
                      <span className="mil-tag bone">Waitlist</span>
                    )}
                  </div>
                  <div className="font-mono fluid-xs text-smoke mt-1">
                    DNI {f.dni} · {f.celular}
                  </div>
                  {equipo && (
                    <div className="font-mono fluid-xs text-ash mt-0.5">
                      Equipo: {equipo}
                    </div>
                  )}
                </div>
                <div
                  className="shrink-0 text-right font-mono fluid-xs text-bone"
                  title={`Entrada ${ars(f.precio_entrada)} · Alquiler ${ars(f.precio_alquiler)}`}
                >
                  {ars(f.precio_total)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border border-rail/60 clip-notch p-3 sm:p-4 ${
        accent ? "bg-orange/5" : muted ? "bg-ink/40" : "bg-carbon"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div
        className={`font-display fluid-xl sm:fluid-2xl ${
          accent ? "text-orange" : muted ? "text-smoke" : "text-bone"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
