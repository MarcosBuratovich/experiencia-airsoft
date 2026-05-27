"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarTemplateAction, eliminarTemplateAction } from "./actions";
import { Select } from "../../components/select";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

type Template = {
  id: string;
  dia_semana: number;
  hora_inicio: string; // 'HH:MM'
  duracion_min: number;
  modalidad: "dinamica" | "tacsim" | "speedsoft" | string;
  cupo_max: number;
  activo: boolean;
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function TemplateRow({ template }: { template: Template }) {
  const [hora, setHora] = useState(template.hora_inicio);
  const [duracion, setDuracion] = useState(String(template.duracion_min));
  const [modalidad, setModalidad] = useState(template.modalidad);
  const [cupo, setCupo] = useState(String(template.cupo_max));
  const [activo, setActivo] = useState(template.activo);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  const dirty =
    hora !== template.hora_inicio ||
    Number(duracion) !== template.duracion_min ||
    modalidad !== template.modalidad ||
    Number(cupo) !== template.cupo_max ||
    activo !== template.activo;

  const guardar = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await actualizarTemplateAction({
        id: template.id,
        hora_inicio: hora,
        duracion_min: Number(duracion),
        modalidad: modalidad as "dinamica" | "tacsim" | "speedsoft",
        cupo_max: Number(cupo),
        activo,
      });
      if ("error" in res && res.error) {
        setError(typeof res.error === 'string' ? { titulo: res.error, mostrarSoporte: false } : res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  const eliminar = () => {
    setError(null);
    startDelete(async () => {
      const res = await eliminarTemplateAction({ id: template.id });
      if ("error" in res && res.error) {
        setError(typeof res.error === 'string' ? { titulo: res.error, mostrarSoporte: false } : res.error);
        setConfirmingDelete(false);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="border border-rail/60 bg-carbon clip-notch p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="font-display fluid-lg uppercase tracking-wider text-bone">
          {DIAS[template.dia_semana]}
        </span>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="w-4 h-4 accent-orange cursor-pointer"
          />
          <span className="font-mono fluid-xs uppercase tracking-[.2em] text-ash">
            {activo ? "Activo" : "Inactivo"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <label className="block">
          <span className="sect-label mb-1 block">Hora</span>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full bg-ink border border-rail/60 px-2 py-1.5 font-mono text-bone focus:border-orange outline-none"
          />
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Duración (min)</span>
          <input
            type="number"
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            min={60}
            max={480}
            step={30}
            className="w-full bg-ink border border-rail/60 px-2 py-1.5 font-mono text-bone focus:border-orange outline-none"
          />
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Modalidad</span>
          <Select
            value={modalidad}
            onChange={setModalidad}
            options={MODALIDAD_OPTS}
          />
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Cupo</span>
          <input
            type="number"
            value={cupo}
            onChange={(e) => setCupo(e.target.value)}
            min={1}
            max={60}
            className="w-full bg-ink border border-rail/60 px-2 py-1.5 font-mono text-bone focus:border-orange outline-none"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={!dirty || pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "..." : "Guardar"}
        </button>
        {confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={eliminar}
              disabled={deleting}
              className="px-3 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold bg-orange-300/20 border border-orange-300/60 text-orange-300 hover:bg-orange-300/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {deleting ? "..." : "Confirmar eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="font-mono fluid-xs uppercase tracking-[.2em] text-ash hover:text-bone cursor-pointer"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="ml-auto font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange-300 cursor-pointer"
          >
            Eliminar
          </button>
        )}
        <ErrorBanner error={error} variant="inline" />
        {saved && !dirty && !pending && !error && (
          <p className="font-mono fluid-xs text-green-400 uppercase tracking-[.2em]">Guardado</p>
        )}
      </div>
    </div>
  );
}
