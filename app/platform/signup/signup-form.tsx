"use client";

import { useActionState, useState } from "react";
import { signupAction, type SignupState } from "../actions/auth";
import { PhoneInput } from "../components/phone-input";

const initial: SignupState = undefined;

type PasswordChecks = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const checks = checkPassword(password);
  const passwordValid =
    checks.length && checks.uppercase && checks.lowercase && checks.number;
  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" name="nombre" error={state?.errors?.nombre} />
        <Field label="Apellido" name="apellido" error={state?.errors?.apellido} />
      </div>
      <Field label="DNI" name="dni" inputMode="numeric" error={state?.errors?.dni} />

      <label className="block">
        <span className="sect-label mb-1 block">Celular</span>
        <PhoneInput name="celular" required />
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Elegí tu país y escribí el número sin código (ej. 11 1234 5678).
          Lo formateamos automático.
        </span>
        {state?.errors?.celular?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.celular[0]}
          </span>
        )}
      </label>

      <Field label="Email" name="email" type="email" error={state?.errors?.email} />

      <label className="block">
        <span className="sect-label mb-1 block">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
        />
        {/* Checklist en vivo */}
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono fluid-xs">
          <PwCheck ok={checks.length} label="Mínimo 8 caracteres" />
          <PwCheck ok={checks.uppercase} label="Una mayúscula" />
          <PwCheck ok={checks.lowercase} label="Una minúscula" />
          <PwCheck ok={checks.number} label="Un número" />
        </ul>
        {state?.errors?.password?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.password[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Repetí la contraseña</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full bg-carbon border px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition ${
            confirmMismatch ? "border-orange-300" : "border-rail/60"
          }`}
        />
        {confirmMismatch && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            Las contraseñas no coinciden
          </span>
        )}
        {state?.errors?.confirmPassword?.[0] && !confirmMismatch && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.confirmPassword[0]}
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
          required
          placeholder="6 dígitos"
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-mono tracking-[.2em] text-bone focus:border-orange outline-none transition"
        />
        <span className="mt-1 block font-mono fluid-xs text-smoke">
          Es tu identificador en cancha. Único, no se puede repetir. Elegí algo memorable.
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

      <button
        type="submit"
        disabled={pending || !passwordValid || confirmMismatch || confirmPassword.length === 0}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}

function PwCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 ${
        ok ? "text-green-400" : "text-smoke"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "·"}</span>
      <span>{label}</span>
    </li>
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
