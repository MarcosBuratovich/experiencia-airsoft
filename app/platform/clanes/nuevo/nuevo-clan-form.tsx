"use client";

import { useActionState, useState } from "react";
import { crearClanAction, type CrearClanState } from "../actions";

const initial: CrearClanState = undefined;

export function NuevoClanForm() {
  const [state, action, pending] = useActionState(crearClanAction, initial);
  const [color, setColor] = useState("#ff6b1a");

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Nombre del clan"
        name="nombre"
        placeholder="Ej: Lobos de Acero"
        error={state?.errors?.nombre}
      />

      <label className="block">
        <span className="sect-label mb-1 block">Descripción (opcional)</span>
        <textarea
          name="descripcion"
          rows={3}
          maxLength={500}
          placeholder="Qué representa el clan, cómo juega, etc."
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition resize-y"
        />
        {state?.errors?.descripcion?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.descripcion[0]}
          </span>
        )}
      </label>

      <label className="block">
        <span className="sect-label mb-1 block">Color del clan</span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            name="color_hex"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 cursor-pointer bg-transparent border border-rail/60"
          />
          <span className="font-mono fluid-xs text-ash">{color.toUpperCase()}</span>
        </div>
        {state?.errors?.color_hex?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.color_hex[0]}
          </span>
        )}
      </label>

      <Field
        label="URL del logo (opcional)"
        name="logo_url"
        placeholder="https://..."
        type="url"
        error={state?.errors?.logo_url}
      />

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending ? "Creando..." : "Crear clan"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string[];
}) {
  return (
    <label className="block">
      <span className="sect-label mb-1 block">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
      />
      {error?.[0] && (
        <span className="mt-1 block font-mono fluid-xs text-orange-300">{error[0]}</span>
      )}
    </label>
  );
}
