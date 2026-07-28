// ──────────────────────────────────────────────────────────────────────
// API de Conversiones de Meta (server-side).
//
// ⚠️ SOLO SERVIDOR: lee META_CAPI_TOKEN, que es un secreto. No importar
// este módulo desde un componente cliente.
//
// El Pixel del navegador pierde eventos por bloqueadores de publicidad y por
// las restricciones de iOS (fácil un 20-30%). Esta vía manda el mismo evento
// desde el servidor, donde nada lo puede bloquear.
//
// DEDUPLICACIÓN: el cliente y el servidor mandan el MISMO `event_id`; Meta
// los une y cuenta uno solo. Sin eso, cada conversión contaría doble. Por eso
// el id lo genera el CLIENTE (antes de llamar a la action) y viaja hasta acá.
//
// Configuración (Vercel → Settings → Environment Variables):
//   META_CAPI_TOKEN — token del Administrador de eventos → pixel →
//     Configuración → API de conversiones → "Generar token de acceso".
//   META_CAPI_TEST_CODE — opcional; mientras esté seteado los eventos van a
//     "Eventos de prueba" y NO impactan los reportes reales.
//
// Sin token, todo esto es un no-op silencioso.
// ──────────────────────────────────────────────────────────────────────

import { cookies, headers } from "next/headers";

const PIXEL_ID = "918570951259432";
const API_VERSION = "v21.0";

/** Nombres estándar de Meta que usamos. */
export type MetaEventName =
  | "Lead"
  | "Schedule"
  | "CompleteRegistration"
  | "Contact"
  | "Purchase";

type Payload = {
  eventName: MetaEventName;
  /** Mismo id que mandó el navegador (obligatorio para deduplicar). */
  eventId: string;
  customData?: Record<string, unknown>;
};

/**
 * Manda un evento a Meta desde una server action / route handler.
 *
 * NUNCA lanza ni bloquea: un problema de analytics no puede romper una
 * inscripción. Devuelve true solo si Meta lo aceptó.
 */
export async function enviarEventoMeta({
  eventName,
  eventId,
  customData,
}: Payload): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !eventId) return false;

  try {
    const [h, c] = await Promise.all([headers(), cookies()]);

    const user_data: Record<string, unknown> = {};
    // _fbp/_fbc son las cookies del Pixel: permiten unir este evento con la
    // sesión del navegador y, si vino de un anuncio, atribuirlo a la campaña.
    const fbp = c.get("_fbp")?.value;
    const fbc = c.get("_fbc")?.value;
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;
    // x-forwarded-for puede traer varias IPs: la primera es el cliente real.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
    if (ip) user_data.client_ip_address = ip;
    const ua = h.get("user-agent");
    if (ua) user_data.client_user_agent = ua;

    // Meta rechaza eventos sin ninguna señal de usuario.
    if (Object.keys(user_data).length === 0) return false;

    const referer = h.get("referer");
    const body: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          ...(referer ? { event_source_url: referer } : {}),
          user_data,
          ...(customData ? { custom_data: customData } : {}),
        },
      ],
    };
    const testCode = process.env.META_CAPI_TEST_CODE;
    if (testCode) body.test_event_code = testCode;

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Que un timeout de Meta no demore la respuesta al usuario.
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) {
      // El error de Meta ayuda a diagnosticar (token vencido, permisos).
      // No incluye datos del jugador.
      console.error(
        "[meta-capi] rechazado",
        res.status,
        (await res.text()).slice(0, 300),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] falló el envío", err);
    return false;
  }
}
