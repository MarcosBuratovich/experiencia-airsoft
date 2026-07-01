"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SlotEstado } from "@/lib/slots-privada";
import {
  crearPartidaDirectaAction,
  solicitarPrivadaAction,
  toggleSlotOverrideAction,
  type CrearDirectaState,
  type SolicitarPrivadaState,
} from "../actions";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";
import { useModalA11y } from "../../components/use-modal-a11y";

const PRIVADA_CUPO_MIN = 10;
const PRIVADA_CUPO_MAX = 60;

function readErr(state: unknown) {
  if (!state || typeof state !== "object") return { error: undefined, formErrors: undefined };
  const s = state as { error?: FriendlyError; formErrors?: Record<string, string[]> };
  return { error: s.error, formErrors: s.formErrors };
}

type SlotItem = {
  fecha: string;
  hora: string;
  label: string;
  estado: SlotEstado;
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatFecha(iso: string): { dia: string; numero: number; mes: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    dia: DIAS_CORTOS[diaSemanaDe(iso)],
    numero: d,
    mes: dt.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""),
  };
}

/**
 * Maneja inputs numéricos enteros positivos con cap superior.
 * - Strippea cualquier char que no sea dígito (mata signo negativo,
 *   punto decimal, scientific notation, etc.).
 * - Cap se aplica on-blur para no interrumpir la escritura.
 */
function makeIntHandlers(
  set: (v: string) => void,
  max: number,
): {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
} {
  return {
    onChange: (e) => set(e.target.value.replace(/[^\d]/g, "")),
    onBlur: (e) => {
      const v = e.target.value;
      if (v === "") return;
      const n = Number(v);
      if (Number.isNaN(n)) return set("");
      set(String(Math.min(max, n)));
    },
  };
}

const initialReq: SolicitarPrivadaState = undefined;
const initialDir: CrearDirectaState = undefined;

export function CalendarioPrivada({
  slots,
  isAdmin,
}: {
  slots: SlotItem[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<SlotItem | null>(null);
  const router = useRouter();

  const grupos = useMemo(() => {
    const m = new Map<string, SlotItem[]>();
    for (const s of slots) {
      const arr = m.get(s.fecha) ?? [];
      arr.push(s);
      m.set(s.fecha, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  const onCellClick = (s: SlotItem) => {
    // Admin puede tocar cualquier slot que no esté en el pasado y que no
    // tenga ya una partida (público/aprobada) o pendiente.
    if (isAdmin) {
      if (
        s.estado === "pasada" ||
        s.estado === "publica" ||
        s.estado === "aprobada" ||
        s.estado === "pendiente"
      )
        return;
      setSelected(s);
      return;
    }
    if (s.estado === "disponible") setSelected(s);
  };

  return (
    <>
      <div className="space-y-3">
        {grupos.map(([fecha, items]) => {
          const { dia, numero, mes } = formatFecha(fecha);
          const allBlocked = items.every((i) => i.estado !== "disponible");
          return (
            <div
              key={fecha}
              className={`border ${
                allBlocked ? "border-rail/40" : "border-rail/60"
              } bg-carbon clip-notch p-3 sm:p-4`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`font-display fluid-xl uppercase leading-none ${
                    allBlocked ? "text-smoke" : "text-bone"
                  }`}
                >
                  {numero}
                  <span className="ml-1 fluid-sm text-smoke">{mes}</span>
                </div>
                <div className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke">
                  {dia}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {items.map((s) => (
                  <SlotButton
                    key={`${s.fecha}|${s.hora}`}
                    slot={s}
                    isAdmin={isAdmin}
                    onClick={() => onCellClick(s)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <SlotModal
          slot={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </>
  );
}

function SlotModal({
  slot,
  isAdmin,
  onClose,
  onChanged,
}: {
  slot: SlotItem;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const adminDefault = isAdmin && slot.estado === "reservada" ? "liberar" : "crear";
  const [mode, setMode] = useState<"crear" | "liberar" | "solicitar">(
    isAdmin ? adminDefault : "solicitar",
  );

  const fechaInfo = formatFecha(slot.fecha);
  const titulo = `${DIAS_LARGOS[diaSemanaDe(slot.fecha)]} ${fechaInfo.numero} ${fechaInfo.mes}`;
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
            <p className="sect-label mb-1">// {isAdmin ? "Admin · slot" : "Reservar slot"}</p>
            <h2 className="font-display fluid-xl uppercase tracking-wider text-bone">
              {titulo}
            </h2>
            <p className="mt-1 font-mono fluid-xs uppercase tracking-[.22em] text-orange">
              {slot.label}
            </p>
            {slot.estado !== "disponible" && (
              <p className="mt-2 font-mono fluid-xs uppercase tracking-[.18em] text-smoke">
                Estado actual: {slot.estado}
              </p>
            )}
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

        {isAdmin && (
          <div className="flex gap-2 px-5 pt-4 flex-wrap">
            <button
              type="button"
              onClick={() => setMode("crear")}
              className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                mode === "crear"
                  ? "bg-orange text-ink"
                  : "border border-rail/60 text-ash hover:text-bone"
              }`}
            >
              Crear directo
            </button>
            {slot.estado === "reservada" && (
              <button
                type="button"
                onClick={() => setMode("liberar")}
                className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                  mode === "liberar"
                    ? "bg-orange text-ink"
                    : "border border-rail/60 text-ash hover:text-bone"
                }`}
              >
                Liberar para usuarios
              </button>
            )}
          </div>
        )}

        {mode === "solicitar" && (
          <FormSolicitar slot={slot} onClose={onClose} onChanged={onChanged} />
        )}
        {mode === "crear" && (
          <FormAdminCrear slot={slot} onClose={onClose} onChanged={onChanged} />
        )}
        {mode === "liberar" && (
          <FormAdminLiberar slot={slot} onClose={onClose} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}

function FormSolicitar({
  slot,
  onClose,
  onChanged: _onChanged,
}: {
  slot: SlotItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [cant, setCant] = useState(String(PRIVADA_CUPO_MIN));
  const [notas, setNotas] = useState("");
  const [state, action, pending] = useActionState(
    solicitarPrivadaAction,
    initialReq,
  );
  const router = useRouter();
  const handledRef = useRef(false);

  const cantNum = Number(cant) || 0;
  const cantValida = cantNum >= PRIVADA_CUPO_MIN && cantNum <= PRIVADA_CUPO_MAX;

  // Cuando el server responde ok, intentamos abrir WhatsApp. NO navegamos
  // automáticamente: mostramos una pantalla de éxito con el link a mano por si
  // el navegador bloqueó el popup (Safari / in-app de IG/FB). Ref para no
  // abrir dos veces.
  useEffect(() => {
    if (handledRef.current) return;
    if (!state || !("ok" in state) || !state.ok) return;
    handledRef.current = true;
    if (typeof window !== "undefined") {
      window.open(state.hrefWA, "_blank", "noopener,noreferrer");
    }
  }, [state]);

  if (state && "ok" in state && state.ok) {
    return (
      <div className="p-5 space-y-4">
        <div className="border border-green-500/40 bg-green-500/5 clip-notch p-4">
          <p className="sect-label mb-1 text-green-400">// Solicitud enviada</p>
          <p className="font-sans fluid-sm text-bone leading-relaxed">
            Te abrimos WhatsApp con el mensaje listo para coordinar con el dueño.
            Si no se abrió, tocá el botón.
          </p>
        </div>
        <a
          href={state.hrefWA}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa w-full px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold inline-flex items-center justify-center"
        >
          Abrir WhatsApp
        </a>
        <button
          type="button"
          onClick={() => router.push("/mis-solicitudes?ok=1")}
          className="btn-ghost w-full px-4 py-2.5 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
        >
          Ver mis solicitudes
        </button>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="fecha_propuesta" value={slot.fecha} />
      <input type="hidden" name="hora_inicio" value={slot.hora} />

      <div className="p-5 space-y-4">
        <div className="border border-orange/40 bg-orange/5 clip-notch p-3">
          <p className="sect-label mb-1 text-orange">// Cómo sigue</p>
          <p className="font-sans fluid-sm text-ash leading-relaxed">
            Cuando confirmes, te abrimos <span className="text-bone">WhatsApp con el mensaje listo</span> para
            coordinar con el dueño (fecha, gente, equipo). El slot queda
            bloqueado mientras coordinamos.
          </p>
        </div>

        <label className="block">
          <span className="sect-label mb-1 block">¿Cuántas personas?</span>
          <input
            name="cupo_estimado"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={2}
            value={cant}
            {...makeIntHandlers(setCant, PRIVADA_CUPO_MAX)}
            required
            className={`w-full bg-ink border px-3 py-2.5 font-mono text-bone focus:border-orange outline-none ${
              cant && !cantValida ? "border-orange-300" : "border-rail/60"
            }`}
          />
          <span
            className={`mt-1 block font-mono fluid-xs ${
              cant && !cantValida ? "text-orange-300" : "text-smoke"
            }`}
          >
            Mínimo {PRIVADA_CUPO_MIN} personas · máximo {PRIVADA_CUPO_MAX}.{" "}
            Las privadas se arman desde {PRIVADA_CUPO_MIN} para arriba.
          </span>
          {readErr(state).formErrors?.cupo_estimado?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {readErr(state).formErrors!.cupo_estimado[0]}
            </span>
          )}
        </label>

        <label className="block">
          <span className="sect-label mb-1 block">
            ¿Qué tipo de evento es? (opcional)
          </span>
          <textarea
            name="notas"
            rows={3}
            maxLength={500}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Cumpleaños, despedida, junta de clan, evento corporativo, etc."
            className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
          />
          <span className="mt-1 block font-mono fluid-xs text-smoke">
            Va a aparecer en el mensaje de WhatsApp para que el dueño tenga
            contexto.
          </span>
        </label>

        <ErrorBanner error={readErr(state).error} />
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !cantValida}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Abriendo WhatsApp..." : "Coordinar por WhatsApp"}
        </button>
      </div>
    </form>
  );
}

const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

function FormAdminCrear({
  slot,
  onClose,
  onChanged,
}: {
  slot: SlotItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [visibilidad, setVisibilidad] = useState<"privada" | "publica">(
    "privada",
  );
  const [cupo, setCupo] = useState("20");
  const [modalidad, setModalidad] = useState("dinamica");
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [state, action, pending] = useActionState(
    crearPartidaDirectaAction,
    initialDir,
  );
  const handledRef = useRef(false);

  // Side-effects (refresh + cerrar modal) en un effect, no durante el render:
  // onClose hace setState en el padre y onChanged es router.refresh(). El ref
  // garantiza que corran una sola vez (mismo patrón que FormSolicitar).
  useEffect(() => {
    if (handledRef.current) return;
    if (!state || !("ok" in state) || !state.ok) return;
    handledRef.current = true;
    onChanged();
    onClose();
  }, [state, onChanged, onClose]);

  return (
    <form action={action}>
      <input type="hidden" name="fecha" value={slot.fecha} />
      <input type="hidden" name="hora_inicio" value={slot.hora} />
      <input type="hidden" name="visibilidad" value={visibilidad} />
      <input type="hidden" name="modalidad" value={modalidad} />

      <div className="p-5 space-y-4">
        <div>
          <span className="sect-label mb-1 block">Tipo de partida</span>
          <div className="flex gap-2">
            {(["privada", "publica"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibilidad(v)}
                className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                  visibilidad === v
                    ? "bg-orange text-ink"
                    : "border border-rail/60 text-ash hover:text-bone"
                }`}
              >
                {v === "privada" ? "Privada (con token)" : "Pública"}
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
          <span className="sect-label mb-1 block">Cupo máximo</span>
          <input
            name="cupo_max"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={2}
            value={cupo}
            {...makeIntHandlers(setCupo, 60)}
            required
            className="w-full bg-ink border border-rail/60 px-3 py-2.5 font-mono text-bone focus:border-orange outline-none"
          />
          {readErr(state).formErrors?.cupo_max?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {readErr(state).formErrors!.cupo_max[0]}
            </span>
          )}
        </label>

        <label className="block">
          <span className="sect-label mb-1 block">Título (opcional)</span>
          <input
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={80}
            placeholder="Ej: Cumple Juan / Open public night"
            className="w-full bg-ink border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none"
          />
        </label>

        <label className="block">
          <span className="sect-label mb-1 block">Notas (opcional)</span>
          <textarea
            name="notas"
            rows={2}
            maxLength={500}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full bg-ink border border-rail/60 px-3 py-2 font-sans text-bone focus:border-orange outline-none resize-y"
          />
        </label>

        <ErrorBanner error={readErr(state).error} />
        {slot.estado === "reservada" && (
          <p className="font-mono fluid-xs text-orange-300">
            Slot reservado — la partida igual se va a crear y bloquear el slot.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap p-5 border-t border-rail/40">
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
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
  );
}

function FormAdminLiberar({
  slot,
  onClose,
  onChanged,
}: {
  slot: SlotItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<FriendlyError | null>(null);

  const ejecutar = (habilitado: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleSlotOverrideAction(slot.fecha, slot.hora, habilitado);
      if ("error" in res && res.error) setError(res.error);
      else {
        onChanged();
        onClose();
      }
    });
  };

  return (
    <div>
      <div className="p-5 space-y-3">
        <p className="font-sans fluid-sm text-ash leading-relaxed">
          Este slot está reservado para partidas públicas. Si lo liberás, los
          usuarios pueden pedirlo como privada igual que cualquier otro slot
          libre.
        </p>
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
          type="button"
          onClick={() => ejecutar(true)}
          disabled={pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Liberando..." : "Liberar slot"}
        </button>
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  isAdmin,
  onClick,
}: {
  slot: SlotItem;
  isAdmin: boolean;
  onClick: () => void;
}) {
  const meta = SLOT_STYLES[slot.estado];
  // Admin puede tocar slots libres y reservados; user solo libres.
  const enabled = isAdmin
    ? slot.estado === "disponible" || slot.estado === "reservada"
    : slot.estado === "disponible";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={meta.tooltip}
      className={`px-2 py-2 clip-notch text-left transition ${meta.cls} ${
        enabled ? "cursor-pointer hover:border-orange" : "cursor-not-allowed"
      }`}
    >
      <span className="block font-mono fluid-xs uppercase tracking-[.18em]">
        {slot.label}
      </span>
      <span className="block font-mono text-[10px] tracking-[.15em] uppercase mt-0.5 opacity-80">
        {meta.tag}
      </span>
    </button>
  );
}

// Paleta tactical-style: cada estado tiene un color base distinguible
// para que el usuario vea el calendario y entienda de un vistazo qué
// puede tocar y qué está bloqueado. Los colores usan estándar de
// semáforo táctico (verde=go, ámbar=warning, rojo=ocupado).
const SLOT_STYLES: Record<
  SlotEstado,
  { cls: string; tag: string; tooltip: string }
> = {
  disponible: {
    cls: "border border-green-500/50 bg-green-500/5 text-green-400",
    tag: "Libre",
    tooltip: "Disponible — click para reservar",
  },
  pendiente: {
    cls: "border border-orange/60 bg-orange/15 text-orange",
    tag: "Pendiente",
    tooltip: "Hay una solicitud pendiente de aprobación",
  },
  publica: {
    cls: "border border-red-400/50 bg-red-500/10 text-red-300",
    tag: "Pública",
    tooltip: "Ya hay una partida pública en este rango",
  },
  aprobada: {
    cls: "border border-orange bg-orange/30 text-bone",
    tag: "Tomado",
    tooltip: "Ya hay una privada confirmada",
  },
  reservada: {
    cls: "border border-dashed border-amber-500/60 bg-amber-500/5 text-amber-400",
    tag: "Reservado",
    tooltip: "Slot reservado para públicas — admin puede liberarlo",
  },
  pasada: {
    cls: "border border-rail/30 bg-ink/20 text-smoke opacity-40",
    tag: "Pasada",
    tooltip: "Ya pasó",
  },
};
