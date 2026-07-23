"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agregarMiAlquilerAction,
  quitarInscripcionAction,
} from "./organizador-actions";
import { track } from "@/lib/ga";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Alquiler = { id: string; nombre: string; estado: string };

export function MisAlquileresPanel({
  partidaId,
  alquileres,
}: {
  partidaId: string;
  alquileres: Alquiler[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [delPending, startDelete] = useTransition();

  const dniValido = /^\d{7,8}$/.test(dni.trim());

  const agregar = () => {
    const v = nombre.trim();
    if (v.length < 2) {
      setError({ titulo: "Mínimo 2 caracteres", mostrarSoporte: false });
      return;
    }
    if (!dniValido) {
      setError({ titulo: "DNI inválido (7-8 dígitos)", mostrarSoporte: false });
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await agregarMiAlquilerAction({ partidaId, nombre: v, dni: dni.trim() });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        // Cada invitado agregado es un jugador pago extra (alquiler en cancha).
        track("agregar_alquiler_invitado", { partida_id: partidaId });
        setNombre("");
        setDni("");
        router.refresh();
      }
    });
  };

  const quitar = (id: string) => {
    if (!confirm("¿Quitar este alquiler?")) return;
    setRemovingId(id);
    setError(null);
    startDelete(async () => {
      const res = await quitarInscripcionAction({ inscripcionId: id });
      if ("error" in res && res.error) setError(res.error);
      else {
        track("quitar_alquiler_invitado", { partida_id: partidaId });
        router.refresh();
      }
      setRemovingId(null);
    });
  };

  return (
    <section className="mb-6 border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
      <p className="sect-label mb-2">// Tus alquileres</p>
      <h2 className="font-display fluid-lg uppercase tracking-wider text-bone mb-3">
        Gente que viene con vos
      </h2>
      <p className="font-mono fluid-xs text-smoke mb-4">
        Agregá amigos que vienen pero no tienen cuenta — nombre completo y DNI
        (obligatorio en el ingreso). Cada uno ocupa un lugar en el cupo y se les
        cobra como alquiler cuando llegan.
      </p>

      <div className="flex items-stretch gap-2 flex-wrap mb-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={60}
          placeholder="Nombre completo"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          className="flex-1 min-w-[200px] bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
        />
        <input
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          placeholder="DNI"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          className="w-full sm:w-32 bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
        />
        <button
          type="button"
          onClick={agregar}
          disabled={pending || nombre.trim().length < 2 || !dniValido}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "..." : "Agregar"}
        </button>
      </div>

      <ErrorBanner error={error} variant="inline" className="mb-3" />

      {alquileres.length > 0 ? (
        <ul className="space-y-1">
          {alquileres.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 py-1.5 border-b border-rail/30"
            >
              <span className="font-mono fluid-xs uppercase tracking-[.18em] text-bone flex-1 min-w-0 truncate">
                {a.nombre}
              </span>
              {a.estado === "waitlist" && (
                <span className="px-1.5 py-0.5 border border-orange-300/40 text-orange-300 font-mono fluid-xs uppercase tracking-[.15em] shrink-0">
                  Espera
                </span>
              )}
              <button
                type="button"
                onClick={() => quitar(a.id)}
                disabled={delPending && removingId === a.id}
                className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange-300 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {delPending && removingId === a.id ? "..." : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
          Todavía no agregaste a nadie.
        </p>
      )}
    </section>
  );
}
