"use client";

import { useActionState } from "react";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "../../actions/auth";
import { ErrorBanner } from "../../../_components/error-banner";

const initial: ForgotPasswordState = undefined;

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    initial,
  );

  if (state && "ok" in state && state.ok) {
    return (
      <div className="border border-orange/50 bg-orange/10 px-4 py-5 clip-tag">
        <p className="sect-label mb-2 text-orange">Listo</p>
        <p className="text-bone fluid-sm leading-relaxed">{state.mensaje}</p>
        <p className="mt-4 font-mono fluid-xs text-smoke">
          Si no llega en 5 minutos, revisá la carpeta de spam o pedí otro.
        </p>
      </div>
    );
  }

  const formErrors = state && "formErrors" in state ? state.formErrors : undefined;
  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={action} className="space-y-4">
      <ErrorBanner error={error} />

      <label className="block">
        <span className="sect-label mb-1 block">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
        {formErrors?.email?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {formErrors.email[0]}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Enviando..." : "Enviar link de recuperación"}
      </button>
    </form>
  );
}
