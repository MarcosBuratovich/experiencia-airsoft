"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarPartidaAction, eliminarPartidaAction } from "../../actions";

type Props = {
  partidaId: string;
  estado: string;
  yaEmpezo: boolean;
};

export function PartidaActionsButtons({ partidaId, estado, yaEmpezo }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const cancelar = () => {
    if (!confirm("¿Cancelar esta partida? Los inscriptos no van a poder anotarse.")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelarPartidaAction(partidaId);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const eliminar = () => {
    if (
      !confirm(
        "¿Eliminar la partida? Se borran también las inscripciones y check-ins. Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await eliminarPartidaAction(partidaId);
      if ("error" in res && res.error) setError(res.error);
      // si hay éxito el server action redirige a /admin/partidas
    });
  };

  const puedeEliminar = !yaEmpezo;
  const puedeCancelar = estado !== "cancelada";

  if (!puedeCancelar && !puedeEliminar) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {puedeCancelar && (
          <button
            type="button"
            onClick={cancelar}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
          >
            Cancelar partida
          </button>
        )}
        {puedeEliminar && (
          <button
            type="button"
            onClick={eliminar}
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
