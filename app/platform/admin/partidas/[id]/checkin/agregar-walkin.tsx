"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarWalkinAction } from "./actions";
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
};

const TIPO_OPTS: { value: Tipo; label: string }[] = [
  { value: "socio", label: "Socio" },
  { value: "byop", label: "BYOP" },
  { value: "alquiler", label: "Alquiler" },
];

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
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [tipo, setTipo] = useState<Tipo>("byop");
  const [pago, setPago] = useState<Pago>("efectivo");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pending, startTransition] = useTransition();

  const dniValido = dni.trim() === "" || /^\d{7,8}$/.test(dni.trim());
  const nombreLimpio = isCleanText(nombre.trim());
  const total =
    tipo === "socio"
      ? precios.entrada_socio
      : tipo === "alquiler"
        ? precios.entrada_byop + precios.alquiler_marcadora
        : precios.entrada_byop;
  const puedeAgregar =
    nombre.trim().length >= 2 && nombreLimpio && dniValido && !pending;

  const reset = () => {
    setNombre("");
    setDni("");
    setTipo("byop");
    setPago("efectivo");
    setError(null);
  };

  const agregar = () => {
    setError(null);
    if (nombre.trim().length < 2) {
      setError({ titulo: "Nombre muy corto (mínimo 2)", mostrarSoporte: false });
      return;
    }
    if (!nombreLimpio) {
      setError({
        titulo: "Nombre con contenido no permitido",
        mostrarSoporte: false,
      });
      return;
    }
    if (!dniValido) {
      setError({ titulo: "DNI inválido (7-8 dígitos)", mostrarSoporte: false });
      return;
    }
    startTransition(async () => {
      const res = await agregarWalkinAction({
        partidaId,
        nombre: nombre.trim(),
        dni: dni.trim() || undefined,
        tipo,
        pago_estado: pago,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else if ("ok" in res && res.ok) {
        // Inserción optimista en la lista (router.refresh no re-inicializa el
        // useState de CheckinList) + refresh para sincronizar el server.
        onAdded({
          id: res.inscripcionId,
          nombre: nombre.trim(),
          dni: dni.trim(),
          tipo,
          pago,
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
            Gente que llega sin estar anotada. Queda presente al toque.
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

        <div>
          <span className="sect-label mb-1 block">Tipo</span>
          <div className="flex gap-1.5 flex-wrap">
            {TIPO_OPTS.map((o) => (
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
        </div>

        {tipo !== "socio" ? (
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
            Socio: se registra como pago de socio (entrada de socio).
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
