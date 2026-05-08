"use client";

import { useActionState } from "react";
import { actualizarPerfilAction, type ActualizarPerfilState } from "./actions";

const initial: ActualizarPerfilState = undefined;

export function PerfilForm({
  celular,
  playerNumber,
}: {
  celular: string;
  playerNumber: string | null;
}) {
  const [state, action, pending] = useActionState(
    actualizarPerfilAction,
    initial,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="sect-label mb-1 block">Celular</span>
        <input
          name="celular"
          type="tel"
          inputMode="tel"
          defaultValue={celular}
          required
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
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
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
