"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  agregarWalkinAction,
  buscarPersonasAction,
  type PersonaBusqueda,
} from "./actions";
import { isCleanText } from "@/lib/sanitize-text";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "@/app/_components/error-banner";

export type PreciosEntrada = {
  entrada_byop: number;
  entrada_socio: number;
  alquiler_marcadora: number;
};

export type Tipo = "socio" | "byop" | "alquiler";
export type Pago = "efectivo" | "transferencia" | "debe";

/** Payload que el form le pasa a CheckinList para insertar la fila optimista. */
export type WalkinAdded = {
  id: string;
  nombre: string;
  dni: string;
  tipo: Tipo;
  pago: Pago;
  socio: boolean;
};

const PAGO_OPTS: { value: Pago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transfer." },
  { value: "debe", label: "Debe" },
];

function ars(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

export function AgregarWalkin({
  partidaId,
  precios,
  onAdded,
}: {
  partidaId: string;
  precios: PreciosEntrada;
  onAdded: (data: WalkinAdded) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [personaSel, setPersonaSel] = useState<PersonaBusqueda | null>(null);
  const [busq, setBusq] = useState("");
  const [resultados, setResultados] = useState<PersonaBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [tipo, setTipo] = useState<Tipo>("byop");
  const [pago, setPago] = useState<Pago>("efectivo");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pending, startTransition] = useTransition();

  // Búsqueda de cuentas con debounce.
  useEffect(() => {
    const q = busq.trim();
    if (personaSel || q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      const res = await buscarPersonasAction(q);
      setResultados(res.personas);
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [busq, personaSel]);

  const socio = personaSel ? personaSel.socio : tipo === "socio";
  const esAlquiler = tipo === "alquiler";
  const total =
    (socio ? precios.entrada_socio : precios.entrada_byop) +
    (esAlquiler ? precios.alquiler_marcadora : 0);
  const requierePago = total > 0;

  const dniValido = dni.trim() === "" || /^\d{7,8}$/.test(dni.trim());
  const nombreLimpio = isCleanText(nombre.trim());
  const puedeAgregar = personaSel
    ? !pending
    : nombre.trim().length >= 2 && nombreLimpio && dniValido && !pending;

  const tipoOpts: { value: Tipo; label: string }[] = personaSel
    ? [
        { value: "byop", label: "BYOP" },
        { value: "alquiler", label: "Alquiler" },
      ]
    : [
        { value: "socio", label: "Socio" },
        { value: "byop", label: "BYOP" },
        { value: "alquiler", label: "Alquiler" },
      ];

  const reset = () => {
    setPersonaSel(null);
    setBusq("");
    setResultados([]);
    setNombre("");
    setDni("");
    setTipo("byop");
    setPago("efectivo");
    setError(null);
  };

  const seleccionar = (p: PersonaBusqueda) => {
    setPersonaSel(p);
    setBusq("");
    setResultados([]);
    setTipo("byop");
    setError(null);
  };

  const agregar = () => {
    setError(null);
    if (!personaSel) {
      if (nombre.trim().length < 2) {
        setError({ titulo: "Nombre muy corto (mínimo 2)", mostrarSoporte: false });
        return;
      }
      if (!nombreLimpio) {
        setError({ titulo: "Nombre con contenido no permitido", mostrarSoporte: false });
        return;
      }
      if (!dniValido) {
        setError({ titulo: "DNI inválido (7-8 dígitos)", mostrarSoporte: false });
        return;
      }
    }
    startTransition(async () => {
      const res = await agregarWalkinAction(
        personaSel
          ? { partidaId, userId: personaSel.id, tipo, pago_estado: pago }
          : {
              partidaId,
              nombre: nombre.trim(),
              dni: dni.trim() || undefined,
              tipo,
              pago_estado: pago,
            },
      );
      if ("error" in res && res.error) {
        setError(res.error);
      } else if ("ok" in res && res.ok) {
        onAdded({
          id: res.inscripcionId,
          nombre: personaSel
            ? `${personaSel.nombre} ${personaSel.apellido}`.trim()
            : nombre.trim(),
          dni: personaSel ? personaSel.dni : dni.trim(),
          tipo,
          pago,
          socio,
        });
        reset();
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 w-full sm:w-auto btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
      >
        + Agregar jugador
      </button>
    );
  }

  return (
    <div className="mb-6 border border-orange/40 bg-orange/5 clip-notch p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="sect-label mb-1 text-orange">// Agregar jugador</p>
          <p className="font-mono fluid-xs text-smoke">
            Buscá una cuenta existente o cargalo a mano. Queda presente al toque.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-smoke hover:text-bone font-mono text-2xl leading-none cursor-pointer pl-3"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {personaSel ? (
          <div className="flex items-center justify-between gap-3 border border-orange/50 bg-orange/10 clip-notch px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-mono fluid-sm text-bone truncate">
                {personaSel.nombre} {personaSel.apellido}
                {personaSel.socio && (
                  <span className="ml-2 px-1.5 py-0.5 bg-orange text-ink font-mono text-[10px] uppercase tracking-[.15em]">
                    Socio
                  </span>
                )}
              </p>
              <p className="font-mono fluid-xs text-smoke truncate">
                DNI {personaSel.dni}
                {personaSel.player_number ? ` · #${personaSel.player_number}` : ""}
                {personaSel.celular ? ` · ${personaSel.celular}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPersonaSel(null)}
              className="shrink-0 font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange cursor-pointer"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block relative">
              <span className="sect-label mb-1 block">Buscar cuenta</span>
              <input
                value={busq}
                onChange={(e) => setBusq(e.target.value)}
                placeholder="Nombre, DNI o nº de jugador…"
                className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
              />
              {(buscando || resultados.length > 0) && busq.trim().length >= 2 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-carbon border border-rail/60 clip-notch max-h-64 overflow-y-auto">
                  {buscando && !resultados.length ? (
                    <p className="px-3 py-2 font-mono fluid-xs text-smoke">Buscando…</p>
                  ) : !resultados.length ? (
                    <p className="px-3 py-2 font-mono fluid-xs text-smoke">
                      Sin resultados — cargalo a mano abajo.
                    </p>
                  ) : (
                    resultados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => seleccionar(p)}
                        className="block w-full text-left px-3 py-2 hover:bg-orange/10 border-b border-rail/30 last:border-0 cursor-pointer"
                      >
                        <span className="font-mono fluid-xs text-bone">
                          {p.nombre} {p.apellido}
                          {p.socio && <span className="text-orange"> · socio</span>}
                        </span>
                        <span className="block font-mono text-[10px] text-smoke">
                          DNI {p.dni}
                          {p.player_number ? ` · #${p.player_number}` : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-rail/40" />
              <span className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
                o cargá a mano
              </span>
              <div className="h-px flex-1 bg-rail/40" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="sect-label mb-1 block">Nombre completo</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={60}
                  placeholder="Nombre y apellido"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregar();
                    }
                  }}
                  className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
                />
              </label>
              <label className="block">
                <span className="sect-label mb-1 block">DNI (opcional)</span>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  placeholder="Sin puntos"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregar();
                    }
                  }}
                  className={`w-full bg-ink border px-3 py-2 font-mono text-bone focus:border-orange outline-none ${
                    dni && !dniValido ? "border-orange-300" : "border-rail/60"
                  }`}
                />
              </label>
            </div>
          </div>
        )}

        <div>
          <span className="sect-label mb-1 block">Tipo</span>
          <div className="flex gap-1.5 flex-wrap">
            {tipoOpts.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTipo(o.value)}
                className={`px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.15em] border transition cursor-pointer ${
                  tipo === o.value
                    ? "bg-orange text-ink border-orange"
                    : "border-rail/60 text-ash hover:border-orange"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {personaSel && (
            <p className="mt-1 font-mono fluid-xs text-smoke">
              Socio se toma de la cuenta.
            </p>
          )}
        </div>

        {requierePago ? (
          <div>
            <span className="sect-label mb-1 block">Medio de pago</span>
            <div className="flex gap-1.5 flex-wrap">
              {PAGO_OPTS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPago(o.value)}
                  className={`px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.15em] border transition cursor-pointer ${
                    pago === o.value
                      ? "bg-orange text-ink border-orange"
                      : "border-rail/60 text-ash hover:border-orange"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="font-mono fluid-xs text-smoke">
            Entra sin cargo (se registra como pago de socio).
          </p>
        )}

        <ErrorBanner error={error} variant="inline" />

        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <p className="font-mono fluid-sm text-bone">
            Total: <span className="text-orange">{ars(total)}</span>
          </p>
          <button
            type="button"
            onClick={agregar}
            disabled={!puedeAgregar}
            className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Agregando..." : "Agregar y marcar presente"}
          </button>
        </div>
      </div>
    </div>
  );
}
