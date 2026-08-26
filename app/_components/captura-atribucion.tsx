"use client";

import { useEffect } from "react";
import { COOKIE_ATRIBUCION, COOKIE_MAX_AGE } from "@/lib/atribucion";
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
      // Ya la tenemos: es un visitante que vuelve. No se toca.
      if (document.cookie.includes(`${COOKIE_ATRIBUCION}=`)) return;

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

      // Claves de una letra: la cookie viaja en cada request.
      const datos: Record<string, string> = { t: new Date().toISOString() };
      const s = q.get("utm_source");
      const m = q.get("utm_medium");
      const c = q.get("utm_campaign");
      const f = q.get("fbclid");
      if (s) datos.s = s;
      if (m) datos.m = m;
      if (c) datos.c = c;
      if (f) datos.f = f;
      if (refHost) datos.r = refHost;
      datos.l = window.location.pathname;

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
