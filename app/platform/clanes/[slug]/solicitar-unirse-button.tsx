"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { solicitarUnirseAction } from "../actions";

export function SolicitarUnirseButton({ clanId }: { clanId: string }) {
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await solicitarUnirseAction(clanId, mensaje);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-3">
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        rows={2}
        maxLength={200}
        placeholder="Mensaje para el capitán (opcional)"
        className="w-full bg-carbon border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none transition resize-y"
      />
      {error && (
        <p className="font-mono fluid-xs text-orange-300">{error}</p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn-wa px-6 py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "..." : "Solicitar unirme"}
      </button>
    </div>
  );
}
