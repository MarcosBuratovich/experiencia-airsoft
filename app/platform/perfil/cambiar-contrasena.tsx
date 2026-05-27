"use client";

import { useActionState, useState } from "react";
import {
  cambiarContrasenaAction,
  type CambiarContrasenaState,
} from "./actions";
import { ErrorBanner } from "../../_components/error-banner";

const initial: CambiarContrasenaState = undefined;

type PwChecks = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
};

function checkPassword(pw: string): PwChecks {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

export function CambiarContrasenaSection() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    cambiarContrasenaAction,
    initial,
  );
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const checks = checkPassword(newPw);
  const pwValid =
    checks.length && checks.uppercase && checks.lowercase && checks.number;
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;

  const formErrors = state && "formErrors" in state ? state.formErrors : undefined;
  const error = state && "error" in state ? state.error : undefined;

  // Cuando el server confirma ok, colapsamos el form.
  if ((state && "ok" in state && state.ok) && open) {
    setOpen(false);
    setNewPw("");
    setConfirmPw("");
  }

  return (
    <section className="mt-10 pt-6 border-t border-rail/40">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="sect-label">// Contraseña</p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
          >
            Cambiar contraseña
          </button>
        )}
      </div>

      {(state && "ok" in state && state.ok) && !open && (
        <p className="font-mono fluid-xs text-green-400 uppercase tracking-[.25em]">
          ✓ Contraseña actualizada
        </p>
      )}

      {open && (
        <form
          action={action}
          className="border border-rail/60 bg-carbon clip-notch p-4 sm:p-5 space-y-4"
        >
          <label className="block">
            <span className="sect-label mb-1 block">Contraseña actual</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="w-full bg-ink border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
            />
            {formErrors?.currentPassword?.[0] && (
              <span className="mt-1 block font-mono fluid-xs text-orange-300">
                {formErrors!.currentPassword[0]}
              </span>
            )}
          </label>

          <label className="block">
            <span className="sect-label mb-1 block">Nueva contraseña</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full bg-ink border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
            />
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono fluid-xs">
              <PwCheck ok={checks.length} label="Mínimo 8 caracteres" />
              <PwCheck ok={checks.uppercase} label="Una mayúscula" />
              <PwCheck ok={checks.lowercase} label="Una minúscula" />
              <PwCheck ok={checks.number} label="Un número" />
            </ul>
            {formErrors?.newPassword?.[0] && (
              <span className="mt-1 block font-mono fluid-xs text-orange-300">
                {formErrors!.newPassword[0]}
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
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`w-full bg-ink border px-3 py-2.5 text-bone focus:border-orange outline-none transition ${
                mismatch ? "border-orange-300" : "border-rail/60"
              }`}
            />
            {mismatch && (
              <span className="mt-1 block font-mono fluid-xs text-orange-300">
                Las contraseñas no coinciden
              </span>
            )}
            {formErrors?.confirmPassword?.[0] && !mismatch && (
              <span className="mt-1 block font-mono fluid-xs text-orange-300">
                {formErrors!.confirmPassword[0]}
              </span>
            )}
          </label>

          <ErrorBanner error={error} />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNewPw("");
                setConfirmPw("");
              }}
              className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-bone cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                pending || !pwValid || mismatch || confirmPw.length === 0
              }
              className="btn-wa px-5 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </section>
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
