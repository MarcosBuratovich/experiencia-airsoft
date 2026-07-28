"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

// Meta Pixel (Facebook). El ID es un valor público (viaja al cliente igual),
// por eso va hardcodeado. Un solo pixel cubre www y la plataforma logueada.
const PIXEL_ID = "918570951259432";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * El panel de admin no se mide (ver docstring de MetaPixel).
 *
 * Contempla las dos formas del path: la que ve el navegador (`/admin/...`,
 * porque el proxy reescribe el host app.* sin cambiar la URL) y la interna
 * del servidor, que sí lleva el prefijo `/platform`.
 */
function esAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/platform/admin");
}

/**
 * Dispara un PageView en cada navegación del lado del cliente. El snippet base
 * ya emite el primer PageView en la carga inicial, así que salteamos ese para
 * no contarlo dos veces; a partir de ahí, cada cambio de ruta (App Router no
 * recarga la página) manda un PageView nuevo.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const primeraCarga = useRef(true);

  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    if (esAdminPath(pathname)) return;
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

/**
 * Apaga el pixel mientras se navega el panel de admin.
 *
 * Hace falta además de no cargar el script, porque si el admin llegó desde
 * una página pública el pixel ya está en memoria. `consent revoke` es el
 * mecanismo de Meta para que el pixel deje de enviar TODO — incluidas sus
 * funciones automáticas (coincidencias avanzadas, lectura de contenido de la
 * página), que en el admin verían nombres, DNIs y teléfonos de clientes.
 */
function ConsentGate({ enAdmin }: { enAdmin: boolean }) {
  useEffect(() => {
    window.fbq?.("consent", enAdmin ? "revoke" : "grant");
  }, [enAdmin]);

  return null;
}

/**
 * Monta el Meta Pixel en www + plataforma.
 *
 * DOS EXCLUSIONES, ambas resueltas dentro del snippet o por consent:
 *
 * 1. Solo hosts de producción. En localhost y en los previews de Vercel el
 *    pixel no se carga: si no, las pruebas de desarrollo entran como
 *    tráfico real (pasó: aparecía "localhost" entre los sitios del pixel).
 *
 * 2. Nada en /admin. Además del PageView, el pixel de Meta trae funciones
 *    automáticas que leen formularios y contenido de la página; en el panel
 *    de admin eso serían datos personales de clientes.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const enAdmin = esAdminPath(pathname);

  return (
    <>
      {/* Si la sesión ARRANCA en /admin, el script ni se carga. Si se entra
          al admin navegando, ConsentGate lo silencia. */}
      {!enAdmin && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`(function(){
if (!/(^|\\.)experienciaairsoft\\.com$/.test(location.hostname)) return;
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
})();`}
        </Script>
      )}
      {!enAdmin && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
      <ConsentGate enAdmin={enAdmin} />
      {/* useSearchParams necesita un límite de Suspense en el App Router. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
