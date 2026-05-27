"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGuestAction, quitarInscripcionAction } from "./organizador-actions";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Inscripcion = {
  id: string;
  nombre: string;
  esGuest: boolean;
  estado: string;
};

export function OrganizadorPanel({
  partidaId,
  shareUrl,
  inscripciones,
}: {
  partidaId: string;
  shareUrl: string;
  inscripciones: Inscripcion[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  const agregar = () => {
    setError(null);
    const v = nombre.trim();
    if (v.length < 2) {
      setError({ titulo: "Mínimo 2 caracteres", mostrarSoporte: false });
      return;
    }
    startTransition(async () => {
      const res = await addGuestAction({ partidaId, nombre: v });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setNombre("");
        router.refresh();
      }
    });
  };

  const quitar = (inscripcionId: string) => {
    if (!confirm("¿Quitar esta inscripción?")) return;
    setRemovingId(inscripcionId);
    setError(null);
    startDelete(async () => {
      const res = await quitarInscripcionAction({ inscripcionId });
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
      setRemovingId(null);
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="mb-6 border border-orange/40 bg-orange/5 clip-notch p-4 sm:p-5">
      <p className="sect-label mb-2 text-orange">// Sos el organizador</p>
      <h2 className="font-display fluid-xl uppercase tracking-wider text-bone mb-4">
        Roster privado
      </h2>

      <div className="mb-5">
        <p className="sect-label mb-2">Link para invitar</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 bg-ink border border-rail/60 px-3 py-2 font-mono fluid-xs text-bone focus:border-orange outline-none"
          />
          <button
            type="button"
            onClick={copyLink}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer shrink-0"
          >
            {copied ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
        <p className="mt-2 font-mono fluid-xs text-smoke">
          Pasale este link a los que tengan cuenta en la app — pueden anotarse
          solos desde ahí.
        </p>
      </div>

      <div className="mb-5">
        <p className="sect-label mb-2">Agregar guest a mano</p>
        <div className="flex items-stretch gap-2 flex-wrap">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={60}
            placeholder="Nombre del invitado"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            className="flex-1 min-w-[200px] bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
          />
          <button
            type="button"
            onClick={agregar}
            disabled={pending || nombre.trim().length < 2}
            className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "..." : "Agregar"}
          </button>
        </div>
        <p className="mt-2 font-mono fluid-xs text-smoke">
          Para gente que viene pero no tiene cuenta. Suma al cupo igual.
        </p>
      </div>

      <ErrorBanner error={error} variant="inline" className="mb-4" />

      <div>
        <p className="sect-label mb-2">Inscriptos ({inscripciones.length})</p>
        {!inscripciones.length ? (
          <p className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
            Nadie anotado todavía.
          </p>
        ) : (
          <ul className="space-y-1">
            {inscripciones.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-2 py-1.5 border-b border-rail/30"
              >
                <span className="font-mono fluid-xs uppercase tracking-[.18em] text-bone flex-1 min-w-0 truncate">
                  {i.nombre}
                </span>
                {i.esGuest && (
                  <span className="px-1.5 py-0.5 border border-rail/60 text-smoke font-mono fluid-xs uppercase tracking-[.15em] shrink-0">
                    Guest
                  </span>
                )}
                {i.estado === "waitlist" && (
                  <span className="px-1.5 py-0.5 border border-orange-300/40 text-orange-300 font-mono fluid-xs uppercase tracking-[.15em] shrink-0">
                    Espera
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => quitar(i.id)}
                  disabled={deletePending && removingId === i.id}
                  className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange-300 cursor-pointer disabled:opacity-50 shrink-0"
                  aria-label="Quitar"
                >
                  {deletePending && removingId === i.id ? "..." : "Quitar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
