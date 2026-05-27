"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { modalidadLabel } from "@/lib/format";

import {
  actionError,
  actionFieldErrors,
  type ActionErrorState,
} from "@/lib/errors";

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  modalidad: z.enum(["dinamica", "tacsim", "speedsoft"]),
  visibilidad: z.enum(["publica", "privada"]),
  cupo_max: z.coerce.number().int().positive(),
  duracion_min: z.coerce.number().int().positive(),
  notas: z.string().trim().optional(),
});

export type CrearPartidaState = ActionErrorState | undefined;

export async function crearPartidaAction(_prev: CrearPartidaState, formData: FormData): Promise<CrearPartidaState> {
  const parsed = schema.safeParse({
    fecha: formData.get("fecha"),
    hora_inicio: formData.get("hora_inicio"),
    modalidad: formData.get("modalidad"),
    visibilidad: formData.get("visibilidad"),
    cupo_max: formData.get("cupo_max"),
    duracion_min: formData.get("duracion_min"),
    notas: formData.get("notas") || undefined,
  });

  if (!parsed.success) {
    return actionFieldErrors(z.flattenError(parsed.error).fieldErrors);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return actionError("No autenticado");

  const v = parsed.data;
  const private_token = v.visibilidad === "privada" ? randomBytes(16).toString("hex") : null;

  const { error } = await supabase.from("partidas").insert({
    titulo: modalidadLabel(v.modalidad),
    fecha: v.fecha,
    hora_inicio: `${v.hora_inicio}:00`,
    modalidad: v.modalidad,
    visibilidad: v.visibilidad,
    cupo_max: v.cupo_max,
    duracion_min: v.duracion_min,
    notas: v.notas || null,
    precio: 0,
    private_token,
    creado_por: user.id,
  });

  if (error) {
    console.error("[crearPartidaAction] insert falló:", error);
    return actionError(error);
  }

  redirect("/admin/partidas");
}
