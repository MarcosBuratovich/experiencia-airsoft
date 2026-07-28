/**
 * Botón de contacto por WhatsApp para el admin.
 *
 * Abre el chat con el jugador y un mensaje ya escrito. Solo se renderiza si
 * hay un celular cargado (los guests/invitados agregados a mano no tienen).
 *
 * `data-ga-skip`: el listener global de analytics ignora este link. Dos
 * razones: (1) el número del jugador viaja en la URL y es dato personal que
 * no puede salir hacia Google; (2) son contactos internos del negocio, no
 * conversiones de marketing — contarlos inflaría `whatsapp_click`.
 */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.1 4.9A10 10 0 0 0 4.1 18.3L3 22l3.8-1a10 10 0 0 0 14.8-8.6 9.9 9.9 0 0 0-2.5-7.5Zm-7 15.3a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.3.6.6-2.2-.2-.3A8.3 8.3 0 1 1 12.1 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.2a.4.4 0 0 0 0-.4c0-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4H9c-.2 0-.5.1-.7.3a2.5 2.5 0 0 0-.8 1.9 4.3 4.3 0 0 0 .9 2.3 9.9 9.9 0 0 0 4 3.6c2.3 1 2.3.6 2.7.6a2.2 2.2 0 0 0 1.5-1 1.8 1.8 0 0 0 .1-1c0-.2-.2-.3-.4-.4Z" />
    </svg>
  );
}

/** Un celular sirve para wa.me solo si tiene dígitos suficientes. */
export function celularContactable(celular: string | null | undefined): boolean {
  if (!celular) return false;
  return celular.replace(/\D/g, "").length >= 8;
}

function waHref(celular: string, mensaje: string): string {
  // wa.me quiere solo dígitos, en formato internacional sin '+'.
  const num = celular.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

export function ContactoWa({
  celular,
  nombre,
  contexto,
  variant = "boton",
  className = "",
}: {
  celular: string | null | undefined;
  /** Nombre del jugador, para el saludo del mensaje. */
  nombre?: string | null;
  /** Cola del mensaje, p. ej. "la partida del sábado 19:00 hs". */
  contexto?: string;
  /**
   * "boton"  → pastilla con ícono (listados donde el número no se muestra).
   * "inline" → el número como link (donde ya figuraba como texto).
   */
  variant?: "boton" | "inline";
  className?: string;
}) {
  if (!celularContactable(celular)) {
    // Sin celular (invitado cargado a mano) mostramos el guión de siempre
    // para no romper la fila.
    return variant === "inline" ? <span className={className}>—</span> : null;
  }

  const saludo = nombre?.trim() ? `Hola ${nombre.trim()}!` : "Hola!";
  const mensaje = contexto
    ? `${saludo} Te escribo de Experiencia Airsoft por ${contexto}.`
    : `${saludo} Te escribo de Experiencia Airsoft.`;
  const href = waHref(celular as string, mensaje);

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-ga-skip
        title={`Escribirle a ${nombre ?? "este jugador"} por WhatsApp`}
        className={`inline-flex items-center gap-1 text-ash hover:text-orange transition-colors ${className}`}
      >
        <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
        {celular}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-ga-skip
      aria-label={`Escribirle a ${nombre ?? "este jugador"} por WhatsApp`}
      title={`WhatsApp ${celular}`}
      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 border border-rail/60 text-ash hover:border-orange hover:text-orange transition-colors ${className}`}
    >
      <WhatsAppIcon className="w-4 h-4" />
    </a>
  );
}
