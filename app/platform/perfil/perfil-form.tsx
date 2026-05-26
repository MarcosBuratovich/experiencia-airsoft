"use client";

import { useActionState, useState } from "react";
import { actualizarPerfilAction, type ActualizarPerfilState } from "./actions";
import { PhoneInput } from "../components/phone-input";

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
  celular,
  playerNumber,
  alias: initialAlias,
}: {
  celular: string;
  playerNumber: string | null;
  alias: string | null;
}) {
  const [state, action, pending] = useActionState(
    actualizarPerfilAction,
    initial,
  );
  const [alias, setAlias] = useState(initialAlias ?? "");
  const aliasN = aliasLen(alias);

  return (
    <form action={action} className="space-y-4">
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
        {state?.errors?.alias?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.alias[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Celular</span>
        <PhoneInput name="celular" defaultValue={celular} required />
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Elegí tu país y escribí el número sin código. Lo formateamos automático.
        </span>
        {state?.errors?.celular?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.celular[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Número de jugador</span>
        <input
          name="player_number"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          defaultValue={playerNumber ?? ""}
          required
          placeholder="6 dígitos"
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-mono tracking-[.2em] text-bone focus:border-orange outline-none transition"
        />
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Único entre todos los jugadores. Lo usa el sistema de cancha para
          registrar tus stats en cada partida.
        </span>
        {state?.errors?.player_number?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.player_number[0]}
          </span>
        )}
      </label>

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}
      {state?.ok && (
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
