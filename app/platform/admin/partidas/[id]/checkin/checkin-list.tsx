"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertCheckinAction, actualizarRecargasInscripcionAction } from "./actions";

type PreciosRecargas = {
  tracer100: number;
  conv200: number;
  conv400: number;
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
  recarga_conv_400: number;
  precio_entrada: number;
  precio_alquiler: number;
  precio_recargas: number;
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

function equipoLabel(i: Inscripcion): string | null {
  const bits: string[] = [];
  if (i.tipo_jugador === "alquiler") {
    if (i.alquila_marcadora) bits.push("Marcadora simple");
    if (i.alquila_premium) bits.push("Marcadora avanzada");
    if (i.alquila_chaleco) bits.push("Chaleco");
  }
  if (i.recarga_tracer_100 > 0)
    bits.push(`${i.recarga_tracer_100}× tracer 100`);
  if (i.recarga_conv_200 > 0) bits.push(`${i.recarga_conv_200}× conv 200`);
  if (i.recarga_conv_400 > 0) bits.push(`${i.recarga_conv_400}× conv 400`);
  if (!bits.length) return null;
  return bits.join(" · ");
}

export function CheckinList({
  partidaId: _partidaId,
  inscripciones,
  preciosRecargas,
}: {
  partidaId: string;
  inscripciones: Inscripcion[];
  preciosRecargas: PreciosRecargas;
}) {
  const [rows, setRows] = useState(inscripciones);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const updateRecargas = (
    id: string,
    recargas: { tracer100: number; conv200: number; conv400: number },
  ) => {
    setPendingId(id);
    const nuevoPrecioRecargas =
      recargas.tracer100 * preciosRecargas.tracer100 +
      recargas.conv200 * preciosRecargas.conv200 +
      recargas.conv400 * preciosRecargas.conv400;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              recarga_tracer_100: recargas.tracer100,
              recarga_conv_200: recargas.conv200,
              recarga_conv_400: recargas.conv400,
              precio_recargas: nuevoPrecioRecargas,
              precio_total: r.precio_entrada + r.precio_alquiler + nuevoPrecioRecargas,
            }
          : r,
      ),
    );

    startTransition(async () => {
      await actualizarRecargasInscripcionAction(id, recargas);
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

  const update = (id: string, patch: Partial<Checkin>) => {
    setPendingId(id);
    const row = rows.find((r) => r.id === id);
    if (!row) return;

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
      await upsertCheckinAction(id, merged);
      setPendingId(null);
      router.refresh();
    });
  };

  const togglePresente = (r: Inscripcion, checked: boolean) => {
    const patch: Partial<Checkin> = { presente: checked };
    if (checked && !r.checkin?.pago_estado) {
      if (r.socio && r.precio_alquiler === 0) {
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

      {!rows.length && (
        <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
          <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
            Sin inscriptos.
          </p>
        </div>
      )}

      {/* Mobile — cards */}
      <ul className="lg:hidden space-y-3">
        {rows.map((r) => (
          <MobileCheckinCard
            key={r.id}
            r={r}
            pending={pendingId === r.id}
            onToggle={togglePresente}
            onPatch={update}
            onUpdateRecargas={updateRecargas}
            preciosRecargas={preciosRecargas}
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
              {rows.map((r) => {
                const c = r.checkin;
                const isPending = pendingId === r.id;
                const equipo = equipoLabel(r);
                return (
                  <tr key={r.id} className={`border-t border-rail/40 ${isPending ? "opacity-60" : ""}`}>
                    <td className="px-3 py-3 align-top">
                      <JugadorBadges r={r} />
                      <div className="font-mono fluid-xs text-smoke mt-1">
                        DNI {r.dni} · {r.celular}
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
                        onChange={(pago_estado) => update(r.id, { pago_estado })}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <input
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
}: {
  r: Inscripcion;
  pending: boolean;
  onToggle: (r: Inscripcion, checked: boolean) => void;
  onPatch: (id: string, patch: Partial<Checkin>) => void;
  onUpdateRecargas: (
    id: string,
    recargas: { tracer100: number; conv200: number; conv400: number },
  ) => void;
  preciosRecargas: PreciosRecargas;
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
            DNI {r.dni} · {r.celular}
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
            onChange={(pago_estado) => onPatch(r.id, { pago_estado })}
            wrap
          />
        </div>
        <div>
          <span className="sect-label mb-1 block">Monto</span>
          <input
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
    recargas: { tracer100: number; conv200: number; conv400: number },
  ) => void;
}) {
  const adjust = (
    key: "tracer100" | "conv200" | "conv400",
    delta: number,
  ) => {
    const next = {
      tracer100: r.recarga_tracer_100,
      conv200: r.recarga_conv_200,
      conv400: r.recarga_conv_400,
    };
    next[key] = Math.max(0, Math.min(20, next[key] + delta));
    onUpdate(r.id, next);
  };

  return (
    <div className="border border-rail/40 bg-ink/40 clip-notch p-2.5">
      <p className="sect-label mb-2">// Recargas</p>
      <div className="grid grid-cols-3 gap-1.5">
        <RecargaCounter
          label="Tracer 100"
          value={r.recarga_tracer_100}
          precio={precios.tracer100}
          onMinus={() => adjust("tracer100", -1)}
          onPlus={() => adjust("tracer100", 1)}
        />
        <RecargaCounter
          label="Conv 200"
          value={r.recarga_conv_200}
          precio={precios.conv200}
          onMinus={() => adjust("conv200", -1)}
          onPlus={() => adjust("conv200", 1)}
        />
        <RecargaCounter
          label="Conv 400"
          value={r.recarga_conv_400}
          precio={precios.conv400}
          onMinus={() => adjust("conv400", -1)}
          onPlus={() => adjust("conv400", 1)}
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
      <span className="text-bone">{r.nombre}</span>
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
