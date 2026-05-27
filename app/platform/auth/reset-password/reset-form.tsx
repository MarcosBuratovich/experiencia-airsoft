"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "../../actions/auth";
import { ErrorBanner } from "../../../_components/error-banner";

const initial: ResetPasswordState = undefined;

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const formErrors = state && "formErrors" in state ? state.formErrors : undefined;
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={action} className="space-y-4">
      <ErrorBanner error={error} />

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
        {formErrors?.password?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors.password[0]}
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
        {formErrors?.confirmPassword?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors.confirmPassword[0]}
          </span>
        )}
      </label>

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
