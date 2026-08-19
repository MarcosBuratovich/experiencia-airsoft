"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertCheckinAction,
  actualizarRecargasInscripcionAction,
  actualizarEquipoInscripcionAction,
  eliminarInscripcionCheckinAction,
} from "./actions";
import {
  AgregarWalkin,
  dualLabel,
  opcionesDePrecio,
  type Tipo,
  type WalkinAdded,
} from "./agregar-walkin";
import { NombreConClanes } from "../../../../components/nombre-con-clanes";
import { ContactoWa } from "../../../../components/contacto-wa";
import { ErrorBanner } from "@/app/_components/error-banner";
import type { ClanChip } from "@/lib/clanes";
import { calcularPrecioInscripcion, type PrecioDual, type PreciosConfig } from "@/lib/precios";
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
  /** Lo agregó un admin a mano (cambia el texto de confirmación al borrar). */
  esWalkin?: boolean;
  /** Sin cuenta: cargado a mano con nombre y DNI. Para estos el admin elige
   *  si es socio; para los que tienen cuenta sale del perfil. */
  isGuest?: boolean;
  checkin: Checkin | null;
};

/** Opciones de tipo del editor de equipo, por si la fila tiene cuenta o no. */
const TIPOS_CUENTA: { value: Tipo; label: string }[] = [
  { value: "byop", label: "BYOP" },
  { value: "alquiler_basico", label: "Alq. básico" },
  { value: "alquiler_avanzado", label: "Alq. avanzado" },
];
const TIPOS_GUEST: { value: Tipo; label: string }[] = [
  { value: "socio", label: "Socio" },
  ...TIPOS_CUENTA,
];

/** Qué botón del editor de equipo está activo para esta fila. */
function tipoDeFila(r: Inscripcion): Tipo {
  if (r.tipo_jugador === "alquiler") {
    return r.alquila_premium ? "alquiler_avanzado" : "alquiler_basico";
  }
  // 'socio' solo es un tipo elegible en los guests; en una cuenta el
  // beneficio sale del perfil y del estado de cuota, no de este botón.
  return r.isGuest && r.socio ? "socio" : "byop";
}

/**
 * Las recargas se muestran en los alquileres —que es donde se piden— y en
 * cualquier fila que ya tenga alguna cargada, para que un jugador que el
 * admin pasó de alquiler a BYOP no quede con recargas cobradas y sin forma
 * de sacárselas.
 */
function mostrarRecargas(r: Inscripcion): boolean {
  return (
    r.tipo_jugador === "alquiler" ||
    r.recarga_tracer_100 > 0 ||
    r.recarga_conv_200 > 0
  );
}

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
  }
  // Fuera del bloque de alquiler a propósito: el chaleco se alquila suelto,
  // un BYOP puede pedirlo sin alquilar marcadora.
  if (i.alquila_chaleco) bits.push("Chaleco");
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
  precios: PreciosConfig;
  /** Cola del mensaje de WhatsApp al jugador (fecha/hora de la partida). */
  contextoWa?: string;
}) {
  const [rows, setRows] = useState(inscripciones);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
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
    // Misma cuenta que hizo el server (ver `opcionesDePrecio`), para que la
    // fila optimista no muestre un total distinto al que quedó guardado.
    const opts = opcionesDePrecio(d.tipo, d.chaleco, d.socio, precios);
    const transf = calcularPrecioInscripcion(opts, "transferencia");
    const efec = calcularPrecioInscripcion(opts, "efectivo");
    const gratis = d.socio && transf.total === 0;
    const nueva: Inscripcion = {
      id: d.id,
      nombre: d.nombre,
      clanes: [],
      flair: null,
      dni: d.dni || "—",
      celular: "—",
      socio: d.socio,
      tipo_jugador: opts.tipo_jugador,
      estado: "confirmado",
      alquila_marcadora: opts.alquila.marcadora,
      alquila_premium: opts.alquila.premium,
      alquila_chaleco: d.chaleco,
      recarga_tracer_100: 0,
      recarga_conv_200: 0,
      precio_entrada: transf.entrada,
      precio_alquiler: transf.alquiler,
      precio_recargas: 0,
      precio_fijo_efectivo: efec.total,
      precio_total: transf.total,
      esWalkin: true,
      isGuest: d.isGuest,
      checkin: {
        presente: true,
        pago_estado: gratis ? "socio_presente" : d.pago,
        pago_monto: gratis ? 0 : d.pago === "efectivo" ? efec.total : transf.total,
        nota: null,
      },
    };
    setRows((prev) => [...prev, nueva]);
  };

  /**
   * Cambia el tipo de jugador y/o el chaleco de una fila ya existente, y
   * recalcula lo que hay que cobrarle.
   *
   * Optimista para que el cambio se vea al toque, pero al volver el server
   * la fila se reescribe con los precios que él calculó: el cliente no
   * conoce el estado de cuota de un socio, así que su cuenta puede diferir
   * y la que manda es la del server.
   */
  const updateEquipo = (r: Inscripcion, tipo: Tipo, chaleco: boolean) => {
    const snapshot = r;
    setPendingId(r.id);
    setError(null);

    const metodoPrev = snapshot.checkin?.pago_estado ?? null;
    const montoPrev = snapshot.checkin?.pago_monto ?? null;
    // Si el admin escribió un monto a mano, no se lo pisamos… salvo que el
    // medio de pago tenga que cambiar (ver abajo).
    const montoSinEditar =
      montoPrev == null ||
      montoPrev === montoDeMetodo(snapshot, metodoPrev, preciosRecargas);

    /** Reconstruye la fila con un desglose de precios dado. */
    const conPrecios = (p: {
      entrada: number;
      alquiler: number;
      fijoEfectivo: number;
      socio: boolean;
    }): Inscripcion => ({
      ...snapshot,
      socio: p.socio,
      tipo_jugador:
        tipo === "alquiler_basico" || tipo === "alquiler_avanzado"
          ? "alquiler"
          : "byop",
      alquila_marcadora: tipo === "alquiler_basico",
      alquila_premium: tipo === "alquiler_avanzado",
      alquila_chaleco: chaleco,
      precio_entrada: p.entrada,
      precio_alquiler: p.alquiler,
      precio_fijo_efectivo: p.fijoEfectivo,
      precio_total: p.entrada + p.alquiler + snapshot.precio_recargas,
    });

    const socioOptimista = snapshot.isGuest ? tipo === "socio" : snapshot.socio;
    const optsOpt = opcionesDePrecio(tipo, chaleco, socioOptimista, precios);
    const filaOptimista = conPrecios({
      entrada: calcularPrecioInscripcion(optsOpt, "transferencia").entrada,
      alquiler: calcularPrecioInscripcion(optsOpt, "transferencia").alquiler,
      fijoEfectivo: calcularPrecioInscripcion(optsOpt, "efectivo").total,
      socio: socioOptimista,
    });
    setRows((prev) => prev.map((x) => (x.id === r.id ? filaOptimista : x)));

    startTransition(async () => {
      const res = await actualizarEquipoInscripcionAction({
        inscripcionId: r.id,
        tipo,
        chaleco,
      });
      if ("error" in res) {
        setRows((prev) => prev.map((x) => (x.id === r.id ? snapshot : x)));
        setError(res.error);
        setPendingId(null);
        return;
      }

      const fila = conPrecios({
        entrada: res.precio_entrada,
        alquiler: res.precio_alquiler,
        fijoEfectivo: res.precio_fijo_efectivo,
        socio: res.socio,
      });

      // El medio de pago tiene que seguir al precio. Si el jugador pasó a
      // entrar sin cargo, queda registrado como socio; si venía marcado como
      // socio y ahora tiene que pagar, se limpia para que el admin elija —
      // dejarlo en 'socio_presente' lo cobraría $0.
      //
      // La cuenta va contra el total, no contra entrada+alquiler: un socio con
      // recargas cargadas tiene que pagar las recargas, y 'socio_presente'
      // cobra 0 sí o sí.
      const metodo =
        res.socio && fila.precio_total === 0
          ? "socio_presente"
          : metodoPrev === "socio_presente" && fila.precio_total > 0
            ? null
            : metodoPrev;
      const monto =
        montoSinEditar || metodo !== metodoPrev
          ? montoDeMetodo(fila, metodo, preciosRecargas)
          : montoPrev;

      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...fila,
                checkin: x.checkin
                  ? { ...x.checkin, pago_estado: metodo, pago_monto: monto }
                  : x.checkin,
              }
            : x,
        ),
      );

      // Solo hay algo que persistir si la fila ya tenía check-in; si todavía
      // no se marcó presente, el monto se arma recién al marcarlo.
      if (snapshot.checkin && (metodo !== metodoPrev || monto !== montoPrev)) {
        await upsertCheckinAction(r.id, {
          presente: snapshot.checkin.presente,
          pago_estado: metodo,
          pago_monto: monto,
          nota: snapshot.checkin.nota,
        });
      }
      setPendingId(null);
      router.refresh();
    });
  };

  /**
   * Borra un jugador de la partida. Optimista con rollback, igual que
   * `update`: si el servidor lo rechaza, la fila vuelve a su lugar en la lista.
   *
   * La confirmación distingue los dos casos, porque no pesan lo mismo: borrar
   * un walk-in solo deshace una carga del propio admin, mientras que borrar a
   * alguien que se anotó por su cuenta le saca el lugar sin avisarle.
   */
  const eliminarJugador = (r: Inscripcion) => {
    const aviso = r.esWalkin
      ? `¿Borrar a ${r.nombre} de esta partida? Se puede volver a cargar enseguida.`
      : `${r.nombre} se anotó por su cuenta. Si lo borrás pierde el lugar en la partida y no se le avisa. ¿Lo borrás igual?`;
    if (!confirm(aviso)) return;
    setPendingId(r.id);
    setError(null);

    const indice = rows.findIndex((x) => x.id === r.id);
    setRows((prev) => prev.filter((x) => x.id !== r.id));

    startTransition(async () => {
      const res = await eliminarInscripcionCheckinAction(r.id);
      if ("error" in res && res.error) {
        setError(res.error);
        // Se reinserta en la misma posición: si el borrado falló, la lista
        // tiene que quedar exactamente como estaba.
        setRows((prev) => {
          const copia = [...prev];
          copia.splice(indice < 0 ? copia.length : indice, 0, r);
          return copia;
        });
      } else {
        router.refresh();
      }
      setPendingId(null);
    });
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
            editando={editandoId === r.id}
            onToggle={togglePresente}
            onPatch={update}
            onUpdateRecargas={updateRecargas}
            onToggleEditar={setEditandoId}
            onEquipo={updateEquipo}
            onDelete={eliminarJugador}
            precios={precios}
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
                      {mostrarRecargas(r) && (
                        <div className="mt-2">
                          <RecargasControls
                            r={r}
                            precios={preciosRecargas}
                            onUpdate={updateRecargas}
                          />
                        </div>
                      )}
                      <div className="mt-1.5">
                        <AccionesFila
                          r={r}
                          precios={precios}
                          pending={isPending}
                          editando={editandoId === r.id}
                          onToggleEditar={setEditandoId}
                          onEquipo={updateEquipo}
                          onDelete={eliminarJugador}
                        />
                      </div>
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
  editando,
  onToggle,
  onPatch,
  onUpdateRecargas,
  onToggleEditar,
  onEquipo,
  onDelete,
  precios,
  preciosRecargas,
  contextoWa,
}: {
  r: Inscripcion;
  pending: boolean;
  editando: boolean;
  onToggle: (r: Inscripcion, checked: boolean) => void;
  onDelete: (r: Inscripcion) => void;
  onPatch: (id: string, patch: Partial<Checkin>) => void;
  onUpdateRecargas: (
    id: string,
    recargas: { tracer100: number; conv200: number },
  ) => void;
  onToggleEditar: (id: string | null) => void;
  onEquipo: (r: Inscripcion, tipo: Tipo, chaleco: boolean) => void;
  precios: PreciosConfig;
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
          <div className="mt-1.5">
            <AccionesFila
              r={r}
              precios={precios}
              pending={pending}
              editando={editando}
              onToggleEditar={onToggleEditar}
              onEquipo={onEquipo}
              onDelete={onDelete}
            />
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

      {mostrarRecargas(r) && (
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

/**
 * Correcciones sobre una fila: cambiar el equipo o sacar al jugador.
 *
 * Discretas a propósito y con el editor plegado: son para arreglar algo que
 * salió mal, no acciones de todos los días. Cambiarle el tipo a alguien
 * modifica lo que se le cobra, y borrar por accidente a alguien que ya pagó
 * es peor que tener que abrir un panel.
 */
function AccionesFila({
  r,
  precios,
  pending,
  editando,
  onToggleEditar,
  onEquipo,
  onDelete,
}: {
  r: Inscripcion;
  precios: PreciosConfig;
  pending: boolean;
  editando: boolean;
  onToggleEditar: (id: string | null) => void;
  onEquipo: (r: Inscripcion, tipo: Tipo, chaleco: boolean) => void;
  onDelete: (r: Inscripcion) => void;
}) {
  const accion =
    "font-mono fluid-xs uppercase tracking-[.18em] cursor-pointer disabled:opacity-50";
  return (
    <div>
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          disabled={pending}
          onClick={() => onToggleEditar(editando ? null : r.id)}
          className={`${accion} ${editando ? "text-orange" : "text-smoke hover:text-orange"}`}
        >
          {editando ? "Listo" : "Editar equipo"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDelete(r)}
          title={
            r.esWalkin
              ? "Borrar este jugador cargado a mano"
              : "Sacar a este jugador de la partida"
          }
          className={`${accion} text-smoke hover:text-orange-300`}
        >
          Borrar
        </button>
      </div>
      {editando && (
        <EquipoEditor r={r} precios={precios} pending={pending} onEquipo={onEquipo} />
      )}
    </div>
  );
}

/**
 * Cambia el tipo de jugador y el chaleco de una inscripción ya existente.
 *
 * Existe porque lo que la gente elige al anotarse no siempre es lo que pasa
 * en la puerta: se anotan de alquiler y traen equipo propio, piden el chaleco
 * recién al cambiarse, o eligen el básico y se llevan el avanzado.
 *
 * El tipo 'Socio' solo se ofrece en los jugadores cargados a mano. En una
 * cuenta el beneficio sale del perfil y del estado de cuota — un socio con la
 * cuota vencida paga como cualquiera, y eso no se saltea desde acá.
 */
function EquipoEditor({
  r,
  precios,
  pending,
  onEquipo,
}: {
  r: Inscripcion;
  precios: PreciosConfig;
  pending: boolean;
  onEquipo: (r: Inscripcion, tipo: Tipo, chaleco: boolean) => void;
}) {
  const tipoActual = tipoDeFila(r);
  const opciones = r.isGuest ? TIPOS_GUEST : TIPOS_CUENTA;
  const chalecoTienePrecio =
    precios.alquiler_chaleco.efectivo > 0 ||
    precios.alquiler_chaleco.transferencia > 0;

  return (
    <div className="mt-2 border border-rail/40 bg-ink/40 clip-notch p-2.5">
      <p className="sect-label mb-2">// Equipo</p>
      <div className="flex gap-1.5 flex-wrap">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => onEquipo(r, o.value, r.alquila_chaleco)}
            className={`px-2 py-1 font-mono fluid-xs uppercase tracking-[.15em] border transition cursor-pointer disabled:opacity-50 ${
              tipoActual === o.value
                ? "bg-orange text-ink border-orange"
                : "border-rail/60 text-ash hover:border-orange"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={r.alquila_chaleco}
          disabled={pending}
          onChange={(e) => onEquipo(r, tipoActual, e.target.checked)}
          className="w-4 h-4 accent-orange cursor-pointer"
        />
        <span className="font-mono fluid-xs uppercase tracking-[.15em] text-ash">
          Chaleco
          {chalecoTienePrecio && (
            <span className="text-smoke normal-case tracking-normal">
              {" "}
              + {dualLabel(precios.alquiler_chaleco)}
            </span>
          )}
        </span>
      </label>
      {!r.isGuest && r.socio && (
        <p className="mt-2 font-mono fluid-xs text-smoke">
          Socio se toma de la cuenta.
        </p>
      )}
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
