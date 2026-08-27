"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { numeroDisponible, sugerirNumeroLibre } from "@/lib/player-number";
import { aMetadata, leerAtribucion } from "@/lib/atribucion";
import { leerGclid } from "@/lib/gclid";
import {
  actionError,
  actionFieldErrors,
  friendlyError,
  type ActionErrorState,
} from "@/lib/errors";

const signupSchema = z
  .object({
    nombre: z.string().trim().min(2, "Mínimo 2 caracteres"),
    apellido: z.string().trim().min(2, "Mínimo 2 caracteres"),
    dni: z.string().trim().regex(/^\d{7,8}$/, "DNI inválido (7-8 dígitos)"),
    celular: z.string().trim().min(8, "Celular inválido"),
    email: z.email("Email inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
      .regex(/[a-z]/, "Debe tener al menos una minúscula")
      .regex(/[0-9]/, "Debe tener al menos un número"),
    confirmPassword: z.string(),
    player_number: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Tienen que ser exactamente 6 dígitos"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SignupState = ActionErrorState | { ok: true } | undefined;

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    dni: formData.get("dni"),
    celular: formData.get("celular"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    player_number: formData.get("player_number"),
  });

  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const { nombre, apellido, dni, celular, email, password, player_number } =
    parsed.data;
  const supabase = await createClient();

  const disponible = await numeroDisponible(supabase, player_number);
  if (!disponible) {
    return actionFieldErrors({
      player_number: ["Ese número ya está en uso. Elegí otro"],
    });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com";

  // El origen viaja en el metadata del usuario; handle_new_user() lo baja a
  // profiles. Si no hay cookie, no se manda nada y las columnas quedan NULL.
  const attr = await leerAtribucion();
  const datosAttr = attr ? aMetadata(attr) : {};

  // gclid es independiente de ea_attr/Atribucion: lo pone el tag de Google
  // en su propia cookie (_gcl_aw), no la cookie de atribución.
  const gclid = await leerGclid();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre, apellido, dni, celular, player_number,
        ...datosAttr,
        ...(gclid ? { gclid } : {}),
      },
      emailRedirectTo: `${appUrl}/`,
    },
  });

  if (error) {
    console.error("[signupAction] supabase signUp falló:", error);
    return actionError(error);
  }

  redirect("/login?signup=ok");
}

const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Obligatoria"),
});

export type LoginState = ActionErrorState | { ok: true } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return actionError(error);
  }

  revalidatePath("/", "layout");
  // Volvemos al destino original si venía uno (?next=), o al dashboard.
  // `login=ok` viaja en la URL para que el tracker de analytics del layout
  // dispare el evento `login` (esta action redirige server-side, así que el
  // form nunca ve el éxito); el tracker limpia el param al disparar.
  const dest = sanitizeNext(formData.get("next"));
  redirect(`${dest}${dest.includes("?") ? "&" : "?"}login=ok`);
}

/**
 * Sólo permite paths relativos internos como destino post-login, para evitar
 * open-redirect (nada de URLs absolutas ni '//host').
 */
function sanitizeNext(v: FormDataEntryValue | null): string {
  if (typeof v !== "string" || !v) return "/";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}

/** Sugiere un número de jugador de 6 dígitos que esté libre. */
export async function sugerirNumeroAction(): Promise<
  { numero: string } | { error: string }
> {
  const supabase = await createClient();
  const numero = await sugerirNumeroLibre(supabase);
  if (!numero) return { error: "No pudimos sugerir un número. Probá de nuevo." };
  return { numero };
}

// ─────────────────────────────────────────────────────────────────────────
// Recuperar contraseña: dos pasos.
//
// 1) forgotPasswordAction: el usuario ingresa su email -> Supabase manda
//    el email "recovery" (token_hash) -> hook -> Resend -> inbox.
// 2) Click en el link -> /auth/callback verifica el token y crea sesion ->
//    redirige a /auth/reset-password.
// 3) resetPasswordAction: el usuario (ya con sesion) elige nueva contraseña.
// ─────────────────────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.email("Email inválido"),
});

export type ForgotPasswordState =
  | ActionErrorState
  | { ok: true; mensaje: string }
  | undefined;

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${appUrl}/auth/reset-password` },
  );

  if (error) {
    const msg = error.message.toLowerCase();
    // No leakeamos si el email existe — para "not found" devolvemos ok.
    if (!msg.includes("not found")) {
      console.error("[forgotPasswordAction] supabase falló:", error);
      return actionError(error);
    }
  }

  return {
    ok: true,
    mensaje:
      "Si el email existe en el sistema, te mandamos un link para resetear la contraseña. Revisá tu inbox (y spam).",
  };
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
      .regex(/[a-z]/, "Debe tener al menos una minúscula")
      .regex(/[0-9]/, "Debe tener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordState = ActionErrorState | { ok: true } | undefined;

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      error: {
        titulo: "El link de reset expiró o no es válido",
        detalle: "Pedí uno nuevo desde la pantalla de recuperar contraseña.",
        mostrarSoporte: false,
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    console.error("[resetPasswordAction] updateUser falló:", error);
    return { error: friendlyError(error) };
  }

  revalidatePath("/", "layout");
  redirect("/?reset=ok");
}
