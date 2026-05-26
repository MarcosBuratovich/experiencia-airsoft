"use client";

import { useActionState, useMemo, useState } from "react";
import type { SlotEstado } from "@/lib/slots-privada";
import { solicitarPrivadaAction, type SolicitarPrivadaState } from "../actions";

type SlotItem = {
  fecha: string;
  hora: string;
  label: string;
  estado: SlotEstado;
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatFecha(iso: string): { dia: string; numero: number; mes: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    dia: DIAS_CORTOS[diaSemanaDe(iso)],
    numero: d,
    mes: dt
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", ""),
  };
}

const initial: SolicitarPrivadaState = undefined;

export function CalendarioPrivada({ slots }: { slots: SlotItem[] }) {
  const [selected, setSelected] = useState<SlotItem | null>(null);
  const [cant, setCant] = useState("10");
  const [notas, setNotas] = useState("");
  const [state, action, pending] = useActionState(
    solicitarPrivadaAction,
    initial,
  );

  // Agrupar por fecha
  const grupos = useMemo(() => {
    const m = new Map<string, SlotItem[]>();
    for (const s of slots) {
      const arr = m.get(s.fecha) ?? [];
      arr.push(s);
      m.set(s.fecha, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  return (
    <>
      <div className="space-y-3">
        {grupos.map(([fecha, items]) => {
          const { dia, numero, mes } = formatFecha(fecha);
          const allBlocked = items.every((i) => i.estado !== "disponible");
          return (
            <div
              key={fecha}
              className={`border ${
                allBlocked ? "border-rail/40" : "border-rail/60"
              } bg-carbon clip-notch p-3 sm:p-4`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`font-display fluid-xl uppercase leading-none ${
                    allBlocked ? "text-smoke" : "text-bone"
                  }`}
                >
                  {numero}
                  <span className="ml-1 fluid-sm text-smoke">{mes}</span>
                </div>
                <div className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                  {dia}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.map((s) => (
                  <SlotButton
                    key={`${s.fecha}|${s.hora}`}
                    slot={s}
                    onClick={() => {
                      if (s.estado === "disponible") {
                        setSelected(s);
                        setCant("10");
                        setNotas("");
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-carbon border border-rail/60 w-full max-w-md clip-notch">
            <form action={action}>
              <input type="hidden" name="fecha_propuesta" value={selected.fecha} />
              <input type="hidden" name="hora_inicio" value={selected.hora} />

              <div className="flex items-start justify-between p-5 border-b border-rail/40">
                <div>
                  <p className="sect-label mb-1">// Reservar slot</p>
                  <h2 className="font-display fluid-xl uppercase tracking-wider text-bone">
                    {DIAS_LARGOS[diaSemanaDe(selected.fecha)]}{" "}
                    {formatFecha(selected.fecha).numero}{" "}
                    {formatFecha(selected.fecha).mes}
                  </h2>
                  <p className="mt-1 font-mono fluid-xs uppercase tracking-[.22em] text-orange">
                    {selected.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-smoke hover:text-bone font-mono text-3xl leading-none cursor-pointer pl-3"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                <label className="block">
                  <span className="sect-label mb-1 block">¿Cuántas personas?</span>
                  <input
                    name="cupo_estimado"
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={60}
                    value={cant}
                    onChange={(e) => setCant(e.target.value)}
                    required
                    className="w-full bg-ink border border-rail/60 px-3 py-2.5 font-mono text-bone focus:border-orange outline-none"
                  />
                  <span className="mt-1 block font-mono fluid-xs text-smoke">
                    Mínimo 2 · máximo 60.
                  </span>
                  {state?.errors?.cupo_estimado?.[0] && (
                    <span className="mt-1 block font-mono fluid-xs text-orange-300">
                      {state.errors.cupo_estimado[0]}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="sect-label mb-1 block">
                    Notas para el admin (opcional)
                  </span>
                  <textarea
                    name="notas"
                    rows={3}
                    maxLength={500}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Cumpleaños, evento corporativo, etc."
                    className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
                  />
                </label>

                {state?.message && (
                  <p className="font-mono fluid-xs text-orange-300">
                    {state.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {pending ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SlotButton({
  slot,
  onClick,
}: {
  slot: SlotItem;
  onClick: () => void;
}) {
  const meta = SLOT_STYLES[slot.estado];
  const enabled = slot.estado === "disponible";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={meta.tooltip}
      className={`px-2 py-2 clip-notch text-left transition ${meta.cls} ${
        enabled ? "cursor-pointer hover:border-orange" : "cursor-not-allowed"
      }`}
    >
      <span className="block font-mono fluid-xs uppercase tracking-[.18em]">
        {slot.label}
      </span>
      <span className="block font-mono text-[10px] tracking-[.15em] uppercase mt-0.5 opacity-80">
        {meta.tag}
      </span>
    </button>
  );
}

const SLOT_STYLES: Record<
  SlotEstado,
  { cls: string; tag: string; tooltip: string }
> = {
  disponible: {
    cls: "border border-rail/60 bg-ink/30 text-bone",
    tag: "Libre",
    tooltip: "Disponible — click para reservar",
  },
  pendiente: {
    cls: "border border-orange/40 bg-orange/5 text-orange",
    tag: "Pendiente",
    tooltip: "Hay una solicitud pendiente de aprobación",
  },
  publica: {
    cls: "border border-rail/40 bg-ink/40 text-smoke",
    tag: "Pública",
    tooltip: "Ya hay una partida pública en este rango",
  },
  aprobada: {
    cls: "border border-rail/40 bg-ink/40 text-smoke",
    tag: "Tomado",
    tooltip: "Ya hay una privada confirmada",
  },
  reservada: {
    cls: "border border-rail/40 bg-ink/40 text-smoke",
    tag: "Reservado",
    tooltip: "Slot reservado para públicas — pedile a un admin",
  },
  pasada: {
    cls: "border border-rail/30 bg-ink/20 text-smoke opacity-50",
    tag: "Pasada",
    tooltip: "Ya pasó",
  },
};
