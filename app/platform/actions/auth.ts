"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { numeroDisponible } from "@/lib/player-number";

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

export type SignupState = {
  errors?: Partial<Record<keyof z.infer<typeof signupSchema>, string[]>>;
  message?: string;
} | undefined;

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
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { nombre, apellido, dni, celular, email, password, player_number } =
    parsed.data;
  const supabase = await createClient();

  // Validar unicidad del player_number antes de crear el auth user.
  // Hay un unique index en la DB que da última palabra, pero este check
  // devuelve un error de campo prolijo en el form en vez de un 500.
  const disponible = await numeroDisponible(supabase, player_number);
  if (!disponible) {
    return {
      errors: { player_number: ["Ese número ya está en uso. Elegí otro"] },
    };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido, dni, celular, player_number },
      // Supabase manda este `next` al webhook como redirect_to.
      // El hook lo usa para construir el link del email -> /auth/callback
      // verifica el token y redirige aca despues.
      emailRedirectTo: `${appUrl}/partidas`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already") || error.code === "user_already_exists") {
      return { message: "Ese email ya está registrado. Iniciá sesión." };
    }
    return { message: error.message };
  }

  redirect("/login?signup=ok");
}

const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Obligatoria"),
});

export type LoginState = {
  errors?: Partial<Record<keyof z.infer<typeof loginSchema>, string[]>>;
  message?: string;
} | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { message: "Email o contraseña incorrectos." };
  }

  // Invalida el cache del layout para que el nav re-rendee con la sesion nueva
  revalidatePath("/", "layout");
  redirect("/partidas");
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
  | {
      errors?: Partial<Record<keyof z.infer<typeof forgotSchema>, string[]>>;
      ok?: boolean;
      message?: string;
    }
  | undefined;

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com";

  const supabase = await createClient();
  // No revelamos si el email existe o no — siempre devolvemos ok.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  });

  return {
    ok: true,
    message:
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

export type ResetPasswordState =
  | {
      errors?: Partial<Record<"password" | "confirmPassword", string[]>>;
      message?: string;
    }
  | undefined;

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      message:
        "El link de reset expiró o no es válido. Pedí uno nuevo desde el login.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/partidas?reset=ok");
}
