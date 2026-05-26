"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { numeroDisponible } from "@/lib/player-number";

/** Cuenta grafemas (emojis cuentan como 1). */
function aliasLen(s: string): number {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const seg = new Intl.Segmenter("es", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

const ALIAS_MAX = 30;

const updateSchema = z.object({
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
    ),
});

export type ActualizarPerfilState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof updateSchema>, string[]>>;
      message?: string;
      ok?: boolean;
    }
  | undefined;

export async function actualizarPerfilAction(
  _prev: ActualizarPerfilState,
  formData: FormData,
): Promise<ActualizarPerfilState> {
  const parsed = updateSchema.safeParse({
    celular: formData.get("celular"),
    player_number: formData.get("player_number"),
    alias: formData.get("alias") ?? "",
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  // Si el number ya está en uso por OTRO usuario, error.
  const disponible = await numeroDisponible(
    supabase,
    parsed.data.player_number,
    user.id,
  );
  if (!disponible) {
    return {
      errors: { player_number: ["Ese número ya está en uso. Elegí otro"] },
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      celular: parsed.data.celular,
      player_number: parsed.data.player_number,
      alias: parsed.data.alias.length === 0 ? null : parsed.data.alias,
    })
    .eq("id", user.id);
  if (error) return { message: error.message };

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return { ok: true };
}
