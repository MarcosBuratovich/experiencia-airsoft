"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions/auth";

const initial: LoginState = undefined;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="sect-label mb-1 block">Email</span>
        <input
          name="email"
          type="email"
          required
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
        {state?.errors?.email?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">{state.errors.email[0]}</span>
        )}
      </label>
      <label className="block">
        <span className="sect-label mb-1 block">Contraseña</span>
        <input
          name="password"
          type="password"
          required
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
        />
        {state?.errors?.password?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">{state.errors.password[0]}</span>
        )}
      </label>

      {state?.message && <p className="font-mono fluid-xs text-orange-300">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
