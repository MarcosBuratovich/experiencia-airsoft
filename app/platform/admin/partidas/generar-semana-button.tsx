"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generarPartidasSeleccionadasAction,
  getPreviewSemanaAction,
} from "../templates/actions";
import type { PartidaPreviewItem, SemanaSel } from "../templates/types";
import { formatHora, modalidadLabel } from "@/lib/format";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function diaSemanaIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatDiaMes(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

type Feedback =
  | { ok: true; creadas: number; omitidas: number }
  | { ok: false; error: FriendlyError }
  | null;

export function GenerarSemanaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [semana, setSemana] = useState<SemanaSel>("actual");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PartidaPreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setFeedback(null);
    getPreviewSemanaAction({ semana }).then((res) => {
      if (cancelled) return;
      if ("error" in res && res.error) {
        setItems([]);
        setSelected(new Set());
        setFeedback({ ok: false, error: res.error });
      } else {
        const next = "items" in res ? (res.items ?? []) : [];
        setItems(next);
        setSelected(
          new Set(next.filter((i) => !i.yaExiste).map((i) => i.key)),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, semana]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const seleccionables = items.filter((i) => !i.yaExiste);
  const elegidos = seleccionables.filter((i) => selected.has(i.key)).length;

  const allSelected =
    seleccionables.length > 0 && elegidos === seleccionables.length;
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(seleccionables.map((i) => i.key)));
    }
  };

  const generar = () => {
    const seleccion = seleccionables.filter((i) => selected.has(i.key));
    if (!seleccion.length) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await generarPartidasSeleccionadasAction({
        items: seleccion.map((i) => ({
          fecha: i.fecha,
          templateId: i.templateId,
        })),
      });
      if ("error" in res && res.error) {
        setFeedback({ ok: false, error: res.error });
      } else if ("ok" in res && res.ok) {
        setFeedback({
          ok: true,
          creadas: res.creadas,
          omitidas: res.omitidas,
        });
        // Refrescar la lista: lo creado pasa a "ya existe".
        const reload = await getPreviewSemanaAction({ semana });
        if ("items" in reload) {
          setItems(reload.items ?? []);
          setSelected(new Set());
        }
        router.refresh();
      }
    });
  };

  const grupos = items.reduce<Record<string, PartidaPreviewItem[]>>(
    (acc, it) => {
      (acc[it.fecha] ??= []).push(it);
      return acc;
    },
    {},
  );
  const fechas = Object.keys(grupos).sort();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold cursor-pointer"
        title="Generar partidas de la semana desde templates"
      >
        Generar semana
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-carbon border border-rail/60 w-full max-w-2xl clip-notch my-8">
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-rail/40">
              <div>
                <p className="sect-label mb-1">// Generar partidas</p>
                <h2 className="sect-title fluid-xl text-bone">
                  Templates de la semana
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-smoke hover:text-bone font-mono text-3xl leading-none cursor-pointer pl-3"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(["actual", "proxima"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSemana(opt)}
                    className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                      semana === opt
                        ? "bg-orange text-ink"
                        : "border border-rail/60 text-ash hover:text-bone"
                    }`}
                  >
                    {opt === "actual" ? "Esta semana" : "Próxima semana"}
                  </button>
                ))}
                {seleccionables.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="ml-auto font-mono fluid-xs uppercase tracking-[.2em] text-ash hover:text-bone cursor-pointer"
                  >
                    {allSelected
                      ? "Deseleccionar todo"
                      : "Seleccionar todo"}
                  </button>
                )}
              </div>

              {loading ? (
                <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
                  Cargando preview...
                </p>
              ) : items.length === 0 ? (
                <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
                  No hay templates activos para esta semana.
                </p>
              ) : (
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                  {fechas.map((fecha) => {
                    const grupo = grupos[fecha];
                    const dow = diaSemanaIso(fecha);
                    return (
                      <div key={fecha}>
                        <p className="font-mono fluid-xs uppercase tracking-[.22em] text-ash mb-2">
                          {DIAS_LARGOS[dow]} · {formatDiaMes(fecha)}
                        </p>
                        <ul className="space-y-1.5">
                          {grupo.map((it) => {
                            const isSel = selected.has(it.key);
                            return (
                              <li key={it.key}>
                                <label
                                  className={`flex items-center gap-3 border px-3 py-2 clip-notch transition ${
                                    it.yaExiste
                                      ? "border-rail/40 bg-ink/40 opacity-60 cursor-not-allowed"
                                      : isSel
                                        ? "border-orange/60 bg-orange/5 cursor-pointer"
                                        : "border-rail/60 hover:border-orange/40 cursor-pointer"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    onChange={() => toggle(it.key)}
                                    disabled={it.yaExiste}
                                    className="w-4 h-4 accent-orange disabled:cursor-not-allowed"
                                  />
                                  <span className="font-mono fluid-xs uppercase tracking-[.18em] text-bone shrink-0 w-14">
                                    {formatHora(it.hora_inicio)}
                                  </span>
                                  <span className="mil-tag shrink-0">
                                    {modalidadLabel(it.modalidad)}
                                  </span>
                                  <span className="flex-1 text-right font-mono fluid-xs text-smoke">
                                    {it.yaExiste
                                      ? "ya existe"
                                      : `cupo ${it.cupo_max} · ${it.duracion_min}m`}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 p-5 sm:p-6 border-t border-rail/40">
              <div className="font-mono fluid-xs uppercase tracking-[.2em]">
                {feedback?.ok ? (
                  <span className="text-green-400">
                    +{feedback.creadas} creadas · {feedback.omitidas} omitidas
                  </span>
                ) : feedback && feedback.ok === false ? (
                  <ErrorBanner error={feedback.error} variant="inline" />
                ) : (
                  <span className="text-smoke">
                    {elegidos}/{seleccionables.length} seleccionadas
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={generar}
                  disabled={pending || elegidos === 0}
                  className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {pending ? "Generando..." : `Generar ${elegidos}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
