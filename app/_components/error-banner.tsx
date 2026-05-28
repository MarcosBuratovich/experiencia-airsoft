import { SOPORTE_WHATSAPP_NUMBER, SOPORTE_WHATSAPP_URL } from "./site-constants";
import type { FriendlyError } from "@/lib/errors";

type Variant = "banner" | "inline";

/**
 * Componente único para mostrar errores al usuario. Reemplaza los
 * <p className="text-orange-300"> y <span> dispersos por el codebase.
 * Si el error trae mostrarSoporte=true, agrega el CTA de WhatsApp.
 *
 * Variantes:
 * - "banner" (default): bloque grande con borde y fondo, para forms.
 * - "inline": versión chica para mostrar abajo de un botón.
 *
 * Acepta también una lista de errores por campo (formErrors), útil
 * cuando se combina con validación zod.
 */
export function ErrorBanner({
  error,
  formErrors,
  variant = "banner",
  className,
}: {
  error: FriendlyError | null | undefined;
  formErrors?: Record<string, string[] | undefined>;
  variant?: Variant;
  className?: string;
}) {
  if (!error && !formErrors) return null;

  const fieldList = formErrors
    ? Object.entries(formErrors).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].length > 0,
      )
    : [];

  if (!error && fieldList.length === 0) return null;

  if (variant === "inline") {
    return (
      <div
        role="alert"
        className={`font-mono fluid-xs text-orange-300 ${className ?? ""}`.trim()}
      >
        {error?.titulo}
        {error?.detalle && (
          <span className="text-smoke"> · {error.detalle}</span>
        )}
        {error?.mostrarSoporte && <SoporteLink inline />}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`border border-orange-300/60 bg-orange-300/10 clip-notch p-4 ${
        className ?? ""
      }`.trim()}
    >
      <p className="sect-label text-orange-300 mb-2">// Revisá esto</p>
      {error && (
        <>
          <p className="font-sans fluid-sm text-orange-300 leading-snug">
            {error.titulo}
          </p>
          {error.detalle && (
            <p className="font-sans fluid-xs text-ash mt-1 leading-relaxed">
              {error.detalle}
            </p>
          )}
        </>
      )}

      {fieldList.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono fluid-xs text-orange-300">
          {fieldList.map(([field, msgs]) => (
            <li key={field}>
              <span className="uppercase tracking-[.2em] mr-2">{field}:</span>
              <span className="normal-case tracking-normal">{msgs[0]}</span>
            </li>
          ))}
        </ul>
      )}

      {(error?.mostrarSoporte || error?.codigo) && (
        <div className="mt-3 pt-3 border-t border-orange-300/30 flex items-center gap-2 flex-wrap font-mono fluid-xs">
          {error?.mostrarSoporte && <SoporteLink />}
          {error?.codigo && (
            <span className="text-smoke">· cód {error.codigo}</span>
          )}
        </div>
      )}
    </div>
  );
}

function SoporteLink({ inline = false }: { inline?: boolean }) {
  return (
    <a
      href={SOPORTE_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={
        inline
          ? "ml-2 text-orange underline hover:text-bone"
          : "inline-flex items-center gap-1.5 text-bone bg-orange/15 border border-orange/40 px-2.5 py-1 clip-tag uppercase tracking-wider hover:bg-orange/30 transition"
      }
    >
      {inline
        ? "soporte técnico"
        : `Soporte técnico · WhatsApp ${SOPORTE_WHATSAPP_NUMBER} →`}
    </a>
  );
}
