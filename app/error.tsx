"use client";

import { useEffect } from "react";
import Link from "next/link";
import { friendlyError } from "@/lib/errors";
import {
  SOPORTE_WHATSAPP_NUMBER,
  SOPORTE_WHATSAPP_URL,
} from "./_components/site-constants";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx]", error);
  }, [error]);

  const f = friendlyError(error);

  return (
    <div className="min-h-dvh bg-ink text-bone flex flex-col items-center justify-center fluid-gutter-x py-16">
      <div className="max-w-xl w-full text-center">
        <p className="sect-label text-orange mb-3">// Error</p>
        <h1 className="font-display fluid-4xl uppercase text-bone leading-[.9] tracking-wider">
          {f.titulo}
        </h1>

        {f.detalle && (
          <p className="mt-6 text-ash fluid-base leading-relaxed">
            {f.detalle}
          </p>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-wa clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase font-semibold text-ink cursor-pointer"
          >
            Reintentar
            <span aria-hidden>↻</span>
          </button>
          <Link
            href="/"
            className="btn-ghost clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase"
          >
            Ir al inicio
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-bone/10">
          <p className="sect-label mb-3">// ¿Sigue pasando?</p>
          <a
            href={SOPORTE_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-orange hover:text-bone underline font-mono fluid-sm uppercase tracking-[.18em]"
          >
            Escribime por WhatsApp {SOPORTE_WHATSAPP_NUMBER} →
          </a>
          {error.digest && (
            <p className="mt-3 font-mono fluid-xs text-smoke">
              Código de error: {error.digest}
            </p>
          )}
          {f.codigo && !error.digest && (
            <p className="mt-3 font-mono fluid-xs text-smoke">
              Código: {f.codigo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
