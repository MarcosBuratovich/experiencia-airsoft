import type { ReactElement } from "react";
import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/email/resend";
import ConfirmSignupEmail, {
  CONFIRM_SIGNUP_SUBJECT,
} from "@/lib/emails/confirm-signup";
import ResetPasswordEmail, {
  RESET_PASSWORD_SUBJECT,
} from "@/lib/emails/reset-password";
import MagicLinkEmail, {
  MAGIC_LINK_SUBJECT,
} from "@/lib/emails/magic-link";
import ChangeEmailEmail, {
  CHANGE_EMAIL_SUBJECT,
} from "@/lib/emails/change-email";
import InviteUserEmail, {
  INVITE_USER_SUBJECT,
} from "@/lib/emails/invite-user";

// Supabase usa standard-webhooks (https://www.standardwebhooks.com/) para
// firmar el body. La verificacion del HMAC garantiza que el request viene
// de tu Supabase project y no de un tercero.
//
// Documentacion del hook: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

export const runtime = "nodejs"; // Webhook lib usa crypto de node
export const dynamic = "force-dynamic"; // no cachear el endpoint

type EmailActionType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | "email_change_new"
  | "email_change_current"
  | "reauthentication";

type HookPayload = {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      nombre?: string;
      apellido?: string;
      invited_by?: string;
      [k: string]: unknown;
    };
    new_email?: string; // presente en email_change
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com"
  );
}

/**
 * Construye la URL que va en el boton del email.
 * El user hace click -> /auth/callback verifica el token_hash con Supabase
 * (verifyOtp) -> crea sesion -> redirige a `next`.
 */
function buildActionUrl(payload: HookPayload, tokenHash?: string): string {
  const { email_action_type, redirect_to } = payload.email_data;
  const hash = tokenHash ?? payload.email_data.token_hash;
  const url = new URL("/auth/callback", appUrl());
  url.searchParams.set("token_hash", hash);
  url.searchParams.set("type", email_action_type);
  // `next` es donde el user termina despues de verificar OK.
  // redirect_to viene de Supabase (lo seteamos en emailRedirectTo del signup).
  // Si no viene, default a /partidas.
  url.searchParams.set("next", redirect_to || "/partidas");
  return url.toString();
}

type BuiltEmail = {
  subject: string;
  react: ReactElement;
  to: string;
};

function pickTemplate(payload: HookPayload): BuiltEmail | null {
  const { user, email_data } = payload;
  const type = email_data.email_action_type;
  const nombre =
    typeof user.user_metadata?.nombre === "string"
      ? user.user_metadata.nombre
      : null;
  const invitedBy =
    typeof user.user_metadata?.invited_by === "string"
      ? user.user_metadata.invited_by
      : null;

  const actionUrl = buildActionUrl(payload);

  switch (type) {
    case "signup":
      return {
        subject: CONFIRM_SIGNUP_SUBJECT,
        to: user.email,
        react: ConfirmSignupEmail({
          email: user.email,
          actionUrl,
          nombre,
        }),
      };
    case "recovery":
      return {
        subject: RESET_PASSWORD_SUBJECT,
        to: user.email,
        react: ResetPasswordEmail({ email: user.email, actionUrl }),
      };
    case "magiclink":
      return {
        subject: MAGIC_LINK_SUBJECT,
        to: user.email,
        react: MagicLinkEmail({ email: user.email, actionUrl }),
      };
    case "invite":
      return {
        subject: INVITE_USER_SUBJECT,
        to: user.email,
        react: InviteUserEmail({
          email: user.email,
          actionUrl,
          invitedBy,
        }),
      };
    case "email_change":
    case "email_change_new":
    case "email_change_current": {
      // Supabase manda 2 emails en un cambio de email: uno al viejo y otro
      // al nuevo. El payload tiene `new_email` con el destino del cambio.
      const newEmail = user.new_email ?? user.email;
      // Si tipo === email_change_new, el destinatario es newEmail.
      // Si tipo === email_change_current, va al email actual.
      // "email_change" es legacy, lo tratamos como new_email.
      const to =
        type === "email_change_current" ? user.email : newEmail;
      return {
        subject: CHANGE_EMAIL_SUBJECT,
        to,
        react: ChangeEmailEmail({
          newEmail,
          oldEmail: type === "email_change_current" ? user.email : null,
          actionUrl,
        }),
      };
    }
    case "reauthentication":
      // Re-confirmacion de identidad (raro). Reusamos magic-link visual.
      return {
        subject: "Confirmá que sos vos · Experiencia Airsoft",
        to: user.email,
        react: MagicLinkEmail({ email: user.email, actionUrl }),
      };
    default:
      return null;
  }
}

function decodeHookSecret(raw: string): string {
  // Supabase entrega el secret como "v1,whsec_<base64>".
  // standardwebhooks espera solo el base64.
  return raw.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
}

export async function POST(req: NextRequest) {
  const rawSecret = process.env.SUPABASE_AUTH_EMAIL_HOOK_SECRET;
  if (!rawSecret) {
    console.error("[email-hook] SUPABASE_AUTH_EMAIL_HOOK_SECRET no definido");
    return NextResponse.json({ error: "server-misconfigured" }, { status: 500 });
  }

  const wh = new Webhook(decodeHookSecret(rawSecret));

  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signature = req.headers.get("webhook-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { error: "missing-webhook-headers" },
      { status: 400 },
    );
  }

  const body = await req.text();
  let verified: HookPayload;
  try {
    verified = wh.verify(body, {
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": signature,
    }) as HookPayload;
  } catch (err) {
    console.warn("[email-hook] signature verify failed", err);
    return NextResponse.json({ error: "bad-signature" }, { status: 401 });
  }

  const built = pickTemplate(verified);
  if (!built) {
    console.warn(
      "[email-hook] unknown email_action_type",
      verified.email_data?.email_action_type,
    );
    // 200 con error para que Supabase no reintente — no es transient.
    return NextResponse.json({
      error: {
        message: `unsupported email_action_type: ${verified.email_data?.email_action_type}`,
      },
    });
  }

  const result = await sendEmail({
    to: built.to,
    subject: built.subject,
    react: built.react,
    // idempotency: si Supabase reenvia el mismo webhook-id, no duplicar.
    idempotencyKey: id,
  });

  if (!result.ok) {
    // 200 con error -> Supabase no reintenta. Loggeamos y le decimos al user
    // (en el flow front) que pida de nuevo. Reintentos infinitos son peor.
    return NextResponse.json({
      error: { message: `email-send-failed: ${result.error}` },
    });
  }

  // 200 vacio = success por convencion del Send Email Hook.
  return NextResponse.json({});
}
