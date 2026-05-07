"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelarPartidaAction,
  cerrarInscripcionPartidaAction,
  eliminarPartidaAction,
  reabrirInscripcionPartidaAction,
} from "../../actions";
import type { EstadoEfectivo } from "@/lib/partidas";

type Props = {
  partidaId: string;
  estado: string;
  estadoFx: EstadoEfectivo;
};

export function PartidaActionsButtons({ partidaId, estado, estadoFx }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (
    fn: (id: string) => Promise<{ error?: string; ok?: boolean }>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await fn(partidaId);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const isFutura = estadoFx === "futura";
  const isEnCurso = estadoFx === "en_curso";
  const isCancelada = estadoFx === "cancelada";
  const inscripcionEstaAbierta = estado === "abierta";
  const inscripcionEstaCerrada = estado === "cerrada";

  // Pasada: solo lectura, sin acciones destructivas
  if (estadoFx === "pasada") return null;
  if (isCancelada) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {isFutura && inscripcionEstaAbierta && (
          <button
            type="button"
            onClick={() =>
              run(
                cerrarInscripcionPartidaAction,
                "¿Cerrar la inscripción? Después no se va a poder anotar más nadie.",
              )
            }
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Cerrar inscripción
          </button>
        )}

        {isFutura && inscripcionEstaCerrada && (
          <button
            type="button"
            onClick={() => run(reabrirInscripcionPartidaAction)}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Reabrir inscripción
          </button>
        )}

        {(isFutura || isEnCurso) && (
          <button
            type="button"
            onClick={() =>
              run(
                cancelarPartidaAction,
                "¿Cancelar esta partida? Los inscriptos no van a poder anotarse y queda marcada como cancelada.",
              )
            }
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Cancelar partida
          </button>
        )}

        {isFutura && (
          <button
            type="button"
            onClick={() =>
              run(
                eliminarPartidaAction,
                "¿Eliminar la partida? Se borran las inscripciones y check-ins. No se puede deshacer.",
              )
            }
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Eliminar
          </button>
        )}
      </div>
      {error && <p className="font-mono fluid-xs text-orange-300">{error}</p>}
    </div>
  );
}
