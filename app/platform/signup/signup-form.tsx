"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "../actions/auth";

const initial: SignupState = undefined;

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" name="nombre" error={state?.errors?.nombre} />
        <Field label="Apellido" name="apellido" error={state?.errors?.apellido} />
      </div>
      <Field label="DNI" name="dni" inputMode="numeric" error={state?.errors?.dni} />
      <Field label="Celular" name="celular" inputMode="tel" error={state?.errors?.celular} />
      <Field label="Email" name="email" type="email" error={state?.errors?.email} />
      <Field label="Contraseña" name="password" type="password" error={state?.errors?.password} />

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  inputMode,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: "numeric" | "tel";
  error?: string[];
}) {
  return (
    <label className="block">
      <span className="sect-label mb-1 block">{label}</span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        required
        className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
      />
      {error?.[0] && <span className="mt-1 block font-mono fluid-xs text-orange-300">{error[0]}</span>}
    </label>
  );
}
