"use client";

import { useEffect } from "react";
import {
  COOKIE_ATRIBUCION,
  COOKIE_MAX_AGE,
  LIMPIO,
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

      // Claves de una letra: la cookie viaja en cada request. Validamos con
      // el mismo regex LIMPIO que usa el server al leer (lib/atribucion.ts)
      // ANTES de truncar: un valor que no matchea no se guarda. Sin esto,
      // el truncado corría sobre el valor crudo controlable por link y
      // después encodeURIComponent lo inflaba hasta ×3 — escritura y
      // lectura tienen que aplicar exactamente el mismo criterio.
      const limpiar = (v: string, max: number): string | null => {
        const t = v.trim();
        if (!t || !LIMPIO.test(t)) return null;
        return t.slice(0, max);
      };

      const datos: Record<string, string> = { t: new Date().toISOString() };
      const s = q.get("utm_source");
      const m = q.get("utm_medium");
      const c = q.get("utm_campaign");
      const f = q.get("fbclid");
      const sLimpio = s ? limpiar(s, MAX_LARGO) : null;
      const mLimpio = m ? limpiar(m, MAX_LARGO) : null;
      const cLimpio = c ? limpiar(c, MAX_LARGO) : null;
      const fLimpio = f ? limpiar(f, MAX_LARGO_FBCLID) : null;
      const rLimpio = refHost ? limpiar(refHost, MAX_LARGO) : null;
      const lLimpio = limpiar(window.location.pathname, MAX_LARGO);
      if (sLimpio) datos.s = sLimpio;
      if (mLimpio) datos.m = mLimpio;
      if (cLimpio) datos.c = cLimpio;
      if (fLimpio) datos.f = fLimpio;
      if (rLimpio) datos.r = rLimpio;
      if (lLimpio) datos.l = lLimpio;

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
