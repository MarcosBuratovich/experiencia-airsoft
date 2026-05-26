"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { editarClanAction, type EditarClanState } from "../../actions";
import { colorLeibleSobreInk, contrasteSobreInk, CONTRAST_MIN } from "@/lib/clanes";
import { LogoUploader } from "../../nuevo/logo-uploader";

const initial: EditarClanState = undefined;

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

type ClanData = {
  id: string;
  slug: string;
  nombre: string;
  alias: string;
  descripcion: string;
  color_hex: string;
  logo_url: string;
  display_mode: "alias" | "logo";
};

export function EditarClanForm({ clan }: { clan: ClanData }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(editarClanAction, initial);
  const [nombre, setNombre] = useState(clan.nombre);
  const [color, setColor] = useState(clan.color_hex);
  const [alias, setAlias] = useState(clan.alias);
  const [descripcion, setDescripcion] = useState(clan.descripcion);
  const [logoUrl, setLogoUrl] = useState(clan.logo_url ?? "");
  const [displayMode, setDisplayMode] = useState<"alias" | "logo">(clan.display_mode);

  const aliasN = aliasLen(alias);
  const contraste = useMemo(() => contrasteSobreInk(color), [color]);
  const pasaContraste = contraste >= CONTRAST_MIN;
  const colorRender = colorLeibleSobreInk(color);

  // Checklist client-side (lo mismo que en crear). El submit no se
  // habilita hasta cumplir todo.
  type Req = { ok: boolean; label: string };
  const requisitos: Req[] = [
    { ok: nombre.trim().length >= 2 && nombre.trim().length <= 40, label: "Nombre entre 2 y 40 caracteres" },
    { ok: pasaContraste, label: "Color con contraste suficiente (verde ✓ en el preview)" },
    ...(displayMode === "alias"
      ? [{ ok: aliasN >= 1 && aliasN <= ALIAS_MAX, label: `Alias entre 1 y ${ALIAS_MAX} caracteres` }]
      : [{ ok: !!logoUrl, label: "Logo cargado (modo Logo circular)" }]),
  ];
  const allReqsMet = requisitos.every((r) => r.ok);

  // Cuando el server responde ok, volvemos a la vista del clan
  if (state?.ok) {
    router.push(`/clanes/${clan.slug}`);
    router.refresh();
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={clan.id} />

      <label className="block">
        <span className="sect-label mb-1 block">Nombre del clan</span>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
        />
        {state?.errors?.nombre?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.nombre[0]}
          </span>
        )}
      </label>

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

        <div className="mt-4 pt-4 border-t border-rail/40">
          <p className="sect-label mb-2">// Así va a aparecer en partidas</p>
          <div className="border border-rail/60 bg-ink clip-notch p-3 space-y-2">
            {["Juan Perez", "Ana M.", "Pedro G."].map((nm) => (
              <div
                key={nm}
                className="flex items-center gap-2 font-mono fluid-xs uppercase tracking-[.18em]"
              >
                <span style={{ color: colorRender }}>[{alias || "ALIAS"}]</span>
                <span className="text-bone normal-case tracking-normal font-sans">
                  {nm}
                </span>
              </div>
            ))}
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
        <span className="sect-label mb-1 block">Descripción</span>
        <textarea
          name="descripcion"
          rows={3}
          maxLength={500}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
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
          <span className="font-mono fluid-xs text-ash">{color.toUpperCase()}</span>
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
        {state?.errors?.color_hex?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.color_hex[0]}
          </span>
        )}
      </label>

      <div>
        <span className="sect-label mb-1 block">Logo</span>
        <LogoUploader
          initialUrl={clan.logo_url}
          pathHint={clan.slug}
          onUrlChange={setLogoUrl}
        />
        {state?.errors?.logo_url?.[0] && (
          <span className="mt-1 block font-mono fluid-xs text-orange-300">
            {state.errors.logo_url[0]}
          </span>
        )}
      </div>

      {state?.message && (
        <p className="font-mono fluid-xs text-orange-300">{state.message}</p>
      )}

      <div
        className={`border ${
          allReqsMet ? "border-green-500/40 bg-green-500/5" : "border-rail/60 bg-carbon"
        } clip-notch p-4`}
      >
        <p className="sect-label mb-2">
          {allReqsMet ? "// Listo para guardar" : "// Requisitos para guardar"}
        </p>
        <ul className="space-y-1.5 font-mono fluid-xs">
          {requisitos.map((r) => (
            <li
              key={r.label}
              className={`flex items-center gap-2 ${
                r.ok ? "text-green-400" : "text-smoke"
              }`}
            >
              <span aria-hidden className="w-4 text-center">
                {r.ok ? "✓" : "·"}
              </span>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={pending || !allReqsMet}
        className="btn-wa w-full py-3 clip-tag uppercase tracking-wider font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {pending
          ? "Guardando..."
          : allReqsMet
            ? "Guardar cambios"
            : "Completá los requisitos para guardar"}
      </button>
    </form>
  );
}
