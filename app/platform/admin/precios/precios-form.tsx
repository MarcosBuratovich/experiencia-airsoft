"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrecioAction } from "./actions";
import type { PreciosKey } from "@/lib/precios";

type Item = {
  key: PreciosKey;
  valor: number;
  updated_at: string | null;
  titulo: string;
  descripcion: string;
};

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function PreciosForm({ items }: { items: Item[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PrecioRow key={item.key} item={item} />
      ))}
    </div>
  );
}

function PrecioRow({ item }: { item: Item }) {
  const [valor, setValor] = useState<string>(String(item.valor));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const num = Number(valor);
  const dirty = !Number.isNaN(num) && num !== item.valor;
  const invalid = valor === "" || Number.isNaN(num) || num < 0 || !Number.isInteger(num);

  function onSave() {
    if (invalid) {
      setError("Ingresá un número entero ≥ 0");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updatePrecioAction({ key: item.key, valor: num });
      if ("error" in res) {
        setError(res.error);
      } else {
        setSavedAt(new Date());
        router.refresh();
      }
    });
  }

  return (
    <div className="border border-rail/60 bg-carbon clip-notch p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-bone font-display uppercase tracking-wider">{item.titulo}</p>
        <p className="font-mono fluid-xs text-smoke mt-1">{item.descripcion}</p>
        <p className="font-mono fluid-xs text-smoke mt-1">
          Actualizado: {formatFecha(item.updated_at)} · actual {formatARS(item.valor)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-rail/60 bg-ink/40 px-2">
          <span className="font-mono fluid-xs text-smoke mr-1">$</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-28 bg-transparent py-2 font-mono text-bone focus:outline-none text-right"
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || invalid || pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "..." : "Guardar"}
        </button>
      </div>
      {error && (
        <p className="md:ml-3 font-mono fluid-xs text-orange-300">{error}</p>
      )}
      {savedAt && !error && !pending && !dirty && (
        <p className="md:ml-3 font-mono fluid-xs text-green-400">Guardado</p>
      )}
    </div>
  );
}
