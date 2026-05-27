"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelarPrivadaAction } from "../privada/actions";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../_components/error-banner";

type Props = {
  solicitud: {
    id: string;
    fecha: string;
    hora: string;
    modalidad: string;
    cupo: number;
    duracion: number;
    notas: string | null;
    estado: string;
    respuesta: string | null;
    created_at: string;
    resolved_at: string | null;
    partidaId: string | null;
    privadaToken: string | null;
  };
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-orange text-ink",
  aprobada: "bg-green-500 text-ink",
  rechazada: "bg-red-500 text-bone",
  cancelada: "bg-smoke/40 text-ash",
};

export function MiSolicitudRow({ solicitud: s }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<FriendlyError | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const cancelar = () => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelarPrivadaAction(s.id);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const shareUrl =
    s.partidaId && typeof window !== "undefined"
      ? `${window.location.origin}/partidas/${s.partidaId}`
      : null;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback en browsers viejos
    }
  };

  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4">
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span
          className={`px-2 py-0.5 font-mono fluid-xs uppercase tracking-[.15em] ${
            ESTADO_STYLES[s.estado] ?? ""
          }`}
        >
          {s.estado}
        </span>
        <span className="mil-tag">{s.modalidad}</span>
        <span className="ml-auto font-mono fluid-xs text-smoke">
          {s.cupo} jugadores · {s.duracion} min
        </span>
      </div>

      <p className="font-display fluid-lg text-bone uppercase tracking-wider">
        {s.fecha} · {s.hora}
      </p>

      {s.notas && (
        <p className="mt-2 font-sans fluid-sm text-ash whitespace-pre-wrap">{s.notas}</p>
      )}

      {s.respuesta && (
        <p className="mt-3 pt-3 border-t border-rail/40 font-mono fluid-xs text-ash italic">
          Respuesta admin: “{s.respuesta}”
        </p>
      )}

      {s.estado === "aprobada" && shareUrl && (
        <div className="mt-3 pt-3 border-t border-rail/40 flex items-center gap-2 flex-wrap">
          <Link
            href={`/partidas/${s.partidaId}`}
            className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs"
          >
            Ver partida
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs cursor-pointer"
          >
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
          <span className="font-mono fluid-xs text-smoke truncate">{shareUrl}</span>
        </div>
      )}

      {s.estado === "pendiente" && (
        <div className="mt-3 pt-3 border-t border-rail/40">
          <button
            type="button"
            onClick={cancelar}
            disabled={pending}
            className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer disabled:opacity-50"
          >
            {pending ? "..." : "Cancelar solicitud"}
          </button>
          <ErrorBanner error={error} variant="inline" className="mt-1" />
        </div>
      )}
    </li>
  );
}
