"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { numeroDisponible } from "@/lib/player-number";

const signupSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres"),
  apellido: z.string().trim().min(2, "Mínimo 2 caracteres"),
  dni: z.string().trim().regex(/^\d{7,8}$/, "DNI inválido (7-8 dígitos)"),
  celular: z.string().trim().min(8, "Celular inválido"),
  email: z.email("Email inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[a-zA-Z]/, "Debe tener al menos una letra")
    .regex(/[0-9]/, "Debe tener al menos un número"),
  player_number: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Tienen que ser exactamente 6 dígitos"),
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido, dni, celular, player_number },
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
