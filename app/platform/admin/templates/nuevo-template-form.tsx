"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearTemplateAction } from "./actions";
import { Select } from "../../components/select";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

const DIAS_OPTS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

export function NuevoTemplateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState("6"); // Sábado por defecto
  const [hora, setHora] = useState("20:00");
  const [duracion, setDuracion] = useState("180");
  const [modalidad, setModalidad] = useState("dinamica");
  const [cupo, setCupo] = useState("20");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setDia("6");
    setHora("20:00");
    setDuracion("180");
    setModalidad("dinamica");
    setCupo("20");
    setError(null);
  };

  const crear = () => {
    setError(null);
    startTransition(async () => {
      const res = await crearTemplateAction({
        dia_semana: Number(dia),
        hora_inicio: hora,
        duracion_min: Number(duracion),
        modalidad: modalidad as "dinamica" | "tacsim" | "speedsoft",
        cupo_max: Number(cupo),
      });
      if ("error" in res && res.error) {
        setError(typeof res.error === 'string' ? { titulo: res.error, mostrarSoporte: false } : res.error);
      } else {
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
        className="btn-ghost px-4 py-2.5 clip-tag uppercase tracking-wider font-semibold cursor-pointer"
      >
        + Nuevo template
      </button>
    );
  }

  return (
    <div className="border border-orange/60 bg-carbon clip-notch p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="sect-label text-orange">// Nuevo template</span>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-smoke hover:text-bone font-mono text-2xl leading-none cursor-pointer"
          aria-label="Cancelar"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <label className="block">
          <span className="sect-label mb-1 block">Día</span>
          <Select value={dia} onChange={setDia} options={DIAS_OPTS} />
        </label>
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
          onClick={crear}
          disabled={pending}
          className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Creando..." : "Crear template"}
        </button>
        <ErrorBanner error={error} variant="inline" />
      </div>
    </div>
  );
}
