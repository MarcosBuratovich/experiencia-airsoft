"use client";

import { useActionState, useState } from "react";
import { signupAction, type SignupState } from "../actions/auth";

const initial: SignupState = undefined;

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [tipo, setTipo] = useState<"alquiler" | "byop">("alquiler");

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

      <fieldset className="space-y-2">
        <legend className="sect-label mb-2 block">¿Cómo vas a jugar?</legend>
        <input type="hidden" name="tipo_jugador" value={tipo} />
        <TipoOption
          value="alquiler"
          current={tipo}
          onChange={setTipo}
          title="Alquiler"
          subtitle="Alquilo el equipo en el local (marcadora, chaleco)."
        />
        <TipoOption
          value="byop"
          current={tipo}
          onChange={setTipo}
          title="BYOP"
          subtitle="Traigo mi propio equipo a la partida."
        />
        {state?.errors?.tipo_jugador?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.tipo_jugador[0]}
          </span>
        )}
      </fieldset>

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

function TipoOption({
  value,
  current,
  onChange,
  title,
  subtitle,
}: {
  value: "alquiler" | "byop";
  current: "alquiler" | "byop";
  onChange: (v: "alquiler" | "byop") => void;
  title: string;
  subtitle: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`w-full text-left px-4 py-3 border transition clip-notch cursor-pointer ${
        active
          ? "bg-carbon border-orange"
          : "bg-ink/40 border-rail/60 hover:border-rail"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block w-3 h-3 rounded-full border-2 transition ${
            active ? "bg-orange border-orange" : "border-rail"
          }`}
          aria-hidden
        />
        <span className="font-display text-bone uppercase tracking-wider">{title}</span>
      </div>
      <p className="mt-1 pl-6 font-mono fluid-xs text-smoke">{subtitle}</p>
    </button>
  );
}
