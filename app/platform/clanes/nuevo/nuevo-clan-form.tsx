"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { crearClanAction, type CrearClanState } from "../actions";
import { colorLeibleSobreInk, contrasteSobreInk, CONTRAST_MIN } from "@/lib/clanes";
import { LogoUploader } from "./logo-uploader";

const initial: CrearClanState = undefined;

const ALIAS_MAX = 10;

function aliasLen(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

export function NuevoClanForm() {
  const [state, action, pending] = useActionState(crearClanAction, initial);
  const [color, setColor] = useState("#ff6b1a");
  const [alias, setAlias] = useState("");
  const [displayMode, setDisplayMode] = useState<"alias" | "logo">("alias");

  const aliasN = aliasLen(alias);
  const contraste = useMemo(() => contrasteSobreInk(color), [color]);
  const pasaContraste = contraste >= CONTRAST_MIN;
  const colorRender = colorLeibleSobreInk(color);

  // Resumen de errores para banner. Cuando el server devuelve errores
  // de campo, queremos que el usuario los vea SI o SI (no se pierda
  // mientras scrollea).
  const errorMessages = useMemo(() => {
    const msgs: { field: string; msg: string }[] = [];
    if (!state?.errors) return msgs;
    for (const [field, errs] of Object.entries(state.errors)) {
      if (errs && errs.length) msgs.push({ field, msg: errs[0] });
    }
    return msgs;
  }, [state?.errors]);
  const hasErrors = errorMessages.length > 0 || !!state?.message;

  // Cuando aparecen errores nuevos, scrollear arriba para que el banner
  // sea lo primero que se ve.
  useEffect(() => {
    if (hasErrors && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hasErrors, state]);

  return (
    <form action={action} className="space-y-4">
      {hasErrors && (
        <div className="border border-orange-300/60 bg-orange-300/10 clip-notch p-4">
          <p className="sect-label text-orange-300 mb-2">// Revisá esto</p>
          {state?.message && (
            <p className="font-sans fluid-sm text-orange-300 mb-2">
              {state.message}
            </p>
          )}
          {errorMessages.length > 0 && (
            <ul className="space-y-1 font-mono fluid-xs text-orange-300">
              {errorMessages.map((e) => (
                <li key={e.field}>
                  <span className="uppercase tracking-[.2em] mr-2">
                    {e.field}:
                  </span>
                  <span className="normal-case tracking-normal">{e.msg}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Field
        label="Nombre del clan"
        name="nombre"
        placeholder="Ej: Lobos de Acero"
        error={state?.errors?.nombre}
      />

      <div className="border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
        <p className="sect-label mb-1">// Alias del clan</p>
        <p className="font-sans fluid-sm text-ash leading-relaxed mb-3">
          Una sigla corta que identifica al clan en cada partida. Se muestra{" "}
          <span className="text-bone">delante del nombre del jugador</span>,
          con el color del clan, en cada lista de inscriptos.
        </p>

        <label className="block">
          <span className="sect-label mb-1 block">
            Tu alias (máx {ALIAS_MAX} chars · emojis ok)
          </span>
          <div className="relative">
            <input
              name="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="WOLF · 🦊PRO · LBA · etc."
              maxLength={ALIAS_MAX * 4}
              className="w-full bg-ink border border-rail px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
            />
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono fluid-xs ${
                aliasN > ALIAS_MAX ? "text-orange-300" : "text-smoke"
              }`}
            >
              {aliasN}/{ALIAS_MAX}
            </span>
          </div>
          {state?.errors?.alias?.[0] && (
            <span className="mt-1 block font-mono fluid-xs text-orange-300">
              {state.errors.alias[0]}
            </span>
          )}
        </label>

        {/* Preview en vivo de cómo se va a ver */}
        <div className="mt-4 pt-4 border-t border-rail/40">
          <p className="sect-label mb-2">// Así va a aparecer en partidas</p>
          <div className="border border-rail/60 bg-ink clip-notch p-3 space-y-2">
            <div className="flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em]">
              <span style={{ color: colorRender }}>
                [{alias || "ALIAS"}]
              </span>
              <span className="text-bone normal-case tracking-normal font-sans">
                Juan Perez
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em]">
              <span style={{ color: colorRender }}>
                [{alias || "ALIAS"}]
              </span>
              <span className="text-bone normal-case tracking-normal font-sans">
                Ana M.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em]">
              <span style={{ color: colorRender }}>
                [{alias || "ALIAS"}]
              </span>
              <span className="text-bone normal-case tracking-normal font-sans">
                Pedro G.
              </span>
            </div>
          </div>
          <p className="mt-2 font-mono fluid-xs text-smoke">
            Cada miembro del clan llevará este tag adelante de su nombre.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="sect-label mb-1 block">Mostrar en partidas como</span>
        <div className="flex gap-2 flex-wrap">
          {(["alias", "logo"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDisplayMode(opt)}
              className={`px-3 py-1.5 clip-tag font-mono fluid-xs uppercase tracking-[.2em] cursor-pointer ${
                displayMode === opt
                  ? "bg-orange text-ink"
                  : "border border-rail/60 text-ash hover:text-bone"
              }`}
            >
              {opt === "alias" ? "Alias [TEXTO]" : "Logo circular"}
            </button>
          ))}
        </div>
        <input type="hidden" name="display_mode" value={displayMode} />
      </label>

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
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="color"
            name="color_hex"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 cursor-pointer bg-transparent border border-rail/60"
          />
          <span className="font-mono fluid-xs text-ash">
            {color.toUpperCase()}
          </span>
          <span
            className={`font-mono fluid-xs uppercase tracking-[.18em] ${
              pasaContraste ? "text-green-400" : "text-orange-300"
            }`}
          >
            {pasaContraste ? "✓ legible" : "✗ poco contraste"} ·{" "}
            {contraste.toFixed(1)}:1
          </span>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 border border-rail/60 bg-ink clip-notch">
          <span
            style={{ color: pasaContraste ? color : colorRender }}
            className="font-mono fluid-xs tracking-[.18em] uppercase"
          >
            [{alias || "WOLF"}]
          </span>
          <span className="text-bone font-sans">Juan Perez</span>
        </div>
        <p className="mt-1 font-mono fluid-xs text-smoke">
          Mínimo {CONTRAST_MIN}:1 sobre el fondo oscuro (WCAG AA). Si es muy
          oscuro, el chip va a caer a beige en producción y vas a perder el
          color.
        </p>
        {state?.errors?.color_hex?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.color_hex[0]}
          </span>
        )}
      </label>

      <div>
        <span className="sect-label mb-1 block">
          Logo (opcional · necesario si display = Logo circular)
        </span>
        <LogoUploader />
        {state?.errors?.logo_url?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.logo_url[0]}
          </span>
        )}
      </div>

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || !pasaContraste || aliasN > ALIAS_MAX}
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
