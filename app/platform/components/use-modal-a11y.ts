"use client";

import { useEffect, useRef } from "react";

/**
 * Accesibilidad de modales/diálogos: cierra con Escape, mueve el foco al
 * diálogo al abrir, lo atrapa dentro (Tab/Shift+Tab) y lo restaura al cerrar.
 *
 * Uso: aplicá el ref al contenedor del diálogo (no al overlay) y dale
 * `tabIndex={-1} role="dialog" aria-modal="true" aria-label={...}`.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    // Mover el foco al diálogo al abrir.
    el?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const focusables = Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restaurar el foco al elemento que lo tenía antes de abrir.
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return ref;
}
