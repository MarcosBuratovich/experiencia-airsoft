import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no esta definido. Setealo en .env.local y en Vercel.",
    );
  }
  _client = new Resend(apiKey);
  return _client;
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL no esta definido. Default sugerido: noreply@experienciaairsoft.com",
    );
  }
  // Resend acepta "Nombre <email@dominio>" o solo el email.
  // Usamos un display name para que el inbox muestre "Experiencia Airsoft".
  return `Experiencia Airsoft <${from}>`;
}

export type SendEmailArgs = {
  to: string;
  subject: string;
  /** React Email template ya instanciado (ej: <ConfirmSignup ... />). */
  react: ReactElement;
  /** Opcional. Default = RESEND_REPLY_TO. */
  replyTo?: string;
  /** Header opcional para deduplicar webhooks reentrantes. */
  idempotencyKey?: string;
};

/**
 * Envio centralizado de emails transaccionales via Resend.
 *
 * - Renderiza el template a HTML + texto plano (mejor entregabilidad).
 * - Loguea error sin tirar excepcion para que un fallo de email no rompa
 *   el flow de auth (Supabase reenvia eventualmente).
 *
 * Retorna { ok: true, id } | { ok: false, error }
 */
export async function sendEmail(args: SendEmailArgs) {
  const { to, subject, react, replyTo, idempotencyKey } = args;
  const client = getClient();
  const from = getFromAddress();

  let html: string;
  let text: string;
  try {
    [html, text] = await Promise.all([
      render(react),
      render(react, { plainText: true }),
    ]);
  } catch (err) {
    console.error("[email] render failed", { subject, err });
    return { ok: false as const, error: "render-failed" };
  }

  try {
    const res = await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo: replyTo ?? process.env.RESEND_REPLY_TO,
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : undefined,
    });
    if (res.error) {
      console.error("[email] resend api error", { subject, to, err: res.error });
      return { ok: false as const, error: res.error.message };
    }
    return { ok: true as const, id: res.data?.id ?? null };
  } catch (err) {
    console.error("[email] send threw", { subject, to, err });
    return { ok: false as const, error: "send-threw" };
  }
}
