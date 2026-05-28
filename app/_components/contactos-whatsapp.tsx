import {
  SOPORTE_WHATSAPP_NUMBER,
  SOPORTE_WHATSAPP_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "./site-constants";

/**
 * Bloque de contacto unificado. Siempre va PRIMERO el del dueño
 * (reservas/info), bien grande. El de soporte técnico va abajo,
 * en chico — solo para cuando algo no anda en la app.
 *
 * Variantes:
 * - "full" (default): bloque con borde + CTA del dueño + soporte abajo.
 * - "minimal": una sola fila de texto, para footers compactos.
 */
export function ContactosWhatsapp({
  variant = "full",
}: {
  variant?: "full" | "minimal";
} = {}) {
  if (variant === "minimal") {
    return (
      <div className="font-mono fluid-xs leading-relaxed">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-orange hover:underline uppercase tracking-[.2em]"
        >
          → Reservar o info: WhatsApp {WHATSAPP_NUMBER}
        </a>
        <p className="mt-1 text-smoke">
          ¿Problema técnico con la app?{" "}
          <a
            href={SOPORTE_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orange underline"
          >
            soporte {SOPORTE_WHATSAPP_NUMBER}
          </a>
        </p>
      </div>
    );
  }

  return (
    <section className="border border-rail/60 bg-carbon clip-notch p-4 sm:p-5">
      <p className="sect-label mb-3">// Para reservar o consultar</p>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-wa inline-flex items-center gap-2 px-5 py-3 clip-tag uppercase tracking-wider font-semibold text-ink fluid-sm"
      >
        WhatsApp {WHATSAPP_NUMBER}
        <span aria-hidden>→</span>
      </a>
      <p className="mt-3 font-mono fluid-xs text-smoke leading-relaxed">
        Info de partidas, precios, privadas, cumpleaños y eventos
        corporativos. Te respondemos en horario comercial.
      </p>
      <p className="mt-4 pt-3 border-t border-rail/40 font-mono fluid-xs text-smoke leading-relaxed">
        ¿Algo no anda en la app (no podés entrar, error al reservar,
        problema con tu cuenta)? Eso es soporte técnico:{" "}
        <a
          href={SOPORTE_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-orange underline whitespace-nowrap"
        >
          {SOPORTE_WHATSAPP_NUMBER}
        </a>
      </p>
    </section>
  );
}
