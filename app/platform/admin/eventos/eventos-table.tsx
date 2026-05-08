"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "../../components/select";
import { descartarEventoAction, reasignarEventoAction } from "./actions";

type Fila = {
  id: string;
  partida_id: string | null;
  user_id: string | null;
  player_number: string;
  tipo: string;
  local_event_id: string;
  occurred_at: string;
  ingested_at: string;
  status: string;
  reason: string | null;
  jugador: string | null;
  partida_label: string | null;
};

type PartidaOpt = { value: string; label: string };

const STATUS_STYLES: Record<string, string> = {
  aceptado: "bg-green-500/15 border-green-500/40 text-green-400",
  huerfano: "bg-orange/10 border-orange/40 text-orange",
  rechazado: "bg-red-500/15 border-red-500/40 text-red-400",
};

function formatFechaCompleta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventosTable({
  filas,
  partidasOpts,
}: {
  filas: Fila[];
  partidasOpts: PartidaOpt[];
}) {
  const [reasignando, setReasignando] = useState<string | null>(null);
  const [partidaParaReasignar, setPartidaParaReasignar] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const reasignar = (filaId: string) => {
    const partidaId = partidaParaReasignar[filaId];
    if (!partidaId) {
      setError((p) => ({ ...p, [filaId]: "Elegí una partida primero" }));
      return;
    }
    setError((p) => ({ ...p, [filaId]: null }));
    setPendingId(filaId);
    startTransition(async () => {
      const res = await reasignarEventoAction(filaId, partidaId);
      if ("error" in res && res.error) {
        setError((p) => ({ ...p, [filaId]: res.error ?? null }));
      } else {
        setReasignando(null);
        router.refresh();
      }
      setPendingId(null);
    });
  };

  const descartar = (filaId: string) => {
    if (!confirm("¿Descartar este evento? No se puede deshacer.")) return;
    setError((p) => ({ ...p, [filaId]: null }));
    setPendingId(filaId);
    startTransition(async () => {
      const res = await descartarEventoAction(filaId);
      if ("error" in res && res.error) {
        setError((p) => ({ ...p, [filaId]: res.error ?? null }));
      } else {
        router.refresh();
      }
      setPendingId(null);
    });
  };

  return (
    <ul className="flex flex-col gap-2">
      {filas.map((f) => {
        const isPending = pendingId === f.id;
        const isReasignando = reasignando === f.id;
        return (
          <li
            key={f.id}
            className={`border border-rail/60 bg-carbon clip-notch p-4 ${
              isPending ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <span
                className={`px-1.5 py-0.5 font-mono fluid-xs uppercase tracking-[.15em] border ${
                  STATUS_STYLES[f.status] ?? "border-rail/60 text-smoke"
                }`}
              >
                {f.status}
              </span>
              <span className="px-1.5 py-0.5 bg-ink border border-rail/60 text-bone font-mono fluid-xs uppercase tracking-[.15em]">
                {f.tipo}
              </span>
              <span className="font-mono fluid-xs text-smoke ml-auto">
                {formatFechaCompleta(f.occurred_at)}
              </span>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-bone">
                {f.jugador ?? <span className="text-smoke italic">(jugador desconocido)</span>}
              </span>
              <span className="font-mono fluid-xs text-smoke tracking-[.18em]">
                #{f.player_number}
              </span>
            </div>

            {f.partida_label ? (
              <p className="mt-1 font-mono fluid-xs text-ash uppercase tracking-[.18em]">
                {f.partida_label}
              </p>
            ) : (
              <p className="mt-1 font-mono fluid-xs text-smoke italic">
                Sin partida asociada
              </p>
            )}

            {f.reason && (
              <p className="mt-2 font-mono fluid-xs text-orange-300 italic">
                {f.reason}
              </p>
            )}

            <p className="mt-2 font-mono text-[10px] text-smoke truncate">
              {f.local_event_id}
            </p>

            {/* Acciones */}
            {f.status === "huerfano" && f.user_id && (
              <div className="mt-3 pt-3 border-t border-rail/40">
                {!isReasignando ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setReasignando(f.id)}
                      disabled={isPending}
                      className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
                    >
                      Reasignar a partida
                    </button>
                    <button
                      type="button"
                      onClick={() => descartar(f.id)}
                      disabled={isPending}
                      className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value={partidaParaReasignar[f.id] ?? ""}
                      onChange={(v) =>
                        setPartidaParaReasignar((p) => ({ ...p, [f.id]: v }))
                      }
                      options={partidasOpts}
                      placeholder="Elegí la partida"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => reasignar(f.id)}
                        disabled={isPending}
                        className="btn-wa px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReasignando(null);
                          setError((p) => ({ ...p, [f.id]: null }));
                        }}
                        disabled={isPending}
                        className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {error[f.id] && (
                  <p className="mt-2 font-mono fluid-xs text-orange-300">
                    {error[f.id]}
                  </p>
                )}
              </div>
            )}

            {f.status === "huerfano" && !f.user_id && (
              <div className="mt-3 pt-3 border-t border-rail/40 flex items-center gap-2 flex-wrap">
                <p className="font-mono fluid-xs text-smoke flex-1">
                  Player number desconocido — no se puede reasignar
                </p>
                <button
                  type="button"
                  onClick={() => descartar(f.id)}
                  disabled={isPending}
                  className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
                >
                  Descartar
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
