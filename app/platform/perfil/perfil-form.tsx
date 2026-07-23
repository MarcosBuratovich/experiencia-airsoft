"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { actualizarPerfilAction, type ActualizarPerfilState } from "./actions";
import { track } from "@/lib/ga";
import { sugerirNumeroAction } from "../actions/auth";
import { PhoneInput } from "../components/phone-input";
import { ErrorBanner } from "../../_components/error-banner";

const initial: ActualizarPerfilState = undefined;

const ALIAS_MAX = 30;

function aliasLen(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

export function PerfilForm({
  nombre: initialNombre,
  apellido: initialApellido,
  celular,
  playerNumber,
  alias: initialAlias,
}: {
  nombre: string;
  apellido: string;
  celular: string;
  playerNumber: string | null;
  alias: string | null;
}) {
  const [state, action, pending] = useActionState(
    actualizarPerfilAction,
    initial,
  );
  const [nombre, setNombre] = useState(initialNombre);
  const [apellido, setApellido] = useState(initialApellido);
  const [alias, setAlias] = useState(initialAlias ?? "");
  const [numero, setNumero] = useState(playerNumber ?? "");
  const [sugPending, startSug] = useTransition();

  const sugerirNumero = () => {
    startSug(async () => {
      const res = await sugerirNumeroAction();
      if ("numero" in res) setNumero(res.numero);
    });
  };
  const aliasN = aliasLen(alias);

  const formErrors = state && "formErrors" in state ? state.formErrors : undefined;
  const error = state && "error" in state ? state.error : undefined;
  const ok = state && "ok" in state && state.ok;

  // Señal de engagement; deps=[state] (identidad nueva por cada submit)
  // cuenta también guardados exitosos consecutivos, sin duplicar re-renders.
  useEffect(() => {
    if (ok) track("editar_perfil");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <ErrorBanner error={error} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="sect-label mb-1 block">Nombre</span>
          <input
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={50}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {formErrors?.nombre?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {formErrors!.nombre[0]}
            </span>
          )}
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Apellido</span>
          <input
            name="apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            maxLength={50}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {formErrors?.apellido?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {formErrors!.apellido[0]}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="sect-label mb-1 block">
          Alias (opcional · cómo te ven en partidas)
        </span>
        <div className="relative">
          <input
            name="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={ALIAS_MAX * 4}
            placeholder="Tu apodo · emojis ok"
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono fluid-xs ${
              aliasN > ALIAS_MAX ? "text-orange-300" : "text-smoke"
            }`}
          >
            {aliasN}/{ALIAS_MAX}
          </span>
        </div>
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Si lo dejás vacío aparece tu nombre y apellido. Los admins igual ven
          tu nombre real para el check-in.
        </span>
        {formErrors?.alias?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors!.alias[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Celular</span>
        <PhoneInput name="celular" defaultValue={celular} required />
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Elegí tu país y escribí el número sin código. Lo formateamos automático.
        </span>
        {formErrors?.celular?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors!.celular[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Número de jugador</span>
        <div className="flex gap-2">
          <input
            name="player_number"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/[^\d]/g, ""))}
            required
            placeholder="6 dígitos"
            className="flex-1 min-w-0 bg-carbon border border-rail/60 px-3 py-2.5 font-mono tracking-[.2em] text-bone focus:border-orange outline-none transition"
          />
          <button
            type="button"
            onClick={sugerirNumero}
            disabled={sugPending}
            className="btn-ghost px-3 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
          >
            {sugPending ? "..." : "Sugerir"}
          </button>
        </div>
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Único entre todos los jugadores. Lo usa el sistema de cancha para
          registrar tus stats en cada partida.
        </span>
        {formErrors?.player_number?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors!.player_number[0]}
          </span>
        )}
      </label>

      {ok && (
        <p className="font-mono fluid-xs text-green-400 uppercase tracking-[.25em]">
          Guardado
        </p>
      )}

      <button
        type="submit"
        disabled={pending || aliasN > ALIAS_MAX}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
