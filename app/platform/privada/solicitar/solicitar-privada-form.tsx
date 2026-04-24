"use client";

import { useActionState, useState } from "react";
import { solicitarPrivadaAction, type SolicitarPrivadaState } from "../actions";
import { slotRecurrentePisado } from "@/lib/horarios";
import { Select } from "../../components/select";

const initial: SolicitarPrivadaState = undefined;

const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

export function SolicitarPrivadaForm() {
  const [state, action, pending] = useActionState(solicitarPrivadaAction, initial);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [modalidad, setModalidad] = useState("dinamica");

  const slotPisado =
    fecha && hora ? slotRecurrentePisado(fecha, hora) : null;

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="sect-label mb-1 block">Fecha</span>
          <input
            name="fecha_propuesta"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {state?.errors?.fecha_propuesta?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.fecha_propuesta[0]}
            </span>
          )}
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Hora</span>
          <input
            name="hora_inicio"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {state?.errors?.hora_inicio?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.hora_inicio[0]}
            </span>
          )}
        </label>
      </div>

      {slotPisado && (
        <p className="font-mono fluid-xs text-orange-300">
          Ese horario cae dentro de {slotPisado.label}. Elegí un horario libre.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="sect-label mb-1 block">Duración (min)</span>
          <input
            name="duracion_min"
            type="number"
            defaultValue="180"
            min={60}
            max={480}
            step={30}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {state?.errors?.duracion_min?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.duracion_min[0]}
            </span>
          )}
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Cupo estimado</span>
          <input
            name="cupo_estimado"
            type="number"
            defaultValue="10"
            min={2}
            max={60}
            required
            className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition"
          />
          {state?.errors?.cupo_estimado?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.cupo_estimado[0]}
            </span>
          )}
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Modalidad</span>
          <Select
            name="modalidad"
            value={modalidad}
            onChange={setModalidad}
            options={MODALIDAD_OPTS}
          />
        </label>
      </div>

      <label className="block">
        <span className="sect-label mb-1 block">Notas (opcional)</span>
        <textarea
          name="notas"
          rows={3}
          maxLength={500}
          placeholder="Cumpleaños, cantidad aproximada, si traen chicos, etc."
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none transition resize-y"
        />
      </label>

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || !!slotPisado}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
