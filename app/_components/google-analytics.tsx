"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { GA_ID, sanitizarUrl, track } from "@/lib/ga";

/**
 * Params marcadores que las server actions agregan al redirect solo para que
 * un tracker dispare un evento (ParamEventTracker los limpia con
 * router.replace). El page_view los quita ANTES de enviar y deduplica, así la
 * limpieza de URL no genera un segundo page_view.
 */
const PARAMS_MARCADORES = ["login", "creado"];

function urlCanonica(href: string): string {
  try {
    const u = new URL(href);
    for (const p of PARAMS_MARCADORES) u.searchParams.delete(p);
    return sanitizarUrl(u.toString());
  } catch {
    return sanitizarUrl(href);
  }
}

/**
 * Google Analytics 4 para www + plataforma (un solo montaje en el root
 * layout cubre ambos hosts vía el proxy).
 *
 * page_view es 100% MANUAL (send_page_view: false en el config): un solo
 * mecanismo para carga inicial + navegaciones SPA, con URL sanitizada y sin
 * /admin. Requiere tener APAGADO en GA4 el toggle de Enhanced Measurement
 * "Cambios de página según eventos del historial" para no duplicar.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ultimaUrl = useRef<string | null>(null);

  useEffect(() => {
    // El admin no se mide (uso interno; además contaminaría los reportes).
    if (pathname.startsWith("/admin")) return;
    const loc = urlCanonica(window.location.href);
    // Dedupe: limpiar un param marcador re-dispara este efecto con la misma
    // URL canónica — no es una navegación real.
    if (loc === ultimaUrl.current) return;
    ultimaUrl.current = loc;
    window.gtag?.("event", "page_view", {
      page_location: loc,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Listener delegado global de clicks. Un solo punto de código cubre los ~20
 * CTAs server-rendered de WhatsApp del marketing + plataforma (y los que se
 * agreguen a futuro), los links del embudo www→app y www→tienda, y los tel:.
 * Única fuente de verdad por click: acá NO se instrumentan anchors que ya
 * tengan su propio handler de tracking (hoy ninguno lo tiene).
 */
function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // auxclick: solo botón del medio (abre en pestaña nueva y navega igual).
      if (e.type === "auxclick" && e.button !== 1) return;
      // El admin no se mide: sus wa.me llevan celular+nombre de CLIENTES en
      // la URL (PII que no puede llegar a GA) y no son actividad de usuarios.
      if (window.location.pathname.startsWith("/admin")) return;

      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const href = a.href;
      const ctx = {
        page_context: window.location.pathname,
        // Sin query string: los wa.me llevan el mensaje prefilled en ?text=.
        link_url: `${a.origin}${a.pathname}`.slice(0, 200),
      };

      if (/(^https?:\/\/)(wa\.me|api\.whatsapp\.com)\//.test(href)) {
        // destino: reservas (número principal) vs soporte.
        const destino = href.includes("5491166652698") ? "soporte" : "reservas";
        track("whatsapp_click", { ...ctx, destino });
        return;
      }
      if (href.startsWith("tel:")) {
        track("tel_click", { page_context: ctx.page_context });
        return;
      }
      // Solo saltos ENTRE hosts cuentan como embudo: en app.* todos los links
      // internos resuelven a app.experienciaairsoft.com/... y sin este guard
      // cada click de navegación de la plataforma sería un reservar_click.
      if (a.origin === window.location.origin) return;
      if (/^https?:\/\/tienda\.experienciaairsoft\.com/.test(href)) {
        track("tienda_click", ctx);
      } else if (/^https?:\/\/app\.experienciaairsoft\.com/.test(href)) {
        track("reservar_click", {
          ...ctx,
          destino: new URL(href).pathname || "/",
        });
      }
    };
    // capture: corre aunque el anchor frene la propagación; gtag usa
    // sendBeacon así que el hit sobrevive a la navegación.
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
(function(){
  var prod = /(^|\\.)experienciaairsoft\\.com$/.test(location.hostname);
  var cfg = { send_page_view: false };
  if (!prod) { cfg.debug_mode = true; cfg.traffic_type = 'internal'; }
  gtag('config', '${GA_ID}', cfg);
})();`}
      </Script>
      <ClickTracker />
      {/* useSearchParams necesita un límite de Suspense en el App Router. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
