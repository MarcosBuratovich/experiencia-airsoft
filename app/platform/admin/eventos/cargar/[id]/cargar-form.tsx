"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cargarEventosManualesAction } from "../../actions";
import { TIPOS_EVENTO } from "@/lib/match-events";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../../../_components/error-banner";

type Jugador = {
  user_id: string;
  nombre: string;
  apellido: string;
  socio: boolean;
  player_number: string | null;
};

type Counts = Record<string, Record<string, number>>;

const TIPOS_LABELS: Record<string, string> = {
  eliminacion: "Elim.",
  captura: "Capturas",
  reanimacion: "Reanim.",
  planto: "Plantos",
};

export function CargarForm({
  partidaId,
  jugadores,
  countsExistentes,
}: {
  partidaId: string;
  jugadores: Jugador[];
  countsExistentes: Counts;
}) {
  // Editamos el delta — lo ya cargado se respeta (no se puede borrar desde
  // este form, eso se hace desde /admin/eventos individuales).
  const [delta, setDelta] = useState<Counts>({});
  const [error, setError] = useState<FriendlyError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const totales = useMemo(() => {
    const t = { eliminacion: 0, captura: 0, reanimacion: 0, planto: 0 };
    for (const ucounts of Object.values(delta)) {
      t.eliminacion += ucounts.eliminacion ?? 0;
      t.captura += ucounts.captura ?? 0;
      t.reanimacion += ucounts.reanimacion ?? 0;
      t.planto += ucounts.planto ?? 0;
    }
    return t;
  }, [delta]);

  const totalEventos =
    totales.eliminacion + totales.captura + totales.reanimacion + totales.planto;

  const ajustar = (userId: string, tipo: string, n: number) => {
    setSuccess(null);
    setError(null);
    setDelta((prev) => {
      const cur = prev[userId] ?? {};
      const next = Math.max(0, Math.min(99, (cur[tipo] ?? 0) + n));
      return {
        ...prev,
        [userId]: { ...cur, [tipo]: next },
      };
    });
  };

  const set = (userId: string, tipo: string, n: number) => {
    setSuccess(null);
    setError(null);
    const v = Math.max(0, Math.min(99, isNaN(n) ? 0 : n));
    setDelta((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [tipo]: v },
    }));
  };

  const guardar = () => {
    setError(null);
    setSuccess(null);

    // Solo jugadores con player_number pueden cargar eventos
    const eventos: Array<{
      user_id: string;
      player_number: string;
      tipo: "eliminacion" | "captura" | "reanimacion" | "planto";
      count: number;
    }> = [];
    let sinNumero = 0;

    for (const j of jugadores) {
      const ud = delta[j.user_id];
      if (!ud) continue;
      for (const tipo of TIPOS_EVENTO) {
        const count = ud[tipo] ?? 0;
        if (count <= 0) continue;
        if (!j.player_number) {
          sinNumero++;
          continue;
        }
        eventos.push({
          user_id: j.user_id,
          player_number: j.player_number,
          tipo,
          count,
        });
      }
    }

    if (sinNumero > 0) {
      setError({
        titulo: `${sinNumero} entrada(s) ignoradas`,
        detalle:
          "Esos jugadores no tienen número asignado. Asignaselo desde /admin/usuarios y volvé.",
        mostrarSoporte: false,
      });
      return;
    }

    if (!eventos.length) {
      setError({ titulo: "No hay eventos para cargar — sumá al menos uno.", mostrarSoporte: false });
      return;
    }

    startTransition(async () => {
      const res = await cargarEventosManualesAction({
        partida_id: partidaId,
        eventos,
      });
      if ("error" in res && res.error) {
        setError(typeof res.error === 'string' ? { titulo: res.error, mostrarSoporte: false } : res.error);
        return;
      }
      setSuccess(`${"insertados" in res ? res.insertados : 0} eventos cargados.`);
      setDelta({});
      router.refresh();
    });
  };

  return (
    <div>
      {/* Stats arriba */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {TIPOS_EVENTO.map((tipo) => (
          <div
            key={tipo}
            className={`border ${
              totales[tipo] > 0 ? "border-orange/60 bg-orange/5" : "border-rail/60 bg-carbon"
            } clip-notch p-3 text-center`}
          >
            <p className="sect-label mb-1">{TIPOS_LABELS[tipo]}</p>
            <p className="font-display fluid-xl text-bone">+{totales[tipo]}</p>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {jugadores.map((j) => {
          const cur = delta[j.user_id] ?? {};
          const previo = countsExistentes[j.user_id] ?? {};
          const sinNumero = !j.player_number;
          return (
            <li
              key={j.user_id}
              className={`border ${
                sinNumero
                  ? "border-orange-300/40 bg-orange-300/5"
                  : "border-rail/60 bg-carbon"
              } clip-notch p-4`}
            >
              <div className="flex items-start gap-2 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-bone">
                      {j.apellido}, {j.nombre}
                    </span>
                    {j.socio && (
                      <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
                        Socio
                      </span>
                    )}
                  </div>
                  {j.player_number ? (
                    <p className="font-mono fluid-xs text-smoke tracking-[.18em]">
                      #{j.player_number}
                    </p>
                  ) : (
                    <p className="font-mono fluid-xs text-orange-300">
                      Sin número de jugador asignado
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIPOS_EVENTO.map((tipo) => (
                  <Counter
                    key={tipo}
                    label={TIPOS_LABELS[tipo]}
                    value={cur[tipo] ?? 0}
                    previo={previo[tipo] ?? 0}
                    disabled={sinNumero}
                    onMinus={() => ajustar(j.user_id, tipo, -1)}
                    onPlus={() => ajustar(j.user_id, tipo, 1)}
                    onChange={(v) => set(j.user_id, tipo, v)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={pending || totalEventos === 0}
          className="btn-wa px-5 py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending
            ? "Guardando..."
            : `Cargar ${totalEventos} ${totalEventos === 1 ? "evento" : "eventos"}`}
        </button>
        <ErrorBanner error={error} variant="inline" />
        {success && (
          <p className="font-mono fluid-xs text-green-400 uppercase tracking-[.22em]">
            {success}
          </p>
        )}
      </div>

      <p className="mt-4 font-mono fluid-xs text-smoke">
        Los contadores muestran cuánto sumás <span className="text-bone">a lo ya cargado</span>. Si querés
        eliminar un evento ya guardado, andá a /admin/eventos y filtralo.
      </p>
    </div>
  );
}

function Counter({
  label,
  value,
  previo,
  disabled,
  onMinus,
  onPlus,
  onChange,
}: {
  label: string;
  value: number;
  previo: number;
  disabled: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className={`flex flex-col gap-1 ${disabled ? "opacity-40" : ""}`}>
      <span className="sect-label">{label}</span>
      <div className="flex items-stretch border border-rail/60 bg-ink">
        <button
          type="button"
          onClick={onMinus}
          disabled={disabled || value <= 0}
          className="px-2 text-bone hover:text-orange transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Restar"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          max={99}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-center font-display fluid-lg text-bone py-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={onPlus}
          disabled={disabled || value >= 99}
          className="px-2 text-bone hover:text-orange transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Sumar"
        >
          +
        </button>
      </div>
      {previo > 0 && (
        <span className="font-mono text-[10px] text-smoke">
          ya cargados: {previo}
        </span>
      )}
    </div>
  );
}
