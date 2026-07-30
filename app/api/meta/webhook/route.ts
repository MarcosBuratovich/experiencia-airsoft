import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook de Meta — handshake de verificación y recepción de eventos.
 *
 * Existe ANTES que el resto del bot a propósito: Meta valida esta URL en el
 * momento de configurar el webhook en el panel de la app, así que sin ella no
 * se puede ni terminar de crear la integración. El procesamiento real de los
 * mensajes (adaptadores, motor, respuesta) es del plan 2; por ahora esto
 * acepta, valida y registra.
 *
 * Variables de entorno:
 *   META_WEBHOOK_VERIFY_TOKEN — string que uno inventa y pega igual en el
 *     panel de Meta. Solo se usa en el handshake inicial.
 *   META_APP_SECRET — el secreto de la app. Firma cada POST; sin él no se
 *     puede distinguir un evento real de uno inventado por cualquiera que
 *     conozca la URL.
 */

export const dynamic = "force-dynamic";

/**
 * Handshake de verificación. Meta pega un GET con estos tres parámetros y
 * espera que le devolvamos el challenge en texto plano, sin comillas ni JSON.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const esperado = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!esperado) {
    console.error("[meta] falta META_WEBHOOK_VERIFY_TOKEN");
    return new Response("Not configured", { status: 500 });
  }

  if (modo === "subscribe" && token && challenge && igualEnTiempoFijo(token, esperado)) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  // 403 es lo que Meta espera cuando el token no coincide.
  return new Response("Forbidden", { status: 403 });
}

/**
 * Recepción de eventos.
 *
 * Se responde 200 lo antes posible: Meta corta la conexión si tardamos y
 * reintenta el mismo evento, que es justo lo que no queremos cuando atrás
 * haya un modelo generando una respuesta paga. El trabajo real va en segundo
 * plano (plan 2).
 */
export async function POST(req: Request) {
  const secreto = process.env.META_APP_SECRET;
  if (!secreto) {
    console.error("[meta] falta META_APP_SECRET");
    return new Response("Not configured", { status: 500 });
  }

  // El cuerpo se lee como texto porque la firma se calcula sobre los bytes
  // exactos que mandó Meta. Parsearlo y re-serializarlo rompe el HMAC.
  const crudo = await req.text();
  const firma = req.headers.get("x-hub-signature-256");

  if (!firmaValida(crudo, firma, secreto)) {
    console.warn("[meta] evento descartado: firma inválida");
    return new Response("Forbidden", { status: 403 });
  }

  // TODO(plan 2): encolar el evento y procesarlo en segundo plano.
  // Hasta entonces se registra el tipo para poder verificar en el panel de
  // Meta que los eventos están llegando de verdad.
  try {
    const evento = JSON.parse(crudo) as { object?: string };
    console.log("[meta] evento recibido:", evento.object ?? "sin object");
  } catch {
    console.warn("[meta] evento con cuerpo no-JSON");
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

/**
 * Verifica la firma `sha256=<hex>` que Meta manda en cada POST.
 * Sin esto, cualquiera que descubra la URL puede inventar conversaciones.
 */
function firmaValida(
  cuerpo: string,
  encabezado: string | null,
  secreto: string,
): boolean {
  if (!encabezado?.startsWith("sha256=")) return false;
  const esperada = createHmac("sha256", secreto).update(cuerpo).digest("hex");
  return igualEnTiempoFijo(encabezado.slice("sha256=".length), esperada);
}

/**
 * Comparación en tiempo constante. Un `===` filtra por cuánto tarda en
 * fallar cuántos caracteres iniciales acertó quien está probando.
 */
function igualEnTiempoFijo(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
