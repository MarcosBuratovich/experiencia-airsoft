"use client";

import { useEffect } from "react";
import {
  COOKIE_ATRIBUCION,
  COOKIE_MAX_AGE,
  MAX_LARGO,
  MAX_LARGO_FBCLID,
} from "@/lib/atribucion-cookie";
import { esHostProduccion } from "@/lib/ga";

/**
 * Escribe la cookie `ea_attr` en el PRIMER pageview y nunca más.
 *
 * First-touch a propósito: la pregunta del negocio es qué canal TRAE gente
 * que reserva, no qué click cerró la venta. Si la cookie ya existe, este
 * componente no hace absolutamente nada.
 *
 * La cookie va en el dominio raíz para sobrevivir el salto www → app, el
 * mismo motivo por el que funciona `_gcl_aw` (ver lib/gclid.ts).
 */
export function CapturaAtribucion() {
  useEffect(() => {
    try {
      // includes() daria falso positivo con cualquier cookie que termine en
      // "ea_attr" (beta_ea_attr, x_ea_attr, una de un tercero). Si eso pasa
      // nunca escribimos la nuestra y perdemos la atribucion en silencio,
      // porque el catch de abajo se traga todo. Comparamos entrada por
      // entrada.
      const yaExiste = document.cookie
        .split("; ")
        .some((c) => c.startsWith(`${COOKIE_ATRIBUCION}=`));
      if (yaExiste) return;

      // Fuera de producción no ensuciamos: localhost y previews quedan sin
      // atribución, igual que los hits internos de GA.
      if (!esHostProduccion(window.location.hostname)) return;

      const q = new URLSearchParams(window.location.search);

      let refHost: string | null = null;
      try {
        const r = document.referrer;
        // Un referrer de nuestro propio dominio no es un origen: es
        // navegación interna.
        if (r) {
          const h = new URL(r).hostname;
          if (!esHostProduccion(h)) refHost = h;
        }
      } catch {
        refHost = null;
      }

      // Claves de una letra: la cookie viaja en cada request. Recortamos acá
      // con los mismos límites que aplica lib/atribucion.ts al leer (vía
      // lib/atribucion-cookie.ts), para que un utm_campaign larguísimo no
      // empuje el Set-Cookie sobre el límite de ~4KB de los navegadores.
      const datos: Record<string, string> = { t: new Date().toISOString() };
      const s = q.get("utm_source");
      const m = q.get("utm_medium");
      const c = q.get("utm_campaign");
      const f = q.get("fbclid");
      if (s) datos.s = s.slice(0, MAX_LARGO);
      if (m) datos.m = m.slice(0, MAX_LARGO);
      if (c) datos.c = c.slice(0, MAX_LARGO);
      if (f) datos.f = f.slice(0, MAX_LARGO_FBCLID);
      if (refHost) datos.r = refHost.slice(0, MAX_LARGO);
      datos.l = window.location.pathname.slice(0, MAX_LARGO);

      const valor = encodeURIComponent(JSON.stringify(datos));
      document.cookie =
        `${COOKIE_ATRIBUCION}=${valor}; ` +
        `domain=.experienciaairsoft.com; path=/; ` +
        `max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
    } catch {
      // Analytics jamás rompe la página.
    }
  }, []);

  return null;
}
