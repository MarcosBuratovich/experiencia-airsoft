// Google Analytics 4 — helper único de tracking (www + plataforma).
//
// El Measurement ID es un valor público (viaja al cliente igual), por eso va
// hardcodeado — mismo criterio que el Meta Pixel. Una sola propiedad/stream
// cubre www, app y tienda: la cookie _ga vive en .experienciaairsoft.com y
// GA4 unifica al usuario entre subdominios solo.
export const GA_ID = "G-78DVDE6HZT";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Hosts de producción. Cualquier otro hostname (localhost, previews
 * *.vercel.app) manda hits con traffic_type=internal + debug_mode: se ven en
 * DebugView pero el filtro "Internal" de GA4 los excluye de los reportes.
 */
export function esHostProduccion(hostname: string): boolean {
  return /(^|\.)experienciaairsoft\.com$/.test(hostname);
}

/**
 * Params que jamás deben llegar a GA en una URL (magic links de Supabase,
 * OAuth codes). Se sanitiza page_location antes de cada page_view.
 */
const PARAMS_SENSIBLES = [
  "token_hash",
  "token",
  "code",
  "access_token",
  "refresh_token",
];

export function sanitizarUrl(href: string): string {
  try {
    const u = new URL(href);
    let dirty = false;
    for (const p of PARAMS_SENSIBLES) {
      if (u.searchParams.has(p)) {
        u.searchParams.set(p, "redacted");
        dirty = true;
      }
    }
    return dirty ? u.toString() : href;
  } catch {
    return href;
  }
}

/**
 * Espejo hacia Meta Pixel: cada evento GA4 relevante dispara también su
 * evento estándar de Meta, así ambas plataformas de Ads ven el mismo embudo
 * sin instrumentación duplicada en los callsites.
 */
const FBQ_MAP: Record<string, string> = {
  whatsapp_click: "Contact",
  generate_lead: "Lead",
  sign_up: "CompleteRegistration",
  anotarse_partida: "Schedule",
  view_item: "ViewContent",
};

type Params = Record<string, unknown>;

/**
 * Dispara un evento GA4 (y su espejo Meta si corresponde). Seguro de llamar
 * siempre: si gtag no cargó (ad blocker, script aún no listo) es un no-op —
 * NUNCA condicionar lógica de negocio al resultado de un track().
 */
export function track(evento: string, params?: Params): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", evento, params);

  const fb = FBQ_MAP[evento];
  if (fb) {
    const fbParams: Params = {};
    if (params?.value !== undefined) {
      fbParams.value = params.value;
      fbParams.currency = params.currency ?? "ARS";
    }
    (window as { fbq?: (...a: unknown[]) => void }).fbq?.("track", fb, fbParams);
  }
}
