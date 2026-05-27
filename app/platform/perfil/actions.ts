"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { numeroDisponible } from "@/lib/player-number";
import {
  countEmojis,
  detectBadPattern,
  graphemeLen,
  hasExcessiveRepeat,
  isCleanText,
} from "@/lib/sanitize-text";
import {
  actionError,
  actionFieldErrors,
  type ActionErrorState,
} from "@/lib/errors";

const aliasLen = graphemeLen;

const ALIAS_MAX = 30;

// Validación de nombre/apellido reales: solo letras (con acentos),
// espacios, guiones y apóstrofes. Sin emojis, sin URLs, sin HTML.
const NOMBRE_REAL_REGEX = /^[\p{L}][\p{L}\s'.-]*$/u;
const nombreRealSchema = z
  .string()
  .trim()
  .min(2, "Mínimo 2 caracteres")
  .max(50, "Máximo 50 caracteres")
  .regex(
    NOMBRE_REAL_REGEX,
    "Solo letras, espacios, guiones y apóstrofes",
  )
  .refine(
    (s) => isCleanText(s),
    "Contenido no permitido",
  )
  .refine(
    (s) => countEmojis(s) === 0,
    "No uses emojis en el nombre real (usá el alias para eso)",
  )
  .refine(
    (s) => !hasExcessiveRepeat(s, 3),
    "No repitas el mismo caracter más de 3 veces",
  );

const updateSchema = z.object({
  nombre: nombreRealSchema,
  apellido: nombreRealSchema,
  celular: z.string().trim().min(8, "Celular inválido"),
  player_number: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Tienen que ser exactamente 6 dígitos"),
  alias: z
    .string()
    .trim()
    .refine(
      (s) => s.length === 0 || aliasLen(s) <= ALIAS_MAX,
      `Máximo ${ALIAS_MAX} caracteres`,
    )
    .refine(
      (s) => isCleanText(s),
      "Contenido no permitido (HTML, URLs, markdown o caracteres de control)",
    )
    .refine(
      (s) => countEmojis(s) <= 5,
      "Máximo 5 emojis en el alias",
    )
    .refine(
      (s) => !hasExcessiveRepeat(s, 4),
      "No repitas el mismo caracter más de 4 veces",
    ),
});

export type ActualizarPerfilState =
  | ActionErrorState
  | { ok: true }
  | undefined;

export async function actualizarPerfilAction(
  _prev: ActualizarPerfilState,
  formData: FormData,
): Promise<ActualizarPerfilState> {
  const parsed = updateSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    celular: formData.get("celular"),
    player_number: formData.get("player_number"),
    alias: formData.get("alias") ?? "",
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionError("No autenticado");

  // Si el number ya está en uso por OTRO usuario, error.
  const disponible = await numeroDisponible(
    supabase,
    parsed.data.player_number,
    user.id,
  );
  if (!disponible) {
    return actionFieldErrors({
      player_number: ["Ese número ya está en uso. Elegí otro"],
    });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      celular: parsed.data.celular,
      player_number: parsed.data.player_number,
      alias: parsed.data.alias.length === 0 ? null : parsed.data.alias,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[actualizarPerfilAction] update falló:", error);
    return actionError(error);
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true };
}

// =========================================================================
// Cambiar contraseña (in-place, sin email)
// =========================================================================

const changePwSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
      .regex(/[a-z]/, "Debe tener al menos una minúscula")
      .regex(/[0-9]/, "Debe tener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CambiarContrasenaState =
  | ActionErrorState
  | { ok: true }
  | undefined;

export async function cambiarContrasenaAction(
  _prev: CambiarContrasenaState,
  formData: FormData,
): Promise<CambiarContrasenaState> {
  const parsed = changePwSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return actionError("No autenticado");

  // Reauth: verificamos que la contraseña actual sea correcta intentando
  // un signInWithPassword (no rompe la sesión existente — Supabase devuelve
  // el mismo user/session).
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signinErr) {
    return actionFieldErrors({
      currentPassword: ["Contraseña actual incorrecta"],
    });
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    console.error("[cambiarContrasenaAction] updateUser falló:", error);
    return actionError(error);
  }

  return { ok: true };
}

// =========================================================================
// Borrar cuenta
// =========================================================================

const deleteSchema = z.object({
  confirmEmail: z.string().trim().min(1, "Confirmación obligatoria"),
});

export type BorrarCuentaState = ActionErrorState | undefined;

export async function borrarCuentaAction(
  _prev: BorrarCuentaState,
  formData: FormData,
): Promise<BorrarCuentaState> {
  const parsed = deleteSchema.safeParse({
    confirmEmail: formData.get("confirmEmail"),
  });
  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return actionError("No autenticado");

  // El user tiene que escribir su email exacto para confirmar (case-insensitive).
  if (
    parsed.data.confirmEmail.trim().toLowerCase() !==
    user.email.toLowerCase()
  ) {
    return actionFieldErrors({
      confirmEmail: ["El email no coincide con el de tu cuenta"],
    });
  }

  // Si es capitán de algún clan, no puede borrarse — tiene que transferir
  // primero. Evita que la deletion deje al clan sin capitán.
  const { data: clanesComoCapitan } = await supabase
    .from("clanes")
    .select("id, nombre")
    .eq("capitan_id", user.id);
  if (clanesComoCapitan && clanesComoCapitan.length > 0) {
    const nombres = clanesComoCapitan.map((c) => c.nombre).join(", ");
    return actionError(
      `Sos capitán de ${clanesComoCapitan.length === 1 ? "el clan" : "los clanes"} ${nombres}. Transferí la capitanía o eliminá el clan antes de borrar tu cuenta.`,
    );
  }

  // Borrar el auth user via service role. El ON DELETE CASCADE en
  // profiles → auth.users limpia el profile, inscripciones, profile_clanes,
  // clan_requests, eventos, etc. en cadena.
  const admin = createServiceRoleClient();
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[borrarCuentaAction] deleteUser falló:", delErr);
    return actionError(delErr);
  }

  // Cerrar sesión local para limpiar cookies.
  await supabase.auth.signOut();

  // Hard redirect porque el server action's redirect mantiene la session
  // del usuario borrado en cookies por un tick.
  redirect("/login?deleted=ok");
}
