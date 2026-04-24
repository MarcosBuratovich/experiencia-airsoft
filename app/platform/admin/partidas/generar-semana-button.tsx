"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generarSemanaProximaAction } from "../templates/actions";

export function GenerarSemanaButton() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    creadas?: number;
    omitidas?: number;
    error?: string;
  } | null>(null);
  const router = useRouter();

  const ejecutar = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await generarSemanaProximaAction();
      if ("error" in res && res.error) {
        setFeedback({ ok: false, error: res.error });
      } else {
        setFeedback({
          ok: true,
          creadas: "creadas" in res ? res.creadas : 0,
          omitidas: "omitidas" in res ? res.omitidas : 0,
        });
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={ejecutar}
        disabled={pending}
        className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold disabled:opacity-50 cursor-pointer"
        title="Crea las partidas de la próxima semana desde los templates activos. Idempotente."
      >
        {pending ? "Generando..." : "Generar semana"}
      </button>
      {feedback && (
        <p
          className={`font-mono fluid-xs uppercase tracking-[.2em] ${
            feedback.ok ? "text-green-400" : "text-orange-300"
          }`}
        >
          {feedback.ok
            ? `+${feedback.creadas} creadas · ${feedback.omitidas} omitidas`
            : `Error: ${feedback.error}`}
        </p>
      )}
    </div>
  );
}
