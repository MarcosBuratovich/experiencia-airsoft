"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "../../actions/auth";

const initial: ResetPasswordState = undefined;

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="sect-label mb-1 block">Nueva contraseña</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
        {state?.errors?.password?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.password[0]}
          </span>
        )}
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Mínimo 8 caracteres, al menos una letra y un número.
        </span>
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Repetir contraseña</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
        {state?.errors?.confirmPassword?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.confirmPassword[0]}
          </span>
        )}
      </label>

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
