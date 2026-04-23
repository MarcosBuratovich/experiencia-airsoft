"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  titulo: z.string().trim().min(3, "Mínimo 3 caracteres"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  visibilidad: z.enum(["publica", "privada"]),
  cupo_max: z.coerce.number().int().positive(),
  duracion_min: z.coerce.number().int().positive(),
  precio: z.coerce.number().int().min(0),
  notas: z.string().trim().optional(),
});

export type CrearPartidaState = {
  errors?: Partial<Record<keyof z.infer<typeof schema>, string[]>>;
  message?: string;
} | undefined;

export async function crearPartidaAction(_prev: CrearPartidaState, formData: FormData): Promise<CrearPartidaState> {
  const parsed = schema.safeParse({
    titulo: formData.get("titulo"),
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    modalidad: formData.get("modalidad"),
    visibilidad: formData.get("visibilidad"),
    cupo_max: formData.get("cupo_max"),
    duracion_min: formData.get("duracion_min"),
    precio: formData.get("precio"),
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "No autenticado" };

  const v = parsed.data;
  const private_token = v.visibilidad === "privada" ? randomBytes(16).toString("hex") : null;

  const { error } = await supabase.from("partidas").insert({
    ...v,
    hora_inicio: `${v.hora_inicio}:00`,
    private_token,
    creado_por: user.id,
  });

  if (error) return { message: error.message };

  redirect("/admin/partidas");
}
