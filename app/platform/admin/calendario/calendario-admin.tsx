"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sumarDias, diaSemanaDe } from "@/lib/semana";
import { formatFechaHora, formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import type { EstadoEfectivo } from "@/lib/partidas";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "@/app/_components/error-banner";
import { useModalA11y } from "../../components/use-modal-a11y";
import {
  editarPartidaAction,
  crearPartidaCalendarioAction,
  eliminarPartidaCalendarioAction,
  cancelarPartidaAction,
  cerrarInscripcionPartidaAction,
  reabrirInscripcionPartidaAction,
  type EditarPartidaState,
  type CrearCalendarioState,
} from "../partidas/actions";
import {
  aprobarPrivadaAction,
  rechazarPrivadaAction,
} from "../../privada/actions";

export type ItemPartida = {
  tipo: "partida";
  id: string;
  fecha: string;
  hora: string;
  titulo: string;
  modalidad: string;
  visibilidad: string;
  estado: string;
  estadoFx: EstadoEfectivo;
  cupoMax: number;
  inscriptos: number;
  duracionMin: number;
  privateToken: string | null;
  organizadorId: string | null;
  notas: string | null;
};

export type ItemSolicitud = {
  tipo: "solicitud";
  id: string;
  fecha: string;
  hora: string;
  modalidad: string;
  cupoEstimado: number;
  duracionMin: number;
  notas: string | null;
  createdAt: string;
  solicitante: string;
  celular: string | null;
};

export type ItemDia = ItemPartida | ItemSolicitud;

const DIAS_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

function readErr(state: unknown) {
  if (!state || typeof state !== "object") return { error: undefined, formErrors: undefined };
  const s = state as { error?: FriendlyError; formErrors?: Record<string, string[]> };
  return { error: s.error, formErrors: s.formErrors };
}

function diaNumero(iso: string): number {
  return Number(iso.split("-")[2]);
}

/** Link wa.me al solicitante con mensaje pre-armado sobre su reserva. */
function waLinkSol(it: ItemSolicitud): string {
  const num = (it.celular ?? "").replace(/\D/g, "");
  const msg = `Hola ${it.solicitante}! Sobre tu reserva de privada para ${formatFechaLarga(it.fecha)} ${formatHora(it.hora)} hs (~${it.cupoEstimado} personas).`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function colorPartida(it: ItemPartida): string {
  if (it.estadoFx === "cancelada")
    return "border-rail/40 bg-ink/30 text-smoke line-through";
  if (it.estadoFx === "pasada")
    return "border-rail/40 bg-ink/30 text-smoke opacity-70";
  if (it.estadoFx === "en_curso") return "border-orange bg-orange text-ink";
  if (it.visibilidad === "privada") return "border-orange bg-orange/25 text-bone";
  if (it.estado === "cerrada")
    return "border-amber-500/60 bg-amber-500/10 text-amber-300";
  return "border-red-400/50 bg-red-500/10 text-red-200";
}

export function CalendarioAdmin({
  items,
  mes,
  hoy,
}: {
  items: ItemDia[];
  mes: string;
  hoy: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ItemDia | null>(null);
  const [crearFecha, setCrearFecha] = useState<string | null>(null);

  const porFecha = useMemo(() => {
    const m = new Map<string, ItemDia[]>();
    for (const it of items) {
      const arr = m.get(it.fecha) ?? [];
      arr.push(it);
      m.set(it.fecha, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.hora.localeCompare(b.hora));
    return m;
  }, [items]);

  const celdas = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
    const padInicial = (diaSemanaDe(primerDia) + 6) % 7; // lunes = 0
    const inicioGrilla = sumarDias(primerDia, -padInicial);
    const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const total = Math.ceil((padInicial + diasMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => sumarDias(inicioGrilla, i));
  }, [mes]);

  const semanas = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < celdas.length; i += 7) out.push(celdas.slice(i, i + 7));
    return out;
  }, [celdas]);

  const diasConItems = useMemo(
    () => celdas.filter((f) => f.startsWith(mes) && (porFecha.get(f)?.length ?? 0) > 0),
    [celdas, mes, porFecha],
  );

  const onChanged = () => router.refresh();

  return (
    <>
      <Leyenda />

      {/* Desktop — grilla mensual (solo en pantallas anchas; abajo, agenda) */}
      <div className="hidden lg:block border border-rail/60 clip-notch overflow-hidden">
        <div className="grid grid-cols-7 bg-carbon">
          {DIAS_HEADER.map((d) => (
            <div
              key={d}
              className="px-3 py-3 text-center font-mono fluid-xs uppercase tracking-[.25em] text-smoke border-b border-rail/40"
            >
              {d}
            </div>
          ))}
        </div>
        {semanas.map((semana, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {semana.map((fecha) => {
              const delMes = fecha.startsWith(mes);
              const esHoy = fecha === hoy;
              const dayItems = porFecha.get(fecha) ?? [];
              return (
                <div
                  key={fecha}
                  className={`group min-h-[160px] border-t border-l border-rail/30 p-2.5 ${
                    delMes ? "" : "bg-ink/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`font-mono fluid-sm leading-none ${
                        esHoy
                          ? "bg-orange text-ink px-1.5 py-0.5 rounded-sm font-semibold"
                          : delMes
                            ? "text-ash"
                            : "text-smoke/40"
                      }`}
                    >
                      {diaNumero(fecha)}
                    </span>
                    {delMes && (
                      <button
                        type="button"
                        onClick={() => setCrearFecha(fecha)}
                        className="w-6 h-6 flex items-center justify-center text-smoke hover:text-orange hover:bg-orange/10 font-mono text-lg leading-none cursor-pointer rounded-sm opacity-0 group-hover:opacity-100 transition"
                        aria-label="Crear partida"
                        title="Crear partida"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {dayItems.map((it) => (
                      <Chip key={`${it.tipo}-${it.id}`} it={it} onClick={() => setSelected(it)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Agenda (mobile/tablet — solo días con items) */}
      <div className="lg:hidden space-y-3">
        <button
          type="button"
          onClick={() => setCrearFecha(hoy.startsWith(mes) ? hoy : `${mes}-01`)}
          className="w-full btn-wa px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
        >
          + Crear partida
        </button>
        {!diasConItems.length ? (
          <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
            <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">
              Sin partidas ni reservas este mes.
            </p>
          </div>
        ) : (
          diasConItems.map((fecha) => (
            <div key={fecha} className="border border-rail/60 bg-carbon clip-notch p-3">
              <p className="sect-label mb-2">{formatFechaLarga(fecha)}</p>
              <div className="space-y-1">
                {(porFecha.get(fecha) ?? []).map((it) => (
                  <Chip
                    key={`${it.tipo}-${it.id}`}
                    it={it}
                    onClick={() => setSelected(it)}
                    full
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {selected?.tipo === "partida" && (
        <PartidaModal
          it={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
      {selected?.tipo === "solicitud" && (
        <SolicitudModal
          it={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
      {crearFecha && (
        <CrearModal
          fecha={crearFecha}
          onClose={() => setCrearFecha(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function Chip({ it, onClick, full }: { it: ItemDia; onClick: () => void; full?: boolean }) {
  const cls =
    it.tipo === "solicitud"
      ? "border-dashed border-orange/60 bg-orange/15 text-orange"
      : colorPartida(it);
  const label =
    it.tipo === "solicitud"
      ? `${formatHora(it.hora)} · reserva`
      : `${formatHora(it.hora)} · ${modalidadLabel(it.modalidad)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left px-2 py-1.5 clip-notch border font-mono text-[11px] tracking-[.06em] uppercase truncate cursor-pointer hover:border-orange ${cls} ${
        full ? "fluid-xs py-2" : ""
      }`}
      title={label}
    >
      {label}
      {it.tipo === "partida" && (
        <span className="opacity-80"> · {it.inscriptos}/{it.cupoMax}</span>
      )}
    </button>
  );
}

function Leyenda() {
  const items = [
    { cls: "bg-red-500/10 border-red-400/50 text-red-200", label: "Pública" },
    { cls: "bg-orange/25 border-orange text-bone", label: "Privada" },
    { cls: "bg-amber-500/10 border-amber-500/60 text-amber-300", label: "Cerrada" },
    { cls: "bg-orange border-orange text-ink", label: "En curso" },
    { cls: "border-dashed border-orange/60 bg-orange/15 text-orange", label: "Reserva" },
    { cls: "bg-ink/30 border-rail/40 text-smoke", label: "Pasada" },
  ];
  return (
    <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono fluid-xs uppercase tracking-[.12em]">
      {items.map((i) => (
        <div key={i.label} className={`border px-2 py-1 clip-notch text-center ${i.cls}`}>
          {i.label}
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Shell de modal (mismo patrón que el calendario de privadas)
// ===========================================================================

function ModalShell({
  titulo,
  subtitulo,
  onClose,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="bg-carbon border border-rail/60 w-full max-w-md clip-notch outline-none"
      >
        <div className="flex items-start justify-between p-5 border-b border-rail/40">
          <div>
            {subtitulo && <p className="sect-label mb-1">// {subtitulo}</p>}
            <h2 className="font-display fluid-xl uppercase tracking-wider text-bone">
              {titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-smoke hover:text-bone font-mono text-3xl leading-none cursor-pointer pl-3"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===========================================================================
// Modal de PARTIDA (ver + editar + acciones de estado)
// ===========================================================================

function PartidaModal({
  it,
  onClose,
  onChanged,
}: {
  it: ItemPartida;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const titulo = `${diaNumero(it.fecha)} · ${formatHora(it.hora)}`;

  return (
    <ModalShell
      titulo={titulo}
      subtitulo={mode === "edit" ? "Editar partida" : "Partida"}
      onClose={onClose}
    >
      {mode === "view" ? (
        <PartidaView it={it} onEdit={() => setMode("edit")} onClose={onClose} onChanged={onChanged} />
      ) : (
        <FormEditar it={it} onCancel={() => setMode("view")} onClose={onClose} onChanged={onChanged} />
      )}
    </ModalShell>
  );
}

function PartidaView({
  it,
  onEdit,
  onClose,
  onChanged,
}: {
  it: ItemPartida;
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<FriendlyError | null>(null);

  const futura = it.estadoFx === "futura";
  const editable = futura;
  const cancelable = futura || it.estadoFx === "en_curso";

  const run = (
    fn: () => Promise<{ error?: FriendlyError; ok?: boolean }>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else {
        onChanged();
        onClose();
      }
    });
  };

  return (
    <div>
      <div className="p-5 space-y-2 font-mono fluid-xs text-ash">
        <p className="text-bone font-display fluid-base uppercase tracking-wider">
          {modalidadLabel(it.modalidad)} {it.visibilidad === "privada" ? "· privada" : ""}
        </p>
        <p>{formatFechaLarga(it.fecha)} · {formatHora(it.hora)} hs · {it.duracionMin} min</p>
        <p>Cupo: {it.inscriptos}/{it.cupoMax} · Estado: {it.estado} ({it.estadoFx})</p>
        {it.organizadorId && <p className="text-orange">Tiene organizador asignado</p>}
        {it.notas && <p className="text-smoke normal-case tracking-normal font-sans">{it.notas}</p>}
        <Link
          href={`/admin/partidas/${it.id}/checkin`}
          className="inline-block mt-1 text-orange hover:underline"
        >
          Ir al check-in →
        </Link>
      </div>

      <ErrorBanner error={error} variant="inline" className="mx-5" />

      <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Editar
          </button>
        )}
        {futura && it.estado === "abierta" && (
          <button
            type="button"
            onClick={() => run(() => cerrarInscripcionPartidaAction(it.id))}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cerrar insc.
          </button>
        )}
        {futura && it.estado === "cerrada" && (
          <button
            type="button"
            onClick={() => run(() => reabrirInscripcionPartidaAction(it.id))}
            disabled={pending}
            className="btn-ghost px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Reabrir insc.
          </button>
        )}
        {cancelable && (
          <button
            type="button"
            onClick={() => run(() => cancelarPartidaAction(it.id), "¿Cancelar esta partida?")}
            disabled={pending}
            className="px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer border border-orange-300/50 text-orange-300 hover:bg-orange-300/10 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        {futura && (
          <button
            type="button"
            onClick={() =>
              run(
                () => eliminarPartidaCalendarioAction(it.id),
                "¿Eliminar la partida? Se borran inscripciones y check-ins.",
              )
            }
            disabled={pending}
            className="px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer border border-red-400/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function FormEditar({
  it,
  onCancel,
  onClose,
  onChanged,
}: {
  it: ItemPartida;
  onCancel: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [state, action, pending] = useActionState<EditarPartidaState, FormData>(
    editarPartidaAction,
    undefined,
  );
  const [modalidad, setModalidad] = useState(it.modalidad);
  const handledRef = useRef(false);
  const { error, formErrors } = readErr(state);

  useEffect(() => {
    if (handledRef.current) return;
    if (!state || !("ok" in state) || !state.ok) return;
    handledRef.current = true;
    onChanged();
    onClose();
  }, [state, onChanged, onClose]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={it.id} />
      <input type="hidden" name="modalidad" value={modalidad} />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="sect-label mb-1 block">Fecha</span>
            <input
              type="date"
              name="fecha"
              defaultValue={it.fecha}
              required
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
            />
            <FieldErr msgs={formErrors?.fecha} />
          </label>
          <label className="block">
            <span className="sect-label mb-1 block">Hora</span>
            <input
              type="time"
              name="hora_inicio"
              defaultValue={formatHora(it.hora)}
              required
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
            />
            <FieldErr msgs={formErrors?.hora_inicio} />
          </label>
          <label className="block">
            <span className="sect-label mb-1 block">Duración (min)</span>
            <input
              type="number"
              name="duracion_min"
              defaultValue={it.duracionMin}
              min={60}
              max={480}
              required
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
            />
            <FieldErr msgs={formErrors?.duracion_min} />
          </label>
          <label className="block">
            <span className="sect-label mb-1 block">Cupo</span>
            <input
              type="number"
              name="cupo_max"
              defaultValue={it.cupoMax}
              min={1}
              required
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
            />
            <FieldErr msgs={formErrors?.cupo_max} />
          </label>
        </div>

        <div>
          <span className="sect-label mb-1 block">Modalidad</span>
          <div className="flex gap-2 flex-wrap">
            {MODALIDAD_OPTS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setModalidad(m.value)}
                className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                  modalidad === m.value
                    ? "bg-orange text-ink"
                    : "border border-rail/60 text-ash hover:text-bone"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="sect-label mb-1 block">Notas (opcional)</span>
          <textarea
            name="notas"
            rows={2}
            maxLength={500}
            defaultValue={it.notas ?? ""}
            className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
          />
        </label>

        {it.inscriptos > 0 && (
          <p className="font-mono fluid-xs text-orange-300">
            Hay {it.inscriptos} inscriptos; verán el cambio de fecha/hora.
          </p>
        )}
        <ErrorBanner error={error} variant="inline" />
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          Volver
        </button>
        <button
          type="submit"
          disabled={pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ===========================================================================
// Modal de SOLICITUD (aprobar / rechazar)
// ===========================================================================

function SolicitudModal({
  it,
  onClose,
  onChanged,
}: {
  it: ItemSolicitud;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pending, startTransition] = useTransition();

  const resolver = (fn: () => Promise<{ error?: FriendlyError; ok?: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else {
        onChanged();
        onClose();
      }
    });
  };

  return (
    <ModalShell
      titulo={`${diaNumero(it.fecha)} · ${formatHora(it.hora)}`}
      subtitulo="Reserva pendiente"
      onClose={onClose}
    >
      <div className="p-5 space-y-2 font-mono fluid-xs text-ash">
        <p className="text-bone font-display fluid-base uppercase tracking-wider">
          {modalidadLabel(it.modalidad)} · privada
        </p>
        <p>{formatFechaLarga(it.fecha)} · {formatHora(it.hora)} hs · {it.duracionMin} min</p>
        <p>~{it.cupoEstimado} personas</p>
        <p>Solicita: <span className="text-bone">{it.solicitante}</span></p>
        {it.celular && (
          <p>
            <a
              href={waLinkSol(it)}
              target="_blank"
              rel="noopener"
              className="text-orange hover:underline"
            >
              WhatsApp {it.celular}
            </a>
          </p>
        )}
        <p className="text-smoke">Solicitada el {formatFechaHora(it.createdAt)}</p>
        {it.notas && <p className="text-smoke normal-case tracking-normal font-sans">{it.notas}</p>}
      </div>

      <div className="px-5">
        <label className="block">
          <span className="sect-label mb-1 block">Respuesta (opcional)</span>
          <textarea
            rows={2}
            maxLength={500}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
          />
        </label>
        <ErrorBanner error={error} variant="inline" className="mt-3" />
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
        <button
          type="button"
          onClick={() => resolver(() => rechazarPrivadaAction(it.id, respuesta))}
          disabled={pending}
          className="px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer border border-orange-300/50 text-orange-300 hover:bg-orange-300/10 disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          type="button"
          onClick={() => resolver(() => aprobarPrivadaAction(it.id, respuesta))}
          disabled={pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "..." : "Aprobar"}
        </button>
      </div>
    </ModalShell>
  );
}

// ===========================================================================
// Modal de CREAR partida
// ===========================================================================

function CrearModal({
  fecha,
  onClose,
  onChanged,
}: {
  fecha: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [state, action, pending] = useActionState<CrearCalendarioState, FormData>(
    crearPartidaCalendarioAction,
    undefined,
  );
  const [modalidad, setModalidad] = useState("dinamica");
  const [visibilidad, setVisibilidad] = useState<"publica" | "privada">("publica");
  const handledRef = useRef(false);
  const { error, formErrors } = readErr(state);

  useEffect(() => {
    if (handledRef.current) return;
    if (!state || !("ok" in state) || !state.ok) return;
    handledRef.current = true;
    onChanged();
    onClose();
  }, [state, onChanged, onClose]);

  return (
    <ModalShell titulo="Nueva partida" subtitulo="Crear" onClose={onClose}>
      <form action={action}>
        <input type="hidden" name="modalidad" value={modalidad} />
        <input type="hidden" name="visibilidad" value={visibilidad} />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="sect-label mb-1 block">Fecha</span>
              <input
                type="date"
                name="fecha"
                defaultValue={fecha}
                required
                className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
              />
              <FieldErr msgs={formErrors?.fecha} />
            </label>
            <label className="block">
              <span className="sect-label mb-1 block">Hora</span>
              <input
                type="time"
                name="hora_inicio"
                defaultValue="19:00"
                required
                className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
              />
              <FieldErr msgs={formErrors?.hora_inicio} />
            </label>
            <label className="block">
              <span className="sect-label mb-1 block">Duración (min)</span>
              <input
                type="number"
                name="duracion_min"
                defaultValue={240}
                min={60}
                max={480}
                required
                className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
              />
              <FieldErr msgs={formErrors?.duracion_min} />
            </label>
            <label className="block">
              <span className="sect-label mb-1 block">Cupo</span>
              <input
                type="number"
                name="cupo_max"
                defaultValue={30}
                min={1}
                required
                className="w-full bg-ink border border-rail/60 px-3 py-2 font-mono text-bone focus:border-orange outline-none"
              />
              <FieldErr msgs={formErrors?.cupo_max} />
            </label>
          </div>

          <div>
            <span className="sect-label mb-1 block">Tipo</span>
            <div className="flex gap-2">
              {(["publica", "privada"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibilidad(v)}
                  className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                    visibilidad === v ? "bg-orange text-ink" : "border border-rail/60 text-ash hover:text-bone"
                  }`}
                >
                  {v === "publica" ? "Pública" : "Privada"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="sect-label mb-1 block">Modalidad</span>
            <div className="flex gap-2 flex-wrap">
              {MODALIDAD_OPTS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModalidad(m.value)}
                  className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                    modalidad === m.value ? "bg-orange text-ink" : "border border-rail/60 text-ash hover:text-bone"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="sect-label mb-1 block">Título (opcional)</span>
            <input
              name="titulo"
              maxLength={80}
              placeholder="Ej: Cumple Juan"
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none"
            />
          </label>

          <label className="block">
            <span className="sect-label mb-1 block">Notas (opcional)</span>
            <textarea
              name="notas"
              rows={2}
              maxLength={500}
              className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
            />
          </label>

          <ErrorBanner error={error} variant="inline" />
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Creando..." : "Crear partida"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function FieldErr({ msgs }: { msgs?: string[] }) {
  if (!msgs?.[0]) return null;
  return <span className="mt-1 block font-mono fluid-xs text-orange-300">{msgs[0]}</span>;
}
