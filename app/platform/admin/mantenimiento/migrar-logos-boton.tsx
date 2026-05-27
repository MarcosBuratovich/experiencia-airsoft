"use client";

import { useState, useTransition } from "react";
import {
  migrarLogosPendientesAction,
  type MigrarLogosResult,
} from "../../clanes/actions";
import { ErrorBanner } from "../../../_components/error-banner";

export function MigrarLogosBoton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MigrarLogosResult | null>(null);

  const ejecutar = () => {
    setResult(null);
    startTransition(async () => {
      const res = await migrarLogosPendientesAction();
      setResult(res);
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={ejecutar}
        disabled={pending}
        className="btn-wa px-5 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Migrando..." : "Ejecutar migración"}
      </button>

      {result && "error" in result && (
        <ErrorBanner error={result.error} className="mt-3" />
      )}

      {result && "ok" in result && (
        <div className="mt-4 border border-orange/40 bg-orange/5 clip-notch p-4 font-mono fluid-xs">
          <p className="text-green-400 mb-2">
            ✓ Migración completada
          </p>
          <ul className="space-y-1 text-ash">
            <li>Total clanes revisados: <span className="text-bone">{result.total}</span></li>
            <li>Movidos en esta corrida: <span className="text-bone">{result.movidos}</span></li>
            <li>Ya estaban OK: <span className="text-bone">{result.yaOk}</span></li>
            {result.fallidos.length > 0 && (
              <li className="text-orange-300">
                Fallaron {result.fallidos.length}:
                <ul className="mt-1 ml-4 space-y-0.5">
                  {result.fallidos.map((f, i) => (
                    <li key={i}>
                      <span className="text-bone">{f.slug}</span>: {f.error}
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
