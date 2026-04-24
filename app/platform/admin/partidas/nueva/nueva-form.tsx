"use client";

import { useActionState, useState } from "react";
import { crearPartidaAction, type CrearPartidaState } from "./actions";
import { Select } from "../../../components/select";

const initial: CrearPartidaState = undefined;

const MODALIDAD_OPTS = [
  { value: "dinamica", label: "Dinámica" },
  { value: "tacsim", label: "TacSim" },
  { value: "speedsoft", label: "Speedsoft" },
];

const VISIBILIDAD_OPTS = [
  { value: "publica", label: "Pública" },
  { value: "privada", label: "Privada (link)" },
];

export function NuevaPartidaForm() {
  const [state, action, pending] = useActionState(crearPartidaAction, initial);
  const [modalidad, setModalidad] = useState("dinamica");
  const [visibilidad, setVisibilidad] = useState("publica");

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha" name="fecha" type="date" error={state?.errors?.fecha} />
        <Field label="Hora" name="hora_inicio" type="time" error={state?.errors?.hora_inicio} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="sect-label mb-1 block">Modalidad</span>
          <Select
            name="modalidad"
            value={modalidad}
            onChange={setModalidad}
            options={MODALIDAD_OPTS}
          />
          {state?.errors?.modalidad?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.modalidad[0]}
            </span>
          )}
        </label>
        <label className="block">
          <span className="sect-label mb-1 block">Visibilidad</span>
          <Select
            name="visibilidad"
            value={visibilidad}
            onChange={setVisibilidad}
            options={VISIBILIDAD_OPTS}
          />
          {state?.errors?.visibilidad?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.visibilidad[0]}
            </span>
          )}
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Cupo máx."
          name="cupo_max"
          type="number"
          defaultValue="20"
          error={state?.errors?.cupo_max}
        />
        <Field
          label="Duración (min)"
          name="duracion_min"
          type="number"
          defaultValue="180"
          error={state?.errors?.duracion_min}
        />
      </div>
      <label className="block">
        <span className="sect-label mb-1 block">Notas</span>
        <textarea
          name="notas"
          rows={3}
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none resize-y"
        />
      </label>

      <p className="font-mono fluid-xs text-smoke">
        Los precios salen de la configuración en{" "}
        <span className="text-orange">/admin/precios</span>. El título usa la
        modalidad.
      </p>

      {state?.message && <p className="font-mono fluid-xs text-orange-300">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Creando..." : "Crear partida"}
      </button>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue, error }: {
  label: string; name: string; type?: string; defaultValue?: string; error?: string[];
}) {
  return (
    <label className="block">
      <span className="sect-label mb-1 block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        className="w-full bg-carbon border border-rail/60 px-3 py-2.5 text-bone focus:border-orange outline-none"
      />
      {error?.[0] && <span className="mt-1 block font-mono fluid-xs text-orange-300">{error[0]}</span>}
    </label>
  );
}
