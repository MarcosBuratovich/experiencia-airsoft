"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatFechaLarga, formatHora } from "@/lib/format";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "@/app/_components/error-banner";
import {
  desmarcarExportadaAction,
  guardarValorCerradoAction,
  marcarExportadasAction,
} from "./actions";

export type FilaConversion = {
  id: string;
  solicitante: string;
  fechaPartida: string;
  horaPartida: string;
  cupo: number;
  gclid: string;
  /** ISO. Momento en que se confirmó la reserva. */
  conversionAt: string;
  valorEstimado: number;
  valorCerrado: number | null;
  exportadaAt: string | null;
};

/** Nombre por defecto de la acción de conversión creada en Google Ads. */
const NOMBRE_DEFAULT = "Privada confirmada";

function ars(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

/**
 * Formato que pide Google Ads: `yyyy-MM-dd HH:mm:ss` en la zona declarada
 * arriba del archivo. Se arma con los componentes en hora de Argentina.
 */
function fechaParaAds(iso: string): string {
  const d = new Date(iso);
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

/** Escapa un campo para CSV (comillas y comas). */
function csvCampo(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ConversionesList({
  filas,
  sinGclid,
}: {
  filas: FilaConversion[];
  sinGclid: number;
}) {
  const [nombreConversion, setNombreConversion] = useState(NOMBRE_DEFAULT);
  const [incluirExportadas, setIncluirExportadas] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const visibles = useMemo(
    () => filas.filter((f) => incluirExportadas || !f.exportadaAt),
    [filas, incluirExportadas],
  );
  const aExportar = useMemo(
    () => visibles.filter((f) => !f.exportadaAt),
    [visibles],
  );
  const totalAExportar = aExportar.reduce(
    (acc, f) => acc + (f.valorCerrado ?? f.valorEstimado),
    0,
  );

  const guardarValor = (id: string, texto: string) => {
    const limpio = texto.trim().replace(/[^\d]/g, "");
    const valor = limpio === "" ? null : Number(limpio);
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const res = await guardarValorCerradoAction(id, valor);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
      setPendingId(null);
    });
  };

  const descargarCsv = () => {
    if (!aExportar.length) return;
    // Primera línea: zona horaria de las fechas que van abajo. Después el
    // encabezado exacto que espera Google Ads y una fila por conversión.
    const lineas = [
      "Parameters:TimeZone=America/Argentina/Buenos_Aires",
      "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency",
      ...aExportar.map((f) =>
        [
          csvCampo(f.gclid),
          csvCampo(nombreConversion),
          csvCampo(fechaParaAds(f.conversionAt)),
          csvCampo(f.valorCerrado ?? f.valorEstimado),
          "ARS",
        ].join(","),
      ),
    ];
    const blob = new Blob([lineas.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversiones-offline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Se marcan recién después de descargar, para no perder filas si el
    // navegador cancela la descarga.
    const ids = aExportar.map((f) => f.id);
    startTransition(async () => {
      const res = await marcarExportadasAction(ids);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  };

  const desmarcar = (id: string) => {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const res = await desmarcarExportadaAction(id);
      if ("error" in res && res.error) setError(res.error);
      else router.refresh();
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-5">
      <ErrorBanner error={error} />

      {/* Instrucciones: sin esto el CSV no sirve de nada */}
      <details className="border border-rail/60 bg-carbon clip-notch p-4">
        <summary className="cursor-pointer font-mono fluid-xs uppercase tracking-[.2em] text-orange">
          Cómo subir esto a Google Ads (primera vez)
        </summary>
        <ol className="mt-3 space-y-2 font-sans fluid-sm text-ash list-decimal pl-5">
          <li>
            En Google Ads: <b>Goals → Conversions → New conversion action →
            Import → Manual import using API or uploads</b>. Elegí seguimiento
            de <b>conversiones offline</b>.
          </li>
          <li>
            Ponele un nombre y <b>copiá ese nombre exacto</b> en el campo de
            abajo. Si no coinciden, Google rechaza el archivo.
          </li>
          <li>
            Marcá que usa <b>valores distintos por conversión</b> y moneda{" "}
            <b>ARS</b>.
          </li>
          <li>
            Descargá el CSV con el botón de acá abajo y subilo en{" "}
            <b>Goals → Conversions → Uploads → subir archivo</b>.
          </li>
          <li>
            Google muestra los errores por fila si algo no le gusta. El clic
            tiene que tener <b>menos de 90 días</b>.
          </li>
        </ol>
      </details>

      <div className="border border-rail/60 bg-carbon clip-notch p-4 flex flex-wrap items-end gap-4">
        <label className="block flex-1 min-w-[220px]">
          <span className="sect-label mb-1 block">
            Nombre de la conversión en Ads
          </span>
          <input
            value={nombreConversion}
            onChange={(e) => setNombreConversion(e.target.value)}
            className="w-full bg-ink border border-rail/60 px-3 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
          />
        </label>
        <div className="text-right">
          <p className="sect-label mb-1">A exportar</p>
          <p className="font-display fluid-xl text-orange">
            {aExportar.length} · {ars(totalAExportar)}
          </p>
        </div>
        <button
          type="button"
          onClick={descargarCsv}
          disabled={!aExportar.length || !nombreConversion.trim()}
          className="btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 cursor-pointer"
        >
          Descargar CSV
        </button>
      </div>

      <label className="flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em] text-smoke cursor-pointer">
        <input
          type="checkbox"
          checked={incluirExportadas}
          onChange={(e) => setIncluirExportadas(e.target.checked)}
        />
        Mostrar también las ya exportadas
      </label>

      {!visibles.length ? (
        <div className="border border-rail/60 bg-carbon clip-notch p-4">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.2em]">
            {filas.length
              ? "Todo exportado."
              : "Todavía no hay privadas aprobadas que vengan de un anuncio."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((f) => (
            <li
              key={f.id}
              className={`border border-rail/60 bg-carbon clip-notch p-4 flex flex-wrap items-center gap-4 ${
                f.exportadaAt ? "opacity-60" : ""
              }`}
            >
              <div className="flex-1 min-w-[200px]">
                <p className="font-display fluid-base uppercase text-bone">
                  {f.solicitante}
                </p>
                <p className="font-mono fluid-xs text-smoke mt-1">
                  {formatFechaLarga(f.fechaPartida)} ·{" "}
                  {formatHora(f.horaPartida)} hs · ~{f.cupo} personas
                </p>
                <p
                  className="font-mono fluid-xs text-ash mt-1 truncate max-w-[36ch]"
                  title={f.gclid}
                >
                  clic: {f.gclid}
                </p>
              </div>

              <label className="block">
                <span className="sect-label mb-1 block">Monto real</span>
                <input
                  inputMode="numeric"
                  defaultValue={f.valorCerrado ?? ""}
                  placeholder={String(f.valorEstimado)}
                  disabled={pendingId === f.id}
                  onBlur={(e) => {
                    const actual = f.valorCerrado?.toString() ?? "";
                    if (e.target.value.trim() === actual) return;
                    guardarValor(f.id, e.target.value);
                  }}
                  className="w-32 bg-ink border border-rail/60 px-2 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
                />
                <span className="mt-1 block font-mono fluid-xs text-smoke">
                  {f.valorCerrado
                    ? "corregido"
                    : `estimado ${ars(f.valorEstimado)}`}
                </span>
              </label>

              <div className="shrink-0 text-right min-w-[120px]">
                {f.exportadaAt ? (
                  <button
                    type="button"
                    onClick={() => desmarcar(f.id)}
                    disabled={pendingId === f.id}
                    className="font-mono fluid-xs uppercase tracking-[.18em] text-smoke hover:text-orange cursor-pointer disabled:opacity-50"
                  >
                    Exportada ✓ · deshacer
                  </button>
                ) : (
                  <span className="font-mono fluid-xs uppercase tracking-[.18em] text-orange">
                    Pendiente
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {sinGclid > 0 && (
        <p className="font-sans fluid-xs text-smoke max-w-[70ch]">
          Hay {sinGclid} privada{sinGclid === 1 ? "" : "s"} aprobada
          {sinGclid === 1 ? "" : "s"} que no figura{sinGclid === 1 ? "" : "n"}{" "}
          acá: esas personas no llegaron desde un anuncio de Google (o
          solicitaron antes de que empezáramos a registrarlo), así que no hay
          clic al cual atribuir la venta.
        </p>
      )}
    </div>
  );
}
