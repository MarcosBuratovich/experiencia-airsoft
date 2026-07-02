"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrecioAction } from "./actions";
import type { PreciosKey } from "@/lib/precios";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Item = {
  key: PreciosKey;
  efectivo: number;
  transferencia: number;
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
  const [efectivo, setEfectivo] = useState<string>(String(item.efectivo));
  const [transferencia, setTransferencia] = useState<string>(String(item.transferencia));
  const [error, setError] = useState<FriendlyError | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const numEf = Number(efectivo);
  const numTr = Number(transferencia);
  const validoEf = efectivo !== "" && !Number.isNaN(numEf) && numEf >= 0 && Number.isInteger(numEf);
  const validoTr = transferencia !== "" && !Number.isNaN(numTr) && numTr >= 0 && Number.isInteger(numTr);
  const invalid = !validoEf || !validoTr;
  const dirty =
    (validoEf && numEf !== item.efectivo) || (validoTr && numTr !== item.transferencia);

  function onSave() {
    if (invalid) {
      setError({ titulo: "Ingresá números enteros ≥ 0 en ambos", mostrarSoporte: false });
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updatePrecioAction({
        key: item.key,
        valor_efectivo: numEf,
        valor_transferencia: numTr,
      });
      if ("error" in res) {
        setError(
          typeof res.error === "string" ? { titulo: res.error, mostrarSoporte: false } : res.error,
        );
      } else {
        setSavedAt(new Date());
        router.refresh();
      }
    });
  }

  return (
    <div className="border border-rail/60 bg-carbon clip-notch p-4 md:p-5 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-bone font-display uppercase tracking-wider">{item.titulo}</p>
          <p className="font-mono fluid-xs text-smoke mt-1">{item.descripcion}</p>
          <p className="font-mono fluid-xs text-smoke mt-1">
            Actualizado: {formatFecha(item.updated_at)} · efectivo {formatARS(item.efectivo)} · transf{" "}
            {formatARS(item.transferencia)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <MoneyInput label="Efectivo" value={efectivo} onChange={setEfectivo} invalid={!validoEf} />
          <MoneyInput
            label="Transferencia"
            value={transferencia}
            onChange={setTransferencia}
            invalid={!validoTr}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || invalid || pending}
            className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer self-end"
          >
            {pending ? "..." : "Guardar"}
          </button>
        </div>
      </div>
      <ErrorBanner error={error} variant="inline" />
      {savedAt && !error && !pending && !dirty && (
        <p className="font-mono fluid-xs text-green-400">Guardado</p>
      )}
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <label className="block">
      <span className="sect-label mb-1 block">{label}</span>
      <div
        className={`flex items-center border bg-ink/40 px-2 ${
          invalid ? "border-orange-300" : "border-rail/60"
        }`}
      >
        <span className="font-mono fluid-xs text-smoke mr-1">$</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 bg-transparent py-2 font-mono text-bone focus:outline-none text-right"
        />
      </div>
    </label>
  );
}
