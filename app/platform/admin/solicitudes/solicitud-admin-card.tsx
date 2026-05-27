"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprobarPrivadaAction, rechazarPrivadaAction } from "../../privada/actions";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Props = {
  solicitud: {
    id: string;
    estado: string;
    fecha: string;
    hora: string;
    modalidad: string;
    duracion: number;
    cupo: number;
    notas: string | null;
    respuesta: string | null;
    created_at: string;
    resolved_at: string | null;
    partidaId: string | null;
    privadaToken: string | null;
    user: { nombre: string; celular: string; email: string };
  };
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-orange text-ink",
  aprobada: "bg-green-500 text-ink",
  rechazada: "bg-red-500 text-bone",
  cancelada: "bg-smoke/40 text-ash",
};

export function SolicitudAdminCard({ solicitud: s }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<FriendlyError | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarForm, setMostrarForm] = useState<"aprobar" | "rechazar" | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const shareUrl =
    s.partidaId && typeof window !== "undefined"
      ? `${window.location.origin}/partidas/${s.partidaId}`
      : null;

  const aprobar = () => {
    setError(null);
    startTransition(async () => {
      const res = await aprobarPrivadaAction(s.id, respuesta);
      if ("error" in res && res.error) setError(res.error);
      else {
        setMostrarForm(null);
        setRespuesta("");
        router.refresh();
      }
    });
  };

  const rechazar = () => {
    setError(null);
    startTransition(async () => {
      const res = await rechazarPrivadaAction(s.id, respuesta);
      if ("error" in res && res.error) setError(res.error);
      else {
        setMostrarForm(null);
        setRespuesta("");
        router.refresh();
      }
    });
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
      <p className="font-mono fluid-xs text-ash mt-1">
        Solicita: <span className="text-bone">{s.user.nombre}</span>
        {s.user.celular && <> · {s.user.celular}</>}
        {s.user.email && <> · {s.user.email}</>}
      </p>

      {s.notas && (
        <p className="mt-3 pt-3 border-t border-rail/40 font-sans fluid-sm text-ash whitespace-pre-wrap">
          {s.notas}
        </p>
      )}

      {s.respuesta && (
        <p className="mt-3 pt-3 border-t border-rail/40 font-mono fluid-xs text-ash italic">
          Tu respuesta: “{s.respuesta}”
        </p>
      )}

      {s.estado === "aprobada" && shareUrl && (
        <div className="mt-3 pt-3 border-t border-rail/40 flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/partidas/${s.partidaId}/checkin`}
            className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs"
          >
            Ir al check-in
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs cursor-pointer"
          >
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
          <span className="font-mono fluid-xs text-smoke truncate max-w-full">{shareUrl}</span>
        </div>
      )}

      {s.estado === "pendiente" && (
        <div className="mt-3 pt-3 border-t border-rail/40">
          {mostrarForm ? (
            <div className="space-y-2">
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder={
                  mostrarForm === "aprobar"
                    ? "Mensaje opcional para el solicitante"
                    : "Motivo del rechazo (recomendado)"
                }
                className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone focus:border-orange outline-none text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={mostrarForm === "aprobar" ? aprobar : rechazar}
                  disabled={pending}
                  className="btn-wa px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {pending
                    ? "..."
                    : mostrarForm === "aprobar"
                      ? "Confirmar aprobación"
                      : "Confirmar rechazo"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarForm(null);
                    setRespuesta("");
                  }}
                  disabled={pending}
                  className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarForm("aprobar")}
                disabled={pending}
                className="btn-wa px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm("rechazar")}
                disabled={pending}
                className="btn-ghost px-3 py-1.5 clip-tag uppercase tracking-wider fluid-xs disabled:opacity-50 cursor-pointer"
              >
                Rechazar
              </button>
            </div>
          )}
          <ErrorBanner error={error} variant="inline" className="mt-2" />
        </div>
      )}
    </li>
  );
}
