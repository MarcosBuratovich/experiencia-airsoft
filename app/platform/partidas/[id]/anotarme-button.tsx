"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anotarmeAction, desanotarmeAction } from "./actions";
import type { TipoJugador } from "@/lib/precios";

type Inscripcion = { id: string; estado: string };

type PreciosMin = {
  entrada_alquiler: number;
  entrada_byop: number;
  entrada_socio: number;
  alquiler_marcadora: number;
  alquiler_premium: number;
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
  const [marcadora, setMarcadora] = useState<"comun" | "premium">("comun");
  const [chaleco, setChaleco] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Solo aplica el beneficio si es socio Y está al día con la cuota
  const aplicaBeneficio = esSocio && socioAlDia;
  const socioConDeuda = esSocio && !socioAlDia;

  const entrada = aplicaBeneficio
    ? precios.entrada_socio
    : tipo === "alquiler"
      ? precios.entrada_alquiler
      : precios.entrada_byop;

  const alquilerMonto = useMemo(() => {
    if (tipo !== "alquiler") return 0;
    let t = 0;
    if (marcadora === "comun") t += precios.alquiler_marcadora;
    else t += precios.alquiler_premium;
    if (chaleco) t += precios.alquiler_chaleco;
    return t;
  }, [tipo, marcadora, chaleco, precios]);

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
        alquila_marcadora: tipo === "alquiler" && marcadora === "comun",
        alquila_premium: tipo === "alquiler" && marcadora === "premium",
        alquila_chaleco: tipo === "alquiler" && chaleco,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  // Texto del CTA: si beneficio activo y total === 0, simplificamos
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
          <p className="sect-label mb-1 text-orange-300">
            // Cuota atrasada
          </p>
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
            subtitle="Alquilo equipo"
          />
          <TipoOpt
            value="byop"
            current={tipo}
            onSelect={setTipo}
            title="BYOP"
            subtitle="Traigo el mío"
          />
        </div>
      </fieldset>

      {tipo === "alquiler" && (
        <fieldset className="border border-rail/60 bg-carbon clip-notch p-4 space-y-3">
          <legend className="sect-label px-2">Equipo a alquilar</legend>

          <div className="space-y-2">
            <MarcadoraOpt
              value="comun"
              current={marcadora}
              setValue={setMarcadora}
              title="Marcadora común"
              precio={precios.alquiler_marcadora}
            />
            <MarcadoraOpt
              value="premium"
              current={marcadora}
              setValue={setMarcadora}
              title="Marcadora premium (tracer)"
              precio={precios.alquiler_premium}
            />
          </div>

          <label className="flex items-center gap-3 px-2 py-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={chaleco}
              onChange={(e) => setChaleco(e.target.checked)}
              className="w-4 h-4 accent-orange cursor-pointer"
            />
            <span className="text-bone font-sans flex-1">Chaleco</span>
            <span className="font-mono fluid-xs text-ash">
              {ars(precios.alquiler_chaleco)}
            </span>
          </label>
        </fieldset>
      )}

      {/* Desglose: lo escondemos completamente cuando es socio al día y no
          alquila nada — no hay nada que mostrar y reduce ruido visual. */}
      {!(aplicaBeneficio && tipo === "byop") && (
        <div className="border border-rail/60 bg-ink/40 clip-notch p-4">
          <dl className="space-y-1 font-mono fluid-xs">
            {!aplicaBeneficio && (
              <Row
                label={socioConDeuda ? "Entrada (cuota atrasada)" : "Entrada"}
                value={ars(entrada)}
              />
            )}
            {tipo === "alquiler" && <Row label="Alquiler" value={ars(alquilerMonto)} />}
            <div className="border-t border-rail/40 mt-2 pt-2 flex items-center justify-between">
              <span className="sect-label">Total</span>
              <span className="font-display fluid-xl text-bone">{ars(total)}</span>
            </div>
          </dl>
        </div>
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

function MarcadoraOpt({
  value,
  current,
  setValue,
  title,
  precio,
}: {
  value: "comun" | "premium";
  current: "comun" | "premium";
  setValue: (v: "comun" | "premium") => void;
  title: string;
  precio: number;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={`w-full text-left px-3 py-2 border transition clip-notch cursor-pointer ${
        active ? "bg-ink/60 border-orange" : "bg-ink/30 border-rail/60 hover:border-rail"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block w-3 h-3 rounded-full border-2 transition ${
            active ? "bg-orange border-orange" : "border-rail"
          }`}
          aria-hidden
        />
        <span className="text-bone flex-1">{title}</span>
        <span className="font-mono fluid-xs text-ash">
          ${precio.toLocaleString("es-AR")}
        </span>
      </div>
    </button>
  );
}
