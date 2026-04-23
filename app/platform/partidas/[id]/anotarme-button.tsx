"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { anotarmeAction, desanotarmeAction } from "./actions";

type Inscripcion = { id: string; estado: string };

type Props = {
  partidaId: string;
  userId: string;
  inscripcion: Inscripcion | null;
  estado: string;
  lleno: boolean;
};

export function AnotarmeButton({ partidaId, inscripcion, estado, lleno }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (estado === "cancelada") {
    return <p className="font-mono fluid-xs text-orange-300 uppercase tracking-[.25em]">Partida cancelada.</p>;
  }

  if (inscripcion) {
    const label = inscripcion.estado === "waitlist" ? "Estás en lista de espera" : "Confirmado";
    return (
      <div className="flex items-center gap-3">
        <span className="mil-tag bone">{label}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await desanotarmeAction(partidaId);
              router.refresh();
            })
          }
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs cursor-pointer"
        >
          {pending ? "..." : "Desanotarme"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending || estado === "cerrada"}
      onClick={() =>
        startTransition(async () => {
          await anotarmeAction(partidaId);
          router.refresh();
        })
      }
      className="btn-wa px-6 py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {pending ? "..." : lleno ? "Anotarme a lista de espera" : "Anotarme"}
    </button>
  );
}
