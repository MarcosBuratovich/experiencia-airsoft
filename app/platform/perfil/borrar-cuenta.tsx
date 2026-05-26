"use client";

import { useActionState, useState } from "react";
import { borrarCuentaAction, type BorrarCuentaState } from "./actions";

const initial: BorrarCuentaState = undefined;

export function BorrarCuentaSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [state, action, pending] = useActionState(borrarCuentaAction, initial);

  const canSubmit =
    confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="mt-8 pt-6 border-t border-orange-300/40">
      <p className="sect-label text-orange-300 mb-2">// Zona de peligro</p>
      <p className="font-sans fluid-sm text-ash leading-relaxed">
        Borrar tu cuenta elimina <span className="text-bone">todo</span>: tu
        perfil, inscripciones a partidas, pertenencia a clanes, eventos
        cargados a tu nombre, solicitudes y configuración. No se puede
        deshacer.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold border border-orange-300/60 text-orange-300 bg-orange-300/5 hover:bg-orange-300/10 cursor-pointer"
        >
          Borrar mi cuenta
        </button>
      ) : (
        <form
          action={action}
          className="mt-4 border border-orange-300/40 bg-orange-300/5 clip-notch p-4 sm:p-5 space-y-4"
        >
          <p className="font-sans fluid-sm text-bone leading-relaxed">
            Para confirmar, escribí tu email{" "}
            <span className="font-mono text-orange-300">{email}</span> en el
            campo de abajo.
          </p>

          <label className="block">
            <span className="sect-label mb-1 block">Tu email</span>
            <input
              name="confirmEmail"
              type="email"
              autoComplete="off"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              className="w-full bg-ink border border-rail/60 px-3 py-2.5 font-mono text-bone focus:border-orange outline-none transition"
            />
            {state?.errors?.confirmEmail?.[0] && (
              <span className="mt-1 block font-mono fluid-xs text-orange-300">
                {state.errors.confirmEmail[0]}
              </span>
            )}
          </label>

          {state?.message && (
            <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
          )}

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmEmail("");
              }}
              className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-bone cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="px-5 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold bg-orange-300/20 border border-orange-300 text-orange-300 hover:bg-orange-300/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {pending ? "Borrando..." : "Confirmar borrado"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
