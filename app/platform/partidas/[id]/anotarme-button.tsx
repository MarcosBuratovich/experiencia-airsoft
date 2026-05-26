"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anotarmeAction, desanotarmeAction } from "./actions";
import type { TipoJugador } from "@/lib/precios";

type Inscripcion = { id: string; estado: string };

type PreciosMin = {
  entrada_byop: number;
  entrada_socio: number;
  alquiler_marcadora: number;
  alquiler_chaleco: number;
};

type DeudaCuota = { meses: number; monto: number };
type PlazoCuota = { mesPeriodo: string; diasParaVencer: number; monto: number };

type Props = {
  partidaId: string;
  inscripcion: Inscripcion | null;
  estado: string;
  lleno: boolean;
  fueraDeVentana: boolean;
  esSocio: boolean;
  socioAlDia: boolean;
  deudaCuota: DeudaCuota;
  plazoCuota: PlazoCuota | null;
  precios: PreciosMin;
};

const NOMBRES_MES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function nombreMesDe(periodo: string): string {
  const m = Number(periodo.split("-")[1]) - 1;
  return NOMBRES_MES[m] ?? "";
}

function ars(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

export function AnotarmeButton({
  partidaId,
  inscripcion,
  estado,
  lleno,
  fueraDeVentana,
  esSocio,
  socioAlDia,
  deudaCuota,
  plazoCuota,
  precios,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<TipoJugador>("byop");
  const [chaleco, setChaleco] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const aplicaBeneficio = esSocio && socioAlDia;
  const socioConDeuda = esSocio && !socioAlDia;

  const entrada = aplicaBeneficio ? precios.entrada_socio : precios.entrada_byop;

  const alquilerMonto = useMemo(() => {
    if (tipo !== "alquiler") return 0;
    let t = precios.alquiler_marcadora;
    if (chaleco) t += precios.alquiler_chaleco;
    return t;
  }, [tipo, chaleco, precios]);

  const total = entrada + alquilerMonto;

  if (estado === "cancelada") {
    return (
      <p className="font-mono fluid-xs text-orange-300 uppercase tracking-[.25em]">
        Partida cancelada.
      </p>
    );
  }

  if (inscripcion) {
    const label =
      inscripcion.estado === "waitlist" ? "Estás en lista de espera" : "Confirmado";
    return (
      <div className="flex items-center gap-3">
        <span className="mil-tag bone">{label}</span>
        <button
          type="button"
          disabled={pending || fueraDeVentana}
          onClick={() =>
            startTransition(async () => {
              await desanotarmeAction(partidaId);
              router.refresh();
            })
          }
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs cursor-pointer disabled:opacity-40"
          title={fueraDeVentana ? "Ya pasó la ventana" : undefined}
        >
          {pending ? "..." : "Desanotarme"}
        </button>
      </div>
    );
  }

  if (fueraDeVentana) {
    return (
      <p className="font-mono fluid-xs text-orange-300 uppercase tracking-[.25em]">
        Ventana de inscripción cerrada.
      </p>
    );
  }

  const onAnotarme = () => {
    setError(null);
    startTransition(async () => {
      const res = await anotarmeAction(partidaId, {
        tipo_jugador: tipo,
        alquila_chaleco: tipo === "alquiler" && chaleco,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const btnLabel = pending
    ? "..."
    : lleno
      ? aplicaBeneficio && total === 0
        ? "Anotarme a lista de espera"
        : `Anotarme a lista de espera · ${ars(total)}`
      : aplicaBeneficio && total === 0
        ? "Anotarme · sin cargo"
        : `Anotarme · ${ars(total)}`;

  return (
    <div className="space-y-4">
      {/* Badge socio activo */}
      {aplicaBeneficio && (
        <div className="border border-orange/40 bg-orange/5 clip-notch p-4 flex items-start gap-3">
          <span className="mt-0.5 px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.18em]">
            Socio
          </span>
          <div className="flex-1 space-y-1">
            <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange">
              La entrada está incluida en tu cuota mensual.
            </p>
            {plazoCuota && (
              <p className="font-sans fluid-xs text-ash">
                Cuota de {nombreMesDe(plazoCuota.mesPeriodo)} pendiente —{" "}
                {plazoCuota.diasParaVencer === 0
                  ? "hoy es el último día"
                  : plazoCuota.diasParaVencer === 1
                    ? "queda 1 día"
                    : `quedan ${plazoCuota.diasParaVencer} días`}{" "}
                para pagarla y mantener el beneficio.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warning de cuota atrasada */}
      {socioConDeuda && (
        <div className="border border-orange-300/50 bg-orange-300/5 clip-notch p-4">
          <p className="sect-label mb-1 text-orange-300">// Cuota atrasada</p>
          <p className="font-sans fluid-sm text-bone">
            Te {deudaCuota.meses === 1 ? "falta" : "faltan"} {deudaCuota.meses}{" "}
            {deudaCuota.meses === 1 ? "mes" : "meses"} ({ars(deudaCuota.monto)}).
            Mientras tengas deuda no se aplica el beneficio de socio: pagás la
            entrada de la partida como cualquier jugador.
          </p>
        </div>
      )}

      <fieldset className="border border-rail/60 bg-carbon clip-notch p-4 space-y-3">
        <legend className="sect-label px-2">¿Cómo vas a jugar?</legend>

        <div className="grid grid-cols-2 gap-2">
          <TipoOpt
            value="alquiler"
            current={tipo}
            onSelect={setTipo}
            title="Alquiler"
            subtitle="Alquilo equipo en el local"
          />
          <TipoOpt
            value="byop"
            current={tipo}
            onSelect={setTipo}
            title="BYOP"
            subtitle="Traigo el mío"
          />
        </div>

        <p className="font-mono fluid-xs text-smoke px-1">
          // <span className="text-ash">BYOP</span> = Bring Your Own
          Player. Venís con tu marcadora, protección y munición propias —
          solo pagás la entrada.
        </p>
      </fieldset>

      {tipo === "alquiler" && (
        <fieldset className="border border-rail/60 bg-carbon clip-notch p-4 space-y-3">
          <legend className="sect-label px-2">Equipo a alquilar</legend>

          <div className="border border-orange/40 bg-orange/5 clip-notch px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-bone font-sans">Equipo completo</span>
              <span className="font-mono fluid-xs text-bone shrink-0">
                {ars(precios.alquiler_marcadora)}
              </span>
            </div>
            <p className="font-mono fluid-xs text-smoke mt-0.5">
              Marcadora + tracer + protección.
            </p>
          </div>

          {precios.alquiler_chaleco > 0 && (
            <label className="flex items-start gap-3 px-2 py-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={chaleco}
                onChange={(e) => setChaleco(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-orange cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-bone font-sans">Chaleco táctico</span>
                  <span className="font-mono fluid-xs text-ash shrink-0">
                    {ars(precios.alquiler_chaleco)}
                  </span>
                </div>
                <p className="font-mono fluid-xs text-smoke mt-0.5">
                  Protección extra para el torso.
                </p>
              </div>
            </label>
          )}

          <p className="font-mono fluid-xs text-smoke px-1">
            // Las recargas de munición se piden el día de la partida y las
            carga el admin al monto a cobrar.
          </p>
        </fieldset>
      )}

      {!(aplicaBeneficio && tipo === "byop" && total === 0) && (
        <div className="border border-rail/60 bg-ink/40 clip-notch p-4">
          <dl className="space-y-1 font-mono fluid-xs">
            {!aplicaBeneficio && (
              <Row
                label={socioConDeuda ? "Entrada (cuota atrasada)" : "Entrada"}
                value={ars(entrada)}
              />
            )}
            {alquilerMonto > 0 && <Row label="Alquiler" value={ars(alquilerMonto)} />}
            <div className="border-t border-rail/40 mt-2 pt-2 flex items-center justify-between">
              <span className="sect-label">Total</span>
              <span className="font-display fluid-xl text-bone">{ars(total)}</span>
            </div>
          </dl>
        </div>
      )}

      {tipo === "alquiler" && (
        <p className="font-mono fluid-xs text-smoke px-1">
          Si alquilás equipo, en el local se pide una <span className="text-bone">seña de $5.000</span> el día de la partida — se descuenta del total.
        </p>
      )}

      {error && <p className="font-mono fluid-xs text-orange-300">{error}</p>}

      <button
        type="button"
        disabled={pending || estado === "cerrada"}
        onClick={onAnotarme}
        className="btn-wa w-full px-6 py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {btnLabel}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ash uppercase tracking-[.2em]">{label}</span>
      <span className="text-bone">{value}</span>
    </div>
  );
}

function TipoOpt({
  value,
  current,
  onSelect,
  title,
  subtitle,
}: {
  value: TipoJugador;
  current: TipoJugador;
  onSelect: (v: TipoJugador) => void;
  title: string;
  subtitle: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`px-3 py-3 text-left border transition clip-notch cursor-pointer ${
        active ? "bg-ink/60 border-orange" : "bg-ink/30 border-rail/60 hover:border-rail"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full border-2 transition ${
            active ? "bg-orange border-orange" : "border-rail"
          }`}
          aria-hidden
        />
        <span className="font-display text-bone uppercase tracking-wider">{title}</span>
      </div>
      <p className="mt-1 pl-5 font-mono fluid-xs text-smoke">{subtitle}</p>
    </button>
  );
}

