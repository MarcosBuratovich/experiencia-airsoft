import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint al que cae el usuario desde los emails de auth (signup confirm,
 * password recovery, magic link, invite, email change).
 *
 * Query params:
 *   - token_hash: el hash del token (lo provee Supabase via Send Email Hook).
 *   - type: tipo de OTP (signup, recovery, magiclink, invite, email_change, ...).
 *   - next: a donde redirigir despues de verificar OK. Default /partidas.
 *
 * Flow:
 *   1. verifyOtp({ type, token_hash }) -> Supabase setea la sesion via cookies.
 *   2. Si type es "recovery" o "invite", el destino real es el form donde
 *      el user crea su contraseña (no /partidas), porque todavia no la tiene.
 *   3. Si falla, redirigimos a /login con un parametro de error.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=invalid_link`,
      { status: 302 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.warn("[auth/callback] verifyOtp failed", error.message);
    const reason =
      error.message.toLowerCase().includes("expired")
        ? "expired"
        : "verify_failed";
    return NextResponse.redirect(
      `${origin}/login?error=${reason}`,
      { status: 302 },
    );
  }

  // Destino segun el tipo:
  // - recovery: form de nueva contraseña (la sesion ya esta activa por verifyOtp).
  // - invite: idem — el invitado todavia no eligio contraseña.
  // - signup/magiclink/email_change: donde haya pedido el next, o /partidas.
  let dest = nextParam || "/partidas";
  if (type === "recovery" || type === "invite") {
    dest = "/auth/reset-password";
  }

  // Sanitizar `next` para evitar open redirect: solo path relativo permitido.
  if (!dest.startsWith("/")) dest = "/partidas";

  // Marcador para medir la confirmacion de mail, que es el ultimo tramo
  // ciego del embudo: hoy quien se registro y nunca confirmo es
  // indistinguible de quien confirmo y no volvio. Lo limpia
  // ParamEventTracker con router.replace.
  const url = new URL(`${origin}${dest}`);
  if (type === "signup") url.searchParams.set("confirmado", "1");

  return NextResponse.redirect(url.toString(), { status: 302 });
}
