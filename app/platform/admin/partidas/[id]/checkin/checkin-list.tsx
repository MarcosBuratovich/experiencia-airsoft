"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertCheckinAction, actualizarRecargasInscripcionAction } from "./actions";
import {
  AgregarWalkin,
  type PreciosEntrada,
  type WalkinAdded,
} from "./agregar-walkin";
import { NombreConClanes } from "../../../../components/nombre-con-clanes";
import { ContactoWa } from "../../../../components/contacto-wa";
import { ErrorBanner } from "@/app/_components/error-banner";
import type { ClanChip } from "@/lib/clanes";
import type { PrecioDual } from "@/lib/precios";
import type { FriendlyError } from "@/lib/errors";

type PreciosRecargas = {
  tracer100: PrecioDual;
  conv200: PrecioDual;
};

type Checkin = {
  presente: boolean;
  pago_estado: string | null;
  pago_monto: number | null;
  nota: string | null;
};

type Inscripcion = {
  id: string;
  nombre: string;
  clanes: ClanChip[];
  flair?: string | null;
  dni: string;
  celular: string;
  socio: boolean;
  tipo_jugador: string;
  estado: string;
  alquila_marcadora: boolean;
  alquila_premium: boolean;
  alquila_chaleco: boolean;
  recarga_tracer_100: number;
  recarga_conv_200: number;
  precio_entrada: number;
  precio_alquiler: number;
  precio_recargas: number;
  /** Snapshot de entrada+alquiler en efectivo (el de transferencia = entrada+alquiler). */
  precio_fijo_efectivo: number;
  precio_total: number;
  checkin: Checkin | null;
};

const PAGO_OPTS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transfer." },
  { value: "debe", label: "Debe" },
  { value: "socio_presente", label: "Socio" },
];

function ars(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

/**
 * Monto a cobrar según el medio elegido (auto-cobro).
 *   - efectivo → fijo efectivo + recargas efectivo.
 *   - transferencia / debe → la lista (transferencia) = precio_total.
 *   - socio_presente → 0.
 */
function montoDeMetodo(
  r: Inscripcion,
  pagoEstado: string | null,
  preciosRecargas: PreciosRecargas,
): number {
  if (pagoEstado === "socio_presente") return 0;
  if (pagoEstado === "efectivo") {
    const recargasEf =
      r.recarga_tracer_100 * preciosRecargas.tracer100.efectivo +
      r.recarga_conv_200 * preciosRecargas.conv200.efectivo;
    return r.precio_fijo_efectivo + recargasEf;
  }
  return r.precio_total;
}

function equipoLabel(i: Inscripcion): string | null {
  const bits: string[] = [];
  if (i.tipo_jugador === "alquiler") {
    if (i.alquila_marcadora) bits.push("Marcadora simple");
    if (i.alquila_premium) bits.push("Marcadora avanzada");
    if (i.alquila_chaleco) bits.push("Chaleco");
  }
  if (i.recarga_tracer_100 > 0)
    bits.push(`${i.recarga_tracer_100}× tracer 200`);
  if (i.recarga_conv_200 > 0) bits.push(`${i.recarga_conv_200}× común 200`);
  if (!bits.length) return null;
  return bits.join(" · ");
}

export function CheckinList({
  partidaId,
  inscripciones,
  preciosRecargas,
  precios,
  contextoWa,
}: {
  partidaId: string;
  inscripciones: Inscripcion[];
  preciosRecargas: PreciosRecargas;
  precios: PreciosEntrada;
  /** Cola del mensaje de WhatsApp al jugador (fecha/hora de la partida). */
  contextoWa?: string;
}) {
  const [rows, setRows] = useState(inscripciones);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [query, setQuery] = useState("");
  const [ocultarPresentes, setOcultarPresentes] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const updateRecargas = (
    id: string,
    recargas: { tracer100: number; conv200: number },
  ) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setPendingId(id);
    setError(null);
    const snapshot = row;
    // Snapshot de recargas en transferencia (referencia/lista).
    const nuevoPrecioRecargas =
      recargas.tracer100 * preciosRecargas.tracer100.transferencia +
      recargas.conv200 * preciosRecargas.conv200.transferencia;
    const nuevoTotal = row.precio_entrada + row.precio_alquiler + nuevoPrecioRecargas;
    const rowActualizado: Inscripcion = {
      ...row,
      recarga_tracer_100: recargas.tracer100,
      recarga_conv_200: recargas.conv200,
      precio_recargas: nuevoPrecioRecargas,
      precio_total: nuevoTotal,
    };
    // Si el monto cobrado no se editó a mano (coincide con el total del medio
    // elegido antes del cambio, o es null), lo re-sincronizamos para no subcobrar.
    const metodo = row.checkin?.pago_estado ?? null;
    const totalPrevMetodo = montoDeMetodo(row, metodo, preciosRecargas);
    const montoSinEditar =
      row.checkin?.pago_monto == null || row.checkin.pago_monto === totalPrevMetodo;
    const resync = !!row.checkin?.presente && montoSinEditar;
    const nuevoMonto = resync
      ? montoDeMetodo(rowActualizado, metodo, preciosRecargas)
      : row.checkin?.pago_monto ?? null;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...rowActualizado,
              checkin: r.checkin ? { ...r.checkin, pago_monto: nuevoMonto } : r.checkin,
            }
          : r,
      ),
    );

    startTransition(async () => {
      const res = await actualizarRecargasInscripcionAction(id, recargas);
      if (res && "error" in res && res.error) {
        setRows((prev) => prev.map((r) => (r.id === id ? snapshot : r)));
        setError(res.error);
        setPendingId(null);
        return;
      }
      // Persistir el monto re-sincronizado en el check-in.
      if (resync && snapshot.checkin) {
        await upsertCheckinAction(id, {
          presente: snapshot.checkin.presente,
          pago_estado: snapshot.checkin.pago_estado,
          pago_monto: nuevoMonto,
          nota: snapshot.checkin.nota,
        });
      }
      setPendingId(null);
      router.refresh();
    });
  };

  const totals = useMemo(() => {
    let efectivo = 0,
      transferencia = 0,
      debe = 0,
      presentes = 0;
    for (const r of rows) {
      if (!r.checkin?.presente) continue;
      presentes++;
      const monto = r.checkin?.pago_monto ?? r.precio_total;
      if (r.checkin?.pago_estado === "efectivo") efectivo += monto;
      else if (r.checkin?.pago_estado === "transferencia") transferencia += monto;
      else if (r.checkin?.pago_estado === "debe") debe += monto;
    }
    return { efectivo, transferencia, debe, presentes };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (ocultarPresentes && r.checkin?.presente) return false;
      if (!q) return true;
      return (
        r.nombre.toLowerCase().includes(q) || (r.dni ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, ocultarPresentes]);

  const update = (id: string, patch: Partial<Checkin>) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setPendingId(id);
    setError(null);
    const snapshot = row;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              checkin: {
                presente: false,
                pago_estado: null,
                pago_monto: null,
                nota: null,
                ...r.checkin,
                ...patch,
              },
            }
          : r,
      ),
    );
    startTransition(async () => {
      const merged: Checkin = {
        presente: patch.presente ?? row.checkin?.presente ?? false,
        pago_estado:
          patch.pago_estado !== undefined ? patch.pago_estado : row.checkin?.pago_estado ?? null,
        pago_monto:
          patch.pago_monto !== undefined
            ? patch.pago_monto
            : row.checkin?.pago_monto ?? row.precio_total,
        nota: patch.nota !== undefined ? patch.nota : row.checkin?.nota ?? null,
      };
      const res = await upsertCheckinAction(id, merged);
      setPendingId(null);
      if (res && "error" in res && res.error) {
        // Revertir el optimismo para no mostrar un guardado que no persistió.
        setRows((prev) => prev.map((r) => (r.id === id ? snapshot : r)));
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  // Inserción optimista de un walk-in recién agregado por el admin. Construye
  // la fila con los mismos precios que usó el server (pasados como prop).
  const addWalkin = (d: WalkinAdded) => {
    const esSocio = d.socio;
    const esAvanzado = d.tipo === "alquiler_avanzado";
    const esAlquiler = d.tipo === "alquiler_basico" || esAvanzado;
    const alquilerDual = esAvanzado
      ? precios.alquiler_premium
      : precios.alquiler_marcadora;
    // El alquiler ya incluye la entrada: para alquiler no se cobra entrada aparte.
    const precio_entrada = esAlquiler
      ? 0
      : esSocio
        ? precios.entrada_socio.transferencia
        : precios.entrada_byop.transferencia;
    const precio_alquiler = esAlquiler ? alquilerDual.transferencia : 0;
    const precio_fijo_efectivo = esAlquiler
      ? alquilerDual.efectivo
      : esSocio
        ? precios.entrada_socio.efectivo
        : precios.entrada_byop.efectivo;
    const precio_total = precio_entrada + precio_alquiler;
    const gratis = esSocio && precio_total === 0;
    const nueva: Inscripcion = {
      id: d.id,
      nombre: d.nombre,
      clanes: [],
      flair: null,
      dni: d.dni || "—",
      celular: "—",
      socio: esSocio,
      tipo_jugador: esAlquiler ? "alquiler" : "byop",
      estado: "confirmado",
      alquila_marcadora: esAlquiler && !esAvanzado,
      alquila_premium: esAvanzado,
      alquila_chaleco: false,
      recarga_tracer_100: 0,
      recarga_conv_200: 0,
      precio_entrada,
      precio_alquiler,
      precio_recargas: 0,
      precio_fijo_efectivo,
      precio_total,
      checkin: {
        presente: true,
        pago_estado: gratis ? "socio_presente" : d.pago,
        pago_monto: gratis
          ? 0
          : d.pago === "efectivo"
            ? precio_fijo_efectivo
            : precio_total,
        nota: null,
      },
    };
    setRows((prev) => [...prev, nueva]);
  };

  const togglePresente = (r: Inscripcion, checked: boolean) => {
    const patch: Partial<Checkin> = { presente: checked };
    if (checked && !r.checkin?.pago_estado) {
      // Entrada gratis solo si el precio snapshoteado es 0 (socio al día). Un
      // socio con cuota vencida se anota con precio_total > 0 y debe pagar.
      if (r.socio && r.precio_total === 0) {
        patch.pago_estado = "socio_presente";
        patch.pago_monto = 0;
      } else {
        patch.pago_monto = r.precio_total;
      }
    }
    update(r.id, patch);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Presentes" value={`${totals.presentes}/${rows.length}`} />
        <Stat label="Efectivo" value={ars(totals.efectivo)} />
        <Stat label="Transfer." value={ars(totals.transferencia)} />
        <Stat label="Debe" value={ars(totals.debe)} tone="warn" />
      </div>

      <AgregarWalkin partidaId={partidaId} precios={precios} onAdded={addWalkin} />

      <ErrorBanner error={error} variant="inline" className="mb-4" />

      {rows.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI…"
            className="flex-1 min-w-[180px] bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
          />
          <button
            type="button"
            onClick={() => setOcultarPresentes((v) => !v)}
            className={`px-3 py-2 clip-tag font-mono fluid-xs uppercase tracking-[.18em] cursor-pointer border ${
              ocultarPresentes
                ? "bg-orange text-ink border-orange"
                : "border-rail/60 text-ash hover:border-orange"
            }`}
          >
            {ocultarPresentes ? "Ver todos" : "Ocultar presentes"}
          </button>
        </div>
      )}

      {!rows.length && (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin inscriptos.
          </p>
        </div>
      )}

      {rows.length > 0 && !visibleRows.length && (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Nadie coincide con el filtro.
          </p>
        </div>
      )}

      {/* Mobile — cards */}
      <ul className="lg:hidden space-y-3">
        {visibleRows.map((r) => (
          <MobileCheckinCard
            key={r.id}
            r={r}
            pending={pendingId === r.id}
            onToggle={togglePresente}
            onPatch={update}
            onUpdateRecargas={updateRecargas}
            preciosRecargas={preciosRecargas}
            contextoWa={contextoWa}
          />
        ))}
      </ul>

      {/* Desktop — tabla */}
      {!!rows.length && (
        <div className="hidden lg:block border border-rail/60 clip-notch overflow-hidden">
          <table className="w-full">
            <thead className="bg-carbon">
              <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
                <th className="text-left px-3 py-3">Jugador</th>
                <th className="text-center px-3 py-3">Presente</th>
                <th className="text-left px-3 py-3">Pago</th>
                <th className="text-left px-3 py-3">Monto</th>
                <th className="text-left px-3 py-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const c = r.checkin;
                const isPending = pendingId === r.id;
                const equipo = equipoLabel(r);
                return (
                  <tr key={r.id} className={`border-t border-rail/40 ${isPending ? "opacity-60" : ""}`}>
                    <td className="px-3 py-3 align-top">
                      <JugadorBadges r={r} />
                      <div className="font-mono fluid-xs text-smoke mt-1">
                        DNI {r.dni} ·{" "}
                        <ContactoWa
                          celular={r.celular}
                          nombre={r.nombre}
                          contexto={contextoWa}
                          variant="inline"
                        />
                      </div>
                      {equipo && (
                        <div className="font-mono fluid-xs text-ash mt-1">Equipo: {equipo}</div>
                      )}
                      <div
                        className="font-mono fluid-xs text-smoke mt-1"
                        title={`Entrada ${ars(r.precio_entrada)} · Alquiler ${ars(r.precio_alquiler)} · Recargas ${ars(r.precio_recargas)}`}
                      >
                        Total: {ars(r.precio_total)}
                      </div>
                      {r.tipo_jugador === "alquiler" && (
                        <div className="mt-2">
                          <RecargasControls
                            r={r}
                            precios={preciosRecargas}
                            onUpdate={updateRecargas}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-center">
                      <input
                        type="checkbox"
                        checked={!!c?.presente}
                        onChange={(e) => togglePresente(r, e.target.checked)}
                        className="w-5 h-5 accent-orange cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <PagoGroup
                        value={c?.pago_estado ?? null}
                        onChange={(pago_estado) =>
                          update(r.id, {
                            pago_estado,
                            pago_monto: montoDeMetodo(r, pago_estado, preciosRecargas),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        key={`monto-${c?.pago_monto ?? r.precio_total}`}
                        type="number"
                        defaultValue={c?.pago_monto ?? r.precio_total}
                        onBlur={(e) =>
                          update(r.id, { pago_monto: Number(e.target.value) || 0 })
                        }
                        className="w-24 bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none"
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
                        type="text"
                        defaultValue={c?.nota ?? ""}
                        onBlur={(e) => update(r.id, { nota: e.target.value || null })}
                        placeholder="—"
                        className="w-full bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MobileCheckinCard({
  r,
  pending,
  onToggle,
  onPatch,
  onUpdateRecargas,
  preciosRecargas,
  contextoWa,
}: {
  r: Inscripcion;
  pending: boolean;
  onToggle: (r: Inscripcion, checked: boolean) => void;
  onPatch: (id: string, patch: Partial<Checkin>) => void;
  onUpdateRecargas: (
    id: string,
    recargas: { tracer100: number; conv200: number },
  ) => void;
  preciosRecargas: PreciosRecargas;
  contextoWa?: string;
}) {
  const equipo = equipoLabel(r);
  return (
    <li
      className={`border border-rail/60 bg-carbon clip-notch p-4 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <JugadorBadges r={r} />
          <div className="font-mono fluid-xs text-smoke mt-1">
            DNI {r.dni} ·{" "}
            <ContactoWa
              celular={r.celular}
              nombre={r.nombre}
              contexto={contextoWa}
              variant="inline"
            />
          </div>
          {equipo && (
            <div className="font-mono fluid-xs text-ash mt-0.5">Equipo: {equipo}</div>
          )}
          <div className="font-mono fluid-xs text-smoke mt-0.5">
            Total: {ars(r.precio_total)}
          </div>
        </div>
        <label className="flex flex-col items-center gap-1 pt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!r.checkin?.presente}
            onChange={(e) => onToggle(r, e.target.checked)}
            className="w-6 h-6 accent-orange cursor-pointer"
          />
          <span className="sect-label mb-0">Pres.</span>
        </label>
      </div>

      {r.tipo_jugador === "alquiler" && (
        <div className="mb-3">
          <RecargasControls
            r={r}
            precios={preciosRecargas}
            onUpdate={onUpdateRecargas}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <span className="sect-label mb-1 block">Pago</span>
          <PagoGroup
            value={r.checkin?.pago_estado ?? null}
            onChange={(pago_estado) =>
              onPatch(r.id, {
                pago_estado,
                pago_monto: montoDeMetodo(r, pago_estado, preciosRecargas),
              })
            }
            wrap
          />
        </div>
        <div>
          <span className="sect-label mb-1 block">Monto</span>
          <input
            key={`monto-${r.checkin?.pago_monto ?? r.precio_total}`}
            type="number"
            defaultValue={r.checkin?.pago_monto ?? r.precio_total}
            onBlur={(e) =>
              onPatch(r.id, { pago_monto: Number(e.target.value) || 0 })
            }
            className="w-full bg-ink border border-rail/60 px-2 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
          />
        </div>
      </div>

      <div>
        <span className="sect-label mb-1 block">Nota</span>
        <input
          type="text"
          defaultValue={r.checkin?.nota ?? ""}
          onBlur={(e) => onPatch(r.id, { nota: e.target.value || null })}
          placeholder="—"
          className="w-full bg-ink border border-rail/60 px-2 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none"
        />
      </div>
    </li>
  );
}

function RecargasControls({
  r,
  precios,
  onUpdate,
}: {
  r: Inscripcion;
  precios: PreciosRecargas;
  onUpdate: (
    id: string,
    recargas: { tracer100: number; conv200: number },
  ) => void;
}) {
  const adjust = (key: "tracer100" | "conv200", delta: number) => {
    const next = {
      tracer100: r.recarga_tracer_100,
      conv200: r.recarga_conv_200,
    };
    next[key] = Math.max(0, Math.min(20, next[key] + delta));
    onUpdate(r.id, next);
  };

  return (
    <div className="border border-rail/40 bg-ink/40 clip-notch p-2.5">
      <p className="sect-label mb-2">// Recargas</p>
      <div className="grid grid-cols-2 gap-1.5">
        <RecargaCounter
          label="Tracer 200"
          value={r.recarga_tracer_100}
          precio={precios.tracer100.transferencia}
          onMinus={() => adjust("tracer100", -1)}
          onPlus={() => adjust("tracer100", 1)}
        />
        <RecargaCounter
          label="Común 200"
          value={r.recarga_conv_200}
          precio={precios.conv200.transferencia}
          onMinus={() => adjust("conv200", -1)}
          onPlus={() => adjust("conv200", 1)}
        />
      </div>
      {r.precio_recargas > 0 && (
        <p className="mt-2 font-mono fluid-xs text-orange">
          + {ars(r.precio_recargas)} en recargas
        </p>
      )}
    </div>
  );
}

function RecargaCounter({
  label,
  value,
  precio,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  precio: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="font-mono text-[10px] text-smoke uppercase tracking-[.15em]"
        title={`${ars(precio)} c/u`}
      >
        {label}
      </span>
      <div className="flex items-stretch border border-rail/60 bg-ink">
        <button
          type="button"
          onClick={onMinus}
          disabled={value <= 0}
          className="flex-1 text-bone hover:text-orange transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Restar"
        >
          −
        </button>
        <span className="px-2 text-center font-display text-bone select-none tabular-nums leading-7 min-w-[1.75rem]">
          {value}
        </span>
        <button
          type="button"
          onClick={onPlus}
          disabled={value >= 20}
          className="flex-1 text-bone hover:text-orange transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Sumar"
        >
          +
        </button>
      </div>
    </div>
  );
}

function JugadorBadges({ r }: { r: Inscripcion }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <NombreConClanes nombre={r.nombre} clanes={r.clanes} flair={r.flair} />
      {r.socio && (
        <span className="px-1.5 py-0.5 bg-orange text-ink font-mono fluid-xs uppercase tracking-[.15em]">
          Socio
        </span>
      )}
      {r.tipo_jugador === "alquiler" && (
        <span className="px-1.5 py-0.5 bg-ink border border-rail/60 text-ash font-mono fluid-xs uppercase tracking-[.15em]">
          Alquiler
        </span>
      )}
      {r.estado === "waitlist" && (
        <span className="mil-tag bone">Waitlist</span>
      )}
    </div>
  );
}

function PagoGroup({
  value,
  onChange,
  wrap,
}: {
  value: string | null;
  onChange: (v: string) => void;
  wrap?: boolean;
}) {
  return (
    <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "flex-wrap"}`}>
      {PAGO_OPTS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2 py-1 font-mono fluid-xs uppercase tracking-[.15em] border transition cursor-pointer ${
            value === o.value
              ? "bg-orange text-ink border-orange"
              : "border-rail/60 text-ash hover:border-orange"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div
      className={`border border-rail/60 clip-notch p-3 sm:p-4 ${
        tone === "warn" ? "bg-orange/5" : "bg-carbon"
      }`}
    >
      <div className="sect-label mb-1">{label}</div>
      <div className="font-display fluid-xl sm:fluid-2xl text-bone">{value}</div>
    </div>
  );
}
