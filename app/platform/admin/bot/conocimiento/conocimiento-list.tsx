"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "@/app/_components/error-banner";
import {
  alternarActivaAction,
  borrarEntradaAction,
  guardarEntradaAction,
  type ResultadoAccion,
} from "./actions";

export type FilaConocimiento = {
  id: string;
  titulo: string;
  contenido: string;
  activo: boolean;
  orden: number;
};

const VACIA = { titulo: "", contenido: "" };

export function ConocimientoList({ entradas }: { entradas: FilaConocimiento[] }) {
  const [error, setError] = useState<FriendlyError | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nueva, setNueva] = useState(VACIA);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const correr = (id: string, fn: () => Promise<ResultadoAccion>) => {
    setPendiente(id);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else {
        setEditando(null);
        router.refresh();
      }
      setPendiente(null);
    });
  };

  const guardar = (id: string | null, form: HTMLFormElement) => {
    const datos = new FormData(form);
    correr(id ?? "nueva", async () => {
      const res = await guardarEntradaAction({
        id,
        titulo: String(datos.get("titulo") ?? ""),
        contenido: String(datos.get("contenido") ?? ""),
        orden: Number(datos.get("orden") ?? 0),
      });
      if ("ok" in res && id === null) setNueva(VACIA);
      return res;
    });
  };

  return (
    <div className="space-y-5">
      <ErrorBanner error={error} />

      {!entradas.length && (
        <div className="border border-rail/60 bg-carbon clip-notch p-4">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
            Todavía no hay nada cargado.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {entradas.map((e) => (
          <li
            key={e.id}
            className={`border border-rail/60 bg-carbon clip-notch p-4 ${
              e.activo ? "" : "opacity-50"
            }`}
          >
            {editando === e.id ? (
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  guardar(e.id, ev.currentTarget);
                }}
                className="space-y-3"
              >
                <input
                  name="titulo"
                  defaultValue={e.titulo}
                  maxLength={120}
                  className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
                />
                <textarea
                  name="contenido"
                  defaultValue={e.contenido}
                  maxLength={4000}
                  rows={4}
                  className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone font-sans fluid-sm focus:border-orange outline-none"
                />
                <div className="flex items-center gap-3">
                  <label className="font-mono fluid-xs text-smoke uppercase tracking-[.18em]">
                    Orden
                    <input
                      name="orden"
                      type="number"
                      defaultValue={e.orden}
                      min={0}
                      max={999}
                      className="ml-2 w-20 bg-ink border border-rail/60 px-2 py-1 text-bone"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={pendiente === e.id}
                    className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[240px]">
                  <p className="font-display fluid-base uppercase text-bone">
                    {e.titulo}
                  </p>
                  <p className="font-sans fluid-sm text-ash mt-1 whitespace-pre-wrap">
                    {e.contenido}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditando(e.id)}
                    className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pendiente === e.id}
                    onClick={() =>
                      correr(e.id, () => alternarActivaAction(e.id, !e.activo))
                    }
                    className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange cursor-pointer disabled:opacity-50"
                  >
                    {e.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente === e.id}
                    onClick={() => {
                      if (!confirm(`¿Borrar "${e.titulo}"?`)) return;
                      correr(e.id, () => borrarEntradaAction(e.id));
                    }}
                    className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange-300 cursor-pointer disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          guardar(null, ev.currentTarget);
        }}
        className="border border-rail/60 bg-carbon clip-notch p-4 space-y-3"
      >
        <p className="sect-label">// Agregar una respuesta</p>
        <input
          name="titulo"
          placeholder="¿Se puede pagar con tarjeta?"
          value={nueva.titulo}
          onChange={(ev) => setNueva({ ...nueva, titulo: ev.target.value })}
          maxLength={120}
          className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
        />
        <textarea
          name="contenido"
          placeholder="Escribilo como se lo dirías a un cliente por mensaje."
          rows={3}
          value={nueva.contenido}
          onChange={(ev) => setNueva({ ...nueva, contenido: ev.target.value })}
          maxLength={4000}
          className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone font-sans fluid-sm focus:border-orange outline-none"
        />
        {/* orden va al final de la lista: no lo elige el admin a mano */}
        <input name="orden" type="hidden" value={entradas.length} readOnly />
        <button
          type="submit"
          disabled={
            pendiente === "nueva" || !nueva.titulo.trim() || !nueva.contenido.trim()
          }
          className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 cursor-pointer"
        >
          Agregar
        </button>
      </form>
    </div>
  );
}
